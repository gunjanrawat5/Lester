# Operation Glasshouse

You are Q. James Bond is the sole playable operative. The museum map has a Main Hall, a top-right Security Room, a bottom-right Vault and relic, an extraction point, and three fixed cameras (two on the right wall of Main Hall and one in the vault corridor).

## Run

Use Node.js 22.12+ and npm. Run `npm ci`, then `npm run dev`.

- Frontend: http://127.0.0.1:5174
- API health/configuration: http://127.0.0.1:3001/api/health
- `npm test`: command validation and Fish adapter checks with mocked provider responses.
- `npm run build`: TypeScript checks and browser production build into `dist/`.
- `npm run preview`: browser build preview; keep `npm run start:server` running separately for API calls. Vite proxies `/api` on the standard server port 3001.

## Voice setup

Bond is the public Fish Audio agent `e8434f5b6cc646c4b426c07d01ebfd72`. **Send** connects directly using the official Web SDK; Fish supplies both reasoning and spoken replies, with captions and sound control. Bond uses the voice configured on that agent. No API key or separate Bond voice ID is required for text conversations.

Bond and the guard are now published with their gameplay client tools (Bond version 4, guard version 3). See [Bond prompt and exact tool declaration](docs/Fish_Bond_Agent_Setup.md). The browser can register handlers but cannot add tool definitions to a public agent. Without the tool, Bond can converse but his replies do not move the character.

For optional Fish speech transcription, set `FISH_API_KEY` in the ignored `.env` and restart `npm run dev`. Input uses the [Fish speech-to-text endpoint](https://docs.fish.audio/api-reference/endpoint/openapi-v1/speech-to-text), multipart audio, and `model: transcribe-1-pro`. Without a key, input defaults to **Browser speech · Demo fallback**, which may use the browser vendor’s online recognition service. Allow microphone access in a supported browser, or type directly. Both input providers send to the real Bond agent. The public Bond and guard sessions do not require an API key; never expose it in client code.

## Security guard conversation

Tell Bond to go to security. When he is stationary within range of the guard, select **Persuade guard**. The panel switches to **YOU ARE JAMES BOND**; all subsequent speech/text goes to the guard, rather than the Bond agent. Tap the mic to speak; finished voice turns send automatically. Typed commands use the separate text channel. Select **Return to Q** to resume giving orders.

The guard connects directly to public Fish agent `50a6c83da0584763bc7662f6908454a3`, using its configured voice. No API key or separate guard voice ID is needed. Allow `http://127.0.0.1:5174` and configure the `guard_reaction` client tool; see [guard setup](docs/Fish_Guard_Agent_Setup.md).

Suspicious tool-assessed turns add 40 to guard suspicion and to the shared alarm. Three distinct persuasive turns grant the keycard once. While a nearby guard is suspicious, the dialogue panel offers Knock down guard: this ends the session, adds 20 alarm, and recovers his keycard once. State persists when returning to Q. A connection error returns to Q without silently substituting a demo guard.

## Commands and controls

Tap the microphone to start speaking. Recording ends after the utterance and does not restart automatically. Use Mute to cancel capture. Browser speech finishes on its end-of-utterance event; Fish recording finishes after about 1.4 seconds of silence after speech. You can tap the mic to finish an utterance immediately. The resulting transcript automatically sends to the active Bond/guard agent and appears under YOU SAID. Voice never overwrites your typed draft. The separate text channel retains its Send button. Recordings are capped at 15 seconds. Muting the mic, leaving the tab, or window blur cancels capture. Blank/failed/cancelled transcripts execute nothing. Voice auto-send errors keep the transcript visible for manual retry.

Try:

- “Bond, go to the main hall.”
- “Could you head to security please?”
- “Bond, approach the vault.”
- “Return to extraction.” / “Get everyone out.”
- “Bond, stop.” / “Hold position.”
- “Bond, what are our options?”

Example chips fill the text box; **Send** submits it. Give one command at a time. If Bond is moving, stop him before changing destinations. He follows waypoint routes around the displays. Vault commands use the keycard at the door if owned and then enter; without it, Bond waits outside. Map clicks inspect rooms and do not move Bond.

## Current scope and validation

The playable mission is now: get the security guard’s keycard, use it at the vault door, collect the relic in the bottom-right room, and return to extraction. The vault route cannot enter without the card. “Get the relic” routes Bond through the unlocked doorway and collects it when he is physically in range; “go to the vault” stages him beside the relic and waits for a collection order.

Cameras start completely hidden. While moving, Bond discovers a camera within 110 logical pixels with line of sight, reveals its fixed red sector, stops his route, and reports through the Fish agent: a camera is present, what should he do, and how many hacks remain. Each camera triggers this interruption once. “Hack the camera” permanently disables the current discovered camera and consumes one of exactly two charges. Hacking alone does not resume the route: say “continue”, or choose another destination. “Continue” also lets you proceed without spending a hack. Entering an active wall-clipped camera sector adds 50 alarm once per continuous exposure. Two seconds outside the sector re-arms detection. Disabled cameras cannot detect. The segmented alarm HUD shares camera, guard (+40), and knockdown (+20) penalties; at 100 the mission is compromised and movement stops. Restart is available in voice settings.

Capture, transcription, agent turns, and the full guard conversation pause Bond and detection. Bond turns release the pause after his spoken response; guard dialogue pauses throughout. Requests are bounded (30 seconds for a Bond response, 15 seconds for server Fish calls, 18 seconds client-side for transcription); errors retain editable input and release the pause. Reply playback is canceled before recording. Requests are not automatically retried.

Checked: strict command schemas, supported/unsupported orders, Fish request headers/form bodies, speaker-marker cleanup, malformed/provider-error responses, typed movement and arrival, stop, automatic voice turns with a separate typed draft, microphone denial, MediaRecorder upload, and desktop/mobile layout. Browser speech and Fish responses were mocked for automated checks; live Fish transcription requires valid credentials; public Bond conversations require public access and movement requires the published client tool.

Guard tests also check proximity gates, repeated/stale reactions, capped suspicion, the alarm trigger, distinct persuasion turns, and one keycard transfer. Agent SDK browser checks use a mocked session; live guard behavior needs your published agent and its tool configuration.

Geometry and waypoints: `src/game/map.ts`. Camera settings: `src/game/securityCameras.ts`. Voice adapters: `server/fish.ts`. No art assets require payment; [asset credits](public/assets/ASSET_CREDITS.md) include the Kenney CC0 license.

The [revised design](docs/Voice_Heist_Agent_Design_Doc.md) describes the full intended game. The original document is preserved alongside it for reference.

## Agent configuration automation

One Fish workspace API key can manage both agents in that workspace. Keep it in the ignored `.env` as `FISH_API_KEY`. `npm run setup:fish` reviews the planned changes; `npm run setup:fish -- --apply` creates or reuses the client tools, preserves existing tool attachments and voice settings, adds gameplay instructions, verifies each configuration, and publishes both agents. Private configuration backups are written to a temporary directory before updates. Re-running the script reuses existing client tools and replaces its marked prompt section.

Live verification after publishing: Bond's MOVE tool drove him to security, the guard's suspicious reaction emitted the engine suspicion event, and returning to Q created a fresh Bond session.

Verified for this update: 12 unit tests; full mission browser flow with mocked Fish sessions (camera discovery/stop/report, two hacks, guard keycard, gated vault, relic removal, extraction, mobile layout).

The reference-inspired cyan comms panel includes a segmented alarm meter, override/keycard/relic status, mic orb, auto-sent transcript, character replies and history, separate text controls, mic/reply mute, and settings. Say “take the left route to security” to use the west-side waypoint path around the exhibit. Browser checks cover both browser-recognition and Fish-recording auto-send, cancellation, typed draft preservation, +20 camera detection, +40 guard suspicion, +20 mid-dialogue knockdown, static directions, and desktop/mobile layout.

Final checks for the UI/alarm update: 17 unit tests and production build passed; mocked browser checks covered browser/Fish auto-send, draft preservation, static sectors, +20 exposure, +40 guard suspicion, +20 knockdown, and responsive layout. Live Fish checks confirmed left routing, camera reporting/hacking, and guard suspicion/knockdown.

The two left-wall cameras have been removed. Camera discovery still pauses Bond without an alarm penalty; detection by an active camera now adds +50 per exposure. Guard suspicion remains +40 and guard knockdown +20.

The alarm reaching 100 stops gameplay and voice sessions and opens Game Over. Play Again resets the mission, alarm, keycard, relic, and two overrides. C02 is positioned at (510, 315), facing downward. Guard-triggered Game Over and restart were verified in Chrome with mocked voice sessions; all 17 tests and the production build pass.

Left-route orders also apply on the return trip: “Bond, return to extraction via the left route.” New movement orders can replace a route mid-walk. Routing starts from Bond’s physical position on the current segment, including after STOP or camera discovery, so continuing toward the same destination does not first revisit the previous waypoint.

Extracting with the relic opens Mission Complete with Play Again. A successful guard knockdown plays a pre-generated “Ahh!” clip in the configured Fish guard voice, once per knockdown, and respects reply mute. The clip is bundled locally so gameplay does not wait on a voice API request.
