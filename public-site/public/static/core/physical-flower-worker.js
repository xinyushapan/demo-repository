/* Fast local tracking for calibrated physical toys, independent of OpenCV. */
importScripts('physical-vision.js?v=1','physical-flower.js?v=2','physical-tree.js?v=1');
const models={flower:PhysicalFlower,tree:PhysicalTree};
let ready=false;
self.onmessage=async event=>{
  const message=event.data;
  try{
    if(message.kind==='init'){
      const catalog=await(await fetch('toys/physical/catalog.json?v=3')).json();
      for(const photo of catalog.photos){
        const image=await createImageBitmap(await(await fetch(photo.reference)).blob());
        const canvas=new OffscreenCanvas(240,Math.round(240*image.height/image.width)),ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();
        if(!models[photo.type]?.learn(ctx.getImageData(0,0,canvas.width,canvas.height)))throw Error('实拍参考未能建立：'+photo.type);
      }
      ready=true;postMessage({kind:'ready',count:Object.values(models).reduce((n,m)=>n+m.count(),0),types:Object.keys(models).filter(type=>models[type].count()>0)});
    }else if(message.kind==='frame'&&ready){
      const started=performance.now(),image=message.image;
      const items=Object.values(models).flatMap(model=>model.detect(image)).map(item=>({...item,x:(item.x+item.w/2)/image.width,y:(item.y+item.h/2)/image.height,box:{x:item.x/image.width,y:item.y/image.height,w:item.w/image.width,h:item.h/image.height}}));
      postMessage({kind:'result',items,elapsed:performance.now()-started,epoch:message.epoch});
    }
  }catch(error){postMessage({kind:'error',message:error.message||String(error)});}
};
