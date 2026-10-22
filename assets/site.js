(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('DOMContentLoaded', () => {
    // Mark the main navigation link for the section in view, and name it in the HUD.
    const areaLabel = document.querySelector('[data-area-label]');
    const navLinks = [...document.querySelectorAll('.site-nav a')];
    const markNavigation = hash => {
      navLinks.forEach(link => {
        if (location.pathname === '/' && new URL(link.href).hash === hash && hash) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    const areas = document.querySelectorAll('[data-area]');
    if (areas.length && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          if (areaLabel) areaLabel.textContent = entry.target.dataset.area;
          markNavigation(entry.target.id ? `#${entry.target.id}` : '');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      areas.forEach(area => observer.observe(area));
    }

    // Policy table of contents follows the hash.
    const markPolicy = () => document.querySelectorAll('.policy-nav a').forEach(link => {
      if (link.hash === location.hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    markPolicy();
    window.addEventListener('hashchange', markPolicy);

    // Command menus: one gold cursor per menu, moved by pointer, focus, or arrow keys.
    document.querySelectorAll('.command').forEach(menu => {
      const items = [...menu.querySelectorAll('a, button')];
      const help = menu.parentElement.querySelector('[data-command-help]');
      const select = item => {
        items.forEach(other => other.classList.toggle('is-active', other === item));
        if (help && item.dataset.help) help.textContent = item.dataset.help;
      };
      items.forEach((item, index) => {
        item.addEventListener('pointerenter', () => select(item));
        item.addEventListener('focus', () => select(item));
        item.addEventListener('keydown', event => {
          const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
          if (!step) return;
          event.preventDefault();
          items[(index + step + items.length) % items.length].focus();
        });
      });
    });

    // Jake's dialogue types itself out. Screen readers get the whole line at once; a click finishes it.
    document.querySelectorAll('[data-typewriter]').forEach(line => {
      const box = line.closest('[data-dialogue]');
      const text = line.textContent.trim();
      if (reduceMotion.matches) { box?.classList.add('is-done'); return; }
      line.textContent = '';
      const spoken = document.createElement('span');
      spoken.className = 'visually-hidden';
      spoken.textContent = text;
      const shown = document.createElement('span');
      const rest = document.createElement('span');
      rest.style.visibility = 'hidden';
      rest.textContent = text;
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      visual.append(shown, rest);
      line.append(spoken, visual);
      let index = 0;
      let timer;
      const finish = () => {
        clearTimeout(timer);
        shown.textContent = text;
        rest.textContent = '';
        box?.classList.add('is-done');
      };
      const tick = () => {
        index += 1;
        shown.textContent = text.slice(0, index);
        rest.textContent = text.slice(index);
        if (index >= text.length) finish();
        else timer = setTimeout(tick, /[.,:]/.test(text[index - 1]) ? 220 : 26);
      };
      timer = setTimeout(tick, 1500);
      box?.addEventListener('click', finish);
    });

    // The night sky behind the title screen.
    const canvas = document.querySelector('.sky');
    if (canvas) drawSky(canvas, reduceMotion.matches);

    // The moon and hills lean toward the pointer.
    const screen = document.querySelector('.title-screen');
    if (screen && !reduceMotion.matches && window.matchMedia('(pointer: fine)').matches) {
      screen.addEventListener('pointermove', event => {
        const box = screen.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - .5;
        const y = (event.clientY - box.top) / box.height - .5;
        screen.style.setProperty('--px', `${(x * 24).toFixed(1)}px`);
        screen.style.setProperty('--py', `${(y * 16).toFixed(1)}px`);
      });
      screen.addEventListener('pointerleave', () => {
        screen.style.setProperty('--px', '0px');
        screen.style.setProperty('--py', '0px');
      });
    }
  });

  function drawSky(canvas, still) {
    const context = canvas.getContext('2d');
    let stars = [];
    let width = 0;
    let height = 0;
    let shooting = null;
    let frame;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Seeded so the sky stays the same between resizes.
      let seed = 7;
      const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const count = Math.round(width * height / 3200);
      stars = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height * .72,
        size: random() < .08 ? 2 : 1,
        phase: random() * Math.PI * 2,
        speed: .4 + random() * 1.2,
        tint: random() < .15 ? '#ffcb47' : random() < .2 ? '#52e0ff' : '#eef1ff'
      }));
      if (still) paint(0);
    };

    const paint = time => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const fade = 1 - star.y / (height * .72);
        const twinkle = still ? .8 : .55 + .45 * Math.sin(star.phase + time / 1000 * star.speed);
        context.globalAlpha = Math.max(0, twinkle * (.25 + fade * .75));
        context.fillStyle = star.tint;
        context.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
        if (star.size === 2 && twinkle > .9) {
          context.globalAlpha *= .5;
          context.fillRect(Math.round(star.x) - 2, Math.round(star.y) + .5, 6, 1);
          context.fillRect(Math.round(star.x) + .5, Math.round(star.y) - 2, 1, 6);
        }
      }
      if (!still) {
        if (!shooting && Math.random() < .0025) {
          shooting = { x: width * (.2 + Math.random() * .6), y: height * Math.random() * .3, life: 0 };
        }
        if (shooting) {
          shooting.life += 1;
          const progress = shooting.life / 50;
          const headX = shooting.x + progress * 260;
          const headY = shooting.y + progress * 110;
          const gradient = context.createLinearGradient(headX - 120, headY - 50, headX, headY);
          gradient.addColorStop(0, 'rgba(238,241,255,0)');
          gradient.addColorStop(1, 'rgba(238,241,255,.9)');
          context.globalAlpha = 1 - progress;
          context.strokeStyle = gradient;
          context.lineWidth = 1.5;
          context.beginPath();
          context.moveTo(headX - 120, headY - 50);
          context.lineTo(headX, headY);
          context.stroke();
          if (progress >= 1) shooting = null;
        }
      }
      context.globalAlpha = 1;
    };

    const loop = time => {
      paint(time);
      frame = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    if (still) return;
    // Only animate while the title screen is on screen.
    new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry.isIntersecting) frame = requestAnimationFrame(loop);
    }).observe(canvas);
  }
})();
