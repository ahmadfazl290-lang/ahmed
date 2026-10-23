import {env} from '../../../lib/runtime';
import {getChatGPTUser} from '../../chatgpt-auth';
import {storageKey,validOrigin} from '../../../lib/cadence-security.mjs';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function handle(request:Request){
 const user=await getChatGPTUser();
 if(!user) return json({error:'Sign in to access your learning data.'},401);
 if(!validOrigin(request)) return json({error:'Invalid origin.'},403);
 if(!env.DB) return json({error:'Learning storage is not configured.'},503);
 const raw=await request.text();if(raw.length>260000) return json({error:'Record is too large.'},413);
 try {
  const {key,value}=JSON.parse(raw);const namespace=storageKey(key,user);
  if(request.method==='POST'){
   const record=await env.DB.prepare('SELECT record_value AS value FROM learning_records WHERE user_id = ? AND record_key = ?').bind(user.userId,namespace).first<{value:string}>();
   return json(record?{key,value:record.value}:null);
  }
  if(request.method==='DELETE'){
   await env.DB.prepare('DELETE FROM learning_records WHERE user_id = ? AND record_key = ?').bind(user.userId,namespace).run();return json({key,deleted:true});
  }
  if(typeof value!=='string'||value.length>250000) return json({error:'Invalid record.'},400);
  JSON.parse(value);
  await env.DB.prepare('INSERT INTO learning_records(user_id,record_key,record_value,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,record_key) DO UPDATE SET record_value=excluded.record_value,updated_at=excluded.updated_at').bind(user.userId,namespace,value,Date.now()).run();
  return json({key,value});
 }catch(error){const code=error instanceof Error?error.message:'';return json({error:code==='INVALID_KEY'?'Invalid record key.':'Could not process your learning data.'},code==='INVALID_KEY'||error instanceof SyntaxError?400:500);}
}
export const POST=handle;export const PUT=handle;export const DELETE=handle;
