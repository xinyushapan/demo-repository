(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const line = $('#companion-line'), question = $('#companion-question');
  const state = $('#recognition-state'), voiceButton = $('#voice-toggle');
  const bubble=$('#xiaoyu-speech'), mascot=document.querySelector('.mascot-friends');
  let bubbleTimer=null, isTalking=false, isListening=false;
  const voiceInput = $('#voice-input'), voiceStatus = $('#voice-status'), messageInput = null;
  let corpus = null, voiceEnabled = true, detectorTimer = null, detectorBusy = false, lastAnnouncement = -Infinity, currentItem = null, moodResetTimer = null;
  const stable = new Map(), spoken = new Set();
  let cameraGeneration=0, cameraRunning=false, activeStream=null;

  async function loadCorpus() {
    try {
      const response = await fetch('/static/core/corpus/sandplay-corpus.json', {cache:'no-cache'});
      if (!response.ok) throw new Error('语料文件无法读取');
      corpus = await response.json();
      return corpus;
    } catch {
      state.textContent = '语料库暂不可用'; state.classList.add('error');
      return null;
    }
  }
  const allItems = () => (corpus?.categories || []).flatMap(category => category.items || []);
  const findItem = id => allItems().find(item => item.id === id);
  const speech=window.XiaoyuSpeech.create({onStart:()=>{isTalking=true;setMascotMood('speaking');},onPause:()=>{isTalking=false;setMascotMood('happy');},onEnd:()=>{isTalking=false;setMascotMood('happy');},onError:error=>{isTalking=false;setMascotMood('idle');if(error?.name==='NotAllowedError'){voiceEnabled=false;voiceButton.setAttribute('aria-pressed','false');voiceButton.textContent='▶ 听小语说';}}});
  function speak(text){if(voiceEnabled&&!window.XinyuVoiceInput?.active())speech.speak(text);}
  function showBubble(){bubble.hidden=false;clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>{if(mascot.dataset.speaking!=='true'&&!isListening)bubble.hidden=true;},14000);}
  function setMascotMood(mood){
    clearTimeout(moodResetTimer);
    const expression=isListening?'listening':isTalking?'speaking':mood;
    mascot.dataset.mood=expression;mascot.dataset.speaking=String(isTalking);
    if(isTalking){showBubble();clearTimeout(bubbleTimer);}else if(!bubble.hidden)showBubble();
    if(['happy','curious','surprised'].includes(expression))moodResetTimer=setTimeout(()=>{if(!isTalking&&!isListening)mascot.dataset.mood='idle';},1800);
  }
  function showGreeting() {
    if (!corpus) return;
    line.textContent = corpus.voice.self_introduction;
    question.textContent = '想先放哪个小摆件？';
    voiceButton.setAttribute('aria-pressed','true');voiceButton.textContent='◼ 关闭语音';showBubble();speak(`${line.textContent} ${question.textContent}`);
  }
  function resultMessage(item, confidence, uncertain = false) {
    if (uncertain) return `我可能看错了，这个像是${item.name}吗？你也可以告诉我它叫什么。`;
    const templates = corpus?.shared_dialogue_templates?.stable_detection || [];
    const template = templates[spoken.size % Math.max(1, templates.length)] || '我看见了{name}。';
    return template.replaceAll('{objects}', item.name).replaceAll('{name}', item.name);
  }
  function accept(detection, origin = 'camera') {
    const item = findItem(detection.label_id);
    if (!item || (origin !== 'simulation' && !Number.isFinite(Number(detection.confidence)))) return;
    if (origin === 'simulation') {
      currentItem = item;
      line.textContent = `${item.name}来啦。`;
      question.textContent = item.prompt;
      setMascotMood('curious'); speak(`${item.name}。${item.prompt}`); return;
    }
    const key = String(detection.track_id ?? detection.label_id);
    if (spoken.has(key)) return;
    if (performance.now() - lastAnnouncement < 6500) return;
    const confidence = Number(detection.confidence);
    if (confidence < (corpus?.recognition_policy?.clarification_confidence ?? .55)) {
      line.textContent = '小语还没有看清楚这个摆件。';
      question.textContent = '没关系，你愿意告诉我它叫什么吗？';
      spoken.add(key); lastAnnouncement = performance.now(); setMascotMood('curious'); speak(`${line.textContent} ${question.textContent}`); return;
    }
    currentItem = item;
    const uncertain = confidence < (corpus?.recognition_policy?.high_confidence ?? .82);
    line.textContent = origin === 'camera' ? `画面里这个像是${item.name}，我认得对吗？` : resultMessage(item, confidence, uncertain);
    question.textContent = uncertain ? '谢谢你帮小语确认。' : item.prompt;
    spoken.add(key); lastAnnouncement = performance.now(); setMascotMood(uncertain ? 'curious' : 'surprised'); speak(`${line.textContent} ${question.textContent}`);
  }
  function respondToChild(rawText, localOnly=false) {
    if(!localOnly&&window.XinyuAI?.answerIfEnabled(rawText))return;
    const childText = String(rawText || '').trim().slice(0, 240);
    if (!childText || !corpus) return;
    const lower = childText.toLowerCase();
    const silence = corpus.shared_dialogue_templates?.silence || ['没关系，你可以慢慢想。'];
    const saidNo = /不想说|不知道|不想回答|不想聊/.test(lower);
    const urgent = /救命|危险|受伤|不安全|打我|有人要伤害|想死|自杀|伤害自己/.test(lower);
    const thanks = saidNo ? silence[Math.floor(Math.random() * silence.length)] : '嗯，我在听。';
    line.textContent = urgent ? '你现在安全吗？' : thanks;
    question.textContent = urgent ? '如果你眼前有人受伤或正有危险，请马上去找你信任的大人陪着你。' : '';

    window.XinyuAI?.recordLocal(`${line.textContent} ${question.textContent}`);
    setMascotMood('happy');
    speak(`${line.textContent} ${question.textContent}`);
  }
  function consume(results) {
    if(!cameraRunning||!corpus||document.hidden)return;
    state.textContent=results.length?'摄像头匹配 · 语料已连接':'语料已连接 · 等待匹配';state.classList.remove('error');
    const heard=new Set();
    for(const detection of results){
      if(!findItem(detection.label_id)||!Number.isFinite(detection.confidence))continue;
      const key=String(detection.track_id),previous=stable.get(key);heard.add(key);
      const count=previous?.label_id===detection.label_id?previous.count+1:1;
      stable.set(key,{label_id:detection.label_id,count,detection});
      if(count>=(corpus.recognition_policy?.temporal_stability_frames??3))accept(detection);
    }
    for(const key of stable.keys())if(!heard.has(key))stable.delete(key);
  }
  async function start(video) {
    if(cameraRunning&&activeStream===video.srcObject)return;
    stop();cameraRunning=true;activeStream=video.srcObject;const generation=cameraGeneration;lastAnnouncement=-Infinity;
    state.textContent='正在连接小语语料…';
    await corpusReady;if(generation!==cameraGeneration)return;
    state.textContent=corpus?'语料已连接 · 等待匹配':'语料加载失败，请刷新';state.classList.toggle('error',!corpus);
    if(corpus){line.textContent='准备好啦，一起搭个小世界吧！';question.textContent='';showBubble();speak(line.textContent);}
  }
  function stop() {
    cameraGeneration++;cameraRunning=false;activeStream=null;stable.clear();spoken.clear();
    speech.stop();
    state.textContent=corpus?'识别已暂停 · 语料就绪':'正在加载语料';state.classList.remove('ready');clearTimeout(bubbleTimer);if(!bubble.hidden)showBubble();mascot.dataset.speaking='false';clearTimeout(moodResetTimer);mascot.dataset.mood='idle';
  }
  function confirm(detection) {
    const item=findItem(detection.label_id);if(!item||!$('#camera').srcObject)return;
    currentItem=item;spoken.add(String(detection.track_id??detection.label_id));lastAnnouncement=performance.now();line.textContent=`谢谢你确认，这是${item.name}。`;question.textContent=item.prompt;
    setMascotMood('curious');speak(item.prompt);
  }

  window.addEventListener('sandplay:voice-input-state',event=>{isListening=event.detail.active;setMascotMood(isListening?'listening':'idle');if(isListening){showBubble();clearTimeout(bubbleTimer);}});

  voiceButton.addEventListener('click', () => {
    if (!window.Audio) {
      line.textContent = '这台设备暂不支持网页语音，我们可以继续用文字慢慢聊。'; return;
    }
    voiceEnabled = !voiceEnabled;
    voiceButton.setAttribute('aria-pressed', String(voiceEnabled));
    voiceButton.textContent = voiceEnabled ? '◼ 关闭语音' : '▶ 听小语说';
    if (voiceEnabled) speak(`${line.textContent} ${question.textContent}`);
    else{speech.stop();setMascotMood('idle');}
  });
  const map=window.SANDPLAY_CORPUS_MAP;
  window.addEventListener('sandplay:appearance-mode',event=>{if(event.detail.active)void start($('#camera'));else if(!$('#camera').srcObject?.active)stop();});
  window.addEventListener('sandplay:objects',event=>{
    const seen=new Set(event.detail.observedIds||[]);
    consume(event.detail.items.filter(item=>seen.has(item.id)).map(item=>({label_id:map[item.type],track_id:item.id,confidence:item.score})));
  });
  window.addEventListener('sandplay:correct-object',event=>confirm({label_id:map[event.detail.type],track_id:event.detail.id}));
  $('#camera').addEventListener('playing',()=>{if($('#toggle-appearance').getAttribute('aria-pressed')==='true')void start($('#camera'));});
  window.addEventListener('pagehide',stop);
  mascot.onclick=()=>{
    if(!cameraRunning){line.textContent=document.body.classList.contains('online-mode')?'我是小语，陪你一起搭个小世界。':'我是小语。连接摄像头后，我会陪你一起搭建。';question.textContent='';}
    showBubble();
    if(!voiceEnabled)voiceButton.click();else speak(`${line.textContent} ${question.textContent}`);
  };
  mascot.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();mascot.click();}};
  $('#close-xiaoyu-speech').onclick=()=>{bubble.hidden=true;clearTimeout(bubbleTimer);speech.stop();mascot.dataset.speaking='false';clearTimeout(moodResetTimer);mascot.dataset.mood='idle';};
  const observer=new MutationObserver(()=>{if(cameraRunning)showBubble();});
  observer.observe(line,{childList:true,characterData:true,subtree:true});observer.observe(question,{childList:true,characterData:true,subtree:true});
  const corpusReady=loadCorpus().then(showGreeting);
  window.SandplayCompanion = {start, stop, accept, confirm, getCorpus:() => corpus,respond:text=>respondToChild(text),respondLocal:text=>respondToChild(text,true),showReply:(message,prompt)=>{line.textContent=message;question.textContent=prompt;showBubble();setMascotMood('happy');speak(`${message} ${prompt}`);}};
})();
