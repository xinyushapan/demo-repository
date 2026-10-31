/* Deduplicate observations of the same object, never an entire toy category. */
(() => {
  'use strict';
  function sameObject(a,b){
    if(a.type!==b.type||!a.box||!b.box)return false;
    const x=Math.max(a.box.x,b.box.x),y=Math.max(a.box.y,b.box.y);
    const w=Math.max(0,Math.min(a.box.x+a.box.w,b.box.x+b.box.w)-x);
    const h=Math.max(0,Math.min(a.box.y+a.box.h,b.box.y+b.box.h)-y);
    const area=Math.min(a.box.w*a.box.h,b.box.w*b.box.h);
    return area>0&&w*h/area>.35;
  }
  function generalItems(items,physical){return items.filter(item=>!physical.some(other=>sameObject(item,other)));}
  const api={sameObject,generalItems};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else globalThis.AppearanceFusion=api;
})();
