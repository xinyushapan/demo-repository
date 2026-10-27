(() => {
 'use strict';if(!document.body.classList.contains('online-mode'))return;
 const $=s=>document.querySelector(s),panel=$('.scene-panel'),library=$('.simulation'),select=$('.toy-category');
 // Reuse the same companion, six scenes and toy world in a spacious online layout.
 for(const selector of ['#xiaoyu-speech','.mascot-friends'])panel.append($(selector));
 $('.simulation-title h3').textContent='沙具小口袋';$('.simulation>p').textContent='点一下放入，或拖进沙盘。';
 $('#input-source-note').textContent='点击选中 · 拖动摆放 · 方向键微调 · Delete移除';
 $('.stage-top span:first-child').textContent='✦ 我的小世界';$('.stage-top span:last-child').textContent='鼠标自由搭建';$('#world-canvas').setAttribute('aria-label','线上沙盘大画布，可以拖动沙具自由摆放');
 $('#sample-world').textContent='先摆一个小示例';$('#world-empty').innerHTML='小世界，等你来搭建<br><small>从左边选一件喜欢的沙具吧</small>';
 const tools=document.createElement('div');tools.className='online-library-tools';
 const label=document.createElement('label');label.className='online-search';const search=document.createElement('input');search.type='search';search.placeholder='找一找小摆件';search.maxLength=40;search.setAttribute('aria-label','搜索当前分类的沙具');label.append(search);
 const categories=document.createElement('div');categories.className='online-categories';categories.setAttribute('aria-label','沙具分类');
 for(const option of select.options){const button=document.createElement('button');button.type='button';button.textContent=option.value==='全部沙具'?'全部':option.value;button.dataset.category=option.value;button.onclick=()=>{select.value=option.value;search.value='';select.dispatchEvent(new Event('change'));update();};categories.append(button);}
 tools.append(label,categories);library.insertBefore(tools,$('#toy-list'));
 const empty=document.createElement('p');empty.className='online-search-empty';empty.textContent='这类里还没找到，换个词或看看其他分类吧。';empty.hidden=true;library.insertBefore(empty,$('#toy-list').nextSibling);
 function update(){for(const button of categories.children)button.setAttribute('aria-pressed',String(button.dataset.category===select.value));const query=search.value.trim();let count=0;for(const button of $('#toy-list').children){button.hidden=!!query&&!button.textContent.includes(query);if(!button.hidden)count++;}empty.hidden=count>0;}
 search.oninput=update;select.addEventListener('change',update);update();
 // Keep companion copy meaningful without requiring a camera in the online world.
 $('#camera-message').textContent='线上沙盘可以直接使用鼠标搭建。';
})();
