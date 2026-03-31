export type SpeechToTextStatus = "inactive" | "starting" | "listening" | "transcribing" | "error";

export interface SpeechToTextResult {
    text: string;
    capturedAt: number;
}

export class SpeechToTextService {
    private mediaRecorder: any = null;
    private isEnabled = false;
    private onResultCallback?: (result: SpeechToTextResult) => void;
    private onStatusChangeCallback?: (status: SpeechToTextStatus) => void;
    
    private currentChunkStartedAt = 0;
    private audioChunks: Blob[] = [];

    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private microphone: MediaStreamAudioSourceNode | null = null;
    private checkInterval: number | null = null;

    private isSpeaking = false;
    private silenceStart = 0;
    
    private readonly SILENCE_THRESHOLD = 10;      
    private readonly SILENCE_DURATION_MS = 1000;  
    private readonly MAX_RECORDING_MS = 15000;   

    constructor() {}

    public setCallback(callback: (result: SpeechToTextResult) => void): void {
        this.onResultCallback = callback;
    }

    public setStatusCallback(callback: (status: SpeechToTextStatus) => void): void {
        this.onStatusChangeCallback = callback;
    }

    public async start(): Promise<void> {
        if (this.isEnabled) return;
        this.isEnabled = true;
        this.emitStatus("starting");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.setupRecorder(stream);
            console.log("STT Service: 本地语音采集已启动");
        } catch (error) {
            this.isEnabled = false;
            this.emitStatus("error");
            console.error("STT Service: 麦克风获取失败", error);
        }
    }

    private setupRecorder(stream: MediaStream): void {
        const recorderClass = (window as any).MediaRecorder;
        if (!recorderClass) {
            this.isEnabled = false;
            stream.getTracks().forEach(track => track.stop());
            this.emitStatus("error");
            return;
        }

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = -10;
        this.analyser.smoothingTimeConstant = 0.85;
        this.analyser.fftSize = 256;

        this.microphone = this.audioContext.createMediaStreamSource(stream);
        this.microphone.connect(this.analyser);

        this.mediaRecorder = new recorderClass(stream, { mimeType: 'audio/webm' });
        
        this.mediaRecorder.ondataavailable = (event: any) => {
            if (event.data && event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            if (this.audioChunks.length > 0 && this.isEnabled) {
                const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
                
                if (blob.size > 800) {
                    void this.sendAudioToBackend(blob, this.currentChunkStartedAt);
                }
            }
            this.audioChunks = [];
            
            if (this.isEnabled) {
                this.currentChunkStartedAt = Date.now();
                this.mediaRecorder?.start();
            }
        };

        this.currentChunkStartedAt = Date.now();
        this.mediaRecorder.start();
        this.emitStatus("listening");

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        this.checkInterval = window.setInterval(() => {
            if (!this.isEnabled || !this.analyser) return;

            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;

            const isCurrentlySpeaking = average > this.SILENCE_THRESHOLD;

            if (isCurrentlySpeaking) {
                this.isSpeaking = true;
                this.silenceStart = 0;
            } else {
                if (this.isSpeaking) {
                    if (this.silenceStart === 0) {
                        this.silenceStart = Date.now();
                    } else if (Date.now() - this.silenceStart > this.SILENCE_DURATION_MS) {
                        this.isSpeaking = false;
                        this.silenceStart = 0;
                        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
                            this.mediaRecorder.stop(); 
                        }
                    }
                }
            }

            if (this.isSpeaking && Date.now() - this.currentChunkStartedAt > this.MAX_RECORDING_MS) {
                if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
                    this.mediaRecorder.stop();
                }
            }
        }, 100);
    }

    private async sendAudioToBackend(blob: Blob, capturedAt: number): Promise<void> {
        if (!this.isEnabled) return;

        const formData = new FormData();
        formData.append("file", blob, "audio.webm");

        try {
            const response = await fetch("http://127.0.0.1:8001/transcribe", {
                method: "POST",
                credentials: "include",
                body: formData
            });

            if (!response.ok) throw new Error(`STT request failed with ${response.status}`);

            const data = await response.json();
            const text = data.text?.trim();
            const isJunk = !text || text.length <= 1 || /^\d+$/.test(text);

            if (!isJunk && this.onResultCallback) {
                this.onResultCallback({ text, capturedAt });
            }
        } catch (error) {
            console.warn("STT Service: 后端通信失败", error);
        }
    }

    public stop(): void {
        this.isEnabled = false;

        if (this.checkInterval) {
            window.clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        if (this.audioContext && this.audioContext.state !== "closed") {
            void this.audioContext.close();
        }
        if (this.microphone) {
            this.microphone.disconnect();
        }
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;

        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
            }
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentChunkStartedAt = 0;
        this.emitStatus("inactive");
        console.log("STT Service: 语音识别已停止");
    }

    private emitStatus(status: SpeechToTextStatus): void {
        this.onStatusChangeCallback?.(status);
    }
}