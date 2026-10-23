import {after} from 'next/server';
import {env} from '../../../lib/runtime';
import {digest,passwordHash} from '../../../lib/email-auth';
import {mailConfigured} from '../../../lib/account-mail';
import {issueAccountEmail} from '../../../lib/email-requests';
import {consumeReset,consumeVerification,validToken} from '../../../lib/account-actions.mjs';
import {validOrigin} from '../../../lib/cadence-security.mjs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!validOrigin(request))return json({error:'Invalid origin.'},403);
 const db=env.DB;if(!db)return json({error:'Account storage is unavailable.'},503);
 try{
  const raw=await request.text();if(raw.length>4096)return json({error:'Invalid request.'},400);
  const body=JSON.parse(raw),action=body.action;
  if(!['request_reset','request_verification','reset','verify'].includes(action))return json({error:'Invalid request.'},400);
  const address=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';
  const count=await db.prepare('INSERT INTO email_attempts(email,window_start,attempt_count) VALUES(?,?,1) ON CONFLICT(email) DO UPDATE SET attempt_count=CASE WHEN email_attempts.window_start=excluded.window_start THEN email_attempts.attempt_count+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempt_count AS count').bind('account-ip:'+await digest(address),Math.floor(Date.now()/900000)).first<{count:number}>();
  if((count?.count||0)>20)return json({error:'Too many attempts. Try again in 15 minutes.'},429);
  if(action==='request_reset'||action==='request_verification'){
   if(!mailConfigured())return json({error:'Email delivery is not configured yet.'},503);
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Enter a valid email address.'},400);
   const emailCount=await db.prepare('INSERT INTO email_attempts(email,window_start,attempt_count) VALUES(?,?,1) ON CONFLICT(email) DO UPDATE SET attempt_count=CASE WHEN email_attempts.window_start=excluded.window_start THEN email_attempts.attempt_count+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempt_count AS count').bind('account-email:'+email,Math.floor(Date.now()/900000)).first<{count:number}>();
   // Same outward response for unknown, verified, and rate-limited addresses.
   if((emailCount?.count||0)<=3)after(async()=>{try{await issueAccountEmail(email,action==='request_reset'?'reset':'verify');}catch{console.error('ACCOUNT_EMAIL_DELIVERY_FAILED');}});
   return json({ok:true,message:'If this account is eligible, instructions will arrive by email.'});
  }
  if(!validToken(body.token))return json({error:'This link is invalid or expired.'},400);
  if(typeof body.password!=='string'||body.password.length<10||body.password.length>128)return json({error:'Use a password of 10–128 characters.'},400);
  const salt=crypto.randomUUID(),hash=await passwordHash(body.password,salt);
  const result=action==='reset'?await consumeReset(db,body.token,hash,salt):await consumeVerification(db,body.token,hash,salt);
  if(!result)return json({error:'This link is invalid or expired.'},400);
  return json({ok:true});
 }catch{return json({error:'Could not process this request. Please try again.'},500);}
}
