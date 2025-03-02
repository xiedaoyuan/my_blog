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

// 连接 MongoDB
mongoose.connect('mongodb://localhost/blog', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => console.log(err));

// 中间件设置
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session({
  secret: 'your-secret-key', // 替换为安全的密钥
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

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


// 路由：编辑文章页面
app.get('/articles/:id/edit', ensureAuthenticated, async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article || article.author.toString() !== req.user._id.toString()) {
    return res.redirect('/');
  }
  res.render('edit', { article, categories: ['技术', '生活', '旅行', '其他'] });
});


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

// ... 其他代码保持不变 ...

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
app.post('/articles', ensureAuthenticated, async (req, res) => {
  const { title, content, category, tags, isDraft, isPinned } = req.body;
  const article = new Article({
    title,
    content,
    category,
    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    author: req.user._id,
    isDraft: isDraft === 'on', // 复选框返回 'on' 或 undefined
    isPinned: isPinned === 'on'
  });
  await article.save();
  res.redirect('/');
});

app.post('/articles/:id', ensureAuthenticated, async (req, res) => {
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
    isDraft: isDraft === 'on' ? true : false, // 显式设置为 true 或 false
    isPinned: isPinned === 'on' ? true : false
  });
  res.redirect('/');
});

// 路由：查看草稿
app.get('/drafts', ensureAuthenticated, async (req, res) => {
  const articles = await Article.find({ author: req.user._id, isDraft: true }).sort({ createdAt: -1 });
  res.render('drafts', { articles, user: req.user });
});
// 启动服务器
app.listen(3000, () => {
  console.log('服务器运行在 http://localhost:3000');
});