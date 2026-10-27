/* Blink by deforming the original painted eyes and eyelids. No added eye artwork. */
(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),actors=[];
 const reference=new Image(),yellowMask=new Image();let frame=0,disposed=false;
 const configs=[
  {selector:'.mascot-triangle',rect:[537,44,200,168],eyes:[[81,98,28,28],[130,102,23,25]],delay:1800},
  {selector:'.mascot-yellow',rect:[300,837,166,160],eyes:[[64,72,29,31],[111,72,28,31]],delay:3300,yellow:true},
  {selector:'.mascot-purple',rect:[1080,847,408,170],eyes:[[170,79,43,40],[250,80,43,40]],delay:4600}
 ];
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function paint(actor,closure){
  if(Math.abs(closure-actor.last)<.002)return;actor.last=closure;
  const {width:w,height:h}=actor.canvas,source=actor.source.data,out=new Uint8ClampedArray(source);
  if(closure>.001)for(const[cx,cy,rx,ry]of actor.config.eyes){
   const skinRow=Math.max(0,Math.floor(cy-ry-7));
   for(let x=Math.max(0,Math.floor(cx-rx-2));x<Math.min(w,cx+rx+2);x++){
    const dx=(x-cx)/(rx+1.5),half=(ry+1.5)*Math.sqrt(Math.max(0,1-dx*dx));if(!half)continue;
    const top=cy-half,bottom=cy+half,lid=top+closure*(bottom-top),skin=(skinRow*w+x)*4;
    for(let y=Math.max(0,Math.floor(top-1));y<Math.min(h,Math.ceil(bottom+1));y++){
     const at=(y*w+x)*4,dy=(y-cy)/(ry+1.5),edge=smooth((1-dx*dx-dy*dy)*15),cover=smooth((lid-y+1.2)/2.4)*edge;
     if(cover<=0)continue;
     const roundness=Math.max(0,1-dx*dx),highlight=1+.045*roundness*Math.max(0,1-(y-top)/Math.max(1,2*half));
     const seam=Math.exp(-Math.pow((y-lid)/1.25,2))*.17*closure;
     for(let c=0;c<3;c++){const material=source[skin+c]*highlight*(1-seam);out[at+c]=source[at+c]*(1-cover)+material*cover;}
    }
   }
  }
  actor.context.putImageData(new ImageData(out,w,h),0,0);actor.element.dataset.blink=closure>.5?'closed':'open';
 }
 function tick(now){
  frame=0;if(disposed||document.hidden||reduced.matches){actors.forEach(a=>paint(a,0));return;}
  for(const actor of actors){
   if(now<actor.next){paint(actor,0);continue;}
   const elapsed=now-actor.next,duration=280;
   if(elapsed>duration){paint(actor,0);actor.next=now+3800+Math.random()*4100;continue;}
   const phase=elapsed/duration,closure=phase<.38?smooth(phase/.38):phase<.48?1:1-smooth((phase-.48)/.52);
   paint(actor,closure*.98);
  }
  frame=requestAnimationFrame(tick);
 }
 function resume(){cancelAnimationFrame(frame);frame=0;if(disposed||document.hidden||reduced.matches){actors.forEach(a=>paint(a,0));return;}const now=performance.now();actors.forEach((a,i)=>a.next=now+1800+i*1400);frame=requestAnimationFrame(tick);}
 async function init(){
  try{reference.src='/static/core/images/build-reference.png';yellowMask.src='/static/core/images/yellow-detail-mask.svg';await Promise.all([reference.decode(),yellowMask.decode()]);
   for(const config of configs){const element=document.querySelector(config.selector);if(!element)continue;const canvas=document.createElement('canvas');canvas.width=config.rect[2];canvas.height=config.rect[3];canvas.className='mascot-original-motion';canvas.setAttribute('aria-hidden','true');const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)continue;
    if(config.yellow){const gradient=context.createLinearGradient(0,0,canvas.width,canvas.height);gradient.addColorStop(0,'#ffe967');gradient.addColorStop(1,'#ffdb16');context.fillStyle=gradient;context.fillRect(0,0,canvas.width,canvas.height);const detail=document.createElement('canvas');detail.width=canvas.width;detail.height=canvas.height;const d=detail.getContext('2d');d.drawImage(reference,...config.rect,0,0,canvas.width,canvas.height);d.globalCompositeOperation='destination-in';d.drawImage(yellowMask,0,0,canvas.width,canvas.height);context.drawImage(detail,0,0);}else context.drawImage(reference,...config.rect,0,0,canvas.width,canvas.height);
    const actor={element,canvas,context,config,source:context.getImageData(0,0,canvas.width,canvas.height),last:-1,next:performance.now()+config.delay};actors.push(actor);element.append(canvas);element.classList.add('has-original-motion');paint(actor,0);
   }
   resume();
  }catch{/* Keep original CSS artwork if a canvas or asset cannot load. */}
 }
 document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);
 window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(frame);});window.addEventListener('pageshow',()=>{disposed=false;resume();});
 void init();
})();
