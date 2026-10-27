(() => {
 'use strict';
 const $=s=>document.querySelector(s),names=Object.fromEntries((window.SANDPLAY_TOYS||[]).map(t=>[t.id,t.name]));
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 const onlineMode=document.body.classList.contains('online-mode'),sessionKey=onlineMode?'xinyu-online-session':'xinyu-session';
 let session=read(sessionKey,null)||{id:crypto.randomUUID(),startedAt:new Date().toISOString(),history:[],selfReport:''};
 let ready=false,enabled=false,busy=false,autoTimer=0,visionTimer=0,visionBusy=false,roi=null,generation=0;
 let choice=sessionStorage.getItem('xinyu-companion-consent-v4'),consentResolve=null,consentPending=null;
 const controllers=new Set(),tracks=new Map(),ignored=new Set(),overrides=new Map();let lastAuto=-Infinity;
 const save=()=>{try{localStorage.setItem(sessionKey,JSON.stringify(session));}catch{}};
 const history=(role,text,provider='local')=>{session.history.push({role,text:String(text).slice(0,500),provider,at:new Date().toISOString()});session.history=session.history.slice(-500);save();};
 const snapshot=()=>{const state=window.SandplaySession?.snapshot()||read('heart-sand-draft',{});return{scene:state.scene,pieces:state.pieces||[],events:state.events||[],history:session.history.slice(-500),selfReport:session.selfReport,mode:onlineMode?'online':'physical',consent:enabled};};
 function show(line,question='',provider='local'){window.SandplayCompanion?.showReply(line,question);history('assistant',[line,question].filter(Boolean).join(' '),provider);}
 function stopVision(){generation++;clearInterval(visionTimer);visionTimer=0;visionBusy=false;roi=null;$('#ai-vision-status').textContent='连接摄像头后，小语会陪你观察沙具。';document.querySelector('.camera-label').textContent='本机画面预览 · 不上传';}
 async function request(mode,data){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),40000);controllers.add(controller);try{const response=await fetch(`/api/ai/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...snapshot(),...data,consent:enabled}),signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'AI暂时不可用');return result;}finally{clearTimeout(timeout);controllers.delete(controller);}}
 async function answer(raw){const message=String(raw||'').trim().slice(0,800);if(!message)return;
  if(busy){show('小语还在想上一句话，等一下再告诉我好吗？');return;}
  if(!choice)await ensureConsent('text');
  history('user',message);if(!enabled||!ready){window.SandplayCompanion?.respondLocal(message);return;}
  busy=true;const revision=generation;$('#ai-mode-status').textContent='小语在认真听…';
  try{const reply=await request('chat',{message});if(enabled&&revision===generation){show(reply.line,reply.question,'deepseek');$('#ai-mode-status').textContent='DeepSeek · 已回应';}}
  catch(error){if(enabled){$('#ai-mode-status').textContent=error.name==='AbortError'?'已暂停':error.message;window.SandplayCompanion?.respondLocal(message);}}
  finally{busy=false;}
 }
 window.XinyuAI={answerIfEnabled(text){void answer(text);return true;},recordLocal:(text)=>history('assistant',text),enabled:()=>enabled&&ready,speechConsent:()=>choice==='online',beforeCamera:()=>ensureConsent('camera'),beforeVoice:async()=>{await ensureConsent('voice');return choice==='online';}};
 const form=$('#xiaoyu-text-form');form.onsubmit=e=>{e.preventDefault();const input=$('#xiaoyu-text');const value=input.value.trim();if(value){input.value='';void answer(value);}};
 async function status(){try{const r=await fetch('/api/ai/status');const data=await r.json();ready=!!data.ready;}catch{ready=false;}enabled=choice==='online'&&ready;$('#ai-mode-status').textContent=enabled?'小语在这里陪着你':ready?'小语陪你慢慢搭建':'小语正在用本机语料陪你';$('#ai-confirm-consent').disabled=!ready;}
 async function ensureConsent(context){await statusReady;if(choice)return;if(!consentPending)consentPending=new Promise(resolve=>{consentResolve=resolve;$('#ai-confirm-consent').textContent=context==='camera'?'同意并连接摄像头':context==='voice'?'同意并使用麦克风':'同意并继续聊天';$('#ai-cancel-consent').textContent=context==='camera'?'仅本机预览':'仅用本机语料';$('#ai-consent-dialog').showModal();});await consentPending;}
 function setChoice(value){choice=value;sessionStorage.setItem('xinyu-companion-consent-v4',value);enabled=value==='online'&&ready;if(enabled)sessionStorage.setItem('xinyu-ai-consent','1');else{sessionStorage.removeItem('xinyu-ai-consent');stopVision();for(const c of controllers)c.abort();clearTimeout(autoTimer);if($('#camera').srcObject?.active&&$('#toggle-appearance').getAttribute('aria-pressed')!=='true')$('#toggle-appearance').click();}$('#ai-mode-status').textContent=enabled?'小语在这里陪着你':'小语正在用本机语料陪你';$('#ai-consent-dialog').close();window.dispatchEvent(new CustomEvent('sandplay:speech-consent'));consentResolve?.();consentResolve=null;if(enabled)startVision();}
 $('#ai-cancel-consent').onclick=()=>setChoice('local');
 $('#ai-confirm-consent').onclick=()=>{if(ready)setChoice('online');};
 $('#ai-consent-dialog').addEventListener('cancel',e=>{e.preventDefault();setChoice('local');});
 $('#companion-privacy').onclick=()=>{$('#ai-confirm-consent').textContent='允许小语结合沙盘回应';$('#ai-cancel-consent').textContent='改为仅本机陪伴';$('#ai-consent-dialog').showModal();void status();};
 window.addEventListener('sandplay:operation',event=>{
  const operation=event.detail;clearTimeout(autoTimer);autoTimer=setTimeout(async()=>{if(busy||window.XinyuVoiceInput?.active()||performance.now()-lastAuto<20000)return;lastAuto=performance.now();if(!enabled||!ready){const name=names[operation?.type];if(name)show(`这个${name}，我看见啦。`);return;}busy=true;const revision=generation;try{const result=await request('chat',{message:'这是一次摆放变化。只提及最近明确变化的一个物体，用简短自然的一句话回应，不必提问，不推测情绪。'});if(enabled&&revision===generation)show(result.line,result.question,'deepseek');}catch{show('你慢慢搭，我在这儿。');}finally{busy=false;}},3500);
 });
 function startVision(){const video=$('#camera');if(!enabled||!ready||!video.videoWidth||!video.srcObject?.active||visionTimer)return;roi={x:0,y:0,w:1,h:1};const local=$('#toggle-appearance');if(local.getAttribute('aria-pressed')==='true')local.click();void window.SandplayCompanion?.start(video);document.querySelector('.camera-label').textContent='小语观察沙盘中 · 每15秒发送画面';void look();visionTimer=setInterval(look,15000);}
 async function look(){if(!enabled||!roi||visionBusy||document.hidden)return;const video=$('#camera');if(!video.videoWidth||!video.srcObject?.active){stopVision();return;}const track=video.srcObject.getVideoTracks()[0];if(video.readyState<2||!track?.enabled||track.muted)return;visionBusy=true;const revision=generation;const frame=document.createElement('canvas');frame.width=640;frame.height=Math.round(640*video.videoHeight/video.videoWidth);if(frame.height>640){frame.width=Math.round(frame.width*640/frame.height);frame.height=640;}frame.getContext('2d').drawImage(video,0,0,video.videoWidth,video.videoHeight,0,0,frame.width,frame.height);$('#ai-vision-status').textContent='小语正在观察沙盘…';
  try{const result=await request('vision',{frame:frame.toDataURL('image/jpeg',.7)});if(!enabled||!roi||revision!==generation)return;
   const matched=new Set();for(const obj of result.objects){if(obj.confidence<.75)continue;let track=[...tracks.values()].filter(t=>!matched.has(t.id)&&t.type===obj.type&&Math.hypot(t.x-obj.x,t.y-obj.y)<.23).sort((a,b)=>Math.hypot(a.x-obj.x,a.y-obj.y)-Math.hypot(b.x-obj.x,b.y-obj.y))[0];if(!track){track={id:'ai-'+crypto.randomUUID(),...obj,count:0};tracks.set(track.id,track);}Object.assign(track,obj,{count:track.count+1,misses:0});matched.add(track.id);}
   for(const t of tracks.values())if(!matched.has(t.id)){t.misses=(t.misses||0)+1;t.count=0;}
   const items=[...tracks.values()].filter(t=>!ignored.has(t.id)&&t.count>=2&&t.misses===0).map(t=>({...t,type:overrides.get(t.id)||t.type}));
   const removed=[...tracks.values()].filter(t=>t.misses>=3).map(t=>t.id);for(const id of removed)tracks.delete(id);
   window.dispatchEvent(new CustomEvent('sandplay:ai-objects',{detail:{items,removed}}));
   $('#ai-vision-status').textContent=items.length?`DeepSeek参考识别：${items.map(t=>names[t.type]||t.type).join('、')}（请核对）`:'已查看沙盘，连续两次清楚看见后再同步；识别结果需核对。';
  }catch(error){if(enabled)$('#ai-vision-status').textContent=error.message;}finally{visionBusy=false;}
 }
 $('#camera').addEventListener('playing',startVision);window.addEventListener('sandplay:camera-stopped',stopVision);
 window.addEventListener('sandplay:ignore-object',e=>ignored.add(e.detail.id));window.addEventListener('sandplay:correct-object',e=>overrides.set(e.detail.id,e.detail.type));
 window.addEventListener('pagehide',()=>{stopVision();for(const c of controllers)c.abort();clearTimeout(autoTimer);});
 let finishing=false;
 function finish(){if(finishing)return;const data=snapshot(),world=$('#world-canvas');if(!data.pieces.length&&!data.events.length){show('先放一件沙具，开始你的小世界吧。');return;}finishing=true;const now=new Date().toISOString(),report={...data,id:crypto.randomUUID(),startedAt:data.events[0]?.at||session.startedAt,finishedAt:now,screenshot:world.toDataURL('image/jpeg',.82),title:'我的沙盘故事',ai:null,feedback:null};try{const reports=read('xinyu-reports',[]);reports.push(report);localStorage.setItem('xinyu-reports',JSON.stringify(reports.slice(-10)));const records=read('heart-sand-records',[]);records.push({...data,id:report.id,name:'我的沙盘故事',savedAt:now});try{localStorage.setItem('heart-sand-records',JSON.stringify(records.slice(-30)));}catch{/* The report and its full scene have already been saved. */}location.href='/feedback/?id='+encodeURIComponent(report.id);}catch{finishing=false;show('浏览器空间不足，暂时无法保存回顾。','可以先下载操作记录，再清理旧作品。');}}
 $('#finish-session').onclick=finish;
 $('#save-world').onclick=finish;
 save();const statusReady=status();
})();
