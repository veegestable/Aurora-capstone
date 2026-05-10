import type { Track, ZenPlaybackState } from './types'
export * from './types'

type StateListener = (state: ZenPlaybackState) => void

class ZenSoundsService {
  private audio: HTMLAudioElement | null = null
  private currentTrack: Track | null = null
  private volume = 0.5
  private listeners: Set<StateListener> = new Set()
  private state: ZenPlaybackState = {
    isLoading: false,
    hasError: false,
    errorMessage: null,
  }

  /** Subscribe to playback state changes (loading, error). Returns unsubscribe fn. */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private emit(patch: Partial<ZenPlaybackState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(fn => fn(this.state))
  }

  play(track: Track) {
    // Same track — just resume
    if (this.currentTrack?.id === track.id && this.audio) {
      this.audio.play().catch(e => this.handlePlayError(e))
      return
    }

    this.stop()
    this.currentTrack = track
    this.emit({ isLoading: true, hasError: false, errorMessage: null })

    const el = new Audio(track.url)
    el.loop = true
    el.volume = track.volume ?? this.volume
    el.preload = 'auto'

    el.addEventListener('canplaythrough', () => {
      this.emit({ isLoading: false })
    }, { once: true })

    el.addEventListener('error', () => {
      const msg = `Could not load audio: ${track.title}`
      console.warn('[ZenSounds]', msg, track.url)
      this.emit({ isLoading: false, hasError: true, errorMessage: msg })
    })

    this.audio = el
    el.play().catch(e => this.handlePlayError(e))
  }

  pause() {
    if (this.audio) this.audio.pause()
  }

  resume() {
    if (this.audio) {
      this.audio.play().catch(e => this.handlePlayError(e))
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.audio.removeAttribute('src')
      this.audio.load()
    }
    this.audio = null
    this.currentTrack = null
    this.emit({ isLoading: false, hasError: false, errorMessage: null })
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.audio) this.audio.volume = this.volume
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack
  }

  getState(): ZenPlaybackState {
    return this.state
  }

  private handlePlayError(e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e))
    // NotAllowedError = autoplay policy — not a real failure
    if (err.name === 'NotAllowedError') {
      console.info('[ZenSounds] Autoplay blocked — will play on next user gesture.')
      this.emit({ isLoading: false, hasError: false, errorMessage: null })
      return
    }
    console.warn('[ZenSounds] Playback error:', err.message)
    this.emit({ isLoading: false, hasError: true, errorMessage: err.message })
  }
}

export const zenSoundsService = new ZenSoundsService()