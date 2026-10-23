import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';
import {getSupabaseConfig} from './lib/supabase/config';

// Only account-related requests participate; guest and Neon routes are untouched.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({request});
  try {
    const {url, publishableKey} = getSupabaseConfig();
    const client = createServerClient(url, publishableKey, {
      cookieOptions: {secure: process.env.NODE_ENV === 'production', sameSite: 'lax'},
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          values.forEach(({name, value}) => request.cookies.set(name, value));
          response = NextResponse.next({request});
          values.forEach(({name, value, options}) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });
    // Online validation also observes revoked sessions. Failure never blocks guest access.
    await client.auth.getUser();
  } catch { /* The account endpoint reports availability errors safely. */ }
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export const config = {matcher: ['/account', '/api/supabase-auth', '/api/supabase-mfa', '/auth/confirm']};
