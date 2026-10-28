import {references,observationRecord,activitiesFor,reportTimeline,reportMaterials} from './report-framework.mjs';
const $=selector=>document.querySelector(selector);
const node=(tag,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
const reports=read('xinyu-reports',[]),id=new URLSearchParams(location.search).get('id');
const report=Array.isArray(reports)?reports.find(r=>r?.id===id):null;
const catalog=window.SANDPLAY_TOYS||[],names=Object.fromEntries(catalog.map(t=>[t.id,t.name]));
const scenes={nature:'自然探险',animal:'动物家园',city:'城市街区',ocean:'海底世界',space:'星空幻想',free:'自由沙盘'};
const awardNames={landscape:'今日造景师奖',roads:'道路规划师奖',trying:'勇敢尝试奖',care:'温柔守护奖',surprise:'惊喜彩蛋奖',detail:'细节侦探奖',nature:'自然发现家奖',imagination:'脑洞大开奖',story:'故事接龙奖',architecture:'小小建筑师奖'};
function fit(){const scale=Math.min(innerWidth/1672,innerHeight/941);$('#report-stage').style.transform=`scale(${scale})`;$('#report-stage').style.left=`${(innerWidth-1672*scale)/2}px`;$('#report-stage').style.top=`${(innerHeight-941*scale)/2}px`;}
window.addEventListener('resize',fit);fit();
for(const button of document.querySelectorAll('[data-open]'))button.onclick=()=>$('#'+button.dataset.open).showModal();
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>button.closest('dialog').close();
function pager(key,items,size,paint){let page=0;const total=Math.max(1,Math.ceil(items.length/size));const render=()=>{paint(items.slice(page*size,(page+1)*size));$('#'+key+'-page').textContent=items.length?`${page+1} / ${total}`:'暂无记录';$('#'+key+'-prev').disabled=page===0;$('#'+key+'-next').disabled=page>=total-1;};$('#'+key+'-prev').onclick=()=>{page--;render();};$('#'+key+'-next').onclick=()=>{page++;render();};render();}
if(!report){$('#report-empty').hidden=false;$('.report-actions').hidden=true;}
else{
 $('#report-content').hidden=false;
 const path=report.mode==='online'?'/sandbox/':'/build/';
 $('#report-back').href=path+'?record='+encodeURIComponent(id);$('#continue-build').href=$('#report-back').href;$('#back-award').href='/feedback/?id='+encodeURIComponent(id);
 const image=typeof report.screenshot==='string'&&/^data:image\/(jpeg|png);base64,/.test(report.screenshot);
 if(image)$('#report-image').src=report.screenshot;else{$('#report-image').hidden=true;$('#image-missing').hidden=false;}
 $('#report-scene').textContent=scenes[report.scene]||'未注明场景';
 const finished=Date.parse(report.finishedAt),started=Date.parse(report.startedAt);
 $('#report-date').textContent=Number.isFinite(finished)?new Date(finished).toLocaleDateString('zh-CN'):'未记录';
 $('#report-duration').textContent=Number.isFinite(started)&&Number.isFinite(finished)&&finished>=started?`本次活动记录时长：${Math.floor((finished-started)/60000)}分${Math.floor((finished-started)/1000)%60}秒。仅表示记录区间，不代表专注时长。`:'活动时长未记录。';
 const pieces=Array.isArray(report.pieces)?report.pieces:[],materials=reportMaterials(report,catalog),timeline=reportTimeline(report,names);
 $('#report-count').textContent=pieces.length+'件';
 const award=Object.hasOwn(awardNames,report.feedback?.award_id)?report.feedback.award_id:null;
 $('#report-award').textContent=award?awardNames[award]:'尚未生成';
 if(award){$('#award-emblem').hidden=false;$('#award-emblem').style.backgroundImage=`url('/static/core/awards/${award}.png')`;}
 $('#materials-title').textContent=materials.length&&materials.every(t=>['自然现象','动物'].includes(t.category))?'自然探索足迹':'创作探索足迹';
 $('#world-highlight').textContent=`本次保存了${pieces.length}件物件，包含${materials.length}类沙具。`;
 const categories=[...new Set(materials.map(m=>m.category))];
 $('#world-description').textContent=materials.length?`包含${categories.length}个物件类别。以下仅描述实际构成与操作，不据此评价心理状态或发展水平。`:'本次尚未记录物件。可以继续搭建，也可以留下自己的故事。';
 $('#report-greeting').textContent=materials.length?`你用${materials.length}类物件搭建了自己的小世界，一起来回顾吧！`:'你的小世界，值得被认真记录。';
 pager('toys',materials,5,items=>{$('#report-toys').replaceChildren(...items.map(item=>{const card=node('div','','material');if(item.image){const img=node('img');img.src=item.image;img.alt=item.name;card.append(img);}card.append(node('strong',item.name),node('span','×'+item.count),node('small','保存时数量'));return card;}));if(!items.length)$('#report-toys').append(node('p','本次未记录物件。'));});
 pager('events',timeline,5,items=>{$('#report-events').replaceChildren(...items.map(item=>{const li=node('li');li.dataset.number=item.number;const time=node('time',item.clock+' · '+item.elapsed);if(item.at)time.dateTime=item.at;li.append(node('strong',item.title),time,node('p',item.description));return li;}));if(!items.length)$('#report-events').append(node('p','未记录操作过程，无法还原顺序与时间。'));});
 const history=Array.isArray(report.history)?report.history:[];
 pager('dialogue',history,3,items=>{$('#report-dialogue').replaceChildren(...items.map(h=>{const div=node('div','','utterance');div.append(node('strong',h.role==='user'?'孩子原话':'小语 · AI或本机回应'),node('span',typeof h.text==='string'?h.text:''));return div;}));if(!items.length)$('#report-dialogue').append(node('p','本次没有保存对话。安静搭建也很好。'));});
 function paintStory(){
  $('#report-title').textContent=report.title||'我的沙盘故事';
  const words=report.selfReport?.trim()||history.filter(h=>h?.role==='user'&&typeof h.text==='string').map(h=>h.text).join('\n');
  const chars=Array.from(words||'本次尚未记录孩子的故事。可以邀请孩子介绍作品；不愿表达时，保留空白，不用AI补写其想法或感受。');const pages=[];for(let i=0;i<chars.length;i+=64)pages.push(chars.slice(i,i+64).join(''));
  $('#story-label').textContent=words?'孩子自己的表达 · 原样记录':'未记录表达 · 不作推测';
  pager('story',pages,1,items=>$('#report-story').textContent=items[0]||'');
  const record=observationRecord(report,names);$('#observation-facts').replaceChildren(...record.facts.map(f=>node('li',`[${f.id}] ${f.text}`)));$('#observation-limits').textContent=record.limits;
 }
 paintStory();
 $('#edit-story').onclick=()=>{$('#story-title').value=report.title||'我的沙盘故事';$('#self-report').value=report.selfReport||'';$('#story-dialog').showModal();};
 function persist(){try{localStorage.setItem('xinyu-reports',JSON.stringify(reports));return true;}catch{$('#save-status').textContent='保存失败：浏览器空间不足。';return false;}}
 $('#save-report-note').onclick=()=>{const title=$('#story-title').value.trim().slice(0,60)||'我的沙盘故事',words=$('#self-report').value.slice(0,500),old={title:report.title,selfReport:report.selfReport,ai:report.ai};if(words!==report.selfReport)report.ai=null;report.title=title;report.selfReport=words;if(persist()){paintStory();paintAI();$('#story-dialog').close();$('#save-status').textContent='故事已保存。';}else{Object.assign(report,old);$('#story-save-status').textContent='保存失败，请先导出报告后重试。';}};
 function paintActivity(){const age=$('#activity-age').value;const activity=activitiesFor(age)[0];$('#activity-title').textContent=activity.title;$('#activity-text').textContent=age?{'3-5':'选两件已有物件，由孩子决定角色和情节，成人跟随回应。 [HARVARD · 3–5岁]','6-7':'先商量一条规则，轮流放一件物件，再由孩子决定是否换规则。 [HARVARD · 5–7岁]','8-12':'选一个搭建目标，先计划、再尝试，并回顾一次调整。 [HARVARD · 7–12岁]'}[age]:'由孩子决定玩法，成人描述可见动作，不强迫讲述。 [AAP / NAEYC]';const first=materials[0]?.name;$('#next-invitation').textContent=first?`还想怎样安排“${first}”？可以沿用这些物件继续搭建，或者为它们讲一段新故事；也可以停在这里。`:'下一次可以先选一件喜欢的物件，再决定要怎样玩。不需要完成指定任务。';}
 $('#activity-age').onchange=paintActivity;paintActivity();
 pager('sources',references,1,items=>{$('#professional-references').replaceChildren(...items.map(ref=>{const li=node('li');const link=node('a',`[${ref.id}] ${ref.author} (${ref.year}). ${ref.title}`);link.href=ref.url;link.target='_blank';link.rel='noreferrer';li.append(link,node('p',ref.scope));return li;}));});
 function paintAI(){const valid=report.ai?.framework==='observation-v1';$('#report-summary').textContent=valid?report.ai.summary:'尚未调用AI。主报告中的物件、数量与时间来自本机保存记录。';$('#report-provider').textContent=valid?'DeepSeek辅助整理 · 需人工核对':'本机事实记录 · 未作AI推断';$('#details-note').textContent='依据操作日志整理 · '+timeline.length+'条记录 · 不推断心理含义。';}
 paintAI();let ready=false;
 fetch('/api/ai/status').then(r=>r.json()).then(data=>{ready=!!data.ready;$('#generate-ai-report').disabled=!ready;$('#report-status').textContent=ready?'可选择是否让AI辅助整理。':'AI暂未开启，当前显示实际保存记录。';}).catch(()=>$('#report-status').textContent='AI暂不可用，实际记录仍可查看。');
 $('#generate-ai-report').onclick=async()=>{if(!ready)return;if(!$('#report-consent').checked){$('#report-status').textContent='请先确认是否愿意发送本次记录。';return;}$('#generate-ai-report').disabled=true;$('#report-status').textContent='正在整理…';try{const response=await fetch('/api/ai/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scene:report.scene,pieces:report.pieces,events:report.events,history:report.history,selfReport:report.selfReport,consent:true}),signal:AbortSignal.timeout(40000)});const data=await response.json();if(!response.ok)throw Error(data.error||'暂时无法整理');report.ai={framework:'observation-v1',summary:data.summary,provider:'deepseek',at:new Date().toISOString()};persist();paintAI();$('#report-status').textContent='整理完成，请结合原始记录核对。';}catch(error){$('#report-status').textContent=error.name==='TimeoutError'?'整理超时，请稍后重试。':error.message;}finally{$('#generate-ai-report').disabled=!ready;}};
 function exportData(){return {format:'xinyu-observation-v2',...report,observations:observationRecord(report,names),timeline,materials,professionalReferences:references};}
 $('#download-report').onclick=()=>{const blob=new Blob([JSON.stringify(exportData(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='心语沙盘-创作观察报告.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function preparePrint(){const appendix=$('#print-appendix');appendix.replaceChildren(node('h2','完整记录与专业来源'));const record=observationRecord(report,names);for(const fact of record.facts)appendix.append(node('p',`[${fact.id}] ${fact.text}`));appendix.append(node('p',record.limits),node('h3','孩子原话'));for(const statement of record.statements)appendix.append(node('p',`[${statement.id}] ${statement.text}`));appendix.append(node('h3','操作时间记录'));for(const item of timeline)appendix.append(node('p',`${item.number}. ${item.clock} · ${item.elapsed} · ${item.title} · ${item.description}`));appendix.append(node('h3','完整对话记录'));for(const h of history)appendix.append(node('p',(h.role==='user'?'孩子：':'小语：')+(h.text||'')));appendix.append(node('h3','专业来源与使用范围'));for(const ref of references){appendix.append(node('p',`[${ref.id}] ${ref.author} (${ref.year}). ${ref.title} ${ref.scope}`));const a=node('a',ref.url);a.href=ref.url;appendix.append(a);}}
 window.addEventListener('beforeprint',preparePrint);$('#print-report').onclick=()=>{preparePrint();window.print();};
 $('#delete-report').onclick=()=>{if(!confirm('删除本次报告和对话？此操作无法撤销。'))return;try{localStorage.setItem('xinyu-reports',JSON.stringify(reports.filter(r=>r.id!==id)));location.href=path;}catch{$('#save-status').textContent='删除失败，请检查浏览器权限。';}};
}
