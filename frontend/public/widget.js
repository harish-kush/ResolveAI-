(function() {
  const WIDGET_API = window.RESOLVEAI_API || 'http://localhost:5000/api';
  const script = document.currentScript;
  const orgSlug = script?.getAttribute('data-org') || '';

  let config = { themeColor: '#2563EB', position: 'bottom-right', welcomeMessage: 'Hi! How can we help?', companyName: 'Support', suggestedPrompts: [] };
  let conversationId = null;
  let sessionId = localStorage.getItem('resolveai_session') || 'sess_' + Math.random().toString(36).slice(2);
  let orgId = null;
  localStorage.setItem('resolveai_session', sessionId);

  const styles = `
    #resolveai-widget-container * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, sans-serif; }
    #resolveai-bubble { position: fixed; bottom: 24px; width: 60px; height: 60px; border-radius: 50%; cursor: pointer; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 24px rgba(0,0,0,0.3); z-index: 99998; transition: transform 0.3s ease, box-shadow 0.3s ease; }
    #resolveai-bubble:hover { transform: scale(1.1); box-shadow: 0 6px 32px rgba(0,0,0,0.4); }
    #resolveai-bubble svg { width: 28px; height: 28px; fill: white; }
    #resolveai-panel { position: fixed; bottom: 96px; width: 380px; max-height: 560px; border-radius: 16px; overflow: hidden; z-index: 99999; display: none; flex-direction: column; box-shadow: 0 12px 48px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); background: #0f0f17; }
    #resolveai-panel.open { display: flex; animation: resolveai-slideup 0.3s ease; }
    @keyframes resolveai-slideup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    #resolveai-header { padding: 18px 20px; display: flex; align-items: center; gap: 12px; }
    #resolveai-header h3 { color: white; font-size: 16px; font-weight: 700; }
    #resolveai-header p { color: rgba(255,255,255,0.7); font-size: 12px; }
    #resolveai-close { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 20px; margin-left: auto; }
    #resolveai-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; min-height: 300px; max-height: 360px; background: #0a0a12; }
    .resolveai-msg { max-width: 80%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
    .resolveai-msg.customer { align-self: flex-end; color: white; border-bottom-right-radius: 4px; }
    .resolveai-msg.ai, .resolveai-msg.agent, .resolveai-msg.system { align-self: flex-start; background: #1a1a2e; color: #e2e8f0; border-bottom-left-radius: 4px; }
    .resolveai-msg.system { background: transparent; color: #64748b; font-style: italic; font-size: 12px; text-align: center; align-self: center; }
    .resolveai-msg .sender { font-size: 11px; font-weight: 600; margin-bottom: 4px; opacity: 0.7; }
    #resolveai-prompts { padding: 0 16px 12px; display: flex; flex-wrap: wrap; gap: 6px; background: #0a0a12; }
    .resolveai-prompt-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: #1a1a2e; color: #94a3b8; font-size: 12px; cursor: pointer; transition: all 0.2s; }
    .resolveai-prompt-btn:hover { border-color: rgba(255,255,255,0.2); color: white; }
    #resolveai-input-area { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; gap: 8px; background: #0f0f17; }
    #resolveai-input { flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: #1a1a2e; color: white; font-size: 14px; outline: none; font-family: inherit; }
    #resolveai-input:focus { border-color: rgba(255,255,255,0.2); }
    #resolveai-input::placeholder { color: #64748b; }
    #resolveai-send { width: 40px; height: 40px; border-radius: 10px; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    #resolveai-send:hover { opacity: 0.9; }
    #resolveai-typing { padding: 4px 16px 8px; font-size: 12px; color: #64748b; font-style: italic; background: #0a0a12; display: none; }
    @media (max-width: 480px) { #resolveai-panel { width: calc(100vw - 32px); bottom: 80px; left: 16px; right: 16px; max-height: 70vh; } }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  const container = document.createElement('div');
  container.id = 'resolveai-widget-container';
  container.innerHTML = `
    <button id="resolveai-bubble" aria-label="Open chat">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    </button>
    <div id="resolveai-panel">
      <div id="resolveai-header">
        <div>
          <h3 id="resolveai-company">${config.companyName}</h3>
          <p>Powered by ResolveAI</p>
        </div>
        <button id="resolveai-close">&times;</button>
      </div>
      <div id="resolveai-messages"></div>
      <div id="resolveai-prompts"></div>
      <div id="resolveai-typing">AI is thinking...</div>
      <div id="resolveai-input-area">
        <input id="resolveai-input" placeholder="Type your message..." />
        <button id="resolveai-send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
        </button>
      </div>
    </div>`;
  document.body.appendChild(container);

  const bubble = document.getElementById('resolveai-bubble');
  const panel = document.getElementById('resolveai-panel');
  const closeBtn = document.getElementById('resolveai-close');
  const messagesEl = document.getElementById('resolveai-messages');
  const promptsEl = document.getElementById('resolveai-prompts');
  const inputEl = document.getElementById('resolveai-input');
  const sendBtn = document.getElementById('resolveai-send');
  const typingEl = document.getElementById('resolveai-typing');
  let isOpen = false;

  function applyConfig(cfg) {
    config = { ...config, ...cfg };
    bubble.style.background = config.themeColor;
    bubble.style[config.position === 'bottom-left' ? 'left' : 'right'] = '24px';
    panel.style[config.position === 'bottom-left' ? 'left' : 'right'] = '24px';
    document.getElementById('resolveai-company').textContent = config.companyName;
    document.getElementById('resolveai-send').style.background = config.themeColor;
    if (config.suggestedPrompts?.length) {
      promptsEl.innerHTML = config.suggestedPrompts.map(p => `<button class="resolveai-prompt-btn">${p}</button>`).join('');
      promptsEl.querySelectorAll('.resolveai-prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => sendMessage(btn.textContent));
      });
    }
  }

  function addMessage(content, type, name) {
    const div = document.createElement('div');
    div.className = `resolveai-msg ${type}`;
    if (type === 'customer') div.style.background = config.themeColor;
    if (name && type !== 'customer' && type !== 'system') {
      div.innerHTML = `<div class="sender">${name}</div>${content}`;
    } else {
      div.textContent = content;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

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
        data.messages.forEach(m => addMessage(m.content, m.sender.type, m.sender.name));
      } else {
        addMessage(config.welcomeMessage, 'system');
      }
    } catch (err) {
      addMessage('Unable to connect. Please try again later.', 'system');
    }
  }

  async function sendMessage(content) {
    if (!content?.trim()) return;
    addMessage(content, 'customer');
    inputEl.value = '';
    promptsEl.style.display = 'none';
    typingEl.style.display = 'block';

    try {
      const res = await fetch(`${WIDGET_API}/widget/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content, customer: { name: 'Visitor' } })
      });
      const data = await res.json();
      typingEl.style.display = 'none';
      if (data.aiMessage) {
        addMessage(data.aiMessage.content, data.aiMessage.sender.type, data.aiMessage.sender.name);
      }
    } catch {
      typingEl.style.display = 'none';
      addMessage('Failed to send message. Please try again.', 'system');
    }
  }

  async function init() {
    try {
      const res = await fetch(`${WIDGET_API}/organization/widget/${orgSlug}`);
      const data = await res.json();
      orgId = data.organizationId;
      applyConfig(data.widgetConfig);
    } catch {
      applyConfig(config);
    }
  }

  bubble.addEventListener('click', async () => {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && !conversationId && orgId) {
      await startConversation();
    }
  });

  closeBtn.addEventListener('click', () => { isOpen = false; panel.classList.remove('open'); });
  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(inputEl.value); });

  init();
})();
