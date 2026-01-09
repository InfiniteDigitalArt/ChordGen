// ----------------------
// Music theory engine
// ----------------------
let totalDuration = Tone.Time("4m").toSeconds(); // default 4 bars
let lastProgressionSignature = "";
let droppedAudioPlayer = null;
let droppedAudioBuffer = null;





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
    tonic:    [0, 5],
    pre:      [1, 3],
    dominant: [4]
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

// Subtle reverb
const reverb = new Tone.Reverb({
    decay: 2.5,
    wet: 0.15,
    preDelay: 0.02
}).toDestination();

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
}).connect(reverb);

// ----------------------
// Strings Sampler
// ----------------------
const stringsSampler = new Tone.Sampler({
    urls: {
        "C2":  "S_000_036_c1.wav",   // was C1
        "F#2": "S_000_042_f#1.wav",  // was F#1
        "C3":  "S_000_048_c2.wav",   // was C2
        "F#3": "S_000_054_f#2.wav",  // was F#2
        "C4":  "S_000_060_c3.wav",   // was C3
        "F#4": "S_000_066_f#3.wav",  // was F#3
        "C5":  "S_000_072_c4.wav",   // was C4
        "F#5": "S_000_078_f#4.wav",  // was F#4
        "C6":  "S_000_084_c5.wav"    // was C5
    },
    baseUrl: "Strings/",
    release: 0.4
}).connect(reverb);


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
    let transportTime = 0; // in seconds, relative to Transport

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
                }, transportTime);
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
                    
                }, bassTime);
            }

            bassTime += durSeconds;
        });
    });

    // Total duration in seconds (use the longest of chords/bass)
    totalDuration = Math.max(transportTime, bassTime);
    


    // -----------------------------
    // CURSOR + LOOP ENGINE
    // -----------------------------
    // We'll use seconds, not ticks, for the cursor
    function animateCursor() {
        if (!isPlaying) return;

        const elapsed = Tone.Transport.seconds;
        cursorX = (elapsed / totalDuration) * canvas.width;

        drawPianoRoll();

        if (elapsed < totalDuration) {
            requestAnimationFrame(animateCursor);
        } else {
            // If looping, keep the cursor alive
            if (Tone.Transport.loop) {
                requestAnimationFrame(animateCursor);
            } else {
                isPlaying = false;
                drawPianoRoll();
            }
        }
    }


    // For the loop button: use seconds, converted to Time
    totalTicks = Tone.Time(totalDuration).toTicks();
    
    // Update loop length so 8-chord mode works
    Tone.Transport.loopEnd = totalDuration;
    
    // (Optional) If loop button is ON:
    if (Tone.Transport.loop) {
        Tone.Transport.loopEnd = totalDuration;
    }
    
    if (droppedAudioPlayer) {
        droppedAudioPlayer.stop();
    }


    if (droppedAudioPlayer) {
        Tone.Transport.scheduleOnce(time => {
            droppedAudioPlayer.start(time);
        }, 0);
    }


    Tone.Transport.start();
    requestAnimationFrame(animateCursor);

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
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.ticks = 0;
    if (droppedAudioPlayer) {
    droppedAudioPlayer.stop();
}


    currentInstrument.releaseAll();

    cursorX = 0;
    drawPianoRoll();
};


const loopBtn = document.getElementById("loopBtn");
let isLooping = false;

loopBtn.onclick = () => {
    isLooping = !isLooping;
    loopBtn.classList.toggle("active", isLooping);

    if (isLooping) {
        Tone.Transport.loop = true;
        Tone.Transport.loopStart = 0;
        Tone.Transport.loopEnd = totalDuration;
    } else {
        Tone.Transport.loop = false;
    }
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

const dropZone = document.getElementById("audioDropZone");

// Highlight on dragover
dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("dragover");
});

// Remove highlight when leaving
dropZone.addEventListener("dragleave", e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
});

// Handle file drop
dropZone.addEventListener("drop", async e => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("dragover");

    const file = e.dataTransfer.files[0];
    if (!file) return;

    dropZone.textContent = "Loading…";

    try {
        const arrayBuffer = await file.arrayBuffer();

        // Decode using Tone.js audio context
        const audioBuffer = await Tone.getContext().rawContext.decodeAudioData(arrayBuffer);

        droppedAudioBuffer = audioBuffer;

        // Create a new player
        if (droppedAudioPlayer) {
            droppedAudioPlayer.stop();
            droppedAudioPlayer.dispose();
        }

        const toneBuffer = new Tone.ToneAudioBuffer(audioBuffer);

        droppedAudioPlayer = new Tone.Player({
            url: toneBuffer,
            autostart: false
        }).toDestination();


        dropZone.textContent = `Loaded: ${file.name}`;
    } catch (err) {
        console.error(err);
        dropZone.textContent = "Error loading file";
    }
});





