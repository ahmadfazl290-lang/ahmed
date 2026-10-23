// Learning preferences share the active student's identity and storage.
import React, {useState, useContext, createContext, useEffect} from 'react';
import {Check, Pencil} from 'lucide-react';
import {translate} from './repository-i18n.js';
const STRINGS = {en:{savingChanges:'Save changes',saved:'Saved'},ku:{savingChanges:'پاشەکەوتکردنی گۆڕانکارییەکان',saved:'پاشەکەوتکرا'}};
const cx = (...parts) => parts.filter(Boolean).join(" ");

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

function useT() {
  const { uiLang } = useAuth();
  const dict = STRINGS[uiLang] || STRINGS.en;
  return (key) => dict[key] || STRINGS.en[key] || key;
}

const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

function UIText({text}) { const {uiLang}=useAuth(); return <>{translate(text,uiLang)}</>; }

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
          <UIText text={title}/>
        </h2>
        {subtitle && <p className={cx("text-sm mt-0.5", t.textSoft)}><UIText text={subtitle}/></p>}
      </div>
      {action}
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

const GOAL_OPTIONS = ["Travel", "Work", "Exams", "Study abroad", "Everyday conversation", "Immigration"];

const PRIORITY_OPTIONS = [
  "Speaking", "Pronunciation", "Grammar", "Vocabulary", "Academic English",
  "Professional English", "Travel", "Meetings", "Presentations", "Job interviews",
];

const INTEREST_OPTIONS = ["Movies & TV", "Technology", "Sports", "Music", "Business", "Travel", "Science", "Art & culture"];

const STUDY_TIMES = ["Morning", "Afternoon", "Evening", "Night"];

const SUPPORT_LANGS = ["English only", "English + Kurdish Sorani"];

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
          <UIText text={String(opt)}/>
        </button>
      ))}
    </div>
  );
}

function MultiSelectPills({ values = [], options, onChange }) {
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
          <UIText text={String(opt)}/>
        </button>
      ))}
    </div>
  );
}

function LearningPreferences() {
  const t = useThemeClasses();
  const T = useT();
  const { currentUser, profile, updateProfile, isRTL } = useAuth();
  const [form, setForm] = useState(profile || {});
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const save = async () => {
    if(saving)return;
    setSaving(true);setSaveError(false);
    const allowed=['nativeLanguage','targetLanguage','supportLanguage','learningGoals','priorities','interests','professionalField','dailyGoalMinutes','preferredStudyTime'];
    try{
      await updateProfile(Object.fromEntries(allowed.filter(key=>form[key]!==undefined).map(key=>[key,form[key]])));
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }catch{setSaveError(true);}finally{setSaving(false);}
  };

  if (!profile) return null;

return <div className="space-y-6 pb-6"><div>
        {saveError && <p role="alert" className="text-sm text-red-600"><UIText text="Could not save your details. Please try again."/></p>}
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
            <Badge tone="teal">{profile.assessment.assignedLevel}</Badge>
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

          <div>
            <FieldLabel><UIText text={"Support language"}/></FieldLabel>{editing ? <SelectPills value={form.supportLanguage} options={SUPPORT_LANGS} onChange={set("supportLanguage")}/> : <p className={cx("text-sm",t.text)}>{form.supportLanguage}</p>}
          </div>

          {editing && (
            <PrimaryButton full icon={Check} onClick={save}>{T("savingChanges")}</PrimaryButton>
          )}
        </Card>
      </div></div>;
}
export function RecoveredLearning({page,auth,theme}) {
 if(page!=='preferences') return null;
 return <ThemeContext.Provider value={theme}><AuthContext.Provider value={auth}><div className="ec-recovered-learning" data-recovered-section="preferences"><LearningPreferences/></div></AuthContext.Provider></ThemeContext.Provider>;
}
