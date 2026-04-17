// js/chat.js — Real-time chat with Socket.IO (plain JS, no modules)

document.addEventListener('DOMContentLoaded', function () {

  let socket       = null;
  let currentRoom  = 'general';
  let unreadCounts = {};
  let typingTimer  = null;
  let isTyping     = false;

  let ROOMS = {
    general:   { name: 'General Support',   icon: '💬' },
    claims:    { name: 'Claims Assistance',  icon: '📋' },
    disputes:  { name: 'Dispute Mediation',  icon: '⚖️' },
    emergency: { name: 'Emergency Report',   icon: '🚨' },
  };

  function getDisplayName() {
    let user = Auth.getUser();
    if (user) return user.name;
    return (document.getElementById('guestName') || {}).value || ('Guest' + Math.floor(Math.random() * 9000 + 1000));
  }

  // ── Show/hide guest name row ─────────────────────────────────
  if (!Auth.isLoggedIn()) {
    let nameRow = document.getElementById('guestNameRow');
    if (nameRow) nameRow.classList.add('visible');
  }

  // ── Socket.IO ────────────────────────────────────────────────
  if (typeof io !== 'undefined') {
    socket = io('http://localhost:5000', {
      auth: { token: Auth.getToken() || '' },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', function () {
      setConnectionStatus(true);
      joinRoom(currentRoom);
      Toast.success('Connected to live chat!');
    });

    socket.on('disconnect', function () {
      setConnectionStatus(false);
      addSystemMsg('Disconnected. Trying to reconnect...');
    });

    socket.on('chat:message', function (message) {
      let own = (message.sender && message.sender.name === getDisplayName());
      if (message.roomId === currentRoom) {
        appendMessage(message, own);
      } else {
        unreadCounts[message.roomId] = (unreadCounts[message.roomId] || 0) + 1;
        updateBadge(message.roomId);
      }
    });

    socket.on('chat:typing', function (data) {
      if (data.name !== getDisplayName()) showTyping(data.name, data.isTyping);
    });

    socket.on('chat:user-joined', function (data) {
      if (data.name !== getDisplayName()) addSystemMsg(data.name + ' joined the room.');
    });

    socket.on('chat:user-left', function (data) {
      addSystemMsg(data.name + ' left the room.');
    });

    socket.on('dashboard:pong', function (data) {
      let el = document.getElementById('chatOnlineCount');
      if (el) el.textContent = data.onlineCount;
    });

    socket.emit('dashboard:ping');
    setInterval(function () { if (socket.connected) socket.emit('dashboard:ping'); }, 30000);
  } else {
    setConnectionStatus(false);
    Toast.error('Could not connect to server. Make sure the backend is running on port 5000.');
  }

  function setConnectionStatus(connected) {
    let subtitle = document.getElementById('chatSubTitle');
    if (subtitle) {
      subtitle.innerHTML = '<span class="live-dot" style="background:' +
        (connected ? 'var(--clr-success)' : 'var(--clr-danger)') + '"></span> ' +
        (connected ? 'Connected' : 'Disconnected');
    }
  }

  // ── Join a room ───────────────────────────────────────────────
  function joinRoom(roomId) {
    if (socket) {
      if (currentRoom && currentRoom !== roomId) socket.emit('chat:leave', { roomId: currentRoom });
      currentRoom = roomId;
      socket.emit('chat:join', { roomId: roomId });
    } else {
      currentRoom = roomId;
    }

    // Update sidebar
    document.querySelectorAll('.room-item').forEach(function (r) {
      r.classList.toggle('active', r.dataset.room === roomId);
    });

    let room = ROOMS[roomId] || { name: roomId, icon: '💬' };
    let titleEl = document.getElementById('chatTitle');
    let iconEl  = document.getElementById('chatHeaderIcon');
    if (titleEl) titleEl.textContent = room.name;
    if (iconEl)  iconEl.textContent  = room.icon;

    // Clear messages
    let container = document.getElementById('messagesContainer');
    if (container) {
      container.innerHTML =
        '<div class="chat-welcome">' +
        '<div class="chat-welcome-icon">' + room.icon + '</div>' +
        '<h3>' + room.name + '</h3>' +
        '<p>Messages are real-time. Ask anything here.</p>' +
        '</div>';
    }

    // Reset unread
    unreadCounts[roomId] = 0;
    updateBadge(roomId);
  }

  // ── Append a message ──────────────────────────────────────────
  function appendMessage(message, isOwn) {
    let container = document.getElementById('messagesContainer');
    if (!container) return;
    container.querySelector('.chat-welcome') && container.querySelector('.chat-welcome').remove();

    let name    = (message.sender && message.sender.name) || 'Anonymous';
    let initial = name[0] ? name[0].toUpperCase() : '?';
    let time    = new Date(message.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    let content = String(message.content || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');

    let row = document.createElement('div');
    row.className = 'message-row' + (isOwn ? ' own' : '');
    row.innerHTML =
      '<div class="msg-avatar">' + initial + '</div>' +
      '<div class="msg-content">' +
        (!isOwn ? '<p class="msg-sender">' + name + '</p>' : '') +
        '<div class="msg-bubble">' + content + '</div>' +
        '<span class="msg-time">' + time + '</span>' +
      '</div>';
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function addSystemMsg(text) {
    let container = document.getElementById('messagesContainer');
    if (!container) return;
    container.querySelector('.chat-welcome') && container.querySelector('.chat-welcome').remove();
    let p = document.createElement('p');
    p.className = 'system-msg';
    p.textContent = text;
    container.appendChild(p);
    container.scrollTop = container.scrollHeight;
  }

  // ── Typing indicator ──────────────────────────────────────────
  function showTyping(name, active) {
    let indicator = document.getElementById('typingIndicator');
    let textEl    = document.getElementById('typingText');
    if (!indicator || !textEl) return;
    if (active) {
      textEl.textContent = name + ' is typing...';
      indicator.classList.add('visible');
    } else {
      indicator.classList.remove('visible');
      textEl.textContent = '';
    }
  }

  function updateBadge(roomId) {
    let badge = document.getElementById('badge-' + roomId);
    if (!badge) return;
    let count = unreadCounts[roomId] || 0;
    badge.textContent = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  }

  // ── Send message ──────────────────────────────────────────────
  function sendMessage() {
    let input   = document.getElementById('chatInput');
    let sendBtn = document.getElementById('chatSendBtn');
    if (!input || !input.value.trim()) return;

    if (!socket || !socket.connected) {
      Toast.error('Not connected. Make sure the backend is running.');
      return;
    }

    socket.emit('chat:message', { roomId: currentRoom, content: input.value.trim() });
    input.value = '';
    input.style.height = 'auto';
    if (sendBtn) sendBtn.disabled = true;

    // Stop typing
    if (isTyping) {
      isTyping = false;
      socket.emit('chat:typing', { roomId: currentRoom, isTyping: false });
    }
  }

  // ── Typing events ─────────────────────────────────────────────
  function handleTyping() {
    if (!socket || !socket.connected) return;
    if (!isTyping) {
      isTyping = true;
      socket.emit('chat:typing', { roomId: currentRoom, isTyping: true });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      isTyping = false;
      socket.emit('chat:typing', { roomId: currentRoom, isTyping: false });
    }, 1500);
  }


  // ── Chat input events ─────────────────────────────────────────
  if (chatInput) {
    chatInput.addEventListener('input', function () {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
      let sendBtn = document.getElementById('chatSendBtn');
      if (sendBtn) sendBtn.disabled = !chatInput.value.trim();
      handleTyping();
    });

    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  document.getElementById('chatSendBtn') && document.getElementById('chatSendBtn').addEventListener('click', sendMessage);

  // ── Room switching ────────────────────────────────────────────
  let roomsList = document.getElementById('roomsList');
  if (roomsList) {
    roomsList.addEventListener('click', function (e) {
      let item = e.target.closest('.room-item');
      if (item && item.dataset.room) joinRoom(item.dataset.room);
    });
    roomsList.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        let item = e.target.closest('.room-item');
        if (item && item.dataset.room) joinRoom(item.dataset.room);
      }
    });
  }

  // ── Clear chat ────────────────────────────────────────────────
  document.getElementById('clearChatBtn') && document.getElementById('clearChatBtn').addEventListener('click', function () {
    let container = document.getElementById('messagesContainer');
    let room = ROOMS[currentRoom] || { name: currentRoom, icon: '💬' };
    if (container) {
      container.innerHTML =
        '<div class="chat-welcome">' +
        '<div class="chat-welcome-icon">' + room.icon + '</div>' +
        '<h3>' + room.name + '</h3>' +
        '<p>Chat cleared.</p>' +
        '</div>';
    }
  });

  // ── Room search ───────────────────────────────────────────────
  document.getElementById('roomSearch') && document.getElementById('roomSearch').addEventListener('input', function (e) {
    let q = e.target.value.toLowerCase();
    document.querySelectorAll('.room-item').forEach(function (item) {
      let name = (item.querySelector('.room-name') || {}).textContent || '';
      item.style.display = name.toLowerCase().includes(q) ? '' : 'none';
    });
  });

});
