# 🚀 部署和使用指南

## 📋 目录

1. [架构说明](#架构说明)
2. [部署步骤](#部署步骤)
3. [客户使用方式](#客户使用方式)
4. [常见问题](#常见问题)

---

## 🏗️ 架构说明

整个系统分为 3 个组件：

```
┌─────────────────────────────────────────────────────────┐
│                      用户访问                            │
│                  https://app.yourdomain.com              │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────▼──────────┐
         │   前端 (CF Pages)     │
         │   React + Tailwind   │
         └───────────┬──────────┘
                     │
         ┌───────────▼──────────────────────────┐
         │   后端 API (CF Workers)               │
         │   - API 中转 (OpenAI/Claude/...)     │
         │   - 短视频业务逻辑                    │
         │   - 用户认证/计费                     │
         └───────────┬──────────────────────────┘
                     │
         ┌───────────▼──────────────────┐
         │  视频合成服务 (VPS + Docker)  │
         │  FFmpeg 视频渲染              │
         └──────────────────────────────┘
```

**为什么需要 3 个组件？**
- **前端**：用户看到的网页界面
- **后端**：处理业务逻辑，调用 AI API
- **视频服务**：CF Workers 不能跑 FFmpeg，需要单独服务器

---

## 🚀 部署步骤

### 准备工作

1. **注册 Cloudflare 账号**：https://dash.cloudflare.com
2. **准备一台 VPS**（用于视频合成）：
   - 推荐：腾讯云轻量服务器 2C4G（¥50/月）
   - 或 DigitalOcean Droplet $12/月
3. **获取 API Keys**：
   - DeepSeek：https://platform.deepseek.com （必需，用于脚本生成）
   - MiniMax：https://platform.minimaxi.com （必需，用于配音）
   - OpenAI/Claude/Kimi：可选，用于 API 中转

---

### 第一步：部署后端 API

```bash
cd /home/plusgo/plusgo/hyu/api-relay

# 1. 安装 Wrangler CLI
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 创建 KV namespace（键值存储）
wrangler kv:namespace create KV
# 输出示例：id = "abc123..."
# 复制这个 ID

# 4. 创建 D1 database（数据库）
wrangler d1 create relay-db
# 输出示例：database_id = "def456..."
# 复制这个 ID

# 5. 创建 R2 bucket（文件存储）
wrangler r2 bucket create relay-storage
```

**编辑 `wrangler.toml`**，填入上面的 ID：

```toml
[[kv_namespaces]]
binding = "KV"
id = "abc123..."  # 替换成你的 KV ID

[[d1_databases]]
binding = "DB"
database_name = "relay-db"
database_id = "def456..."  # 替换成你的 D1 ID

[[r2_buckets]]
binding = "R2"
bucket_name = "relay-storage"
```

**配置 API Keys**：

```bash
# 必需
wrangler secret put DEEPSEEK_API_KEY
# 输入你的 DeepSeek API Key

wrangler secret put MINIMAX_API_KEY
# 输入你的 MiniMax API Key

wrangler secret put MINIMAX_GROUP_ID
# 输入你的 MiniMax Group ID

# 可选（如果要做 API 中转）
wrangler secret put OPENAI_API_KEY
wrangler secret put CLAUDE_API_KEY
wrangler secret put KIMI_API_KEY

# 管理员密钥（用于创建用户 API Key）
wrangler secret put ADMIN_SECRET
# 输入一个强密码，比如：admin-secret-xyz123
```

**初始化数据库**：

```bash
wrangler d1 execute relay-db --file=schema.sql
```

**部署**：

```bash
npm run deploy
```

部署成功后会显示：
```
Published api-relay
  https://api-relay.your-name.workers.dev
```

**记下这个地址**，后面要用。

---

### 第二步：部署视频合成服务

SSH 登录到你的 VPS：

```bash
ssh root@your-server-ip

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 创建工作目录
mkdir -p /opt/video-worker
cd /opt/video-worker

# 上传代码（方式1：直接复制）
# 把本地的 video-worker 目录内容上传到服务器

# 或者（方式2：从 Git 拉取）
git clone https://github.com/your-repo/api-relay.git
cd api-relay/video-worker

# 构建 Docker 镜像
docker build -t video-worker .

# 运行容器（替换成你的 Workers 地址）
docker run -d \
  --name video-worker \
  --restart always \
  -p 3001:3001 \
  -e RELAY_URL=https://api-relay.your-name.workers.dev \
  video-worker

# 查看日志
docker logs -f video-worker
```

**配置后端连接视频服务**：

```bash
# 回到本地，配置视频服务地址
wrangler secret put VIDEO_WORKER_URL
# 输入：http://your-server-ip:3001
```

重新部署后端：

```bash
npm run deploy
```

---

### 第三步：部署前端网站

```bash
cd /home/plusgo/plusgo/hyu/api-relay/web

# 构建
npm run build
```

**方式 A：部署到 Cloudflare Pages（推荐）**

```bash
wrangler pages deploy dist --project-name=video-app
```

部署后得到：`https://video-app.pages.dev`

**方式 B：部署到 Vercel（更简单）**

1. 访问 https://vercel.com
2. 导入 GitHub 仓库
3. 设置构建命令：`cd web && npm run build`
4. 设置输出目录：`web/dist`
5. 点击部署

---

### 第四步：绑定自定义域名（可选）

**Cloudflare Pages**：
1. 进入 Pages 项目设置
2. Custom domains → Add domain
3. 输入 `app.yourdomain.com`
4. 按提示添加 DNS 记录

**Vercel**：
1. 项目设置 → Domains
2. 添加域名
3. 按提示配置 DNS

---

## 👥 客户使用方式

### 场景 1：终端用户（自媒体博主）

**他们不需要部署任何东西**，直接访问你的网站：

```
https://app.yourdomain.com
```

**使用流程**：

1. **注册账号**
   - 打开网站 → 点击"登录" → 切换到"注册"
   - 输入邮箱和密码
   - 自动赠送 3 次免费生成

2. **创建视频**
   - 点击"创建视频"
   - 输入选题，比如："5 个提升工作效率的方法"
   - AI 自动生成脚本（可编辑）
   - 选择配音风格（8 种音色）
   - 点击"开始生成"

3. **下载视频**
   - 等待 1-2 分钟
   - 预览视频
   - 点击"下载视频"
   - 直接发布到抖音/小红书

**定价**：
- 免费：每天 1 次
- 标准版：¥29/月，50 条视频
- 专业版：¥99/月，不限次数

---

### 场景 2：开发者用户（API 中转）

**他们也不需要部署**，只需要一个 API Key。

**你给他们创建 API Key**：

```bash
curl -X POST https://api-relay.your-name.workers.dev/admin/keys \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name": "客户A", "balance": 100}'

# 返回：
# {
#   "id": "uuid-xxx",
#   "key": "sk-relay-abc123...",
#   "balance": 100
# }
```

**他们的使用方式**：

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api-relay.your-name.workers.dev/v1",
    api_key="sk-relay-abc123..."  # 你给他们的 key
)

# 调用 DeepSeek
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "你好"}]
)

# 调用 Claude
response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello"}]
)
```

**定价**：按 token 计费，自动从余额扣除。

---

## ❓ 常见问题

### Q1: 视频生成失败怎么办？

**检查视频服务是否运行**：
```bash
ssh root@your-server-ip
docker logs video-worker
```

如果看到错误，重启容器：
```bash
docker restart video-worker
```

### Q2: 如何充值用户余额？

```bash
curl -X POST https://api-relay.your-name.workers.dev/admin/keys/USER_ID/recharge \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50}'
```

### Q3: 如何查看用户用量？

```bash
curl https://api-relay.your-name.workers.dev/admin/keys/USER_ID/usage \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

### Q4: 前端如何连接后端？

前端已经配置了代理（`web/vite.config.ts`），开发时自动转发到 `localhost:8787`。

生产环境需要修改 `web/src/lib/api.ts` 的 `BASE` 变量：

```typescript
const BASE = 'https://api-relay.your-name.workers.dev';
```

### Q5: 成本大概多少？

**每月固定成本**：
- VPS（视频服务）：¥50/月
- Cloudflare Workers：免费（10万请求/天内）
- Cloudflare Pages：免费
- 域名：¥50/年

**变动成本**（按用量）：
- DeepSeek API：¥1/百万 token（脚本生成）
- MiniMax TTS：¥0.1/千字（配音）
- Cloudflare R2：$0.015/GB（存储）

**示例**：生成 1000 条视频
- 脚本：1000 × 300字 × ¥1/100万 ≈ ¥0.3
- 配音：1000 × 300字 × ¥0.1/1000 ≈ ¥30
- 存储：1000 × 5MB × $0.015/GB ≈ $0.07
- **总计**：约 ¥31

### Q6: 如何接入支付？

**国内**：接入微信支付或支付宝
- 参考文档：https://pay.weixin.qq.com/wiki/doc/api/

**海外**：接入 Stripe
- 参考文档：https://stripe.com/docs

在 `src/routes/` 下新建 `payment.ts`，处理支付回调。

---

## 🎯 总结

**你需要做的**：
1. 部署 3 个组件（后端 + 前端 + 视频服务）
2. 配置 API Keys
3. 绑定域名
4. 接入支付（可选）

**客户需要做的**：
- **终端用户**：访问网站 → 注册 → 创建视频 → 下载
- **开发者**：拿到 API Key → 用 OpenAI SDK 调用

**你的收入来源**：
- 终端用户：按月订阅或按次付费
- 开发者：按 token 用量计费

就这么简单！🎉
