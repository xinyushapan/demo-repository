import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { awardCandidates, chooseAward, certificateStatistics } from '../core/static/core/award-selection.mjs';
const catalog = JSON.parse(fs.readFileSync(new URL('../public-site/lib/catalog.json', import.meta.url)));
const ids = data => awardCandidates(data, catalog).map(c => c.id);
test('objects alone support appropriate awards without inventing a user story', () => {
  const result = ids({ pieces: [{ type: 'tree' }, { type: 'house' }, { type: 'road' }] });
  assert.deepEqual(result.sort(), ['architecture', 'landscape', 'nature', 'roads']);
  assert.deepEqual(ids({ pieces: [] }), []);
});
test('assistant words cannot justify user-specific awards', () => {
  assert.deepEqual(ids({ pieces: [{ type: 'house' }], history: [{ role: 'assistant', text: '尝试守护细节秘密魔法故事' }] }).sort(), ['architecture', 'landscape']);
});
test('all ten designs can be reached with matching recorded evidence', () => {
  const data = { pieces: [{ type: 'tree' }, { type: 'house' }, { type: 'road' }], history: [{ role: 'user', text: '我想重新尝试，守护这座魔法屋，发现细节，藏个秘密，后来故事开始了。' }] };
  const matches = awardCandidates(data, catalog);
  assert.equal(matches.length, 10);
  for (const c of matches) assert.ok(c.evidence.every(e => e.record && ['piece', 'event', 'statement'].includes(e.kind)));
  for (let n = 0; n < 10; n++) assert.equal(chooseAward(matches, () => (n + .1) / 10).id, matches[n].id);
  assert.equal(chooseAward([]), null);
});
test('removed objects remain valid evidence of actual creation behavior', () => {
  assert.ok(ids({ events: [{ action: '放入', type: 'bridge' }] }).includes('roads'));
});
test('statistics never substitute sample connections, insects or building levels', () => {
  const report = { scene: 'free', pieces: [{ type: 'tree' }, { type: 'tree' }], events: [{ action: '移动' }] };
  assert.deepEqual(certificateStatistics(report, 'landscape', catalog), [2, null, 1]);
  assert.deepEqual(certificateStatistics(report, 'nature', catalog), [1, null, null]);
  assert.deepEqual(certificateStatistics(report, 'architecture', catalog), [null, null, 1]);
});
test('only explicit measurements populate specialized numeric slots', () => {
  const report = { pieces: [], events: [], metrics: { blocks: 8, buildingLevels: 3, insects: 0, explorations: 4 }, connections: [] };
  assert.deepEqual(certificateStatistics(report, 'architecture', catalog), [8, 3, 0]);
  assert.deepEqual(certificateStatistics(report, 'nature', catalog), [0, 0, 4]);
  assert.deepEqual(certificateStatistics(report, 'landscape', catalog), [0, 0, 0]);
});
test('every original has one photo and exactly three in-bounds numeric overlays', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../core/static/core/awards/certificates.json', import.meta.url)));
  assert.equal(Object.keys(manifest).length, 10);
  for (const [id, layout] of Object.entries(manifest)) {
    const png = fs.readFileSync(new URL(`../core/static/core/awards/${id}.png`, import.meta.url));
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(layout.digits.length, 3);
    for (const [x, y, w, h] of [layout.photo, ...layout.digits]) assert.ok(x > width * .6 && x + w <= width && y + h <= height, id);
  }
});
test('browser and server use the identical matching rules', () => {
  const source = fs.readFileSync(new URL('../core/static/core/award-selection.mjs', import.meta.url), 'utf8');
  for (const file of ['../public-site/lib/award-selection.mjs', '../public-site/public/static/core/award-selection.mjs']) assert.equal(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), source);
});

test('AI endpoint randomly selects only evidence-backed candidates, without rewriting certificate text', async () => {
  const root = new URL('../public-site/lib/', import.meta.url);
  const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
  const source = fs.readFileSync(new URL('ai.ts', root), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export async function handleAI', 'async function handleAI');
  const context = vm.createContext({
    awards: read('awards.json'), knowledge: read('support.json'), corpus: read('corpus.json'), catalog,
    mapping: read('corpus-map.json'), awardCandidates, chooseAward, Request, Response, AbortSignal, Uint32Array, URL,
    crypto: { getRandomValues: values => { values[0] = 0; return values; } },
    fetch: async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ candidates: ['care', 'architecture'], summary: '你放入了一座房屋。', suggestions: [] }) } }] }))
  });
  vm.runInContext(source + '\nglobalThis.endpoint=handleAI;', context);
  const response = await context.endpoint(new Request('https://local.test/api/ai/feedback', { method: 'POST', headers: { Origin: 'https://local.test', 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true, pieces: [{ type: 'house', x: .5, y: .5 }], events: [], history: [] }) }), { DEEPSEEK_API_KEY: 'test-only', XINYU_AI_ENABLED: '1' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.award_id, 'architecture');
  assert.deepEqual(result.matched_awards, ['architecture']);
  assert.equal(result.evidence[0].record.type, 'house');
  assert.equal(result.description, undefined);
  assert.equal(result.encouragement, undefined);
});
