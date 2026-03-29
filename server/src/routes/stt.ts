import type { IncomingMessage, ServerResponse } from "http";
import { getSessionIdFromRequest } from "../auth/session";
import { readRequestBuffer } from "../http/body";
import { sendJson } from "../http/response";
import { ensureLocalSttWorker, proxySttTranscription } from "../services/sttWorker";
import { getSessionContext } from "../storage/memory/bootstrapStore";

export const handleSttHealthRoute = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    try {
        await ensureLocalSttWorker();
        sendJson(request, response, 200, { ok: true });
    } catch (error) {
        sendJson(request, response, 503, {
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const handleSttTranscribeRoute = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const sessionContext = getSessionContext(getSessionIdFromRequest(request));
    if (!sessionContext) {
        sendJson(request, response, 401, { error: "Authentication required" });
        return;
    }

    const contentType = request.headers["content-type"];
    if (typeof contentType !== "string" || !contentType.toLowerCase().includes("multipart/form-data")) {
        sendJson(request, response, 400, { error: "Expected multipart/form-data audio upload" });
        return;
    }

    try {
        const requestBody = await readRequestBuffer(request);
        const upstreamResponse = await proxySttTranscription(requestBody, contentType);
        response.statusCode = upstreamResponse.statusCode;
        response.setHeader("Content-Type", upstreamResponse.contentType);
        response.end(upstreamResponse.body);
    } catch (error) {
        sendJson(request, response, 503, {
            error: error instanceof Error ? error.message : "STT worker unavailable"
        });
    }
};