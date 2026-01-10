// ----------------------
// Music theory engine
// ----------------------
let totalDuration = Tone.Time("4m").toSeconds(); // default 4 bars
let lastProgressionSignature = "";
let droppedAudioPlayer = null;
let droppedAudioBuffer = null;
let droppedAudioGain = new Tone.Gain(1).toDestination();






const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function progressionSignature(prog) {
    return prog.map(ch => `${ch.name}${ch.quality}`).join("-");
}


function scaleMidiSet(scale) {
    const set = new Set();
    scale.forEach(note => {
        const idx = NOTES.indexOf(note); // 0–11
        set.add(idx);
    });
    return set;
}

const MAJOR_SCALE = [2,2,1,2,2,2,1];
const MINOR_SCALE = [2,1,2,2,1,2,2];

function buildScale(root, isMinor=false) {
    const pattern = isMinor ? MINOR_SCALE : MAJOR_SCALE;
    const start = NOTES.indexOf(root);
    let scale = [root];
    let idx = start;

    pattern.forEach(step => {
        idx = (idx + step) % NOTES.length;
        scale.push(NOTES[idx]);
    });

    return scale.slice(0,7);
}

function chordQuality(scale, index) {
    const root = NOTES.indexOf(scale[index]);
    const third = NOTES.indexOf(scale[(index+2)%7]);
    const fifth = NOTES.indexOf(scale[(index+4)%7]);

    const interval1 = (third - root + 12) % 12;
    const interval2 = (fifth - root + 12) % 12;

    if (interval1 === 3 && interval2 === 6) return "dim";
    if (interval1 === 3 && interval2 === 7) return "min";
    return "maj";
}

function buildTriads(scale, isMinor=false) {
    const chords = [];

    for (let i = 0; i < 7; i++) {
        const root = scale[i];
        const third = scale[(i+2)%7];
        const fifth = scale[(i+4)%7];

        const bass = root + "2";

        const triad = [
            bass,
            root + "4",
            third + "4",
            fifth + "4"
        ];

        const q = chordQuality(scale, i);

        chords.push({
            name: root,
            quality: q,
            notes: triad
        });
    }

    return chords;
}

function randomKey() {
    const root = NOTES[Math.floor(Math.random() * NOTES.length)];
    const isMinor = Math.random() < 0.5;
    return { root, isMinor };
}

function addEDMExtensions(chord) {
    const rootNote = chord.notes[1];
    const rootPitch = rootNote.slice(0, -1);
    const rootOct = rootNote.slice(-1);

    const scaleIndex = currentScale.indexOf(rootPitch);

    const sus2Pitch = currentScale[(scaleIndex + 1) % 7];
    const sus4Pitch = currentScale[(scaleIndex + 3) % 7];

    const sus2 = sus2Pitch + rootOct;
    const sus4 = sus4Pitch + rootOct;

    if (Math.random() < 0.5) {
        chord.notes[2] = sus2;
        chord.quality = "sus2";
    } else {
        chord.notes[2] = sus4;
        chord.quality = "sus4";
    }

    return chord;
}

function getSelectedKey() {
    const sel = document.getElementById("scaleSelector").value;

    if (sel === "random") {
        return randomKey(); // your existing random system
    }

    const [root, type] = sel.split(" ");
    const isMinor = type === "minor";

    return { root, isMinor };
}






function buildSusChords(scale, isMinor=false) {
    const chords = [];

    for (let i = 0; i < 7; i++) {
        const root = scale[i];
        const second = scale[(i + 1) % 7];
        const fourth = scale[(i + 3) % 7];
        const fifth = scale[(i + 4) % 7];

        const bass = root + "2";

        const sus2 = {
            name: root,
            quality: "sus2",
            notes: [
                bass,
                root + "4",
                second + "4",
                fifth + "4"
            ]
        };

        const sus4 = {
            name: root,
            quality: "sus4",
            notes: [
                bass,
                root + "4",
                fourth + "4",
                fifth + "4"
            ]
        };

        chords.push(sus2, sus4);
    }

    return chords;
}



// ----------------------
// Functional harmony
// ----------------------

const FUNCTIONAL_GROUPS = {
    tonic:    [0, 2, 3, 5],   // I, iii, IV, vi
    pre:      [1, 3, 5],      // ii, IV, vi
    dominant: [4, 6, 2]       // V, vii°, iii
};


function generateFunctionalProgression() {
    let progression;
    let signature;

    // Keep generating until it's different from the last one
    do {
        const { root, isMinor } = getSelectedKey();
        const scale = buildScale(root, isMinor);
        const chords = buildTriads(scale, isMinor);

        // Store globally for chord picker
        currentScale = scale;
        currentIsMinor = isMinor;

        function pick(group) {
            let candidates = group.map(i => chords[i]);
            candidates = candidates.filter(ch => ch.quality !== "dim");
            if (candidates.length === 0) return chords[group[0]];
            return candidates[Math.floor(Math.random() * candidates.length)];
        }

        const chordCount = document.getElementById("countToggle").checked ? 8 : 4;
        progression = [];

        for (let i = 0; i < chordCount; i++) {
            const group = i % 4 === 0 ? FUNCTIONAL_GROUPS.tonic :
                          i % 4 === 1 ? FUNCTIONAL_GROUPS.pre :
                          i % 4 === 2 ? FUNCTIONAL_GROUPS.dominant :
                                        FUNCTIONAL_GROUPS.tonic;

            progression.push({ ...pick(group) });
        }

        if (document.getElementById("modeToggle").checked) {
            progression = progression.map(ch => {
                if (Math.random() < 0.4) {
                    return addEDMExtensions({ ...ch });
                }
                return ch;
            });
        }

        signature = progressionSignature(progression);

    } while (signature === lastProgressionSignature);

    // Store signature so next generation is different
    lastProgressionSignature = signature;

    // Update global progression
    currentProgression = progression;

    updateProgressionDisplay();

    return {
        key: `${currentScale[0]} ${currentIsMinor ? "minor" : "major"}`,
        progression
    };
}



// ----------------------
// Drag & Drop
// ----------------------

let draggedIndex = null;

function handleDragStart(e) {
    const card = e.target.closest(".chord-card");
    draggedIndex = Number(card.dataset.index);
    card.classList.add("dragging");
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();

    const target = e.target.closest(".chord-card");
    if (!target) return;

    const targetIndex = Number(target.dataset.index);

    // Remove the dragged chord
    const [moved] = currentProgression.splice(draggedIndex, 1);

    // Insert it at the new index
    currentProgression.splice(targetIndex, 0, moved);

    // Update UI
    renderChords();
    drawPianoRoll();
    updateProgressionDisplay(); // <-- correct place
}



function renderChords() {
    chordContainer.innerHTML = "";

    currentProgression.forEach((ch, index) => {
        const div = document.createElement("div");
        div.className = "chord-card";
        div.draggable = true;
        div.dataset.index = index;

        div.innerHTML = `<div class="chord-name">${ch.name} ${ch.quality}</div>`;

        // Drag handlers
        div.addEventListener("dragstart", handleDragStart);
        div.addEventListener("dragover", handleDragOver);
        div.addEventListener("drop", handleDrop);
        div.addEventListener("dragend", () => div.classList.remove("dragging"));

        // CLICK HANDLER — now correctly inside the loop
        div.addEventListener("click", (e) => {
            e.stopPropagation();

            const picker = openChordPicker(index, currentScale, currentIsMinor);

            const rect = div.getBoundingClientRect();
            picker.style.left = rect.left + "px";
            picker.style.top = rect.bottom + "px";
        });

        chordContainer.appendChild(div);
    });
}


// ----------------------
// Piano roll
// ----------------------

function noteToMidi(note) {
    const pitch = note.slice(0, -1);
    const octave = parseInt(note.slice(-1), 10);
    return NOTES.indexOf(pitch) + (octave + 1) * 12;
}

// ----------------------
// Piano roll (FINAL)
// ----------------------

function drawPianoRoll() {

    if (!currentScale || !Array.isArray(currentScale) || currentScale.length === 0) {
    console.warn("drawPianoRoll skipped: currentScale is invalid", currentScale);
    return;
}
    
const canvas = document.getElementById("pianoRoll");
if (!canvas) {
    console.error("drawPianoRoll ERROR: canvas not found");
    return;
}

const ctx = canvas.getContext("2d");
if (!ctx) {
    console.error("drawPianoRoll ERROR: 2D context not available", canvas);
    return;
}

    canvas.width = canvas.clientWidth;
    canvas.style.height = "500px"; 
    canvas.height = 500;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentProgression.length) return;

    const patternName = document.getElementById("rhythmSelector").value;
    const rhythm = RHYTHM_SETS[patternName] || RHYTHM_SETS["none"];

    const scaleSet = new Set(currentScale.map(n => NOTES.indexOf(n)));

    const midiNotes = currentProgression.flatMap(ch => ch.notes.map(noteToMidi));
    const minMidi = Math.min(...midiNotes);
    const maxMidi = Math.max(...midiNotes);
    const range = maxMidi - minMidi + 1;

    const noteHeight = canvas.height / range;
    const REST_UNIT = 1;

    const totalUnits = currentProgression.reduce((sum, chord) => {
        return sum + rhythm.chords.reduce((inner, step) => {
            return inner + (step === 0 ? REST_UNIT : step);
        }, 0);
    }, 0);

    const unitWidth = canvas.width / totalUnits;

    // Background rows
    for (let i = 0; i < range; i++) {
        const midi = minMidi + i;
        const pitchClass = midi % 12;
        const y = canvas.height - (i + 1) * noteHeight;

        if (scaleSet.has(pitchClass)) {
            ctx.fillStyle = "rgba(0, 116, 201, 0.12)";
            ctx.fillRect(0, y, canvas.width, noteHeight);
        }

        ctx.strokeStyle = "#0a0f1c";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // -----------------------------
    // TIME GRID (vertical lines)
    // -----------------------------
    const totalBeats = 4 * 4; // 4 bars * 4 beats per bar
    const sixteenthCount = totalBeats * 4; // 16 sixteenths per bar * 4 bars

    for (let i = 0; i <= sixteenthCount; i++) {
        const x = (i / sixteenthCount) * canvas.width;

        // Quarter note line (every 4 sixteenths)
        if (i % 4 === 0) {
            ctx.strokeStyle = "#0a0f1c";
            ctx.lineWidth = 1.5;
        }
        // Sixteenth note line
        else {
            ctx.strokeStyle = "#0a0f1c83";
            ctx.lineWidth = 1;
        }

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // CHORDS (no bass)
    let cursor = 0;

    currentProgression.forEach(chord => {
        const chordNotes = chord.notes.slice(1);

        rhythm.chords.forEach(step => {
            const units = step === 0 ? REST_UNIT : step;
            const width = unitWidth * units;

            if (step > 0) {
                chordNotes.forEach(note => {
if (!note || typeof note !== "string" || !/\d$/.test(note)) {
    console.error("Invalid chord note:", note, chord);
}


                    const midi = noteToMidi(note);
                    const y = canvas.height - ((midi - minMidi + 1) * noteHeight);

                    ctx.fillStyle = "#0074C9";
                    ctx.fillRect(cursor + 2, y + 2, width - 4, noteHeight - 4);
                });
            }

            cursor += width;
        });
    });

    // BASS
    cursor = 0;

    currentProgression.forEach(chord => {
        const root = chord.notes[0];

        rhythm.bass.forEach(step => {
            const units = step === 0 ? REST_UNIT : step;
            const width = unitWidth * units;

            if (step > 0) {
if (!root || typeof root !== "string" || !/\d$/.test(root)) {
    console.error("Invalid bass note:", root, chord);
}

                const midi = noteToMidi(root);
                const y = canvas.height - ((midi - minMidi + 1) * noteHeight);

                ctx.fillStyle = "#00C97A";
                ctx.fillRect(cursor + 2, y + 2, width - 4, noteHeight - 4);
            }

            cursor += width;
        });
    });

    // Playhead
    if (isPlaying) {
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, canvas.height);
        ctx.stroke();
    }
}


// ----------------------
// Tone.js playback
// ----------------------

// Instrument gain (controlled by your slider)
const instrumentGain = new Tone.Gain(0.5).toDestination();

// Subtle reverb AFTER the gain
const reverb = new Tone.Reverb({
    decay: 2.5,
    wet: 0.15,
    preDelay: 0.02
}).connect(instrumentGain);

// ----------------------
// Piano Sampler
// ----------------------
const pianoSampler = new Tone.Sampler({
    urls: {
        "A3": "EscuderoM1Piano_A3.wav",
        "A5": "EscuderoM1Piano_A5.wav",
        "B2": "EscuderoM1Piano_B2.wav",
        "B4": "EscuderoM1Piano_B4.wav",
        "C2": "EscuderoM1Piano_C2.wav",
        "C4": "EscuderoM1Piano_C4.wav",
        "C6": "EscuderoM1Piano_C6.wav",
        "D3": "EscuderoM1Piano_D3.wav",
        "D5": "EscuderoM1Piano_D5.wav",
        "E3": "EscuderoM1Piano_E3.wav",
        "E4": "EscuderoM1Piano_E4.wav",
        "F3": "EscuderoM1Piano_F3.wav",
        "F5": "EscuderoM1Piano_F5.wav",
        "G2": "EscuderoM1Piano_G2.wav",
        "G4": "EscuderoM1Piano_G4.wav"
    },
    baseUrl: "DancePiano/",
    release: 0.3
}).connect(reverb);   // Sampler → Reverb → instrumentGain → Destination

// ----------------------
// Strings Sampler
// ----------------------
const stringsSampler = new Tone.Sampler({
    urls: {
        "C2":  "S_000_036_c1.wav",
        "F#2": "S_000_042_f#1.wav",
        "C3":  "S_000_048_c2.wav",
        "F#3": "S_000_054_f#2.wav",
        "C4":  "S_000_060_c3.wav",
        "F#4": "S_000_066_f#3.wav",
        "C5":  "S_000_072_c4.wav",
        "F#5": "S_000_078_f#4.wav",
        "C6":  "S_000_084_c5.wav"
    },
    baseUrl: "Strings/",
    release: 0.4
}).connect(reverb);   // Sampler → Reverb → instrumentGain → Destination

// ----------------------
// Instrument Registry
// ----------------------
const instruments = {
    piano: pianoSampler,
    strings: stringsSampler
};

// Default instrument
let currentInstrument = instruments.piano;

// ----------------------
// Instrument Selector
// ----------------------
document.getElementById("instrumentSelector").addEventListener("change", e => {
    currentInstrument = instruments[e.target.value];
});

// ----------------------
// Instrument Volume Slider
// ----------------------
const instrumentVolSlider = document.getElementById("instrumentVol");

instrumentVolSlider.addEventListener("input", () => {
    const v = Number(instrumentVolSlider.value);   // 0.0–1.0
    instrumentGain.gain.value = v;
});



// ----------------------
// Preview Audio (FINAL)
// ----------------------

// ----------------------
// Preview Audio (FINAL)
// ----------------------
async function previewAudio() {
    if (!currentProgression.length) return;

    await Tone.start();
    await currentInstrument.loaded;

    // Reset transport completely
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.ticks = 0;

    currentInstrument.releaseAll();

    const canvas = document.getElementById("pianoRoll");

    const patternName = document.getElementById("rhythmSelector").value;
    const rhythm = RHYTHM_SETS[patternName] || RHYTHM_SETS["none"];

    cursorX = 0;
    isPlaying = true;

    // --- VOCAL LEAD‑IN OFFSET (beats → seconds) ---
    const offsetBeats = Number(document.getElementById("vocalOffsetBeats").value || 0);
    const secondsPerBeat = 60 / Tone.Transport.bpm.value;
    const offsetSeconds = offsetBeats * secondsPerBeat;

    // Piano always respects lead‑in on FIRST pass.
    // Looping behavior will be handled by loopStart/loopEnd.
    const pianoDelay = offsetSeconds;

    // -----------------------------
    // UNIT → MUSICAL DURATION MAP
    // -----------------------------
    function unitToToneDuration(units) {
        switch (units) {
            case 1: return "16n"; // sixteenth
            case 2: return "8n";  // eighth
            case 4: return "4n";  // quarter
            case 8: return "2n";  // half
            case 16: return "1m"; // whole bar
            default: return "16n";
        }
    }

    // -----------------------------
    // AUDIO ENGINE (Transport time)
    // -----------------------------
    let transportTime = 0; // seconds

    // CHORDS (upper notes)
    currentProgression.forEach(chord => {
        const chordNotes = chord.notes.slice(1);

        rhythm.chords.forEach(step => {
            const units = step === 0 ? 1 : step;
            const dur = unitToToneDuration(units);
            const durSeconds = Tone.Time(dur).toSeconds();

            if (step > 0 && chordNotes.length) {
                Tone.Transport.schedule(time => {
                    chordNotes.forEach(n => {
                        currentInstrument.triggerAttackRelease(n, dur, time);
                    });
                }, transportTime + pianoDelay);
            }

            transportTime += durSeconds;
        });
    });

    // BASS (root only)
    let bassTime = 0;

    currentProgression.forEach(chord => {
        const root = chord.notes[0];

        rhythm.bass.forEach(step => {
            const units = step === 0 ? 1 : step;
            const dur = unitToToneDuration(units);
            const durSeconds = Tone.Time(dur).toSeconds();

            if (step > 0) {
                Tone.Transport.schedule(time => {
                    currentInstrument.triggerAttackRelease(root, dur, time);
                }, bassTime + pianoDelay);
            }

            bassTime += durSeconds;
        });
    });

    // Actual progression length (no lead‑in)
    const progressionDuration = Math.max(transportTime, bassTime);

    // Cursor should represent the progression only
    totalDuration = progressionDuration;

    // -----------------------------
    // CURSOR + LOOP ENGINE
    // -----------------------------
    function animateCursor() {
        if (!isPlaying) return;

        // Time since the progression "musically" started
        const raw = Tone.Transport.seconds - pianoDelay;
        const safeElapsed = Math.max(0, raw);

        // On loops, wrap within the progression duration
        const loopedElapsed = Tone.Transport.loop
            ? safeElapsed % progressionDuration
            : safeElapsed;

        cursorX = (loopedElapsed / progressionDuration) * canvas.width;
        drawPianoRoll();

        if (!Tone.Transport.loop && safeElapsed >= progressionDuration) {
            isPlaying = false;
            drawPianoRoll();
            return;
        }

        requestAnimationFrame(animateCursor);
    }

    // For the loop button: use progression length
    totalTicks = Tone.Time(progressionDuration).toTicks();

    // Configure Transport looping:
    // - If looping: first pass plays from 0 (includes lead‑in),
    //   then loops only the musical section [offsetSeconds, offsetSeconds + progressionDuration]
    if (isLooping) {
        Tone.Transport.loop = true;
        Tone.Transport.loopStart = offsetSeconds;
        Tone.Transport.loopEnd = offsetSeconds + progressionDuration;
    } else {
        Tone.Transport.loop = false;
    }

    const ctx = Tone.getContext().rawContext;
    const startTime = ctx.currentTime + 0.2; // small delay so everything is ready
    window._audioStartTime = startTime;


    // Vocal always starts immediately at playback start
    if (droppedAudioPlayer) {
        droppedAudioPlayer.start(startTime);
    }

    Tone.Transport.start(startTime);
    requestAnimationFrame(animateCursor);
    requestAnimationFrame(drawWaveform);

}


// ----------------------
// MIDI export (FINAL)
// ----------------------

function exportToMIDI() {
    if (!currentProgression.length) return;

    const patternName = document.getElementById("rhythmSelector").value;
    const rhythm = RHYTHM_SETS[patternName] || RHYTHM_SETS["none"];

    const chordTrack = new MidiWriter.Track();
    const bassTrack  = new MidiWriter.Track();

    const bpm = 120;
    chordTrack.setTempo(bpm);
    bassTrack.setTempo(bpm);

    const REST_UNIT = 1;

    function unitsToMidiDuration(units) {
        switch (units) {
            case 1: return "16"; // 1/16
            case 2: return "8";  // 1/8
            case 4: return "4";  // 1/4
            case 8: return "2";  // 1/2
            case 16: return "1"; // whole bar
            default: return "16";
        }
    }

    // -----------------------------
    // CHORD TRACK (your working logic)
    // -----------------------------
    currentProgression.forEach(chord => {
        const chordNotes = chord.notes.slice(1);
        let pendingRestUnits = 0;

        rhythm.chords.forEach(step => {
            const units = step === 0 ? REST_UNIT : step;

            if (step === 0) {
                pendingRestUnits += units;
            } else {
                if (chordNotes.length > 0) {
                    const duration = unitsToMidiDuration(units);
                    const eventData = {
                        pitch: chordNotes,
                        duration,
                        velocity: 100
                    };

                    if (pendingRestUnits > 0) {
                        eventData.wait = unitsToMidiDuration(pendingRestUnits);
                        pendingRestUnits = 0;
                    }

                    chordTrack.addEvent(new MidiWriter.NoteEvent(eventData));
                } else {
                    pendingRestUnits += units;
                }
            }
        });

        // we don't need to encode trailing silence for chords;
        // it's fine if the track just ends after the last chord hit
    });

    // -----------------------------
    // BASS TRACK (fixed: continuous timeline, no dummy events)
    // -----------------------------
    let bassPendingRestUnits = 0;

    currentProgression.forEach(chord => {
        const root = chord.notes[0];

        rhythm.bass.forEach(step => {
            const units = step === 0 ? REST_UNIT : step;

            if (step === 0) {
                // accumulate silence
                bassPendingRestUnits += units;
            } else {
                // real bass hit
                if (typeof root === "string" && root.length > 0) {
                    const duration = unitsToMidiDuration(units);
                    const eventData = {
                        pitch: [root],
                        duration,
                        velocity: 100
                    };

                    // apply any accumulated gap before this note
                    if (bassPendingRestUnits > 0) {
                        eventData.wait = unitsToMidiDuration(bassPendingRestUnits);
                        bassPendingRestUnits = 0;
                    }

                    bassTrack.addEvent(new MidiWriter.NoteEvent(eventData));
                } else {
                    // invalid root, treat as more rest
                    bassPendingRestUnits += units;
                }
            }
        });
    });

    // Note: we intentionally do NOT flush trailing bassPendingRestUnits.
    // Any final silence after the last bass note doesn't need to be encoded,
    // and skipping it avoids bar-by-bar drift.

    // -----------------------------
    // Filename
    // -----------------------------
    const progressionSymbols = currentProgression
        .map(ch => romanNumeralForChord(
            currentScale,
            currentIsMinor,
            ch.name,
            ch.quality
        ))
        .join(" ");

    const keyName = `${currentScale[0]} ${currentIsMinor ? "minor" : "major"}`;
    const fileName = `${keyName} - ${progressionSymbols}.mid`
        .replace(/\s+/g, "_")
        .replace(/[^\w\-_.]/g, "");

    const writer = new MidiWriter.Writer([chordTrack, bassTrack]);

    const a = document.createElement("a");
    a.href = writer.dataUri();
    a.download = fileName;
    a.click();
}



// ----------------------
// UI wiring
// ----------------------

let currentProgression = [];
let currentKey = "";
let currentScale = [];
let currentIsMinor = false;
let totalTicks = 0;
let isPlaying = false;


const chordContainer = document.getElementById("chordContainer");
const statusText = document.getElementById("statusText");

function generateProgression() {
    const result = generateFunctionalProgression();
    currentProgression = result.progression;
    currentKey = result.key;

    statusText.textContent = `Key: ${currentKey}`;
    renderChords();
    drawPianoRoll();
}

document.getElementById("generateBtn").onclick = generateProgression;
document.getElementById("exportBtn").onclick = exportToMIDI;

// Generate initial progression
generateProgression();

// ----------------------
// Chord Picker
// ----------------------

function openChordPicker(index, scale, isMinor) {
    // Remove any existing picker
    const existing = document.getElementById("chordPicker");
    if (existing) existing.remove();

    const picker = document.createElement("div");
    picker.id = "chordPicker";
    picker.style.position = "absolute";
    picker.style.background = "#0f172a";
    picker.style.border = "1px solid #1f2937";
    picker.style.borderRadius = "8px";
    picker.style.padding = "8px";
    picker.style.boxShadow = "0 0 12px rgba(0,116,201,0.4)";
    picker.style.zIndex = 9999;
    picker.style.minWidth = "140px";

    // Build all chord options
    const triads = buildTriads(scale, isMinor);
    const susChords = buildSusChords(scale, isMinor);

    const allChords = [...triads, ...susChords].sort((a, b) => {
    // Sort by root note first
    const rootA = a.name;
    const rootB = b.name;

    const indexA = NOTES.indexOf(rootA);
    const indexB = NOTES.indexOf(rootB);

    if (indexA !== indexB) return indexA - indexB;

    // If same root, sort by quality
    return a.quality.localeCompare(b.quality);
    });


    allChords.forEach((ch) => {
        const item = document.createElement("div");
        item.textContent = `${ch.name} ${ch.quality}`;
        item.style.padding = "6px 12px";
        item.style.cursor = "pointer";
        item.style.color = "#e5e7eb";
        item.style.whiteSpace = "nowrap";

        item.onmouseenter = () => item.style.background = "#1e293b";
        item.onmouseleave = () => item.style.background = "transparent";

        item.onclick = () => {
            currentProgression[index] = ch;
            picker.remove();
            renderChords();
            drawPianoRoll();
            updateProgressionDisplay(); // <-- correct place
        };


        picker.appendChild(item);
    });

    document.body.appendChild(picker);

    return picker;
}

document.addEventListener("click", () => {
    const picker = document.getElementById("chordPicker");
    if (picker) picker.remove();
});

document.getElementById("tempoSlider").addEventListener("input", e => {
    const bpm = parseInt(e.target.value, 10);
    Tone.Transport.bpm.value = bpm;
    document.getElementById("tempoValue").textContent = bpm + " BPM";
});

document.getElementById("playBtn").onclick = async () => {
    console.log("PLAY CLICKED");

    await Tone.start();
    await currentInstrument.loaded;
 // <-- REQUIRED

    previewAudio();
};

document.getElementById("rhythmSelector").addEventListener("change", () => {
    drawPianoRoll();

    if (isPlaying) {
        previewAudio();
    }
});


const stopBtn = document.getElementById("stopBtn");

stopBtn.onclick = () => {
    isPlaying = false;

    Tone.Transport.stop();
    window._audioStartTime = undefined;

    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.ticks = 0;

    if (droppedAudioPlayer) {
        droppedAudioPlayer.unsync();  // <-- FIX
        droppedAudioPlayer.stop();
    }

    currentInstrument.releaseAll();

    cursorX = 0;
    drawPianoRoll();
};



// ----------------------
// Loop Button
// ----------------------
const loopBtn = document.getElementById("loopBtn");
let isLooping = false;

loopBtn.onclick = () => {
    // Toggle internal loop state
    isLooping = !isLooping;

    // Update button UI
    loopBtn.classList.toggle("active", isLooping);

    // IMPORTANT:
    // Do NOT touch Tone.Transport.loop, loopStart, or loopEnd here.
    // previewAudio() will configure the Transport correctly
    // based on this isLooping flag.
};





function romanNumeralForChord(scale, isMinor, chordName, quality) {
    const degree = scale.indexOf(chordName); // 0–6

    if (degree === -1) return "?";

    const MAJ = ["I","II","III","IV","V","VI","VII"];
    const MIN = ["i","ii","iii","iv","v","vi","vii"];

    let base = isMinor ? MIN[degree] : MAJ[degree];

    // Adjust based on chord quality
    if (quality === "min") base = base.toLowerCase();
    if (quality === "dim") base = base.toLowerCase() + "°";
    if (quality === "sus2") base += "sus2";
    if (quality === "sus4") base += "sus4";

    return base;
}

function updateProgressionDisplay() {
    if (!currentProgression || !currentScale) return;

    const progressionSymbols = currentProgression
        .map(ch => romanNumeralForChord(currentScale, currentIsMinor, ch.name, ch.quality))
        .join(" ");

    document.getElementById("statusText").textContent =
        `Key: ${currentScale[0]} ${currentIsMinor ? "minor" : "major"}`;

    document.getElementById("progressionText").textContent =
        `Prog: ${progressionSymbols}`;
}

document.getElementById("instrumentSelector").addEventListener("change", e => {
    const choice = e.target.value;
    currentInstrument = instruments[choice];
});

const dropZone = document.getElementById("waveformDropZone");


// Highlight on dragover
dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", e => {
    dropZone.classList.remove("dragover");
});


dropZone.addEventListener("drop", async e => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("dragover");

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const filename = file.name;

    // Auto BPM
    const bpm = extractBPM(filename);
    if (bpm) {
        Tone.Transport.bpm.value = bpm;
        document.getElementById("tempoSlider").value = bpm;
        document.getElementById("tempoValue").textContent = bpm + " BPM";
    }

    // Auto Key
    const detectedKey = extractKey(filename);
    if (detectedKey) {
        document.getElementById("scaleSelector").value = detectedKey;

        const [root, quality] = detectedKey.split(" ");
        currentScale = buildScale(root, quality === "minor");
        currentIsMinor = quality === "minor";

        // ⭐ REGENERATE PROGRESSION HERE
        generateProgression();
        updateProgressionDisplay();
    }


    // Update placeholder
    document.getElementById("waveformFilename").textContent = "Loading…";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer);

        normalizeAudioBuffer(audioBuffer);

        droppedAudioBuffer = audioBuffer;
        drawWaveform(audioBuffer);

        // ⭐ Update filename here
        document.getElementById("waveformFilename").textContent = file.name;

        // Hide placeholder
        document.querySelector(".waveform-placeholder").style.display = "none";

        // ⭐ Switch border from dashed → solid 
        document.querySelector(".waveform-wrapper").classList.add("has-file");

        if (droppedAudioPlayer) {
            droppedAudioPlayer.stop();
            droppedAudioPlayer.dispose();
        }

        droppedAudioPlayer = new Tone.Player().connect(droppedAudioGain);
        droppedAudioPlayer.buffer = audioBuffer;
        droppedAudioPlayer.autostart = false;

    } catch (err) {
        console.error(err);
        document.getElementById("waveformFilename").textContent = "Error loading file";
    }

});





function drawWaveform() {
    const canvas = document.getElementById("waveformCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Hi‑DPI setup
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.clientWidth  * dpr;
    canvas.height = canvas.clientHeight * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const width  = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.clearRect(0, 0, width, height);

    // --- TIMING ---
    const bpm = Tone.Transport.bpm.value;
    const secondsPerBeat = 60 / bpm;

    const audioDurationSeconds = droppedAudioBuffer
        ? droppedAudioBuffer.duration
        : (totalDuration || 0);

    const offsetBeats   = Number(document.getElementById("vocalOffsetBeats").value || 0);
    const offsetSeconds = offsetBeats * secondsPerBeat;

    // Timeline for drawing (grid ignores lead‑in)
    const pxPerSecond = width / audioDurationSeconds;

    // -----------------------------
    // Draw beat + bar lines (AUDIO ONLY)
    // -----------------------------
    const totalBeatsAudio = audioDurationSeconds / secondsPerBeat;

    for (let beat = 0; beat <= totalBeatsAudio; beat++) {
        const t = beat * secondsPerBeat;   // NO LEAD‑IN SHIFT
        const x = t * pxPerSecond;

        const isBar = beat % 4 === 0;

        ctx.strokeStyle = isBar ? "#ffffff22" : "#ffffff11";
        ctx.lineWidth = isBar ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // -----------------------------
    // Lead‑in block (visual only, drawn AFTER grid)
    // -----------------------------
    if (offsetSeconds > 0) {
        const leadWidth = offsetSeconds * pxPerSecond;
        ctx.fillStyle = "#00aaff22";
        ctx.fillRect(0, 0, leadWidth, height);
    }

    // -----------------------------
    // Waveform (aligned to audio)
    // -----------------------------
    if (droppedAudioBuffer) {
        drawWaveformBuffer(ctx, droppedAudioBuffer, pxPerSecond, 0);
    }

    // -----------------------------
    // Playhead (starts at waveform start)
    // -----------------------------
    if (window._audioStartTime !== undefined && Tone.Transport.state === "started") {
        const elapsed = Tone.now() - window._audioStartTime;
        const clamped = Math.max(0, Math.min(elapsed, audioDurationSeconds));

        const playheadX = clamped * pxPerSecond;

        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
    }

    requestAnimationFrame(drawWaveform);
}



function drawWaveformBuffer(ctx, buffer, pxPerSecond, offsetSeconds) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    const data = buffer.getChannelData(0);
    const samplesPerPixel = Math.floor(data.length / width);

    ctx.strokeStyle = "#ffffffaa";
    ctx.lineWidth = 1;

    ctx.beginPath();

    for (let x = 0; x < width; x++) {
        const start = x * samplesPerPixel;
        const end = start + samplesPerPixel;

        let min = 1;
        let max = -1;

        for (let i = start; i < end; i++) {
            const v = data[i];
            if (v < min) min = v;
            if (v > max) max = v;
        }

        const y1 = (1 - max) * height * 0.5;
        const y2 = (1 - min) * height * 0.5;

        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
    }

    ctx.stroke();
}



function normalizeAudioBuffer(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    let maxSample = 0;

    // Find the peak sample across all channels
    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = audioBuffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > maxSample) maxSample = abs;
        }
    }

    // Avoid divide-by-zero
    if (maxSample === 0) return audioBuffer;

    const gain = 1 / maxSample;

    // Apply gain to all channels
    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = audioBuffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
            data[i] *= gain;
        }
    }

    return audioBuffer;
}

document.getElementById("instrumentVol").addEventListener("input", e => {
    instrumentGain.gain.value = parseFloat(e.target.value);
});

document.getElementById("audioVol").addEventListener("input", e => {
    droppedAudioGain.gain.value = parseFloat(e.target.value);
});

// Detect Tempo and Key
function extractBPM(filename) {
    const bpmMatch = filename.match(/(\d+)\s*bpm/i);
    return bpmMatch ? parseInt(bpmMatch[1], 10) : null;
}

function extractKey(filename) {
    const keyMatch = filename.match(/([A-G][#b]?)[_\-\s]?(major|minor|maj|min|m)/i);
    if (!keyMatch) return null;

    let root = keyMatch[1].toUpperCase();
    let quality = keyMatch[2].toLowerCase();

    if (quality === "maj") quality = "major";
    if (quality === "min" || quality === "m") quality = "minor";

    return `${root} ${quality}`;
}

function attachSliderReadout(sliderId, readoutId, formatter = v => v) {
    const slider = document.getElementById(sliderId);
    const readout = document.getElementById(readoutId);

    const update = () => {
        readout.textContent = formatter(slider.value);
    };

    slider.addEventListener("input", update);   // while dragging
    slider.addEventListener("mousemove", update); // while hovering
    slider.addEventListener("change", update);  // after release

    update(); // initialize
}

attachSliderReadout("vocalOffsetBeats", "leadInValue");

attachSliderReadout("instrumentVol", "instrumentVolValue", v => Number(v).toFixed(2));

attachSliderReadout("audioVol", "audioVolValue", v => Number(v).toFixed(2));




