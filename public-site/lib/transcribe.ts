// Bounded voice input; recordings are forwarded only after explicit consent.
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
let inflight=0;const limits=new Map();
function allow(key,max,ms){const now=Date.now();let entry=limits.get(key);if(!entry||now>=entry.until)entry={count:0,until:now+ms};if(entry.count>=max)return false;entry.count++;limits.set(key,entry);if(limits.size>2500)for(const[k,v]of limits)if(v.until<now)limits.delete(k);return true;}
export async function handleTranscribe(request:Request,env){
 if(request.method!=='POST')return json({error:'只支持POST请求'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'请求来源不正确'},403);
 if(!env.MINIMAX_API_KEY||env.XINYU_SPEECH_ENABLED!=='1')return json({error:'语音输入暂不可用，可以先打字告诉小语。'},503);
 if(request.headers.get('x-xinyu-recording-consent')!=='1')return json({error:'请先了解录音转文字的说明'},400);
 if(!request.headers.get('content-type')?.startsWith('audio/wav'))return json({error:'录音格式不正确'},415);
 const maximum=44+16000*2*60;
 if(Number(request.headers.get('content-length')||0)>maximum)return json({error:'一次最多说60秒'},413);
 const reader=request.body?.getReader();if(!reader)return json({error:'没有收到录音'},400);const parts=[];let size=0;try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>maximum){await reader.cancel();return json({error:'一次最多说60秒'},413);}parts.push(part.value);}}catch{return json({error:'录音未完整传送，请再试一次。'},400);}const joined=new Uint8Array(size);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.byteLength;}const buffer=joined.buffer;if(buffer.byteLength<44+16000*2*.3)return json({error:'请说半秒到60秒，再结束发送。'},400);
 const bytes=new Uint8Array(buffer),view=new DataView(buffer),tag=(offset,n)=>String.fromCharCode(...bytes.slice(offset,offset+n));
 if(tag(0,4)!=='RIFF'||tag(8,4)!=='WAVE'||tag(12,4)!=='fmt '||tag(36,4)!=='data'||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==16000||view.getUint16(34,true)!==16||view.getUint32(40,true)!==buffer.byteLength-44||view.getUint32(4,true)!==buffer.byteLength-8)return json({error:'录音格式不正确，请重新说一次。'},400);
 const ip=request.headers.get('oai-authenticated-user-id')||request.headers.get('cf-connecting-ip')||'anonymous';
 if(!allow('minute:'+ip,5,60000)||!allow('hour:'+ip,40,3600000)||!allow('global',120,3600000)||inflight>=2)return json({error:'稍等一下，再说给小语听吧。'},429);
 inflight++;
 try{
  const form=new FormData();form.append('model','asr-1.0');form.append('file',new Blob([buffer],{type:'audio/wav'}),'voice.wav');form.append('response_format','json');form.append('stream','false');
  const endpoint=env.MINIMAX_REGION==='global'?'https://api.minimax.io/v1/speech_to_text':'https://api.minimax.cn/v1/speech_to_text';
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+env.MINIMAX_API_KEY,language:'zh'},body:form,signal:AbortSignal.timeout(40000)});
  if(!response.ok)return json({error:response.status===401?'语音服务认证失败，请联系维护者。':'这次语音没转成文字，可以再试一次或先打字。'},502);
  const result=await response.json();if(result.base_resp?.status_code===1008)return json({error:'语音额度不足，可以先打字告诉小语。'},502);
  if(result.base_resp?.status_code&&result.base_resp.status_code!==0)return json({error:'语音服务暂不可用，可以先打字。'},502);
  const text=typeof result.text==='string'?result.text.trim().slice(0,800):'';if(!text)return json({error:'这次没有听清，可以再说一次。'},422);
  return json({text,provider:'minimax'});
 }catch(error){return json({error:error.name==='TimeoutError'?'转文字有点慢，可以再试一次。':'语音输入暂时没连上，可以重试或打字。'},502);}finally{inflight--;}
}
