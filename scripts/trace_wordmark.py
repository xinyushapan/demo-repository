"""Reconstruct scalable SVG paths from the existing four-color wordmark.

Preserves source contours instead of substituting font glyphs. The source PNG
is read only; only a code-native SVG asset is written.
"""
from pathlib import Path
from collections import defaultdict
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
rgb = np.array(Image.open(ROOT / 'core/static/core/images/cover.png').convert('RGB'))[94:242, 600:1060]
values = rgb.astype(float)
high, low = values.max(axis=2), values.min(axis=2)
chroma = high - low
colored = (chroma > 65) & (high > 120)
palette = np.array([[231,39,111],[144,60,205],[244,144,0],[0,165,223]])
labels = np.argmin(((values[:,:,None,:]-palette[None,None,:,:])**2).sum(axis=3),axis=2)

def simplify(points, epsilon=.55):
    if len(points) < 3:
        return points
    a, b = np.array(points[0],float), np.array(points[-1],float)
    segment = b-a
    length = np.linalg.norm(segment)
    arr = np.array(points,float)
    distances = np.linalg.norm(arr-a,axis=1) if length == 0 else np.abs(segment[0]*(a[1]-arr[:,1])-(a[0]-arr[:,0])*segment[1])/length
    index = int(np.argmax(distances))
    if distances[index] > epsilon:
        return simplify(points[:index+1],epsilon)[:-1]+simplify(points[index:],epsilon)
    return [points[0],points[-1]]

def paths(mask):
    edges = defaultdict(list)
    height,width = mask.shape
    for y,x in zip(*np.where(mask)):
        x,y=int(x),int(y)
        if y == 0 or not mask[y-1,x]: edges[(x,y)].append((x+1,y))
        if x == width-1 or not mask[y,x+1]: edges[(x+1,y)].append((x+1,y+1))
        if y == height-1 or not mask[y+1,x]: edges[(x+1,y+1)].append((x,y+1))
        if x == 0 or not mask[y,x-1]: edges[(x,y+1)].append((x,y))
    result=[]
    while edges:
        start=next(iter(edges));current=start;points=[start]
        while current in edges:
            nxt=edges[current].pop()
            if not edges[current]: del edges[current]
            points.append(nxt);current=nxt
            if current == start:break
        if len(points)<8:continue
        split=len(points)//2
        contour=simplify(points[:split+1])+simplify(points[split:])[1:]
        area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(contour,contour[1:])))/2
        if area<3:continue
        # Use small quadratic corner arcs to avoid pixel staircase at high zoom.
        ring=contour[:-1]
        if len(ring)<3:continue
        mids=[((ring[i][0]+ring[(i+1)%len(ring)][0])/2,(ring[i][1]+ring[(i+1)%len(ring)][1])/2) for i in range(len(ring))]
        d=f'M{mids[-1][0]:g},{mids[-1][1]:g}'
        for point,mid in zip(ring,mids):d+=f'Q{point[0]},{point[1]} {mid[0]:g},{mid[1]:g}'
        result.append(d+'Z')
    return ''.join(result)

groups=[]
for i,color in enumerate(palette):
    d=paths(colored & (labels==i))
    groups.append((d,'#'+''.join(f'{int(v):02x}' for v in color)))
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 480 168" role="img" aria-label="心语沙盘">','<title>心语沙盘 · 原稿轮廓矢量字标</title>']
for stroke,width in [('#d7d7df',15),('#ffffff',12)]:
    for d,color in groups:svg.append(f'<path d="{d}" fill="white" fill-rule="evenodd" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round"/>')
for d,color in groups:svg.append(f'<path d="{d}" fill="{color}" fill-rule="evenodd"/>')
svg.append('</svg>')
out=ROOT/'core/static/core/images/wordmark.svg'
out.write_text('\n'.join(svg),encoding='utf-8')
print(f'Vector wordmark: {out.name} ({out.stat().st_size} bytes)')
