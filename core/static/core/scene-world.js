/* Tactile environment art with restrained ambient movement. */
(() => {
  'use strict';
  const ids=['nature','animal','city','ocean','space','free'];
  const suppliedArt={nature:'nature-user.png',animal:'animal-user.png'};
  function create(ctx,{reducedMotion=false,onLoad=()=>{}}={}){
    const life=window.SandplayLife?.create(ctx,{reducedMotion,onLoad});
    const art=new Map();let current=null,previous=null,changedAt=0;
    for(const id of ids){const img=new Image();img.decoding='async';img.onload=onLoad;img.src=`/static/core/scenes/${suppliedArt[id]||`${id}.webp`}`;art.set(id,img);}
    function cover(img,w,h,extra=0,id=null,time=0){
      if(!img?.complete||!img.naturalWidth)return false;
      const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight)*(1+extra),dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
      ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);if(id&&life){ctx.save();ctx.translate((w-dw)/2,(h-dh)/2);ctx.scale(scale,scale);life.background(id,img,time);ctx.restore();}return true;
    }
    function background(id,w,h,time){
      const image=art.get(id);if(!image?.complete||!image.naturalWidth)return false;
      if(current!==id){previous=current;current=id;changedAt=time;}
      ctx.save();
      const progress=reducedMotion?1:Math.min(1,(time-changedAt)/.5);
      if(progress<1&&art.get(previous)?.naturalWidth){cover(art.get(previous),w,h);ctx.globalAlpha=progress;}
      cover(image,w,h,0,id,time);ctx.restore();
      // A faint warm edge vignette draws attention to the open play area.
      const glow=ctx.createRadialGradient(w*.5,h*.55,w*.17,w*.5,h*.55,w*.72);
      glow.addColorStop(0,'#ffffff00');glow.addColorStop(1,id==='space'?'#30255035':'#69503b18');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
      return true;
    }
    function dot(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
    function ambience(id,w,h,time,foreground=false){
      const t=reducedMotion?0:time;
      ctx.save();
      if(!foreground&&id==='ocean'){
        ctx.globalCompositeOperation='screen';
        for(let i=0;i<3;i++){const x=w*(.12+i*.34+Math.sin(t*.1+i)*.025);const ray=ctx.createLinearGradient(x,0,x+w*.16,h);ray.addColorStop(0,'#fff7d34d');ray.addColorStop(1,'#d8fff400');ctx.fillStyle=ray;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+w*.045,0);ctx.lineTo(x+w*.24,h);ctx.lineTo(x-w*.1,h);ctx.fill();}
      }
      if(id==='space'&&!foreground){
        for(let i=0;i<25;i++){const x=((i*127.7+21)%997)/997*w,y=((i*51.3+14)%137)/137*h*.4,alpha=.22+(Math.sin(t*.6+i)+1)*.2;dot(x,y,Math.max(.8,w/900),`rgba(255,244,205,${alpha})`);if(i%7===0){ctx.strokeStyle=`rgba(255,244,205,${alpha*.6})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();}}
      }
      if(id==='ocean'&&foreground){
        for(let i=0;i<13;i++){const x=w*(i%2?.91:.07)+Math.sin(t*.32+i)*w*.035,y=h*(1-((i*.073+t*.018)%1));ctx.beginPath();ctx.arc(x,y,1.8+i%4,0,Math.PI*2);ctx.strokeStyle='#edffff75';ctx.lineWidth=1;ctx.stroke();dot(x-1,y-1,.8,'#ffffff70');}
      }else if(foreground){
        const colors={nature:'255,246,191',animal:'255,230,168',city:'255,242,217',space:'221,205,255',free:'255,245,207'};
        for(let i=0;i<14;i++){const edge=i%2===0,x=w*(edge?.045:.94)+Math.sin(t*.18+i*2.1)*w*.045,y=h*(.2+((i*.137+t*.009)% .76));dot(x,y,.8+i%3*.6,`rgba(${colors[id]||colors.free},${.15+(Math.sin(t*.7+i)+1)*.14})`);}
      }
      if(!foreground&&(id==='nature'||id==='animal'||id==='free')){
        const light=ctx.createRadialGradient(w*.22,h*.16,0,w*.22,h*.16,w*.48);light.addColorStop(0,'#fff4cd20');light.addColorStop(1,'#fff4cd00');ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
      }
      ctx.restore();
    }
    return {background,ambience};
  }
  window.SandplayWorld={create};
})();
