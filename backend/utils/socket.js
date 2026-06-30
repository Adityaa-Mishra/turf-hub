/**
 * Socket.IO Utility
 * Real-time notifications
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

exports.initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'null'
      ],
      credentials: true
    }
  });

  // Authentication middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
      } catch {
        // Allow unauthenticated connections but limit features
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join personal room
    if (socket.userId) {
      socket.join(`user_${socket.userId}`);
      console.log(`👤 User ${socket.userId} joined their room`);
    }

    // Owner joins owner room
    socket.on('join_owner_room', (ownerId) => {
      socket.join(`owner_${ownerId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 Socket.IO initialized');
  return io;
};

exports.getIO = () => io;
