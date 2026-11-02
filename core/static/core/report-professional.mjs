import {references,observationRecord,activitiesFor} from './report-framework.mjs';
const $=s=>document.querySelector(s);
let reports=[];try{reports=JSON.parse(localStorage.getItem('xinyu-reports'))||[];}catch{}
const report=reports.find(r=>r.id===new URLSearchParams(location.search).get('id'));
if(report){
  const names=Object.fromEntries((window.SANDPLAY_TOYS||[]).map(t=>[t.id,t.name]));
  const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
  function renderObservations(){
    const record=observationRecord({...report,selfReport:$('#self-report').value},names);
    $('#observation-facts').replaceChildren(...record.facts.map(f=>node('li',`[${f.id}] ${f.text}`)));
    $('#child-statements').replaceChildren(...(record.statements.length?record.statements.map(s=>node('blockquote',`[${s.id}] “${s.text}”`)):[node('p','本次尚未记录孩子自己的表达。请勿用AI生成的故事代替孩子原话。')]));
    $('#observation-limits').textContent=record.limits;
  }
  for(const ref of references){const item=node('li','');item.id=`source-${ref.id}`;const a=node('a',`[${ref.id}] ${ref.author} (${ref.year}). ${ref.title}`);a.href=ref.url;a.target='_blank';a.rel='noreferrer';item.append(a,node('p',ref.scope));$('#professional-references').append(item);}
  function renderActivities(){
    $('#age-activities').replaceChildren(...activitiesFor($('#activity-age').value).map(activity=>{const article=node('article','');article.append(node('h3',activity.title),node('p',activity.text));const line=node('p','依据：');for(const id of activity.sources){const a=node('a',`[${id}] `);a.href=`#source-${id}`;line.append(a);}article.append(line);return article;}));
    $('#activity-age-note').textContent=$('#activity-age').value?'按所选年龄展示可选活动；依据孩子兴趣与实际需要调整，可随时停止。':'未提供年龄：先展示通用陪伴建议，不根据沙盘模式猜测年龄。';
  }
  $('#activity-age').onchange=renderActivities;
  $('#self-report').addEventListener('input',renderObservations);
  renderObservations();renderActivities();
  window.addEventListener('beforeprint',()=>{$('#professional-sources').open=true;});
}
