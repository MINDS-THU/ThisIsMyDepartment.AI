import "./env";
import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { handleOptions, sendJson } from "./http/response";
import { getServerConfig } from "./config";
import { handleCreateActivityRoute, handleListActivitiesRoute } from "./routes/activity";
import { handleCreateAdminEnvironmentAvatarRoute, handleDeleteAdminEnvironmentAvatarRoute, handleListAdminEnvironmentAvatarsRoute, handleUpdateAdminEnvironmentAvatarRoute } from "./routes/adminEnvironmentAvatar";
import { handleChatWithAgentRoute, handleListAgentsRoute, handleListUsersRoute, handleSpawnAvatarAgentRoute } from "./routes/agent";
import { handleAuthStatusRoute, handleHandoffRoute, handleLoginPageRoute, handleLogoutRoute, handlePostMessageBridgeRoute, handleProxyLoginRoute } from "./routes/auth";
import { handleBootstrapRoute } from "./routes/bootstrap";
import { handleAppendConversationMessageRoute, handleGetConversationRoute } from "./routes/conversation";
import { handleGetCurrentUserRoute, handleUpdateProfileRoute } from "./routes/profile";
import { handleSttHealthRoute, handleSttTranscribeRoute } from "./routes/stt";
import { attachRealtimeServer } from "./services/realtimeServer";

const handleRequest = (request: IncomingMessage, response: ServerResponse): void => {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (method === "OPTIONS") {
        handleOptions(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/api/bootstrap") {
        handleBootstrapRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/auth/login") {
        handleLoginPageRoute(request, response);
        return;
    }

    if (method === "POST" && requestUrl.pathname === "/auth/handoff") {
        void handleHandoffRoute(request, response);
        return;
    }

    if (method === "POST" && requestUrl.pathname === "/auth/logout") {
        handleLogoutRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/auth/proxy-login") {
        handleProxyLoginRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/auth/postmessage-bridge") {
        handlePostMessageBridgeRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/auth/status") {
        handleAuthStatusRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/api/agents") {
        handleListAgentsRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/api/admin/environment-avatars") {
        handleListAdminEnvironmentAvatarsRoute(request, response);
        return;
    }

    if (method === "POST" && requestUrl.pathname === "/api/admin/environment-avatars") {
        void handleCreateAdminEnvironmentAvatarRoute(request, response);
        return;
    }

    const adminEnvironmentAvatarMatch = requestUrl.pathname.match(/^\/api\/admin\/environment-avatars\/([^/]+)$/);
    if (method === "PUT" && adminEnvironmentAvatarMatch) {
        void handleUpdateAdminEnvironmentAvatarRoute(request, response, decodeURIComponent(adminEnvironmentAvatarMatch[1]));
        return;
    }

    if (method === "DELETE" && adminEnvironmentAvatarMatch) {
        handleDeleteAdminEnvironmentAvatarRoute(request, response, decodeURIComponent(adminEnvironmentAvatarMatch[1]));
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/api/users") {
        handleListUsersRoute(request, response);
        return;
    }

    if (method === "POST" && requestUrl.pathname === "/api/avatar-agents/spawn") {
        void handleSpawnAvatarAgentRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/api/me") {
        handleGetCurrentUserRoute(request, response);
        return;
    }

    if (method === "PUT" && requestUrl.pathname === "/api/me/profile") {
        void handleUpdateProfileRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/api/stt/health") {
        void handleSttHealthRoute(request, response);
        return;
    }

    if (method === "POST" && requestUrl.pathname === "/api/stt/transcribe") {
        void handleSttTranscribeRoute(request, response);
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/api/activities") {
        handleListActivitiesRoute(request, requestUrl, response);
        return;
    }

    if (method === "POST" && requestUrl.pathname === "/api/activities") {
        void handleCreateActivityRoute(request, response);
        return;
    }

    const agentChatMatch = requestUrl.pathname.match(/^\/api\/agents\/([^/]+)\/chat$/);
    if (method === "POST" && agentChatMatch) {
        void handleChatWithAgentRoute(request, response, decodeURIComponent(agentChatMatch[1]));
        return;
    }

    const conversationMatch = requestUrl.pathname.match(/^\/api\/conversations\/(user|agent)\/([^/]+)$/);
    if (method === "GET" && conversationMatch) {
        handleGetConversationRoute(request, response, conversationMatch[1], decodeURIComponent(conversationMatch[2]), requestUrl);
        return;
    }

    const appendConversationMessageMatch = requestUrl.pathname.match(/^\/api\/conversations\/(user|agent)\/([^/]+)\/messages$/);
    if (method === "POST" && appendConversationMessageMatch) {
        void handleAppendConversationMessageRoute(request, response, appendConversationMessageMatch[1], decodeURIComponent(appendConversationMessageMatch[2]));
        return;
    }

    if (method === "GET" && requestUrl.pathname === "/health") {
        sendJson(request, response, 200, { ok: true });
        return;
    }

    sendJson(request, response, 404, {
        error: "Not Found",
        path: requestUrl.pathname
    });
};

const config = getServerConfig();
const server = createServer(handleRequest);
const realtimeServer = attachRealtimeServer(server);

const originalHandleRequest = handleRequest;
const handleRequestWithRooms = (request: IncomingMessage, response: ServerResponse): void => {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (method === "GET" && /^\/[A-Za-z0-9._-]+$/.test(requestUrl.pathname)) {
        const roomId = decodeURIComponent(requestUrl.pathname.slice(1));
        if (roomId && roomId !== "health") {
            sendJson(request, response, 200, realtimeServer.getRoomUsers(roomId));
            return;
        }
    }

    originalHandleRequest(request, response);
};

server.removeAllListeners("request");
server.on("request", handleRequestWithRooms);

server.listen(config.port, config.host, () => {
    console.log(`ThisIsMyDepartment.AI backend listening on http://${config.host}:${config.port}`);
});