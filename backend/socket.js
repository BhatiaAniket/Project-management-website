/**
 * Socket.io Server
 * Handles real-time notifications, chat messaging, and presence tracking.
 */
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { redisClient } = require('./config/redis');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Connect Redis adapter if Redis is running
  if (redisClient.isReady) {
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✓ Redis Adapter for Socket.io linked');
    });
  }

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.companyId = decoded.companyId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`  🔌 User connected: ${socket.userId}`);

    // Join company room for scoped broadcasts
    if (socket.companyId) {
      socket.join(`company:${socket.companyId}`);
    }

    // Join personal room for direct notifications
    socket.join(`user:${socket.userId}`);

    // ── Presence ──
    socket.broadcast.to(`company:${socket.companyId}`).emit('user:online', {
      userId: socket.userId,
    });

    // ── Chat ──
    socket.on('chat:join', (conversationId) => {
      socket.join(`chat:${conversationId}`);
    });

    socket.on('chat:leave', (conversationId) => {
      socket.leave(`chat:${conversationId}`);
    });

    socket.on('chat:message', (data) => {
      // Broadcast to conversation room (excluding sender)
      socket.broadcast.to(`chat:${data.conversationId}`).emit('chat:message', data);
    });

    socket.on('chat:typing', (data) => {
      socket.broadcast.to(`chat:${data.conversationId}`).emit('chat:typing', {
        userId: socket.userId,
        userName: data.userName,
      });
    });

    socket.on('chat:stopTyping', (data) => {
      socket.broadcast.to(`chat:${data.conversationId}`).emit('chat:stopTyping', {
        userId: socket.userId,
      });
    });

    // ── WebRTC Signaling ──
    socket.on('webrtc:join-room', (roomId) => {
      socket.join(`meeting:${roomId}`);
      socket.broadcast.to(`meeting:${roomId}`).emit('webrtc:user-joined', {
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    socket.on('webrtc:offer', ({ to, offer }) => {
      io.to(to).emit('webrtc:offer', {
        from: socket.id,
        offer,
      });
    });

    socket.on('webrtc:answer', ({ to, answer }) => {
      io.to(to).emit('webrtc:answer', {
        from: socket.id,
        answer,
      });
    });

    socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('webrtc:ice-candidate', {
        from: socket.id,
        candidate,
      });
    });

    socket.on('webrtc:leave-room', (roomId) => {
      socket.leave(`meeting:${roomId}`);
      socket.broadcast.to(`meeting:${roomId}`).emit('webrtc:user-left', {
        userId: socket.userId,
        socketId: socket.id,
      });
    });

    // ── Meeting Specific Events ──
    socket.on('meeting:chat', (data) => {
      socket.broadcast.to(`meeting:${data.roomId}`).emit('meeting:chat', data);
    });

    socket.on('meeting:transcript', async (data) => {
      const { roomId, userId, text, timestamp } = data;
      if (!roomId || !text) return;
      try {
        const key = `transcript:${roomId}`;
        // Append simple line to a single string in redis
        if (redisClient.isReady) {
          await redisClient.append(key, `[${new Date(timestamp).toISOString()}] ${socket.userId}: ${text}\n`);
        }
      } catch (e) {
        console.error('Redis transcript error:', e);
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      console.log(`  🔌 User disconnected: ${socket.userId}`);
      socket.broadcast.to(`company:${socket.companyId}`).emit('user:offline', {
        userId: socket.userId,
      });
    });
  });

  return io;
};

/**
 * Get the Socket.io instance for emitting from controllers
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit a notification to a specific user
 */
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Emit to all members of a company
 */
const emitToCompany = (companyId, event, data) => {
  if (io) {
    io.to(`company:${companyId}`).emit(event, data);
  }
};

module.exports = { initSocket, getIO, emitToUser, emitToCompany };
