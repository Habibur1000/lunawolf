const assert = require('assert');
const { load } = require('./load');

const { run } = load();
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('PASS  ' + name);
  } catch (e) {
    failed++;
    console.log('FAIL  ' + name + '\n      ' + e.message);
  }
}

function fresh(site, diff) {
  run('setRandom(function () { return 0.99; }); ended = null; newGame("' + site + '","' + diff + '");');
}

test('a new game starts with the configured values', () => {
  fresh('moon', 'commander');
  assert.strictEqual(run('S.oxygen'), 80);
  assert.strictEqual(run('S.power'), 80);
  assert.strictEqual(run('S.shield'), 50);
  assert.strictEqual(run('S.food'), 80);
  assert.strictEqual(run('S.materials'), 6);
  assert.strictEqual(run('S.day'), 1);
  assert.strictEqual(run('S.ap'), 2);
});

test('actions never push a bar above 100', () => {
  fresh('moon', 'commander');
  run('S.oxygen = 95; S.power = 80;');
  run('doAction("oxygen")');
  assert.strictEqual(run('S.oxygen'), 100);
});

test('an action is refused when power is too low', () => {
  fresh('moon', 'commander');
  run('S.power = 3;');
  run('doAction("oxygen")');
  assert.strictEqual(run('S.oxygen'), 80);
  assert.strictEqual(run('S.ap'), 2);
});

test('an action is refused when materials are too low', () => {
  fresh('moon', 'commander');
  run('S.materials = 1;');
  run('doAction("solar")');
  assert.strictEqual(run('S.panels'), 3);
});

test('each action uses one of the two daily actions', () => {
  fresh('moon', 'commander');
  run('doAction("mine")');
  assert.strictEqual(run('S.ap'), 1);
  run('doAction("mine")');
  assert.strictEqual(run('S.ap'), 0);
  run('doAction("mine")');
  assert.strictEqual(run('S.materials'), 12);
});

test('solar panels make power in daylight', () => {
  fresh('moon', 'commander');
  run('S.power = 50; S.day = 5;');
  run('endDay()');
  assert.strictEqual(run('S.power'), 50 + 3 * 3 - 6);
});

test('solar panels make no power during the lunar night', () => {
  fresh('moon', 'commander');
  run('S.power = 50; S.day = 13;');
  run('endDay()');
  assert.strictEqual(run('S.power'), 44);
});

test('Mars storm season cuts solar output to 20%', () => {
  fresh('mars', 'commander');
  run('S.power = 50; S.day = 15; S.panels = 5;');
  run('endDay()');
  assert.strictEqual(run('S.power'), 50 + Math.round(5 * 2 * 0.2) - 6);
});

test('a dust storm cuts solar output and cleaning removes it', () => {
  fresh('moon', 'commander');
  run('S.dust = 3; S.day = 5; S.power = 50;');
  run('doAction("clean")');
  assert.strictEqual(run('S.dust'), 0);
  assert.strictEqual(run('S.power'), 47);
});

test('the mission fails when a bar reaches zero', () => {
  fresh('moon', 'commander');
  run('S.oxygen = 3; S.day = 5;');
  run('endDay()');
  assert.strictEqual(run('S.over'), true);
  assert.strictEqual(run('ended.won'), false);
});

test('the mission is won by surviving day 30', () => {
  fresh('moon', 'commander');
  run('S.day = 30; S.oxygen = 90; S.power = 90; S.shield = 90; S.food = 90;');
  run('endDay()');
  assert.strictEqual(run('S.over'), true);
  assert.strictEqual(run('ended.won'), true);
});

test('harder difficulty drains oxygen faster', () => {
  fresh('moon', 'cadet');
  run('S.day = 5; S.oxygen = 80;');
  run('endDay()');
  const cadet = run('S.oxygen');
  fresh('moon', 'director');
  run('S.day = 5; S.oxygen = 80;');
  run('endDay()');
  const director = run('S.oxygen');
  assert.ok(cadet > director, 'cadet ' + cadet + ' should be above director ' + director);
});

test('a better outcome gives a higher score and harder levels give a bonus', () => {
  fresh('moon', 'commander');
  run('S.day = 30; S.oxygen = 90; S.power = 90; S.shield = 90; S.food = 90;');
  const strong = run('computeScore(true)');
  run('S.oxygen = 20; S.power = 20; S.shield = 20; S.food = 20;');
  const weak = run('computeScore(true)');
  assert.ok(strong > weak);
  fresh('moon', 'director');
  run('S.day = 30; S.oxygen = 90; S.power = 90; S.shield = 90; S.food = 90;');
  assert.ok(run('computeScore(true)') > strong);
});

test('the forecast warns about the lunar night', () => {
  fresh('moon', 'commander');
  run('S.day = 10;');
  const notes = run('forecast()');
  assert.ok(notes[0].includes('starts in 3 days'));
});

test('the resource history records each day', () => {
  fresh('moon', 'commander');
  run('endDay(); endDay(); endDay();');
  assert.strictEqual(run('history.length'), 4);
});

test('the game is winnable by a planning player on every level', () => {
  for (const site of ['moon', 'mars']) {
    for (const diff of ['cadet', 'commander', 'director']) {
      let wins = 0;
      const n = 200;
      for (let i = 1; i <= n; i++) {
        const r = run('playGame("' + site + '","' + diff + '","smart",' + i + ')');
        if (r && r.won) wins++;
      }
      assert.ok(wins / n >= 0.2, site + ' ' + diff + ' win rate too low: ' + wins / n);
    }
  }
});

test('random play almost never wins, so choices matter', () => {
  let wins = 0;
  const n = 300;
  for (let i = 1; i <= n; i++) {
    const r = run('playGame("moon","commander","random",' + i + ')');
    if (r && r.won) wins++;
  }
  assert.ok(wins / n < 0.1, 'random win rate ' + wins / n);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
