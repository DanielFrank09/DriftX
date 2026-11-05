# APEX — Drift Club

A lightweight browser racing prototype built with **Vite + vanilla JavaScript + Three.js + Cannon-es + PeerJS**. Twelve original procedural cars take silhouette cues from recognizable Japanese, European, and American sports cars. Each profile has its own proportions, wheelbase, mass, lights, grille, aero, and exhaust details. The current shape pass adds lower hoods and cabins, faceted shoulder curves, tapered bumper corners, individual roof arcs, and model-specific tire diameters and rim ratios. No manufacturer models, emblems, or downloaded assets are included.

## Expanded lineup

The garage includes BMW M4 Competition (G82), Audi R8 (4S), Lamborghini Huracán LP 610-4, Nissan Skyline GT-R (R32), Nissan GT-R (R35), Porsche 911 GT3 RS (992), Toyota Supra RZ (A80), Mazda RX-7 Spirit R (FD3S), Chevrolet Corvette Stingray (C8), Ford Mustang GT (S550), Ferrari F40, and Mazda MX-5 (NA).

Open `/lineup.html` to compare every car from the front, rear, or an orbiting view. Each card links directly into the game with that car selected. In the garage, inspect the model with the Front / Rear / Side / Orbit buttons. RX-7, F40, and MX-5 have a functional pop-up headlight toggle. Model-specific aero replaces the previous universal wing.

These are simplified unofficial interpretations. Profile power figures describe representative variants, and handling parameters are arcade balancing values. Static pieces are batched by material; every complete car remains under 6,500 triangles, including optional aero, bodykit, and detailed wheels.

## Run locally

Requires Node.js 22.12+ or a supported newer release.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. To build a static release:

```sh
npm test
npm run build
npm run preview
```

`dist/` can be served by any static HTTPS host. Serve over HTTP/HTTPS; opening index.html directly from disk will not load ES modules correctly.

## Playing

- **WASD / arrows:** accelerate, brake/reverse, steer.
- **Space:** rear handbrake and drift initiation.
- **C:** chase, close chase, hood camera.
- **R:** return to the grid, restart the current lap attempt.
- **Escape:** pause/resume locally.
- **Garage:** select a car, paint, wing, bodykit, underglow, or live performance tuning. Settings persist on this device.
- **Time attack:** record a best-lap ghost in memory, replayed on subsequent laps in this session. Personal-best time persists locally per car/circuit; ghost recordings do not survive reloads.
- **Race your friends:** create a room and share its six-character code or URL. The host must stay connected. Invitees must have access to the hosting URL. A private Sites deployment is owner-only until its audience is explicitly changed.

## Milestone 1 — Base engine and test circuit

1. Vite loads `src/main.js`, which initializes the scene, renderer, lights, perspective camera, and HTML HUD.
2. `src/track.js` turns a closed Catmull-Rom spline into a flat road ribbon. The same sampled centerline drives the minimap, nearest-track calculation, and ordered quarter-lap checkpoints.
3. A static Cannon plane supplies tire contact. Off-road distance lowers grip. Road edges are visual and do not act as collision barriers.
4. The environment uses low-segment meshes, instanced trees and curbs, a capped pixel ratio, and bounded smoke/skid pools. No texture downloads are required for the cars or landscape.

The three current tracks are flat layouts. The modular next step is to replace segments with road tiles carrying matching static colliders. Banked corners, loops, jumps, and a track editor are not implemented in this milestone.

## Milestone 2 — Raycast vehicle and inputs

`src/physics.js` owns `CarPhysics`, the Cannon world, chassis body, and four suspension rays. The car faces **local -Z**, with +Y up and +X right.

1. Construct the chassis and `RaycastVehicle` with X/right, Y/up, Z/forward axis indices.
2. Add four wheels with local downward suspension rays and X axles.
3. Configure spring stiffness, compression/relaxation damping, rest length, radius, travel, and maximum suspension force on the wheel records.
4. Convert WASD state into throttle, steering, and handbrake inputs. Acceleration acts on the rear axle; AWD profiles also send a fraction to the front axle.
5. If the throttle opposes existing motion, brake first, then reverse. Engine force tapers near the configured top-speed cap.
6. Advance Cannon at 60 Hz with an elapsed-time accumulator and at most three substeps. Render the chassis and suspension wheel transforms afterward.

Important integration details: refresh the ground plane's AABB after rotating it. Preserve wheel contact flags around Cannon's render-transform update, which clears `isInContact`.

## Milestone 3 — Drift slip and camera

Transform world velocity into chassis space. `slipAngle()` computes:

```js
Math.atan2(localVelocity.x, Math.max(Math.abs(localVelocity.z), 2))
```

`tractionCurve()` progressively reduces rear lateral grip as slip rises. Space lowers rear grip further and adds a steering-directed yaw torque. Counter-steering assist adds bounded steering compensation and yaw damping. These are arcade tuning aids over raycast physics, rather than a full tire temperature or Pacejka simulation.

Speed-sensitive steering helps avoid instant spins. Wing-equipped cars get speed-dependent downforce. Front grip, rear grip bias, torque multiplier, suspension stiffness, ride height, and top-speed cap can be adjusted in the garage.

The camera uses exponential damping for position and look target, plus a velocity-dependent look offset, speed FOV, and drift-angle FOV. Smoke and instanced skid marks emit only from grounded rear tires while drifting.

## Milestone 4 — Modular Blender/glTF loader

`src/cars.js` exports `loadModularGLTF(url)` using the official Three.js GLTFLoader. It collects nodes by prefix and provides `select(category, nodeName)` for part visibility switching.

Prepare a Blender asset in meters with applied scale. Orient the exported glTF so the nose points -Z, the ground is Y=0, and the chassis pivot matches the physics body center. Use names like:

```text
Car
  Chassis
  Wing_stock
  Wing_track
  Bodykit_stock
  Bodykit_street
  Wheel_FL
  Wheel_FR
  Wheel_RL
  Wheel_RR
  Exhaust_stock
  Exhaust_dual
```

Export glTF Binary `.glb` with materials, using Blender's standard glTF +Y-up conversion. Keep the model under roughly 5,000 triangles and use a shared palette of flat materials. Place wheel pivots at their axle centers. Do not merge animated wheels into the chassis.

```js
import { loadModularGLTF } from './cars.js';
const asset = await loadModularGLTF('/models/my-car.glb');
asset.select('wings', 'Wing_track');
asset.select('bodykits', 'Bodykit_street');
scene.add(asset.scene);
```

The loader is an integration point; the current garage renders procedural cars and does not import files through the UI. For wheels, bind all four nodes to `vehicle.wheelInfos[i].worldTransform` rather than treating the four wheel positions as alternative rim sets. Rim variants should be nested under each wheel anchor. Connect the selected part's metadata to grip, width, or downforce when adding new variants.

## Multiplayer architecture

`src/network.js` uses PeerJS's public signaling service. A room host accepts up to seven peers and relays each guest's updates to the other guests. State broadcasts are capped at **25 Hz** and include position, quaternion, velocity, steering, wheel spin, drift state, score, lap, best time, car, circuit, and timestamp.

Received numeric fields are checked for shape, finite values, reasonable bounds, and quaternion normalization. Guest sender IDs come from the connection; guests cannot select the circuit. Remote rendering buffers received snapshots by local arrival time, interpolates 100 ms behind, and caps velocity extrapolation at 150 ms.

This is a friendly-room prototype with client-owned physics and self-reported scores, not an authoritative competitive service. It has no host migration, ranked results, shared countdown, car-to-car collisions, persistent rooms, or anti-cheat. The leaderboard lists laps, best times, and drift points; race gaps are not calculated. Public STUN/signaling does not guarantee connection through restrictive NATs. A production service needs a configured TURN relay or an authoritative WebSocket server.

## Current scope and next steps

Implemented: twelve distinct car silhouettes, three flat circuits, raycast driving, dynamic drift traction, two drive layouts, garage tuning, model-specific aero/bodykit toggles, paint, mint underbody panel, smoke, skid marks, three camera modes, checkpoint lap timing, per-car/circuit best time, session ghost, touch controls, invite rooms, snapshot interpolation, and standings.

Still to add from the larger brief: actual gearbox ratios/clutch model (the HUD gear is speed-based), contact-patch camber physics (camber currently affects parked wheel visuals), rim/exhaust swapping UI, livery decals, true emissive underglow, exhaust backfire, bloom/speed-line passes, banked/vertical track colliders, split timers, and authoritative racing. Post-processing is intentionally omitted from this first lightweight build.

## Source map and validation

| File | Responsibility |
|---|---|
| `src/main.js` | Session orchestration, DOM, rendering, camera, lap/ghost state, effects |
| `src/physics.js` | Raycast vehicle, inputs, tire slip, tuning |
| `src/catalog.js` | Twelve profiles, model features, shared network IDs, wheel anchors |
| `src/car-models.js` | Lights, trim, rounded tires, wheels, exhausts, batched geometry |
| `src/car-proportions.js` | Per-model heights, wheel sizes, axle offsets, canopy and fender parameters |
| `src/car-shapes.js` | Sculpted body sections, canopy lofts, aero shapes, bumper conformance |
| `src/cars.js` | Car exports and glTF modular-part loader |
| `src/lineup.js` | Front/rear/orbit comparison gallery at /lineup.html |
| `src/track.js` | Circuit spline, road geometry, terrain, trees, mountains |
| `src/network.js` | Room lifecycle, bounded message validation, host relay |
| `src/style.css` | Responsive overlay and garage styling |
| `tests/physics.test.js` | Suspension, acceleration/reverse, steering, grip response, malformed snapshots |

Primary references: [Cannon-es RaycastVehicle](https://pmndrs.github.io/cannon-es/docs/classes/RaycastVehicle.html), [Three.js glTF loading](https://threejs.org/manual/pages/loading-3d-models.html), [PeerJS documentation](https://peerjs.com/docs/).
