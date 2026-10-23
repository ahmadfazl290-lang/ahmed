// Unit-test protocol mocks only. No real tokens, accounts or MFA factors.
export const mfaPolicyUrl=new URL('../lib/supabase/mfa-policy.ts',import.meta.url).href;
export function withSecurity(client,user={id:'uuid-fixture',factors:[]},aal='aal1'){
  const auth=client.auth;
  auth.getSession ??= async()=>({data:{session:{access_token:'mock-token-carrier'}},error:null});
  auth.getClaims ??= async()=>({data:{claims:{sub:user.id,aal,exp:Math.floor(Date.now()/1000)+3600}},error:null});
  auth.mfa ??= {
    getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal,nextLevel:(user.factors || []).some(f=>f.status==='verified')?'aal2':aal},error:null}),
    listFactors:async()=>({data:{all:user.factors || []},error:null}),
  };
  return client;
}
