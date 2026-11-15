let S = null;
let log = [];
let history = [];
let rand = Math.random;

const clamp = (v) => Math.max(0, Math.min(100, v));

function setRandom(fn) {
  rand = fn;
}

function clampAll() {
  BARS.forEach((b) => { S[b.key] = clamp(S[b.key]); });
}

function addLog(t, why, type) {
  log.unshift({ t, why, type });
  if (log.length > 8) log.pop();
}

function snapshot() {
  return { day: S.day, oxygen: S.oxygen, power: S.power, shield: S.shield, food: S.food };
}

function isNight() {
  const s = S.site;
  return !!s.nightStart && S.day >= s.nightStart && S.day <= s.nightEnd;
}

function isStorm() {
  const s = S.site;
  return !!s.stormStart && S.day >= s.stormStart && S.day <= s.stormEnd;
}

function forecast() {
  const s = S.site;
  const notes = [];
  if (s.nightStart) {
    if (S.day < s.nightStart) {
      notes.push('🌑 Lunar night starts in ' + (s.nightStart - S.day) + ' days and lasts ' + (s.nightEnd - s.nightStart + 1) + ' days.');
    } else if (S.day <= s.nightEnd) {
      notes.push('🌑 Lunar night ends in ' + (s.nightEnd - S.day + 1) + ' days.');
    } else {
      notes.push('☀️ Lunar night is over. Rebuild your reserves.');
    }
  }
  if (s.stormStart) {
    if (S.day < s.stormStart) {
      notes.push('🌪️ Dust storm season starts in ' + (s.stormStart - S.day) + ' days and lasts ' + (s.stormEnd - s.stormStart + 1) + ' days.');
    } else if (S.day <= s.stormEnd) {
      notes.push('🌪️ Dust storm season ends in ' + (s.stormEnd - S.day + 1) + ' days.');
    } else {
      notes.push('☀️ Storm season is over. Rebuild your reserves.');
    }
  }
  if (S.dust > 0) notes.push('🧹 Dust on panels for ' + S.dust + ' more days. Clean them to fix it.');
  return notes;
}

function loadBest() {
  try {
    return JSON.parse(localStorage.getItem('lunawolf-best') || '{}');
  } catch (e) {
    return {};
  }
}

function saveBest(score) {
  const k = S.key + '-' + S.diffKey;
  const best = loadBest();
  if (best[k] && best[k] >= score) return false;
  best[k] = score;
  try {
    localStorage.setItem('lunawolf-best', JSON.stringify(best));
  } catch (e) {
    return false;
  }
  return true;
}

function computeScore(won) {
  const reserves = Math.round(S.oxygen + S.power + S.shield + S.food);
  const days = Math.min(S.day, WIN_DAY) * 5;
  return Math.round((reserves + days + (won ? 200 : 0)) * S.diff.scoreBonus);
}

function newGame(key, diffKey) {
  const site = SITES[key];
  const dk = diffKey || 'commander';
  S = {
    key, site, diffKey: dk, diff: DIFFICULTY[dk],
    day: 1, ap: ACTIONS_PER_DAY,
    oxygen: START.oxygen, power: START.power, shield: START.shield, food: START.food,
    materials: START.materials, panels: site.startPanels,
    dust: 0, over: false
  };
  log = [];
  history = [snapshot()];
  addLog(
    'Mission start on the ' + site.name + ' (' + S.diff.name + '). Keep every bar above zero for ' + WIN_DAY + ' days.',
    'Fixing one system costs power or materials from another, so you must balance them.'
  );
  hideOverlay();
  render();
}

function canDo(a) {
  return !S.over && S.ap > 0 && S.materials >= a.mat && S.power >= a.pow;
}

function doAction(id) {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a || !canDo(a)) return;
  S.materials -= a.mat;
  S.power -= a.pow;
  const r = a.run(S);
  S.ap--;
  clampAll();
  addLog(r.t, r.why, 'good');
  if (!checkLose()) render();
}

function endDay() {
  if (S.over) return;
  const site = S.site;
  const d = S.diff;

  let eff = 1;
  if (isNight()) eff = 0;
  if (isStorm()) eff *= 0.2;
  if (S.dust > 0) { eff *= 0.3; S.dust--; }
  const gen = Math.round(S.panels * site.panelGen * eff);

  S.power += gen - BASE_POWER_DRAIN;
  S.oxygen -= 5 * d.drain;
  S.food -= 5 * d.drain;
  S.shield -= site.shieldDrain * d.drain;

  addLog(
    'Day ' + S.day + ' over. Solar made ' + gen + ' power; base systems used ' + BASE_POWER_DRAIN + '.',
    isNight()
      ? 'It is lunar night, so solar panels produce nothing.'
      : 'The crew breathes and eats every day, and radiation wears down your shield.'
  );

  if (S.day >= 3 && rand() < d.eventChance) {
    const total = EVENTS.reduce((sum, e) => sum + e.w, 0);
    let r = rand() * total;
    let ev = EVENTS[0];
    for (const e of EVENTS) {
      r -= e.w;
      if (r <= 0) { ev = e; break; }
    }
    const res = ev.run(S);
    addLog(res.t, res.why, res.type);
  }

  clampAll();
  if (checkLose()) return;

  S.day++;
  S.ap = ACTIONS_PER_DAY;
  history.push(snapshot());
  if (S.day > WIN_DAY) { win(); return; }

  if (site.nightStart && S.day === site.nightStart - 3)
    addLog('⚠️ Lunar night begins in 3 days!',
      'Charge power and top up oxygen, food and shield now. There will be no solar power for 5 days.', 'bad');
  if (site.nightStart && S.day === site.nightStart)
    addLog('🌑 Lunar night has begun. No solar power.',
      'Save your actions. Every power-using action drains the battery.', 'bad');
  if (site.stormStart && S.day === site.stormStart - 3)
    addLog('⚠️ Dust storm season starts in 3 days!',
      'Mars dust storms can cover huge areas and cut solar power for weeks.', 'bad');

  render();
}

function finish(won, title, lesson) {
  S.over = true;
  if (!won) history.push(snapshot());
  const score = computeScore(won);
  const isBest = saveBest(score);
  endScreen(won, title, lesson, score, isBest);
}

function checkLose() {
  for (const b of BARS) {
    if (S[b.key] <= 0) {
      finish(false, b.label + ' reached zero on day ' + S.day + '.', LOSE_LESSONS[b.key]);
      return true;
    }
  }
  return false;
}

function win() {
  finish(
    true,
    'Your crew survived ' + WIN_DAY + ' days on the ' + S.site.name + '!',
    'Real mission planners make the same trade-offs: power, life support, radiation shielding and food all compete for limited resources.'
  );
}
