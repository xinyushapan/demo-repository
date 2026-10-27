/* Original photograph remains the fixed eye-white layer. Only the original
 * pupil pixels are lifted into independent moving textures. No white shapes. */
(async () => {
  const scene=document.querySelector('.cover-scene'),image=document.querySelector('.cover-art');
  if(!scene||!image)return;
  try{await image.decode();}catch{return;}
  const W=1931,H=814;
  const source=document.createElement('canvas');source.width=W;source.height=H;
  const original=source.getContext('2d',{willReadFrequently:true});original.drawImage(image,0,0,W,H);
  const pixels=original.getImageData(0,0,W,H).data;
  const cleanImage=new Image();cleanImage.src='/static/core/images/cover-eye-clean-plate.png';
  const houseImage=new Image();houseImage.src='/static/core/images/cover-house-clean.png';
  try{await Promise.all([cleanImage.decode(),houseImage.decode()]);}catch{return;}
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;canvas.className='cover-eyes';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d'),patch=document.createElement('canvas');patch.width=W;patch.height=H;
  const fixed=patch.getContext('2d');
  // sx,sy,source radii,white center,rotation,movement ranges.
  const specs=[
    [250,191,36,37,234,179,28,15,22],[340,227,38,37,331,219,28,15,20],
    [193,412,20,24,168,423,24,17,17],[245,451,17,22,230,463,24,12,15],
    [222,686,22,24,210,697,-15,17,18],[298,665,18,21,313,665,-15,17,18],
    [566,455,14,15,561,459,9,6,5],[602,449,14,15,600,451,9,5,5],
    [572,614,18,20,561,624,-24,11,12],[622,635,19,20,611,643,-24,11,11],
    [914,588,38,36,907,583,0,20,19],[1017,586,37,36,1021,583,0,20,19],
    [1410,151,12,13,1410,155,10,4,4],[1447,158,12,13,1445,161,10,4,4],
    [1619,239,20,25,1640,241,-24,15,13],[1698,194,23,28,1721,201,-22,17,15],
    [1708,521,25,25,1723,523,-18,15,12],[1781,494,27,28,1800,496,-18,15,13],
    [1357,579,20,21,1369,585,-24,13,10],
    [1626,718,25,29,1649,742,-24,14,20],[1701,682,29,33,1734,705,-24,18,23],
  ];
  const outlines = [
    'M258 115L282 158C294 178 286 210 270 226C251 247 219 244 198 230C179 217 175 195 182 174C190 150 223 127 258 115Z',
    'M382 155C392 180 391 207 382 234C372 262 350 282 325 281C301 282 279 270 275 251C269 231 276 209 291 192C309 174 350 166 382 155Z',
    'M171 383C191 384 208 404 210 423C210 447 193 464 173 466C150 468 130 456 126 438C121 416 135 388 155 384Z',
    'M238 429C254 433 263 449 260 468C259 488 248 500 232 502C212 505 198 490 198 474C194 453 208 430 222 428Z',
    'M203 656C224 653 244 666 248 686C254 705 248 727 230 733C208 742 186 731 177 714C165 694 174 664 194 659Z',
    'M301 626C324 621 344 638 350 656C357 679 345 696 326 702C307 708 287 695 280 676C271 654 280 635 295 629Z',
    'M558 442C568 439 579 448 578 459C578 470 570 477 560 476C549 475 543 467 544 458C544 450 549 444 558 442Z',
    'M598 435C607 433 615 439 616 449C618 459 611 467 602 468C593 469 584 463 584 454C582 445 588 437 598 435Z',
    'M549 596C564 589 582 599 588 615C595 631 587 648 574 652C559 658 543 648 537 633C531 618 535 602 549 596Z',
    'M606 614C623 613 637 626 639 642C641 654 629 670 616 670C600 670 587 661 584 646C581 631 591 617 606 614Z',
    'M877 532C897 528 926 529 943 532C953 534 960 553 962 577C964 603 953 630 935 638C914 648 891 638 877 625C860 612 854 594 855 574C855 552 863 536 877 532Z',
    'M986 532C1004 529 1040 529 1054 532C1069 535 1073 553 1075 574C1078 600 1069 624 1053 634C1035 645 1009 639 993 627C977 614 971 595 971 573C971 551 975 536 986 532Z',
    'M1407 140C1416 138 1423 145 1424 153C1426 164 1420 170 1411 170C1402 170 1396 165 1396 157C1395 149 1400 141 1407 140Z',
    'M1443 147C1452 146 1458 153 1459 160C1460 168 1454 175 1446 175C1438 175 1432 169 1432 162C1431 155 1436 148 1443 147Z',
    'M1624 204C1640 199 1657 209 1668 223C1678 236 1679 250 1669 264C1659 277 1640 282 1625 273C1611 265 1602 252 1601 237C1599 223 1609 209 1624 204Z',
    'M1701 157C1721 151 1741 161 1753 177C1767 195 1765 214 1751 230C1735 248 1712 251 1697 238C1684 226 1677 207 1678 191C1677 176 1689 163 1701 157Z',
    'M1683 509L1744 486C1753 502 1761 520 1761 534C1760 548 1750 558 1737 560C1717 564 1699 555 1689 540C1682 530 1680 519 1683 509Z',
    'M1758 481L1830 455C1838 474 1841 498 1835 514C1830 531 1818 538 1805 538C1787 536 1769 525 1762 510C1756 498 1754 487 1758 481Z',
    'M1351 559C1367 551 1387 557 1396 570C1406 586 1399 603 1385 611C1370 618 1351 613 1343 602C1335 587 1337 568 1351 559Z',
    'M1620 690C1634 685 1651 693 1665 710C1680 730 1694 758 1688 776C1684 793 1666 799 1649 793C1625 787 1611 767 1605 745C1600 730 1601 715 1605 704C1608 697 1613 692 1620 690Z',
    'M1716 648C1737 641 1757 653 1768 671C1781 692 1791 723 1786 744C1781 763 1767 773 1751 768C1725 762 1707 737 1691 713C1674 698 1672 684 1678 672C1680 658 1696 648 1716 648Z',
    'M861 696C867 696 870 702 870 708C870 714 865 719 861 719C857 719 853 714 854 707C854 700 857 696 861 696Z',
    'M879 696C885 696 889 701 889 707C889 714 884 719 879 719C874 718 871 713 871 707C871 700 874 696 879 696Z',
  ];
  const eyes=[];
  for(const [index,spec] of specs.entries()){
    const [sx,sy,rx,ry,cx,cy,angle,mx,my]=spec;
    const x0=sx-rx-3,y0=sy-ry-3,w=rx*2+7,h=ry*2+7;
    const mask=new Uint8Array(w*h),inside=new Uint8Array(w*h);
    const socket=new Path2D(outlines[index]);
    // Separate the connected dark pupil from highlights and surrounding fur.
    let seed=-1,nearest=Infinity;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const gx=x+x0,gy=y+y0,k=(gy*W+gx)*4,dx=(gx-sx)/rx,dy=(gy-sy)/ry;
      if(dx*dx+dy*dy>1.05)continue;
      if(index===2&&gy<375+(gx-174)*.58+7)continue;
      if(index===3&&gy<419+(gx-241)*.75+7)continue;
      if(index===16&&gy<507-(gx-1688)*21/56+3)continue;
      if(index===17&&gy<477-(gx-1766)*22/64+3)continue;
      if(Math.max(pixels[k],pixels[k+1],pixels[k+2])<130){inside[y*w+x]=1;const d=dx*dx+dy*dy;if(d<nearest){nearest=d;seed=y*w+x;}}
    }
    const queue=[];if(seed>=0){queue.push(seed);mask[seed]=1;}
    for(let n=0;n<queue.length;n++){const k=queue[n],x=k%w,y=Math.floor(k/w);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,j=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&inside[j]&&!mask[j]){mask[j]=1;queue.push(j);}}}
    // Fill specular holes within each scanline, then include the soft black edge.
    for(let y=0;y<h;y++){let l=w,r=-1;for(let x=0;x<w;x++)if(mask[y*w+x]){l=Math.min(l,x);r=x;}if(r>=l)for(let x=l;x<=r;x++)mask[y*w+x]=1;}
    const solid=mask.slice();
    const lifted=original.getImageData(x0,y0,w,h);
    for(let p=0;p<solid.length;p++)lifted.data[p*4+3]=solid[p]?255:0;
    const texture=document.createElement('canvas');texture.width=w;texture.height=h;texture.getContext('2d').putImageData(lifted,0,0);
    eyes.push({texture,socket,cx,cy,mx,my,w,h,rx,ry,angle:angle*Math.PI/180,x:0,y:0});
  }
  // The edited PHOTO supplies a seamless fixed eye texture, including the
  // original irregular silhouette and contact shadows. A soft perimeter blends
  // outside the eye into the untouched photograph; no vector white is painted.
  const photographicMask=document.createElement('canvas');photographicMask.width=W;photographicMask.height=H;
  const pm=photographicMask.getContext('2d');pm.fillStyle='#fff';pm.strokeStyle='#fff';pm.lineWidth=18;pm.lineJoin='round';
  for(const d of outlines){const shape=new Path2D(d);pm.fill(shape);pm.stroke(shape);}
  fixed.drawImage(cleanImage,0,0,W,H);fixed.globalCompositeOperation='destination-in';fixed.filter='blur(3px)';fixed.drawImage(photographicMask,0,0);fixed.filter='none';fixed.globalCompositeOperation='source-over';
  const houseMask=document.createElement('canvas');houseMask.width=W;houseMask.height=H;
  const hm=houseMask.getContext('2d');hm.fillStyle='#fff';hm.filter='blur(2px)';hm.fillRect(847,692,48,33);
  const housePatch=document.createElement('canvas');housePatch.width=W;housePatch.height=H;
  const hp=housePatch.getContext('2d');hp.drawImage(houseImage,0,0,W,H);hp.globalCompositeOperation='destination-in';hp.drawImage(houseMask,0,0);fixed.drawImage(housePatch,0,0);
  scene.append(canvas);canvas.dataset.eyeCount=eyes.length;
  let pointer=null,frame=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function draw(){frame=0;ctx.clearRect(0,0,W,H);ctx.drawImage(patch,0,0);const rect=scene.getBoundingClientRect();let moving=false;
    for(const eye of eyes){let tx=0,ty=0;if(pointer){const dx=(pointer.x-rect.left)*W/rect.width-eye.cx,dy=(pointer.y-rect.top)*H/rect.height-eye.cy,d=Math.hypot(dx,dy);if(d){const strength=Math.min(1,d/200);tx=dx/d*eye.mx*strength;ty=dy/d*eye.my*strength;}}
      const ease=reduced.matches?1:.18;eye.x+=(tx-eye.x)*ease;eye.y+=(ty-eye.y)*ease;if(Math.abs(tx-eye.x)+Math.abs(ty-eye.y)>.03)moving=true;
      ctx.save();ctx.clip(eye.socket);ctx.translate(eye.cx+eye.x,eye.cy+eye.y);ctx.scale(1-.16*Math.abs(eye.x)/eye.mx,1-.2*Math.abs(eye.y)/eye.my);ctx.filter="blur(.3px)";ctx.drawImage(eye.texture,-eye.w/2,-eye.h/2);ctx.restore();
    }canvas.dataset.gaze=pointer?`${pointer.x},${pointer.y}`:'rest';if(moving)frame=requestAnimationFrame(draw);
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);},reset=()=>{pointer=null;schedule();};
  window.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;pointer={x:e.clientX,y:e.clientY};schedule();},{passive:true});
  document.documentElement.addEventListener('pointerleave',reset);window.addEventListener('blur',reset);window.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});draw();
})().catch(()=>{});
