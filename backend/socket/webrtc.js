const { verifySocketToken } = require('../middleware/auth');
const rooms = new Map();

module.exports = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    const user = await verifySocketToken(token);
    if (!user) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 ${socket.user.name} connected`);

    socket.on('join-room', ({ roomId }) => {
      socket.join(roomId);
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(socket.id);
      const peers = [...rooms.get(roomId)].filter(id => id !== socket.id);
      socket.emit('room-peers', { peers });
      socket.to(roomId).emit('user-joined', { socketId: socket.id, userName: socket.user.name, userRole: socket.user.role });
    });

    socket.on('offer', ({ offer, to }) => {
      socket.to(to).emit('offer', { offer, from: socket.id, fromName: socket.user.name, fromRole: socket.user.role });
    });

    socket.on('answer', ({ answer, to }) => {
      socket.to(to).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to }) => {
      socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('chat-message', ({ roomId, message }) => {
      io.to(roomId).emit('chat-message', { id: Date.now(), from: socket.id, fromName: socket.user.name, fromRole: socket.user.role, message, timestamp: new Date().toISOString() });
    });

    socket.on('media-toggle', ({ roomId, type, enabled }) => {
      socket.to(roomId).emit('peer-media-toggle', { from: socket.id, type, enabled });
    });

    socket.on('leave-room', ({ roomId }) => leaveRoom(socket, roomId, io));

    socket.on('disconnect', () => {
      rooms.forEach((peers, roomId) => { if (peers.has(socket.id)) leaveRoom(socket, roomId, io); });
    });
  });

  const leaveRoom = (socket, roomId, io) => {
    socket.to(roomId).emit('user-left', { socketId: socket.id, userName: socket.user?.name });
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) rooms.delete(roomId);
    }
    socket.leave(roomId);
  };
};
