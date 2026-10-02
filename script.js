(() => {
  const envelope = document.getElementById('envelope');
  const reader = document.getElementById('reader');
  const letter = document.getElementById('letter');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms));
  const frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  // Stars
  const stars = document.getElementById('stars');
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 3) + 's';
    stars.appendChild(s);
  }

  // Open / close
  let opened = false, busy = false;

  // The letter starts out folded in two inside the envelope. It is pulled out, unfolded,
  // and the real letter then takes the unfolded sheet's place and grows to reading size.
  const peek = envelope.querySelector('.peek');
  const pose = {};
  function measure() {
    const half = parseFloat(envelope.style.getPropertyValue('--half'));
    const c = peek.getBoundingClientRect();             // folded stack, pulled out
    const rd = reader.getBoundingClientRect();
    const w = letter.offsetWidth, h = letter.offsetHeight;
    const sheet = { left: c.left, width: c.width, top: c.top - half, height: half * 2 };
    const s = sheet.width / w;
    const top = rd.top + letter.offsetTop - reader.scrollTop;
    const dx = sheet.left + sheet.width / 2 - (rd.left + letter.offsetLeft + w / 2);
    const poly = pts => `polygon(${pts.map(p => p[0] + 'px ' + p[1] + 'px').join(',')})`;
    pose.A = `translate(${dx}px, ${sheet.top - top}px) scale(${s})`;
    const ch = sheet.height / s;                         // only as much letter as the sheet is tall
    pose.clipA = poly([[0, 0], [w, 0], [w, ch], [0, ch]]);
    pose.clipC = poly([[-60, -100], [w + 60, -100], [w + 60, h + 100], [-60, h + 100]]);
  }
  function move(transform, clip, ms, ease) {
    letter.style.transition = `transform ${ms}ms ${ease}, clip-path ${ms}ms ${ease}`;
    letter.style.transform = transform;
    letter.style.clipPath = clip;
    return wait(ms);
  }
  function fade(opacity, ms) {
    letter.style.transition = `opacity ${ms}ms ease`;
    letter.style.opacity = opacity;
    return wait(ms);
  }
  const ease = 'cubic-bezier(.45,0,.25,1)';

  async function openLetter() {
    if (opened || busy) return;
    busy = opened = true;
    // size the folded letter so that, unfolded, it still fits above the envelope on screen
    const e = envelope.getBoundingClientRect();
    envelope.style.setProperty('--env-h', e.height + 'px');
    const half = Math.max(60, Math.min(e.height * .85, (e.top - 34) / 2));   // about the size of the envelope
    envelope.style.setProperty('--half', half + 'px');
    envelope.style.setProperty('--rest', (half * .55 - e.height * .94) + 'px');   // about half of the paper sticks out
    envelope.classList.add('open');
    envelope.setAttribute('aria-expanded', 'true');
    envelope.setAttribute('aria-label', 'Letter opened');
    await wait(1500);                          // the flap opens, the folded letter rises: half of it shows
    envelope.classList.add('out');             // pull it out of the envelope
    await wait(1450);
    envelope.classList.add('unfold1');         // open it up, one fold at a time
    await wait(1300);

    // the real letter takes the unfolded sheet's place, then grows to reading size
    reader.classList.add('show');
    document.body.classList.add('reading');
    reader.scrollTop = 0;
    measure();
    letter.style.transition = 'none';
    letter.style.opacity = 0;
    letter.style.transform = pose.A;
    letter.style.clipPath = pose.clipA;
    void letter.offsetWidth;
    await fade(1, 450);
    envelope.classList.add('taken');
    reader.style.overflowY = 'hidden';
    reader.classList.add('in');
    setTimeout(burst, reduced ? 0 : 450);
    await move('none', pose.clipC, 1300, 'cubic-bezier(.2,.7,.2,1)');
    reader.style.overflowY = '';
    reader.scrollTop = 0;
    busy = false;
  }

  async function closeLetter() {
    if (!opened || busy) return;
    busy = true;
    reader.style.overflowY = 'hidden';
    if (reader.scrollTop > 0) {                // scrolled down: return to the top first
      reader.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      await wait(450);
    }
    measure();
    reader.classList.remove('in');
    await move(pose.A, pose.clipA, 1100, ease);              // letter shrinks back to the sheet
    envelope.classList.remove('taken');
    await fade(0, 450);
    reader.classList.remove('show');
    reader.style.overflowY = '';
    letter.style.transition = 'none';
    letter.style.opacity = '';
    document.body.classList.remove('reading');
    envelope.classList.remove('unfold1');      // fold it up again
    await wait(1100);
    envelope.classList.remove('out');          // slide it back down into the envelope
    await wait(1450);
    envelope.classList.add('sink');
    await wait(1450);
    envelope.classList.remove('open');         // close the flap
    envelope.classList.remove('sink');
    envelope.setAttribute('aria-expanded', 'false');
    envelope.setAttribute('aria-label', 'Open the letter');
    await wait(1000);
    opened = busy = false;
  }

  envelope.addEventListener('click', openLetter);
  reader.addEventListener('click', closeLetter);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeLetter(); });

  // Confetti
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  let pieces = [], running = false;
  const colors = ['#d4af37', '#f1d36b', '#f6f7fb', '#e8a3a8', '#7f95c9'];
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  addEventListener('resize', resize); resize();

  function burst() {
    if (reduced) return;
    for (let i = 0; i < 160; i++) {
      pieces.push({
        x: innerWidth / 2 + (Math.random() - .5) * 120,
        y: innerHeight * .45,
        vx: (Math.random() - .5) * 14,
        vy: -Math.random() * 14 - 4,
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
        r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
        c: colors[(Math.random() * colors.length) | 0],
        life: 0
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.cos(p.life * .1));
      ctx.restore();
    });
    pieces = pieces.filter(p => p.y < canvas.height + 40);
    if (pieces.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
})();
