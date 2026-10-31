/* Shared pixel-region and colour-layout operations for local toy detectors. */
(() => {
  'use strict';
  function components(colors,w,h){
    const seen=new Uint8Array(colors.length),queue=new Int32Array(colors.length),parts=[];
    for(let seed=0;seed<colors.length;seed++){
      if(!colors[seed]||seen[seed])continue;
      const color=colors[seed];let head=0,tail=1,left=w,right=0,top=h,bottom=0,sx=0,sy=0;
      queue[0]=seed;seen[seed]=1;
      while(head<tail){
        const p=queue[head++],x=p%w,y=(p/w)|0;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);sx+=x;sy+=y;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=x+dx,ny=y+dy;if(nx<0||nx>=w||ny<0||ny>=h)continue;
          const next=ny*w+nx;if(!seen[next]&&colors[next]===color){seen[next]=1;queue[tail++]=next;}
        }
      }
      if(tail>=Math.max(4,w*h*.000025))parts.push({color,area:tail,x:left,y:top,w:right-left+1,h:bottom-top+1,cx:sx/tail,cy:sy/tail});
    }
    return parts;
  }
  function descriptor(colors,width,box){
    const bins=new Float32Array(8*8*3),counts=new Uint32Array(64);
    for(let y=box.y;y<box.y+box.h;y++)for(let x=box.x;x<box.x+box.w;x++){
      const cell=Math.min(7,((y-box.y)*8/box.h)|0)*8+Math.min(7,((x-box.x)*8/box.w)|0),color=colors[y*width+x];
      counts[cell]++;if(color)bins[cell*3+color-1]++;
    }
    for(let i=0;i<bins.length;i++)bins[i]/=Math.max(1,counts[(i/3)|0]);
    return bins;
  }
  function cosine(a,b,mirror=false){
    let dot=0,aa=0,bb=0;
    for(let y=0;y<8;y++)for(let x=0;x<8;x++)for(let c=0;c<3;c++){
      const av=a[(y*8+x)*3+c],bv=b[(y*8+(mirror?7-x:x))*3+c];dot+=av*bv;aa+=av*av;bb+=bv*bv;
    }
    return dot/Math.max(.0001,Math.sqrt(aa*bb));
  }
  const api={components,descriptor,cosine};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.PhysicalVision=api;
})();
