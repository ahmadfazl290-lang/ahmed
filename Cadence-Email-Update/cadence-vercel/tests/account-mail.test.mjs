import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mailConfigured,sendAccountEmail} from '../lib/account-mail.ts';
test('email setup fails closed and provider calls keep token secrets out of metadata',async()=>{
 const names=['RESEND_API_KEY','EMAIL_FROM','SITE_URL'];
 const saved=names.map(name=>process.env[name]);const originalFetch=globalThis.fetch;
 try{
  for(const name of names)delete process.env[name];
  let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('must not call network');};
  assert.equal(mailConfigured(),false);
  await assert.rejects(sendAccountEmail('owner@example.test','reset','a'.repeat(64)),/EMAIL_NOT_CONFIGURED/);
  assert.equal(calls,0);
  process.env.RESEND_API_KEY='testing-only';process.env.EMAIL_FROM='Cadence <onboarding@resend.dev>';process.env.SITE_URL='https://cadence.example.test';
  assert.equal(mailConfigured(),true);
  let request;
  globalThis.fetch=async(url,options)=>{request={url,options};return new Response('{}',{status:200});};
  const token='b'.repeat(64);await sendAccountEmail('owner@example.test','verify',token);
  assert.equal(request.url,'https://api.resend.com/emails');
  assert.equal(request.options.headers.Authorization,'Bearer testing-only');
  assert.ok(!request.options.headers['Idempotency-Key'].includes(token));
  const body=JSON.parse(request.options.body);
  assert.deepEqual(body.to,['owner@example.test']);
  assert.ok(body.text.includes('https://cadence.example.test/account#action=verify&token='+token));
  globalThis.fetch=async()=>new Response('provider detail must stay private',{status:403});
  await assert.rejects(sendAccountEmail('owner@example.test','reset',token),/^Error: EMAIL_DELIVERY_FAILED$/);
  process.env.SITE_URL='https://user:password@cadence.example.test';assert.equal(mailConfigured(),false);
 }finally{
  globalThis.fetch=originalFetch;
  names.forEach((name,i)=>{if(saved[i]===undefined)delete process.env[name];else process.env[name]=saved[i];});
 }
});
