'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

/** Opt-in only; no existing application entry point imports this utility. */
export function createClient() {
  const { url, publishableKey } = getSupabaseConfig();
  // The SSR helper reuses its browser singleton and uses Supabase-specific cookies.
  return createBrowserClient(url, publishableKey, {
    cookieOptions: { secure: process.env.NODE_ENV === 'production' },
  });
}
