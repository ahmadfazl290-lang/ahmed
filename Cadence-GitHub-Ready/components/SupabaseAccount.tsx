'use client';
import {Fragment, useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {ArrowLeft, ArrowRight, BookOpen, Check, CircleAlert, Eye, EyeOff, Loader2, Mail, ShieldCheck} from 'lucide-react';
import {authCopy} from './auth-copy';
import styles, {authCSS} from './auth-styles';
import AccountDetails from './AccountDetails';
import MfaPanel from './MfaPanel';

type Mode = 'signin' | 'signup' | 'recover' | 'verify' | 'recoverySent' | 'update' | 'confirmation' | 'mfa' | 'security';
type User = {id:string; email:string; verified:boolean};
type Field = 'name' | 'email' | 'password' | 'confirm';
function branded(text: string) {
  return text.split('English-Co').map((part,index)=><Fragment key={index}>{index>0 && <bdi dir="ltr" style={{whiteSpace:'nowrap'}}>English-Co</bdi>}{part}</Fragment>);
}
export default function SupabaseAccount() {
  const [lang,setLang] = useState<'en'|'ku'>('ku');
  const [mode,setMode] = useState<Mode>('signin');
  const [user,setUser] = useState<User|null>(null);
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false);
  const [email,setEmail] = useState(''), [password,setPassword] = useState(''), [confirm,setConfirm] = useState(''), [name,setName] = useState('');
  const [error,setError] = useState(''), [message,setMessage] = useState('');
  const [confirmationSuccess,setConfirmationSuccess] = useState(false);
  const [fieldErrors,setFieldErrors] = useState<Partial<Record<Field,string>>>({});
  const [showPassword,setShowPassword] = useState(false), [showConfirm,setShowConfirm] = useState(false);
  const [verificationEmail,setVerificationEmail] = useState(''), [requested,setRequested] = useState(false);
  const [deadline,setDeadline] = useState(0), [seconds,setSeconds] = useState(0);
  const lock = useRef(false), pending = useRef(false), initialised = useRef(false);
  const refreshVersion = useRef(0);
  const recoveryReturn=useRef(false);
  const errorRef = useRef<HTMLDivElement>(null), headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const t = authCopy[lang];
  const errors: Record<string,string> = {validation:t.validation, password:t.passwordError, match:t.match, name:t.nameError, credentials:t.credentials, verify:t.verify, rate:t.rate, unavailable:t.unavailable, delivery:t.delivery, confirmation_required:t.confirmationRequired, expired:t.expired, invalid:t.invalid, state:t.confirmState, linkExpired:t.confirmExpired, update:t.updateError};
  async function refresh() {
    if (pending.current || lock.current) return;
    pending.current = true;
    const version=refreshVersion.current;
    try {
      const response = await fetch('/api/supabase-auth', {cache:'no-store', credentials:'same-origin'});
      const data = await response.json();
      if(version===refreshVersion.current && data.error==='mfa_required'){setUser(null);setMode('mfa');setError('');history.replaceState(null,'','/account?provider=supabase&mode=mfa'+(recoveryReturn.current?'&after=recovery':''));return;}
      if (!response.ok) throw new Error('unavailable');
      if(version===refreshVersion.current)setUser(data.user?.verified ? data.user : null);
    } catch {if(version===refreshVersion.current){setUser(null);setError('unavailable');}}
    finally {pending.current = false;setLoading(false);}
  }
  useEffect(() => {
    if(initialised.current)return;
    initialised.current = true;
    try {setLang(localStorage.getItem('cadence:ui-language') === 'en' ? 'en':'ku');} catch {}
    const params = new URLSearchParams(location.search);
    const selected = params.get('mode');
    if (['signin','signup','recover','update','mfa','security'].includes(selected || '')) setMode(selected as Mode);
    recoveryReturn.current=selected==='update' || params.get('after')==='recovery';
    if (selected === 'resend') setMode('verify');
    const fragment = new URLSearchParams(location.hash.slice(1));
    // The SSR client starts PKCE flows. Never import implicit tokens from URL fragments.
    if (params.has('error') || fragment.has('error') || fragment.has('access_token') || params.get('result') === 'invalid') setError('invalid');
    if (params.get('result') === 'reset') setMessage('reset');
    if (['verified','invalid'].includes(params.get('result') || '') || params.has('error') || fragment.has('error') || fragment.has('access_token')) {
      setMode('confirmation');setConfirmationSuccess(params.get('result')==='verified');
      const reason=params.get('reason') || ((params.get('error_code') || fragment.get('error_code'))==='otp_expired'?'expired':null);
      if(params.get('result')!=='verified')setError(reason==='state'?'state':reason==='expired'?'linkExpired':reason==='unavailable'?'unavailable':'invalid');
    }
    history.replaceState(null,'','/account?provider=supabase'+(selected==='mfa'?'&mode=mfa'+(recoveryReturn.current?'&after=recovery':''):selected==='security'?'&mode=security':''));
    void refresh();
  }, []);
  useEffect(() => {
    const onHashChange = () => {
      const fragment = new URLSearchParams(location.hash.slice(1));
      if (fragment.has('error') || fragment.has('access_token') || fragment.has('refresh_token')) {
        setError('invalid');
        history.replaceState(null,'','/account?provider=supabase');
      }
    };
    window.addEventListener('hashchange',onHashChange);
    return () => window.removeEventListener('hashchange',onHashChange);
  }, []);
  useEffect(() => {
    const onFocus = () => {if(!lock.current)void refresh();};
    const onAuthChange=()=>{refreshVersion.current++;setUser(null);void refresh();};
    const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('englishco-auth');
    if(channel)channel.onmessage=onAuthChange;
    window.addEventListener('focus',onFocus);
    window.addEventListener('englishco-auth-change',onAuthChange);
    const timer = window.setInterval(onFocus,60000);
    return () => {channel?.close();window.removeEventListener('focus',onFocus);window.removeEventListener('englishco-auth-change',onAuthChange);window.clearInterval(timer);};
  }, []);
  useEffect(() => {document.documentElement.lang=lang;document.documentElement.dir=lang==='ku'?'rtl':'ltr';}, [lang]);
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0,Math.ceil((deadline-Date.now())/1000)));
    tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer);
  }, [deadline]);
  useEffect(() => {if(error)errorRef.current?.focus();}, [error]);
  useEffect(() => {if(!loading)headingRef.current?.focus();}, [mode]);
  function cooldown(value: unknown) {
    const duration=typeof value==='number' && Number.isFinite(value)?Math.max(1,Math.min(900,value)):60;
    setSeconds(Math.ceil(duration));setDeadline(Date.now()+duration*1000);
  }
  function changeMode(next: Mode) {
    if(lock.current)return;
    recoveryReturn.current=next==='update';
    setMode(next);setError('');setMessage('');setFieldErrors({});setPassword('');setConfirm('');setShowPassword(false);setShowConfirm(false);
  }
  function edit(field: Field, value: string) {
    ({name:setName,email:setEmail,password:setPassword,confirm:setConfirm}[field])(value);
    setFieldErrors(previous=>({...previous,[field]:undefined}));
    if(error)setError('');
  }
  function validate(action: string) {
    const invalid: Partial<Record<Field,string>> = {};
    if(action==='signup' && (!name.trim() || name.trim().length>80))invalid.name='name';
    if(['signup','signin','recover','resend'].includes(action)) {
      const address=action==='resend' && verificationEmail?verificationEmail:email.trim();
      if(address.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))invalid.email='validation';
    }
    if(action==='signin' && !password.length)invalid.password='credentials';
    if(['signup','update'].includes(action) && (password.length<10 || password.length>128))invalid.password='password';
    if(['signup','update'].includes(action) && password!==confirm)invalid.confirm='match';
    setFieldErrors(invalid);
    const first=Object.keys(invalid)[0];
    if(first)document.getElementById(`${id}-${first}`)?.focus();
    return !first;
  }
  async function submit(event: FormEvent, selected?: string) {
    event.preventDefault();
    const action=selected || (mode==='verify'?'resend':mode);
    if(lock.current || (seconds>0 && (action==='resend' || error==='rate' || ['signup','recover'].includes(action))))return;
    setError('');setMessage('');
    if(!validate(action))return;
    lock.current=true;refreshVersion.current++;setBusy(true);
    try {
      const submittedEmail=(action==='resend' && verificationEmail?verificationEmail:email).trim().toLowerCase();
      const response=await fetch('/api/supabase-auth',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,email:submittedEmail,password,confirm,name})});
      const data=await response.json();
      if(!response.ok) {
        if(data.error==='mfa_required'){setPassword('');setConfirm('');setUser(null);setMode('mfa');history.replaceState(null,'','/account?provider=supabase&mode=mfa'+(recoveryReturn.current?'&after=recovery':''));return;}
        setError(data.error || 'unavailable');
        if(response.status===429 && typeof data.retryAfter==='number' && Number.isFinite(data.retryAfter) && data.retryAfter>0)cooldown(data.retryAfter);
        if(data.error==='password')setFieldErrors({password:'password'});
        return;
      }
      setPassword('');setConfirm('');setShowPassword(false);setShowConfirm(false);
      if(['signin','signout','update'].includes(action) && typeof BroadcastChannel!=='undefined'){
        const channel=new BroadcastChannel('englishco-auth');channel.postMessage('changed');channel.close();
      }
      if(action==='signup' || action==='resend') {
        setVerificationEmail(submittedEmail);setRequested(true);setMode('verify');cooldown(data.cooldown);
        if(action==='resend')setMessage('requested');
      } else if(action==='recover') {setMode('recoverySent');cooldown(data.cooldown);}
      else if(action==='signout') {setUser(null);setMode('signin');setMessage('signoutDone');}
      else if(action==='update') {setUser(null);setMode('signin');setMessage('reset');}
      else if(action==='signin') {if(data.mfaRequired){setUser(null);setMode('mfa');history.replaceState(null,'','/account?provider=supabase&mode=mfa');}else if(data.redirect==='/')window.location.assign('/');else await refresh();}
    } catch {setError('unavailable');}
    finally {lock.current=false;setBusy(false);}
  }
  function input(field: Field, label: string, autoComplete: string, secret=false) {
    const shown=field==='confirm'?showConfirm:showPassword;
    const errorId=`${id}-${field}-error`;
    const hintId=`${id}-password-hint`;
    const passwordHelp=field==='password' && mode!=='signin';
    return <div className={styles.field}>
      <div className={styles.labelRow}><label htmlFor={`${id}-${field}`} className={styles.label}>{label}</label>
        {field==='password' && mode==='signin' && <button type="button" className={styles.textButton} disabled={busy} onClick={()=>changeMode('recover')}>{t.forgot}</button>}
      </div>
      <div className={styles.inputWrap}>
        <input id={`${id}-${field}`} name={field} className={`${styles.input} ${secret?styles.password:''}`} type={secret?(shown?'text':'password'):field==='email'?'email':'text'}
          dir={secret || field==='email'?'ltr':undefined} value={{name,email,password,confirm}[field]} onChange={event=>edit(field,event.target.value)} required
          minLength={secret?(mode==='signin'?1:10):undefined} maxLength={secret?(mode==='signin'?4096:128):field==='name'?80:254} autoComplete={autoComplete} autoCapitalize={field==='name'?'words':'none'} spellCheck={false} disabled={busy}
          placeholder={field==='email'?'you@example.com':undefined} aria-invalid={!!fieldErrors[field]} aria-describedby={[fieldErrors[field]?errorId:'',passwordHelp?hintId:''].filter(Boolean).join(' ') || undefined}/>
        {secret && <button type="button" className={styles.toggle} disabled={busy} aria-label={field==='confirm'?(shown?t.hideConfirm:t.showConfirm):(shown?t.hide:t.show)} aria-pressed={shown}
          onClick={()=>field==='confirm'?setShowConfirm(!shown):setShowPassword(!shown)}>{shown?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button>}
      </div>
      {passwordHelp && <p id={hintId} className={`${styles.hint} ${password.length>=10 && password.length<=128?styles.met:''}`}>{password.length>=10 && password.length<=128?t.policyMet:t.policy}</p>}
      {fieldErrors[field] && <p role="alert" id={errorId} className={styles.fieldError}>{errors[fieldErrors[field]!]}</p>}
    </div>;
  }
  const waiting=mode==='verify' || mode==='recoverySent';
  const account=!!user && mode!=='update' && mode!=='confirmation' && mode!=='mfa' && mode!=='security';
  const confirmed=confirmationSuccess && !!user?.verified && !error;
  const titles={security:t.securityTitle,mfa:t.mfaTitle,signin:t.signinTitle,signup:t.signupTitle,recover:t.recoverTitle,update:t.updateTitle,verify:requested?t.verifyTitle:t.verifyStart,recoverySent:t.recoveryTitle,confirmation:confirmed?t.confirmTitle:confirmationSuccess && !error?t.confirmSigninTitle:t.confirmFailedTitle};
  const subtitles={security:t.securitySub,mfa:t.mfaSub,signin:t.signinSub,signup:t.signupSub,recover:t.recoverSub,update:t.updateSub,verify:requested?t.verifySub:t.verifyStartSub,recoverySent:t.recoverySub,confirmation:confirmed?t.confirmSub:confirmationSuccess && !error?t.confirmSigninSub:t.confirmFailedSub};
  const submitLabels={signin:t.signin,signup:t.signup,recover:t.recover,update:t.update};
  const errorNotice=error && <div ref={errorRef} tabIndex={-1} role="alert" className={styles.notice}><CircleAlert size={16} aria-hidden="true"/><span>{errors[error] || t.unavailable}
    {error==='rate' && seconds>0 && <> ({seconds}{t.seconds})</>}
    {['verify','invalid','state','linkExpired'].includes(error) && <button type="button" className={styles.textButton} disabled={busy} onClick={()=>{setVerificationEmail('');setRequested(false);changeMode('verify');}}>{t.newLink}</button>}
    {error==='expired' && <button type="button" className={styles.textButton} onClick={()=>changeMode('recover')}>{t.forgot}</button>}
    {error==='unavailable' && loading===false && !user && <button type="button" className={styles.textButton} disabled={busy} onClick={()=>{setError('');void refresh();}}>{t.retry}</button>}
  </span></div>;
  const successNotice=message && <div role="status" className={`${styles.notice} ${styles.success}`}><Check size={16} aria-hidden="true"/><span>{t[message as 'reset'|'requested'|'signoutDone']}</span></div>;
  return <main dir={lang==='ku'?'rtl':'ltr'} className={styles.page}><style>{authCSS}</style><div className={styles.shell}>
    <header className={styles.topbar}><a href="/" aria-label="English-Co" className={styles.brand}><span className={styles.brandMark}><BookOpen size={21} strokeWidth={1.8} aria-hidden="true"/></span>English-Co</a>
      <button type="button" className={styles.language} lang={lang==='ku'?'en':'ku'} onClick={()=>{const next=lang==='ku'?'en':'ku';setLang(next);try{localStorage.setItem('cadence:ui-language',next);}catch{}}}>{lang==='ku'?'English':'کوردی'}</button>
    </header>
    <section className={`${styles.card} ${waiting || account || mode==='confirmation'?styles.center:''}`} aria-labelledby={`${id}-heading`}>
      {loading?<div role="status" aria-busy="true" className={styles.loading}><Loader2 size={24} className={styles.spinner} aria-hidden="true"/>{t.loading}</div>:<>
        {(waiting || account) && <div className={styles.statusIcon}>{account?<ShieldCheck size={27} strokeWidth={1.6} aria-hidden="true"/>:<Mail size={27} strokeWidth={1.6} aria-hidden="true"/>}</div>}
        {!waiting && !account && <p className={styles.eyebrow}>{lang==='ku'?'فێربوون، هەنگاو بە هەنگاو':'LEARN. GROW. CONNECT.'}</p>}
        <h1 ref={headingRef} tabIndex={-1} id={`${id}-heading`} className={styles.heading}>{branded(account?t.accountTitle:titles[mode])}</h1>
        <p className={styles.subtitle}>{branded(account?t.accountSub:subtitles[mode])}</p>
        {account?<><div className={styles.actions}><a href="/" className={styles.primary}>{t.continue}<ArrowRight size={16} aria-hidden="true"/></a>
          </div><div style={{marginTop:24}}><AccountDetails lang={lang} onChangePassword={()=>changeMode('update')} onSignedOut={()=>{refreshVersion.current++;setUser(null);setMode('signin');setMessage('signoutDone');}} /></div>{errorNotice}{successNotice}</>:
        mode==='security'?<MfaPanel lang={lang}/>:mode==='mfa'?<MfaPanel lang={lang} challenge onVerified={()=>{if(recoveryReturn.current){setError('');setMode('update');history.replaceState(null,'','/account?provider=supabase&mode=update');}else window.location.assign('/');}} onSignedOut={()=>{refreshVersion.current++;setUser(null);setMode('signin');setError('');setMessage('signoutDone');history.replaceState(null,'','/account?provider=supabase');}}/>:
        mode==='confirmation'?<>{errorNotice}<div className={styles.actions} style={{marginTop:24}}>{confirmed?<a href="/" className={styles.primary}>{t.confirmContinue}</a>:<button type="button" className={styles.primary} onClick={()=>changeMode('signin')}>{t.signin}</button>}<button type="button" className={styles.secondary} onClick={()=>changeMode('recover')}>{t.forgot}</button></div></>:
        waiting?<>
          {(verificationEmail || mode==='recoverySent') && <bdi dir="ltr" className={styles.email}>{verificationEmail || email.trim()}</bdi>}
          {mode==='verify' && !verificationEmail && <form noValidate onSubmit={event=>void submit(event,'resend')} className={styles.form} aria-busy={busy}>{input('email',t.email,'email')}
            <button className={styles.primary} disabled={busy || seconds>0}>{busy?t.wait:seconds>0?`${t.resendIn} ${seconds}${t.seconds}`:t.request}</button></form>}
          {errorNotice}{successNotice}
          <div className={styles.actions} style={{marginTop:24}}><button type="button" className={styles.primary} disabled={busy} onClick={()=>changeMode('signin')}>{t.backSignin}</button>
          {mode==='verify' && verificationEmail && <button type="button" className={styles.textButton} disabled={busy || seconds>0} onClick={event=>void submit(event,'resend')}>{busy?t.wait:seconds>0?`${t.resendIn} ${seconds}${t.seconds}`:t.resend}</button>}</div>
          <div className={styles.help}><p>{t.spam}</p><details><summary>{t.help}</summary><p>{t.emailHelp}</p></details></div>
        </>:<>
          {successNotice}
          <form noValidate onSubmit={event=>void submit(event)} className={styles.form} style={message?{marginTop:20}:undefined} aria-busy={busy}>
            {mode==='signup' && input('name',t.name,'name')}
            {mode!=='update' && input('email',t.email,'email')}
            {mode!=='recover' && input('password',t.password,mode==='signin'?'current-password':'new-password',true)}
            {(mode==='signup' || mode==='update') && input('confirm',t.confirm,'new-password',true)}
            {errorNotice}
            <button type="submit" className={styles.primary} disabled={busy || (seconds>0 && (error==='rate' || mode==='signup' || mode==='recover'))}>{busy?<><Loader2 size={17} className={styles.spinner} aria-hidden="true"/>{t.wait}</>:<>{submitLabels[mode as keyof typeof submitLabels]}<ArrowRight size={16} aria-hidden="true"/></>}</button>
          </form>
          {mode==='signin' || mode==='signup'?<div className={styles.switcher}><span>{mode==='signin'?t.noAccount:t.haveAccount}</span><button type="button" className={styles.textButton} disabled={busy} onClick={()=>changeMode(mode==='signin'?'signup':'signin')}>{mode==='signin'?t.create:t.signin}</button></div>:
          <div className={styles.switcher}><button type="button" className={styles.textButton} disabled={busy} onClick={()=>changeMode('signin')}><ArrowLeft size={15} aria-hidden="true"/>{t.backSignin}</button></div>}
        </>}
      </>}
    </section>
    <footer className={styles.footer}><a href="/" className={styles.guest}><ArrowLeft size={14} aria-hidden="true"/>{t.back}</a><p className={styles.local}>{user?t.local:t.localShort}</p></footer>
  </div></main>;
}
