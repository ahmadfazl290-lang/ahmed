// Navigation preferences only. Neither key grants account access or changes learning records.
export const EXPLICIT_GUEST_KEY = 'englishco:entry:guest';
export const ENTRY_NOTICE_KEY = 'englishco:entry:notice';
export type EntryDecision = {kind:'signed-out'|'verification'|'mfa'|'unavailable'} | {kind:'authenticated';subject:string};
const record = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value);
/** Interpret only the existing server-validated readAccount response; never decode tokens or consult guest data. */
export function entryDecision(status:number, value:unknown):EntryDecision {
  if(!record(value))return {kind:'unavailable'};
  if(status===403 && value.error==='mfa_required')return {kind:'mfa'};
  if(status===401 && value.error==='expired')return {kind:'signed-out'};
  if(status!==200 || 'error' in value)return {kind:'unavailable'};
  if(value.user===null && value.account===null)return {kind:'signed-out'};
  if(value.user===null && record(value.account) && value.account.verified===false)return {kind:'verification'};
  if(record(value.user) && value.user.verified===true && typeof value.user.id==='string' && value.user.id.trim()) {
    if(!record(value.account) || value.account.verified!==true)return {kind:'unavailable'};
    return {kind:'authenticated',subject:value.user.id};
  }
  return {kind:'unavailable'};
}
