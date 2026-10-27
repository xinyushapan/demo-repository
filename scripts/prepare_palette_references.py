"""Cut per-label appearance references from the supplied multi-view sheets."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
site = ROOT / 'sites/xinyu-palette-copy/dist'
corpus = json.loads((site / 'ai-corpus/sandplay-corpus.json').read_text(encoding='utf-8'))
index = json.loads((site / 'ai-corpus/vision-reference-index.json').read_text(encoding='utf-8'))
out = site / 'static/core/vision-references'
out.mkdir(exist_ok=True)
counts = {category['id']:len(category['items']) for category in corpus['categories']}
refs = []
for entry in index['categories']:
    sheet = Image.open(site / 'ai-corpus' / entry['source_sheet']).convert('RGB')
    # The supplied sheets have three columns centered at ~23%, 50%, and 77%.
    columns = [.09, .365, .635, .92]
    n = counts[entry['category_id']]
    row = entry['row_index']
    for col, view in enumerate(entry['views']):
        box = (round(columns[col]*sheet.width),round(row/n*sheet.height),round(columns[col+1]*sheet.width),round((row+1)/n*sheet.height))
        crop=sheet.crop(box)
        crop.thumbnail((240,240))
        filename=f"{entry['label_id']}-{view}.jpg"
        crop.save(out / filename,quality=92)
        refs.append({'id':entry['label_id'],'name':entry['name'],'view':view,'reference':f'/static/core/vision-references/{filename}','templates':col==0,'source_sheet':entry['source_sheet'],'source_box':list(box)})
(out/'catalog.json').write_text(json.dumps(refs,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Prepared {len(refs)} references for {len(index["categories"])} corpus labels')
