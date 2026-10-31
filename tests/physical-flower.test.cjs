const {test}=require('node:test');
const assert=require('node:assert/strict');
const modulePath=require.resolve('../core/static/core/physical-flower.js');
function detector(){delete require.cache[modulePath];return require(modulePath);}
function frame(){
  const image={width:360,height:280,data:new Uint8ClampedArray(360*280*4)};
  for(let i=0;i<image.data.length;i+=4)image.data.set([155,160,170,255],i);
  return image;
}
function ellipse(image,cx,cy,rx,ry,color){
  for(let y=Math.max(0,Math.floor(cy-ry));y<Math.min(image.height,cy+ry);y++)for(let x=Math.max(0,Math.floor(cx-rx));x<Math.min(image.width,cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)image.data.set([...color,255],(y*image.width+x)*4);
}
function flower(image,x=120,y=75,s=1){
  for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;ellipse(image,x+Math.cos(a)*35*s,y+Math.sin(a)*35*s,25*s,25*s,[225,47,63]);}
  ellipse(image,x,y,23*s,23*s,[245,217,24]);
  ellipse(image,x,y+90*s,60*s,26*s,[50,158,46]);
  return image;
}
test('colour alone does not identify an uncalibrated flower',()=>{
  assert.equal(detector().detect(flower(frame())).length,0);
});
test('a calibrated layout detects a smaller flower and two separate flowers',()=>{
  const model=detector();assert.equal(model.learn(flower(frame())),true);
  assert.equal(model.detect(flower(frame(),175,85,.65)).length,1);
  const pair=flower(frame(),85,85,.65);flower(pair,265,85,.65);
  assert.equal(model.detect(pair).length,2);
});
test('blank frames, single colours and traffic-light ordering are rejected',()=>{
  const model=detector();model.learn(flower(frame()));
  assert.equal(model.detect(frame()).length,0);
  for(const color of [[225,47,63],[245,217,24],[50,158,46]]){
    const image=frame();ellipse(image,180,140,65,65,color);assert.equal(model.detect(image).length,0);
  }
  const traffic=frame();ellipse(traffic,180,65,27,27,[225,47,63]);ellipse(traffic,180,140,27,27,[245,217,24]);ellipse(traffic,180,215,27,27,[50,158,46]);
  assert.equal(model.detect(traffic).length,0);
});
test('a missing base or missing centre does not create a positive',()=>{
  const model=detector();model.learn(flower(frame()));
  const missingBase=flower(frame());
  for(let y=135;y<missingBase.height;y++)for(let x=0;x<missingBase.width;x++)missingBase.data.set([155,160,170,255],(y*missingBase.width+x)*4);
  assert.equal(model.detect(missingBase).length,0);
  const missingCentre=flower(frame());ellipse(missingCentre,120,75,24,24,[225,47,63]);
  assert.equal(model.detect(missingCentre).length,0);
});
