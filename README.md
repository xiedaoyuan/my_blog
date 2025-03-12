# 个人博客系统

这是一个基于 **Node.js** 的个人博客系统，支持文章管理、用户认证、互动功能和个性化设置。界面采用科技感设计，注重用户体验，适合个人记录和分享内容。


## 功能亮点

### 核心功能
- **文章管理**：支持创建、编辑、删除文章，包含草稿和置顶功能。
- **用户认证**：注册、登录、登出，密码使用 `bcrypt` 加密。
- **文章分类**：按类别组织文章，首页支持筛选。
- **阅读统计**：每篇文章记录浏览次数。
- **预览图**：支持上传文章缩略图。
- **文章归档**：支持文章归档功能
- **标签云**：记录标签重复次数
- **markdown**：可以使用markdown编写文章并且可以预览

### 互动功能
- **评论系统**：用户可以对文章发表评论。
- **点赞功能**：支持点赞和取消点赞（AJAX 无刷新实现），防止重复点赞。

### 用户体验
- **设置页面**：用户可修改用户名、密码和头像。
- **首页设计**：仅显示标题和元数据，内容需点击查看。
- **科技感 UI**：渐变按钮、悬浮效果，整洁布局。

### 技术细节
- **后端**：Node.js, Express, MongoDB, Passport.js, Multer。
- **前端**：EJS 模板引擎，CSS 自定义样式。
- **其他**：AJAX 实现无刷新交互，Session 管理用户状态。

## 安装与运行

### 前提条件
- Node.js (v14 或以上)
- MongoDB (本地或云端)

### 安装步骤
1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/your-blog-repo.git
   cd your-blog-repo
2. 安装依赖
   ```bash
   npm install
3. 配置环境变量：
   创建 .env 文件，添加 MongoDB 连接字符串：
   ```plaintext
   MONGODB_URI=mongodb://localhost:27017/blog
   SESSION_SECRET=your-secret-key
   ```
4. 启动项目：
   ```bash
   node app.js
5. 访问博客:
   打开浏览器，输入 http://localhost:3000
   
 ## 项目结构
 ```
├── public/
│   ├── styles.css       # 样式文件
│   └── uploads/         # 图片上传目录
├── views/
│   ├── index.ejs        # 首页
│   ├── article.ejs      # 文章详情页
│   ├── login.ejs        # 登录页
│   ├── register.ejs     # 注册页
│   ├── settings.ejs     # 用户设置页
│   └── ...              # 其他页面
├── models/
│   ├── article.js       # 文章模型
│   └── user.js          # 用户模型
├── app.js               # 主应用文件
├── package.json         # 依赖配置
└── README.md            # 项目说明
```
 ## 使用说明
- **注册与登录**：
- 访问 /register 创建账户，/login 登录。

- **发表文章**：
- 登录后点击“写新文章”，上传缩略图并保存。

- **互动**：
- 在首页点赞文章，进入详情页发表评论。

- **设置**：
- 访问 /settings 修改个人信息。





