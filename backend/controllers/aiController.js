const AITrainingData = require('../models/AITrainingData');
const aiService = require('../services/aiService');
const crawlerService = require('../services/crawlerService');

exports.getTrainingData = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = { organization: req.user.organization };
    if (type) filter.type = type;
    const total = await AITrainingData.countDocuments(filter);
    const data = await AITrainingData.find(filter)
      .select('-embedding')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ data, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addTrainingData = async (req, res) => {
  try {
    const { type, title, content, source, url } = req.body;
    const data = await AITrainingData.create({
      organization: req.user.organization, type, title, content, source, url
    });
    res.status(201).json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTrainingData = async (req, res) => {
  try {
    const data = await AITrainingData.findOneAndUpdate(
      { _id: req.params.id, organization: req.user.organization },
      req.body,
      { new: true }
    );
    if (!data) return res.status(404).json({ message: 'Not found' });
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTrainingData = async (req, res) => {
  try {
    const data = await AITrainingData.findOneAndDelete({
      _id: req.params.id, organization: req.user.organization
    });
    if (!data) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.crawlWebsite = async (req, res) => {
  try {
    const { url, maxPages } = req.body;
    if (!url) return res.status(400).json({ message: 'URL required' });
    const result = await crawlerService.crawlWebsite(url, req.user.organization, maxPages || 10);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.testAI = async (req, res) => {
  try {
    const { query, chatHistory = [] } = req.body;
    const context = await aiService.getRelevantContext(req.user.organization, query);
    // Combined call with conversation memory: generates response + sentiment + intent
    const result = await aiService.generateResponseWithAnalysis(query, context, '', chatHistory);
    res.json({
      response: result.response,
      confidence: result.confidence,
      sentiment: result.sentiment,
      intent: result.intent,
      contextUsed: !!context
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
