/* Xiaoyu's optional age recommendation and first-use tour. */
(() => {
  'use strict';
  const home = document.body.classList.contains('home-page');
  const online = document.body.classList.contains('online-mode');
  const store = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key, value) { try { localStorage.setItem(key, value); } catch {} } };
  const art = '/static/core/images/guide-';
  const dialog = document.createElement('dialog');
  dialog.className = 'xy-guide';
  dialog.setAttribute('aria-labelledby', 'xy-title');
  document.body.append(dialog);
  let returnFocus, index = 0, audio, controller, audioURL, generation = 0, voice = false, voiceApproved = false, resumeScene;
  function clearResume() { if (resumeScene) document.querySelector('#scene-list')?.removeEventListener('click', resumeScene); resumeScene = null; }
  function stopVoice() { generation++; controller?.abort(); audio?.pause(); audio = null; if (audioURL) URL.revokeObjectURL(audioURL); audioURL = null; }
  function close() { stopVoice(); dialog.close(); document.querySelector('.xy-spotlight')?.remove(); returnFocus?.focus(); }
  function open() { returnFocus = document.activeElement; if (!dialog.open) dialog.showModal(); }
  const voiceControls = '<div class="xy-voice"><button type="button" data-action="voice" aria-label="听小语说">♫ 听小语说</button><button type="button" data-action="mute" hidden>静音</button><span class="xy-voice-status" role="status"></span></div><div class="xy-voice-consent" hidden><p>开启 AI 语音？只将这段引导文字交给 MiniMax 配音。</p><button type="button" data-action="voice-confirm">开启语音</button><button type="button" data-action="voice-cancel">先看文字</button></div>';
  function frame(pose, content, options = '') {
    dialog.innerHTML = `<button class="xy-close" type="button" data-action="close" aria-label="关闭引导">×</button><img class="xy-guide-art" src="${art}${pose}.webp" alt="小语陪你一起探索"><div class="xy-guide-content"><div class="xy-bubble">${content}</div>${options}</div>`;
  }
  async function speak() {
    stopVoice();
    if (!voice) return;
    const token = generation;
    const status = dialog.querySelector('.xy-voice-status');
    const text = [...dialog.querySelectorAll('#xy-title,.xy-copy')].map(el => el.textContent).join(' ');
    status.textContent = '小语在准备声音啦…';
    const activeController = new AbortController(); controller = activeController;
    const timeout = setTimeout(() => activeController.abort(), 35000);
    try {
      const response = await fetch('/api/speech/synthesize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, consent: true }), signal: activeController.signal });
      if (!response.ok) throw Error('语音暂时不可用，先看看文字吧～');
      const blob = await response.blob();
      if (token !== generation) return;
      audioURL = URL.createObjectURL(blob); audio = new Audio(audioURL); await audio.play();
      status.textContent = '小语正在说话 · AI 合成';
      audio.onended = () => { if (token === generation) status.textContent = '听完啦，再点一次可以重听'; };
    } catch { if (token === generation) status.textContent = '语音暂时不可用，先看看文字吧～'; }
    finally { clearTimeout(timeout); }
  }
  function agePicker() {
    dialog.classList.remove('xy-tour', 'xy-tour-positioned'); dialog.removeAttribute('style');
    frame('welcome', '<h2 id="xy-title">嗨！我是小语～<br>你今年几岁啦？</h2><p class="xy-copy">选一选，让我帮你找个好玩的地方！</p>', '<div class="xy-age-options" aria-label="选择年龄"><button data-age="6">6岁及以下<span>小小探索家</span></button><button data-age="9">7–9岁<span>好奇冒险家</span></button><button data-age="12">10–12岁<span>创意设计师</span></button><button data-age="13">13岁及以上<span>自由创造家</span></button></div><button class="xy-self-select" data-action="no-age">我想自己选玩法 →</button>');
    open();
  }
  function modePicker(age) {
    stopVoice(); dialog.classList.remove('xy-tour', 'xy-tour-positioned'); dialog.removeAttribute('style');
    const recommended = age ? age <= 6 ? 'physical' : 'online' : null;
    frame('teacher', `<h2 id="xy-title">${recommended ? '小语帮你选好啦！' : '今天想怎么玩呢？'}</h2><p class="xy-copy">${recommended === 'physical' ? '小手摆一摆，故事就来啦！<br>我们先试试实体沙盘吧～' : recommended === 'online' ? '把想象放进屏幕里！<br>一起去线上沙盘探险吧～' : '桌上搭一搭，屏幕里摆一摆。<br>喜欢哪种，就选哪种！'}</p>`, `<div class="xy-mode-grid">${['physical', 'online'].map(mode => `<button class="xy-mode ${recommended === mode ? 'is-recommended' : ''}" data-mode="${mode}">${recommended === mode ? '<span class="xy-tag">小语推荐 ✦</span>' : ''}<strong>${mode === 'physical' ? '▣ 实体沙盘' : '✦ 线上沙盘'}</strong><span>${mode === 'physical' ? '小手摆放 · 摄像头陪伴' : '点击拖动 · 不用摄像头'}</span><b>选这个，出发 →</b></button>`).join('')}</div><button class="xy-self-select" data-action="age">← 重新选年龄</button>`);
    open();
  }
  const steps = [
    ...(!online ? [{ target: '#connect-camera', title: '小镜头，准备好了吗？', text: '请大人帮忙连接摄像头，让镜头只看沙盘。读完说明，也能选“仅本机预览”哦！', pose: 'teacher' }] : []),
    { target: '#scene-heading, #change-scene', title: '故事住在哪里呢？', text: '森林、海洋，还是星空？挑个喜欢的场景吧，随时都能换一个～', pose: 'welcome', scene: true },
    { target: online ? '.online-library-tools' : '.simulation-title', title: '打开沙具小口袋！', text: online ? '挑一件喜欢的小摆件，点一下或拖进沙盘。换个分类，还能发现新朋友！' : '暂停摄像头识别后，也能在这里挑小摆件，手动搭一搭～', pose: 'point' },
    { target: '#world-canvas', title: '让想象动起来～', text: '点中小摆件，拖一拖换位置。选中后可以用方向键微调，也可以点“移除”拿走哦！', pose: 'teacher' },
    { target: '.mascot-friends', title: '小语在这里呀！', text: '点点粉色的小语，聊聊你的故事吧！可以打字，也能了解说明后点“说一说”。', pose: 'happy' },
    { target: '#save-world', title: '把小世界收好啦！', text: '点“保存”，作品就留在这个浏览器里。回到首页，点“查看我的记录”就能找到～', pose: 'point' },
    { target: '#finish-session', title: '给故事一个大拥抱！', text: '搭好啦？点“完成并回顾”一起看看吧！AI回顾会先征求同意，也能只保留本机记录。', pose: 'happy' }
  ];
  function visibleTarget(step) { return [...document.querySelectorAll(step.target)].find(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden') || null; }
  function position() {
    const spot = document.querySelector('.xy-spotlight'); if (!spot || !dialog.open) return;
    const el = visibleTarget(steps[index]);
    const raw = el ? el.getBoundingClientRect() : { left: innerWidth / 2 - 40, top: innerHeight / 2, width: 80, height: 20 };
    const clamp = (value, min, max) => Math.max(min, Math.min(Math.max(min, max), value));
    // Highlight a readable part of a large canvas rather than outlining the whole viewport.
    const canvasStep = steps[index].target === '#world-canvas';
    const rw = Math.min(raw.width, innerWidth - 32, canvasStep ? 240 : 430), rh = Math.min(raw.height, canvasStep ? 64 : 150);
    const r = { left: clamp(raw.left + (raw.width - rw) / 2, 16, innerWidth - rw - 16), top: clamp(raw.top + (canvasStep ? raw.height - rh : (raw.height - rh) / 2), 72, innerHeight - rh - 60), width: rw, height: rh };
    r.right = r.left + rw; r.bottom = r.top + rh;
    spot.hidden = !el;
    Object.assign(spot.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${rw + 12}px`, height: `${rh + 12}px` });
    const content = dialog.querySelector('.xy-guide-content');
    const bubble = dialog.querySelector('.xy-bubble');
    const character = dialog.querySelector('.xy-guide-art');
    const charWidth = clamp(innerWidth * .38, 145, 300);
    const bubbleWidth = Math.min(330, innerWidth - charWidth - 30);
    content.style.width = `${bubbleWidth}px`; character.style.width = `${charWidth}px`;
    const bh = bubble.getBoundingClientRect().height, ch = character.getBoundingClientRect().height || charWidth;
    const width = bubbleWidth + charWidth - 8, height = Math.max(bh, ch);
    const gap = 25;
    const candidates = [
      { x: r.left + rw / 2 - width / 2, y: r.top - height - gap, side: 'above' },
      { x: r.left + rw / 2 - width / 2, y: r.bottom + gap, side: 'below' },
      { x: r.right + gap, y: r.top + rh / 2 - height / 2, side: 'right' },
      { x: r.left - width - gap, y: r.top + rh / 2 - height / 2, side: 'left' }
    ].map(p => {
      const x = clamp(p.x, 14, innerWidth - width - 14), y = clamp(p.y, 14, innerHeight - height - 22);
      const overlap = Math.max(0, Math.min(x + width, r.right + 10) - Math.max(x, r.left - 10)) * Math.max(0, Math.min(y + height, r.bottom + 10) - Math.max(y, r.top - 10));
      return { ...p, x, y, score: overlap * 100 + Math.abs(x - p.x) + Math.abs(y - p.y) };
    }).sort((a, b) => a.score - b.score);
    const best = candidates[0];
    content.style.left = `${best.x + charWidth - 8}px`; content.style.top = `${best.y + (height - bh) / 2}px`;
    character.style.left = `${best.x}px`; character.style.top = `${best.y + (height - ch) / 2}px`;
    const exit = dialog.querySelector('.xy-close');
    const nearExit = best.y + (height - bh) / 2 < 64;
    exit.style.left = nearExit ? '18px' : 'auto'; exit.style.right = nearExit ? 'auto' : '20px';
    const arrow = dialog.querySelector('.xy-arrow');
    arrow.textContent = { above: '↓', below: '↑', left: '→', right: '←' }[best.side];
    Object.assign(arrow.style, { left: `${best.side === 'left' ? r.left - 29 : best.side === 'right' ? r.right + 3 : r.left + rw / 2 - 13}px`, top: `${best.side === 'above' ? r.top - 34 : best.side === 'below' ? r.bottom + 1 : r.top + rh / 2 - 18}px` });
  }
  function tour() {
    clearResume();
    stopVoice();
    const step = steps[index];
    const target = visibleTarget(step);
    target?.scrollIntoView({ block: 'center', behavior: 'instant' });
    frame(step.pose, `<span class="xy-arrow" aria-hidden="true">↗</span><h2 id="xy-title">${step.title}</h2><p class="xy-copy">${step.text}</p>${voiceControls}<div class="xy-tour-actions"><button data-action="prev" ${index === 0 ? 'disabled' : ''} aria-label="上一步">←</button><span class="xy-progress">${index + 1} / ${steps.length}</span><button data-action="skip">跳过</button><button class="xy-primary" data-action="next">${index === steps.length - 1 ? '出发！' : step.scene && document.querySelector('#digital-view').hidden ? '去选场景 →' : '下一步 →'}</button></div>`);
    dialog.classList.add('xy-tour'); open();
    if (!document.querySelector('.xy-spotlight')) { const spot = document.createElement('div'); spot.className = 'xy-spotlight'; dialog.append(spot); }
    position(); dialog.querySelector('.xy-guide-art').onload = position;
    dialog.querySelector('[data-action=voice]').textContent = voice ? '♫ 重听这一段' : '♫ 听小语说';
    dialog.querySelector('[data-action=mute]').hidden = !voice;
    if (voice) void speak();
  }
  function complete() { store.set(`xy-tour-${online ? 'online' : 'physical'}-v1`, 'done'); close(); }
  dialog.addEventListener('click', event => {
    if (dialog.classList.contains('xy-tour') && (event.target === dialog || event.target.classList.contains('xy-blank-hint') || event.target.classList.contains('xy-guide-art'))) { dialog.querySelector('[data-action=next]').click(); return; }
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.age) { modePicker(Number(button.dataset.age)); return; }
    if (button.dataset.mode) { store.set('xy-mode', button.dataset.mode); location.href = `${button.dataset.mode === 'online' ? '/sandbox/' : '/build/'}?tour=1`; return; }
    switch (button.dataset.action) {
      case 'close': close(); break;
      case 'no-age': modePicker(null); break;
      case 'age': agePicker(); break;
      case 'voice':
        if (!voiceApproved) { dialog.querySelector('.xy-voice-consent').hidden = false; position(); break; }
        voice = true; dialog.querySelector('[data-action=mute]').hidden = false; void speak(); break;
      case 'voice-confirm': voiceApproved = true; voice = true; dialog.querySelector('.xy-voice-consent').hidden = true; dialog.querySelector('[data-action=mute]').hidden = false; position(); void speak(); break;
      case 'voice-cancel': dialog.querySelector('.xy-voice-consent').hidden = true; position(); break;
      case 'mute': voice = false; stopVoice(); button.hidden = true; dialog.querySelector('.xy-voice-status').textContent = '声音已关闭'; break;
      case 'skip': complete(); break;
      case 'prev': if (index > 0) { index--; tour(); } break;
      case 'next':
        if (steps[index].scene && document.querySelector('#digital-view').hidden) {
          close();
          clearResume();
          resumeScene = event => { if (event.target.closest('button')) { clearResume(); index++; requestAnimationFrame(tour); } };
          document.querySelector('#scene-list').addEventListener('click', resumeScene);
        } else if (index < steps.length - 1) { index++; tour(); } else complete();
        break;
    }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  addEventListener('resize', position); addEventListener('scroll', position, true); addEventListener('pagehide', stopVoice);
  if (home) {
    const start = document.querySelector('.cover-start');
    start.addEventListener('click', event => { event.preventDefault(); agePicker(); });
  } else {
    const toolbar = document.createElement('div'); toolbar.className = 'xy-tools';
    toolbar.innerHTML = `<button type="button" id="xy-replay">✦ 小语教程</button><button type="button" id="xy-switch">⇄ 切换玩法</button>`;
    // Keep the existing workspace's three grid rows untouched.
    document.body.append(toolbar);
    document.querySelector('#xy-replay').onclick = () => { index = 0; tour(); };
    document.querySelector('#xy-switch').onclick = () => { dialog.classList.remove('xy-tour', 'xy-tour-positioned'); modePicker(null); };
    if (!new URLSearchParams(location.search).has('record') && (new URLSearchParams(location.search).has('tour') || !store.get(`xy-tour-${online ? 'online' : 'physical'}-v1`))) tour();
  }
})();
