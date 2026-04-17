// sockets.js — Handles real-time chat and AI bot integration
// This file makes the Live Chat work!

const { chatWithAI } = require('./ai');

module.exports = function(io) {
  
  // Track online users for a "Live Count"
  const onlineUsers = new Map();

  io.on('connection', function(socket) {
    let userName = 'Guest';

    // 1. JOIN ROOM
    socket.on('chat:join', function(data) {
      socket.join(data.roomId);
      onlineUsers.set(socket.id, data.name || 'Guest');
      userName = data.name || 'Guest';

      socket.to(data.roomId).emit('chat:user-joined', { name: userName });
      console.log(`👤 ${userName} joined room: ${data.roomId}`);
    });

    // 2. SEND MESSAGE
    socket.on('chat:message', async function(data) {
      const message = {
        roomId:    data.roomId,
        content:   data.content,
        sender:    { name: userName },
        timestamp: new Date(),
      };

      // Broadcast to everyone in the room
      io.to(data.roomId).emit('chat:message', message);

      // --- AI INTEGRATION ---
      // AI will reply in ALL chat rooms!
      if (!data.isAI) {
        try {
          // Add a small delay so it feels like the AI is "thinking"
          setTimeout(async () => {
             const aiReplyContent = await chatWithAI(data.content, `You are in the ${data.roomId} support room.`);
             const aiMessage = {
               roomId:    data.roomId,
               content:   aiReplyContent,
               sender:    { name: 'OnTheSpot AI' },
               timestamp: new Date(),
               isAI:      true
             };
             io.to(data.roomId).emit('chat:message', aiMessage);
          }, 1000);
        } catch (err) {
          console.log('AI Socket Error:', err.message);
        }
      }
    });

    // 3. TYPING INDICATOR
    socket.on('chat:typing', function(data) {
      socket.to(data.roomId).emit('chat:typing', { name: userName, isTyping: data.isTyping });
    });

    // 4. DASHBOARD PING (for live online count)
    socket.on('dashboard:ping', function() {
      socket.emit('dashboard:pong', { onlineCount: io.engine.clientsCount });
    });

    // 5. DISCONNECT
    socket.on('disconnect', function() {
      onlineUsers.delete(socket.id);
      io.emit('chat:user-left', { name: userName });
    });
  });

  console.log('🔌 Socket.IO logic initialized!');
};
