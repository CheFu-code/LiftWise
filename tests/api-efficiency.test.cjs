const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const {createHash}=require('node:crypto');
function load(file,deps,globals={}){
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/${file}`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,Headers,AbortController,URLSearchParams,process:{env:{}},setTimeout,clearTimeout,require:name=>{assert.ok(name in deps,name);return deps[name];},...globals});
 return module.exports;
}
test('background sync cannot send an old account payload with a different account token',async()=>{
 let calls=0;
 const {authenticatedFetch}=load('lib/auth-client.ts',{'./chefu-session':{getToken:async()=>'bob-token',readSession:async()=>({token:'bob-token',user:{uid:'bob'}}),saveSession:async()=>{}}},{fetch:async()=>{calls++;}});
 await assert.rejects(authenticatedFetch('https://api.example/sessions',{},'alice'),error=>error.status===401);
 assert.equal(calls,0);
});
test('catalogue revalidation sends a content version and reuses existing data for HTTP 304',async()=>{
 const cached=[{id:'curl',name:'Curl'}];
 const etag='"'+createHash('sha256').update(JSON.stringify(cached)).digest('hex')+'"';
 let headers;
 const {getExercisesQueryFn}=load('lib/api.ts',{
 'date-fns':require('date-fns'),
 'expo-crypto':{CryptoDigestAlgorithm:{SHA256:'sha256'},digestStringAsync:async(_,value)=>createHash('sha256').update(value).digest('hex')},
 './auth-client':{API_URL:'https://api.example',authenticatedFetch:async(_,options)=>{headers=options.headers;return {data:null,error:{status:304,message:'Request failed'}};}},
 });
 assert.equal(await getExercisesQueryFn(undefined,cached),cached);
 assert.equal(headers['If-None-Match'],etag);
});
