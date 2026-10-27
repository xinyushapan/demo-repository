(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const video = $('#camera'), connect = $('#connect-camera'), stop = $('#stop-camera');
  const device = $('#camera-device'), status = $('#camera-state'), message = $('#camera-message'), diagnostic = $('#camera-diagnostic');
  let stream = null, generation = 0, disposed = false, pending = false, monitor = null;
  let darkSamples = 0, stalledSamples = 0, previousFrames = null;
  // Sample only a tiny frame in browser memory to detect blank preview. Never upload or store it.
  const probe = document.createElement('canvas'); probe.width = 32; probe.height = 24;
  const probeContext = probe.getContext('2d', {willReadFrequently:true});
  function setStatus(text, kind = '') {status.textContent = text;status.classList.toggle('connected',kind==='ok');status.classList.toggle('warning',kind==='warning');}
  function warn(text) {diagnostic.hidden = false;diagnostic.textContent = text;setStatus('画面待检查','warning');}
  function stopCamera() {
    window.dispatchEvent(new CustomEvent('sandplay:camera-stopped'));
    generation++;window.SandplayCompanion?.stop();clearInterval(monitor);monitor=null;stream?.getTracks().forEach(track=>track.stop());stream=null;
    video.pause();video.srcObject=null;video.hidden=true;$('#camera-placeholder').hidden=false;stop.hidden=true;
    connect.textContent='▣ 连接摄像头';diagnostic.hidden=true;darkSamples=0;stalledSamples=0;previousFrames=null;
    setStatus('未连接');
  }
  async function listDevices(activeId) {
    try {
      const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(item=>item.kind==='videoinput');
      if(!cameras.length)return;
      const preferred=activeId || device.value;
      device.replaceChildren();
      cameras.forEach((camera,index)=>{const option=document.createElement('option');option.value=camera.deviceId;option.textContent=camera.label||`摄像头 ${index+1}`;device.append(option);});
      if(cameras.some(camera=>camera.deviceId===preferred))device.value=preferred;
    } catch { /* Device enumeration must not interrupt a usable preview. */ }
  }
  function inspectFrame() {
    if(!stream || document.hidden)return;
    const track=stream.getVideoTracks()[0];
    if(track.readyState==='ended'){stopCamera();message.textContent='摄像头已断开，仍可继续模拟搭建。';return;}
    if(track.muted || !track.enabled){warn('摄像头暂未提供画面。请检查镜头隐私滑盖、摄像头开关，或切换摄像头后重新连接。');return;}
    const frames=video.getVideoPlaybackQuality?.().totalVideoFrames;
    const noFrames=video.readyState<2 || !video.videoWidth || (frames!==undefined && previousFrames!==null && frames===previousFrames);
    previousFrames=frames;
    stalledSamples=noFrames?stalledSamples+1:0;
    if(stalledSamples>=4){warn('尚未收到持续更新的视频画面。可切换摄像头或点击重新连接；也请关闭占用镜头的软件。');return;}
    if(video.readyState<2 || !video.videoWidth)return;
    if(!probeContext){setStatus('已连接','ok');return;}
    try {
      probeContext.drawImage(video,0,0,32,24);
      const pixels=probeContext.getImageData(0,0,32,24).data;
      let sum=0,squared=0;const count=pixels.length/4;
      for(let i=0;i<pixels.length;i+=4){const brightness=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];sum+=brightness;squared+=brightness*brightness;}
      const mean=sum/count,variance=Math.max(0,squared/count-mean*mean);
      darkSamples=(mean<12 || (mean<70 && variance<5))?darkSamples+1:0;
      if(darkSamples>=3){warn('画面持续过暗或接近纯色，可能是镜头遮挡、环境过暗或选中了无画面的摄像头。请检查隐私滑盖，也可切换设备并重新连接。');return;}
      if(!noFrames && darkSamples===0){diagnostic.hidden=true;setStatus('已连接','ok');}
    } catch {setStatus('已连接','ok');}
  }
  async function startCamera() {
    if(pending)return;
    if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia){message.textContent='请使用 Chrome / Edge 打开 http://127.0.0.1:8000 或 HTTPS 地址后连接摄像头。';return;}
    const selectedId=device.value;
    pending=true;connect.disabled=true;
    await window.XinyuAI?.beforeCamera();
    if(disposed){pending=false;connect.disabled=false;return;}
    stopCamera();const requestGeneration=generation;pending=true;connect.disabled=true;device.disabled=true;
    setStatus('等待授权');message.textContent='请在浏览器提示中允许使用摄像头。';
    try {
      const constraints=selectedId?{deviceId:{exact:selectedId}}:{facingMode:{ideal:'user'}};
      const acquired=await navigator.mediaDevices.getUserMedia({video:constraints,audio:false});
      if(disposed || generation!==requestGeneration){acquired.getTracks().forEach(track=>track.stop());return;}
      stream=acquired;const track=stream.getVideoTracks()[0];track.enabled=true;
      video.srcObject=stream;video.muted=true;video.hidden=false;$('#camera-placeholder').hidden=true;
      stop.hidden=false;connect.textContent='↻ 重新连接';setStatus('等待画面');
      // Reveal before play so browsers can present the first frame immediately.
      void video.play().catch(()=>{if(generation===requestGeneration)warn('浏览器未能播放视频，请点击重新连接。');});
      monitor=setInterval(inspectFrame,1000);
      message.textContent='画面已连接，正在准备沙具外观匹配。点击识别框可纠正；未识别可在帮助中框选补充参考。';
      track.addEventListener('ended',()=>{if(generation!==requestGeneration)return;stopCamera();message.textContent='摄像头已断开，仍可继续使用模拟输入。';},{once:true});
      await listDevices(track.getSettings().deviceId);
    } catch(error) {
      if(generation!==requestGeneration)return;
      stopCamera();
      const messages={NotAllowedError:'摄像头权限未获允许。可在地址栏的网站权限中开启，或继续模拟搭建。',NotFoundError:'没有找到摄像头，可继续使用模拟输入。',NotReadableError:'摄像头可能正被其他程序占用，请关闭占用程序后重试。',OverconstrainedError:'所选摄像头已不可用，请刷新页面或选择其他摄像头。'};
      message.textContent=messages[error.name]||'连接失败，请检查摄像头后重试。模拟搭建仍可使用。';
    } finally {pending=false;connect.disabled=false;device.disabled=false;}
  }
  connect.onclick=startCamera;
  device.onchange=()=>{if(stream)startCamera();};
  stop.onclick=()=>{stopCamera();message.textContent='摄像头已关闭。可以继续模拟搭建。';};
  window.addEventListener('pagehide',()=>{disposed=true;stopCamera();});
  window.addEventListener('pageshow',()=>{disposed=false;});
})();

