const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const sessionId = socket.handshake.auth?.sessionId;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          socket.user = user;
          socket.userType = 'agent';
        }
      } else if (sessionId) {
        socket.sessionId = sessionId;
        socket.userType = 'customer';
      }
      next();
    } catch (error) {
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (${socket.userType || 'unknown'})`);

    if (socket.user) {
      socket.join(`org:${socket.user.organization}`);
      socket.join(`user:${socket.user._id}`);
    }

    socket.on('joinConversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leaveConversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing', (data) => {
      socket.to(`conversation:${data.conversationId}`).emit('userTyping', {
        conversationId: data.conversationId,
        user: socket.user?.name || 'Visitor',
        isTyping: data.isTyping
      });
    });

    socket.on('messageRead', async (data) => {
      try {
        await Message.updateMany(
          { conversation: data.conversationId, isRead: false },
          { isRead: true, readAt: new Date() }
        );
        socket.to(`conversation:${data.conversationId}`).emit('messagesRead', {
          conversationId: data.conversationId
        });
      } catch (error) {
        console.error('Message read error:', error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSocket;
