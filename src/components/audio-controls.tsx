"use client";

import { useArenaAudio } from "@/hooks/useArenaAudio";
import type { ArenaMusicTheme } from "@/lib/audio/audio-manager";

const musicThemes: Array<{ value: ArenaMusicTheme; label: string }> = [
  { value: "lobby", label: "Lobby" },
  { value: "question", label: "Question" },
  { value: "calm", label: "Calm" },
  { value: "battle", label: "Battle" },
  { value: "level", label: "Level" },
];

export function AudioControls({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) {
  const audio = useArenaAudio();
  const { settings } = audio;
  const muted = !settings.soundEnabled && !settings.musicEnabled;
  const panelClass = dark
    ? "border-slate-700 bg-slate-900 text-slate-100"
    : "border-slate-200 bg-white text-slate-900";
  const buttonClass = dark
    ? "border-slate-600 text-slate-100 hover:bg-slate-800"
    : "border-slate-300 text-slate-800 hover:bg-slate-50";

  async function enableSound() {
    audio.updateSettings({ soundEnabled: true });
    await audio.unlock();
    await audio.playSound("button-click");
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${panelClass}`}>
      {audio.audioLocked ? (
        <button
          type="button"
          onClick={enableSound}
          className={`rounded-md border px-2 py-1 font-semibold transition ${buttonClass}`}
        >
          Enable Sound
        </button>
      ) : null}
      <label className="flex items-center gap-1 font-semibold">
        <input
          type="checkbox"
          checked={settings.soundEnabled}
          onChange={(event) => audio.updateSettings({ soundEnabled: event.target.checked })}
          className="accent-teal-600"
        />
        Sound
      </label>
      <button
        type="button"
        onClick={() =>
          audio.updateSettings(
            muted
              ? { soundEnabled: true }
              : {
                  soundEnabled: false,
                  musicEnabled: false,
                },
          )
        }
        className={`rounded-md border px-2 py-1 font-semibold transition ${buttonClass}`}
      >
        {muted ? "Unmute" : "Mute"}
      </button>
      <label className="flex items-center gap-1 font-semibold">
        <input
          type="checkbox"
          checked={settings.musicEnabled}
          onChange={(event) => audio.updateSettings({ musicEnabled: event.target.checked })}
          className="accent-teal-600"
        />
        Music
      </label>
      {compact ? null : (
        <>
          <label className="flex items-center gap-2">
            SFX
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.soundVolume}
              onChange={(event) => audio.updateSettings({ soundVolume: Number(event.target.value) })}
              className="w-20 accent-teal-600"
            />
          </label>
          <label className="flex items-center gap-2">
            Music
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              onChange={(event) => audio.updateSettings({ musicVolume: Number(event.target.value) })}
              className="w-20 accent-teal-600"
            />
          </label>
          <label className="flex items-center gap-1">
            Theme
            <select
              value={settings.musicTheme}
              onChange={(event) => audio.updateSettings({ musicTheme: event.target.value as ArenaMusicTheme })}
              className={
                dark
                  ? "rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100"
                  : "rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900"
              }
            >
              {musicThemes.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}
