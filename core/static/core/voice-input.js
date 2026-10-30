/* Explicit microphone start; speech is sent after a pause or manual finish. */
(() => {
 'use strict';
 const button=document.querySelector('#voice-input'),cancelButton=document.querySelector('#voice-cancel'),status=document.querySelector('#voice-status');
 const meter=document.createElement('meter');meter.className='voice-input-level';meter.min=0;meter.max=1;meter.value=0;meter.hidden=true;meter.setAttribute('aria-label','麦克风音量');status.before(meter);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 let phase='idle',generation=0,stream=null,context=null,source=null,processor=null,gain=null,controller=null,timer=0,started=0,samples=0,rate=48000,peak=0,chunks=[],consentCancel=null;
 let heard=false,voicedSamples=0,lastVoice=0;
 const active=()=>phase!=='idle';
 function setPhase(value,text){phase=value;button.disabled=value==='transcribing';button.setAttribute('aria-pressed',String(value==='recording'));button.textContent=value==='recording'?'■ 结束并发送':value==='permission'?'等待麦克风…':value==='transcribing'?'正在听懂你的话…':'🎙 说一说';cancelButton.hidden=value==='idle';meter.hidden=value!=='recording';meter.value=0;status.textContent=text;window.dispatchEvent(new CustomEvent('sandplay:voice-input-state',{detail:{active:active()}}));}
 function release(){clearInterval(timer);timer=0;if(processor){processor.onaudioprocess=null;processor.disconnect();processor=null;}source?.disconnect();source=null;gain?.disconnect();gain=null;stream?.getTracks().forEach(track=>track.stop());stream=null;if(context){void context.close().catch(()=>{});context=null;}}
 function cancel(text='已取消，录音不会发送。'){generation++;consentCancel?.();controller?.abort();controller=null;release();chunks=[];samples=0;setPhase('idle',text);}
 function ensureRecordingConsent(){
  // Microphone uploads do not depend on whether DeepSeek chat is configured.
  if(sessionStorage.getItem('xinyu-recording-consent-v1')==='1'||sessionStorage.getItem('xinyu-companion-consent-v4')==='online')return Promise.resolve(true);
  return new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.className='ai-dialog';dialog.setAttribute('aria-labelledby','recording-consent-title');
   dialog.innerHTML='<h2 id="recording-consent-title">让小语听你说</h2><p>录音会发送至 MiniMax 转成文字，再交给小语回应。每次最多60秒，说完停顿会自动发送；点“取消”则不发送。</p><p>麦克风只在你点“说一说”后开启。请和家长或老师一起了解这项说明。</p><div class="card-controls"><button type="button" data-recording-cancel>先不说</button><button type="button" data-recording-allow>开始说话</button></div>';
   let done=false;const finish=allowed=>{if(done)return;done=true;consentCancel=null;if(allowed)sessionStorage.setItem('xinyu-recording-consent-v1','1');dialog.close();dialog.remove();resolve(allowed);};
   dialog.querySelector('[data-recording-allow]').onclick=()=>finish(true);dialog.querySelector('[data-recording-cancel]').onclick=()=>finish(false);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});consentCancel=()=>finish(false);document.body.append(dialog);dialog.showModal();
  });
 }
 function wav(){const length=Math.min(960000,Math.floor(samples*16000/rate)),output=new ArrayBuffer(44+length*2),view=new DataView(output);let pos=0;const text=t=>{for(const c of t)view.setUint8(pos++,c.charCodeAt(0));};text('RIFF');view.setUint32(4,output.byteLength-8,true);pos=8;text('WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);pos=36;text('data');view.setUint32(40,length*2,true);const input=new Float32Array(samples);let offset=0;for(const chunk of chunks){input.set(chunk,offset);offset+=chunk.length;}const ratio=rate/16000;for(let i=0;i<length;i++){let sum=0,count=0;for(let j=Math.floor(i*ratio);j<Math.min(samples,Math.floor((i+1)*ratio));j++){sum+=input[j];count++;}const value=Math.max(-1,Math.min(1,sum/Math.max(1,count)));view.setInt16(44+i*2,value<0?value*32768:value*32767,true);}return output;}
 async function finish(){
  if(phase!=='recording')return;const token=generation;release();
  if(samples/rate<.35||peak<.0003){chunks=[];samples=0;setPhase('idle','还没有收到清楚的声音。检查麦克风后，再点“说一说”。');return;}
  const audio=wav();chunks=[];samples=0;setPhase('transcribing','听到啦，正在听懂你的话…');const requestController=new AbortController();controller=requestController;const timeout=setTimeout(()=>requestController.abort(),45000);
  try{
   const response=await fetch('/api/speech/transcribe',{method:'POST',headers:{'Content-Type':'audio/wav','X-Xinyu-Recording-Consent':'1'},body:audio,signal:requestController.signal});
   let result;try{result=await response.json();}catch{throw Error('语音服务暂时没连上，请再试一次。');}
   if(token!==generation)return;if(!response.ok)throw Error(result.error||'这次没有听清楚，可以再试一次。');
   const text=typeof result.text==='string'?result.text.trim():'';if(!text)throw Error('这次没有听清楚，可以再说一次。');
   if(typeof window.SandplayCompanion?.respond!=='function')throw Error('小语还没准备好，请刷新页面后再试。');
   setPhase('idle','听到啦：'+text);window.SandplayCompanion.respond(text);
  }catch(error){if(token===generation)setPhase('idle',error.name==='AbortError'?'转文字超时，可以重新说一次。':error.message);}
  finally{clearTimeout(timeout);if(controller===requestController)controller=null;}
 }
 async function start(){
  if(!navigator.mediaDevices?.getUserMedia||!window.AudioContext&&!window.webkitAudioContext){setPhase('idle','当前浏览器不支持麦克风录音，请用Chrome或Edge打开，也可以打字。');return;}
  const token=++generation;setPhase('permission','正在准备麦克风…');
  // Stop Xiaoyu immediately so her own voice is not captured as the child's reply.
  window.dispatchEvent(new CustomEvent('sandplay:voice-input-start'));
  try{
   const allowed=await ensureRecordingConsent();if(token!==generation)return;if(!allowed){cancel('已取消，可以继续打字告诉小语。');return;}
   const readyResponse=await fetch('/api/speech/status'),capability=await readyResponse.json();if(token!==generation)return;
   if(!capability.ready){setPhase('idle','语音输入还没有配置好，可以先打字告诉小语。');return;}
   const AudioContext=window.AudioContext||window.webkitAudioContext;context=new AudioContext();await context.resume();if(token!==generation)return;
   const acquired=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});if(token!==generation){acquired.getTracks().forEach(track=>track.stop());return;}
   stream=acquired;rate=context.sampleRate;chunks=[];samples=0;peak=0;heard=false;voicedSamples=0;started=performance.now();lastVoice=started;
   source=context.createMediaStreamSource(stream);processor=context.createScriptProcessor(4096,1,1);gain=context.createGain();gain.gain.value=0;source.connect(processor);processor.connect(gain);gain.connect(context.destination);
   processor.onaudioprocess=event=>{
    if(phase!=='recording')return;const data=new Float32Array(event.inputBuffer.getChannelData(0));chunks.push(data);samples+=data.length;
    let sum=0;for(const n of data){peak=Math.max(peak,Math.abs(n));sum+=n*n;}const rms=Math.sqrt(sum/data.length);meter.value=Math.min(1,rms*12);
    if(rms>.006){voicedSamples+=data.length;if(voicedSamples/rate>.12)heard=true;lastVoice=performance.now();}
    if(samples/rate>=60)void finish();
   };
   stream.getAudioTracks()[0].addEventListener('ended',()=>{if(token===generation&&phase==='recording')cancel('麦克风已断开，录音没有发送。');},{once:true});
   setPhase('recording','正在听，慢慢说。说完停顿一下，我会自动回应。');
   timer=setInterval(()=>{
    if(phase!=='recording')return;const now=performance.now(),seconds=Math.floor((now-started)/1000);
    if(heard&&now-lastVoice>=1700){void finish();return;}
    if(!heard&&seconds>=12){cancel('还没有听到声音。看看麦克风是否静音，再点“说一说”。');return;}
    status.textContent=heard?'正在听 · '+seconds+'秒，说完停顿会自动发送。':'正在听 · '+seconds+'秒，请对着麦克风说话。';
    if(seconds>=60)void finish();
   },250);
  }catch(error){if(token!==generation)return;release();chunks=[];setPhase('idle',error.name==='NotAllowedError'?'麦克风权限未获允许，请在地址栏的网站权限中允许麦克风。':error.name==='NotFoundError'?'没有找到麦克风，可以先打字告诉小语。':error.name==='NotReadableError'?'麦克风被占用，请关闭占用它的程序后重试。':'麦克风未能启动，请检查设备后再试。');}
 }
 button.addEventListener('click',()=>{if(phase==='recording')void finish();else if(phase==='permission')cancel();else if(phase==='idle')void start();});cancelButton.onclick=()=>cancel();
 window.XinyuVoiceInput={active,cancel};window.addEventListener('pagehide',()=>cancel('录音已停止。'));document.addEventListener('visibilitychange',()=>{if(document.hidden&&active())cancel('已停止录音，没有发送未完成的内容。');});document.querySelector('#close-xiaoyu-speech').addEventListener('click',()=>{if(active())cancel();});
})();
