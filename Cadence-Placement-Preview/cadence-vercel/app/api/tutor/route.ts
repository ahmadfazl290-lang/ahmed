export const dynamic='force-dynamic';
export async function POST(){return Response.json({error:'This feature has been removed.'},{status:410,headers:{'Cache-Control':'no-store'}});}
