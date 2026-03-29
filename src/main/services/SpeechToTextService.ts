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
    private recordingInterval: any;
    private currentChunkStartedAt = 0;
    private nextChunkCapturedAt?: number;

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
            console.error("浏览器不支持 MediaRecorder");
            return;
        }

        this.mediaRecorder = new recorderClass(stream);
        
        this.mediaRecorder.ondataavailable = (event: any) => {
            if (event.data && event.data.size > 0) {
                const capturedAt = this.nextChunkCapturedAt ?? this.currentChunkStartedAt;
                this.nextChunkCapturedAt = undefined;
                void this.sendAudioToBackend(event.data, capturedAt);
            }
        };

        this.mediaRecorder.start();
        this.currentChunkStartedAt = Date.now();
        this.emitStatus("listening");
        this.recordingInterval = setInterval(() => {
            if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
                this.nextChunkCapturedAt = this.currentChunkStartedAt;
                this.mediaRecorder.stop();
                this.mediaRecorder.start();
                this.currentChunkStartedAt = Date.now();
                this.emitStatus("listening");
            }
        }, 4000);
    }

    private async sendAudioToBackend(blob: Blob, capturedAt: number): Promise<void> {
        if (!this.isEnabled) {
            return;
        }
        const formData = new FormData();
        formData.append("file", blob, "audio.webm");
        this.emitStatus("transcribing");

        try {
            const response = await fetch("/api/stt/transcribe", {
                method: "POST",
                credentials: "include",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`STT request failed with ${response.status}`);
            }

            const data = await response.json();
            const text = data.text?.trim();

            if (text && this.onResultCallback) {
                this.onResultCallback({ text, capturedAt });
            }
            if (this.isEnabled) {
                this.emitStatus("listening");
            }
        } catch (error) {
            this.emitStatus("error");
            console.warn("STT Service: 后端通信失败，请检查应用后端日志中的 STT worker 状态", error);
        }
    }

    public stop(): void {
        this.isEnabled = false;
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
        }
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
        }
        this.mediaRecorder = null;
        this.currentChunkStartedAt = 0;
        this.nextChunkCapturedAt = undefined;
        this.emitStatus("inactive");
        console.log("STT Service: 语音识别已停止");
    }

    private emitStatus(status: SpeechToTextStatus): void {
        this.onStatusChangeCallback?.(status);
    }
}