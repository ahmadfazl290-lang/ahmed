// Browser token issuance is intentionally unavailable: audio uses our server route.
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export function pronunciationUnavailable(){return Response.json({error:{code:'TOKEN_NOT_AVAILABLE'}},{status:503,headers});}
