# Runtime and multiplayer audit — 2026-11-05

## Reproduced defects and fixes

- **Relayed updates were discarded:** a 20 ms receive limiter applied to a whole connection, so guests dropped other drivers' updates arriving behind the host's update. The host now sends one atomic roster snapshot at 25 Hz; per-player sequence numbers reject old data.
- **Joining appeared successful too early:** the old room API returned after connecting to signaling. Joining now awaits a versioned data-channel handshake, with retries, a real timeout, an eight-driver limit, and useful failure messages.
- **Old connections could close a new room:** connection handlers now carry a generation ID. Leaving clears every known remote driver and handshake timer. A disconnected host ends the room explicitly.
- **Handling depended on render FPS:** engine, steering, braking, and stabilization now run inside 60 Hz fixed steps. A trajectory regression test compares 30, 60, and 144 render FPS.
- **Counter-steer assist amplified the slide:** its sign was wrong for this car's -Z forward axis. It now steers toward the velocity while moving forward.
- **Invalid interpolation transforms:** during this update, browser testing exposed Three.js `slerp` receiving Cannon quaternions. Those objects use different field layouts. Explicit normalized scalar interpolation now keeps chassis, wheel, and camera transforms finite; regression tests cover all three frame rates.
- **Camera could follow chassis roll beneath the ground:** chase framing now uses horizontal heading, while the car itself retains physical pitch and roll.
- **Unnecessary rendering work:** static scenery is instanced, static shadows are refreshed only as needed, cars use soft contact shadows, the HUD is throttled, standing rows update only when changed, smoke uses a smaller bounded pool, and inactive pages skip rendering.
- **Map-change GPU resources:** instanced buffers, geometries, materials, and textures are disposed when switching maps. Persistent controls are normalized on load, modal input is isolated, touch state clears on pause, BFCache restores the network heartbeat, and WebGL context recovery is handled.
- **Lap timing started before the line:** timing now begins at the first start-line crossing and requires ordered quarter-lap checkpoints. Teleports invalidate an active attempt.

## Driving implementation

The linked [HidetakeTanaka/DrivingGame](https://github.com/HidetakeTanaka/DrivingGame) was reviewed at revision `1254f26a81a7a1aa16c9d1ad6f79230cbda3ed59` on its `CarEngineSound` branch. It is a Unity/C# WheelCollider project, not a browser library. No root source license was found. This update independently implements its high-level driving concepts: Ackermann steering, speed-sensitive steering, engine curves, RPM-based gears, automatic/manual shifting, axle power distribution, braking, and wheel-pose updates. No Unity code or assets were copied.

The game retains Three.js and Cannon-es. This is arcade handling, not a full road-car tire simulation. Dynamic audio, damage, and nitrous from the reference are outside this update.

## Maps and performance

- Alpine Circuit: guardrails, pine forests, low-poly mountains and clipping markers.
- Coastal Run: island coastline, water, sand, palm trees and faster sweepers.
- Dockyard Drift Park: wider pavement, an infield skidpad, cones, warehouses, cargo containers and static collision boxes.

Auto quality lowers resolution and disables shadows on slower devices. Medium/Low/High can also be selected in Performance Settings. Cars remain within the existing 6,500-triangle budget. A local browser sample with visible driving and active smoke measured about 96 FPS and 88 draw calls on the test machine; this is an observation, not a cross-device benchmark.

## Multiplayer verification and remaining dependency

Automated tests exercise three-client snapshot delivery, join failure, capacity, stale callbacks, leave cleanup, interpolation, clock offsets and reset snapping. The real-browser test reached PeerJS signaling and ICE negotiation but could not establish a transport using the shared PeerJS relay infrastructure in this network. Therefore internet multiplayer is **not yet verified end-to-end** here.

Built-in PeerJS ICE servers are preserved, and TCP relay candidates are added. `/api/ice` supports a dedicated relay provider on Vercel without exposing its API key. For reliable joins on restrictive networks, configure working TURN credentials or provide a room-relay backend. See README.md and `.env.example`. A public backend requires the owner's hosting approval; no account or paid service was created during this audit.

## V0.2.1 follow-up: visual instability

The user's open Sites preview was still V0.1; the Vercel deployment was V0.2. Both hosting targets are now updated from the same source.

- Chase-camera smoothing previously operated on world position, producing a speed-dependent following distance. The rig now transports with the interpolated chassis and damps only offset/rotation changes; explicit resets snap the rig.
- Hood view hides the enclosing local vehicle mesh and moves the eye forward, avoiding near-plane intersections with the roof/glass/body.
- Transparent skid boxes wrote depth and overlapped at identical height. They are now flat decals with depth writes disabled and polygon offset. Effects clear on reset/map changes.
- Alternating curb boxes overlapped at bend seams. Curbs now share exact spline endpoints without overlap; road paint has more vertical separation.
- Near-identical body profile stations are deduplicated to avoid sliver faces.
- Out-of-area recovery now warns and allows three seconds to return instead of abruptly teleporting the car at an invisible radius.

Validation: 25 automated tests pass, including camera distance through acceleration/braking/reversal at 30/60/144 FPS and all twelve cars under sustained forward input with uneven frame timing. Browser checks exercised forward drive, braking into reverse, chase/hood changes, map changes and drift decals. The latest physics did not reproduce spontaneous direction reversal; the older preview was confirmed stale. Multiplayer transport remains dependent on a configured working relay as documented above.
