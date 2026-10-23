'use client';
import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {ShieldCheck,Loader2,Check,CircleAlert} from 'lucide-react';
import {mfaCopy} from './mfa-copy';
import type {safeMfaState} from '../lib/supabase/mfa-policy';
type State=ReturnType<typeof safeMfaState>;
type Enrollment={id:string;qrCode:string;secret:string};
export default function MfaPanel({lang,challenge=false,compact=false,onVerified,onSignedOut}:{lang:'en'|'ku';challenge?:boolean;compact?:boolean;onVerified?:()=>void;onSignedOut?:()=>void}){
  const t=mfaCopy[lang],id=useId();
  const [state,setState]=useState<State|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [view,setView]=useState<'status'|'intro'|'setup'|'success'|'remove'>('status');
  const [managing,setManaging]=useState(false);
  const [enrollment,setEnrollment]=useState<Enrollment|null>(null),[factorId,setFactorId]=useState(''),[code,setCode]=useState(''),[name,setName]=useState(t.defaultName);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[cooldown,setCooldown]=useState(0),[now,setNow]=useState(Date.now());
  const controller=useRef<AbortController|null>(null),version=useRef(0),lock=useRef(false),setup=useRef<Enrollment|null>(null);
  const setupValidated=useRef(false);
  const codeRef=useRef<HTMLInputElement>(null),errorRef=useRef<HTMLDivElement>(null);
  function dispose(){setup.current=null;setupValidated.current=false;setEnrollment(null);setCode('');}
  function notify(){window.dispatchEvent(new Event('englishco-auth-change'));if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('englishco-auth');channel.postMessage('changed');channel.close();}}
  async function load(){
    if(lock.current)return;
    controller.current?.abort();const current=++version.current;controller.current=new AbortController();setupValidated.current=false;setState(null);setLoading(true);setError('');
    try{
      const response=await fetch('/api/supabase-mfa',{cache:'no-store',credentials:'same-origin',signal:controller.current.signal});
      const data=await response.json();
      if(current!==version.current)return;
      if(!response.ok){setError(data.error || 'unavailable');return;}
      if(setup.current && (!data.factors.some((f:State['factors'][number])=>f.id===setup.current?.id && f.status==='unverified') || data.required)){dispose();setView('status');}
      else if(setup.current)setupValidated.current=true;
      setState(data);setFactorId(data.factors.find((f:State['factors'][number])=>f.status==='verified')?.id || '');
    }catch{if(current===version.current && !controller.current?.signal.aborted)setError('unavailable');}
    finally{if(current===version.current)setLoading(false);}
  }
  function abandon(){
    const factor=setup.current;dispose();controller.current?.abort();version.current++;setState(null);setView('status');setLoading(true);
    if(factor)void fetch('/api/supabase-mfa',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel',factorId:factor.id})}).catch(()=>{});
  }
  useEffect(()=>{
    void load();
    const visibility=()=>{
      if(document.hidden){controller.current?.abort();version.current++;setupValidated.current=false;setLoading(true);setState(null);setCode('');}
      else void load();
    };
    const focus=()=>{if(!setup.current && !lock.current){setView('status');void load();}};
    const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('englishco-auth');
    if(channel)channel.onmessage=()=>{abandon();void load();};
    const timer=window.setInterval(()=>{if(!setup.current && !lock.current && !document.hidden){setView('status');void load();}},60000);
    window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);channel?.close();abandon();};
  },[]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  useEffect(()=>{if(view==='setup' || (challenge && state?.required))codeRef.current?.focus();},[view,challenge,state?.required]);
  async function action(action:string,extra:Record<string,unknown>={}){
    if(lock.current || (action!=='signout' && cooldown>Date.now()))return;
    if(action==='verify' && !/^\d{6}$/.test(code)){setError('validation');codeRef.current?.focus();return;}
    if(action==='enroll' && (!name.trim() || name.trim().length>64)){setError('validation');return;}
    lock.current=true;setBusy(true);setError('');setMessage('');
    controller.current?.abort();const current=++version.current;controller.current=new AbortController();
    try{
      const response=await fetch(action==='signout'?'/api/supabase-auth':'/api/supabase-mfa',{method:'POST',credentials:'same-origin',signal:controller.current.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});
      const data=await response.json();
      if(current!==version.current)return;
      if(!response.ok){setError(data.error || 'unavailable');if(response.status===429)setCooldown(Date.now()+Math.max(1,Math.min(900,Number(data.retryAfter)||60))*1000);if(response.status===401){dispose();setState(null);}return;}
      setCode('');
      if(action==='enroll'){
        if(!data.enrollment?.id || !data.enrollment?.secret || !data.enrollment?.qrCode?.startsWith('data:image/svg+xml;')){setError('unavailable');return;}
        setup.current=data.enrollment;setupValidated.current=true;setEnrollment(data.enrollment);setView('setup');
      }else if(action==='signout'){dispose();setState(null);notify();if(onSignedOut)onSignedOut();else window.location.assign('/account?provider=supabase');}
      else{
        setState(data);
        if(action==='verify'){
          dispose();
          if(data.currentLevel!=='aal2'){setError('unavailable');return;}
          if(challenge){notify();onVerified?.();}else setView('success');
        }else{dispose();setView('status');setMessage(action==='cancel'?t.cancelled:t.removed);notify();}
      }
    }catch{if(current===version.current && !controller.current?.signal.aborted)setError('unavailable');}
    finally{lock.current=false;setBusy(false);}
  }
  const expired=error==='expired' || !!(state && state.expiresAt<=now && (state.required || view==='setup' || view==='intro'));
  useEffect(()=>{if(expired)dispose();},[expired]);
  const waiting=busy || cooldown>now;
  const verified=state?.factors.filter(f=>f.status==='verified') || [];
  const status=state?.required?t.required:enrollment && setupValidated.current?t.pending:state?.nextLevel==='aal2'?t.enabled:state?.factors.some(f=>f.status==='unverified')?t.pending:state?t.disabled:t.unavailable;
  const codeForm=(factor:string)=><form onSubmit={(event:FormEvent)=>{event.preventDefault();void action('verify',{factorId:factor,code});}} aria-busy={busy}>
    {challenge && verified.length>1 && <><label htmlFor={`${id}-factor`}>{t.factor}</label><select id={`${id}-factor`} value={factorId} disabled={waiting || expired} onChange={event=>setFactorId(event.target.value)}>{verified.map((f,index)=><option key={f.id} value={f.id}>{f.name || `${t.factor} ${index+1}`}</option>)}</select></>}
    <label htmlFor={`${id}-code`}>{t.code}</label><input ref={codeRef} id={`${id}-code`} className="ec-mfa-code" dir="ltr" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code}
      onChange={event=>{setCode(event.target.value.replace(/[٠-٩۰-۹]/g,c=>String((c.charCodeAt(0)-(c<='٩'?1632:1776)))).replace(/\s/g,'').slice(0,6));setError('');}} aria-describedby={`${id}-hint`} aria-invalid={!!error} disabled={waiting || expired}/>
    <p id={`${id}-hint`}>{t.codeHint}</p><button disabled={waiting || expired || !factor} type="submit">{busy?<><Loader2 size={16} aria-hidden="true"/>{t.wait}</>:t.verify}</button>
  </form>;
  return <section className="ec-mfa" dir={lang==='ku'?'rtl':'ltr'} aria-labelledby={challenge?undefined:`${id}-heading`} aria-busy={loading || busy}>
    <style>{css}</style>
    {!challenge && <><h4 id={`${id}-heading`}><ShieldCheck size={18} aria-hidden="true"/>{t.title}</h4><p>{t.description}</p></>}
    {loading?<p role="status"><Loader2 size={18} aria-hidden="true"/> {t.loading}</p>:<>
      {!challenge && <p className="ec-mfa-badge">{status}</p>}
      {error && <div role="alert" tabIndex={-1} ref={errorRef} className="ec-mfa-error"><CircleAlert size={16} aria-hidden="true"/>{t.errors[error as keyof typeof t.errors] || t.errors.unavailable}{cooldown>now && <span>{Math.ceil((cooldown-now)/1000)} {t.seconds}</span>}</div>}
      {message && <p role="status" className="ec-mfa-success">{message}</p>}
      {expired?<><p role="alert">{t.errors.expired}</p><a href="/account?provider=supabase&mode=signin">{t.signin}</a></>:
        challenge?state?.required?<>{codeForm(factorId)}{!verified.length && <p>{t.errors.factor_missing}</p>}<p>{t.window}</p><p>{t.remaining}: <bdi dir="ltr">{Math.max(0,Math.ceil((state.expiresAt-now)/1000))}</bdi> {t.seconds}</p></>:
          state?<><p>{t.noChallenge}</p><button type="button" onClick={onVerified}>{t.continue}</button></>:null:
        view==='intro'?<><h5>{t.intro}</h5><p>{t.introText}</p><label htmlFor={`${id}-name`}>{t.name}</label><input id={`${id}-name`} value={name} maxLength={64} autoComplete="off" disabled={waiting} onChange={event=>setName(event.target.value)}/><p>{t.nameHint}</p><div className="ec-mfa-actions"><button type="button" disabled={waiting} onClick={()=>void action('enroll',{name:name.trim()})}>{busy?t.wait:t.start}</button><button type="button" disabled={busy} onClick={()=>{setView('status');setError('');}}>{t.back}</button></div></>:
        view==='setup' && enrollment && setupValidated.current?<><p>{t.scan}</p><img className="ec-mfa-qr" src={enrollment.qrCode} alt={t.qr}/><details><summary>{t.manual}</summary><p>{t.secret}</p><code className="ec-mfa-secret" dir="ltr">{enrollment.secret}</code><p>{t.private}</p></details>{codeForm(enrollment.id)}<button type="button" disabled={waiting} onClick={()=>void action('cancel',{factorId:enrollment.id})}>{t.cancel}</button></>:
        view==='success'?<div role="status"><h5><Check size={18} aria-hidden="true"/>{t.success}</h5><p>{t.successText}</p><button type="button" onClick={()=>{setView('status');notify();}}>{t.done}</button></div>:
        view==='remove'?<div role="alertdialog" aria-labelledby={`${id}-remove-title`} aria-describedby={`${id}-remove-description`}><h5 id={`${id}-remove-title`}>{t.removeTitle}</h5><p id={`${id}-remove-description`}>{t.removeText}</p><div className="ec-mfa-actions"><button type="button" autoFocus disabled={waiting} onClick={()=>void action('remove',{factorId,confirm:true})}>{busy?t.wait:t.confirmRemove}</button><button type="button" disabled={busy} onClick={()=>{setView('status');setError('');}}>{t.keep}</button></div></div>:
        state && compact?<a href="/account?provider=supabase&mode=security">{state.nextLevel==='aal2' || state.factors.length?t.manage:t.enable}</a>:
        state?<>{(state.nextLevel==='aal2' || state.factors.length>0) && !managing && <button type="button" onClick={()=>setManaging(true)}>{t.manage}</button>}{managing && <div className="ec-mfa-factors">{state.factors.map((factor,index)=><div className="ec-mfa-factor" key={factor.id}><div><strong>{factor.name || `${t.factor} ${index+1}`}</strong><p>TOTP · {factor.status==='verified'?t.verified:t.unverified}</p>{factor.createdAt && Number.isFinite(Date.parse(factor.createdAt)) && <p>{t.created}: <bdi>{new Intl.DateTimeFormat(lang==='ku'?'ar-IQ':'en-GB',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(factor.createdAt))}</bdi></p>}</div><button type="button" disabled={waiting} onClick={()=>{setFactorId(factor.id);setError('');if(factor.status==='verified')setView('remove');else void action('cancel',{factorId:factor.id});}}>{factor.status==='verified'?t.remove:t.cancel}</button></div>)}</div>}
          {state.required?<a href="/account?provider=supabase&mode=mfa">{t.required}</a>:<button type="button" disabled={waiting || (state.factorCount || 0)>=10} onClick={()=>{setView('intro');setError('');setMessage('');}}>{state.nextLevel==='aal2'?t.add:state.factors.length?t.enable:t.enable}</button>}
        </>:null}
      {(!state || error==='factor_missing' || error==='factor_verified') && !expired && <button type="button" disabled={busy} onClick={()=>void load()}>{t.retry}</button>}
      {challenge && <button type="button" disabled={busy} onClick={()=>void action('signout')}>{t.logout}</button>}
    </>}
    <p className="ec-mfa-recovery">{t.recovery}</p>
  </section>;
}
const css=`
.ec-mfa{min-width:0;text-align:start;color:#182d27;font-family:"Segoe UI",Tahoma,Arial,sans-serif;margin-top:20px;padding-top:18px;border-top:1px solid #e2e9e4;overflow-wrap:anywhere}.ec-mfa *{box-sizing:border-box}.ec-mfa h4,.ec-mfa h5{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:650;margin:0 0 10px}.ec-mfa p{font-size:13px;line-height:1.8;margin:9px 0;color:#52675a}.ec-mfa .ec-mfa-badge{display:inline-block;background:#eef7f1;border:1px solid #cde2d5;color:#096044;padding:3px 9px;border-radius:6px}.ec-mfa label{display:block;font-size:14px;font-weight:600;margin:16px 0 7px}.ec-mfa :is(input,select){width:100%;min-width:0;min-height:46px;border:1px solid #bccfc2;border-radius:8px;padding:10px 12px;font:16px "Segoe UI",Tahoma,Arial,sans-serif;background:white;color:#182d27}.ec-mfa-code{letter-spacing:5px;text-align:center}.ec-mfa :is(button,a){display:inline-flex;justify-content:center;align-items:center;gap:8px;min-height:44px;padding:10px 14px;margin:6px 0;border:1px solid #bfd6c8;border-radius:8px;background:#fff;color:#087454;font:600 14px/1.6 "Segoe UI",Tahoma,Arial,sans-serif;cursor:pointer;text-decoration:none}.ec-mfa form>button{width:100%;color:white;background:#087454}.ec-mfa :is(button,input,select):disabled{opacity:.6;cursor:not-allowed}.ec-mfa :is(button,a,input,select,summary):focus-visible{outline:3px solid #087454;outline-offset:3px}.ec-mfa-actions{display:flex;flex-wrap:wrap;gap:8px}.ec-mfa-factors{display:grid;gap:10px;margin:12px 0}.ec-mfa-factor{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:12px;border:1px solid #dae5de;border-radius:8px;min-width:0}.ec-mfa-factor>div{min-width:0;flex:1}.ec-mfa svg{flex-shrink:0}.ec-mfa-qr{display:block;width:220px;height:auto;max-width:100%;margin:18px auto;background:white}.ec-mfa-secret{display:block;overflow-wrap:anywhere;white-space:normal;font-size:15px;border:1px solid #dae5de;border-radius:6px;padding:10px;user-select:all}.ec-mfa summary{cursor:pointer;min-height:44px;padding:10px 0;font-size:14px}.ec-mfa-error{display:flex;flex-wrap:wrap;gap:8px;color:#9b2929;background:#fcefee;border:1px solid #f0d2cf;padding:12px;border-radius:8px;font-size:13px;line-height:1.7;margin:12px 0}.ec-mfa-success{color:#096044}.ec-mfa .ec-mfa-recovery{border-top:1px solid #e2e9e4;padding-top:14px;margin-top:18px;font-size:12px}@media(max-width:540px){.ec-mfa-actions{flex-direction:column}.ec-mfa-factor{flex-direction:column;align-items:stretch}.ec-mfa-factor>button{width:100%}}
`;
