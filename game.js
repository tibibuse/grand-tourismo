const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const speedEl = document.getElementById('speed');
const finalScoreEl = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const road = {
  left: 64,
  width: 292,
  lanes: 3,
  stripeHeight: 62,
  stripeOffset: 0,
};

const state = {
  running: false,
  score: 0,
  best: Number(localStorage.getItem('grandTourismoBest') || 0),
  speed: 0,
  lastTime: 0,
  spawnTimer: 0,
};

const player = {
  lane: 1,
  x: 0,
  y: canvas.height - 110,
  width: 42,
  height: 76,
  color: '#4ade80',
};

let enemyCars = [];
let pointerStartX = 0;

function laneX(lane) {
  const laneWidth = road.width / road.lanes;
  return road.left + laneWidth * (lane + 0.5);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateHud() {
  scoreEl.textContent = Math.floor(state.score);
  bestScoreEl.textContent = state.best;
  speedEl.textContent = Math.floor(state.speed);
}

function resetPlayer() {
  player.lane = 1;
  player.x = laneX(player.lane);
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.speed = 0;
  state.spawnTimer = 800;
  road.stripeOffset = 0;
  enemyCars = [];
  resetPlayer();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  updateHud();
}

function endGame() {
  state.running = false;
  finalScoreEl.textContent = Math.floor(state.score);

  if (state.score > state.best) {
    state.best = Math.floor(state.score);
    localStorage.setItem('grandTourismoBest', String(state.best));
  }

  updateHud();
  gameOverScreen.classList.remove('hidden');
}

function moveLane(direction) {
  if (!state.running) return;
  player.lane = clamp(player.lane + direction, 0, road.lanes - 1);
}

function spawnEnemy() {
  const lane = Math.floor(Math.random() * road.lanes);
  const colors = ['#f87171', '#fbbf24', '#a78bfa', '#38bdf8', '#fb7185', '#f97316'];

  enemyCars.push({
    lane,
    x: laneX(lane),
    y: -90,
    width: 42,
    height: 76,
    color: colors[Math.floor(Math.random() * colors.length)],
  });
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#1f2a38');
  sky.addColorStop(1, '#0f172a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 30; i += 1) {
    const x = (i * 47) % canvas.width;
    const y = (i * 53) % (canvas.height * 0.75);
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(road.left - 8, 0, road.width + 16, canvas.height);

  ctx.fillStyle = '#333d4d';
  ctx.fillRect(road.left, 0, road.width, canvas.height);

  ctx.strokeStyle = '#b9c7d6';
  ctx.lineWidth = 3;
  ctx.strokeRect(road.left, 0, road.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 22]);

  for (let lane = 1; lane < road.lanes; lane += 1) {
    const x = road.left + (road.width / road.lanes) * lane;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawCar(car, isPlayer = false) {
  const x = car.x - car.width / 2;
  const y = car.y - car.height / 2;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(8, 10, car.width - 16, car.height - 10);

  ctx.fillStyle = isPlayer ? '#4ade80' : car.color;
  ctx.fillRect(4, 0, car.width - 8, car.height);

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(12, 12, car.width - 24, 16);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 8, 6, 14);
  ctx.fillRect(car.width - 6, 8, 6, 14);
  ctx.fillRect(0, car.height - 22, 6, 14);
  ctx.fillRect(car.width - 6, car.height - 22, 6, 14);

  ctx.restore();
}

function drawRoadLines() {
  const stripeStep = road.stripeHeight;
  const offset = (road.stripeOffset += state.speed * 0.14) % stripeStep;

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let y = -stripeStep + offset; y < canvas.height + stripeStep; y += stripeStep) {
    ctx.fillRect(canvas.width / 2 - 6, y, 12, 40);
  }
}

function update(dt) {
  if (!state.running) {
    return;
  }

  state.speed = Math.min(240, state.speed + dt * 0.025);
  state.score += dt * 0.02;
  road.stripeOffset += state.speed * 0.1;

  player.x += (laneX(player.lane) - player.x) * 0.18;

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = Math.max(600, 1500 - state.score * 3.4);
  }

  for (let i = enemyCars.length - 1; i >= 0; i -= 1) {
    const enemy = enemyCars[i];
    enemy.y += (state.speed + 80) * dt * 0.009;

    if (
      enemy.lane === player.lane &&
      Math.abs(enemy.y - player.y) < (enemy.height + player.height) * 0.5
    ) {
      endGame();
      return;
    }

    if (enemy.y > canvas.height + 90) {
      enemyCars.splice(i, 1);
      state.score += 15;
    }
  }

  updateHud();
}

function render() {
  drawBackground();
  drawRoadLines();

  drawCar(player, true);
  enemyCars.forEach((enemy) => drawCar(enemy, false));
}

function loop(timestamp) {
  const dt = timestamp - (state.lastTime || timestamp);
  state.lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function handleKeyChange(event, direction) {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    event.preventDefault();
    moveLane(-1);
  }

  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    event.preventDefault();
    moveLane(1);
  }

  if (event.key === 'Enter' && !state.running) {
    resetGame();
  }
}

window.addEventListener('keydown', (event) => {
  handleKeyChange(event, 0);
});

canvas.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;

  if (clickX < rect.width / 2) {
    moveLane(-1);
  } else {
    moveLane(1);
  }
});

startButton.addEventListener('click', resetGame);
restartButton.addEventListener('click', resetGame);

updateHud();
requestAnimationFrame(loop);
