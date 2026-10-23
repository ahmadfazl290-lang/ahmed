import { gradeAnswer, isObjective } from "./grading.js";
import { extraCourses, authoredChecks } from "./courses.js";
import { translate } from "./i18n.js";
import React, { useState, useContext, createContext, useEffect, useRef, useMemo } from "react";
import {
  Home, PhoneCall, MessageCircle, CalendarCheck, BookOpen, Target, Layers,
  AlertTriangle, TrendingUp, User, Settings as SettingsIcon, Sun, Moon, Flame,
  Star, Clock, ChevronRight, X, Check, Mic, Award, BarChart3, BookMarked,
  ArrowRight, Volume2, RotateCcw, Send, Pencil, Bell, Globe, LogOut,
  ChevronDown, Grid3x3, PhoneOff, Lock, ShieldCheck, Trophy, PenLine,
  Mail, Eye, EyeOff, ArrowLeft, Loader2, Languages, LogIn, UserPlus,
  GraduationCap, TrendingDown, HelpCircle, ClipboardList, Plus,
  Users, Briefcase, Zap, Plane, Building2, Utensils, Phone, FlaskConical, Handshake,
  MicOff, Subtitles, WifiOff, Bot, AlignLeft
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from "recharts";

/* ---------------------------------------------------------------------- */
/*  Cadence — AI English learning app                                     */
/*  Foundation pass: navigation, layout, pages, demo data. No live AI.    */
/* ---------------------------------------------------------------------- */

const cx = (...parts) => parts.filter(Boolean).join(" ");

/* ---------------------------- Theme -------------------------------- */

const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

function useThemeClasses() {
  const { isDark } = useTheme();
  return {
    isDark,
    bg: isDark ? "bg-slate-950" : "bg-slate-50",
    surface: isDark ? "bg-slate-900" : "bg-white",
    surfaceAlt: isDark ? "bg-slate-800/60" : "bg-slate-100",
    border: isDark ? "border-slate-800" : "border-slate-200",
    text: isDark ? "text-slate-50" : "text-slate-900",
    textSoft: isDark ? "text-slate-400" : "text-slate-500",
    textFaint: isDark ? "text-slate-500" : "text-slate-400",
    ring: isDark ? "ring-slate-800" : "ring-slate-200",
    hover: isDark ? "hover:bg-slate-800" : "hover:bg-slate-100",
  };
}

/* ---------------------------- i18n / RTL -------------------------------- */
/* Support languages: English only, or English + Kurdish Sorani (RTL).      */

const STRINGS = {
  en: {
    nav_home: "Home", nav_aicall: "AI Call", nav_tutor: "Tutor", nav_daily: "Daily Lesson",
    nav_courses: "Courses", nav_practice: "Practice", nav_vocabulary: "Vocabulary",
    nav_mistakes: "Mistakes", nav_progress: "Progress", nav_profile: "Profile", nav_settings: "Settings",
    nav_more: "More", nav_roadmap: "Roadmap",
    signIn: "Sign in", signUp: "Sign up", signOut: "Sign out",
    email: "Email", password: "Password", name: "Name",
    confirmPassword: "Confirm password",
    forgotPassword: "Account help", resetPassword: "Account help",
    noAccount: "Don't have an account?", haveAccount: "Already have an account?",
    createAccount: "Create account", welcomeBack: "Welcome back",
    welcomeBackSub: "Sign in to continue learning",
    createAccountSub: "Start your English learning journey",
    backToSignIn: "Back to sign in",
    newPassword: "New password",
    resetSub: "Local accounts are for practice only. Password recovery is unavailable. Hosted accounts use ChatGPT sign-in.",
    resetDone: "Password updated. You can sign in now.",
    savingChanges: "Save changes",
    saved: "Saved",
    appLanguage: "App language",
  },
  ku: {
    nav_home: "سەرەکی", nav_aicall: "پەیوەندی AI", nav_tutor: "مامۆستا", nav_daily: "وانەی ڕۆژانە",
    nav_courses: "کۆرسەکان", nav_practice: "ڕاهێنان", nav_vocabulary: "وشەکان",
    nav_mistakes: "هەڵەکان", nav_progress: "پێشکەوتن", nav_profile: "پرۆفایل", nav_settings: "ڕێکخستنەکان",
    nav_more: "زیاتر", nav_roadmap: "نەخشەی ڕێگا",
    signIn: "چوونەژوورەوە", signUp: "خۆتۆمارکردن", signOut: "چوونەدەرەوە",
    email: "ئیمەیل", password: "وشەی نهێنی", name: "ناو",
    confirmPassword: "دووبارەکردنەوەی وشەی نهێنی",
    forgotPassword: "یارمەتیی هەژمار", resetPassword: "یارمەتیی هەژمار",
    noAccount: "هەژمارت نییە؟", haveAccount: "هەژمارت هەیە؟",
    createAccount: "دروستکردنی هەژمار", welcomeBack: "بەخێربێیتەوە",
    welcomeBackSub: "بچۆژوورەوە بۆ بەردەوامبوون لە فێربوون",
    createAccountSub: "گەشتی فێربوونی ئینگلیزیت دەست پێبکە",
    backToSignIn: "گەڕانەوە بۆ چوونەژوورەوە",
    newPassword: "وشەی نهێنی نوێ",
    resetSub: "هەژماری ناوخۆ بۆ تاقیکردنەوەیە. گەڕاندنەوەی وشەی نهێنی بەردەست نییە. وەشانی ئۆنلاین بە ChatGPT دەچێتەژوورەوە.",
    resetDone: "وشەی نهێنی نوێکرایەوە. ئێستا دەتوانیت بچیتەژوورەوە.",
    savingChanges: "پاشەکەوتکردنی گۆڕانکاریەکان",
    saved: "پاشەکەوتکرا",
    appLanguage: "زمانی ئەپ",
  },
};

function useT() {
  const { uiLang } = useAuth();
  const dict = STRINGS[uiLang] || STRINGS.en;
  return (key) => dict[key] || STRINGS.en[key] || key;
}

/* ---------------------------- Storage helpers -------------------------------- */

async function safeGet(key) {
  try {
    const res = await window.storage.get(key, false);
    return res ? res.value : null;
  } catch (e) {
    return null;
  }
}
async function safeSet(key, value) {
  try {
    await window.storage.set(key, value, false);
    return true;
  } catch (e) {
    window.dispatchEvent(new Event("cadence-save-error"));
    return false;
  }
}
async function safeDelete(key) {
  try {
    await window.storage.delete(key, false);
  } catch (e) {
    /* ignore */
  }
}

async function hashPassword(pw, stored) {
  if (stored && !stored.startsWith("pbkdf2$")) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2,"0")).join("");
  }
  const salt = stored ? Uint8Array.from(stored.split("$")[1].match(/../g), x=>parseInt(x,16)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:210000},key,256);
  const hex = a => Array.from(new Uint8Array(a), b=>b.toString(16).padStart(2,"0")).join("");
  return `pbkdf2$${hex(salt)}$${hex(bits)}`;
}

const emailKey = (email) => `user:${email.trim().toLowerCase()}`;
const profileKey = (email) => `profile:${email.trim().toLowerCase()}`;

function defaultProfile(name, email) {
  return {
    name, email,
    nativeLanguage: "",
    targetLanguage: "English",
    englishLevel: "B1",
    priorities: [],
    learningGoals: [],
    interests: [],
    professionalField: "",
    dailyGoalMinutes: 20,
    preferredStudyTime: "Morning",
    supportLanguage: "English + Kurdish Sorani",
    uiLang: "ku",
    tutorStyle: "Friendly",
    correctionIntensity: "Medium",
    speakingSpeed: "Normal",
    onboardingComplete: false,
    placementComplete: false,
    assessment: null,
    roadmap: null,
  };
}

/* ---------------------------- AI provider architecture -------------------------------- */
/* Modular so a new provider can be added later without touching the Tutor UI.
   The API key is never present in this code: calls go straight to the
   Anthropic Messages API, and this runtime injects credentials server-side —
   nothing secret ever reaches the browser bundle. If that call can't
   complete (no credential configured, network blocked, etc.) the provider
   throws and the UI shows an explicit Demo/Configuration state instead of
   inventing a reply. */

const AI_PROVIDERS = {
  anthropic: {
    id: "anthropic",
    label: "Claude (Anthropic)",
    async send({ system, messages, maxTokens = 500 }) {
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),30000);
      try {
        const res=await fetch("/api/tutor",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,messages,maxTokens}),signal:controller.signal});
        const data=await res.json();
        if(!res.ok || !data.text) throw new Error(data.error || "AI is not configured yet");
        return data.text;
      } finally {clearTimeout(timeout);}
    },
  },
};

const ACTIVE_PROVIDER_ID = "anthropic";
function getActiveProvider() {
  return AI_PROVIDERS[ACTIVE_PROVIDER_ID] || null;
}

async function checkProviderAvailable() {
  const provider = getActiveProvider();
  if (!provider) return false;
  try {
    await provider.send({ system: "Reply with exactly: OK", messages: [{ role: "user", content: "ping" }], maxTokens: 5 });
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------------------------- Tutor context & prompt -------------------------------- */

function buildTutorContext(profile, roadmap, errors, vocab) {
  const cefr = profile?.assessment?.overallLevel || profile?.englishLevel || "B1";
  const goals = (profile?.learningGoals || []).join(", ") || "general fluency";
  const interests = (profile?.interests || []).join(", ") || "general topics";
  const field = profile?.professionalField || "not specified";
  const weakness = roadmap?.priorityAreaName || "Speaking";
  const dueWords = (vocab || []).filter(isDue);
  const vocabDue = dueWords.slice(0, 5).map((w) => w.word).join(", ") || "none due right now";
  const recentErrors = [...(errors || [])].sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen)).slice(0, 3);
  const mistakes = recentErrors.map((m) => `- (${m.category}) ${m.original} → ${m.correct}`).join("\n") || "- none logged yet";
  const kurdishOk = profile?.supportLanguage === "English + Kurdish Sorani";
  const tutorStyle = profile?.tutorStyle || "Friendly";
  const correctionIntensity = profile?.correctionIntensity || "Medium";
  const name = profile?.name || "the learner";

  return `You are the Cadence AI English Tutor, having a text conversation with ${name} to help them practice English.

LEARNER CONTEXT
- CEFR level: ${cefr}
- Learning goals: ${goals}
- Interests: ${interests}
- Professional/academic field: ${field}
- Current priority weakness: ${weakness}
- Vocabulary to reinforce naturally: ${vocabDue}
- Recurring mistakes to watch for:
${mistakes}
- Tutor tone: ${tutorStyle}
- Correction intensity: ${correctionIntensity}
- Language: Use English primarily. ${kurdishOk ? "Use Kurdish Sorani only if the learner asks for it, or if they seem clearly stuck and a short clarification would help." : "Do not use Kurdish Sorani."}

BEHAVIOR LOOP — follow this every turn
TEACH → ASK → WAIT → ANALYZE → CORRECT → RETRY → CONTINUE
1. TEACH: briefly reinforce one small, relevant language point.
2. ASK: ask exactly ONE main question to prompt the learner to produce English.
3. WAIT: end your turn there — never ask more than one main question per turn.
4. ANALYZE: on their next message, assess grammar, vocabulary, and fluency.
5. CORRECT: if there is an important or repeated mistake, correct it using exactly this format:

You said:
...

Correct:
...

More natural:
...

Why:
...

Try again:
...

6. RETRY: after an important correction, invite them to try again.
7. CONTINUE: move the conversation forward naturally.

CORE RULES
- Ask ONE main question at a time.
- Encourage the learner's own output — don't talk at them.
- Keep explanations concise (1–2 sentences).
- Adapt vocabulary and sentence complexity to CEFR ${cefr}.
- Do not overcorrect during fluency practice — let minor, understandable slips pass.
- Do correct mistakes that change meaning or that repeat.
- Keep every reply short and mobile-friendly (a few sentences, plus a correction block only when needed).`;
}

function buildTutorGreeting(profile, roadmap) {
  const name = profile?.name || "there";
  const cefr = profile?.assessment?.overallLevel || profile?.englishLevel || "B1";
  const focus = roadmap?.priorityAreaName || "speaking";
  return `Hi ${name}! I'm your AI tutor. You're at ${cefr}, so let's keep it natural. Today I'd like to focus a little on ${focus}. To start — what's one thing you did earlier today?`;
}



/* ---------------------------- Auth context -------------------------------- */

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading"); // loading | signedOut | signedIn
  const [currentUser, setCurrentUser] = useState(null); // { name, email }
  const [profile, setProfile] = useState(null);
  const [localUiLang, setLocalUiLang] = useState(() => {try{return localStorage.getItem("cadence:ui-language") || "ku";}catch{return "ku";}});

  useEffect(() => {
    (async () => {
      if (["hosted","guest"].includes(window.CADENCE_SESSION?.mode)) {
        const user = window.CADENCE_SESSION.user;
        if (!user) { setStatus("signedOut"); return; }
        setCurrentUser({name:user.displayName,email:user.email});
        try {
          const raw = await safeGet(profileKey(user.email));
          setProfile(raw ? JSON.parse(raw) : defaultProfile(user.displayName,user.email));
          setStatus("signedIn");
        } catch { setStatus("signedOut"); }
        return;
      }
      const session = await safeGet("session");
      if (session) {
        try {
          const s = JSON.parse(session);
          const userRaw = await safeGet(emailKey(s.email));
          if (userRaw) {
            const user = JSON.parse(userRaw);
            setCurrentUser({ name: user.name, email: user.email });
            const profRaw = await safeGet(profileKey(s.email));
            setProfile(profRaw ? JSON.parse(profRaw) : defaultProfile(user.name, user.email));
            setStatus("signedIn");
            return;
          }
        } catch (e) { /* fall through to signed out */ }
      }
      setStatus("signedOut");
    })();
  }, []);

  const signUp = async (name, email, password) => {
    if (!name.trim() || !email.trim() || !password) return { ok: false, error: "Fill in all fields." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return {ok:false,error:"Enter a valid email address."};
    if (password.length < 10) return {ok:false,error:"Use at least 10 characters for your password."};
    const existing = await safeGet(emailKey(email));
    if (existing) return { ok: false, error: "An account with this email already exists." };
    const passwordHash = await hashPassword(password);
    const user = { name: name.trim(), email: email.trim().toLowerCase(), passwordHash };
    if (!await safeSet(emailKey(email), JSON.stringify(user))) return {ok:false,error:"Could not save your account. Check browser storage."};
    const prof = defaultProfile(user.name, user.email);
    await safeSet(profileKey(email), JSON.stringify(prof));
    await safeSet("session", JSON.stringify({ email: user.email }));
    setCurrentUser({ name: user.name, email: user.email });
    setProfile(prof);
    setStatus("signedIn");
    return { ok: true };
  };

  const signIn = async (email, password) => {
    if (!email.trim() || !password) return { ok: false, error: "Enter your email and password." };
    const raw = await safeGet(emailKey(email));
    if (!raw) return { ok: false, error: "No account found with that email." };
    const user = JSON.parse(raw);
    const passwordHash = await hashPassword(password, user.passwordHash);
    if (passwordHash !== user.passwordHash) return { ok: false, error: "Incorrect password." };
    await safeSet("session", JSON.stringify({ email: user.email }));
    const profRaw = await safeGet(profileKey(email));
    setCurrentUser({ name: user.name, email: user.email });
    setProfile(profRaw ? JSON.parse(profRaw) : defaultProfile(user.name, user.email));
    setStatus("signedIn");
    return { ok: true };
  };

  const signOut = async () => {
    if(window.CADENCE_SESSION?.mode==='guest')return;
    if (window.CADENCE_SESSION?.emailAuth) {
      const response=await fetch('/api/email-auth',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signout'})});
      if(response.ok) window.location.reload();
      return;
    }
    await safeDelete("session");
    setCurrentUser(null);
    setProfile(null);
    setStatus("signedOut");
  };

  const resetPassword = async () => ({ ok: false, error: "Password recovery is unavailable in local practice mode. Hosted accounts use ChatGPT sign-in." });

  const updateProfile = async (updates) => {
    if (updates.uiLang) setLocalUiLang(updates.uiLang);
    const next = { ...profile, ...updates };
    setProfile(next);
    await safeSet(profileKey(currentUser.email), JSON.stringify(next));
    if (updates.name && updates.name !== currentUser.name) {
      if(window.CADENCE_SESSION?.emailAuth||window.CADENCE_SESSION?.mode==='guest'){setCurrentUser(u=>({...u,name:updates.name}));return next;}
      const raw = await safeGet(emailKey(currentUser.email));
      if (raw) {
        const user = JSON.parse(raw);
        user.name = updates.name;
        await safeSet(emailKey(currentUser.email), JSON.stringify(user));
      }
      setCurrentUser((u) => ({ ...u, name: updates.name }));
    }
    return next;
  };

  const uiLang = localUiLang;
  const changeUiLang = (lang) => {setLocalUiLang(lang);try{localStorage.setItem("cadence:ui-language",lang);}catch{} if(profile) updateProfile({uiLang:lang});};
  useEffect(()=>{ document.documentElement.lang=uiLang;document.documentElement.dir=uiLang==="ku"?"rtl":"ltr"; },[uiLang]);
  const isRTL = uiLang === "ku";

  return (
    <AuthContext.Provider
      value={{ status, currentUser, profile, uiLang, changeUiLang, isRTL, signUp, signIn, signOut, resetPassword, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}


function UIText({text}) { const {uiLang}=useAuth(); return <>{translate(text,uiLang)}</>; }
function AppNotice() {
  const {uiLang,changeUiLang}=useAuth();
  const [saveError,setSaveError]=useState(false);
  useEffect(()=>{const handler=()=>setSaveError(true);window.addEventListener("cadence-save-error",handler);return()=>window.removeEventListener("cadence-save-error",handler);},[]);
  return <div dir={uiLang==="ku"?"rtl":"ltr"} className="bg-teal-950 text-white text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-2">
    <span><UIText text={window.CADENCE_SESSION?.development?"Local preview — email accounts and learning data stay on this computer.":window.CADENCE_SESSION?.mode==="hosted"?"Your learning data is saved securely to your account.":"Local practice mode — data stays on this device."}/></span>
    <div className="flex gap-3"><button onClick={()=>changeUiLang(uiLang==="ku"?"en":"ku")} className="underline font-semibold">{uiLang==="ku"?"English":"کوردی"}</button><span><UIText text={window.CADENCE_SESSION?.aiConfigured?"AI connected":"AI is not configured yet"}/></span></div>
    {window.CADENCE_SESSION?.emailConfigured&&window.CADENCE_SESSION?.user&&!window.CADENCE_SESSION.user.emailVerified&&<a href="/account?mode=verify" className="underline">{uiLang==='ku'?'ئیمەیڵەکەت پشتڕاست بکەرەوە':'Verify your email'}</a>}
    {saveError && <div role="alert" className="w-full text-amber-200"><UIText text="Could not save your changes. Check your connection and try again."/><button className="underline mx-2" onClick={()=>setSaveError(false)}><UIText text="Close"/></button></div>}
  </div>;
}
function EmailSignIn(){
 const t=useThemeClasses();const {uiLang}=useAuth();const ku=uiLang==='ku';
 const [signup,setSignup]=useState(false),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [registrationCode,setRegistrationCode]=useState('');
 const [notice,setNotice]=useState('');
 const submit=async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{const r=await fetch('/api/email-auth',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:signup?'signup':'signin',name,email,password,registrationCode})});const data=await r.json();if(data.verificationRequired){setNotice(ku?'پێش چوونەژوورەوە، ئیمەیڵەکەت پشتڕاست بکەرەوە. Inbox و Spam بپشکنە؛ دەتوانیت لینکی نوێش داوا بکەیت.':'Verify your email before signing in. Check Inbox and Spam, or request a new verification link.');setPassword('');setBusy(false);return;}if(!r.ok)throw new Error(data.error);window.location.reload();}
  catch(e){const errors={'Email or password is incorrect.':'ئیمەیڵ یان وشەی نهێنی هەڵەیە.','Could not create this account. Try signing in.':'ئەم هەژمارە دروست نەکرا. ئەگەر پێشتر تۆمارت کردووە، بچۆ ژوورەوە.','Too many attempts. Try again in 15 minutes.':'هەوڵەکان زۆرن. دوای ١٥ خولەک دووبارە هەوڵبدە.'};setError(ku?(errors[e.message]||'هەژمارەکە بەڕێوە نەچوو. ئیمەیڵ و وشەی نهێنی بپشکنە و دووبارە هەوڵبدە.'):e.message);setBusy(false);}
 };
 const field=cx('w-full rounded-xl border px-4 py-3',t.border,t.surface,t.text);
 return <AuthShell><h1 className={cx('text-xl font-bold mb-2',t.text)}>Cadence</h1><h2 className={cx('text-lg mb-5',t.text)}>{ku?(signup?'دروستکردنی هەژمار':'چوونەژوورەوە'):(signup?'Create an account':'Sign in')}</h2>
 <form onSubmit={submit} className="space-y-4">
 {window.CADENCE_SESSION?.databaseConfigured===false&&<p role="alert" className="text-sm text-red-600">{ku?'بنکەدراوە هێشتا پەیوەست نەکراوە. خاوەنی وێبسایت دەبێت DATABASE_URL ڕێک بخات.':'The database is not configured. The site owner must configure DATABASE_URL.'}</p>}
 {signup&&<label className={cx('block text-sm',t.text)}>{ku?'ناو':'Name'}<input className={field} value={name} onChange={e=>setName(e.target.value)} required maxLength={80} autoComplete="name" disabled={busy}/></label>}
 {signup&&window.CADENCE_SESSION?.registrationCodeRequired&&<label className={cx('block text-sm',t.text)}>{ku?'کۆدی بانگهێشت':'Invitation code'}<input className={field} type="password" value={registrationCode} onChange={e=>setRegistrationCode(e.target.value)} required maxLength={256} disabled={busy}/></label>}
 <label className={cx('block text-sm',t.text)}>{ku?'ئیمەیڵ':'Email'}<input className={field} dir="ltr" type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} autoComplete="email" disabled={busy}/></label>
 <label className={cx('block text-sm',t.text)}>{ku?'وشەی نهێنی':'Password'}<input className={field} dir="ltr" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128} autoComplete={signup?'new-password':'current-password'} disabled={busy}/></label>
 <p className={cx('text-xs',t.textSoft)}>{ku?'وشەی نهێنی دەبێت لانیکەم ١٠ پیت بێت.':'Use at least 10 characters for your password.'}</p>
 {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
 {notice&&<p role="status" className={cx('text-sm',t.textSoft)}>{notice}</p>}
 <button type="submit" disabled={busy} className="w-full rounded-xl bg-teal-600 px-5 py-3 text-white font-semibold">{busy?(ku?'چاوەڕێبە...':'Please wait...'):ku?(signup?'دروستکردنی هەژمار':'چوونەژوورەوە'):(signup?'Create account':'Sign in')}</button>
 </form><button type="button" disabled={busy} className={cx('mt-5 underline text-sm',t.textSoft)} onClick={()=>{setSignup(!signup);setError('');setPassword('');}}>{ku?(signup?'هەژمارت هەیە؟ بچۆ ژوورەوە':'هەژمارت نییە؟ هەژمارێک دروست بکە'):(signup?'Already have an account? Sign in':'New here? Create an account')}</button>
 {window.CADENCE_SESSION?.emailConfigured?<div className="mt-5 space-y-3"><a href="/account?mode=reset" className={cx('block text-sm underline',t.textSoft)}>{ku?'وشەی نهێنیت لەبیر چووە؟':'Forgot your password?'}</a><a href="/account?mode=verify" className={cx('block text-sm underline',t.textSoft)}>{ku?'داواکردنی لینکی پشتڕاستکردنەوەی ئیمەیڵ':'Request an email verification link'}</a></div>:<p className={cx('text-xs mt-5',t.textSoft)}>{ku?'ناردنی ئیمەیڵ هێشتا چالاک نەکراوە.':'Email delivery is not enabled yet.'}</p>}
 </AuthShell>;
}
function HostedSignIn() {return <EmailSignIn/>;}

/* ---------------------------- Demo data ------------------------------ */

const CALL_TOPICS = [
  { id: 1, title: "Small talk", desc: "Practice casual everyday conversation", level: "A2–B1" },
  { id: 2, title: "Job interview", desc: "Rehearse common interview questions", level: "B1–B2" },
  { id: 3, title: "Ordering food", desc: "Restaurant and cafe scenarios", level: "A1–A2" },
  { id: 4, title: "Travel & directions", desc: "Ask for and give directions", level: "A2–B1" },
];

const PRACTICE_MODES = [
  { id: "freetalk", title: "Free Talk", desc: "Open conversation, your choice of topic", icon: MessageCircle, accent: "teal", kind: "chat" },
  { id: "roleplay", title: "Roleplay", desc: "Practice real-world scenarios", icon: Globe, accent: "amber", kind: "roleplay" },
  { id: "interview", title: "Job Interview", desc: "Mock interview, one question at a time", icon: Briefcase, accent: "teal", kind: "chat" },
  { id: "meeting", title: "Meeting Simulation", desc: "Agree, disagree, clarify, discuss", icon: Users, accent: "amber", kind: "chat" },
  { id: "presentation", title: "Presentation Coach", desc: "Opening, transitions, results, Q&A", icon: BarChart3, accent: "teal", kind: "presentation" },
  { id: "fastspeak", title: "Fast Speak", desc: "Quick-fire timed responses", icon: Zap, accent: "amber", kind: "fastspeak" },
  { id: "tough", title: "Tough Questions", desc: "Challenging, opinion-based questions", icon: HelpCircle, accent: "teal", kind: "chat" },
  { id: "mission", title: "Real-World Mission", desc: "Complete a realistic everyday task", icon: ClipboardList, accent: "amber", kind: "mission" },
  { id: "grammarpractice", title: "Grammar Practice", desc: "Targeted grammar reps", icon: PenLine, accent: "teal", kind: "grammar" },
  { id: "writingcoach", title: "Writing Coach", desc: "Structured feedback on your writing", icon: Pencil, accent: "amber", kind: "writing" },
  { id: "readingpractice", title: "Reading Practice", desc: "Main idea, details, inference & more", icon: BookOpen, accent: "teal", kind: "reading" },
  { id: "vocabpractice", title: "Vocabulary Practice", desc: "Spaced-repetition word review", icon: Layers, accent: "amber", kind: "vocabulary" },
];

const ROLEPLAY_SCENARIOS = [
  { id: "airport", title: "Airport", icon: Plane, setting: "at an airport check-in / security / gate counter" },
  { id: "hotel", title: "Hotel", icon: Building2, setting: "checking into or dealing with an issue at a hotel front desk" },
  { id: "restaurant", title: "Restaurant", icon: Utensils, setting: "ordering food and interacting with a server at a restaurant" },
  { id: "university", title: "University", icon: GraduationCap, setting: "talking with a professor or classmate on a university campus" },
  { id: "conference", title: "Conference", icon: Users, setting: "attending sessions and chatting with attendees at a professional conference" },
  { id: "networking", title: "Networking", icon: Handshake, setting: "making small talk and exchanging contacts at a networking event" },
  { id: "phonecall", title: "Phone call", icon: Phone, setting: "having a phone call (e.g. customer service or scheduling) where you can't see the other person" },
  { id: "scientific", title: "Scientific discussion", icon: FlaskConical, setting: "discussing a research topic or findings with a colleague" },
  { id: "meeting_rp", title: "Professional meeting", icon: Briefcase, setting: "participating in a professional work meeting" },
  { id: "negotiation", title: "Negotiation", icon: Handshake, setting: "negotiating terms (price, deadline, or contract) with a counterpart" },
];

const PRESENTATION_STAGES = [
  { id: "opening", title: "Opening", desc: "Hook your audience and state your purpose" },
  { id: "transitions", title: "Transitions", desc: "Move smoothly between points" },
  { id: "results", title: "Results", desc: "Present data and findings clearly" },
  { id: "conclusion", title: "Conclusion", desc: "Summarize and land your key message" },
  { id: "qa", title: "Q&A", desc: "Handle audience questions confidently" },
];

const MISSION_SCENARIOS = [
  { id: "book-hotel", title: "Book a hotel room", goal: "Successfully book a hotel room for 2 nights, confirming dates, room type, and price.", roleDesc: "a hotel reservations agent" },
  { id: "return-item", title: "Return a faulty product", goal: "Explain the problem and get a refund or exchange for a faulty item.", roleDesc: "a store customer service representative" },
  { id: "ask-directions", title: "Ask for directions", goal: "Get clear directions to a landmark and confirm you understood them.", roleDesc: "a helpful local you've stopped on the street" },
  { id: "order-coffee", title: "Order coffee with changes", goal: "Order a drink with at least two customizations (size, milk, extra shot, etc.).", roleDesc: "a barista at a busy coffee shop" },
  { id: "book-appointment", title: "Schedule an appointment", goal: "Book a doctor's appointment, agreeing on a specific date and time.", roleDesc: "a medical receptionist" },
];

/* Reading passages with all five required task types (multiple CEFR levels). */
const READING_PASSAGES = [
  {
    id: "rp-a2", level: 1,
    passage: "Maria works at a small bakery near her house. She starts at 6 AM and bakes fresh bread every morning. Her favorite part of the job is talking to customers, even though she is usually very tired by the afternoon. On Sundays, the bakery is closed, and Maria likes to relax at home.",
    mainIdea: { prompt: "What is this passage mainly about?", options: ["A woman's job at a bakery", "How to bake bread", "A bakery's opening hours"], answer: "A woman's job at a bakery" },
    detail: { prompt: "What time does Maria start work?", accepted: ["6", "6am", "6 am"] },
    inference: { prompt: "How does Maria probably feel by the end of her shift?", accepted: ["tired", "exhausted"] },
    vocab: { prompt: "In this passage, 'relax' most nearly means:", options: ["rest", "work harder", "travel"], answer: "rest" },
    summaryMinWords: 15,
  },
  {
    id: "rp-b1", level: 2,
    passage: "Remote work has become common since many companies realized employees could stay productive from home. Still, some managers worry that remote teams lose a sense of connection. To address this, many companies now schedule regular video calls and occasional in-person meetups, trying to balance flexibility with teamwork.",
    mainIdea: { prompt: "What is the main idea of this passage?", options: ["Companies are balancing remote work flexibility with team connection", "Remote work should be banned", "Video calls are the only solution to remote work problems"], answer: "Companies are balancing remote work flexibility with team connection" },
    detail: { prompt: "What do some companies schedule to help with connection?", accepted: ["video calls", "meetups", "in-person meetups", "video calls and meetups"] },
    inference: { prompt: "What can you infer about the managers' attitude toward remote work?", accepted: ["cautious", "concerned", "worried", "mixed"] },
    vocab: { prompt: "In this passage, 'address' most nearly means:", options: ["to deal with", "to write a letter", "to speak loudly"], answer: "to deal with" },
    summaryMinWords: 25,
  },
  {
    id: "rp-b2", level: 3,
    passage: "While automation has undeniably increased efficiency across industries, critics argue it risks widening inequality if productivity gains are not shared broadly. Proponents counter that historically, technological shifts have created new categories of jobs even as they eliminated others, and that the real challenge lies in retraining workers quickly enough.",
    mainIdea: { prompt: "What is the central debate in this passage?", options: ["Whether automation's benefits are being fairly distributed and how workers should adapt", "Whether robots will replace all jobs by next year", "How to build more efficient factories"], answer: "Whether automation's benefits are being fairly distributed and how workers should adapt" },
    detail: { prompt: "According to proponents, what have past technological shifts created?", accepted: ["new jobs", "new categories of jobs", "jobs"] },
    inference: { prompt: "What might proponents believe is the key solution to automation's downsides?", accepted: ["retraining", "worker retraining", "training workers", "reskilling"] },
    vocab: { prompt: "In this passage, 'proponents' most nearly means:", options: ["supporters", "opponents", "victims"], answer: "supporters" },
    summaryMinWords: 30,
  },
  {
    id: "rp-c1", level: 4,
    passage: "The committee's tacit approval, though never formally stated in any memo, was evident in how swiftly the proposal advanced through subsequent stages of review. Some observers speculated that public endorsement had been withheld deliberately, allowing the committee latitude to distance itself should the initiative later prove controversial.",
    mainIdea: { prompt: "What does this passage primarily describe?", options: ["An unspoken, cautious form of institutional approval and its possible motive", "A committee formally rejecting a proposal", "A public celebration of a new policy"], answer: "An unspoken, cautious form of institutional approval and its possible motive" },
    detail: { prompt: "How quickly did the proposal move through review, according to the passage?", accepted: ["swiftly", "quickly", "fast"] },
    inference: { prompt: "Why might the committee have avoided a public statement, based on the passage?", accepted: ["to distance itself", "avoid blame", "deniability", "so they could distance themselves if it became controversial"] },
    vocab: { prompt: "In this passage, 'latitude' most nearly means:", options: ["freedom or flexibility", "a geographic location", "a strict rule"], answer: "freedom or flexibility" },
    summaryMinWords: 35,
  },
];

const FASTSPEAK_PROMPTS = [
  "Describe your morning in one breath.",
  "What's your favorite season and why?",
  "Give a quick opinion on working from home.",
  "Describe your dream vacation in a few words.",
  "What's one skill you'd love to learn?",
  "Quickly explain how to make your favorite dish.",
  "What's a book or show you'd recommend?",
  "Describe your city to a visitor in a few sentences.",
];

/* ---------------------------- Nav config ------------------------------ */

const NAV = [
  { id: "home", label: "Home", icon: Home },
  { id: "aicall", label: "AI Call", icon: PhoneCall },
  { id: "tutor", label: "Tutor", icon: MessageCircle },
  { id: "daily", label: "Daily Lesson", icon: CalendarCheck },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "practice", label: "Practice", icon: Target },
  { id: "vocabulary", label: "Vocabulary", icon: Layers },
  { id: "mistakes", label: "Mistakes", icon: AlertTriangle },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "profile", label: "Profile", icon: User },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const MOBILE_PRIMARY_IDS = ["home", "aicall", "practice", "progress", "profile"];
const MOBILE_MORE_IDS = NAV.map((n) => n.id).filter((id) => !MOBILE_PRIMARY_IDS.includes(id));

/* ---------------------------- Small UI atoms --------------------------- */

function Logo({ compact = false }) {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex items-end gap-[3px] h-6 shrink-0" aria-hidden="true">
        <span className={cx("w-1.5 rounded-full", isDark ? "bg-teal-400" : "bg-teal-600")} style={{ height: "40%" }} />
        <span className={cx("w-1.5 rounded-full", isDark ? "bg-teal-400" : "bg-teal-600")} style={{ height: "100%" }} />
        <span className={cx("w-1.5 rounded-full", isDark ? "bg-amber-400" : "bg-amber-500")} style={{ height: "65%" }} />
        <span className={cx("w-1.5 rounded-full", isDark ? "bg-teal-400" : "bg-teal-600")} style={{ height: "80%" }} />
      </div>
      {!compact && (
        <span
          className={cx("text-lg font-bold tracking-tight truncate", isDark ? "text-slate-50" : "text-slate-900")}
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cadence
        </span>
      )}
    </div>
  );
}

function ThemeToggle({ className = "" }) {
  const { isDark, toggle } = useTheme();
  const t = useThemeClasses();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={cx(
        "inline-flex items-center justify-center h-9 w-9 rounded-full border transition-colors",
        t.border, t.hover, className
      )}
    >
      {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
    </button>
  );
}

function Card({ children, className = "", padded = true }) {
  const t = useThemeClasses();
  return (
    <div className={cx("rounded-2xl border", t.surface, t.border, padded ? "p-5" : "", className)}>
      {children}
    </div>
  );
}

function SectionHeading({ title, subtitle, action }) {
  const t = useThemeClasses();
  return (
    <div className="flex items-end justify-between mb-3 gap-3">
      <div className="min-w-0">
        <h2 className={cx("text-base font-semibold tracking-tight", t.text)} style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        {subtitle && <p className={cx("text-sm mt-0.5", t.textSoft)}><UIText text={subtitle}/></p>}
      </div>
      {action}
    </div>
  );
}

function ProgressBar({ value, max = 100, colorClass = "bg-teal-600", trackClass }) {
  const t = useThemeClasses();
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cx("h-2 w-full rounded-full overflow-hidden", trackClass || t.surfaceAlt)}>
      <div className={cx("h-full rounded-full transition-all", colorClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Badge({ children, tone = "teal" }) {
  const tones = {
    teal: "bg-teal-600/10 text-teal-700 dark:text-teal-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", tones[tone])}>
      <UIText text={children}/>
    </span>
  );
}

function DemoTag() {
  const t = useThemeClasses();
  return (
    <span className={cx("text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded", t.surfaceAlt, t.textFaint)}><UIText text={"Demo data"}/> </span>
  );
}

function PrimaryButton({ children, onClick, className = "", icon: Icon, full = false }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800",
        "text-white font-semibold px-5 py-3 text-sm transition-colors shadow-sm shadow-teal-900/10",
        full ? "w-full" : "", className
      )}
    >
      <UIText text={children}/>
      {Icon && <Icon size={16} />}
    </button>
  );
}

function SecondaryButton({ children, onClick, className = "", icon: Icon, full = false }) {
  const t = useThemeClasses();
  return (
    <button
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-5 py-3 text-sm transition-colors border",
        t.border, t.text, t.hover,
        full ? "w-full" : "", className
      )}
    >
      <UIText text={children}/>
      {Icon && <Icon size={16} />}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent = "teal" }) {
  const t = useThemeClasses();
  const accents = {
    teal: "text-teal-600 dark:text-teal-400 bg-teal-600/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  };
  return (
    <Card className="flex flex-col gap-3">
      <div className={cx("h-9 w-9 rounded-lg flex items-center justify-center", accents[accent])}>
        <Icon size={17} />
      </div>
      <div>
        <p className={cx("text-xl font-bold tracking-tight", t.text)} style={{ fontFamily: "var(--font-display)" }}>
          {value}
        </p>
        <p className={cx("text-xs mt-0.5", t.textSoft)}><UIText text={label}/></p>
        {sub && <p className={cx("text-[11px] mt-1", t.textFaint)}><UIText text={sub}/></p>}
      </div>
    </Card>
  );
}

function Switch({ checked, onChange, label }) {
  const t = useThemeClasses();
  const { isRTL } = useAuth();
  const onPos = isRTL ? "-translate-x-6" : "translate-x-6";
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
        checked ? "bg-teal-600" : t.surfaceAlt
      )}
      aria-label={label}
    >
      <span
        className={cx(
          "inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform",
          checked ? onPos : "translate-x-1"
        )}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}

function PageHeader({ title, subtitle }) {
  const t = useThemeClasses();
  return (
    <div className="mb-6">
      <h1 className={cx("text-2xl font-bold tracking-tight", t.text)} style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h1>
      {subtitle && <p className={cx("text-sm mt-1", t.textSoft)}><UIText text={subtitle}/></p>}
    </div>
  );
}

/* ---------------------------- Auth screens --------------------------- */

function TextField({ label, icon: Icon, type = "text", value, onChange, placeholder, rightSlot, isRTL }) {
  const t = useThemeClasses();
  return (
    <div>
      {label && <label className={cx("block text-xs font-medium mb-1.5", t.textSoft)}>{label}</label>}
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className={cx("absolute top-1/2 -translate-y-1/2", t.textFaint, isRTL ? "right-3.5" : "left-3.5")}
          />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cx(
            "w-full rounded-xl py-3 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors",
            Icon ? (isRTL ? "pr-10 pl-4" : "pl-10 pr-4") : "px-4",
            rightSlot ? (isRTL ? "pl-10" : "pr-10") : "",
            t.surfaceAlt, t.border, t.text
          )}
        />
        {rightSlot && (
          <div className={cx("absolute top-1/2 -translate-y-1/2", isRTL ? "left-3" : "right-3")}>{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium px-3.5 py-2.5">
      {message}
    </div>
  );
}

function AuthShell({ children }) {
  const t = useThemeClasses();
  const { isRTL } = useAuth();
  return (
    <div className={cx("min-h-screen flex flex-col items-center justify-center px-5 py-10", t.bg)}>
      <div className="w-full max-w-sm">
        <div className={cx("flex items-center mb-8", isRTL ? "justify-end" : "justify-start")}>
          <Logo />
        </div>
        <div className={cx("rounded-2xl border p-6", t.surface, t.border)}>{children}</div>
        <div className="flex justify-center mt-6">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function SignInScreen({ goTo }) {
  const t = useThemeClasses();
  const T = useT();
  const { signIn, isRTL } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <AuthShell>
      <h1 className={cx("text-xl font-bold mb-1", t.text)} style={{ fontFamily: "var(--font-display)" }}>
        {T("welcomeBack")}
      </h1>
      <p className={cx("text-sm mb-6", t.textSoft)}>{T("welcomeBackSub")}</p>
      <form onSubmit={submit} className="space-y-4">
        <TextField label={T("email")} icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" isRTL={isRTL} />
        <TextField
          label={T("password")} icon={Lock} type={showPw ? "text" : "password"} value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" isRTL={isRTL}
          rightSlot={
            <button type="button" onClick={() => setShowPw((s) => !s)} className={t.textFaint} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
        <div className={cx("flex", isRTL ? "justify-start" : "justify-end")}>
          <button type="button" onClick={() => goTo("forgot")} className="text-xs font-semibold text-teal-600 dark:text-teal-400">
            {T("forgotPassword")}
          </button>
        </div>
        <FormError message={error} />
        <PrimaryButton full icon={loading ? Loader2 : LogIn}>{loading ? "…" : T("signIn")}</PrimaryButton>
      </form>
      <p className={cx("text-sm text-center mt-5", t.textSoft)}>
        {T("noAccount")}{" "}
        <button onClick={() => goTo("signup")} className="font-semibold text-teal-600 dark:text-teal-400">
          {T("signUp")}
        </button>
      </p>
    </AuthShell>
  );
}

function SignUpScreen({ goTo }) {
  const t = useThemeClasses();
  const T = useT();
  const { signUp, isRTL } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const res = await signUp(name, email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };

  return (
    <AuthShell>
      <h1 className={cx("text-xl font-bold mb-1", t.text)} style={{ fontFamily: "var(--font-display)" }}>
        {T("createAccount")}
      </h1>
      <p className={cx("text-sm mb-6", t.textSoft)}>{T("createAccountSub")}</p>
      <form onSubmit={submit} className="space-y-4">
        <TextField label={T("name")} icon={User} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" isRTL={isRTL} />
        <TextField label={T("email")} icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" isRTL={isRTL} />
        <TextField
          label={T("password")} icon={Lock} type={showPw ? "text" : "password"} value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" isRTL={isRTL}
          rightSlot={
            <button type="button" onClick={() => setShowPw((s) => !s)} className={t.textFaint} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
        <TextField label={T("confirmPassword")} icon={Lock} type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" isRTL={isRTL} />
        <FormError message={error} />
        <PrimaryButton full icon={loading ? Loader2 : UserPlus}>{loading ? "…" : T("createAccount")}</PrimaryButton>
      </form>
      <p className={cx("text-sm text-center mt-5", t.textSoft)}>
        {T("haveAccount")}{" "}
        <button onClick={() => goTo("signin")} className="font-semibold text-teal-600 dark:text-teal-400">
          {T("signIn")}
        </button>
      </p>
    </AuthShell>
  );
}

function ForgotPasswordScreen({ goTo }) {
  const t=useThemeClasses();
  return <AuthShell><h1 className={cx("text-xl font-bold",t.text)}><UIText text="Account"/></h1><p className={cx("my-5 text-sm",t.textSoft)}><UIText text="Password recovery is unavailable in local practice mode. Hosted accounts use ChatGPT sign-in."/></p><SecondaryButton full onClick={()=>goTo("signIn")}><UIText text="Back to sign in"/></SecondaryButton></AuthShell>;
}
function AuthFlow() {
  if (window.CADENCE_SESSION?.mode === "hosted") return <HostedSignIn/>;
  const [screen, setScreen] = useState("signin");
  if (screen === "signup") return <SignUpScreen goTo={setScreen} />;
  if (screen === "forgot") return <ForgotPasswordScreen goTo={setScreen} />;
  return <SignInScreen goTo={setScreen} />;
}

/* ---------------------------- Layout: Sidebar --------------------------- */

function Sidebar({ page, onNavigate }) {
  const t = useThemeClasses();
  const T = useT();
  const { currentUser, profile, isRTL } = useAuth();
  const roadmap = useMemo(() => buildRoadmap(profile), [profile]);
  return (
    <aside
      className={cx(
        "hidden md:flex md:flex-col md:w-64 md:shrink-0 md:h-screen md:sticky md:top-0",
        isRTL ? "border-s" : "border-e",
        t.surface, t.border
      )}
    >
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {NAV.map((item) => {
          const active = page === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-start",
                active
                  ? "bg-teal-600/10 text-teal-700 dark:text-teal-300"
                  : cx(t.textSoft, t.hover)
              )}
            >
              <Icon size={17} className="shrink-0" />
              <span className="truncate">{T(`nav_${item.id}`)}</span>
              {active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />}
            </button>
          );
        })}
      </nav>
      <div className={cx("px-4 py-4 border-t flex items-center justify-between", t.border)}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {(currentUser?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className={cx("text-sm font-medium truncate", t.text)}>{currentUser?.name}</p>
            <p className={cx("text-[11px]", t.textFaint)}><UIText text={"Level"}/> {roadmap ? roadmap.overallLevel : "—"}</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}

/* ---------------------------- Layout: Mobile top bar --------------------------- */

function MobileTopBar({ page }) {
  const t = useThemeClasses();
  const T = useT();
  const isHome = page === "home";
  return (
    <div className={cx("md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur", t.surface, t.border)}>
      <Logo compact={!isHome} />
      {!isHome && (
        <span className={cx("text-sm font-semibold", t.text)} style={{ fontFamily: "var(--font-display)" }}>
          {T(`nav_${page}`)}
        </span>
      )}
      <ThemeToggle />
    </div>
  );
}

/* ---------------------------- Layout: Bottom nav --------------------------- */

function BottomNav({ page, onNavigate, onMore }) {
  const t = useThemeClasses();
  const T = useT();
  const items = NAV.filter((n) => MOBILE_PRIMARY_IDS.includes(n.id));
  const moreActive = MOBILE_MORE_IDS.includes(page);
  return (
    <nav
      className={cx(
        "md:hidden fixed bottom-0 inset-x-0 z-40 border-t px-1 pb-[env(safe-area-inset-bottom)]",
        t.surface, t.border
      )}
    >
      <div className="flex items-stretch justify-between">
        {items.map((item) => {
          const active = page === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
            >
              <Icon size={19} className={active ? "text-teal-600 dark:text-teal-400" : t.textFaint} />
              <span className={cx("text-[10px] font-medium", active ? "text-teal-600 dark:text-teal-400" : t.textFaint)}>
                {T(`nav_${item.id}`)}
              </span>
            </button>
          );
        })}
        <button onClick={onMore} className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5">
          <Grid3x3 size={19} className={moreActive ? "text-teal-600 dark:text-teal-400" : t.textFaint} />
          <span className={cx("text-[10px] font-medium", moreActive ? "text-teal-600 dark:text-teal-400" : t.textFaint)}>
            {T("nav_more")}
          </span>
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({ open, onClose, page, onNavigate }) {
  const t = useThemeClasses();
  const T = useT();
  if (!open) return null;
  const items = NAV.filter((n) => MOBILE_MORE_IDS.includes(n.id));
  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cx("absolute bottom-0 inset-x-0 rounded-t-3xl border-t p-5 pb-8", t.surface, t.border)}>
        <div className="flex items-center justify-between mb-4">
          <span className={cx("text-sm font-semibold", t.text)} style={{ fontFamily: "var(--font-display)" }}>
            {T("nav_more")}
          </span>
          <button onClick={onClose} className={cx("h-8 w-8 rounded-full flex items-center justify-center", t.hover)} aria-label="Close">
            <X size={16} className={t.textSoft} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cx(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl py-4 border",
                  active ? "border-teal-600 bg-teal-600/10" : t.border
                )}
              >
                <Icon size={19} className={active ? "text-teal-600 dark:text-teal-400" : t.textSoft} />
                <span className={cx("text-[11px] font-medium text-center leading-tight", t.text)}>{T(`nav_${item.id}`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Pages                                                                  */
/* ---------------------------------------------------------------------- */

function HomePage({ onNavigate }) {
  const t = useThemeClasses();
  const { loaded, currentUser, profile, roadmap, activityLog, vocab, xpTotal, streak, courseProgress } = useProgressData();
  const levelProgress = profile?.assessment ? Math.round(profile.assessment.overallScore * 100) : 50;
  const goalMinutes = profile?.dailyGoalMinutes || 20;
  const minutesToday = loaded ? minutesOnDay(activityLog, 0) : 0;
  const vocabDue = loaded ? vocab.filter(isDue).length : 0;
  const xpLevel = loaded ? computeLevelInfo(xpTotal) : { level: 1, xpToNext: 200 };

  const activeCourse = useMemo(() => {
    if (!loaded) return null;
    const started = COURSE_CATALOG
      .map((c) => ({ course: c, state: getCourseState(courseProgress, c.id) }))
      .filter((x) => x.state.startedAt && !x.state.completedAt);
    if (started.length) return started[0];
    const first = COURSE_CATALOG.find((c) => (profile?.priorities || []).includes("Professional English") && c.id === "professional")
      || COURSE_CATALOG.find((c) => c.id === "everyday");
    return { course: first, state: getCourseState(courseProgress, first.id) };
  }, [loaded, courseProgress, profile]);
  const activeCoursePct = activeCourse ? computeCourseProgress(activeCourse.course, activeCourse.state) : 0;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className={cx("text-sm", t.textSoft)}><UIText text={"Good morning"}/></p>
          <h1 className={cx("text-2xl font-bold tracking-tight", t.text)} style={{ fontFamily: "var(--font-display)" }}>
            {currentUser?.name} <span aria-hidden="true">👋</span>
          </h1>
        </div>
      </div>

      <Card className="border-teal-500/30 bg-teal-500/5 space-y-3">
        <h2 className={cx("text-lg font-bold",t.text)}><UIText text="Today’s next step"/></h2>
        <p className={cx("text-sm",t.textSoft)}><UIText text="Learn one concept, practice it, then review your progress."/></p>
        <PrimaryButton full icon={ArrowRight} onClick={()=>onNavigate("daily")}><UIText text="Start today’s lesson"/></PrimaryButton>
        <p className={cx("text-xs",t.textSoft)}><UIText text="Progress follows completed lessons and correct answers."/></p>
      </Card>
      {profile?.assessment && <p className={cx("text-xs",t.textSoft)}><UIText text="Preliminary estimate — grammar, vocabulary and reading only. Speaking and writing are not assessed."/></p>}
      {roadmap && (
        <>
          {/* CEFR level card */}
          <Card className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shrink-0" style={{ fontFamily: "var(--font-display)" }}>
                {roadmap.overallLevel}
              </div>
              <div>
                <p className={cx("text-sm font-semibold", t.text)}><UIText text={"Current level:"}/> {roadmap.overallLevel}</p>
                <p className={cx("text-xs", t.textSoft)}><UIText text={"Next milestone:"}/> {roadmap.nextMilestone}</p>
              </div>
            </div>
            <div className="flex-1 min-w-[140px]">
              <ProgressBar value={levelProgress} colorClass="bg-teal-600" />
            </div>
          </Card>

          {/* Today's target */}
          <Card>
            <SectionHeading title="Today's target" />
            <p className={cx("text-sm", t.text)}>{roadmap.todayTarget}</p>
          </Card>
        </>
      )}

      {/* Today's goal */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className={cx("text-sm font-semibold", t.text)}><UIText text={"Today's goal"}/> </p>
          <span className={cx("text-xs", t.textSoft)}>
            {minutesToday}/{goalMinutes}<UIText text={"min"}/> </span>
        </div>
        <ProgressBar value={minutesToday} max={goalMinutes} colorClass="bg-amber-500" />
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Speaking minutes" value={`${minutesToday}m`} sub="today" accent="teal" />
        <StatCard icon={Flame} label="Streak" value={`${loaded ? streak.current : 0} days`} sub="keep it going" accent="amber" />
        <StatCard icon={Star} label="XP" value={loaded ? xpTotal.toLocaleString() : "0"} sub={`Level ${xpLevel.level} · ${xpLevel.xpToNext} to next`} accent="teal" />
        <StatCard icon={Layers} label="Vocabulary due" value={vocabDue} sub="ready to review" accent="amber" />
      </div>

      {roadmap && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Weak area / recommended activity */}
          <Card>
            <SectionHeading title="Weak area" />
            <div className="flex items-center justify-between mb-2">
              <p className={cx("text-sm", t.text)}>{roadmap.priorityAreaName}</p>
              <Badge tone="rose">{roadmap.prioritySkill.level}</Badge>
            </div>
            <p className={cx("text-xs mb-2", t.textFaint)}>{roadmap.recommendedActivity.reason}</p>
            <button
              onClick={() => onNavigate(roadmap.recommendedActivity.mode === "vocabulary" ? "vocabulary" : "practice")}
              className="mt-1 text-sm font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1"
            >
              <UIText text={"Practice this"}/> <ChevronRight size={14} />
            </button>
          </Card>

          {/* Current learning path */}
          <Card>
            <SectionHeading title="Current learning path" />
            <p className={cx("text-sm font-medium", t.text)}><UIText text={"Focused on"}/> {roadmap.priorityAreaName}</p>
            <p className={cx("text-xs mb-2", t.textSoft)}><UIText text={"Building toward"}/> {roadmap.nextMilestone}</p>
            <ProgressBar value={levelProgress} colorClass="bg-teal-600" />
            {activeCourse && (
              <div className="mt-3 pt-3 border-t border-dashed border-current/10">
                <p className={cx("text-xs", t.textSoft)}><UIText text={"Current course:"}/> <span className={cx("font-medium", t.text)}>{activeCourse.course.title}</span> · {activeCoursePct}%</p>
              </div>
            )}
            <button
              onClick={() => onNavigate("roadmap")}
              className="mt-3 text-sm font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1"
            ><UIText text={"View full roadmap"}/> <ChevronRight size={14} />
            </button>
          </Card>
        </div>
      )}

      {/* Weekly progress */}
      <Card>
        <SectionHeading title="Weekly progress" subtitle="Study minutes per day" />
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={loaded ? weeklyMinutesSeries(activityLog) : []} margin={{ left: -20, top: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={t.isDark ? "#1e293b" : "#e2e8f0"} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: t.isDark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: t.isDark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                cursor={{ fill: t.isDark ? "#1e293b" : "#f1f5f9" }}
                contentStyle={{
                  background: t.isDark ? "#0f172a" : "#ffffff",
                  border: `1px solid ${t.isDark ? "#1e293b" : "#e2e8f0"}`,
                  borderRadius: 12, fontSize: 12,
                }}
              />
              <Bar dataKey="minutes" fill="#0d9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PrimaryButton full icon={ArrowRight} onClick={() => onNavigate("daily")}><UIText text={"Continue Learning"}/> </PrimaryButton>
        <SecondaryButton full icon={PhoneCall} onClick={() => onNavigate("aicall")}><UIText text={"Start AI Call"}/> </SecondaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  AI Call: modular voice architecture                                    */
/*  Microphone → Speech-to-Text → AI Tutor → Text response → Text-to-Speech */
/* ---------------------------------------------------------------------- */

/* STT and TTS are separate provider registries, same pattern as AI_PROVIDERS,
   so either can be swapped for a different service later without touching
   the call UI. Both currently use the browser's built-in Web Speech APIs —
   no key of any kind is involved, so there is nothing to expose client-side.
   If a browser lacks these APIs, the provider reports itself unsupported
   and the call screen shows an honest configuration state instead of
   pretending to listen or speak. */

const STT_PROVIDERS = {
  webspeech: {
    id: "webspeech",
    label: "Browser speech recognition",
    isSupported: () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    create({ onResult, onEnd, onError }) {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (e) => {
        let interim = "", final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += transcript;
          else interim += transcript;
        }
        onResult({ interim, final });
      };
      rec.onerror = (e) => onError && onError(e.error);
      rec.onend = () => onEnd && onEnd();
      return rec;
    },
  },
};

const TTS_PROVIDERS = {
  webspeech: {
    id: "webspeech",
    label: "Browser speech synthesis",
    isSupported: () => typeof window !== "undefined" && !!window.speechSynthesis,
    speak(text, { onStart, onEnd, onError }) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      utter.lang = "en-US";
      utter.onstart = () => onStart && onStart();
      utter.onend = () => onEnd && onEnd();
      utter.onerror = (e) => onError && onError(e.error);
      window.speechSynthesis.speak(utter);
      return utter;
    },
    cancel() {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    },
  },
};

const ACTIVE_STT_ID = "webspeech";
const ACTIVE_TTS_ID = "webspeech";
function getActiveSTT() { return STT_PROVIDERS[ACTIVE_STT_ID] || null; }
function getActiveTTS() { return TTS_PROVIDERS[ACTIVE_TTS_ID] || null; }

/* Explicit mic pre-flight check, distinct from STT/TTS support, so the call
   screen can tell "your browser can't do this" apart from "you said no". */
async function checkMicPermission() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((tr) => tr.stop());
    return { ok: true };
  } catch (e) {
    if (e && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")) return { ok: false, reason: "denied" };
    if (e && e.name === "NotFoundError") return { ok: false, reason: "no-device" };
    return { ok: false, reason: "error" };
  }
}

const callSessionsKey = (email) => `call_sessions:${email.trim().toLowerCase()}`;

function buildCallSystemPrompt(profile, topic) {
  const cefr = profile?.assessment?.overallLevel || profile?.englishLevel || "B1";
  const name = profile?.name || "the learner";
  return `You are Cadence's AI Call partner — a live, natural spoken phone conversation with ${name}, an English learner at CEFR ${cefr}. Topic: "${topic.title}" (${topic.desc}).

This is a VOICE call, not a text chat, so:
- Speak the way a real person would on a phone call — warm, natural, brief (1–3 sentences per turn).
- React naturally to what they say before moving on; ask genuine follow-up questions that build on their answer.
- Avoid repeating similar questions — keep the conversation moving to new ground.
- Let the learner do most of the talking. Don't interrupt the flow with corrections on every turn.
- Minimize interruptions: only correct something important or clearly repeated, and do that after a natural stretch of conversation (roughly every 4–6 exchanges), not every turn. When you do correct, use exactly this format inline:

You said:
...

Correct:
...

More natural:
...

Why:
...

Try again:
...

- Otherwise, just keep the conversation flowing naturally in character as a friendly conversation partner.`;
}

function buildCallGreeting(profile, topic) {
  const name = profile?.name || "there";
  return `Hey ${name}! Good to talk. Let's chat about ${topic.title.toLowerCase()} — ${topic.desc.toLowerCase()}. Go ahead, tell me a bit to get us started.`;
}

function buildPostCallReportPrompt() {
  return `You are reviewing a transcript of a spoken English practice call. Based ONLY on what appears in the transcript, respond in EXACTLY this format, with nothing before or after it:

What went well:
(1–2 concrete, specific strengths you observed)

Important corrections:
(the most important 1–3 mistakes, each as "X" → "Y", or "None — solid accuracy this call" if there truly weren't any)

Better wording:
(1–2 phrases the learner used that could sound more natural, with a more natural alternative)

Vocabulary upgrade:
(1–2 words/phrases the learner could use instead of something simpler they said)

Fluency observations:
(brief, honest observations about pacing, hesitation, or sentence variety based on the transcript)

Do not mention or evaluate pronunciation — you only have text, not audio.`;
}

/* ----- Capability gate: mic / STT / TTS / AI, each checked and reported honestly ----- */

function CallCapabilityGate({ topic, onReady, onBack }) {
  const t = useThemeClasses();
  const [status, setStatus] = useState("checking"); // checking | ready | blocked
  const [reason, setReason] = useState(null);

  const runCheck = async () => {
    setStatus("checking");
    setReason(null);
    const stt = getActiveSTT();
    const tts = getActiveTTS();
    if (!stt || !stt.isSupported()) return setStatus("blocked") || setReason("stt-unsupported");
    if (!tts || !tts.isSupported()) return setStatus("blocked") || setReason("tts-unsupported");
    const mic = await checkMicPermission();
    if (!mic.ok) {
      setStatus("blocked");
      setReason(`mic-${mic.reason}`);
      return;
    }
    const aiOk = await checkProviderAvailable();
    if (!aiOk) {
      setStatus("blocked");
      setReason("ai-unavailable");
      return;
    }
    setStatus("ready");
    onReady();
  };

  useEffect(() => { runCheck(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "ready") return null;

  const messages = {
    "stt-unsupported": { title: "Voice isn't supported in this browser", body: "This browser doesn't support speech recognition, so AI Call can't listen to you here. Try a recent version of Chrome or Edge, or use Tutor for text practice instead." },
    "tts-unsupported": { title: "Voice isn't supported in this browser", body: "This browser can't play spoken responses (speech synthesis), so AI Call can't talk back here. Try a recent version of Chrome or Edge, or use Tutor for text practice instead." },
    "mic-denied": { title: "Microphone access denied", body: "AI Call needs microphone access to hear you. Please allow microphone access for this site in your browser settings, then retry." },
    "mic-no-device": { title: "No microphone found", body: "We couldn't find a microphone on this device. Connect one and try again, or use Tutor for text practice instead." },
    "mic-unsupported": { title: "Microphone access isn't available", body: "This browser or context doesn't support microphone access (it may require a secure https connection)." },
    "mic-error": { title: "Couldn't access the microphone", body: "Something went wrong requesting microphone access. Please try again." },
    "ai-unavailable": { title: "AI Tutor isn't connected", body: "No AI provider credential is currently reachable, so the call can't have a real conversation right now. Nothing here is a simulated reply." },
  };
  const info = messages[reason] || { title: "Checking voice setup…", body: "" };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] pb-2">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold mb-4", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"AI Call"}/>
      </button>
      <Card className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <div className={cx("h-12 w-12 rounded-2xl flex items-center justify-center", t.surfaceAlt)}>
          {status === "checking" ? <Loader2 size={20} className={cx("animate-spin", t.textFaint)} /> : <WifiOff size={20} className={t.textFaint} />}
        </div>
        {status === "blocked" && <Badge tone="amber"><UIText text={"Demo / Configuration"}/> </Badge>}
        <p className={cx("text-sm font-semibold max-w-xs", t.text)}>{status === "checking" ? "Checking microphone, voice, and AI connection…" : info.title}</p>
        {status === "blocked" && <p className={cx("text-xs max-w-xs", t.textSoft)}>{info.body}</p>}
        {status === "blocked" && (
          <SecondaryButton icon={RotateCcw} onClick={runCheck}><UIText text={"Retry"}/></SecondaryButton>
        )}
      </Card>
    </div>
  );
}

/* ----- Active call screen ----- */

function ActiveCallScreen({ topic, profile, currentUser, onEnd }) {
  const t = useThemeClasses();
  const [callState, setCallState] = useState("listening"); // listening | thinking | speaking | muted
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState([]); // {role, text, ts}
  const [interimText, setInterimText] = useState("");
  const [showTranscript, setShowTranscript] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [correctionsLogged, setCorrectionsLogged] = useState(0);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const mutedRef = useRef(false);
  const endingRef = useRef(false);
  const transcriptRef = useRef([]);
  const scrollRef = useRef(null);
  const manualStopRef = useRef(false);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [transcript, interimText]);

  useEffect(() => {
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    const greeting = buildCallGreeting(profile, topic);
    setTranscript([{ role: "assistant", text: greeting, ts: Date.now() }]);
    speak(greeting, startListening);
    return () => {
      endingRef.current = true;
      clearInterval(timerRef.current);
      recognitionRef.current?.abort?.();
      getActiveTTS()?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = (text, onDone) => {
    const tts = getActiveTTS();
    if (!tts) { onDone && onDone(); return; }
    setCallState("speaking");
    tts.speak(text, {
      onEnd: () => { if (!endingRef.current) onDone && onDone(); },
      onError: () => { if (!endingRef.current) onDone && onDone(); },
    });
  };

  const startListening = () => {
    if (endingRef.current) return;
    if (mutedRef.current) { setCallState("muted"); return; }
    const stt = getActiveSTT();
    if (!stt) return;
    setInterimText("");
    setCallState("listening");
    manualStopRef.current = false;
    const rec = stt.create({
      onResult: ({ interim, final }) => {
        if (interim) setInterimText(interim);
        if (final && final.trim()) {
          setInterimText("");
          manualStopRef.current = true;
          try { rec.stop(); } catch (e) { /* noop */ }
          handleUserUtterance(final.trim());
        }
      },
      onEnd: () => {
        // Only auto-restart if recognition ended on its own (silence/timeout) —
        // never after we stopped it ourselves to hand off to the AI or to mute.
        if (!manualStopRef.current && !endingRef.current && !mutedRef.current) {
          try { rec.start(); } catch (e) { /* already running */ }
        }
      },
      onError: (err) => {
        if (err === "no-speech" || err === "aborted") return;
      },
    });
    recognitionRef.current = rec;
    try { rec.start(); } catch (e) { /* noop */ }
  };

  const handleUserUtterance = async (text) => {
    const userMsg = { role: "user", text, ts: Date.now() };
    const withUser = [...transcriptRef.current, userMsg];
    setTranscript(withUser);
    setCallState("thinking");
    try {
      const provider = getActiveProvider();
      if (!provider) throw new Error("No provider");
      const system = buildCallSystemPrompt(profile, topic);
      const apiMessages = withUser.map((m) => ({ role: m.role, content: m.text }));
      const reply = await provider.send({ system, messages: apiMessages, maxTokens: 300 });
      const aiMsg = { role: "assistant", text: reply, ts: Date.now() };
      setTranscript((prev) => [...prev, aiMsg]);

      const correction = parseCorrectionMessage(reply);
      if (correction && currentUser) {
        const list = await loadList(errorsKey(currentUser.email));
        const category = guessErrorCategory(correction.original, correction.correct, correction.explanation);
        const next = addErrorEntry(list, { ...correction, category });
        await saveList(errorsKey(currentUser.email), next);
        setCorrectionsLogged((n) => n + 1);
      }

      speak(reply, startListening);
    } catch (e) {
      const errMsg = { role: "assistant", text: "(Connection dropped — let's try that again.)", ts: Date.now() };
      setTranscript((prev) => [...prev, errMsg]);
      setCallState("listening");
      startListening();
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (next) {
      recognitionRef.current?.abort?.();
      setCallState("muted");
    } else if (callState === "muted") {
      startListening();
    }
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const stateLabel = { listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…", muted: "Microphone paused" }[callState];
  const lastAssistant = [...transcript].reverse().find((m) => m.role === "assistant");

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] pb-2">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center text-center pt-4 pb-6">
          <div className={cx("h-16 w-16 rounded-2xl flex items-center justify-center mb-3", "bg-teal-600/10 text-teal-600 dark:text-teal-400")}>
            <Bot size={26} />
          </div>
          <p className={cx("text-sm font-semibold", t.text)}><UIText text={"AI Tutor"}/> </p>
          <p className={cx("text-xs mb-2", t.textSoft)}>{topic.title}</p>
          <p className={cx("text-xl font-bold tabular-nums", t.text)} style={{ fontFamily: "var(--font-display)" }}>{fmt(seconds)}</p>

          <div className="flex items-end gap-1.5 h-10 my-4" aria-hidden="true">
            {[40, 90, 60, 100, 55, 80, 35].map((h, i) => (
              <span
                key={i}
                className={cx(
                  "w-2 rounded-full transition-all duration-300",
                  callState === "listening" ? (i % 2 === 0 ? "bg-teal-500" : "bg-teal-300")
                    : callState === "speaking" ? (i % 2 === 0 ? "bg-amber-500" : "bg-amber-300")
                    : callState === "thinking" ? t.surfaceAlt
                    : t.surfaceAlt
                )}
                style={{ height: `${callState === "listening" || callState === "speaking" ? h : 20}%` }}
              />
            ))}
          </div>
          <Badge tone={callState === "speaking" ? "amber" : callState === "muted" ? "slate" : "teal"}>{stateLabel}</Badge>
        </div>

        {showCaptions && lastAssistant && (
          <div className="px-5 mb-4">
            <div className={cx("rounded-2xl px-4 py-3 text-sm text-center", t.surfaceAlt, t.text)}>
              {interimText ? <span className={t.textSoft}>{interimText}</span> : lastAssistant.text}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 px-5 mb-3">
          <button
            onClick={() => setShowTranscript((s) => !s)}
            className={cx("px-3 py-1.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5", showTranscript ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft))}
          >
            <AlignLeft size={12} /><UIText text={"Live transcript"}/> </button>
          <button
            onClick={() => setShowCaptions((s) => !s)}
            className={cx("px-3 py-1.5 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5", showCaptions ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft))}
          >
            <Subtitles size={12} /><UIText text={"Captions"}/> </button>
        </div>

        {showTranscript && (
          <div className="px-5 space-y-2 pb-4">
            {transcript.map((m, i) => (
              <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cx("max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed whitespace-pre-line", m.role === "user" ? "bg-teal-600 text-white rounded-br-sm" : cx(t.surfaceAlt, t.text, "rounded-bl-sm"))}>
                  {m.text}
                </div>
              </div>
            ))}
            {interimText && (
              <div className="flex justify-end">
                <div className={cx("max-w-[85%] rounded-2xl px-3.5 py-2 text-xs italic opacity-60", "bg-teal-600 text-white rounded-br-sm")}>{interimText}</div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pt-3">
        <button
          onClick={toggleMute}
          className={cx("h-12 w-12 rounded-full flex items-center justify-center border", muted ? "bg-rose-600 border-rose-600 text-white" : cx(t.border, t.hover, t.text))}
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
        >
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          onClick={() => onEnd(transcript, seconds, correctionsLogged)}
          className="h-12 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm inline-flex items-center gap-2"
        >
          <PhoneOff size={16} /><UIText text={"End call"}/> </button>
      </div>
    </div>
  );
}

/* ----- Post-call report ----- */

function PostCallReportSection({ label, text }) {
  const t = useThemeClasses();
  if (!text) return null;
  return (
    <div className={cx("rounded-xl px-3.5 py-2.5", t.surfaceAlt)}>
      <p className={cx("text-xs font-semibold uppercase tracking-wide mb-1", t.textFaint)}>{label}</p>
      <p className={cx("text-sm whitespace-pre-line", t.text)}>{text}</p>
    </div>
  );
}

function PostCallReport({ topic, transcript, seconds, correctionsLogged, currentUser, onDone }) {
  const t = useThemeClasses();
  const [status, setStatus] = useState("generating"); // generating | ready | fallback
  const [sections, setSections] = useState(null);

  const parse = (text) => {
    const grab = (label, stopLabels) => {
      const stopPattern = stopLabels.map((s) => `${s}:`).join("|");
      const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?:\\n\\s*(?:${stopPattern})|$)`, "i");
      const m = text.match(re);
      return m ? m[1].trim() : "";
    };
    return {
      wentWell: grab("What went well", ["Important corrections", "Better wording", "Vocabulary upgrade", "Fluency observations"]),
      corrections: grab("Important corrections", ["Better wording", "Vocabulary upgrade", "Fluency observations"]),
      betterWording: grab("Better wording", ["Vocabulary upgrade", "Fluency observations"]),
      vocabUpgrade: grab("Vocabulary upgrade", ["Fluency observations"]),
      fluency: grab("Fluency observations", []),
    };
  };

  useEffect(() => {
    (async () => {
      const userTurns = transcript.filter((m) => m.role === "user");
      let result = null;
      try {
        const provider = getActiveProvider();
        if (!provider) throw new Error("no provider");
        const transcriptText = transcript.map((m) => `${m.role === "user" ? "Learner" : "AI"}: ${m.text}`).join("\n");
        const reply = await provider.send({ system: buildPostCallReportPrompt(), messages: [{ role: "user", content: transcriptText }], maxTokens: 500 });
        result = parse(reply);
        setStatus("ready");
      } catch (e) {
        const wordCount = userTurns.reduce((n, m) => n + m.text.trim().split(/\s+/).filter(Boolean).length, 0);
        result = {
          wentWell: `You completed a ${Math.round(seconds / 60)}-minute call with ${userTurns.length} spoken turns — good consistency staying in the conversation.`,
          corrections: correctionsLogged > 0 ? `${correctionsLogged} correction${correctionsLogged === 1 ? "" : "s"} were noted live during the call and saved to your Error Bank.` : "No corrections were flagged this call.",
          betterWording: "",
          vocabUpgrade: "",
          fluency: `Roughly ${wordCount} words spoken across the call. A fuller AI-generated summary wasn't available this time — the connection may have dropped.`,
        };
        setStatus("fallback");
      }
      setSections(result);
      if (currentUser) {
        const list = await loadList(callSessionsKey(currentUser.email));
        const entry = { id: genId(), topic: topic.title, date: new Date().toISOString(), durationSeconds: seconds, turns: userTurns.length, correctionsLogged, report: result, transcript };
        await saveList(callSessionsKey(currentUser.email), [entry, ...list].slice(0, 20));
        await logPracticeSession(currentUser.email, { modeId: "aicall", modeTitle: `AI Call · ${topic.title}`, turns: userTurns.length, durationSeconds: seconds });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Post-Call Report" subtitle={`${topic.title} · ${fmt(seconds)}`} />
      {status === "generating" && (
        <Card className="flex items-center gap-3">
          <Loader2 size={16} className={cx("animate-spin", t.textFaint)} />
          <p className={cx("text-sm", t.text)}><UIText text={"Reviewing your call…"}/> </p>
        </Card>
      )}
      {sections && (
        <Card className="space-y-3">
          {status === "fallback" && <Badge tone="amber"><UIText text={"Basic summary — AI review unavailable"}/> </Badge>}
          <PostCallReportSection label="What went well" text={sections.wentWell} />
          <PostCallReportSection label="Important corrections" text={sections.corrections} />
          <PostCallReportSection label="Better wording" text={sections.betterWording} />
          <PostCallReportSection label="Vocabulary upgrade" text={sections.vocabUpgrade} />
          <PostCallReportSection label="Fluency observations" text={sections.fluency} />
          <p className={cx("text-xs italic", t.textFaint)}><UIText text={"Pronunciation feedback isn't shown — it requires real audio analysis, which this call doesn't perform."}/> </p>
        </Card>
      )}
      <PrimaryButton full icon={ArrowRight} onClick={onDone}><UIText text={"Done"}/></PrimaryButton>
    </div>
  );
}

function AICallPage() {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const [phase, setPhase] = useState("setup"); // setup | gate | active | report
  const [selectedTopic, setSelectedTopic] = useState(CALL_TOPICS[0]);
  const [callResult, setCallResult] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setRecentCalls(await loadList(callSessionsKey(currentUser.email)));
      setLoaded(true);
    })();
  }, [currentUser?.email]);

  if (phase === "gate") {
    return <CallCapabilityGate topic={selectedTopic} onReady={() => setPhase("active")} onBack={() => setPhase("setup")} />;
  }
  if (phase === "active") {
    return (
      <ActiveCallScreen
        topic={selectedTopic}
        profile={profile}
        currentUser={currentUser}
        onEnd={(transcript, seconds, correctionsLogged) => {
          setCallResult({ transcript, seconds, correctionsLogged });
          setPhase("report");
        }}
      />
    );
  }
  if (phase === "report" && callResult) {
    return (
      <PostCallReport
        topic={selectedTopic}
        transcript={callResult.transcript}
        seconds={callResult.seconds}
        correctionsLogged={callResult.correctionsLogged}
        currentUser={currentUser}
        onDone={async () => {
          if (currentUser) setRecentCalls(await loadList(callSessionsKey(currentUser.email)));
          setPhase("setup");
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="AI Call" subtitle="Have a live spoken conversation with your AI partner" />

      <Card className="flex flex-col items-center text-center py-10">
        <div className={cx("h-16 w-16 rounded-2xl flex items-center justify-center mb-4", "bg-teal-600/10 text-teal-600 dark:text-teal-400")}>
          <Bot size={26} />
        </div>
        <p className={cx("text-sm font-medium mb-1", t.text)}><UIText text={"Ready when you are"}/> </p>
        <p className={cx("text-xs mb-6", t.textSoft)}><UIText text={"Pick a topic below, then start your call"}/> </p>
        <PrimaryButton icon={PhoneCall} onClick={() => setPhase("gate")}><UIText text={"Start AI Call"}/> </PrimaryButton>
      </Card>

      <div>
        <SectionHeading title="Call topics" subtitle="Choose a scenario to practice" />
        <div className="grid sm:grid-cols-2 gap-3">
          {CALL_TOPICS.map((topic) => (
            <button key={topic.id} onClick={() => setSelectedTopic(topic)} className="text-left">
              <Card className={cx("transition-colors", selectedTopic.id === topic.id ? "border-teal-600 ring-1 ring-teal-600" : "")}>
                <div className="flex items-start justify-between gap-2">
                  <p className={cx("text-sm font-semibold", t.text)}>{topic.title}</p>
                  <Badge tone="slate">{topic.level}</Badge>
                </div>
                <p className={cx("text-xs mt-1", t.textSoft)}>{topic.desc}</p>
              </Card>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionHeading title="Recent calls" />
        <Card padded={false}>
          {loaded && recentCalls.length === 0 && (
            <p className={cx("text-sm text-center py-6", t.textSoft)}><UIText text={"No calls yet — your first call will show up here."}/> </p>
          )}
          {recentCalls.length > 0 && (
            <ul className={cx("divide-y", t.border)}>
              {recentCalls.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className={cx("text-sm font-medium truncate", t.text)}>{c.topic}</p>
                    <p className={cx("text-xs", t.textSoft)}>{new Date(c.date).toLocaleDateString()} · {Math.round(c.durationSeconds / 60)}<UIText text={"min"}/> </p>
                  </div>
                  <Badge tone="slate">{c.turns}<UIText text={"turns"}/> </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function genId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function TutorConfigState({ onRetry, checking }) {
  const t = useThemeClasses();
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] pb-2">
      <PageHeader title="Tutor" subtitle="Practice conversation with your AI tutor" />
      <Card className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <div className={cx("h-12 w-12 rounded-2xl flex items-center justify-center", t.surfaceAlt)}>
          <MessageCircle size={20} className={t.textFaint} />
        </div>
        <Badge tone="amber"><UIText text={"Demo / Configuration"}/> </Badge>
        <p className={cx("text-sm font-semibold max-w-xs", t.text)}><UIText text={"AI Tutor isn't connected"}/> </p>
        <p className={cx("text-xs max-w-xs", t.textSoft)}><UIText text={"No AI provider credential is currently reachable, so the tutor can't have a real conversation right now. Nothing here is a simulated reply."}/> </p>
        <SecondaryButton icon={checking ? Loader2 : RotateCcw} onClick={onRetry}>
          {checking ? "Checking…" : "Retry connection"}
        </SecondaryButton>
      </Card>
    </div>
  );
}

function TutorMessageBubble({ message, index, onSaveCorrection, onSaveWord, savedCorrection }) {
  const t = useThemeClasses();
  const isUser = message.role === "user";
  const correction = !isUser ? parseCorrectionMessage(message.content) : null;
  return (
    <div className={cx("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cx(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line",
          isUser ? "bg-teal-600 text-white rounded-br-sm" : cx(t.surfaceAlt, t.text, "rounded-bl-sm")
        )}
      >
        {message.content}
      </div>
      {!isUser && (
        <div className="flex items-center gap-3 mt-1.5 px-1">
          {correction && (
            <button
              onClick={() => onSaveCorrection(index, correction)}
              disabled={savedCorrection}
              className={cx("text-[11px] font-semibold inline-flex items-center gap-1", savedCorrection ? "text-emerald-600 dark:text-emerald-400" : "text-teal-600 dark:text-teal-400")}
            >
              {savedCorrection ? <Check size={11} /> : <BookMarked size={11} />}
              {savedCorrection ? "Saved to Error Bank" : "Save to Error Bank"}
            </button>
          )}
          <button onClick={() => onSaveWord(message.content)} className={cx("text-[11px] font-semibold inline-flex items-center gap-1", t.textFaint)}>
            <Plus size={11} /><UIText text={"Save word"}/> </button>
        </div>
      )}
    </div>
  );
}

function TutorPage() {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const roadmap = useMemo(() => buildRoadmap(profile), [profile]);

  const [providerStatus, setProviderStatus] = useState("checking"); // checking | ready | unavailable
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedText, setLastFailedText] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [savedCorrections, setSavedCorrections] = useState({});
  const [vocabPrefill, setVocabPrefill] = useState(null);
  const endRef = useRef(null);
  const messagesRef = useRef([]);
  const awardedTurnsRef = useRef(0);

  const activeKey = currentUser ? `tutor_active:${currentUser.email}` : null;
  const sessionsKey = currentUser ? `tutor_sessions:${currentUser.email}` : null;

  const persist = async (sid, msgs, startedAt) => {
    if (!activeKey) return;
    await safeSet(activeKey, JSON.stringify({ sessionId: sid, startedAt, messages: msgs, updatedAt: new Date().toISOString(), awardedTurns: awardedTurnsRef.current }));
  };

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const raw = await safeGet(activeKey);
      if (raw) {
        try {
          const s = JSON.parse(raw);
          setMessages(s.messages || []);
          setSessionId(s.sessionId);
          awardedTurnsRef.current = s.awardedTurns || 0;
        } catch (e) { /* fall through to fresh session */ }
      }
      if (!raw) {
        const greeting = { role: "assistant", content: buildTutorGreeting(profile, roadmap), ts: Date.now() };
        const sid = genId();
        setMessages([greeting]);
        setSessionId(sid);
        awardedTurnsRef.current = 0;
        await persist(sid, [greeting], new Date().toISOString());
      }
      setLoaded(true);
      const ok = await checkProviderAvailable();
      setProviderStatus(ok ? "ready" : "unavailable");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  // Award XP for any real turns the learner had even if they navigate away
  // without tapping "New conversation" — never on mount, only on unmount.
  useEffect(() => {
    return () => {
      const currentTurns = messagesRef.current.filter((m) => m.role === "user").length;
      const newTurns = currentTurns - awardedTurnsRef.current;
      if (newTurns > 0 && currentUser) {
        awardedTurnsRef.current = currentTurns;
        logPracticeSession(currentUser.email, { modeId: "tutor", modeTitle: "Tutor", turns: newTurns });
        if (activeKey) {
          safeGet(activeKey).then((raw) => {
            if (!raw) return;
            try {
              const s = JSON.parse(raw);
              safeSet(activeKey, JSON.stringify({ ...s, awardedTurns: currentTurns }));
            } catch (e) { /* best effort only */ }
          });
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, providerStatus]);

  const retryConnection = async () => {
    setProviderStatus("checking");
    const ok = await checkProviderAvailable();
    setProviderStatus(ok ? "ready" : "unavailable");
  };

  const sendToTutor = async (text) => {
    const userMsg = { role: "user", content: text, ts: Date.now() };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    persist(sessionId, withUser);
    setSending(true);
    setError("");
    setLastFailedText(null);
    try {
      const provider = getActiveProvider();
      if (!provider) throw new Error("No AI provider configured");
      const system = buildTutorContext(profile, roadmap);
      const apiMessages = withUser.map((m) => ({ role: m.role, content: m.content }));
      const reply = await provider.send({ system, messages: apiMessages, maxTokens: 500 });
      const assistantMsg = { role: "assistant", content: reply, ts: Date.now() };
      const withReply = [...withUser, assistantMsg];
      setMessages(withReply);
      persist(sessionId, withReply);
    } catch (e) {
      setError("That message couldn't be sent — the AI tutor connection may have dropped.");
      setLastFailedText(text);
      setProviderStatus("unavailable");
    } finally {
      setSending(false);
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    sendToTutor(text);
  };

  const retryLastMessage = () => {
    if (!lastFailedText) return;
    const text = lastFailedText;
    setLastFailedText(null);
    setError("");
    sendToTutor(text);
  };

  const startNewSession = async () => {
    if (!currentUser) return;
    const prevRaw = await safeGet(sessionsKey);
    const prevList = prevRaw ? JSON.parse(prevRaw) : [];
    if (sessionId) {
      const preview = messages.find((m) => m.role === "user")?.content?.slice(0, 60) || "New conversation";
      prevList.unshift({ sessionId, endedAt: new Date().toISOString(), messageCount: messages.length, preview });
      await safeSet(sessionsKey, JSON.stringify(prevList.slice(0, 20)));
      const userTurns = messages.filter((m) => m.role === "user").length;
      const newTurns = userTurns - awardedTurnsRef.current;
      if (newTurns > 0) {
        await logPracticeSession(currentUser.email, { modeId: "tutor", modeTitle: "Tutor", turns: newTurns });
      }
    }
    const greeting = { role: "assistant", content: buildTutorGreeting(profile, roadmap), ts: Date.now() };
    const sid = genId();
    setMessages([greeting]);
    setSessionId(sid);
    setError("");
    setLastFailedText(null);
    awardedTurnsRef.current = 0;
    await persist(sid, [greeting], new Date().toISOString());
  };

  const saveCorrectionToBank = async (index, correction) => {
    if (!currentUser || savedCorrections[index]) return;
    const list = await loadList(errorsKey(currentUser.email));
    const category = guessErrorCategory(correction.original, correction.correct, correction.explanation);
    const next = addErrorEntry(list, { ...correction, category });
    await saveList(errorsKey(currentUser.email), next);
    setSavedCorrections((s) => ({ ...s, [index]: true }));
  };

  const saveWordFromMessage = (messageContent) => {
    setVocabPrefill(messageContent);
  };

  const saveVocabFromTutor = async (fields) => {
    if (!currentUser) return;
    const list = await loadList(vocabKey(currentUser.email));
    const entry = defaultVocabEntry({
      ...fields,
      collocations: typeof fields.collocations === "string"
        ? fields.collocations.split(",").map((c) => c.trim()).filter(Boolean)
        : fields.collocations,
    });
    await saveList(vocabKey(currentUser.email), [entry, ...list]);
    setVocabPrefill(null);
  };

  if (providerStatus === "unavailable") {
    return <TutorConfigState onRetry={retryConnection} checking={false} />;
  }
  if (!loaded || providerStatus === "checking") {
    return <TutorConfigState onRetry={retryConnection} checking />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] pb-2">
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Tutor" subtitle="Practice conversation with your AI tutor" />
        <button
          onClick={startNewSession}
          className={cx("h-9 w-9 rounded-full flex items-center justify-center border shrink-0 mt-1", t.border, t.hover)}
          aria-label="Start new conversation"
          title="Start new conversation"
        >
          <RotateCcw size={15} className={t.textSoft} />
        </button>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden" padded={false}>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, i) => (
            <TutorMessageBubble
              key={i}
              message={m}
              index={i}
              savedCorrection={!!savedCorrections[i]}
              onSaveCorrection={saveCorrectionToBank}
              onSaveWord={saveWordFromMessage}
            />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className={cx("rounded-2xl rounded-bl-sm px-4 py-2.5", t.surfaceAlt)}>
                <div className="flex gap-1">
                  <span className={cx("h-1.5 w-1.5 rounded-full animate-bounce", t.textFaint)} style={{ animationDelay: "0ms" }} />
                  <span className={cx("h-1.5 w-1.5 rounded-full animate-bounce", t.textFaint)} style={{ animationDelay: "120ms" }} />
                  <span className={cx("h-1.5 w-1.5 rounded-full animate-bounce", t.textFaint)} style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span>{error}</span>
              {lastFailedText && (
                <button onClick={retryLastMessage} className="font-semibold underline shrink-0"><UIText text={"Retry"}/></button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className={cx("border-t p-3 flex items-center gap-2", t.border)}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            disabled={sending}
            className={cx(
              "flex-1 rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-60",
              t.surfaceAlt, t.border, t.text
            )}
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="h-10 w-10 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </Card>
      {vocabPrefill !== null && (
        <AddVocabModal
          onClose={() => setVocabPrefill(null)}
          onSave={saveVocabFromTutor}
          showKurdish={profile?.supportLanguage === "English + Kurdish Sorani"}
          initialExample={vocabPrefill}
        />
      )}
    </div>
  );
}

/* ----- Shared task runner bits (used by Daily Lesson + Course lessons) ----- */

function TaskInput({ item, value, onChange, onSubmit }) {
  const t = useThemeClasses();
  const isLong = item.type === "long" || item.type === "construct";
  const {uiLang}=useAuth();
  return (
    <>
      {item.type === "mcq" ? (
        <fieldset dir="ltr" lang="en" className="space-y-2"><legend className="sr-only">{item.prompt}</legend>{item.options.map(option=><label key={option} className={cx("flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3",t.border,value===option?"bg-teal-500/10 border-teal-500":t.surfaceAlt,t.text)}><input type="radio" name="cadence-task-answer" value={option} checked={value===option} onChange={()=>onChange(option)}/><span>{option}</span></label>)}</fieldset>
      ) : isLong ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={translate("Type your answer…",uiLang)}
          className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none", t.surfaceAlt, t.border, t.text)}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder={translate("Type your answer…",uiLang)}
          className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500", t.surfaceAlt, t.border, t.text)}
        />
      )}
      <PrimaryButton full className="mt-3" onClick={onSubmit}><UIText text={"Check"}/> </PrimaryButton>
    </>
  );
}

function TaskFeedback({ score, onContinue, continueLabel, onRetry }) {
  const t = useThemeClasses();
  const good = score >= 0.7;
  return (
    <div className="space-y-3">
      <div className={cx("rounded-xl px-3.5 py-2.5 text-sm font-medium", good ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
        <UIText text={score === 0.6 ? "Practice submitted. Open writing needs teacher feedback; these checks do not measure proficiency." : good ? "Nice work!" : "Good attempt — keep practicing this."}/>
      </div>
      <>{onRetry && !good ? <SecondaryButton full icon={RotateCcw} onClick={onRetry}><UIText text="Try again"/></SecondaryButton> : <PrimaryButton full icon={ArrowRight} onClick={onContinue}>{continueLabel || "Continue"}</PrimaryButton>}</>
    </div>
  );
}

/* ----- Daily Lesson runner ----- */

const DAILY_STAGES = ["Quick Review", "Today's Goal", "Small Concept", "Guided Practice", "Active Recall", "Mini Challenge", "Summary"];
const DAILY_INTERACTIVE = [3, 4, 5];

function DailyLessonPage({ onNavigate }) {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const roadmap = useMemo(() => buildRoadmap(profile), [profile]);
  const [loaded, setLoaded] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [stage, setStage] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState("prompt"); // prompt | feedback
  const [scores, setScores] = useState({ guided: null, recall: null, challenge: null });

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const errors = await loadList(errorsKey(currentUser.email));
      const vocab = await loadList(vocabKey(currentUser.email));
      const { lesson: l } = await loadDailyLesson(currentUser.email, profile, roadmap, errors, vocab);
      setLesson(l);
      setStage(l.stage || 0);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  const persist = (updates) => {
    if (!currentUser || !lesson) return;
    const next = { ...lesson, ...updates };
    setLesson(next);
    safeSet(dailyLessonKey(currentUser.email), JSON.stringify(next));
  };

  const goTo = (nextStage) => {
    setStage(nextStage);
    setAnswer("");
    setPhase("prompt");
    persist({ stage: nextStage });
  };

  const currentTask = stage === 3 ? lesson?.concept.guided : stage === 4 ? lesson?.concept.recall : stage === 5 ? lesson?.concept.challenge : null;
  const taskKey = stage === 3 ? "guided" : stage === 4 ? "recall" : "challenge";

  const submitTask = () => {
    if (!answer.trim() || !currentTask) return;
    const score = gradeAssessmentAnswer(currentTask, answer);
    setScores((s) => ({ ...s, [taskKey]: score }));
    setPhase("feedback");
  };

  const finishLesson = async () => {
    if (!currentUser || !lesson) return;
    persist({ done: true, stage: 6 });
    const history = await loadList(dailyHistoryKey(currentUser.email));
    const entry = { date: lesson.date, conceptId: lesson.conceptId, category: lesson.concept.category, level: lesson.level };
    await saveList(dailyHistoryKey(currentUser.email), [entry, ...history].slice(0, 30));
    await awardActivity(currentUser.email, { type: "daily_lesson", xp: ACTIVITY_XP.daily_lesson, minutes: 12, meta: { concept: lesson.concept.title } });
    onNavigate && onNavigate("home");
  };

  if (!loaded || !lesson) {
    return (
      <div className="space-y-6 pb-6">
        <PageHeader title="Daily Lesson" subtitle="Loading your personalized lesson…" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Daily Lesson" subtitle={`${lesson.level} · ${lesson.concept.title}`} />
      <OnboardingProgress step={stage} total={DAILY_STAGES.length} />
      <Badge tone="teal">{DAILY_STAGES[stage]}</Badge>

      <Card>
        {stage === 0 && (
          <div className="space-y-3">
            <p className={cx("text-sm", t.text)}>{lesson.quickReview.text}</p>
            {lesson.quickReview.errors.map((e) => (
              <div key={e.id} className={cx("rounded-xl px-3.5 py-2.5", t.surfaceAlt)}>
                <p className={cx("text-xs", t.textFaint)}><UIText text={"Recent mistake ("}/> {e.category})</p>
                <p className={cx("text-sm", t.text)}>{e.original} → <span className="font-medium">{e.correct}</span></p>
              </div>
            ))}
            {lesson.quickReview.vocab.map((v) => (
              <div key={v.id} className={cx("rounded-xl px-3.5 py-2.5", t.surfaceAlt)}>
                <p className={cx("text-xs", t.textFaint)}><UIText text={"Due word"}/> </p>
                <p className={cx("text-sm", t.text)}>{v.word} — {v.meaning}</p>
              </div>
            ))}
          </div>
        )}

        {stage === 1 && (
          <div>
            <p className={cx("text-sm font-semibold mb-2", t.text)}><UIText text={"Today's goal"}/> </p>
            <p className={cx("text-sm", t.text)}>{lesson.todaysGoal}</p>
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-2">
            <p className={cx("text-sm font-semibold", t.text)}>{lesson.concept.title}</p>
            <p className={cx("text-sm", t.text)}>{lesson.concept.explanation}</p>
            <p className={cx("text-sm italic", t.textSoft)}>{lesson.concept.example}</p>
          </div>
        )}

        {DAILY_INTERACTIVE.includes(stage) && currentTask && (
          <div>
            <p className={cx("text-sm font-medium mb-4", t.text)}>{currentTask.prompt}</p>
            {phase === "prompt" && <TaskInput item={currentTask} value={answer} onChange={setAnswer} onSubmit={submitTask} />}
            {phase === "feedback" && (
              <TaskFeedback
                score={scores[taskKey]}
                continueLabel={stage === 5 ? "See summary" : "Continue"}
                onContinue={() => goTo(stage + 1)}
              />
            )}
          </div>
        )}

        {stage === 6 && (
          <div className="space-y-3">
            <p className={cx("text-sm font-semibold", t.text)}><UIText text={"Nice work — here's your recap"}/> </p>
            <ul className="space-y-1.5">
              <li className={cx("text-sm", t.textSoft)}><UIText text={"• Focused on:"}/> {lesson.concept.title} ({lesson.concept.category})</li>
              <li className={cx("text-sm", t.textSoft)}><UIText text={"• Guided practice:"}/> {scores.guided != null ? `${Math.round(scores.guided * 100)}%` : "—"}</li>
              <li className={cx("text-sm", t.textSoft)}><UIText text={"• Active recall:"}/> {scores.recall != null ? `${Math.round(scores.recall * 100)}%` : "—"}</li>
              <li className={cx("text-sm", t.textSoft)}><UIText text={"• Mini challenge:"}/> {scores.challenge != null ? `${Math.round(scores.challenge * 100)}%` : "—"}</li>
            </ul>
            <PrimaryButton full icon={Check} onClick={finishLesson}><UIText text={"Finish lesson"}/> </PrimaryButton>
          </div>
        )}
      </Card>

      {[0, 1, 2].includes(stage) && (
        <div className="flex items-center justify-between">
          {stage > 0 ? (
            <SecondaryButton icon={ArrowLeft} onClick={() => goTo(stage - 1)}><UIText text={"Back"}/></SecondaryButton>
          ) : <span />}
          <PrimaryButton icon={ArrowRight} onClick={() => goTo(stage + 1)}><UIText text={"Continue"}/></PrimaryButton>
        </div>
      )}
      {DAILY_INTERACTIVE.includes(stage) && phase === "prompt" && (
        <SecondaryButton icon={ArrowLeft} onClick={() => goTo(stage - 1)}><UIText text={"Back"}/></SecondaryButton>
      )}
    </div>
  );
}

/* ----- Course library ----- */

function CourseLessonRunner({ lesson, onBack, onComplete }) {
  const t = useThemeClasses();
  const [phase, setPhase] = useState("learn"); // learn | practice | feedback
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);

  const submit = () => {
    if (!answer.trim()) return;
    setScore(gradeAssessmentAnswer(lesson.guided, answer));
    setPhase("feedback");
  };

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Back"}/>
      </button>
      <PageHeader title={lesson.title} subtitle={`${CEFR_LEVELS[lesson.level]} · ${lesson.category}`} />
      <Card className="space-y-3">
        {phase === "learn" && (
          <>
            <p className={cx("text-sm", t.text)}>{lesson.explanation}</p>
            <p className={cx("text-sm italic", t.textSoft)}>{lesson.example}</p>
            <PrimaryButton full icon={ArrowRight} onClick={() => setPhase("practice")}><UIText text={"Practice this"}/></PrimaryButton>
          </>
        )}
        {phase === "practice" && (
          <>
            <p className={cx("text-sm font-medium mb-1", t.text)}>{lesson.guided.prompt}</p>
            <TaskInput item={lesson.guided} value={answer} onChange={setAnswer} onSubmit={submit} />
          </>
        )}
        {phase === "feedback" && (
          <TaskFeedback score={score} continueLabel="Mark lesson complete" onContinue={() => onComplete(score)} onRetry={()=>{setAnswer("");setPhase("practice");}} />
        )}
      </Card>
    </div>
  );
}

function CourseCheckpointRunner({ title, task, onBack, onComplete }) {
  const t = useThemeClasses();
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState("prompt");
  const [score, setScore] = useState(0);

  const item = task;

  const submit = () => {
    if (!answer.trim()) return;
    setScore(gradeAssessmentAnswer(item, answer));
    setPhase("feedback");
  };

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Back"}/>
      </button>
      <PageHeader title={title} />
      <Card className="space-y-3">
        <p className={cx("text-sm font-medium", t.text)}>{task.prompt}</p>
        {phase === "prompt" && <TaskInput item={item} value={answer} onChange={setAnswer} onSubmit={submit} />}
        {phase === "feedback" && (
          <div className="space-y-3">
            <div className={cx("rounded-xl px-3.5 py-2.5 text-sm font-medium", score >= 0.6 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
              {score >= 0.6 ? "Passed! This unlocks the next step." : "Not quite there — you can try again anytime."}
            </div>
            <PrimaryButton full icon={Check} onClick={() => onComplete(score)}><UIText text={"Done"}/></PrimaryButton>
          </div>
        )}
      </Card>
    </div>
  );
}

function CourseModuleView({ course, module, courseState, onBack, onOpenLesson, onOpenCheckpoint }) {
  const t = useThemeClasses();
  const ms = getModuleState(courseState, module.id);
  const allLessonsDone = module.lessons.every((l) => ms.lessonsCompleted.includes(l.id));

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> {course.title}
      </button>
      <PageHeader title={module.title} />
      <div className="space-y-3">
        {module.lessons.map((l) => {
          const done = ms.lessonsCompleted.includes(l.id);
          return (
            <button key={l.id} onClick={() => onOpenLesson(l)} className="w-full text-start">
              <Card className="flex items-center gap-3">
                <div className={cx("h-8 w-8 rounded-full flex items-center justify-center shrink-0", done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : t.surfaceAlt)}>
                  {done ? <Check size={15} /> : <BookOpen size={14} className={t.textFaint} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cx("text-sm font-medium", t.text)}>{l.title}</p>
                  <p className={cx("text-xs", t.textFaint)}>{CEFR_LEVELS[l.level]} · {l.category}</p>
                </div>
                <ChevronRight size={15} className={t.textFaint} />
              </Card>
            </button>
          );
        })}
        <button onClick={() => allLessonsDone && onOpenCheckpoint()} disabled={!allLessonsDone} className="w-full text-start">
          <Card className={cx("flex items-center gap-3", !allLessonsDone && "opacity-50")}>
            <div className={cx("h-8 w-8 rounded-full flex items-center justify-center shrink-0", ms.checkpointPassed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : t.surfaceAlt)}>
              {ms.checkpointPassed ? <Check size={15} /> : <ClipboardList size={14} className={t.textFaint} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cx("text-sm font-medium", t.text)}><UIText text={"Checkpoint"}/></p>
              <p className={cx("text-xs", t.textFaint)}>{allLessonsDone ? "Ready" : "Complete all lessons to unlock"}</p>
            </div>
            <ChevronRight size={15} className={t.textFaint} />
          </Card>
        </button>
      </div>
    </div>
  );
}

function CourseDetailView({ course, courseState, onBack, onOpenModule, onOpenAssessment }) {
  const t = useThemeClasses();
  const progress = computeCourseProgress(course, courseState);
  const allCheckpointsPassed = course.modules.every((m) => getModuleState(courseState, m.id).checkpointPassed);

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Courses"}/>
      </button>
      <PageHeader title={course.title} subtitle={course.description} />
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className={cx("text-xs font-semibold", t.textSoft)}><UIText text={"Course progress"}/> </span>
          <span className={cx("text-xs", t.textSoft)}>{progress}%</span>
        </div>
        <ProgressBar value={progress} colorClass={progress === 100 ? "bg-emerald-600" : "bg-teal-600"} />
      </Card>

      <div className="space-y-3">
        {course.modules.map((m, i) => {
          const unlocked = isModuleUnlocked(course, courseState, i);
          const ms = getModuleState(courseState, m.id);
          const total = m.lessons.length + 1;
          const done = ms.lessonsCompleted.length + (ms.checkpointPassed ? 1 : 0);
          return (
            <button key={m.id} onClick={() => unlocked && onOpenModule(m)} disabled={!unlocked} className="w-full text-start">
              <Card className={cx(!unlocked && "opacity-50")}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className={cx("text-sm font-semibold", t.text)}>{m.title}</p>
                  {!unlocked && <Lock size={13} className={t.textFaint} />}
                </div>
                <ProgressBar value={done} max={total} colorClass="bg-teal-600" />
              </Card>
            </button>
          );
        })}
        <button onClick={() => allCheckpointsPassed && onOpenAssessment()} disabled={!allCheckpointsPassed} className="w-full text-start">
          <Card className={cx("flex items-center gap-3", !allCheckpointsPassed && "opacity-50")}>
            <div className={cx("h-8 w-8 rounded-full flex items-center justify-center shrink-0", courseState.assessmentPassed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : t.surfaceAlt)}>
              {courseState.assessmentPassed ? <Trophy size={15} /> : <GraduationCap size={14} className={t.textFaint} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cx("text-sm font-medium", t.text)}><UIText text={"Final assessment"}/> </p>
              <p className={cx("text-xs", t.textFaint)}>{allCheckpointsPassed ? "Ready" : "Pass all checkpoints to unlock"}</p>
            </div>
            <ChevronRight size={15} className={t.textFaint} />
          </Card>
        </button>
      </div>
    </div>
  );
}

function CoursesPage() {
  const t = useThemeClasses();
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [levelFilter, setLevelFilter] = useState("All");
  const [view, setView] = useState("catalog"); // catalog | course | module | lesson | checkpoint | assessment
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);

  const key = currentUser ? courseProgressKey(currentUser.email) : null;

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const raw = await safeGet(key);
      setProgress(raw ? JSON.parse(raw) : {});
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  const updateCourseState = (courseId, updater) => {
    setProgress((prev) => {
      const courseState = getCourseState(prev, courseId);
      const nextCourseState = updater({ ...courseState, modules: { ...courseState.modules } });
      const next = { ...prev, [courseId]: nextCourseState };
      safeSet(key, JSON.stringify(next));
      return next;
    });
  };

  const openCourse = (courseId) => {
    updateCourseState(courseId, (cs) => (cs.startedAt ? cs : { ...cs, startedAt: new Date().toISOString() }));
    setActiveCourseId(courseId);
    setView("course");
  };

  const activeCourse = COURSE_CATALOG.find((c) => c.id === activeCourseId);
  const activeCourseState = activeCourse ? getCourseState(progress, activeCourse.id) : defaultCourseState();
  const activeModule = activeCourse?.modules.find((m) => m.id === activeModuleId);
  const activeLesson = activeModule?.lessons.find((l) => l.id === activeLessonId);

  if (!loaded) return <div className="pb-6"><PageHeader title="Courses" subtitle="Loading…" /></div>;

  if (view === "lesson" && activeCourse && activeModule && activeLesson) {
    return (
      <CourseLessonRunner
        lesson={activeLesson}
        onBack={() => setView("module")}
        onComplete={() => {
          updateCourseState(activeCourse.id, (cs) => {
            const ms = getModuleState(cs, activeModule.id);
            const lessonsCompleted = ms.lessonsCompleted.includes(activeLesson.id) ? ms.lessonsCompleted : [...ms.lessonsCompleted, activeLesson.id];
            return { ...cs, modules: { ...cs.modules, [activeModule.id]: { ...ms, lessonsCompleted } } };
          });
          if (currentUser) awardActivity(currentUser.email, { type: "course_lesson", xp: ACTIVITY_XP.course_lesson, minutes: 10, meta: { course: activeCourse.id, lesson: activeLesson.id } });
          setView("module");
        }}
      />
    );
  }

  if (view === "checkpoint" && activeCourse && activeModule) {
    return (
      <CourseCheckpointRunner
        title={`${activeModule.title} · Checkpoint`}
        task={activeModule.checkpoint}
        onBack={() => setView("module")}
        onComplete={(score) => {
          updateCourseState(activeCourse.id, (cs) => {
            const ms = getModuleState(cs, activeModule.id);
            return { ...cs, modules: { ...cs.modules, [activeModule.id]: { ...ms, checkpointPassed: score >= 0.6, checkpointScore: score } } };
          });
          if (currentUser && score >= 0.6) awardActivity(currentUser.email, { type: "course_checkpoint", xp: ACTIVITY_XP.course_checkpoint, minutes: 8, meta: { course: activeCourse.id, module: activeModule.id, score } });
          setView("module");
        }}
      />
    );
  }

  if (view === "assessment" && activeCourse) {
    return (
      <CourseCheckpointRunner
        title={`${activeCourse.title} · Final assessment`}
        task={activeCourse.assessment}
        onBack={() => setView("course")}
        onComplete={(score) => {
          updateCourseState(activeCourse.id, (cs) => ({
            ...cs, assessmentPassed: score >= 0.6, assessmentScore: score,
            completedAt: score >= 0.6 ? new Date().toISOString() : cs.completedAt,
          }));
          if (currentUser && score >= 0.6) awardActivity(currentUser.email, { type: "course_assessment", xp: ACTIVITY_XP.course_assessment, minutes: 15, meta: { course: activeCourse.id, score } });
          setView("course");
        }}
      />
    );
  }

  if (view === "module" && activeCourse && activeModule) {
    return (
      <CourseModuleView
        course={activeCourse}
        module={activeModule}
        courseState={activeCourseState}
        onBack={() => setView("course")}
        onOpenLesson={(l) => { setActiveLessonId(l.id); setView("lesson"); }}
        onOpenCheckpoint={() => setView("checkpoint")}
      />
    );
  }

  if (view === "course" && activeCourse) {
    return (
      <CourseDetailView
        course={activeCourse}
        courseState={activeCourseState}
        onBack={() => setView("catalog")}
        onOpenModule={(m) => { setActiveModuleId(m.id); setView("module"); }}
        onOpenAssessment={() => setView("assessment")}
      />
    );
  }

  const levels = ["All", "Beginner", "Intermediate", "Advanced"];
  const levelOf = (course) => {
    const first = course.levelRange[0];
    if (first === "A") return "Beginner";
    if (first === "B") return "Intermediate";
    return "Advanced";
  };
  const filtered = levelFilter === "All" ? COURSE_CATALOG : COURSE_CATALOG.filter((c) => levelOf(c) === levelFilter);

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Courses" subtitle="Structured paths to build your fluency" />

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {levels.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            className={cx(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors",
              levelFilter === lvl ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft, t.hover)
            )}
          >
            {lvl}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((course) => {
          const courseState = getCourseState(progress, course.id);
          const pct = computeCourseProgress(course, courseState);
          return (
            <Card key={course.id}>
              <p className={cx("text-sm font-semibold mb-1", t.text)}>{course.title}</p>
              <p className={cx("text-xs mb-2", t.textSoft)}><UIText text={course.description}/></p>
              <div className="flex items-center gap-2 mb-3">
                <Badge tone="slate">{course.levelRange}</Badge>
                <span className={cx("text-xs", t.textFaint)}>{course.modules.length}<UIText text={"modules"}/> </span>
              </div>
              <ProgressBar value={pct} colorClass={pct === 100 ? "bg-emerald-600" : "bg-teal-600"} />
              <div className="flex items-center justify-between mt-3">
                <span className={cx("text-xs", t.textSoft)}>{pct}<UIText text={"% complete"}/> </span>
                <button
                  onClick={() => openCourse(course.id)}
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1"
                >
                  {pct === 0 ? "Start" : pct === 100 ? "Review" : "Continue"} <ChevronRight size={12} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Practice Center                                                        */
/* ---------------------------------------------------------------------- */

const practiceHistoryKey = (email) => `practice_history:${email.trim().toLowerCase()}`;
const presentationProgressKey = (email) => `presentation_progress:${email.trim().toLowerCase()}`;

async function logPracticeSession(email, entry) {
  const list = await loadList(practiceHistoryKey(email));
  const next = [{ id: genId(), date: new Date().toISOString(), ...entry }, ...list].slice(0, 50);
  await saveList(practiceHistoryKey(email), next);

  // Derive XP from whatever this session actually reported — turns, a
  // graded score, or just a flat completion reward when neither applies.
  const minutes = entry.durationSeconds ? Math.round(entry.durationSeconds / 60) : 0;
  let xp = ACTIVITY_XP.practice_session;
  if (typeof entry.turns === "number") {
    const perTurn = entry.modeId === "aicall" ? ACTIVITY_XP.ai_call : ACTIVITY_XP.tutor_session;
    xp = Math.min(60, entry.turns * perTurn) || ACTIVITY_XP.practice_session;
  }
  if (typeof entry.score === "number") {
    xp = Math.round(ACTIVITY_XP.practice_session + entry.score * 20);
  }
  const type = entry.modeId === "aicall" ? "ai_call" : "practice_session";
  await awardActivity(email, { type, xp, minutes, meta: { modeId: entry.modeId, modeTitle: entry.modeTitle } });

  return next;
}

/* ----- System prompt builders for each chat-based mode ----- */

function practiceBaseRules(profile) {
  const cefr = profile?.assessment?.overallLevel || profile?.englishLevel || "B1";
  return `The learner's CEFR level is ${cefr} — adapt your vocabulary and sentence complexity to that level.
Keep replies short and mobile-friendly (a few sentences).
Ask ONE main question or prompt at a time, then wait for the learner's reply.
Do not overcorrect during fluency practice — let minor, understandable slips pass.
When a mistake is important or repeats, correct it using exactly this format:

You said:
...

Correct:
...

More natural:
...

Why:
...

Try again:
...`;
}

function buildFreeTalkPrompt(profile) {
  const interests = (profile?.interests || []).join(", ") || "everyday life";
  return `You are Cadence's AI conversation partner for open Free Talk practice. Have a natural, friendly conversation with the learner about topics they enjoy (${interests}). ${practiceBaseRules(profile)}`;
}

function buildRoleplayPrompt(profile, scenario) {
  return `You are roleplaying as a person ${scenario.setting}. Stay fully in character and respond the way a real person in that situation would — do not break character to explain grammar unless the learner is clearly stuck. ${practiceBaseRules(profile)}
Scenario: ${scenario.title}.`;
}

function buildInterviewPrompt(profile) {
  const field = profile?.professionalField || "their field";
  return `You are an interviewer conducting a realistic mock job interview for a role in ${field}. Ask ONE interview question at a time, wait for the answer, give brief constructive feedback on content and delivery, then ask the next question. ${practiceBaseRules(profile)}`;
}

function buildMeetingPrompt(profile) {
  return `You are a colleague in a work meeting roleplay. Your goal is to give the learner chances to practice four specific functions across the conversation: agreeing, disagreeing (politely), asking for clarification, and contributing to discussion. Raise a topic, react to what they say, and occasionally push back gently so they must disagree or clarify. ${practiceBaseRules(profile)}`;
}

function buildPresentationPrompt(profile, stage) {
  const stageGuides = {
    opening: "Coach them on hooking an audience and clearly stating the presentation's purpose in the first 30 seconds.",
    transitions: "Coach them on smoothly linking one point to the next using natural transition phrases.",
    results: "Coach them on presenting data/findings clearly and confidently.",
    conclusion: "Coach them on summarizing key points and ending with a memorable, clear takeaway.",
    qa: "Roleplay as an audience member asking a challenging follow-up question, then coach their answer.",
  };
  return `You are a presentation coach helping the learner practice the "${stage.title}" part of a presentation. ${stageGuides[stage.id]} Ask them to try it, then give brief specific feedback. ${practiceBaseRules(profile)}`;
}

function buildToughQuestionsPrompt(profile) {
  return `You ask challenging, opinion-based questions one at a time (e.g. about ethics, trade-offs, or hypotheticals) to push the learner's fluency and reasoning in English. After their answer, briefly react and ask a natural follow-up or a new tough question. ${practiceBaseRules(profile)}`;
}

function buildMissionPrompt(profile, mission) {
  return `You are roleplaying as ${mission.roleDesc} for a real-world task simulation. The learner's mission: ${mission.goal}
Stay in character, respond naturally to what they say, and don't reveal you're grading them. If they achieve the goal, acknowledge it naturally in character. ${practiceBaseRules(profile)}`;
}

function practiceGreeting(kind, profile, extra) {
  const name = profile?.name || "there";
  if (kind === "roleplay") return `(In character as ${extra?.title}) Hi! Let's begin — go ahead whenever you're ready.`;
  if (kind === "interview") return `Hi ${name}, thanks for coming in today. Let's start with: tell me a little about yourself.`;
  if (kind === "meeting") return `Hi ${name}, thanks for joining. I wanted to kick off by getting your take on our current plan — what do you think?`;
  if (kind === "presentation") return `Let's practice your ${extra?.title}. Whenever you're ready, give it a try and I'll give you feedback.`;
  if (kind === "tough") return `Alright ${name}, here's one to think about: do you think technology has made people more or less connected? Why?`;
  if (kind === "mission") return `(In character as ${extra?.roleDesc}) Hi, how can I help you today?`;
  return `Hi ${name}! What would you like to talk about?`;
}

/* ----- Generic chat runner shared by every conversation-based mode ----- */

function PracticeChatRunner({ modeId, modeTitle, sessionSuffix, system, greeting, extraContext, onExit }) {
  const t = useThemeClasses();
  const { currentUser } = useAuth();

  const [providerStatus, setProviderStatus] = useState("checking");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedText, setLastFailedText] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [savedCorrections, setSavedCorrections] = useState({});
  const [vocabPrefill, setVocabPrefill] = useState(null);
  const endRef = useRef(null);
  const sessionStartRef = useRef(Date.now());

  const storageKey = currentUser ? `practice_active:${modeId}${sessionSuffix ? "_" + sessionSuffix : ""}:${currentUser.email}` : null;

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const raw = await safeGet(storageKey);
      if (raw) {
        try {
          setMessages(JSON.parse(raw).messages || []);
        } catch (e) { /* ignore */ }
      } else {
        const first = { role: "assistant", content: greeting, ts: Date.now() };
        setMessages([first]);
        await safeSet(storageKey, JSON.stringify({ messages: [first], startedAt: new Date().toISOString() }));
      }
      setLoaded(true);
      const ok = await checkProviderAvailable();
      setProviderStatus(ok ? "ready" : "unavailable");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email, modeId, sessionSuffix]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const persist = (msgs) => storageKey && safeSet(storageKey, JSON.stringify({ messages: msgs, startedAt: new Date().toISOString() }));

  const retryConnection = async () => {
    setProviderStatus("checking");
    const ok = await checkProviderAvailable();
    setProviderStatus(ok ? "ready" : "unavailable");
  };

  const sendMessage = async (text) => {
    const userMsg = { role: "user", content: text, ts: Date.now() };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    persist(withUser);
    setSending(true);
    setError("");
    setLastFailedText(null);
    try {
      const provider = getActiveProvider();
      if (!provider) throw new Error("No AI provider configured");
      const apiMessages = withUser.map((m) => ({ role: m.role, content: m.content }));
      const reply = await provider.send({ system, messages: apiMessages, maxTokens: 450 });
      const assistantMsg = { role: "assistant", content: reply, ts: Date.now() };
      const withReply = [...withUser, assistantMsg];
      setMessages(withReply);
      persist(withReply);
    } catch (e) {
      setError("That message couldn't be sent — the AI connection may have dropped.");
      setLastFailedText(text);
      setProviderStatus("unavailable");
    } finally {
      setSending(false);
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    sendMessage(text);
  };

  const retryLastMessage = () => {
    if (!lastFailedText) return;
    const text = lastFailedText;
    setLastFailedText(null);
    setError("");
    sendMessage(text);
  };

  const saveCorrectionToBank = async (index, correction) => {
    if (!currentUser || savedCorrections[index]) return;
    const list = await loadList(errorsKey(currentUser.email));
    const category = guessErrorCategory(correction.original, correction.correct, correction.explanation);
    const next = addErrorEntry(list, { ...correction, category });
    await saveList(errorsKey(currentUser.email), next);
    setSavedCorrections((s) => ({ ...s, [index]: true }));
  };

  const saveVocabFromPractice = async (fields) => {
    if (!currentUser) return;
    const list = await loadList(vocabKey(currentUser.email));
    const entry = defaultVocabEntry({
      ...fields,
      collocations: typeof fields.collocations === "string" ? fields.collocations.split(",").map((c) => c.trim()).filter(Boolean) : fields.collocations,
    });
    await saveList(vocabKey(currentUser.email), [entry, ...list]);
    setVocabPrefill(null);
  };

  const endSession = async () => {
    if (currentUser) {
      const turns = messages.filter((m) => m.role === "user").length;
      const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      await logPracticeSession(currentUser.email, { modeId, modeTitle, turns, durationSeconds, ...extraContext });
    }
    onExit();
  };

  if (providerStatus === "unavailable") {
    return <PracticeConfigState title={modeTitle} onRetry={retryConnection} onBack={onExit} checking={false} />;
  }
  if (!loaded || providerStatus === "checking") {
    return <PracticeConfigState title={modeTitle} onRetry={retryConnection} onBack={onExit} checking />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] pb-2">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onExit} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
          <ArrowLeft size={14} /> {modeTitle}
        </button>
        <button
          onClick={endSession}
          className={cx("h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold border shrink-0", t.border, t.hover, t.text)}
        >
          <Check size={13} /><UIText text={"End session"}/> </button>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden" padded={false}>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, i) => (
            <TutorMessageBubble
              key={i}
              message={m}
              index={i}
              savedCorrection={!!savedCorrections[i]}
              onSaveCorrection={saveCorrectionToBank}
              onSaveWord={(content) => setVocabPrefill(content)}
            />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className={cx("rounded-2xl rounded-bl-sm px-4 py-2.5", t.surfaceAlt)}>
                <div className="flex gap-1">
                  <span className={cx("h-1.5 w-1.5 rounded-full animate-bounce", t.textFaint)} style={{ animationDelay: "0ms" }} />
                  <span className={cx("h-1.5 w-1.5 rounded-full animate-bounce", t.textFaint)} style={{ animationDelay: "120ms" }} />
                  <span className={cx("h-1.5 w-1.5 rounded-full animate-bounce", t.textFaint)} style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span>{error}</span>
              {lastFailedText && <button onClick={retryLastMessage} className="font-semibold underline shrink-0"><UIText text={"Retry"}/></button>}
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className={cx("border-t p-3 flex items-center gap-2", t.border)}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            disabled={sending}
            className={cx("flex-1 rounded-xl px-4 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-60", t.surfaceAlt, t.border, t.text)}
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="h-10 w-10 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </Card>
      {vocabPrefill !== null && (
        <AddVocabModal onClose={() => setVocabPrefill(null)} onSave={saveVocabFromPractice} showKurdish={false} initialExample={vocabPrefill} />
      )}
    </div>
  );
}

function PracticeConfigState({ title, onRetry, onBack, checking }) {
  const t = useThemeClasses();
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] pb-2">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold mb-4", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Practice"}/>
      </button>
      <Card className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <div className={cx("h-12 w-12 rounded-2xl flex items-center justify-center", t.surfaceAlt)}>
          <MessageCircle size={20} className={t.textFaint} />
        </div>
        <Badge tone="amber"><UIText text={"Demo / Configuration"}/> </Badge>
        <p className={cx("text-sm font-semibold max-w-xs", t.text)}>{title}<UIText text={"isn't connected"}/> </p>
        <p className={cx("text-xs max-w-xs", t.textSoft)}><UIText text={"No AI provider credential is currently reachable, so this mode can't have a real conversation right now. Nothing here is a simulated reply."}/> </p>
        <SecondaryButton icon={checking ? Loader2 : RotateCcw} onClick={onRetry}>
          {checking ? "Checking…" : "Retry connection"}
        </SecondaryButton>
      </Card>
    </div>
  );
}

/* ----- Roleplay scenario picker ----- */

function RoleplayPicker({ onSelect, onBack }) {
  const t = useThemeClasses();
  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Practice"}/>
      </button>
      <PageHeader title="Roleplay" subtitle="Pick a scenario to practice" />
      <div className="grid grid-cols-2 gap-3">
        {ROLEPLAY_SCENARIOS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => onSelect(s)} className="text-start">
              <Card className="flex flex-col gap-2">
                <div className={cx("h-9 w-9 rounded-lg flex items-center justify-center", "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
                  <Icon size={17} />
                </div>
                <p className={cx("text-sm font-semibold", t.text)}>{s.title}</p>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----- Mission picker ----- */

function MissionPicker({ onSelect, onBack }) {
  const t = useThemeClasses();
  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Practice"}/>
      </button>
      <PageHeader title="Real-World Mission" subtitle="Complete a realistic everyday task" />
      <div className="space-y-3">
        {MISSION_SCENARIOS.map((m) => (
          <button key={m.id} onClick={() => onSelect(m)} className="w-full text-start">
            <Card>
              <p className={cx("text-sm font-semibold mb-1", t.text)}>{m.title}</p>
              <p className={cx("text-xs", t.textSoft)}>{m.goal}</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ----- Presentation coach: stage picker + runner ----- */

function PresentationCoach({ onBack }) {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const [completed, setCompleted] = useState([]);
  const [activeStage, setActiveStage] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setCompleted(await loadList(presentationProgressKey(currentUser.email)));
      setLoaded(true);
    })();
  }, [currentUser?.email]);

  const markComplete = async (stageId) => {
    if (!currentUser || completed.includes(stageId)) return;
    const next = [...completed, stageId];
    setCompleted(next);
    await saveList(presentationProgressKey(currentUser.email), next);
  };

  if (activeStage) {
    return (
      <PracticeChatRunner
        modeId="presentation"
        modeTitle={`Presentation · ${activeStage.title}`}
        sessionSuffix={activeStage.id}
        system={buildPresentationPrompt(profile, activeStage)}
        greeting={practiceGreeting("presentation", profile, activeStage)}
        extraContext={{ stage: activeStage.id }}
        onExit={() => { markComplete(activeStage.id); setActiveStage(null); }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Practice"}/>
      </button>
      <PageHeader title="Presentation Coach" subtitle="Opening, transitions, results, conclusion & Q&A" />
      <div className="space-y-3">
        {loaded && PRESENTATION_STAGES.map((stage) => {
          const done = completed.includes(stage.id);
          return (
            <button key={stage.id} onClick={() => setActiveStage(stage)} className="w-full text-start">
              <Card className="flex items-center gap-3">
                <div className={cx("h-9 w-9 rounded-full flex items-center justify-center shrink-0", done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : t.surfaceAlt)}>
                  {done ? <Check size={15} /> : <BarChart3 size={15} className={t.textFaint} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cx("text-sm font-medium", t.text)}>{stage.title}</p>
                  <p className={cx("text-xs", t.textFaint)}>{stage.desc}</p>
                </div>
                <ChevronRight size={15} className={t.textFaint} />
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----- Grammar Practice ----- */

function GrammarPracticeSession({ onBack, onFinish }) {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const roadmap = useMemo(() => buildRoadmap(profile), [profile]);
  const [items] = useState(() => {
    const levelIndex = roadmap?.overallIndex ?? 2;
    const pool = ASSESSMENT_BANK.filter((q) => q.skill === "grammar");
    const sorted = [...pool].sort((a, b) => Math.abs(a.level - levelIndex) - Math.abs(b.level - levelIndex));
    return sorted.slice(0, 5);
  });
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState("prompt");
  const [score, setScore] = useState(0);
  const [tally, setTally] = useState([]);
  const current = items[idx];
  const sessionStartRef = useRef(Date.now());

  const submit = () => {
    if (!answer.trim()) return;
    const s = gradeAssessmentAnswer(current, answer);
    setScore(s);
    setTally((tl) => [...tl, s]);
    setPhase("feedback");
    if (currentUser && s < 0.5) {
      loadList(errorsKey(currentUser.email)).then((list) => {
        const next = addErrorEntry(list, { original: answer, correct: current.accepted?.[0] || "", category: "Grammar" });
        saveList(errorsKey(currentUser.email), next);
      });
    }
  };

  const next = async () => {
    setAnswer("");
    setPhase("prompt");
    if (idx + 1 >= items.length) {
      if (currentUser) {
        const avg = [...tally].reduce((a, b) => a + b, 0) / tally.length;
        const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
        await logPracticeSession(currentUser.email, { modeId: "grammarpractice", modeTitle: "Grammar Practice", score: avg, durationSeconds });
      }
      onFinish();
    } else {
      setIdx(idx + 1);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Practice"}/>
      </button>
      <PageHeader title="Grammar Practice" subtitle={`Question ${idx + 1} of ${items.length}`} />
      <Card>
        <p className={cx("text-sm font-medium mb-4", t.text)}>{current.prompt}</p>
        {phase === "prompt" && <TaskInput item={current} value={answer} onChange={setAnswer} onSubmit={submit} />}
        {phase === "feedback" && (
          <div className="space-y-3">
            <TaskFeedback score={score} continueLabel={idx + 1 >= items.length ? "Finish" : "Next"} onContinue={next} />
            {score < 0.7 && current.accepted && (
              <p className={cx("text-xs rounded-xl px-3.5 py-2.5", t.surfaceAlt, t.textSoft)}><UIText text={"Correct answer:"}/> <span className={t.text}>{current.accepted[0]}</span></p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ----- Writing Coach ----- */

function WritingCoachFeedback({ text }) {
  const t = useThemeClasses();
  const grab = (label, stopLabels) => {
    const stopPattern = stopLabels.map((s) => `${s}:`).join("|");
    const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?:\\n\\s*(?:${stopPattern})|$)`, "i");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };
  const corrected = grab("Corrected", ["More natural", "More professional", "Important lessons"]);
  const natural = grab("More natural", ["Important lessons"]) || grab("More professional", ["Important lessons"]);
  const lessons = grab("Important lessons", []);

  if (!corrected && !natural && !lessons) {
    return <p className={cx("text-sm whitespace-pre-line", t.text)}>{text}</p>;
  }
  return (
    <div className="space-y-3">
      {corrected && (
        <div className={cx("rounded-xl px-3.5 py-2.5", t.surfaceAlt)}>
          <p className={cx("text-xs font-semibold uppercase tracking-wide mb-1", t.textFaint)}><UIText text={"Corrected"}/> </p>
          <p className={cx("text-sm whitespace-pre-line", t.text)}>{corrected}</p>
        </div>
      )}
      {natural && (
        <div className={cx("rounded-xl px-3.5 py-2.5", t.surfaceAlt)}>
          <p className={cx("text-xs font-semibold uppercase tracking-wide mb-1", t.textFaint)}><UIText text={"More natural / professional"}/> </p>
          <p className={cx("text-sm whitespace-pre-line", t.text)}>{natural}</p>
        </div>
      )}
      {lessons && (
        <div className={cx("rounded-xl px-3.5 py-2.5", t.surfaceAlt)}>
          <p className={cx("text-xs font-semibold uppercase tracking-wide mb-1", t.textFaint)}><UIText text={"Important lessons"}/> </p>
          <p className={cx("text-sm whitespace-pre-line", t.text)}>{lessons}</p>
        </div>
      )}
    </div>
  );
}

function WritingCoachSession({ onBack }) {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const [providerStatus, setProviderStatus] = useState("checking");
  const [original, setOriginal] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => setProviderStatus((await checkProviderAvailable()) ? "ready" : "unavailable"))();
  }, []);

  const retry = async () => {
    setProviderStatus("checking");
    setProviderStatus((await checkProviderAvailable()) ? "ready" : "unavailable");
  };

  const submit = async () => {
    if (!original.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const provider = getActiveProvider();
      if (!provider) throw new Error("No provider");
      const cefr = profile?.assessment?.overallLevel || profile?.englishLevel || "B1";
      const system = `You are a writing coach for a ${cefr}-level English learner. Review their writing and respond in EXACTLY this format, with nothing before or after it:

Corrected:
(the text with grammar/spelling errors fixed, preserving their meaning)

More natural/professional:
(a more natural or professional rewrite of the same text)

Important lessons:
(1-2 concise, high-value lessons from their mistakes — skip minor nitpicks)`;
      const reply = await provider.send({ system, messages: [{ role: "user", content: original }], maxTokens: 500 });
      setFeedback(reply);
      if (currentUser) await logPracticeSession(currentUser.email, { modeId: "writingcoach", modeTitle: "Writing Coach" });
    } catch (e) {
      setError("Couldn't get feedback — the AI connection may have dropped.");
      setProviderStatus("unavailable");
    } finally {
      setSending(false);
    }
  };

  if (providerStatus === "unavailable") {
    return <PracticeConfigState title="Writing Coach" onRetry={retry} onBack={onBack} checking={false} />;
  }
  if (providerStatus === "checking") {
    return <PracticeConfigState title="Writing Coach" onRetry={retry} onBack={onBack} checking />;
  }

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Practice"}/>
      </button>
      <PageHeader title="Writing Coach" subtitle="Paste or write a short passage for structured feedback" />
      <Card className="space-y-3">
        <p className={cx("text-xs font-semibold uppercase tracking-wide", t.textFaint)}><UIText text={"Original"}/></p>
        <textarea
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
          rows={6}
          placeholder="Write a few sentences or a short paragraph…"
          className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none", t.surfaceAlt, t.border, t.text)}
        />
        {error && <div className="rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium px-3.5 py-2.5">{error}</div>}
        <PrimaryButton full icon={sending ? Loader2 : ArrowRight} onClick={submit} className={sending ? "opacity-70 pointer-events-none" : ""}>
          {sending ? "Reviewing…" : "Get feedback"}
        </PrimaryButton>
      </Card>
      {feedback && (
        <Card>
          <p className={cx("text-xs font-semibold uppercase tracking-wide mb-3", t.textFaint)}><UIText text={"Feedback"}/> </p>
          <WritingCoachFeedback text={feedback} />
        </Card>
      )}
    </div>
  );
}

/* ----- Reading Practice ----- */

function ReadingPracticeSession({ onBack, onFinish }) {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const roadmap = useMemo(() => buildRoadmap(profile), [profile]);
  const [passage] = useState(() => {
    const levelIndex = roadmap?.overallIndex ?? 2;
    const sorted = [...READING_PASSAGES].sort((a, b) => Math.abs(a.level - levelIndex) - Math.abs(b.level - levelIndex));
    return sorted[0];
  });
  const TASKS = ["Main idea", "Details", "Inference", "Vocabulary in context", "Summary"];
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState("prompt");
  const [score, setScore] = useState(0);
  const [tally, setTally] = useState([]);

  const taskFor = (i) => {
    if (i === 0) return { kind: "mcq", ...passage.mainIdea };
    if (i === 1) return { kind: "short", ...passage.detail };
    if (i === 2) return { kind: "short", ...passage.inference };
    if (i === 3) return { kind: "mcq", ...passage.vocab };
    return { kind: "long", prompt: "Summarize the passage in your own words.", minWords: passage.summaryMinWords };
  };
  const task = taskFor(idx);

  const grade = (val) => {
    if (task.kind === "mcq") return val === task.answer ? 1 : 0;
    if (task.kind === "short") {
      const norm = (val || "").toLowerCase();
      return task.accepted.some((a) => norm.includes(a.toLowerCase())) ? 1 : 0.3;
    }
    return gradeAssessmentAnswer({ type: "long", minWords: task.minWords }, val);
  };

  const submit = (val) => {
    const v = val !== undefined ? val : answer;
    if (task.kind !== "mcq" && !v.trim()) return;
    const s = grade(v);
    setScore(s);
    setTally((tl) => [...tl, s]);
    setPhase("feedback");
  };

  const next = async () => {
    setAnswer("");
    setPhase("prompt");
    if (idx + 1 >= TASKS.length) {
      if (currentUser) {
        const avg = [...tally].reduce((a, b) => a + b, 0) / tally.length;
        await logPracticeSession(currentUser.email, { modeId: "readingpractice", modeTitle: "Reading Practice", score: avg });
      }
      onFinish();
    } else {
      setIdx(idx + 1);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Practice"}/>
      </button>
      <PageHeader title="Reading Practice" subtitle={`${TASKS[idx]} · ${idx + 1} of ${TASKS.length}`} />
      <Card>
        <p className={cx("text-sm leading-relaxed mb-4 pb-4 border-b", t.text, t.border)}>{passage.passage}</p>
        <p className={cx("text-sm font-medium mb-4", t.text)}>{task.prompt}</p>

        {phase === "prompt" && task.kind === "mcq" && (
          <div className="space-y-2">
            {task.options.map((opt) => (
              <button key={opt} onClick={() => submit(opt)} className={cx("w-full text-start px-4 py-3 rounded-xl border text-sm font-medium", t.border, t.text, t.hover)}>
                {opt}
              </button>
            ))}
          </div>
        )}
        {phase === "prompt" && task.kind !== "mcq" && (
          <TaskInput item={task.kind === "long" ? { type: "long" } : { type: "short" }} value={answer} onChange={setAnswer} onSubmit={() => submit()} />
        )}
        {phase === "feedback" && (
          <TaskFeedback score={score} continueLabel={idx + 1 >= TASKS.length ? "Finish" : "Next"} onContinue={next} />
        )}
      </Card>
    </div>
  );
}

/* ----- Fast Speak ----- */

function FastSpeakSession({ onBack, onFinish }) {
  const t = useThemeClasses();
  const { currentUser } = useAuth();
  const [prompts] = useState(() => [...FASTSPEAK_PROMPTS].sort(() => Math.random() - 0.5).slice(0, 5));
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [seconds, setSeconds] = useState(20);
  const [phase, setPhase] = useState("answering");
  const [tally, setTally] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== "answering") return;
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase]);

  const submit = () => {
    clearInterval(timerRef.current);
    const s = gradeAssessmentAnswer({ type: "long", minWords: 5 }, answer);
    setTally((tl) => [...tl, s]);
    setPhase("feedback");
  };

  const next = async () => {
    setAnswer("");
    setSeconds(20);
    setPhase("answering");
    if (idx + 1 >= prompts.length) {
      if (currentUser) {
        const avg = tally.reduce((a, b) => a + b, 0) / tally.length;
        await logPracticeSession(currentUser.email, { modeId: "fastspeak", modeTitle: "Fast Speak", score: avg });
      }
      onFinish();
    } else {
      setIdx(idx + 1);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <button onClick={onBack} className={cx("inline-flex items-center gap-1.5 text-xs font-semibold", t.textSoft)}>
        <ArrowLeft size={14} /> <UIText text={"Practice"}/>
      </button>
      <PageHeader title="Fast Speak" subtitle={`Round ${idx + 1} of ${prompts.length}`} />
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className={cx("text-sm font-medium", t.text)}>{prompts[idx]}</p>
          {phase === "answering" && (
            <span className={cx("text-sm font-bold tabular-nums shrink-0 ml-3", seconds <= 5 ? "text-rose-500" : t.textSoft)}>{seconds}<UIText text={"s"}/> </span>
          )}
        </div>
        {phase === "answering" && (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              placeholder="Type quickly…"
              className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none", t.surfaceAlt, t.border, t.text)}
            />
            <PrimaryButton full className="mt-3" onClick={submit}><UIText text={"Submit"}/></PrimaryButton>
          </>
        )}
        {phase === "feedback" && (
          <TaskFeedback score={tally[tally.length - 1]} continueLabel={idx + 1 >= prompts.length ? "Finish" : "Next round"} onContinue={next} />
        )}
      </Card>
    </div>
  );
}


function PracticePage() {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const [active, setActiveMode] = useState(null); // mode object or null (grid)
  const [subScreen, setSubScreen] = useState(null); // for roleplay/mission: chosen scenario
  const [doneFlash, setDoneFlash] = useState(null);

  const closeMode = () => {
    setActiveMode(null);
    setSubScreen(null);
  };

  const finishWithFlash = (label) => {
    closeMode();
    setDoneFlash(label);
    setTimeout(() => setDoneFlash(null), 2500);
  };

  if (active) {
    const kind = active.kind;

    if (kind === "roleplay") {
      if (!subScreen) return <RoleplayPicker onSelect={setSubScreen} onBack={closeMode} />;
      return (
        <PracticeChatRunner
          modeId="roleplay"
          modeTitle={`Roleplay · ${subScreen.title}`}
          sessionSuffix={subScreen.id}
          system={buildRoleplayPrompt(profile, subScreen)}
          greeting={practiceGreeting("roleplay", profile, subScreen)}
          extraContext={{ scenario: subScreen.id }}
          onExit={() => finishWithFlash(`Roleplay · ${subScreen.title} saved to your learning history.`)}
        />
      );
    }

    if (kind === "mission") {
      if (!subScreen) return <MissionPicker onSelect={setSubScreen} onBack={closeMode} />;
      return (
        <PracticeChatRunner
          modeId="mission"
          modeTitle={`Mission · ${subScreen.title}`}
          sessionSuffix={subScreen.id}
          system={buildMissionPrompt(profile, subScreen)}
          greeting={practiceGreeting("mission", profile, subScreen)}
          extraContext={{ mission: subScreen.id }}
          onExit={() => finishWithFlash(`Mission · ${subScreen.title} saved to your learning history.`)}
        />
      );
    }

    if (kind === "presentation") {
      return <PresentationCoach onBack={closeMode} />;
    }

    if (kind === "chat") {
      const builders = {
        freetalk: buildFreeTalkPrompt,
        interview: buildInterviewPrompt,
        meeting: buildMeetingPrompt,
        tough: buildToughQuestionsPrompt,
      };
      return (
        <PracticeChatRunner
          modeId={active.id}
          modeTitle={active.title}
          system={builders[active.id](profile)}
          greeting={practiceGreeting(active.id, profile)}
          onExit={() => finishWithFlash(`${active.title} saved to your learning history.`)}
        />
      );
    }

    if (kind === "grammar") {
      return <GrammarPracticeSession onBack={closeMode} onFinish={() => finishWithFlash("Grammar Practice saved to your learning history.")} />;
    }
    if (kind === "writing") {
      return <WritingCoachSession onBack={closeMode} />;
    }
    if (kind === "reading") {
      return <ReadingPracticeSession onBack={closeMode} onFinish={() => finishWithFlash("Reading Practice saved to your learning history.")} />;
    }
    if (kind === "fastspeak") {
      return <FastSpeakSession onBack={closeMode} onFinish={() => finishWithFlash("Fast Speak saved to your learning history.")} />;
    }
    if (kind === "vocabulary") {
      return (
        <VocabularyPracticeLauncher
          onBack={closeMode}
          onFinish={() => finishWithFlash("Vocabulary Practice saved to your learning history.")}
        />
      );
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Practice" subtitle="Short, focused drills for every skill" />
      {doneFlash && (
        <Card className="flex items-center justify-between">
          <p className={cx("text-sm", t.text)}>{doneFlash}</p>
          <button onClick={() => setDoneFlash(null)} className={t.textFaint}><X size={14} /></button>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {PRACTICE_MODES.map((mode) => {
          const Icon = mode.icon;
          const accentClasses =
            mode.accent === "teal"
              ? "text-teal-600 dark:text-teal-400 bg-teal-600/10"
              : "text-amber-600 dark:text-amber-400 bg-amber-500/10";
          return (
            <button key={mode.id} onClick={() => { setActiveMode(mode); setSubScreen(null); }} className="text-start">
              <Card className="flex items-center gap-4">
                <div className={cx("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", accentClasses)}>
                  <Icon size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cx("text-sm font-semibold", t.text)}>{mode.title}</p>
                  <p className={cx("text-xs", t.textSoft)}>{mode.desc}</p>
                </div>
                <ChevronRight size={16} className={t.textFaint} />
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VocabularyPracticeLauncher({ onBack, onFinish }) {
  const { currentUser } = useAuth();
  const [words, setWords] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const list = await loadList(vocabKey(currentUser.email));
      const due = list.filter(isDue);
      setWords(due.length ? due : list);
    })();
  }, [currentUser?.email]);

  const updateWord = (updated) => {
    if (!currentUser) return;
    loadList(vocabKey(currentUser.email)).then((list) => {
      const next = list.map((w) => (w.id === updated.id ? updated : w));
      saveList(vocabKey(currentUser.email), next);
    });
  };

  if (words === null) return null;
  if (words.length === 0) {
    return (
      <div className="space-y-6 pb-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <ArrowLeft size={14} /> <UIText text={"Practice"}/>
        </button>
        <PageHeader title="Vocabulary Practice" subtitle="No words saved yet" />
        <Card>
          <p className="text-sm"><UIText text={"Save words from a Tutor or Practice conversation, or add one from the Vocabulary tab, then come back to review them here."}/> </p>
        </Card>
      </div>
    );
  }

  return <VocabularyReviewSession words={words} onUpdateWord={updateWord} onFinish={onFinish} />;
}



/* ----- Add / edit modals (shared shell pattern with MoreSheet) ----- */

function SheetModal({ title, onClose, children }) {
  const t = useThemeClasses();
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cx("absolute bottom-0 inset-x-0 md:inset-x-auto md:right-6 md:bottom-6 md:w-[420px] rounded-t-3xl md:rounded-2xl border-t md:border p-5 pb-8 md:pb-5 max-h-[85vh] overflow-y-auto", t.surface, t.border)}>
        <div className="flex items-center justify-between mb-4">
          <span className={cx("text-sm font-semibold", t.text)} style={{ fontFamily: "var(--font-display)" }}>{title}</span>
          <button onClick={onClose} className={cx("h-8 w-8 rounded-full flex items-center justify-center", t.hover)} aria-label="Close">
            <X size={16} className={t.textSoft} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddVocabModal({ onClose, onSave, showKurdish, initialExample }) {
  const [form, setForm] = useState({
    word: "", meaning: "", ipa: "", partOfSpeech: "", example: initialExample || "",
    naturalExample: "", collocations: "", kurdishMeaning: "", cefr: "B1",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    if (!form.word.trim() || !form.meaning.trim()) return;
    onSave({
      ...form,
      collocations: form.collocations.split(",").map((c) => c.trim()).filter(Boolean),
    });
  };

  return (
    <SheetModal title="Add word" onClose={onClose}>
      <div className="space-y-3">
        <div><FieldLabel><UIText text={"Word / phrase"}/> </FieldLabel><TextInput value={form.word} onChange={(v) => setForm((f) => ({ ...f, word: v }))} placeholder="e.g. reluctant" /></div>
        <div><FieldLabel><UIText text={"Meaning"}/></FieldLabel><TextInput value={form.meaning} onChange={(v) => setForm((f) => ({ ...f, meaning: v }))} placeholder="Unwilling and hesitant" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>IPA</FieldLabel><TextInput value={form.ipa} onChange={(v) => setForm((f) => ({ ...f, ipa: v }))} placeholder="/rɪˈlʌktənt/" /></div>
          <div><FieldLabel><UIText text={"Part of speech"}/> </FieldLabel><TextInput value={form.partOfSpeech} onChange={(v) => setForm((f) => ({ ...f, partOfSpeech: v }))} placeholder="adjective" /></div>
        </div>
        <div><FieldLabel><UIText text={"Example"}/></FieldLabel><TextInput value={form.example} onChange={(v) => setForm((f) => ({ ...f, example: v }))} placeholder="He was reluctant to leave." /></div>
        <div><FieldLabel><UIText text={"Natural example"}/> </FieldLabel><TextInput value={form.naturalExample} onChange={(v) => setForm((f) => ({ ...f, naturalExample: v }))} placeholder="He didn't really want to leave." /></div>
        <div><FieldLabel><UIText text={"Collocations (comma separated)"}/> </FieldLabel><TextInput value={form.collocations} onChange={(v) => setForm((f) => ({ ...f, collocations: v }))} placeholder="reluctant to, reluctantly agree" /></div>
        {showKurdish && (
          <div><FieldLabel><UIText text={"Kurdish meaning (optional)"}/> </FieldLabel><TextInput value={form.kurdishMeaning} onChange={(v) => setForm((f) => ({ ...f, kurdishMeaning: v }))} placeholder="..." /></div>
        )}
        <div><FieldLabel>CEFR</FieldLabel><SelectPills value={form.cefr} options={ENGLISH_LEVELS} onChange={(v) => setForm((f) => ({ ...f, cefr: v }))} /></div>
        <PrimaryButton full icon={Check} onClick={save}><UIText text={"Save word"}/> </PrimaryButton>
      </div>
    </SheetModal>
  );
}

function AddErrorModal({ onClose, onSave }) {
  const [form, setForm] = useState({ original: "", correct: "", natural: "", explanation: "", category: "Grammar" });
  const save = () => {
    if (!form.original.trim() || !form.correct.trim()) return;
    onSave(form);
  };
  return (
    <SheetModal title="Log a mistake" onClose={onClose}>
      <div className="space-y-3">
        <div><FieldLabel><UIText text={"Original (what you said)"}/> </FieldLabel><TextInput value={form.original} onChange={(v) => setForm((f) => ({ ...f, original: v }))} placeholder="I have went there" /></div>
        <div><FieldLabel><UIText text={"Correct version"}/> </FieldLabel><TextInput value={form.correct} onChange={(v) => setForm((f) => ({ ...f, correct: v }))} placeholder="I have gone there" /></div>
        <div><FieldLabel><UIText text={"More natural (optional)"}/> </FieldLabel><TextInput value={form.natural} onChange={(v) => setForm((f) => ({ ...f, natural: v }))} placeholder="I went there" /></div>
        <div><FieldLabel><UIText text={"Why (optional)"}/> </FieldLabel><TextInput value={form.explanation} onChange={(v) => setForm((f) => ({ ...f, explanation: v }))} placeholder="Past participle after 'have'" /></div>
        <div><FieldLabel><UIText text={"Category"}/></FieldLabel><SelectPills value={form.category} options={ERROR_CATEGORIES} onChange={(v) => setForm((f) => ({ ...f, category: v }))} /></div>
        <PrimaryButton full icon={Check} onClick={save}><UIText text={"Save to Error Bank"}/> </PrimaryButton>
      </div>
    </SheetModal>
  );
}

/* ----- Vocabulary review session ----- */

function buildReviewItem(entry, allWords) {
  const type = REVIEW_TYPES[Math.floor(Math.random() * REVIEW_TYPES.length)];
  if (type === "fill") {
    const blanked = entry.example && entry.example.toLowerCase().includes(entry.word.toLowerCase())
      ? entry.example.replace(new RegExp(entry.word, "i"), "_____")
      : `Fill in the blank: "I need to use the word _____ (meaning: ${entry.meaning})."`;
    return { type, prompt: blanked, mode: "text", grade: (ans) => ans.trim().toLowerCase() === entry.word.toLowerCase() };
  }
  if (type === "sentence") {
    return { type, prompt: `Use "${entry.word}" in your own sentence.`, mode: "text", grade: (ans) => ans.toLowerCase().includes(entry.word.toLowerCase()) && ans.trim().split(/\s+/).filter(Boolean).length >= 4 };
  }
  if (type === "collocation") {
    if (entry.collocations && entry.collocations.length) {
      return { type, prompt: `Name a word or phrase that often goes with "${entry.word}".`, mode: "text", grade: (ans) => entry.collocations.some((c) => ans.toLowerCase().includes(c.toLowerCase())) };
    }
    return { type, prompt: `Think of a word or phrase that often goes with "${entry.word}".`, mode: "selfreport", reveal: "No collocations saved yet for this word — self-check your idea." };
  }
  if (type === "natural") {
    if (entry.naturalExample) {
      return {
        type, prompt: `Rephrase this more naturally: "${entry.example || entry.word}"`, mode: "text",
        grade: (ans) => {
          const targetWords = new Set(entry.naturalExample.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
          const overlap = ans.toLowerCase().split(/\W+/).filter((w) => targetWords.has(w)).length;
          return overlap >= 2;
        },
      };
    }
    return { type, prompt: `How would you say "${entry.word}" naturally in a sentence?`, mode: "selfreport", reveal: entry.example || entry.meaning };
  }
  if (type === "recognition") {
    const distractors = allWords.filter((w) => w.id !== entry.id).map((w) => w.word).filter(Boolean);
    const shuffled = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...shuffled, entry.word].sort(() => Math.random() - 0.5);
    if (options.length < 2) return { type: "meaning", prompt: `What does "${entry.word}" mean?`, mode: "selfreport", reveal: entry.meaning };
    return { type, prompt: `Which word means: "${entry.meaning}"?`, mode: "mcq", options, grade: (ans) => ans === entry.word };
  }
  // meaning
  return { type: "meaning", prompt: `What does "${entry.word}" mean?`, mode: "selfreport", reveal: entry.meaning };
}

function VocabularyReviewSession({ words, onUpdateWord, onFinish }) {
  const {uiLang}=useAuth();
  const t = useThemeClasses();
  const { currentUser } = useAuth();
  const [queue] = useState(() => words.map((w) => ({ entry: w, item: buildReviewItem(w, words) })));
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState("answering"); // answering | feedback
  const [wasCorrect, setWasCorrect] = useState(false);
  const [tally, setTally] = useState({ correct: 0, incorrect: 0 });
  const current = queue[idx];

  const finishSession = async (finalTally) => {
    const reviewed = finalTally.correct + finalTally.incorrect;
    if (currentUser && reviewed > 0) {
      await awardActivity(currentUser.email, { type: "vocab_review", xp: reviewed * ACTIVITY_XP.vocab_review, minutes: Math.round(reviewed * 0.5), meta: { reviewed } });
    }
    onFinish(finalTally);
  };

  const finishOne = (ok) => {
    const updated = scheduleVocabReview(current.entry, ok);
    onUpdateWord(updated);
    setTally((tl) => ({ correct: tl.correct + (ok ? 1 : 0), incorrect: tl.incorrect + (ok ? 0 : 1) }));
    setWasCorrect(ok);
    setPhase("feedback");
  };

  const submitText = () => {
    if (!answer.trim()) return;
    finishOne(current.item.grade(answer));
  };

  const next = () => {
    setAnswer("");
    setPhase("answering");
    if (idx + 1 >= queue.length) finishSession(tally);
    else setIdx(idx + 1);
  };

  return (
    <div className={cx("min-h-screen flex flex-col", t.bg)}>
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => finishSession(tally)} className={cx("h-9 w-9 rounded-full flex items-center justify-center border", t.border, t.hover)} aria-label="Close review">
          <X size={16} className={t.text} />
        </button>
        <span className={cx("text-xs font-semibold", t.textSoft)}>{idx + 1} / {queue.length}</span>
      </div>
      <div className="flex-1 px-5 pb-10 overflow-y-auto">
        <div className="max-w-md mx-auto pt-2 space-y-4">
          <Badge tone="slate">{current.item.type.charAt(0).toUpperCase() + current.item.type.slice(1)}</Badge>
          <Card>
            <p className={cx("text-sm font-medium mb-4", t.text)}>{current.item.prompt}</p>

            {phase === "answering" && current.item.mode === "mcq" && (
              <div className="space-y-2">
                {current.item.options.map((opt) => (
                  <button key={opt} onClick={() => finishOne(current.item.grade(opt))} className={cx("w-full text-start px-4 py-3 rounded-xl border text-sm font-medium", t.border, t.text, t.hover)}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {phase === "answering" && current.item.mode === "text" && (
              <>
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitText()}
                  placeholder={translate("Type your answer…",uiLang)}
                  className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500", t.surfaceAlt, t.border, t.text)}
                />
                <PrimaryButton full className="mt-3" onClick={submitText}><UIText text={"Submit"}/></PrimaryButton>
              </>
            )}

            {phase === "answering" && current.item.mode === "selfreport" && (
              <SecondaryButton full onClick={() => setPhase("reveal")}><UIText text={"Show answer"}/> </SecondaryButton>
            )}
            {phase === "reveal" && (
              <div className="space-y-3">
                <p className={cx("text-sm rounded-xl px-3.5 py-2.5", t.surfaceAlt, t.text)}>{current.item.reveal}</p>
                <div className="grid grid-cols-2 gap-2">
                  <SecondaryButton onClick={() => finishOne(false)}><UIText text={"Missed it"}/> </SecondaryButton>
                  <PrimaryButton onClick={() => finishOne(true)}><UIText text={"Got it"}/> </PrimaryButton>
                </div>
              </div>
            )}

            {phase === "feedback" && (
              <div className="space-y-3">
                <div className={cx("rounded-xl px-3.5 py-2.5 text-sm font-medium", wasCorrect ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                  {wasCorrect ? "Nice — correct!" : "Not quite."}
                </div>
                <div className={cx("rounded-xl px-3.5 py-2.5", t.surfaceAlt)}>
                  <p className={cx("text-xs font-semibold uppercase tracking-wide mb-1", t.textFaint)}>{current.entry.word}</p>
                  <p className={cx("text-sm", t.text)}>{current.entry.meaning}</p>
                  {current.entry.example && <p className={cx("text-xs mt-1.5 italic", t.textSoft)}>{current.entry.example}</p>}
                </div>
                <PrimaryButton full icon={idx + 1 >= queue.length ? Check : ArrowRight} onClick={next}>
                  {idx + 1 >= queue.length ? "Finish review" : "Next"}
                </PrimaryButton>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function VocabularyPage() {
  const t = useThemeClasses();
  const { currentUser, profile } = useAuth();
  const [words, setWords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("Due");
  const [showAdd, setShowAdd] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [summary, setSummary] = useState(null);
  const tabs = ["Due", "Learned", "All"];
  const showKurdish = profile?.supportLanguage === "English + Kurdish Sorani";

  const key = currentUser ? vocabKey(currentUser.email) : null;

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const list = await loadList(key);
      setWords(list);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  const persist = (list) => {
    setWords(list);
    saveList(key, list);
  };

  const addWord = (fields) => {
    const entry = defaultVocabEntry(fields);
    persist([entry, ...words]);
    setShowAdd(false);
  };

  const toggleFavorite = (id) => {
    persist(words.map((w) => (w.id === id ? { ...w, favorite: !w.favorite } : w)));
  };

  const updateWordFromReview = (updated) => {
    setWords((prev) => {
      const next = prev.map((w) => (w.id === updated.id ? updated : w));
      saveList(key, next);
      return next;
    });
  };

  const dueWords = words.filter(isDue);
  const filtered = words.filter((w) =>
    filter === "All" ? true : filter === "Due" ? isDue(w) : w.mastery === "mastered"
  );

  if (reviewing) {
    return (
      <VocabularyReviewSession
        words={dueWords.length ? dueWords : words}
        onUpdateWord={updateWordFromReview}
        onFinish={(tally) => { setReviewing(false); setSummary(tally); }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Vocabulary" subtitle={`${dueWords.length} word${dueWords.length === 1 ? "" : "s"} due for review`} />
        <button onClick={() => setShowAdd(true)} className={cx("h-9 w-9 rounded-full flex items-center justify-center border shrink-0 mt-1", t.border, t.hover)} aria-label="Add word">
          <Plus size={16} className={t.text} />
        </button>
      </div>

      {summary && (
        <Card className="flex items-center justify-between">
          <p className={cx("text-sm", t.text)}><UIText text={"Last review:"}/> {summary.correct}<UIText text={"correct,"}/> {summary.incorrect}<UIText text={"to revisit."}/> </p>
          <button onClick={() => setSummary(null)} className={t.textFaint}><X size={14} /></button>
        </Card>
      )}

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cx(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              filter === tab ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft, t.hover)
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loaded && filtered.map((w) => (
          <Card key={w.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className={cx("text-sm font-semibold", t.text)}>{w.word}</p>
                {w.ipa && <span className={cx("text-xs", t.textFaint)}>{w.ipa}</span>}
              </div>
              <p className={cx("text-xs mt-0.5", t.textSoft)}>{w.meaning}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge tone={w.mastery === "mastered" ? "emerald" : isDue(w) ? "amber" : "slate"}>
                  {w.mastery === "mastered" ? "Mastered" : isDue(w) ? "Due" : "Learning"}
                </Badge>
                {w.cefr && <Badge tone="teal">{w.cefr}</Badge>}
              </div>
            </div>
            <button onClick={() => toggleFavorite(w.id)} className="shrink-0" aria-label="Toggle favorite">
              <Star size={17} className={w.favorite ? "fill-amber-400 text-amber-400" : t.textFaint} />
            </button>
          </Card>
        ))}
        {loaded && filtered.length === 0 && (
          <p className={cx("text-sm text-center py-8", t.textSoft)}>
            {words.length === 0 ? "No words yet — save one from a Tutor conversation or add one manually." : "No words in this list."}
          </p>
        )}
      </div>

      <PrimaryButton full icon={RotateCcw} onClick={() => setReviewing(true)} className={words.length === 0 ? "opacity-40 pointer-events-none" : ""}><UIText text={"Review"}/> {dueWords.length > 0 ? "due words" : "words"}
      </PrimaryButton>

      {showAdd && <AddVocabModal onClose={() => setShowAdd(false)} onSave={addWord} showKurdish={showKurdish} />}
    </div>
  );
}

/* ----- Error Bank practice session ----- */

function MistakesPracticeSession({ errors, onUpdateError, onFinish }) {
  const t = useThemeClasses();
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState("answering");
  const [wasCorrect, setWasCorrect] = useState(false);
  const current = errors[idx];

  const normalize = (s) => (s || "").toLowerCase().trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");

  const submit = () => {
    if (!answer.trim()) return;
    const ok = normalize(answer) === normalize(current.correct) || (current.natural && normalize(answer) === normalize(current.natural));
    setWasCorrect(ok);
    onUpdateError(current.id, ok);
    setPhase("feedback");
  };

  const next = () => {
    setAnswer("");
    setPhase("answering");
    if (idx + 1 >= errors.length) onFinish();
    else setIdx(idx + 1);
  };

  return (
    <div className={cx("min-h-screen flex flex-col", t.bg)}>
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onFinish} className={cx("h-9 w-9 rounded-full flex items-center justify-center border", t.border, t.hover)} aria-label="Close practice">
          <X size={16} className={t.text} />
        </button>
        <span className={cx("text-xs font-semibold", t.textSoft)}>{idx + 1} / {errors.length}</span>
      </div>
      <div className="flex-1 px-5 pb-10 overflow-y-auto">
        <div className="max-w-md mx-auto pt-2 space-y-4">
          <Badge tone="rose">{current.category}</Badge>
          <Card>
            <p className={cx("text-xs font-semibold uppercase tracking-wide mb-2", t.textFaint)}><UIText text={"Fix this sentence"}/> </p>
            <p className={cx("text-sm mb-4", t.text)}>{current.original}</p>

            {phase === "answering" && (
              <>
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Type the corrected sentence…"
                  className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500", t.surfaceAlt, t.border, t.text)}
                />
                <PrimaryButton full className="mt-3" onClick={submit}><UIText text={"Check"}/> </PrimaryButton>
              </>
            )}

            {phase === "feedback" && (
              <div className="space-y-3">
                <div className={cx("rounded-xl px-3.5 py-2.5 text-sm font-medium", wasCorrect ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                  {wasCorrect ? "Correct!" : "Not quite — here's the fix."}
                </div>
                <div className={cx("rounded-xl px-3.5 py-2.5 space-y-2", t.surfaceAlt)}>
                  <p className={cx("text-sm", t.text)}><span className={t.textFaint}><UIText text={"Correct:"}/> </span>{current.correct}</p>
                  {current.natural && <p className={cx("text-sm", t.text)}><span className={t.textFaint}><UIText text={"More natural:"}/> </span>{current.natural}</p>}
                  {current.explanation && <p className={cx("text-xs", t.textSoft)}><span className={t.textFaint}><UIText text={"Why:"}/> </span>{current.explanation}</p>}
                </div>
                <PrimaryButton full icon={idx + 1 >= errors.length ? Check : ArrowRight} onClick={next}>
                  {idx + 1 >= errors.length ? "Finish practice" : "Next"}
                </PrimaryButton>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function MistakesPage() {
  const t = useThemeClasses();
  const { currentUser } = useAuth();
  const [errors, setErrors] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [practicing, setPracticing] = useState(false);

  const key = currentUser ? errorsKey(currentUser.email) : null;

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const list = await loadList(key);
      setErrors(list);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  const persist = (list) => {
    setErrors(list);
    saveList(key, list);
  };

  const addManualError = (fields) => {
    persist(addErrorEntry(errors, fields));
    setShowAdd(false);
  };

  const updateFromPractice = (id, wasCorrect) => {
    setErrors((prev) => {
      const next = recordErrorPractice(prev, id, wasCorrect);
      saveList(key, next);
      return next;
    });
  };

  const weakAreas = detectWeakAreas(errors);
  const sorted = [...errors].sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

  if (practicing) {
    return (
      <MistakesPracticeSession
        errors={sorted}
        onUpdateError={updateFromPractice}
        onFinish={async () => {
          if (currentUser && sorted.length > 0) {
            await awardActivity(currentUser.email, { type: "mistake_practice", xp: sorted.length * ACTIVITY_XP.mistake_practice, minutes: Math.round(sorted.length * 0.5), meta: { count: sorted.length } });
          }
          setPracticing(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Mistakes" subtitle="Review and fix errors from your real conversations" />
        <button onClick={() => setShowAdd(true)} className={cx("h-9 w-9 rounded-full flex items-center justify-center border shrink-0 mt-1", t.border, t.hover)} aria-label="Log a mistake">
          <Plus size={16} className={t.text} />
        </button>
      </div>

      {weakAreas.length > 0 && (
        <Card>
          <p className={cx("text-xs font-semibold uppercase tracking-wide mb-2", t.textSoft)}><UIText text={"Weak areas"}/> </p>
          <div className="flex flex-wrap gap-1.5">
            {weakAreas.map((w) => (
              <Badge key={w.category} tone="rose">{w.category} · {w.count}×</Badge>
            ))}
          </div>
        </Card>
      )}

      <PrimaryButton full icon={RotateCcw} onClick={() => setPracticing(true)} className={errors.length === 0 ? "opacity-40 pointer-events-none" : ""}><UIText text={"Practice Mistakes"}/> </PrimaryButton>

      <div className="space-y-3">
        {loaded && sorted.map((m) => (
          <Card key={m.id}>
            <div className="flex items-center justify-between mb-1.5">
              <Badge tone="rose">{m.category}</Badge>
              <div className="flex items-center gap-2">
                {m.frequency > 1 && <span className={cx("text-xs", t.textFaint)}>×{m.frequency}</span>}
                <Badge tone={m.mastery === "mastered" ? "emerald" : m.mastery === "practicing" ? "amber" : "slate"}>
                  {m.mastery === "mastered" ? "Mastered" : m.mastery === "practicing" ? "Practicing" : "New"}
                </Badge>
              </div>
            </div>
            <p className={cx("text-sm", t.text)}>{m.original}</p>
            <p className={cx("text-xs mt-1", t.textSoft)}>→ {m.correct}</p>
          </Card>
        ))}
        {loaded && sorted.length === 0 && (
          <p className={cx("text-sm text-center py-8", t.textSoft)}><UIText text={"No mistakes logged yet — corrections from your Tutor conversations will appear here."}/> </p>
        )}
      </div>

      {showAdd && <AddErrorModal onClose={() => setShowAdd(false)} onSave={addManualError} />}
    </div>
  );
}

function SkillRow({ label, level, trend, note }) {
  const t = useThemeClasses();
  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <p className={cx("text-sm font-medium", t.text)}>{label}</p>
        {note && <p className={cx("text-xs", t.textFaint)}>{note}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {level && <Badge tone="teal">{level}</Badge>}
        <TrendIndicator trend={trend} />
      </div>
    </div>
  );
}

function ProgressPage({ onNavigate }) {
  const t = useThemeClasses();
  const {
    loaded, currentUser, profile, roadmap, activityLog, vocab, errors, practiceHistory,
    courseProgress, snapshots, achievements, vocabMastered, coursesCompleted, xpTotal, streak, lessonsCompleted,
  } = useProgressData();

  if (!loaded || !roadmap) {
    return <div className="pb-6"><PageHeader title="Progress" subtitle="Loading your progress…" /></div>;
  }

  const cats = profile?.assessment?.categories || {};
  const trendFor = (metricFn) => computeTrend(snapshots, metricFn);

  const weeklyMinutes = minutesThisWeek(activityLog);
  const weeklyGoalMinutes = (profile?.dailyGoalMinutes || 20) * 7;
  const fluency = fluencyEvidence(practiceHistory);
  const naturalness = naturalnessEvidence(errors);
  const weakAreas = detectWeakAreas(errors);
  const startedCourses = COURSE_CATALOG.map((c) => ({ course: c, state: getCourseState(courseProgress, c.id) })).filter((x) => x.state.startedAt);
  const xpLevel = computeLevelInfo(xpTotal);
  const dailyGoalDone = minutesOnDay(activityLog, 0) >= (profile?.dailyGoalMinutes || 20);

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title="Progress" subtitle="Evidence-based tracking from your real activity" />

      {/* Current / next milestone */}
      <Card className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0" style={{ fontFamily: "var(--font-display)" }}>
          {roadmap.overallLevel}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cx("text-sm font-semibold", t.text)}><UIText text={"Current milestone:"}/> {roadmap.overallLevel}</p>
          <p className={cx("text-xs", t.textSoft)}><UIText text={"Next milestone:"}/> {roadmap.nextMilestone}</p>
        </div>
        <div className="text-right shrink-0">
          <TrendIndicator trend={trendFor((s) => s.overallIndex)} />
          <button onClick={() => onNavigate("roadmap")} className="block mt-1 text-xs font-semibold text-teal-600 dark:text-teal-400"><UIText text={"Roadmap →"}/> </button>
        </div>
      </Card>

      {/* Skill breakdown — evidence-based only */}
      <Card padded>
        <SectionHeading title="Skill breakdown" subtitle="From your assessment, practice, and roadmap" />
        <div className={cx("divide-y", t.border)}>
          {["Grammar", "Vocabulary", "Reading", "Writing"].map((skill) => {
            const cat = cats[skill];
            return (
              <SkillRow
                key={skill}
                label={skill}
                level={cat ? cat.level : null}
                trend={cat ? trendFor((s) => (s.categories ? s.categories[skill] : null)) : null}
                note={!cat ? "Not assessed yet — take the placement test" : undefined}
              />
            );
          })}
          <SkillRow
            label="Speaking"
            level={roadmap.skills.find((s) => s.name === "Speaking")?.level}
            trend={null}
            note="Estimated from your overall level — refine it with AI Call and Roleplay practice"
          />
          <SkillRow
            label="Fluency"
            level={fluency ? `${fluency.avgPct}%` : null}
            trend={null}
            note={fluency ? `From ${fluency.sessions} Fast Speak session${fluency.sessions === 1 ? "" : "s"}` : "No data yet — try Fast Speak in Practice"}
          />
          <SkillRow
            label="Naturalness"
            level={naturalness ? `${naturalness.masteredPct}% mastered` : null}
            trend={null}
            note={naturalness ? `${naturalness.total} naturalness correction${naturalness.total === 1 ? "" : "s"} logged` : "No data yet — this fills in from Tutor and Practice corrections"}
          />
          <SkillRow label="Pronunciation" level={null} trend={null} note="Not available — requires real audio analysis, which this app doesn't perform yet" />
        </div>
      </Card>

      {/* Weekly study time */}
      <Card>
        <SectionHeading title="Weekly study time" subtitle={`${weeklyMinutes} min this week`} action={<TrendIndicator trend={trendFor((s) => s.weeklyMinutes)} />} />
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyMinutesSeries(activityLog)} margin={{ left: -20, top: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={t.isDark ? "#1e293b" : "#e2e8f0"} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: t.isDark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: t.isDark ? "#94a3b8" : "#64748b" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                cursor={{ fill: t.isDark ? "#1e293b" : "#f1f5f9" }}
                contentStyle={{ background: t.isDark ? "#0f172a" : "#ffffff", border: `1px solid ${t.isDark ? "#1e293b" : "#e2e8f0"}`, borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="minutes" fill="#0d9488" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Speaking minutes" value={`${minutesOnDay(activityLog, 0)}m`} sub="today" accent="teal" />
        <StatCard icon={CalendarCheck} label="Lessons completed" value={lessonsCompleted} sub="all time" accent="amber" />
        <StatCard icon={BookMarked} label="Vocabulary mastery" value={`${vocabMastered}/${vocab.length || 0}`} sub="words mastered" accent="teal" />
        <StatCard icon={Trophy} label="Courses completed" value={coursesCompleted} sub={`of ${COURSE_CATALOG.length}`} accent="amber" />
      </div>

      {/* Frequent mistakes + strong/weak areas */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <SectionHeading title="Frequent mistakes" />
          {weakAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {weakAreas.map((w) => <Badge key={w.category} tone="rose">{w.category} · {w.count}×</Badge>)}
            </div>
          ) : (
            <p className={cx("text-sm", t.textSoft)}><UIText text={"No recurring mistake patterns yet."}/> </p>
          )}
        </Card>
        <Card>
          <SectionHeading title="Strong & weak areas" />
          {profile?.assessment ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <span className={cx("text-xs", t.textFaint)}><UIText text={"Strong:"}/> </span>
                {profile.assessment.strongAreas.map((a) => <Badge key={a} tone="emerald">{a}</Badge>)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className={cx("text-xs", t.textFaint)}><UIText text={"Weak:"}/> </span>
                {profile.assessment.weakAreas.map((a) => <Badge key={a} tone="rose">{a}</Badge>)}
              </div>
            </div>
          ) : (
            <p className={cx("text-sm", t.textSoft)}><UIText text={"Take the placement test to see this."}/> </p>
          )}
        </Card>
      </div>

      {startedCourses.length > 0 && (
        <Card>
          <SectionHeading title="Course progress" action={<button onClick={() => onNavigate("courses")} className="text-xs font-semibold text-teal-600 dark:text-teal-400"><UIText text={"All courses"}/> </button>} />
          <div className="space-y-3">
            {startedCourses.map(({ course, state }) => {
              const pct = computeCourseProgress(course, state);
              return (
                <div key={course.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={cx("text-xs font-medium", t.text)}>{course.title}</span>
                    <span className={cx("text-xs", t.textSoft)}>{pct}%</span>
                  </div>
                  <ProgressBar value={pct} colorClass={pct === 100 ? "bg-emerald-600" : "bg-teal-600"} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* --- Gamification: secondary, lighter section --- */}
      <div className="pt-2">
        <p className={cx("text-xs font-semibold uppercase tracking-wide mb-3", t.textFaint)}><UIText text={"Rewards for real practice"}/> </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard icon={Star} label="XP" value={xpTotal.toLocaleString()} sub={`Level ${xpLevel.level}`} accent="teal" />
          <StatCard icon={Flame} label="Streak" value={`${streak.current}d`} sub={`Best ${streak.best}d`} accent="amber" />
          <StatCard icon={Target} label="Daily goal" value={dailyGoalDone ? "Done" : `${minutesOnDay(activityLog, 0)}/${profile?.dailyGoalMinutes || 20}m`} sub="today" accent={dailyGoalDone ? "emerald" : "teal"} />
          <StatCard icon={CalendarCheck} label="Weekly goal" value={`${Math.min(100, Math.round((weeklyMinutes / weeklyGoalMinutes) * 100))}%`} sub={`${weeklyMinutes}/${weeklyGoalMinutes}m`} accent="amber" />
        </div>

        <Card>
          <SectionHeading title="Achievements" subtitle={`${achievements.length} of ${ACHIEVEMENT_DEFS.length} earned`} />
          <div className="grid grid-cols-3 gap-3">
            {ACHIEVEMENT_DEFS.map((def) => {
              const earned = achievements.find((a) => a.id === def.id);
              const Icon = def.icon;
              return (
                <div key={def.id} className={cx("flex flex-col items-center text-center gap-2 py-3 rounded-xl", t.surfaceAlt, !earned && "opacity-40")}>
                  <div className={cx("h-9 w-9 rounded-full flex items-center justify-center", earned ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : t.surface)}>
                    {earned ? <Icon size={16} /> : <Lock size={14} className={t.textFaint} />}
                  </div>
                  <p className={cx("text-[11px] font-medium leading-tight", t.text)}>{def.title}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const ONBOARDING_LEVELS = [...ENGLISH_LEVELS, "Not sure yet"];
const GOAL_OPTIONS = ["Travel", "Work", "Exams", "Study abroad", "Everyday conversation", "Immigration"];
const PRIORITY_OPTIONS = [
  "Speaking", "Pronunciation", "Grammar", "Vocabulary", "Academic English",
  "Professional English", "Travel", "Meetings", "Presentations", "Job interviews",
];
const INTEREST_OPTIONS = ["Movies & TV", "Technology", "Sports", "Music", "Business", "Travel", "Science", "Art & culture"];
const STUDY_TIMES = ["Morning", "Afternoon", "Evening", "Night"];
const SUPPORT_LANGS = ["English only", "English + Kurdish Sorani"];
const TUTOR_STYLES = ["Friendly", "Formal", "Strict", "Encouraging"];
const CORRECTION_LEVELS = ["Low", "Medium", "High"];
const SPEAKING_SPEEDS = ["Slow", "Normal", "Fast"];
const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

function FieldLabel({ children }) {
  const t = useThemeClasses();
  return <label className={cx("block text-xs font-medium mb-1.5", t.textSoft)}><UIText text={children}/></label>;
}

function TextInput({ value, onChange, placeholder }) {
  const t = useThemeClasses();
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500", t.surfaceAlt, t.border, t.text)}
    />
  );
}

function SelectPills({ value, options, onChange }) {
  const t = useThemeClasses();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cx(
            "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
            value === opt ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft, t.hover)
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function MultiSelectPills({ values, options, onChange }) {
  const t = useThemeClasses();
  const toggle = (opt) =>
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cx(
            "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
            values.includes(opt) ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft, t.hover)
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ProfilePage() {
  const t = useThemeClasses();
  const T = useT();
  const { currentUser, profile, updateProfile, isRTL } = useAuth();
  const { loaded: progressLoaded, roadmap, activityLog, xpTotal, streak, achievements } = useProgressData();
  const [form, setForm] = useState(profile || defaultProfile(currentUser?.name, currentUser?.email));
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const save = async () => {
    await updateProfile(form);
    setEditing(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title={T("nav_profile")} />

      <Card className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-teal-600 text-white flex items-center justify-center text-xl font-bold shrink-0" style={{ fontFamily: "var(--font-display)" }}>
          {(form.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              className={cx("text-sm font-semibold rounded-lg px-2 py-1 border w-full", t.surfaceAlt, t.border, t.text)}
            />
          ) : (
            <p className={cx("text-base font-semibold", t.text)}>{form.name}</p>
          )}
          <p className={cx("text-xs mt-0.5", t.textSoft)}>{currentUser?.email}<UIText text={"· Level"}/> {roadmap ? roadmap.overallLevel : (profile?.englishLevel || "—")}</p>
        </div>
        <button
          onClick={() => (editing ? save() : setEditing(true))}
          className={cx("h-9 w-9 rounded-full flex items-center justify-center border shrink-0", t.border, t.hover)}
          aria-label="Edit profile"
        >
          {editing ? <Check size={15} className="text-teal-600" /> : <Pencil size={15} className={t.textSoft} />}
        </button>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Star} label="Total XP" value={progressLoaded ? xpTotal.toLocaleString() : "—"} accent="teal" />
        <StatCard icon={Clock} label="Minutes" value={progressLoaded ? activityLog.reduce((s, e) => s + (e.minutes || 0), 0).toLocaleString() : "—"} accent="amber" />
        <StatCard icon={Flame} label="Best streak" value={progressLoaded ? `${streak.best} days` : "—"} accent="teal" />
      </div>

      <div>
        <SectionHeading title="Achievements" subtitle={progressLoaded ? `${achievements.length} of ${ACHIEVEMENT_DEFS.length} earned` : undefined} />
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENT_DEFS.map((def) => {
            const earned = progressLoaded && achievements.some((a) => a.id === def.id);
            const Icon = def.icon;
            return (
              <Card key={def.id} className={cx("flex flex-col items-center text-center gap-2 py-4", !earned && "opacity-40")}>
                <div className={cx("h-10 w-10 rounded-full flex items-center justify-center", earned ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : t.surfaceAlt)}>
                  {earned ? <Icon size={17} /> : <Lock size={15} className={t.textFaint} />}
                </div>
                <p className={cx("text-[11px] font-medium leading-tight", t.text)}>{def.title}</p>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeading
          title="Learning profile"
          action={
            editing ? (
              <button onClick={save} className="text-xs font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1">
                <Check size={13} /> {T("savingChanges")}
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="text-xs font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1">
                <Pencil size={12} /> <UIText text={"Edit"}/>
              </button>
            )
          }
        />
        <Card className="space-y-5">
          {savedFlash && (
            <div className="rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-3.5 py-2.5">
              {T("saved")}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel><UIText text={"Native language"}/></FieldLabel>
              {editing ? (
                <TextInput value={form.nativeLanguage} onChange={set("nativeLanguage")} placeholder="e.g. Kurdish Sorani" />
              ) : (
                <p className={cx("text-sm", t.text)}>{form.nativeLanguage || "—"}</p>
              )}
            </div>
            <div>
              <FieldLabel><UIText text={"Target language"}/></FieldLabel>
              {editing ? (
                <TextInput value={form.targetLanguage} onChange={set("targetLanguage")} placeholder="English" />
              ) : (
                <p className={cx("text-sm", t.text)}>{form.targetLanguage}</p>
              )}
            </div>
          </div>

          <div>
            <FieldLabel><UIText text={"English level"}/></FieldLabel>
            {editing ? (
              <SelectPills value={form.englishLevel} options={ENGLISH_LEVELS} onChange={set("englishLevel")} />
            ) : (
              <Badge tone="teal">{form.englishLevel}</Badge>
            )}
          </div>

          <div>
            <FieldLabel><UIText text={"Learning goals"}/></FieldLabel>
            {editing ? (
              <MultiSelectPills values={form.learningGoals} options={GOAL_OPTIONS} onChange={set("learningGoals")} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(form.learningGoals || []).length
                  ? form.learningGoals.map((g) => <Badge key={g} tone="slate">{g}</Badge>)
                  : <p className={cx("text-sm", t.textSoft)}>—</p>}
              </div>
            )}
          </div>

          <div>
            <FieldLabel><UIText text={"Main priorities"}/></FieldLabel>
            {editing ? (
              <MultiSelectPills values={form.priorities} options={PRIORITY_OPTIONS} onChange={set("priorities")} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(form.priorities || []).length
                  ? form.priorities.map((g) => <Badge key={g} tone="teal">{g}</Badge>)
                  : <p className={cx("text-sm", t.textSoft)}>—</p>}
              </div>
            )}
          </div>

          <div>
            <FieldLabel><UIText text={"Interests"}/></FieldLabel>
            {editing ? (
              <MultiSelectPills values={form.interests} options={INTEREST_OPTIONS} onChange={set("interests")} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(form.interests || []).length
                  ? form.interests.map((g) => <Badge key={g} tone="slate">{g}</Badge>)
                  : <p className={cx("text-sm", t.textSoft)}>—</p>}
              </div>
            )}
          </div>

          <div>
            <FieldLabel><UIText text={"Academic / professional field"}/></FieldLabel>
            {editing ? (
              <TextInput value={form.professionalField} onChange={set("professionalField")} placeholder="e.g. Nursing, Software engineering" />
            ) : (
              <p className={cx("text-sm", t.text)}>{form.professionalField || "—"}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel><UIText text={"Daily learning goal"}/></FieldLabel>
              {editing ? (
                <SelectPills
                  value={form.dailyGoalMinutes}
                  options={DAILY_GOAL_OPTIONS}
                  onChange={set("dailyGoalMinutes")}
                />
              ) : (
                <p className={cx("text-sm", t.text)}>{form.dailyGoalMinutes}<UIText text={"min / day"}/> </p>
              )}
            </div>
            <div>
              <FieldLabel><UIText text={"Preferred study time"}/> </FieldLabel>
              {editing ? (
                <SelectPills value={form.preferredStudyTime} options={STUDY_TIMES} onChange={set("preferredStudyTime")} />
              ) : (
                <p className={cx("text-sm", t.text)}>{form.preferredStudyTime}</p>
              )}
            </div>
          </div>

          <div>
            <FieldLabel><UIText text={"Support language"}/></FieldLabel>
            {editing ? (
              <SelectPills value={form.supportLanguage} options={SUPPORT_LANGS} onChange={set("supportLanguage")} />
            ) : (
              <p className={cx("text-sm", t.text)}>{form.supportLanguage}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel><UIText text={"Tutor style"}/></FieldLabel>
              {editing ? (
                <SelectPills value={form.tutorStyle} options={TUTOR_STYLES} onChange={set("tutorStyle")} />
              ) : (
                <p className={cx("text-sm", t.text)}>{form.tutorStyle}</p>
              )}
            </div>
            <div>
              <FieldLabel><UIText text={"Correction intensity"}/></FieldLabel>
              {editing ? (
                <SelectPills value={form.correctionIntensity} options={CORRECTION_LEVELS} onChange={set("correctionIntensity")} />
              ) : (
                <p className={cx("text-sm", t.text)}>{form.correctionIntensity}</p>
              )}
            </div>
          </div>

          <div>
            <FieldLabel><UIText text={"Speaking speed"}/></FieldLabel>
            {editing ? (
              <SelectPills value={form.speakingSpeed} options={SPEAKING_SPEEDS} onChange={set("speakingSpeed")} />
            ) : (
              <p className={cx("text-sm", t.text)}>{form.speakingSpeed}</p>
            )}
          </div>

          {editing && (
            <PrimaryButton full icon={Check} onClick={save}>{T("savingChanges")}</PrimaryButton>
          )}
        </Card>
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, sub, right }) {
  const t = useThemeClasses();
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className={cx("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", t.surfaceAlt)}>
        <Icon size={16} className={t.textSoft} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-medium", t.text)}>{label}</p>
        {sub && <p className={cx("text-xs", t.textSoft)}><UIText text={sub}/></p>}
      </div>
      {right}
    </div>
  );
}

function SettingsPage({ onNavigate }) {
  const t = useThemeClasses();
  const T = useT();
  const { isDark, toggle } = useTheme();
  const { profile, updateProfile, currentUser, signOut, uiLang } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [sound, setSound] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const kurdishEnabled = true;
  const uiLang = kurdishEnabled ? (profile?.uiLang || "en") : "en";

  return (
    <div className="space-y-6 pb-6">
      <PageHeader title={T("nav_settings")} />

      <div>
        <SectionHeading title="Appearance" />
        <Card padded={false}>
          <div className={cx("divide-y", t.border)}>
            <SettingsRow
              icon={isDark ? Moon : Sun}
              label="Dark mode"
              sub={isDark ? "On" : "Off"}
              right={<Switch checked={isDark} onChange={toggle} label="Dark mode" />}
            />
            <SettingsRow
              icon={Languages}
              label={T("appLanguage")}
              sub={kurdishEnabled ? "English / Kurdish Sorani" : "Enable in Profile → Support language"}
              right={
                kurdishEnabled ? (
                  <div className="flex gap-1.5">
                    {["en", "ku"].map((lng) => (
                      <button
                        key={lng}
                        onClick={() => updateProfile({ uiLang: lng })}
                        className={cx(
                          "px-2.5 py-1 rounded-full text-xs font-semibold border",
                          uiLang === lng ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft)
                        )}
                      >
                        {lng === "en" ? "EN" : "KU"}
                      </button>
                    ))}
                  </div>
                ) : null
              }
            />
          </div>
        </Card>
      </div>

      <div>
        <SectionHeading title="Notifications" />
        <Card padded={false}>
          <div className={cx("divide-y", t.border)}>
            <SettingsRow
              icon={Bell}
              label="Push notifications"
              sub="Updates and tips"
              right={<Switch checked={notifications} onChange={setNotifications} label="Push notifications" />}
            />
            <SettingsRow
              icon={CalendarCheck}
              label="Daily reminders"
              sub="Reminder to practice"
              right={<Switch checked={reminders} onChange={setReminders} label="Daily reminders" />}
            />
            <SettingsRow
              icon={Volume2}
              label="Sound effects"
              sub="Feedback sounds during practice"
              right={<Switch checked={sound} onChange={setSound} label="Sound effects" />}
            />
          </div>
        </Card>
      </div>

      <div>
        <SectionHeading title="Learning" />
        <Card padded={false}>
          <div className={cx("divide-y", t.border)}>
            <button onClick={() => onNavigate("profile")} className="w-full text-start">
              <SettingsRow icon={Globe} label="Native language" sub={profile?.nativeLanguage || "Not set"} right={<ChevronRight size={15} className={t.textFaint} />} />
            </button>
            <button onClick={() => onNavigate("profile")} className="w-full text-start">
              <SettingsRow icon={Target} label="Daily goal" sub={`${profile?.dailyGoalMinutes || 20} minutes`} right={<ChevronRight size={15} className={t.textFaint} />} />
            </button>
          </div>
        </Card>
      </div>

      <div>
        <SectionHeading title="Account" />
        <Card padded={false}>
          <div className={cx("divide-y", t.border)}>
            <SettingsRow icon={User} label={currentUser?.name} sub={window.CADENCE_SESSION?.mode==='guest'?translate('Local practice mode — data stays on this device.',uiLang):currentUser?.email} />
            <button onClick={() => setShowPrivacy((s) => !s)} className="w-full text-start" aria-expanded={showPrivacy}>
              <SettingsRow icon={ShieldCheck} label="Privacy & security" right={<ChevronDown size={15} className={cx(t.textFaint, showPrivacy && "rotate-180")} />} />
            </button>
            {showPrivacy && (
              <div className={cx("px-5 py-3.5 text-xs leading-relaxed space-y-1.5", t.textSoft)}>
                <p><UIText text={window.CADENCE_SESSION?.mode==="hosted"?"Sign in with ChatGPT":"Local practice mode — data stays on this device."}/></p>
                <p>{window.CADENCE_SESSION?.mode==='guest'?<UIText text="Local practice mode — data stays on this device."/>:'Your profile, progress, and conversations are stored under your account only.'}</p>
                <p>AI replies are generated by the model provider; no API key is ever present in this app's code.</p>
              </div>
            )}
            {window.CADENCE_SESSION?.mode!=='guest'&&<button onClick={signOut} className="w-full text-start">
              <SettingsRow
                icon={LogOut}
                label={T("signOut")}
                right={<ChevronRight size={15} className={t.textFaint} />}
              />
            </button>}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Placement assessment                                                   */
/* ---------------------------------------------------------------------- */

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const CONNECTOR_WORDS = /\b(because|however|although|therefore|since|for example|in addition|on the other hand|despite|nevertheless|moreover|meanwhile)\b/i;

/* Item bank: 6 CEFR levels × 7 task types. Free-text items are graded with
   local heuristics only — no external AI call. */
const ASSESSMENT_BANK = [
  // Grammar
  { id: "g0", skill: "grammar", level: 0, type: "mcq", prompt: "She ___ a teacher.", options: ["is", "are", "am"], accepted: ["is"] },
  { id: "g1", skill: "grammar", level: 1, type: "fill", prompt: "They ___ (go) to the park yesterday.", accepted: ["went"] },
  { id: "g2", skill: "grammar", level: 2, type: "fill", prompt: "If it rains tomorrow, I ___ (stay) at home.", accepted: ["will stay", "stay"] },
  { id: "g3", skill: "grammar", level: 3, type: "fill", prompt: "She wished she ___ (know) the answer earlier.", accepted: ["had known"] },
  { id: "g4", skill: "grammar", level: 4, type: "fill", prompt: "Not only ___ he arrive late, but he also forgot the documents.", accepted: ["did"] },
  { id: "g5", skill: "grammar", level: 5, type: "fill", prompt: "Were it not for your help, I ___ (not finish) in time.", accepted: ["would not have finished", "wouldn't have finished"] },
  // Vocabulary
  { id: "v0", skill: "vocabulary", level: 0, type: "mcq", prompt: "A place where you sleep is a:", options: ["bedroom", "kitchen", "garage"], accepted: ["bedroom"] },
  { id: "v1", skill: "vocabulary", level: 1, type: "fill", prompt: "The opposite of 'expensive' is ___.", accepted: ["cheap", "inexpensive"] },
  { id: "v2", skill: "vocabulary", level: 2, type: "mcq", prompt: "Choose the best synonym for 'huge':", options: ["tiny", "enormous", "quiet"], accepted: ["enormous"] },
  { id: "v3", skill: "vocabulary", level: 3, type: "fill", prompt: "Her explanation was so ___ (clear and detailed) that everyone understood immediately.", accepted: ["thorough", "comprehensive", "clear", "detailed"] },
  { id: "v4", skill: "vocabulary", level: 4, type: "fill", prompt: "The company's profits ___ (increased suddenly) after the launch.", accepted: ["soared", "skyrocketed", "surged"] },
  { id: "v5", skill: "vocabulary", level: 5, type: "mcq", prompt: "Which word is closest in meaning to 'ubiquitous'?", options: ["rare", "everywhere", "expensive"], accepted: ["everywhere"] },
  // Reading
  { id: "r1", skill: "reading", level: 1, type: "short", passage: "Maria works at a bakery. She starts work at 7 AM and finishes at 3 PM. She loves making bread.", prompt: "What time does Maria finish work?", accepted: ["3", "3 pm", "3pm", "three"] },
  { id: "r2", skill: "reading", level: 2, type: "short", passage: "Tom planned a trip to the mountains, but heavy snow closed the road. He decided to visit a nearby town instead and ended up enjoying it more than expected.", prompt: "Why did Tom change his plan?", accepted: ["snow", "road closed", "closed road", "weather"] },
  { id: "r3", skill: "reading", level: 3, type: "short", passage: "Remote work has grown quickly, but many managers still worry it weakens collaboration, even though studies show output often stays the same or improves.", prompt: "What concern do some managers have about remote work?", accepted: ["collaboration", "teamwork", "weakens collaboration"] },
  { id: "r4", skill: "reading", level: 4, type: "short", passage: "While automation increases efficiency, critics argue it can widen inequality if the gains are not shared broadly across the workforce.", prompt: "According to the passage, what could automation widen?", accepted: ["inequality"] },
  { id: "r5", skill: "reading", level: 5, type: "short", passage: "The committee's tacit approval, though never formally stated, was evident in how swiftly the proposal moved through subsequent stages.", prompt: "What does 'tacit' suggest about the committee's approval?", accepted: ["unspoken", "implied", "not stated", "silent", "indirect"] },
  // Sentence formation
  { id: "s0", skill: "sentence", level: 0, type: "construct", prompt: "Write a sentence using the word 'happy'.", requiredWord: "happy", minWords: 3 },
  { id: "s1", skill: "sentence", level: 1, type: "construct", prompt: "Write a sentence using the words 'yesterday' and 'shop'.", requiredWord: "yesterday", minWords: 4 },
  { id: "s2", skill: "sentence", level: 2, type: "construct", prompt: "Write a sentence using 'although' to contrast two ideas.", requiredWord: "although", minWords: 6 },
  { id: "s3", skill: "sentence", level: 3, type: "construct", prompt: "Write a sentence using the word 'nevertheless'.", requiredWord: "nevertheless", minWords: 6 },
  { id: "s4", skill: "sentence", level: 4, type: "construct", prompt: "Write a complex sentence using 'despite the fact that'.", requiredWord: "despite", minWords: 8 },
  { id: "s5", skill: "sentence", level: 5, type: "construct", prompt: "Write a sentence with an inverted structure, starting with 'Rarely have I...'.", requiredWord: "rarely", minWords: 8 },
  // Writing
  { id: "w0", skill: "writing", level: 0, type: "long", prompt: "Write 2–3 sentences about your family.", minWords: 8 },
  { id: "w1", skill: "writing", level: 1, type: "long", prompt: "Describe your daily routine.", minWords: 15 },
  { id: "w2", skill: "writing", level: 2, type: "long", prompt: "Write a short paragraph about your last vacation.", minWords: 30 },
  { id: "w3", skill: "writing", level: 3, type: "long", prompt: "Write about a challenge you've faced and how you solved it.", minWords: 40 },
  { id: "w4", skill: "writing", level: 4, type: "long", prompt: "Discuss the advantages and disadvantages of remote work.", minWords: 50 },
  { id: "w5", skill: "writing", level: 5, type: "long", prompt: "Write a persuasive paragraph on a topic you feel strongly about, addressing a counterargument.", minWords: 60 },
  // Short conversational response
  { id: "c0", skill: "conversation", level: 0, type: "long", prompt: "Someone asks: \"How are you today?\" Write your reply.", minWords: 3 },
  { id: "c1", skill: "conversation", level: 1, type: "long", prompt: "A friend asks: \"What did you do last weekend?\" Write your reply.", minWords: 8 },
  { id: "c2", skill: "conversation", level: 2, type: "long", prompt: "Someone says: \"I'm thinking about learning a new language. Any advice?\" Reply.", minWords: 15 },
  { id: "c3", skill: "conversation", level: 3, type: "long", prompt: "A colleague says: \"I disagree with the new schedule.\" Respond politely with your view.", minWords: 20 },
  { id: "c4", skill: "conversation", level: 4, type: "long", prompt: "Respond to: \"Some people think working from home hurts teamwork. What's your view?\"", minWords: 25 },
  { id: "c5", skill: "conversation", level: 5, type: "long", prompt: "Respond diplomatically to: \"Your proposal has some serious flaws.\"", minWords: 25 },
  // Explaining an idea
  { id: "i0", skill: "idea", level: 0, type: "long", prompt: "Explain in simple words why you like your favorite food.", minWords: 8 },
  { id: "i1", skill: "idea", level: 1, type: "long", prompt: "Explain why you want to learn English.", minWords: 15 },
  { id: "i2", skill: "idea", level: 2, type: "long", prompt: "Explain how you usually plan your week.", minWords: 25 },
  { id: "i3", skill: "idea", level: 3, type: "long", prompt: "Explain the benefits of exercising regularly.", minWords: 30 },
  { id: "i4", skill: "idea", level: 4, type: "long", prompt: "Explain how technology has changed the way people communicate.", minWords: 40 },
  { id: "i5", skill: "idea", level: 5, type: "long", prompt: "Explain a complex idea, like how inflation affects everyday life, to someone unfamiliar with it.", minWords: 45 },
];

const ASSESSMENT_SEQUENCE = ["grammar", "vocabulary", "reading", "grammar", "vocabulary", "reading", "grammar", "vocabulary", "reading"];

const SKILL_LABEL = { grammar: "Grammar", vocabulary: "Vocabulary", reading: "Reading", writing: "Writing", sentence: "Writing", conversation: "Writing", idea: "Writing" };

function pickAssessmentItem(skill, levelIndex, usedIds) {
  const pool = ASSESSMENT_BANK.filter((q) => q.skill === skill && isObjective(q) && !usedIds.includes(q.id));
  if (pool.length === 0) return null;
  pool.sort((a, b) => Math.abs(a.level - levelIndex) - Math.abs(b.level - levelIndex));
  return pool[0];
}

function gradeAssessmentAnswer(item, answer) { return gradeAnswer(item,answer); }

function computeAssessmentResults(history) {
  const weighted = (rows) => {
    if (rows.length === 0) return null;
    const sum = rows.reduce((acc, r) => acc + (r.level + (r.score - 0.5)), 0);
    const avgScore = rows.reduce((acc, r) => acc + r.score, 0) / rows.length;
    const idx = Math.max(0, Math.min(5, Math.round(sum / rows.length)));
    return { index: idx, level: CEFR_LEVELS[idx], score: avgScore };
  };

  const overall = weighted(history);
  const grammar = weighted(history.filter((h) => h.skill === "grammar"));
  const vocabulary = weighted(history.filter((h) => h.skill === "vocabulary"));
  const reading = weighted(history.filter((h) => h.skill === "reading"));
  const writing = weighted(history.filter((h) => ["writing", "sentence", "conversation", "idea"].includes(h.skill)));

  const categories = { Grammar: grammar, Vocabulary: vocabulary, Reading: reading, Writing: writing };
  const names = Object.keys(categories).filter((k) => categories[k]);
  const maxScore = Math.max(...names.map((n) => categories[n].score));
  const minScore = Math.min(...names.map((n) => categories[n].score));
  const strongAreas = names.filter((n) => categories[n].score === maxScore);
  const weakAreas = names.filter((n) => categories[n].score === minScore);
  const priorityArea = names.reduce((a, b) => (categories[a].score <= categories[b].score ? a : b));

  const nextStepBySkill = {
    Grammar: "Focus on grammar drills — verb tenses, conditionals, and sentence structure.",
    Vocabulary: "Build vocabulary daily with word review, reading, and using new words in context.",
    Reading: "Practice reading comprehension with varied short texts and inference questions.",
    Writing: "Practice writing short paragraphs and explaining ideas — aim for a few sentences a day.",
  };

  const nextMilestone = overall.index < 5 ? CEFR_LEVELS[overall.index + 1] : "C2 mastery — keep practicing to stay sharp";

  return {
    completedAt: new Date().toISOString(),
    provisional: true,
    assessedSkills: ["Grammar","Vocabulary","Reading"],
    overallLevel: overall.level,
    overallIndex: overall.index,
    overallScore: overall.score,
    categories,
    strongAreas,
    weakAreas,
    priorityArea,
    recommendedNextStep: nextStepBySkill[priorityArea],
    nextMilestone,
  };
}

function AssessmentIntro({ onStart, onSkip, skipping }) {
  const t = useThemeClasses();
  const items = [
    { icon: PenLine, label: "Grammar & vocabulary" },
    { icon: BookOpen, label: "Reading comprehension" },
  ];
  return (
    <div className={cx("min-h-screen flex flex-col items-center justify-center px-5 py-10", t.bg)}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <Card className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-5">
            <Target size={22} />
          </div>
          <h1 className={cx("text-lg font-bold mb-2", t.text)} style={{ fontFamily: "var(--font-display)" }}>
            <UIText text={"Placement assessment"}/>
          </h1>
          <p className={cx("text-sm mb-5", t.textSoft)}>
            <UIText text="Nine short questions on grammar, vocabulary and reading. This assessment is optional." />
          </p>
          <div className="space-y-2 mb-6 text-start">
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <div key={i} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5", t.surfaceAlt)}>
                  <Icon size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className={cx("text-sm", t.text)}><UIText text={it.label}/></span>
                </div>
              );
            })}
          </div>
          <PrimaryButton full icon={ArrowRight} onClick={onStart}><UIText text={"Start assessment"}/></PrimaryButton>
          <button type="button" onClick={onSkip} disabled={skipping} className={cx("w-full mt-3 px-4 py-3 rounded-xl border text-sm font-semibold", t.border, t.textSoft, t.hover)}>
            <UIText text={skipping ? "Saving..." : "Skip for now"} />
          </button>
          <p className={cx("text-xs mt-3", t.textSoft)}><UIText text="If you skip, lessons will use the level you selected. No assessment score will be created." /></p>
        </Card>
      </div>
    </div>
  );
}

function AssessmentQuestion({ item, index, total, onSubmit }) {
  const {uiLang}=useAuth();
  const t = useThemeClasses();
  const [answer, setAnswer] = useState("");
  const isLong = item.type === "long" || item.type === "construct";
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).filter(Boolean).length : 0;

  useEffect(() => setAnswer(""), [item.id]);

  const submit = () => {
    if (item.type === "mcq" && !answer) return;
    if (item.type !== "mcq" && !answer.trim()) return;
    onSubmit(answer);
  };

  return (
    <div className={cx("min-h-screen flex flex-col", t.bg)}>
      <div className="flex items-center justify-between px-5 py-4">
        <Logo compact />
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <div className="max-w-md mx-auto pt-2">
          <OnboardingProgress step={index} total={total} />
          <Badge tone="slate"><UIText text={SKILL_LABEL[item.skill]}/></Badge>
          <Card className="mt-3">
            {item.passage && (
              <p className={cx("text-sm leading-relaxed mb-4 pb-4 border-b", t.text, t.border)}>{item.passage}</p>
            )}
            <p className={cx("text-sm font-medium mb-4", t.text)}>{item.prompt}</p>

            {item.type === "mcq" ? (
              <div className="space-y-2">
                {item.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswer(opt)}
                    className={cx(
                      "w-full text-start px-4 py-3 rounded-xl border text-sm font-medium transition-colors",
                      answer === opt ? "border-teal-600 bg-teal-600/10 text-teal-700 dark:text-teal-300" : cx(t.border, t.text, t.hover)
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {isLong ? (
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={5}
                    placeholder={translate("Type your answer…",uiLang)}
                    className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none", t.surfaceAlt, t.border, t.text)}
                  />
                ) : (
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={translate("Type your answer…",uiLang)}
                    className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500", t.surfaceAlt, t.border, t.text)}
                  />
                )}
                {isLong && (
                  <p className={cx("text-xs mt-1.5", t.textFaint)}>
                    {wordCount} word{wordCount === 1 ? "" : "s"}{item.minWords ? ` · aim for ${item.minWords}+` : ""}
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
      <div className={cx("fixed bottom-0 inset-x-0 border-t px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]", t.surface, t.border)}>
        <div className="max-w-md mx-auto">
          <PrimaryButton
            full
            icon={index === total - 1 ? Check : ArrowRight}
            onClick={submit}
            className={cx((item.type === "mcq" ? !answer : !answer.trim()) && "opacity-40 pointer-events-none")}
          >
            <UIText text={index === total - 1 ? "Finish assessment" : "Next"}/>
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function AssessmentResults({ results, onFinish }) {
  const t = useThemeClasses();
  const categoryOrder = ["Grammar", "Vocabulary", "Reading"];

  return (
    <div className={cx("min-h-screen", t.bg)}>
      <div className="flex items-center justify-between px-5 py-4">
        <Logo compact />
        <ThemeToggle />
      </div>
      <div className="px-5 pb-10">
        <div className="max-w-md mx-auto space-y-5">
          <Card className="text-center py-8">
            <p className={cx("text-xs font-semibold uppercase tracking-wide mb-2", t.textSoft)}><UIText text={"Your estimated level"}/> </p>
            <div className="h-16 w-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3" style={{ fontFamily: "var(--font-display)" }}>
              {results.overallLevel}
            </div>
            <p className={cx("text-sm", t.textSoft)}><UIText text={"Next milestone:"}/> <span className={cx("font-semibold", t.text)}>{results.nextMilestone}</span>
            </p>
          </Card>

          <Card>
            <SectionHeading title="Skill breakdown" />
            <div className="space-y-3">
              {categoryOrder.map((name) => {
                const cat = results.categories[name];
                if (!cat) return null;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cx("text-xs font-medium", t.text)}>{name}</span>
                      <Badge tone="teal">{cat.level}</Badge>
                    </div>
                    <ProgressBar value={(cat.index + 1) * (100 / 6)} colorClass="bg-teal-600" />
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className={cx("text-xs font-semibold uppercase tracking-wide mb-2", t.textSoft)}><UIText text={"Strong areas"}/> </p>
              <div className="flex flex-wrap gap-1.5">
                {results.strongAreas.map((a) => <Badge key={a} tone="emerald">{a}</Badge>)}
              </div>
            </Card>
            <Card>
              <p className={cx("text-xs font-semibold uppercase tracking-wide mb-2", t.textSoft)}><UIText text={"Weak areas"}/> </p>
              <div className="flex flex-wrap gap-1.5">
                {results.weakAreas.map((a) => <Badge key={a} tone="rose">{a}</Badge>)}
              </div>
            </Card>
          </div>

          <Card>
            <p className={cx("text-xs font-semibold uppercase tracking-wide mb-2", t.textSoft)}><UIText text={"Priority area"}/> </p>
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="amber">{results.priorityArea}</Badge>
            </div>
            <p className={cx("text-sm", t.textSoft)}>{results.recommendedNextStep}</p>
          </Card>

          <PrimaryButton full icon={ArrowRight} onClick={onFinish}><UIText text={"Start My Personalized Plan"}/> </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function PlacementAssessment({ onFinish }) {
  const { updateProfile, currentUser } = useAuth();
  const [skipping, setSkipping] = useState(false);
  const handleSkip = async () => {
    if (skipping) return;
    setSkipping(true);
    try {
      await updateProfile({ placementComplete: true, placementSkipped: true });
      onFinish();
    } finally { setSkipping(false); }
  };
  const [stage, setStage] = useState("intro"); // intro | testing | results
  const [step, setStep] = useState(0);
  const [levelIndex, setLevelIndex] = useState(2); // start at B1
  const [history, setHistory] = useState([]);
  const [usedIds, setUsedIds] = useState([]);
  const [results, setResults] = useState(null);

  const total = ASSESSMENT_SEQUENCE.length;
  const currentSkill = ASSESSMENT_SEQUENCE[step];
  const currentItem = stage === "testing" ? pickAssessmentItem(currentSkill, levelIndex, usedIds) : null;

  const handleAnswer = async (answer) => {
    const score = gradeAssessmentAnswer(currentItem, answer);
    const entry = { skill: currentItem.skill, level: currentItem.level, score };
    const nextHistory = [...history, entry];
    setHistory(nextHistory);
    setUsedIds((ids) => [...ids, currentItem.id]);

    let nextLevel = levelIndex;
    if (score >= 0.7) nextLevel = Math.min(5, levelIndex + 1);
    else if (score <= 0.35) nextLevel = Math.max(0, levelIndex - 1);
    setLevelIndex(nextLevel);

    if (step === total - 1) {
      const computed = computeAssessmentResults(nextHistory);
      await updateProfile({ assessment: computed, placementComplete: true, englishLevel: computed.overallLevel });
      if (currentUser) await awardActivity(currentUser.email, { type: "placement_assessment", xp: ACTIVITY_XP.placement_assessment, minutes: 10, meta: { overallLevel: computed.overallLevel } });
      setResults(computed);
      setStage("results");
    } else {
      setStep((s) => s + 1);
    }
  };

  if (stage === "intro") return <AssessmentIntro onStart={() => setStage("testing")} onSkip={handleSkip} skipping={skipping} />;
  if (stage === "results" && results) return <AssessmentResults results={results} onFinish={onFinish} />;
  if (currentItem) {
    return <AssessmentQuestion key={currentItem.id} item={currentItem} index={step} total={total} onSubmit={handleAnswer} />;
  }
  return null;
}

/* ---------------------------------------------------------------------- */
/*  Roadmap                                                                */
/* ---------------------------------------------------------------------- */

const SKILL_AREAS = [
  "Speaking", "Listening", "Grammar", "Vocabulary", "Pronunciation",
  "Reading", "Writing", "Professional English", "Academic English",
];

/* One realistic, manageable goal per CEFR level per skill — always matched
   to the learner's current level, never a level ahead. */
const SKILL_GOALS = {
  Speaking: [
    "Introduce yourself and answer simple personal questions.",
    "Have short daily conversations about familiar topics.",
    "Share opinions and describe experiences in conversation.",
    "Discuss a range of topics with reasonable fluency and detail.",
    "Speak fluently on complex topics with clear structure.",
    "Speak with near-native flexibility and precision in any context.",
  ],
  Listening: [
    "Understand very simple, slowly spoken phrases.",
    "Follow short, clear conversations on familiar topics.",
    "Understand the main points of clear speech on familiar matters.",
    "Follow extended speech and most everyday media at natural speed.",
    "Understand extended speech even when it isn't clearly structured.",
    "Understand any spoken language with ease, including fast native speech.",
  ],
  Grammar: [
    "Use the simple present tense and basic sentence patterns.",
    "Use past and future tenses in everyday sentences.",
    "Use conditionals and a wider range of verb tenses accurately.",
    "Use complex sentence structures with fewer errors.",
    "Use advanced grammar structures naturally and flexibly.",
    "Use the full range of grammar with near-native accuracy.",
  ],
  Vocabulary: [
    "Learn everyday words for people, places, and things.",
    "Build vocabulary for daily routines and common situations.",
    "Expand vocabulary to express opinions and feelings.",
    "Learn nuanced vocabulary for varied topics and contexts.",
    "Use idiomatic and precise vocabulary confidently.",
    "Command an extensive, nuanced vocabulary like a native speaker.",
  ],
  Pronunciation: [
    "Practice basic sounds and word stress.",
    "Improve the clarity of common words and short phrases.",
    "Work on sentence rhythm and intonation.",
    "Refine pronunciation for clearer, more natural speech.",
    "Fine-tune intonation and stress for a natural flow.",
    "Aim for highly natural, near-native pronunciation.",
  ],
  Reading: [
    "Understand very short, simple texts and signs.",
    "Read short, simple texts on familiar topics.",
    "Understand the main points of straightforward texts.",
    "Read articles and reports on a range of subjects.",
    "Understand long, complex texts with implicit meaning.",
    "Understand virtually everything you read with ease.",
  ],
  Writing: [
    "Write simple phrases and short personal notes.",
    "Write short, simple messages and descriptions.",
    "Write connected text on familiar topics.",
    "Write clear, detailed text on a range of subjects.",
    "Write well-structured, detailed text on complex topics.",
    "Write clearly and fluently in a sophisticated, appropriate style.",
  ],
  "Professional English": [
    "Learn basic workplace words like job titles and greetings.",
    "Handle simple work-related exchanges, like introductions.",
    "Write simple work emails and take part in basic meetings.",
    "Communicate confidently in meetings and professional writing.",
    "Handle negotiations and presentations with professional fluency.",
    "Operate with near-native fluency in any professional setting.",
  ],
  "Academic English": [
    "Learn basic classroom vocabulary and instructions.",
    "Understand simple academic texts and instructions.",
    "Summarize short academic texts in your own words.",
    "Write structured academic paragraphs with clear arguments.",
    "Write essays and critically analyze academic texts.",
    "Produce sophisticated academic writing and argumentation.",
  ],
};

const PRACTICE_MODE_MAP = {
  Speaking: "freetalk", Listening: "freetalk", Grammar: "grammarpractice", Vocabulary: "vocabulary",
  Pronunciation: "freetalk", Reading: "readingpractice", Writing: "writingcoach",
  "Professional English": "meeting", "Academic English": "readingpractice",
};

/* Onboarding priorities that aren't direct skill names still point learners
   toward the closest relevant skills, so their stated focus is respected. */
const PRIORITY_TO_SKILLS = {
  Speaking: ["Speaking"], Pronunciation: ["Pronunciation"], Grammar: ["Grammar"],
  Vocabulary: ["Vocabulary"], "Academic English": ["Academic English"],
  "Professional English": ["Professional English"],
  Travel: ["Speaking", "Listening"], Meetings: ["Professional English", "Listening"],
  Presentations: ["Speaking", "Professional English"], "Job interviews": ["Professional English", "Speaking"],
};

function levelIndexFromCEFR(str) {
  const i = CEFR_LEVELS.indexOf(str);
  return i === -1 ? 2 : i;
}

function buildRoadmap(profile) {
  if (!profile) return null;
  const assessment = profile.assessment || null;
  const overallIndex = assessment ? assessment.overallIndex : levelIndexFromCEFR(profile.englishLevel);
  const overallLevel = CEFR_LEVELS[overallIndex];
  const nextMilestone = overallIndex < 5 ? CEFR_LEVELS[overallIndex + 1] : "C2 mastery";

  const focusSkills = new Set();
  (assessment?.weakAreas || []).forEach((s) => focusSkills.add(s));
  (profile.priorities || []).forEach((p) => (PRIORITY_TO_SKILLS[p] || []).forEach((s) => focusSkills.add(s)));

  const skills = SKILL_AREAS.map((name) => {
    const assessed = assessment?.categories?.[name];
    const idx = assessed ? assessed.index : overallIndex;
    return {
      name,
      levelIndex: idx,
      level: CEFR_LEVELS[idx],
      goal: SKILL_GOALS[name][idx],
      nextGoal: idx < 5 ? SKILL_GOALS[name][idx + 1] : null,
      focus: focusSkills.has(name),
      assessed: !!assessed,
    };
  });

  const priorityAreaName = assessment?.priorityArea && skills.some((s) => s.name === assessment.priorityArea)
    ? assessment.priorityArea
    : (skills.find((s) => s.focus) || skills[0]).name;
  const prioritySkill = skills.find((s) => s.name === priorityAreaName) || skills[0];

  const recommendedActivity = {
    skill: priorityAreaName,
    mode: PRACTICE_MODE_MAP[priorityAreaName] || "grammarpractice",
    reason: prioritySkill.goal,
  };

  const pathSteps = CEFR_LEVELS.map((lvl, i) => ({
    level: lvl,
    status: i < overallIndex ? "done" : i === overallIndex ? "current" : "locked",
  }));

  return {
    generatedAt: new Date().toISOString(),
    overallIndex, overallLevel, nextMilestone,
    skills, priorityAreaName, prioritySkill,
    todayTarget: prioritySkill.goal,
    recommendedActivity,
    pathSteps,
  };
}

function RoadmapPathStrip({ pathSteps }) {
  const t = useThemeClasses();
  return (
    <div className="flex items-center gap-1.5">
      {pathSteps.map((s, i) => (
        <React.Fragment key={s.level}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className={cx(
                "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border-2",
                s.status === "done" && "bg-teal-600 border-teal-600 text-white",
                s.status === "current" && "border-teal-600 text-teal-700 dark:text-teal-300 bg-teal-600/10",
                s.status === "locked" && cx(t.border, t.textFaint)
              )}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {s.status === "done" ? <Check size={15} /> : s.status === "locked" ? <Lock size={13} /> : s.level}
            </div>
            <span className={cx("text-[10px] font-medium", s.status === "current" ? "text-teal-600 dark:text-teal-400" : t.textFaint)}>
              {s.level}
            </span>
          </div>
          {i < pathSteps.length - 1 && (
            <div className={cx("h-0.5 flex-1 rounded-full", s.status === "done" ? "bg-teal-600" : t.surfaceAlt)} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function RoadmapView({ onBack, onNavigate }) {
  const t = useThemeClasses();
  const { profile } = useAuth();
  const roadmap = React.useMemo(() => buildRoadmap(profile), [profile]);
  if (!roadmap) return null;

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className={cx("h-9 w-9 rounded-full flex items-center justify-center border shrink-0", t.border, t.hover)} aria-label="Back">
          <ArrowLeft size={16} className={t.text} />
        </button>
        <PageHeader title="Your roadmap" subtitle={`${roadmap.overallLevel} now · working toward ${roadmap.nextMilestone}`} />
      </div>

      <Card>
        <SectionHeading title="CEFR path" subtitle="A1 to C2" />
        <RoadmapPathStrip pathSteps={roadmap.pathSteps} />
      </Card>

      <div>
        <SectionHeading title="Goals by skill" subtitle="Matched to your current level" />
        <div className="space-y-3">
          {roadmap.skills.map((s) => (
            <Card key={s.name}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <p className={cx("text-sm font-semibold truncate", t.text)}>{s.name}</p>
                  {s.focus && <Badge tone="amber"><UIText text={"Priority"}/> </Badge>}
                </div>
                <Badge tone="teal">{s.level}</Badge>
              </div>
              <p className={cx("text-sm", t.textSoft)}>{s.goal}</p>
              {s.nextGoal && (
                <p className={cx("text-xs mt-2 flex items-center gap-1.5", t.textFaint)}>
                  <Lock size={11} /><UIText text={"Next up at"}/> {CEFR_LEVELS[s.levelIndex + 1]}: {s.nextGoal}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>

      <PrimaryButton full icon={ArrowRight} onClick={() => onNavigate(PRACTICE_MODE_MAP[roadmap.priorityAreaName] ? "practice" : "practice")}><UIText text={"Practice your priority area"}/> </PrimaryButton>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Learning memory: Personal Error Bank + Vocabulary Bank                 */
/* ---------------------------------------------------------------------- */

const ERROR_CATEGORIES = [
  "Grammar", "Vocabulary", "Preposition", "Article", "Tense", "Word order",
  "Naturalness", "Collocation", "Spelling", "Sentence structure",
];

const WEAK_AREA_THRESHOLD = 3; // combined frequency at which a category is flagged

const errorsKey = (email) => `errors:${email.trim().toLowerCase()}`;
const vocabKey = (email) => `vocab:${email.trim().toLowerCase()}`;

async function loadList(key) {
  const raw = await safeGet(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
async function saveList(key, list) {
  await safeSet(key, JSON.stringify(list));
}

/* ----- Error Bank ----- */

function guessErrorCategory(original = "", correct = "", explanation = "") {
  const text = `${original} ${correct} ${explanation}`.toLowerCase();
  const prepositions = ["in", "on", "at", "to", "for", "of", "with", "about", "from", "into", "onto"];
  if (/\bpreposition/.test(text) || prepositions.some((p) => new RegExp(`\\b${p}\\b`).test(text) && /\b(should be|instead of|not)\b/.test(text))) return "Preposition";
  if (/\barticle\b|\ba\/an\b|\bthe\b.*\barticle/.test(text)) return "Article";
  if (/\btense\b|\bpast\b|\bpresent perfect\b|\bfuture\b|\bconjugat/.test(text)) return "Tense";
  if (/\bword order\b|\binversion\b/.test(text)) return "Word order";
  if (/\bcollocation\b|\bgo together\b/.test(text)) return "Collocation";
  if (/\bspell/.test(text)) return "Spelling";
  if (/\bnatural\b|\bmore natural\b|\bsounds better\b/.test(text)) return "Naturalness";
  if (/\bsentence structure\b|\bclause\b|\brun-on\b|\bfragment\b/.test(text)) return "Sentence structure";
  if (/\bvocabulary\b|\bword choice\b|\bmeaning\b/.test(text)) return "Vocabulary";
  return "Grammar";
}

function similarErrorIndex(list, correctText) {
  const norm = (s) => (s || "").toLowerCase().trim().replace(/[.!?]+$/, "");
  const target = norm(correctText);
  return list.findIndex((e) => norm(e.correct) === target);
}

/* Adds a new error, or — if this exact correction has been logged before —
   bumps its frequency instead of duplicating it, which is what powers
   recurring-pattern / weak-area detection. */
function addErrorEntry(list, entry) {
  const idx = similarErrorIndex(list, entry.correct);
  const now = new Date().toISOString();
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], frequency: (next[idx].frequency || 1) + 1, lastSeen: now };
    return next;
  }
  const newEntry = {
    id: genId(),
    original: entry.original || "",
    correct: entry.correct || "",
    natural: entry.natural || "",
    explanation: entry.explanation || "",
    category: entry.category || "Grammar",
    frequency: 1,
    date: now,
    lastSeen: now,
    mastery: "new",
    repetitions: 0,
    consecutiveCorrect: 0,
  };
  return [newEntry, ...list];
}

function recordErrorPractice(list, id, wasCorrect) {
  return list.map((e) => {
    if (e.id !== id) return e;
    const consecutiveCorrect = wasCorrect ? (e.consecutiveCorrect || 0) + 1 : 0;
    const repetitions = (e.repetitions || 0) + 1;
    const mastery = consecutiveCorrect >= 3 ? "mastered" : "practicing";
    return { ...e, repetitions, consecutiveCorrect, mastery };
  });
}

function detectWeakAreas(list) {
  const totals = {};
  list.forEach((e) => {
    totals[e.category] = (totals[e.category] || 0) + (e.frequency || 1);
  });
  return Object.entries(totals)
    .filter(([, count]) => count >= WEAK_AREA_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));
}

/* Detects the Tutor's required correction template and pulls out its parts,
   so a correction can be saved to the Error Bank with one tap. */
function parseCorrectionMessage(text) {
  if (!text || !/you said:/i.test(text)) return null;
  const grab = (label, stopLabels) => {
    const stopPattern = stopLabels.map((s) => `${s}:`).join("|");
    const re = new RegExp(`${label}:\\s*([\\s\\S]*?)(?:\\n\\s*(?:${stopPattern})|$)`, "i");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };
  const original = grab("You said", ["Correct", "More natural", "Why", "Try again"]);
  const correct = grab("Correct", ["More natural", "Why", "Try again"]);
  const natural = grab("More natural", ["Why", "Try again"]);
  const explanation = grab("Why", ["Try again"]);
  if (!original && !correct) return null;
  return { original, correct, natural, explanation };
}

/* ----- Vocabulary Bank ----- */

const REVIEW_TYPES = ["meaning", "fill", "sentence", "collocation", "natural", "recognition"];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function defaultVocabEntry(fields) {
  const now = new Date().toISOString();
  return {
    id: genId(),
    word: fields.word || "",
    meaning: fields.meaning || "",
    ipa: fields.ipa || "",
    partOfSpeech: fields.partOfSpeech || "",
    example: fields.example || "",
    naturalExample: fields.naturalExample || "",
    collocations: fields.collocations || [],
    kurdishMeaning: fields.kurdishMeaning || "",
    cefr: fields.cefr || "B1",
    dateLearned: now,
    mastery: "new",
    favorite: false,
    repetitions: 0,
    interval: 0,
    easeFactor: 2.5,
    lastReviewedAt: null,
    nextReviewDate: now,
  };
}

/* Simplified SM-2: correct recall lengthens the interval (and eases up
   slightly); incorrect recall resets repetitions and shortens it back
   down to a 1-day interval. */
function scheduleVocabReview(entry, wasCorrect) {
  const now = new Date();
  let { repetitions = 0, interval = 0, easeFactor = 2.5 } = entry;
  if (wasCorrect) {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * easeFactor);
    easeFactor = Math.min(3, easeFactor + 0.1);
  } else {
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }
  const mastery = repetitions >= 4 ? "mastered" : repetitions >= 1 ? "learning" : "new";
  return {
    ...entry,
    repetitions, interval, easeFactor, mastery,
    lastReviewedAt: now.toISOString(),
    nextReviewDate: addDays(now, interval).toISOString(),
  };
}

function isDue(entry) {
  return new Date(entry.nextReviewDate) <= new Date();
}

/* ---------------------------------------------------------------------- */
/*  Gamification & evidence-based progress tracking                        */
/* ---------------------------------------------------------------------- */

/* Single source of truth for "real activity happened": every completed
   lesson, practice session, call, or review appends one entry here. XP,
   streak, weekly time, and lesson counts are always DERIVED from this log
   (never stored as a separately-mutable counter), so they can't drift from
   what actually happened and nothing has to be invented. */

const activityLogKey = (email) => `activity_log:${email.trim().toLowerCase()}`;
const progressSnapshotKey = (email) => `progress_snapshots:${email.trim().toLowerCase()}`;
const achievementsKey = (email) => `achievements_earned:${email.trim().toLowerCase()}`;

const ACTIVITY_XP = {
  daily_lesson: 30,
  course_lesson: 20,
  course_checkpoint: 40,
  course_assessment: 80,
  placement_assessment: 100,
  onboarding: 20,
  vocab_review: 5, // per word
  mistake_practice: 5, // per item
  tutor_session: 5, // per learner turn, capped
  practice_session: 15, // flat, plus score bonus where available
  ai_call: 5, // per learner turn, capped
};

async function awardActivity(email, { type, xp, minutes = 0, meta = {} }) {
  if (!email) return null;
  const list = await loadList(activityLogKey(email));
  const entry = { id: genId(), date: new Date().toISOString(), type, xp: Math.max(0, Math.round(xp)), minutes: Math.max(0, Math.round(minutes)), meta };
  const next = [entry, ...list].slice(0, 500);
  await saveList(activityLogKey(email), next);
  return next;
}

function dayKey(isoDate) {
  return new Date(isoDate).toISOString().slice(0, 10);
}

function computeXPTotal(log) {
  return log.reduce((sum, e) => sum + (e.xp || 0), 0);
}

function computeLevelInfo(xpTotal) {
  const step = 200;
  const level = Math.floor(xpTotal / step) + 1;
  const xpIntoLevel = xpTotal % step;
  return { level, xpIntoLevel, xpForNextLevel: step, xpToNext: step - xpIntoLevel };
}

function computeStreak(log) {
  const days = new Set(log.map((e) => dayKey(e.date)));
  if (days.size === 0) return { current: 0, best: 0 };
  let current = 0;
  const cursor = new Date();
  // Count backward from today (or yesterday, if nothing logged yet today).
  if (!days.has(dayKey(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.toISOString()))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  // Best streak across all recorded days.
  const sortedDays = [...days].sort();
  let best = 0, run = 0, prev = null;
  for (const d of sortedDays) {
    if (prev) {
      const diff = (new Date(d) - new Date(prev)) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current) };
}

function minutesInRange(log, fromDaysAgo, toDaysAgo) {
  const now = Date.now();
  const from = now - fromDaysAgo * 86400000;
  const to = now - toDaysAgo * 86400000;
  return log
    .filter((e) => {
      const t = new Date(e.date).getTime();
      return t > from && t <= to;
    })
    .reduce((sum, e) => sum + (e.minutes || 0), 0);
}

function minutesOnDay(log, daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const k = dayKey(d.toISOString());
  return log.filter((e) => dayKey(e.date) === k).reduce((sum, e) => sum + (e.minutes || 0), 0);
}

function minutesThisWeek(log) {
  let total = 0;
  for (let i = 0; i < 7; i++) total += minutesOnDay(log, i);
  return total;
}

function xpInRange(log, fromDaysAgo, toDaysAgo) {
  const now = Date.now();
  const from = now - fromDaysAgo * 86400000;
  const to = now - toDaysAgo * 86400000;
  return log
    .filter((e) => { const t = new Date(e.date).getTime(); return t > from && t <= to; })
    .reduce((sum, e) => sum + (e.xp || 0), 0);
}

function computeLessonsCompleted(log) {
  return log.filter((e) => e.type === "daily_lesson" || e.type === "course_lesson").length;
}

function weeklyMinutesSeries(log) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { day: days[d.getDay()], key: dayKey(d.toISOString()), minutes: 0 };
  });
  log.forEach((e) => {
    const k = dayKey(e.date);
    const bucket = buckets.find((b) => b.key === k);
    if (bucket) bucket.minutes += e.minutes || 0;
  });
  return buckets.map(({ day, minutes }) => ({ day, minutes }));
}

/* Fluency and naturalness have no direct assessment category, so they're
   only ever shown when real supporting records exist — Fast Speak scores
   for fluency, logged Naturalness-category errors for naturalness. */
function fluencyEvidence(practiceHistory) {
  const sessions = (practiceHistory || []).filter((p) => p.modeId === "fastspeak" && typeof p.score === "number");
  if (sessions.length === 0) return null;
  const avg = sessions.reduce((s, p) => s + p.score, 0) / sessions.length;
  return { sessions: sessions.length, avgPct: Math.round(avg * 100) };
}
function naturalnessEvidence(errors) {
  const items = (errors || []).filter((e) => e.category === "Naturalness");
  if (items.length === 0) return null;
  const mastered = items.filter((e) => e.mastery === "mastered").length;
  return { total: items.length, masteredPct: Math.round((mastered / items.length) * 100) };
}

/* Trend arrows only ever compare two REAL recorded snapshots. If there isn't
   a snapshot far enough back, the trend is "no data" rather than a guess. */
function computeTrend(snapshots, metricFn, daysBack = 7, tolerance = 0.05) {
  if (!snapshots || snapshots.length < 2) return null;
  const latest = snapshots[snapshots.length - 1];
  const targetTime = new Date(latest.date).getTime() - daysBack * 86400000;
  let best = null, bestDiff = Infinity;
  for (const s of snapshots.slice(0, -1)) {
    const diff = Math.abs(new Date(s.date).getTime() - targetTime);
    if (diff < bestDiff) { bestDiff = diff; best = s; }
  }
  // Require the comparison point to be at least 2 days old so a same-day
  // reload never counts as "history".
  if (!best || (new Date(latest.date) - new Date(best.date)) / 86400000 < 2) return null;
  const a = metricFn(best), b = metricFn(latest);
  if (a === null || b === null || a === undefined || b === undefined) return null;
  const delta = b - a;
  const scale = Math.max(Math.abs(a), 1);
  if (Math.abs(delta) / scale <= tolerance) return "stable";
  return delta > 0 ? "up" : "down";
}

function TrendIndicator({ trend }) {
  const t = useThemeClasses();
  if (!trend) return <span className={cx("text-[11px]", t.textFaint)}><UIText text={"Not enough history yet"}/> </span>;
  if (trend === "up") return <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5"><TrendingUp size={11} /><UIText text={"Improving"}/> </span>;
  if (trend === "down") return <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-0.5"><TrendingDown size={11} /><UIText text={"Needs attention"}/> </span>;
  return <span className={cx("text-[11px] font-semibold inline-flex items-center gap-0.5", t.textSoft)}><UIText text={"→ Stable"}/> </span>;
}

async function recordDailySnapshot(email, snapshot) {
  const list = await loadList(progressSnapshotKey(email));
  const today = dayKey(new Date().toISOString());
  const idx = list.findIndex((s) => dayKey(s.date) === today);
  const entry = { date: new Date().toISOString(), ...snapshot };
  let next;
  if (idx >= 0) { next = [...list]; next[idx] = entry; }
  else next = [...list, entry];
  next = next.slice(-90);
  await saveList(progressSnapshotKey(email), next);
  return next;
}

/* ----- Achievements: evaluated against real stored data, earned date persisted once unlocked ----- */

const ACHIEVEMENT_DEFS = [
  { id: "first_lesson", title: "First lesson", icon: CalendarCheck, check: (d) => d.lessonsCompleted >= 1 },
  { id: "streak_7", title: "7-day streak", icon: Flame, check: (d) => d.streakBest >= 7 },
  { id: "streak_30", title: "30-day streak", icon: ShieldCheck, check: (d) => d.streakBest >= 30 },
  { id: "first_call", title: "First AI Call", icon: PhoneCall, check: (d) => d.hasCall },
  { id: "vocab_10", title: "10 words saved", icon: BookMarked, check: (d) => d.vocabTotal >= 10 },
  { id: "vocab_mastered_10", title: "10 words mastered", icon: Award, check: (d) => d.vocabMastered >= 10 },
  { id: "course_complete", title: "First course completed", icon: Trophy, check: (d) => d.coursesCompleted >= 1 },
  { id: "level_b1", title: "Reached B1", icon: GraduationCap, check: (d) => d.overallIndex >= 2 },
  { id: "level_b2", title: "Reached B2", icon: Trophy, check: (d) => d.overallIndex >= 3 },
];

async function evaluateAchievements(email, data) {
  const earnedRaw = await loadList(achievementsKey(email));
  const earnedMap = Object.fromEntries(earnedRaw.map((e) => [e.id, e]));
  let changed = false;
  ACHIEVEMENT_DEFS.forEach((def) => {
    if (!earnedMap[def.id] && def.check(data)) {
      earnedMap[def.id] = { id: def.id, earnedAt: new Date().toISOString() };
      changed = true;
    }
  });
  const next = Object.values(earnedMap);
  if (changed) await saveList(achievementsKey(email), next);
  return next;
}

/* ----- Shared hook: loads + derives everything the Home and Progress
   dashboards need from real stored records only. ----- */

function useProgressData() {
  const { currentUser, profile } = useAuth();
  const roadmap = useMemo(() => buildRoadmap(profile), [profile]);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      const [activityLog, vocab, errors, practiceHistory, courseProgressRaw] = await Promise.all([
        loadList(activityLogKey(currentUser.email)),
        loadList(vocabKey(currentUser.email)),
        loadList(errorsKey(currentUser.email)),
        loadList(practiceHistoryKey(currentUser.email)),
        safeGet(courseProgressKey(currentUser.email)),
      ]);
      const courseProgress = courseProgressRaw ? JSON.parse(courseProgressRaw) : {};

      const vocabMastered = vocab.filter((v) => v.mastery === "mastered").length;
      const coursesCompleted = COURSE_CATALOG.filter((c) => getCourseState(courseProgress, c.id).completedAt).length;
      const xpTotal = computeXPTotal(activityLog);
      const streak = computeStreak(activityLog);
      const lessonsCompleted = computeLessonsCompleted(activityLog);

      await recordDailySnapshot(currentUser.email, {
        overallIndex: roadmap ? roadmap.overallIndex : null,
        categories: profile?.assessment?.categories
          ? Object.fromEntries(Object.entries(profile.assessment.categories).map(([k, v]) => [k, v ? v.score : null]))
          : {},
        xpTotal,
        weeklyMinutes: minutesThisWeek(activityLog),
        vocabMastered,
        lessonsCompleted,
      });
      const snapshots = await loadList(progressSnapshotKey(currentUser.email));

      const achievements = await evaluateAchievements(currentUser.email, {
        lessonsCompleted, streakBest: streak.best,
        hasCall: activityLog.some((e) => e.type === "ai_call"),
        vocabTotal: vocab.length, vocabMastered, coursesCompleted,
        overallIndex: roadmap ? roadmap.overallIndex : -1,
      });

      if (!cancelled) {
        setData({ activityLog, vocab, errors, practiceHistory, courseProgress, snapshots, achievements, vocabMastered, coursesCompleted, xpTotal, streak, lessonsCompleted });
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email, profile?.assessment?.completedAt]);

  return { loaded, roadmap, profile, currentUser, ...(data || {}) };
}

/* ---------------------------------------------------------------------- */
/*  Daily Lesson generator                                                 */
/* ---------------------------------------------------------------------- */

/* Small concept bank spanning A1–C2. Each concept doubles as a guided
   practice + active recall + mini challenge task, graded with the same
   heuristic engine as the placement assessment. */
const DAILY_CONCEPTS = [
  { id: "dc0a", level: 0, category: "Grammar", title: "Present Simple for Routines",
    explanation: "Use present simple for habits and routines — add -s for he/she/it.",
    example: "She works in a hospital. I wake up at 7.",
    guided: { type: "fill", prompt: "Complete: He ___ (drink) coffee every morning.", accepted: ["drinks"] },
    recall: { type: "long", prompt: "Name one thing you do every day, in a full sentence.", minWords: 3 },
    challenge: { type: "long", prompt: "Write 2 sentences about your morning routine.", minWords: 8 } },
  { id: "dc0v", level: 0, category: "Vocabulary", title: "Everyday Objects",
    explanation: "Common household words help you describe your surroundings.",
    example: "There is a lamp on the table.",
    guided: { type: "fill", prompt: "Complete: I keep my clothes in the ___.", accepted: ["closet", "wardrobe", "drawer"] },
    recall: { type: "long", prompt: "Name two objects in your kitchen.", minWords: 2 },
    challenge: { type: "long", prompt: "Describe your bedroom in 2–3 sentences.", minWords: 10 } },
  { id: "dc1a", level: 1, category: "Tense", title: "Past Simple",
    explanation: "Use past simple for finished actions — regular verbs add -ed.",
    example: "They visited their grandparents last week.",
    guided: { type: "fill", prompt: "Complete: She ___ (watch) a movie yesterday.", accepted: ["watched"] },
    recall: { type: "long", prompt: "What did you do yesterday? Answer in one sentence.", minWords: 4 },
    challenge: { type: "long", prompt: "Write about your last weekend in 2–3 sentences.", minWords: 15 } },
  { id: "dc1v", level: 1, category: "Vocabulary", title: "Comparatives",
    explanation: "Use comparatives to compare two things — add -er or use 'more'.",
    example: "This book is more interesting than that one.",
    guided: { type: "fill", prompt: "Complete: My city is ___ (big) than my hometown.", accepted: ["bigger"] },
    recall: { type: "long", prompt: "Compare two cities you know, in one sentence.", minWords: 5 },
    challenge: { type: "long", prompt: "Compare two of your friends in a short paragraph.", minWords: 15 } },
  { id: "dc2g", level: 2, category: "Tense", title: "Present Perfect",
    explanation: "Use present perfect for experiences or actions with a present result — have/has + past participle.",
    example: "I have visited Paris twice.",
    guided: { type: "fill", prompt: "Complete: She ___ (never/try) sushi.", accepted: ["has never tried", "never has tried"] },
    recall: { type: "long", prompt: "Name something you have never done, using present perfect.", minWords: 4 },
    challenge: { type: "long", prompt: "Write 2–3 sentences about your life experiences using present perfect.", minWords: 20 } },
  { id: "dc2p", level: 2, category: "Preposition", title: "Prepositions of Time",
    explanation: "Use 'in' for months/years, 'on' for days/dates, 'at' for clock times.",
    example: "The meeting is on Monday at 9 AM.",
    guided: { type: "fill", prompt: "Complete: My birthday is ___ July.", accepted: ["in"] },
    recall: { type: "long", prompt: "Say when your workday usually starts, using 'at'.", minWords: 4 },
    challenge: { type: "long", prompt: "Describe your weekly schedule using in/on/at.", minWords: 20 } },
  { id: "dc3c", level: 3, category: "Grammar", title: "Second Conditional",
    explanation: "Use the second conditional for hypothetical situations — if + past simple, would + base verb.",
    example: "If I had more time, I would learn another language.",
    guided: { type: "fill", prompt: "Complete: If I ___ (be) you, I would apply for the job.", accepted: ["were"] },
    recall: { type: "long", prompt: "Finish: 'If I won the lottery, I would...'", minWords: 5 },
    challenge: { type: "long", prompt: "Write about a hypothetical change you'd make in your life.", minWords: 25 } },
  { id: "dc3n", level: 3, category: "Naturalness", title: "Phrasal Verbs",
    explanation: "Phrasal verbs sound more natural than formal single verbs in everyday speech.", 
    example: "'Give up' sounds more natural than 'abandon' in casual conversation.",
    guided: { type: "fill", prompt: "Complete naturally: I need to ___ up early tomorrow.", accepted: ["wake"] },
    recall: { type: "long", prompt: "Use a phrasal verb meaning 'to stop' in a sentence.", minWords: 4 },
    challenge: { type: "long", prompt: "Rewrite a formal sentence using two phrasal verbs.", minWords: 15 } },
  { id: "dc4g", level: 4, category: "Grammar", title: "Passive Voice",
    explanation: "Use passive voice when the action matters more than who did it — be + past participle.",
    example: "The report was submitted yesterday.",
    guided: { type: "fill", prompt: "Rewrite passively: 'They built the bridge in 1990.' → 'The bridge ___ in 1990.'", accepted: ["was built"] },
    recall: { type: "long", prompt: "Write one sentence about work using passive voice.", minWords: 5 },
    challenge: { type: "long", prompt: "Describe a process (e.g. how coffee is made) using passive voice.", minWords: 30 } },
  { id: "dc4s", level: 4, category: "Sentence structure", title: "Advanced Connectors",
    explanation: "Connectors like 'despite', 'nevertheless', and 'given that' add nuance to arguments.",
    example: "Despite the rain, the event went ahead.",
    guided: { type: "construct", prompt: "Write a sentence using 'nevertheless'.", requiredWord: "nevertheless", minWords: 6 },
    recall: { type: "long", prompt: "Name a connector used to show contrast.", minWords: 1 },
    challenge: { type: "long", prompt: "Write a short paragraph using at least two advanced connectors.", minWords: 35 } },
  { id: "dc5g", level: 5, category: "Grammar", title: "Inversion for Emphasis",
    explanation: "Inversion after negative adverbials adds formal emphasis — e.g. 'Rarely have I seen...'",
    example: "Never have I encountered such dedication.",
    guided: { type: "construct", prompt: "Write a sentence starting with 'Rarely have I...'", requiredWord: "rarely", minWords: 6 },
    recall: { type: "long", prompt: "Name a negative adverb used to trigger inversion (e.g. never, rarely).", minWords: 1 },
    challenge: { type: "long", prompt: "Write a formal paragraph using one inverted sentence.", minWords: 35 } },
  { id: "dc5n", level: 5, category: "Naturalness", title: "Nuanced Modality",
    explanation: "Modal expressions like 'might well' or 'could conceivably' express careful, nuanced certainty.",
    example: "The policy might well backfire if not carefully implemented.",
    guided: { type: "construct", prompt: "Write a sentence using 'might well'.", requiredWord: "might well", minWords: 6 },
    recall: { type: "long", prompt: "Give one modal expression that softens a strong claim.", minWords: 1 },
    challenge: { type: "long", prompt: "Write a nuanced opinion paragraph using careful modal language.", minWords: 35 } },
];

const dailyLessonKey = (email) => `daily_lesson:${email.trim().toLowerCase()}`;
const dailyHistoryKey = (email) => `daily_lesson_history:${email.trim().toLowerCase()}`;
const todayStamp = () => new Date().toISOString().slice(0, 10);

function pickDailyConcept(levelIndex, weakCategory, recentIds) {
  let pool = DAILY_CONCEPTS.filter((c) => c.level === levelIndex);
  if (pool.length === 0) pool = DAILY_CONCEPTS.filter((c) => Math.abs(c.level - levelIndex) <= 1);
  if (pool.length === 0) pool = DAILY_CONCEPTS;
  const notRecent = pool.filter((c) => !recentIds.includes(c.id));
  const usable = notRecent.length ? notRecent : pool;
  const seed = new Date().toISOString().slice(0, 10).split("-").join("");
  const seedNum = Number(seed);
  // Surface the weak-area concept regularly, but not every single day —
  // alternating keeps the lesson from feeling identical day after day even
  // when one weakness dominates the error bank.
  const wantsWeakFocus = weakCategory && seedNum % 2 === 0;
  const weakMatch = wantsWeakFocus ? usable.filter((c) => c.category === weakCategory) : [];
  const finalPool = weakMatch.length ? weakMatch : usable;
  const idx = seedNum % finalPool.length;
  return finalPool[idx];
}

function buildDailyLesson(profile, roadmap, errorsList, vocabList, history) {
  const levelIndex = roadmap?.overallIndex ?? CEFR_LEVELS.indexOf(profile?.englishLevel) ?? 2;
  const weakAreas = detectWeakAreas(errorsList);
  const weakCategory = weakAreas[0]?.category || null;
  const recentIds = (history || []).slice(0, 4).map((h) => h.conceptId);
  const concept = pickDailyConcept(levelIndex, weakCategory, recentIds);

  const dueVocab = vocabList.filter(isDue).slice(0, 3);
  const recentErrors = [...errorsList].sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen)).slice(0, 2);

  const quickReview = {
    errors: recentErrors,
    vocab: dueVocab,
    text: recentErrors.length || dueVocab.length
      ? "Let's warm up with a couple of things from your recent practice."
      : "No recent mistakes or due words yet — let's dive into something new.",
  };

  return {
    date: todayStamp(),
    levelIndex,
    level: CEFR_LEVELS[levelIndex],
    conceptId: concept.id,
    concept,
    quickReview,
    todaysGoal: roadmap?.todayTarget || `${profile?.dailyGoalMinutes || 20} min focused on ${concept.category}`,
    vocabToReinforce: dueVocab,
  };
}

async function loadDailyLesson(email, profile, roadmap, errorsList, vocabList) {
  const raw = await safeGet(dailyLessonKey(email));
  const history = await loadList(dailyHistoryKey(email));
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved.date === todayStamp()) return { lesson: saved, history };
    } catch (e) { /* fall through */ }
  }
  const lesson = buildDailyLesson(profile, roadmap, errorsList, vocabList, history);
  const withProgress = { ...lesson, stage: 0, done: false };
  await safeSet(dailyLessonKey(email), JSON.stringify(withProgress));
  return { lesson: withProgress, history };
}

/* ---------------------------------------------------------------------- */
/*  Course Library                                                         */
/* ---------------------------------------------------------------------- */

const COURSE_META = [
  { id: "everyday", title: "Everyday English", levelRange: "A1–B1", description: "Real-life conversations, routines, and social English." },
  { id: "academic", title: "Academic English", levelRange: "B2–C1", description: "Essays, lectures, and academic discussion skills." },
  { id: "professional", title: "Professional English", levelRange: "B1–C1", description: "Emails, reports, and workplace communication." },
  { id: "scientific", title: "Scientific English", levelRange: "B2–C1", description: "Reading and writing about scientific topics." },
  { id: "medical", title: "Medical English", levelRange: "B1–C1", description: "Healthcare vocabulary and patient communication." },
  { id: "travel", title: "Travel English", levelRange: "A1–B1", description: "Airports, hotels, and getting around confidently." },
  { id: "meetings", title: "Meetings", levelRange: "B1–B2", description: "Leading and participating in work meetings." },
  { id: "presentations", title: "Presentations", levelRange: "B2–C1", description: "Structuring and delivering clear presentations." },
  { id: "interviews", title: "Job Interviews", levelRange: "B1–B2", description: "Answering common interview questions with confidence." },
  { id: "advanced", title: "Advanced Conversation", levelRange: "C1–C2", description: "Nuanced, natural conversation on complex topics." },
];

/* Hand-authored real lesson content for the required A2 / B1 / B2 / C1 samples. */
const COURSE_LESSONS = {
  everyday: [
    { id: "ev-l1", title: "Talking About Your Day", level: 1, category: "Tense",
      explanation: "Describe your day using past simple for finished actions.",
      example: "I woke up early, had breakfast, and went to work.",
      guided: { type: "long", prompt: "Write 2–3 sentences about what you did today.", minWords: 12 } },
    { id: "ev-l2", title: "Making Plans and Suggestions", level: 2, category: "Naturalness",
      explanation: "Use natural phrases like 'How about...' or 'Why don't we...' to suggest plans.",
      example: "How about we meet at 7 for dinner?",
      guided: { type: "construct", prompt: "Suggest a plan using 'How about'.", requiredWord: "how about", minWords: 5 } },
  ],
  professional: [
    { id: "pr-l1", title: "Effective Emails", level: 3, category: "Sentence structure",
      explanation: "Professional emails are concise, polite, and clearly structured — greeting, purpose, action, closing.",
      example: "Hi Sam, Following up on our call — could you send the report by Friday? Thanks, Alex.",
      guided: { type: "long", prompt: "Write a short professional email requesting a meeting.", minWords: 25 } },
    { id: "pr-l2", title: "Giving Updates in Meetings", level: 2, category: "Vocabulary",
      explanation: "Use phrases like 'we're on track' or 'there's a slight delay' to update a team clearly.",
      example: "We're on track for the deadline, but there's a slight delay on testing.",
      guided: { type: "long", prompt: "Write a one-sentence project status update.", minWords: 8 } },
  ],
  academic: [
    { id: "ac-l1", title: "Structuring an Argument", level: 4, category: "Sentence structure",
      explanation: "Academic arguments state a claim, support it with evidence, and address a counterargument.",
      example: "While some argue remote work reduces collaboration, evidence suggests output remains stable.",
      guided: { type: "construct", prompt: "Write a sentence that states a claim and acknowledges a counterargument, using 'while'.", requiredWord: "while", minWords: 12 } },
    { id: "ac-l2", title: "Academic Vocabulary", level: 3, category: "Vocabulary",
      explanation: "Academic writing favors precise words like 'demonstrate' or 'indicate' over casual ones like 'show'.",
      example: "The data indicates a strong correlation between the two variables.",
      guided: { type: "long", prompt: "Rewrite: 'The results show a big change.' using more academic vocabulary.", minWords: 6 } },
  ],
  advanced: [
    { id: "adv-l1", title: "Nuanced Opinions", level: 5, category: "Naturalness",
      explanation: "Native-like speakers hedge opinions with phrases like 'I'd argue that' or 'it's not unreasonable to think'.",
      example: "I'd argue that the policy, while well-intentioned, overlooks smaller businesses.",
      guided: { type: "construct", prompt: "Write a nuanced opinion sentence using 'I'd argue that'.", requiredWord: "i'd argue", minWords: 10 } },
  ],
};

function buildCourseCatalog() {
  return COURSE_META.map((meta) => {
    const authored = (extraCourses[meta.id] || COURSE_LESSONS[meta.id] || []).map(l => ({...l,guided:authoredChecks[l.id] || l.guided}));
    if(authored.length < 2) throw new Error("Incomplete course content: " + meta.id);
    const lessonsA = [authored[0]];
    const lessonsB = [authored[1]];
    const modules = [
      { id: `${meta.id}-m1`, title: "Foundations", lessons: lessonsA,
        checkpoint: { ...lessonsA[0].guided, id: `${meta.id}-m1-cp` } },
      { id: `${meta.id}-m2`, title: "In Practice", lessons: lessonsB,
        checkpoint: { ...lessonsB[0].guided, id: `${meta.id}-m2-cp` } },
    ];
    return {
      ...meta,
      modules,
      assessment: { type:"mcq",id: `${meta.id}-assessment`,prompt:`Which statement is consistent with both lessons in ${meta.title}?`, options:[`${lessonsA[0].guided.accepted[0]} / ${lessonsB[0].guided.accepted[0]}`,`${lessonsA[0].guided.options.find(o=>o!==lessonsA[0].guided.accepted[0])} / ${lessonsB[0].guided.options.find(o=>o!==lessonsB[0].guided.accepted[0])}`,`${lessonsA[0].guided.options.find(o=>o!==lessonsA[0].guided.accepted[0])} / ${lessonsB[0].guided.accepted[0]}`],accepted:[`${lessonsA[0].guided.accepted[0]} / ${lessonsB[0].guided.accepted[0]}`] },
    };
  });
}

const COURSE_CATALOG = buildCourseCatalog();

const courseProgressKey = (email) => `course_progress:${email.trim().toLowerCase()}`;

function defaultCourseState() {
  return { modules: {}, assessmentPassed: false, assessmentScore: 0, startedAt: null, completedAt: null };
}

function getCourseState(progress, courseId) {
  return progress[courseId] || defaultCourseState();
}

function getModuleState(courseState, moduleId) {
  return courseState.modules[moduleId] || { lessonsCompleted: [], checkpointPassed: false, checkpointScore: 0 };
}

function isModuleUnlocked(course, courseState, moduleIndex) {
  if (moduleIndex === 0) return true;
  const prev = course.modules[moduleIndex - 1];
  const prevState = getModuleState(courseState, prev.id);
  return prevState.checkpointPassed;
}

function computeCourseProgress(course, courseState) {
  const totalUnits = course.modules.reduce((n, m) => n + m.lessons.length + 1, 0) + 1; // +1 checkpoint/module, +1 assessment
  let done = 0;
  course.modules.forEach((m) => {
    const ms = getModuleState(courseState, m.id);
    done += (ms.lessonsCompleted || []).length;
    if (ms.checkpointPassed) done += 1;
  });
  if (courseState.assessmentPassed) done += 1;
  return Math.round((done / totalUnits) * 100);
}

/* ---------------------------------------------------------------------- */
/*  Onboarding                                                             */
/* ---------------------------------------------------------------------- */

function OnboardingProgress({ step, total }) {
  const t = useThemeClasses();
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className={cx("text-xs font-medium", t.textSoft)}><UIText text={"Step"}/> {step + 1}<UIText text={"of"}/> {total}</span>
      </div>
      <div className={cx("h-1.5 w-full rounded-full overflow-hidden", t.surfaceAlt)}>
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-300"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function OnboardingShell({ step, total, onBack, onSkip, onContinue, continueDisabled, continueLabel, skippable, children }) {
  const t = useThemeClasses();
  const { isRTL } = useAuth();
  return (
    <div className={cx("min-h-screen flex flex-col", t.bg)}>
      <div className="flex items-center justify-between px-5 py-4">
        <Logo compact />
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <div className="max-w-md mx-auto pt-2">
          <OnboardingProgress step={step} total={total} />
          {children}
        </div>
      </div>
      <div className={cx("fixed bottom-0 inset-x-0 border-t px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]", t.surface, t.border)}>
        <div className="max-w-md mx-auto flex items-center gap-3">
          {step > 0 ? (
            <button
              onClick={onBack}
              className={cx("h-12 w-12 rounded-xl border flex items-center justify-center shrink-0", t.border, t.hover)}
              aria-label="Back"
            >
              {isRTL ? <ArrowLeft size={16} className={cx("rotate-180", t.text)} /> : <ArrowLeft size={16} className={t.text} />}
            </button>
          ) : (
            <div className="w-12 shrink-0" />
          )}
          {skippable && (
            <button
              onClick={onSkip}
              className={cx("h-12 px-4 rounded-xl text-sm font-semibold shrink-0", t.textSoft, t.hover)}
            >
              <UIText text={"Skip"}/>
            </button>
          )}
          <PrimaryButton full onClick={onContinue} className={cx(continueDisabled && "opacity-40 pointer-events-none")} icon={ArrowRight}>
            {continueLabel || "Continue"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function OnboardingFlow({ onComplete }) {
  const t = useThemeClasses();
  const { profile, updateProfile, currentUser } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    nativeLanguage: profile?.nativeLanguage || "",
    targetLanguage: profile?.targetLanguage || "English",
    learningGoals: profile?.learningGoals || [],
    englishLevel: profile?.englishLevel || "Not sure yet",
    priorities: profile?.priorities || [],
    interests: profile?.interests || [],
    professionalField: profile?.professionalField || "",
    preferredStudyTime: profile?.preferredStudyTime || "Morning",
    dailyGoalMinutes: profile?.dailyGoalMinutes || 20,
    supportLanguage: profile?.supportLanguage || "English only",
  });

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const steps = [
    {
      title: "Your languages",
      subtitle: "Tell us what you speak and what you're learning.",
      skippable: false,
      valid: form.nativeLanguage.trim().length > 0 && form.targetLanguage.trim().length > 0,
      render: () => (
        <div className="space-y-5">
          <div>
            <FieldLabel><UIText text={"Native language"}/></FieldLabel>
            <TextInput value={form.nativeLanguage} onChange={set("nativeLanguage")} placeholder="e.g. Kurdish Sorani" />
          </div>
          <div>
            <FieldLabel><UIText text={"Target language"}/></FieldLabel>
            <TextInput value={form.targetLanguage} onChange={set("targetLanguage")} placeholder="English" />
          </div>
        </div>
      ),
    },
    {
      title: "Why do you want English?",
      subtitle: "Choose everything that applies.",
      skippable: false,
      valid: form.learningGoals.length > 0,
      render: () => <MultiSelectPills values={form.learningGoals} options={GOAL_OPTIONS} onChange={set("learningGoals")} />,
    },
    {
      title: "Your current level",
      subtitle: "A rough estimate is fine — you'll take a placement test next.",
      skippable: false,
      valid: !!form.englishLevel,
      render: () => <SelectPills value={form.englishLevel} options={ONBOARDING_LEVELS} onChange={set("englishLevel")} />,
    },
    {
      title: "Main priorities",
      subtitle: "What should we focus on first? Pick as many as you like.",
      skippable: false,
      valid: form.priorities.length > 0,
      render: () => <MultiSelectPills values={form.priorities} options={PRIORITY_OPTIONS} onChange={set("priorities")} />,
    },
    {
      title: "Interests & field",
      subtitle: "Helps us pick topics and vocabulary you'll actually use. Optional.",
      skippable: true,
      valid: true,
      render: () => (
        <div className="space-y-5">
          <div>
            <FieldLabel><UIText text={"Interests"}/></FieldLabel>
            <MultiSelectPills values={form.interests} options={INTEREST_OPTIONS} onChange={set("interests")} />
          </div>
          <div>
            <FieldLabel><UIText text={"Academic / professional field"}/></FieldLabel>
            <TextInput value={form.professionalField} onChange={set("professionalField")} placeholder="e.g. Nursing, Software engineering" />
          </div>
        </div>
      ),
    },
    {
      title: "Study preferences",
      subtitle: "You can always change these later in Settings.",
      skippable: true,
      valid: true,
      render: () => (
        <div className="space-y-5">
          <div>
            <FieldLabel><UIText text={"Preferred daily study time"}/></FieldLabel>
            <SelectPills value={form.preferredStudyTime} options={STUDY_TIMES} onChange={set("preferredStudyTime")} />
          </div>
          <div>
            <FieldLabel><UIText text={"Daily learning goal"}/></FieldLabel>
            <SelectPills value={form.dailyGoalMinutes} options={DAILY_GOAL_OPTIONS} onChange={set("dailyGoalMinutes")} />
          </div>
          <div>
            <FieldLabel><UIText text={"Preferred support language"}/></FieldLabel>
            <SelectPills value={form.supportLanguage} options={SUPPORT_LANGS} onChange={set("supportLanguage")} />
          </div>
        </div>
      ),
    },
  ];

  const total = steps.length;
  const current = steps[step];
  const isLast = step === total - 1;

  const finish = async (dataOverride) => {
    await updateProfile({ ...form, ...(dataOverride || {}), onboardingComplete: true });
    if (currentUser) await awardActivity(currentUser.email, { type: "onboarding", xp: ACTIVITY_XP.onboarding, minutes: 0 });
    onComplete();
  };

  const handleContinue = () => {
    if (!current.valid) return;
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  const handleSkip = () => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <OnboardingShell
      step={step}
      total={total}
      onBack={handleBack}
      onSkip={handleSkip}
      onContinue={handleContinue}
      continueDisabled={!current.valid}
      continueLabel={isLast ? "Finish" : "Continue"}
      skippable={current.skippable}
    >
      <h1 className={cx("text-xl font-bold mb-1", t.text)} style={{ fontFamily: "var(--font-display)" }}>
        <UIText text={current.title}/>
      </h1>
      <p className={cx("text-sm mb-6", t.textSoft)}><UIText text={current.subtitle}/></p>
      <Card>{current.render()}</Card>
    </OnboardingShell>
  );
}

/* ---------------------------------------------------------------------- */
/*  App shell                                                              */
/* ---------------------------------------------------------------------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');
      :root { --font-display: 'Sora', ui-sans-serif, system-ui, sans-serif; --font-body: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      :root[dir="rtl"] { --font-display: 'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif; --font-body: 'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif; }
      * { font-family: var(--font-body); }
    `}</style>
  );
}

function LoadingScreen() {
  const t = useThemeClasses();
  return (
    <div className={cx("min-h-screen flex items-center justify-center", t.bg)}>
      <Loader2 size={22} className={cx("animate-spin", t.textFaint)} />
    </div>
  );
}

/* Protected shell: only reachable once a session exists. */
function AppShell() {
  const [page, setPage] = useState("home");
  const [moreOpen, setMoreOpen] = useState(false);
  const { isRTL, profile, updateProfile } = useAuth();

  // Persist the derived roadmap whenever the inputs that shape it change
  // (assessment results, priorities, level) — not on every render.
  useEffect(() => {
    if (!profile) return;
    const rm = buildRoadmap(profile);
    if (!rm) return;
    const signature = JSON.stringify({
      level: rm.overallLevel,
      priority: rm.priorityAreaName,
      assessedAt: profile.assessment?.completedAt || null,
      priorities: profile.priorities,
    });
    if (profile.roadmap?.signature !== signature) {
      updateProfile({ roadmap: { ...rm, signature } });
    }
  }, [profile]);

  const navigate = (id) => {
    setPage(id);
    setMoreOpen(false);
  };

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage onNavigate={navigate} />;
      case "aicall": return <AICallPage />;
      case "tutor": return <TutorPage />;
      case "daily": return <DailyLessonPage onNavigate={navigate} />;
      case "courses": return <CoursesPage />;
      case "practice": return <PracticePage />;
      case "vocabulary": return <VocabularyPage />;
      case "mistakes": return <MistakesPage onNavigate={navigate} />;
      case "progress": return <ProgressPage onNavigate={navigate} />;
      case "roadmap": return <RoadmapView onBack={() => navigate("progress")} onNavigate={navigate} />;
      case "profile": return <ProfilePage />;
      case "settings": return <SettingsPage onNavigate={navigate} />;
      default: return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex">
      <Sidebar page={page} onNavigate={navigate} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar page={page} />
        <main className="flex-1 px-4 md:px-8 pt-4 md:pt-8 pb-24 md:pb-10 max-w-6xl w-full mx-auto">
          {renderPage()}
        </main>
      </div>
      <BottomNav page={page} onNavigate={navigate} onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} page={page} onNavigate={navigate} />
    </div>
  );
}

function RootGate() {
  const { status, isRTL, profile } = useAuth();
  // Local, one-way navigation state so that persisting a flag mid-flow
  // (e.g. saving assessment results) never yanks the user off a screen
  // they're still looking at. Only used to move forward.
  const [view, setView] = useState(null); // null | "onboarding" | "placement" | "app"

  useEffect(() => {
    if (!profile || view !== null) return;
    if (!profile.onboardingComplete) setView("onboarding");
    else if (!profile.placementComplete) setView("placement");
    else setView("app");
  }, [profile, view]);

  useEffect(() => {
    if (status === "signedOut" && view !== null) setView(null);
  }, [status, view]);

  if (status === "loading") return <LoadingScreen />;

  if (status === "signedOut") {
    return (
      <div dir={isRTL ? "rtl" : "ltr"}>
        <AuthFlow />
      </div>
    );
  }

  if (!view) return <LoadingScreen />;

  if (view === "onboarding") {
    return (
      <div dir={isRTL ? "rtl" : "ltr"}>
        <OnboardingFlow onComplete={() => setView("placement")} />
      </div>
    );
  }

  if (view === "placement") {
    return (
      <div dir={isRTL ? "rtl" : "ltr"}>
        <PlacementAssessment onFinish={() => setView("app")} />
      </div>
    );
  }

  return <AppShell />;
}

export default function App() {
  const [isDark, setIsDark] = useState(false);

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((d) => !d) }}>
      <AuthProvider>
        <div className={cx(isDark ? "dark" : "", "min-h-screen", isDark ? "bg-slate-950" : "bg-slate-50")}>
          <AppNotice/>
          <GlobalStyle />
          <RootGate />
        </div>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}






