const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Ticket = require('../models/Ticket');
const Organization = require('../models/Organization');
const aiService = require('../services/aiService');
const ticketAssignment = require('../services/ticketAssignment');

exports.widgetStartConversation = async (req, res) => {
  try {
    const { organizationId, customer, sessionId } = req.body;
    const org = await Organization.findById(organizationId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    let conversation = await Conversation.findOne({
      organization: organizationId,
      'customer.sessionId': sessionId,
      status: { $in: ['active', 'waiting'] }
    });
    if (!conversation) {
      conversation = await Conversation.create({
        organization: organizationId,
        customer: { ...customer, sessionId },
        channel: 'widget',
        isAIHandled: true
      });
      const ticket = await Ticket.create({
        organization: organizationId,
        subject: `Chat from ${customer?.name || 'Visitor'}`,
        customer: customer || { name: 'Visitor' },
        conversation: conversation._id,
        source: 'chat'
      });
      conversation.ticket = ticket._id;
      await conversation.save();
      if (org.settings.autoAssign) await ticketAssignment.autoAssign(ticket);
    }
    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 }).limit(50);
    res.json({ conversation, messages, widgetConfig: org.widgetConfig });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.widgetSendMessage = async (req, res) => {
  try {
    const { conversationId, content, customer } = req.body;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const customerMessage = await Message.create({
      conversation: conversationId,
      sender: { type: 'customer', name: customer?.name || 'Visitor' },
      content
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('newMessage', customerMessage);
      io.to(`org:${conversation.organization}`).emit('newCustomerMessage', { conversationId, message: customerMessage });
    }
    if (conversation.isAIHandled) {
      const org = await Organization.findById(conversation.organization);
      const context = await aiService.getRelevantContext(conversation.organization, content);

      // Fetch conversation history for memory (last 20 messages, excluding the one just created)
      const previousMessages = await Message.find({
        conversation: conversationId,
        _id: { $ne: customerMessage._id }
      }).sort({ createdAt: 1 }).limit(20);
      const chatHistory = aiService.buildChatHistory(previousMessages);

      const aiResponse = await aiService.generateResponseWithMemory(
        content, context, org?.aiConfig?.systemPrompt, chatHistory
      );
      if (aiResponse.confidence < (org?.aiConfig?.confidenceThreshold || 0.6)) {
        conversation.isAIHandled = false;
        conversation.status = 'waiting';
        await conversation.save();
        const escMsg = await Message.create({
          conversation: conversationId,
          sender: { type: 'system', name: 'System' },
          content: 'Connecting you with a human agent for better assistance.'
        });
        if (io) {
          io.to(`conversation:${conversationId}`).emit('newMessage', escMsg);
          io.to(`org:${conversation.organization}`).emit('escalation', { conversationId });
        }
        return res.json({ customerMessage, aiMessage: escMsg, escalated: true });
      }
      const aiMessage = await Message.create({
        conversation: conversationId,
        sender: { type: 'ai', name: org?.widgetConfig?.companyName || 'AI Assistant' },
        content: aiResponse.text,
        aiConfidence: aiResponse.confidence
      });
      if (io) io.to(`conversation:${conversationId}`).emit('newMessage', aiMessage);
      return res.json({ customerMessage, aiMessage, escalated: false });
    }
    res.json({ customerMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.contactForm = async (req, res) => {
  try {
    const { organizationId, name, email, subject, message } = req.body;
    const org = await Organization.findById(organizationId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    const conversation = await Conversation.create({
      organization: organizationId, customer: { name, email }, channel: 'widget', isAIHandled: true
    });
    const ticket = await Ticket.create({
      organization: organizationId, subject: subject || `Contact: ${name}`, description: message,
      customer: { name, email }, conversation: conversation._id, source: 'form'
    });
    conversation.ticket = ticket._id;
    await conversation.save();
    await Message.create({ conversation: conversation._id, sender: { type: 'customer', name }, content: message });
    if (org.settings.autoAssign) await ticketAssignment.autoAssign(ticket);
    const emailService = require('../services/emailService');
    if (email) await emailService.sendTicketCreated(email, ticket.ticketId, subject || 'Support Request');
    res.status(201).json({ ticket, message: 'Your message has been received.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
