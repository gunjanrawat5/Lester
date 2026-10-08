# Operation Glasshouse

A voice-controlled stealth heist where you play **Q**, guiding **James Bond** through a museum to steal a relic and escape. Give Bond natural-language orders by voice or text, react to hidden security cameras, and switch into Bond’s role to persuade an AI security guard to hand over his keycard.

Bond and the guard are separate **Fish Audio conversational agents**, each with their own voice and role. The game validates their tool calls and controls movement, access, inventory, and alarm state. Talking about an action does not execute it: the agent must call a supported gameplay tool.

## The mission

1. Guide Bond through the Main Hall to the Security Room in the top-right corner.
2. Talk to the guard as Bond and persuade him to give you the keycard.
3. Reach the Vault in the bottom-right corner. The keycard is required to open it.
4. Collect the relic and return to the extraction point.

Extracting with the relic opens **Mission Complete**. Reaching **100 alarm** opens **Game Over**. Both screens offer **Play Again**, which resets the mission, inventory, alarm, and two camera hacks.

## Gameplay

### Give Bond orders

Tap the microphone, speak, and pause. The completed transcript sends automatically and appears under **YOU SAID**. Listening ends after each utterance and does not restart automatically. You can tap the microphone again to finish recording immediately.

Typed commands have a separate text box and **Send** button; voice input never overwrites your typed draft. Example chips fill the text box for review. Microphone mute and reply mute are separate controls.

Try commands such as:

- “Bond, go to security via the left side of the hall.”
- “Bond, stop.”
- “Hack the camera you just spotted.”
- “Continue to your previous destination.”
- “Get the relic from the vault.”
- “Return to extraction via the left route.”

Give one command at a time. New movement orders can replace an existing destination mid-walk. Routes start from Bond’s physical position on his current path segment, avoiding unnecessary trips back to the previous waypoint. The left path is the default; an explicit right-side request selects the right path. Left-route instructions work on outbound and return trips. Clicking the map inspects rooms rather than moving Bond.

### Handle cameras

Three static cameras remain: two on the right side of the Main Hall and one in the vault corridor. C02 faces downward. Cameras and their red sectors start hidden.

When Bond gets close enough to spot a camera with line of sight, he reveals it, stops, and asks Q what to do. **Discovery itself adds no alarm.** You have **two camera hacks** for the mission. A hack permanently disables a discovered camera; say “continue” afterward to resume the interrupted route. You can also continue without using a hack.

Entering an active camera’s sector adds **50 alarm** once per continuous exposure. Detection can trigger again after Bond has spent two seconds outside the sector. Disabled cameras cannot detect him.

### Talk to the guard

When Bond is stationary near the guard, select **Persuade guard**. The panel switches to **YOU ARE JAMES BOND**, and your voice or text goes directly to the guard agent. Select **Return to Q** to resume directing Bond.

Three distinct persuasive turns earn the keycard. Suspicious turns increase the guard’s suspicion and add **40 alarm**. Once the nearby guard becomes suspicious, **Knock down guard** becomes available during the conversation. It ends the encounter, recovers his keycard, and adds **20 alarm**. A short “Ahh!” clip in the guard’s configured Fish voice plays on knockdown and respects reply mute.

| Event | Alarm increase |
| --- | ---: |
| Bond discovers a camera | 0 |
| Active camera detects Bond | +50 |
| Guard finds a turn suspicious | +40 |
| Bond knocks down the guard | +20 |

Voice capture, transcription, agent responses, and guard conversations pause movement and camera detection. Cancelled or empty transcripts execute nothing. Connection errors show a status message and preserve typed input; requests are not automatically retried.

## Run locally

Use a recent Node.js release supported by Vite 8; this project has been developed with Node.js 26 and npm.

```sh
npm ci
cp .env.example .env
npm run dev
```

If `.env` already exists, keep your existing configuration instead of replacing it.

Open **http://127.0.0.1:5174**. The development command starts both Vite and the Express API. Vite forwards `/api` requests to port **3001**. API health is available at **http://127.0.0.1:3001/api/health**. Stop the development servers with **Ctrl+C**.

### Fish Audio configuration

The project connects to these public agents through the Fish Audio Web SDK:

| Character | Agent ID | Gameplay tool |
| --- | --- | --- |
| Bond | `e8434f5b6cc646c4b426c07d01ebfd72` | `bond_command` |
| Security guard | `50a6c83da0584763bc7662f6908454a3` | `guard_reaction` |

Both agents must have public access enabled, allow **http://127.0.0.1:5174**, and have their gameplay client tools configured and published. Public conversations use each agent’s configured voice and do not require a browser API key. These IDs refer to the configured project agents; to use your own, update the IDs in the dialogue modules and configure the corresponding tools.

For **Fish speech transcription**, set `FISH_API_KEY` in the local `.env`. Without it, input defaults to browser speech recognition where supported. Both transcription options send the resulting text to the same Fish conversational agents. Allow microphone access, or use typed commands.

Keep API keys server-side. Never commit `.env` or expose secrets through `VITE_` variables. The optional voice ID variables in `.env.example` support standalone server TTS; they are not required for the public agent conversations. The knockout sound is bundled locally and does not make an API request during play.

Agent setup details:

- [Bond prompt and client tool](docs/Fish_Bond_Agent_Setup.md)
- [Security guard prompt and client tool](docs/Fish_Guard_Agent_Setup.md)

For the configured agents, `npm run setup:fish` reviews planned configuration changes. **`npm run setup:fish -- --apply` updates and publishes both agents** using the workspace API key. The script preserves voice settings and existing tool attachments and saves private configuration backups to a temporary directory.

## Technology and structure

The frontend uses **Phaser** for the map and gameplay, **TypeScript** for game logic, and **Vite** for development and builds. **Express** handles server-side Fish transcription and optional voice endpoints. **Zod** validates gameplay actions and dialogue reactions. The communications panel includes a segmented alarm meter, inventory indicators, separate voice/text controls, and Bond, Security, and Q portraits.

| Location | Purpose |
| --- | --- |
| `src/game/MapScene.ts` | Movement, encounters, and mission integration |
| `src/game/map.ts` | Museum geometry and waypoint graph |
| `src/game/previewNavigation.ts` | Route selection and position-aware retargeting |
| `src/game/mission.ts` | Cameras, hacks, vault, relic, and alarm state |
| `src/game/guardInteraction.ts` | Persuasion, suspicion, keycard, and knockdown |
| `src/voice/` | Fish agent sessions, microphone capture, and playback |
| `src/ui/` | Communications panel, controls, and portraits |
| `server/` | API routes and Fish service adapters |
| `public/assets/` | Character sprites, portraits, and knockout audio |
| `tests/` | Action validation, provider adapters, and gameplay regression tests |

## Checks and builds

```sh
npm test            # Automated tests
npm run typecheck   # TypeScript checks
npm run build       # Typecheck and build the frontend into dist/
```

The current suite contains **20 tests**, covering strict actions, Fish adapters, guard proximity and duplicate reactions, persuasion and keycards, vault access, camera detection and hacks, shared alarm penalties, left-side return routes, and retargeting without unnecessary backtracking.

Browser checks have also exercised voice auto-send, separate typed drafts, mute cancellation, portraits, movement, knockdown audio events, and both end screens with replay resets. Automated voice checks use mocked provider sessions; live conversations depend on the Fish agents’ availability and configuration.

`npm run start:server` starts the API separately. `npm run preview` previews the built frontend; it does not start the API or configure a production deployment. A hosted deployment needs `/api` routing to the backend and its origin allowed on both Fish agents.

## Assets and design

Bond and guard map sprites come from **Kenney Top-down Shooter (CC0)**. Museum geometry and the tactical interface are drawn in code. Portraits were supplied for this project, and the guard knockout clip was generated using his configured Fish voice. See [asset credits](public/assets/ASSET_CREDITS.md) for the Kenney source and license.

The [revised design document](docs/Voice_Heist_Agent_Design_Doc.md) describes the broader intended game. The [original design](docs/Voice_Heist_Agent_Design_Doc.original.md) is preserved for reference; this README describes the currently implemented mission.
