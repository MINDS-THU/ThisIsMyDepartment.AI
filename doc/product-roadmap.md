# Product Roadmap

This roadmap assumes the codebase stays close to its current architecture: a legacy TypeScript browser client, a small TypeScript backend, SQLite persistence, and backend-routed AI chat.

The goal is not to turn the project into a general AI platform. The goal is to make the existing virtual-space model clearly useful and easy to demo.

## Product Direction

Position the project as a **self-hostable virtual space with role-based AI helpers**.

Avoid leading with "AI clones of offline users". That feature is useful as a secondary workflow for async handoff, but it is not the strongest reason to adopt the project.

Lead instead with three ideas:

1. **Space matters** -- rooms, navigation, presence, and embedded tools are first-class.
2. **Roles matter** -- agents should represent a room, service, course, or project responsibility.
3. **Context matters** -- the system should remember enough room, activity, and knowledge context to produce useful replies.

## 6-Week Plan

### Week 1: Reposition the product and tighten the demo

Goals:

* Rewrite the public story around role-based AI spaces
* Ship a default demo flow that works without explanation
* Reduce emphasis on the offline stand-in feature in first-run UX and docs

Deliverables:

* Updated README and docs
* A default seeded environment with clearer room and agent roles
* A short demo script for maintainers and adopters

Suggested repo work:

* Update [README.md](../README.md)
* Expand built-in environment avatar defaults in [server/src/config/builtInEnvironmentAvatars.ts](../server/src/config/builtInEnvironmentAvatars.ts)
* Update first-run copy in [src/main/i18n.ts](../src/main/i18n.ts)

### Week 2: Turn environment avatars into real room helpers

Goals:

* Make built-in avatars correspond to recognizable room roles
* Add room descriptions and suggested prompts
* Ensure each seeded room has an obvious task to try

Deliverables:

* Concierge avatar
* Course or lab helper avatar
* Project room assistant avatar
* Embedded tool links or presentations for each role

Suggested repo work:

* Extend built-in avatar definitions in [server/src/config/builtInEnvironmentAvatars.ts](../server/src/config/builtInEnvironmentAvatars.ts)
* Improve room and overlay text in [src/main/ui/SceneNavigatorOverlay.ts](../src/main/ui/SceneNavigatorOverlay.ts)
* Seed or expose better embedded content entry points in frontend room setup files under [src/main](../src/main)

### Week 3: Add grounded knowledge per role or room

Goals:

* Stop relying only on freeform system prompts
* Let each agent answer from a bounded knowledge pack
* Keep the implementation light enough for the current backend

Deliverables:

* Per-agent or per-room knowledge source format
* Backend loading and prompt assembly for those sources
* Admin editing surface for that knowledge

Suggested repo work:

* Extend agent persistence in [server/src/storage/stateStore.ts](../server/src/storage/stateStore.ts)
* Update chat assembly in [server/src/routes/agent.ts](../server/src/routes/agent.ts)
* Add admin or settings UI near [src/main/ui/SettingsOverlay.ts](../src/main/ui/SettingsOverlay.ts)

### Week 4: Add simple actions, not just chat

Goals:

* Let agents do a few bounded, visible things inside the app
* Keep actions deterministic and auditable

Deliverables:

* Open an embedded tool or presentation
* Suggest the next room to visit
* Generate a short handoff note or summary
* Show recent relevant activity for a room or project

Suggested repo work:

* Extend agent response metadata in [server/src/services/agentChat.ts](../server/src/services/agentChat.ts)
* Handle agent actions in [src/main/ThisIsMyDepartmentApp.ts](../src/main/ThisIsMyDepartmentApp.ts)
* Log actions through existing activity flows under [server/src/storage/memory/activityStore.ts](../server/src/storage/memory/activityStore.ts)

### Week 5: Improve onboarding and admin configuration

Goals:

* Make the app useful in the first five minutes after install
* Let admins configure agents without code edits

Deliverables:

* Opinionated starter scenario
* Better seeded copy and example prompts
* Clear admin path for editing room helpers and demo content

Suggested repo work:

* Expand admin environment avatar controls in [server/src/routes/adminEnvironmentAvatar.ts](../server/src/routes/adminEnvironmentAvatar.ts)
* Improve frontend admin UX in [src/main/ui/SettingsOverlay.ts](../src/main/ui/SettingsOverlay.ts)
* Add scenario docs in [doc](.)

### Week 6: Add measurement and harden the loop

Goals:

* Learn which agents are actually useful
* Identify failure cases and dead-end demos
* Make future tuning evidence-based

Deliverables:

* Agent usage metrics
* Failure and escalation signals
* A review checklist for prompt and scenario quality

Suggested repo work:

* Extend activity types in [shared/types](../shared/types)
* Record richer agent interaction events in [server/src/routes/agent.ts](../server/src/routes/agent.ts)
* Build a basic internal dashboard from persisted activity records

## Demo Scenarios To Prioritize

Prioritize scenarios that are legible in under five minutes.

1. **Visitor concierge** -- where should I go, what is in this building, who should I talk to?
2. **Course office hours** -- explain a concept, point me to a syllabus or slide deck, tell me what to do next.
3. **Lab onboarding** -- where are the rules, what is the process, what tool should I open?
4. **Project war room** -- what changed, what is blocked, where is the dashboard, summarize the current state.

## Success Criteria

By the end of this roadmap, a fresh visitor should be able to answer these questions positively within a few minutes:

* Why is this better than a plain chatbot?
* Why does the spatial environment matter?
* What can an organization actually use it for next week?
* What happens in the product even when no one else is online?

If those answers are not obvious, the roadmap is incomplete even if the code is technically improved.
