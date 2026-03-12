const modeConfig = {
  default: {
    title: 'Default Mode',
    description: 'Friendly, intelligent help for questions, learning, and creativity.'
  },
  memory: {
    title: 'Memory Mode',
    description: 'Remembers your preferences in this session to personalize replies.'
  },
  creative: {
    title: 'Creative Mode',
    description: 'Extra imaginative responses for stories, ideas, and worldbuilding.'
  },
  study: {
    title: 'Study Mode',
    description: 'Clear educational explanations with easy-to-follow steps.'
  },
  code: {
    title: 'Code Mode',
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

let currentMode = 'default';
let deferredInstallPrompt;

const memory = {
  preferences: []
};

function addMessage(text, role = 'assistant') {
  const el = document.createElement('article');
  el.className = `message ${role}`;
  el.innerHTML = `<p>${text}</p>`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildReply(rawText) {
  const text = rawText.toLowerCase();

  if (currentMode === 'code') {
    return 'Code Mode activated 💻 — I can help with Python, JavaScript, HTML, debugging, and clean architecture. Share your code snippet and your expected result.';
  }

  if (currentMode === 'study') {
    return 'Study Mode 📘: I’ll explain this step by step with a simple analogy, key terms, and a quick recap. Tell me your level (kid, beginner, expert) for best results.';
  }

  if (currentMode === 'creative') {
    return 'Creative Mode 🎨: Awesome prompt! I can turn that into a story, script, poem, concept pitch, or even a whole fictional universe.';
  }

  if (text.includes('black hole')) {
    return 'A black hole is a region in space where gravity is so strong that even light cannot escape. Think of spacetime like a trampoline: a massive star collapses and creates a very deep dent. Nearby objects roll toward it unless they have enough speed to escape.';
  }

  if (text.includes('email')) {
    return 'Sure! I can draft a polished email in seconds. Tell me your goal, recipient, tone (formal/casual), and any key points to include.';
  }

  if (currentMode === 'memory') {
    memory.preferences.push(rawText);
    return `Memory Mode 🧠: Got it — I’ll remember that preference in this session. Saved notes: ${memory.preferences.length}.`;
  }

  return 'Great question! I can help with learning, coding, writing, planning, or brainstorming. If you want, I can switch to Study, Creative, Memory, or Code mode for a tailored response.';
}

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentMode = btn.dataset.mode;
    modeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const mode = modeConfig[currentMode];
    modeTitle.textContent = mode.title;
    modeDescription.textContent = mode.description;

    addMessage(`Switched to <strong>${mode.title}</strong>. ${mode.description}`);
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(escapeHtml(text), 'user');
  const reply = buildReply(text);
  addMessage(reply, 'assistant');
  input.value = '';
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
  installHelp.textContent = 'JackGPT install prompt completed.';
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  installHelp.textContent = 'JackGPT is installed. Launch it from your apps list.';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      installHelp.textContent = 'Service worker registration failed. App install may be unavailable.';
    });
  });
}
