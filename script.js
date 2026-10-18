/**
 * Karan Verma Portfolio - 3D Interactive Motion & Anti-Gravity Engine
 * Lossless HD Frame Sequence, Left-Edge Cutout Smoothing,
 * Right-Aligned Navigation & Interactive Dropdowns, and Upward Particle Physics.
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 192;
  const FRAME_PREFIX = 'frames/frame_';
  const FRAME_SUFFIX = '.png';
  const PAD_LENGTH = 6;
  const FPS = 24;
  const LERP_FACTOR = 0.085;

  // State
  let targetProgress = 0;
  let currentProgress = 0;
  let lastDrawnFrameIndex = -1;
  let isPlaying = false;
  let playDirection = 1;
  let playInterval = null;
  let isDraggingScrubber = false;
  let isTiltEnabled = true;
  let isFocus3D = false;
  let is3DBackgroundEnabled = true;

  // 3D Mouse Parallax
  let targetTiltX = 0;
  let targetTiltY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;

  // DOM Elements - Preloader
  const preloader = document.getElementById('preloader');
  const loaderPercent = document.getElementById('loader-percent');
  const progressBar = document.getElementById('progress-bar');
  const loaderCounter = document.getElementById('loader-counter');
  const loaderStatus = document.getElementById('loader-status');

  // DOM Elements - Canvas & Stage
  const canvasStage = document.getElementById('canvas-stage');
  const canvas = document.getElementById('sequence-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  const scrollPrompt = document.getElementById('scroll-prompt');

  // DOM Elements - Navigation & More Dropdown
  const navMoreBtn = document.getElementById('nav-more-btn');
  const navDropdownItem = document.querySelector('.nav-dropdown-item');
  const menuAboutSite = document.getElementById('menu-about-site');
  const toggle3dBg = document.getElementById('toggle-3d-bg');
  const bgStatusLabel = document.getElementById('bg-status-label');
  const navLinks = document.querySelectorAll('.nav-link');

  // DOM Elements - Modal "About this Website"
  const aboutModal = document.getElementById('about-website-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalDoneBtn = document.getElementById('modal-done-btn');

  // DOM Elements - HUD Dock
  const timelineWrapper = document.getElementById('timeline-wrapper');
  const timelineFill = document.getElementById('timeline-fill');
  const timelineThumb = document.getElementById('timeline-thumb');
  const timelineTooltip = document.getElementById('timeline-tooltip');

  const btnPlay = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const playLabel = document.getElementById('play-label');
  const btnReset = document.getElementById('btn-reset');
  const btnTilt = document.getElementById('btn-tilt');
  const btnBgDim = document.getElementById('btn-bg-dim');
  const bgDimLabel = document.getElementById('bg-dim-label');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  const currentFrameText = document.getElementById('current-frame-text');
  const progressPercentText = document.getElementById('progress-percent-text');

  // Frame Cache
  const rawFrames = new Array(TOTAL_FRAMES);
  let loadedFramesCount = 0;

  // --- Helper: Frame filename ---
  function getFrameSrc(index) {
    const num = String(index + 1).padStart(PAD_LENGTH, '0');
    return `${FRAME_PREFIX}${num}${FRAME_SUFFIX}`;
  }

  // --- 1. Frame Preloading Engine ---
  let isLoaderFinished = false;

  function preloadFrames() {
    return new Promise((resolve) => {
      // Fail-safe timeout: Never allow visitor to be stuck on loading screen longer than 3.5s
      const maxWaitTimer = setTimeout(() => {
        if (!isLoaderFinished) {
          finishLoading(resolve);
        }
      }, 3500);

      function checkCompletion() {
        if (isLoaderFinished) return;
        // Finish if all frames loaded, or if 190+ frames loaded (prevents 191-frame hang on GitHub)
        if (loadedFramesCount >= TOTAL_FRAMES || loadedFramesCount >= 190) {
          clearTimeout(maxWaitTimer);
          finishLoading(resolve);
        }
      }

      // First frame loaded immediately for instant render
      const firstImg = new Image();
      firstImg.src = getFrameSrc(0);
      firstImg.onload = () => {
        rawFrames[0] = firstImg;
        loadedFramesCount++;
        renderFrame(0);
        updateLoaderProgress();
        loadRemainingFrames(resolve, checkCompletion);
      };
      firstImg.onerror = () => {
        loadedFramesCount++;
        updateLoaderProgress();
        loadRemainingFrames(resolve, checkCompletion);
      };
    });
  }

  function loadRemainingFrames(onComplete, checkCompletion) {
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      let frameHandled = false;

      // Timeout per frame in case GitHub network stalls on individual requests
      const frameTimeout = setTimeout(() => {
        if (!frameHandled) {
          frameHandled = true;
          loadedFramesCount++;
          updateLoaderProgress();
          checkCompletion();
        }
      }, 2500);

      img.onload = () => {
        if (!frameHandled) {
          frameHandled = true;
          clearTimeout(frameTimeout);
          rawFrames[i] = img;
          loadedFramesCount++;
          updateLoaderProgress();
          checkCompletion();
        }
      };

      img.onerror = () => {
        if (!frameHandled) {
          frameHandled = true;
          clearTimeout(frameTimeout);
          loadedFramesCount++;
          updateLoaderProgress();
          checkCompletion();
        }
      };

      img.src = getFrameSrc(i);
    }
  }

  function updateLoaderProgress() {
    const percent = Math.min(100, Math.floor((loadedFramesCount / TOTAL_FRAMES) * 100));
    if (loaderPercent) loaderPercent.textContent = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (loaderCounter) loaderCounter.textContent = `${Math.min(loadedFramesCount, TOTAL_FRAMES)} / ${TOTAL_FRAMES} Frames`;
  }

  function finishLoading(callback) {
    if (isLoaderFinished) return;
    isLoaderFinished = true;

    if (loaderPercent) loaderPercent.textContent = '100%';
    if (progressBar) progressBar.style.width = '100%';
    if (loaderCounter) loaderCounter.textContent = `${TOTAL_FRAMES} / ${TOTAL_FRAMES} Frames`;
    if (loaderStatus) loaderStatus.textContent = 'Ready! Launching Experience...';

    // Ensure initial frame is rendered
    renderFrame(0);

    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('fade-out');
      }
      if (callback) callback();
    }, 350);
  }

  function getLoadedFrame(targetIdx) {
    if (rawFrames[targetIdx] && rawFrames[targetIdx].complete && rawFrames[targetIdx].naturalWidth > 0) {
      return rawFrames[targetIdx];
    }
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 0 && rawFrames[prev] && rawFrames[prev].complete && rawFrames[prev].naturalWidth > 0) {
        return rawFrames[prev];
      }
      const next = targetIdx + offset;
      if (next < TOTAL_FRAMES && rawFrames[next] && rawFrames[next].complete && rawFrames[next].naturalWidth > 0) {
        return rawFrames[next];
      }
    }
    return rawFrames[0] || null;
  }

  // --- 2. High-DPI Canvas Setup ---
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;

  function resizeCanvas() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(viewportWidth * dpr);
    canvas.height = Math.round(viewportHeight * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    lastDrawnFrameIndex = -1;
    drawCurrent();
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });

  // --- 3. Lossless High-Fidelity Canvas Drawing with Left Edge Smoothing ---
  function renderFrame(frameIdx) {
    if (!is3DBackgroundEnabled) return;

    const img = getLoadedFrame(frameIdx);
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || 1280;
    const rawIh = img.naturalHeight || 720;

    // Crop bottom 60px black bar with Veo watermark in source coordinates
    const cropBottom = 60;
    const ih = rawIh - cropBottom; // 660px clean image height

    // Fit subject comfortably so head, hair, ears, and shoulders are 100% visible:
    const scaleByH = ch / ih;
    const scaleByW = cw / iw;
    const scale = Math.min(scaleByH * 0.96, scaleByW * 0.98, 1.35);

    const nw = Math.round(iw * scale);
    const nh = Math.round(ih * scale);

    // Exact horizontal centering
    const cx = Math.round((cw - nw) / 2);
    // Anchor bottom of subject to bottom of screen so shoulders sit naturally
    const cy = Math.round(ch - nh);

    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw raw high-definition video frame
    ctx.drawImage(img, 0, 0, iw, ih, cx, cy, nw, nh);

    // 2. Refine left-side cutout edge:
    // Seamlessly blend the subject's left border into the dark #060709 background
    const leftFeatherW = Math.round(nw * 0.16);
    const leftGrad = ctx.createLinearGradient(cx, 0, cx + leftFeatherW, 0);
    leftGrad.addColorStop(0, '#060709');
    leftGrad.addColorStop(0.35, 'rgba(6, 7, 9, 0.75)');
    leftGrad.addColorStop(0.7, 'rgba(6, 7, 9, 0.25)');
    leftGrad.addColorStop(1, 'rgba(6, 7, 9, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(cx - 2, cy - 2, leftFeatherW + 4, nh + 4);

    // 3. Right edge gentle blend
    const rightFeatherW = Math.round(nw * 0.14);
    const rightGrad = ctx.createLinearGradient(cx + nw - rightFeatherW, 0, cx + nw, 0);
    rightGrad.addColorStop(0, 'rgba(6, 7, 9, 0)');
    rightGrad.addColorStop(0.3, 'rgba(6, 7, 9, 0.25)');
    rightGrad.addColorStop(0.7, 'rgba(6, 7, 9, 0.75)');
    rightGrad.addColorStop(1, '#060709');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(cx + nw - rightFeatherW - 2, cy - 2, rightFeatherW + 4, nh + 4);

    // 4. Bottom edge smooth blend
    const bottomFeatherH = Math.round(nh * 0.15);
    const bottomGrad = ctx.createLinearGradient(0, cy + nh - bottomFeatherH, 0, cy + nh);
    bottomGrad.addColorStop(0, 'rgba(6, 7, 9, 0)');
    bottomGrad.addColorStop(0.5, 'rgba(6, 7, 9, 0.65)');
    bottomGrad.addColorStop(1, '#060709');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(cx - 2, cy + nh - bottomFeatherH - 2, nw + 4, bottomFeatherH + 4);

    lastDrawnFrameIndex = frameIdx;
  }

  function drawCurrent() {
    if (!is3DBackgroundEnabled) return;
    const frameIdx = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1)))
    );
    renderFrame(frameIdx);
  }

  // --- 4. Main LERP Animation Loop ---
  function animationLoop() {
    if (is3DBackgroundEnabled) {
      const diff = targetProgress - currentProgress;
      if (Math.abs(diff) > 0.0001) {
        currentProgress += diff * LERP_FACTOR;
      } else {
        currentProgress = targetProgress;
      }

      const frameIdx = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.round(currentProgress * (TOTAL_FRAMES - 1)))
      );

      if (frameIdx !== lastDrawnFrameIndex) {
        renderFrame(frameIdx);
        updateHUD(frameIdx, currentProgress);
      }

      // 3D Parallax Tilt
      if (isTiltEnabled) {
        currentTiltX += (targetTiltX - currentTiltX) * 0.1;
        currentTiltY += (targetTiltY - currentTiltY) * 0.1;
        canvas.style.transform = `perspective(1400px) rotateY(${currentTiltX * 3.5}deg) rotateX(${-currentTiltY * 3.5}deg)`;
      } else {
        canvas.style.transform = 'none';
      }
    }

    requestAnimationFrame(animationLoop);
  }

  // --- 5. Update Scrubber & Counters ---
  function updateHUD(frameIdx, progress) {
    const formattedFrame = String(frameIdx + 1).padStart(3, '0');
    if (currentFrameText) currentFrameText.textContent = formattedFrame;

    const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
    if (progressPercentText) progressPercentText.textContent = `${percent}%`;

    const pctString = `${(progress * 100).toFixed(2)}%`;
    if (timelineFill) timelineFill.style.width = pctString;
    if (timelineThumb) timelineThumb.style.left = pctString;
  }

  // --- 6. Scroll Synchronization & ScrollSpy ---
  const sections = ['hero', 'about', 'projects', 'skills', 'beyond-code', 'contact'];

  function updateActiveNavLink() {
    const scrollPosition = window.scrollY + 220;

    for (let i = sections.length - 1; i >= 0; i--) {
      const sectionEl = document.getElementById(sections[i]);
      if (sectionEl) {
        const top = sectionEl.offsetTop;
        if (scrollPosition >= top) {
          const currentNavId = sections[i];
          navLinks.forEach((link) => {
            const navTarget = link.getAttribute('data-nav');
            if (navTarget === currentNavId) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
          break;
        }
      }
    }
  }

  function onScroll() {
    if (isDraggingScrubber || isPlaying) return;

    if (scrollPrompt && scrollPrompt.style.opacity !== '0') {
      scrollPrompt.style.opacity = '0';
    }

    const scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 0) {
      targetProgress = Math.min(1, Math.max(0, scrollY / maxScroll));
    }

    updateActiveNavLink();
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  function syncPageScrollToProgress(progress) {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 0) {
      window.scrollTo({
        top: progress * maxScroll,
        behavior: 'auto'
      });
    }
  }

  // --- 7. Timeline Scrubber ---
  function handleScrub(e) {
    if (!timelineWrapper) return;
    const rect = timelineWrapper.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));

    targetProgress = fraction;
    currentProgress = fraction;
    syncPageScrollToProgress(fraction);

    if (scrollPrompt) scrollPrompt.style.opacity = '0';

    const previewFrame = Math.round(fraction * (TOTAL_FRAMES - 1)) + 1;
    if (timelineTooltip) {
      timelineTooltip.textContent = `Frame ${String(previewFrame).padStart(3, '0')}`;
      timelineTooltip.style.left = `${fraction * 100}%`;
    }
  }

  if (timelineWrapper) {
    timelineWrapper.addEventListener('mousedown', (e) => {
      isDraggingScrubber = true;
      if (isPlaying) stopAutoplay();
      handleScrub(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDraggingScrubber) {
        handleScrub(e);
      } else {
        const rect = timelineWrapper.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top - 12 &&
          e.clientY <= rect.bottom + 12
        ) {
          const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
          const previewFrame = Math.round(fraction * (TOTAL_FRAMES - 1)) + 1;
          if (timelineTooltip) {
            timelineTooltip.textContent = `Frame ${String(previewFrame).padStart(3, '0')}`;
            timelineTooltip.style.left = `${fraction * 100}%`;
          }
        }
      }
    });

    window.addEventListener('mouseup', () => {
      isDraggingScrubber = false;
    });

    // Touch Support
    timelineWrapper.addEventListener('touchstart', (e) => {
      isDraggingScrubber = true;
      if (isPlaying) stopAutoplay();
      handleScrub(e);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isDraggingScrubber) {
        handleScrub(e);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDraggingScrubber = false;
    });
  }

  // --- 8. Autoplay (24 FPS Engine) ---
  function startAutoplay() {
    isPlaying = true;
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
    if (playLabel) playLabel.textContent = 'Pause';
    if (btnPlay) btnPlay.classList.add('toggle-active');

    const step = 1 / (TOTAL_FRAMES - 1);
    const intervalMs = 1000 / FPS;

    playInterval = setInterval(() => {
      let next = targetProgress + step * playDirection;
      if (next >= 1) {
        next = 1;
        playDirection = -1;
      } else if (next <= 0) {
        next = 0;
        playDirection = 1;
      }
      targetProgress = next;
      syncPageScrollToProgress(targetProgress);
    }, intervalMs);
  }

  function stopAutoplay() {
    isPlaying = false;
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (playLabel) playLabel.textContent = 'Play';
    if (btnPlay) btnPlay.classList.remove('toggle-active');

    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
  }

  function togglePlay() {
    if (isPlaying) stopAutoplay();
    else startAutoplay();
  }

  if (btnPlay) btnPlay.addEventListener('click', togglePlay);

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (isPlaying) stopAutoplay();
      targetProgress = 0;
      syncPageScrollToProgress(0);
    });
  }

  // --- 9. 3D Mouse Parallax Tilt ---
  window.addEventListener('mousemove', (e) => {
    if (!isTiltEnabled) return;
    targetTiltX = (e.clientX / viewportWidth - 0.5) * 2;
    targetTiltY = (e.clientY / viewportHeight - 0.5) * 2;
  }, { passive: true });

  if (btnTilt) {
    btnTilt.addEventListener('click', () => {
      isTiltEnabled = !isTiltEnabled;
      btnTilt.classList.toggle('toggle-active', isTiltEnabled);
      if (!isTiltEnabled) {
        targetTiltX = 0;
        targetTiltY = 0;
      }
    });
  }

  // --- 10. Focus 3D Mode Toggle ---
  function toggleFocus3D() {
    isFocus3D = !isFocus3D;
    document.body.classList.toggle('mode-focus-3d', isFocus3D);
    if (btnBgDim) {
      btnBgDim.classList.toggle('toggle-active', isFocus3D);
      bgDimLabel.textContent = isFocus3D ? 'Show Content' : 'Focus 3D';
    }
  }

  if (btnBgDim) btnBgDim.addEventListener('click', toggleFocus3D);

  // --- 11. Fullscreen Toggle ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

  // --- 12. Navigation & More Dropdown Interactions ---
  // Right-aligned nav click handling
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();
        const section = document.querySelector(targetId);
        if (section) {
          // Smooth scroll to target section
          const headerOffset = 90;
          const sectionPos = section.getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: sectionPos,
            behavior: 'smooth'
          });

          // Highlight / expand section visually
          const mainCard = section.querySelector('.antigravity-card, .about-main-card, .project-featured-card');
          if (mainCard) {
            mainCard.classList.remove('section-highlight');
            void mainCard.offsetWidth; // Trigger reflow
            mainCard.classList.add('section-highlight');
          }

          // Update active link state
          navLinks.forEach((l) => l.classList.remove('active'));
          link.classList.add('active');

          // Close dropdown if open
          if (navDropdownItem) navDropdownItem.classList.remove('open');
        }
      }
    });
  });

  // More Dropdown toggle
  if (navMoreBtn && navDropdownItem) {
    navMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navDropdownItem.classList.toggle('open');
      navMoreBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!navDropdownItem.contains(e.target)) {
        navDropdownItem.classList.remove('open');
        navMoreBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 3D Background Toggle inside More Dropdown
  if (toggle3dBg) {
    toggle3dBg.addEventListener('change', () => {
      is3DBackgroundEnabled = toggle3dBg.checked;
      if (canvasStage) {
        canvasStage.classList.toggle('disabled-3d', !is3DBackgroundEnabled);
      }
      if (bgStatusLabel) {
        bgStatusLabel.textContent = is3DBackgroundEnabled ? 'Active (Scroll-Synced)' : 'Disabled / Paused';
      }
      if (is3DBackgroundEnabled) {
        drawCurrent();
      }
    });
  }

  // "About this Website" Modal Trigger
  function openAboutModal() {
    if (aboutModal) {
      aboutModal.classList.add('open');
      aboutModal.setAttribute('aria-hidden', 'false');
      if (navDropdownItem) navDropdownItem.classList.remove('open');
    }
  }

  function closeAboutModal() {
    if (aboutModal) {
      aboutModal.classList.remove('open');
      aboutModal.setAttribute('aria-hidden', 'true');
    }
  }

  if (menuAboutSite) menuAboutSite.addEventListener('click', openAboutModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAboutModal);
  if (modalDoneBtn) modalDoneBtn.addEventListener('click', closeAboutModal);

  if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) closeAboutModal();
    });
  }

  // Keyboard shortcut listener
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Escape' && aboutModal && aboutModal.classList.contains('open')) {
      closeAboutModal();
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'KeyR':
        e.preventDefault();
        if (isPlaying) stopAutoplay();
        targetProgress = 0;
        syncPageScrollToProgress(0);
        break;
      case 'KeyT':
        e.preventDefault();
        if (btnTilt) btnTilt.click();
        break;
      case 'KeyM':
        e.preventDefault();
        toggleFocus3D();
        break;
    }
  });

  // --- 13. Anti-Gravity Upward Particle Engine ---
  function initAntiGravityParticles() {
    const pCanvas = document.getElementById('antigravity-canvas');
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');

    let pWidth = (pCanvas.width = window.innerWidth);
    let pHeight = (pCanvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      pWidth = pCanvas.width = window.innerWidth;
      pHeight = pCanvas.height = window.innerHeight;
    }, { passive: true });

    const PARTICLE_COUNT = 55;
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * pWidth,
        y: Math.random() * pHeight,
        radius: Math.random() * 2 + 0.8,
        speedY: Math.random() * 0.45 + 0.15, // Upward drift (anti-gravity)
        swingSpeed: Math.random() * 0.02 + 0.01,
        swingRange: Math.random() * 1.2 + 0.4,
        angle: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.5 + 0.25,
        color: Math.random() > 0.4 ? 'rgba(225, 29, 72,' : 'rgba(168, 85, 247,'
      });
    }

    function renderParticles() {
      pCtx.clearRect(0, 0, pWidth, pHeight);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.swingSpeed;
        p.x += Math.sin(p.angle) * p.swingRange * 0.4;
        p.y -= p.speedY; // Rise upward

        // Wrap around when particle escapes above top
        if (p.y < -10) {
          p.y = pHeight + 10;
          p.x = Math.random() * pWidth;
        }

        // Draw particle with gentle glow
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        pCtx.fillStyle = `${p.color} ${p.alpha})`;
        pCtx.shadowBlur = 8;
        pCtx.shadowColor = p.color === 'rgba(225, 29, 72,' ? '#e11d48' : '#a855f7';
        pCtx.fill();
        pCtx.shadowBlur = 0;
      }

      requestAnimationFrame(renderParticles);
    }

    requestAnimationFrame(renderParticles);
  }

  // --- 14. Animate Language Progress Bars on Scroll ---
  function initLanguageBarsAnimation() {
    const langCard = document.getElementById('about-languages');
    if (!langCard) return;

    const fills = langCard.querySelectorAll('.lang-bar-fill');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              fills.forEach((fill) => {
                fill.style.animation = 'none';
                void fill.offsetWidth;
                fill.style.animation = 'lang-bar-grow 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
              });
              observer.unobserve(langCard);
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(langCard);
    }
  }

  // --- 15. Initialization ---
  function init() {
    resizeCanvas();
    initAntiGravityParticles();
    initLanguageBarsAnimation();
    preloadFrames().then(() => {
      requestAnimationFrame(animationLoop);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
