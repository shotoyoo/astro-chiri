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

const formatTime = (secs: number) => {
  const minutes = Math.floor(secs / 60);
  const seconds = Math.floor(secs % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

function normalizeUrl(url: string) {
  try {
    return new URL(url, location.origin).href;
  } catch {
    return url;
  }
}

export function initAudioPlayer() {
  const audio = document.getElementById("audio-element") as HTMLAudioElement;
  const playToggle = document.getElementById("play-icon") as HTMLInputElement;
  const muteToggle = document.getElementById("mute-icon") as HTMLInputElement;
  const seekSlider = document.getElementById("seek-slider") as HTMLInputElement;
  const currentTimeDisplay = document.getElementById("current-time");
  const durationDisplay = document.getElementById("duration");
  const audioLoading = document.getElementById("audio-loading");
  const audioControl = document.getElementById("audio-control");
  const musicPlayer = document.getElementById("audio-player-container");
  const footer = document.querySelector(".footer > div");
  const playButtons = document.querySelectorAll(".card-pay-buttons");

  // Initialize YouTube Player when API is ready
  function initYouTubePlayer() {
    if (typeof window.YT === 'undefined' || !window.YT.Player) {
      setTimeout(initYouTubePlayer, 100);
      return;
    }

    youtubePlayer = new window.YT.Player('youtube-player', {
      height: '0',
      width: '0',
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      }
    });
  }

  function onPlayerReady() {
    console.log('YouTube player ready');
    youtubePlayerReady = true;
  }

  function onPlayerStateChange(event: any) {
    if (event.data === window.YT.PlayerState.PLAYING) {
      playToggle.checked = true;
      startYouTubeUpdateInterval();
      disableOtherButtons(null);
    } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
      playToggle.checked = false;
      stopUpdateInterval();
      disableOtherButtons(null);
    }
  }

  function startYouTubeUpdateInterval() {
    stopUpdateInterval();
    updateInterval = window.setInterval(() => {
      if (youtubePlayer && currentPlayerType === 'youtube') {
        const currentTime = youtubePlayer.getCurrentTime();
        const duration = youtubePlayer.getDuration();
        if (currentTime && duration) {
          seekSlider.value = Math.floor(currentTime).toString();
          currentTimeDisplay!.textContent = formatTime(currentTime);
          seekSlider.max = Math.floor(duration).toString();
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

  // Initialize YouTube if API is available
  if (typeof window.YT !== 'undefined') {
    initYouTubePlayer();
  } else {
    window.onYouTubeIframeAPIReady = initYouTubePlayer;
  }

  // Audio element event listeners
  audio.addEventListener("loadedmetadata", () => {
    durationDisplay!.textContent = formatTime(audio.duration);
    seekSlider.max = Math.floor(audio.duration).toString();
    audioLoading?.classList.add("hidden");
    audioControl?.classList.remove("hidden");
  });

  audio.addEventListener("error", () => {
    audioLoading?.classList.add("hidden");
    audioControl?.classList.add("hidden");
  });

  // Play/Pause toggle
  playToggle?.addEventListener("change", () => {
    if (currentPlayerType === 'youtube' && youtubePlayer) {
      const state = youtubePlayer.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        youtubePlayer.pauseVideo();
      } else {
        youtubePlayer.playVideo();
      }
    } else if (currentPlayerType === 'audio') {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    }
  });

  audio.addEventListener("play", () => {
    playToggle.checked = true;
    disableOtherButtons(null);
  });

  audio.addEventListener("pause", () => {
    playToggle.checked = false;
    disableOtherButtons(null);
  });

  muteToggle?.addEventListener("change", () => {
    if (currentPlayerType === 'youtube' && youtubePlayer) {
      if (muteToggle.checked) {
        youtubePlayer.mute();
      } else {
        youtubePlayer.unMute();
      }
    } else {
      audio.muted = muteToggle.checked;
    }
  });

  seekSlider?.addEventListener("input", () => {
    currentTimeDisplay!.textContent = formatTime(parseInt(seekSlider.value));
  });

  seekSlider?.addEventListener("change", () => {
    if (currentPlayerType === 'youtube' && youtubePlayer) {
      youtubePlayer.seekTo(parseInt(seekSlider.value), true);
    } else {
      audio.currentTime = parseInt(seekSlider.value);
    }
  });

  audio.addEventListener("timeupdate", () => {
    if (currentPlayerType === 'audio') {
      seekSlider.value = Math.floor(audio.currentTime).toString();
      currentTimeDisplay!.textContent = formatTime(audio.currentTime);
    }
  });

  // Card button click handlers
  playButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!(btn instanceof HTMLInputElement)) return;

      const rawUrl = btn.dataset.audioUrl;
      const youtubeId = btn.dataset.youtubeId;
      if (!rawUrl && !youtubeId) return;

      // Show player
      musicPlayer?.classList.remove("hidden", "opacity-0");
      musicPlayer?.classList.add("flex");
      footer?.classList.add("pb-24");
      setTimeout(() => musicPlayer?.classList.remove("opacity-0"), 100);

      // Check if YouTube or audio
      if (youtubeId) {
        // Check if YouTube player is ready
        if (!youtubePlayerReady) {
          console.log('YouTube player not ready yet, waiting...');
          // Wait for player to be ready and try again
          const waitForPlayer = window.setInterval(() => {
            if (youtubePlayerReady) {
              clearInterval(waitForPlayer);
              btn.click(); // Retry the click
            }
          }, 100);
          return;
        }

        // Check if it's the same YouTube video
        const currentVideoUrl = youtubePlayer.getVideoUrl();
        const isSameVideo = currentVideoUrl && currentVideoUrl.includes(youtubeId);
        
        console.log('YouTube button clicked:', {
          youtubeId,
          currentVideoUrl,
          isSameVideo,
          currentPlayerType,
          playerState: youtubePlayer.getPlayerState()
        });

        if (isSameVideo && currentPlayerType === 'youtube') {
          // Same video - toggle play/pause
          const state = youtubePlayer.getPlayerState();
          console.log('Toggling play/pause, current state:', state);
          if (state === window.YT.PlayerState.PLAYING) {
            youtubePlayer.pauseVideo();
          } else {
            youtubePlayer.playVideo();
          }
          return;
        }

        // YouTube playback (new video)
        audio.pause();
        audio.src = '';

        audioLoading?.classList.remove("hidden");
        audioControl?.classList.add("hidden");

        // Set player type immediately before loading video
        currentPlayerType = 'youtube';
        
        youtubePlayer.loadVideoById(youtubeId);
        youtubePlayer.playVideo();

        // Update duration when available
        const checkDuration = window.setInterval(() => {
          const duration = youtubePlayer.getDuration();
          if (duration > 0) {
            durationDisplay!.textContent = formatTime(duration);
            seekSlider.max = Math.floor(duration).toString();
            audioLoading?.classList.add("hidden");
            audioControl?.classList.remove("hidden");
            clearInterval(checkDuration);
          }
        }, 100);

        playToggle.checked = true;
        disableOtherButtons(btn.id);
      } else if (rawUrl) {
        // Audio playback
        currentPlayerType = 'audio';
        stopUpdateInterval();
        if (youtubePlayer) {
          youtubePlayer.stopVideo();
        }

        const encodedUrl = rawUrl.startsWith("http") ? rawUrl : encodeURI(rawUrl);
        const fullUrl = normalizeUrl(encodedUrl);
        const isSameAudio = normalizeUrl(audio.src) === fullUrl;

        if (isSameAudio) {
          if (audio.paused) {
            audio.play();
          } else {
            audio.pause();
          }
          return;
        }

        audioLoading?.classList.remove("hidden");
        audioControl?.classList.add("hidden");

        currentTimeDisplay!.textContent = "0:00";
        durationDisplay!.textContent = "0:00";

        audio.src = fullUrl;
        audio.load();
        playToggle.checked = true;
        disableOtherButtons(btn.id);
        audio.play();
      }
    });
  });

  function disableOtherButtons(activeId: string | null) {
    playButtons.forEach((btn) => {
      if (!(btn instanceof HTMLInputElement)) return;

      const btnUrl = btn.dataset.audioUrl;
      const btnYoutubeId = btn.dataset.youtubeId;
      if (!btnUrl && !btnYoutubeId) return;

      let isSameMedia = false;
      if (currentPlayerType === 'youtube' && btnYoutubeId && youtubePlayer) {
        const currentVideoUrl = youtubePlayer.getVideoUrl();
        isSameMedia = currentVideoUrl ? currentVideoUrl.includes(btnYoutubeId) : false;
      } else if (currentPlayerType === 'audio' && btnUrl) {
        const fullUrl = normalizeUrl(btnUrl);
        isSameMedia = normalizeUrl(audio.src) === fullUrl;
      }

      const isActive = btn.id === activeId;
      const isPlaying = currentPlayerType === 'youtube' 
        ? (youtubePlayer && youtubePlayer.getPlayerState() === window.YT.PlayerState.PLAYING)
        : !audio.paused;

      const shouldBeChecked = isPlaying && isSameMedia && (isActive || activeId === null);
      btn.checked = shouldBeChecked;

      const card = btn.closest(".audio-card");
      if (card) {
        (card as HTMLElement).dataset.active = shouldBeChecked ? "true" : "false";
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", (event) => {
    const target = document.activeElement;
    if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

    // Alt キーが押されている場合はブラウザのネイティブ機能を優先
    if (event.altKey) return;

    switch (event.code) {
      case "Space":
        event.preventDefault();
        playToggle?.click();
        break;
      case "ArrowRight":
        event.preventDefault();
        if (currentPlayerType === 'youtube' && youtubePlayer) {
          const currentTime = youtubePlayer.getCurrentTime();
          const duration = youtubePlayer.getDuration();
          youtubePlayer.seekTo(Math.min(duration, currentTime + 5), true);
        } else {
          audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        }
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (currentPlayerType === 'youtube' && youtubePlayer) {
          const currentTime = youtubePlayer.getCurrentTime();
          youtubePlayer.seekTo(Math.max(0, currentTime - 5), true);
        } else {
          audio.currentTime = Math.max(0, audio.currentTime - 5);
        }
        break;
    }
  });
}
