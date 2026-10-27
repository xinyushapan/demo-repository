/* Server-synthesized MiniMax audio; no silent browser-TTS fallback. */
(() => {
 'use strict';
 function create({onStart=()=>{},onEnd=()=>{},onError=()=>{},onPause=()=>{}}={}){
  let current=null,url=null,controller=null,generation=0,waiting='',lastText='',loading=false,capability=null;
  const label=document.querySelector('#speech-provider-status');
  const notice=text=>{if(label)label.textContent=text;};
  async function status(){try{const r=await fetch('/api/speech/status');capability=!!(await r.json()).ready;}catch{capability=false;}notice(capability?'MiniMax · AI合成声音':'自然语音待配置 · 文字陪伴可用');return capability;}
  function release(){if(current){current.onplaying=current.onpause=current.onended=current.onerror=null;current.pause();current.removeAttribute('src');current.load();current=null;}if(url){URL.revokeObjectURL(url);url=null;}}
  function stop(){generation++;controller?.abort();controller=null;release();loading=false;waiting='';lastText='';onEnd();}
  function next(){if(waiting){const text=waiting;waiting='';void begin(text);}}
  async function begin(text){
   const token=generation;loading=true;lastText=text;
   if(capability===null)await status();if(token!==generation)return;
   if(!capability){loading=false;lastText='';return;}
   if(!window.XinyuAI?.speechConsent()){loading=false;notice('语音合成会将小语的台词发送给MiniMax，连接时了解说明。');return;}
   const activeController=new AbortController();controller=activeController;const timeout=setTimeout(()=>activeController.abort(),35000);notice('小语的声音准备中…');
   try{
    const r=await fetch('/api/speech/synthesize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,consent:true}),signal:activeController.signal});
    if(!r.ok){let error;try{error=await r.json();}catch{}throw Error(error?.error||'自然语音暂时不可用，请先看文字。');}
    if(!r.headers.get('Content-Type')?.startsWith('audio/mpeg'))throw Error('这次声音没有准备好，请先看文字。');
    const blob=await r.blob();if(token!==generation)return;
    loading=false;url=URL.createObjectURL(blob);current=new Audio(url);current.volume=.8;
    current.onplaying=()=>{if(token===generation){notice('MiniMax · AI合成声音');onStart();}};
    current.onpause=()=>{if(token===generation)onPause();};
    current.onended=()=>{if(token!==generation)return;release();lastText='';onEnd();next();};
    current.onerror=()=>{if(token!==generation)return;release();lastText='';notice('声音播放失败，请先看文字。');onError();};
    await current.play();
   }catch(error){if(token!==generation)return;loading=false;release();lastText='';waiting='';notice(error.name==='NotAllowedError'?'浏览器暂未允许播放声音，点一下“听小语说”即可。':error.name==='AbortError'?'声音准备超时，请先看文字。':error.message);onError(error);}
   finally{clearTimeout(timeout);if(controller===activeController)controller=null;}
  }
  function speak(value){if(document.hidden||window.XinyuVoiceInput?.active())return;const text=String(value||'').replace(/\s+/g,' ').trim().slice(0,400);if(!text)return;if(text===lastText&&(current||loading))return;if(current||loading){waiting=text;return;}void begin(text);}
  function permissionChanged(){stop();if(window.XinyuAI?.speechConsent()&&document.querySelector('#voice-toggle')?.getAttribute('aria-pressed')==='true')speak([document.querySelector('#companion-line')?.textContent,document.querySelector('#companion-question')?.textContent].filter(Boolean).join(' '));}
  window.addEventListener('sandplay:voice-input-start',stop);window.addEventListener('sandplay:speech-consent',permissionChanged);window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  void status();return{speak,stop};
 }
 window.XiaoyuSpeech={create};
})();
