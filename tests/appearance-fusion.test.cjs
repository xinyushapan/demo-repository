const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sameObject,generalItems}=require('../core/static/core/appearance-fusion.js');
const item=(type='volcano',x=.2)=>({type,box:{x,y:.3,w:.15,h:.3}});
test('a loaded physical category with no observation cannot suppress fallback',()=>{
  const items=[item(),item('tree')];assert.deepEqual(generalItems(items,[]),items);
});
test('only overlapping observations of the same class are deduplicated',()=>{
  const physical=item(),other=item('volcano',.7),tree=item('tree');
  assert.deepEqual(generalItems([item('volcano',.21),other,tree],[physical]),[other,tree]);
});
test('a physical observation at capture time suppresses a delayed duplicate',()=>{
  const captured=item(),moved=item('volcano',.7);
  assert.deepEqual(generalItems([item()],[captured,moved]),[]);
});
test('invalid or disjoint boxes do not match',()=>{
  assert.equal(sameObject(item(),{type:'volcano'}),false);
  assert.equal(sameObject(item(),item('volcano',.8)),false);
});
