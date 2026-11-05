# Vehicle dynamics, audio, builds and judging

The four requested implementation modules are integrated into V0.3, rather than supplied as disconnected snippets.

## 1. Rapier raycast controller

`src/rapier-vehicle.js` exports `initVehiclePhysics()` and `RapierCarPhysics`. Initialize WASM once before constructing a car. The production game uses this controller; `src/physics.js` retains the earlier Cannon controller for regression comparisons only.

```js
await initVehiclePhysics();
const physics = new RapierCarPhysics();
physics.configureCar(carDefinition);
physics.tune = { ...DEFAULT_TUNE, build: sanitizeBuild({ angle: 'drift', diff: 'welded' }) };
physics.reset({x: 0, z: 0}, 0);
physics.update(frameSeconds, { throttle: 1, steer: .4, handbrake: false });
physics.renderPose(carMesh.position, carMesh.quaternion);
```

Simulation runs at 120 Hz with up to 12 catch-up steps and interpolated rendering. Lengths use meters, velocity m/s, force newtons, torque N·m and angles radians. Each wheel casts along chassis suspension direction, excluding its chassis collider. Spring load is `max(0, k * (rest - length) - damping * contactVerticalSpeed)` with damping derived from corner mass and damping ratio. Suspension and tire forces act at contact points, creating chassis pitch and roll; anti-roll bars exchange axle loads. The controller includes CCD, chassis collision, per-wheel wheel speed, slip ratio, friction-circle force limits, boost lag, automatic/manual gears and bounded redline wheel speed.

`src/tire-model.js` implements a continuous brush-style envelope peaking at 8°, with kinetic falloff. Longitudinal wheel integration uses an implicit stiffness solve to remain stable at low speeds. This is a calibrated game model, not a measured Pacejka fit or a full mechanical steering-rack simulation. Counter-steer/caster behavior is approximated with steering relaxation and velocity alignment. Handbrake release lowers rear lateral resistance and adds a small initiation torque.

## 2. Sound manager

`src/audio.js` exports `AudioManager` and the equal-power `engineMix()` helper. `unlock()` must run from a user gesture. Three sample sources crossfade around idle, mid and redline; each source's playback rate follows its recorded RPM. If a profile has no clips, oscillators generate a cylinder-count-based firing tone through distortion and a load-controlled low-pass filter. Tire noise follows lateral contact velocity; BOV follows boost/throttle lift; pops/impacts are short noise envelopes. Backfire calls a visual callback to show an exhaust flame sprite. Opponents have distance-attenuated HRTF `PannerNode`s; the listener follows the camera.

```js
const audio = new AudioManager({onBackfire: id => showExhaustFlame(id)});
await audio.unlock(); // e.g. Start button click
await audio.loadProfile('i6', [
  {url:'/audio/idle.ogg', rpm:800},
  {url:'/audio/mid.ogg', rpm:3500},
  {url:'/audio/high.ogg', rpm:7500}
]);
audio.updateCar('local', {rpm:4200, redline:7800, cylinders:6,
  throttle:.8, boost:1.1, slipVelocity:4, active:true}, {profile:'i6'});
```

No sampled engine recordings are included by default. See `AUDIO-PIPELINE.md` and `scripts/audio-assets.mjs` for license-aware search/import. The shipped manifest is intentionally empty so synthesis works immediately. Real recording fidelity and perceived audio quality require listening on the player's audio device; output signal and browser activation were instrumented and verified.

## 3. Part schema and sharing

`src/parts.js`: `PARTS`, `sanitizeBuild`, `resolveBuild`, `encodeBuild`, `decodeBuild`.

| Component | Simulation changes |
| --- | --- |
| Stock / I4 / I6 / V8 | Power curve scale, redline, cylinder firing profile |
| None / street / large turbo | Maximum boost and spool time, torque, BOV eligibility |
| Open / 1.5-way / 2-way / welded | Differential axle speed coupling under acceleration/deceleration |
| Factory / sport / drift angle kit | 35° / 50° / 65° maximum low-speed steering |
| Coilovers | Spring stiffness, damping ratio, rest length and per-axle camber contact factor |
| Front / rear aero | Separate speed-squared downforce forces at the axles |

Garage → Performance exposes these controls. `#build=` links contain only validated component IDs and bounded numeric settings, and can coexist with `#room=`. No executable input is evaluated. Builds alter physics directly; optional body visuals remain separately switchable.

## 4. Tandem judge

`src/drift-judge.js` exports `newJudge()` and `judgeDrift(state, frame, dt)`.

```js
const result = judgeDrift(state, {
  slip:45*Math.PI/180, speed:25, grounded:true, inZone:true,
  clipDistance:1, role:'chase', collision:false, hitLead:false,
  lead:{doorDistance:.8, longitudinal:1, speed:24, headingDot:.98}
}, 1/60);
```

Maximum angle weight is 35–60°. Speeds under 8 m/s earn nothing. Clipping distance adds a bonus, matched heading/speed plus door proximity below 3m gives up to 3×, and collision/contact/spinout clears the current combo. Gymkhana has a 1.2-second angle-loss grace period and decaying multiplier. The dockyard includes donut poles, figure-eight containers, foam clipping blocks and a low jump ramp with matching Rapier colliders.

## Current networking limits

The integrated tandem modes are explicitly **practice scoring**. The judge is pure and can run on a future authoritative room service, but current browser/P2P scores are not cheat-proof. Opponent proximity uses the synchronized car's oriented door envelope, not a physics ray against authoritative remote colliders. The existing TURN/transport blocker remains; no new relay service or account was provisioned. Server-synced friend ghosts, round arbitration and authoritative competitive results are not implemented. Existing time-attack ghosts remain local.

## Validation

32 automated tests pass: all 12 Rapier cars settle and drive, variable render rates agree, tire force limits hold, handbrake can initiate high-angle drift, camera distance stays stable, builds sanitize/round-trip, and judging rejects low-speed/contact exploits. Browser checks verified WASM driving, turbo boost, build selection/link creation, gymkhana selection, audio activation and nonzero output signal. The larger Rapier compatibility/WASM chunk adds roughly 1.65 MB compressed to first load; it is cached separately from the game code. No rendering quality increase was added.
