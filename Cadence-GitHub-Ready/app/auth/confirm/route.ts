import {NextResponse} from 'next/server';
import {createClient} from '../../../lib/supabase/server';
import {ACCOUNT_PATH, callbackDestination, publicUser, requestOrigin} from '../../../lib/supabase/auth-policy';
import {assessMfa,MFA_PATH} from '../../../lib/supabase/mfa-policy';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const token = url.searchParams.get('token_hash');
  const code = url.searchParams.get('code');
  const flowId = url.searchParams.get('sb_flow_id');
  let destination = ACCOUNT_PATH + '&result=invalid';
  const failure = (error: {code?:string; status?:number} | null) => {
    const reason = error?.code === 'otp_expired' ? 'expired'
      : ['flow_state_not_found','flow_state_expired','bad_code_verifier','pkce_code_verifier_not_found','pkce_verifier_not_found','pkce_verifier_mismatch'].includes(error?.code || '') ? 'state'
      : !error?.status || error.status >= 500 || error.status === 429 ? 'unavailable' : 'invalid';
    return ACCOUNT_PATH + '&result=invalid&reason=' + reason;
  };
  try {
    const client = await createClient();
    let verifiedType: string | null = null;
    let exchanged = false;
    if (!url.searchParams.has('error') && token && !code && token.length <= 2048 && (type === 'email' || type === 'signup' || type === 'recovery')) {
      const {error} = await client.auth.verifyOtp({token_hash: token, type});
      if (!error) {exchanged = true; verifiedType = type;}
      else destination = failure(error);
    } else if (!url.searchParams.has('error') && code && code.length <= 2048 && !token && (!flowId || /^[A-Za-z0-9_-]{8,64}$/.test(flowId))) {
      // The default ConfirmationURL goes through Supabase /verify and returns
      // an authorization code. New SDKs also identify the PKCE verifier slot.
      const {data, error} = await client.auth.exchangeCodeForSession(code, flowId ? {flowId} : undefined);
      // This SDK returns redirectType at runtime although its public response
      // type omits it. Accept only the recovery value, never a query redirect.
      if (!error) {exchanged = true; verifiedType = 'redirectType' in data && data.redirectType === 'recovery' ? 'recovery' : null;}
      else destination = failure(error);
    }
    if (exchanged) {
      const {data, error} = await client.auth.getUser();
      if (!error && publicUser(data.user)) {
        const security=await assessMfa(client,data.user);
        destination=security.required?MFA_PATH+(verifiedType==='recovery'?'&after=recovery':''):callbackDestination(verifiedType);
      }
      else if(error) destination = failure(error);
    }
    if(url.searchParams.get('error_code') === 'otp_expired') destination = failure({code:'otp_expired',status:403});
  } catch { destination = failure(null); /* Never log callback URLs or tokens. */ }
  const response = NextResponse.redirect(new URL(destination, requestOrigin(request)), 303);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
