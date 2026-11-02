/* Turtle motion uses the original toy artwork and the real river's image coordinates. */
(() => {
  const river=[[0,.48],[.09,.43],[.16,.39],[.23,.35],[.24,.33],[.26,.34],[.24,.39],[.20,.42],[.16,.47],[.11,.51],[.05,.58],[0,.61]];
  function inRiver(x,y){let inside=false;for(let i=0,j=river.length-1;i<river.length;j=i++){const a=river[i],b=river[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  function water(x,y,w,h){const scale=Math.max(w/1672,h/941),dw=1672*scale,dh=941*scale;return inRiver((x*w+(dw-w)/2)/dw,(y*h+(dh-h)/2)/dh);}
  function create(){
    const jobs=new Map();
    function cancel(id){jobs.delete(id);}
    function start(p,time,w,h){jobs.set(p.id,{start:time,x:p.x,y:p.y,swim:water(p.x,p.y,w,h),prints:[]});}
    function frame(ctx,p,time,w,h,paused=false){
      let job=jobs.get(p.id);if(!job&&!paused){start(p,time,w,h);job=jobs.get(p.id);}if(!job)return null;
      const age=Math.max(0,time-job.start),duration=10.8,progress=Math.min(1,age/duration),stride=(age%2.7)/2.7;
      // Four short, slow steps; never loop a land journey.
      let x=job.x-(job.swim?.012:.075)*progress;
      if(water(x,job.y,w,h)!==job.swim)x=p.x;
      if(!paused){p.x=Math.max(.07,x);p.y=job.y;}
      if(!job.swim){
        const count=Math.min(4,Math.floor(age/2.7));
        while(job.prints.length<count){const k=job.prints.length;job.prints.push({x:job.x-.075*(k+.2)/4,y:job.y+(k%2?.012:-.012)});}
        ctx.save();ctx.fillStyle='#a8773d';ctx.globalAlpha=.22*Math.max(0,1-Math.max(0,age-17)/5);
        for(const mark of job.prints){ctx.beginPath();ctx.ellipse(mark.x*w+12,mark.y*h+2,Math.max(2,w*.0045),Math.max(1,h*.0035),-.25,0,Math.PI*2);ctx.fill();}ctx.restore();
      }
      const settled=!job.done&&age>=duration&&!paused;if(settled)job.done=true;return {swim:job.swim,phase:(job.swim||age<duration)&&!paused?Math.sin(stride*Math.PI*2):0,active:(job.swim||age<duration)&&!paused,age,settled};
    }
    function waterline(ctx,x,y,s,pose,time){
      if(!pose?.swim)return;ctx.save();ctx.translate(x,y);ctx.scale(s,s);
      for(let i=0;i<3;i++){const phase=(time*.35+i/3)%1;ctx.strokeStyle=`rgba(229,255,255,${(1-phase)*.6})`;ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(0,-10,27+phase*24,5+phase*5,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
    }
    function draw(ctx,image,area,width,height,pose){
      ctx.save();if(pose.swim){ctx.beginPath();ctx.rect(-width,-height*1.2,width*2,height*1.2-10);ctx.clip();ctx.translate(0,6);}
      const legs=[[.48,.86,.115,.14],[.82,.81,.1,.13]];
      function shape(inverse=false){ctx.beginPath();if(inverse)ctx.rect(-width/2,-height,width,height);for(const[x,y,rx,ry]of legs){ctx.moveTo((x-.5+rx)*width,(y-1)*height);ctx.ellipse((x-.5)*width,(y-1)*height,rx*width,ry*height,0,0,Math.PI*2);}ctx.clip(inverse?'evenodd':'nonzero');}
      ctx.save();shape();ctx.translate(pose.phase*1.7,pose.swim?pose.phase*.8:Math.abs(pose.phase)*-.8);ctx.drawImage(image,area.x,area.y,area.w,area.h,-width/2,-height,width,height);ctx.restore();
      ctx.save();if(pose.swim){ctx.beginPath();ctx.rect(-width,-height*1.2,width*2,height*1.04);ctx.clip();}shape(true);ctx.drawImage(image,area.x,area.y,area.w,area.h,-width/2,-height+(pose.active?Math.abs(pose.phase)*-.45:0),width,height);ctx.restore();ctx.restore();
    }
    return {start,cancel,clear:()=>jobs.clear(),frame,draw,waterline};
  }
  const api={create,water,inRiver};if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.TurtleMotion=api;
})();
