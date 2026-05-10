const User = require('../models/User');
const Ticket = require('../models/Ticket');

class TicketAssignmentService {
  async autoAssign(ticket) {
    try {
      const agents = await User.find({
        organization: ticket.organization,
        role: 'agent',
        isActive: true
      }).sort({ currentWorkload: 1 });

      if (agents.length === 0) return null;

      let bestAgent = null;
      let bestScore = -1;

      for (const agent of agents) {
        if (agent.currentWorkload >= agent.maxWorkload) continue;

        let score = 10 - agent.currentWorkload;

        if (ticket.category && agent.expertise.includes(ticket.category)) {
          score += 5;
        }

        if (ticket.priority === 'urgent') score += 3;
        if (ticket.priority === 'high') score += 2;

        if (score > bestScore) {
          bestScore = score;
          bestAgent = agent;
        }
      }

      if (bestAgent) {
        ticket.assignedTo = bestAgent._id;
        ticket.status = 'in_progress';
        await ticket.save();

        bestAgent.currentWorkload += 1;
        await bestAgent.save();

        return bestAgent;
      }

      return null;
    } catch (error) {
      console.error('Auto-assign error:', error.message);
      return null;
    }
  }

  async releaseAgent(agentId) {
    try {
      const agent = await User.findById(agentId);
      if (agent && agent.currentWorkload > 0) {
        agent.currentWorkload -= 1;
        await agent.save();
      }
    } catch (error) {
      console.error('Release agent error:', error.message);
    }
  }
}

module.exports = new TicketAssignmentService();
