(() => {
  const dialog = document.querySelector('#records-dialog');
  document.querySelector('#close-records').onclick = () => dialog.close();
  document.querySelector('#open-records').onclick = () => {
    const list = document.querySelector('#record-list');
    list.replaceChildren();
    let records;
    try { records = JSON.parse(localStorage.getItem('heart-sand-records') || '[]'); if (!Array.isArray(records)) records = []; }
    catch { records = []; }
    if (!records.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = '还没有作品。先去搭一个属于你的小世界吧。'; list.append(p); }
    records.slice().reverse().forEach(record => {
      const row = document.createElement('div'); row.className = 'record';
      const icon = document.createElement('span'); icon.className = 'record-icon'; icon.textContent = '🏝️';
      const info = document.createElement('div'); const title = document.createElement('strong'); title.textContent = record.name || '我的小世界';
      const date = document.createElement('p'); date.textContent = `${new Date(record.savedAt).toLocaleString('zh-CN')} · ${Array.isArray(record.pieces) ? record.pieces.length : 0} 件沙具`;
      info.append(title,date); const open = document.createElement('button'); open.textContent = '继续搭建';
      open.onclick = () => { location.href = `${record.mode==='online'?'/sandbox/':'/build/'}?record=${encodeURIComponent(record.id)}`; };
      row.append(icon,info,open); list.append(row);
    });
    let reports=[];try{reports=JSON.parse(localStorage.getItem('xinyu-reports')||'[]');if(!Array.isArray(reports))reports=[];}catch{}
    if(reports.length){const heading=document.createElement('h3');heading.textContent='我的沙盘回顾';list.append(heading);for(const report of reports.slice().reverse()){const row=document.createElement('div');row.className='record';const title=document.createElement('span');title.textContent=report.title||'我的沙盘故事';const button=document.createElement('button');button.textContent='查看回顾';button.onclick=()=>location.href='/report/?id='+encodeURIComponent(report.id);row.append(title,button);list.append(row);}}
    dialog.showModal();
  };
})();
