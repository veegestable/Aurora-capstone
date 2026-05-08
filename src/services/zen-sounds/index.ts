import type { Track } from './types'
export * from './types'

class ZenSoundsService {
  private audio: HTMLAudioElement | null = null
  private currentTrack: Track | null = null
  private volume = 0.5

  play(track: Track) {
    if (this.currentTrack?.id === track.id && this.audio) {
      this.audio.play().catch(e => console.warn('Audio playback failed:', e))
      return
    }

    this.stop()
    this.currentTrack = track
    this.audio = new Audio(track.url)
    this.audio.loop = true
    this.audio.volume = track.volume ?? this.volume
    this.audio.play().catch(e =>
      console.warn('Audio playback failed (check the URL or autoplay policy):', e),
    )
  }

  pause() {
    if (this.audio) this.audio.pause()
  }

  resume() {
    if (this.audio) {
      this.audio.play().catch(e => console.warn('Audio resume failed:', e))
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }
    this.audio = null
    this.currentTrack = null
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.audio) this.audio.volume = this.volume
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack
  }
}

export const zenSoundsService = new ZenSoundsService()