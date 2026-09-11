# 脑图宇宙

每次生成的视频方案会自动进入左侧历史记录，并可一键恢复；“知识脑图”入口会把视频标题、分镜和知识点整理成脑图；知识闪卡中的“需复习”会自动写入浏览器本地错题库，刷新页面后仍会保留。

## 部署到 Render

仓库内的 `render.yaml` 已包含 Node 构建、启动、健康检查和 SiliconFlow 云端配音配置。在 Render 选择 **New > Blueprint**，连接本仓库并填写两个 Secret：

- `DEEPSEEK_API_KEY`：DeepSeek API Key
- `IMAGE_API_KEY`：SiliconFlow API Key，同时用于图像和中文配音

部署完成后使用 Render 提供的 `onrender.com` 地址。免费实例闲置 15 分钟后会休眠，首次打开和长视频渲染可能较慢；生成的媒体文件位于临时文件系统，服务重新部署后会消失。需要长期保存视频时，应使用付费实例并挂载持久磁盘，把 `MEDIA_ROOT` 设为磁盘中的目录。

## DeepSeek 配置（当前默认）

当前项目已切换为 DeepSeek。打开 https://platform.deepseek.com/api_keys 创建密钥，在 `.env` 填写：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的DeepSeek密钥
DEEPSEEK_MODEL=deepseek-flash
DEMO_MODE=false
```

## AI 分镜图片

项目已接入独立的 SiliconFlow 图片生成接口。打开 https://cloud.siliconflow.cn/account/ak 创建 API Key，在 `.env` 填写：

```env
IMAGE_API_KEY=你的SiliconFlow密钥
IMAGE_API_BASE_URL=https://api.siliconflow.cn/v1
IMAGE_MODEL=Qwen/Qwen-Image
```

每个分镜会根据 DeepSeek 生成的 `visual_prompt` 创建一张 16:9 图片，立即下载到本机，再按旁白顺序合成视频。图片链接本身即使过期，也不会影响已经保存的视频。若某一张图片调用失败，该分镜会改用知识图卡并在页面显示提示，不会让整条视频报废。图片生成会按分镜数量单独计费，例如 6 个分镜会调用 6 次图片接口。

所有分镜图片在视频中都会持续进行缓慢推近和横向移动。渲染器会保留用户要求的总时长，并在自然语速范围内自动调整配音速度，让旁白尽量覆盖对应分镜；当旁白超过计划时长时，会自动延长分镜，避免截断语音。

中文字幕会直接烧录在 MP4 画面底部，因此使用任何播放器都能看到；MP4 内仍保留可开关字幕轨，并另外提供 SRT 和 WebVTT 文件。

默认混音让背景音乐清晰可闻，同时保持旁白可理解：旁白目标响度约 -19 LUFS，背景音乐混入比例为 0.16。可在 `server/render.js` 的最终混音参数中继续调整。

保存后重启 `npm start`（开发模式用 `npm run dev`）。旧的 OpenAI Key 不会发送给 DeepSeek；两家使用独立环境变量。DeepSeek 通过 Chat Completions JSON Output 生成 JSON，服务端再用完整 Schema 和业务规则校验，不符合要求不会更新画布。JSON Output 不等同于模型端严格 Schema 保证。测试采用替身客户端，真实连接需要填写 DeepSeek Key。

参考：[DeepSeek 官方接口文档](https://api-docs.deepseek.com/)、[JSON Output](https://api-docs.deepseek.com/guides/json_mode/)。

以下为项目通用说明；如需恢复 OpenAI，将 `AI_PROVIDER` 改为 `openai`。

# 无限脑图宇宙 · AI 视频制作 Agent

基于原始 `holographicagent.tsx` 保留 React + Tailwind CSS + lucide-react 全息界面，补齐 Node.js 后端。输入需求后，系统会用 DeepSeek 生成视频方案，再在本机生成每个分镜的知识图卡、普通话旁白和轻量背景音乐，最终合成为可播放、可下载的 1280×720 MP4，同时提供 SRT 字幕和方案 JSON。

画面采用程序生成的全息知识图解，可稳定离线合成；它不是写实 AI 绘画。图片轮播模式使用静态知识图卡，图卡动效模式添加缓慢镜头运动。配音调用 macOS 本机语音，因此当前成片功能要求在 macOS 上运行；DeepSeek 仅承担文字方案生成。

## 启动

需要 Node.js 22.12+（已用 Node.js 24 验证）。在本目录打开终端：

```sh
npm install
cp .env.example .env
```

编辑 `.env`，填写自己的 `OPENAI_API_KEY`；不要把密钥发到聊天或写入前端。默认 `OPENAI_MODEL=gpt-4o-2024-08-06`，可改为账户可用且支持 Structured Outputs 的模型。

```sh
npm run dev
```

打开 http://127.0.0.1:5173 。开发模式同时启动 React 页面与 3001 端口后端。输入主题（例如“用一分钟解释水循环，面向小学生”），选择图片轮播或图卡动效，点击发送或按 Enter。方案生成后会自动继续合成视频，完成后播放器和“下载 MP4”按钮会显示。失败保留画布，可单独重试视频合成；中文输入法确认文字不会触发发送。

不用 API Key 检查页面：在 `.env` 设置 `DEMO_MODE=true` 后重启，页面会明确显示“离线演示”，内容为示例，绝不会把 API 错误偷偷替换为假结果。正式使用恢复 `DEMO_MODE=false`。

生产式本地运行：

```sh
npm run build
npm start
```

打开 http://127.0.0.1:3001 。服务仅监听本机。开发时若修改 PORT，同时修改 vite.config.js 的代理目标。请勿直接双击 index.html。

## 关键文件

- `src/App.jsx`：保留原始全息样式，受控输入、请求锁、错误反馈、动态画布、分镜计时、测验及方案下载。
- `server/app.js`：提供方案生成、视频合成任务和进度查询接口。`GET /api/health` 只返回配置状态，不返回密钥。
- `server/render.js`：生成分镜 PNG、调用 macOS 中文语音、生成本地配乐，并用 FFmpeg 合成带字幕轨的 MP4。
- `shared/plan.js`：前后端共用 Zod Schema；分镜必须连续编号、时长总和一致、问答 3–5 道且 ID 唯一。`zodTextFormat` 将 Schema 转换为 strict JSON Schema。
- `server/index.js`：服务入口；`.env` 由 Node 在服务端加载。
- `vite.config.js`：开发代理；Tailwind 配置和 `src/style.css` 管理界面构建。
- `test/api.test.js`：使用替身 OpenAI 客户端验证成功和故障分支，不产生 API 费用。

请求示例：

```json
{"prompt":"用一分钟解释水循环，面向小学生","mode":"image"}
```

成功响应：`{ "success": true, "data": { "video": {...}, "scenes": [...], "bgm": {...}, "quiz_cards": [...] }, "provider": "openai" }`。

`video` 包含 `title/summary/mode/total_duration_seconds`；分镜包含 `index/scene_name/duration_seconds/visual_prompt/narration/knowledge_card`；知识卡片为 `title/points`；BGM 为 `style_tags/recommended_type/description`；测验为 `id/question/answer`。

错误响应：`{ "success": false, "error": "可读错误原因" }`，覆盖缺少密钥、无效输入、鉴权失败、额度限制、超时、模型拒绝、输出不完整和结构错误。

## 验证与限制

已通过：生产构建、6 组接口测试、Chrome 浏览器点击和 Enter 生成、图片/HTML 两种模式、动态标题和测验、JSON 下载、错误后保留画布与恢复按钮。未执行真实付费 OpenAI 请求。

```sh
npm test
npm run build
```

API Key 仅从服务端环境读取，前端只请求本站 `/api`。`.env` 已被忽略，静态服务仅暴露 `dist`。不记录完整 OpenAI 错误或密钥，不向浏览器转发上游原始错误。不持久化创作内容，刷新会回到示例画布；可下载 JSON 保存方案。左侧原假历史记录已移除。

真实 DeepSeek 联调需要有效 Key、账户余额和网络。成片文件保存在本机 `media/`，未上传到第三方；刷新页面后旧任务不会恢复到界面，但文件仍保留在该目录。

接口依据：[OpenAI 官方 Structured Outputs 文档](https://developers.openai.com/api/docs/guides/structured-outputs)。
