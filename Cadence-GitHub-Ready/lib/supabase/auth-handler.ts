import type { SupabaseClient } from '@supabase/supabase-js';
import { ACCOUNT_PATH, EMAIL_COOLDOWN_SECONDS, allowAttempt, publicUser, requestOrigin, reserveEmailRequest, validEmail, validPassword } from './auth-policy';
import {assessMfa,MFA_PATH,requireMfa,securityResponse,SecurityError} from './mfa-policy';

const json = (body: unknown, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer'}});
const genericEmail = () => json({message: 'verification_requested', cooldown: EMAIL_COOLDOWN_SECONDS});
const limited = (seconds: number) => {
  const response = json({error: 'rate', retryAfter: seconds}, 429);
  response.headers.set('Retry-After', String(seconds));
  return response;
};
function emailError(error: {code?: string; status?: number} | null) {
  if (!error || ['user_already_exists','email_exists','user_not_found'].includes(error.code || '')) return null;
  if (error.status === 429 || ['over_email_send_rate_limit','over_request_rate_limit'].includes(error.code || '')) return json({error:'rate'},429); // The SDK error carries no provider retry duration.
  if (error.code === 'weak_password') return json({error:'password'},400);
  if (['email_address_not_authorized','email_provider_disabled','email_address_invalid'].includes(error.code || '')) return json({error:'delivery'},503);
  return json({error:'unavailable'},503);
}
export async function handleAuth(request: Request, makeClient: () => Promise<SupabaseClient>) {
  if (request.headers.get('origin') !== requestOrigin(request)) return json({error: 'origin'}, 403);
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({error: 'validation'}, 400);
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object') return json({error: 'validation'}, 400);
    const {action, password} = body;
    if (!['signup', 'signin', 'resend', 'recover', 'update', 'signout'].includes(action)) return json({error: 'validation'}, 400);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (['signup', 'signin', 'resend', 'recover'].includes(action) && !validEmail(email)) return json({error: 'validation'}, 400);
    // Existing passwords may predate today's registration policy.
    if (action === 'signin' && (typeof password !== 'string' || !password.length || password.length > 4096)) return json({error: 'credentials'}, 400);
    if (['signup', 'update'].includes(action) && !validPassword(password)) return json({error: 'password'}, 400);
    if (['signup', 'update'].includes(action) && password !== body.confirm) return json({error: 'match'}, 400);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (action === 'signup' && (!name || name.length > 80)) return json({error: 'name'}, 400);
    // Do not trust arbitrary forwarded addresses outside the hosting platform.
    const address = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') || 'unknown' : 'local';
    if (action !== 'signout' && !await allowAttempt(address, email || 'session')) return limited(900);
    if (['signup','resend','recover'].includes(action)) {
      const remaining = await reserveEmailRequest(email);
      if (remaining) return limited(remaining);
    }
    const client = await makeClient();
    const callback = new URL('/auth/confirm', requestOrigin(request)).href;
    if (action === 'signout') {
      const {error} = await client.auth.signOut({scope: 'local'});
      return error ? json({error: 'unavailable'}, 503) : json({ok: true});
    }
    if (action === 'signup') {
      const {data, error} = await client.auth.signUp({email, password, options: {data: {full_name: name}, emailRedirectTo: callback}});
      // signUp initiates the first email. Never send a second email via resend here.
      if (data.session) {
        await client.auth.signOut({scope: 'local'});
        return json({error:'confirmation_required'},503);
      }
      const failure = emailError(error);
      if (failure) return failure;
      if (!error && !data.user) return json({error:'unavailable'},503);
      return genericEmail();
    }
    if (action === 'resend' || action === 'recover') {
      const result = action === 'resend'
        ? await client.auth.resend({type: 'signup', email, options: {emailRedirectTo: callback}})
        : await client.auth.resetPasswordForEmail(email, {redirectTo: callback + '?flow=recovery'});
      const failure = emailError(result.error);
      if (failure) return failure;
      return action === 'resend' ? genericEmail() : json({message:'recovery_requested',cooldown:EMAIL_COOLDOWN_SECONDS});
    }
    if (action === 'signin') {
      const {data, error} = await client.auth.signInWithPassword({email, password});
      if (error?.status === 429) return limited(EMAIL_COOLDOWN_SECONDS);
      if (error && (!error.status || error.status >= 500)) return json({error:'unavailable'},503);
      if (error) return json({error: error.code === 'email_not_confirmed' ? 'verify' : 'credentials'}, error.code === 'email_not_confirmed' ? 403 : 401);
      if (!publicUser(data.user)) { await client.auth.signOut({scope: 'local'}); return json({error: 'verify'}, 403); }
      const security=await assessMfa(client,data.user);
      if(security.required)return json({ok:true,mfaRequired:true,redirect:MFA_PATH});
      return json({ok: true, redirect: '/'});
    }
    const {data, error} = await client.auth.getUser();
    if (error || !publicUser(data.user)) return json({error: 'expired'}, 401);
    requireMfa(await assessMfa(client,data.user));
    const result = await client.auth.updateUser({password});
    if (result.error) return json({error: 'update'}, 400);
    const signedOut = await client.auth.signOut({scope: 'local'});
    if (signedOut.error) return json({error: 'unavailable'}, 503);
    return json({ok: true, redirect: ACCOUNT_PATH + '&result=reset'});
  } catch (error) {
    if(error instanceof SecurityError)return securityResponse(error);
    return json({error: error instanceof SyntaxError ? 'validation' : 'unavailable'}, error instanceof SyntaxError ? 400 : 503);
  }
}
