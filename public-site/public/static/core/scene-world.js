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
    // Short responses to deliberate placement, movement and selection. These are
    // visual effects only: never add toys or write fabricated operation records.
    let responses=[];
    const visitors=new Map();
    for(const type of ['bird','fish','car']){
      const image=new Image();image.onload=()=>{
        const sample=document.createElement('canvas');sample.width=image.naturalWidth;sample.height=image.naturalHeight;
        const g=sample.getContext('2d');g.drawImage(image,0,0);
        const pixels=g.getImageData(0,0,sample.width,sample.height).data;
        let l=sample.width,r=0,t=sample.height,b=0;
        for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++)if(pixels[(y*sample.width+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
        if(r>l&&b>t)visitors.set(type,{image,x:l,y:t,w:r-l+1,h:b-t+1});
      };image.src=`/static/core/toys/${type}.png`;
    }
    function respond(scene,piece,time){
      if(reducedMotion||!piece)return;
      if(responses.some(r=>r.piece===piece.id&&time-r.start<.6))return;
      responses=responses.filter(r=>r.piece!==piece.id&&r.scene===scene);
      responses.push({scene,piece:piece.id,x:.12+piece.x*.76,y:.40+piece.y*.49,start:time});
      responses=responses.slice(-4);
    }
    function resetResponses(){responses=[];}
    function visitor(type,x,y,size,flip=false){
      const sprite=visitors.get(type);if(!sprite)return;
      const height=size*sprite.h/sprite.w;
      ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);
      ctx.drawImage(sprite.image,sprite.x,sprite.y,sprite.w,sprite.h,-size/2,-height/2,size,height);ctx.restore();
    }
    function reactions(scene,w,h,time){
      if(reducedMotion)return;
      responses=responses.filter(r=>r.scene===scene&&time-r.start<3.2);
      for(const r of responses){
        const age=time-r.start,p=age/3.2,reach=Math.min(1,age/1.15),ease=reach*reach*(3-2*reach);
        const x=r.x*w,y=r.y*h,scale=Math.min(w/700,h/410),top=y-125*scale;
        ctx.save();ctx.globalAlpha=Math.min(1,age/.18,(3.2-age)/.65);
        if(scene==='ocean'){
          const from=x<w/2?w*.03:w*.97;
          visitor('fish',from+(x-from)*ease,top+Math.sin(age*4)*6*scale,48*scale,from<x);
          ctx.strokeStyle='#eaffff';ctx.lineWidth=1.5*scale;
          for(let i=0;i<5;i++){const q=(p+i*.19)%1;ctx.beginPath();ctx.arc(x+(i-2)*12*scale+Math.sin(q*7+i)*5*scale,y-q*95*scale,(3+i%3)*scale,0,Math.PI*2);ctx.stroke();}
        }else if(scene==='nature'){
          visitor('bird',w*.08+(x-w*.08)*ease,h*.16+(top-h*.16)*ease-Math.sin(reach*Math.PI)*h*.14,38*scale);
          ctx.strokeStyle='#91bd67';ctx.lineWidth=2*scale;
          for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x+(i-1)*22*scale,y+7*scale,(14+age*12+i*6)*scale,4*scale,0,0,Math.PI*2);ctx.stroke();}
        }else if(scene==='city'){
          const carX=w*.03+(x-w*.03)*ease+(age>2?(age-2)*w*.55:0);
          visitor('car',carX,y+10*scale,54*scale);
          ctx.strokeStyle='#fff2c8';ctx.lineWidth=2*scale;ctx.setLineDash([4*scale,5*scale]);
          ctx.beginPath();ctx.moveTo(w*.03,y+27*scale);ctx.lineTo(Math.min(carX,w),y+27*scale);ctx.stroke();
        }else if(scene==='space'){
          const sx=w*(x<w/2?.22:.78),sy=h*.17;
          ctx.strokeStyle='#fff0b2';ctx.lineWidth=1.5*scale;ctx.setLineDash([4*scale,7*scale]);ctx.lineDashOffset=-age*16;
          ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(x,sy,x,top);ctx.stroke();ctx.setLineDash([]);
          for(let i=0;i<4;i++){const a=age*1.5+i*Math.PI/2,px=x+Math.cos(a)*30*scale,py=top+Math.sin(a)*17*scale;ctx.fillStyle='#fff2b6';ctx.beginPath();ctx.moveTo(px,py-6*scale);ctx.lineTo(px+2*scale,py-2*scale);ctx.lineTo(px+6*scale,py);ctx.lineTo(px+2*scale,py+2*scale);ctx.lineTo(px,py+6*scale);ctx.lineTo(px-2*scale,py+2*scale);ctx.lineTo(px-6*scale,py);ctx.lineTo(px-2*scale,py-2*scale);ctx.closePath();ctx.fill();}
        }else if(scene==='animal'){
          const bx=w*.85+(x-w*.85)*ease+Math.sin(age*3)*10*scale,by=h*.24+(top-h*.24)*ease;
          ctx.translate(bx,by);const wing=(.45+Math.abs(Math.sin(age*13))*.55)*scale;
          for(const side of [-1,1]){ctx.fillStyle=side<0?'#edac72':'#f5cd79';ctx.beginPath();ctx.ellipse(side*8*wing,-3*scale,10*wing,13*scale,side*.35,0,Math.PI*2);ctx.fill();}
          ctx.fillStyle='#8b6249';ctx.beginPath();ctx.ellipse(0,0,2*scale,9*scale,0,0,Math.PI*2);ctx.fill();
        }else{
          for(let i=0;i<5;i++){const a=i*1.3+age*1.6,px=x+Math.cos(a)*(18+age*8)*scale,py=top+Math.sin(a)*14*scale;ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.fillStyle=i%2?'#9dc785':'#ead58c';ctx.beginPath();ctx.ellipse(0,0,7*scale,3*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();}
        }
        ctx.restore();
      }
    }
    return {background,ambience,respond,reactions,resetResponses};
  }
  window.SandplayWorld={create};
})();
