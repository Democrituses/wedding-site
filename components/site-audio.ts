const DIRECTED_BY_SRC = "/directedby.mp3";
const ILLUMINATI_SRC = "/illuminaticonfirmed.mp3";
const CRAZY_FROG_SRC = "/Crazyfrog.mp3";

let theme: HTMLAudioElement | null = null;
let directedBy: HTMLAudioElement | null = null;
let illuminati: HTMLAudioElement | null = null;
let crazyFrog: HTMLAudioElement | null = null;
let frogReplacesTheme = false;
// A sting holds the theme down so a play() already in flight cannot talk over it.
let themeHeld = false;
// Counts mute and play presses so a sting only resumes the theme if nobody touched it.
let themeGeneration = 0;
let illuminatiMode: "idle" | "armed" | "play" = "idle";

function stopIlluminati() {
  illuminatiMode = "idle";
  if (!illuminati) return;
  illuminati.pause();
  illuminati.currentTime = 0;
}

function ensureIlluminati() {
  if (!illuminati) {
    illuminati = new Audio(ILLUMINATI_SRC);
    illuminati.className = "illuminati-audio";
    illuminati.preload = "auto";
    document.body.appendChild(illuminati);
  }
  return illuminati;
}

function stopCrazyFrog() {
  frogReplacesTheme = false;
  if (!crazyFrog) return;
  crazyFrog.pause();
  crazyFrog.currentTime = 0;
}

function ensureCrazyFrog() {
  if (!crazyFrog) {
    crazyFrog = new Audio(CRAZY_FROG_SRC);
    crazyFrog.className = "crazy-frog";
    crazyFrog.preload = "auto";
    document.body.appendChild(crazyFrog);
  }
  return crazyFrog;
}

export function bindTheme(audio: HTMLAudioElement) {
  theme = audio;
}

export function themeIsHeld() {
  return themeHeld;
}

export function playTheme() {
  themeGeneration += 1;
  themeHeld = false;
  directedBy?.pause();
  stopIlluminati();
  stopCrazyFrog();
  return theme?.play() ?? Promise.resolve();
}

export function pauseTheme() {
  themeGeneration += 1;
  themeHeld = true;
  theme?.pause();
}

// Called from the lookup click, before the result is known, so playback is allowed.
export function armIlluminati() {
  const audio = ensureIlluminati();
  illuminatiMode = "armed";
  audio.volume = 0;
  audio.currentTime = 0;
  void audio.play().then(() => {
    if (illuminatiMode !== "play") {
      audio.pause();
      audio.currentTime = 0;
    }
  }).catch(() => {});
}

export function cancelIlluminati() {
  illuminatiMode = "idle";
  stopIlluminati();
  if (illuminati) illuminati.volume = 1;
}

export function playIlluminati() {
  const themeWasPlaying = !!theme && !theme.paused;
  const generation = themeGeneration;
  illuminatiMode = "play";
  pauseTheme();
  directedBy?.pause();
  stopCrazyFrog();

  const audio = ensureIlluminati();
  audio.volume = 1;
  audio.currentTime = 0;
  audio.onended = () => {
    if (themeWasPlaying && themeGeneration === generation + 1) {
      void playTheme().catch(() => {});
    }
  };
  void audio.play().catch(() => {});
}

// Returns a way to undo the sting if the decline does not save.
export function playDirectedBy() {
  const themeWasPlaying = !!theme && !theme.paused;
  pauseTheme();
  stopIlluminati();
  stopCrazyFrog();

  if (!directedBy) {
    directedBy = new Audio(DIRECTED_BY_SRC);
    directedBy.className = "directed-by";
    directedBy.preload = "auto";
    document.body.appendChild(directedBy);
  }

  directedBy.currentTime = 0;
  void directedBy.play().catch(() => {});

  return () => {
    directedBy?.pause();
    if (directedBy) directedBy.currentTime = 0;
    if (themeWasPlaying) void playTheme().catch(() => {});
  };
}

// Accept replaces the theme with Crazy Frog until the guest chooses decline.
export function playCrazyFrog() {
  if (!crazyFrog || crazyFrog.paused) {
    frogReplacesTheme = !!theme && !theme.paused;
  }
  pauseTheme();
  directedBy?.pause();
  stopIlluminati();

  const audio = ensureCrazyFrog();
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}

export function releaseCrazyFrog() {
  const restore = frogReplacesTheme;
  stopCrazyFrog();
  if (restore) void playTheme().catch(() => {});
}

const HITMARKER_SRC = "/Hitmarker.mp3";

// Mixes over whatever else is playing. It does not pause the theme or the stings.
export function playHitmarker() {
  const hit = new Audio(HITMARKER_SRC);
  hit.className = "hitmarker";
  hit.preload = "auto";
  document.body.appendChild(hit);
  hit.onended = () => hit.remove();
  void hit.play().catch(() => {
    hit.remove();
  });
}
