export async function decodeAudioFile(
  arrayBuffer: ArrayBuffer,
  audioContext: AudioContext,
): Promise<AudioBuffer> {
  // Safari wants the callback form; the promise form works everywhere else.
  return audioContext.decodeAudioData(arrayBuffer.slice(0))
}

export interface PeakPair {
  min: number
  max: number
}

/** Downsamples a time range of a decoded buffer into min/max pairs for drawing a waveform. */
export function computePeaksForRange(
  buffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number,
  numPeaks: number,
): PeakPair[] {
  const data = buffer.getChannelData(0)
  const startSample = Math.max(0, Math.floor(startSeconds * buffer.sampleRate))
  const endSample = Math.min(data.length, Math.ceil(endSeconds * buffer.sampleRate))
  const totalSamples = Math.max(1, endSample - startSample)
  const samplesPerPeak = Math.max(1, Math.floor(totalSamples / numPeaks))
  const peaks: PeakPair[] = []

  for (let i = 0; i < numPeaks; i++) {
    const start = startSample + i * samplesPerPeak
    const end = Math.min(start + samplesPerPeak, endSample)
    let min = 0
    let max = 0
    for (let j = start; j < end; j++) {
      const value = data[j]
      if (value < min) min = value
      if (value > max) max = value
    }
    peaks.push({ min, max })
  }

  return peaks
}

/** Downsamples the whole buffer into min/max pairs for drawing a waveform. */
export function computePeaks(buffer: AudioBuffer, numPeaks: number): PeakPair[] {
  return computePeaksForRange(buffer, 0, buffer.duration, numPeaks)
}

/**
 * Nudges a time (in seconds) to the nearest zero-crossing within a small
 * search window, so a loop point doesn't land mid-waveform and click.
 */
export function snapToZeroCrossing(
  buffer: AudioBuffer,
  timeSeconds: number,
  searchWindowSeconds = 0.01,
): number {
  const data = buffer.getChannelData(0)
  const sampleRate = buffer.sampleRate
  const centerIndex = Math.round(timeSeconds * sampleRate)
  const windowSize = Math.round(searchWindowSeconds * sampleRate)
  const start = Math.max(0, centerIndex - windowSize)
  const end = Math.min(data.length - 1, centerIndex + windowSize)

  let bestIndex = centerIndex
  let bestDistance = Infinity

  for (let i = start; i < end; i++) {
    const a = data[i]
    const b = data[i + 1]
    const isCrossing = (a <= 0 && b >= 0) || (a >= 0 && b <= 0)
    if (isCrossing) {
      const distance = Math.abs(i - centerIndex)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }
  }

  return bestIndex / sampleRate
}

export interface LoopRange {
  start: number
  end: number
}

/** Thin wrapper around a single AudioBufferSourceNode for sample-accurate looping playback. */
export class LoopPlayer {
  private context: AudioContext
  private buffer: AudioBuffer
  private source: AudioBufferSourceNode | null = null
  private startedAtContextTime = 0
  private startOffset = 0
  private loop: LoopRange | null = null
  playing = false

  constructor(context: AudioContext, buffer: AudioBuffer) {
    this.context = context
    this.buffer = buffer
  }

  play(offsetSeconds: number, loop: LoopRange | null) {
    this.stop()

    const source = this.context.createBufferSource()
    source.buffer = this.buffer
    if (loop) {
      source.loop = true
      source.loopStart = loop.start
      source.loopEnd = loop.end
    }
    source.connect(this.context.destination)
    source.start(0, offsetSeconds)
    source.onended = () => {
      if (this.source === source) {
        this.playing = false
        this.source = null
      }
    }

    this.source = source
    this.startedAtContextTime = this.context.currentTime
    this.startOffset = offsetSeconds
    this.loop = loop
    this.playing = true
  }

  stop() {
    if (this.source) {
      this.source.onended = null
      try {
        this.source.stop()
      } catch {
        // already stopped
      }
      this.source.disconnect()
      this.source = null
    }
    this.playing = false
  }

  /** Current playhead position in seconds, accounting for looping wrap-around. */
  getCurrentTime(): number {
    if (!this.playing) return this.startOffset
    const elapsed = this.context.currentTime - this.startedAtContextTime
    let time = this.startOffset + elapsed
    if (this.loop) {
      const loopLength = this.loop.end - this.loop.start
      if (loopLength > 0 && time >= this.loop.end) {
        const sinceLoopStart = time - this.loop.start
        time = this.loop.start + (sinceLoopStart % loopLength)
      }
    }
    return time
  }
}
