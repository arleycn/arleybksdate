# ArleyBKS 书签导航

基于 Cloudflare Pages + Workers + Upstash Redis 的粉色系书签导航站。

### 书签导航: [https://bm.arley.cn/](https://bm.arley.cn/)
### 搜索页: [https://bm.arley.cn/search](https://bm.arley.cn/search)
### 管理后台: [https://bm.arley.cn/admin](https://bm.arley.cn/admin)
### 404: [https://bm.arley.cn/404](https://bm.arley.cn/404)

## 功能特点

### 主站功能
- 🌸 樱花主题，支持深色模式
- 📱 响应式设计，适配移动端
- 🔖 两层分类结构（大分类 → 子分类 → 书签）
- 🖱️ 整张书签卡片可点击，支持键盘操作（Tab + Enter/空格）
- 📌 分类导航吸顶：下滑后随时切换分类，无需返回顶部
- 💬 网友推荐留言系统（需审核）
- 🔐 管理后台（需密码登录）
- 🚀 API 同源化：前端与接口同域名，边缘缓存 + 降级保护
- ⚡ 全站 WebP 图片 + Brotli 压缩，首屏传输体积约为 4.x 版本的三分之一
- ❓ 404 错误页面优雅处理（自定义 404.html + 缺链反馈收集）

### 搜索页功能
- 🔍 聚合搜索引擎（百度/Google/Bing/搜狗/360/DuckDuckGo/Yandex/头条搜索）
- 🕐 实时时钟显示（日期/时间/星期）
- 📌 用户自定义标签（快捷方式）
  - 支持添加/删除/重置标签
  - 网站图标自动获取（favicon.im，国内可用）
  - 标签按用户隔离存储
- 🔐 用户注册/登录功能
- 👤 每个用户独立标签数据（互不干扰）
- 🔑 Token 登录态管理（7天自动过期）
- 👀 未登录用户可浏览默认标签（只读）
- ✏️ 登录后可自由增删改标签

## 技术架构

### 部署
- **静态托管**: Cloudflare Pages（自定义缓存规则 + `_headers` 安全响应头）
- **API**: Cloudflare Worker，路由绑定 `bm.arley.cn/api/*`（同源直连，失败时阻断）
- **数据库**: Upstash Redis

### 存储结构
| Redis Key | 内容 |
|---|---|
| `menu` | 分类导航 |
| `bookmarks` | 书签数据 |
| `messages` | 留言数据 |
| `quicklinks` | 快捷链接（推荐模块） |
| `siteinfo` | 网站设置 |
| `404feedbacks` | 404 反馈 |
| `404stats` | 404 统计 |
| `user:{username}` | 用户信息 |
| `tabs:{username}` | 用户标签数据 |

### 前端
- 纯原生 HTML/CSS/JavaScript，无构建步骤
- CSS 分层：`base.css`（设计令牌 + 通用件）+ 页面专属样式（`home` / `search` / `admin`）
- CSS 变量主题切换（白天/黑夜）
- 静态资源带 `?v=` 版本号破缓存

## 部署要求

- Cloudflare Pages + Workers 账号
- Upstash Redis 数据库
- 自定义域名（可选）

## 环境变量

参考 `.env.example` 配置以下变量：

| 变量名 | 说明 |
|--------|------|
| UPSTASH_REST_URL | Upstash Redis 连接地址 |
| UPSTASH_REST_TOKEN | Upstash Redis 密码/令牌 |
| ADMIN_PASSWORD | 后台管理登录密码 |
| FRONTEND_URL | 前端域名（CORS 跨域配置） |

## GitHub 仓库结构

```plaintext
ArleyBKS/
├── README.md                # 项目说明
├── .env.example             # 环境变量示例
├── _headers                 # Cloudflare Pages 响应头（后台防收录/防嵌入）
├── index.html               # 前台主页面（书签导航）
├── search.html              # 搜索页（聚合搜索 + 标签）
├── admin.html               # 管理后台页面
├── 404.html                 # 自定义 404 错误页面
├── favicon.ico              # 站点图标
├── css/
│   ├── base.css             # 设计令牌 + 四页共用样式
│   ├── home.css             # 首页专属样式
│   ├── search.css           # 搜索页专属样式
│   └── admin.css            # 后台管理专属样式
├── js/
│   ├── main.js              # 前台交互脚本
│   ├── search.js            # 搜索页交互脚本
│   ├── admin.js             # 后台管理交互脚本
│   └── worker.js            # Cloudflare Worker 核心代码
├── images/                  # 图片资源（WebP 为主）
├── oldbookmarks/            # 旧版书签页存档
└── smbm.html                # 独立小页面
```

## 预览

<img width="2550" height="1233" alt="书签导航" src="https://github.com/user-attachments/assets/fddf96e0-badb-4249-a5fa-2498ac02bb32" />

<img width="2550" height="1233" alt="404" src="https://github.com/user-attachments/assets/21288d94-29c0-41e7-bec6-e0573dd01633" />

<img width="2550" height="1233" alt="admin" src="https://github.com/user-attachments/assets/4f3f9d0e-f5a0-48bb-8e19-7f7d869eaf1d" />

## 许可证

MIT
