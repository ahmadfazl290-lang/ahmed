import {env} from './runtime';
import {sendAccountEmail} from './account-mail';
import {randomToken,tokenDigest,TOKEN_LIFETIMES} from './account-actions.mjs';
export async function issueAccountEmail(email:string,purpose:'verify'|'reset'){
 const db=env.DB;if(!db)return;
 const account=await db.prepare('SELECT user_id AS "userId",auth_version AS version,email_verified_at AS verified FROM email_accounts WHERE email=?').bind(email).first<{userId:string,version:number,verified:number|null}>();
 if(!account||(purpose==='verify'&&account.verified!==null))return;
 const token=randomToken(),hash=await tokenDigest(token),now=Date.now();
 await db.prepare('DELETE FROM email_action_tokens WHERE expires_at<?').bind(now).run();
 await db.prepare('INSERT INTO email_action_tokens(token_hash,user_id,purpose,expires_at,created_at,auth_version) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,purpose) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,created_at=excluded.created_at,auth_version=excluded.auth_version').bind(hash,account.userId,purpose,now+TOKEN_LIFETIMES[purpose],now,account.version).run();
 try{await sendAccountEmail(email,purpose,token);}catch{
  await db.prepare('DELETE FROM email_action_tokens WHERE token_hash=?').bind(hash).run();
  throw new Error('ACCOUNT_EMAIL_FAILED');
 }
}
