import { Audio } from "expo-av";

let activeSound: Audio.Sound | null = null;

async function fadeVolume(target: Audio.Sound, from: number, to: number, durationMs: number) {
  const steps = 20;
  const tickMs = Math.max(30, Math.floor(durationMs / steps));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const next = from + (to - from) * t;
    try {
      await target.setVolumeAsync(next);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, tickMs));
  }
}

type BreathingAudioSource = {
  asset?: number;
  url?: string;
  targetVolume?: number;
};

export async function startBreathingAudio(source: BreathingAudioSource): Promise<void> {
  try {
    await stopBreathingAudio(0);
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    let playbackSource: number | { uri: string } | null = null;
    if (typeof source.asset === "number") {
      playbackSource = source.asset;
    } else if (source.url) {
      playbackSource = { uri: source.url };
    }
    if (!playbackSource) return;

    let sound: Audio.Sound;
    try {
      ({ sound } = await Audio.Sound.createAsync(playbackSource, {
        shouldPlay: true,
        isLooping: true,
        volume: 0,
      }));
    } catch {
      if (source.url) {
        ({ sound } = await Audio.Sound.createAsync(
          { uri: source.url },
          { shouldPlay: true, isLooping: true, volume: 0 },
        ));
      } else {
        return;
      }
    }
    activeSound = sound;
    const targetVolume = typeof source.targetVolume === "number" ? source.targetVolume : 0.45;
    await fadeVolume(sound, 0, targetVolume, 3000);
  } catch {
    activeSound = null;
  }
}

export async function stopBreathingAudio(fadeOutMs = 3000): Promise<void> {
  if (!activeSound) return;
  const current = activeSound;
  activeSound = null;
  try {
    const status = await current.getStatusAsync();
    const currentVolume =
      status.isLoaded && typeof status.volume === "number" ? status.volume : 0.45;
    if (fadeOutMs > 0) {
      await fadeVolume(current, currentVolume, 0, fadeOutMs);
    }
    await current.stopAsync();
    await current.unloadAsync();
  } catch {
    // no-op
  }
}
