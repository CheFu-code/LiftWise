const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/${file}`, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
    module, exports:module.exports, Date, Math, JSON, Error, Set, Promise,
    require:(name)=> { assert.ok(name in dependencies, name); return dependencies[name]; },
  });
  return module.exports;
}
function setup() {
  const disk = new Map();
  let fail = false;
  const journal = load('lib/workout-journal.ts', {'@react-native-async-storage/async-storage':{__esModule:true,default:{
    getItem:async(key)=>disk.get(key) ?? null,
    setItem:async(key,value)=> {if(fail) throw new Error('disk full');disk.set(key,value);},
  }}});
  return {journal,disk,setFail:(value)=>fail=value};
}
const draft = {workout:{id:'workout-1',name:'Recovered workout',description:null,image:null,muscles:'arms',exercises:[]},requestId:'completion-1',workoutId:'workout-1',startedAt:1000,elapsed:600,paused:true,savedAt:601000,weightUnit:'lb',completed:['curl-1'],values:{'curl-1':{reps:'12',weight:'80'}}};
const completion = {requestId:'completion-1',workoutId:'workout-1',startedAt:'2026-10-24T10:00:00.000Z',completedAt:'2026-10-24T10:10:00.000Z',durationSeconds:600,sets:[]};
test('drafts recover values and remain isolated from a different account',async()=>{
  const {journal}=setup();
  await journal.saveWorkoutDraft('alice',draft);
  assert.deepEqual(JSON.parse(JSON.stringify((await journal.readWorkoutJournal('alice')).drafts['workout-1'])),draft);
  assert.equal(Object.keys((await journal.readWorkoutJournal('bob')).drafts).length,0);
});
test('completion durably replaces its draft, deduplicates retries and rejects conflicting payloads',async()=>{
  const {journal}=setup();
  await journal.saveWorkoutDraft('alice',draft);
  await journal.enqueueWorkoutCompletion('alice',completion);
  await journal.enqueueWorkoutCompletion('alice',completion);
  await journal.saveWorkoutDraft('alice',draft);
  let state=await journal.readWorkoutJournal('alice');
  assert.equal(Object.keys(state.drafts).length,0);
  assert.equal(Object.keys(state.pending).length,1);
  await assert.rejects(journal.enqueueWorkoutCompletion('alice',{...completion,durationSeconds:601}),/already/);
  await journal.postponeCompletion('alice',completion.requestId,false);
  state=await journal.readWorkoutJournal('alice');
  assert.equal(state.pending[completion.requestId].attempts,1);
  assert.ok(state.pending[completion.requestId].nextAttempt>Date.now());
  await journal.acknowledgeCompletion('alice',completion.requestId);
  assert.equal(Object.keys((await journal.readWorkoutJournal('alice')).pending).length,0);
});
test('failed local saving never acknowledges completion or deletes the persisted draft',async()=>{
  const {journal,setFail}=setup();
  await journal.saveWorkoutDraft('alice',draft);
  setFail(true);
  await assert.rejects(journal.enqueueWorkoutCompletion('alice',completion),/disk full/);
  setFail(false);
  const state=await journal.readWorkoutJournal('alice');
  assert.equal(Object.keys(state.pending).length,0);
  assert.equal(state.drafts['workout-1'].requestId,draft.requestId);
});
test('concurrent operations serialize without losing other workouts; blocked entries are retained for explicit retry',async()=>{
  const {journal}=setup();
  await Promise.all(Array.from({length:10},(_,index)=>journal.enqueueWorkoutCompletion('alice',{...completion,requestId:`request-${index}`})));
  assert.equal(Object.keys((await journal.readWorkoutJournal('alice')).pending).length,10);
  await journal.postponeCompletion('alice','request-0',true);
  assert.equal((await journal.readWorkoutJournal('alice')).pending['request-0'].blocked,true);
  await journal.retryBlockedCompletions('alice');
  assert.equal((await journal.readWorkoutJournal('alice')).pending['request-0'].blocked,false);
});
test('shortcut destinations resolve only known IDs and include only existing screens',()=>{
  const {appShortcuts,shortcutDestination}=load('lib/app-shortcuts.ts');
  const routes=new Set(['/workouts','/history','/profile']);
  for(const action of appShortcuts) assert.ok(routes.has(shortcutDestination(action.id)));
  assert.equal(shortcutDestination('progress'),'/');
  assert.equal(shortcutDestination('//malicious.example'),null);
  const config=JSON.parse(fs.readFileSync('app.json','utf8'));
  assert.equal(config.expo.plugins.filter(value=>value==='expo-quick-actions').length,1);
});

test('automatic retries stop after ten failures without deleting a completion',async()=>{
  const {journal}=setup();
  await journal.enqueueWorkoutCompletion('alice',completion);
  for(let i=0;i<10;i++) await journal.postponeCompletion('alice',completion.requestId,false);
  const entry=(await journal.readWorkoutJournal('alice')).pending[completion.requestId];
  assert.equal(entry.attempts,10);
  assert.equal(entry.blocked,true);
});
