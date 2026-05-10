const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  date: { type: Date, required: true },
  metrics: {
    totalTickets: { type: Number, default: 0 },
    openTickets: { type: Number, default: 0 },
    resolvedTickets: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    avgResolutionTime: { type: Number, default: 0 },
    aiHandledQueries: { type: Number, default: 0 },
    humanHandledQueries: { type: Number, default: 0 },
    customerSatisfaction: { type: Number, default: 0 },
    totalConversations: { type: Number, default: 0 },
    escalations: { type: Number, default: 0 }
  },
  topQuestions: [{
    question: String,
    count: Number
  }],
  sentimentBreakdown: {
    positive: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    negative: { type: Number, default: 0 }
  }
}, { timestamps: true });

analyticsSchema.index({ organization: 1, date: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
