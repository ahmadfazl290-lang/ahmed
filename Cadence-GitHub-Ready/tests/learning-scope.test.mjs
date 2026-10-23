import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import ts from 'typescript';

test('all student navigation stays within assigned lessons and active learning tools',()=>{
 const source=readFileSync(new URL('../components/cadence/App.jsx',import.meta.url),'utf8');
 const sf=ts.createSourceFile('App.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
 const nav=sf.statements.filter(ts.isVariableStatement).flatMap(n=>n.declarationList.declarations).find(n=>n.name.getText(sf)==='NAV').initializer;
 const ids=nav.elements.map(item=>item.properties.find(p=>p.name.getText(sf)==='id').initializer.text);
 assert.deepEqual(ids,['home','preferences','courses','pronunciation','vocabulary','progress','profile','settings']);
 assert.doesNotMatch(source,/case ['"](?:aicall|tutor|practice|mistakes|daily|library)['"]|\/api\/tutor/);
});

test('historical entrypoints cannot mount old courses, AI or a second guest session',()=>{
 const oldEntry=readFileSync(new URL('../app/practice-library/page.tsx',import.meta.url),'utf8');
 assert.match(oldEntry,/redirect\(['"]\/['"]\)/);
 const recovered=readFileSync(new URL('../components/cadence/RecoveredLearning.jsx',import.meta.url),'utf8');
 assert.doesNotMatch(recovered,/fetch\(|AI_PROVIDERS|TutorPage|AICallPage|PracticePage|MistakesPage|DailyLessonPage|buildCourseCatalog|window\.CADENCE_SESSION\s*=/);
 assert.equal(existsSync(new URL('../app/api/tutor/route.ts',import.meta.url)),false);
 const runtime=readFileSync(new URL('../lib/runtime.ts',import.meta.url),'utf8');
 assert.doesNotMatch(runtime,/ANTHROPIC/);
});
