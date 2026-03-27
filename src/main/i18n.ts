import type { CurrentUserProfile } from "./types/currentUser";

export type AppLanguage = "en" | "zh";

export const DEFAULT_LANGUAGE: AppLanguage = "en";

const LANGUAGE_PREFERENCE_STORAGE_KEY = "timd.language";

const UI_FONT_STACKS: Record<AppLanguage, string> = {
    en: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
    zh: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Source Han Sans SC', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"
};

const CODE_FONT_STACKS: Record<AppLanguage, string> = {
    en: "'SFMono-Regular', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
    zh: "'SFMono-Regular', 'SF Mono', Consolas, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans Mono CJK SC', monospace"
};

const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
    en: {
        "common.close": "Close",
        "common.save": "Save",
        "common.cancel": "Cancel",
        "common.clear": "Clear",
        "common.default": "Default",
        "common.language": "Language",
        "language.option.en": "English",
        "language.option.zh": "Chinese",

        "settings.sidebarTitle": "Settings",
        "settings.sidebarSubtitle": "Manage media devices, language, avatar appearance, public role description, and AI-hosting behavior in one place.",
        "settings.tab.media": "Media",
        "settings.tab.language": "Language",
        "settings.tab.character": "Character",
        "settings.tab.aiHosting": "AI Hosting",
        "settings.tab.environment": "Environment Avatars",
        "settings.description.media": "Choose microphone, speaker, and camera devices using normal form controls.",
        "settings.description.language": "Choose the interface language used for prompts, labels, and app overlays.",
        "settings.description.character": "Update your appearance and the role description that other AI characters use to understand you.",
        "settings.description.aiHosting": "Define how your AI-hosted self should act, speak, and react to different people when the system represents you.",
        "settings.description.environment": "Admin-only editor for built-in environment avatar prompts, locations, and wandering boxes.",
        "settings.media.intro": "Turn on the microphone or camera here first. Device selectors stay hidden until the corresponding device is enabled, so the browser only asks for permission after an explicit user action.",
        "settings.media.loading": "Loading media devices...",
        "settings.media.refresh": "Refresh device list",
        "settings.media.loadFailed": "Media device loading failed.",
        "settings.media.noDevices": "No devices available",
        "settings.media.noAudioOutputSupport": "This browser does not support selecting speaker output devices.",
        "settings.media.toggle.on": "Turn On",
        "settings.media.toggle.off": "Turn Off",
        "settings.media.enabling": "Enabling {device}...",
        "settings.media.disabling": "Disabling {device}...",
        "settings.media.enabled": "{device} enabled.",
        "settings.media.disabled": "{device} disabled.",
        "settings.media.toggleFailed": "{device} toggle failed.",
        "settings.media.applying": "Applying {device}...",
        "settings.media.updated": "{device} updated.",
        "settings.media.updateFailed": "{device} update failed.",
        "settings.media.audioinput": "Microphone",
        "settings.media.audiooutput": "Speaker",
        "settings.media.videoinput": "Camera",
        "settings.media.hidden.audioinput": "Turn on the microphone to choose an input device.",
        "settings.media.hidden.videoinput": "Turn on the camera to choose a device.",
        "settings.media.helper.enable.audioinput": "Enable the microphone here before selecting a microphone device.",
        "settings.media.helper.enable.videoinput": "Enable the camera here before selecting a camera device.",
        "settings.media.helper.enabled": "You can now choose the {device} used for this room.",
        "settings.media.helper.audiooutput": "Speaker output support depends on the browser.",
        "settings.media.helper.audiooutputUnsupported": "Safari and some other browsers do not expose selectable speaker output devices. Audio still plays through the system output device.",
        "settings.media.helper.default": "Select the {device} used for this room.",
        "settings.language.intro": "Choose whether the interface uses English or Chinese. Changes apply immediately after saving.",
        "settings.language.label": "Interface language",
        "settings.language.helper": "This affects the settings UI, conversation overlays, interaction prompts, and localized iframe labels when available.",
        "settings.language.save": "Save language",
        "settings.language.saving": "Saving language...",
        "settings.language.saved": "Language updated.",
        "settings.language.failed": "Language update failed.",
        "settings.character.intro": "Pick a character appearance and maintain the public role description that other AI characters use when they interact with you or your AI-hosted avatar.",
        "settings.character.avatar": "Avatar {index}",
        "settings.character.save": "Save avatar",
        "settings.character.saving": "Saving avatar...",
        "settings.character.saved": "Avatar updated.",
        "settings.character.failed": "Avatar update failed.",
        "settings.character.identityTitle": "How other AI characters see you",
        "settings.character.identityHelp": "The fields below combine your confirmed account identity with optional extra context. Other AI characters use this description to decide how to address and treat you.",
        "settings.character.identityName": "Name",
        "settings.character.identityOrganization": "Organization",
        "settings.character.identityDepartment": "Department",
        "settings.character.identityRoles": "Roles",
        "settings.character.additionalDescription": "Additional role description",
        "settings.character.additionalDescriptionPlaceholder": "Add role details that are not already visible above, for example your research interests, working style, seniority, or how others should understand your position.",
        "settings.character.saveIdentity": "Save role description",
        "settings.character.savingIdentity": "Saving role description...",
        "settings.character.identitySaved": "Role description updated.",
        "settings.character.failedIdentity": "Role description update failed.",
        "settings.prompt.intro": "These settings define how your AI-hosted self should faithfully represent you, interpret the other side's role description, and react across continuing conversations.",
        "settings.prompt.enabled": "Allow others to summon my AI-hosted role",
        "settings.prompt.enabledHelp": "When disabled, other users will see your summon button as unavailable in the avatar directory.",
        "settings.prompt.coreIdentity": "Core identity",
        "settings.prompt.coreIdentityPlaceholder": "What kind of person are you, what matters to you, and what stable traits should always be preserved?",
        "settings.prompt.speakingStyle": "Speaking style",
        "settings.prompt.speakingStylePlaceholder": "Describe your tone, wording, preferred level of formality, pacing, and how directly you usually speak.",
        "settings.prompt.interactionGoals": "Interaction goals",
        "settings.prompt.interactionGoalsPlaceholder": "Describe what your AI-hosted self should usually optimize for in conversations, such as helping, coordinating, mentoring, or protecting time.",
        "settings.prompt.relationshipGuidance": "Relationship guidance",
        "settings.prompt.relationshipGuidancePlaceholder": "Explain how to adjust attitude and reaction based on the counterpart's role, relationship history, and context.",
        "settings.prompt.boundaries": "Boundaries",
        "settings.prompt.boundariesPlaceholder": "List what your AI-hosted self should avoid, what it must not claim, and how it should handle uncertainty or sensitive requests.",
        "settings.prompt.additionalInstructions": "Additional instructions",
        "settings.prompt.additionalInstructionsPlaceholder": "Anything else your AI-hosted self should remember when acting on your behalf.",
        "settings.prompt.clear": "Clear prompt",
        "settings.prompt.save": "Save AI hosting profile",
        "settings.prompt.saving": "Saving AI hosting profile...",
        "settings.prompt.saved": "AI hosting profile updated.",
        "settings.prompt.cleared": "AI hosting profile cleared.",
        "settings.prompt.failed": "AI hosting profile save failed.",
        "settings.environment.intro": "Edit the built-in environment avatars that spawn in the shared scene. Changes are saved to the backend character store and applied to the current scene immediately.",
        "settings.environment.adminRequired": "This tab is available only to signed-in users with the admin role.",
        "settings.environment.loading": "Loading environment avatars...",
        "settings.environment.failedLoad": "Environment avatar loading failed.",
        "settings.environment.empty": "No built-in environment avatars are configured.",
        "settings.environment.selector": "Editing avatar",
        "settings.environment.create": "New avatar",
        "settings.environment.creating": "Creating environment avatar...",
        "settings.environment.created": "Environment avatar created.",
        "settings.environment.failedCreate": "Environment avatar creation failed.",
        "settings.environment.newDisplayName": "New environment avatar",
        "settings.environment.agentId": "Agent ID",
        "settings.environment.displayName": "Display name",
        "settings.environment.spriteIndex": "Sprite index",
        "settings.environment.caption": "Caption",
        "settings.environment.prompt": "System prompt",
        "settings.environment.spawnByDefault": "Spawn automatically in scene",
        "settings.environment.positionX": "Position X",
        "settings.environment.positionY": "Position Y",
        "settings.environment.walkX": "Wander box X",
        "settings.environment.walkY": "Wander box Y",
        "settings.environment.walkWidth": "Wander box width",
        "settings.environment.walkHeight": "Wander box height",
        "settings.environment.placeAvatar": "Place avatar on map",
        "settings.environment.placeWalkArea": "Draw wander area on map",
        "settings.environment.cancelPlacement": "Cancel placement",
        "settings.environment.positionPlacementStarted": "Avatar placement mode active. Drag on the map and release to update the character position.",
        "settings.environment.walkPlacementStarted": "Wander area placement mode active. Drag on the map and release to update the rectangle.",
        "settings.environment.positionPlacementHelp": "Avatar placement mode is active. Drag on the map outside the settings panel, then release to commit the position. Press Esc or Cancel to stop.",
        "settings.environment.walkPlacementHelp": "Wander area placement mode is active. Drag on the map outside the settings panel to draw the box. The avatar position will update to the center of the area automatically. Press Esc or Cancel to stop.",
        "settings.environment.walkPlacementLegendCurrent": "Green = current area",
        "settings.environment.walkPlacementLegendPending": "Yellow = new area",
        "settings.environment.positionPlaced": "Avatar position saved.",
        "settings.environment.walkPlaced": "Wander area saved.",
        "settings.environment.placementCanceled": "Placement canceled.",
        "settings.environment.placementFailed": "Map placement failed.",
        "settings.environment.save": "Save avatar config",
        "settings.environment.saving": "Saving avatar configuration...",
        "settings.environment.saved": "Environment avatar updated.",
        "settings.environment.failedSave": "Environment avatar update failed.",
        "settings.environment.delete": "Delete avatar",
        "settings.environment.deleteConfirm": "Are you sure you want to delete \"{name}\"? This action cannot be undone.",
        "settings.environment.deleting": "Deleting environment avatar...",
        "settings.environment.deleted": "Environment avatar deleted.",
        "settings.environment.failedDelete": "Environment avatar deletion failed.",

        "conversation.mode.agent": "AI character",
        "conversation.mode.player": "Direct conversation",
        "conversation.title.default": "Conversation",
        "conversation.close": "Close",
        "conversation.empty": "No messages yet. Start the conversation here.",
        "conversation.sender.you": "You",
        "conversation.sender.ai": "AI",
        "conversation.placeholder.agent": "Ask {name} something...",
        "conversation.placeholder.player": "Message {name}...",
        "conversation.submit.send": "Send",
        "conversation.submit.waiting": "Waiting...",
        "conversation.status.default": "Enter to send. Shift+Enter for newline.",
        "conversation.status.replying": "{name} is replying...",
        "conversation.status.playerInactive": "Conversation is visible, but sending stays disabled until the live chat is active.",

        "interaction.hint.single": "Press {key} to {action}",
        "interaction.hint.multiple": "Press {key} to choose nearby interaction ({count})",
        "interaction.chooser.title": "{count} nearby interactions",
        "interaction.chooser.help": "Use W/S or arrow keys to choose. Press E or Enter to confirm. Press Q or Esc to cancel.",
        "interaction.action.chatWith": "chat with {name}",
        "interaction.action.open": "open {name}",
        "interaction.action.sit": "sit down",
        "interaction.action.start": "start {name}",
        "interaction.action.talkTo": "talk to {name}",
        "interaction.action.interactWith": "interact with {name}",
        "interaction.caption.open": "Press {key} to open",
        "interaction.subtitle.player": "Player",
        "interaction.subtitle.ai": "AI character",
        "interaction.subtitle.iframe": "Embedded page",
        "interaction.subtitle.chair": "Seat",
        "interaction.subtitle.presentation": "Presentation",
        "interaction.subtitle.tool": "Interactive tool",
        "interaction.subtitle.character": "Character",
        "interaction.subtitle.object": "Object",
        "presentation.controls.title": "Presentation Controls",
        "presentation.controls.subtitle": "Share your real screen, manage audience audio, and monitor who is currently watching.",
        "presentation.controls.share.start": "Start Screen Share",
        "presentation.controls.share.stop": "Stop Screen Share",
        "presentation.controls.muteAll": "Mute Audience",
        "presentation.controls.requestUnmuteAll": "Ask Audience to Unmute",
        "presentation.controls.audience": "Audience ({count})",
        "presentation.controls.audienceEmpty": "Nobody else is in the room yet.",
        "presentation.controls.audienceAudioMuted": "Mic muted",
        "presentation.controls.audienceAudioLive": "Mic live",
        "presentation.controls.audienceVideoMuted": "Cam off",
        "presentation.controls.audienceVideoLive": "Cam on",
        "presentation.controls.moderatorRequired": "Bulk muting requires moderator permissions in the current room.",
        "presentation.controls.status.ready": "Presenter controls are ready.",
        "presentation.controls.status.sharing": "Opening the browser screen-share picker...",
        "presentation.controls.status.muting": "Muting audience microphones...",
        "presentation.controls.notifications.mutedAudience": "Muted {count} audience members.",
        "presentation.controls.notifications.requestSent": "Sent an unmute request to {count} audience members.",
        "presentation.controls.notifications.requestedUnmute": "{name} asked the audience to unmute when ready.",
        "presentation.controls.errors.mediaUnavailable": "Live media controls are not ready yet.",
        "presentation.controls.errors.localJitsiDisabled": "Screen sharing is disabled on localhost until TIMD_JITSI_* is configured in the frontend runtime.",
        "presentation.controls.errors.jitsiInitTimeout": "Jitsi did not become ready in time. Check the configured Jitsi endpoint and browser console.",
        "presentation.controls.errors.jitsiInitFailed": "Jitsi initialization failed: {message}",
        "presentation.controls.errors.moderatorRequired": "You need moderator permissions to mute the audience.",
        "interaction.fallback.sharedPage": "shared page",
        "interaction.fallback.seat": "seat",
        "interaction.fallback.presentation": "presentation",
        "interaction.fallback.board": "board",
        "interaction.fallback.npc": "NPC",
        "interaction.fallback.object": "object",

        "status.chatsUsers": "Chats with Users",
        "status.chatsAi": "Chats with AI",
        "status.appUsage": "App Usage Time (min)",
        "status.role": "Role",
        "status.affiliation": "Affiliation",
        "status.userId": "User ID",
        "status.defaultAffiliation": "Unassigned",
        "status.defaultRole": "Member",
        "status.guest": "Guest",
        "status.unavailable": "Unavailable",
        "status.roomReady": "Room Ready",
        "status.joiningRoom": "Joining Room",
        "status.starting": "Starting",
        "status.action.character": "Character",
        "status.action.settings": "Settings",
        "status.action.settingsAlt": "Settings",
        "status.audio.on": "Mic On",
        "status.audio.off": "Mic Off",
        "status.video.on": "Cam On",
        "status.video.off": "Cam Off",

        "profile.avatarSaved": "Avatar updated.",
        "profile.promptSaved": "Character AI prompt saved.",
        "profile.promptCleared": "Character AI prompt cleared.",
        "profile.publicPersonaSaved": "Role description saved.",
        "profile.aiHostingSaved": "AI hosting profile saved.",
        "profile.aiHostingCleared": "AI hosting profile cleared.",

        "navigator.title": "Directory",
        "navigator.subtitle": "",
        "navigator.tab.rooms": "Rooms",
        "navigator.tab.avatars": "Avatars",
        "navigator.rooms.title": "Rooms",
        "navigator.rooms.subtitle": "Jump directly to a labeled room in the current scene.",
        "navigator.rooms.empty": "No named rooms were found in the current map.",
        "navigator.rooms.teleport": "Teleport",
        "navigator.rooms.teleported": "Teleported to {name}.",
        "navigator.rooms.locationHint": "Scene room",
        "navigator.avatars.title": "Avatar Directory",
        "navigator.avatars.subtitle": "Summon the AI avatar of an offline user.",
        "navigator.avatars.loading": "Loading...",
        "navigator.avatars.empty": "No saved user avatars are available yet.",
        "navigator.avatars.active": "Your active avatar: {name}",
        "navigator.avatars.noneActive": "You do not currently have an active summoned avatar.",
        "navigator.avatars.spawn": "Summon",
        "navigator.avatars.spawning": "Summoning...",
        "navigator.avatars.spawned": "Summoned {name} into the scene.",
        "navigator.avatars.spawnFailed": "AI character summon failed.",
        "navigator.avatars.spawnDisabled": "{name} has disabled AI hosting and cannot be summoned.",
        "navigator.avatars.spawnOnlineBlocked": "{name} is currently online and cannot be summoned as an AI character.",
        "navigator.avatars.unavailable": "No Avatar",
        "navigator.avatars.statusActive": "Summoned in room",
        "navigator.avatars.statusOnline": "Online",
        "navigator.avatars.statusHostingDisabled": "AI hosting disabled",
        "navigator.avatars.statusPromptConfigured": "Custom AI prompt",
        "navigator.avatars.group.summoned": "Summoned",
        "navigator.avatars.group.online": "Online",
        "navigator.avatars.group.offline": "Offline",
        "navigator.avatars.loadFailed": "User directory could not be loaded.",
        "navigator.avatars.caption": "Press E to chat",

        "iframe.paste.placeholder": "Paste code here",

        "device.fallback.audioinput": "Microphone {index}",
        "device.fallback.audiooutput": "Speaker {index}",
        "device.fallback.videoinput": "Camera {index}"
    },
    zh: {
        "common.close": "关闭",
        "common.save": "保存",
        "common.cancel": "取消",
        "common.clear": "清空",
        "common.default": "默认",
        "common.language": "语言",
        "language.option.en": "English",
        "language.option.zh": "中文",

        "settings.sidebarTitle": "设置",
        "settings.sidebarSubtitle": "在这里统一管理媒体设备、语言、角色外观、对外角色描述，以及 AI 托管行为。",
        "settings.tab.media": "媒体",
        "settings.tab.language": "语言",
        "settings.tab.character": "角色",
        "settings.tab.aiHosting": "AI 托管",
        "settings.tab.environment": "环境角色",
        "settings.description.media": "使用常规表单控件选择麦克风、扬声器和摄像头设备。",
        "settings.description.language": "选择界面使用英文还是中文，包括提示、标签和应用覆盖层。",
        "settings.description.character": "除了外观，还可以维护其他 AI 角色理解你时所依据的公开角色描述。",
        "settings.description.aiHosting": "定义当系统托管你的角色时，它应该如何扮演你、如何说话，以及面对不同对象时如何回应。",
        "settings.description.environment": "仅管理员可用，用于编辑内置环境角色的提示词、位置和活动范围。",
        "settings.media.intro": "请先在这里打开麦克风或摄像头。对应设备启用之前，设备选择器会保持隐藏，这样浏览器只会在用户明确操作后再请求权限。",
        "settings.media.loading": "正在加载媒体设备...",
        "settings.media.refresh": "刷新设备列表",
        "settings.media.loadFailed": "媒体设备加载失败。",
        "settings.media.noDevices": "没有可用设备",
        "settings.media.noAudioOutputSupport": "当前浏览器不支持选择扬声器输出设备。",
        "settings.media.toggle.on": "打开",
        "settings.media.toggle.off": "关闭",
        "settings.media.enabling": "正在启用{device}...",
        "settings.media.disabling": "正在关闭{device}...",
        "settings.media.enabled": "{device}已启用。",
        "settings.media.disabled": "{device}已关闭。",
        "settings.media.toggleFailed": "{device}切换失败。",
        "settings.media.applying": "正在应用{device}...",
        "settings.media.updated": "{device}已更新。",
        "settings.media.updateFailed": "{device}更新失败。",
        "settings.media.audioinput": "麦克风",
        "settings.media.audiooutput": "扬声器",
        "settings.media.videoinput": "摄像头",
        "settings.media.hidden.audioinput": "请先打开麦克风，再选择输入设备。",
        "settings.media.hidden.videoinput": "请先打开摄像头，再选择设备。",
        "settings.media.helper.enable.audioinput": "请先在这里启用麦克风，然后再选择麦克风设备。",
        "settings.media.helper.enable.videoinput": "请先在这里启用摄像头，然后再选择摄像头设备。",
        "settings.media.helper.enabled": "现在可以选择此房间使用的{device}。",
        "settings.media.helper.audiooutput": "扬声器输出是否可选取决于浏览器支持。",
        "settings.media.helper.audiooutputUnsupported": "Safari 和部分浏览器不会提供可切换的扬声器输出设备列表，音频仍会通过系统当前输出设备播放。",
        "settings.media.helper.default": "选择此房间使用的{device}。",
        "settings.language.intro": "选择界面使用英文还是中文。保存后会立即生效。",
        "settings.language.label": "界面语言",
        "settings.language.helper": "这会影响设置界面、对话窗口、交互提示，以及在可用时的 iframe 本地化标签。",
        "settings.language.save": "保存语言",
        "settings.language.saving": "正在保存语言...",
        "settings.language.saved": "语言已更新。",
        "settings.language.failed": "语言更新失败。",
        "settings.character.intro": "选择角色外观，并维护其他 AI 角色看到的你的公开角色描述。这些信息会影响他们如何称呼你、理解你，以及如何与你互动。",
        "settings.character.avatar": "角色 {index}",
        "settings.character.save": "保存外观",
        "settings.character.saving": "正在保存外观...",
        "settings.character.saved": "角色外观已更新。",
        "settings.character.failed": "角色外观更新失败。",
        "settings.character.identityTitle": "其他 AI 角色眼中的你",
        "settings.character.identityHelp": "下面的信息由已确认的账户身份和你补充的说明组成。其他 AI 角色会基于这些内容决定如何称呼你、理解你的身份，以及如何对待你。",
        "settings.character.identityName": "姓名",
        "settings.character.identityOrganization": "组织",
        "settings.character.identityDepartment": "部门",
        "settings.character.identityRoles": "角色",
        "settings.character.additionalDescription": "额外角色描述",
        "settings.character.additionalDescriptionPlaceholder": "补充上方未体现的角色信息，例如研究方向、工作风格、资历、职责边界，或你希望别人如何理解你的身份。",
        "settings.character.saveIdentity": "保存角色描述",
        "settings.character.savingIdentity": "正在保存角色描述...",
        "settings.character.identitySaved": "角色描述已更新。",
        "settings.character.failedIdentity": "角色描述更新失败。",
        "settings.prompt.intro": "这些设定会决定你的 AI 托管角色如何忠实扮演你，如何理解对方的角色描述，以及如何在连续对话中调整态度和回应。",
        "settings.prompt.enabled": "允许其他用户召唤我的 AI 托管角色",
        "settings.prompt.enabledHelp": "关闭后，其他用户会在角色目录中看到你的召唤按钮为不可点击状态。",
        "settings.prompt.coreIdentity": "核心身份",
        "settings.prompt.coreIdentityPlaceholder": "你是谁、你最重要的稳定特质是什么、哪些身份感必须被保留？",
        "settings.prompt.speakingStyle": "说话风格",
        "settings.prompt.speakingStylePlaceholder": "描述你的语气、措辞、正式程度、节奏，以及你通常有多直接。",
        "settings.prompt.interactionGoals": "互动目标",
        "settings.prompt.interactionGoalsPlaceholder": "描述你的 AI 托管角色在对话中通常优先追求什么，例如帮助、协调、指导、推进工作、保护时间等。",
        "settings.prompt.relationshipGuidance": "关系与态度指引",
        "settings.prompt.relationshipGuidancePlaceholder": "说明它应如何根据对方的角色、彼此关系、以及历史对话来调整态度、礼貌程度和反应方式。",
        "settings.prompt.boundaries": "边界与限制",
        "settings.prompt.boundariesPlaceholder": "列出不能越过的边界、不能擅自声称的事情，以及面对不确定或敏感请求时该如何处理。",
        "settings.prompt.additionalInstructions": "额外说明",
        "settings.prompt.additionalInstructionsPlaceholder": "补充任何在代表你行动时还需要长期记住的要求。",
        "settings.prompt.clear": "清空提示词",
        "settings.prompt.save": "保存 AI 托管设定",
        "settings.prompt.saving": "正在保存 AI 托管设定...",
        "settings.prompt.saved": "AI 托管设定已更新。",
        "settings.prompt.cleared": "AI 托管设定已清空。",
        "settings.prompt.failed": "AI 托管设定保存失败。",
        "settings.environment.intro": "在这里编辑会自动出现在共享场景中的内置环境角色。更改会保存到后端角色存储，并立即应用到当前场景。",
        "settings.environment.adminRequired": "只有具有 admin 角色的已登录用户才能使用此标签页。",
        "settings.environment.loading": "正在加载环境角色...",
        "settings.environment.failedLoad": "环境角色加载失败。",
        "settings.environment.empty": "当前没有配置内置环境角色。",
        "settings.environment.selector": "当前编辑角色",
        "settings.environment.create": "新建角色",
        "settings.environment.creating": "正在创建环境角色...",
        "settings.environment.created": "环境角色已创建。",
        "settings.environment.failedCreate": "环境角色创建失败。",
        "settings.environment.newDisplayName": "新环境角色",
        "settings.environment.agentId": "角色 ID",
        "settings.environment.displayName": "显示名称",
        "settings.environment.spriteIndex": "外观索引",
        "settings.environment.caption": "提示文本",
        "settings.environment.prompt": "系统提示词",
        "settings.environment.spawnByDefault": "进入场景时自动生成",
        "settings.environment.positionX": "位置 X",
        "settings.environment.positionY": "位置 Y",
        "settings.environment.walkX": "活动框 X",
        "settings.environment.walkY": "活动框 Y",
        "settings.environment.walkWidth": "活动框宽度",
        "settings.environment.walkHeight": "活动框高度",
        "settings.environment.placeAvatar": "在地图上放置角色",
        "settings.environment.placeWalkArea": "在地图上绘制活动范围",
        "settings.environment.cancelPlacement": "取消放置",
        "settings.environment.positionPlacementStarted": "角色放置模式已开启。请在地图上拖动并松开，以更新角色位置。",
        "settings.environment.walkPlacementStarted": "活动范围设置模式已开启。请在地图上拖动并松开，以更新矩形范围。",
        "settings.environment.positionPlacementHelp": "角色放置模式已开启。请在设置面板外的地图上拖动并松开以提交位置。按 Esc 或点击“取消放置”可退出。",
        "settings.environment.walkPlacementHelp": "活动范围设置模式已开启。请在设置面板外的地图上拖动以绘制范围矩形。角色位置会自动更新到范围中心。按 Esc 或点击“取消放置”可退出。",
        "settings.environment.walkPlacementLegendCurrent": "绿色 = 当前范围",
        "settings.environment.walkPlacementLegendPending": "黄色 = 新范围",
        "settings.environment.positionPlaced": "角色位置已保存。",
        "settings.environment.walkPlaced": "活动范围已保存。",
        "settings.environment.placementCanceled": "已取消放置。",
        "settings.environment.placementFailed": "地图放置失败。",
        "settings.environment.save": "保存角色配置",
        "settings.environment.saving": "正在保存角色配置...",
        "settings.environment.saved": "环境角色已更新。",
        "settings.environment.failedSave": "环境角色更新失败。",
        "settings.environment.delete": "删除角色",
        "settings.environment.deleteConfirm": "确定要删除 \"{name}\" 吗？此操作无法撤销。",
        "settings.environment.deleting": "正在删除环境角色...",
        "settings.environment.deleted": "环境角色已删除。",
        "settings.environment.failedDelete": "环境角色删除失败。",

        "conversation.mode.agent": "AI 角色",
        "conversation.mode.player": "直接对话",
        "conversation.title.default": "对话",
        "conversation.close": "关闭",
        "conversation.empty": "还没有消息，从这里开始对话。",
        "conversation.sender.you": "你",
        "conversation.sender.ai": "AI",
        "conversation.placeholder.agent": "向{name}提问...",
        "conversation.placeholder.player": "给{name}发送消息...",
        "conversation.submit.send": "发送",
        "conversation.submit.waiting": "等待中...",
        "conversation.status.default": "按 Enter 发送，Shift+Enter 换行。",
        "conversation.status.replying": "{name}正在回复...",
        "conversation.status.playerInactive": "对话窗口仍可见，但只有实时聊天处于激活状态时才能发送消息。",

        "interaction.hint.single": "按{key}键{action}",
        "interaction.hint.multiple": "按{key}键选择附近可交互对象（{count}）",
        "interaction.chooser.title": "附近有 {count} 个可交互对象",
        "interaction.chooser.help": "使用 W/S 或方向键选择，按 E 或 Enter 确认，按 Q 或 Esc 取消。",
        "interaction.action.chatWith": "与{name}聊天",
        "interaction.action.open": "打开{name}",
        "interaction.action.sit": "坐下",
        "interaction.action.start": "开始{name}",
        "interaction.action.talkTo": "与{name}交谈",
        "interaction.action.interactWith": "与{name}互动",
        "interaction.caption.open": "按{key}键打开",
        "interaction.subtitle.player": "其他用户",
        "interaction.subtitle.ai": "AI 角色",
        "interaction.subtitle.iframe": "嵌入页面",
        "interaction.subtitle.chair": "座位",
        "interaction.subtitle.presentation": "演示",
        "interaction.subtitle.tool": "互动工具",
        "interaction.subtitle.character": "角色",
        "interaction.subtitle.object": "对象",
        "presentation.controls.title": "演示控制",
        "presentation.controls.subtitle": "分享你的真实屏幕、统一管理观众音频，并查看当前观众名单。",
        "presentation.controls.share.start": "开始共享屏幕",
        "presentation.controls.share.stop": "停止共享屏幕",
        "presentation.controls.muteAll": "全部静音",
        "presentation.controls.requestUnmuteAll": "请求全部取消静音",
        "presentation.controls.audience": "当前观众（{count}）",
        "presentation.controls.audienceEmpty": "目前房间里还没有其他观众。",
        "presentation.controls.audienceAudioMuted": "麦克风已静音",
        "presentation.controls.audienceAudioLive": "麦克风开启",
        "presentation.controls.audienceVideoMuted": "摄像头关闭",
        "presentation.controls.audienceVideoLive": "摄像头开启",
        "presentation.controls.moderatorRequired": "批量静音需要当前房间的主持人权限。",
        "presentation.controls.status.ready": "演示控制已就绪。",
        "presentation.controls.status.sharing": "正在打开浏览器的屏幕共享选择器...",
        "presentation.controls.status.muting": "正在静音观众麦克风...",
        "presentation.controls.notifications.mutedAudience": "已静音 {count} 位观众。",
        "presentation.controls.notifications.requestSent": "已向 {count} 位观众发送取消静音请求。",
        "presentation.controls.notifications.requestedUnmute": "{name} 请求观众在准备好后取消静音。",
        "presentation.controls.errors.mediaUnavailable": "实时媒体控制尚未准备好。",
        "presentation.controls.errors.localJitsiDisabled": "当前在 localhost 下未配置 TIMD_JITSI_*，因此屏幕共享已禁用。",
        "presentation.controls.errors.jitsiInitTimeout": "Jitsi 在预期时间内没有准备好。请检查配置的 Jitsi 地址和浏览器控制台。",
        "presentation.controls.errors.jitsiInitFailed": "Jitsi 初始化失败：{message}",
        "presentation.controls.errors.moderatorRequired": "你需要主持人权限才能统一静音观众。",
        "interaction.fallback.sharedPage": "共享页面",
        "interaction.fallback.seat": "座位",
        "interaction.fallback.presentation": "演示",
        "interaction.fallback.board": "白板",
        "interaction.fallback.npc": "角色",
        "interaction.fallback.object": "对象",

        "status.chatsUsers": "与用户聊天次数",
        "status.chatsAi": "与 AI 聊天次数",
        "status.appUsage": "应用使用时长（分钟）",
        "status.role": "身份",
        "status.affiliation": "归属",
        "status.userId": "用户 ID",
        "status.defaultAffiliation": "未分配",
        "status.defaultRole": "成员",
        "status.guest": "访客",
        "status.unavailable": "不可用",
        "status.roomReady": "房间已就绪",
        "status.joiningRoom": "正在加入房间",
        "status.starting": "启动中",
        "status.action.character": "角色",
        "status.action.settings": "设置",
        "status.action.settingsAlt": "设置",
        "status.audio.on": "麦克风开",
        "status.audio.off": "麦克风关",
        "status.video.on": "摄像头开",
        "status.video.off": "摄像头关",

        "profile.avatarSaved": "角色外观已更新。",
        "profile.promptSaved": "角色 AI 提示词已保存。",
        "profile.promptCleared": "角色 AI 提示词已清空。",
        "profile.publicPersonaSaved": "角色描述已保存。",
        "profile.aiHostingSaved": "AI 托管设定已保存。",
        "profile.aiHostingCleared": "AI 托管设定已清空。",

        "navigator.title": "导航面板",
        "navigator.subtitle": "",
        "navigator.tab.rooms": "房间",
        "navigator.tab.avatars": "角色",
        "navigator.rooms.title": "房间列表",
        "navigator.rooms.subtitle": "直接跳转到当前场景里带标签的房间。",
        "navigator.rooms.empty": "当前地图里没有找到已命名房间。",
        "navigator.rooms.teleport": "传送",
        "navigator.rooms.teleported": "已传送到{name}。",
        "navigator.rooms.locationHint": "场景房间",
        "navigator.avatars.title": "角色目录",
        "navigator.avatars.subtitle": "召唤离线用户的 AI 角色。",
        "navigator.avatars.loading": "加载中...",
        "navigator.avatars.empty": "目前还没有可用的已保存角色。",
        "navigator.avatars.active": "你当前激活的角色：{name}",
        "navigator.avatars.noneActive": "你当前没有激活的已召唤角色。",
        "navigator.avatars.spawn": "召唤",
        "navigator.avatars.spawning": "召唤中...",
        "navigator.avatars.spawned": "已在场景中召唤{name}。",
        "navigator.avatars.spawnFailed": "AI 角色召唤失败。",
        "navigator.avatars.spawnDisabled": "{name} 已关闭 AI 托管，当前不能被召唤。",
        "navigator.avatars.spawnOnlineBlocked": "{name} 当前在线，不能召唤其 AI 角色。",
        "navigator.avatars.unavailable": "未设置角色",
        "navigator.avatars.statusActive": "当前已被召唤到房间中",
        "navigator.avatars.statusOnline": "在线",
        "navigator.avatars.statusHostingDisabled": "AI 托管已关闭",
        "navigator.avatars.statusPromptConfigured": "已配置自定义 AI 提示词",
        "navigator.avatars.group.summoned": "已召唤",
        "navigator.avatars.group.online": "在线",
        "navigator.avatars.group.offline": "离线",
        "navigator.avatars.loadFailed": "用户目录加载失败。",
        "navigator.avatars.caption": "按 E 键聊天",

        "iframe.paste.placeholder": "在此粘贴代码",

        "device.fallback.audioinput": "麦克风 {index}",
        "device.fallback.audiooutput": "扬声器 {index}",
        "device.fallback.videoinput": "摄像头 {index}"
    }
};

export const normalizeLanguage = (value: unknown): AppLanguage => {
    if (typeof value !== "string") {
        return DEFAULT_LANGUAGE;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh_hans" || normalized === "chinese") {
        return "zh";
    }
    return "en";
};

export const loadStoredLanguagePreference = (): AppLanguage | null => {
    try {
        const stored = window.localStorage?.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY);
        if (!stored) {
            return null;
        }
        return normalizeLanguage(stored);
    } catch (_error) {
        return null;
    }
};

export const storeLanguagePreference = (language: AppLanguage): void => {
    try {
        window.localStorage?.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, language);
    } catch (_error) {
        // Ignore storage failures so language switching still works for the current session.
    }
};

export const getLanguagePreference = (profile: CurrentUserProfile | null | undefined): AppLanguage => {
    const profilePreference = profile?.preferences?.language;
    if (typeof profilePreference === "string" && profilePreference.trim().length > 0) {
        return normalizeLanguage(profilePreference);
    }
    return loadStoredLanguagePreference() ?? DEFAULT_LANGUAGE;
};

export const translate = (language: AppLanguage, key: string, params?: Record<string, string | number>): string => {
    const template = TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key] ?? key;
    if (!params) {
        return template;
    }
    return Object.keys(params).reduce((result, parameterKey) => {
        return result.replace(new RegExp(`\\{${parameterKey}\\}`, "g"), String(params[parameterKey]));
    }, template);
};

export const getUiFontStack = (language: AppLanguage): string => UI_FONT_STACKS[language];

export const getCodeFontStack = (language: AppLanguage): string => CODE_FONT_STACKS[language];

export const getCanvasUiFontStack = (): string => "'SF Pro Text', 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";

export const applyLanguageToDocument = (language: AppLanguage): void => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.language = language;
    document.documentElement.style.setProperty("--timd-ui-font", getUiFontStack(language));
    document.documentElement.style.setProperty("--timd-code-font", getCodeFontStack(language));
};

const getOptionalStringProperty = (tiledObject: any, propertyName: string): string | undefined => {
    const property = tiledObject?.getOptionalProperty?.(propertyName, "string")?.getValue?.();
    if (typeof property !== "string") {
        return undefined;
    }
    const normalized = property.trim();
    return normalized.length > 0 ? normalized : undefined;
};

export const readLocalizedTiledText = (tiledObject: any, baseName: string, fallbackText = ""): Partial<Record<AppLanguage, string>> => {
    const english = getOptionalStringProperty(tiledObject, `${baseName}En`)
        ?? getOptionalStringProperty(tiledObject, `${baseName}_en`)
        ?? getOptionalStringProperty(tiledObject, `${baseName}EN`);
    const chinese = getOptionalStringProperty(tiledObject, `${baseName}Zh`)
        ?? getOptionalStringProperty(tiledObject, `${baseName}_zh`)
        ?? getOptionalStringProperty(tiledObject, `${baseName}CN`)
        ?? getOptionalStringProperty(tiledObject, `${baseName}ZhCn`);
    const generic = getOptionalStringProperty(tiledObject, baseName)
        ?? (typeof tiledObject?.getName?.() === "string" ? tiledObject.getName().trim() : "")
        ?? fallbackText;

    return {
        en: english ?? generic ?? fallbackText,
        zh: chinese ?? generic ?? fallbackText
    };
};

export const getLocalizedText = (language: AppLanguage, values: Partial<Record<AppLanguage, string>> | undefined, fallback = ""): string => {
    const value = values?.[language] ?? values?.en ?? values?.zh ?? fallback;
    return (value ?? fallback).trim();
};