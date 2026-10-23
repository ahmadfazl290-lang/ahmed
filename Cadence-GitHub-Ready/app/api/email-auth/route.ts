import {env} from '../../../lib/runtime';
import {EMAIL_COOKIE,digest,passwordHash} from '../../../lib/email-auth';
import {validOrigin} from '../../../lib/cadence-security.mjs';
import {after} from 'next/server';
import {mailConfigured,verificationRequired} from '../../../lib/account-mail';
import {issueAccountEmail} from '../../../lib/email-requests';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function POST(request:Request){
 if(!validOrigin(request))return json({error:'Invalid origin.'},403);
 if(!env.DB)return json({error:'Account storage is unavailable.'},503);
 const cookie=(value:string,age:number)=>`${EMAIL_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.NODE_ENV==='production'||new URL(request.url).protocol==='https:'?'; Secure':''}`;
 try{
  const raw=await request.text();if(raw.length>4096)return json({error:'Invalid request.'},400);
  const body=JSON.parse(raw);
  if(body.action==='signout'){
   const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(EMAIL_COOKIE+'='))?.slice(EMAIL_COOKIE.length+1);
   if(token)await env.DB.prepare('DELETE FROM email_sessions WHERE token_hash=?').bind(await digest(token)).run();
   return json({ok:true},200,cookie('',0));
  }
  if(!['signup','signin'].includes(body.action))return json({error:'Invalid request.'},400);
  const invite=process.env.REGISTRATION_CODE;
  if(body.action==='signup'&&invite&&body.registrationCode!==invite)return json({error:'A valid registration code is required.'},403);
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  const password=typeof body.password==='string'?body.password:'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof body.password!=='string'||password.length<10||password.length>128)return json({error:'Enter a valid email and a password of 10–128 characters.'},400);
  const name=typeof body.name==='string'?body.name.trim():'';
  if(body.action==='signup'&&(!name||name.length>80))return json({error:'Enter your name (up to 80 characters).'},400);
  const bucket=Math.floor(Date.now()/900000);
  const address=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
  const ipKey='ip:'+await digest(address);
  const ipCount=await env.DB.prepare('INSERT INTO email_attempts(email,window_start,attempt_count) VALUES(?,?,1) ON CONFLICT(email) DO UPDATE SET attempt_count=CASE WHEN email_attempts.window_start=excluded.window_start THEN email_attempts.attempt_count+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempt_count AS count').bind(ipKey,bucket).first<{count:number}>();
  if((ipCount?.count||0)>40)return json({error:'Too many attempts. Try again in 15 minutes.'},429);
  const count=await env.DB.prepare('INSERT INTO email_attempts(email,window_start,attempt_count) VALUES(?,?,1) ON CONFLICT(email) DO UPDATE SET attempt_count=CASE WHEN email_attempts.window_start=excluded.window_start THEN email_attempts.attempt_count+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempt_count AS count').bind(email,bucket).first<{count:number}>();
  if((count?.count||0)>10)return json({error:'Too many attempts. Try again in 15 minutes.'},429);
  let account=await env.DB.prepare('SELECT user_id AS "userId",name,email,password_hash AS hash,salt,email_verified_at AS verified,auth_version AS version FROM email_accounts WHERE email=?').bind(email).first<{userId:string,name:string,email:string,hash:string,salt:string,verified:number|null,version:number}>();
  if(body.action==='signup'){
   if(verificationRequired()&&!mailConfigured())return json({error:'Email delivery is not configured yet.'},503);
   if(account)return json({error:'Could not create this account. Try signing in.'},400);
   const salt=crypto.randomUUID(),hash=await passwordHash(password,salt),userId='email:'+crypto.randomUUID();
   await env.DB.prepare('INSERT INTO email_accounts(user_id,email,name,password_hash,salt,created_at) VALUES(?,?,?,?,?,?)').bind(userId,email,name,hash,salt,Date.now()).run();
   account={userId,email,name,hash,salt,verified:null,version:0};
   if(mailConfigured())after(async()=>{try{await issueAccountEmail(email,'verify');}catch{console.error('ACCOUNT_EMAIL_DELIVERY_FAILED');}});
  }else{
   const computed=await passwordHash(password,account?.salt||'cadence-nonexistent-account');
   let difference=0;const expected=account?.hash||'0'.repeat(64);
   for(let i=0;i<64;i++)difference|=computed.charCodeAt(i)^expected.charCodeAt(i);
   if(!account||difference)return json({error:'Email or password is incorrect.'},401);
  }
  if(verificationRequired()&&account.verified===null)return json({ok:body.action==='signup',verificationRequired:true,error:body.action==='signin'?'Verify your email before signing in.':undefined},body.action==='signup'?200:403);
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  await env.DB.prepare('DELETE FROM email_sessions WHERE expires_at<?').bind(Date.now()).run();
  await env.DB.prepare('INSERT INTO email_sessions(token_hash,user_id,expires_at,auth_version) VALUES(?,?,?,?)').bind(await digest(token),account.userId,Date.now()+7*86400000,account.version).run();
  return json({ok:true},200,cookie(token,7*86400));
 }catch{return json({error:'Could not process your account. Please try again.'},500);}
}
