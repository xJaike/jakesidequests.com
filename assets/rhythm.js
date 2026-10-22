// The SENRITSU web demo: thirty seconds of Champion's Rise, with arrows charted to the song's own beats
// (see scripts/build_media.py). Timing runs off the audio clock so notes stay locked to the music.
(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;

  const field = demo.querySelector('[data-demo-field]');
  const lanes = [...field.querySelectorAll('.demo-lane')];
  const judge = field.querySelector('[data-judge]');
  const overlay = field.querySelector('[data-overlay]');
  const result = field.querySelector('[data-result]');
  const detail = field.querySelector('[data-result-detail]');
  const start = field.querySelector('[data-start]');
  const scoreLabel = field.querySelector('[data-score]');
  const accuracyLabel = field.querySelector('[data-acc]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const KEYS = { d: 0, f: 1, j: 2, k: 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };
  const TRAVEL = 1150;
  const WINDOWS = [[50, 'Perfect', 300, 1], [100, 'Great', 200, .7], [150, 'Good', 100, .4]];
  const BEAT = 400;

  let context = null;
  let buffer = null;
  let source = null;
  let chart = null;
  let songStart = 0;
  let notes = [];
  let playing = false;
  let frame = 0;
  let stats;
  let geometry;
  let musicWasOn = false;

  const load = (() => {
    let promise;
    return () => promise ||= Promise.all([
      fetch('/assets/media/media.json').then(response => response.json()),
      fetch('/assets/media/demo-champions-rise.mp3').then(response => response.arrayBuffer())
    ]).then(([data, audio]) => {
      chart = data;
      return audioContext().decodeAudioData(audio);
    }).then(decoded => { buffer = decoded; });
  })();

  function audioContext() {
    if (!context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      context = new Context();
    }
    return context;
  }

  // Start fetching once the visitor shows interest, so Play starts instantly.
  ['pointerenter', 'focusin'].forEach(type => demo.addEventListener(type, () => load().catch(() => {}), { once: true }));

  const songTime = () => (context.currentTime - songStart - (context.outputLatency || 0)) * 1000;

  const measure = () => {
    const box = field.getBoundingClientRect();
    geometry = lanes.map(lane => {
      const receptor = lane.querySelector('.receptor').getBoundingClientRect();
      return { left: receptor.left - box.left, size: receptor.width, centerY: receptor.top - box.top + receptor.height / 2 };
    });
  };

  const tick = () => {
    const now = songTime();
    for (const note of notes) {
      if (note.judged) continue;
      const until = note.time - now;
      if (until > TRAVEL + 100) break;
      if (until < -WINDOWS[2][0]) {
        note.judged = true;
        note.element?.remove();
        record(null);
        continue;
      }
      const lane = geometry[note.lane];
      if (!note.element) {
        note.element = document.createElement('span');
        note.element.className = `demo-note lane-${note.lane}`;
        note.element.style.left = `${lane.left}px`;
        note.element.style.width = `${lane.size}px`;
        field.insertBefore(note.element, judge);
      }
      const y = lane.centerY * (1 - until / TRAVEL) - lane.size / 2;
      note.element.style.transform = `translateY(${y.toFixed(1)}px)`;
    }
    // Let the page pulse on the song's beat while the demo plays.
    const phase = ((now % BEAT) + BEAT) % BEAT / BEAT;
    document.documentElement.style.setProperty('--beat', Math.max(0, 1 - phase * 3).toFixed(3));
    if (now > chart.length - 400) finish();
    else frame = requestAnimationFrame(tick);
  };

  function record(rating) {
    if (rating) {
      const [, label, points, weight] = rating;
      stats.combo += 1;
      stats.best = Math.max(stats.best, stats.combo);
      stats.score += points + Math.min(stats.combo, 50) * 10;
      stats.weight += weight;
      stats[label] += 1;
      showJudge(label, label === 'Perfect' ? 'On beat' : `${stats.combo} combo`);
    } else {
      stats.combo = 0;
      stats.Miss += 1;
      showJudge('Miss', '');
    }
    stats.judged += 1;
    scoreLabel.textContent = `Score ${stats.score.toLocaleString()}`;
    accuracyLabel.textContent = `Acc ${(stats.weight / stats.judged * 100).toFixed(1)}%`;
  }

  function showJudge(label, sub) {
    judge.className = `demo-judge ${label.toLowerCase()}`;
    judge.replaceChildren();
    const strong = document.createElement('strong');
    strong.textContent = label.toUpperCase();
    judge.append(strong);
    if (sub) {
      const span = document.createElement('span');
      span.textContent = sub.toUpperCase();
      judge.append(span);
    }
    if (!reduceMotion.matches) {
      void judge.offsetWidth;
      judge.classList.add('pop');
    }
  }

  function burst(laneIndex) {
    if (reduceMotion.matches) return;
    const lane = geometry[laneIndex];
    const spark = document.createElement('span');
    spark.className = `demo-burst lane-${laneIndex}`;
    spark.style.left = `${lane.left + lane.size / 2}px`;
    spark.style.top = `${lane.centerY}px`;
    spark.append(document.createElement('b'));
    for (let index = 0; index < 9; index += 1) {
      const star = document.createElement('i');
      const angle = (index / 9) * Math.PI * 2 + Math.random() * .4;
      const distance = 34 + Math.random() * 30;
      star.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
      star.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
      star.style.setProperty('--r', `${Math.random() * 360}deg`);
      spark.append(star);
    }
    field.append(spark);
    setTimeout(() => spark.remove(), 600);
  }

  function click() {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = 1800;
    gain.gain.setValueAtTime(.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .05);
    osc.connect(gain).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + .06);
  }

  function hit(laneIndex) {
    if (!playing) return;
    const now = songTime();
    let best = null;
    for (const note of notes) {
      if (note.judged || note.lane !== laneIndex) continue;
      const offset = Math.abs(note.time - now);
      if (offset > WINDOWS[2][0]) { if (note.time > now) break; continue; }
      if (!best || offset < Math.abs(best.time - now)) best = note;
    }
    if (!best) return;
    best.judged = true;
    best.element?.remove();
    const offset = Math.abs(best.time - now);
    record(WINDOWS.find(([limit]) => offset <= limit));
    burst(laneIndex);
    click();
  }

  function finish() {
    playing = false;
    cancelAnimationFrame(frame);
    try { source?.stop(); } catch (_) { /* Already stopped. */ }
    notes.forEach(note => note.element?.remove());
    judge.replaceChildren();
    document.documentElement.style.setProperty('--beat', '0');
    const total = notes.length;
    result.textContent = stats.Miss === 0 && stats.judged === total ? 'Full combo!' : `Score ${stats.score.toLocaleString()}`;
    detail.textContent = `Perfect ${stats.Perfect}, great ${stats.Great}, good ${stats.Good}, miss ${stats.Miss}. Best combo ${stats.best}. In the game, every song you import gets charts like this.`;
    start.textContent = 'Play again';
    overlay.hidden = false;
    start.focus({ preventScroll: true });
    if (musicWasOn) window.jsqMusic?.play();
  }

  async function play() {
    start.disabled = true;
    start.textContent = 'Loading…';
    try {
      await load();
      await audioContext().resume();
    } catch (_) {
      start.disabled = false;
      start.textContent = 'Play the demo';
      detail.textContent = 'The demo could not load its song. Check your connection and try again.';
      return;
    }
    musicWasOn = !!window.jsqMusic?.playing;
    window.jsqMusic?.pause();
    measure();
    stats = { score: 0, combo: 0, best: 0, weight: 0, judged: 0, Perfect: 0, Great: 0, Good: 0, Miss: 0 };
    notes = chart.notes.map(([time, lane]) => ({ time, lane, judged: false, element: null }));
    scoreLabel.textContent = 'Score 0';
    accuracyLabel.textContent = 'Acc 100.0%';
    judge.replaceChildren();
    source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    songStart = context.currentTime + .15;
    source.start(songStart);
    overlay.hidden = true;
    start.disabled = false;
    playing = true;
    frame = requestAnimationFrame(tick);
    field.focus?.();
  }

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

  window.addEventListener('resize', () => {
    if (!playing) return;
    measure();
    notes.forEach(note => {
      if (!note.element) return;
      note.element.style.left = `${geometry[note.lane].left}px`;
      note.element.style.width = `${geometry[note.lane].size}px`;
    });
  });
})();
