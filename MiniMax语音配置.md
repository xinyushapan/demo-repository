# 小语自然语音：MiniMax

主站已准备独立语音合成接口，DeepSeek继续负责回答，MiniMax负责把小语的台词生成MP3。已经替换浏览器朗读代码；没有密钥时显示“自然语音待配置”，不会声称已经换好声音。

2026年10月26日连接状态：密钥已保存为主站secret；首次请求返回余额不足1008。用户充值后通过主站重新请求，成功返回200/audio-mpeg，生成93,876字节的真实试听文件。当前MiniMax已启用；最终音色是否符合设计需求仍由试听确认。

## 现在需要做的一步

1. 打开 https://platform.minimaxi.com/ ，登录或注册 MiniMax 开放平台账号。
2. 在平台的 API 密钥管理中创建密钥，确认账号有可用的语音合成额度。
3. 打开本项目的 `.env.minimax.local`，在 `MINIMAX_API_KEY=` 后粘贴密钥，保存文件。不要填在文件评论或聊天里。
4. 回复“MiniMax已保存”。维护者会将密钥存入主站的运行时secret，重新发布并生成试听，核对真正的音色和语调。

国内站密钥使用 `MINIMAX_REGION=cn`；国际站 platform.minimax.io 的密钥使用 `global`。两个站点的密钥不要混用。

## 服务端配置

- `MINIMAX_API_KEY`：secret，必需。
- `XINYU_SPEECH_ENABLED=1`：配置密钥后才开启。
- `MINIMAX_REGION=cn`：仅允许国内或国际官方域名，不接受客户端提供的接口地址。
- `MINIMAX_SPEECH_MODEL=speech-2.8-hd`。
- `MINIMAX_VOICE_ID=Chinese (Mandarin)_Warm_Girl`：温暖少女系统音色，作为首次试听起点；还未实际试听，不保证就是最终方案。后续可换为官方音色目录里的柔和或卡通声音。

服务端设置自然语速0.98、原始音高、fluent语气和短句停顿；提及危险或明确难受时用calm，避免强制欢快表演。这里控制的是小语声音的表现，不是判断用户的情绪。

所有配置改动需重新部署已保存的主站版本。不要写进源码、网页或下载包。本机完整运行时，可把上述变量设置在 `public-site/.dev.vars` 或下载包的 `server-source/.dev.vars`，不要提交。

## 数据与验证

首次连接/文字交互说明包含MiniMax：朗读时只发送小语即将说出的台词；用户另行使用“说一说”并了解说明后，将本次录音发送给MiniMax转文字。不向MiniMax发送摄像头画面或整个对话记录。台词可能包含用户故事中的内容，因此需了解并同意。仅本机陪伴、关闭语音、离开页面会停止后续语音请求/播放。应用不在服务端保存台词或音频；响应no-store，音频仅保存在当前页面内存并及时释放。

接口每次最多400字，限制并发和调用频率。限流是运行实例内存保护，不是跨实例的严格消费上限。浏览器可能限制自动有声播放，遇到此情况会提示点击现有“听小语说”按钮，不新增独立陪伴面板。

已通过模拟接口与播放事件测试，不代表真实音色已通过试听。真实生成、延迟、额度和音色可用性要等密钥配置后验证。

官方参考：
- https://platform.minimax.io/docs/api-reference/speech-t2a-http
- https://platform.minimax.io/docs/faq/system-voice-id
- https://github.com/MiniMax-AI/skills/blob/main/skills/frontend-dev/scripts/minimax_tts.py （官方国内/国际接口域名）

## 语音输入修复

不再依赖浏览器SpeechRecognition识别服务。点击“说一说”后通过麦克风录音，最多60秒，点击“结束并发送”后经主站转发给MiniMax asr-1.0，返回文字后交给小语回应。录音期间不播放TTS；取消、关闭气泡或离开页面不上传未完成的录音，释放麦克风。原始录音不写入应用数据库、源码包或本机记录；转写文字作为用户表达进入本次对话。权限和识别错误在原气泡内显示。

官方接口文档：https://platform.minimax.cn/docs/api-reference/speech-to-text 。国内使用api.minimax.cn，国际使用api.minimax.io；密钥仍只在服务端复用。

真实验证：第27版发布后，公开合成问候WAV经主站转发MiniMax asr-1.0，成功返回200与中文转写；非真实用户录音。语音识别可能出现同音词误写，不保证逐字准确。
