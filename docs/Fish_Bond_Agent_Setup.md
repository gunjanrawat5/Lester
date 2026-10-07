# Bond Fish Audio agent

The browser connects directly to the supplied public agent `e8434f5b6cc646c4b426c07d01ebfd72` using `AgentSession.start({agentId, microphone:false, ...})`. Fish owns both Bond's reasoning and voice. Typed orders and reviewed speech transcripts use `sendUserMessage(text, {audio:true})`; there is no parser or separate Bond TTS in the active command flow. Sound off mutes SDK output while retaining captions.

In the Fish console, keep Public access enabled. If restricting origins, allow `http://127.0.0.1:5174` and your eventual deployment origin. Bond's voice is the voice already selected on the agent; `FISH_BOND_VOICE_ID` is unnecessary for this flow. An API key is only needed for optional standalone Fish transcription ; the public guard also uses its configured voice without credentials.

## Configure movement

Add the **client** tool in [bond-client-tool.json](bond-client-tool.json) to this agent and publish the update. Tool arguments are flat strings. The `target` argument must be optional so STOP can omit it. Public sessions cannot override the agent's system prompt or add tool declarations from the browser, so this console configuration is necessary for actual movement, even if conversation already works.

Use this prompt alongside your Bond personality:

> You are James Bond in Operation Glasshouse. The user is Q. Speak concisely and stay in character. Explicit gameplay orders require exactly one bond_command call before confirming; use returned accepted/text as authoritative. Available types: MOVE with agent bond and target gallery (Main Hall), security (guard), vault, or entrance (extraction); STOP, CONTINUE, OPEN_VAULT, TAKE_RELIC with agent bond and no target; HACK_CAMERA with agent bond and target current, or a discovered camera_1 through camera_5. CONTINUE resumes the route interrupted by a camera. Hacking does not automatically resume movement; ask Q whether to continue. There are exactly two hacks, counted by the engine. Never hack an undiscovered camera or invent hacks. Current game state accompanies Q orders, exposing only discovered cameras. On ENGINE FIELD EVENT messages, do not call any tool: speak the supplied camera discovery report to Q, say you are holding position, ask what to do, and state the exact remaining hacks. The main goal is to reach security, let the player speak as you to persuade the guard for his keycard, use that card to open the vault down the hall, take the relic, then return to extraction. MOVE vault uses the card at the door automatically if owned but cannot enter without it. TAKE_RELIC can walk to the vault and collect once in range. OPEN_VAULT only works by the door with the card. Prose never grants resources. Questions and greetings need no tool. Do not claim unsupported actions or reveal undiscovered hazards.

## Runtime behavior

The engine validates each action, limits a submitted turn to one valid tool attempt, and blocks callbacks after a session closes. Agent prose never moves Bond. Movement remains constrained by existing waypoints and guard state. Switching to guard dialogue ends the Bond session; returning to Q reconnects on the next Send. Leaving the tab also closes it. Errors retain the editable order and confirmed engine actions remain in effect.

Voice input still follows hold → release → review → Send. Select Fish Audio transcription with `FISH_API_KEY`, or browser speech input without it. These input choices both feed the same Fish Bond agent; browser input is not a fallback reasoning agent.

## Connection check

The live check on October 7, 2026 returned HTTP 403, `Agent is not public`, for the supplied ID. After Public access and the origin were updated, the live recheck accepted the session (HTTP 201) and returned a Bond reply. The tested movement order did not produce a bond_command call, so no movement occurred. Ensure the tool and prompt are published. Browser integration was verified with a mocked SDK, including validated movement, rejected duplicate/stale calls, sound controls, and the guard role switch.

The agents have since been configured and published as version 2 using the authorized workspace key. Live verification confirmed Bond movement to security and the guard suspicion tool. `npm run setup:fish` provides a review, and `npm run setup:fish -- --apply` repeats the idempotent setup.
