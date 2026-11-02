/* Local appearance calibration for the team's orange-and-brown clay volcano. */
(() => {
  'use strict';
  const {components,descriptor,cosine}=typeof module!=='undefined'&&module.exports?require('./physical-vision.js'):globalThis.PhysicalVision;
  const prototypes=[];
  function candidates(image){
    const w=image.width,h=image.height,colors=new Uint8Array(w*h),groups=new Uint8Array(w*h),data=image.data;
    for(let i=0;i<colors.length;i++){
      const r=data[i*4],g=data[i*4+1],b=data[i*4+2];if(data[i*4+3]<100)continue;
      if(r>65&&g>30&&r>g*1.3&&g>b*1.35&&r>b*1.8)colors[i]=1;
      else if(r>30&&r<180&&g<125&&r>g*1.2&&r>b*1.2&&g>b*.9)colors[i]=2;
      if(colors[i])groups[i]=1;
    }
    const found=[];
    for(const part of components(groups,w,h)){
      if(part.area<80||part.w<18||part.h<25||part.w/part.h<.45||part.w/part.h>1.65||part.w>w*.98||part.h>h*.98)continue;
      let orange=0,brown=0,oy=0,by=0,ox=0,bx=0;const spans=[[],[],[]];
      for(let y=part.y;y<part.y+part.h;y++){
        let left=w,right=-1;
        for(let x=part.x;x<part.x+part.w;x++){
          const c=colors[y*w+x];if(!c)continue;
          left=Math.min(left,x);right=Math.max(right,x);
          if(c===1){orange++;ox+=x;oy+=y;}else{brown++;bx+=x;by+=y;}
        }
        const ry=(y-part.y)/part.h;
        if(right>=left){if(ry>=.08&&ry<.28)spans[0].push(right-left+1);if(ry>=.4&&ry<.6)spans[1].push(right-left+1);if(ry>=.7&&ry<.9)spans[2].push(right-left+1);}
      }
      if(orange<part.area*.2||brown<part.area*.1||by/brown-oy/orange<part.h*.12||Math.abs(bx/brown-ox/orange)>part.w*.3)continue;
      const widths=spans.map(rows=>rows.reduce((sum,n)=>sum+n,0)/Math.max(1,rows.length));
      // A broad lower mountain and a narrow upper lava/crater, not colour blocks.
      if(widths[1]<widths[0]*1.12||widths[2]<widths[1]*1.08||widths[2]<widths[0]*1.4)continue;
      const box={x:Math.max(0,part.x-2),y:Math.max(0,part.y-2),w:Math.min(w,part.x+part.w+2)-Math.max(0,part.x-2),h:Math.min(h,part.y+part.h+2)-Math.max(0,part.y-2)};
      found.push({box,features:descriptor(colors,w,box),area:part.area});
    }
    return found;
  }
  function learn(image){const sample=candidates(image).sort((a,b)=>b.area-a.area)[0];if(!sample)return false;prototypes.push(sample.features);return true;}
  function detect(image){
    if(!prototypes.length)return [];
    return candidates(image).flatMap(candidate=>{
      const similarity=Math.max(...prototypes.flatMap(p=>[cosine(candidate.features,p),cosine(candidate.features,p,true)]));
      if(similarity<.78)return [];
      return [{type:'volcano',...candidate.box,score:.91+Math.min(1,(similarity-.78)/.22)*.075,method:'physical-volcano',similarity}];
    });
  }
  const api={learn,detect,count:()=>prototypes.length};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.PhysicalVolcano=api;
})();
