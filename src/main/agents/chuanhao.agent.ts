import type { LLMAgentDefinition } from "./AgentDefinition";

const chuanhaoAgent: LLMAgentDefinition = {
    id: "ChuanhaoBot",
    agentId: "chuanhao-bot",
    displayName: "李传浩老师",
    spriteIndex: 4,
    position: { x: 548.67, y: 1085.67 },
    agentUrl: "http://127.0.0.1:5050/chat",
    caption: "按E键聊天",
    systemPrompt: "You are DemoBot, a cheerful virtual guide for a research factory simulation.",
    walkArea: { x: 548.67, y: 1085.67, width: 50, height: 50 }
};

export default chuanhaoAgent;
