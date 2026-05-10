const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, unique: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  customer: {
    name: { type: String, default: 'Anonymous' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  subject: { type: String, required: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['open', 'pending', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: { type: String, default: 'general' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  tags: [{ type: String }],
  internalNotes: [{
    content: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  aiSummary: { type: String, default: '' },
  sentiment: { type: String, enum: ['positive', 'neutral', 'negative', ''], default: '' },
  source: { type: String, enum: ['chat', 'email', 'form', 'api'], default: 'chat' },
  resolvedAt: { type: Date },
  firstResponseAt: { type: Date },
  satisfaction: { type: Number, min: 1, max: 5 }
}, { timestamps: true });

ticketSchema.pre('save', async function(next) {
  if (!this.ticketId) {
    const count = await mongoose.model('Ticket').countDocuments({ organization: this.organization });
    this.ticketId = `TKT-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

ticketSchema.index({ organization: 1, status: 1 });
ticketSchema.index({ organization: 1, assignedTo: 1 });
ticketSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
