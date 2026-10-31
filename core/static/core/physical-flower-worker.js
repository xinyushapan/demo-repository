/* Lightweight real-flower tracking, independent of the slower OpenCV catalog. */
importScripts('physical-flower.js?v=1');
let ready=false;
self.onmessage=async event=>{
  const message=event.data;
  try{
    if(message.kind==='init'){
      const catalog=await(await fetch('toys/physical/catalog.json')).json();
      for(const photo of catalog.photos){
        const image=await createImageBitmap(await(await fetch(photo.reference)).blob());
        const canvas=new OffscreenCanvas(240,Math.round(240*image.height/image.width)),ctx=canvas.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();
        if(!PhysicalFlower.learn(ctx.getImageData(0,0,canvas.width,canvas.height)))throw Error('实拍花朵参考未能建立');
      }
      ready=true;postMessage({kind:'ready',count:PhysicalFlower.count()});
    }else if(message.kind==='frame'&&ready){
      const started=performance.now(),image=message.image;
      const items=PhysicalFlower.detect(image).map(item=>({...item,x:(item.x+item.w/2)/image.width,y:(item.y+item.h/2)/image.height,box:{x:item.x/image.width,y:item.y/image.height,w:item.w/image.width,h:item.h/image.height}}));
      postMessage({kind:'result',items,elapsed:performance.now()-started,epoch:message.epoch});
    }
  }catch(error){postMessage({kind:'error',message:error.message||String(error)});}
};
