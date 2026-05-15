const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  website: { type: String, default: '' },
  logo: { type: String, default: '' },
  industry: { type: String, default: '' },
  plan: { type: String, default: 'free' },
  widgetConfig: {
    themeColor: { type: String, default: '#2563EB' },
    position: { type: String, enum: ['bottom-right', 'bottom-left'], default: 'bottom-right' },
    welcomeMessage: { type: String, default: 'Hi! How can we help you today?' },
    companyName: { type: String, default: '' },
    avatar: { type: String, default: '' },
    suggestedPrompts: [{ type: String }]
  },
  aiConfig: {
    model: { type: String, default: 'gemini' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 1024 },
    systemPrompt: { type: String, default: 'You are a helpful customer support assistant.' },
    confidenceThreshold: { type: Number, default: 0.6 }
  },
  notionWorkspace: {
    accessToken: { type: String },
    workspaceId: { type: String },
    connected: { type: Boolean, default: false }
  },
  settings: {
    autoAssign: { type: Boolean, default: true },
    autoReply: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    businessHours: {
      enabled: { type: Boolean, default: false },
      timezone: { type: String, default: 'UTC' },
      hours: { type: Map, of: { start: String, end: String } }
    }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

organizationSchema.pre('save', function(next) {

  if (!this.widgetConfig.companyName) {
    this.widgetConfig.companyName = this.name;
  }

  if (this.website) {
    this.website = this.website
      .trim()
      .replace(/\/$/, "") 
      .toLowerCase();
  }

  next();
});

module.exports = mongoose.model('Organization', organizationSchema);
