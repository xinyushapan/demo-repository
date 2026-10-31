/* Sample-calibrated detector for the supplied red/yellow/green clay flower.
 * No image upload, generated training image, or general-purpose flower model. */
(() => {
  'use strict';
  const {components,descriptor,cosine}=typeof module!=='undefined'&&module.exports?require('./physical-vision.js'):globalThis.PhysicalVision;
  const prototypes=[];
  function classify(image){
    const colors=new Uint8Array(image.width*image.height),data=image.data;
    for(let i=0;i<colors.length;i++){
      const r=data[i*4],g=data[i*4+1],b=data[i*4+2];
      if(data[i*4+3]<100)continue;
      if(r>55&&r>g*1.32&&r>b*1.28)colors[i]=1;
      else if(r>60&&g>50&&b<Math.min(r,g)*.65&&r/g>.78&&r/g<1.65)colors[i]=2;
      else if(g>40&&g>r*1.12&&g>b*1.3)colors[i]=3;
    }
    return colors;
  }
  function candidates(image){
    const w=image.width,h=image.height,colors=classify(image),parts=components(colors,w,h),out=[];
    for(const core of parts.filter(p=>p.color===2&&p.area>=12&&p.w>=4&&p.h>=4&&p.area/(p.w*p.h)>.35&&p.w/p.h>.2&&p.w/p.h<2.5)){
      const radius=Math.max(core.w,core.h),petals=parts.filter(p=>p.color===1&&p.area>=core.area*.04&&p.area<=core.area*14&&Math.hypot(p.cx-core.cx,p.cy-core.cy)<radius*1.8);
      if(!petals.length)continue;
      const red={x:Math.min(...petals.map(p=>p.x)),y:Math.min(...petals.map(p=>p.y)),right:Math.max(...petals.map(p=>p.x+p.w)),bottom:Math.max(...petals.map(p=>p.y+p.h)),area:petals.reduce((n,p)=>n+p.area,0)};
      const rw=red.right-red.x,rh=red.bottom-red.y;
      // Red lobes must surround the yellow centre, not form traffic-light bands.
      if(red.area/core.area<.6||red.area/core.area>9||red.x>core.cx-core.w*.15||red.right<core.cx+core.w*.15||red.y>core.cy-core.h*.35||red.bottom<core.cy+core.h*.25)continue;
      const angular=new Uint32Array(12);
      for(let y=red.y;y<red.bottom;y++)for(let x=red.x;x<red.right;x++)if(colors[y*w+x]===1){const a=Math.atan2(y-core.cy,x-core.cx)+Math.PI;angular[Math.min(11,(a*12/(Math.PI*2))|0)]++;}
      if([...angular].filter(n=>n>=Math.max(2,core.area*.008)).length<9)continue;
      const bases=parts.filter(p=>p.color===3&&p.cy>core.cy+core.h*.45&&p.y-red.bottom<core.h*.65&&p.cy-core.cy<radius*2.5&&Math.abs(p.cx-core.cx)<rw*.65&&p.w>=core.w*.45&&p.w<rw*1.9&&p.area/core.area>.2&&p.area/core.area<7).sort((a,b)=>b.area-a.area);
      if(!bases.length)continue;const base=bases[0];
      const x=Math.max(0,Math.min(red.x,base.x)-2),y=Math.max(0,red.y-2),right=Math.min(w,Math.max(red.right,base.x+base.w)+2),bottom=Math.min(h,base.y+base.h+2),box={x,y,w:right-x,h:bottom-y};
      if(box.w<16||box.h<20||box.w/box.h<.35||box.w/box.h>1.65||box.w>w*.98||box.h>h*.98)continue;
      out.push({box,features:descriptor(colors,w,box),area:red.area+core.area+base.area});
    }
    return out;
  }
  function learn(image){
    const sample=candidates(image).sort((a,b)=>b.area-a.area)[0];if(!sample)return false;
    prototypes.push(sample.features);return true;
  }
  function detect(image){
    if(!prototypes.length)return [];
    return candidates(image).flatMap(candidate=>{
      const similarity=Math.max(...prototypes.flatMap(p=>[cosine(candidate.features,p),cosine(candidate.features,p,true)]));
      if(similarity<.76)return [];
      return [{type:'flower',...candidate.box,score:.91+Math.min(1,(similarity-.76)/.24)*.075,method:'physical-flower',similarity}];
    });
  }
  const api={learn,detect,count:()=>prototypes.length};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else globalThis.PhysicalFlower=api;
})();
