/**
 * micCapture — 16 kHz 16-bit linear PCM microphone capture (SDD §12.5).
 * Resamples browser audio input to 16,000 Hz mono PCM for Gemini Live API streaming.
 */

type PcmCallback = (chunk: Uint8Array) => void;

class MicCapture {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private active = false;
  private onDataCallback: PcmCallback | null = null;

  public isCapturing(): boolean {
    return this.active;
  }

  public async start(onData: PcmCallback): Promise<void> {
    if (this.active) return;
    this.onDataCallback = onData;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      const inputSampleRate = this.audioCtx.sampleRate;
      const targetSampleRate = 16000;

      this.source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      // 2048 buffer size gives ~46 ms chunks at 44.1 kHz, ~42 ms at 48 kHz
      this.processor = this.audioCtx.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.active || !this.onDataCallback) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.downsampleAndConvertToPcm16(inputData, inputSampleRate, targetSampleRate);
        if (pcm16.length > 0) {
          this.onDataCallback(new Uint8Array(pcm16.buffer));
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioCtx.destination);
      this.active = true;
    } catch (err) {
      this.cleanup();
      throw err;
    }
  }

  public stop(): void {
    if (!this.active) return;
    this.active = false;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.processor) {
      try { this.processor.disconnect(); } catch (_) { /* ignore */ }
      this.processor = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (_) { /* ignore */ }
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.onDataCallback = null;
  }

  private downsampleAndConvertToPcm16(
    buffer: Float32Array,
    inputRate: number,
    outputRate: number
  ): Int16Array {
    if (inputRate === outputRate) {
      const pcm = new Int16Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, buffer[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return pcm;
    }

    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const pcm = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = Math.min(Math.round(i * ratio), buffer.length - 1);
      const s = Math.max(-1, Math.min(1, buffer[srcIndex]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  }
}

export const micCapture = new MicCapture();
