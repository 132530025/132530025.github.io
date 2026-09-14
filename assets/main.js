// Miletos Studio — etkileşimler. Kütüphaneler yüklenmezse ya da "azaltılmış hareket" açıksa sayfa yine tam okunur.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // 1) Dertler: ekranın ortasındaki adıma göre telefon ekranı değişir
  const screens = $$('.screen');
  const steps = $$('.step');
  const show = (i) => {
    screens.forEach((s) => s.classList.toggle('on', s.dataset.i === String(i)));
    steps.forEach((s) => s.classList.toggle('on', s.dataset.screen === String(i)));
  };
  show(0);
  const wide = matchMedia('(min-width: 960px)').matches;
  // telefonda üstte yapışık telefon olduğu için adımı ekranın alt bandında yakala
  const stepIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(e.target.dataset.screen);
  }, { rootMargin: wide ? '-45% 0px -45% 0px' : '-62% 0px -12% 0px' });
  steps.forEach((s) => stepIO.observe(s));

  // 2) Kart demoları sadece ekrandayken oynar (pil dostu)
  const playIO = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('play', e.isIntersecting);
  });
  $$('.card').forEach((c) => playIO.observe(c));

  // 3) Kartlarda fareyi takip eden ışık
  if (fine) {
    for (const el of $$('.card')) {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--x', e.clientX - r.left + 'px');
        el.style.setProperty('--y', e.clientY - r.top + 'px');
      });
    }
  }

  if (reduce) return;

  // 4) Hero arkasında WebGL ışıma (çalışmazsa CSS ışıması kalır)
  const canvas = document.getElementById('gl');
  const gl = canvas && canvas.getContext('webgl', { antialias: false });
  if (gl) {
    const fs = `precision mediump float;uniform float t;uniform vec2 r;
      void main(){vec2 uv=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);float a=atan(uv.y,uv.x),d=length(uv);
      float w=sin(a*3.+t*.5+sin(d*6.-t)*.8)*.5+.5;
      float band=smoothstep(.2,0.,abs(d-.3-.05*sin(a*2.+t*.7)));
      vec3 warm=mix(vec3(1.,.42,.24),vec3(1.,.76,.3),w),cool=mix(vec3(.18,.83,.75),vec3(.23,.51,.96),w);
      vec3 col=mix(warm,cool,smoothstep(-1.,1.,sin(a+t*.3)));
      float g=band*.8+exp(-d*5.)*.22;gl_FragColor=vec4(col*g,g);}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const ut = gl.getUniformLocation(pr, 't');
      const ur = gl.getUniformLocation(pr, 'r');
      // ponytail: yarım çözünürlük sabit; bulanık ışıma için yeterli, zayıf telefonda takılırsa 0.35'e indir
      const size = () => {
        canvas.width = canvas.clientWidth * 0.5;
        canvas.height = canvas.clientHeight * 0.5;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(ur, canvas.width, canvas.height);
      };
      size();
      addEventListener('resize', size);
      let visible = true;
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
      const frame = (ms) => {
        if (visible) { gl.uniform1f(ut, ms / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      canvas.classList.add('ready');
    }
  }

  const { gsap, ScrollTrigger, SplitText, Lenis } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // 5) Yumuşak kaydırma
  if (Lenis) {
    const lenis = new Lenis({ anchors: { offset: -80 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // 6) Hero girişi + dönen kelime
  gsap.from('.hero-copy > *', { y: 28, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08 });
  gsap.from('.toast', { y: 24, opacity: 0, duration: 0.9, ease: 'back.out(1.6)', stagger: 0.25, delay: 1.4 });
  const words = $$('.rot span');
  let wi = 0;
  setInterval(() => {
    const cur = words[wi];
    const next = words[(wi = (wi + 1) % words.length)];
    gsap.to(cur, { yPercent: -50, opacity: 0, filter: 'blur(8px)', duration: 0.5, ease: 'power3.in' });
    gsap.fromTo(next, { yPercent: 50, opacity: 0, filter: 'blur(8px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', delay: 0.3 });
  }, 2600);
  gsap.to('.visual', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // 7) Başlıklar ekrana girince kelime kelime gelir; bitince split geri alınır (İ noktası, gradyan bozulmasın).
  //    IntersectionObserver: font ya da yerleşim sonradan değişse de içerik gizli kalmaz.
  const headIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      headIO.unobserve(e.target);
      const split = SplitText.create(e.target, { type: 'words' });
      split.words.forEach((w) => { if (w.closest('.grad')) w.classList.add('grad'); });
      gsap.from(split.words, { yPercent: 45, opacity: 0, filter: 'blur(6px)', duration: 0.9, ease: 'power3.out', stagger: 0.045, onComplete: () => split.revert() });
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  document.fonts.ready.then(() => {
    $$('h2.split').forEach((h) => headIO.observe(h));
    ScrollTrigger.refresh();
  });

  // 8) İçerik yukarı süzülerek gelir (kartın kendisi değil içi: ızgara çizgileri gri görünmesin)
  const riseEls = $$('.card > *, .process li > *, .promise, .flow-list li, .faq details, .beam');
  gsap.set(riseEls, { y: 30, opacity: 0 });
  const riseIO = new IntersectionObserver((entries) => {
    const els = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    els.forEach((el) => riseIO.unobserve(el));
    if (els.length) gsap.to(els, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.06 });
  }, { rootMargin: '0px 0px -8% 0px' });
  riseEls.forEach((el) => riseIO.observe(el));
  gsap.fromTo('.process-fill', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.process', start: 'top 85%', end: 'bottom 55%', scrub: true } });
  gsap.from('.wordmark', { yPercent: 35, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  // 9) Masaüstü: tiyatro fareye göre eğilir, imleç ışığı, mıknatıs butonlar
  if (!fine) return;
  const vis = document.querySelector('.visual');
  gsap.set(vis, { transformPerspective: 900 });
  const rx = gsap.quickTo(vis, 'rotationX', { duration: 0.8, ease: 'power3' });
  const ry = gsap.quickTo(vis, 'rotationY', { duration: 0.8, ease: 'power3' });
  document.querySelector('.hero').addEventListener('pointermove', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - 0.5) * 14);
    rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
  });
  const cur = document.querySelector('.cursor');
  const cx = gsap.quickTo(cur, 'x', { duration: 0.5, ease: 'power3' });
  const cy = gsap.quickTo(cur, 'y', { duration: 0.5, ease: 'power3' });
  addEventListener('pointermove', (e) => { cur.classList.add('on'); cx(e.clientX); cy(e.clientY); }, { passive: true });
  for (const b of $$('.magnetic')) {
    const mx = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' });
    const my = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.25);
      my((e.clientY - r.top - r.height / 2) * 0.35);
    });
    b.addEventListener('pointerleave', () => { mx(0); my(0); });
  }
})();
