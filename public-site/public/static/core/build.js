(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const onlineMode=document.body.classList.contains('online-mode'),draftKey=onlineMode?'heart-online-sand-draft':'heart-sand-draft';
  const scenes = [
    { id: 'nature', name: '自然探险', icon: '🌲🏔️', sky: ['#c5e8d8','#edf3cf'], land: '#99bc72', edge: '#71925d', accent: '#b5d6c1' },
    { id: 'animal', name: '动物家园', icon: '🦁🦒', sky: ['#f5d89b','#fff0c9'], land: '#b8c77c', edge: '#8ea45a', accent: '#e7d69f' },
    { id: 'city', name: '城市街区', icon: '🏡🏙️', sky: ['#c6e0f0','#ecf4f7'], land: '#bad4a0', edge: '#7eaa88', accent: '#c7dfeb' },
    { id: 'ocean', name: '海底世界', icon: '🐠🪸', sky: ['#65c7dc','#c3eceb'], land: '#e9d39c', edge: '#d5b77f', accent: '#8bd9df' },
    { id: 'space', name: '星空幻想', icon: '🚀🪐', sky: ['#26254f','#7767a0'], land: '#afa2c4', edge: '#827494', accent: '#5d527f' },
    { id: 'free', name: '自由沙盘', icon: '🔺🟨', sky: ['#f5e3ce','#fcf3e5'], land: '#eed9a9', edge: '#d4b785', accent: '#eeddc4' },
  ];
  const catalog = window.SANDPLAY_TOYS || [];
  const toys = catalog.map(t=>({...t,emoji:({tree:'🌳',adult:'🧍',house:'🏠',dog:'🐕',flower:'🌻',heart:'💗'})[t.id]||'◈'}));
  toys.push({id:'person',name:'人物',emoji:'🧍',image:'/static/core/toys/adult.png'});
  const sprites=new Map();for(const toy of toys){
    const image=new Image();
    image.onload=()=>{
      const scratch=document.createElement('canvas');scratch.width=image.naturalWidth;scratch.height=image.naturalHeight;const sample=scratch.getContext('2d');sample.drawImage(image,0,0);const data=sample.getImageData(0,0,scratch.width,scratch.height).data;
      let left=scratch.width,top=scratch.height,right=0,bottom=0;
      for(let y=0;y<scratch.height;y++)for(let x=0;x<scratch.width;x++)if(data[(y*scratch.width+x)*4+3]>200){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(right>left&&bottom>top)image.sandplayBounds={x:left,y:top,w:right-left+1,h:bottom-top+1};
      draw(performance.now());
    };
    image.src=toy.image;sprites.set(toy.id,image);
  }
  let state = { scene: onlineMode?'free':'nature', pieces: [], events: [] }, selected = null, cardMode = false, cardFrame = 0;
  const cameraTracks = new Map();
  let toastTimer, drag = null;
  const canvas = $('#world-canvas'), ctx = canvas.getContext('2d');
  const tray = $('#input-tray');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const environment=window.SandplayWorld.create(ctx,{reducedMotion,onLoad:()=>draw(performance.now())});
  const validState = data => {
    if (!data || !scenes.some(s => s.id === data.scene) || !Array.isArray(data.pieces)) return null;
    return { scene: data.scene, events: Array.isArray(data.events) ? data.events.filter(e=>e&&typeof e.action==='string'&&typeof e.at==='string').slice(-2000) : [], pieces: data.pieces.slice(0,30).filter(p => p && typeof p.id === 'string' && toys.some(t => t.id === p.type) && Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => ({ id: p.id, type: p.type, x: Math.max(.07,Math.min(.93,p.x)), y: Math.max(.07,Math.min(.93,p.y)) })) };
  };
  function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3200); }
  function persist() { try { localStorage.setItem(draftKey,JSON.stringify(state)); } catch { toast('浏览器无法保存草稿；当前仍可继续搭建。'); } }
  function record(action,piece=null,source='手动搭建') {
    state.events.push({at:new Date().toISOString(),action,source,scene:state.scene,...(piece?{id:piece.id,type:piece.type,x:Number(piece.x.toFixed(4)),y:Number(piece.y.toFixed(4))}:{})});
    state.events=state.events.slice(-2000);$('#operation-count').textContent=state.events.length;window.dispatchEvent(new CustomEvent('sandplay:operation',{detail:state.events.at(-1)}));
  }
  try {
    const recordId = new URLSearchParams(location.search).get('record');
    const records = JSON.parse(localStorage.getItem('heart-sand-records') || '[]');
    const record = recordId && Array.isArray(records) ? records.find(r => r.id === recordId) : null;
    const saved = validState(record || JSON.parse(localStorage.getItem(draftKey) || 'null'));
    if (saved) state = saved;
  } catch { /* Invalid or unavailable storage does not prevent building. */ }
  scenes.forEach(scene => {
    const button = document.createElement('button'); button.className = 'scene-card'; button.dataset.scene = scene.id;
    button.innerHTML = `<span class="scene-picture scene-art scene-art-${scene.id}" aria-hidden="true"></span><strong>${scene.name}</strong>`;
    button.onclick = () => { state.scene = scene.id; record('切换场景',null,'用户选择'); persist(); sync(); showDigital(); }; $('#scene-list').append(button);
  });
  const categories=[...(onlineMode?['全部沙具']:[]),...new Set(catalog.map(toy=>toy.category))];
  const categorySelect=document.createElement('select');categorySelect.className='toy-category';categorySelect.setAttribute('aria-label','沙具种类');
  categories.forEach(category=>{const option=document.createElement('option');option.value=category;option.textContent=category;categorySelect.append(option);});
  document.querySelector('.simulation-title').append(categorySelect);
  function showToys(category){
    $('#toy-list').replaceChildren();
    for(const toy of catalog.filter(t=>category==='全部沙具'||t.category===category)){
      const button=document.createElement('button');button.className='toy-button';button.dataset.toy=toy.id;button.disabled=cardMode;
      const image=document.createElement('img');image.src=toy.image;image.alt='';button.append(image,document.createTextNode(toy.name+' ＋'));button.setAttribute('aria-label',`手动放入${toy.name}`);
      button.onclick=()=>addToy(toy.id);if(onlineMode){button.draggable=true;button.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/x-sandplay-toy',toy.id);event.dataTransfer.effectAllowed='copy';});}$('#toy-list').append(button);
    }
  }
  categorySelect.onchange=()=>showToys(categorySelect.value);showToys(categories[0]);
  function addToy(type,x,y){if(cardMode||!catalog.some(t=>t.id===type))return;if(state.pieces.length>=30)return toast('最多放入30件沙具。');const n=state.pieces.length,piece={id:crypto.randomUUID(),type,x:Math.max(.07,Math.min(.93,Number.isFinite(x)?x:.2+n%4*.19)),y:Math.max(.07,Math.min(.93,Number.isFinite(y)?y:.25+Math.floor(n/4)%3*.25))};state.pieces.push(piece);selected=piece.id;record('放入',piece,onlineMode?'线上搭建':'手动搭建');persist();sync();}
  function showDigital(focus = true) {
    $('#scene-picker').hidden = true;
    $('#digital-view').hidden = false;
    document.querySelector('.scene-panel').classList.add('showing-world');
    requestAnimationFrame(() => { draw(performance.now()); if (focus) $('#world-heading').focus({preventScroll:true}); });
  }
  $('#change-scene').onclick = () => {
    $('#digital-view').hidden = true;
    $('#scene-picker').hidden = false;
    document.querySelector('.scene-panel').classList.remove('showing-world');
    document.querySelector(`[data-scene="${state.scene}"]`).focus({preventScroll:true});
  };
  function sync() {
    const scene = scenes.find(s => s.id === state.scene);
    $('#world-name').textContent = scene.name;
    document.querySelectorAll('.scene-card').forEach(b => { const active = b.dataset.scene === state.scene; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
    const previousFocus = document.activeElement?.dataset.piece;
    tray.replaceChildren();
    state.pieces.forEach(piece => {
      const toy = toys.find(t => t.id === piece.type), button = document.createElement('button');
      button.className = 'tray-piece'; button.dataset.piece = piece.id; const image=document.createElement('img');image.src=toy.image;image.alt='';button.append(image);
      button.title = `${toy.name}：拖动或用方向键移动`; button.setAttribute('aria-label',`模拟${toy.name}，横向 ${Math.round(piece.x*100)}%，纵向 ${Math.round(piece.y*100)}%`);
      button.setAttribute('aria-pressed',String(selected === piece.id));
      button.style.left = `${piece.x*100}%`; button.style.top = `${piece.y*100}%`;
      button.onclick = () => { selected = piece.id; updateSelection(); };
      button.onpointerdown = event => { if(cardMode)return; event.preventDefault(); selected = piece.id; button.focus(); updateSelection(); drag = { id: piece.id, source: 'tray',initialX:piece.x,initialY:piece.y }; tray.setPointerCapture(event.pointerId); };
      button.onkeydown = event => {
        if(cardMode)return;
        const delta = { ArrowLeft: [-.025,0], ArrowRight: [.025,0], ArrowUp: [0,-.025], ArrowDown: [0,.025] }[event.key];
        if (delta) { event.preventDefault(); selected = piece.id; move(piece.id,piece.x+delta[0],piece.y+delta[1]); }
        else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); selected = piece.id; remove(); }
      };
      tray.append(button);
    });
    if (previousFocus) [...tray.children].find(b => b.dataset.piece === previousFocus)?.focus({preventScroll:true});
    $('#toy-count').textContent = `${state.pieces.length} 件沙具`;
    $('#operation-count').textContent = state.events.length;
    $('#world-empty').hidden = state.pieces.length > 0;
    $('#world-empty').style.color = '#806951';
    updateSelection(); draw(performance.now());
  }
  function updateSelection() {
    const piece = state.pieces.find(p => p.id === selected);
    tray.querySelectorAll('button').forEach(b => { b.classList.toggle('selected',b.dataset.piece === selected); b.setAttribute('aria-pressed',String(b.dataset.piece === selected)); });
    $('#remove-toy').hidden = !piece;
    $('#selection-info').textContent = piece ? `已选中${toys.find(t => t.id === piece.type).name} · 可拖动调整位置` : '点击场景中的沙具可以选中';
  }
  function move(id,x,y) {
    const piece = state.pieces.find(p => p.id === id); if (!piece) return;
    piece.x = Math.max(.07,Math.min(.93,x)); piece.y = Math.max(.07,Math.min(.93,y));
    const marker = [...tray.children].find(b => b.dataset.piece === id);
    if (marker) { marker.style.left = `${piece.x*100}%`; marker.style.top = `${piece.y*100}%`; marker.setAttribute('aria-label',`${toys.find(t=>t.id===piece.type).name}，横向 ${Math.round(piece.x*100)}%，纵向 ${Math.round(piece.y*100)}%`); }
    draw(performance.now());
  }
  tray.onpointermove = e => { if (drag?.source !== 'tray') return; const r = tray.getBoundingClientRect(); move(drag.id,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height); };
  const endDrag = () => { if (drag) { const piece=state.pieces.find(p=>p.id===drag.id);if(piece&&(Math.abs(piece.x-drag.initialX)>.002||Math.abs(piece.y-drag.initialY)>.002))record('移动',piece);drag = null; persist(); } };
  tray.onpointerup = endDrag; tray.onpointercancel = endDrag;
  tray.addEventListener('keyup', event => { if(!cardMode&&event.key.startsWith('Arrow')) {const piece=state.pieces.find(p=>p.id===selected);if(piece)record('移动',piece);persist();} });
  function remove() { if(cardMode)return;const piece=state.pieces.find(p=>p.id===selected);if(piece)record('移除',piece);state.pieces = state.pieces.filter(p => p.id !== selected); selected = null; persist(); sync(); }
  $('#remove-toy').onclick = remove;
  $('#clear-world').onclick = () => { if(cardMode)return;record('清空');state.pieces = []; selected = null; persist(); sync(); };
  $('#sample-world').onclick = () => { if(cardMode)return;state.pieces = [{type:'tree',x:.2,y:.3},{type:'tree',x:.76,y:.24},{type:'house',x:.58,y:.4},{type:'person',x:.42,y:.65},{type:'dog',x:.7,y:.72},{type:'flower',x:.23,y:.7}].map(p=>({...p,id:crypto.randomUUID()})); selected = null;record('载入示例'); persist(); sync(); toast('已模拟放入 6 件沙具。试着拖动它们吧！'); };
  // Tracking IDs distinguish multiple objects of the same appearance class.
  window.addEventListener('sandplay:appearance-mode',event=>{
    cardMode=event.detail.active===true;
    document.querySelectorAll('.toy-button,#sample-world,#clear-world,#remove-toy').forEach(button=>button.disabled=cardMode);
    $('#input-source-note').textContent=cardMode?'摄像头外观匹配 · 画面相对位置 · 点击识别框可纠正':'手动搭建 · 可随时开启摄像头识别';
    document.querySelector('.stage-top span:last-child').textContent=cardMode?'外观匹配':'手动输入';
    document.querySelector('.demo-badge').textContent=cardMode?'✦ 沙具外观联动':'✦ 手动搭建';
    document.querySelector('.simulation-title h3').textContent=cardMode?'识别联动':'手动沙具';
    record(cardMode?'开始外观匹配':'暂停外观匹配',null,'用户操作');persist();
  });
  window.addEventListener('sandplay:objects',event=>{
    if(!cardMode||!Array.isArray(event.detail?.items))return;
    const incoming=new Set();let changed=false;const now=performance.now();
    for(const detected of event.detail.items){
      if(!toys.some(t=>t.id===detected.type)||typeof detected.id!=='string'||!Number.isFinite(detected.x+detected.y))continue;
      const id=detected.id;incoming.add(id);const x=Math.max(.07,Math.min(.93,detected.x)),y=Math.max(.07,Math.min(.93,detected.y));let piece=state.pieces.find(p=>p.id===id),track=cameraTracks.get(id);
      if(!track){track={loggedX:x,loggedY:y,loggedAt:now};cameraTracks.set(id,track);}
      if(!piece){if(state.pieces.length>=30)continue;piece={id,type:detected.type,x,y};state.pieces.push(piece);record('进入画面',piece,'摄像头外观匹配');changed=true;}
      else{piece.type=detected.type;if(Math.abs(piece.x-x)>.008||Math.abs(piece.y-y)>.008){piece.x=piece.x*.35+x*.65;piece.y=piece.y*.35+y*.65;changed=true;}
        if(now-track.loggedAt>600&&(Math.abs(piece.x-track.loggedX)>.035||Math.abs(piece.y-track.loggedY)>.035)){record('移动',piece,'摄像头外观匹配');track.loggedX=piece.x;track.loggedY=piece.y;track.loggedAt=now;changed=true;}}
    }
    for(const piece of state.pieces.slice()){if(piece.id.startsWith('vision-')&&!incoming.has(piece.id)){record('离开画面',piece,'摄像头外观匹配');state.pieces=state.pieces.filter(p=>p.id!==piece.id);cameraTracks.delete(piece.id);if(selected===piece.id)selected=null;changed=true;}}
    if(changed){persist();sync();}
  });
  window.addEventListener('sandplay:correct-object',event=>{const piece=state.pieces.find(p=>p.id===event.detail.id);if(piece&&toys.some(t=>t.id===event.detail.type)){piece.type=event.detail.type;record('更正类别',piece,'用户纠正');persist();sync();}});
  window.addEventListener('sandplay:ignore-object',event=>{const piece=state.pieces.find(p=>p.id===event.detail.id);if(piece){record('忽略误认',piece,'用户纠正');state.pieces=state.pieces.filter(p=>p.id!==piece.id);persist();sync();}});
  const logDialog=$('#operation-log-dialog');
  $('#open-operation-log').onclick=()=>{
    const list=$('#operation-log-list');list.replaceChildren();
    if(!state.events.length){const item=document.createElement('li');item.textContent='还没有操作记录。';list.append(item);}
    state.events.slice().reverse().forEach(entry=>{const item=document.createElement('li'),name=toys.find(t=>t.id===entry.type)?.name||'';item.textContent=`${new Date(entry.at).toLocaleTimeString('zh-CN')} · ${entry.action} ${name}${Number.isFinite(entry.x)?` · (${entry.x.toFixed(2)}, ${entry.y.toFixed(2)})`:''} · ${entry.source}`;list.append(item);});
    logDialog.showModal();
  };
  $('#close-operation-log').onclick=()=>logDialog.close();
  $('#download-operation-log').onclick=()=>{const data={format:'xinyu-operations-v1',exportedAt:new Date().toISOString(),coordinateSystem:'normalized image coordinates; not calibrated tabletop coordinates',events:state.events};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='心语沙盘-操作记录.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('#save-world').onclick = () => $('#finish-session').click();
  window.SandplaySession={snapshot:()=>JSON.parse(JSON.stringify({...state,mode:onlineMode?'online':'physical'}))};
  window.addEventListener('sandplay:ai-objects',event=>{
    let changed=false;
    for(const item of event.detail.items||[]){let piece=state.pieces.find(p=>p.id===item.id);if(!piece&&state.pieces.length<30){piece={id:item.id,type:item.type,x:item.x,y:item.y};state.pieces.push(piece);record('进入画面',piece,'DeepSeek参考识别（需核对）');changed=true;}else if(piece&&(Math.hypot(piece.x-item.x,piece.y-item.y)>.035||piece.type!==item.type)){Object.assign(piece,{type:item.type,x:item.x,y:item.y});record('移动',piece,'DeepSeek参考识别（需核对）');changed=true;}}
    for(const id of event.detail.removed||[]){const piece=state.pieces.find(p=>p.id===id);if(piece){record('离开画面',piece,'DeepSeek参考识别（需核对）');state.pieces=state.pieces.filter(p=>p.id!==id);changed=true;}}
    if(changed){persist();sync();$('#input-source-note').textContent='DeepSeek框选区域参考识别 · 请核对名称与摆放';}
  });
  // Lightweight canvas toy world: no external renderer or network assets required.
  let W=800,H=460;
  function ellipse(x,y,rx,ry,color) { ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill(); }
  function rounded(x,y,w,h,r,color) {ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();}
  function path(points,color){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=color;ctx.fill();}
  function project(p){return {x:W*(.12+p.x*.76),y:H*(.40+p.y*.49)};}
  function toyDraw(type,x,y,s,bob,highlight=false) {
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,5,24,8,'#39332320');
    if(highlight){ctx.beginPath();ctx.ellipse(0,5,32,12,0,0,Math.PI*2);ctx.strokeStyle='#9b74c5';ctx.lineWidth=3;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);}
    ctx.translate(0,bob);
    const sprite=sprites.get(type);if(sprite?.complete&&sprite.naturalWidth){const area=sprite.sandplayBounds||{x:0,y:0,w:sprite.naturalWidth,h:sprite.naturalHeight};const height=100,width=height*area.w/area.h;ctx.drawImage(sprite,area.x,area.y,area.w,area.h,-width/2,-height,width,height);ctx.restore();return;}
    if(type==='tree') {rounded(-7,-48,14,50,5,'#aa7347');ellipse(2,-22,12,5,'#98633d');ellipse(-17,-55,22,26,'#3f945e');ellipse(17,-57,24,28,'#4ba56a');ellipse(0,-77,27,30,'#65b77a');ellipse(-8,-85,9,12,'#87cb8f');}
    else if(type==='house') {rounded(-28,-45,56,49,5,'#fff0cd');path([[-34,-45],[0,-77],[35,-45]],'#ed785e');path([[0,-77],[35,-45],[31,-39],[-1,-66],[-32,-39],[-34,-45]],'#cf5c48');rounded(-6,-23,15,27,7,'#a47751');rounded(-21,-34,10,13,3,'#8bcbd0');rounded(14,-34,10,13,3,'#8bcbd0');rounded(18,-76,9,20,2,'#f7e2bc');}
    else if(type==='person') {ellipse(-9,0,8,6,'#487998');ellipse(9,0,8,6,'#487998');rounded(-17,-45,34,43,10,'#65aade');ellipse(-18,-26,6,14,'#82bee8');ellipse(18,-26,6,14,'#82bee8');ellipse(0,-62,20,22,'#f3d9aa');ellipse(-7,-63,2.3,3,'#393127');ellipse(7,-63,2.3,3,'#393127');ctx.beginPath();ctx.arc(0,-57,5,0,Math.PI);ctx.strokeStyle='#997151';ctx.lineWidth=1.8;ctx.stroke();ellipse(-6,-76,7,4,'#fff1cd88');}
    else if(type==='dog') {
      rounded(-26,-30,49,26,12,'#c88a54');rounded(-20,-9,8,14,4,'#a86f41');rounded(12,-9,8,14,4,'#a86f41');
      ellipse(17,-38,19,19,'#dfaa72');ellipse(8,-41,8,17,'#9d633d');ellipse(26,-40,2.4,3,'#30291f');ellipse(33,-31,5,4,'#493225');
      ctx.beginPath();ctx.moveTo(-22,-23);ctx.quadraticCurveTo(-43,-49,-35,-31);ctx.strokeStyle='#c88a54';ctx.lineWidth=7;ctx.stroke();ellipse(-7,-26,9,6,'#e7ba85');
    }
    else if(type==='flower') {
      rounded(-3,-47,6,45,3,'#5e994f');ellipse(-12,-21,12,5,'#7db66b');ellipse(10,-30,10,5,'#7db66b');
      for(let i=0;i<8;i++){const a=i*Math.PI/4;ellipse(Math.cos(a)*14,-53+Math.sin(a)*14,9,9,'#ffce48');}
      ellipse(0,-53,11,11,'#b78446');ellipse(-3,-57,3,3,'#cf9e61');ellipse(0,2,17,5,'#88af68');
    }
    else if(type==='heart') {
      ctx.beginPath();ctx.moveTo(0,-6);ctx.bezierCurveTo(-64,-47,-16,-80,0,-50);ctx.bezierCurveTo(16,-80,64,-47,0,-6);ctx.fillStyle='#ef8da1';ctx.fill();ellipse(-13,-49,6,8,'#ffd3dc');
    }
    ctx.restore();
  }
  function draw(time) {
    if (!ctx || W <= 0 || H <= 0) return;
    const scene=scenes.find(s=>s.id===state.scene), t=reducedMotion?0:time/1000;
    ctx.clearRect(0,0,W,H);
    const painted=environment.background(scene.id,W,H,t);
    if(!painted){
      const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,scene.sky[0]);sky.addColorStop(1,scene.sky[1]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      const ground=ctx.createLinearGradient(0,H*.38,0,H);ground.addColorStop(0,scene.accent);ground.addColorStop(1,scene.land);ctx.fillStyle=ground;ctx.fillRect(0,H*.38,W,H*.62);
    }
    environment.ambience(scene.id,W,H,t);
    const s=Math.min(W/700,H/410);
    state.pieces.slice().sort((a,b)=>a.y-b.y).forEach(p=>{const point=project(p);const scale=s*(.9+p.y*.24);toyDraw(p.type,point.x,point.y,scale,0,p.id===selected);});
    environment.ambience(scene.id,W,H,t,true);
  }
  canvas.onpointerdown = event => {
    if(cardMode)return;
    const r=canvas.getBoundingClientRect(), x=(event.clientX-r.left)/r.width*W, y=(event.clientY-r.top)/r.height*H;
    const piece=state.pieces.slice().sort((a,b)=>b.y-a.y).find(p=>{const q=project(p),scale=Math.min(W/700,H/410)*(.9+p.y*.24);const sprite=sprites.get(p.type),area=sprite?.sandplayBounds,halfWidth=area?50*area.w/area.h:35;return Math.abs(q.x-x)<halfWidth*scale&&y>q.y-98*scale&&y<q.y+12*scale;});
    selected=piece?.id||null;updateSelection();draw(performance.now());
    if(piece){drag={id:piece.id,source:'canvas',initialX:piece.x,initialY:piece.y,dx:x-project(piece).x,dy:y-project(piece).y};canvas.setPointerCapture(event.pointerId);}
  };
  canvas.onpointermove = event => {if(drag?.source!=='canvas')return;const r=canvas.getBoundingClientRect();move(drag.id,(((event.clientX-r.left)/r.width*W-drag.dx)/W-.12)/.76,(((event.clientY-r.top)/r.height*H-drag.dy)/H-.40)/.49);};
  canvas.onpointerup=endDrag;canvas.onpointercancel=endDrag;
  if(onlineMode){canvas.tabIndex=0;canvas.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('text/x-sandplay-toy')){event.preventDefault();event.dataTransfer.dropEffect='copy';}});canvas.addEventListener('drop',event=>{event.preventDefault();const r=canvas.getBoundingClientRect();addToy(event.dataTransfer.getData('text/x-sandplay-toy'),((event.clientX-r.left)/r.width-.12)/.76,((event.clientY-r.top)/r.height-.4)/.49);});canvas.addEventListener('keydown',event=>{if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();remove();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){const piece=state.pieces.find(p=>p.id===selected);if(!piece)return;event.preventDefault();move(piece.id,piece.x+({'ArrowLeft':-.02,'ArrowRight':.02}[event.key]||0),piece.y+({'ArrowUp':-.02,'ArrowDown':.02}[event.key]||0));record('移动',piece,'线上搭建');persist();}});}
  new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();W=r.width;H=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw(performance.now());}).observe(canvas);
  let lastPaint=0;function animate(time){if(!document.hidden&&!$('#digital-view').hidden&&time-lastPaint>32){draw(time);lastPaint=time;}requestAnimationFrame(animate);} sync();if(onlineMode||new URLSearchParams(location.search).has('record'))showDigital(false);if(!reducedMotion)requestAnimationFrame(animate);
})();
