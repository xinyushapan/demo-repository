import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {references,observationRecord,activitiesFor} from '../core/static/core/report-framework.mjs';

test('observations keep user words separate from assistant inventions and do not fill missing evidence',()=>{
 const record=observationRecord({pieces:[{type:'tree'},{type:'tree'}],events:[{action:'移动'}],history:[{role:'assistant',text:'你很开心'},{role:'user',text:'这是森林'}],selfReport:'我给树搬了家'},{tree:'树木'});
 assert.match(record.facts[0].text,/树木×2/);
 assert.match(record.facts[1].text,/移动1次/);
 assert.deepEqual(record.statements.map(s=>s.text),['这是森林','我给树搬了家']);
 assert.equal(observationRecord({}).statements.length,0);
 assert.match(observationRecord({}).facts[1].text,/不能还原/);
});
test('age suggestions cite curated sources and unknown age has no guessed age activity',()=>{
 assert.equal(activitiesFor('').length,1);
 assert.deepEqual(activitiesFor('not-an-age'),activitiesFor(''));
 for(const age of ['3-5','6-7','8-12']){
  const activities=activitiesFor(age);assert.equal(activities.length,2);
  for(const activity of activities)for(const id of activity.sources)assert.ok(references.some(r=>r.id===id));
 }
 assert.equal(references.length,3);
 assert.ok(references.every(r=>r.url.startsWith('https://')&&r.year));
});
test('published report module and framework match authored files',()=>{
 for(const name of ['report-framework.mjs','report-professional.mjs','report.js','report.css'])assert.equal(readFileSync(new URL('../core/static/core/'+name,import.meta.url),'utf8'),readFileSync(new URL('../public-site/public/static/core/'+name,import.meta.url),'utf8'));
});

test('report endpoint discards model-generated activities and fabricated references',async()=>{
 const root=new URL('../public-site/lib/',import.meta.url),read=name=>JSON.parse(readFileSync(new URL(name,root),'utf8'));
 const source=readFileSync(new URL('ai.ts',root),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export async function handleAI','async function handleAI');
 const context=vm.createContext({awards:read('awards.json'),knowledge:read('support.json'),corpus:read('corpus.json'),catalog:read('catalog.json'),mapping:read('corpus-map.json'),Request,Response,AbortSignal,URL,
 fetch:async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'本次保存了一件物件。',suggestions:['无依据的活动'],references:['虚构文献']})}}]}))});
 vm.runInContext(source+'\nglobalThis.endpoint=handleAI;',context);
 const response=await context.endpoint(new Request('https://local.test/api/ai/report',{method:'POST',headers:{Origin:'https://local.test','Content-Type':'application/json'},body:JSON.stringify({consent:true,pieces:[{type:'tree',x:.5,y:.5}]})}),{DEEPSEEK_API_KEY:'test-only',XINYU_AI_ENABLED:'1'});
 assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.framework,'observation-v1');assert.deepEqual(result.suggestions,[]);assert.equal(result.references,undefined);
});
