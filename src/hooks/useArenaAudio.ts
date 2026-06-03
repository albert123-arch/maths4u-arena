"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ARENA_AUDIO_SETTINGS_CHANGED_EVENT,
  DEFAULT_ARENA_AUDIO_SETTINGS,
  type ArenaAudioSettings,
  type ArenaMusicTheme,
  type ArenaSoundName,
  getArenaAudioManager,
  readArenaAudioSettings,
  saveArenaAudioSettings,
} from "@/lib/audio/audio-manager";

export function useArenaAudio() {
  const manager = useMemo(() => getArenaAudioManager(), []);
  const [settings, setSettingsState] = useState<ArenaAudioSettings>(DEFAULT_ARENA_AUDIO_SETTINGS);
  const [audioLocked, setAudioLocked] = useState(false);

  useEffect(() => {
    const syncSettings = () => {
      const stored = readArenaAudioSettings();
      setSettingsState(stored);
      manager.setSettings(stored);
    };

    syncSettings();
    window.addEventListener(ARENA_AUDIO_SETTINGS_CHANGED_EVENT, syncSettings);
    window.addEventListener("storage", syncSettings);

    return () => {
      window.removeEventListener(ARENA_AUDIO_SETTINGS_CHANGED_EVENT, syncSettings);
      window.removeEventListener("storage", syncSettings);
    };
  }, [manager]);

  const updateSettings = useCallback(
    (patch: Partial<ArenaAudioSettings>) => {
      const next = {
        ...settings,
        ...patch,
      };

      setSettingsState(next);
      manager.setSettings(next);
      saveArenaAudioSettings(next);
    },
    [manager, settings],
  );

  const unlock = useCallback(async () => {
    const unlocked = await manager.unlock();
    setAudioLocked(!unlocked);

    return unlocked;
  }, [manager]);

  const playSound = useCallback(
    async (name: ArenaSoundName) => {
      const played = await manager.playSound(name);

      if (!played && settings.soundEnabled) {
        setAudioLocked(true);
      }

      return played;
    },
    [manager, settings.soundEnabled],
  );

  const startMusic = useCallback(
    async (theme: ArenaMusicTheme = settings.musicTheme) => {
      const played = await manager.startMusic(theme);

      if (!played && settings.musicEnabled) {
        setAudioLocked(true);
      }

      return played;
    },
    [manager, settings.musicEnabled, settings.musicTheme],
  );

  const stopMusic = useCallback(() => {
    manager.stopMusic();
  }, [manager]);

  return {
    settings,
    audioLocked,
    updateSettings,
    unlock,
    playSound,
    startMusic,
    stopMusic,
  };
}
