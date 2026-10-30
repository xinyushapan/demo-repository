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
    // Responses are chosen by both toy type and scene, never inferred emotions.
    const humans=new Set(['child','teen','adult','elder','seated','curled','companions','person']);
    const vehicles=new Set(['car','bus','bike','train','boat','plane']);
    const visitors=new Map();let responses=[];
    for(const type of ['bird','fish','rabbit']){
      const image=new Image();image.onload=()=>{
        const sample=document.createElement('canvas');sample.width=image.naturalWidth;sample.height=image.naturalHeight;
        const g=sample.getContext('2d');g.drawImage(image,0,0);const data=g.getImageData(0,0,sample.width,sample.height).data;
        let l=sample.width,r=0,t=sample.height,b=0;
        for(let y=0;y<sample.height;y++)for(let x=0;x<sample.width;x++)if(data[(y*sample.width+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
        if(r>l&&b>t)visitors.set(type,{image,x:l,y:t,w:r-l+1,h:b-t+1});
      };image.src='/static/core/toys/'+type+'.png';
    }
    function actions(scene,type){
      if(vehicles.has(type))return [{kind:'drive',direction:-1,label:'← 向左行驶'},{kind:'drive',direction:1,label:'向右行驶 →'}];
      if(humans.has(type)){
        const kinds={animal:['feed-animal','喂动物吃东西'],ocean:['feed-fish','喂小鱼吃东西'],free:['sand','一起玩沙子'],nature:['feed-bird','喂小鸟吃东西']};
        const entry=kinds[scene];return entry?[{kind:entry[0],label:entry[1]}]:[];
      }
      return [];
    }
    function respond(scene,piece,time,action){
      if(!piece)return null;
      const choice=action||actions(scene,piece.type).find(a=>a.kind!=='drive');
      if(!choice)return null;
      if(reducedMotion)return choice.kind;
      if(!action&&responses.some(r=>r.piece===piece.id&&time-r.start<.6))return choice.kind;
      responses=responses.filter(r=>r.piece!==piece.id&&r.scene===scene);
      responses.push({scene,piece:piece.id,x:.12+piece.x*.76,y:.40+piece.y*.49,start:time,duration:choice.kind==='drive'?1.8:5.5,...choice});
      responses=responses.slice(-6);return choice.kind;
    }
    function resetResponses(){responses=[];}
    function visitor(type,x,y,size,flip=false){
      const sprite=visitors.get(type);if(!sprite)return;
      const height=size*sprite.h/sprite.w;
      ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);
      // The supplied white rabbit has transparent patches in its pale fur.
      // Fill its rounded head/body behind the original texture at render time.
      if(type==='rabbit'){oval(size*.08,-height*.25,size*.30,height*.18,'#fff3df');oval(-size*.08,-height*.46,size*.36,height*.16,'#fff5e6');}
      ctx.drawImage(sprite.image,sprite.x,sprite.y,sprite.w,sprite.h,-size/2,-height,size,height);ctx.restore();
    }
    function oval(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
    function hand(x,y,side,phase,scale,sand=false){
      // A simple toy arm reaches out from the figure's shoulder, not its face.
      const tip={x:x+side*(31+phase*9)*scale,y:y-(sand?12:49)*scale};
      ctx.strokeStyle='#e9bf8b';ctx.lineWidth=9*scale;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+side*12*scale,y-53*scale);ctx.quadraticCurveTo(x+side*28*scale,y-31*scale,tip.x,tip.y);ctx.stroke();oval(tip.x,tip.y,6*scale,5*scale,'#f6d6a5');return tip;
    }
    function reactions(scene,w,h,time){
      if(reducedMotion)return;
      responses=responses.filter(r=>r.scene===scene&&time-r.start<r.duration);
      for(const r of responses){
        const age=time-r.start,scale=Math.min(w/700,h/410),x=r.x*w,y=r.y*h;
        const side=r.x>.63?-1:1,phase=(Math.sin(age*4)+1)/2;
        ctx.save();ctx.globalAlpha=Math.min(1,age/.2,(r.duration-age)/.6);
        if(r.kind==='drive'){
          const progress=Math.min(1,age/1.8),travel=Math.min(w*.1368,(r.direction>0?.93-(r.x-.12)/.76:(r.x-.12)/.76-.07)*w*.76);
          const end=x+r.direction*travel*progress;
          ctx.strokeStyle='#fff1b9';ctx.lineWidth=2*scale;ctx.setLineDash([6*scale,5*scale]);ctx.beginPath();ctx.moveTo(x,y+6*scale);ctx.lineTo(end,y+6*scale);ctx.stroke();ctx.setLineDash([]);
          for(let i=0;i<3;i++)oval(end-r.direction*(18+i*10)*scale,y+(2+i*3)*scale,(5-i)*scale,2*scale,'#ebd3a580');
        }else if(r.kind==='sand'){
          const tip=hand(x,y,side,phase,scale,true),sx=x+side*55*scale;
          // A little mound, bucket and scoop form a visible sand-play sequence.
          oval(sx,y+7*scale,35*scale,8*scale,'#bba16d35');
          ctx.fillStyle='#efd39c';ctx.beginPath();ctx.moveTo(sx-27*scale,y+5*scale);ctx.quadraticCurveTo(sx,y-(12+phase*7)*scale,sx+27*scale,y+5*scale);ctx.fill();
          ctx.strokeStyle='#c09b5e';ctx.lineWidth=1.5*scale;
          for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(sx,y+5*scale,(9+i*7)*scale,Math.PI*1.1,Math.PI*1.9);ctx.stroke();}
          ctx.fillStyle='#e7a56c';ctx.beginPath();ctx.moveTo(x-side*35*scale,y-20*scale);ctx.lineTo(x-side*59*scale,y-20*scale);ctx.lineTo(x-side*55*scale,y+3*scale);ctx.lineTo(x-side*39*scale,y+3*scale);ctx.closePath();ctx.fill();
          ctx.strokeStyle='#b8784c';ctx.lineWidth=2*scale;ctx.beginPath();ctx.arc(x-side*47*scale,y-20*scale,10*scale,Math.PI,0);ctx.stroke();
          ctx.strokeStyle='#77b8bd';ctx.lineWidth=4*scale;ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(sx,y-4*scale);ctx.stroke();oval(sx,y-2*scale,8*scale,4*scale,'#77b8bd');
          for(let i=0;i<8;i++){const q=(age*.8+i*.13)%1;oval(sx+(i-4)*3*scale,y-7*scale+q*12*scale,1.3*scale,1.3*scale,'#c8a361');}
        }else{
          const tip=hand(x,y,side,phase,scale),targetX=x+side*78*scale;
          const arrive=Math.min(1,age/1.1),ease=arrive*arrive*(3-2*arrive),eating=age>1.1;
          const fish=r.kind==='feed-fish',bird=r.kind==='feed-bird',targetY=y-(fish?38:0)*scale;
          const from=side>0?w*1.03:-w*.03,animalX=from+(targetX-from)*ease;
          const bite=eating?Math.sin(age*9)*2*scale:0;
          visitor(fish?'fish':bird?'bird':'rabbit',animalX,targetY+bite,(fish?49:bird?39:63)*scale,fish?side<0:side>0);
          // Food visibly leaves the hand and lands beside the animal's mouth.
          if(eating)for(let i=0;i<5;i++){
            const q=(age*.8+i*.2)%1,fx=tip.x+(targetX-side*17*scale-tip.x)*q,fy=tip.y+(targetY-14*scale-tip.y)*q-Math.sin(q*Math.PI)*18*scale;
            oval(fx,fy,(fish?2.3:3.2)*scale,2*scale,fish?'#e5bb69':bird?'#d7aa62':'#eda158');
          }
          if(!fish){oval(targetX-side*18*scale,y+3*scale,18*scale,5*scale,'#dba867');oval(targetX-side*18*scale,y+1*scale,14*scale,3*scale,'#f4cf87');}
          else for(let i=0;i<3;i++){const q=(age*.4+i*.3)%1;ctx.strokeStyle='#eaffff';ctx.lineWidth=1.2*scale;ctx.beginPath();ctx.arc(targetX+side*i*11*scale,targetY-q*52*scale,(2+i)*scale,0,Math.PI*2);ctx.stroke();}
        }
        ctx.restore();
      }
    }
    return {background,ambience,actions,respond,reactions,resetResponses};
  }
  window.SandplayWorld={create};
})();
