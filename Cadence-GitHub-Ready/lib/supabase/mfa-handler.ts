import type {SupabaseClient} from '@supabase/supabase-js';
import {allowAttempt,publicUser,requestOrigin} from './auth-policy';
import {assessMfa,failAuth,requireMfa,safeMfaState,SecurityError,securityResponse} from './mfa-policy';

const json=(body:unknown)=>Response.json(body,{headers:{'Cache-Control':'private, no-store','Pragma':'no-cache','Referrer-Policy':'no-referrer','Vary':'Cookie'}});
const active=new Set<string>();
function factorError(error:{code?:string;status?:number;name?:string}|null):never{
  const code=error?.code || '';
  if(['mfa_verification_failed','mfa_verification_rejected'].includes(code))throw new SecurityError('invalid_code',400);
  if(code==='mfa_challenge_expired')throw new SecurityError('code_expired',400);
  if(code==='mfa_factor_not_found')throw new SecurityError('factor_missing',400);
  if(['too_many_enrolled_mfa_factors','mfa_factor_name_conflict'].includes(code))throw new SecurityError('factor_limit',400);
  if(code==='insufficient_aal')throw new SecurityError('mfa_required',403);
  failAuth(error);
}
export async function handleMfa(request:Request,makeClient:()=>Promise<SupabaseClient>){
  let locked:string|undefined;
  try{
    if(request.method!=='GET' && request.headers.get('origin')!==requestOrigin(request))throw new SecurityError('origin',403);
    let body:Record<string,unknown>={};
    if(request.method!=='GET'){
      const raw=await request.text();
      if(raw.length>2048)throw new SecurityError('validation',400);
      body=JSON.parse(raw);
      if(!body || typeof body!=='object' || !['enroll','verify','cancel','remove'].includes(String(body.action)))throw new SecurityError('validation',400);
    }
    const client=await makeClient();
    const identity=await client.auth.getUser();
    if(identity.error)failAuth(identity.error);
    const user=identity.data.user;
    if(!user || !publicUser(user) || user.is_anonymous)throw new SecurityError('expired',401);
    const state=await assessMfa(client,user);
    if(request.method==='GET')return json(safeMfaState(state));
    if(!await allowAttempt('mfa:'+user.id,'mfa:'+user.id))throw new SecurityError('rate',429);
    if(active.has(user.id) || active.size>=10000)throw new SecurityError('rate',429);
    active.add(user.id);locked=user.id;
    if(body.action==='enroll'){
      requireMfa(state);
      if(state.all.length>=10)throw new SecurityError('factor_limit',400);
      const label=typeof body.name==='string'?body.name.trim():'';
      if(!label || label.length>64)throw new SecurityError('validation',400);
      const {data,error}=await client.auth.mfa.enroll({factorType:'totp',issuer:'English-Co',friendlyName:label});
      if(error)factorError(error);
      const prefix='data:image/svg+xml;utf-8,';
      if(!data || data.type!=='totp' || !data.totp.secret || !data.totp.qr_code?.startsWith(prefix))throw new SecurityError('unavailable');
      // This is the only response containing setup material. Never return session tokens.
      return json({enrollment:{id:data.id,qrCode:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data.totp.qr_code.slice(prefix.length)),secret:data.totp.secret}});
    }
    const factor=state.all.find(f=>f.id===body.factorId && f.factor_type==='totp');
    if(!factor)throw new SecurityError('factor_missing',400);
    if(body.action==='verify'){
      if(typeof body.code!=='string' || !/^\d{6}$/.test(body.code))throw new SecurityError('validation',400);
      if(state.required && factor.status!=='verified')throw new SecurityError('mfa_required',403);
      const result=await client.auth.mfa.challengeAndVerify({factorId:factor.id,code:body.code});
      if(result.error)factorError(result.error);
      const identityAfter=await client.auth.getUser();
      if(identityAfter.error)failAuth(identityAfter.error);
      if(identityAfter.data.user?.id!==user.id)throw new SecurityError('expired',401);
      const after=await assessMfa(client,identityAfter.data.user);
      if(after.currentLevel!=='aal2' || !after.all.some(f=>f.id===factor.id && f.status==='verified'))throw new SecurityError('unavailable');
      return json({ok:true,...safeMfaState(after)});
    }
    if(body.action==='cancel'){
      // Cancellation can only remove this user's still-unverified setup factor.
      if(factor.status!=='unverified')throw new SecurityError('factor_verified',409);
    }else{
      requireMfa(state);
      if(state.currentLevel!=='aal2' || body.confirm!==true || factor.status!=='verified')throw new SecurityError('mfa_required',403);
    }
    const removed=await client.auth.mfa.unenroll({factorId:factor.id});
    if(removed.error)factorError(removed.error);
    if(removed.data?.id!==factor.id)throw new SecurityError('unavailable');
    if(body.action==='remove'){
      const refreshed=await client.auth.refreshSession();
      if(refreshed.error)failAuth(refreshed.error);
    }
    const identityAfter=await client.auth.getUser();
    if(identityAfter.error)failAuth(identityAfter.error);
    if(identityAfter.data.user?.id!==user.id)throw new SecurityError('expired',401);
    const after=await assessMfa(client,identityAfter.data.user);
    if(after.all.some(f=>f.id===factor.id))throw new SecurityError('unavailable');
    return json({ok:true,...safeMfaState(after)});
  }catch(error){return securityResponse(error instanceof SyntaxError?new SecurityError('validation',400):error);}
  finally{if(locked)active.delete(locked);}
}
