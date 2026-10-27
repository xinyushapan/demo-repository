(() => {
  'use strict';
  const $=s=>document.querySelector(s),video=$('#camera'),toggle=$('#toggle-appearance'),status=$('#appearance-status'),overlay=$('#recognition-overlay');
  const catalog=window.SANDPLAY_TOYS,workerURL=new URL('appearance-worker.js?v=16',document.currentScript.src);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  let worker=null,loaded=false,loading=false,active=false,busy=false,timer=null,stream=null,frame=0,tracks=[],pendingLearn=[],sequence=0,selection=null,learning=false,drag=null;
  let custom=[];try{custom=JSON.parse(localStorage.getItem('xinyu-appearance-references')||'[]').filter(item=>catalog.some(toy=>toy.id===item.type)&&/^data:image\/jpeg;base64,/.test(item.data)).slice(-25);}catch{}
  const sendMode=()=>window.dispatchEvent(new CustomEvent('sandplay:appearance-mode',{detail:{active}}));
  function setActive(value){active=value;toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'暂停沙具识别':'开始识别沙具';$('#appearance-indicator').textContent=active?'· 识别中':'· 已暂停';sendMode();clearTimeout(timer);if(active){startWorker();tick();}else{$('.camera-label').textContent='本机画面预览 · 不上传';status.textContent='识别已暂停，保留最后的数字摆放。';}}
  function startWorker(){
    if(worker)return;
    loading=true;status.textContent='正在加载本地识别引擎和 63 种沙具参考，首次稍等片刻…';worker=new Worker(workerURL);
    worker.onerror=()=>fail('识别引擎加载失败，请刷新重试。');
    worker.onmessage=event=>{
      const data=event.data;
      if(data.kind==='progress'){status.textContent=`正在准备沙具参考 ${data.count}/${data.total}…`;}
      if(data.kind==='ready'){loaded=true;loading=false;$('#camera-message').textContent='外观匹配已就绪 · 点击识别框可纠正，设置中可补充实拍参考。';for(const item of pendingLearn)worker.postMessage(item);pendingLearn=[];status.textContent='外观识别已就绪。让沙具正面对准镜头，保持间距；点击识别框可以纠正。';tick();}
      if(data.kind==='result'){busy=false;if(active){update(data.items);status.textContent=`${data.items.length?'本帧匹配 '+data.items.length+' 件沙具':'暂未匹配到沙具'} · ${Math.round(data.elapsed)} ms/帧。未识别可框选补充实拍参考。`;timer=setTimeout(tick,350);}}
      if(data.kind==='learned'){status.textContent='已补充这件沙具的实拍参考，正在继续识别。';if(active)tick();}
      if(data.kind==='error')fail('识别暂不可用，请重试；摄像头仍可正常预览。');
    };
    worker.postMessage({kind:'init',custom});
  }
  function fail(message){busy=false;loading=false;loaded=false;worker?.terminate();worker=null;setActive(false);status.textContent=message;}
  function positionOverlay(){const bounds=$('.camera-window').getBoundingClientRect(),ratio=video.videoWidth/video.videoHeight||4/3;let width=bounds.width,height=width/ratio;if(height>bounds.height){height=bounds.height;width=height*ratio;}Object.assign(overlay.style,{width:`${width}px`,height:`${height}px`,left:`${(bounds.width-width)/2}px`,top:`${(bounds.height-height)/2}px`});}
  function tick(){
    clearTimeout(timer);if(!active||!loaded||busy||learning)return;
    if(!video.srcObject||video.readyState<2||!video.videoWidth||document.hidden||video.srcObject.getVideoTracks()[0]?.muted){timer=setTimeout(tick,500);return;}
    if(stream!==video.srcObject){stream=video.srcObject;tracks=[];overlay.replaceChildren();}
    positionOverlay();const scale=Math.min(480/video.videoWidth,360/video.videoHeight,1);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const image=ctx.getImageData(0,0,canvas.width,canvas.height);busy=true;worker.postMessage({kind:'frame',image},[image.data.buffer]);
  }
  function update(items){
    frame++;const now=performance.now(),claimed=new Set();
    for(const item of items){
      if(!catalog.some(toy=>toy.id===item.type)||!Number.isFinite(item.x+item.y)||!item.box||item.score<.86)continue;
      let track=tracks.filter(t=>(t.rawType===item.type||t.type===item.type)&&!claimed.has(t.id)).sort((a,b)=>Math.hypot(a.x-item.x,a.y-item.y)-Math.hypot(b.x-item.x,b.y-item.y))[0];
      if(track&&Math.hypot(track.x-item.x,track.y-item.y)>.3)track=null;
      if(!track){track={id:`vision-${Date.now()}-${++sequence}`,rawType:item.type,type:item.type,x:item.x,y:item.y,confirmations:0,lastFrame:frame-1};tracks.push(track);}
      track.confirmations=track.lastFrame===frame-1?track.confirmations+1:1;track.confirmed=track.confirmed||track.confirmations>=2;track.lastFrame=frame;track.lastSeen=now;track.x=item.x;track.y=item.y;track.box=item.box;track.score=item.score;claimed.add(track.id);
    }
    tracks=tracks.filter(track=>now-track.lastSeen<Math.max(9000,2500+(items.length||1)*100));
    const confirmed=tracks.filter(track=>track.confirmed&&!track.ignored);
    window.dispatchEvent(new CustomEvent('sandplay:objects',{detail:{items:confirmed.map(t=>({id:t.id,type:t.type,x:t.x,y:t.y,score:t.score})),observedIds:[...claimed],at:now}}));
    overlay.replaceChildren();
    for(const track of tracks.filter(t=>t.lastFrame===frame&&!t.ignored)){
      const button=document.createElement('button'),name=catalog.find(toy=>toy.id===track.type).name;button.className='recognition-box';button.type='button';button.style.cssText=`left:${track.box.x*100}%;top:${track.box.y*100}%;width:${track.box.w*100}%;height:${track.box.h*100}%`;
      const label=document.createElement('span');label.textContent=`${name}${track.confirmations<2?' · 待确认':''}`;button.append(label);button.setAttribute('aria-label',`纠正识别：${name}`);button.onclick=()=>openCorrection(track);overlay.append(button);
    }
    $('.camera-label').textContent=confirmed.length?`外观匹配：${confirmed.map(t=>catalog.find(toy=>toy.id===t.type).name).join('、')}`:'外观识别中 · 未匹配不生成';
  }
  function populateSelect(){const select=$('#recognition-type');for(const category of [...new Set(catalog.map(t=>t.category))]){const group=document.createElement('optgroup');group.label=category;for(const toy of catalog.filter(t=>t.category===category)){const option=document.createElement('option');option.value=toy.id;option.textContent=toy.name;group.append(option);}select.append(group);}}
  function openCorrection(track){selection={track,box:track.box};$('#recognition-type').value=track.type;$('#reference-title').textContent='纠正沙具名称';$('#ignore-recognition').hidden=false;$('#save-reference').textContent='更正并记住外观';capturePreview(track.box);$('#recognition-dialog').showModal();}
  function capturePreview(box){const shot=$('#reference-preview');shot.width=Math.max(16,Math.round(box.w*video.videoWidth));shot.height=Math.max(16,Math.round(box.h*video.videoHeight));shot.getContext('2d').drawImage(video,box.x*video.videoWidth,box.y*video.videoHeight,box.w*video.videoWidth,box.h*video.videoHeight,0,0,shot.width,shot.height);}
  toggle.onclick=()=>setActive(!active);
  $('#learn-appearance').onclick=()=>{if(!video.srcObject||video.readyState<2){status.textContent='请先连接摄像头，再框选沙具。';return;}learning=true;positionOverlay();overlay.classList.add('selecting-reference');overlay.replaceChildren();status.textContent='在摄像头画面中拖出一个框，只包含一件沙具；尽量贴近物件边缘。';$('#cancel-learning').hidden=false;};
  $('#cancel-learning').onclick=()=>endLearning();
  function endLearning(){learning=false;drag=null;overlay.classList.remove('selecting-reference');$('#cancel-learning').hidden=true;if(active)tick();}
  const point=event=>{const r=overlay.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};};
  overlay.onpointerdown=event=>{if(!learning)return;drag=point(event);overlay.setPointerCapture(event.pointerId);};
  overlay.onpointermove=event=>{if(!drag)return;const p=point(event);let rect=overlay.querySelector('.reference-selection');if(!rect){rect=document.createElement('div');rect.className='reference-selection';overlay.append(rect);}rect.style.cssText=`left:${Math.min(p.x,drag.x)*100}%;top:${Math.min(p.y,drag.y)*100}%;width:${Math.abs(p.x-drag.x)*100}%;height:${Math.abs(p.y-drag.y)*100}%`;};
  overlay.onpointerup=event=>{if(!drag)return;const p=point(event),box={x:Math.min(p.x,drag.x),y:Math.min(p.y,drag.y),w:Math.abs(p.x-drag.x),h:Math.abs(p.y-drag.y)};drag=null;if(box.w<.025||box.h<.04){status.textContent='框选范围太小，请重新框选一件沙具。';return;}selection={box};capturePreview(box);$('#reference-title').textContent='记住这件沙具的外观';$('#ignore-recognition').hidden=true;$('#save-reference').textContent='记住并继续识别';$('#recognition-dialog').showModal();};
  $('#recognition-dialog').addEventListener('close',endLearning);
  $('#close-recognition-dialog').onclick=()=>$('#recognition-dialog').close();
  $('#save-reference').onclick=async()=>{
    if(!selection)return;const type=$('#recognition-type').value,shot=$('#reference-preview'),small=document.createElement('canvas'),scale=Math.min(1,240/shot.width,240/shot.height);small.width=Math.round(shot.width*scale);small.height=Math.round(shot.height*scale);small.getContext('2d').drawImage(shot,0,0,small.width,small.height);
    const data=small.toDataURL('image/jpeg',.9);custom.push({type,data});custom=custom.slice(-25);try{localStorage.setItem('xinyu-appearance-references',JSON.stringify(custom));}catch{status.textContent='参考已用于本次识别，但浏览器存储空间不足，未能长期保存。';}
    if(selection.track){selection.track.type=type;selection.track.confirmations=2;window.dispatchEvent(new CustomEvent('sandplay:correct-object',{detail:{id:selection.track.id,type}}));}
    const blob=await(await fetch(data)).blob();if(loaded)worker.postMessage({kind:'learn',type,blob});else pendingLearn.push({kind:'learn',type,blob});
    selection=null;$('#recognition-dialog').close();setActive(true);
  };
  $('#ignore-recognition').onclick=()=>{if(selection?.track){selection.track.ignored=true;window.dispatchEvent(new CustomEvent('sandplay:ignore-object',{detail:{id:selection.track.id}}));}selection=null;$('#recognition-dialog').close();};
  $('#forget-references').onclick=()=>{custom=[];localStorage.removeItem('xinyu-appearance-references');worker?.terminate();worker=null;loaded=false;busy=false;tracks=[];overlay.replaceChildren();status.textContent='已清除本机补充的实拍参考，保留设计图参考。';if(active){startWorker();}};
  // Connection starts appearance matching; stopping the camera preserves the last layout.
  video.addEventListener('playing',()=>{if(!active&&(!worker||video.srcObject!==stream))setActive(true);});
  $('#stop-camera').addEventListener('click',()=>{setActive(false);overlay.replaceChildren();});
  new ResizeObserver(positionOverlay).observe($('.camera-window'));populateSelect();
  window.addEventListener('pagehide',()=>{clearTimeout(timer);worker?.terminate();worker=null;loaded=false;busy=false;active=false;});
  window.addEventListener('pageshow',event=>{if(event.persisted)setActive(false);});
})();
