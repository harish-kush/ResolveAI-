const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  customer: {
    name: { type: String, default: 'Visitor' },
    email: { type: String, default: '' },
    sessionId: { type: String }
  },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'waiting', 'resolved', 'closed'], default: 'active' },
  channel: { type: String, enum: ['widget', 'dashboard', 'email'], default: 'widget' },
  isAIHandled: { type: Boolean, default: true },
  lastMessageAt: { type: Date, default: Date.now },
  metadata: { type: Map, of: String }
}, { timestamps: true });

conversationSchema.index({ organization: 1, status: 1 });
conversationSchema.index({ 'customer.sessionId': 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
