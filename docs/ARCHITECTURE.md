# Architecture

SMK Studio is an Electron app with a React renderer. Almost everything interesting happens in the renderer, under `src/renderer/src`; the main process only opens the window, grants MIDI permission and reads or writes files.

```
SMK25 (USB / Bluetooth)
   │  Web MIDI
   ▼
controller/   midiAccess → parseMessage → router ──► Command[]
                                                     │
runtime/      executor ◄─────────────────────────────┘
                 │ noteOn / setParam / record ...
                 ├──► audio/      rack of Tone.js instruments
                 ├──► sequencer/  pure loop + quantization logic
                 └──► state/      project store (zustand, immutable)
                                     │
audio/        scheduler ◄────────────┘  reads the project every 1/16 and schedules notes
ui/           React components read the stores and send clicks through the same router
```

## Controller: a fixed profile instead of MIDI Learn

`controller/smk25Profile.ts` holds the SMK-25 V2 as captured from the real device: keys on channel 1 (notes 48–72), pads on channel 10 (notes 36–43), knobs on CC 20–27, transport buttons arriving as Mackie-style notes on a separate port. The quirks are part of the profile:

- The device exposes several ports. `detectPortRole` keeps the main port and the transport port, ignores the duplicate one and accepts the Bluetooth variant.
- Knobs 5–8 never send 0; their physical minimum is 1, so they're normalized against that floor.
- The pads only deliver velocities between roughly 30 and 75 even when hit hard. `controller/velocity.ts` stretches that range to 0..1 with a light curve and a floor, so a soft hit is never silent.

`parseMessage` turns raw bytes into typed `ControllerEvent`s, and `router` decides what an event means in the current context (which synth receives the keys, which drum track receives the pads, which track the knobs edit). The router returns plain `Command` objects and has no side effects, which makes it easy to test.

Clicks on the screen go through the same `dispatch` path as the hardware, so the mouse and the controller can't drift apart.

`midiAccess` reconnects automatically when the cable or Bluetooth comes and goes. Chromium returns the same port objects on every `requestMIDIAccess`, so each connection adds and removes only its own listener. If ports disappear while keys are held, every note is released, because the note-off will never arrive.

## State: two stores

- **Project store** (`state/store.ts`, zustand): tracks, takes, BPM, loop length, quantize grid. It's immutable; every change returns a new object. That keeps undo simple (a take is removed by slicing the array) and lets the scheduler cache derived data by reference.
- **Live store** (`state/liveStore.ts`): ephemeral hardware state used only to light up the screen (held keys, pressed pads, pressure, last touched knob, MIDI status). It never goes into the project file, and high-frequency updates here don't re-render the project views.

Project files are validated with zod on load (`state/project.ts`); a file from disk is never trusted.

## Recording and timing

The clock runs at 192 ticks per quarter note, matching Tone.js. `sequencer/loop.ts` is pure logic: a recording session collects note-on/note-off pairs, quantizes the start tick to the grid, wraps around the loop end and closes held notes when the take ends. Each pass becomes a `Take`; undo removes the last take.

`audio/scheduler.ts` runs every sixteenth note, reads the project, and schedules the notes falling inside that window with sample accuracy, along with the metronome. Two details matter here:

- `getTicksAtTime` returns fractional ticks (e.g. 192.0001). Without rounding, notes and clicks sitting exactly on the beat get skipped.
- A note you just played was already heard live. If quantization moves it slightly ahead of the playhead, the scheduler would play it again a few milliseconds later (a flam). `sequencer/skipOnce.ts` marks those events so the scheduler skips them exactly once.

One failing instrument reports an error and the remaining tracks keep playing.

## Audio

`audio/rack.ts` keeps one instrument per track and syncs it with the project on every store change.

- **Synth tracks:** a polyphonic `Tone.Synth` through a low-pass filter, a vibrato (mod wheel) and a reverb. The 8 knobs control waveform, cutoff, resonance, attack, decay, sustain, release and reverb.
- **Drum tracks:** eight voices built from `MembraneSynth`, `NoiseSynth`, `MetalSynth` and filters. The knobs control tuning, length, brightness, saturation, separate kick, snare and cymbal levels, and reverb. Pad pressure closes a filter over the whole kit.

`audio/params.ts` maps each knob's 0..1 value to its real unit (linear, exponential or stepped) and formats it for the screen.

Everything goes through a master limiter. WAV export (`audio/exporter.ts`) records the loop twice plus a reverb tail with `Tone.Recorder` (PCM inside WebM when supported), decodes it and writes a 16-bit WAV (`audio/wav.ts`). The transport is locked while exporting.

## Electron main process

`src/main/index.ts` keeps the renderer sandboxed (`contextIsolation`, `sandbox`, no Node integration) and exposes only three IPC calls through the preload: save project, open project, save WAV.

- Permissions are granted only for MIDI, and only to the app's own page.
- IPC calls from any other origin are rejected.
- Navigation and new windows are blocked.
- File sizes are capped (20 MB for projects, 500 MB for WAV), and file names are sanitized.

Autoplay is allowed so the instrument responds to the keyboard without a click first.

## Tests

117 unit tests (Vitest) cover the parts that don't need a sound card: message parsing, routing, velocity curves, the loop and quantization logic, the skip-once rule, the command executor (with a fake transport and rack), the stores, project validation, parameter mapping and WAV encoding.
