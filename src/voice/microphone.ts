type RecognitionResult = { isFinal: boolean; 0: { transcript: string; confidence: number } };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult>; resultIndex: number }) => void) | null;
  onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type RecognitionConstructor = new () => Recognition;
const speechWindow = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
export const recognitionAvailable = Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition);
export const recordingAvailable = typeof navigator.mediaDevices !== 'undefined' && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined';
export type MicrophoneCallbacks = { status(text: string): void; transcript(text: string): void; error(text: string): void; finished(): void };

/** One bounded operation, invalidated when the role/session changes. */
export class CommandMicrophone {
  private active = false;
  private holding = false;
  private revision = 0;
  private stream?: MediaStream;
  private recorder?: MediaRecorder;
  private recognition?: Recognition;
  private upload?: AbortController;
  private timer?: number;
  private timeout?: number;
  constructor(private readonly callbacks: MicrophoneCallbacks) {}
  async start(provider: 'fish' | 'browser') {
    if (this.active) return;
    this.active = true; this.holding = true;
    const revision = ++this.revision;
    const current = () => this.active && revision === this.revision;
    this.callbacks.status('Requesting microphone…');
    try {
      if (provider === 'browser') {
        const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
        if (!Constructor) throw new Error('Browser speech is unavailable here. Use Chrome, configure Fish Audio, or type your command.');
        const recognition = this.recognition = new Constructor();
        recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true;
        const parts: string[] = []; let failed = false;
        recognition.onresult = event => {
          if (!current()) return;
          for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) parts[i] = event.results[i][0].transcript;
        };
        recognition.onerror = event => {
          if (!current()) return;
          failed = true;
          this.callbacks.error(event.error === 'not-allowed' ? 'Microphone permission denied. You can still type commands.' : 'Browser speech could not hear that command. Try again or use text.');
        };
        recognition.onend = () => {
          if (!current()) return;
          const text = parts.filter(Boolean).join(' ').trim();
          if (!failed) { if (text) this.callbacks.transcript(text); else this.callbacks.error('No speech captured. Hold the mic while speaking, or type a command.'); }
          this.finish(revision);
        };
        recognition.start();
      } else {
        if (!recordingAvailable) throw new Error('Recording is unavailable. Open on localhost or HTTPS, or use text.');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
        if (!current() || !this.holding) { stream.getTracks().forEach(track => track.stop()); if (current()) this.finish(revision); return; }
        this.stream = stream;
        const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
        if (!mimeType) throw new Error('This browser has no supported recording format. Use Chrome or type a command.');
        const recorder = this.recorder = new MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];
        recorder.ondataavailable = event => { if (current() && event.data.size) chunks.push(event.data); };
        recorder.onerror = () => { if (current()) { this.callbacks.error('Recording failed. Try again or use text.'); this.release(true); } };
        recorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          if (!current()) return;
          this.stream = undefined; this.recorder = undefined; window.clearTimeout(this.timer);
          try {
            const audio = new Blob(chunks, { type: mimeType });
            if (!audio.size) throw new Error('No audio recorded. Hold the mic while speaking.');
            this.callbacks.status('Transcribing with Fish Audio…');
            const data = new FormData(); data.append('audio', audio, mimeType.includes('mp4') ? 'command.mp4' : mimeType.includes('ogg') ? 'command.ogg' : 'command.webm');
            const controller = this.upload = new AbortController();
            this.timeout = window.setTimeout(() => controller.abort(), 18000);
            const response = await fetch('/api/transcribe', { method: 'POST', body: data, signal: controller.signal });
            const result = await response.json();
            if (!current()) return;
            if (!response.ok) throw new Error(result.error || 'Transcription failed.');
            if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('No speech found. Try again or use text.');
            this.callbacks.transcript(result.text);
          } catch (error) {
            if (current()) this.callbacks.error(error instanceof Error && error.name !== 'AbortError' ? error.message : 'Transcription timed out. Try again or use text.');
          } finally { this.finish(revision); }
        };
        recorder.start();
      }
      if (current()) { this.callbacks.status('Listening… release to finish'); this.timer = window.setTimeout(() => this.release(), 15000); }
    } catch (error) {
      if (!current()) return;
      this.callbacks.error(error instanceof DOMException && error.name === 'NotAllowedError' ? 'Microphone permission denied. You can still type commands.' : error instanceof Error ? error.message : 'Microphone unavailable. Use text.');
      this.finish(revision);
    }
  }
  release(cancel = false) {
    if (!this.active) return;
    this.holding = false; window.clearTimeout(this.timer);
    if (cancel) { this.finish(this.revision); return; }
    if (this.recorder?.state === 'recording') this.recorder.stop();
    if (this.recognition) {
      this.recognition.stop();
      if (this.active) this.timeout = window.setTimeout(() => {
        if (this.active) { this.callbacks.error('Browser speech timed out. Try again or use text.'); this.finish(this.revision); }
      }, 5000);
    }
  }
  private finish(revision: number) {
    if (!this.active || revision !== this.revision) return;
    this.active = false; this.holding = false; this.revision++;
    window.clearTimeout(this.timer); window.clearTimeout(this.timeout); this.upload?.abort(); this.upload = undefined;
    const recorder = this.recorder; this.recorder = undefined;
    if (recorder?.state === 'recording') recorder.stop();
    const recognition = this.recognition; this.recognition = undefined;
    recognition?.abort();
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined;
    this.callbacks.finished();
  }
}
