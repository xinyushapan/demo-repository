/* Calibrated for the team's round green clay crown and brown trunk/base. */
(() => {
  'use strict';
  const {components,descriptor,cosine}=typeof module!=='undefined'&&module.exports?require('./physical-vision.js'):globalThis.PhysicalVision;
  const prototypes=[];
  function classify(image){
    const colors=new Uint8Array(image.width*image.height),groups=new Uint8Array(colors.length),data=image.data;
    for(let i=0;i<colors.length;i++){
      const r=data[i*4],g=data[i*4+1],b=data[i*4+2];if(data[i*4+3]<100)continue;
      if(g>40&&g>r*1.06&&g>b*1.08&&g-Math.min(r,b)>12){colors[i]=Math.min(r,b)/g>.55?2:1;groups[i]=1;}
      else if(r>24&&g>12&&r<185&&g<140&&r>g*1.18&&r>b*1.28&&g>b*.95){colors[i]=3;groups[i]=2;}
    }
    return {colors,groups};
  }
  function candidates(image){
    const w=image.width,h=image.height,{colors,groups}=classify(image),parts=components(groups,w,h),out=[];
    for(const crown of parts.filter(p=>p.color===1&&p.area>=30&&p.w>=8&&p.h>=8&&p.w/p.h>.45&&p.w/p.h<1.75&&p.area/(p.w*p.h)>.38&&p.area/(p.w*p.h)<.94)){
      let light=0,dark=0;
      for(let y=crown.y;y<crown.y+crown.h;y++)for(let x=crown.x;x<crown.x+crown.w;x++){const c=colors[y*w+x];if(c===1)dark++;if(c===2)light++;}
      // This real object has both pale mint and darker green clay balls.
      if(light<Math.max(5,crown.area*.035)||dark<crown.area*.2)continue;
      const bases=parts.filter(p=>p.color===2&&p.area/crown.area>.035&&p.area/crown.area<1&&p.cy>crown.cy+crown.h*.18&&p.y>crown.y+crown.h*.38&&p.y<crown.y+crown.h*1.15&&p.y+p.h>crown.y+crown.h*1.07&&Math.abs(p.cx-crown.cx)<crown.w*.34&&p.w>crown.w*.18&&p.w<crown.w*1.15).sort((a,b)=>b.area-a.area);
      if(!bases.length)continue;const base=bases[0];
      const x=Math.max(0,Math.min(crown.x,base.x)-2),y=Math.max(0,crown.y-2),right=Math.min(w,Math.max(crown.x+crown.w,base.x+base.w)+2),bottom=Math.min(h,base.y+base.h+2),box={x,y,w:right-x,h:bottom-y};
      if(box.w<18||box.h<25||box.w/box.h<.35||box.w/box.h>1.35||box.w>w*.98||box.h>h*.99)continue;
      out.push({box,features:descriptor(colors,w,box),area:crown.area+base.area});
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
      if(similarity<.77)return [];
      return [{type:'tree',...candidate.box,score:.91+Math.min(1,(similarity-.77)/.23)*.075,method:'physical-tree',similarity}];
    });
  }
  const api={learn,detect,count:()=>prototypes.length};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.PhysicalTree=api;
})();
