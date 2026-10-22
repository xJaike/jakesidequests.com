// A small SENRITSU-style demo: four lanes, one short melody, and each hit plays its note.
(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;

  const field = demo.querySelector('[data-demo-field]');
  const lanes = [...field.querySelectorAll('.demo-lane')];
  const line = field.querySelector('.demo-line');
  const judge = field.querySelector('[data-judge]');
  const comboLabel = field.querySelector('[data-combo]');
  const overlay = field.querySelector('[data-overlay]');
  const result = field.querySelector('[data-result]');
  const detail = field.querySelector('[data-result-detail]');
  const start = field.querySelector('[data-start]');
  const scoreLabel = demo.querySelector('[data-score]');
  const soundToggle = demo.querySelector('[data-sound]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const KEYS = { d: 0, f: 1, j: 2, k: 3 };
  const BEAT = 60000 / 124;
  const STEP = BEAT / 2;
  const LEAD_IN = BEAT * 4;
  const TRAVEL = 1350;
  const WINDOWS = [[45, 'Perfect', 300], [90, 'Great', 200], [150, 'Good', 100]];
  const LANE_FOR_PITCH = { 72: 0, 74: 0, 76: 1, 79: 2, 81: 3, 84: 3 };
  // [eighth-note step, MIDI pitch]: a little pentatonic tune, two phrases.
  const MELODY = [
    [0, 76], [2, 79], [4, 81], [6, 79], [7, 76], [8, 74], [10, 76], [12, 72],
    [16, 76], [18, 79], [20, 81], [22, 84], [23, 81], [24, 79], [26, 81], [28, 79], [30, 76],
    [32, 72], [34, 74], [36, 76], [38, 79], [40, 76], [42, 74], [44, 72], [46, 74],
    [48, 76], [50, 79], [52, 81], [54, 84], [55, 81], [56, 79], [58, 76], [60, 74], [62, 72]
  ];
  const SONG_END = LEAD_IN + 64 * STEP;

  let audio = null;
  let master = null;
  let soundOn = true;
  let notes = [];
  let startedAt = 0;
  let frame = 0;
  let playing = false;
  let stats;
  let geometry;

  const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

  const measure = () => {
    const fieldBox = field.getBoundingClientRect();
    geometry = {
      lineY: line.getBoundingClientRect().top - fieldBox.top + line.offsetHeight / 2,
      lanes: lanes.map(lane => {
        const box = lane.getBoundingClientRect();
        return { left: box.left - fieldBox.left, width: box.width };
      })
    };
  };

  const ensureAudio = () => {
    if (audio) return audio.resume();
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audio = new Context();
    master = audio.createGain();
    master.gain.value = soundOn ? .5 : 0;
    master.connect(audio.destination);
  };

  const tone = (midi, when, length = .32, volume = .5) => {
    if (!audio) return;
    const time = when ?? audio.currentTime;
    for (const [type, octave, level] of [['triangle', 1, 1], ['sine', 2, .25]]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = frequency(midi) * octave;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume * level, time + .008);
      gain.gain.exponentialRampToValueAtTime(.001, time + length);
      osc.connect(gain).connect(master);
      osc.start(time);
      osc.stop(time + length + .05);
    }
  };

  const kick = when => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.setValueAtTime(130, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + .14);
    gain.gain.setValueAtTime(.55, when);
    gain.gain.exponentialRampToValueAtTime(.001, when + .2);
    osc.connect(gain).connect(master);
    osc.start(when);
    osc.stop(when + .22);
  };

  const scheduleBeat = () => {
    if (!audio) return;
    const origin = audio.currentTime + .08;
    for (let beat = 0; beat * BEAT < SONG_END; beat += 1) {
      const when = origin + beat * BEAT / 1000;
      kick(when);
      // The count-in ticks so you can feel the tempo before the first note.
      if (beat < 4) tone(beat === 0 ? 84 : 79, when, .08, .18);
    }
    return 80;
  };

  const showJudge = (label, kind) => {
    judge.textContent = label;
    judge.className = `demo-judge ${kind}`;
    if (!reduceMotion.matches) {
      void judge.offsetWidth;
      judge.classList.add('pop');
    }
    comboLabel.textContent = stats.combo > 1 ? `${stats.combo} combo` : '';
    scoreLabel.textContent = `Score ${stats.score.toLocaleString()}`;
  };

  const burst = laneIndex => {
    if (reduceMotion.matches) return;
    const lane = geometry.lanes[laneIndex];
    const spark = document.createElement('span');
    spark.className = 'demo-burst';
    spark.style.left = `${lane.left + lane.width / 2}px`;
    spark.style.top = `${geometry.lineY}px`;
    for (let index = 0; index < 8; index += 1) {
      const petal = document.createElement('i');
      const angle = (index / 8) * Math.PI * 2 + Math.random() * .5;
      const distance = 26 + Math.random() * 30;
      petal.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
      petal.style.setProperty('--y', `${Math.sin(angle) * distance - 12}px`);
      petal.style.setProperty('--r', `${Math.random() * 360}deg`);
      spark.append(petal);
    }
    field.append(spark);
    setTimeout(() => spark.remove(), 650);
  };

  const hit = laneIndex => {
    if (!playing) return;
    const now = performance.now() - startedAt;
    let best = null;
    for (const note of notes) {
      if (note.lane !== laneIndex || note.judged) continue;
      const offset = Math.abs(note.time - now);
      if (offset <= WINDOWS[2][0] && (!best || offset < Math.abs(best.time - now))) best = note;
    }
    if (!best) return;
    const offset = Math.abs(best.time - now);
    const [, label, points] = WINDOWS.find(([limit]) => offset <= limit);
    best.judged = true;
    best.element?.remove();
    stats.combo += 1;
    stats.maxCombo = Math.max(stats.maxCombo, stats.combo);
    stats.score += points + Math.min(stats.combo, 50) * 10;
    stats[label] += 1;
    tone(best.pitch);
    burst(laneIndex);
    showJudge(label, label.toLowerCase());
  };

  const finish = () => {
    playing = false;
    cancelAnimationFrame(frame);
    notes.forEach(note => note.element?.remove());
    judge.textContent = '';
    comboLabel.textContent = '';
    const fullCombo = stats.Miss === 0;
    result.textContent = fullCombo ? 'Full combo!' : `Score ${stats.score.toLocaleString()}`;
    detail.textContent = `Perfect ${stats.Perfect}, great ${stats.Great}, good ${stats.Good}, miss ${stats.Miss}. Best combo ${stats.maxCombo}. The full game plays your own songs.`;
    start.textContent = 'Play again';
    overlay.hidden = false;
    start.focus({ preventScroll: true });
  };

  const tick = () => {
    const now = performance.now() - startedAt;
    for (const note of notes) {
      if (note.judged) continue;
      const until = note.time - now;
      if (until > TRAVEL + 100) continue;
      if (until < -WINDOWS[2][0]) {
        note.judged = true;
        note.element?.remove();
        stats.combo = 0;
        stats.Miss += 1;
        showJudge('Miss', 'miss');
        continue;
      }
      if (!note.element) {
        const lane = geometry.lanes[note.lane];
        note.element = document.createElement('span');
        note.element.className = `demo-note${note.lane % 2 ? ' alt' : ''}`;
        note.element.style.left = `${lane.left + 5}px`;
        note.element.style.width = `${lane.width - 10}px`;
        field.insertBefore(note.element, line);
      }
      const y = geometry.lineY * (1 - until / TRAVEL) - 9;
      note.element.style.transform = `translateY(${y.toFixed(1)}px)`;
    }
    if (now > SONG_END + 600) finish();
    else frame = requestAnimationFrame(tick);
  };

  const play = () => {
    ensureAudio();
    measure();
    stats = { score: 0, combo: 0, maxCombo: 0, Perfect: 0, Great: 0, Good: 0, Miss: 0 };
    notes = MELODY.map(([step, pitch]) => ({ time: LEAD_IN + step * STEP, lane: LANE_FOR_PITCH[pitch], pitch, judged: false, element: null }));
    const delay = scheduleBeat() ?? 80;
    startedAt = performance.now() + delay;
    scoreLabel.textContent = 'Score 0';
    judge.textContent = '';
    overlay.hidden = true;
    playing = true;
    frame = requestAnimationFrame(tick);
  };

  start.addEventListener('click', play);

  lanes.forEach((lane, index) => {
    lane.addEventListener('pointerdown', event => {
      event.preventDefault();
      lane.classList.add('is-pressed');
      hit(index);
    });
    const release = () => lane.classList.remove('is-pressed');
    lane.addEventListener('pointerup', release);
    lane.addEventListener('pointerleave', release);
  });

  document.addEventListener('keydown', event => {
    if (!playing) return;
    if (event.key === 'Escape') { finish(); return; }
    const index = KEYS[event.key.toLowerCase()];
    if (index === undefined || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    if (event.repeat) return;
    lanes[index].classList.add('is-pressed');
    hit(index);
  });
  document.addEventListener('keyup', event => {
    const index = KEYS[event.key.toLowerCase()];
    if (index !== undefined) lanes[index].classList.remove('is-pressed');
  });

  soundToggle.addEventListener('click', () => {
    soundOn = !soundOn;
    soundToggle.setAttribute('aria-pressed', String(soundOn));
    soundToggle.textContent = soundOn ? 'Sound on' : 'Sound off';
    if (master) master.gain.value = soundOn ? .5 : 0;
  });

  window.addEventListener('resize', () => { if (playing) measure(); });
})();
