from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'web-export'; site=ROOT/'public-site'
pages={url:(source/name).read_text(encoding='utf-8') for url,name in [('/','index.html'),('/build/','build/index.html'),('/sandbox/','sandbox/index.html'),('/cards/','cards/index.html'),('/report/','report/index.html'),('/feedback/','feedback/index.html')]}
(site/'lib/pages.json').write_text(json.dumps(pages,ensure_ascii=False),encoding='utf-8')
(site/'public').mkdir(exist_ok=True)
for name in ['static','downloads']:
    shutil.copytree(source/name,site/'public'/name,dirs_exist_ok=True)
manifest=json.loads((site/'.openai/hosting.json').read_text())
manifest.pop('static',None)
(site/'.openai/hosting.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared the existing site for Worker hosting, retaining project identity.')

for src,name in [('core/knowledge/support.json','support.json'),('core/static/core/corpus/sandplay-corpus.json','corpus.json')]:
    (site/'lib'/name).write_text((ROOT/src).read_text(encoding='utf-8-sig'),encoding='utf-8')
