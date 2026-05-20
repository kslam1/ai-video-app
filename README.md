# AI 视频工坊 + API 中转平台

一站式 AI 短视频生成工具 + OpenAI 兼容的 API 中转服务。

## 项目结构

```
api-relay/
├── src/                  # 后端 (Cloudflare Workers)
│   ├── providers/        # API 中转 (OpenAI/Claude/DeepSeek/Kimi)
│   ├── services/         # 短视频业务 (脚本/配音/字幕/视频)
│   ├── routes/           # 路由
│   └── middleware/       # 认证/计费
├── web/                  # 前端 (React + Tailwind)
├── video-worker/         # 视频合成服务 (Docker + FFmpeg)
├── schema.sql            # 数据库结构
└── wrangler.toml         # CF Workers 配置
```

## 快速开始

### 1. 配置环境

```bash
# 安装依赖
npm install
cd web && npm install && cd ..
cd video-worker && npm install && cd ..

# 配置 API Keys (选择你有的)
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put KIMI_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put CLAUDE_API_KEY
wrangler secret put MINIMAX_API_KEY
wrangler secret put MINIMAX_GROUP_ID
```

### 2. 创建 Cloudflare 资源

```bash
# 创建 KV namespace
wrangler kv:namespace create KV
# 创建 D1 database
wrangler d1 create relay-db
# 创建 R2 bucket
wrangler r2 bucket create relay-storage

# 更新 wrangler.toml 中的 ID

# 初始化数据库
wrangler d1 execute relay-db --file=schema.sql
```

### 3. 本地开发

```bash
# 启动后端
npm run dev
# 新终端，启动前端
cd web && npm run dev
```

访问 http://localhost:5173

### 4. 部署

```bash
# 部署后端到 CF Workers
npm run deploy

# 前端构建后也可部署到 CF Pages
cd web && npm run build
# 然后用 wrangler pages deploy dist

# 视频合成服务部署到 VPS
cd video-worker
docker build -t video-worker .
docker run -d -p 3001:3001 -e RELAY_URL=https://your-worker.workers.dev video-worker
```

## API 中转使用

用户可以用标准 OpenAI SDK 直接接入：

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://your-worker.workers.dev/v1",
    api_key="sk-relay-xxxxx"
)

# 用 DeepSeek
resp = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "你好"}]
)

# 用 Claude
resp = client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello"}]
)
```

## 管理接口

```bash
# 创建 API Key
curl -X POST https://your-worker.workers.dev/admin/keys \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-user", "balance": 10}'

# 充值
curl -X POST https://your-worker.workers.dev/admin/keys/KEY_ID/recharge \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50}'
```

## 支持的模型

| 模型 | 提供商 |
|------|--------|
| gpt-4o, gpt-4o-mini, gpt-3.5-turbo | OpenAI |
| claude-sonnet-4-20250514, claude-opus-4-20250514, claude-haiku-4-20250414 | Anthropic |
| deepseek-chat, deepseek-coder, deepseek-reasoner | DeepSeek |
| moonshot-v1-8k/32k/128k | Kimi (Moonshot) |

## 短视频工具功能

- 🎬 AI 脚本生成（DeepSeek 驱动）
- 🎙️ 8 种 AI 配音音色（MiniMax TTS）
- 📝 自动字幕生成
- 🎥 一键合成视频（FFmpeg）
- 📱 支持竖屏/横屏/方屏
