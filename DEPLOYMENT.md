# 部署指南

## ⚠️ 重要说明

本项目使用 Next.js Custom Server + Socket.IO，**不能部署到 Vercel**！

Vercel 的限制：
- 不支持 Custom Server
- 不支持 WebSocket 长连接
- 只支持 Serverless Functions

## 🚀 推荐部署平台

### 1. Render（推荐）

#### 部署步骤：

1. **注册 Render 账号**
   - 访问 [render.com](https://render.com)
   - 使用 GitHub 登录

2. **创建 Web Service**
   - 点击 "New +" → "Web Service"
   - 连接你的 GitHub 仓库
   - 选择 `next-custom-server-websocket` 仓库

3. **配置服务**
   - **Name**: `next-chat-websocket`
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Instance Type**: 选择免费套餐

4. **环境变量**
   ```
   NODE_ENV=production
   ```

5. **部署**
   - 点击 "Create Web Service"
   - 等待构建和部署完成

### 2. Fly.io

#### 安装 Fly CLI：
```bash
# macOS
brew install flyctl

# 或使用 curl
curl -L https://fly.io/install.sh | sh
```

#### 部署步骤：

1. **登录 Fly.io**
   ```bash
   fly auth login
   ```

2. **初始化应用**
   ```bash
   fly launch
   ```
   选择：
   - App name: `next-chat-websocket`
   - Region: 选择离你最近的区域
   - 不要创建 Postgres 数据库
   - 不要创建 Redis 数据库

3. **配置 fly.toml**
   ```toml
   app = "next-chat-websocket"
   primary_region = "hkg"  # 或你选择的区域

   [build]
     [build.args]
       NEXT_TELEMETRY_DISABLED = "1"

   [env]
     PORT = "8080"
     NODE_ENV = "production"

   [http_service]
     internal_port = 8080
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0

   [[services]]
     protocol = "tcp"
     internal_port = 8080

     [[services.ports]]
       port = 80
       handlers = ["http"]

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

4. **部署**
   ```bash
   fly deploy
   ```

### 3. Railway（之前尝试过）

虽然之前遇到了问题，但 Railway 确实支持 WebSocket。如果想再试：

1. 确保删除 `railway.toml`（已删除）
2. 使用环境变量而不是硬编码端口
3. 确保 CORS 配置正确

### 4. Heroku

#### 需要的文件：

创建 `Procfile`：
```
web: pnpm start
```

#### 部署步骤：
```bash
# 安装 Heroku CLI
brew tap heroku/brew && brew install heroku

# 登录
heroku login

# 创建应用
heroku create next-chat-websocket

# 添加 buildpack
heroku buildpacks:set heroku/nodejs

# 部署
git push heroku main
```

## 📝 部署前检查清单

1. **确保生产环境配置正确**
   - [x] `NODE_ENV=production`
   - [x] 正确的端口配置（使用 `process.env.PORT`）
   - [x] CORS 配置支持生产域名

2. **优化生产构建**
   - [x] 运行 `pnpm build` 本地测试
   - [x] 确保没有构建错误

3. **WebSocket 配置**
   - [x] Socket.IO 客户端使用相对路径
   - [x] 服务器监听正确的主机名（0.0.0.0）

## 🔧 故障排查

### 502 Bad Gateway
- 检查服务器是否正确监听 `0.0.0.0:PORT`
- 确保使用环境变量 `PORT` 而不是硬编码

### WebSocket 连接失败
- 检查 CORS 配置
- 确保客户端连接地址正确
- 检查防火墙/安全组设置

### 构建失败
- 检查 Node.js 版本兼容性
- 确保所有依赖正确安装
- 查看构建日志中的具体错误

## 🌟 生产环境优化建议

1. **使用 CDN 加速静态资源**
   - Cloudflare
   - Fastly

2. **监控和日志**
   - 使用 Sentry 进行错误追踪
   - 配置日志聚合服务

3. **性能优化**
   - 启用 Gzip 压缩
   - 优化图片资源
   - 使用 Redis 做会话存储（如需要）

## 📚 相关资源

- [Render 文档](https://render.com/docs)
- [Fly.io 文档](https://fly.io/docs)
- [Socket.IO 生产部署指南](https://socket.io/docs/v4/deployment/)
- [Next.js Custom Server 文档](https://nextjs.org/docs/app/guides/custom-server) 