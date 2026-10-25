const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps = {}) {
 const module = { exports: {} };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/${file}`, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {
  module, exports:module.exports, Date, Math, Promise, Map, Set,
  require:name=>{assert.ok(name in deps,`Unexpected dependency ${name}`);return deps[name];},
 });
 return module.exports;
}
test('plate calculator loads both sides equally in kg and lb, using exact solutions instead of greedy approximations',()=>{
 const {calculatePlates,PLATES}=load('lib/plate-calculator.ts');
 const kg=calculatePlates(60,20,PLATES.kg);
 assert.equal(kg.achieved,60); assert.equal(kg.plates[0].weight,20);assert.equal(kg.plates[0].count,1);
 const lb=calculatePlates(135,45,PLATES.lb);
 assert.equal(lb.achieved,135);assert.equal(lb.plates[0].weight,45);
 const nonGreedy=calculatePlates(100,20,[25,10]);
 assert.equal(nonGreedy.achieved,100); assert.equal(nonGreedy.plates[0].weight,10);assert.equal(nonGreedy.plates[0].count,4);
 for(const amount of [20,35,62.5,100,200,299.99]){
  const result=calculatePlates(amount,20,PLATES.kg);
  assert.ok(result.achieved<=amount);
  assert.equal(20+2*result.plates.reduce((sum,plate)=>sum+plate.weight*plate.count,0),result.achieved);
 }
});
test('calculator reports unavailable loads without overshooting and rejects invalid inputs',()=>{
 const {calculatePlates}=load('lib/plate-calculator.ts');
 const result=calculatePlates(100,20,[25]);assert.equal(result.achieved,70);assert.equal(result.shortfall,30);
 assert.equal(calculatePlates(20,20,[]).plates.length,0);
 for(const [target,bar,plates] of [[10,20,[20]],[-1,0,[20]],[NaN,0,[20]],[2001,0,[20]],[20.123,0,[20]],[40,20,[]],[40,20,[0]]]) assert.throws(()=>calculatePlates(target,bar,plates));
});
test('device preferences persist without an API and failed saves roll back before later saves succeed',async()=>{
 let raw=null,fail=false;
 const storage={getItem:async()=>raw,setItem:async(_key,value)=>{if(fail)throw new Error('disk full');raw=value;}};
 const create=()=>load('lib/local-workout-preferences.ts',{'@react-native-async-storage/async-storage':{__esModule:true,default:storage},react:{}});
 const preferences=create();
 await preferences.loadLocalWorkoutPreferences();assert.equal(preferences.getLocalWorkoutPreferences().ready,true);
 await preferences.saveLocalWorkoutPreferences({haptics:false});
 await preferences.saveLocalWorkoutPreferences({keepAwake:false});
 const restored=create();await restored.loadLocalWorkoutPreferences();assert.equal(restored.getLocalWorkoutPreferences().haptics,false);assert.equal(restored.getLocalWorkoutPreferences().keepAwake,false);
 fail=true;await assert.rejects(preferences.saveLocalWorkoutPreferences({haptics:true}));assert.equal(preferences.getLocalWorkoutPreferences().haptics,false);
 fail=false;await preferences.saveLocalWorkoutPreferences({haptics:true});assert.equal(preferences.getLocalWorkoutPreferences().haptics,true);
});
test('haptics respect preferences, platform, foreground state and device failures',async()=>{
 let enabled=true;
 const native={AppState:{currentState:'active'},Platform:{OS:'android'}};
 const calls=[];
 const {workoutHaptic}=load('lib/workout-haptics.ts',{
  'react-native':native,'./local-workout-preferences':{getLocalWorkoutPreferences:()=>({ready:true,haptics:enabled})},
  'expo-haptics':{selectionAsync:async()=>calls.push('set'),impactAsync:async()=>calls.push('rest'),notificationAsync:async()=>{calls.push('finish');throw new Error('device unavailable');},ImpactFeedbackStyle:{Medium:'medium'},NotificationFeedbackType:{Success:'success'}},
 });
 const flush=()=>new Promise(setImmediate);
 workoutHaptic('set');workoutHaptic('rest');workoutHaptic('finish');await flush();assert.deepEqual(calls,['set','rest','finish']);
 enabled=false;workoutHaptic('set');enabled=true;native.AppState.currentState='background';workoutHaptic('set');native.AppState.currentState='active';native.Platform.OS='web';workoutHaptic('set');await flush();assert.equal(calls.length,3);
});

test('screen-awake locks release on background, disabled preference, blur and cleanup',async()=>{
 const references=[];let cursor=0,callback,previousDeps,focus,cleanup;
 const listeners=new Set(),calls=[];
 const app={currentState:'active',addEventListener:(_name,fn)=>{listeners.add(fn);return{remove:()=>listeners.delete(fn)};}};
 const {useActiveWorkoutAwake}=load('hooks/use-active-workout-awake.ts',{
  react:{useRef:initial=>{const index=cursor++;references[index]??={current:initial};return references[index];},useCallback:(fn,deps)=>{if(!previousDeps||deps.some((value,i)=>value!==previousDeps[i])){callback=fn;previousDeps=deps;}return callback;}},
  'react-native':{AppState:app},'expo-router':{useFocusEffect:fn=>{if(fn!==focus){cleanup?.();focus=fn;cleanup=fn();}}},
  'expo-keep-awake':{activateKeepAwakeAsync:async tag=>calls.push(['activate',tag]),deactivateKeepAwake:async tag=>calls.push(['deactivate',tag])},
 });
 const render=enabled=>{cursor=0;useActiveWorkoutAwake(enabled);};
 const flush=()=>new Promise(setImmediate);
 render(true);await flush();assert.equal(calls.at(-1)[0],'activate');
 app.currentState='background';listeners.forEach(fn=>fn('background'));await flush();assert.equal(calls.at(-1)[0],'deactivate');
 app.currentState='active';listeners.forEach(fn=>fn('active'));await flush();assert.equal(calls.at(-1)[0],'activate');
 render(false);await flush();assert.equal(calls.at(-1)[0],'deactivate');
 cleanup();await flush();assert.equal(calls.at(-1)[0],'deactivate');assert.equal(listeners.size,0);
 assert.equal(new Set(calls.map(call=>call[1])).size,1,'every operation releases the same owned tag');
});
