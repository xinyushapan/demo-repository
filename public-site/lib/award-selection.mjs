// Only observed objects, operations and the user's own words support an award.
export function awardCandidates(data, catalog = []) {
  const pieces = Array.isArray(data.pieces) ? data.pieces : [];
  const events = Array.isArray(data.events) ? data.events : [];
  const history = Array.isArray(data.history) ? data.history : [];
  const candidates = [];
  const object = predicate => {
    const p = pieces.findIndex(p => p && predicate(p.type));
    if (p >= 0) return { kind: 'piece', index: p, record: pieces[p] };
    const e = events.findIndex(e => e && predicate(e.type));
    return e >= 0 ? { kind: 'event', index: e, record: events[e] } : null;
  };
  const statement = pattern => {
    const i = history.findIndex(h => h?.role === 'user' && pattern.test(h.text || ''));
    return i >= 0 ? { kind: 'statement', index: i, record: history[i] } : null;
  };
  const category = (type, categories) => catalog.some(c => c.id === type && categories.includes(c.category));
  const anyObject = object(type => typeof type === 'string' && !!type);
  const add = (id, evidence) => { if (evidence) candidates.push({ id, evidence: [evidence] }); };
  add('landscape', anyObject);
  add('roads', object(type => ['road', 'bridge'].includes(type)));
  add('trying', anyObject && statement(/尝试|试试|再试|重新|挑战|换个/));
  add('care', anyObject && statement(/照顾|守护|保护|陪伴|照料/));
  add('surprise', anyObject && statement(/彩蛋|惊喜|隐藏|秘密/));
  add('detail', anyObject && statement(/细节|仔细|注意|发现|小地方/));
  add('nature', object(type => category(type, ['自然现象', '动物'])));
  add('imagination', anyObject && statement(/名字|叫做|取名|想象|奇妙|魔法|幻想|自创/));
  add('story', anyObject && statement(/故事|后来|然后|冒险|遇见|角色|一起去/));
  add('architecture', object(type => category(type, ['建筑与场所'])));
  return candidates;
}

export function chooseAward(candidates, random = Math.random) {
  if (!candidates.length) return null;
  return candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))];
}

export function certificateStatistics(report, awardId, catalog = []) {
  const pieces = Array.isArray(report.pieces) ? report.pieces : [];
  const events = Array.isArray(report.events) ? report.events : [];
  const known = key => Number.isInteger(report.metrics?.[key]) && report.metrics[key] >= 0 ? report.metrics[key] : null;
  const moves = events.filter(e => e?.action === '移动').length;
  const routes = Array.isArray(report.connections) ? report.connections.filter(c => c?.from && c?.to).length : null;
  if (awardId === 'nature') return [new Set(pieces.filter(p => ['tree', 'flower', 'cactus'].includes(p.type) || catalog.some(c => c.id === p.type && c.category === '动物')).map(p => p.type)).size, known('insects'), known('explorations')];
  if (awardId === 'architecture') return [known('blocks'), known('buildingLevels'), moves];
  if (awardId === 'story') return [pieces.filter(p => catalog.some(c => c.id === p.type && ['人物与关系', '动物', '幻想与力量'].includes(c.category))).length, known('storyClues'), known('storyExtensions')];
  if (awardId === 'imagination') return [pieces.length, new Set([report.scene, ...events.map(e => e?.scene)].filter(Boolean)).size, moves];
  return [pieces.length, routes, moves];
}
