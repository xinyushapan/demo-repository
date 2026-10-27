import fs from 'node:fs';
import path from 'node:path';
const parent=path.resolve('..');
if(fs.existsSync(path.join(parent,'index.html'))&&fs.existsSync(path.join(parent,'static'))){
 const pages={};for(const [url,file] of [['/','index.html'],['/build/','build/index.html'],['/sandbox/','sandbox/index.html'],['/cards/','cards/index.html'],['/report/','report/index.html'],['/feedback/','feedback/index.html']])pages[url]=fs.readFileSync(path.join(parent,file),'utf8');
 fs.writeFileSync('lib/pages.json',JSON.stringify(pages));
 fs.mkdirSync('public',{recursive:true});fs.cpSync(path.join(parent,'static'),'public/static',{recursive:true});
}
