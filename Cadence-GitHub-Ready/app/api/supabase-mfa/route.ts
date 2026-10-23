import {createClient} from '../../../lib/supabase/server';
import {handleMfa} from '../../../lib/supabase/mfa-handler';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleMfa(request,createClient);}
export async function POST(request:Request){return handleMfa(request,createClient);}
