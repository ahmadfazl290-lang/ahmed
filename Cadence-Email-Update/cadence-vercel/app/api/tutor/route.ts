import {env} from '../../../lib/runtime';
import {getChatGPTUser} from '../../chatgpt-auth';
import {validateTutor,validOrigin} from '../../../lib/cadence-security.mjs';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user) return json({error:'Sign in to use your tutor.'},401);
 if(!validOrigin(request)) return json({error:'Invalid origin.'},403);
 const secret=(env as unknown as Record<string,string>).ANTHROPIC_API_KEY;
 if(!secret) return json({error:'AI is not configured yet.'},503);
 if(!env.DB) return json({error:'Tutor storage is not configured.'},503);
 const raw=await request.text();if(raw.length>70000) return json({error:'Message is too large.'},413);
 let payload;try{payload=validateTutor(JSON.parse(raw));}catch{return json({error:'Invalid tutor request.'},400);}
 const windowStart=Math.floor(Date.now()/60000)*60000;
 const rate=await env.DB.prepare('INSERT INTO tutor_rate_limits(user_id,window_start,request_count) VALUES(?,?,1) ON CONFLICT(user_id) DO UPDATE SET request_count=CASE WHEN tutor_rate_limits.window_start=excluded.window_start THEN tutor_rate_limits.request_count+1 ELSE 1 END,window_start=excluded.window_start RETURNING request_count AS count').bind(user.userId,windowStart).first<{count:number}>();
 if((rate?.count||0)>12) return json({error:'Please wait a minute before sending another message.'},429);
 try{
  const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':secret,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:(env as unknown as Record<string,string>).ANTHROPIC_MODEL||'claude-sonnet-4-6',...payload}),signal:AbortSignal.timeout(25000)});
  if(!response.ok) return json({error:'The AI provider is unavailable. Please try again later.'},502);
  const data=await response.json() as {content?:{type:string,text?:string}[]};const text=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text||'').join('\n').trim();
  return text?json({text}):json({error:'The tutor returned an empty response.'},502);
 }catch{return json({error:'The tutor timed out or could not connect.'},502);}
}
