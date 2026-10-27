# 心语沙盘

完整可编辑源码，包含封面、实体摄像头搭建、独立线上沙盘、六种场景、63类沙具、小语语料、DeepSeek陪伴与回顾、MiniMax语音、十种奖项反馈。

## 文件结构

- `core/`：Django模板、前端脚本、原始设计图片、沙具素材及语料。
- `config/`、`manage.py`：Django本地预览项目。
- `public-site/`：当前线上版本的 Vinext / Cloudflare Worker 服务端及完整前端静态素材。
- `public-site/lib/ai.ts`：DeepSeek接口与奖项匹配。
- `public-site/lib/speech.ts`、`transcribe.ts`：MiniMax合成与录音转文字接口。
- `scripts/export_site.py`、`prepare_ai_runtime.py`：从原始模板同步线上页面和素材。

## 上传 GitHub

1. 解压本压缩包。
2. 在 GitHub 新建仓库，把解压后的目录内容提交进去，保留目录结构和点开头的配置文件。
3. 不要只上传这个ZIP；上传解压后的源码才能在线查看和修改。
4. 不要提交自己的 API 密钥；本包的环境配置文件只有空白模板。

## 运行完整服务端

需要 Node.js 22.13或更高版本，以及 package.json 中指定版本的 pnpm。

```sh
cd public-site
pnpm install --frozen-lockfile
pnpm run build
pnpm run start
```

使用终端显示的本地网址。摄像头与麦克风需要 localhost 或 HTTPS，以及浏览器权限。
调用AI和语音时，在 `public-site/` 内把 `.dev.vars.example` 复制为 `.dev.vars`，再填写自己的密钥并重新启动。
没有密钥仍可使用本机搭建与语料；线上AI、语音服务需另外配置。

## 修改原始页面并同步线上源码

在项目根目录安装 Python 依赖后运行：

```sh
python -m venv .venv
# Windows:
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe scripts/export_site.py
.venv\Scripts\python.exe scripts/prepare_ai_runtime.py
```

再进入 `public-site` 运行构建。不要只修改生成后的 `public-site/public/static` 后又运行导出，导出会按 `core/static` 重新生成。

只预览Django页面时：`.venv\Scripts\python.exe manage.py runserver`。Django本地预览本身不提供Worker的AI接口。

## 发布与数据

GitHub仓库用于保存与协作源码，推送到GitHub不会自动更新当前网站。
`public-site/.openai/hosting.json` 保留原主网站标识；发布现有主站需要其编辑权限。复制为新网站时需使用新的站点配置。
GitHub Pages仅托管静态文件，不能运行本项目的DeepSeek或MiniMax服务端接口；完整功能需要支持Worker的部署环境。
线上服务端环境变量参考 `.dev.vars.example`，请通过部署平台的秘密变量设置密钥。

作品、草稿和对话存储在用户当前浏览器中，不是云端共享数据库。本包不含用户的沙盘记录、录音、实拍参考或数据库。
连接路线未被明确记录时显示“—”，不会用沙具种类或示例数字代替。
AI整理表达和创作回顾，不依据沙具摆放推断心理状态。

设计素材仅供本项目协作使用；字体和第三方库许可证随原文件保留。
