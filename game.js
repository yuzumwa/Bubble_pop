
const field = document.getElementById('playfield');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const bestEl = document.getElementById('best');
const progressEl = document.getElementById('time-progress');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const titleEl = document.getElementById('overlay-title');
const copyEl = document.getElementById('overlay-copy');
const soundBtn = document.getElementById('sound-btn');

const GAME_SECONDS = 30;
const colors = ['#ff78a9', '#8b72f2', '#54c7e8', '#ffc45d', '#67d6b0', '#f28bdc'];

let score = 0;
let timeLeft = GAME_SECONDS;
let running = false;

let spawnTimer = null;
let clockTimer = null;
let difficultyTimer = null;

let spawnDelay = 850;
let bubbleLifetime = 2600;

let audioContext = null;
let soundEnabled = localStorage.getItem('bubbleSound') !== 'false';

// SOUND ON/OFF BUTTON

function updateSoundButton() {
  soundBtn.textContent = soundEnabled
    ? 'Sound: ON 🔊'
    : 'Sound: OFF 🔇';

  soundBtn.setAttribute('aria-pressed', String(soundEnabled));
}

soundBtn.addEventListener('click', async () => {
  soundEnabled = !soundEnabled;

  localStorage.setItem('bubbleSound', soundEnabled);

  if (soundEnabled) {
    initializeAudio();

    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  }

  updateSoundButton();
});

function initializeAudio() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  return audioContext;
}

function playPopSound() {
  if (!soundEnabled) return;

  const audio = initializeAudio();
  if (!audio) return;

  if (audio.state === 'suspended') {
    audio.resume();
  }

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(650, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    180,
    audio.currentTime + 0.12
  );

  gain.gain.setValueAtTime(0.25, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audio.currentTime + 0.15
  );

  oscillator.connect(gain);
  gain.connect(audio.destination);

  oscillator.start();
  oscillator.stop(audio.currentTime + 0.15);
}

function playEndSound() {
  if (!soundEnabled) return;

  const audio = initializeAudio();
  if (!audio) return;

  if (audio.state === 'suspended') {
    audio.resume();
  }

  [440, 550, 660].forEach((frequency, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    const start = audio.currentTime + index * 0.16;

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.18, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start(start);
    oscillator.stop(start + 0.3);
  });
}

updateSoundButton();

// GAME SETTINGS

bestEl.textContent = localStorage.getItem('bubbleBest') || '0';

function clearTimers() {
  clearInterval(spawnTimer);
  clearInterval(clockTimer);
  clearInterval(difficultyTimer);
}

function clearBubbles() {
  field.querySelectorAll('.bubble').forEach(b => b.remove());
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

// CREATE BUBBLES

function spawnBubble() {
  if (!running) return;

  const size = random(38, 72);
  const bubble = document.createElement('button');

  bubble.type = 'button';
  bubble.className = 'bubble';
  bubble.setAttribute('aria-label', 'Pop bubble for 10 points');

  bubble.style.width = size + 'px';
  bubble.style.height = size + 'px';

  bubble.style.left = random(
    5,
    Math.max(6, field.clientWidth - size - 5)
  ) + 'px';

  bubble.style.top = random(
    5,
    Math.max(6, field.clientHeight - size - 5)
  ) + 'px';

  const color = colors[Math.floor(Math.random() * colors.length)];

  bubble.style.background =
    `radial-gradient(circle at 32% 27%, #ffffffb9 0 7%, ${color} 42%, ${color} 100%)`;

  bubble.addEventListener('click', () => {
    if (!running || bubble.classList.contains('pop')) return;

    score += 10;
    scoreEl.textContent = score;

    playPopSound();

    bubble.classList.add('pop');

    setTimeout(() => bubble.remove(), 130);
  });

  field.appendChild(bubble);

  setTimeout(() => {
    if (bubble.isConnected) bubble.remove();
  }, bubbleLifetime);
}

// TIMER

function updateTimer() {
  timeLeft--;

  timerEl.textContent = timeLeft;

  progressEl.style.width =
    (timeLeft / GAME_SECONDS * 100) + '%';

  if (timeLeft <= 0) {
    endGame();
  }
}

// START GAME

function startGame() {
  clearTimers();
  clearBubbles();

  score = 0;
  timeLeft = GAME_SECONDS;

  spawnDelay = 850;
  bubbleLifetime = 2600;

  running = true;

  scoreEl.textContent = '0';
  timerEl.textContent = GAME_SECONDS;
  progressEl.style.width = '100%';

  titleEl.textContent = "Let's play!";
  copyEl.textContent =
    'Tap or click the bubbles to score points. They get faster as you play!';

  startBtn.innerHTML = 'Start game <span>→</span>';

  overlay.classList.add('hidden');
  restartBtn.disabled = false;

  spawnBubble();

  spawnTimer = setInterval(spawnBubble, spawnDelay);
  clockTimer = setInterval(updateTimer, 1000);

  difficultyTimer = setInterval(() => {
    if (!running) return;

    spawnDelay = Math.max(300, spawnDelay - 80);
    bubbleLifetime = Math.max(850, bubbleLifetime - 120);

    clearInterval(spawnTimer);
    spawnTimer = setInterval(spawnBubble, spawnDelay);
  }, 5000);
}

// END GAME

async function endGame() {
  if (!running) return;

  running = false;

  clearTimers();
  clearBubbles();

  playEndSound();

  const best = Number(localStorage.getItem('bubbleBest') || 0);

  if (score > best) {
    localStorage.setItem('bubbleBest', score);
    bestEl.textContent = score;
  }

  titleEl.textContent = 'Time’s up!';

  copyEl.textContent =
    `You scored ${score} points. Want to beat that score?`;

  startBtn.innerHTML = 'Play again →';

  overlay.classList.remove('hidden');
  restartBtn.disabled = false;

  await saveScore(score);
  await loadLeaderboard();
}

// SAVE SCORE TO MYSQL

async function saveScore(finalScore) {
  if (finalScore <= 0) return;

  const name = (
    localStorage.getItem('bubblePlayerName') ||
    prompt('Enter your name for the leaderboard:') ||
    'Player'
  ).trim().slice(0, 40) || 'Player';

  localStorage.setItem('bubblePlayerName', name);

  try {
    const response = await fetch('api/save_score.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        player_name: name,
        score: finalScore
      })
    });

    if (!response.ok) {
      throw new Error('Could not save score');
    }

  } catch (error) {
    console.warn('Could not save score:', error);
  }
}

// LEADERBOARD WITH MEDALS

async function loadLeaderboard() {
  const target = document.getElementById('leaderboard-content');

  if (!target) return;

  try {
    const response = await fetch('api/leaderboard.php');

    if (!response.ok) {
      throw new Error('Leaderboard unavailable');
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data.length) {
      target.innerHTML =
        '<p class="muted">No scores yet. Be the first to play!</p>';
      return;
    }

    target.innerHTML = data.map((item, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;

      return `
        <div class="leader-row">
          <span class="rank">${medal}</span>
          <span class="player">${escapeHTML(item.player_name)}</span>
          <span class="points">
            ${Number(item.score).toLocaleString()} pts
          </span>
        </div>
      `;
    }).join('');

  } catch (error) {
    target.innerHTML =
      '<p class="muted">Leaderboard is temporarily unavailable.</p>';

    console.warn('Leaderboard error:', error);
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

// BUTTON EVENTS

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// LOAD LEADERBOARD

loadLeaderboard();
