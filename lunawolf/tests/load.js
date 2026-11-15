const fs = require('fs');
const path = require('path');
const vm = require('vm');

const harness = `
var ended = null;
function render() {}
function hideOverlay() {}
function endScreen(won, title, lesson, score, isBest) { ended = { won: won, title: title, lesson: lesson, score: score }; }

function seeded(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function smartTurn() {
  while (!S.over && S.ap > 0) {
    const s = S.site;
    const prep = s.nightStart && S.day >= s.nightStart - 4 && S.day < s.nightStart;
    const order = [];
    if (S.oxygen < 45) order.push('oxygen');
    if (S.food < 45) order.push('food');
    if (S.shield < 45) order.push('shield');
    if (S.dust > 0 && S.power > 20) order.push('clean');
    if (S.power < 60 && S.materials >= 2 && S.panels < 9) order.push('solar');
    if (S.materials < 2) order.push('mine');
    if (prep) {
      if (S.oxygen < 90) order.push('oxygen');
      if (S.food < 90) order.push('food');
      if (S.shield < 90) order.push('shield');
    }
    order.push('solar', 'mine', 'oxygen', 'food', 'shield');
    let acted = false;
    for (const id of order) {
      const a = ACTIONS.find((x) => x.id === id);
      if (canDo(a)) { doAction(id); acted = true; break; }
    }
    if (!acted) break;
  }
}

function randomTurn() {
  while (!S.over && S.ap > 0) {
    const a = ACTIONS[Math.floor(rand() * ACTIONS.length)];
    if (canDo(a)) doAction(a.id); else break;
  }
}

function playGame(key, diffKey, strategy, seed) {
  setRandom(seeded(seed));
  ended = null;
  newGame(key, diffKey);
  let guard = 0;
  while (!S.over && guard++ < 200) {
    if (strategy === 'smart') smartTurn(); else randomTurn();
    if (!S.over) endDay();
  }
  return ended;
}
`;

function load() {
  const dir = path.join(__dirname, '..', 'js');
  const src = ['data.js', 'game.js']
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');
  const ctx = { Math, console };
  vm.createContext(ctx);
  vm.runInContext(src + '\n' + harness, ctx);
  return { ctx, run: (code) => vm.runInContext(code, ctx) };
}

module.exports = { load };
