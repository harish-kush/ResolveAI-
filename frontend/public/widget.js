(function () {
  const WIDGET_API = window.RESOLVEAI_API || 'https://resolveai-q16f.onrender.com/api';
  const SOCKET_URL = window.RESOLVEAI_SOCKET || 'https://resolveai-q16f.onrender.com';
  const script = document.currentScript;
  const orgSlug = script?.getAttribute('data-org') || '';

  let config = {
    themeColor: '#6366f1',
    accentColor: '#8b5cf6',
    position: 'bottom-right',
    welcomeMessage: 'Hi there! 👋 How can we help you today?',
    companyName: 'Support',
    suggestedPrompts: []
  };

  const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  // ── Session expiry: clear if older than 2 hrs ──
  function getOrCreateSession() {
    const stored   = localStorage.getItem('resolveai_session');
    const storedAt = parseInt(localStorage.getItem('resolveai_session_at') || '0', 10);
    const now      = Date.now();

    if (stored && (now - storedAt) < SESSION_TTL_MS) {
      return stored; // still valid
    }
    // expired or brand-new — create fresh session
    const newId = 'sess_' + Math.random().toString(36).slice(2);
    localStorage.setItem('resolveai_session', newId);
    localStorage.setItem('resolveai_session_at', String(now));
    return newId;
  }

  let conversationId = null;
  let socket = null;
  let sessionId = getOrCreateSession();
  let orgId = null;
  let isOpen = false;
  let unreadCount = 0;

  // ─── STYLES ────────────────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    #resolveai-widget-container * {
      box-sizing: border-box; margin: 0; padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* ── Bubble ── */
    #resolveai-bubble {
      position: fixed; bottom: 28px; width: 64px; height: 64px;
      border-radius: 50%; cursor: pointer; border: none;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(99,102,241,0.45);
      z-index: 99998;
      background: linear-gradient(135deg, var(--ra-primary), var(--ra-accent));
      transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease;
      animation: ra-pulse 3s infinite;
    }
    #resolveai-bubble:hover {
      transform: scale(1.12);
      box-shadow: 0 12px 40px rgba(99,102,241,0.6);
      animation: none;
    }
    #resolveai-bubble svg { width: 28px; height: 28px; fill: white; transition: opacity 0.2s; }
    @keyframes ra-pulse {
      0%, 100% { box-shadow: 0 8px 32px rgba(99,102,241,0.45); }
      50% { box-shadow: 0 8px 40px rgba(99,102,241,0.7); }
    }

    /* ── Unread badge ── */
    #resolveai-badge {
      position: absolute; top: -4px; right: -4px;
      width: 22px; height: 22px; border-radius: 50%;
      background: #ef4444; color: white; font-size: 11px;
      font-weight: 700; display: none; align-items: center;
      justify-content: center; border: 2px solid white;
      box-shadow: 0 2px 8px rgba(239,68,68,0.5);
    }
    #resolveai-badge.show { display: flex; animation: ra-badge-pop 0.3s cubic-bezier(.34,1.56,.64,1); }
    @keyframes ra-badge-pop { from { transform: scale(0); } to { transform: scale(1); } }

    /* ── Panel ── */
    #resolveai-panel {
      position: fixed; bottom: 108px; width: 400px;
      max-height: 620px; border-radius: 24px;
      overflow: hidden; z-index: 99999;
      display: none; flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
      background: #0d0d1a;
      transform-origin: bottom right;
    }
    #resolveai-panel.open {
      display: flex;
      animation: ra-open 0.4s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes ra-open {
      from { opacity: 0; transform: scale(0.85) translateY(24px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* ── Header ── */
    #resolveai-header {
      padding: 20px 20px 18px;
      background: linear-gradient(135deg, var(--ra-primary) 0%, var(--ra-accent) 100%);
      position: relative; overflow: hidden;
    }
    #resolveai-header::before {
      content: '';
      position: absolute; inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
    }
    #resolveai-header-top { display: flex; align-items: center; gap: 14px; position: relative; }
    #resolveai-avatar {
      width: 46px; height: 46px; border-radius: 14px;
      background: rgba(255,255,255,0.2); display: flex;
      align-items: center; justify-content: center;
      font-size: 22px; flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      backdrop-filter: blur(8px);
    }
    #resolveai-header-info { flex: 1; }
    #resolveai-company { color: white; font-size: 17px; font-weight: 700; letter-spacing: -0.3px; }
    #resolveai-status {
      display: flex; align-items: center; gap: 6px;
      color: rgba(255,255,255,0.85); font-size: 12px; margin-top: 2px;
    }
    #resolveai-status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 8px #4ade80;
      animation: ra-blink 2s infinite;
    }
    @keyframes ra-blink { 0%,100%{opacity:1} 50%{opacity:0.5} }
    #resolveai-close {
      background: rgba(255,255,255,0.15); border: none;
      color: white; cursor: pointer; width: 32px; height: 32px;
      border-radius: 10px; display: flex; align-items: center;
      justify-content: center; transition: background 0.2s;
      backdrop-filter: blur(8px);
    }
    #resolveai-close:hover { background: rgba(255,255,255,0.25); }

    /* ── Messages area ── */
    #resolveai-messages {
      flex: 1; overflow-y: auto; padding: 16px 14px;
      display: flex; flex-direction: column; gap: 12px;
      min-height: 280px; max-height: 360px;
      background: #0d0d1a;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
    }
    #resolveai-messages::-webkit-scrollbar { width: 4px; }
    #resolveai-messages::-webkit-scrollbar-track { background: transparent; }
    #resolveai-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

    /* ── Message bubbles ── */
    .ra-msg-row { display: flex; align-items: flex-end; gap: 8px; animation: ra-msg-in 0.25s ease; }
    .ra-msg-row.customer { flex-direction: row-reverse; }
    @keyframes ra-msg-in { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }

    .ra-sender-icon {
      width: 28px; height: 28px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; flex-shrink: 0; margin-bottom: 2px;
    }
    .ra-sender-icon.ai-icon { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
    .ra-sender-icon.agent-icon { background: linear-gradient(135deg, #0ea5e9, #6366f1); }

    .ra-bubble {
      max-width: 78%; padding: 11px 15px; border-radius: 18px;
      font-size: 14px; line-height: 1.6; word-wrap: break-word;
      position: relative;
    }
    .ra-bubble.customer {
      background: linear-gradient(135deg, var(--ra-primary), var(--ra-accent));
      color: white; border-bottom-right-radius: 5px;
    }
    .ra-bubble.ai, .ra-bubble.agent {
      background: #1e1e32; color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.06);
      border-bottom-left-radius: 5px;
    }
    .ra-sender-name {
      font-size: 10px; font-weight: 600; letter-spacing: 0.5px;
      text-transform: uppercase; opacity: 0.6;
      margin-bottom: 3px; padding: 0 2px;
    }
    .ra-timestamp {
      font-size: 10px; opacity: 0.45; margin-top: 4px;
      text-align: right;
    }
    .ra-bubble.customer .ra-timestamp { color: rgba(255,255,255,0.6); }
    .ra-bubble.ai .ra-timestamp, .ra-bubble.agent .ra-timestamp { color: rgba(226,232,240,0.5); }

    /* ── System messages ── */
    .ra-system-msg {
      text-align: center; font-size: 11px; color: #475569;
      font-style: italic; padding: 4px 12px;
      background: rgba(255,255,255,0.02); border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.04);
      align-self: center; max-width: 85%;
    }

    /* ── Agent badge ── */
    .ra-agent-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: 600; color: #60a5fa;
      background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.2);
      border-radius: 20px; padding: 2px 8px; margin-bottom: 4px;
    }

    /* ── Typing indicator ── */
    #resolveai-typing {
      padding: 0 14px 10px; display: none; align-items: center; gap: 8px;
      background: #0d0d1a; animation: ra-msg-in 0.2s ease;
    }
    .ra-typing-bubble {
      background: #1e1e32; border-radius: 16px; border-bottom-left-radius: 5px;
      padding: 10px 14px; display: flex; gap: 5px; align-items: center;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .ra-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #6366f1; opacity: 0.6;
      animation: ra-typing 1.3s infinite;
    }
    .ra-dot:nth-child(2) { animation-delay: 0.2s; }
    .ra-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ra-typing { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-5px);opacity:1} }

    /* ── Suggested prompts ── */
    #resolveai-prompts { padding: 0 14px 10px; display: flex; flex-wrap: wrap; gap: 6px; background: #0d0d1a; }
    .ra-prompt-btn {
      padding: 7px 14px; border-radius: 20px;
      border: 1px solid rgba(99,102,241,0.3);
      background: rgba(99,102,241,0.07); color: #a5b4fc;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: all 0.2s ease; font-family: inherit;
    }
    .ra-prompt-btn:hover {
      border-color: rgba(99,102,241,0.6);
      background: rgba(99,102,241,0.15); color: #c7d2fe;
      transform: translateY(-1px);
    }

    /* ── Input area ── */
    #resolveai-input-area {
      padding: 12px 14px 14px;
      border-top: 1px solid rgba(255,255,255,0.05);
      display: flex; gap: 10px; align-items: center;
      background: #0d0d1a;
    }
    #resolveai-input {
      flex: 1; padding: 11px 16px; border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
      background: #1a1a2e; color: #f1f5f9; font-size: 14px;
      outline: none; font-family: inherit; resize: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      height: 44px; line-height: 1.5;
    }
    #resolveai-input:focus {
      border-color: rgba(99,102,241,0.5);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }
    #resolveai-input::placeholder { color: #475569; }
    #resolveai-send {
      width: 44px; height: 44px; border-radius: 14px; border: none;
      background: linear-gradient(135deg, var(--ra-primary), var(--ra-accent));
      color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(99,102,241,0.4);
      transition: transform 0.2s, box-shadow 0.2s; flex-shrink: 0;
    }
    #resolveai-send:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(99,102,241,0.55); }
    #resolveai-send:active { transform: translateY(0); }
    #resolveai-send svg { width: 18px; height: 18px; }

    /* ── Powered by ── */
    #resolveai-footer {
      padding: 6px 14px 10px; text-align: center;
      font-size: 10px; color: #334155; background: #0d0d1a;
      letter-spacing: 0.3px;
    }
    #resolveai-footer a { color: #475569; text-decoration: none; }
    #resolveai-footer a:hover { color: #6366f1; }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      #resolveai-panel { width: calc(100vw - 24px); bottom: 90px; max-height: 75vh; }
    }
  `;

  // ─── CSS VARIABLES ──────────────────────────────────────────────────────────
  const cssVars = document.createElement('style');
  cssVars.textContent = `:root { --ra-primary: #6366f1; --ra-accent: #8b5cf6; }`;
  document.head.appendChild(cssVars);

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ─── HTML STRUCTURE ─────────────────────────────────────────────────────────
  const container = document.createElement('div');
  container.id = 'resolveai-widget-container';
  container.innerHTML = `
    <button id="resolveai-bubble" aria-label="Open support chat">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <span id="resolveai-badge"></span>
    </button>
    <div id="resolveai-panel" role="dialog" aria-label="Chat support">
      <div id="resolveai-header">
        <div id="resolveai-header-top">
          <div id="resolveai-avatar">🤖</div>
          <div id="resolveai-header-info">
            <div id="resolveai-company">${config.companyName}</div>
            <div id="resolveai-status">
              <span id="resolveai-status-dot"></span>
              <span id="resolveai-status-text">Online • Typically replies instantly</span>
            </div>
          </div>
          <button id="resolveai-close" aria-label="Close chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div id="resolveai-messages" role="log" aria-live="polite"></div>
      <div id="resolveai-typing">
        <div class="ra-typing-bubble">
          <span class="ra-dot"></span><span class="ra-dot"></span><span class="ra-dot"></span>
        </div>
      </div>
      <div id="resolveai-prompts"></div>
      <div id="resolveai-input-area">
        <input id="resolveai-input" placeholder="Write a message..." aria-label="Chat message" autocomplete="off" />
        <button id="resolveai-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div id="resolveai-footer">Powered by <a href="#" target="_blank">ResolveAI</a></div>
    </div>`;
  document.body.appendChild(container);

  // ─── DOM REFS ───────────────────────────────────────────────────────────────
  const bubble   = document.getElementById('resolveai-bubble');
  const panel    = document.getElementById('resolveai-panel');
  const closeBtn = document.getElementById('resolveai-close');
  const messagesEl = document.getElementById('resolveai-messages');
  const promptsEl  = document.getElementById('resolveai-prompts');
  const inputEl    = document.getElementById('resolveai-input');
  const sendBtn    = document.getElementById('resolveai-send');
  const typingEl   = document.getElementById('resolveai-typing');
  const badgeEl    = document.getElementById('resolveai-badge');

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  function formatTime(date) {
    return new Date(date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function setBadge(n) {
    unreadCount = n;
    badgeEl.textContent = n > 9 ? '9+' : n;
    badgeEl.classList.toggle('show', n > 0);
  }

  function applyConfig(cfg) {
    if (!cfg) return;
    config = { ...config, ...cfg };
    const primary = cfg.themeColor || '#6366f1';
    const accent  = cfg.accentColor || shiftColor(primary, 30);
    cssVars.textContent = `:root { --ra-primary: ${primary}; --ra-accent: ${accent}; }`;
    document.getElementById('resolveai-company').textContent = config.companyName || 'Support';
    bubble.style[config.position === 'bottom-left' ? 'left' : 'right'] = '28px';
    panel.style[config.position === 'bottom-left' ? 'left' : 'right'] = '28px';
    if (config.suggestedPrompts?.length) renderPrompts(config.suggestedPrompts);
  }

  function shiftColor(hex, deg) {
    // Naive accent: just darken/brighten for fallback
    return hex;
  }

  function renderPrompts(prompts) {
    promptsEl.innerHTML = prompts.map(p =>
      `<button class="ra-prompt-btn">${p}</button>`
    ).join('');
    promptsEl.querySelectorAll('.ra-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => sendMessage(btn.textContent));
    });
  }

  function addMessage(content, type, name, timestamp) {
    if (type === 'system') {
      const el = document.createElement('div');
      el.className = 'ra-system-msg';
      el.textContent = content;
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return;
    }

    const row = document.createElement('div');
    row.className = `ra-msg-row ${type}`;

    let iconHtml = '';
    if (type === 'ai') {
      iconHtml = `<div class="ra-sender-icon ai-icon">🤖</div>`;
    } else if (type === 'agent') {
      iconHtml = `<div class="ra-sender-icon agent-icon">👤</div>`;
    }

    const agentBadge = type === 'agent'
      ? `<div class="ra-agent-badge">⚡ Human Agent</div>`
      : '';

    const senderLabel = (type !== 'customer' && name)
      ? `<div class="ra-sender-name">${name}</div>`
      : '';

    row.innerHTML = `
      ${type !== 'customer' ? iconHtml : ''}
      <div>
        ${agentBadge}
        ${senderLabel}
        <div class="ra-bubble ${type}">
          ${content.replace(/\n/g, '<br>')}
          <div class="ra-timestamp">${formatTime(timestamp)}</div>
        </div>
      </div>
      ${type === 'customer' ? iconHtml : ''}
    `;

    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Badge for unread (only when panel is closed)
    if (!isOpen && type !== 'customer') {
      setBadge(unreadCount + 1);
    }
  }

  // ─── SOCKET.IO ──────────────────────────────────────────────────────────────
  function loadSocketIO(callback) {
    if (window.io) return callback();
    const s = document.createElement('script');
    s.src = `${SOCKET_URL}/socket.io/socket.io.js`;
    s.onload = callback;
    s.onerror = () => console.warn('[ResolveAI] Socket.IO failed to load — real-time disabled');
    document.head.appendChild(s);
  }

  function connectSocket() {
    if (!conversationId || !window.io) return;
    if (socket) return; // already connected

    socket = window.io(SOCKET_URL, {
      auth: { sessionId },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('joinConversation', conversationId);
    });

    // ← THIS is the core fix: listen for agent messages in real-time
    socket.on('newMessage', (msg) => {
      // Ignore customer's own messages (already displayed optimistically)
      if (msg.sender?.type === 'customer') return;
      typingEl.style.display = 'none';
      addMessage(msg.content, msg.sender?.type || 'ai', msg.sender?.name, msg.createdAt);
    });

    socket.on('agentTakeover', ({ agent }) => {
      const statusText = document.getElementById('resolveai-status-text');
      if (statusText) {
        statusText.textContent = agent === 'AI'
          ? 'Online • Typically replies instantly'
          : `Connected with ${agent}`;
      }
      const avatar = document.getElementById('resolveai-avatar');
      if (avatar) avatar.textContent = agent === 'AI' ? '🤖' : '👤';
    });

    socket.on('disconnect', () => {
      socket = null;
    });
  }

  // ─── API CALLS ──────────────────────────────────────────────────────────────
  async function startConversation() {
    try {
      const res = await fetch(`${WIDGET_API}/widget/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, customer: { name: 'Visitor' }, sessionId })
      });
      const data = await res.json();
      conversationId = data.conversation._id;
      if (data.widgetConfig) applyConfig(data.widgetConfig);

      if (data.messages?.length) {
        data.messages.forEach(m => addMessage(m.content, m.sender.type, m.sender.name, m.createdAt));
      } else {
        addMessage(config.welcomeMessage, 'system');
      }

      // Connect socket AFTER we have a conversationId
      connectSocket();
    } catch {
      addMessage('Unable to connect. Please try again later.', 'system');
    }
  }

  async function sendMessage(content) {
    if (!content?.trim()) return;
    addMessage(content, 'customer', null, new Date());
    inputEl.value = '';
    promptsEl.style.display = 'none';
    typingEl.style.display = 'flex';

    // Refresh TTL on each message so active chats don't expire mid-conversation
    localStorage.setItem('resolveai_session_at', String(Date.now()));

    try {
      const res = await fetch(`${WIDGET_API}/widget/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content, customer: { name: 'Visitor' } })
      });
      const data = await res.json();
      typingEl.style.display = 'none';

      // AI & agent messages arrive via socket 'newMessage' event in real-time.
      // The socket listener handles ALL incoming messages (AI, agent, system).
      // We only need to handle the fallback case where socket isn't connected yet.
      if (!socket && data.aiMessage) {
        addMessage(data.aiMessage.content, data.aiMessage.sender.type, data.aiMessage.sender.name, data.aiMessage.createdAt);
      }
    } catch {
      typingEl.style.display = 'none';
      addMessage('Failed to send. Please try again.', 'system');
    }
  }

  async function init() {
    bubble.style.right = '28px';
    panel.style.right  = '28px';

    try {
      const res = await fetch(`${WIDGET_API}/organization/widget/${orgSlug}`);
      if (res.ok) {
        const data = await res.json();
        orgId = data.organizationId;
        applyConfig(data.widgetConfig);
      }
    } catch { /* use defaults */ }

    // Pre-load Socket.IO so it's ready when panel opens
    loadSocketIO(() => {});
  }

  // ─── SESSION EXPIRY CHECK ────────────────────────────────────────────────────
  function isSessionExpired() {
    const storedAt = parseInt(localStorage.getItem('resolveai_session_at') || '0', 10);
    return storedAt > 0 && (Date.now() - storedAt) >= SESSION_TTL_MS;
  }

  function resetSession() {
    // Disconnect socket
    if (socket) { socket.disconnect(); socket = null; }
    // Generate new session
    const newId = 'sess_' + Math.random().toString(36).slice(2);
    localStorage.setItem('resolveai_session', newId);
    localStorage.setItem('resolveai_session_at', String(Date.now()));
    sessionId = newId;
    conversationId = null;
    // Clear the messages panel
    messagesEl.innerHTML = '';
    promptsEl.innerHTML = '';
    promptsEl.style.display = '';
    typingEl.style.display = 'none';
  }

  // ─── EVENTS ─────────────────────────────────────────────────────────────────
  bubble.addEventListener('click', async () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen) {
      setBadge(0);
      // If the 2-hour TTL has elapsed, wipe everything and start fresh
      if (isSessionExpired()) {
        resetSession();
        if (orgId) await startConversation();
      } else if (!conversationId && orgId) {
        await startConversation();
      } else if (!socket && conversationId) {
        connectSocket();
      }
      setTimeout(() => inputEl.focus(), 100);
    }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.classList.remove('open');
  });

  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value);
    }
  });

  init();
})();
