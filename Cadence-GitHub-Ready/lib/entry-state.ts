// Navigation preferences only. Neither key grants account access or changes learning records.
export const EXPLICIT_GUEST_KEY = 'englishco:entry:guest';
export const ENTRY_NOTICE_KEY = 'englishco:entry:notice';
export type EntryDecision = {kind:'signed-out'|'verification'|'mfa'|'unavailable'} | {kind:'authenticated';subject:string};
type LearningEntry = {kind:'guest'} | {kind:'account';subject:string} | {kind:'mfa'} | {kind:'verification'};
/** Public lessons are available when no account session can be established. */
export function learningEntry(decision:null, explicitGuest?:boolean):{kind:'guest'};
export function learningEntry(decision:EntryDecision|null, explicitGuest:true):{kind:'guest'};
export function learningEntry(decision:EntryDecision|null, explicitGuest?:boolean):LearningEntry;
export function learningEntry(decision:EntryDecision|null, explicitGuest=false) {
  if(explicitGuest)return {kind:'guest'} as const;
  if(decision?.kind==='authenticated')return {kind:'account',subject:decision.subject} as const;
  if(decision?.kind==='mfa')return {kind:'mfa'} as const;
  if(decision?.kind==='verification')return {kind:'verification'} as const;
  return {kind:'guest'} as const;
}
const record = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value);
/** Interpret only the existing server-validated readAccount response; never decode tokens or consult guest data. */
export function entryDecision(status:number, value:unknown):EntryDecision {
  if(!record(value))return {kind:'unavailable'};
  if(status===403 && value.error==='mfa_required')return {kind:'mfa'};
  if(status===401 && value.error==='expired')return {kind:'signed-out'};
  if(status!==200 || 'error' in value)return {kind:'unavailable'};
  if(value.user===null && value.account===null)return {kind:'signed-out'};
  if(value.user===null && record(value.account) && value.account.verified===false)return {kind:'verification'};
  if(record(value.user) && value.user.verified===true && typeof value.user.id==='string' && value.user.id.trim() && value.user.id.length<=512) {
    if(!record(value.account) || value.account.verified!==true)return {kind:'unavailable'};
    return {kind:'authenticated',subject:value.user.id};
  }
  return {kind:'unavailable'};
}
