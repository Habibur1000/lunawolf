const { load } = require('./load');

const GAMES = Number(process.argv[2]) || 1000;
const { run } = load();

const rows = [];
for (const site of ['moon', 'mars']) {
  for (const diff of ['cadet', 'commander', 'director']) {
    const rate = {};
    for (const strategy of ['smart', 'random']) {
      let wins = 0;
      for (let i = 1; i <= GAMES; i++) {
        const r = run('playGame("' + site + '","' + diff + '","' + strategy + '",' + i + ')');
        if (r && r.won) wins++;
      }
      rate[strategy] = (wins / GAMES * 100).toFixed(1) + '%';
    }
    rows.push({ site, difficulty: diff, 'planning bot': rate.smart, 'random bot': rate.random });
  }
}

console.log('Win rate over ' + GAMES + ' seeded games per row');
console.table(rows);
