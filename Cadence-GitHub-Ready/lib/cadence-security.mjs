const namespaces = new Set(['level_progress','profile','vocab','activity_log','progress_snapshots','achievements_earned']);
export function storageKey(key, user) {
 if(!user?.userId) throw new Error('AUTH_REQUIRED');
 if(typeof key!=='string'||key.length>250) throw new Error('INVALID_KEY');
 const split=key.lastIndexOf(':'); const namespace=key.slice(0,split);
 if(!namespaces.has(namespace)||key.slice(split+1).toLowerCase()!==user.email.trim().toLowerCase()) throw new Error('INVALID_KEY');
 return namespace;
}
export function validOrigin(request){return request.headers.get('origin')===new URL(request.url).origin;}
