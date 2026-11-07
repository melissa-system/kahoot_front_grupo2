import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const STORAGE_KEY = 'profelink-rest-viewer';

const els = {
  config: document.getElementById('config-form'),
  room: document.getElementById('room-form'),
  loginBtn: document.getElementById('login-btn'),
  authStatus: document.getElementById('auth-status'),
  me: document.getElementById('me'),
  roomOut: document.getElementById('room'),
  error: document.getElementById('error'),
  poll: document.getElementById('poll'),
};

let token = null;
let pollTimer = null;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    for (const id of ['apiUrl', 'supabaseUrl', 'anonKey', 'email']) {
      if (saved[id]) document.getElementById(id).value = saved[id];
    }
  } catch {
    /* ignore */
  }
  if (!document.getElementById('apiUrl').value) document.getElementById('apiUrl').value = 'http://localhost:3000';
}

function save() {
  const data = {};
  for (const id of ['apiUrl', 'supabaseUrl', 'anonKey', 'email']) data[id] = document.getElementById(id).value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showError(payload) {
  els.error.hidden = false;
  els.error.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
}

function clearError() {
  els.error.hidden = true;
  els.error.textContent = '';
}

async function api(path) {
  const apiUrl = document.getElementById('apiUrl').value.replace(/\/$/, '');
  const response = await fetch(`${apiUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { message: text };
  }
  if (!response.ok) {
    throw body ?? { statusCode: response.status, code: 'HTTP_ERROR', message: response.statusText };
  }
  return body;
}

function renderRoom(envelope) {
  const state = envelope.state ?? envelope;
  const scoreboard = envelope.scoreboard ?? state.results ?? [];
  const q = state.currentQuestion;
  els.roomOut.hidden = false;
  els.roomOut.innerHTML = `
    <article class="card">
      <h2>${escapeHtml(state.quizTitle ?? 'Sala')}</h2>
      <p class="meta">código ${escapeHtml(state.code)} · status ${escapeHtml(state.status)} · fase ${escapeHtml(state.phase)}</p>
      <p class="meta">pregunta ${state.currentIndex + 1} / ${state.questionsCount} · remainingMs ${envelope.remainingMs ?? '—'}</p>
    </article>
    <article class="card">
      <h2>Pregunta actual</h2>
      ${
        q
          ? `<p>${escapeHtml(q.statement)}</p>
             <p class="meta">estado ${escapeHtml(q.status)}${q.status === 'CLOSED' ? ` · correcta: ${q.correctBoolean}` : ''}</p>`
          : '<p class="meta">No hay pregunta abierta.</p>'
      }
    </article>
    <article class="card">
      <h2>Participantes (${state.participants?.length ?? 0})</h2>
      <ol>${(state.participants ?? []).map((p) => `<li>${escapeHtml(p.displayName)}</li>`).join('') || '<li class="meta">Nadie aún</li>'}</ol>
    </article>
    <article class="card">
      <h2>Scoreboard</h2>
      <ol>${scoreboard.map((r) => `<li>#${r.rank} · ${r.participantId.slice(0, 8)}… · ${r.totalScore} pts</li>`).join('') || '<li class="meta">Sin puntajes</li>'}</ol>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function fetchRoom() {
  const code = document.getElementById('code').value.trim().toUpperCase();
  if (!code) return;
  clearError();
  try {
    renderRoom(await api(`/sessions/${encodeURIComponent(code)}/state`));
  } catch (error) {
    showError(error);
  }
}

function startPoll() {
  stopPoll();
  if (!els.poll.checked) return;
  pollTimer = setInterval(() => {
    if (els.poll.checked) void fetchRoom();
  }, 3000);
}

function stopPoll() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

els.config.addEventListener('submit', async (event) => {
  event.preventDefault();
  save();
  clearError();
  els.loginBtn.disabled = true;
  els.authStatus.textContent = 'Iniciando sesión…';
  try {
    const supabase = createClient(document.getElementById('supabaseUrl').value.trim(), document.getElementById('anonKey').value.trim());
    const { data, error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    });
    if (error) throw { statusCode: 401, code: 'UNAUTHORIZED', message: error.message };
    token = data.session?.access_token ?? null;
    if (!token) throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'No hay token de acceso' };
    const me = await api('/auth/me');
    els.me.hidden = false;
    els.me.textContent = JSON.stringify(me, null, 2);
    els.authStatus.textContent = 'Sesión activa. Ya puedes consultar una sala.';
    els.room.hidden = false;
  } catch (error) {
    token = null;
    els.room.hidden = true;
    showError(error);
    els.authStatus.textContent = 'No se pudo iniciar sesión.';
  } finally {
    els.loginBtn.disabled = false;
  }
});

els.room.addEventListener('submit', async (event) => {
  event.preventDefault();
  await fetchRoom();
  startPoll();
});

els.poll.addEventListener('change', () => {
  if (els.poll.checked) startPoll();
  else stopPoll();
});

load();
