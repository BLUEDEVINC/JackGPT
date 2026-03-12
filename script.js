const modeConfig = {
  default: {
    title: 'Default',
    description: 'Friendly, intelligent help for questions, learning, and creativity.'
  },
  memory: {
    title: 'Memory',
    description: 'Remembers your preferences in this session to personalize replies.'
  },
  creative: {
    title: 'Creative',
    description: 'Extra imaginative responses for stories, ideas, and worldbuilding.'
  },
  study: {
    title: 'Study',
    description: 'Clear educational explanations with easy-to-follow steps.'
  },
  code: {
    title: 'Code',
    description: 'Focused programming help for writing, debugging, and explaining code.'
  }
};

const chatLog = document.getElementById('chat-log');
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const modeTitle = document.getElementById('mode-title');
const modeDescription = document.getElementById('mode-description');
const modeButtons = [...document.querySelectorAll('.mode-btn')];
const installBtn = document.getElementById('install-btn');
const installHelp = document.getElementById('install-help');
const promptChips = [...document.querySelectorAll('.prompt-chip')];
const newChatBtn = document.getElementById('new-chat-btn');

let currentMode = 'default';
let deferredInstallPrompt;
const memory = { preferences: [] };

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addMessage(text, role = 'assistant') {
  const el = document.createElement('article');
  el.className = `message ${role}`;
  el.innerHTML = `<div class="who">${role === 'assistant' ? 'JackGPT' : 'You'}</div><p>${text}</p>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function buildReply(rawText) {
  const text = rawText.toLowerCase();

  if (currentMode === 'code') {
    return '💻 Code Mode: Share your code + error and I’ll debug step-by-step. I can help with Python, JavaScript, HTML, and architecture decisions.';
  }

  if (currentMode === 'study') {
    return '📘 Study Mode: I’ll explain clearly with definitions, examples, and a simple analogy. Tell me your level: kid, beginner, or expert.';
  }

  if (currentMode === 'creative') {
    return '🎨 Creative Mode: Nice idea! I can turn this into a story, script, poem, world, or a polished concept pitch with characters and plot.';
  }

  if (currentMode === 'memory') {
    memory.preferences.push(rawText);
    return `🧠 Memory Mode: Saved your preference. I have ${memory.preferences.length} memory note(s) in this session.`;
  }

  if (text.includes('black hole')) {
    return 'A black hole is where gravity is so strong that even light cannot escape. Imagine spacetime as a stretched sheet: a collapsed star makes a very deep dip, and nearby objects fall toward it.';
  }

  if (text.includes('email')) {
    return 'I can draft that email. Tell me: recipient, purpose, tone, and any must-include points.';
  }

  return 'Great prompt. I can help with learning, coding, writing, productivity, and brainstorming. Pick a mode for more tailored responses.';
}

function sendMessage(text) {
  const clean = text.trim();
  if (!clean) return;
  addMessage(escapeHtml(clean), 'user');

  const typing = document.createElement('article');
  typing.className = 'message assistant';
  typing.id = 'typing';
  typing.innerHTML = '<div class="who">JackGPT</div><p>Thinking...</p>';
  chatLog.appendChild(typing);
  chatLog.scrollTop = chatLog.scrollHeight;

  setTimeout(() => {
    typing.remove();
    addMessage(buildReply(clean), 'assistant');
  }, 320);
}

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentMode = btn.dataset.mode;
    modeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const mode = modeConfig[currentMode];
    modeTitle.textContent = mode.title;
    modeDescription.textContent = mode.description;
    addMessage(`Switched to <strong>${mode.title}</strong> mode. ${mode.description}`);
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(input.value);
  input.value = '';
  input.style.height = '46px';
});

promptChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    sendMessage(chip.dataset.prompt);
  });
});

newChatBtn.addEventListener('click', () => {
  chatLog.innerHTML = '';
  addMessage('New chat started. Ask me anything — science, code, writing, or ideas!');
});

input.addEventListener('input', () => {
  input.style.height = '46px';
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBtn.hidden = false;
  installHelp.textContent = 'Ready to install JackGPT.';
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.hidden = true;
  installHelp.textContent = 'Install prompt completed.';
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  installHelp.textContent = 'JackGPT installed. Launch it from your apps list.';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      installHelp.textContent = 'Service worker registration failed. Install may be unavailable.';
    });
  });
}
