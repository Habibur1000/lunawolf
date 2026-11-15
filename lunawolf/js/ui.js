const $ = (id) => document.getElementById(id);
let pickedDiff = 'commander';

function hideOverlay() { $('overlay').classList.add('hidden'); }
function showOverlay() { $('overlay').classList.remove('hidden'); }

function render() {
  $('place').textContent = S.site.icon + ' ' + S.site.name + ' · ' + S.diff.name;
  $('day').textContent = 'Day ' + Math.min(S.day, WIN_DAY) + ' / ' + WIN_DAY;
  $('ap').textContent = 'Actions: ' + S.ap;
  $('mat').textContent = '🧱 Materials: ' + S.materials;
  $('pan').textContent = '🔆 Panels: ' + S.panels;
  $('phase').textContent = isNight() ? '🌑 Night' : (isStorm() ? '🌪️ Storm season' : '☀️ Daylight');

  $('forecast').innerHTML = '<b>Mission control forecast</b>' +
    forecast().map((n) => '<div>' + n + '</div>').join('');

  $('bars').innerHTML = BARS.map((b) => {
    const v = Math.round(S[b.key]);
    const cls = v < 15 ? 'danger' : (v < 35 ? 'warn' : '');
    return '<div class="bar"><div class="lbl"><span>' + b.label + '</span><span>' + v + '</span></div>' +
           '<div class="track"><div class="fill ' + cls + '" style="width:' + v + '%"></div></div></div>';
  }).join('');

  const box = $('actions');
  box.innerHTML = '';
  ACTIONS.forEach((a) => {
    const btn = document.createElement('button');
    btn.innerHTML = a.name + '<small>' + a.desc + '</small>';
    btn.disabled = !canDo(a);
    btn.onclick = () => doAction(a.id);
    box.appendChild(btn);
  });

  $('log').innerHTML = log.map((e) =>
    '<div class="entry ' + (e.type || '') + '">' + e.t +
    (e.why ? '<span class="why">Why: ' + e.why + '</span>' : '') + '</div>'
  ).join('');
}

function drawChart(canvas) {
  const ctx = canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const pad = 26;
  ctx.clearRect(0, 0, w, h);
  ctx.font = '11px system-ui, Arial';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 100; g += 25) {
    const y = h - pad - (h - 2 * pad) * g / 100;
    ctx.strokeStyle = '#2a3560';
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - 8, y);
    ctx.stroke();
    ctx.fillStyle = '#8fa0c4';
    ctx.fillText(String(g), 2, y + 4);
  }
  const n = history.length;
  if (n < 2) return;
  BARS.forEach((b) => {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((p, i) => {
      const x = pad + (w - pad - 8) * i / (n - 1);
      const y = h - pad - (h - 2 * pad) * clamp(p[b.key]) / 100;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  ctx.fillStyle = '#8fa0c4';
  ctx.fillText('Day 1', pad, h - 8);
  ctx.fillText('Day ' + Math.min(history[n - 1].day, WIN_DAY), w - 58, h - 8);
}

function endScreen(won, title, lesson, score, isBest) {
  const legend = BARS.map((b) =>
    '<span style="color:' + b.color + '">● ' + b.label.replace(/^\S+\s/, '') + '</span>'
  ).join(' ');
  $('card').innerHTML =
    '<h2>' + (won ? '🎉 Mission Success' : '💥 Mission Failed') + '</h2>' +
    '<p><b>' + title + '</b></p><p>' + lesson + '</p>' +
    '<p>Score: <b>' + score + '</b>' + (isBest ? ' 🏆 New best score!' : '') + '</p>' +
    '<p class="small">Mission debrief: your resources over time</p>' +
    '<canvas id="chart" width="380" height="190" aria-label="Line chart of oxygen, power, shield and food over the mission"></canvas>' +
    '<div class="legend">' + legend + '</div>' +
    '<button class="main" onclick="showStart()">Play again</button>';
  showOverlay();
  drawChart($('chart'));
  render();
}

function pickDiff(k) {
  pickedDiff = k;
  showStart();
}

function startGame(key) {
  newGame(key, pickedDiff);
}

function showStart() {
  const segs = Object.keys(DIFFICULTY).map((k) =>
    '<button class="seg' + (k === pickedDiff ? ' on' : '') + '" onclick="pickDiff(\'' + k + '\')">' + DIFFICULTY[k].name + '</button>'
  ).join('');
  const best = loadBest();
  const bm = best['moon-' + pickedDiff] || '-';
  const bM = best['mars-' + pickedDiff] || '-';
  $('card').innerHTML =
    '<h2>🐺 LunaWolf: Outpost Commander</h2>' +
    '<p>You run a space outpost. Balance <b>oxygen, power, radiation shielding and food</b> for 30 days. Fixing one problem always costs something else.</p>' +
    '<ul><li>You get <b>2 actions per day</b>, then press End Day.</li>' +
    '<li>Random events like solar flares and dust storms can strike.</li>' +
    '<li>If any bar reaches zero, the mission fails.</li></ul>' +
    '<p style="font-size:.85rem;color:#8fa0c4">Time is shortened for gameplay. On the real Moon, night lasts about 14 Earth days.</p>' +
    '<p><b>Difficulty:</b></p><div class="segs">' + segs + '</div>' +
    '<p class="small">Best scores at this level: Moon ' + bm + ' · Mars ' + bM + '</p>' +
    '<p><b>Choose your destination:</b></p>' +
    '<button class="main" onclick="startGame(\'moon\')">🌙 Moon (night lasts 5 days)</button>' +
    '<button class="main" style="background:#c0452f" onclick="startGame(\'mars\')">🔴 Mars (dust storms, weak sunlight)</button>';
  showOverlay();
}

function showHelp() {
  const back = S.over ? 'showStart()' : 'hideOverlay()';
  $('card').innerHTML =
    '<h2>How to play</h2>' +
    '<ul><li><b>Goal:</b> keep oxygen, power, shield and food above zero for 30 days.</li>' +
    '<li><b>Each day</b> you get 2 actions, then press End Day.</li>' +
    '<li><b>Solar panels</b> make power every day, but not at night or in storm season.</li>' +
    '<li><b>Materials</b> pay for panels and shielding. Mine more when you run low.</li>' +
    '<li><b>Dust storms</b> hit panels for 3 days. Cleaning them fixes it.</li>' +
    '<li><b>Plan ahead:</b> read the forecast, the warnings in the log, and the "Why" notes.</li></ul>' +
    '<button class="main" onclick="' + back + '">Back to mission</button>';
  showOverlay();
}

$('endDay').onclick = endDay;
$('howto').onclick = showHelp;

S = { key: 'moon', site: SITES.moon, diffKey: 'commander', diff: DIFFICULTY.commander,
      day: 1, ap: ACTIONS_PER_DAY, oxygen: START.oxygen, power: START.power, shield: START.shield,
      food: START.food, materials: START.materials, panels: 3, dust: 0, over: true };
history = [snapshot()];
render();
showStart();
