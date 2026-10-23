export const ACCOUNT_PATH = '/account?provider=supabase';
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('host');
  // Next's local server can normalize 127.0.0.1 to localhost internally.
  // Accept that spelling only when the server URL itself is also loopback.
  if (['localhost','127.0.0.1'].includes(url.hostname) && host && /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(host)) {
    return new URL(url.protocol + '//' + host).origin;
  }
  return url.origin;
}
export function validEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 10 && value.length <= 128;
}
// Redirect destinations are fixed by the server, never supplied by a client.
export function callbackDestination(type: string | null) {
  return type === 'recovery' ? ACCOUNT_PATH + '&mode=update' : ACCOUNT_PATH + '&result=verified';
}
export const EMAIL_COOLDOWN_SECONDS = 60;
const emailRequests = new Map<string, number>();
export async function reserveEmailRequest(email: string, now = Date.now()) {
  for (const [key, until] of emailRequests) if (until <= now) emailRequests.delete(key);
  const key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email))), b => b.toString(16).padStart(2,'0')).join('');
  const until = emailRequests.get(key);
  if (until) return Math.ceil((until - now) / 1000);
  if (emailRequests.size >= 10000) return EMAIL_COOLDOWN_SECONDS;
  emailRequests.set(key, now + EMAIL_COOLDOWN_SECONDS * 1000);
  return 0;
}
export function publicUser(user: {id: string; email?: string; email_confirmed_at?: string; user_metadata?: Record<string, unknown>} | null) {
  if (!user?.email_confirmed_at) return null;
  return {id: user.id, email: user.email, verified: true};
}

// Supplemental per-process protection. Supabase's project limits remain authoritative.
const attempts = new Map<string, {count: number; until: number}>();
export async function allowAttempt(address: string, email: string, now = Date.now()) {
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
  const keys = [await digest('ip:' + address), await digest('email:' + email)];
  if (attempts.size > 10000) return false;
  let allowed = true;
  keys.forEach((key, index) => {
    const item = attempts.get(key) ?? {count: 0, until: now + 900000};
    item.count++; attempts.set(key, item);
    if (item.count > (index === 0 ? 40 : 10)) allowed = false;
  });
  return allowed;
}
