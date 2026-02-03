(function () {
  'use strict';

  const choiceOverlay = document.getElementById('choiceOverlay');
  const successOverlay = document.getElementById('successOverlay');
  const btnYes = document.getElementById('btnYes');
  const btnNo = document.getElementById('btnNo');
  const canvas = document.getElementById('fireworksCanvas');

  const RUN_AWAY_DISTANCE = 120;
  const NEAR_NO_DISTANCE = 180;
  const YES_GROW_MAX = 2.2;
  const YES_GROW_MIN = 1;
  const NO_LERP = 0.18; /* 0–1: higher = snappier, lower = smoother glide */

  let mouseX = 0, mouseY = 0;
  let noPosition = { x: 0, y: 0 };
  let noCurrent = { x: 0, y: 0 };
  let noInitialized = false;
  let noIsFloating = false;
  let noTarget = { x: 0, y: 0 };
  let noHalfW = 0, noHalfH = 0;
  let rafId = null;

  function initNoPosition() {
    const rect = btnNo.getBoundingClientRect();
    noPosition.x = rect.left + rect.width / 2;
    noPosition.y = rect.top + rect.height / 2;
    noHalfW = rect.width / 2;
    noHalfH = rect.height / 2;
    noCurrent.x = noPosition.x - noHalfW;
    noCurrent.y = noPosition.y - noHalfH;
    noTarget.x = noCurrent.x;
    noTarget.y = noCurrent.y;
    noInitialized = true;
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function moveNoAway() {
    const rect = btnNo.getBoundingClientRect();
    const noCenterX = noCurrent.x + noHalfW;
    const noCenterY = noCurrent.y + noHalfH;
    const dist = distance(mouseX, mouseY, noCenterX, noCenterY);
    if (dist < RUN_AWAY_DISTANCE) {
      const angle = Math.atan2(mouseY - noCenterY, mouseX - noCenterX);
      const push = RUN_AWAY_DISTANCE - dist + 80;
      const newCenterX = noCenterX - Math.cos(angle) * push;
      const newCenterY = noCenterY - Math.sin(angle) * push;
      const padding = 20;
      const maxX = window.innerWidth - rect.width - padding;
      const minX = padding;
      const maxY = window.innerHeight - rect.height - padding;
      const minY = padding;
      if (!noIsFloating) {
        noCurrent.x = rect.left;
        noCurrent.y = rect.top;
        noTarget.x = rect.left;
        noTarget.y = rect.top;
        btnNo.style.position = 'fixed';
        noIsFloating = true;
      }
      noTarget.x = Math.min(maxX, Math.max(minX, newCenterX - noHalfW));
      noTarget.y = Math.min(maxY, Math.max(minY, newCenterY - noHalfH));
    }
  }

  function tickNo() {
    if (choiceOverlay.classList.contains('hidden')) {
      rafId = requestAnimationFrame(tickNo);
      return;
    }
    noCurrent.x += (noTarget.x - noCurrent.x) * NO_LERP;
    noCurrent.y += (noTarget.y - noCurrent.y) * NO_LERP;
    if (noIsFloating) {
      btnNo.style.left = noCurrent.x + 'px';
      btnNo.style.top = noCurrent.y + 'px';
      btnNo.style.transform = 'translate(0, 0)';
    }
    rafId = requestAnimationFrame(tickNo);
  }

  function updateYesScale() {
    const rect = btnNo.getBoundingClientRect();
    const noCenterX = rect.left + rect.width / 2;
    const noCenterY = rect.top + rect.height / 2;
    const dist = distance(mouseX, mouseY, noCenterX, noCenterY);
    if (dist < NEAR_NO_DISTANCE) {
      const t = 1 - dist / NEAR_NO_DISTANCE;
      const scale = YES_GROW_MIN + (YES_GROW_MAX - YES_GROW_MIN) * t;
      btnYes.style.setProperty('--yes-scale', scale);
      btnYes.classList.add('grow');
    } else {
      btnYes.style.setProperty('--yes-scale', '1');
      btnYes.classList.remove('grow');
    }
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!choiceOverlay.classList.contains('hidden')) {
      if (!noInitialized) initNoPosition();
      moveNoAway();
      updateYesScale();
    }
  }

  document.addEventListener('mousemove', onMouseMove);
  if (!rafId) rafId = requestAnimationFrame(tickNo);

  function showSuccessAndFireworks() {
    choiceOverlay.classList.add('hidden');
    successOverlay.classList.remove('hidden');
    startFireworks();
  }

  btnYes.addEventListener('click', showSuccessAndFireworks);

  btnNo.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
  });

  function startFireworks() {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#e74c3c', '#f39c12', '#e91e63', '#ff5722', '#CFA26F', '#fff'];
    let animationId;

    function createBurst(x, y) {
      const count = 80 + Math.floor(Math.random() * 40);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random();
        const speed = 2 + Math.random() * 6;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.008 + Math.random() * 0.01,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 3
        });
      }
    }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (particles.length > 0) animationId = requestAnimationFrame(loop);
    }

    function burst() {
      const x = canvas.width * (0.2 + Math.random() * 0.6);
      const y = canvas.height * (0.2 + Math.random() * 0.5);
      createBurst(x, y);
      if (!animationId) loop();
    }

    burst();
    const interval = setInterval(burst, 600);
    setTimeout(function () {
      clearInterval(interval);
      setTimeout(function () {
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }, 4000);
    }, 5000);
  }

  window.addEventListener('resize', function () {
    if (canvas.getContext('2d')) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });

  // --- Background tiles: masonry layout — fixed width, height from picture format ---
  const mediaData = typeof window.mediaData !== 'undefined' ? window.mediaData : [];
  const columns = document.querySelectorAll('.bg-grid .column');
  const MOBILE_BREAKPOINT = 768;

  function getColumnCount() {
    return window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)').matches ? 3 : 5;
  }

  function buildMediaGrid() {
    if (mediaData.length === 0 || columns.length === 0) return;
    var columnCount = getColumnCount();
    for (var colIndex = 0; colIndex < columnCount; colIndex++) {
      var col = columns[colIndex];
      var inner = col.querySelector('.column-inner');
      if (!inner) continue;
      inner.innerHTML = '';
      var items = [];
      for (var i = colIndex; i < mediaData.length; i += columnCount) items.push(mediaData[i]);
      if (items.length === 0) continue;
      function appendTiles() {
        items.forEach(function (item) {
          var tile = document.createElement('div');
          tile.className = 'tile tile--media';
          if (item.type === 'video') {
            var video = document.createElement('video');
            video.src = item.url;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.autoplay = true;
            video.preload = 'metadata';
            video.setAttribute('aria-hidden', 'true');
            tile.appendChild(video);
          } else {
            var img = document.createElement('img');
            img.src = item.url;
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.setAttribute('aria-hidden', 'true');
            tile.appendChild(img);
          }
          inner.appendChild(tile);
        });
      }
      appendTiles();
      appendTiles();
    }
  }

  function waitForFirstMedia(maxWait) {
    var nodes = document.querySelectorAll('.bg-grid img, .bg-grid video');
    if (nodes.length === 0) return Promise.resolve();
    var columnCount = getColumnCount();
    var firstBatchSize = Math.min(columnCount * 4, nodes.length);
    var firstBatch = Array.prototype.slice.call(nodes, 0, firstBatchSize);
    var waitAll = Promise.all(firstBatch.map(function (el) {
      return new Promise(function (resolve) {
        if (el.tagName === 'IMG') {
          if (el.complete && el.naturalWidth) return resolve();
          el.onload = resolve;
          el.onerror = resolve;
        } else {
          if (el.readyState >= 2) return resolve();
          el.addEventListener('loadeddata', resolve, { once: true });
          el.addEventListener('error', resolve, { once: true });
        }
      });
    }));
    var timeout = new Promise(function (r) { setTimeout(r, maxWait); });
    return Promise.race([waitAll, timeout]);
  }

  function showPage() {
    document.body.classList.remove('loading');
  }

  if (mediaData.length > 0 && columns.length > 0) {
    buildMediaGrid();
    waitForFirstMedia(6000).then(showPage);
    var lastColumnCount = getColumnCount();
    window.addEventListener('resize', function () {
      var n = getColumnCount();
      if (n !== lastColumnCount) {
        lastColumnCount = n;
        buildMediaGrid();
      }
    });
  } else {
    document.body.classList.remove('loading');
  }
})();
