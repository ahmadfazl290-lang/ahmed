const namespaces = new Set(['level_progress','profile','vocab','errors','activity_log','progress_snapshots','achievements_earned','course_progress','practice_history','presentation_progress','call_sessions','daily_lesson','daily_lesson_history','tutor_active','tutor_sessions']);
export function storageKey(key, user) {
 if(!user?.userId) throw new Error('AUTH_REQUIRED');
 if(typeof key!=='string'||key.length>250) throw new Error('INVALID_KEY');
 const split=key.lastIndexOf(':'); const namespace=key.slice(0,split);
 if((!namespaces.has(namespace)&&!/^practice_active:[a-z0-9_-]{1,80}$/.test(namespace))||key.slice(split+1).toLowerCase()!==user.email.trim().toLowerCase()) throw new Error('INVALID_KEY');
 return namespace;
}
export function validOrigin(request){return request.headers.get('origin')===new URL(request.url).origin;}
export function validateTutor(body){
 if(!body||typeof body.system!=='string'||body.system.length>12000) throw new Error('INVALID_REQUEST');
 if(!Array.isArray(body.messages)||!body.messages.length||body.messages.length>40) throw new Error('INVALID_MESSAGES');
 const messages=body.messages.map(m=>{if(!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>8000) throw new Error('INVALID_MESSAGES');return {role:m.role,content:m.content};});
 if(messages.reduce((n,m)=>n+m.content.length,0)>50000) throw new Error('REQUEST_TOO_LARGE');
 return {system:body.system,messages,max_tokens:Math.max(64,Math.min(1500,Math.floor(Number(body.maxTokens)||500)))};
}
