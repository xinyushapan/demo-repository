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
      prepareInteraction(id,w,h,time);cover(image,w,h,0,id,time);ctx.restore();
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
    // A single deliberate action at a time; sand play leaves a small creation.
    const humans=new Set(['child','teen','adult','elder','seated','curled','companions','person']);
    const vehicles=new Set(['car','bus','bike','train','boat','plane']);
    let response=null;const creations=new Map();
    const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
    const smooth=v=>{const p=clamp(v);return p*p*(3-2*p);};
    const mix=(a,b,p)=>a+(b-a)*p;
    const labels={'feed-giraffe':'长颈鹿吃到叶子啦','feed-lion':'小狮子吃到食物啦','feed-fish':'小鱼游过来开饭啦','feed-bird':'小鸟来啄谷粒啦',castle:'小沙堡堆好啦',rings:'沙子上留下小花纹',star:'星星亮起来啦',greet:'你好呀，小世界'};
    function actions(scene,type){
      if(vehicles.has(type))return [{kind:'drive',direction:-1,label:'向左开',icon:'left'},{kind:'drive',direction:1,label:'向右开',icon:'right'}];
      if(!humans.has(type))return [];
      return {animal:[{kind:'feed-giraffe',label:'喂长颈鹿',icon:'leaf'},{kind:'feed-lion',label:'喂小狮子',icon:'food'}],ocean:[],nature:[],free:[{kind:'castle',label:'堆沙堡',icon:'castle'},{kind:'rings',label:'画沙纹',icon:'rings'}],space:[{kind:'star',label:'点亮星星',icon:'star'}],city:[{kind:'greet',label:'打个招呼',icon:'wave'}]}[scene]||[];
    }
    function respond(scene,piece,time,action){
      if(!piece)return null;const choice=action||actions(scene,piece.type).find(a=>a.kind!=='drive');if(!choice||['feed-bird','feed-fish'].includes(choice.kind))return null;
      if(!action&&response?.piece===piece.id&&time-response.start<.8)return choice.kind;
      const side=piece.x>.62?-1:1;
      response={scene,piece:piece.id,type:piece.type,x:.12+piece.x*.76,y:.40+piece.y*.49,start:time,duration:choice.kind==='drive'?1.8:5.8,side,...choice};
      if(choice.kind==='castle'||choice.kind==='rings'){
        const key=piece.id+':'+scene+':'+choice.kind,previous=creations.get(key);
        creations.set(key,{id:key,scene,kind:choice.kind,x:clamp(response.x+side*(choice.kind==='rings'?-.083:.083),.1,.9),y:response.y,level:Math.min(3,(previous?.level||0)+1),born:reducedMotion?time-6:time});
        if(creations.size>60)creations.delete(creations.keys().next().value);
      }
      if(reducedMotion)response=null;
      return choice.kind;
    }
    function live(scene,time){if(!response||response.scene!==scene||time-response.start>response.duration)return null;return response;}
    function resetResponses(){response=null;life?.setInteraction(null);}
    function cancelPiece(id){if(response?.piece===id)resetResponses();}
    function clearPlay(){creations.clear();resetResponses();}
    function savePlay(){return [...creations.values()].map(({born,...item})=>item);}
    function restorePlay(items){creations.clear();for(const item of (Array.isArray(items)?items:[]).slice(-60))if(item&&typeof item.id==='string'&&ids.includes(item.scene)&&['castle','rings'].includes(item.kind)&&Number.isFinite(item.x)&&Number.isFinite(item.y))creations.set(item.id,{...item,x:clamp(item.x,.1,.9),y:clamp(item.y,.4,.9),level:clamp(Number(item.level)||1,1,3),born:-Infinity});}
    function sourcePoint(id,w,h,x,y){const image=art.get(id),iw=image?.naturalWidth||1672,ih=image?.naturalHeight||941,s=Math.max(w/iw,h/ih);return{x:(x-(w-iw*s)/2)/s,y:(y-(h-ih*s)/2)/s};}
    function screenPoint(id,w,h,x,y){const image=art.get(id),iw=image?.naturalWidth||1672,ih=image?.naturalHeight||941,s=Math.max(w/iw,h/ih);return{x:x*s+(w-iw*s)/2,y:y*s+(h-ih*s)/2};}
    function target(r,w,h,time){
      const s=Math.min(w/700,h/410);
      if(r.kind==='feed-giraffe')return screenPoint(r.scene,w,h,687+Math.sin(time*.15)*27,153);
      if(r.kind==='feed-lion')return screenPoint(r.scene,w,h,1400,307);
      if(r.kind==='star')return screenPoint(r.scene,w,h,art.get(r.scene).naturalWidth*.31,art.get(r.scene).naturalHeight*.09);
      return{x:r.x*w+r.side*55*s,y:r.y*h-66*s};
    }
    function prepareInteraction(scene,w,h,time){const r=live(scene,time);if(!r||reducedMotion){life?.setInteraction(null);return;}const t=target(r,w,h,time);life?.setInteraction({...r,point:sourcePoint(scene,w,h,t.x,t.y)});}
    function pose(piece,time){
      const result={flip:vehicles.has(piece.type)&&piece.facing===-1,tilt:0,squash:1,bob:0};const r=response;
      if(!r||r.piece!==piece.id||time-r.start>r.duration||reducedMotion)return result;
      const a=time-r.start,envelope=Math.sin(clamp(a/r.duration)*Math.PI);
      if(r.kind==='drive'){result.bob=-Math.abs(Math.sin(a*10))*.6*envelope;return result;}
      result.tilt=r.side*Math.sin(Math.min(a/1.3,1)*Math.PI)*.055;
      if(r.kind==='castle'||r.kind==='rings'){result.squash=1-Math.abs(Math.sin(a*3.2))*.035*envelope;result.tilt=r.side*.035*envelope;}
      else result.bob=-Math.sin(a*2.8)*.9*envelope;
      return result;
    }
    function activity(scene,id,time){const r=live(scene,time);if(!r||r.piece!==id)return null;const age=time-r.start;const starts={'feed-giraffe':'送一片嫩叶过去…','feed-lion':'给小狮子送点食物…','feed-fish':'撒一点点鱼食…','feed-bird':'撒几颗小谷粒…',star:'让一颗小星星亮起来…',greet:'轻轻摇一摇，打个招呼…'};return{kind:r.kind,progress:clamp(age/r.duration),text:age>3.3?(labels[r.kind]||'慢慢停下来'):r.kind==='drive'?'出发，慢慢开…':r.kind==='castle'?'一铲一铲，堆起来…':r.kind==='rings'?'轻轻画一个圈…':(starts[r.kind]||'一起玩一会儿…')};}
    function oval(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
    function star(x,y,r,color){ctx.save();ctx.translate(x,y);ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,d=i%2?r*.45:r;ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d);}ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();}
    function leaf(x,y,s,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#72a859';ctx.beginPath();ctx.moveTo(-s,0);ctx.quadraticCurveTo(0,-s*.9,s,0);ctx.quadraticCurveTo(0,s*.9,-s,0);ctx.fill();ctx.strokeStyle='#bad387';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-s*.7,0);ctx.lineTo(s*.7,0);ctx.stroke();ctx.restore();}
    function sandShape(item,w,h,time){
      const s=Math.min(w/700,h/410),p=reducedMotion?1:smooth((time-item.born)/3.2),x=item.x*w,y=item.y*h;
      ctx.save();ctx.translate(x,y);ctx.scale(s,s);
      if(item.kind==='rings'){
        ctx.strokeStyle='#c4a56a';ctx.lineWidth=2;ctx.lineCap='round';
        for(let i=0;i<3+item.level;i++){ctx.beginPath();ctx.ellipse(0,0,13+i*7,4+i*2.3,0,-Math.PI/2,-Math.PI/2+Math.PI*2*p);ctx.stroke();ctx.strokeStyle='#fff0c5';ctx.lineWidth=.8;ctx.stroke();ctx.strokeStyle='#c4a56a';ctx.lineWidth=2;}
      }else{
        oval(0,5,37,8,'#9b79482b');ctx.translate(0,4);ctx.scale(1,.12+p*.88);
        const sand=ctx.createLinearGradient(-20,-44,30,5);sand.addColorStop(0,'#fff0c2');sand.addColorStop(.45,'#e9ca8b');sand.addColorStop(1,'#cda666');
        ctx.fillStyle=sand;ctx.beginPath();ctx.roundRect(-29,-20,58,24,5);ctx.fill();
        for(const [tx,top,width]of [[-23,-36,16],[0,-44-item.level*3,23],[23,-36,16]]){
          ctx.fillStyle=sand;ctx.beginPath();ctx.roundRect(tx-width/2,top,width,4-top,3);ctx.fill();
          for(let k=0;k<3;k++){ctx.fillStyle='#f4dda5';ctx.fillRect(tx-width/2+k*width/3,top-5,width/4,7);}
          ctx.fillStyle='#aa814e';ctx.beginPath();ctx.roundRect(tx-2.5,top+13,5,9,2.5);ctx.fill();
        }
        ctx.fillStyle='#b38b55';ctx.beginPath();ctx.roundRect(-5,-13,10,17,5);ctx.fill();
        ctx.strokeStyle='#fff2cb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-27,-17);ctx.lineTo(-12,-17);ctx.moveTo(12,-17);ctx.lineTo(27,-17);ctx.stroke();
        ctx.strokeStyle='#a78d64';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(0,-50-item.level*3);ctx.lineTo(0,-65-item.level*3);ctx.stroke();ctx.fillStyle='#ea9b83';ctx.beginPath();ctx.moveTo(1,-65-item.level*3);ctx.lineTo(15,-60-item.level*3);ctx.lineTo(1,-55-item.level*3);ctx.fill();
      }
      ctx.restore();
    }
    function playGround(scene,w,h,time){for(const item of creations.values())if(item.scene===scene)sandShape(item,w,h,time);}
    function reactions(scene,w,h,time){
      const r=live(scene,time);if(!r||reducedMotion)return;const age=time-r.start,s=Math.min(w/700,h/410),x=r.x*w,y=r.y*h;
      const fade=Math.min(1,age/.2,(r.duration-age)/.7);ctx.save();ctx.globalAlpha=fade;
      if(r.kind==='drive'){
        const p=smooth(age/1.8),distance=Math.min(.18,r.direction>0?.93-(r.x-.12)/.76:(r.x-.12)/.76-.07),end=x+r.direction*distance*.76*w*p;
        if(r.type==='boat'){ctx.strokeStyle='#f4ffff88';ctx.lineWidth=1.4*s;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(end-r.direction*(8+i*12)*s,y+4*s,(10+i*7)*s,3*s,0,0,Math.PI*2);ctx.stroke();}}
        else if(r.type==='plane'){ctx.strokeStyle='#fff3d166';ctx.lineWidth=3*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y-32*s);ctx.lineTo(end-r.direction*20*s,y-32*s);ctx.stroke();}
        else for(let i=0;i<4;i++){const q=(age*1.8+i*.24)%1;oval(end-r.direction*(18+q*27)*s,y+(3-q*8)*s,(2+q*3)*s,(1+q)*s,'#d3b57b45');}
      }else if(r.kind==='castle'||r.kind==='rings'){
        const sx=x+r.side*.083*w;
        for(let i=0;i<12;i++){const q=(age*.7+i*.083)%1;if(age>3.4)break;const px=mix(x+r.side*18*s,sx,q),py=y-13*s-Math.sin(q*Math.PI)*27*s;oval(px,py,(1+i%2*.4)*s,1.2*s,'#d7b879');}
      }else if(r.kind==='greet'){
        if(age>1){ctx.font='600 '+(13*s)+'px Microsoft YaHei';ctx.textAlign='center';ctx.fillStyle='#87653f';ctx.fillText('你好呀！',x+r.side*48*s,y-80*s);}
      }else{
        const end=target(r,w,h,time),origin={x:x+r.side*17*s,y:y-53*s};
        const rounds=r.kind==='feed-fish'?6:3;
        for(let i=0;i<rounds;i++){
          const p=clamp((age-.45-i*.34)/1.1);if(p<=0||p>=1)continue;
          const px=mix(origin.x,end.x,p),py=mix(origin.y,end.y,p)-Math.sin(p*Math.PI)*Math.min(75*s,Math.abs(end.x-origin.x)*.3+30*s),size=(1-p*.45)*s;
          if(r.kind==='feed-giraffe')leaf(px,py,8*size,p*3);
          else if(r.kind==='star')star(px,py,5*size,'#fff0b4');
          else if(r.kind==='feed-lion'){oval(px,py,6*size,4.5*size,'#ce8c6c');oval(px-3*size,py-2*size,2*size,1.5*size,'#f1c2a2');}
          else oval(px,py,2.4*size,1.8*size,'#e2b861');
        }
        if(age>1.6&&age<4.5){
          const glow=ctx.createRadialGradient(end.x,end.y,0,end.x,end.y,31*s);glow.addColorStop(0,'#fff2ad55');glow.addColorStop(1,'#fff2ad00');ctx.fillStyle=glow;ctx.fillRect(end.x-32*s,end.y-32*s,64*s,64*s);
          for(let i=0;i<3;i++){const a=age*1.2+i*2.1;star(end.x+Math.cos(a)*22*s,end.y+Math.sin(a)*14*s,3*s,'#fff2bd');}
        }
      }
      ctx.restore();
    }
    return {background,ambience,actions,respond,reactions,resetResponses,cancelPiece,pose,activity,playGround,clearPlay,savePlay,restorePlay};
  }
  window.SandplayWorld={create};
})();
