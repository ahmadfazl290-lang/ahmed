import { PLACEMENT_VERSION, PLACEMENT_QUESTIONS, scorePlacement, hasValidPlacement, getPlacementDraft, orderPlacementOptions } from './placement.js';
import { LEVEL_CATALOG, assignedCurriculum, lessonPublished, mayCompleteLesson, levelProgress, parseLessonProgress } from './curriculum.js';
const levelProgressKey = email => `level_progress:${email.trim().toLowerCase()}`;
import { translate } from "./i18n.js";
import React, { useState, useContext, createContext, useEffect } from "react";
import { Home, CalendarCheck, BookOpen, Layers, TrendingUp, User, Settings as SettingsIcon, Sun, Moon, Flame, Star, Clock, ChevronRight, X, Check, Award, BookMarked, ArrowRight, RotateCcw, Pencil, Grid3x3, Lock, ShieldCheck, Trophy, Mail, Eye, EyeOff, ArrowLeft, Loader2, LogIn, UserPlus, GraduationCap, Plus } from "lucide-react";
const cx = (...parts) => parts.filter(Boolean).join(" ");
const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);
function useThemeClasses() {
  const {
    isDark
  } = useTheme();
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
    hover: isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
  };
}
const STRINGS = {
  en: {
    nav_home: "Home",
    nav_daily: "Daily Lesson",
    nav_courses: "My lessons",
    nav_vocabulary: "Vocabulary",
    nav_progress: "Progress",
    nav_profile: "Profile",
    nav_settings: "Settings",
    nav_more: "More",
    nav_roadmap: "Roadmap",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    name: "Name",
    confirmPassword: "Confirm password",
    forgotPassword: "Account help",
    resetPassword: "Account help",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    createAccount: "Create account",
    welcomeBack: "Welcome back",
    welcomeBackSub: "Sign in to continue learning",
    createAccountSub: "Start your English learning journey",
    backToSignIn: "Back to sign in",
    newPassword: "New password",
    resetSub: "Local accounts are for practice only. Password recovery is unavailable. Hosted accounts use ChatGPT sign-in.",
    resetDone: "Password updated. You can sign in now.",
    savingChanges: "Save changes",
    saved: "Saved",
    appLanguage: "App language"
  },
  ku: {
    nav_home: "سەرەکی",
    nav_daily: "وانەی ڕۆژانە",
    nav_courses: "\u0648\u0627\u0646\u06D5\u06A9\u0627\u0646\u0645",
    nav_vocabulary: "وشەکان",
    nav_progress: "پێشکەوتن",
    nav_profile: "پرۆفایل",
    nav_settings: "ڕێکخستنەکان",
    nav_more: "زیاتر",
    nav_roadmap: "نەخشەی ڕێگا",
    signIn: "چوونەژوورەوە",
    signUp: "خۆتۆمارکردن",
    signOut: "چوونەدەرەوە",
    email: "ئیمەیل",
    password: "وشەی نهێنی",
    name: "ناو",
    confirmPassword: "دووبارەکردنەوەی وشەی نهێنی",
    forgotPassword: "یارمەتیی هەژمار",
    resetPassword: "یارمەتیی هەژمار",
    noAccount: "هەژمارت نییە؟",
    haveAccount: "هەژمارت هەیە؟",
    createAccount: "دروستکردنی هەژمار",
    welcomeBack: "بەخێربێیتەوە",
    welcomeBackSub: "بچۆژوورەوە بۆ بەردەوامبوون لە فێربوون",
    createAccountSub: "گەشتی فێربوونی ئینگلیزیت دەست پێبکە",
    backToSignIn: "گەڕانەوە بۆ چوونەژوورەوە",
    newPassword: "وشەی نهێنی نوێ",
    resetSub: "هەژماری ناوخۆ بۆ تاقیکردنەوەیە. گەڕاندنەوەی وشەی نهێنی بەردەست نییە. وەشانی ئۆنلاین بە ChatGPT دەچێتەژوورەوە.",
    resetDone: "وشەی نهێنی نوێکرایەوە. ئێستا دەتوانیت بچیتەژوورەوە.",
    savingChanges: "پاشەکەوتکردنی گۆڕانکاریەکان",
    saved: "پاشەکەوتکرا",
    appLanguage: "زمانی ئەپ"
  }
};
function useT() {
  const {
    uiLang
  } = useAuth();
  const dict = STRINGS[uiLang] || STRINGS.en;
  return key => dict[key] || STRINGS.en[key] || key;
}
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
  } catch (e) {}
}
async function hashPassword(pw, stored) {
  if (stored && !stored.startsWith("pbkdf2$")) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  }
  const salt = stored ? Uint8Array.from(stored.split("$")[1].match(/../g), x => parseInt(x, 16)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations: 210000
  }, key, 256);
  const hex = a => Array.from(new Uint8Array(a), b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${hex(salt)}$${hex(bits)}`;
}
const emailKey = email => `user:${email.trim().toLowerCase()}`;
const profileKey = email => `profile:${email.trim().toLowerCase()}`;
function defaultProfile(name, email) {
  return {
    name,
    email,
    nativeLanguage: "",
    targetLanguage: "English",
    englishLevel: null,
    priorities: [],
    learningGoals: [],
    interests: [],
    professionalField: "",
    dailyGoalMinutes: 20,
    preferredStudyTime: "Morning",
    supportLanguage: "English + Kurdish Sorani",
    uiLang: "ku",
    onboardingComplete: false,
    placementComplete: false,
    assessment: null,
    roadmap: null
  };
}
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);
function AuthProvider({
  children
}) {
  const [status, setStatus] = useState("loading");
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [localUiLang, setLocalUiLang] = useState(() => {
    try {
      return localStorage.getItem("cadence:ui-language") || "ku";
    } catch {
      return "ku";
    }
  });
  useEffect(() => {
    (async () => {
      if (["hosted", "guest"].includes(window.CADENCE_SESSION?.mode)) {
        const user = window.CADENCE_SESSION.user;
        if (!user) {
          setStatus("signedOut");
          return;
        }
        setCurrentUser({
          name: user.displayName,
          email: user.email
        });
        try {
          const raw = await safeGet(profileKey(user.email));
          const loaded = raw ? JSON.parse(raw) : defaultProfile(user.displayName, user.email);
          if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) throw new Error('Invalid saved profile');
          setProfile(loaded);
          setCurrentUser({
            name: loaded.name || user.displayName,
            email: user.email
          });
          setStatus("signedIn");
        } catch {
          setStatus(window.CADENCE_SESSION?.mode === 'guest' ? 'storageError' : 'signedOut');
        }
        return;
      }
      const session = await safeGet("session");
      if (session) {
        try {
          const s = JSON.parse(session);
          const userRaw = await safeGet(emailKey(s.email));
          if (userRaw) {
            const user = JSON.parse(userRaw);
            setCurrentUser({
              name: user.name,
              email: user.email
            });
            const profRaw = await safeGet(profileKey(s.email));
            setProfile(profRaw ? JSON.parse(profRaw) : defaultProfile(user.name, user.email));
            setStatus("signedIn");
            return;
          }
        } catch (e) {}
      }
      setStatus("signedOut");
    })();
  }, []);
  const signUp = async (name, email, password) => {
    if (!name.trim() || !email.trim() || !password) return {
      ok: false,
      error: "Fill in all fields."
    };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return {
      ok: false,
      error: "Enter a valid email address."
    };
    if (password.length < 10) return {
      ok: false,
      error: "Use at least 10 characters for your password."
    };
    const existing = await safeGet(emailKey(email));
    if (existing) return {
      ok: false,
      error: "An account with this email already exists."
    };
    const passwordHash = await hashPassword(password);
    const user = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash
    };
    if (!(await safeSet(emailKey(email), JSON.stringify(user)))) return {
      ok: false,
      error: "Could not save your account. Check browser storage."
    };
    const prof = defaultProfile(user.name, user.email);
    await safeSet(profileKey(email), JSON.stringify(prof));
    await safeSet("session", JSON.stringify({
      email: user.email
    }));
    setCurrentUser({
      name: user.name,
      email: user.email
    });
    setProfile(prof);
    setStatus("signedIn");
    return {
      ok: true
    };
  };
  const signIn = async (email, password) => {
    if (!email.trim() || !password) return {
      ok: false,
      error: "Enter your email and password."
    };
    const raw = await safeGet(emailKey(email));
    if (!raw) return {
      ok: false,
      error: "No account found with that email."
    };
    const user = JSON.parse(raw);
    const passwordHash = await hashPassword(password, user.passwordHash);
    if (passwordHash !== user.passwordHash) return {
      ok: false,
      error: "Incorrect password."
    };
    await safeSet("session", JSON.stringify({
      email: user.email
    }));
    const profRaw = await safeGet(profileKey(email));
    setCurrentUser({
      name: user.name,
      email: user.email
    });
    setProfile(profRaw ? JSON.parse(profRaw) : defaultProfile(user.name, user.email));
    setStatus("signedIn");
    return {
      ok: true
    };
  };
  const signOut = async () => {
    if (window.CADENCE_SESSION?.mode === 'guest') return;
    if (window.CADENCE_SESSION?.emailAuth) {
      const response = await fetch('/api/email-auth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'signout'
        })
      });
      if (response.ok) window.location.reload();
      return;
    }
    await safeDelete("session");
    setCurrentUser(null);
    setProfile(null);
    setStatus("signedOut");
  };
  const resetPassword = async () => ({
    ok: false,
    error: "Password recovery is unavailable in local practice mode. Hosted accounts use ChatGPT sign-in."
  });
  const updateProfile = async updates => {
    if (updates.uiLang) setLocalUiLang(updates.uiLang);
    const next = {
      ...profile,
      ...updates
    };
    if (!(await safeSet(profileKey(currentUser.email), JSON.stringify(next)))) throw new Error('PROFILE_SAVE_FAILED');
    setProfile(next);
    if (updates.name && updates.name !== currentUser.name) {
      if (window.CADENCE_SESSION?.emailAuth || window.CADENCE_SESSION?.mode === 'guest') {
        setCurrentUser(u => ({
          ...u,
          name: updates.name
        }));
        return next;
      }
      const raw = await safeGet(emailKey(currentUser.email));
      if (raw) {
        const user = JSON.parse(raw);
        user.name = updates.name;
        await safeSet(emailKey(currentUser.email), JSON.stringify(user));
      }
      setCurrentUser(u => ({
        ...u,
        name: updates.name
      }));
    }
    return next;
  };
  const uiLang = localUiLang;
  const changeUiLang = lang => {
    setLocalUiLang(lang);
    try {
      localStorage.setItem("cadence:ui-language", lang);
    } catch {}
  };
  useEffect(() => {
    document.documentElement.lang = uiLang;
    document.documentElement.dir = uiLang === "ku" ? "rtl" : "ltr";
  }, [uiLang]);
  const isRTL = uiLang === "ku";
  return <AuthContext.Provider value={{
    status,
    currentUser,
    profile,
    uiLang,
    changeUiLang,
    isRTL,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile
  }}>
      {children}
    </AuthContext.Provider>;
}
function UIText({
  text
}) {
  const {
    uiLang
  } = useAuth();
  return <>{translate(text, uiLang)}</>;
}
function AppNotice() {
  const {
    uiLang,
    changeUiLang
  } = useAuth();
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    const handler = () => setSaveError(true);
    window.addEventListener("cadence-save-error", handler);
    return () => window.removeEventListener("cadence-save-error", handler);
  }, []);
  return <div dir={uiLang === "ku" ? "rtl" : "ltr"} className="bg-teal-950 text-white text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-2">
    <span><UIText text={window.CADENCE_SESSION?.development ? "Local preview — email accounts and learning data stay on this computer." : window.CADENCE_SESSION?.mode === "hosted" ? "Your learning data is saved securely to your account." : "Local practice mode — data stays on this device."} /></span>
    <div className="flex gap-3"><button onClick={() => changeUiLang(uiLang === "ku" ? "en" : "ku")} className="underline font-semibold">{uiLang === "ku" ? "English" : "کوردی"}</button></div>
    {window.CADENCE_SESSION?.emailConfigured && window.CADENCE_SESSION?.user && !window.CADENCE_SESSION.user.emailVerified && <a href="/account?mode=verify" className="underline">{uiLang === 'ku' ? 'ئیمەیڵەکەت پشتڕاست بکەرەوە' : 'Verify your email'}</a>}
    {saveError && <div role="alert" className="w-full text-amber-200"><UIText text="Could not save your changes. Check your connection and try again." /><button className="underline mx-2" onClick={() => setSaveError(false)}><UIText text="Close" /></button></div>}
  </div>;
}
function EmailSignIn() {
  const t = useThemeClasses();
  const {
    uiLang
  } = useAuth();
  const ku = uiLang === 'ku';
  const [signup, setSignup] = useState(false),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [registrationCode, setRegistrationCode] = useState('');
  const [notice, setNotice] = useState('');
  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/email-auth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: signup ? 'signup' : 'signin',
          name,
          email,
          password,
          registrationCode
        })
      });
      const data = await r.json();
      if (data.verificationRequired) {
        setNotice(ku ? 'پێش چوونەژوورەوە، ئیمەیڵەکەت پشتڕاست بکەرەوە. Inbox و Spam بپشکنە؛ دەتوانیت لینکی نوێش داوا بکەیت.' : 'Verify your email before signing in. Check Inbox and Spam, or request a new verification link.');
        setPassword('');
        setBusy(false);
        return;
      }
      if (!r.ok) throw new Error(data.error);
      window.location.reload();
    } catch (e) {
      const errors = {
        'Email or password is incorrect.': 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.',
        'Could not create this account. Try signing in.': 'ئەم هەژمارە دروست نەکرا. ئەگەر پێشتر تۆمارت کردووە، بچۆ ژوورەوە.',
        'Too many attempts. Try again in 15 minutes.': 'هەوڵەکان زۆرن. دوای ١٥ خولەک دووبارە هەوڵبدە.'
      };
      setError(ku ? errors[e.message] || 'هەژمارەکە بەڕێوە نەچوو. ئیمەیڵ و وشەی نهێنی بپشکنە و دووبارە هەوڵبدە.' : e.message);
      setBusy(false);
    }
  };
  const field = cx('w-full rounded-xl border px-4 py-3', t.border, t.surface, t.text);
  return <AuthShell><h1 className={cx('text-xl font-bold mb-2', t.text)}>Cadence</h1><h2 className={cx('text-lg mb-5', t.text)}>{ku ? signup ? 'دروستکردنی هەژمار' : 'چوونەژوورەوە' : signup ? 'Create an account' : 'Sign in'}</h2>
 <form onSubmit={submit} className="space-y-4">
 {window.CADENCE_SESSION?.databaseConfigured === false && <p role="alert" className="text-sm text-red-600">{ku ? 'بنکەدراوە هێشتا پەیوەست نەکراوە. خاوەنی وێبسایت دەبێت DATABASE_URL ڕێک بخات.' : 'The database is not configured. The site owner must configure DATABASE_URL.'}</p>}
 {signup && <label className={cx('block text-sm', t.text)}>{ku ? 'ناو' : 'Name'}<input className={field} value={name} onChange={e => setName(e.target.value)} required maxLength={80} autoComplete="name" disabled={busy} /></label>}
 {signup && window.CADENCE_SESSION?.registrationCodeRequired && <label className={cx('block text-sm', t.text)}>{ku ? 'کۆدی بانگهێشت' : 'Invitation code'}<input className={field} type="password" value={registrationCode} onChange={e => setRegistrationCode(e.target.value)} required maxLength={256} disabled={busy} /></label>}
 <label className={cx('block text-sm', t.text)}>{ku ? 'ئیمەیڵ' : 'Email'}<input className={field} dir="ltr" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" disabled={busy} /></label>
 <label className={cx('block text-sm', t.text)}>{ku ? 'وشەی نهێنی' : 'Password'}<input className={field} dir="ltr" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={10} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} disabled={busy} /></label>
 <p className={cx('text-xs', t.textSoft)}>{ku ? 'وشەی نهێنی دەبێت لانیکەم ١٠ پیت بێت.' : 'Use at least 10 characters for your password.'}</p>
 {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
 {notice && <p role="status" className={cx('text-sm', t.textSoft)}>{notice}</p>}
 <button type="submit" disabled={busy} className="w-full rounded-xl bg-teal-600 px-5 py-3 text-white font-semibold">{busy ? ku ? 'چاوەڕێبە...' : 'Please wait...' : ku ? signup ? 'دروستکردنی هەژمار' : 'چوونەژوورەوە' : signup ? 'Create account' : 'Sign in'}</button>
 </form><button type="button" disabled={busy} className={cx('mt-5 underline text-sm', t.textSoft)} onClick={() => {
      setSignup(!signup);
      setError('');
      setPassword('');
    }}>{ku ? signup ? 'هەژمارت هەیە؟ بچۆ ژوورەوە' : 'هەژمارت نییە؟ هەژمارێک دروست بکە' : signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
 {window.CADENCE_SESSION?.emailConfigured ? <div className="mt-5 space-y-3"><a href="/account?mode=reset" className={cx('block text-sm underline', t.textSoft)}>{ku ? 'وشەی نهێنیت لەبیر چووە؟' : 'Forgot your password?'}</a><a href="/account?mode=verify" className={cx('block text-sm underline', t.textSoft)}>{ku ? 'داواکردنی لینکی پشتڕاستکردنەوەی ئیمەیڵ' : 'Request an email verification link'}</a></div> : <p className={cx('text-xs mt-5', t.textSoft)}>{ku ? 'ناردنی ئیمەیڵ هێشتا چالاک نەکراوە.' : 'Email delivery is not enabled yet.'}</p>}
 </AuthShell>;
}
function HostedSignIn() {
  return <EmailSignIn />;
}
const NAV = [{
  id: "home",
  label: "Home",
  icon: Home
}, {
  id: "courses",
  label: "My lessons",
  icon: BookOpen
}, {
  id: "vocabulary",
  label: "Vocabulary",
  icon: Layers
}, {
  id: "progress",
  label: "Progress",
  icon: TrendingUp
}, {
  id: "profile",
  label: "Profile",
  icon: User
}, {
  id: "settings",
  label: "Settings",
  icon: SettingsIcon
}];
const MOBILE_PRIMARY_IDS = ["home", "courses", "vocabulary", "progress", "profile"];
const MOBILE_MORE_IDS = NAV.map(n => n.id).filter(id => !MOBILE_PRIMARY_IDS.includes(id));
function Logo({
  compact = false
}) {
  const {
    isDark
  } = useTheme();
  return <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex items-end gap-[3px] h-6 shrink-0" aria-hidden="true">
        <span className={cx("w-1.5 rounded-full", isDark ? "bg-teal-400" : "bg-teal-600")} style={{
        height: "40%"
      }} />
        <span className={cx("w-1.5 rounded-full", isDark ? "bg-teal-400" : "bg-teal-600")} style={{
        height: "100%"
      }} />
        <span className={cx("w-1.5 rounded-full", isDark ? "bg-amber-400" : "bg-amber-500")} style={{
        height: "65%"
      }} />
        <span className={cx("w-1.5 rounded-full", isDark ? "bg-teal-400" : "bg-teal-600")} style={{
        height: "80%"
      }} />
      </div>
      {!compact && <span className={cx("text-lg font-bold tracking-tight truncate", isDark ? "text-slate-50" : "text-slate-900")} style={{
      fontFamily: "var(--font-display)"
    }}>
          Cadence
        </span>}
    </div>;
}
function ThemeToggle({
  className = ""
}) {
  const {
    isDark,
    toggle
  } = useTheme();
  const t = useThemeClasses();
  return <button onClick={toggle} aria-label="Toggle dark mode" className={cx("inline-flex items-center justify-center h-9 w-9 rounded-full border transition-colors", t.border, t.hover, className)}>
      {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
    </button>;
}
function Card({
  children,
  className = "",
  padded = true
}) {
  const t = useThemeClasses();
  return <div className={cx("rounded-2xl border", t.surface, t.border, padded ? "p-5" : "", className)}>
      {children}
    </div>;
}
function SectionHeading({
  title,
  subtitle,
  action
}) {
  const t = useThemeClasses();
  return <div className="flex items-end justify-between mb-3 gap-3">
      <div className="min-w-0">
        <h2 className={cx("text-base font-semibold tracking-tight", t.text)} style={{
        fontFamily: "var(--font-display)"
      }}>
          <UIText text={title} />
        </h2>
        {subtitle && <p className={cx("text-sm mt-0.5", t.textSoft)}><UIText text={subtitle} /></p>}
      </div>
      {action}
    </div>;
}
function ProgressBar({
  value,
  max = 100,
  colorClass = "bg-teal-600",
  trackClass
}) {
  const t = useThemeClasses();
  const pct = Math.max(0, Math.min(100, value / max * 100));
  return <div className={cx("h-2 w-full rounded-full overflow-hidden", trackClass || t.surfaceAlt)}>
      <div className={cx("h-full rounded-full transition-all", colorClass)} style={{
      width: `${pct}%`
    }} />
    </div>;
}
function Badge({
  children,
  tone = "teal"
}) {
  const tones = {
    teal: "bg-teal-600/10 text-teal-700 dark:text-teal-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  };
  return <span className={cx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", tones[tone])}>
      <UIText text={children} />
    </span>;
}
function PrimaryButton({
  children,
  onClick,
  className = "",
  icon: Icon,
  full = false
}) {
  return <button onClick={onClick} className={cx("inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800", "text-white font-semibold px-5 py-3 text-sm transition-colors shadow-sm shadow-teal-900/10", full ? "w-full" : "", className)}>
      <UIText text={children} />
      {Icon && <Icon size={16} />}
    </button>;
}
function SecondaryButton({
  children,
  onClick,
  className = "",
  icon: Icon,
  full = false
}) {
  const t = useThemeClasses();
  return <button onClick={onClick} className={cx("inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-5 py-3 text-sm transition-colors border", t.border, t.text, t.hover, full ? "w-full" : "", className)}>
      <UIText text={children} />
      {Icon && <Icon size={16} />}
    </button>;
}
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "teal"
}) {
  const t = useThemeClasses();
  const accents = {
    teal: "text-teal-600 dark:text-teal-400 bg-teal-600/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
  };
  return <Card className="flex flex-col gap-3">
      <div className={cx("h-9 w-9 rounded-lg flex items-center justify-center", accents[accent])}>
        <Icon size={17} />
      </div>
      <div>
        <p className={cx("text-xl font-bold tracking-tight", t.text)} style={{
        fontFamily: "var(--font-display)"
      }}>
          {value}
        </p>
        <p className={cx("text-xs mt-0.5", t.textSoft)}><UIText text={label} /></p>
        {sub && <p className={cx("text-[11px] mt-1", t.textFaint)}><UIText text={sub} /></p>}
      </div>
    </Card>;
}
function Switch({
  checked,
  onChange,
  label
}) {
  const t = useThemeClasses();
  const {
    isRTL
  } = useAuth();
  const onPos = isRTL ? "-translate-x-6" : "translate-x-6";
  return <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cx("relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0", checked ? "bg-teal-600" : t.surfaceAlt)} aria-label={label}>
      <span className={cx("inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform", checked ? onPos : "translate-x-1")} style={{
      height: 18,
      width: 18
    }} />
    </button>;
}
function PageHeader({
  title,
  subtitle
}) {
  const t = useThemeClasses();
  return <div className="mb-6">
      <h1 className={cx("text-2xl font-bold tracking-tight", t.text)} style={{
      fontFamily: "var(--font-display)"
    }}>
        <UIText text={title} />
      </h1>
      {subtitle && <p className={cx("text-sm mt-1", t.textSoft)}><UIText text={subtitle} /></p>}
    </div>;
}
function TextField({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  rightSlot,
  isRTL
}) {
  const t = useThemeClasses();
  return <div>
      {label && <label className={cx("block text-xs font-medium mb-1.5", t.textSoft)}>{label}</label>}
      <div className="relative">
        {Icon && <Icon size={16} className={cx("absolute top-1/2 -translate-y-1/2", t.textFaint, isRTL ? "right-3.5" : "left-3.5")} />}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={cx("w-full rounded-xl py-3 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors", Icon ? isRTL ? "pr-10 pl-4" : "pl-10 pr-4" : "px-4", rightSlot ? isRTL ? "pl-10" : "pr-10" : "", t.surfaceAlt, t.border, t.text)} />
        {rightSlot && <div className={cx("absolute top-1/2 -translate-y-1/2", isRTL ? "left-3" : "right-3")}>{rightSlot}</div>}
      </div>
    </div>;
}
function FormError({
  message
}) {
  if (!message) return null;
  return <div className="rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium px-3.5 py-2.5">
      {message}
    </div>;
}
function AuthShell({
  children
}) {
  const t = useThemeClasses();
  const {
    isRTL
  } = useAuth();
  return <div className={cx("min-h-screen flex flex-col items-center justify-center px-5 py-10", t.bg)}>
      <div className="w-full max-w-sm">
        <div className={cx("flex items-center mb-8", isRTL ? "justify-end" : "justify-start")}>
          <Logo />
        </div>
        <div className={cx("rounded-2xl border p-6", t.surface, t.border)}>{children}</div>
        <div className="flex justify-center mt-6">
          <ThemeToggle />
        </div>
      </div>
    </div>;
}
function SignInScreen({
  goTo
}) {
  const t = useThemeClasses();
  const T = useT();
  const {
    signIn,
    isRTL
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };
  return <AuthShell>
      <h1 className={cx("text-xl font-bold mb-1", t.text)} style={{
      fontFamily: "var(--font-display)"
    }}>
        {T("welcomeBack")}
      </h1>
      <p className={cx("text-sm mb-6", t.textSoft)}>{T("welcomeBackSub")}</p>
      <form onSubmit={submit} className="space-y-4">
        <TextField label={T("email")} icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" isRTL={isRTL} />
        <TextField label={T("password")} icon={Lock} type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" isRTL={isRTL} rightSlot={<button type="button" onClick={() => setShowPw(s => !s)} className={t.textFaint} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>} />
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
    </AuthShell>;
}
function SignUpScreen({
  goTo
}) {
  const t = useThemeClasses();
  const T = useT();
  const {
    signUp,
    isRTL
  } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const res = await signUp(name, email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
  };
  return <AuthShell>
      <h1 className={cx("text-xl font-bold mb-1", t.text)} style={{
      fontFamily: "var(--font-display)"
    }}>
        {T("createAccount")}
      </h1>
      <p className={cx("text-sm mb-6", t.textSoft)}>{T("createAccountSub")}</p>
      <form onSubmit={submit} className="space-y-4">
        <TextField label={T("name")} icon={User} value={name} onChange={e => setName(e.target.value)} placeholder="Alex Morgan" isRTL={isRTL} />
        <TextField label={T("email")} icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" isRTL={isRTL} />
        <TextField label={T("password")} icon={Lock} type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" isRTL={isRTL} rightSlot={<button type="button" onClick={() => setShowPw(s => !s)} className={t.textFaint} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>} />
        <TextField label={T("confirmPassword")} icon={Lock} type={showPw ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" isRTL={isRTL} />
        <FormError message={error} />
        <PrimaryButton full icon={loading ? Loader2 : UserPlus}>{loading ? "…" : T("createAccount")}</PrimaryButton>
      </form>
      <p className={cx("text-sm text-center mt-5", t.textSoft)}>
        {T("haveAccount")}{" "}
        <button onClick={() => goTo("signin")} className="font-semibold text-teal-600 dark:text-teal-400">
          {T("signIn")}
        </button>
      </p>
    </AuthShell>;
}
function ForgotPasswordScreen({
  goTo
}) {
  const t = useThemeClasses();
  return <AuthShell><h1 className={cx("text-xl font-bold", t.text)}><UIText text="Account" /></h1><p className={cx("my-5 text-sm", t.textSoft)}><UIText text="Password recovery is unavailable in local practice mode. Hosted accounts use ChatGPT sign-in." /></p><SecondaryButton full onClick={() => goTo("signIn")}><UIText text="Back to sign in" /></SecondaryButton></AuthShell>;
}
function AuthFlow() {
  if (window.CADENCE_SESSION?.mode === "hosted") return <HostedSignIn />;
  const [screen, setScreen] = useState("signin");
  if (screen === "signup") return <SignUpScreen goTo={setScreen} />;
  if (screen === "forgot") return <ForgotPasswordScreen goTo={setScreen} />;
  return <SignInScreen goTo={setScreen} />;
}
function Sidebar({
  page,
  onNavigate
}) {
  const t = useThemeClasses();
  const T = useT();
  const {
    currentUser,
    profile,
    isRTL
  } = useAuth();
  const roadmap = profile?.assessment ? {
    overallLevel: profile.assessment.assignedLevel
  } : null;
  return <aside className={cx("hidden md:flex md:flex-col md:w-64 md:shrink-0 md:h-screen md:sticky md:top-0", isRTL ? "border-s" : "border-e", t.surface, t.border)}>
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {NAV.map(item => {
        const active = page === item.id;
        const Icon = item.icon;
        return <button key={item.id} onClick={() => onNavigate(item.id)} className={cx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-start", active ? "bg-teal-600/10 text-teal-700 dark:text-teal-300" : cx(t.textSoft, t.hover))}>
              <Icon size={17} className="shrink-0" />
              <span className="truncate">{T(`nav_${item.id}`)}</span>
              {active && <span className="ms-auto h-1.5 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />}
            </button>;
      })}
      </nav>
      <div className={cx("px-4 py-4 border-t flex items-center justify-between", t.border)}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {(currentUser?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className={cx("text-sm font-medium truncate", t.text)}>{currentUser?.name}</p>
            <p className={cx("text-[11px]", t.textFaint)}><UIText text={"Level"} /> {roadmap ? roadmap.overallLevel : "—"}</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </aside>;
}
function MobileTopBar({
  page
}) {
  const t = useThemeClasses();
  const T = useT();
  const isHome = page === "home";
  return <div className={cx("md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur", t.surface, t.border)}>
      <Logo compact={!isHome} />
      {!isHome && <span className={cx("text-sm font-semibold", t.text)} style={{
      fontFamily: "var(--font-display)"
    }}>
          {T(`nav_${page}`)}
        </span>}
      <ThemeToggle />
    </div>;
}
function BottomNav({
  page,
  onNavigate,
  onMore
}) {
  const t = useThemeClasses();
  const T = useT();
  const items = NAV.filter(n => MOBILE_PRIMARY_IDS.includes(n.id));
  const moreActive = MOBILE_MORE_IDS.includes(page);
  return <nav className={cx("md:hidden fixed bottom-0 inset-x-0 z-40 border-t px-1 pb-[env(safe-area-inset-bottom)]", t.surface, t.border)}>
      <div className="flex items-stretch justify-between">
        {items.map(item => {
        const active = page === item.id;
        const Icon = item.icon;
        return <button key={item.id} onClick={() => onNavigate(item.id)} className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5">
              <Icon size={19} className={active ? "text-teal-600 dark:text-teal-400" : t.textFaint} />
              <span className={cx("text-[10px] font-medium", active ? "text-teal-600 dark:text-teal-400" : t.textFaint)}>
                {T(`nav_${item.id}`)}
              </span>
            </button>;
      })}
        <button onClick={onMore} className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5">
          <Grid3x3 size={19} className={moreActive ? "text-teal-600 dark:text-teal-400" : t.textFaint} />
          <span className={cx("text-[10px] font-medium", moreActive ? "text-teal-600 dark:text-teal-400" : t.textFaint)}>
            {T("nav_more")}
          </span>
        </button>
      </div>
    </nav>;
}
function MoreSheet({
  open,
  onClose,
  page,
  onNavigate
}) {
  const t = useThemeClasses();
  const T = useT();
  if (!open) return null;
  const items = NAV.filter(n => MOBILE_MORE_IDS.includes(n.id));
  return <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cx("absolute bottom-0 inset-x-0 rounded-t-3xl border-t p-5 pb-8", t.surface, t.border)}>
        <div className="flex items-center justify-between mb-4">
          <span className={cx("text-sm font-semibold", t.text)} style={{
          fontFamily: "var(--font-display)"
        }}>
            {T("nav_more")}
          </span>
          <button onClick={onClose} className={cx("h-8 w-8 rounded-full flex items-center justify-center", t.hover)} aria-label="Close">
            <X size={16} className={t.textSoft} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {items.map(item => {
          const Icon = item.icon;
          const active = page === item.id;
          return <button key={item.id} onClick={() => onNavigate(item.id)} className={cx("flex flex-col items-center justify-center gap-2 rounded-2xl py-4 border", active ? "border-teal-600 bg-teal-600/10" : t.border)}>
                <Icon size={19} className={active ? "text-teal-600 dark:text-teal-400" : t.textSoft} />
                <span className={cx("text-[11px] font-medium text-center leading-tight", t.text)}>{T(`nav_${item.id}`)}</span>
              </button>;
        })}
        </div>
      </div>
    </div>;
}
function HomePage({
  onNavigate
}) {
  const t = useThemeClasses();
  const {
    profile,
    currentUser
  } = useAuth();
  const level = assignedCurriculum(profile.assessment);
  return <div className="space-y-6 pb-6"><PageHeader title={'Welcome, ' + currentUser.name} subtitle="Your learning starts with your assigned level" /><Card className="space-y-4"><Badge><UIText text="Placement completed" /></Badge><h2 className={cx('text-2xl font-bold', t.text)}><UIText text="Level" /> {level.number} · {level.cefr}</h2><p className={cx('text-sm', t.textSoft)}><UIText text="Your lessons are selected from the texts assigned to this level." /></p><PrimaryButton full onClick={() => onNavigate('courses')}><UIText text="Open my lessons" /></PrimaryButton></Card><Card><SectionHeading title="Ready for your teacher's texts" /><p className={cx('text-sm leading-relaxed', t.textSoft)}><UIText text="The previous course library has been replaced. Lesson slots are ready; the actual texts will be added later." /></p></Card></div>;
}
function genId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function CoursesPage() {
  const t = useThemeClasses();
  const {
    profile,
    currentUser
  } = useAuth();
  const level = assignedCurriculum(profile?.assessment);
  const [lessonId, setLessonId] = useState(null),
    [progress, setProgress] = useState({
      completed: {}
    }),
    [showResult, setShowResult] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [progressReady, setProgressReady] = useState(false);
  const completionLock = React.useRef(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const raw = await safeGet(levelProgressKey(currentUser.email));
      try {
        if (active) {
          setProgress(parseLessonProgress(raw));
          setProgressReady(true);
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [currentUser.email]);
  if (!level) return null;
  const stats = levelProgress(profile.assessment, progress),
    lesson = level.lessons.find(item => item.id === lessonId);
  const complete = async () => {
    if (!lesson || completionLock.current || !progressReady || progress.completed[lesson.id] || !mayCompleteLesson(profile.assessment, lesson.id)) return;
    completionLock.current = true;
    setBusy(true);
    setError('');
    try {
      const next = {
        ...progress,
        completed: {
          ...progress.completed,
          [lesson.id]: new Date().toISOString()
        }
      };
      if (!(await safeSet(levelProgressKey(currentUser.email), JSON.stringify(next)))) throw new Error('SAVE_FAILED');
      setProgress(next);
      if (!progress.completed?.[lesson.id]) await awardActivity(currentUser.email, {
        type: 'level_lesson',
        xp: ACTIVITY_XP.level_lesson,
        minutes: 0,
        meta: {
          lessonId: lesson.id,
          level: level.cefr
        }
      });
    } catch {
      setError('Could not save your progress. Please try again.');
    } finally {
      completionLock.current = false;
      setBusy(false);
    }
  };
  if (lesson) return <div className="space-y-5 pb-6"><button onClick={() => setLessonId(null)} className={cx('inline-flex gap-2 items-center text-sm', t.textSoft)}><ArrowLeft size={16} /><UIText text="Back to my lessons" /></button><PageHeader title={lesson.title} subtitle={'Level ' + level.number + ' · ' + level.cefr} /><Card><Badge><UIText text={lessonPublished(lesson) ? 'Lesson text' : 'Awaiting your lesson text'} /></Badge>{lessonPublished(lesson) ? <div dir="ltr" className={cx('space-y-4 text-left text-sm leading-relaxed mt-5', t.text)}>{lesson.text.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div> : <div className="py-12 text-center space-y-4"><BookOpen size={32} className="mx-auto text-teal-600" /><h2 className={cx('text-lg font-semibold', t.text)}><UIText text="Your text will appear here" /></h2><p className={cx('text-sm leading-relaxed', t.textSoft)}><UIText text="This is a layout preview. No lesson text has been added yet. Each lesson will use the separate text provided by your teacher." /></p></div>}</Card>{error && <p role="alert" className="text-sm text-red-600"><UIText text={error} /></p>}<button type="button" onClick={complete} disabled={busy || !progressReady || !lessonPublished(lesson) || !!progress.completed?.[lesson.id]} className="w-full rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white disabled:opacity-40"><UIText text={progress.completed?.[lesson.id] ? 'Lesson completed' : busy ? 'Saving...' : 'Mark lesson complete'} /></button></div>;
  return <div className="space-y-6 pb-6"><PageHeader title="My lessons" subtitle="Your placement result selects your learning level" /><Card className="border-teal-500/30 bg-teal-500/5"><div className="flex items-center gap-4"><div className="rounded-2xl bg-teal-600 px-5 py-4 text-2xl font-bold text-white">{level.cefr}</div><div><Badge><UIText text="Your assigned level" /></Badge><h2 className={cx('text-xl font-bold mt-2', t.text)}><UIText text="Level" /> {level.number} · <UIText text={level.name} /></h2><p className={cx('text-sm mt-1', t.textSoft)}>{profile.assessment.totalCorrect}/{profile.assessment.totalQuestions} <UIText text="correct answers" /></p></div></div><p className={cx('text-xs mt-4', t.textSoft)}><UIText text="Lesson-placement estimate based on grammar, vocabulary and reading." /></p><button className="underline text-sm mt-3 text-teal-600" onClick={() => setShowResult(!showResult)}><UIText text={showResult ? 'Hide test result' : 'View test result'} /></button>{showResult && <div className="space-y-3 mt-4">{Object.entries(profile.assessment.categories).map(([name, value]) => <div key={name}><div className="flex justify-between text-sm mb-1"><UIText text={name} /><span>{value.correct}/{value.total} · {Math.round(value.score * 100)}%</span></div><ProgressBar value={value.score * 100} /></div>)}<div className="grid grid-cols-3 gap-2">{Object.entries(profile.assessment.bandScores).map(([bandLevel, band]) => <div key={bandLevel} className={cx('rounded-xl p-2 text-center text-xs', t.surfaceAlt, t.text)}>{bandLevel}<p>{band.correct}/{band.total}</p></div>)}</div></div>}</Card><Card><SectionHeading title="Your lesson progress" /><ProgressBar value={stats.percentage} /><p className={cx('text-xs mt-2', t.textSoft)}>{stats.published ? <>{stats.completed}/{stats.published} <UIText text="published lessons completed" /></> : <UIText text="No lessons published yet." />}</p></Card><div><SectionHeading title="Lessons in your level" subtitle="Your teacher's texts will be added lesson by lesson" /><div className="space-y-3">{level.lessons.map((item, index) => <button key={item.id} onClick={() => setLessonId(item.id)} className={cx('w-full rounded-2xl border p-4 flex items-center gap-4 text-start', t.border, t.surface, t.hover)}><div className="rounded-xl bg-teal-600/10 p-3 text-teal-600 font-bold">{index + 1}</div><div className="flex-1"><p className={cx('font-semibold text-sm', t.text)}>{item.title}</p><p className={cx('text-xs mt-1', t.textSoft)}><UIText text={progress.completed?.[item.id] ? 'Completed' : lessonPublished(item) ? 'Ready to read' : 'Text coming later'} /></p></div><ChevronRight size={18} className={t.textFaint} /></button>)}</div></div><div><SectionHeading title="Level map" subtitle="Your lessons open at the level assigned by the test" /><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{LEVEL_CATALOG.map(item => <Card key={item.id} className={cx('text-center', item.id === level.id ? 'border-teal-500' : 'opacity-60')}><p className={cx('text-xs', t.textSoft)}><UIText text="Level" /> {item.number}</p><p className={cx('text-xl font-bold my-2', t.text)}>{item.cefr}</p><Badge tone={item.id === level.id ? 'teal' : 'slate'}>{item.id === level.id ? <UIText text="Assigned to you" /> : <><Lock size={10} /><UIText text="Not assigned" /></>}</Badge></Card>)}</div></div></div>;
}
function SheetModal({
  title,
  onClose,
  children
}) {
  const t = useThemeClasses();
  return <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cx("absolute bottom-0 inset-x-0 md:inset-x-auto md:right-6 md:bottom-6 md:w-[420px] rounded-t-3xl md:rounded-2xl border-t md:border p-5 pb-8 md:pb-5 max-h-[85vh] overflow-y-auto", t.surface, t.border)}>
        <div className="flex items-center justify-between mb-4">
          <span className={cx("text-sm font-semibold", t.text)} style={{
          fontFamily: "var(--font-display)"
        }}>{title}</span>
          <button onClick={onClose} className={cx("h-8 w-8 rounded-full flex items-center justify-center", t.hover)} aria-label="Close">
            <X size={16} className={t.textSoft} />
          </button>
        </div>
        {children}
      </div>
    </div>;
}
function AddVocabModal({
  onClose,
  onSave,
  showKurdish,
  initialExample
}) {
  const [form, setForm] = useState({
    word: "",
    meaning: "",
    ipa: "",
    partOfSpeech: "",
    example: initialExample || "",
    naturalExample: "",
    collocations: "",
    kurdishMeaning: "",
    cefr: "B1"
  });
  const set = k => e => setForm(f => ({
    ...f,
    [k]: e.target.value
  }));
  const save = () => {
    if (!form.word.trim() || !form.meaning.trim()) return;
    onSave({
      ...form,
      collocations: form.collocations.split(",").map(c => c.trim()).filter(Boolean)
    });
  };
  return <SheetModal title="Add word" onClose={onClose}>
      <div className="space-y-3">
        <div><FieldLabel><UIText text={"Word / phrase"} /> </FieldLabel><TextInput value={form.word} onChange={v => setForm(f => ({
          ...f,
          word: v
        }))} placeholder="e.g. reluctant" /></div>
        <div><FieldLabel><UIText text={"Meaning"} /></FieldLabel><TextInput value={form.meaning} onChange={v => setForm(f => ({
          ...f,
          meaning: v
        }))} placeholder="Unwilling and hesitant" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FieldLabel>IPA</FieldLabel><TextInput value={form.ipa} onChange={v => setForm(f => ({
            ...f,
            ipa: v
          }))} placeholder="/rɪˈlʌktənt/" /></div>
          <div><FieldLabel><UIText text={"Part of speech"} /> </FieldLabel><TextInput value={form.partOfSpeech} onChange={v => setForm(f => ({
            ...f,
            partOfSpeech: v
          }))} placeholder="adjective" /></div>
        </div>
        <div><FieldLabel><UIText text={"Example"} /></FieldLabel><TextInput value={form.example} onChange={v => setForm(f => ({
          ...f,
          example: v
        }))} placeholder="He was reluctant to leave." /></div>
        <div><FieldLabel><UIText text={"Natural example"} /> </FieldLabel><TextInput value={form.naturalExample} onChange={v => setForm(f => ({
          ...f,
          naturalExample: v
        }))} placeholder="He didn't really want to leave." /></div>
        <div><FieldLabel><UIText text={"Collocations (comma separated)"} /> </FieldLabel><TextInput value={form.collocations} onChange={v => setForm(f => ({
          ...f,
          collocations: v
        }))} placeholder="reluctant to, reluctantly agree" /></div>
        {showKurdish && <div><FieldLabel><UIText text={"Kurdish meaning (optional)"} /> </FieldLabel><TextInput value={form.kurdishMeaning} onChange={v => setForm(f => ({
          ...f,
          kurdishMeaning: v
        }))} placeholder="..." /></div>}
        <div><FieldLabel>CEFR</FieldLabel><SelectPills value={form.cefr} options={ENGLISH_LEVELS} onChange={v => setForm(f => ({
          ...f,
          cefr: v
        }))} /></div>
        <PrimaryButton full icon={Check} onClick={save}><UIText text={"Save word"} /> </PrimaryButton>
      </div>
    </SheetModal>;
}
function buildReviewItem(entry, allWords) {
  const type = REVIEW_TYPES[Math.floor(Math.random() * REVIEW_TYPES.length)];
  if (type === "fill") {
    const blanked = entry.example && entry.example.toLowerCase().includes(entry.word.toLowerCase()) ? entry.example.replace(new RegExp(entry.word, "i"), "_____") : `Fill in the blank: "I need to use the word _____ (meaning: ${entry.meaning})."`;
    return {
      type,
      prompt: blanked,
      mode: "text",
      grade: ans => ans.trim().toLowerCase() === entry.word.toLowerCase()
    };
  }
  if (type === "sentence") {
    return {
      type,
      prompt: `Use "${entry.word}" in your own sentence.`,
      mode: "text",
      grade: ans => ans.toLowerCase().includes(entry.word.toLowerCase()) && ans.trim().split(/\s+/).filter(Boolean).length >= 4
    };
  }
  if (type === "collocation") {
    if (entry.collocations && entry.collocations.length) {
      return {
        type,
        prompt: `Name a word or phrase that often goes with "${entry.word}".`,
        mode: "text",
        grade: ans => entry.collocations.some(c => ans.toLowerCase().includes(c.toLowerCase()))
      };
    }
    return {
      type,
      prompt: `Think of a word or phrase that often goes with "${entry.word}".`,
      mode: "selfreport",
      reveal: "No collocations saved yet for this word — self-check your idea."
    };
  }
  if (type === "natural") {
    if (entry.naturalExample) {
      return {
        type,
        prompt: `Rephrase this more naturally: "${entry.example || entry.word}"`,
        mode: "text",
        grade: ans => {
          const targetWords = new Set(entry.naturalExample.toLowerCase().split(/\W+/).filter(w => w.length > 3));
          const overlap = ans.toLowerCase().split(/\W+/).filter(w => targetWords.has(w)).length;
          return overlap >= 2;
        }
      };
    }
    return {
      type,
      prompt: `How would you say "${entry.word}" naturally in a sentence?`,
      mode: "selfreport",
      reveal: entry.example || entry.meaning
    };
  }
  if (type === "recognition") {
    const distractors = allWords.filter(w => w.id !== entry.id).map(w => w.word).filter(Boolean);
    const shuffled = [...distractors].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...shuffled, entry.word].sort(() => Math.random() - 0.5);
    if (options.length < 2) return {
      type: "meaning",
      prompt: `What does "${entry.word}" mean?`,
      mode: "selfreport",
      reveal: entry.meaning
    };
    return {
      type,
      prompt: `Which word means: "${entry.meaning}"?`,
      mode: "mcq",
      options,
      grade: ans => ans === entry.word
    };
  }
  return {
    type: "meaning",
    prompt: `What does "${entry.word}" mean?`,
    mode: "selfreport",
    reveal: entry.meaning
  };
}
function VocabularyReviewSession({
  words,
  onUpdateWord,
  onFinish
}) {
  const {
    uiLang
  } = useAuth();
  const t = useThemeClasses();
  const {
    currentUser
  } = useAuth();
  const [queue] = useState(() => words.map(w => ({
    entry: w,
    item: buildReviewItem(w, words)
  })));
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState("answering");
  const [wasCorrect, setWasCorrect] = useState(false);
  const [tally, setTally] = useState({
    correct: 0,
    incorrect: 0
  });
  const current = queue[idx];
  const finishSession = async finalTally => {
    const reviewed = finalTally.correct + finalTally.incorrect;
    if (currentUser && reviewed > 0) {
      await awardActivity(currentUser.email, {
        type: "vocab_review",
        xp: reviewed * ACTIVITY_XP.vocab_review,
        minutes: Math.round(reviewed * 0.5),
        meta: {
          reviewed
        }
      });
    }
    onFinish(finalTally);
  };
  const finishOne = ok => {
    const updated = scheduleVocabReview(current.entry, ok);
    onUpdateWord(updated);
    setTally(tl => ({
      correct: tl.correct + (ok ? 1 : 0),
      incorrect: tl.incorrect + (ok ? 0 : 1)
    }));
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
    if (idx + 1 >= queue.length) finishSession(tally);else setIdx(idx + 1);
  };
  return <div className={cx("min-h-screen flex flex-col", t.bg)}>
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

            {phase === "answering" && current.item.mode === "mcq" && <div className="space-y-2">
                {current.item.options.map(opt => <button key={opt} onClick={() => finishOne(current.item.grade(opt))} className={cx("w-full text-start px-4 py-3 rounded-xl border text-sm font-medium", t.border, t.text, t.hover)}>
                    {opt}
                  </button>)}
              </div>}

            {phase === "answering" && current.item.mode === "text" && <>
                <input value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && submitText()} placeholder={translate("Type your answer…", uiLang)} className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500", t.surfaceAlt, t.border, t.text)} />
                <PrimaryButton full className="mt-3" onClick={submitText}><UIText text={"Submit"} /></PrimaryButton>
              </>}

            {phase === "answering" && current.item.mode === "selfreport" && <SecondaryButton full onClick={() => setPhase("reveal")}><UIText text={"Show answer"} /> </SecondaryButton>}
            {phase === "reveal" && <div className="space-y-3">
                <p className={cx("text-sm rounded-xl px-3.5 py-2.5", t.surfaceAlt, t.text)}>{current.item.reveal}</p>
                <div className="grid grid-cols-2 gap-2">
                  <SecondaryButton onClick={() => finishOne(false)}><UIText text={"Missed it"} /> </SecondaryButton>
                  <PrimaryButton onClick={() => finishOne(true)}><UIText text={"Got it"} /> </PrimaryButton>
                </div>
              </div>}

            {phase === "feedback" && <div className="space-y-3">
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
              </div>}
          </Card>
        </div>
      </div>
    </div>;
}
function VocabularyPage() {
  const t = useThemeClasses();
  const {
    currentUser,
    profile
  } = useAuth();
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
  }, [currentUser?.email]);
  const persist = list => {
    setWords(list);
    saveList(key, list);
  };
  const addWord = fields => {
    const entry = defaultVocabEntry(fields);
    persist([entry, ...words]);
    setShowAdd(false);
  };
  const toggleFavorite = id => {
    persist(words.map(w => w.id === id ? {
      ...w,
      favorite: !w.favorite
    } : w));
  };
  const updateWordFromReview = updated => {
    setWords(prev => {
      const next = prev.map(w => w.id === updated.id ? updated : w);
      saveList(key, next);
      return next;
    });
  };
  const dueWords = words.filter(isDue);
  const filtered = words.filter(w => filter === "All" ? true : filter === "Due" ? isDue(w) : w.mastery === "mastered");
  if (reviewing) {
    return <VocabularyReviewSession words={dueWords.length ? dueWords : words} onUpdateWord={updateWordFromReview} onFinish={tally => {
      setReviewing(false);
      setSummary(tally);
    }} />;
  }
  return <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Vocabulary" subtitle={`${dueWords.length} word${dueWords.length === 1 ? "" : "s"} due for review`} />
        <button onClick={() => setShowAdd(true)} className={cx("h-9 w-9 rounded-full flex items-center justify-center border shrink-0 mt-1", t.border, t.hover)} aria-label="Add word">
          <Plus size={16} className={t.text} />
        </button>
      </div>

      {summary && <Card className="flex items-center justify-between">
          <p className={cx("text-sm", t.text)}><UIText text={"Last review:"} /> {summary.correct}<UIText text={"correct,"} /> {summary.incorrect}<UIText text={"to revisit."} /> </p>
          <button onClick={() => setSummary(null)} className={t.textFaint}><X size={14} /></button>
        </Card>}

      <div className="flex gap-2">
        {tabs.map(tab => <button key={tab} onClick={() => setFilter(tab)} className={cx("px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors", filter === tab ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft, t.hover))}>
            {tab}
          </button>)}
      </div>

      <div className="space-y-3">
        {loaded && filtered.map(w => <Card key={w.id} className="flex items-start justify-between gap-3">
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
          </Card>)}
        {loaded && filtered.length === 0 && <p className={cx("text-sm text-center py-8", t.textSoft)}>
            {words.length === 0 ? "No words yet — add one manually to start learning." : "No words in this list."}
          </p>}
      </div>

      <PrimaryButton full icon={RotateCcw} onClick={() => setReviewing(true)} className={words.length === 0 ? "opacity-40 pointer-events-none" : ""}><UIText text={"Review"} /> {dueWords.length > 0 ? "due words" : "words"}
      </PrimaryButton>

      {showAdd && <AddVocabModal onClose={() => setShowAdd(false)} onSave={addWord} showKurdish={showKurdish} />}
    </div>;
}
function ProgressPage() {
  const {
    loaded,
    profile,
    lessonsCompleted,
    vocab,
    xpTotal
  } = useProgressData();
  return <div className="space-y-6 pb-6"><PageHeader title="Progress" subtitle="Your assigned level and completed lessons" /><div className="grid grid-cols-2 gap-3"><StatCard icon={GraduationCap} label="Assigned level" value={profile.assessment.assignedLevel} /><StatCard icon={BookOpen} label="Lessons completed" value={loaded ? lessonsCompleted : 0} /><StatCard icon={Layers} label="Words saved" value={loaded ? vocab.length : 0} /><StatCard icon={Star} label="Total XP" value={loaded ? xpTotal : 0} /></div><Card><SectionHeading title="Placement test result" />{Object.entries(profile.assessment.categories).map(([name, category]) => <div key={name} className="mb-3"><div className="flex justify-between mb-1 text-sm"><UIText text={name} /><span>{Math.round(category.score * 100)}%</span></div><ProgressBar value={category.score * 100} /></div>)}<p className="text-xs"><UIText text="This is a lesson-placement estimate, not an official CEFR certificate. Listening, speaking and writing are not assessed." /></p></Card></div>;
}
const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
function FieldLabel({
  children
}) {
  const t = useThemeClasses();
  return <label className={cx("block text-xs font-medium mb-1.5", t.textSoft)}><UIText text={children} /></label>;
}
function TextInput({
  value,
  onChange,
  placeholder
}) {
  const t = useThemeClasses();
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cx("w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border focus:ring-2 focus:ring-teal-500 focus:border-teal-500", t.surfaceAlt, t.border, t.text)} />;
}
function SelectPills({
  value,
  options,
  onChange
}) {
  const t = useThemeClasses();
  return <div className="flex flex-wrap gap-2">
      {options.map(opt => <button key={opt} type="button" onClick={() => onChange(opt)} className={cx("px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors", value === opt ? "bg-teal-600 border-teal-600 text-white" : cx(t.border, t.textSoft, t.hover))}>
          {opt}
        </button>)}
    </div>;
}
function ProfilePage() {
  const t = useThemeClasses();
  const T = useT();
  const {
    currentUser,
    profile,
    updateProfile,
    isRTL
  } = useAuth();
  const {
    loaded: progressLoaded,
    roadmap,
    activityLog,
    xpTotal,
    streak,
    achievements
  } = useProgressData();
  const [form, setForm] = useState(profile || defaultProfile(currentUser?.name, currentUser?.email));
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [profileError, setProfileError] = useState('');
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);
  const set = key => val => setForm(f => ({
    ...f,
    [key]: val
  }));
  const save = async () => {
    if (!form.name?.trim()) return setProfileError('Enter your name.');
    setProfileError('');
    try {
      await updateProfile({
        ...form,
        name: form.name.trim()
      });
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setProfileError('Could not save your details. Please try again.');
    }
  };
  if (!profile) return null;
  return <div className="space-y-6 pb-6">
      {profileError && <p role="alert" className="text-sm text-red-600"><UIText text={profileError} /></p>}
      {savedFlash && <p role="status" className="text-sm text-teal-600"><UIText text="Saved" /></p>}
      <PageHeader title={T("nav_profile")} />

      <Card className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-teal-600 text-white flex items-center justify-center text-xl font-bold shrink-0" style={{
        fontFamily: "var(--font-display)"
      }}>
          {(form.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? <input value={form.name} onChange={e => set("name")(e.target.value)} className={cx("text-sm font-semibold rounded-lg px-2 py-1 border w-full", t.surfaceAlt, t.border, t.text)} /> : <p className={cx("text-base font-semibold", t.text)}>{form.name}</p>}
          <p className={cx("text-xs mt-0.5", t.textSoft)}>{window.CADENCE_SESSION?.mode !== 'guest' && currentUser?.email}<UIText text={"· Level"} /> {roadmap ? roadmap.overallLevel : profile?.englishLevel || "—"}</p>
        </div>
        <button onClick={() => editing ? save() : setEditing(true)} className={cx("h-9 w-9 rounded-full flex items-center justify-center border shrink-0", t.border, t.hover)} aria-label="Edit profile">
          {editing ? <Check size={15} className="text-teal-600" /> : <Pencil size={15} className={t.textSoft} />}
        </button>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Star} label="Total XP" value={progressLoaded ? xpTotal.toLocaleString() : "—"} accent="teal" />
        <StatCard icon={Clock} label="Minutes" value={progressLoaded ? activityLog.reduce((s, e) => s + (e.minutes || 0), 0).toLocaleString() : "—"} accent="amber" />
        <StatCard icon={Flame} label="Best streak" value={progressLoaded ? `${streak.best} days` : "—"} accent="teal" />
      </div>

      <div>
        <SectionHeading title="Achievements" subtitle={progressLoaded ? `${achievements.length} / ${ACHIEVEMENT_DEFS.length}` : undefined} />
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENT_DEFS.map(def => {
          const earned = progressLoaded && achievements.some(a => a.id === def.id);
          const Icon = def.icon;
          return <Card key={def.id} className={cx("flex flex-col items-center text-center gap-2 py-4", !earned && "opacity-40")}>
                <div className={cx("h-10 w-10 rounded-full flex items-center justify-center", earned ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : t.surfaceAlt)}>
                  {earned ? <Icon size={17} /> : <Lock size={15} className={t.textFaint} />}
                </div>
                <p className={cx("text-[11px] font-medium leading-tight", t.text)}>{def.title}</p>
              </Card>;
        })}
        </div>
      </div>

      <div>
        <SectionHeading title="Learning profile" action={editing ? <button onClick={save} className="text-xs font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1">
                <Check size={13} /> {T("savingChanges")}
              </button> : <button onClick={() => setEditing(true)} className="text-xs font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-1">
                <Pencil size={12} /> <UIText text={"Edit"} />
              </button>} />
        <Card className="space-y-3"><div className="flex justify-between gap-3"><UIText text="Assigned level" /><Badge>{profile.assessment.assignedLevel}</Badge></div><p className={cx('text-xs', t.textSoft)}><UIText text="Your placement test determines your lesson level." /></p><p className={cx('text-xs', t.textSoft)}><UIText text="Progress is saved in this browser. Clearing browser data removes it." /></p></Card>
      </div>
    </div>;
}
function SettingsRow({
  icon: Icon,
  label,
  sub,
  right
}) {
  const t = useThemeClasses();
  return <div className="flex items-center gap-3 px-5 py-3.5">
      <div className={cx("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", t.surfaceAlt)}>
        <Icon size={16} className={t.textSoft} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cx("text-sm font-medium", t.text)}>{label}</p>
        {sub && <p className={cx("text-xs", t.textSoft)}><UIText text={sub} /></p>}
      </div>
      {right}
    </div>;
}
function SettingsPage({
  onNavigate
}) {
  const t = useThemeClasses();
  const {
    isDark,
    toggle
  } = useTheme();
  const {
    uiLang,
    changeUiLang,
    currentUser,
    profile
  } = useAuth();
  return <div className="space-y-6 pb-6"><PageHeader title="Settings" /><Card className="space-y-5"><SectionHeading title="Appearance" /><SettingsRow icon={isDark ? Moon : Sun} label={<UIText text="Dark mode" />} right={<Switch checked={isDark} onChange={toggle} label="Dark mode" />} /><div className="flex justify-between items-center gap-3"><UIText text="App language" /><div className="flex gap-2">{['en', 'ku'].map(lang => <button type="button" key={lang} onClick={() => changeUiLang(lang)} className={cx('rounded-full px-3 py-2 text-sm border', t.border, uiLang === lang && 'bg-teal-600 text-white')}>{lang === 'en' ? 'English' : 'کوردی'}</button>)}</div></div></Card><Card className="space-y-4"><SectionHeading title="Student profile" /><div className="flex justify-between gap-3"><span className={t.text}>{currentUser.name}</span><Badge>{profile.assessment.assignedLevel}</Badge></div><SecondaryButton full onClick={() => onNavigate('profile')}><UIText text="Edit profile" /></SecondaryButton></Card><Card className="space-y-3"><SectionHeading title="Your saved progress" /><p className={cx('text-sm leading-relaxed', t.textSoft)}><UIText text="Progress is saved in this browser. Clearing browser data removes it." /></p><p className={cx('text-xs', t.textSoft)}><UIText text="No email or password is required. Progress does not synchronize between devices." /></p></Card></div>;
}
function InterfaceLanguage() {
  const {
    uiLang,
    changeUiLang
  } = useAuth();
  return <button type="button" onClick={() => changeUiLang(uiLang === 'ku' ? 'en' : 'ku')} aria-label="Change interface language" className="text-sm rounded-full border border-slate-300 px-3 py-2">{uiLang === 'ku' ? 'English' : 'کوردی'}</button>;
}
function AssessmentIntro({
  onStart,
  draftCount,
  busy,
  error
}) {
  const t = useThemeClasses();
  const {
    profile
  } = useAuth();
  const [name, setName] = useState(profile?.onboardingComplete ? profile.name || '' : '');
  return <div className={cx('min-h-screen px-5 py-10 flex items-center justify-center', t.bg)}><div className="w-full max-w-md"><div className="flex justify-between items-center mb-6"><Logo /><InterfaceLanguage /></div><Card className="space-y-5"><Badge><UIText text="Required placement test" /></Badge><h1 className={cx('text-2xl font-bold', t.text)}><UIText text="Find your starting level" /></h1><p className={cx('text-sm leading-relaxed', t.textSoft)}><UIText text="Complete 36 questions in grammar, vocabulary and reading. Your result opens the lessons assigned to your level." /></p><div className="grid grid-cols-3 gap-2">{['Grammar', 'Vocabulary', 'Reading'].map(skill => <div key={skill} className={cx('rounded-xl p-3 text-center text-xs', t.surfaceAlt, t.text)}><UIText text={skill} /><p className="mt-1">12 <UIText text="questions" /></p></div>)}</div><p className={cx('text-xs', t.textSoft)}><UIText text="Allow about 20–30 minutes. You can close the page and resume in this browser. The test cannot be skipped." /></p><label className={cx('block text-sm', t.text)}><UIText text="Student name" /><input value={name} maxLength={80} onChange={event => setName(event.target.value)} className={cx('w-full rounded-xl border px-4 py-3 mt-2', t.border, t.surface, t.text)} autoComplete="name" /></label>{draftCount > 0 && <p className="text-sm text-teal-600">{draftCount}/36 <UIText text="answers saved" /></p>}{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button type="button" disabled={busy || !name.trim()} onClick={() => onStart(name.trim())} className="w-full rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">{busy ? <UIText text="Saving..." /> : <UIText text={draftCount ? 'Resume test' : 'Start test'} />}</button><p className={cx('text-xs leading-relaxed', t.textSoft)}><UIText text="This is a lesson-placement estimate, not an official CEFR certificate. Listening, speaking and writing are not assessed." /></p></Card></div></div>;
}
function AssessmentQuestion({
  item,
  index,
  total,
  onSubmit,
  busy,
  error
}) {
  const t = useThemeClasses();
  const [answer, setAnswer] = useState('');
  const {
    currentUser
  } = useAuth();
  const options = React.useMemo(() => orderPlacementOptions(item, currentUser.email), [item, currentUser.email]);
  return <div className={cx('min-h-screen px-5 py-6', t.bg)}><div className="max-w-xl mx-auto space-y-5"><div className="flex justify-between"><Logo compact /><div className="flex gap-2"><InterfaceLanguage /><ThemeToggle /></div></div><div className="flex justify-between"><Badge><UIText text="Placement test" /></Badge><span className={cx('text-sm', t.textSoft)}>{index + 1} / {total}</span></div><ProgressBar value={index} max={total} /><Card><div className="mb-4"><Badge><UIText text={item.skill.charAt(0).toUpperCase() + item.skill.slice(1)} /></Badge></div><div dir="ltr" className="text-left">{item.passage && <div className={cx('rounded-xl p-4 mb-5 text-sm leading-relaxed', t.surfaceAlt, t.text)}>{item.passage}</div>}<fieldset disabled={busy}><legend className={cx('text-base font-semibold mb-5', t.text)}>{item.prompt}</legend><div className="space-y-3">{options.map(option => <label key={option} className={cx('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer', t.border, t.text, answer === option && 'border-teal-600 bg-teal-600/10')}><input type="radio" name={item.id} value={option} checked={answer === option} onChange={() => setAnswer(option)} className="mt-1" />{option}</label>)}</div></fieldset></div><button type="button" disabled={busy} onClick={() => setAnswer('__unknown__')} className={cx('mt-4 rounded-xl border px-4 py-2 text-sm', t.border, t.textSoft, answer === '__unknown__' && 'border-teal-600 bg-teal-600/10')}><UIText text="I don't know" /></button></Card>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button type="button" disabled={busy || !answer} onClick={() => onSubmit(answer)} className="w-full rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white">{busy ? <UIText text="Saving..." /> : <UIText text={index === total - 1 ? 'Finish test and open my lessons' : 'Save answer and continue'} />}</button><p className={cx('text-xs', t.textSoft)}><UIText text="Every question needs an answer. Choose I don't know when you are unsure." /></p></div></div>;
}
function PlacementAssessment() {
  const {
    profile,
    currentUser,
    updateProfile,
    isRTL
  } = useAuth();
  const [answers, setAnswers] = useState(() => getPlacementDraft(profile).answers),
    [stage, setStage] = useState('intro'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = React.useRef(false);
  const item = PLACEMENT_QUESTIONS[answers.length];
  const start = async name => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await updateProfile({
        name,
        onboardingComplete: true
      });
      setStage('testing');
    } catch {
      setError(isRTL ? 'زانیارییەکان پاشەکەوت نەکران. دووبارە هەوڵبدە.' : 'Could not save your details. Please try again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = async answer => {
    if (lock.current || !item) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const next = [...answers, {
      id: item.id,
      answer
    }];
    try {
      if (next.length === PLACEMENT_QUESTIONS.length) {
        const result = scorePlacement(next);
        await updateProfile({
          assessment: result,
          englishLevel: result.assignedLevel,
          assignedLevel: result.assignedLevel,
          placementComplete: true,
          placementSkipped: false,
          placementDraft: null
        });
        if (currentUser) await awardActivity(currentUser.email, {
          type: 'placement_assessment',
          xp: ACTIVITY_XP.placement_assessment,
          minutes: 0,
          meta: {
            level: result.assignedLevel
          }
        });
      } else {
        await updateProfile({
          placementDraft: {
            version: PLACEMENT_VERSION,
            answers: next
          }
        });
        setAnswers(next);
      }
    } catch {
      setError(isRTL ? 'وەڵامەکە پاشەکەوت نەکرا. دووبارە هەوڵبدە.' : 'Your answer was not saved. Please try again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (stage === 'intro') return <AssessmentIntro onStart={start} draftCount={answers.length} busy={busy} error={error} />;
  return item ? <AssessmentQuestion key={item.id} item={item} index={answers.length} total={PLACEMENT_QUESTIONS.length} onSubmit={submit} busy={busy} error={error} /> : <LoadingScreen />;
}
const vocabKey = email => `vocab:${email.trim().toLowerCase()}`;
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
    nextReviewDate: now
  };
}
function scheduleVocabReview(entry, wasCorrect) {
  const now = new Date();
  let {
    repetitions = 0,
    interval = 0,
    easeFactor = 2.5
  } = entry;
  if (wasCorrect) {
    repetitions += 1;
    if (repetitions === 1) interval = 1;else if (repetitions === 2) interval = 3;else interval = Math.round(interval * easeFactor);
    easeFactor = Math.min(3, easeFactor + 0.1);
  } else {
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }
  const mastery = repetitions >= 4 ? "mastered" : repetitions >= 1 ? "learning" : "new";
  return {
    ...entry,
    repetitions,
    interval,
    easeFactor,
    mastery,
    lastReviewedAt: now.toISOString(),
    nextReviewDate: addDays(now, interval).toISOString()
  };
}
function isDue(entry) {
  return new Date(entry.nextReviewDate) <= new Date();
}
const activityLogKey = email => `activity_log:${email.trim().toLowerCase()}`;
const achievementsKey = email => `achievements_earned:${email.trim().toLowerCase()}`;
const ACTIVITY_XP = {
  placement_assessment: 100,
  level_lesson: 20,
  vocab_review: 5
};
async function awardActivity(email, {
  type,
  xp,
  minutes = 0,
  meta = {}
}) {
  if (!email) return null;
  const list = await loadList(activityLogKey(email));
  const entry = {
    id: genId(),
    date: new Date().toISOString(),
    type,
    xp: Math.max(0, Math.round(xp)),
    minutes: Math.max(0, Math.round(minutes)),
    meta
  };
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
function computeStreak(log) {
  const days = new Set(log.map(e => dayKey(e.date)));
  if (days.size === 0) return {
    current: 0,
    best: 0
  };
  let current = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.toISOString()))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const sortedDays = [...days].sort();
  let best = 0,
    run = 0,
    prev = null;
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
  return {
    current,
    best: Math.max(best, current)
  };
}
const ACHIEVEMENT_DEFS = [{
  id: "first_lesson",
  title: "First lesson",
  icon: CalendarCheck,
  check: d => d.lessonsCompleted >= 1
}, {
  id: "streak_7",
  title: "7-day streak",
  icon: Flame,
  check: d => d.streakBest >= 7
}, {
  id: "streak_30",
  title: "30-day streak",
  icon: ShieldCheck,
  check: d => d.streakBest >= 30
}, {
  id: "vocab_10",
  title: "10 words saved",
  icon: BookMarked,
  check: d => d.vocabTotal >= 10
}, {
  id: "vocab_mastered_10",
  title: "10 words mastered",
  icon: Award,
  check: d => d.vocabMastered >= 10
}, {
  id: "course_complete",
  title: "First course completed",
  icon: Trophy,
  check: d => d.coursesCompleted >= 1
}, {
  id: "level_b1",
  title: "Reached B1",
  icon: GraduationCap,
  check: d => d.overallIndex >= 2
}, {
  id: "level_b2",
  title: "Reached B2",
  icon: Trophy,
  check: d => d.overallIndex >= 3
}];
async function evaluateAchievements(email, data) {
  const earnedRaw = await loadList(achievementsKey(email));
  const earnedMap = Object.fromEntries(earnedRaw.map(e => [e.id, e]));
  let changed = false;
  ACHIEVEMENT_DEFS.forEach(def => {
    if (!earnedMap[def.id] && def.check(data)) {
      earnedMap[def.id] = {
        id: def.id,
        earnedAt: new Date().toISOString()
      };
      changed = true;
    }
  });
  const next = Object.values(earnedMap);
  if (changed) await saveList(achievementsKey(email), next);
  return next;
}
function useProgressData() {
  const {
    profile,
    currentUser
  } = useAuth();
  const [loaded, setLoaded] = useState(false),
    [data, setData] = useState(null);
  const roadmap = profile?.assessment ? {
    overallLevel: profile.assessment.assignedLevel,
    overallIndex: profile.assessment.overallIndex
  } : null;
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    (async () => {
      const [allActivity, vocab, raw] = await Promise.all([loadList(activityLogKey(currentUser.email)), loadList(vocabKey(currentUser.email)), safeGet(levelProgressKey(currentUser.email))]);
      let progress = {
        completed: {}
      };
      try {
        progress = parseLessonProgress(raw);
      } catch {}
      const stats = levelProgress(profile.assessment, progress),
        activityLog = allActivity.filter(entry => ['placement_assessment', 'level_lesson', 'vocab_review'].includes(entry.type)),
        streak = computeStreak(activityLog),
        xpTotal = computeXPTotal(activityLog);
      const achievements = await evaluateAchievements(currentUser.email, {
        lessonsCompleted: stats.completed,
        streakBest: streak.best,
        vocabTotal: vocab.length,
        vocabMastered: vocab.filter(word => word.mastery === 'mastered').length,
        coursesCompleted: stats.published > 0 && stats.completed === stats.published ? 1 : 0,
        overallIndex: profile.assessment.overallIndex
      });
      if (active) {
        setData({
          activityLog,
          vocab,
          xpTotal,
          streak,
          achievements,
          lessonsCompleted: stats.completed
        });
        setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUser?.email, profile?.assessment?.completedAt]);
  return {
    loaded,
    profile,
    currentUser,
    roadmap,
    ...(data || {})
  };
}
function GlobalStyle() {
  return <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap');
      :root { --font-display: 'Sora', ui-sans-serif, system-ui, sans-serif; --font-body: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      :root[dir="rtl"] { --font-display: 'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif; --font-body: 'Noto Sans Arabic', ui-sans-serif, system-ui, sans-serif; }
      * { font-family: var(--font-body); }
    `}</style>;
}
function LoadingScreen() {
  const t = useThemeClasses();
  return <div className={cx("min-h-screen flex items-center justify-center", t.bg)}>
      <Loader2 size={22} className={cx("animate-spin", t.textFaint)} />
    </div>;
}
function AppShell() {
  const [page, setPage] = useState('courses'),
    [moreOpen, setMoreOpen] = useState(false);
  const {
    isRTL
  } = useAuth();
  const navigate = id => {
    setPage(id);
    setMoreOpen(false);
  };
  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage onNavigate={navigate} />;
      case 'courses':
        return <CoursesPage />;
      case 'vocabulary':
        return <VocabularyPage />;
      case 'progress':
        return <ProgressPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage onNavigate={navigate} />;
      default:
        return <CoursesPage />;
    }
  };
  return <div dir={isRTL ? 'rtl' : 'ltr'} className="flex"><Sidebar page={page} onNavigate={navigate} /><div className="flex-1 min-w-0 flex flex-col"><MobileTopBar page={page} /><main className="flex-1 px-4 md:px-8 pt-4 md:pt-8 pb-24 md:pb-10 max-w-6xl w-full mx-auto">{renderPage()}</main></div><BottomNav page={page} onNavigate={navigate} onMore={() => setMoreOpen(true)} /><MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} page={page} onNavigate={navigate} /></div>;
}
function RootGate() {
  const {
    status,
    isRTL,
    profile
  } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'storageError') return <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center px-5"><div role="alert">{isRTL ? 'پێشکەوتنە پاشەکەوتکراوەکان نەخوێنرانەوە.' : 'Could not read your saved progress.'}<button onClick={() => location.reload()} className="m-4 underline"><UIText text="Retry" /></button></div></main>;
  if (status === 'signedOut') return <AuthFlow />;
  if (!hasValidPlacement(profile?.assessment)) return <div dir={isRTL ? 'rtl' : 'ltr'}><PlacementAssessment /></div>;
  return <AppShell />;
}
export default function App() {
  const [isDark, setIsDark] = useState(false);
  return <ThemeContext.Provider value={{
    isDark,
    toggle: () => setIsDark(d => !d)
  }}>
      <AuthProvider>
        <div className={cx(isDark ? "dark" : "", "min-h-screen", isDark ? "bg-slate-950" : "bg-slate-50")}>
          <AppNotice />
          <GlobalStyle />
          <RootGate />
        </div>
      </AuthProvider>
    </ThemeContext.Provider>;
}
