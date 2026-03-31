import { request as httpRequest } from "http";
import { spawn, type ChildProcess } from "child_process";
import { createConnection } from "net";
import { dirname, resolve } from "path";

const STT_HOST = "127.0.0.1";
const STT_PORT = Number(process.env.TIMD_STT_PORT ?? "8001");
const STT_PYTHON_CANDIDATES = [
    process.env.TIMD_STT_PYTHON?.trim(),
    "python3",
    "python"
].filter((value): value is string => Boolean(value));
const STT_SCRIPT_PATH = resolve(process.cwd(), "scripts/stt_server.py");
const STT_SCRIPT_DIR = dirname(STT_SCRIPT_PATH);
const STT_START_TIMEOUT_MS = 30000;
const STT_POLL_INTERVAL_MS = 250;

let sttWorkerProcess: ChildProcess | null = null;
let sttWorkerStartPromise: Promise<void> | null = null;

const delay = (ms: number): Promise<void> => new Promise(resolve => {
    setTimeout(resolve, ms);
});

const isSttPortOpen = async (): Promise<boolean> => {
    return new Promise(resolve => {
        const socket = createConnection({ host: STT_HOST, port: STT_PORT });
        const finish = (open: boolean): void => {
            socket.removeAllListeners();
            socket.destroy();
            resolve(open);
        };

        socket.once("connect", () => finish(true));
        socket.once("error", () => finish(false));
        socket.setTimeout(300, () => finish(false));
    });
};

const waitForSttPort = async (timeoutMs: number): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await isSttPortOpen()) {
            return;
        }
        await delay(STT_POLL_INTERVAL_MS);
    }
    throw new Error(`Timed out waiting for local STT worker on ${STT_HOST}:${STT_PORT}`);
};

const attachSttWorkerLogging = (processRef: ChildProcess): void => {
    processRef.stdout?.on("data", chunk => {
        const text = String(chunk).trim();
        if (text) {
            console.log(`[stt] ${text}`);
        }
    });

    processRef.stderr?.on("data", chunk => {
        const text = String(chunk).trim();
        if (text) {
            console.warn(`[stt] ${text}`);
        }
    });

    processRef.once("exit", (code, signal) => {
        console.warn(`[stt] worker exited`, { code, signal });
        sttWorkerProcess = null;
    });
};

const spawnSttWorkerProcess = async (): Promise<ChildProcess> => {
    let lastError: Error | null = null;

    for (const pythonCommand of STT_PYTHON_CANDIDATES) {
        try {
            const child = await new Promise<ChildProcess>((resolveSpawn, rejectSpawn) => {
                const processRef = spawn(pythonCommand, [STT_SCRIPT_PATH], {
                    cwd: STT_SCRIPT_DIR,
                    env: {
                        ...process.env,
                        TIMD_STT_PORT: String(STT_PORT)
                    },
                    stdio: ["ignore", "pipe", "pipe"]
                });

                const handleError = (error: Error): void => {
                    processRef.removeListener("spawn", handleSpawn);
                    rejectSpawn(error);
                };
                const handleSpawn = (): void => {
                    processRef.removeListener("error", handleError);
                    resolveSpawn(processRef);
                };

                processRef.once("error", handleError);
                processRef.once("spawn", handleSpawn);
            });

            attachSttWorkerLogging(child);
            return child;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }

    throw lastError ?? new Error("Unable to launch local STT worker");
};

export const ensureLocalSttWorker = async (): Promise<void> => {
    if (await isSttPortOpen()) {
        return;
    }

    if (sttWorkerStartPromise) {
        return sttWorkerStartPromise;
    }

    sttWorkerStartPromise = (async () => {
        if (!sttWorkerProcess || sttWorkerProcess.exitCode !== null || sttWorkerProcess.killed) {
            sttWorkerProcess = await spawnSttWorkerProcess();
        }

        await waitForSttPort(STT_START_TIMEOUT_MS);
    })().finally(() => {
        sttWorkerStartPromise = null;
    });

    return sttWorkerStartPromise;
};

export const proxySttTranscription = async (body: Buffer, contentType: string): Promise<{ statusCode: number; body: string; contentType: string; }> => {
    await ensureLocalSttWorker();

    return new Promise((resolve, reject) => {
        const upstreamRequest = httpRequest({
            host: STT_HOST,
            port: STT_PORT,
            path: "/transcribe",
            method: "POST",
            headers: {
                "Content-Type": contentType,
                "Content-Length": String(body.length)
            }
        }, upstreamResponse => {
            const chunks: Buffer[] = [];
            upstreamResponse.on("data", chunk => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            upstreamResponse.on("end", () => {
                resolve({
                    statusCode: upstreamResponse.statusCode ?? 502,
                    body: Buffer.concat(chunks).toString("utf8"),
                    contentType: String(upstreamResponse.headers["content-type"] ?? "application/json; charset=utf-8")
                });
            });
        });

        upstreamRequest.on("error", reject);
        upstreamRequest.write(body);
        upstreamRequest.end();
    });
};