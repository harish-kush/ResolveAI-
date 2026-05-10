const Ticket = require('../models/Ticket');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { cacheGet, cacheSet } = require('../config/redis');

exports.getDashboardStats = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const cacheKey = `analytics:dashboard:${orgId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [totalTickets, openTickets, resolvedTickets, avgResponseTime, conversations, aiMessages, humanMessages] = await Promise.all([
      Ticket.countDocuments({ organization: orgId }),
      Ticket.countDocuments({ organization: orgId, status: { $in: ['open', 'pending', 'in_progress'] } }),
      Ticket.countDocuments({ organization: orgId, status: { $in: ['resolved', 'closed'] } }),
      Ticket.aggregate([
        { $match: { organization: orgId, firstResponseAt: { $exists: true }, createdAt: { $gte: thirtyDaysAgo } } },
        { $project: { responseTime: { $subtract: ['$firstResponseAt', '$createdAt'] } } },
        { $group: { _id: null, avg: { $avg: '$responseTime' } } }
      ]),
      Conversation.countDocuments({ organization: orgId, createdAt: { $gte: thirtyDaysAgo } }),
      Message.countDocuments({ 'sender.type': 'ai', createdAt: { $gte: thirtyDaysAgo } }),
      Message.countDocuments({ 'sender.type': 'agent', createdAt: { $gte: thirtyDaysAgo } })
    ]);

    const ticketsByDay = await Ticket.aggregate([
      { $match: { organization: orgId, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const ticketsByStatus = await Ticket.aggregate([
      { $match: { organization: orgId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const ticketsByPriority = await Ticket.aggregate([
      { $match: { organization: orgId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const satisfactionData = await Ticket.aggregate([
      { $match: { organization: orgId, satisfaction: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$satisfaction' }, count: { $sum: 1 } } }
    ]);

    const result = {
      totalTickets,
      openTickets,
      resolvedTickets,
      avgResponseTime: avgResponseTime[0]?.avg ? Math.round(avgResponseTime[0].avg / 60000) : 0,
      totalConversations: conversations,
      aiHandledQueries: aiMessages,
      humanHandledQueries: humanMessages,
      customerSatisfaction: satisfactionData[0]?.avg?.toFixed(1) || 'N/A',
      ticketsByDay,
      ticketsByStatus,
      ticketsByPriority,
      resolutionRate: totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(1) : 0
    };

    await cacheSet(cacheKey, result, 300);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDetailedAnalytics = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { period = '30' } = req.query;
    const daysAgo = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);

    const [sentimentData, categoryData, agentPerformance] = await Promise.all([
      Ticket.aggregate([
        { $match: { organization: orgId, sentiment: { $ne: '' }, createdAt: { $gte: daysAgo } } },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $match: { organization: orgId, createdAt: { $gte: daysAgo } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Ticket.aggregate([
        { $match: { organization: orgId, assignedTo: { $exists: true }, createdAt: { $gte: daysAgo } } },
        { $group: {
          _id: '$assignedTo',
          totalTickets: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          avgSatisfaction: { $avg: '$satisfaction' }
        }},
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
        { $unwind: '$agent' },
        { $project: { name: '$agent.name', email: '$agent.email', totalTickets: 1, resolved: 1, avgSatisfaction: 1 } }
      ])
    ]);

    res.json({ sentimentData, categoryData, agentPerformance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
