const {test}=require('node:test');
const assert=require('node:assert/strict');
const modulePath=require.resolve('../core/static/core/physical-tree.js');
function detector(){delete require.cache[modulePath];return require(modulePath);}
const grey=[155,160,170],dark=[34,151,50],light=[172,220,160],brown=[110,64,38];
function frame(){
  const image={width:360,height:280,data:new Uint8ClampedArray(360*280*4)};
  for(let i=0;i<image.data.length;i+=4)image.data.set([...grey,255],i);
  return image;
}
function ellipse(image,cx,cy,rx,ry,color){
  for(let y=Math.max(0,Math.floor(cy-ry));y<Math.min(image.height,cy+ry);y++)for(let x=Math.max(0,Math.floor(cx-rx));x<Math.min(image.width,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)image.data.set([...color,255],(y*image.width+x)*4);
}
function tree(image,x=120,y=65,s=1,{trunk=true,mint=true}={}){
  if(trunk){ellipse(image,x,y+85*s,14*s,35*s,brown);ellipse(image,x,y+115*s,45*s,12*s,brown);}
  for(const[dx,dy,r]of [[-30,15,28],[30,15,28],[0,-10,30],[0,42,30]])ellipse(image,x+dx*s,y+dy*s,r*s,r*s,dark);
  ellipse(image,x-30*s,y-7*s,22*s,22*s,mint?light:dark);
  ellipse(image,x+33*s,y+43*s,19*s,19*s,mint?light:dark);
  return image;
}
test('requires a calibrated reference before detecting a tree',()=>assert.equal(detector().detect(tree(frame())).length,0));
test('detects a scaled tree and two separate trees',()=>{
  const model=detector();assert.equal(model.learn(tree(frame())),true);
  assert.equal(model.count(),1);
  assert.equal(model.detect(tree(frame(),160,80,.65)).length,1);
  assert.equal(model.detect(tree(tree(frame(),85,80,.65),265,80,.65)).length,2);
});
test('rejects blank, missing trunk and missing pale clay balls',()=>{
  const model=detector();model.learn(tree(frame()));
  assert.equal(model.detect(frame()).length,0);
  assert.equal(model.detect(tree(frame(),120,65,1,{trunk:false})).length,0);
  assert.equal(model.detect(tree(frame(),120,65,1,{mint:false})).length,0);
});
test('green and brown rectangular blocks do not count as a clay tree',()=>{
  const model=detector();model.learn(tree(frame()));const image=frame();
  for(let y=40;y<180;y++)for(let x=90;x<250;x++)image.data.set([...(x<140?light:dark),255],(y*image.width+x)*4);
  for(let y=180;y<240;y++)for(let x=140;x<210;x++)image.data.set([...brown,255],(y*image.width+x)*4);
  assert.equal(model.detect(image).length,0);
});
