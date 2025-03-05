const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const Article = require('./models/article');
const User = require('./models/user');
const app = express();
const Comment = require('./models/comment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 连接 MongoDB
mongoose.connect('mongodb://localhost/blog', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => console.log(err));


const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

  // 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // 存储目录
  },
  filename: (req, file, cb) => {
    cb(null, `thumbnail-${Date.now()}${path.extname(file.originalname)}`); // 文件名格式
  }
});
const upload = multer({ storage });

// 中间件设置
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');

// Passport 配置
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      if (!user) return done(null, false, { message: '用户不存在' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: '密码错误' });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// 中间件：检查是否登录
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// 路由：登录页面
app.get('/login', (req, res) => {
  res.render('login');
});

// 路由：处理登录
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// 路由：注册页面
app.get('/register', (req, res) => {
  res.render('register');
});

// 路由：处理注册
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword });
  await user.save();
  res.redirect('/login');
});

// 路由：退出登录
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// 路由：创建文章页面
app.get('/create', ensureAuthenticated, (req, res) => {
  res.render('create', { categories: ['技术', '生活', '旅行', '其他'] }); // 传入分类选项
});


// 路由：查看单篇文章详情
app.get('/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).send('文章未找到');
    }
    article.views += 1; // 增加阅读计数
    await article.save();
    const comments = await Comment.find({ article: req.params.id }).populate('author', 'username');
    res.render('article', { article, comments, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('服务器错误');
  }
});

// 路由：编辑文章页面
app.get('/articles/:id/edit', ensureAuthenticated, async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article || article.author.toString() !== req.user._id.toString()) {
    return res.redirect('/');
  }
  res.render('edit', { article, categories: ['技术', '生活', '旅行', '其他'] });
});

//路由：评论文章
app.post('/articles/:id/comment', ensureAuthenticated, async (req, res) => {
  const { content } = req.body;
  const comment = new Comment({
    content,
    author: req.user._id,
    article: req.params.id
  });
  await comment.save();
  res.redirect('/');
});


// 路由：删除文章
app.post('/articles/:id/delete', ensureAuthenticated, async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article || article.author.toString() !== req.user._id.toString()) {
    return res.redirect('/'); // 只有作者才能删除
  }
  await Article.findByIdAndDelete(req.params.id);
  res.redirect(req.headers.referer || '/'); // 返回上一页或首页
});


// 路由：删除评论
app.post('/comments/:id/delete', ensureAuthenticated, async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment || comment.author.toString() !== req.user._id.toString()) {
    return res.redirect('/'); // 如果评论不存在或不是作者，跳转首页
  }
  await Comment.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

// 路由：首页
app.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;
  const articles = await Article.find({ isDraft: false }).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit);
  const totalArticles = await Article.countDocuments({ isDraft: false });
  const totalPages = Math.ceil(totalArticles / limit);
  const comments = await Comment.find().populate('author', 'username');
  res.render('index', { 
    articles, 
    user: req.user, 
    category: null, 
    comments, 
    searchKeyword: '', 
    page, 
    totalPages 
  });
});

// 路由：按分类筛选
app.get('/category/:category', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;
  const articles = await Article.find({ category: req.params.category, isDraft: false }).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit);
  const totalArticles = await Article.countDocuments({ category: req.params.category, isDraft: false });
  const totalPages = Math.ceil(totalArticles / limit);
  const comments = await Comment.find().populate('author', 'username');
  res.render('index', { 
    articles, 
    user: req.user, 
    category: req.params.category, 
    comments, 
    searchKeyword: '', 
    page, 
    totalPages 
  });
});

// 路由：搜索文章
app.get('/search', async (req, res) => {
  const { keyword } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;
  let articles = [];
  let totalArticles = 0;
  if (keyword) {
    articles = await Article.find({
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } }
      ],
      isDraft: false // 只搜索已发布文章
    }).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit);
    totalArticles = await Article.countDocuments({
      $or: [
        { title: { $regex: keyword, $options: 'i' } },
        { content: { $regex: keyword, $options: 'i' } }
      ],
      isDraft: false
    });
  } else {
    articles = await Article.find({ isDraft: false }).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(limit);
    totalArticles = await Article.countDocuments({ isDraft: false });
  }
  const totalPages = Math.ceil(totalArticles / limit);
  const comments = await Comment.find().populate('author', 'username');
  res.render('index', { 
    articles, 
    user: req.user, 
    category: null, 
    comments, 
    searchKeyword: keyword || '', 
    page, 
    totalPages 
  });
});


// 路由：创建文章
app.post('/articles', ensureAuthenticated, upload.single('thumbnail'), async (req, res) => {
  console.log('Uploaded file:', req.file); 
  const { title, content, category, tags, isDraft, isPinned } = req.body;
  const article = new Article({
    title,
    content,
    category,
    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    author: req.user._id,
    isDraft: isDraft === 'on',
    isPinned: isPinned === 'on',
    thumbnail: req.file ? `/uploads/${req.file.filename}` : null
  });
  await article.save();
  res.redirect('/');
});

// 路由：更新文章
app.post('/articles/:id', ensureAuthenticated, upload.single('thumbnail'), async (req, res) => {
  const { title, content, category, tags, isDraft, isPinned } = req.body;
  const article = await Article.findById(req.params.id);
  if (!article || article.author.toString() !== req.user._id.toString()) {
    return res.redirect('/');
  }
  await Article.findByIdAndUpdate(req.params.id, {
    title,
    content,
    category,
    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    isDraft: isDraft === 'on' ? true : false,
    isPinned: isPinned === 'on' ? true : false,
    thumbnail: req.file ? `/uploads/${req.file.filename}` : article.thumbnail // 如果未上传新图，保留原图
  });
  res.redirect('/');
});

// 路由：查看草稿
app.get('/drafts', ensureAuthenticated, async (req, res) => {
  const articles = await Article.find({ author: req.user._id, isDraft: true }).sort({ createdAt: -1 });
  const comments = await Comment.find().populate('author', 'username');
  res.render('drafts', { articles, user: req.user, comments });
});

app.post('/articles/:id/like', ensureAuthenticated, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, message: '文章未找到' });
    }
    const userId = req.user._id.toString();
    const hasLiked = article.likedBy.some(id => id.toString() === userId);
    
    if (hasLiked) {
      // 取消点赞
      article.likes -= 1;
      article.likedBy = article.likedBy.filter(id => id.toString() !== userId);
    } else {
      // 点赞
      article.likes += 1;
      article.likedBy.push(req.user._id);
    }
    await article.save();
    res.json({ 
      success: true, 
      likes: article.likes, 
      hasLiked: !hasLiked // 返回切换后的状态
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});


// 启动服务器
app.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});