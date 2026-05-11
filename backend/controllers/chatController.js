const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Ticket = require('../models/Ticket');
const Organization = require('../models/Organization');
const aiService = require('../services/aiService');
const ticketAssignment = require('../services/ticketAssignment');

exports.getConversations = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { organization: orgId };
    if (status) filter.status = status;
    const total = await Conversation.countDocuments(filter);
    const conversations = await Conversation.find(filter)
      .populate('assignedAgent', 'name email avatar')
      .populate('ticket', 'ticketId subject status priority')
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const withLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversation: conv._id }).sort({ createdAt: -1 });
        return { ...conv.toObject(), lastMessage };
      })
    );
    res.json({ conversations: withLastMessage, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.id }).sort({ createdAt: 1 }).limit(100);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const message = await Message.create({
      conversation: req.params.id,
      sender: { type: 'agent', userId: req.user._id, name: req.user.name },
      content
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    const io = req.app.get('io');
    if (io) io.to(`conversation:${req.params.id}`).emit('newMessage', message);
    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.takeOver = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    conversation.assignedAgent = req.user._id;
    conversation.isAIHandled = false;
    await conversation.save();
    if (conversation.ticket) {
      await Ticket.findByIdAndUpdate(conversation.ticket, { assignedTo: req.user._id, status: 'in_progress' });
    }
    await Message.create({
      conversation: conversation._id,
      sender: { type: 'system', name: 'System' },
      content: `${req.user.name} has taken over this conversation.`
    });
    const io = req.app.get('io');
    if (io) io.to(`conversation:${conversation._id}`).emit('agentTakeover', { agent: req.user.name });
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resolveConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    
    conversation.isAIHandled = true;
    conversation.status = 'resolved';
    conversation.assignedAgent = null;
    await conversation.save();

    if (conversation.ticket) {
      const ticket = await Ticket.findById(conversation.ticket);
      if (ticket) {
        ticket.status = 'resolved';
        ticket.resolvedAt = new Date();
        const ticketAssignment = require('../services/ticketAssignment');
        if (ticket.assignedTo) {
          await ticketAssignment.releaseAgent(ticket.assignedTo);
        }
        await ticket.save();
      }
    }

    await Message.create({
      conversation: conversation._id,
      sender: { type: 'system', name: 'System' },
      content: `${req.user.name} has resolved the conversation. The AI has taken over again.`
    });

    const io = req.app.get('io');
    if (io) io.to(`conversation:${conversation._id}`).emit('agentTakeover', { agent: 'AI' });

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
