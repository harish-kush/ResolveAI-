const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: {
    type: { type: String, enum: ['customer', 'agent', 'ai', 'system'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: '' }
  },
  content: { type: String, required: true },
  contentType: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  fileUrl: { type: String },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  aiConfidence: { type: Number },
  metadata: { type: Map, of: String }
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: 1 });
// TTL index: MongoDB auto-deletes messages 2 hours after creation
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });

module.exports = mongoose.model('Message', messageSchema);
