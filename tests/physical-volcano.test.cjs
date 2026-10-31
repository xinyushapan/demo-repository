const {test}=require('node:test');
const assert=require('node:assert/strict');
const modulePath=require.resolve('../core/static/core/physical-volcano.js');
const grey=[155,160,170],orange=[244,125,48],brown=[103,65,54];
function detector(){delete require.cache[modulePath];return require(modulePath);}
function frame(){
  const image={width:360,height:280,data:new Uint8ClampedArray(360*280*4)};
  for(let i=0;i<image.data.length;i+=4)image.data.set([...grey,255],i);
  return image;
}
function volcano(image,cx=120,top=25,s=1,base=true){
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
    const dx=(x-cx)/s,dy=(y-top)/s;
    const cap=(dx/18)**2+((dy-20)/18)**2<=1;
    const mountain=dy>=35&&dy<205&&Math.abs(dx)<18+(dy-35)*.4;
    if(!cap&&!mountain)continue;
    const lava=cap||dy<125||(Math.abs(dx)<17&&dy<180);
    image.data.set([...(lava||!base?orange:brown),255],(y*image.width+x)*4);
  }
  return image;
}
test('requires calibration before identifying orange and brown clay as volcano',()=>assert.equal(detector().detect(volcano(frame())).length,0));
test('calibrated volcano detects smaller objects and two separate mountains',()=>{
  const model=detector();assert.equal(model.learn(volcano(frame())),true);
  assert.equal(model.detect(volcano(frame(),175,65,.65)).length,1);
  assert.equal(model.detect(volcano(volcano(frame(),85,65,.65),265,65,.65)).length,2);
});
test('rejects blank and a mountain with no brown lower body',()=>{
  const model=detector();model.learn(volcano(frame()));
  assert.equal(model.detect(frame()).length,0);
  assert.equal(model.detect(volcano(frame(),120,25,1,false)).length,0);
});
test('orange and brown blocks and reversed colour ordering are rejected',()=>{
  const model=detector();model.learn(volcano(frame()));const blocks=frame();
  for(let y=50;y<230;y++)for(let x=100;x<240;x++)blocks.data.set([...(y<150?orange:brown),255],(y*blocks.width+x)*4);
  assert.equal(model.detect(blocks).length,0);
  const reversed=volcano(frame());
  for(let i=0;i<reversed.data.length;i+=4){if(reversed.data[i]===orange[0])reversed.data.set([...brown,255],i);else if(reversed.data[i]===brown[0])reversed.data.set([...orange,255],i);}
  assert.equal(model.detect(reversed).length,0);
});
