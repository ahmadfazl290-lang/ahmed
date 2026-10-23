import {accountLink,tokenDigest} from './account-actions.mjs';
export function mailConfigured(){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM||!process.env.SITE_URL)return false;
 try{accountLink(process.env.SITE_URL,'verify','a'.repeat(64));return true;}catch{return false;}
}
export function verificationRequired(){return process.env.REQUIRE_EMAIL_VERIFICATION==='true';}
export async function sendAccountEmail(email:string,purpose:'verify'|'reset',token:string){
 if(!mailConfigured())throw new Error('EMAIL_NOT_CONFIGURED');
 const link=accountLink(process.env.SITE_URL!,purpose,token);
 const title=purpose==='verify'?'Verify your Cadence email':'Reset your Cadence password';
 const text=purpose==='verify'?`Confirm this email address for your Cadence account. This link expires in 24 hours.\n\n${link}\n\nIf you did not request this, ignore this email.`:`Choose a new password for your Cadence account. This link expires in 30 minutes and works once.\n\n${link}\n\nIf you did not request a reset, ignore this email. Your password has not changed.`;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`cadence-${purpose}-${await tokenDigest(token)}`},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[email],subject:title,text}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('EMAIL_DELIVERY_FAILED');
}
