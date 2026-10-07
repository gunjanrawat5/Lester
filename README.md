# Operation Glasshouse

You are Q. James Bond is the sole playable operative. During guard conversations, switch to speaking as Bond to persuade the guard AI to hand over the keycard.

## Setup

Node.js 22.12+ and npm are required. Run `npm ci`, copy `.env.example` to `.env` if you need a different server port, then run `npm run dev`.

Frontend: http://127.0.0.1:5173. Server health: http://127.0.0.1:3001/api/health.

`npm run typecheck` checks browser and server TypeScript. `npm run build` checks types and builds the browser into `dist/`. `npm run preview` previews that build; `npm run start:server` runs the API separately.

Installed stack: Phaser, Vite, TypeScript, Express, Zod (strict action/dialogue validation), Multer (audio uploads), dotenv, tsx, concurrently, and Node/Express/Multer types. Browser recording and audio playback use native APIs. Node's built-in fetch will support provider adapters once verified provider documentation and credentials are supplied.

Current scope: reference-inspired museum map preview with Main Hall floor text, a top-right Security Room, a bottom-right Vault and relic, entrance/extraction, room selection, lighting, character sprites, and five animated surveillance cameras (four Main Hall, one vault corridor). Cameras are all visible for this art preview, with red wall-clipped sectors. Discovery, camera disabling, and detection consequences are not enabled yet. Room geometry and initial waypoints are in `src/game/map.ts`. The game simulation, interpreter, guard persuasion, microphone controls, and provider adapters are not implemented yet. No provider credentials are required for this setup. Kenney CC0 character sprites are included; source and license details are in `public/assets/ASSET_CREDITS.md`.

The [revised design](docs/Voice_Heist_Agent_Design_Doc.md) preserves the four-room heist loop, two cameras and overrides, suspicion, alternate keycard paths, radio reinforcement, relic lockdown, and extraction. The original document is preserved alongside it for reference.
