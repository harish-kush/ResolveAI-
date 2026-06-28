const axios = require('axios');
const AITrainingData = require('../models/AITrainingData');

class AIService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    // Mistral config (fallback)
    this.mistralApiKey = process.env.MISTRAL_API_KEY;
    this.mistralUrl = 'https://api.mistral.ai/v1/chat/completions';
    this.mistralModel = 'mistral-small-latest';

    this.maxRetries = 2;
    this.baseDelay = 1500;
  }

  /**
   * Primary entry point: tries Gemini first, falls back to Mistral on failure.
   * @param {string} prompt - The current user message
   * @param {string} systemPrompt - System instruction
   * @param {Object} generationConfig - Generation parameters
   * @param {Array} chatHistory - Previous conversation messages [{role: 'user'|'assistant', content: '...'}]
   */
  async callAI(prompt, systemPrompt = '', generationConfig = {}, chatHistory = []) {
    // Try Gemini first
    if (this.geminiApiKey) {
      try {
        const text = await this.callGemini(prompt, systemPrompt, generationConfig, chatHistory);
        return text;
      } catch (error) {
        console.warn(`⚠ Gemini failed (${error.response?.status || error.message}). Falling back to Mistral...`);
      }
    }

    // Fallback to Mistral
    if (this.mistralApiKey) {
      try {
        const text = await this.callMistral(prompt, systemPrompt, generationConfig, chatHistory);
        return text;
      } catch (error) {
        console.error(`✗ Mistral also failed: ${error.message}`);
        throw error;
      }
    }

    throw new Error('No AI provider available. Set GEMINI_API_KEY or MISTRAL_API_KEY in .env');
  }

  /**
   * Call Gemini API with retry on 429.
   * Supports multi-turn conversation history via the contents array.
   */
  async callGemini(prompt, systemPrompt = '', generationConfig = {}, chatHistory = []) {
    const config = {
      temperature: generationConfig.temperature ?? 0.2,
      maxOutputTokens: generationConfig.maxOutputTokens ?? 1024,
      topP: generationConfig.topP ?? 0.8
    };

    // Build multi-turn contents array for Gemini
    const contents = [];

    // Add chat history as alternating user/model turns
    if (chatHistory.length > 0) {
      for (const msg of chatHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Add the current user message (with system prompt prepended if no history)
    const currentMessage = (systemPrompt && chatHistory.length === 0)
      ? `${systemPrompt}\n\n${prompt}`
      : prompt;
    contents.push({ role: 'user', parts: [{ text: currentMessage }] });

    // Build the request body
    const requestBody = { contents, generationConfig: config };

    // If we have history, use systemInstruction for the system prompt
    if (systemPrompt && chatHistory.length > 0) {
      requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.geminiUrl}?key=${this.geminiApiKey}`,
          requestBody,
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );
        return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (error) {
        const status = error.response?.status;
        if (status === 429 && attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.warn(`Gemini rate limited (429). Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Call Mistral API (OpenAI-compatible chat completions endpoint).
   * Supports multi-turn conversation history via the messages array.
   */
  async callMistral(prompt, systemPrompt = '', generationConfig = {}, chatHistory = []) {
    const messages = [];

    // System prompt
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation history
    if (chatHistory.length > 0) {
      for (const msg of chatHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Current user message
    messages.push({ role: 'user', content: prompt });

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          this.mistralUrl,
          {
            model: this.mistralModel,
            messages,
            temperature: generationConfig.temperature ?? 0.2,
            max_tokens: generationConfig.maxOutputTokens ?? 1024,
            top_p: generationConfig.topP ?? 0.8
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.mistralApiKey}`
            },
            timeout: 30000
          }
        );
        return response.data?.choices?.[0]?.message?.content || '';
      } catch (error) {
        const status = error.response?.status;
        if (status === 429 && attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          console.warn(`Mistral rate limited (429). Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Convert stored Message documents into chat history format for the LLM.
   * Takes the last N messages to keep context manageable.
   * @param {Array} messages - Array of Message documents from MongoDB
   * @param {number} maxMessages - Max number of recent messages to include (default: 20)
   * @returns {Array} - [{role: 'user'|'assistant', content: '...'}]
   */
  buildChatHistory(messages, maxMessages = 20) {
    if (!messages || messages.length === 0) return [];

    // Take the most recent messages, exclude system messages
    const recent = messages
      .filter(m => m.sender.type !== 'system')
      .slice(-maxMessages);

    return recent.map(m => ({
      role: (m.sender.type === 'customer') ? 'user' : 'assistant',
      content: m.content
    }));
  }

  /**
   * Generate a response with full conversation memory.
   * Fetches chat history and passes it to the LLM for context.
   */
  async generateResponseWithMemory(prompt, context = '', systemPrompt = '', chatHistory = []) {
    try {
      if (!this.hasUsableContext(context) && !this.isSafeSmallTalk(prompt)) {
        return {
          text: 'I do not have enough verified information to answer that accurately. Let me connect you with a human agent.',
          confidence: 0
        };
      }

      const userPrompt = this.buildGroundedUserPrompt(prompt, context);
      const system = this.buildGroundedSystemPrompt(systemPrompt);

      const text = await this.callAI(userPrompt, system, { temperature: 0.2, topP: 0.8 }, chatHistory);
      return { text, confidence: this.estimateConfidence(text) };
    } catch (error) {
      console.error('AI Error:', error.message);
      return { text: 'I apologize, but I\'m having trouble processing your request. Let me connect you with a human agent.', confidence: 0 };
    }
  }

  async generateResponse(prompt, context = '', systemPrompt = '') {
    try {
      if (!this.hasUsableContext(context) && !this.isSafeSmallTalk(prompt)) {
        return {
          text: 'I do not have enough verified information to answer that accurately. Let me connect you with a human agent.',
          confidence: 0
        };
      }
      const userPrompt = this.buildUserPrompt(prompt, context);
      const system = this.buildGroundedSystemPrompt(systemPrompt);
      const text = await this.callAI(userPrompt, system, { temperature: 0.2, topP: 0.8 });
      return { text, confidence: this.estimateConfidence(text) };
    } catch (error) {
      console.error('AI Error:', error.message);
      return { text: 'I apologize, but I\'m having trouble processing your request. Let me connect you with a human agent.', confidence: 0 };
    }
  }

  /**
   * Combined method: generates a response AND analyzes sentiment + intent in a single API call.
   * Supports conversation memory via chatHistory parameter.
   */
  async generateResponseWithAnalysis(query, context = '', systemPrompt = '', chatHistory = []) {
    try {
      if (!this.hasUsableContext(context) && !this.isSafeSmallTalk(query)) {
        return {
          response: 'I do not have enough verified information to answer that accurately. Let me connect you with a human agent.',
          confidence: 0,
          sentiment: 'neutral',
          intent: 'general'
        };
      }

      const system = this.buildGroundedSystemPrompt(systemPrompt);
      let userPrompt = this.buildGroundedUserPrompt(query, context);
      userPrompt += `\n\nAlso analyze the customer message. Respond in this exact JSON format with no markdown and no code fences:\n`;
      userPrompt += `{\n  "response": "your helpful response to the customer",\n  "sentiment": "positive|neutral|negative",\n  "intent": "billing|technical|general|complaint|feature_request|account"\n}`;

      const text = await this.callAI(userPrompt, system, { temperature: 0.1, topP: 0.7 }, chatHistory);

      // Parse the JSON response
      const cleaned = this.extractJson(text);
      const parsed = JSON.parse(cleaned);

      return {
        response: parsed.response || '',
        confidence: this.estimateConfidence(parsed.response || ''),
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
        intent: parsed.intent || 'general'
      };
    } catch (error) {
      console.error('AI Combined Analysis Error:', error.message);
      return {
        response: 'I apologize, but I\'m having trouble processing your request. Let me connect you with a human agent.',
        confidence: 0,
        sentiment: 'neutral',
        intent: 'general'
      };
    }
  }

  buildUserPrompt(query, context) {
    let prompt = '';
    if (context) {
      prompt += `Here is relevant knowledge base information:\n${context}\n\n`;
    }
    prompt += `Customer query: ${query}\n\nProvide a helpful response using only the verified information above.`;
    return prompt;
  }

  buildGroundedSystemPrompt(customPrompt = '') {
    const basePrompt = customPrompt || 'You are a helpful customer support assistant.';
    return `${basePrompt}

Grounding rules:
- Use only the provided knowledge base context and the current conversation.
- Do not invent prices, policies, features, timelines, guarantees, links, or technical details.
- If the answer is not clearly supported by the knowledge base context, say you do not have enough verified information and ask to connect the customer with a human agent.
- Do not use general internet knowledge as a substitute for missing company knowledge.
- Keep answers concise, friendly, and professional.`;
  }

  buildGroundedUserPrompt(query, context) {
    const verifiedContext = context || 'No verified knowledge base context was found.';
    return `Verified knowledge base context:
${verifiedContext}

Customer query:
${query}

Answer the customer using only the verified context. If the context does not support the answer, do not guess.`;
  }

  hasUsableContext(context) {
    return typeof context === 'string' && context.trim().length >= 40;
  }

  isSafeSmallTalk(text = '') {
    const normalized = text.toLowerCase().trim().replace(/[!.?]+$/g, '');
    return [
      'hi',
      'hello',
      'hey',
      'good morning',
      'good afternoon',
      'good evening',
      'thanks',
      'thank you'
    ].includes(normalized);
  }

  extractJson(text = '') {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return cleaned;
    return cleaned.slice(start, end + 1);
  }

  estimateConfidence(response) {
    const lowConfidenceIndicators = [
      'i\'m not sure', 'i don\'t know', 'i cannot', 'i\'m unable',
      'please contact', 'human agent', 'not certain', 'unclear',
      'do not have enough verified information', 'not enough verified information',
      'connect you with a human'
    ];
    const lower = response.toLowerCase();
    const hasLowConfidence = lowConfidenceIndicators.some(i => lower.includes(i));
    if (hasLowConfidence) return 0.3;
    if (response.length < 20) return 0.4;
    return 0.85;
  }

  async getRelevantContext(organizationId, query) {
    try {
      const { context } = await this.getRelevantContextWithScore(organizationId, query);
      return context;
    } catch (error) {
      return '';
    }
  }

  async getRelevantContextWithScore(organizationId, query) {
    try {
      const trainingData = await AITrainingData.find({
        organization: organizationId,
        isActive: true
      }).select('title content type').limit(50);

      if (trainingData.length === 0) return { context: '', topScore: 0, matches: 0 };

      const words = this.keywords(query);
      if (words.length === 0) return { context: '', topScore: 0, matches: 0 };

      const scored = trainingData
        .map(doc => {
          const title = doc.title || '';
          const content = doc.content || '';
          const searchable = `${title} ${content}`.toLowerCase();
          const matchCount = words.filter(word => searchable.includes(word)).length;
          const titleMatches = words.filter(word => title.toLowerCase().includes(word)).length;
          const score = (matchCount + titleMatches) / words.length;
          return { doc, score };
        })
        .filter(item => item.score >= 0.25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return {
        context: scored
          .map(({ doc }) => `[${doc.type.toUpperCase()}] ${doc.title}\n${doc.content}`)
          .join('\n\n---\n\n'),
        topScore: scored[0]?.score || 0,
        matches: scored.length
      };
    } catch (error) {
      console.error('Context retrieval error:', error.message);
      return { context: '', topScore: 0, matches: 0 };
    }
  }

  keywords(text = '') {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'for', 'from',
      'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'our', 'the',
      'to', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your'
    ]);

    return [...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map(word => word.trim())
        .filter(word => word.length > 2 && !stopWords.has(word))
    )];
  }

  async summarizeConversation(messages) {
    const transcript = messages.map(m => `${m.sender.type}: ${m.content}`).join('\n');
    const result = await this.generateResponse(
      `Summarize this customer support conversation in 2-3 sentences:\n\n${transcript}`,
      '',
      'You are a conversation summarizer. Provide brief, factual summaries.'
    );
    return result.text;
  }

  async detectSentiment(text) {
    const result = await this.generateResponse(
      `Analyze the sentiment of this customer message and respond with exactly one word - "positive", "neutral", or "negative":\n\n"${text}"`,
      '',
      'You are a sentiment analysis tool. Respond with exactly one word.'
    );
    const sentiment = result.text.toLowerCase().trim();
    if (['positive', 'neutral', 'negative'].includes(sentiment)) return sentiment;
    return 'neutral';
  }

  async detectIntent(text) {
    const result = await this.generateResponse(
      `Classify this customer message into one category: billing, technical, general, complaint, feature_request, account. Respond with exactly one word:\n\n"${text}"`,
      '',
      'You are an intent classifier. Respond with exactly one word.'
    );
    return result.text.toLowerCase().trim();
  }
}

module.exports = new AIService();
