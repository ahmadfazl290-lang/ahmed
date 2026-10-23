import type {SupabaseClient, User} from '@supabase/supabase-js';

export const MFA_PATH='/account?provider=supabase&mode=mfa';
export class SecurityError extends Error {
  code:string;
  status:number;
  constructor(code:string,status=503){super(code);this.code=code;this.status=status;}
}
export function failAuth(error:{code?:string; status?:number; name?:string}|null):never {
  if(error?.status===429 || error?.code==='over_request_rate_limit')throw new SecurityError('rate',429);
  if(error?.name==='AuthSessionMissingError' || error?.name==='AuthInvalidJwtError' ||
    ['session_expired','session_not_found','refresh_token_not_found','refresh_token_already_used','bad_jwt'].includes(error?.code || '') || error?.status===401)
    throw new SecurityError('expired',401);
  throw new SecurityError('unavailable');
}
export function securityResponse(error:unknown) {
  const failure=error instanceof SecurityError?error:new SecurityError('unavailable');
  const response=Response.json({error:failure.code,...(failure.code==='mfa_required'?{mfaRequired:true,redirect:MFA_PATH}:{}),...(failure.status===429?{retryAfter:60}:{})},
    {status:failure.status,headers:{'Cache-Control':'private, no-store','Pragma':'no-cache','Referrer-Policy':'no-referrer','Vary':'Cookie'}});
  if(failure.status===429)response.headers.set('Retry-After','60');
  return response;
}

// Session storage supplies only a token carrier. It never supplies trusted user
// metadata, factor state or AAL. Validate the exact token and identity online,
// verify its claims, and read current factors on every protected operation.
export async function assessMfa(client:SupabaseClient,user:User,reconciled=false) {
  const session=await client.auth.getSession();
  if(session.error)failAuth(session.error);
  const token=session.data.session?.access_token;
  if(!token)throw new SecurityError('expired',401);
  const claims=await client.auth.getClaims(token);
  if(claims.error)failAuth(claims.error);
  if(!claims.data || claims.data.claims.sub!==user.id || !Number.isFinite(claims.data.claims.exp) || claims.data.claims.exp*1000<=Date.now())throw new SecurityError('expired',401);
  const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if(assurance.error)failAuth(assurance.error);
  const current=assurance.data?.currentLevel;
  if((current!=='aal1' && current!=='aal2') || claims.data.claims.aal!==current)throw new SecurityError('unavailable');
  const listed=await client.auth.mfa.listFactors();
  if(listed.error)failAuth(listed.error);
  if(!Array.isArray(listed.data?.all))throw new SecurityError('unavailable');
  const all=listed.data.all;
  const verified=all.filter(factor=>factor.status==='verified');
  if(current==='aal2' && !verified.length && !reconciled){
    const refreshed=await client.auth.refreshSession();
    if(refreshed.error)failAuth(refreshed.error);
    const identity=await client.auth.getUser();
    if(identity.error)failAuth(identity.error);
    if(!identity.data.user || identity.data.user.id!==user.id)throw new SecurityError('expired',401);
    return assessMfa(client,identity.data.user,true);
  }
  // A factor appearing between the two reads must never yield an AAL1 allow.
  if(current==='aal1' && assurance.data?.nextLevel==='aal2' && !verified.length)throw new SecurityError('unavailable');
  return {currentLevel:current,nextLevel:verified.length?'aal2' as const:'aal1' as const,required:verified.length>0 && current!=='aal2',all,
    expiresAt:claims.data.claims.exp*1000};
}
export type MfaState=Awaited<ReturnType<typeof assessMfa>>;
export function requireMfa(state:MfaState){if(state.required)throw new SecurityError('mfa_required',403);}
export function safeMfaState(state:MfaState){
  return {currentLevel:state.currentLevel,nextLevel:state.nextLevel,required:state.required,expiresAt:state.expiresAt,
    factors:state.all.filter(f=>f.factor_type==='totp' && (!state.required || f.status==='verified')).map(f=>({id:f.id,name:f.friendly_name?.slice(0,64) || null,type:'totp' as const,status:f.status,createdAt:f.created_at || null})),
    factorCount:state.required?undefined:state.all.length};
}
