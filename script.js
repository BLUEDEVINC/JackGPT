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
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiStatus = document.getElementById('api-status');

let currentMode = 'default';
let deferredInstallPrompt;
const memory = { preferences: [] };
let apiKey = localStorage.getItem('jackgpt_openai_api_key') || '';

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setApiStatus(text) {
  apiStatus.textContent = text;
}

function updateApiUI() {
  if (apiKey) {
    setApiStatus('OpenAI key saved. JackGPT will use ChatGPT responses.');
    apiKeyInput.value = '••••••••••••••••';
  } else {
    setApiStatus('No key saved. JackGPT will use local fallback replies.');
    apiKeyInput.value = '';
  }
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

function defaultQuestionAnswer(text) {
  const normalized = text.toLowerCase();
  const mathResult = parseArithmetic(normalized.replace(/^what is\s+/i, '').replace(/\?$/, ''));
  if (mathResult !== null) return `The answer is <strong>${mathResult}</strong>.`;

  const found = knowledgeCards.find((card) => card.keywords.some((keyword) => normalized.includes(keyword)));
  if (found) return found.answer;

  return 'I can answer that. Add your OpenAI API key in the sidebar so JackGPT can use ChatGPT for a richer answer.';
}

function buildSystemPrompt() {
  const modeHint = {
    default: 'Give clear, helpful answers.',
    memory: 'Use friendly personalization and remember preferences from the current chat.',
    creative: 'Be imaginative, vivid, and creative.',
    study: 'Teach step-by-step and include simple explanations.',
    code: 'Focus on programming help, debugging, and concise code explanations.'
  }[currentMode];

  return `You are JackGPT, a friendly AI assistant. Always refer to yourself as JackGPT. ${modeHint}`;
}

async function getChatGPTReply(userText) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      store: true,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: buildSystemPrompt() }]
        },
        ...memory.preferences.slice(-6).map((msg) => ({
          role: 'user',
          content: [{ type: 'input_text', text: msg }]
        })),
        {
          role: 'user',
          content: [{ type: 'input_text', text: userText }]
        }
      ],
      temperature: currentMode === 'creative' ? 0.9 : 0.4
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data?.output_text?.trim() || 'I could not generate a response.';
}

async function buildReply(rawText) {
  if (currentMode === 'memory') {
    memory.preferences.push(rawText);
  }

  if (apiKey) {
    try {
      const chatgptReply = await getChatGPTReply(rawText);
      return escapeHtml(chatgptReply).replace(/\n/g, '<br>');
    } catch (error) {
      setApiStatus(`ChatGPT call failed. Using fallback replies. ${error.message}`);
    }
  }

  return defaultQuestionAnswer(rawText);
}

async function sendMessage(text) {
  const clean = text.trim();
  if (!clean) return;
  addMessage(escapeHtml(clean), 'user');

  const typing = document.createElement('article');
  typing.className = 'message assistant';
  typing.id = 'typing';
  typing.innerHTML = '<div class="who">JackGPT</div><p>Thinking...</p>';
  chatLog.appendChild(typing);
  chatLog.scrollTop = chatLog.scrollHeight;

  const reply = await buildReply(clean);
  typing.remove();
  addMessage(reply, 'assistant');
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

saveKeyBtn.addEventListener('click', () => {
  const entered = apiKeyInput.value.trim();

  if (!entered || entered.includes('•')) {
    if (!apiKey) setApiStatus('Please paste a real OpenAI API key (starts with sk-).');
    return;
  }

  apiKey = entered;
  localStorage.setItem('jackgpt_openai_api_key', apiKey);
  updateApiUI();
  addMessage('OpenAI key saved. JackGPT will now answer using ChatGPT.');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await sendMessage(input.value);
  input.value = '';
  input.style.height = '46px';
});

promptChips.forEach((chip) => {
  chip.addEventListener('click', async () => {
    await sendMessage(chip.dataset.prompt);
  });
});

newChatBtn.addEventListener('click', () => {
  chatLog.innerHTML = '';
  memory.preferences = [];
  addMessage('New chat started. Ask me a question and I will answer as JackGPT.');
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

updateApiUI();
