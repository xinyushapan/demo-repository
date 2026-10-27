/* Reference appearance matching in a dedicated worker. No network inference. */
let engine, detector, matcher, references=[], ready=false;
const release=(...objects)=>objects.forEach(value=>value?.delete());
function describe(gray){const keys=new engine.KeyPointVector(),desc=new engine.Mat(),mask=new engine.Mat();detector.detectAndCompute(gray,mask,keys,desc);mask.delete();return {keys,desc};}
async function reference(type,blob,custom=false){
  const bitmap=await createImageBitmap(blob),canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();
  const raw=engine.matFromImageData(context.getImageData(0,0,canvas.width,canvas.height)),gray=new engine.Mat();engine.cvtColor(raw,gray,engine.COLOR_RGBA2GRAY);
  const normalized=new engine.Mat();engine.resize(gray,normalized,new engine.Size(Math.round(gray.cols*200/gray.rows),200));
  const features=describe(normalized),templates=[];
  for(const h of [28,42,63,95,143]){const mat=new engine.Mat();engine.resize(gray,mat,new engine.Size(Math.max(8,Math.round(gray.cols*h/gray.rows)),h));templates.push(mat);}
  const mean=engine.mean(raw);release(raw,gray);
  references.push({type,custom,normalized,...features,templates,mean});
}
function overlap(a,b){const w=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)),h=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return w*h/Math.min(a.w*a.h,b.w*b.h);}
function featureMatch(ref,frame){
  if(ref.desc.rows<7||frame.desc.rows<7)return null;
  const pairs=new engine.DMatchVectorVector(),good=[];
  try{matcher.knnMatch(ref.desc,frame.desc,pairs,2);for(let i=0;i<pairs.size();i++){const pair=pairs.get(i);if(pair.size()>=2){const a=pair.get(0),b=pair.get(1);if(a.distance<.72*b.distance&&a.distance<65)good.push(a);}pair.delete();}}finally{pairs.delete();}
  if(good.length<7)return null;
  const source=[],target=[];for(const match of good){const a=ref.keys.get(match.queryIdx).pt,b=frame.keys.get(match.trainIdx).pt;source.push(a.x,a.y);target.push(b.x,b.y);}
  const src=engine.matFromArray(good.length,1,engine.CV_32FC2,source),dst=engine.matFromArray(good.length,1,engine.CV_32FC2,target),mask=new engine.Mat();let homography;
  try{
    homography=engine.findHomography(src,dst,engine.RANSAC,4,mask);
    if(homography.empty())return null;
    const inliers=Array.from(mask.data).reduce((sum,n)=>sum+n,0);if(inliers<6||inliers/good.length<.55)return null;
    const points=engine.matFromArray(4,1,engine.CV_32FC2,[0,0,ref.normalized.cols,0,ref.normalized.cols,200,0,200]),projected=new engine.Mat();
    engine.perspectiveTransform(points,projected,homography);const coords=Array.from(projected.data32F);release(points,projected);
    const xs=[coords[0],coords[2],coords[4],coords[6]],ys=[coords[1],coords[3],coords[5],coords[7]],x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
    if(!Number.isFinite(w+h)||w<16||h<20||w>480*.65||h>360*.9||x< -w*.15||y< -h*.15)return null;
    const ratio=w/h,expected=ref.normalized.cols/200;if(ratio/expected<.45||ratio/expected>2.2)return null;
    return {type:ref.type,x,y,w,h,score:Math.min(.99,.8+inliers*.008),method:'features'};
  }finally{release(src,dst,mask,homography);}
}
function scan(image){
  const rgba=engine.matFromImageData(image),gray=new engine.Mat();engine.cvtColor(rgba,gray,engine.COLOR_RGBA2GRAY);const frame=describe(gray),found=[];
  try{
    for(const ref of references){
      const match=featureMatch(ref,frame);if(match)found.push(match);
      // Scale-aware correlation supplements smooth toys that have few keypoints.
      for(const template of ref.templates){
        if(template.cols>=gray.cols||template.rows>=gray.rows)continue;
        const result=new engine.Mat();
        try{
          engine.matchTemplate(gray,template,result,engine.TM_CCOEFF_NORMED);
          for(let attempt=0;attempt<2;attempt++){
            const peak=engine.minMaxLoc(result);if(peak.maxVal<.86)break;
            const x=peak.maxLoc.x,y=peak.maxLoc.y,w=template.cols,h=template.rows,region=rgba.roi(new engine.Rect(x,y,w,h)),mean=engine.mean(region);region.delete();
            const brightness=mean[0]+mean[1]+mean[2],base=ref.mean[0]+ref.mean[1]+ref.mean[2];
            const colorError=Math.abs(mean[0]/brightness-ref.mean[0]/base)+Math.abs(mean[1]/brightness-ref.mean[1]/base)+Math.abs(mean[2]/brightness-ref.mean[2]/base);
            if(Number.isFinite(colorError)&&colorError<.15)found.push({type:ref.type,x,y,w,h,score:peak.maxVal,method:'template'});
            engine.rectangle(result,new engine.Point(Math.max(0,x-w/2),Math.max(0,y-h/2)),new engine.Point(Math.min(result.cols-1,x+w/2),Math.min(result.rows-1,y+h/2)),new engine.Scalar(-1),-1);
          }
        }finally{result.delete();}
      }
    }
    const selected=[];for(const match of found.sort((a,b)=>b.score-a.score)){if(!selected.some(other=>overlap(match,other)>.4))selected.push(match);if(selected.length===20)break;}
    return selected.map(item=>({...item,x:(item.x+item.w/2)/image.width,y:(item.y+item.h/2)/image.height,box:{x:item.x/image.width,y:item.y/image.height,w:item.w/image.width,h:item.h/image.height}}));
  }finally{release(rgba,gray,frame.keys,frame.desc);}
}
self.onmessage=async event=>{
  const message=event.data;
  try{
    if(message.kind==='init'){
      importScripts('vendor/opencv-4.10.0.js');await new Promise(resolve=>cv.then(()=>resolve()));engine=cv;detector=new engine.ORB();detector.setMaxFeatures(1200);detector.setFastThreshold(7);detector.setEdgeThreshold(8);detector.setPatchSize(21);matcher=new engine.BFMatcher(engine.NORM_HAMMING,false);
      const catalog=await(await fetch('toys/catalog.json')).json();
      for(let i=0;i<catalog.length;i++){await reference(catalog[i].id,await(await fetch(catalog[i].reference)).blob());if(i%12===0)postMessage({kind:'progress',count:i,total:catalog.length});}
      for(const saved of message.custom||[])await reference(saved.type,await(await fetch(saved.data)).blob(),true);
      ready=true;postMessage({kind:'ready',count:references.length});
    }else if(message.kind==='frame'&&ready){const started=performance.now(),items=scan(message.image);postMessage({kind:'result',items,elapsed:performance.now()-started});}
    else if(message.kind==='learn'&&ready){await reference(message.type,message.blob,true);postMessage({kind:'learned'});}
  }catch(error){postMessage({kind:'error',message:typeof error==='string'?error:(error?.message||String(error))});}
};
