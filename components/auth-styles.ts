// Authentication-only styles use the same native style rendering as the learning app.
const styles = {
  "page": "ec-auth-page",
  "shell": "ec-auth-shell",
  "topbar": "ec-auth-topbar",
  "brand": "ec-auth-brand",
  "brandMark": "ec-auth-brandMark",
  "language": "ec-auth-language",
  "card": "ec-auth-card",
  "eyebrow": "ec-auth-eyebrow",
  "heading": "ec-auth-heading",
  "subtitle": "ec-auth-subtitle",
  "form": "ec-auth-form",
  "field": "ec-auth-field",
  "labelRow": "ec-auth-labelRow",
  "label": "ec-auth-label",
  "inputWrap": "ec-auth-inputWrap",
  "input": "ec-auth-input",
  "password": "ec-auth-password",
  "toggle": "ec-auth-toggle",
  "hint": "ec-auth-hint",
  "met": "ec-auth-met",
  "fieldError": "ec-auth-fieldError",
  "primary": "ec-auth-primary",
  "secondary": "ec-auth-secondary",
  "textButton": "ec-auth-textButton",
  "switcher": "ec-auth-switcher",
  "notice": "ec-auth-notice",
  "success": "ec-auth-success",
  "statusIcon": "ec-auth-statusIcon",
  "center": "ec-auth-center",
  "email": "ec-auth-email",
  "actions": "ec-auth-actions",
  "help": "ec-auth-help",
  "footer": "ec-auth-footer",
  "guest": "ec-auth-guest",
  "local": "ec-auth-local",
  "loading": "ec-auth-loading",
  "spinner": "ec-auth-spinner"
};
export default styles;
export const authCSS = `
.ec-auth-page { --auth-ink:#182d27; --auth-muted:#62716a; --auth-green:#087454; min-height:100svh; padding:36px 24px 30px; background:#fff; color:var(--auth-ink); font-family:"Segoe UI",Tahoma,Arial,sans-serif; }
.ec-auth-page :is(button,input) { font-family:inherit; }
.ec-auth-page *, .ec-auth-page *::before, .ec-auth-page *::after { box-sizing:border-box; }
.ec-auth-page a { text-decoration:none; }
.ec-auth-shell { width:100%; max-width:464px; margin-inline:auto; }
.ec-auth-topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:28px; }
.ec-auth-brand { display:inline-flex; align-items:center; gap:10px; font-size:20px; font-weight:750; letter-spacing:-.65px; direction:ltr; }
.ec-auth-brandMark { width:34px; height:36px; display:grid; place-items:center; background:var(--auth-green); color:white; border-radius:9px; }
.ec-auth-language { min-height:40px; padding:7px 13px; border:1px solid #dce4df; border-radius:8px; background:white; font-size:13px; font-weight:600; cursor:pointer; }
.ec-auth-card { border:1px solid #dfe7e1; border-top:3px solid var(--auth-green); border-radius:16px; background:#fff; padding:34px; box-shadow:0 4px 6px -4px #17382b0b,0 16px 40px -22px #17382b20; }
.ec-auth-eyebrow { margin:0 0 12px; color:var(--auth-green); font-size:11px; font-weight:750; letter-spacing:1.8px; text-transform:uppercase; }
.ec-auth-heading { margin:0; font-size:29px; font-weight:700; letter-spacing:-1px; line-height:1.25; text-wrap:balance; outline:none; }
.ec-auth-subtitle { margin:11px 0 27px; font-size:14px; line-height:1.7; color:var(--auth-muted); }
.ec-auth-form { display:grid; gap:19px; }
.ec-auth-field { display:grid; gap:7px; min-width:0; }
.ec-auth-labelRow { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ec-auth-label { font-size:13px; font-weight:600; line-height:1.5; }
.ec-auth-inputWrap { position:relative; min-width:0; }
.ec-auth-input { width:100%; height:48px; padding:11px 13px; border:1px solid #d0dbd4; border-radius:8px; background:#fff; color:#182d27; font-size:16px; line-height:24px; transition:border-color .15s,box-shadow .15s; }
.ec-auth-input::placeholder { color:#919c96; opacity:1; }
.ec-auth-input:hover:not(:disabled) { border-color:#97afa0; }
.ec-auth-input:focus { outline:none; border-color:#087454; box-shadow:0 0 0 3px #08745418; }
.ec-auth-input[aria-invalid=true] { border-color:#bd3838; }
.ec-auth-password { padding-right:48px; }
.ec-auth-toggle { position:absolute; right:3px; top:3px; width:42px; height:42px; display:grid; place-items:center; color:#64766d; background:transparent; border-radius:6px; cursor:pointer; }
.ec-auth-toggle:hover { color:var(--auth-green); background:#f1f7f3; }
.ec-auth-hint { color:var(--auth-muted); font-size:12px; line-height:1.6; margin:0; }
.ec-auth-met { color:var(--auth-green); }
.ec-auth-fieldError { color:#ad2e2e; font-size:12px; line-height:1.6; margin:0; }
.ec-auth-primary,.ec-auth-secondary { display:flex; align-items:center; justify-content:center; gap:9px; width:100%; min-height:48px; padding:12px 16px; border-radius:8px; border:1px solid transparent; font-size:14px; line-height:1.5; font-weight:650; cursor:pointer; transition:background .15s,box-shadow .15s; text-align:center; }
.ec-auth-primary { color:white; background:var(--auth-green); box-shadow:0 1px 2px #143c2720; }
.ec-auth-primary:hover:not(:disabled) { background:#065e45; }
.ec-auth-primary:active:not(:disabled) { background:#054c39; }
.ec-auth-secondary { background:white; color:var(--auth-ink); border-color:#d4ded7; }
.ec-auth-secondary:hover:not(:disabled) { background:#f5f8f5; }
.ec-auth-textButton { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:7px 0; background:transparent; border:0; color:var(--auth-green); font-size:13px; font-weight:650; cursor:pointer; text-align:start; line-height:1.6; }
.ec-auth-textButton:hover:not(:disabled) { color:#054c39; }
.ec-auth-switcher { margin-top:24px; padding-top:20px; border-top:1px solid #e8ede8; display:flex; flex-wrap:wrap; align-items:center; justify-content:center; column-gap:7px; font-size:13px; color:var(--auth-muted); }
.ec-auth-notice { display:flex; gap:9px; align-items:flex-start; margin:20px 0 0; padding:12px; background:#fcefee; border:1px solid #f0d2cf; border-radius:8px; color:#9b2929; font-size:13px; line-height:1.7; overflow-wrap:anywhere; }
.ec-auth-notice svg { flex-shrink:0; margin-top:4px; }
.ec-auth-success { background:#eff8f2; color:#12623e; border-color:#cce6d4; }
.ec-auth-statusIcon { width:60px; height:60px; margin:0 auto 23px; display:grid; place-items:center; border:1px solid #d6e9dd; background:#f0f8f2; border-radius:16px; color:var(--auth-green); }
.ec-auth-center { text-align:center; }
.ec-auth-email { display:block; max-width:100%; overflow-wrap:anywhere; font-size:14px; font-weight:650; color:var(--auth-ink); margin:-10px 0 27px; }
.ec-auth-actions { display:grid; gap:9px; }
.ec-auth-help { border-top:1px solid #e8ede8; margin-top:25px; padding-top:20px; font-size:12px; line-height:1.8; color:var(--auth-muted); }
.ec-auth-help p { margin:0; }
.ec-auth-help details { margin-top:10px; text-align:start; }
.ec-auth-help summary { cursor:pointer; font-weight:600; color:#425b4e; min-height:36px; padding:6px 0; }
.ec-auth-help details p { padding-top:5px; }
.ec-auth-footer { text-align:center; padding:17px 12px 0; }
.ec-auth-guest { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:44px; padding:9px 14px; border-radius:8px; color:#53665b; font-size:13px; }
.ec-auth-guest:hover { background:#edf3ee; color:var(--auth-green); }
.ec-auth-local { max-width:360px; margin:4px auto 0; font-size:11px; line-height:1.8; color:#69776e; }
.ec-auth-loading { min-height:240px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; font-size:14px; color:var(--auth-muted); text-align:center; }
.ec-auth-spinner { animation:spin 1s linear infinite; }
.ec-auth-page :is(button,a,summary):focus-visible { outline:3px solid #087454; outline-offset:3px; }
.ec-auth-page :is(button,input):disabled { opacity:.6; cursor:not-allowed; }
.ec-auth-page[dir=rtl] :is(.ec-auth-heading,.ec-auth-eyebrow) { letter-spacing:0; }
.ec-auth-page[dir=rtl] .ec-auth-heading { font-size:28px; line-height:1.6; }
.ec-auth-page[dir=rtl] .ec-auth-guest svg { transform:rotate(180deg); }
.ec-auth-page[dir=rtl] .ec-auth-primary > svg:not(.ec-auth-spinner),.ec-auth-page[dir=rtl] .ec-auth-switcher .ec-auth-textButton > svg { transform:rotate(180deg); }
@keyframes spin { to { transform:rotate(360deg); } }
@media(min-width:768px) { .ec-auth-page { padding-top:64px; } .ec-auth-topbar { margin-bottom:32px; } .ec-auth-card { padding:38px; } }
@media(max-width:374px) { .ec-auth-page { padding:22px 14px; } .ec-auth-card { padding:25px 20px; } .ec-auth-heading { font-size:26px; } .ec-auth-topbar { margin-bottom:22px; } .ec-auth-labelRow { align-items:flex-start; } .ec-auth-labelRow .ec-auth-textButton { font-size:12px; } }
@media(prefers-reduced-motion:reduce) { .ec-auth-page *, .ec-auth-page *::before, .ec-auth-page *::after { animation:none!important; transition:none!important; } }
`;
