const mongoose = require('mongoose');

const trainingDataSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  type: { type: String, enum: ['faq', 'document', 'article', 'webpage', 'notion'], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  source: { type: String, default: '' },
  url: { type: String, default: '' },
  embedding: [{ type: Number }],
  metadata: { type: Map, of: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

trainingDataSchema.index({ organization: 1, type: 1 });

module.exports = mongoose.model('AITrainingData', trainingDataSchema);
