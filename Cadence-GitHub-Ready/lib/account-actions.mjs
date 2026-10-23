export const TOKEN_LIFETIMES={verify:24*60*60*1000,reset:30*60*1000};
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function tokenDigest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function validToken(value){return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);}
export function accountLink(origin,purpose,token){
 if(!['verify','reset'].includes(purpose)||!validToken(token))throw new Error('INVALID_TOKEN');
 const base=new URL(origin);
 if(base.username||base.password||!['http:','https:'].includes(base.protocol)||(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname)))throw new Error('INVALID_SITE_URL');
 const link=new URL('/account',base.origin);
 link.hash=new URLSearchParams({action:purpose,token}).toString();
 return link.toString();
}
// One PostgreSQL statement: token consumption and account mutation are atomic.
export const VERIFY_SQL=`WITH consumed AS (
 DELETE FROM email_action_tokens WHERE token_hash=? AND purpose='verify' AND expires_at>? RETURNING user_id,auth_version
), updated AS (
 UPDATE email_accounts a SET email_verified_at=?,password_hash=?,salt=?,auth_version=a.auth_version+1 FROM consumed c WHERE a.user_id=c.user_id AND a.auth_version=c.auth_version RETURNING a.user_id
), revoked AS (
 DELETE FROM email_sessions WHERE user_id IN (SELECT user_id FROM updated)
) SELECT user_id AS "userId" FROM updated`;
export const RESET_SQL=`WITH consumed AS (
 DELETE FROM email_action_tokens WHERE token_hash=? AND purpose='reset' AND expires_at>? RETURNING user_id,auth_version
), updated AS (
 UPDATE email_accounts a SET password_hash=?,salt=?,auth_version=a.auth_version+1 FROM consumed c WHERE a.user_id=c.user_id AND a.auth_version=c.auth_version RETURNING a.user_id
), revoked AS (
 DELETE FROM email_sessions WHERE user_id IN (SELECT user_id FROM updated)
) SELECT user_id AS "userId" FROM updated`;
export async function consumeVerification(db,token,hash,salt,now=Date.now()){
 if(!validToken(token))return null;
 return db.prepare(VERIFY_SQL).bind(await tokenDigest(token),now,now,hash,salt).first();
}
export async function consumeReset(db,token,hash,salt,now=Date.now()){
 if(!validToken(token))return null;
 return db.prepare(RESET_SQL).bind(await tokenDigest(token),now,hash,salt).first();
}
