/* QR test-card verification only. Frames stay in browser memory. */
(() => {
  'use strict';
  const video=document.querySelector('#camera'),toggle=document.querySelector('#toggle-card-recognition');
  const status=document.querySelector('#card-recognition-status'),indicator=document.querySelector('#card-mode-indicator');
  const cameraLabel=document.querySelector('.camera-label'),canvas=document.createElement('canvas');
  const context=canvas.getContext('2d',{willReadFrequently:true});
  const names={tree:'小树',house:'房屋',person:'人物'};
  let active=false,timer=null,previousStream=null;
  function announceMode(){window.dispatchEvent(new CustomEvent('sandplay:card-mode',{detail:{active}}));}
  function setActive(value){
    active=value;clearTimeout(timer);toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'暂停测试卡识别':'开始识别测试卡';indicator.textContent=active?'· 已开启':'· 未开启';
    announceMode();
    if(active){previousStream=null;tick();}else{cameraLabel.textContent='本机画面预览 · 不上传';status.textContent='测试卡识别已暂停，保留最后一次摆放；可以继续模拟操作。';}
  }
  function decodeFrame(){
    const scale=Math.min(1,800/video.videoWidth,600/video.videoHeight);
    canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
    context.drawImage(video,0,0,canvas.width,canvas.height);
    const items=[],found=new Set(),regions=[{x:0,y:0,w:canvas.width,h:canvas.height}];
    // jsQR is a single-code decoder. Overlapping windows prevent finder patterns
    // from separate cards being mistaken for one large, undecodable QR symbol.
    const halfW=Math.ceil(canvas.width/2),halfH=Math.ceil(canvas.height/2);
    for(const fy of [0,.25,.5])for(const fx of [0,.22,.44,.66])regions.push({x:Math.floor(canvas.width*fx),y:Math.floor(canvas.height*fy),w:Math.floor(canvas.width*.34),h:halfH});
    for(const fy of [0,.25,.5])for(const fx of [0,.25,.5])regions.push({x:Math.floor(canvas.width*fx),y:Math.floor(canvas.height*fy),w:halfW,h:halfH});
    for(const region of regions){
      for(let pass=0;pass<3;pass++){
        const frame=context.getImageData(region.x,region.y,region.w,region.h);
        const result=window.jsQR(frame.data,region.w,region.h,{inversionAttempts:'dontInvert'});if(!result)break;
        const corners=['topLeftCorner','topRightCorner','bottomRightCorner','bottomLeftCorner'].map(key=>({x:result.location[key].x+region.x,y:result.location[key].y+region.y}));
        const match=/^XYSP1:(tree|house|person):01$/.exec(result.data);
        if(match&&!found.has(match[1])){found.add(match[1]);items.push({type:match[1],x:corners.reduce((sum,p)=>sum+p.x,0)/4/canvas.width,y:corners.reduce((sum,p)=>sum+p.y,0)/4/canvas.height});}
        const left=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))-3),right=Math.min(canvas.width,Math.ceil(Math.max(...corners.map(p=>p.x)))+3);
        const top=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.y)))-3),bottom=Math.min(canvas.height,Math.ceil(Math.max(...corners.map(p=>p.y)))+3);
        context.fillStyle='white';context.fillRect(left,top,right-left,bottom-top);
        if(items.length===3)return items;
      }
    }
    return items;
  }
  function tick(){
    if(!active)return;
    if(!video.srcObject||video.readyState<2||!video.videoWidth||video.srcObject.getVideoTracks()[0]?.muted){status.textContent='请先连接摄像头并等待正常画面。';cameraLabel.textContent='测试卡识别：等待摄像头';timer=setTimeout(tick,400);return;}
    if(document.hidden){timer=setTimeout(tick,500);return;}
    try{
      if(previousStream!==video.srcObject){previousStream=video.srcObject;window.dispatchEvent(new Event('sandplay:card-stream-reset'));}
      const items=decodeFrame();
      window.dispatchEvent(new CustomEvent('sandplay:cards',{detail:{items}}));
      const labels=items.map(item=>names[item.type]).join('、');
      cameraLabel.textContent=labels?`测试卡：${labels}`:'测试卡识别中 · 对准二维码';
      status.textContent=labels?`本帧识别到：${labels}。移动卡片观察数字位置变化；短暂遮挡会保留位置。`:'请把二维码朝向镜头，保持白边和卡片间距。仅支持树、房屋、人物三种测试卡。';
    }catch{setActive(false);status.textContent='识别暂不可用，请刷新页面后重试。模拟搭建仍可使用。';return;}
    timer=setTimeout(tick,200);
  }
  toggle.onclick=()=>setActive(!active);
  if(!context||typeof window.jsQR!=='function'){toggle.disabled=true;status.textContent='测试卡识别库未加载，请刷新后重试。';}
  window.addEventListener('pagehide',()=>{active=false;clearTimeout(timer);});
  window.addEventListener('pageshow',event=>{if(event.persisted)setActive(false);});
})();
