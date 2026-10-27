# DeepSeek 接入与沙盘回顾

主站仍是原 Sites 项目，现使用服务端 Worker/Vinext 处理 /api/ai/chat、vision、report。密钥仅保存为 Sites 运行时 secret，未写入任何源码或下载包。前端不直连 DeepSeek。

## 已实现

- 63类语料和有来源的倾听参考，结合本次摆放事件、本人表达、最近对话调用 DeepSeek。
- 进入搭建页后小语自动出现并陪伴，无需点击开启。首次连接摄像头或发送文字时，将数据处理说明并入该流程；同意后连接摄像头即自动识别，每15秒最多发送一张完整摄像头画面的压缩JPEG，长边不超过640像素，不再要求手动框选。镜头须只对准沙盘，避免拍摄人脸、身体和个人信息。选择仅本机预览则不发送数据，仍有本机语料陪伴。连续两次置信度至少0.75才同步；连续三次未看见才移除。AI识别需要核对，不具备实物训练识别率或物理坐标标定保证。
- 摄像头原本的本机外观匹配仍可用；AI看沙盘启动时暂停它，避免重复对象。关闭摄像头、暂停AI、离开页面均停止后续采样。
- 小语仍使用左下角角色和气泡，增加气泡内打字；不新增独立聊天面板。
- 完成并回顾进入 /report/：数字沙盘截图、客观操作、本人表达、对话、可选AI辅助总结。支持修改本人表达、下载JSON、打印为PDF及删除。
- 不根据摄像头中的人脸/身体、摆件种类、颜色、位置推断心理状态。不做情绪打分、心理诊断或疗效评估。未表达的感受不会由AI补写。

## 配置

生产环境：在 Sites 的环境变量/secret 设置中配置，之后重新发布原站点：
- DEEPSEEK_API_KEY：设为 secret。
- DEEPSEEK_MODEL：deepseek-flash（DeepSeek 当前官方文档支持图像和JSON输出的型号，可由维护者修改）。
- XINYU_AI_ENABLED：1 开启；0 暂停。
- AI_USER_HOURLY_LIMIT：每个来源每小时上限，默认40。
- AI_GLOBAL_HOURLY_LIMIT：默认120。
限流是每个运行实例的内存保护，不是跨实例的严格费用上限。建议另外在服务商控制台设置账户额度；规模化使用前迁移到集中限流、身份和费用管理。不要把密钥发到聊天、网页表单或提交到Git。

官方接口：https://api.deepseek.com/chat/completions
官方接入：https://api-docs.deepseek.com/quick_start/
图像接口：https://api-docs.deepseek.com/guides/vision/

## 本地运行完整AI版

下载并解压源码包。需要 Node.js 22.13+ 和 pnpm 11.25+：
1. 进入 server-source，执行 pnpm install。
2. 创建仅本机使用的 .dev.vars（不要提交）：填入上面的三个必需变量。
3. 执行 pnpm build，然后 pnpm start，打开终端显示的本机网址。
只运行 Python 静态HTTP/Django页面预览时没有远程AI接口，页面继续支持本机语料和本机回顾，不会冒充AI已连接。

## 原项目更新

在 Django模板、core/static、core/knowledge 修改。依次执行：
.venv\Scripts\python.exe scripts\export_site.py
.venv\Scripts\python.exe scripts\prepare_ai_runtime.py
在 public-site 执行官方 Sites build-site.mjs，再沿用原项目ID打包发布。
web-export 是生成的静态预览和下载文件；public-site/public 是运行时资产；public-site/lib/pages.json 是生成的网页文本；public-site/lib/ai.ts 是服务端接口。

## 知识和验证边界

参考为 UNICEF 的倾听与非评判沟通、WHO 心理急救中的尊重和不强迫表达原则，来源见 core/knowledge/support.json。这是小型检索参考与行为规范，不是心理咨询训练、专业资质、完整治疗知识库或经过临床验证的系统。项目还需要儿童心理专业人员审核内容，以及真实沙具的识别与坐标校准测试。
应用不保存传给供应商的摄像头图片到数据库，但供应商会依其服务条款处理请求。对话和报告留在当前浏览器，不跨设备同步。

## MiniMax声音

小语的声音已改为独立MiniMax语音合成：服务端`/api/speech/synthesize`返回MP3，客户端按实际播放驱动嘴巴。配置与状态边界见`MiniMax语音配置.md`。没有密钥时仅文字陪伴，不回退到旧浏览器音色。
