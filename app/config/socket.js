// app/config/socket.js
const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    // Client should emit this after login with its userId
    socket.on('auth', ({ userId }) => {
      if (!userId) return;
      socket.data.userId = userId;
      socket.join(`user:${userId}`); // personal room
      console.log(`➡️ joined room user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

// tiny helper so controllers can emit in one line
function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

// broadcast (e.g., driver live map updates)
function emitAll(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { initSocket, getIO, emitToUser, emitAll };
