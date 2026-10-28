import { awardCandidates, chooseAward, certificateStatistics } from './award-selection.mjs';
const $ = selector => document.querySelector(selector);
const read = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
const reports = read('xinyu-reports', []);
const id = new URLSearchParams(location.search).get('id');
const report = Array.isArray(reports) ? reports.find(r => r?.id === id) : null;
const catalog = window.SANDPLAY_TOYS || [];
const status = message => { $('#feedback-status').textContent = message; };
const loadImage = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(Error('奖状图片暂时没有加载好，请重新尝试。')); image.src = src; });
let layouts, busy = false, ready = false;
function persist() { try { localStorage.setItem('xinyu-reports', JSON.stringify(reports)); return true; } catch { status('浏览器空间不足，请先保存分享图片。'); return false; } }
function random() { const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0] / 4294967296; }

async function paint() {
  const awardId = report.feedback?.award_id, layout = layouts[awardId];
  if (!layout) return false;
  const template = await loadImage('/static/core/awards/' + awardId + '.png');
  const canvas = $('#award-certificate');
  canvas.width = template.naturalWidth; canvas.height = template.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  // Never re-typeset, clip, move, or replace the supplied title, prose, characters or decorations.
  context.drawImage(template, 0, 0);
  const [x, y, width, height] = layout.photo;
  context.fillStyle = '#fff'; context.fillRect(x, y, width, height);
  if (/^data:image\/(jpeg|png);base64,/.test(report.screenshot || '')) {
    const image = await loadImage(report.screenshot);
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    context.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
  }
  const values = certificateStatistics(report, awardId, catalog);
  layout.digits.forEach(([dx, dy, dw, dh], i) => {
    // Sample the original card background just outside the digits; preserve its printed units.
    const sample = context.getImageData(dx + 2, dy - 3, 1, 1).data;
    context.fillStyle = `rgb(${sample[0]},${sample[1]},${sample[2]})`;
    context.fillRect(dx, dy, dw, dh);
    const value = values[i] === null ? '—' : String(values[i]).padStart(2, '0');
    let size = dh * .94;
    context.font = `800 ${size}px Arial, sans-serif`;
    while (context.measureText(value).width > dw - 2 && size > 18) { size--; context.font = `800 ${size}px Arial, sans-serif`; }
    context.fillStyle = ['#ff6b13', '#09b417', '#075df0'][i];
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(value, dx + dw / 2, dy + dh / 2 + 1);
  });
  canvas.dataset.ready = 'true';
  canvas.setAttribute('aria-label', `${layout.name}。本次沙盘图片。统计数字：${values.map(v => v === null ? '未记录' : v).join('、')}。`);
  $('#share-feedback').disabled = false; $('#certificate-stage').setAttribute('aria-busy', 'false');
  ready = true;
  return true;
}
function saveSelection(selection, provider) {
  report.feedback = { award_id: selection.id, evidence: selection.evidence, provider, at: new Date().toISOString() };
  persist();
}
async function localAward(message) {
  const selection = chooseAward(awardCandidates(report, catalog), random);
  if (!selection) throw Error('没有找到可用的摆放记录，请先回去搭建一个小世界。');
  saveSelection(selection, 'local'); await paint();
  status(message || '已按本机搭建记录匹配奖状；未发送给 AI。');
  $('#retry-feedback').hidden = true;
}
async function generate() {
  if (busy) return;
  busy = true; $('#retry-feedback').hidden = true;
  status('小语正在根据摆件和操作记录挑选奖状…');
  try {
    const response = await fetch('/api/ai/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scene: report.scene, pieces: report.pieces || [], events: report.events || [], history: report.history || [], selfReport: report.selfReport || '', consent: true }), signal: AbortSignal.timeout(60000) });
    const data = await response.json();
    if (!response.ok || !layouts[data.award_id]) throw Error(data.error || '这次奖状还没有挑选好。');
    const eligible = awardCandidates(report, catalog).find(a => a.id === data.award_id);
    if (!eligible) throw Error('奖项和本次搭建记录不一致。');
    report.feedback = { ...data, at: new Date().toISOString() };
    report.ai = { summary: data.summary, suggestions: data.suggestions, provider: 'deepseek', at: report.feedback.at };
    persist(); await paint(); status('小语已根据本次记录匹配并选好奖状。');
  } catch (error) {
    await localAward('AI暂时未连接，已按本机记录匹配奖状。');
  } finally { busy = false; $('#certificate-stage').setAttribute('aria-busy', 'false'); }
}
async function start() {
  let aiReady = false;
  try { const response = await fetch('/api/ai/status'); aiReady = !!(await response.json()).ready; } catch {}
  if (!aiReady) { await localAward('AI未配置，当前奖状由本机搭建记录匹配。'); return; }
  if (sessionStorage.getItem('xinyu-ai-consent') === '1' || sessionStorage.getItem('xinyu-companion-consent-v4') === 'online') { await generate(); return; }
  status('选择是否让小语用 AI 回看这次搭建。'); $('#feedback-consent').showModal();
}
$('#feedback-agree').onclick = () => { sessionStorage.setItem('xinyu-ai-consent', '1'); $('#feedback-consent').close(); void generate().catch(showError); };
$('#feedback-local').onclick = () => { $('#feedback-consent').close(); void localAward().catch(showError); };
$('#feedback-consent').addEventListener('cancel', () => { void localAward().catch(showError); });
$('#retry-feedback').onclick = () => { void start().catch(showError); };
function showError(error) { status(error.message || '奖状暂时未加载好，请重新尝试。'); $('#retry-feedback').hidden = false; $('#certificate-stage').setAttribute('aria-busy', 'false'); }
$('#share-feedback').onclick = async () => {
  if (!ready) return;
  const button = $('#share-feedback'); button.disabled = true;
  try {
    const blob = await new Promise(resolve => $('#award-certificate').toBlob(resolve, 'image/png'));
    if (!blob) throw Error('图片暂时没有保存好，请重试。');
    const name = layouts[report.feedback.award_id].name;
    const file = new File([blob], '心语沙盘-' + name + '.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name });
    else { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    status('奖状已保存，文字和版式与原设计一致。');
  } catch (error) { if (error.name !== 'AbortError') showError(error); }
  finally { button.disabled = false; }
};
async function init() {
  if (!report) { $('#feedback-missing').hidden = false; return; }
  $('#feedback-shell').hidden = false;
  $('#continue-build').href = (report.mode === 'online' ? '/sandbox/' : '/build/') + '?record=' + encodeURIComponent(id);
  $('#full-report').href = '/report/?id=' + encodeURIComponent(id);
  const response = await fetch('/static/core/awards/certificates.json');
  if (!response.ok) throw Error('奖状目录暂时不可用。');
  layouts = await response.json();
  if (await paint()) { status(report.feedback.provider === 'local' ? '这是按本机记录匹配并保存的奖状（AI未连接）。' : '这是本次已保存的奖状。'); return; }
  await start();
}
void init().catch(showError);
