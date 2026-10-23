/** Public configuration only. Read lazily so unused clients cannot affect guest startup. */
export function getSupabaseConfig() {
  // Keep literal property accesses: Next.js inlines these for the browser build.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error('Supabase requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS project URL.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS project URL.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a publishable key.');
  }
  return { url, publishableKey };
}
