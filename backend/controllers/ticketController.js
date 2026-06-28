const Ticket = require('../models/Ticket');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const ticketAssignment = require('../services/ticketAssignment');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');

exports.getTickets = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { status, priority, assignedTo, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const cacheKey = `tickets:${orgId}:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const filter = { organization: orgId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (req.user.role === 'agent') filter.assignedTo = req.user._id;
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('assignedTo', 'name email avatar')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const result = { tickets, total, page: parseInt(page), pages: Math.ceil(total / limit) };
    await cacheSet(cacheKey, result, 60);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.user.organization
    })
      .populate('assignedTo', 'name email avatar')
      .populate('conversation')
      .populate('internalNotes.author', 'name');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const { subject, description, priority, category, customer, source } = req.body;
    const orgId = req.user.organization;

    const conversation = await Conversation.create({
      organization: orgId,
      customer: customer || { name: 'Unknown', email: '' },
      channel: source === 'form' ? 'widget' : 'dashboard'
    });

    const ticket = await Ticket.create({
      organization: orgId,
      subject,
      description,
      priority: priority || 'medium',
      category: category || 'general',
      customer: customer || { name: 'Unknown', email: '' },
      conversation: conversation._id,
      source: source || 'chat'
    });

    conversation.ticket = ticket._id;
    await conversation.save();

    if (description) {
      await Message.create({
        conversation: conversation._id,
        sender: { type: 'customer', name: customer?.name || 'Customer' },
        content: description
      });
    }

    const org = await require('../models/Organization').findById(orgId);
    if (org?.settings?.autoAssign) {
      await ticketAssignment.autoAssign(ticket);
    }

    if (customer?.email && org?.settings?.emailNotifications !== false) {
      await emailService.sendTicketCreated(customer.email, ticket.ticketId, subject);
    }

    await cacheDel(`tickets:${orgId}:*`);

    const populated = await Ticket.findById(ticket._id).populate('assignedTo', 'name email');
    res.status(201).json({ ticket: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { status, priority, assignedTo, tags, category } = req.body;
    const ticket = await Ticket.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const oldStatus = ticket.status;

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (tags) ticket.tags = tags;
    if (category) ticket.category = category;

    if (['resolved', 'closed'].includes(status) && !['resolved', 'closed'].includes(oldStatus)) {
      ticket.resolvedAt = new Date();
      if (ticket.assignedTo) {
        await ticketAssignment.releaseAgent(ticket.assignedTo);
      }

      if (ticket.conversation) {
        await Conversation.findByIdAndUpdate(ticket.conversation, {
          isAIHandled: true,
          status: 'resolved',
          assignedAgent: null
        });
      }
    }

    if (!ticket.firstResponseAt && assignedTo) {
      ticket.firstResponseAt = new Date();
    }

    await ticket.save();
    await cacheDel(`tickets:${req.user.organization}:*`);

    if (ticket.customer.email && status && status !== oldStatus) {
      const org = await require('../models/Organization').findById(req.user.organization);
      if (org?.settings?.emailNotifications !== false) {
        await emailService.sendTicketUpdate(ticket.customer.email, ticket.ticketId, status);
      }
    }

    const populated = await Ticket.findById(ticket._id).populate('assignedTo', 'name email');
    res.json({ ticket: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addNote = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.internalNotes.push({ content: req.body.content, author: req.user._id });
    await ticket.save();

    const populated = await Ticket.findById(ticket._id).populate('internalNotes.author', 'name');
    res.json({ ticket: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAISummary = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const messages = await Message.find({ conversation: ticket.conversation }).sort({ createdAt: 1 }).limit(50);

    if (messages.length === 0) {
      return res.json({ summary: 'No messages in this conversation yet.' });
    }

    const summary = await aiService.summarizeConversation(messages);
    ticket.aiSummary = summary;
    await ticket.save();

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTicketStats = async (req, res) => {
  try {
    const orgId = req.user.organization;

    const cacheKey = `ticketStats:${orgId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [total, open, pending, inProgress, resolved, closed] = await Promise.all([
      Ticket.countDocuments({ organization: orgId }),
      Ticket.countDocuments({ organization: orgId, status: 'open' }),
      Ticket.countDocuments({ organization: orgId, status: 'pending' }),
      Ticket.countDocuments({ organization: orgId, status: 'in_progress' }),
      Ticket.countDocuments({ organization: orgId, status: 'resolved' }),
      Ticket.countDocuments({ organization: orgId, status: 'closed' })
    ]);

    const result = { total, open, pending, inProgress, resolved, closed };
    await cacheSet(cacheKey, result, 120);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
