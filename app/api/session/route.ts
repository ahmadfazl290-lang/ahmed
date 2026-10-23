import {getChatGPTUser} from '../../chatgpt-auth';
import {env} from '../../../lib/runtime';
import {mailConfigured,verificationRequired} from '../../../lib/account-mail';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({mode:'hosted',development:false,emailAuth:true,emailConfigured:mailConfigured(),verificationRequired:verificationRequired(),databaseConfigured:!!env.DB,registrationCodeRequired:!!process.env.REGISTRATION_CODE,user:await getChatGPTUser()},{headers:{'Cache-Control':'no-store'}});}
