# Arley's 书签导航

基于 Cloudflare Workers + Upstash Redis 的粉色系书签导航站。

## 功能特点

- 🌸 粉色主题，支持深色模式
- 📱 响应式设计，适配移动端
- 🔖 两层分类结构（大分类 → 子分类 → 书签）
- 💬 网友推荐留言系统
- 🔐 管理后台（需密码登录）
- 🚀 独立 Key 存储，模块分离

## 部署要求

- Cloudflare Workers 账号
- Upstash Redis 数据库
- 自定义域名（可选）

## GitHub 仓库结构

- bookmark-nav/
- ├── README.md           # 项目说明
- ├── .env.example        # 环境变量示例
- ├── .gitignore          # 忽略敏感文件
- ├── index.html          # 前台
- ├── admin.html          # 后台
- ├── worker.js           # Worker 代码
- └── images/             # 图片资源
-     ├── bg.jpg
-     ├── bgmobile.jpg
-     ├── arley.png
-     └── ...

## 环境变量

参考 `.env.example` 配置

## 许可证

MIT