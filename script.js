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

const knowledgeCards = [
  {
    keywords: ['black hole', 'black holes'],
    answer:
      'A black hole is a place in space where gravity is so strong that even light cannot escape. Most form when very massive stars collapse. Key parts are the event horizon (the boundary) and singularity (the extremely dense center).'
  },
  {
    keywords: ['photosynthesis'],
    answer:
      'Photosynthesis is how plants make food using sunlight, water, and carbon dioxide. They create glucose (energy) and release oxygen as a by-product.'
  },
  {
    keywords: ['ww2', 'world war 2', 'second world war'],
    answer:
      'World War II lasted from 1939 to 1945 and involved most of the world. It began after Germany invaded Poland and ended with Allied victory in Europe and the Pacific.'
  },
  {
    keywords: ['python', 'javascript', 'html', 'css', 'bug', 'debug'],
    answer:
      'I can help debug this. Share: (1) code snippet, (2) exact error message, (3) expected output, and (4) what you already tried.'
  },
  {
    keywords: ['email', 'write an email', 'draft email'],
    answer:
      'Sure — tell me recipient, purpose, tone (formal/casual), and key points. I will draft a clean version and a shorter alternative.'
  }
];

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

function parseArithmetic(text) {
  const trimmed = text.trim();
  const safe = /^[0-9+\-*/().\s]+$/.test(trimmed);
  if (!safe || !/[+\-*/]/.test(trimmed)) return null;

  try {
    const result = Function(`"use strict"; return (${trimmed});`)();
    if (!Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

function answerFromKnowledge(text) {
  const found = knowledgeCards.find((card) => card.keywords.some((keyword) => text.includes(keyword)));
  return found ? found.answer : null;
}

function defaultQuestionAnswer(text) {
  const mathResult = parseArithmetic(text.replace(/^what is\s+/i, '').replace(/\?$/, ''));
  if (mathResult !== null) {
    return `The answer is <strong>${mathResult}</strong>.`;
  }

  const cardAnswer = answerFromKnowledge(text);
  if (cardAnswer) return cardAnswer;

  return 'I can answer that. Give me a bit more detail so I can be precise — for example your level (kid, beginner, expert), desired format (short or step-by-step), and the exact topic.';
}

function buildReply(rawText) {
  const text = rawText.toLowerCase();

  if (currentMode === 'memory') {
    memory.preferences.push(rawText);
  }

  if (currentMode === 'code') {
    return '💻 <strong>Code Mode:</strong> I can help immediately. Paste your code and error, and I will explain the bug, provide a fixed version, and list why the fix works.';
  }

  if (currentMode === 'study') {
    const base = defaultQuestionAnswer(text);
    return `📘 <strong>Study Mode</strong><br><br>${base}<br><br><strong>Quick recap:</strong> I can also break this into simple steps if you want.`;
  }

  if (currentMode === 'creative') {
    return '🎨 <strong>Creative Mode:</strong> Great prompt! I can turn this into a story, script, poem, movie pitch, or full fictional world. Tell me your preferred style and length.';
  }

  if (text.includes('hello') || text.includes('hi ') || text === 'hi') {
    return 'Hey! 👋 Ask me any question — science, history, coding, writing, math, or productivity.';
  }

  if (text.includes('?') || text.startsWith('what') || text.startsWith('how') || text.startsWith('why')) {
    return defaultQuestionAnswer(text);
  }

  if (text.includes('joke')) {
    return 'Why did the developer go broke? Because he used up all his cache. 😄';
  }

  return 'Nice prompt. If you ask a direct question, I will answer it clearly. You can also switch to Study or Code mode for deeper help.';
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
  }, 280);
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
  addMessage('New chat started. Ask me a question and I will answer directly.');
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
