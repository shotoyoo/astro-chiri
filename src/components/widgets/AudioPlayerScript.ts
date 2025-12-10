// YouTube Player types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    youtubePlayer: any;
  }
}

let youtubePlayer: any = null;
let youtubePlayerReady = false;
let currentPlayerType: 'audio' | 'youtube' | null = null;
let updateInterval: number | null = null;

let audioEl: HTMLAudioElement | null = null;
let playToggleEl: HTMLInputElement | null = null;
let muteToggleEl: HTMLInputElement | null = null;
let seekSliderEl: HTMLInputElement | null = null;
let currentTimeDisplayEl: HTMLElement | null = null;
let durationDisplayEl: HTMLElement | null = null;
let audioLoadingEl: HTMLElement | null = null;
let audioControlEl: HTMLElement | null = null;
let musicPlayerEl: HTMLElement | null = null;
let footerEl: HTMLElement | null = null;

let keyboardHandlerAttached = false;

const DATASET_AUDIO = 'playerAudio';
const DATASET_PLAY_TOGGLE = 'playerPlayToggle';
const DATASET_MUTE_TOGGLE = 'playerMuteToggle';
const DATASET_SEEK_SLIDER = 'playerSeekSlider';
const DATASET_CARD_BOUND = 'playerBound';
const DATASET_LABEL_BOUND = 'playerLabelBound';
const DATASET_WAITING = 'waitingForYoutube';

const formatTime = (secs: number) => {
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

function normalizeUrl(url: string) {
  try {
    return new URL(url, location.origin).href;
  } catch {
    return url;
  }
}

function getPlayButtons(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('input.card-pay-buttons'),
  );
}

function showPlayerShell() {
  musicPlayerEl?.classList.remove('hidden', 'opacity-0');
  musicPlayerEl?.classList.add('flex');
  footerEl?.classList.add('pb-24');
  window.setTimeout(() => musicPlayerEl?.classList.remove('opacity-0'), 100);
}

function startYouTubeUpdateInterval() {
  stopUpdateInterval();
  updateInterval = window.setInterval(() => {
    if (
      youtubePlayer &&
      currentPlayerType === 'youtube' &&
      seekSliderEl &&
      currentTimeDisplayEl
    ) {
      const currentTime = youtubePlayer.getCurrentTime();
      const duration = youtubePlayer.getDuration();
      if (typeof currentTime === 'number' && typeof duration === 'number') {
        seekSliderEl.value = Math.floor(currentTime).toString();
        currentTimeDisplayEl.textContent = formatTime(currentTime);
        seekSliderEl.max = Math.floor(duration).toString();
      }
    }
  }, 100);
}

function stopUpdateInterval() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

function disableOtherButtons(activeId: string | null) {
  const buttons = getPlayButtons();

  buttons.forEach((btn) => {
    if (!(btn instanceof HTMLInputElement)) return;

    const btnUrl = btn.dataset.audioUrl;
    const btnYoutubeId = btn.dataset.youtubeId;
    if (!btnUrl && !btnYoutubeId) return;

    let isSameMedia = false;
    if (currentPlayerType === 'youtube' && btnYoutubeId && youtubePlayer) {
      try {
        const currentVideoUrl = youtubePlayer.getVideoUrl();
        isSameMedia = currentVideoUrl
          ? currentVideoUrl.includes(btnYoutubeId)
          : false;
      } catch {
        isSameMedia = false;
      }
    } else if (currentPlayerType === 'audio' && btnUrl && audioEl) {
      const fullUrl = normalizeUrl(btnUrl);
      isSameMedia = normalizeUrl(audioEl.src) === fullUrl;
    }

    const isActive = btn.id === activeId;
    const isPlaying =
      currentPlayerType === 'youtube'
        ? Boolean(
            youtubePlayer &&
              youtubePlayer.getPlayerState() === window.YT.PlayerState.PLAYING,
          )
        : Boolean(audioEl && !audioEl.paused);

    const shouldBeChecked =
      isActive || (isPlaying && isSameMedia && activeId === null);
    btn.checked = shouldBeChecked;

    const card = btn.closest('.audio-card');
    if (card instanceof HTMLElement) {
      card.dataset.active = shouldBeChecked ? 'true' : 'false';
    }
  });
}

function handleCardButton(btn: HTMLInputElement) {
  if (!audioEl || !playToggleEl) {
    initAudioPlayer();
  }

  if (!audioEl || !playToggleEl) {
    return;
  }

  const rawUrl = btn.dataset.audioUrl ?? '';
  const youtubeId = btn.dataset.youtubeId ?? '';
  const hasYouTube = Boolean(youtubeId);
  const hasAudio = Boolean(rawUrl);
  if (!hasYouTube && !hasAudio) return;

  const encodedUrl =
    hasAudio && !rawUrl.startsWith('http') ? encodeURI(rawUrl) : rawUrl;
  const normalizedUrl = hasAudio ? normalizeUrl(encodedUrl) : null;

  const isSameYouTube =
    currentPlayerType === 'youtube' &&
    youtubeId &&
    youtubePlayer &&
    (() => {
      try {
        const currentVideoUrl = youtubePlayer.getVideoUrl();
        return currentVideoUrl ? currentVideoUrl.includes(youtubeId) : false;
      } catch {
        return false;
      }
    })();

  const isSameAudio =
    currentPlayerType === 'audio' &&
    normalizedUrl &&
    audioEl &&
    normalizeUrl(audioEl.src) === normalizedUrl;

  if (isSameYouTube || isSameAudio) {
    if (isSameYouTube && youtubePlayer) {
      const state = youtubePlayer.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        youtubePlayer.pauseVideo();
        btn.checked = false;
      } else {
        youtubePlayer.playVideo();
        btn.checked = true;
      }
    } else if (isSameAudio && audioEl) {
      if (audioEl.paused) {
        audioEl.play();
        btn.checked = true;
      } else {
        audioEl.pause();
        btn.checked = false;
      }
    }
    return;
  }

  showPlayerShell();

  if (hasYouTube) {
    if (!youtubePlayerReady) {
      if (btn.dataset[DATASET_WAITING] !== 'true') {
        btn.dataset[DATASET_WAITING] = 'true';
        const waitForPlayer = window.setInterval(() => {
          if (youtubePlayerReady) {
            clearInterval(waitForPlayer);
            delete btn.dataset[DATASET_WAITING];
            btn.click();
          }
        }, 100);
      }
      return;
    }

    currentPlayerType = 'youtube';
    stopUpdateInterval();
    audioEl.pause();
    audioEl.src = '';

    audioLoadingEl?.classList.remove('hidden');
    audioControlEl?.classList.add('hidden');

    if (!youtubePlayer) {
      return;
    }

    youtubePlayer.loadVideoById(youtubeId);
    youtubePlayer.playVideo();

    const checkDuration = window.setInterval(() => {
      if (!seekSliderEl || !durationDisplayEl) {
        clearInterval(checkDuration);
        return;
      }

      try {
        const duration = youtubePlayer.getDuration();
        if (duration > 0) {
          durationDisplayEl.textContent = formatTime(duration);
          seekSliderEl.max = Math.floor(duration).toString();
          audioLoadingEl?.classList.add('hidden');
          audioControlEl?.classList.remove('hidden');
          clearInterval(checkDuration);
        }
      } catch {
        clearInterval(checkDuration);
      }
    }, 100);

    playToggleEl.checked = true;
    btn.checked = true;
    disableOtherButtons(btn.id);
    startYouTubeUpdateInterval();
  } else if (normalizedUrl) {
    currentPlayerType = 'audio';
    stopUpdateInterval();
    if (youtubePlayer) {
      youtubePlayer.stopVideo();
    }

    audioLoadingEl?.classList.remove('hidden');
    audioControlEl?.classList.add('hidden');

    if (currentTimeDisplayEl) currentTimeDisplayEl.textContent = '0:00';
    if (durationDisplayEl) durationDisplayEl.textContent = '0:00';

    audioEl.src = normalizedUrl;
    audioEl.load();
    playToggleEl.checked = true;
    btn.checked = true;
    disableOtherButtons(btn.id);
    audioEl.play().catch(() => {
      btn.checked = false;
      currentPlayerType = null;
      audioLoadingEl?.classList.add('hidden');
      audioControlEl?.classList.remove('hidden');
    });
  }
}

function ensureKeyboardHandler() {
  if (keyboardHandlerAttached) return;

  document.addEventListener('keydown', onDocumentKeyDown);
  keyboardHandlerAttached = true;
}

function bindPlayButtons() {
  const buttons = getPlayButtons();

  buttons.forEach((btn) => {
    if (!(btn instanceof HTMLInputElement)) return;
    if (btn.dataset[DATASET_CARD_BOUND] !== 'true') {
      btn.dataset[DATASET_CARD_BOUND] = 'true';
    }

    const label = btn.closest('label');
    if (!label || label.dataset[DATASET_LABEL_BOUND] === 'true') return;

    label.addEventListener('click', (event) => {
      event.preventDefault();
      handleCardButton(btn);
    });
    label.dataset[DATASET_LABEL_BOUND] = 'true';
  });
}

function onAudioLoadedMetadata() {
  if (!audioEl || !seekSliderEl || !durationDisplayEl) return;
  durationDisplayEl.textContent = formatTime(audioEl.duration);
  seekSliderEl.max = Math.floor(audioEl.duration).toString();
  audioLoadingEl?.classList.add('hidden');
  audioControlEl?.classList.remove('hidden');
}

function onAudioError() {
  audioLoadingEl?.classList.add('hidden');
  audioControlEl?.classList.add('hidden');
}

function onPlayToggleChange() {
  if (!playToggleEl) return;

  if (currentPlayerType === 'youtube' && youtubePlayer) {
    const state = youtubePlayer.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      youtubePlayer.pauseVideo();
    } else {
      youtubePlayer.playVideo();
    }
  } else if (currentPlayerType === 'audio' && audioEl) {
    if (audioEl.paused) {
      audioEl.play();
    } else {
      audioEl.pause();
    }
  }
}

function onAudioPlay() {
  if (playToggleEl) {
    playToggleEl.checked = true;
  }
  disableOtherButtons(null);
}

function onAudioPause() {
  if (playToggleEl) {
    playToggleEl.checked = false;
  }
  disableOtherButtons(null);
}

function onMuteToggleChange() {
  if (!muteToggleEl) return;

  if (currentPlayerType === 'youtube' && youtubePlayer) {
    if (muteToggleEl.checked) {
      youtubePlayer.mute();
    } else {
      youtubePlayer.unMute();
    }
  } else if (audioEl) {
    audioEl.muted = muteToggleEl.checked;
  }
}

function onSeekSliderInput() {
  if (!seekSliderEl || !currentTimeDisplayEl) return;
  currentTimeDisplayEl.textContent = formatTime(parseInt(seekSliderEl.value, 10));
}

function onSeekSliderChange() {
  if (!seekSliderEl) return;

  const newTime = parseInt(seekSliderEl.value, 10);
  if (Number.isNaN(newTime)) return;

  if (currentPlayerType === 'youtube' && youtubePlayer) {
    youtubePlayer.seekTo(newTime, true);
  } else if (audioEl) {
    audioEl.currentTime = newTime;
  }
}

function onAudioTimeUpdate() {
  if (currentPlayerType !== 'audio' || !audioEl || !seekSliderEl || !currentTimeDisplayEl) return;
  seekSliderEl.value = Math.floor(audioEl.currentTime).toString();
  currentTimeDisplayEl.textContent = formatTime(audioEl.currentTime);
}

function onDocumentKeyDown(event: KeyboardEvent) {
  const target = document.activeElement;
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
  if (event.altKey) return;

  switch (event.code) {
    case 'Space':
      event.preventDefault();
      playToggleEl?.click();
      break;
    case 'ArrowRight':
      event.preventDefault();
      if (currentPlayerType === 'youtube' && youtubePlayer) {
        const currentTime = youtubePlayer.getCurrentTime();
        const duration = youtubePlayer.getDuration();
        youtubePlayer.seekTo(Math.min(duration, currentTime + 5), true);
      } else if (audioEl) {
        audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 5);
      }
      break;
    case 'ArrowLeft':
      event.preventDefault();
      if (currentPlayerType === 'youtube' && youtubePlayer) {
        const currentTime = youtubePlayer.getCurrentTime();
        youtubePlayer.seekTo(Math.max(0, currentTime - 5), true);
      } else if (audioEl) {
        audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
      }
      break;
  }
}

function initYouTubePlayer() {
  const container = document.getElementById('youtube-player');

  if (!container) {
    youtubePlayerReady = false;
    if (youtubePlayer) {
      try {
        youtubePlayer.destroy();
      } catch {
        // ignore
      }
      youtubePlayer = null;
    }
    return;
  }

  if (typeof window.YT === 'undefined' || !window.YT.Player) {
    window.setTimeout(initYouTubePlayer, 100);
    return;
  }

  if (youtubePlayer) {
    try {
      const iframe = youtubePlayer.getIframe?.();
      if (iframe && iframe.isConnected && iframe.parentElement === container) {
        return;
      }
      youtubePlayer.destroy();
    } catch {
      // ignore when destroying unavailable player
    }
    youtubePlayer = null;
    youtubePlayerReady = false;
  }

  youtubePlayer = new window.YT.Player(container, {
    height: '0',
    width: '0',
    events: {
      onReady: () => {
        youtubePlayerReady = true;
      },
      onStateChange: (event: any) => {
        if (event.data === window.YT.PlayerState.PLAYING) {
          if (playToggleEl) {
            playToggleEl.checked = true;
          }
          startYouTubeUpdateInterval();
          disableOtherButtons(null);
        } else if (
          event.data === window.YT.PlayerState.PAUSED ||
          event.data === window.YT.PlayerState.ENDED
        ) {
          if (playToggleEl) {
            playToggleEl.checked = false;
          }
          stopUpdateInterval();
          disableOtherButtons(null);
        }
      },
    },
  });
}

function bindElementListeners() {
  if (audioEl && !audioEl.dataset[DATASET_AUDIO]) {
    audioEl.addEventListener('loadedmetadata', onAudioLoadedMetadata);
    audioEl.addEventListener('error', onAudioError);
    audioEl.addEventListener('play', onAudioPlay);
    audioEl.addEventListener('pause', onAudioPause);
    audioEl.addEventListener('timeupdate', onAudioTimeUpdate);
    audioEl.dataset[DATASET_AUDIO] = 'true';
  }

  if (playToggleEl && !playToggleEl.dataset[DATASET_PLAY_TOGGLE]) {
    playToggleEl.addEventListener('change', onPlayToggleChange);
    playToggleEl.dataset[DATASET_PLAY_TOGGLE] = 'true';
  }

  if (muteToggleEl && !muteToggleEl.dataset[DATASET_MUTE_TOGGLE]) {
    muteToggleEl.addEventListener('change', onMuteToggleChange);
    muteToggleEl.dataset[DATASET_MUTE_TOGGLE] = 'true';
  }

  if (seekSliderEl && !seekSliderEl.dataset[DATASET_SEEK_SLIDER]) {
    seekSliderEl.addEventListener('input', onSeekSliderInput);
    seekSliderEl.addEventListener('change', onSeekSliderChange);
    seekSliderEl.dataset[DATASET_SEEK_SLIDER] = 'true';
  }

  bindPlayButtons();
  ensureKeyboardHandler();
}

export function initAudioPlayer() {
  audioEl = document.getElementById('audio-element') as HTMLAudioElement | null;
  playToggleEl = document.getElementById('play-icon') as HTMLInputElement | null;
  muteToggleEl = document.getElementById('mute-icon') as HTMLInputElement | null;
  seekSliderEl = document.getElementById('seek-slider') as HTMLInputElement | null;
  currentTimeDisplayEl = document.getElementById('current-time');
  durationDisplayEl = document.getElementById('duration');
  audioLoadingEl = document.getElementById('audio-loading');
  audioControlEl = document.getElementById('audio-control');
  musicPlayerEl = document.getElementById('audio-player-container');
  footerEl = document.querySelector('.footer > div');

  if (
    !audioEl ||
    !playToggleEl ||
    !muteToggleEl ||
    !seekSliderEl ||
    !currentTimeDisplayEl ||
    !durationDisplayEl
  ) {
    return;
  }

  bindElementListeners();

  if (typeof window.YT !== 'undefined') {
    initYouTubePlayer();
  } else {
    window.onYouTubeIframeAPIReady = initYouTubePlayer;
  }
}
