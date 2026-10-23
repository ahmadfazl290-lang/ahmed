import {createClient} from '../../../lib/supabase/server';
import {handleAuth} from '../../../lib/supabase/auth-handler';
import {readAccount} from '../../../lib/supabase/account-details';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return handleAuth(request, createClient); }
export async function GET() { return readAccount(createClient); }
