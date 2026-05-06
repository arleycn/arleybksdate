# ArleyBKS 书签导航

基于 Cloudflare Workers + Upstash Redis 的粉色系书签导航站。

### 书签导航: [https://bm.arley.cn/](https://bm.arley.cn/)
### 管理后台: [https://bm.arley.cn/admin](https://bm.arley.cn/admin)
### 404: [https://bm.arley.cn/404](https://bm.arley.cn/404)
### API调试: [https://bm.arley.cn/apihome](https://bm.arley.cn/apihome)

## 功能特点

- 🌸 粉色主题，支持深色模式
- 📱 响应式设计，适配移动端
- 🔖 两层分类结构（大分类 → 子分类 → 书签）
- 💬 网友推荐留言系统
- 🔐 管理后台（需密码登录）
- 🚀 独立 Key 存储，模块分离
- ❓ 404错误页面优雅处理（自定义404.html）
- 🛠️ API调试工具页面（apihome.html）方便开发测试

## 部署要求

- Cloudflare Workers 账号
- Upstash Redis 数据库
- 自定义域名（可选）

## GitHub 仓库结构

```plaintext
ArleyBKS/
├── README.md                # 项目说明
├── .env.example             # 环境变量示例
├── index.html               # 前台主页面
├── admin.html               # 管理后台页面
├── 404.html                 # 自定义 404 错误页面
├── apihome.html             # API 调试页面
├── css/
│   ├── admin.css            # 后台管理专用样式
│   └── main.css             # 前台主样式
├── js/
│   ├── admin.js             # 后台管理交互脚本
│   ├── main.js              # 前台交互脚本
│   └── worker.js            # Cloudflare Workers 核心代码
└── images/                  # 图片资源

```

## 环境变量

参考 `.env.example` 配置以下变量：

| 变量名 | 说明 |
|--------|------|
| REDIS_URL | Upstash Redis 连接地址 |
| REDIS_TOKEN | Upstash Redis 密码/令牌 |
| ADMIN_PASSWORD | 后台管理登录密码 |
| SITE_NAME | 站点名称（可选） |

## 预览

<img width="2550" height="1233" alt="书签导航" src="https://github.com/user-attachments/assets/fddf96e0-badb-4249-a5fa-2498ac02bb32" />

<img width="2550" height="1233" alt="404" src="https://github.com/user-attachments/assets/21288d94-29c0-41e7-bec6-e0573dd01633" />

<img width="2550" height="1233" alt="admin" src="https://github.com/user-attachments/assets/4f3f9d0e-f5a0-48bb-8e19-7f7d869eaf1d" />

<img width="2550" height="1233" alt="apihome" src="https://github.com/user-attachments/assets/67c262df-b255-4072-a3cb-7e832f153be8" />

## 许可证

MIT
