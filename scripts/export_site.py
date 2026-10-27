"""Export the browser-only Django prototype for HTTPS static hosting."""
import os
from pathlib import Path
import shutil
import sys
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.template.loader import render_to_string

OUT = ROOT / 'web-export'
OUT.mkdir(parents=True, exist_ok=True)
for template, target in [('core/home.html', 'index.html'), ('core/build.html', 'build/index.html'), ('core/cards.html', 'cards/index.html'), ('core/report.html', 'report/index.html'), ('core/feedback.html', 'feedback/index.html')]:
    destination = OUT / target
    destination.parent.mkdir(parents=True, exist_ok=True)
    html = render_to_string(template)
    if '{%' in html or '{{' in html:
        raise ValueError(f'Unrendered template in {target}')
    destination.write_text(html, encoding='utf-8')
(OUT / 'sandbox').mkdir(exist_ok=True)
(OUT / 'sandbox/index.html').write_text(render_to_string('core/build.html', {'online_mode': True}), encoding='utf-8')
shutil.copytree(ROOT / 'core/static/core', OUT / 'static/core', dirs_exist_ok=True)

guide = '''# 心语沙盘 · 可编辑网站源码

这是公开网站的前端源码和服务端接口源码。只预览页面可以使用 Python 静态服务器；DeepSeek 和 MiniMax 接口需要运行 server-source 中的 Sites/Vinext 服务端。密钥只能配置到服务端环境变量。

## 在电脑上运行

1. 解压源码包；再下载 /downloads/xinyu-award-assets.zip 并解压到同一个目录（保留 static/core/awards 路径）。奖励设计素材单独打包，以适配网站发布大小限制。
2. 如果电脑已安装 Python，在解压目录打开终端，执行：
   python -m http.server 8080
3. 用 Chrome 或 Edge 访问 http://localhost:8080/ 。
4. 保持终端运行。按 Ctrl+C 停止。

不要直接双击 HTML 文件：摄像头和静态资源需要通过本地 HTTP 或线上 HTTPS 地址使用。

## 修改哪些文件

- index.html：封面文字与布局结构。
- build/index.html：摄像头和数字沙盘页面结构。
- sandbox/index.html：独立线上大画布；无需摄像头，可从沙具口袋点击或拖入、移动、保存、完成回顾。
- static/core/sandbox.css、sandbox.js：线上沙盘的暖黄色立体界面、分类搜索与小语位置。
- static/core/cover.css：封面排版。
- static/core/build-theme.css：圆点背景、角色和场景插画样式。
- static/core/split-view.css：左右同屏布局。
- static/core/build.js：场景切换、沙具摆放、远近缩放、数字沙盘和保存。
- static/core/scene-world.js：六种环境图、柔和粒子与场景过渡。
- static/core/scene-life.js：背景树木随风、长颈鹿迈步、小鱼游动、车辆、流星与光效，不加入作品记录。
- static/core/scenes/：内置 image_gen 工具生成的六种毛绒/玩具环境图，PROMPTS.md 记录提示词。固定视角，不是可漫游三维模型。
- static/core/camera.js：摄像头连接和诊断。
- static/core/sandplay-ai.js：复用主站摄像头结果的小语粉色角色气泡、语料提问、确认与可选语音。
- static/core/corpus/：63 类摆件对话语料；corpus-map.js 将主站沙具ID映射到语料标签。
- static/core/appearance.js：摄像头连续外观匹配、跟踪、纠正和实拍参考。
- static/core/appearance-worker.js：OpenCV ORB 特征及多尺度模板匹配，在 Web Worker 中运行。
- static/core/toys/：按项目设计图整理的 63 种沙具参考、造型和目录。
- static/core/images/：设计图片、矢量字标和可缩放云朵气泡。
- static/core/fonts/：本地站酷快乐体与OFL许可证，仅用于小语气泡。

用 VS Code 等文本编辑器修改并保存，刷新浏览器查看。
修改源码不会自动修改已发布的网站，需要把修改后的整个网站目录重新发布。

## 数据说明

沙盘作品只保存在当前浏览器的本地存储里，不跨电脑同步。
首次连接摄像头时确认数据说明；同意后自动每15秒最多发送一张完整画面压缩图给DeepSeek，不上传整段视频，也不把图像保存在本应用数据库。镜头须只拍沙盘；仅本机预览选项不发送数据，关闭摄像头后停止发送。
连接摄像头后自动开启参考图外观匹配，同步沙具类型与画面相对位置；暂停后可手动搭建。
这是基于参考图的局部特征与模板匹配，不是已训练的多角度实物分类模型。没有用实际沙具测量识别率。外观差异大、遮挡或角度变化时会漏认、误认，可点击识别框纠正，或框选补充实拍参考。
实拍参考仅存当前浏览器，可在识别设置中清除；每次最多保存最近 25 张。坐标尚未做实体沙盘透视标定。
操作记录支持时间、位置、来源和 JSON 导出，随作品保存在当前浏览器中。
表达伙伴“小语”已接入63类本机语料，连续稳定的摄像头匹配会触发对应提问；小语就是左下角粉色角色，识别后的语料在角色旁短气泡显示。进入页面即出现，无独立开启陪伴按钮。回应默认可用本机语料；在连接或首次文字流程同意数据说明后，经服务端调用DeepSeek，结合摆放记录与有来源的倾听知识回应。感受只来自用户表达，不从摆件或外貌推断情绪。
识别库 OpenCV 4.10.0 的许可证见 static/core/vendor/opencv-LICENSE.txt。参考图只用于本项目。

声音改用MiniMax服务端语音合成，返回MP3播放，不再回退到浏览器朗读。密钥未配置时显示待配置，文字陪伴仍正常；配置方法见MiniMax语音配置.md。首次联网说明包含将小语台词发送给MiniMax，音频是AI合成；不向MiniMax发送摄像头。另行使用“说一说”并同意说明后，本次录音会发送给MiniMax转成文字，最多60秒，可取消不发送。

源码包含项目设计素材，仅用于本项目协作；素材权属由项目方负责确认。
'''
(ROOT / 'public-site' / 'README.md').write_text(guide, encoding='utf-8')
downloads = OUT / 'downloads'
downloads.mkdir(exist_ok=True)
archive = downloads / 'xinyu-sandplay-source.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED, strict_timestamps=False) as bundle:
    for source in OUT.rglob('*'):
        if source.is_file() and downloads not in source.parents and not (OUT/'static/core/awards') in source.parents:
            bundle.write(source, source.relative_to(OUT))
    for folder in ['app','worker','lib','scripts']:
        for source in (ROOT/'public-site'/folder).rglob('*'):
            if source.is_file():
                bundle.write(source,Path('server-source')/source.relative_to(ROOT/'public-site'))
    for name in ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','vite.config.ts','tsconfig.json','postcss.config.mjs']:
        source=ROOT/'public-site'/name
        if source.exists():bundle.write(source,Path('server-source')/name)
    bundle.write(ROOT/'public-site/.openai/hosting.json','server-source/.openai/hosting.json')
    for name in ['AI接入说明.md','MiniMax语音配置.md']:
        if (ROOT/name).exists():bundle.write(ROOT/name,name)
    bundle.writestr('README.md', guide)
print(f'Exported {OUT}; source bundle {archive.stat().st_size:,} bytes')

with ZipFile(downloads/'xinyu-award-assets.zip', 'w', ZIP_DEFLATED) as assets:
    for source in (OUT/'static/core/awards').glob('*.png'):
        assets.write(source, source.relative_to(OUT))
print('Award assets packaged separately.')
