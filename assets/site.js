// Jake Side Quests: motion, music, and the little toys.
// Everything here is decoration on top of readable HTML: each feature checks for its own markup,
// and the page still works (content visible, links working) if this file never runs.
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const store = {
    get(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch (_) { /* Session-only nicety. */ } }
  };
  const PALETTE = ['#3de8ff', '#ff2e88', '#ffc65c', '#ffb3d4', '#4dff9a', '#ffffff'];

  let animate = false;
  let lenis = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    clearTimeout(window.revealFallback);
    animate = !reduce && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    if (reduce) root.classList.add('reduced');
    if (!animate) root.classList.add('no-anim');
    else gsap.registerPlugin(ScrollTrigger, SplitText);

    music();
    header();
    navigation();
    cursor();
    magnetic();
    tilt();
    petals();
    heroMedia();
    fireworks();
    glitch();

    if (animate) {
      smoothScroll();
      marquees();
      reveals();
      statement();
      cutscene();
      phones();
      worlds();
      parallax();
    } else {
      $('[data-worlds]')?.classList.add('no-pin');
    }
    splash();
  }

  /* ---------- Music: a loop of Champion's Rise, with a beat the page can feel ---------- */

  function music() {
    const button = $('[data-sound]');
    if (!button) return;
    let audio = $('[data-music]');
    if (!audio) {
      audio = new Audio('/assets/media/champions-rise.mp3');
      audio.loop = true;
      audio.preload = 'none';
    }
    const label = $('.label', button);
    const bars = $$('.eq i', button);
    let context, analyser, data, frame;
    let level = 0;

    const setState = on => {
      button.setAttribute('aria-pressed', String(on));
      if (label) label.textContent = on ? 'Music on' : 'Music off';
      button.setAttribute('aria-label', on ? 'Turn music off' : 'Turn music on');
    };

    const connect = () => {
      if (context) return context.resume();
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      context = new Context();
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .7;
      context.createMediaElementSource(audio).connect(analyser);
      analyser.connect(context.destination);
      data = new Uint8Array(analyser.frequencyBinCount);
    };

    const meter = () => {
      if (analyser) {
        analyser.getByteFrequencyData(data);
        let bass = 0;
        for (let i = 1; i < 7; i += 1) bass += data[i];
        bass = bass / 6 / 255;
        // Only the punch above the running level counts as a beat.
        level = level * .92 + bass * .08;
        const beat = Math.max(0, Math.min(1, (bass - level) * 6));
        root.style.setProperty('--beat', beat.toFixed(3));
        bars.forEach((bar, index) => {
          const value = data[2 + index * 9] / 255;
          bar.style.transform = `scaleY(${Math.max(.15, value).toFixed(2)})`;
        });
      }
      frame = requestAnimationFrame(meter);
    };

    const play = () => {
      connect();
      const saved = Number(store.get('jsq-music-time'));
      if (saved && !audio.currentTime) audio.currentTime = saved % 64;
      return audio.play().then(() => {
        setState(true);
        store.set('jsq-music', 'on');
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(meter);
      });
    };
    const pause = remember => {
      audio.pause();
      setState(false);
      if (remember) store.set('jsq-music', 'off');
      cancelAnimationFrame(frame);
      root.style.setProperty('--beat', '0');
      bars.forEach(bar => { bar.style.transform = ''; });
    };

    button.hidden = false;
    setState(false);
    button.addEventListener('click', () => {
      if (audio.paused) play().catch(() => setState(false));
      else pause(true);
    });
    window.addEventListener('pagehide', () => store.set('jsq-music-time', String(audio.currentTime)));

    // Keep the music going between pages. Browsers may block that until the first click, so retry then.
    if (store.get('jsq-music') === 'on' && store.get('jsq-started')) {
      play().catch(() => {
        const resume = () => play().catch(() => {});
        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
      });
    }

    window.jsqMusic = {
      play: () => play().catch(() => {}),
      pause: () => pause(false),
      get playing() { return !audio.paused; },
      get context() { connect(); return context; }
    };
  }

  /* ---------- Splash: press start ---------- */

  function splash() {
    const hero = $('.hero');
    if (!hero) return;
    if (!animate || store.get('jsq-started')) { heroIntro(); return; }

    const overlay = document.createElement('div');
    overlay.className = 'splash';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Welcome');
    overlay.innerHTML = `
      <div class="splash-half top"></div><div class="splash-half bottom"></div><div class="splash-slash"></div>
      <div class="splash-inner">
        <img class="splash-logo" src="/assets/images/jake-side-quests-emblem.webp" width="300" height="300" alt="Jake Side Quests">
        <div class="splash-bar" aria-hidden="true"><i></i></div>
        <div class="splash-actions" hidden>
          <button class="splash-start" type="button">Press start</button>
          <button class="splash-quiet" type="button">Enter without music</button>
          <p class="splash-hint">Press start plays music. You can turn it off anytime.</p>
        </div>
      </div>`;
    document.body.append(overlay);
    lenis?.stop();
    document.body.style.overflow = 'hidden';

    const bar = $('.splash-bar i', overlay);
    const actions = $('.splash-actions', overlay);
    const logo = $('.splash-logo', overlay);
    gsap.from(logo, { scale: .4, rotate: -30, opacity: 0, duration: 1.1, ease: 'back.out(1.6)' });

    // Wait for the hero video to be ready to play (or a short timeout), then offer Start.
    const video = $('[data-hero-video]');
    const videoReady = new Promise(resolve => {
      if (!video || video.readyState >= 3) return resolve();
      video.addEventListener('canplay', resolve, { once: true });
      setTimeout(resolve, 3500);
    });
    let progress = 0;
    const fill = setInterval(() => {
      progress = Math.min(.9, progress + .08);
      bar.style.transform = `scaleX(${progress})`;
    }, 120);
    Promise.all([videoReady, document.fonts?.ready, new Promise(r => setTimeout(r, 900))]).then(() => {
      clearInterval(fill);
      bar.style.transform = 'scaleX(1)';
      setTimeout(() => {
        $('.splash-bar', overlay).hidden = true;
        actions.hidden = false;
        gsap.from(actions.children, { y: 20, opacity: 0, stagger: .08, duration: .6, ease: 'expo.out' });
        $('.splash-start', overlay).focus();
      }, 250);
    });

    const enter = withMusic => {
      store.set('jsq-started', '1');
      if (withMusic) window.jsqMusic?.play();
      const tl = gsap.timeline({
        onComplete: () => {
          overlay.remove();
          document.body.style.overflow = '';
          lenis?.start();
        }
      });
      tl.to($('.splash-inner', overlay), { scale: 1.15, opacity: 0, duration: .35, ease: 'power2.in' })
        .to($('.splash-slash', overlay), { opacity: 1, duration: .08 }, '<.15')
        .fromTo($('.splash-slash', overlay), { scaleX: 0 }, { scaleX: 1, duration: .3, ease: 'expo.out' }, '<')
        .to($('.splash-half.top', overlay), { yPercent: -100, duration: .9, ease: 'expo.inOut' }, '+=.05')
        .to($('.splash-half.bottom', overlay), { yPercent: 100, duration: .9, ease: 'expo.inOut' }, '<')
        .to($('.splash-slash', overlay), { opacity: 0, duration: .3 }, '<.2')
        .add(heroIntro, '<.25');
    };
    $('.splash-start', overlay).addEventListener('click', () => enter(true));
    $('.splash-quiet', overlay).addEventListener('click', () => enter(false));
  }

  function heroIntro() {
    if (!animate) return;
    const logo = $('[data-hero-logo]');
    const tagline = $('[data-hero-tagline]');
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (logo) tl.fromTo(logo, { scale: .5, opacity: 0, rotate: -25 }, { scale: 1, opacity: 1, rotate: 0, duration: 1.4, ease: 'back.out(1.4)' });
    if (tagline) {
      gsap.set(tagline, { opacity: 1 });
      const split = SplitText.create(tagline, { type: 'chars', charsClass: 'char' });
      tl.from(split.chars, { yPercent: 120, opacity: 0, rotateX: -90, duration: 1, stagger: .022 }, '-=1');
    }
    tl.fromTo('[data-hero-fade]', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .12 }, '-=.6');
  }

  /* ---------- Hero video, run through a WebGL shader that ripples under the cursor ---------- */

  function heroMedia() {
    const wrap = $('[data-hero-media]');
    if (!wrap) return;
    const video = $('video', wrap);
    const caption = $('[data-scene]');

    if (reduce) { video.pause(); return; }
    video.play().catch(() => {});

    fetch('/assets/media/media.json').then(response => response.json()).then(({ scenes }) => {
      let current = '';
      video.addEventListener('timeupdate', () => {
        const scene = scenes.filter(item => item.start <= video.currentTime + .4).pop();
        if (!scene || scene.title === current || !caption) return;
        current = scene.title;
        if (animate) gsap.fromTo(caption, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'expo.out', onStart: () => { caption.textContent = scene.title; } });
        else caption.textContent = scene.title;
      });
    }).catch(() => {});

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) return;
    wrap.append(canvas);

    const vertex = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
    const fragment = `
      precision mediump float;
      uniform sampler2D uTex; uniform vec2 uRes, uVid, uMouse; uniform float uVel, uTime, uScroll, uBeat;
      varying vec2 vUv;
      vec2 cover(vec2 uv) {
        float rs = uRes.x / uRes.y, ri = uVid.x / uVid.y;
        vec2 s = rs < ri ? vec2(rs / ri, 1.) : vec2(1., ri / rs);
        return (uv - .5) * s + .5;
      }
      void main() {
        vec2 uv = (vUv - .5) / (1. + uScroll * .2) + .5;
        vec2 d = uv - uMouse; d.x *= uRes.x / uRes.y;
        float dist = length(d);
        vec2 dir = d / max(dist, 1e-4);
        uv += dir * sin(dist * 36. - uTime * 5.) * exp(-dist * 6.) * (.004 + uVel * .035);
        float split = .0012 + uVel * .014 + uBeat * .006 + uScroll * .008;
        vec3 c = vec3(texture2D(uTex, cover(uv + dir * split)).r, texture2D(uTex, cover(uv)).g, texture2D(uTex, cover(uv - dir * split)).b);
        c *= 1. - uScroll * .55;
        c += uBeat * .07 * vec3(1., .18, .55);
        gl_FragColor = vec4(c, 1.);
      }`;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const program = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) { canvas.remove(); return; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const u = name => gl.getUniformLocation(program, name);
    const uniforms = { res: u('uRes'), vid: u('uVid'), mouse: u('uMouse'), vel: u('uVel'), time: u('uTime'), scroll: u('uScroll'), beat: u('uBeat') };
    const mouse = { x: .5, y: .5, tx: .5, ty: .5, vel: 0 };
    const hero = wrap.parentElement;

    const resize = () => {
      // The video is 1280 px wide, so drawing past ~1920 px only costs GPU time on big screens.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1920 / hero.clientWidth);
      canvas.width = hero.clientWidth * ratio;
      canvas.height = hero.clientHeight * ratio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);
    hero.addEventListener('pointermove', event => {
      const box = hero.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = 1 - (event.clientY - box.top) / box.height;
      mouse.vel = Math.min(1, mouse.vel + Math.hypot(x - mouse.tx, y - mouse.ty) * 4);
      mouse.tx = x;
      mouse.ty = y;
    });

    let running = false;
    let shown = false;
    let frame;
    const draw = time => {
      if (video.readyState >= 2) {
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        } catch (_) {
          canvas.remove();
          return;
        }
        mouse.x += (mouse.tx - mouse.x) * .08;
        mouse.y += (mouse.ty - mouse.y) * .08;
        mouse.vel *= .94;
        const scroll = Math.min(1, window.scrollY / hero.clientHeight);
        const beat = parseFloat(getComputedStyle(root).getPropertyValue('--beat')) || 0;
        gl.uniform2f(uniforms.res, canvas.width, canvas.height);
        gl.uniform2f(uniforms.vid, video.videoWidth || 1280, video.videoHeight || 720);
        gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
        gl.uniform1f(uniforms.vel, mouse.vel);
        gl.uniform1f(uniforms.time, time / 1000);
        gl.uniform1f(uniforms.scroll, scroll);
        gl.uniform1f(uniforms.beat, beat);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!shown) { shown = true; wrap.classList.add('is-webgl'); }
      }
      if (running) frame = requestAnimationFrame(draw);
    };
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (running) {
        video.play().catch(() => {});
        frame = requestAnimationFrame(draw);
      } else {
        video.pause();
      }
    }).observe(hero);
  }

  /* ---------- Sakura petals drifting over the hero ---------- */

  function petals() {
    const canvas = $('[data-petals]');
    if (!canvas || reduce) return;
    const context = canvas.getContext('2d');
    const hero = canvas.parentElement;
    let width, height, items = [];
    const pointer = { x: -999, y: -999 };

    const spawn = top => ({
      x: Math.random() * width,
      y: top ? -20 - Math.random() * height * .3 : Math.random() * height,
      size: 5 + Math.random() * 9,
      fall: .4 + Math.random() * 1,
      drift: -.3 - Math.random() * .6,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - .5) * .04,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: .02 + Math.random() * .04,
      sway: Math.random() * Math.PI * 2,
      vx: 0,
      vy: 0,
      tint: Math.random() < .2 ? '#ffffff' : Math.random() < .5 ? '#ffc4dc' : '#ff9cc6'
    });
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = width < 700 ? 28 : 60;
      items = Array.from({ length: count }, () => spawn(false));
    };
    resize();
    window.addEventListener('resize', resize);
    hero.addEventListener('pointermove', event => {
      const box = hero.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
    });
    hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = -999; });

    let running = false;
    let frame;
    const tick = () => {
      context.clearRect(0, 0, width, height);
      const beat = parseFloat(root.style.getPropertyValue('--beat')) || 0;
      for (const petal of items) {
        petal.sway += .02;
        petal.spin += petal.spinSpeed;
        petal.flip += petal.flipSpeed;
        const dx = petal.x - pointer.x;
        const dy = petal.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 130) {
          const push = (130 - distance) / 130;
          petal.vx += (dx / distance) * push * .9;
          petal.vy += (dy / distance) * push * .9;
        }
        petal.vx *= .94;
        petal.vy *= .94;
        petal.x += petal.drift + Math.sin(petal.sway) * .6 + petal.vx + beat * 1.5;
        petal.y += petal.fall + petal.vy;
        if (petal.y > height + 20 || petal.x < -30 || petal.x > width + 30) Object.assign(petal, spawn(true), { x: Math.random() * (width + 200) });

        const s = petal.size;
        context.save();
        context.translate(petal.x, petal.y);
        context.rotate(petal.spin);
        context.scale(Math.cos(petal.flip), 1);
        context.globalAlpha = .85;
        context.fillStyle = petal.tint;
        context.beginPath();
        context.moveTo(0, -s);
        context.bezierCurveTo(s * .9, -s * .6, s * .7, s * .55, 0, s);
        context.bezierCurveTo(-s * .7, s * .55, -s * .9, -s * .6, 0, -s);
        context.fill();
        context.restore();
      }
      if (running) frame = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (running) frame = requestAnimationFrame(tick);
    }).observe(hero);
  }

  /* ---------- Fireworks you launch by clicking the sky ---------- */

  function fireworks() {
    const section = $('[data-fireworks]');
    if (!section) return;
    const canvas = $('canvas', section);
    const context = canvas.getContext('2d');
    let width, height, sparks = [], rockets = [];
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = section.clientWidth;
      height = section.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const pop = () => {
      if (!window.jsqMusic?.playing) return;
      const audio = window.jsqMusic.context;
      if (!audio) return;
      const length = .35;
      const buffer = audio.createBuffer(1, audio.sampleRate * length, audio.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / channel.length, 3);
      const source = audio.createBufferSource();
      const gain = audio.createGain();
      gain.gain.value = .12;
      source.buffer = buffer;
      source.connect(gain).connect(audio.destination);
      source.start();
    };
    const burst = (x, y) => {
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const second = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const count = reduce ? 0 : 80;
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5;
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, decay: .008 + Math.random() * .014, color: i % 3 ? color : second, size: 1.2 + Math.random() * 1.8 });
      }
      pop();
    };
    // Rockets fly for a fixed time so they reach the click point at any frame rate.
    const launch = (x, y) => rockets.push({ x, y: height + 10, from: height + 10, ty: y, age: 0 });

    section.addEventListener('click', event => {
      if (event.target.closest('a, button')) return;
      const box = section.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      if (reduce) return;
      launch(x, y);
    });

    let running = false;
    let frame;
    let lastAuto = 0;
    let lastTime = 0;
    const tick = time => {
      const dt = Math.min(64, time - (lastTime || time));
      lastTime = time;
      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = 'rgba(0,0,0,.22)';
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';
      if (time - lastAuto > 1700) {
        lastAuto = time;
        launch(width * (.15 + Math.random() * .7), height * (.12 + Math.random() * .3));
      }
      rockets = rockets.filter(rocket => {
        rocket.age = Math.min(1, rocket.age + dt / 700);
        rocket.y = rocket.from + (rocket.ty - rocket.from) * (1 - Math.pow(1 - rocket.age, 3));
        context.fillStyle = '#fff6c9';
        context.fillRect(rocket.x - 1, rocket.y, 2, 10);
        if (rocket.age >= 1) { burst(rocket.x, rocket.y); return false; }
        return true;
      });
      sparks = sparks.filter(spark => {
        spark.vx *= .985;
        spark.vy = spark.vy * .985 + .05;
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.life -= spark.decay;
        context.globalAlpha = Math.max(0, spark.life);
        context.fillStyle = spark.color;
        context.beginPath();
        context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        context.fill();
        return spark.life > 0;
      });
      context.globalAlpha = 1;
      if (running) frame = requestAnimationFrame(tick);
    };
    if (reduce) return;
    new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (running) frame = requestAnimationFrame(tick);
    }, { threshold: .2 }).observe(section);
  }

  /* ---------- Header, navigation, cursor, hover toys ---------- */

  function header() {
    const bar = $('.site-header');
    const progress = $('.progress');
    let last = 0;
    const update = () => {
      const y = window.scrollY;
      bar?.classList.toggle('is-solid', y > 40);
      bar?.classList.toggle('is-hidden', y > 300 && y > last && !bar.contains(document.activeElement));
      last = y;
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function navigation() {
    const links = $$('.site-nav a');
    if (document.body.dataset.page === 'home' && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (new URL(link.href).hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }), { rootMargin: '-45% 0px -50% 0px' });
      ['work', 'about', 'say-hello'].forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    }
    const markPolicy = () => $$('.policy-nav a').forEach(link => {
      if (link.hash === location.hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    markPolicy();
    window.addEventListener('hashchange', markPolicy);
  }

  function cursor() {
    if (!finePointer || reduce) return;
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(ring);
    const target = { x: -100, y: -100 };
    const position = { x: -100, y: -100 };
    window.addEventListener('pointermove', event => {
      target.x = event.clientX;
      target.y = event.clientY;
      root.classList.add('has-cursor');
      ring.classList.toggle('is-hover', !!event.target.closest('a, button, [data-tilt], .world, [data-fireworks]'));
    });
    document.addEventListener('pointerleave', () => root.classList.remove('has-cursor'));
    const follow = () => {
      position.x += (target.x - position.x) * .18;
      position.y += (target.y - position.y) * .18;
      ring.style.transform = `translate(${position.x}px, ${position.y}px)`;
      requestAnimationFrame(follow);
    };
    follow();
  }

  function magnetic() {
    if (!finePointer || reduce) return;
    $$('[data-magnetic]').forEach(element => {
      element.addEventListener('pointermove', event => {
        const box = element.getBoundingClientRect();
        const x = event.clientX - box.left - box.width / 2;
        const y = event.clientY - box.top - box.height / 2;
        element.style.transform = `translate(${x * .25}px, ${y * .35}px)`;
      });
      element.addEventListener('pointerleave', () => { element.style.transform = ''; });
    });
  }

  function tilt() {
    if (!finePointer || reduce) return;
    const targets = [...$$('[data-tilt]'), ...$$('.world')];
    const logo = $('[data-hero-logo]');
    targets.forEach(element => {
      element.addEventListener('pointermove', event => {
        const box = element.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        element.style.setProperty('--ry', `${((x - .5) * 10).toFixed(2)}deg`);
        element.style.setProperty('--rx', `${((.5 - y) * 10).toFixed(2)}deg`);
        element.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
        element.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      });
      element.addEventListener('pointerleave', () => {
        element.style.setProperty('--rx', '0deg');
        element.style.setProperty('--ry', '0deg');
      });
    });
    if (logo) {
      const hero = logo.closest('.hero');
      hero.addEventListener('pointermove', event => {
        const x = event.clientX / window.innerWidth - .5;
        const y = event.clientY / window.innerHeight - .5;
        logo.style.setProperty('--tilt-y', `${(x * 22).toFixed(2)}deg`);
        logo.style.setProperty('--tilt-x', `${(-y * 22).toFixed(2)}deg`);
      });
    }
  }

  function glitch() {
    if (reduce) return;
    $$('.glitch').forEach(element => {
      setInterval(() => {
        const box = element.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) return;
        element.classList.add('is-glitching');
        setTimeout(() => element.classList.remove('is-glitching'), 380);
      }, 3200 + Math.random() * 1500);
    });
  }

  /* ---------- Scroll scenes (GSAP) ---------- */

  function smoothScroll() {
    if (typeof Lenis === 'undefined') return;
    lenis = new Lenis({ lerp: .1, anchors: { offset: -80 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function marquees() {
    const tweens = $$('[data-marquee]').map(element => {
      const track = element.classList.contains('marquee-track') ? element : $('.marquee-track', element);
      const direction = Number(element.dataset.marquee) || -1;
      return gsap.fromTo(track, { xPercent: direction < 0 ? 0 : -50 }, { xPercent: direction < 0 ? -50 : 0, duration: 22, ease: 'none', repeat: -1 });
    });
    if (!tweens.length) return;
    let boost = gsap.to({}, {});
    ScrollTrigger.create({
      onUpdate: self => {
        const speed = 1 + Math.min(6, Math.abs(self.getVelocity()) / 300);
        boost.kill();
        tweens.forEach(tween => tween.timeScale(speed));
        boost = gsap.to(tweens, { timeScale: 1, duration: 1.2, ease: 'power2.out', delay: .1 });
      }
    });
  }

  function reveals() {
    const items = $$('[data-reveal]');
    gsap.set(items, { opacity: 0, y: 60 });
    ScrollTrigger.batch(items, {
      start: 'top 96%',
      once: true,
      onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .1 })
    });
  }

  function statement() {
    const text = $('[data-words]');
    if (!text) return;
    const split = SplitText.create(text, { type: 'words', wordsClass: 'word' });
    gsap.to(split.words, {
      opacity: 1,
      stagger: .1,
      ease: 'none',
      scrollTrigger: { trigger: text, start: 'top 78%', end: 'bottom 40%', scrub: true }
    });
  }

  function cutscene() {
    const section = $('[data-cutscene]');
    if (!section) return;
    const frame = $('.cutscene-frame', section);
    const lines = $$('.subtitles span', section);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top top', end: '+=220%', pin: true, scrub: .6 }
    });
    tl.fromTo(frame, { '--clip-y': '44%', '--clip-x': '10%', '--zoom': 1.4 }, { '--clip-y': '0%', '--clip-x': '0%', '--zoom': 1, duration: 3, ease: 'power2.inOut' });
    lines.forEach((line, index) => {
      tl.fromTo(line, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5 }, index ? '>' : '-=1.2');
      if (index < lines.length - 1) tl.to(line, { opacity: 0, duration: .3 }, '>+0.4');
    });
  }

  function phones() {
    const stage = $('[data-phones]');
    if (!stage) return;
    gsap.fromTo(stage, { '--spread': 0, rotateX: 28, y: 80 }, {
      '--spread': 1, rotateX: 0, y: 0, ease: 'none',
      scrollTrigger: { trigger: stage, start: 'top 95%', end: 'center 55%', scrub: .8 }
    });
  }

  function worlds() {
    const section = $('[data-worlds]');
    const track = $('[data-worlds-track]');
    if (!section || !track) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px)', () => {
      const distance = () => track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: { trigger: $('.worlds-pin', section), start: 'center center', end: () => `+=${distance()}`, pin: section, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      $$('.world', track).forEach(world => {
        gsap.fromTo(world, { '--shift': '8%' }, {
          '--shift': '-8%', ease: 'none',
          scrollTrigger: { trigger: world, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
        });
      });
    });
    mm.add('(max-width: 767px)', () => {
      section.classList.add('no-pin');
      return () => section.classList.remove('no-pin');
    });
  }

  function parallax() {
    $$('[data-parallax]').forEach(element => {
      gsap.fromTo(element, { yPercent: -Number(element.dataset.parallax) }, {
        yPercent: Number(element.dataset.parallax), ease: 'none',
        scrollTrigger: { trigger: element.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('[data-parallax-x]').forEach(element => {
      gsap.fromTo(element, { xPercent: -50 - Number(element.dataset.parallaxX), yPercent: -50 }, {
        xPercent: -50 + Number(element.dataset.parallaxX), yPercent: -50, ease: 'none',
        scrollTrigger: { trigger: element.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }
})();
