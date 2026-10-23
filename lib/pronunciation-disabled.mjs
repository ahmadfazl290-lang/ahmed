// Stage B is local practice only. No environment, client flag or payload can enable Azure.
export const ASSESSMENT_ENABLED = false;
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export function pronunciationStatus(){return Response.json({enabled:ASSESSMENT_ENABLED,configured:false,provider:'Azure Speech',maxSeconds:20},{headers});}
export function pronunciationUnavailable(){return Response.json({error:{code:'ASSESSMENT_DISABLED'}},{status:503,headers});}
