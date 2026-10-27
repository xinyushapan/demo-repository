"""Build the recognition references and scene sprites from the supplied design sheet."""
import json
from collections import deque
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'core/static/core/toys'
OUT.mkdir(exist_ok=True)
source = Image.open(sys.argv[1]).convert('RGB')
source.save(OUT / 'reference-sheet.jpg', quality=94)
rows = [
 ('人物与关系', 42, 213, [('child','儿童',119,180),('teen','少年',182,247),('adult','成年人',252,329),('elder','老年人',329,394),('seated','坐姿人物',397,487),('curled','蜷缩人物',489,590),('companions','同伴关系',598,746)]),
 ('动物',42,213,[('dog','小狗',877,994),('cat','小猫',991,1081),('bird','小鸟',1080,1183),('rabbit','兔子',1183,1254),('turtle','乌龟',1260,1398),('fish','小鱼',1398,1514)]),
 ('自然现象',277,435,[('tree','树木',117,232),('flower','花朵',234,310),('cactus','仙人掌',311,391),('rocks','石堆',391,505),('water','水流',504,640),('volcano','火山',641,752)]),
 ('建筑与场所',277,435,[('house','家',885,985),('school','学校',988,1100),('hospital','医院',1100,1201),('tower','高塔',1201,1274),('cave','洞穴',1277,1395),('shop','商店',1396,1510)]),
 ('边界与连接',504,652,[('fence','围栏',119,203),('wall','墙壁',207,278),('gate','大门',282,376),('bridge','桥梁',376,506),('road','道路',507,608),('stairs','台阶',609,673),('entrance','入口',674,751)]),
 ('日常与学校',504,652,[('desk','书桌椅',879,997),('bed','床',997,1100),('bag','书包',1100,1197),('books','书本',1201,1300),('phone','手机',1303,1387),('food','食物',1392,1508)]),
 ('交通与移动',732,873,[('car','汽车',116,224),('bus','公交车',226,333),('bike','自行车',335,427),('train','火车',429,543),('boat','船',544,638),('plane','飞机',639,753)]),
 ('幻想与力量',732,873,[('guardian','守护者',880,998),('monster','怪兽',1000,1101),('dragon','龙',1103,1207),('king','国王',1208,1290),('hero','星星英雄',1293,1404),('magicdoor','魔法门',1405,1513)]),
 ('危险与保护',949,1099,[('shield','盾牌',124,219),('lock','锁',220,309),('brokenwall','破裂的墙',309,446),('lightning','警示闪电',448,535),('alarm','求救灯',537,629),('shelter','安全庇护所',630,753)]),
 ('抽象情绪',949,1099,[('swirl','旋涡',875,970),('splitball','分合球',971,1045),('arch','保护拱门',1045,1157),('balance','平衡石',1158,1222),('knot','纠结结',1225,1310),('heart','空心爱心',1311,1411),('mask','双面面具',1411,1515)]),
]
catalog=[]
for category,top,bottom,items in rows:
    for key,name,left,right in items:
        box=(left,top,right,bottom)
        crop=source.crop(box)
        crop.save(OUT / f'{key}-reference.jpg', quality=96)
        rgba=crop.convert('RGBA')
        # Remove only light, near-neutral backdrop; retain the saturated toy material.
        pixels=rgba.load()
        queue=deque([(x,0) for x in range(rgba.width)]+[(x,rgba.height-1) for x in range(rgba.width)]+[(0,y) for y in range(rgba.height)]+[(rgba.width-1,y) for y in range(rgba.height)])
        visited=set()
        while queue:
            x,y=queue.popleft()
            if (x,y) in visited or not (0<=x<rgba.width and 0<=y<rgba.height):
                continue
            visited.add((x,y))
            r,g,b,a=pixels[x,y]
            if min(r,g,b)>190 and max(r,g,b)-min(r,g,b)<33:
                pixels[x,y]=(r,g,b,0)
                queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
        rgba.save(OUT / f'{key}.png')
        catalog.append({'id':key,'name':name,'category':category,'box':list(box),'image':f'/static/core/toys/{key}.png','reference':f'/static/core/toys/{key}-reference.jpg'})
(OUT / 'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT / 'core/static/core/toy-catalog.js').write_text('window.SANDPLAY_TOYS = '+json.dumps(catalog,ensure_ascii=False)+';\n',encoding='utf-8')
print(f'Generated {len(catalog)} reference objects')
