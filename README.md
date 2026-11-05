<!-- Current systems: V0.3; earlier milestone notes below describe the prototype. -->
# DriftX / APEX — Drift Club

A low-poly browser racing and drifting game built with **Vite, Three.js, Rapier WASM and PeerJS**. Production: https://driftx-beta.vercel.app/

## V0.3 systems

The production controller now uses Rapier at 120 Hz. Garage → Performance includes engine swaps, turbo spool, LSD/welded differentials, 35°–65° angle kits, coilovers and separate aero/camber tuning. Start enables procedural Web Audio; optional licensed three-layer clips can be imported. Session Mode selects gymkhana and tandem practice.

See [VEHICLE-SYSTEMS.md](VEHICLE-SYSTEMS.md) for the four implementation deliverables and known networking limits, and [AUDIO-PIPELINE.md](AUDIO-PIPELINE.md) for audio search/import. Tandem is client-side practice; server-synced friend ghosts and authoritative battle rounds are not implemented.

## Run

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. For verification and a production build:

```sh
npm test
npm run build
npm run preview
```

Vercel deploys `main` using the Vite build and `dist/` output. The optional `/api/ice` route is a Vercel Node function; a plain Vite dev server falls back to PeerJS's bundled ICE configuration.

## Controls

- WASD / arrows: throttle, brake/reverse, steering.
- Space: rear handbrake. Tap to initiate a slide, then balance throttle and counter-steer.
- C: chase, close chase or hood camera.
- R: recover to the starting grid.
- Escape: pause/resume.
- Q / E: shift up/down when **Manual gearbox** is enabled in Garage → Performance.
- Performance Settings: Auto, High, Medium or Low graphics, frame-rate display and diagnostics.

Garage tuning and paint persist on this device. Time Attack records a session ghost and saves best times locally per car and track. Timing begins on the start-line crossing, with ordered checkpoints. Ghost recordings are not persisted after reload.

## The lineup

BMW M4 Competition (G82), Audi R8 V10 (4S), Lamborghini Huracán LP 610-4, Nissan Skyline GT-R R32, Nissan GT-R R35, Porsche 911 GT3 RS (992), Toyota Supra RZ Mk4 (A80), Mazda RX-7 Spirit R (FD), Chevrolet Corvette Stingray (C8), Ford Mustang GT (S550), Ferrari F40, and Mazda MX-5 (NA).

Models have individual proportions, lights, grilles, exhausts, aero, wheel sizes and wheelbases. RX-7, F40 and MX-5 have switchable pop-up headlights. `/lineup.html` compares all twelve in front/rear/side/orbit views. These are original, simplified unofficial interpretations; no manufacturer meshes or emblems are included. Complete models stay below 6,500 triangles.

## Driving system

The linked [DrivingGame](https://github.com/HidetakeTanaka/DrivingGame) is a Unity/C# WheelCollider project. The browser controller is an independent implementation of its high-level driving concepts, including Ackermann steering, RPM-based power delivery, automatic/manual gears, axle power distribution, braking and wheel-pose updates. No Unity code or assets were copied; see [DEBUGGING.md](DEBUGGING.md).

Cannon simulates four suspension rays and a chassis at a fixed 60 Hz. Forces are applied inside fixed steps, with interpolated chassis and wheel rendering at arbitrary display refresh rates. A dynamic rear-friction curve, handbrake, corrected counter-steer assistance, drag and downforce provide arcade drift handling. The chase camera follows horizontal heading and smooths position/FOV.

## Maps

- **Alpine Circuit:** hairpins, pine trees, mountains, guardrails and clipping markers.
- **Coastal Run:** island coastline, water, sand, palm trees and open sweepers.
- **Dockyard Drift Park:** wide pavement, an infield skidpad, cones, warehouses and cargo containers with collision boxes.

The current circuits are flat. Banked loops, jumps and a track editor are not implemented. Scenery is instanced, map resources are disposed on replacement, and static shadows/contact shadows keep rendering costs low. Auto quality adapts pixel ratio and shadow usage to the device. Rendering pauses in hidden tabs; menus and the lineup viewer render at a reduced rate.

## Friend rooms

Create a room and share its six-character code or invite URL. Guests wait for a confirmed data-channel handshake. The host assigns separate grid slots and broadcasts an atomic roster at 25 Hz, avoiding the old per-connection packet-loss bug. Remote cars use clock-offset-tolerant interpolation, bounded extrapolation and explicit reset snapping. Leaving removes every forwarded player. Keep the host tab open and refresh all clients after an update.

This is friendly, client-owned multiplayer: scores are self-reported, there is no host migration, and cars do not collide with each other. Automated tests exercise three-client relaying, full-room rejection, stale callback protection, leave cleanup and malformed packets. Internet connectivity still depends on usable ICE/TURN infrastructure; signaling success alone does not establish a playable connection.

### Dedicated TURN on Vercel

PeerJS's built-in STUN/TURN servers are preserved and TCP TURN candidates are added. Shared public infrastructure may be unavailable or blocked. Configure a dedicated provider for reliable cross-network joins.

Set these **server-side** environment variables in the Vercel project and redeploy:

- `METERED_DOMAIN`: your provider domain, such as `your-app.metered.live`.
- `METERED_API_KEY`: your private TURN API key.
- Alternatively, `TURN_ICE_SERVERS`: JSON containing provider-issued ICE servers and preferably short-lived client credentials.

`api/ice.js` fetches browser ICE credentials without returning the private provider API key. Do not prefix the API key with `VITE_`. `.env.example` contains placeholders only. No TURN account or subscription is created automatically. See the provider's [TURN documentation](https://www.metered.ca/docs/turn-server-service/quickstart/).

## Development milestones

1. **Renderer and track:** `src/track.js` builds a spline ribbon and a spatial index for road-distance/checkpoint queries, then instances each biome's scenery.
2. **Vehicle controller:** `src/physics.js` owns Cannon and fixed-step input/force application. `src/powertrain.js` owns Ackermann angles, engine curves and gear changes. +Y is up and local -Z is the car's nose.
3. **Drift and camera:** rear traction responds to slip and handbrake; assistance steers toward velocity. Physics-to-render rotation conversion explicitly handles Cannon/Three quaternion differences.
4. **Blender integration:** `src/cars.js` exports `loadModularGLTF(url)` using GLTFLoader. Export in metres with applied scale, nose -Z, glTF +Y up, and axle-centered wheel pivots. Prefix interchangeable nodes `Wing_`, `Bodykit_`, `Wheel_`, and `Exhaust_`.

```js
const asset = await loadModularGLTF('/models/my-car.glb');
asset.select('wings', 'Wing_track');
scene.add(asset.scene);
```

The current garage uses procedural meshes. The loader is a code integration point, not a file-import UI. Bind four wheel anchors to suspension transforms; place rim variants beneath those anchors.

## Validation

`npm test` covers geometry budgets and model heights, vehicle movement, brake/grip behavior, frame-rate-independent trajectories, finite render transforms, engine gearing, counter-steer direction, lap gates, networking lifecycle/interpolation, map spawns and TURN credential handling. See `DEBUGGING.md` for the audit and the real-browser verification limits.
