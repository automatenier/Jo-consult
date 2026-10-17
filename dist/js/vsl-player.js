(() => {
  const player = document.getElementById('agentz-vsl-player');
  if (!player || !window.AgentZVSLAnalytics) return;

  const TEST_MODE = Boolean(window.__AGENTZ_VSL_TEST__);
  const videoTitle = player.dataset.vslTitle || 'AGentZ VSL';
  const demoSource = './videos/agentz-vsl-demo.mp4';
  const demoPoster = './videos/agentz-vsl-poster.svg';
  const mediaUrl = player.dataset.vslSrc || demoSource;
  const testEvents = [];
  const qaPanel = document.getElementById('agentz-vsl-qa');
  const qaOutput = document.getElementById('agentz-vsl-qa-output');
  let started = false;

  const vslFrame = document.getElementById('agentz-vsl-frame') || (player ? player.parentElement : null);
  const unmuteBtn = document.getElementById('agentz-vsl-unmute-btn');
  const iconMuted = unmuteBtn ? unmuteBtn.querySelector('.icon-muted') : null;
  const iconUnmuted = unmuteBtn ? unmuteBtn.querySelector('.icon-unmuted') : null;
  const unmuteLabel = unmuteBtn ? unmuteBtn.querySelector('.agentz-vsl-unmute-label') : null;

  function updateMuteUI() {
    if (!unmuteBtn) return;
    const isMuted = Boolean(player.muted);
    unmuteBtn.setAttribute('aria-pressed', isMuted ? 'false' : 'true');
    unmuteBtn.setAttribute('aria-label', isMuted ? 'Click to unmute' : 'Click to mute');
    if (unmuteLabel) {
      unmuteLabel.textContent = isMuted ? 'Click to unmute' : 'Click to mute';
    }
    if (iconMuted) iconMuted.style.display = isMuted ? 'inline-block' : 'none';
    if (iconUnmuted) iconUnmuted.style.display = isMuted ? 'none' : 'inline-block';
  }

  function toggleMute() {
    player.muted = !player.muted;
    if (!player.muted) {
      player.volume = 1;
    }
    if (typeof player.play === 'function' && player.paused) {
      player.play().catch(() => {});
    }
    updateMuteUI();
  }

  if (unmuteBtn) {
    unmuteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMute();
    });
  }

  if (vslFrame) {
    vslFrame.addEventListener('click', (event) => {
      if (event.target.closest('#agentz-vsl-qa')) return;
      toggleMute();
    });

    let touchTimeout;
    vslFrame.addEventListener('touchstart', () => {
      vslFrame.classList.add('is-touch-hover');
      clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => {
        vslFrame.classList.remove('is-touch-hover');
      }, 3000);
    }, { passive: true });
  }

  player.src = mediaUrl;
  if (player.dataset.vslPoster && player.dataset.vslPoster !== demoPoster) {
    player.poster = player.dataset.vslPoster;
  } else if (mediaUrl === demoSource) {
    player.poster = demoPoster;
  } else {
    player.removeAttribute('poster');
  }
  player.muted = true;
  player.defaultMuted = true;
  updateMuteUI();
  player.load();
  if (typeof player.play === 'function') {
    const playPromise = player.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }
  if (TEST_MODE && qaPanel) qaPanel.hidden = false;

  const send = (event) => {
    const payload = {
      ...event,
      video_title: videoTitle,
      video_provider: 'html5',
      video_url: mediaUrl,
      site: 'agentz.jordanengo.com'
    };

    if (TEST_MODE) {
      testEvents.push(payload);
      if (qaOutput) {
        qaOutput.textContent = testEvents.map((item) =>
          `${item.event_name}${item.progress_percent ? ` (${item.progress_percent}%)` : ''}`
        ).join(' · ') || 'Belum ada event.';
      }
      return;
    }

    window.AgentZVSLAnalytics.sendEvent(payload.event_name, payload);
  };

  const tracker = window.AgentZVSLAnalytics.createTracker((event) => {
    if (!TEST_MODE && event.progress_percent) {
      try {
        const previous = Number(sessionStorage.getItem('agentz_vsl_watch_percent') || 0);
        sessionStorage.setItem('agentz_vsl_watch_percent', String(Math.max(previous, event.progress_percent)));
      } catch (_) {}
    }
    send(event);
  });

  if (!TEST_MODE) {
    window.AgentZVSLAnalytics.sendEvent('page_view', {
      page_title: document.title,
      video_title: videoTitle
    });
  }

  player.addEventListener('play', () => {
    if (!started) {
      started = true;
      send({ event_name: 'vsl_start' });
    }
  });

  player.addEventListener('timeupdate', () => {
    const percent = window.AgentZVSLAnalytics.watchedPercent(player.played, player.duration);
    tracker.progress(percent);
  });

  player.addEventListener('ended', () => {
    tracker.complete();
    tracker.reset();
    started = false;
  });

  player.addEventListener('error', () => send({ event_name: 'vsl_media_error' }));

  const cta = document.getElementById('agentz-vsl-cta');
  if (cta) {
    cta.addEventListener('click', () => send({ event_name: 'vsl_cta_click' }));
  }

  if (TEST_MODE && qaPanel) {
    qaPanel.addEventListener('click', (event) => {
      const progressButton = event.target.closest('[data-vsl-test-progress]');
      if (progressButton) {
        tracker.progress(Number(progressButton.dataset.vslTestProgress));
        return;
      }
      if (event.target.closest('[data-vsl-test-reset]')) {
        tracker.reset();
        testEvents.length = 0;
        started = false;
        if (qaOutput) qaOutput.textContent = 'Belum ada event.';
      }
    });
  }
})();
