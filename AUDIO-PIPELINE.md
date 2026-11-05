# Audio asset pipeline

The game runs standalone with procedural engine, tire, BOV, backfire and impact sounds. No sampled engine recordings are shipped or claimed to be licensed. Real engine quality depends on the recordings you import.

Sources verified for this build:

- [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds): CC0 UI sounds.
- [Freesound API](https://freesound.org/docs/api/): each sound has its own license. Search for CC0, or retain attribution for CC BY. API access needs your own key; downloads may require OAuth. A preview is not automatically a redistribution license.
- [Sonniss GameAudioGDC archives](https://sonniss.com/gameaudiogdc/): commercially usable media-production sounds under the archive's license. Keep the supplied license; do not bundle a multi-gigabyte archive into a browser build.

## Search and import

Set `FREESOUND_API_KEY` in your shell and run `node scripts/audio-assets.mjs search "car engine loop"`. The key is sent in an authorization header and never placed in a build or logged. The helper prints metadata and preview locations; review each source/license before downloading.

Trim seamless loops in an audio editor, remove DC offset, normalize to about -18 LUFS, retain headroom, and export mono Ogg or WAV. Use 800, 3500 and 7500 RPM loops from the same engine. Keep each clip below 8 MB; short mono loops typically need much less. Do not pitch a full recording across the entire RPM range.

Create a local catalog like this (paths point to files you have downloaded with the appropriate license):

```json
{
  "assets": [
    {"id":"i6_idle","file":"work/idle.ogg","creator":"Creator name","source":"https://freesound.org/people/creator/sounds/ID/","license":"CC0-1.0"},
    {"id":"i6_mid","file":"work/mid.ogg","creator":"Creator name","source":"https://freesound.org/people/creator/sounds/ID/","license":"CC0-1.0"},
    {"id":"i6_high","file":"work/high.ogg","creator":"Creator name","source":"https://freesound.org/people/creator/sounds/ID/","license":"CC0-1.0"}
  ],
  "profiles": {"i6":[{"id":"i6_idle","rpm":800},{"id":"i6_mid","rpm":3500},{"id":"i6_high","rpm":7500}]},
  "events": {}
}
```

Run `node scripts/audio-assets.mjs import work/audio-catalog.json`. It copies reviewed clips into `public/audio`, writes the runtime manifest and attribution, and rejects unsafe names and oversized clips. The next build loads these layers after the player's first start gesture; missing/invalid layers retain synthesis. Use profile keys `stock`, `i4`, `i6`, `v8` to match the component schema.

Audio events map `bov`, `pop`, `impact`, `checkpoint` and `ui` to imported clips; synthesis covers absent events. Browser autoplay policy requires a user gesture before audio starts. Master volume and mute are in Performance settings.
