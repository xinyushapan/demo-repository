// MiniMax TTS: credentials and voice settings are server-only.
const common={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...common,'Content-Type':'application/json; charset=utf-8'}});
const limits=new Map();let inflight=0;
function allow(key,max,windowMs){const now=Date.now();let item=limits.get(key);if(!item||now>=item.until)item={count:0,until:now+windowMs};if(item.count>=max)return false;item.count++;limits.set(key,item);if(limits.size>2500)for(const[k,v]of limits)if(v.until<now)limits.delete(k);return true;}
const ready=env=>!!env.MINIMAX_API_KEY&&env.XINYU_SPEECH_ENABLED==='1';
export async function handleSpeech(request:Request,env){
 const path=new URL(request.url).pathname.replace(/\/$/,'');
 if(path==='/api/speech/status'&&request.method==='GET')return json({ready:ready(env),provider:ready(env)?'minimax':null});
 if(path!=='/api/speech/synthesize')return json({error:'接口不存在'},404);
 if(request.method!=='POST')return json({error:'只支持POST请求'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'请求来源不正确'},403);
 if(!ready(env))return json({error:'自然语音尚未配置，请先看小语的文字。'},503);
 if(Number(request.headers.get('content-length')||0)>6000)return json({error:'语音内容过长'},413);
 let body;try{const raw=await request.text();if(raw.length>6000)return json({error:'语音内容过长'},413);body=JSON.parse(raw);}catch{return json({error:'请求内容不正确'},400);}
 if(body?.consent!==true)return json({error:'请先了解语音合成的数据处理说明'},400);
 const text=typeof body.text==='string'?body.text.trim():'';
 if(!text||text.length>400)return json({error:'每次朗读1至400字'},400);
 const ip=request.headers.get('oai-authenticated-user-id')||request.headers.get('cf-connecting-ip')||'anonymous';
 if(!allow('minute:'+ip,8,60000)||!allow('hour:'+ip,Number(env.SPEECH_USER_HOURLY_LIMIT)||80,3600000)||!allow('global',Number(env.SPEECH_GLOBAL_HOURLY_LIMIT)||240,3600000)||inflight>=3)return json({error:'说得有点多啦，稍后再听小语说。'},429);
 inflight++;
 try{
  const endpoint=env.MINIMAX_REGION==='global'?'https://api.minimax.io/v1/t2a_v2':'https://api.minimaxi.com/v1/t2a_v2';
  const model=['speech-2.8-hd','speech-2.8-turbo','speech-2.6-hd','speech-2.6-turbo'].includes(env.MINIMAX_SPEECH_MODEL)?env.MINIMAX_SPEECH_MODEL:'speech-2.8-hd';
  const serious=/危险|受伤|害怕|难过|伤心|不安全|不想说|先不说|不想聊|担心|想死|自杀|伤害自己|打我/.test(text);
  const spoken=text.replace(/<[^>]*>|\([^)]*\)/g,'').replace(/([。！？])\s*(?=\S)/g,'$1<#0.18#>');
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+env.MINIMAX_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,text:spoken,stream:false,output_format:'hex',language_boost:'Chinese',voice_setting:{voice_id:env.MINIMAX_VOICE_ID||'Chinese (Mandarin)_Warm_Girl',speed:.98,vol:1,pitch:0,emotion:serious?'calm':'fluent'},audio_setting:{sample_rate:32000,bitrate:128000,format:'mp3',channel:1}}),signal:AbortSignal.timeout(30000)});
  if(!response.ok)return json({error:response.status===401?'自然语音密钥不可用，请联系维护者。':response.status===402?'自然语音额度不足，请联系维护者。':'这次语音暂时没准备好，可以稍后再听。'},502);
  if(Number(response.headers.get('content-length')||0)>8000000)return json({error:'语音结果过大'},502);
  const data=await response.json();if(data.base_resp?.status_code===1008)return json({error:'MiniMax语音额度不足，请联系维护者补充额度，文字陪伴仍可用。'},502);if(data.base_resp?.status_code!==0)return json({error:'语音服务暂不可用，请联系维护者核对密钥、额度和音色。'},502);
  const hex=data.data?.audio;if(typeof hex!=='string'||hex.length<6||hex.length>8000000||hex.length%2||!/^[0-9a-f]+$/i.test(hex))return json({error:'语音服务未返回有效音频'},502);
  const bytes=Uint8Array.from(hex.match(/../g),v=>parseInt(v,16));
  if(!(bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33)&&!(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0))return json({error:'语音格式不正确'},502);
  return new Response(bytes,{headers:{...common,'Content-Type':'audio/mpeg','X-Xinyu-Speech-Provider':'minimax'}});
 }catch(error){return json({error:error.name==='TimeoutError'?'这次声音准备得有点久，稍后再听吧。':'自然语音暂时不可用，请先看文字。'},502);}finally{inflight--;}
}
