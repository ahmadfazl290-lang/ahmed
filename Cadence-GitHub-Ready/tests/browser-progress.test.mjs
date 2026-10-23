import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLessonProgress} from '../components/cadence/curriculum.js';
import {createBrowserProgress} from '../lib/browser-progress.mjs';

test('browser lesson progress recovers from malformed data and retains valid completion dates',()=>{
  const completedAt='2026-10-12T10:00:00.000Z';
  assert.deepEqual(parseLessonProgress(JSON.stringify({completed:{'a1-lesson-01':completedAt,'a1-lesson-02':false,'a1-lesson-03':'invalid'}})),{completed:{'a1-lesson-01':completedAt}});
  for(const raw of [null,undefined,'null','[]','{broken','{"completed":[]}','{"completed":null}']) assert.deepEqual(parseLessonProgress(raw),{completed:{}});
});

function browserStore(entries=[]) {
 const data=new Map(entries);
 return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
test('guest learning retains the existing id and stored record bytes without migration',async()=>{
 const profile=' { "name": "Original guest", "placementComplete": true }\n';
 const store=browserStore([['cadence:guest-id','existing-guest'],['cadence:guest-data:profile:existing-guest@guest.invalid',profile],['cadence:guest-data:unrelated','untouched']]);
 const before=Array.from(store.data);
 const adapter=createBrowserProgress({kind:'guest'},store,()=>{throw Error('Must retain the old guest id');});
 assert.equal(adapter.session.user.email,'existing-guest@guest.invalid');
 assert.equal((await adapter.storage.get('profile:existing-guest@guest.invalid')).value,profile);
 assert.deepEqual(Array.from(store.data),before);
});
test('account A, account B and the existing guest have distinct, stable local progress records',async()=>{
 const store=browserStore([['cadence:guest-id','guest-one'],['cadence:guest-data:profile:guest-one@guest.invalid','guest original']]);
 const guest=createBrowserProgress({kind:'guest'},store);
 const a=createBrowserProgress({kind:'account',subject:'account-a'},store);
 const b=createBrowserProgress({kind:'account',subject:'account-b'},store);
 const profile=adapter=>'profile:'+adapter.session.user.email;
 assert.equal(await a.storage.get(profile(a)),null);
 assert.equal(await b.storage.get(profile(b)),null);
 await a.storage.set(profile(a),'A completed A2');await b.storage.set(profile(b),'B completed B1');
 assert.equal((await a.storage.get(profile(a))).value,'A completed A2');
 assert.equal((await b.storage.get(profile(b))).value,'B completed B1');
 assert.equal((await guest.storage.get(profile(guest))).value,'guest original');
 assert.equal((await createBrowserProgress({kind:'account',subject:'account-a'},store).storage.get(profile(a))).value,'A completed A2');
 assert.equal(store.getItem('cadence:guest-id'),'guest-one');
 assert.equal(store.getItem('cadence:guest-data:profile:guest-one@guest.invalid'),'guest original');
 await b.storage.delete(profile(b));
 assert.equal((await a.storage.get(profile(a))).value,'A completed A2');
});
test('account identity is subject-based and preserves case and punctuation without collisions',async()=>{
 const store=browserStore();
 const ids=['Case-sensitive','case-sensitive','one/two','one%2Ftwo'];
 const adapters=ids.map(subject=>createBrowserProgress({kind:'account',subject},store));
 assert.equal(new Set(adapters.map(a=>a.session.user.email)).size,ids.length);
 assert.equal(store.getItem('cadence:guest-id'),null,'opening an account does not create or alter guest state');
 for(const [i,a] of adapters.entries())await a.storage.set('profile:'+a.session.user.email,String(i));
 for(const [i,a] of adapters.entries())assert.equal((await a.storage.get('profile:'+a.session.user.email)).value,String(i));
});
test('late operations after switching accounts cannot read or overwrite the next student',async()=>{
 const store=browserStore();
 const a=createBrowserProgress({kind:'account',subject:'a'},store);
 const oldKey='profile:'+a.session.user.email;
 const b=createBrowserProgress({kind:'account',subject:'b'},store);
 const newKey='profile:'+b.session.user.email;
 await b.storage.set(newKey,'B preserved');
 a.dispose();
 await assert.rejects(a.storage.set(oldKey,'late old callback'),/LEARNING_SESSION_CHANGED/);
 await assert.rejects(b.storage.set(oldKey,'late callback through window.storage'),/FOREIGN_LEARNING_RECORD/);
 await assert.rejects(b.storage.get(oldKey),/FOREIGN_LEARNING_RECORD/);
 await assert.rejects(b.storage.delete(oldKey),/FOREIGN_LEARNING_RECORD/);
 assert.equal((await b.storage.get(newKey)).value,'B preserved');
 assert.equal(store.data.size,1);
});
test('unreadable existing progress fails before it can be mistaken for a new learner',()=>{
 const store=browserStore([['cadence:guest-id','original']]);
 const native=store.getItem;
 store.getItem=key=>{if(key.includes(':profile:'))throw Error('Read denied');return native(key);};
 assert.throws(()=>createBrowserProgress({kind:'guest'},store),/Read denied/);
 assert.throws(()=>createBrowserProgress({kind:'account',subject:'a'},store),/Read denied/);
 assert.deepEqual(Array.from(store.data),[['cadence:guest-id','original']]);
});
