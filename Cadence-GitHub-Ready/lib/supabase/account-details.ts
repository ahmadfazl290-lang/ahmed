import type {SupabaseClient, User} from '@supabase/supabase-js';
import {publicUser} from './auth-policy';
import {assessMfa,requireMfa,securityResponse} from './mfa-policy';

// Display-only projection of an identity already validated by getUser().
// Editable metadata supplies a label, never permissions or verification status.
export function accountDetails(user: User | null) {
  if (!user || user.is_anonymous) return null;
  const text = (value: unknown, limit = 200) => typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : null;
  const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  const providers = Array.isArray(user.identities)
    ? user.identities.map(identity => identity.provider)
    : user.app_metadata?.providers ?? (user.app_metadata?.provider ? [user.app_metadata.provider] : []);
  return {
    fullName: text(user.user_metadata?.full_name) || text(user.user_metadata?.name),
    email: text(user.email, 254),
    verified: !!user.email_confirmed_at,
    confirmedAt: date(user.email_confirmed_at),
    createdAt: date(user.created_at),
    lastSignInAt: date(user.last_sign_in_at),
    providers: [...new Set(providers.filter(provider => typeof provider === 'string' && /^[a-z0-9_-]{1,80}$/i.test(provider)))],
    twoFactor: !Array.isArray(user.factors) ? 'unknown' : user.factors.some(factor => factor.status === 'verified') ? 'enrolled' : user.factors.length ? 'pending' : 'not_enrolled',
  };
}
export type AccountDetailsData = NonNullable<ReturnType<typeof accountDetails>>;

export async function readAccount(makeClient: () => Promise<SupabaseClient>) {
  const headers = {'Cache-Control':'private, no-store', 'Referrer-Policy':'no-referrer', 'Vary':'Cookie'};
  try {
    const client = await makeClient();
    const {data, error} = await client.auth.getUser();
    if (error && (!error.status || error.status >= 500 || error.status === 429) && error.name !== 'AuthSessionMissingError') {
      return Response.json({error:'unavailable'}, {status:503, headers});
    }
    if(error || !data.user || data.user.is_anonymous)return Response.json({user:null,account:null},{headers});
    const security=await assessMfa(client,data.user);
    requireMfa(security);
    return Response.json({user:publicUser(data.user),account:accountDetails({...data.user,factors:security.all})},{headers});
  } catch(error) {return securityResponse(error);}
}
