const WIN_DAY = 30;
const BASE_POWER_DRAIN = 6;
const ACTIONS_PER_DAY = 2;
const START = { oxygen: 80, power: 80, shield: 50, food: 80, materials: 6 };

const DIFFICULTY = {
  cadet:     { name: 'Cadet',            drain: 0.8,  eventChance: 0.3, scoreBonus: 1 },
  commander: { name: 'Commander',        drain: 1,    eventChance: 0.4, scoreBonus: 1.25 },
  director:  { name: 'Mission Director', drain: 1.25, eventChance: 0.5, scoreBonus: 1.5 }
};

const SITES = {
  moon: {
    name: 'Moon', icon: '🌙',
    panelGen: 3, startPanels: 3, shieldDrain: 3,
    nightStart: 13, nightEnd: 17,
    stormStart: null, stormEnd: null
  },
  mars: {
    name: 'Mars', icon: '🔴',
    panelGen: 2, startPanels: 3, shieldDrain: 2,
    nightStart: null, nightEnd: null,
    stormStart: 14, stormEnd: 20
  }
};

const BARS = [
  { key: 'oxygen', label: '💨 Oxygen',           color: '#4cc9f0' },
  { key: 'power',  label: '⚡ Power',            color: '#f9c74f' },
  { key: 'shield', label: '🛡️ Radiation Shield', color: '#b388ff' },
  { key: 'food',   label: '🌱 Food',             color: '#3fb97f' }
];

const ACTIONS = [
  {
    id: 'solar', name: 'Install solar panel',
    desc: '-2 materials, +1 panel (makes power each day)', mat: 2, pow: 0,
    run: (S) => {
      S.panels++;
      return {
        t: 'Solar panel installed.',
        why: S.key === 'moon'
          ? 'Panels are your main power source, but on the Moon the night lasts about 14 Earth days and panels make nothing. Plan ahead.'
          : 'Mars gets less than half the sunlight Earth does, and dust can coat panels, so you need more of them.'
      };
    }
  },
  {
    id: 'oxygen', name: 'Run oxygen generator',
    desc: '-10 power, +20 oxygen', mat: 0, pow: 10,
    run: (S) => {
      S.oxygen += 20;
      return {
        t: 'Oxygen generator ran.',
        why: 'Life support is power-hungry: oxygen systems use electricity to split water and scrub CO2.'
      };
    }
  },
  {
    id: 'shield', name: 'Pile regolith on habitat',
    desc: '-2 materials, -5 power, +20 shield', mat: 2, pow: 5,
    run: (S) => {
      S.shield += 20;
      return {
        t: 'Habitat shielding reinforced.',
        why: 'There is no thick atmosphere or global magnetic field to protect you on the Moon. A layer of soil (regolith) over the habitat helps block radiation.'
      };
    }
  },
  {
    id: 'food', name: 'Tend the greenhouse',
    desc: '-10 power, +18 food', mat: 0, pow: 10,
    run: (S) => {
      S.food += 18;
      return {
        t: 'Greenhouse harvest improved.',
        why: 'Plants need light, water and warmth. Growing food on another world costs a lot of energy.'
      };
    }
  },
  {
    id: 'mine', name: 'Mine regolith and ice',
    desc: '-5 power, +3 materials', mat: 0, pow: 5,
    run: (S) => {
      S.materials += 3;
      return {
        t: 'Collected 3 materials.',
        why: 'Using local resources (in-situ resource utilization) means you do not have to ship everything from Earth.'
      };
    }
  },
  {
    id: 'clean', name: 'Clean solar panels',
    desc: '-3 power, clears dust from panels', mat: 0, pow: 3,
    run: (S) => {
      const hadDust = S.dust > 0;
      S.dust = 0;
      return {
        t: hadDust ? 'Panels cleaned. Full sunlight again.' : 'Panels were already clean. That action was not needed.',
        why: 'Dust on solar panels cuts the power they make, so keeping them clear matters on long missions.'
      };
    }
  }
];

const EVENTS = [
  {
    w: 3,
    run: (S) => {
      if (S.shield >= 50) {
        S.shield -= 8;
        return { type: 'good', t: '☀️ Solar flare! Crew sheltered safely.',
          why: 'Your shielding absorbed the burst of particles. This is why shield level matters.' };
      }
      S.shield -= 25; S.food -= 10;
      return { type: 'bad', t: '☀️ Solar flare hit a weakly shielded base! Shield -25, Food -10.',
        why: 'Solar particle events can harm crew and crops. Low shielding made it much worse.' };
    }
  },
  {
    w: 3,
    run: (S) => {
      S.dust = 3;
      return { type: 'bad', t: '🌪️ Dust storm! Solar panels work at 30% for 3 days. Cleaning the panels clears it.',
        why: 'Dust blocks sunlight and clings to panels. Keep a power reserve.' };
    }
  },
  {
    w: 2,
    run: (S) => {
      S.oxygen -= 15; S.shield -= 10;
      return { type: 'bad', t: '☄️ Micrometeorite punctured a wall! Oxygen -15, Shield -10.',
        why: 'With no thick atmosphere to burn them up, tiny space rocks can hit the surface at high speed.' };
    }
  },
  {
    w: 2,
    run: (S) => {
      S.power -= 15;
      return { type: 'bad', t: '🔧 Equipment failure! Power -15.',
        why: 'Hardware breaks in extreme temperatures. Spare parts and extra power margin save missions.' };
    }
  },
  {
    w: 1,
    run: (S) => {
      if (S.key === 'moon') {
        S.materials += 3; S.oxygen += 10;
        return { type: 'good', t: '📦 Supply drop from Earth! Materials +3, Oxygen +10.',
          why: 'The Moon is only a few days from Earth, so resupply is possible. Mars is many months away.' };
      }
      S.food += 15;
      return { type: 'good', t: '🥬 Bumper harvest! Food +15.',
        why: 'On Mars you must grow your own food, because resupply takes many months.' };
    }
  }
];

const LOSE_LESSONS = {
  oxygen: 'Without oxygen the crew cannot survive. Oxygen systems need power, so power and life support are linked.',
  power:  'Power is the foundation. When it hits zero, life support, farming and heating all stop.',
  shield: 'Radiation exposure became too much. Real missions must plan shielding before solar storms arrive.',
  food:   'The crew starved. Food production needs power and time, so you must plan harvests ahead.'
};
