export type SoundEvent = 'tap' | 'primary' | 'favorite' | 'open' | 'close' | 'success' | 'warning' | 'error'

let audioContext: AudioContext | null = null
const lastEffectAt = new Map<SoundEvent, number>()

const SOUND_PATTERNS: Record<SoundEvent, Array<{ frequency: number; offset: number; duration: number; gain: number }>> = {
  tap: [{ frequency: 690, offset: 0, duration: 0.045, gain: 0.03 }],
  primary: [{ frequency: 760, offset: 0, duration: 0.055, gain: 0.038 }],
  favorite: [
    { frequency: 600, offset: 0, duration: 0.07, gain: 0.035 },
    { frequency: 820, offset: 0.045, duration: 0.085, gain: 0.03 },
  ],
  open: [
    { frequency: 500, offset: 0, duration: 0.09, gain: 0.03 },
    { frequency: 660, offset: 0.055, duration: 0.1, gain: 0.025 },
  ],
  close: [{ frequency: 540, offset: 0, duration: 0.065, gain: 0.025 }],
  success: [
    { frequency: 587, offset: 0, duration: 0.09, gain: 0.032 },
    { frequency: 740, offset: 0.07, duration: 0.12, gain: 0.03 },
  ],
  warning: [{ frequency: 390, offset: 0, duration: 0.1, gain: 0.03 }],
  error: [
    { frequency: 420, offset: 0, duration: 0.07, gain: 0.028 },
    { frequency: 330, offset: 0.055, duration: 0.09, gain: 0.024 },
  ],
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null
  audioContext ??= new window.AudioContext()
  return audioContext
}

function playTone(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  amplitude: number,
) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(Math.max(amplitude, 0.0002), startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
  oscillator.addEventListener('ended', () => {
    oscillator.disconnect()
    gain.disconnect()
  }, { once: true })
}

export async function unlockSound() {
  const context = getAudioContext()
  if (context?.state === 'suspended') {
    await context.resume().catch((cause: unknown) => {
      if (import.meta.env.DEV) console.debug('Booki audio is unavailable in this browser session.', cause)
    })
  }
}

export function playSound(event: SoundEvent, volume = 0.55) {
  const timestamp = performance.now()
  const previousEffectAt = lastEffectAt.get(event)
  if (previousEffectAt !== undefined && timestamp - previousEffectAt < 55) return
  lastEffectAt.set(event, timestamp)

  const context = getAudioContext()
  if (!context || context.state !== 'running' || volume <= 0) return

  const safeVolume = Math.min(1, Math.max(0, volume))
  const now = context.currentTime
  for (const tone of SOUND_PATTERNS[event]) {
    playTone(context, tone.frequency, now + tone.offset, tone.duration, tone.gain * safeVolume)
  }
}
