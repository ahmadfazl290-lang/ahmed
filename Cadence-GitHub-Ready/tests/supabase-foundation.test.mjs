import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { getSupabaseConfig } from '../lib/supabase/config.ts';

// Exercise real SDK construction without a live server, session, or network access.
// Transpile in memory using the project's existing compiler. This avoids loader
// hooks that are unavailable on the project's minimum supported Node 22.13.
async function importUtility(name) {
  const source = await readFile(new URL(`../lib/supabase/${name}.ts`, import.meta.url), 'utf8');
  const cookieModule = 'data:text/javascript,' + encodeURIComponent(
    'export async function cookies(){return globalThis.__supabaseTestCookies;}'
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
    .replace("'@supabase/ssr'", JSON.stringify(import.meta.resolve('@supabase/ssr')))
    .replace("'./config'", JSON.stringify(new URL('../lib/supabase/config.ts', import.meta.url).href))
    .replace("'next/headers'", JSON.stringify(cookieModule));
  return import('data:text/javascript,' + encodeURIComponent(code));
}

test('configuration fails safely and rejects privileged keys and unsafe URLs', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.throws(getSupabaseConfig, /requires NEXT_PUBLIC_SUPABASE_URL/);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
    for (const url of ['invalid', 'http://project.example', 'https://user:password@project.example', 'https://project.example/?token=fixture']) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      assert.throws(getSupabaseConfig, /valid HTTPS project URL/);
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.example';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_fixture';
    assert.throws(getSupabaseConfig, /must be a publishable key/);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
    assert.equal(getSupabaseConfig().url, 'https://project.example');
  } finally {
    for (const [name, value] of Object.entries({NEXT_PUBLIC_SUPABASE_URL: originalUrl, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: originalKey})) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('real SSR clients initialize without network calls or changes to existing cookies', async () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalFetch = globalThis.fetch;
  let requests = 0, writes = 0;
  globalThis.fetch = async () => { requests++; throw new Error('Unexpected network call'); };
  globalThis.__supabaseTestCookies = {
    getAll: () => [{name: 'cadence_email_session', value: 'existing-session-fixture'}],
    set: () => { writes++; },
  };
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.example';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  const clients = [];
  try {
    const browser = await importUtility('client');
    const server = await importUtility('server');
    clients.push(browser.createClient(), await server.createClient(), await server.createClient());
    assert.notEqual(clients[1], clients[2], 'server clients must be request-scoped');
    for (const client of clients) {
      assert.equal(typeof client.from, 'function');
      const {data, error} = await client.auth.getSession();
      assert.equal(error, null);
      assert.equal(data.session, null);
    }
    assert.equal(requests, 0);
    assert.equal(writes, 0);
  } finally {
    for (const client of clients) client.auth.stopAutoRefresh();
    globalThis.fetch = originalFetch;
    delete globalThis.__supabaseTestCookies;
    for (const [name, value] of Object.entries({NEXT_PUBLIC_SUPABASE_URL: originalUrl, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: originalKey})) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
