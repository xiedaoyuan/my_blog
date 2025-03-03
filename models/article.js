const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  tags: [{ type: String }],
  isDraft: { type: Boolean, default: true }, // 新增草稿字段，默认 true
  isPinned: { type: Boolean, default: false } ,// 新增置顶字段，默认 false
  views: { type: Number, default: 0 }
});

module.exports = mongoose.model('Article', articleSchema);