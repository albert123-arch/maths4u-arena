export const ARENA_AUDIO_SETTINGS_KEY = "maths4u_arena_audio_settings";
export const ARENA_AUDIO_SETTINGS_CHANGED_EVENT = "maths4u_arena_audio_settings_changed";

export type ArenaMusicTheme = "lobby" | "question" | "calm" | "battle" | "level";

export type ArenaSoundName =
  | "answer-submit"
  | "bonus"
  | "button-click"
  | "coin"
  | "correct"
  | "countdown-final"
  | "countdown-tick"
  | "fanfare"
  | "game-finished"
  | "leaderboard"
  | "reveal"
  | "time-up";

export type ArenaAudioSettings = {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  musicTheme: ArenaMusicTheme;
};

export const DEFAULT_ARENA_AUDIO_SETTINGS: ArenaAudioSettings = {
  soundEnabled: true,
  musicEnabled: false,
  soundVolume: 0.7,
  musicVolume: 0.25,
  musicTheme: "lobby",
};

const SOUND_SOURCES: Record<ArenaSoundName, string> = {
  "answer-submit": "/audio/button-click.wav",
  bonus: "/audio/bonus.wav",
  "button-click": "/audio/button-click.wav",
  coin: "/audio/coin.wav",
  correct: "/audio/correct.wav",
  "countdown-final": "/audio/countdown-final.wav",
  "countdown-tick": "/audio/countdown-tick.wav",
  fanfare: "/audio/fanfare.wav",
  "game-finished": "/audio/game-finished.wav",
  leaderboard: "/audio/leaderboard.wav",
  reveal: "/audio/reveal.wav",
  "time-up": "/audio/time-up.wav",
};

const MUSIC_SOURCES: Record<ArenaMusicTheme, string> = {
  lobby: "/audio/lobby-loop-1.mp3",
  question: "/audio/question-loop-1.mp3",
  calm: "/audio/calm-loop-1.mp3",
  battle: "/audio/battle-loop-1.mp3",
  level: "/audio/level-loop-1.wav",
};

function clampVolume(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function booleanSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function musicThemeSetting(value: unknown): ArenaMusicTheme {
  return value === "question" || value === "calm" || value === "battle" || value === "level" || value === "lobby"
    ? value
    : DEFAULT_ARENA_AUDIO_SETTINGS.musicTheme;
}

export function parseArenaAudioSettings(value: string | null): ArenaAudioSettings {
  if (!value) {
    return DEFAULT_ARENA_AUDIO_SETTINGS;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ArenaAudioSettings> | null;

    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_ARENA_AUDIO_SETTINGS;
    }

    return {
      soundEnabled: booleanSetting(parsed.soundEnabled, DEFAULT_ARENA_AUDIO_SETTINGS.soundEnabled),
      musicEnabled: booleanSetting(parsed.musicEnabled, DEFAULT_ARENA_AUDIO_SETTINGS.musicEnabled),
      soundVolume: clampVolume(parsed.soundVolume, DEFAULT_ARENA_AUDIO_SETTINGS.soundVolume),
      musicVolume: clampVolume(parsed.musicVolume, DEFAULT_ARENA_AUDIO_SETTINGS.musicVolume),
      musicTheme: musicThemeSetting(parsed.musicTheme),
    };
  } catch {
    return DEFAULT_ARENA_AUDIO_SETTINGS;
  }
}

export function readArenaAudioSettings(): ArenaAudioSettings {
  if (typeof window === "undefined") {
    return DEFAULT_ARENA_AUDIO_SETTINGS;
  }

  return parseArenaAudioSettings(window.localStorage.getItem(ARENA_AUDIO_SETTINGS_KEY));
}

export function saveArenaAudioSettings(settings: ArenaAudioSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ARENA_AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(ARENA_AUDIO_SETTINGS_CHANGED_EVENT));
}

export class ArenaAudioManager {
  private settings = DEFAULT_ARENA_AUDIO_SETTINGS;
  private sounds = new Map<ArenaSoundName, HTMLAudioElement>();
  private music: HTMLAudioElement | null = null;
  private musicTheme: ArenaMusicTheme | null = null;

  setSettings(settings: ArenaAudioSettings) {
    this.settings = settings;

    for (const sound of this.sounds.values()) {
      sound.volume = settings.soundVolume;
    }

    if (this.music) {
      this.music.volume = settings.musicVolume;

      if (!settings.musicEnabled) {
        this.stopMusic();
      }
    }
  }

  async unlock() {
    if (typeof Audio === "undefined") {
      return true;
    }

    try {
      const probe = new Audio(SOUND_SOURCES.coin);
      probe.volume = 0;
      await probe.play();
      probe.pause();
      probe.currentTime = 0;
      return true;
    } catch {
      return false;
    }
  }

  async playSound(name: ArenaSoundName) {
    if (!this.settings.soundEnabled || typeof Audio === "undefined") {
      return true;
    }

    try {
      const sound = this.sound(name);
      sound.pause();
      sound.currentTime = 0;
      sound.volume = this.settings.soundVolume;
      await sound.play();
      return true;
    } catch {
      return false;
    }
  }

  async startMusic(theme: ArenaMusicTheme = this.settings.musicTheme) {
    if (!this.settings.musicEnabled || typeof Audio === "undefined") {
      this.stopMusic();
      return true;
    }

    try {
      if (!this.music || this.musicTheme !== theme) {
        this.stopMusic();
        this.music = new Audio(MUSIC_SOURCES[theme]);
        this.music.loop = true;
        this.musicTheme = theme;
      }

      this.music.volume = this.settings.musicVolume;
      await this.music.play();
      return true;
    } catch {
      return false;
    }
  }

  stopMusic() {
    if (!this.music) {
      return;
    }

    this.music.pause();
    this.music.currentTime = 0;
  }

  private sound(name: ArenaSoundName) {
    const cached = this.sounds.get(name);

    if (cached) {
      return cached;
    }

    const sound = new Audio(SOUND_SOURCES[name]);
    sound.preload = "auto";
    sound.volume = this.settings.soundVolume;
    this.sounds.set(name, sound);

    return sound;
  }
}

let sharedArenaAudioManager: ArenaAudioManager | null = null;

export function getArenaAudioManager() {
  sharedArenaAudioManager ??= new ArenaAudioManager();

  return sharedArenaAudioManager;
}
