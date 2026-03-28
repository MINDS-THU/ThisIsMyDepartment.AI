# Feature Spec

This document translates the product direction into engineering work that fits the current repository.

## Problem Statement

The project already has a strong base: a persistent virtual environment, identity-aware avatars, real-time presence, embedded tools, conversation storage, and backend-routed AI characters.

The current weakness is that the most visible AI story, offline user stand-ins, does not clearly explain why the product exists. The project becomes more useful and more credible when AI characters are attached to rooms, roles, and workflows.

## Product Thesis

ThisIsMyDepartment.AI should become a **self-hostable virtual workspace where place-aware AI characters help people navigate, learn, onboard, collaborate, and hand off work**.

## Goals

* Make the first-run experience communicate a concrete use case
* Make environment avatars more valuable than generic persona chat
* Add bounded context and actions so agents can help users do something visible
* Keep personal offline stand-ins as a secondary feature for async coverage

## Non-Goals

* Rebuilding the app into a full autonomous agent platform
* Adding arbitrary code execution by agents
* Solving horizontal scale or large-enterprise architecture in this phase
* Replacing the current 2D world metaphor with a generic chat dashboard

## Primary Personas

### Admin or maintainer

Needs a starter deployment that feels meaningful without code changes.

### Visitor or student

Needs obvious room-based guidance, not a blank world with generic AI chat.

### Team member or lab member

Needs persistent context, role helpers, and lightweight async handoff.

## Target Scenarios

1. **Concierge scenario** -- a new visitor asks where to go, what different rooms do, and which room contains a relevant tool or person.
2. **Office-hours scenario** -- a student asks a teaching avatar for help and gets explanation plus a pointer to embedded materials.
3. **Onboarding scenario** -- a new member walks room to room and receives bounded process guidance.
4. **Project-room scenario** -- a teammate enters a project room, gets the current state, opens the dashboard, and leaves a handoff note.

## Proposed Capabilities

### A. Role-based environment avatars

Deployment-owned AI characters should be the default seeded experience.

Requirements:

* Each avatar has a clear role, scope, and room association
* Each avatar has prompt text that explains what it can and cannot help with
* Each avatar has a visible reason to exist in its location

Likely files:

* [server/src/config/builtInEnvironmentAvatars.ts](../server/src/config/builtInEnvironmentAvatars.ts)
* [server/src/routes/adminEnvironmentAvatar.ts](../server/src/routes/adminEnvironmentAvatar.ts)
* [src/main/ui/SettingsOverlay.ts](../src/main/ui/SettingsOverlay.ts)

### B. Room and knowledge grounding

Agents need structured context beyond conversation history and recent activity.

Requirements:

* Attach a bounded knowledge pack to an environment avatar or room
* Include room description, responsibilities, FAQs, and resource links
* Assemble this context in backend prompt construction

Likely files:

* [server/src/routes/agent.ts](../server/src/routes/agent.ts)
* [server/src/services/agentChat.ts](../server/src/services/agentChat.ts)
* [server/src/storage/stateStore.ts](../server/src/storage/stateStore.ts)

### C. Lightweight in-world agent actions

Agents should be able to do a few app-native actions with explicit metadata.

Requirements:

* Open a configured iframe or presentation
* Suggest a room or navigation target
* Return a structured handoff summary
* Surface recent activity that is relevant to the current role

Likely files:

* [server/src/services/agentChat.ts](../server/src/services/agentChat.ts)
* [server/src/routes/agent.ts](../server/src/routes/agent.ts)
* [src/main/ThisIsMyDepartmentApp.ts](../src/main/ThisIsMyDepartmentApp.ts)

### D. Better first-run UX and demo copy

The first five minutes need to explain the product without a human presenter.

Requirements:

* Better seeded room names and prompts
* Better navigator labels and help text
* Sample questions or actions for each avatar
* Reduced emphasis on summoning offline users in the default flow

Likely files:

* [src/main/i18n.ts](../src/main/i18n.ts)
* [src/main/ui/SceneNavigatorOverlay.ts](../src/main/ui/SceneNavigatorOverlay.ts)
* [README.md](../README.md)

### E. Offline stand-ins as async handoff

Keep the feature, but narrow the promise.

Requirements:

* Present the feature as "leave a helpful stand-in while away"
* Preserve the owner's prompt and recent context
* Support handoff-note generation or later review by the real user

Likely files:

* [src/main/services/avatarDirectory.ts](../src/main/services/avatarDirectory.ts)
* [server/src/routes/agent.ts](../server/src/routes/agent.ts)
* [server/src/storage/memory/conversationStore.ts](../server/src/storage/memory/conversationStore.ts)

## Prioritized Engineering Backlog

### P0: Make the default demo legible

Outcome:

* A fresh install immediately shows why the product is useful.

Tasks:

1. Expand built-in environment avatars from generic teachers into a small role set with stronger prompts and clearer captions.
2. Update room and navigator copy so users understand what each space and avatar is for.
3. Add demo-oriented text to README and docs.

Acceptance criteria:

* A first-time user can identify at least three distinct AI roles without prior explanation.
* The project can be demoed in under five minutes without relying on the offline stand-in feature.

### P1: Add bounded knowledge for environment avatars

Outcome:

* Agents answer with more useful and repeatable context.

Tasks:

1. Define a simple persisted schema for room or avatar knowledge packs.
2. Load and merge knowledge packs in backend chat assembly.
3. Add admin editing support for those packs.

Acceptance criteria:

* An environment avatar can answer from room-specific knowledge that differs from another avatar in the same deployment.
* Admins can update that knowledge without editing TypeScript source.

### P1: Add structured agent actions

Outcome:

* Agents can do visible in-app work rather than only returning text.

Tasks:

1. Extend agent response metadata with optional action payloads.
2. Support open-iframe, open-presentation, and navigate-to-room actions.
3. Log those actions via the existing activity pipeline.

Acceptance criteria:

* At least one seeded avatar can open a relevant embedded tool from chat.
* The frontend handles unsupported actions safely.

### P2: Reframe offline stand-ins as handoff helpers

Outcome:

* The feature remains useful without being oversold.

Tasks:

1. Update copy across settings, avatar directory, and docs.
2. Add a simple handoff-note or summary workflow.
3. Record when a real user returns and reviews conversations left for their stand-in.

Acceptance criteria:

* Users understand the feature as async coverage, not a perfect AI replacement.
* Conversations with stand-ins produce a concise summary suitable for later human review.

### P2: Add usefulness metrics

Outcome:

* Prompt tuning and scenario design become evidence-based.

Tasks:

1. Track agent invocation counts, action counts, and failed answers.
2. Record explicit escalations to humans when supported.
3. Provide a lightweight internal summary view or exported report.

Acceptance criteria:

* Maintainers can identify which agents are used and where users get stuck.

## Implementation Notes For This Repo

### Backend

The backend already owns the right seams for this work:

* Agent request routing in [server/src/routes/agent.ts](../server/src/routes/agent.ts)
* LLM provider abstraction in [server/src/services/agentChat.ts](../server/src/services/agentChat.ts)
* Persistence in [server/src/storage/stateStore.ts](../server/src/storage/stateStore.ts)
* Activity logging in [server/src/storage/memory/activityStore.ts](../server/src/storage/memory/activityStore.ts)

The main missing pieces are richer context assembly, structured metadata, and admin-editable knowledge.

### Frontend

The frontend already has suitable control points:

* Main application orchestration in [src/main/ThisIsMyDepartmentApp.ts](../src/main/ThisIsMyDepartmentApp.ts)
* Admin and settings surfaces in [src/main/ui/SettingsOverlay.ts](../src/main/ui/SettingsOverlay.ts)
* Navigator presentation in [src/main/ui/SceneNavigatorOverlay.ts](../src/main/ui/SceneNavigatorOverlay.ts)
* Copy and labels in [src/main/i18n.ts](../src/main/i18n.ts)

The main missing pieces are clearer first-run cues and support for structured agent actions.

## Suggested Delivery Order

1. Documentation and seeded demo improvements
2. Stronger built-in environment avatars
3. Knowledge packs for room or role grounding
4. Structured in-world agent actions
5. Offline stand-in handoff refinements
6. Metrics and tuning loop

This order improves product clarity early while reusing the current architecture instead of fighting it.
