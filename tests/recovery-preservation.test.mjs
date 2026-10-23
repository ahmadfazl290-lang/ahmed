import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('docs/RECOVERY-PROTECTED.json',root)));
const sha=value=>createHash('sha256').update(value).digest('hex');
// Undo only the authorized email rate-reporting edits before comparing the original frozen bytes.
const emailReportingEdits={
 'lib/supabase/auth-handler.ts':["return json({error:'rate'},429); // The SDK error carries no provider retry duration.\n  if (error.code === 'weak_password')","return limited(EMAIL_COOLDOWN_SECONDS);\n  if (error.code === 'weak_password')"],
 'components/SupabaseAccount.tsx':["if(response.status===429 && typeof data.retryAfter==='number' && Number.isFinite(data.retryAfter) && data.retryAfter>0)cooldown(data.retryAfter);","if(response.status===429)cooldown(data.retryAfter);"],
};
test('recovery preserves frozen account, MFA, callback, provider, dependency and data-format files',()=>{for(const [file,hash]of Object.entries(manifest.files)){let content=readFileSync(new URL(file,root));const edit=emailReportingEdits[file];if(edit){const text=content.toString('utf8');assert.equal(text.split(edit[0]).length,2,file+' has exactly the approved reporting edit');content=Buffer.from(text.replace(edit[0],edit[1]));}assert.equal(sha(content),hash,file);}});
test('recovery preserves protected sections inside shared application file',()=>{const text=readFileSync(new URL(manifest.source,root),'utf8');const sf=ts.createSourceFile('App.jsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);const sections={};for(const n of sf.statements){if(ts.isFunctionDeclaration(n)&&n.name)sections[n.name.text]=n.getText(sf);else if(ts.isVariableStatement(n))for(const x of n.declarationList.declarations)sections[x.name.getText(sf)]=x.getText(sf);}for(const [name,hash]of Object.entries(manifest.sections))assert.equal(sha(sections[name]),hash,name);});
test('recovered learning module cannot mount a historical login or initialize a second session',()=>{const text=readFileSync(new URL('components/cadence/RecoveredLearning.jsx',root),'utf8');assert.doesNotMatch(text,/<AuthProvider[ >]|function AuthProvider|function SignInScreen|function EmailSignIn|window\.CADENCE_SESSION\s*=/);assert.doesNotMatch(text,/localStorage\.setItem\(['"](?:session|user:)/);});
