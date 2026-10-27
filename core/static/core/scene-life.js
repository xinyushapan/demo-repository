/* Background-only motion: original scene photographs and original toy textures.
 * Nothing here creates interactive pieces or changes recognition/records. */
(() => {
  function create(ctx,{reducedMotion=false,onLoad=()=>{}}={}){
    const sprites=new Map(),windCache=new WeakMap();let giraffe=null,cleanAnimal=null,originalAnimal=null;
    const load=(url,ready)=>{const image=new Image();image.decoding='async';image.onload=()=>{ready(image);onLoad();};image.src=url;return image;};
    const trim=image=>{const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);const data=g.getImageData(0,0,c.width,c.height).data;let l=c.width,r=0,t=c.height,b=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}const out=document.createElement('canvas');out.width=r-l+1;out.height=b-t+1;out.getContext('2d').drawImage(c,l,t,out.width,out.height,0,0,out.width,out.height);return out;};
    for(const name of ['fish','car','bird'])load(`/static/core/toys/${name}.png`,im=>sprites.set(name,trim(im)));
    load('/static/core/scenes/animal-motion-clean.png',im=>cleanAnimal=im);
    const giraffePath=new Path2D('M632 111L638 105L635 95Q641 88 646 96L647 109L655 111L657 98Q666 91 668 98L663 115L681 126L696 144L694 163L685 171L664 164L650 154L642 181L636 209L627 236L618 263L616 288L610 313L610 397L615 411L595 413L591 397L591 330L584 315L573 310L558 314L552 340L542 396L544 408L526 410L526 397L530 349L533 320L519 316L508 342L497 385L492 404L474 405L474 395L481 373L484 329L489 313L484 300L483 277L485 261L482 274L477 294L475 310L465 336L456 341L455 330L464 316L472 287L475 264L480 251L489 246L503 242L535 235L562 221L585 205L600 176L614 144L619 127L607 127L601 117L602 110L618 115L624 116Z');
    function prepareAnimal(image){
      if(originalAnimal===image)return;originalAnimal=image;
      giraffe=document.createElement('canvas');giraffe.width=1672;giraffe.height=941;
      const g=giraffe.getContext('2d');g.clip(giraffePath);g.drawImage(image,0,0,1672,941);
    }
    function fadeMask(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');let fade=g.createLinearGradient(0,0,w,0);fade.addColorStop(0,'#fff0');fade.addColorStop(.08,'#fff');fade.addColorStop(.92,'#fff');fade.addColorStop(1,'#fff0');g.fillStyle=fade;g.fillRect(0,0,w,h);g.globalCompositeOperation='destination-in';fade=g.createLinearGradient(0,0,0,h);fade.addColorStop(0,'#fff0');fade.addColorStop(.06,'#fff');fade.addColorStop(.87,'#fff');fade.addColorStop(1,'#fff0');g.fillStyle=fade;g.fillRect(0,0,w,h);return c;}
    function wind(image,id,t){
      if(reducedMotion)return;
      const W=image.naturalWidth,H=image.naturalHeight;
      const zones={nature:[[0,0,.19,.39],[.78,0,.22,.45],[.29,.10,.1,.25]],animal:[[0,0,.31,.37],[.75,0,.25,.39]],ocean:[[0,.25,.22,.75],[.78,.25,.22,.75]],free:[[0,.6,.19,.4],[.81,.6,.19,.4]]}[id];
      if(!zones)return;
      let entries=windCache.get(image);if(!entries){entries=zones.map(([x,y,w,h])=>{const width=Math.ceil(w*W),height=Math.ceil(h*H),work=document.createElement('canvas');work.width=width;work.height=height;return{x:x*W,y:y*H,width,height,work,mask:fadeMask(width,height)};});windCache.set(image,entries);}
      entries.forEach((zone,i)=>{
        const g=zone.work.getContext('2d');g.clearRect(0,0,zone.width,zone.height);
        const band=Math.max(3,Math.ceil(zone.height/32));
        for(let y=0;y<zone.height;y+=band){const bh=Math.min(band,zone.height-y),weight=Math.pow(1-y/zone.height,1.6),offset=Math.sin(t*.95+i*1.8+y/zone.height*.7)*W*.0032*weight;
          g.drawImage(image,zone.x-offset,zone.y+y,zone.width,bh,0,y,zone.width,bh);
        }
        g.globalCompositeOperation='destination-in';g.drawImage(zone.mask,0,0);g.globalCompositeOperation='source-over';ctx.drawImage(zone.work,zone.x,zone.y);
      });
    }
    function actor(image,x,y,width,flip=false,tilt=0){if(!image)return;const height=width*image.height/image.width;ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(flip?-1:1,1);ctx.drawImage(image,-width/2,-height/2,width,height);ctx.restore();}
    function drawAnimal(image,t){
      if(!cleanAnimal?.complete||!cleanAnimal.naturalWidth)return;
      prepareAnimal(image);
      ctx.save();ctx.scale(image.naturalWidth/1672,image.naturalHeight/941);
      // Only restore the giraffe's old rectangle; all other supplied artwork is retained.
      ctx.save();ctx.beginPath();ctx.rect(449,80,260,343);ctx.clip();ctx.drawImage(cleanAnimal,0,0,1672,941);ctx.restore();
      const step=t*2.25,walk=Math.sin(t*.15)*27,bob=Math.sin(step*2)*1.2;
      ctx.save();ctx.translate(walk,bob);
      ctx.fillStyle='#6c4a2820';ctx.beginPath();ctx.ellipse(548,414,79,5,0,0,Math.PI*2);ctx.fill();
      ctx.drawImage(giraffe,450,85,250,235,450,85,250,235);
      for(const [x,width,phase]of [[469,40,0],[517,40,Math.PI],[579,42,.5]])for(let y=320;y<419;y+=4){const h=Math.min(4,419-y),shift=Math.sin(step+phase)*4*(y-320)/99;ctx.drawImage(giraffe,x,y,width,h,x+shift,y,width,h);}
      ctx.restore();ctx.restore();
    }
    // Called in source-image coordinates after the unmodified background is drawn.
    function background(id,image,t){
      const W=image.naturalWidth,H=image.naturalHeight;
      if(reducedMotion)return;
      wind(image,id,t);
      if(id==='animal')drawAnimal(image,t);
      if(id==='nature'||id==='animal'){
        ctx.save();ctx.strokeStyle='#e6ffff70';ctx.lineWidth=W*.0008;
        for(let i=0;i<6;i++){const x=W*(id==='nature'?.035:.055)+i*W*.017+Math.sin(t*.8+i)*W*.006,y=H*(id==='nature'?.37:.51)+i*H*.018;ctx.beginPath();ctx.ellipse(x,y,W*(.012+i*.001),H*.0018,0,Math.PI*.1,Math.PI*.85);ctx.stroke();}ctx.restore();
      }
      if(id==='ocean'){
        const fish=sprites.get('fish');for(let i=0;i<3;i++){const cycle=(t*(.025+i*.004)+i*.36)%1,reverse=i%2===1,x=W*(reverse?1.12-cycle*1.24:cycle*1.24-.12),y=H*(.17+i*.09)+Math.sin(t*.8+i*2)*H*.018;actor(fish,x,y,W*(.045+i*.008),!reverse,Math.sin(t*1.8+i)*.045);}
      }
      if(id==='city'){
        const progress=(t*.025)%1;actor(sprites.get('car'),W*(1.1-progress*1.2),H*.34,W*.055,true);
      }
      if(id==='nature')actor(sprites.get('bird'),W*((t*.015+.65)%1.2-.1),H*.13+Math.sin(t*1.5)*H*.012,W*.023,true,Math.sin(t*2)*.06);
      if(id==='space'){
        const phase=(t*.08)%1;if(phase<.3){ctx.save();ctx.globalAlpha=Math.sin(phase/.3*Math.PI)*.55;const x=W*(.1+phase*1.8),y=H*(.05+phase*.3),trail=ctx.createLinearGradient(x-W*.08,y-H*.025,x,y);trail.addColorStop(0,'#fff0');trail.addColorStop(1,'#fff6d9');ctx.strokeStyle=trail;ctx.lineWidth=W*.0016;ctx.beginPath();ctx.moveTo(x-W*.08,y-H*.025);ctx.lineTo(x,y);ctx.stroke();ctx.restore();}
      }
      if(id==='free'){
        ctx.save();ctx.globalAlpha=.12+Math.sin(t*.7)*.04;const glow=ctx.createRadialGradient(W*(.45+Math.sin(t*.15)*.15),H*.18,0,W*.5,H*.18,W*.33);glow.addColorStop(0,'#fff2b2');glow.addColorStop(1,'#fff0');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);ctx.restore();
      }
    }
    return{background};
  }
  window.SandplayLife={create};
})();
