// ----------------------
// Music theory engine
// ----------------------

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

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





function buildSusChords(scale, isMinor=false) {
    const chords = [];

    for (let i = 0; i < 7; i++) {
        const root = scale[i];
        const second = scale[(i + 1) % 7];
        const fourth = scale[(i + 3) % 7];
        const fifth = scale[(i + 4) % 7];

        const bass = root + "3";

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
    const { root, isMinor } = randomKey();
    const scale = buildScale(root, isMinor);
    const chords = buildTriads(scale, isMinor);

    // Store globally for chord picker
    currentScale = scale;
    currentIsMinor = isMinor;

    function pick(group) {
        // Map indices to chord objects
        let candidates = group.map(i => chords[i]);

        // Remove diminished chords entirely
        candidates = candidates.filter(ch => ch.quality !== "dim");

        // Safety: if filtering removed everything, fall back to the first chord in the group
        if (candidates.length === 0) {
            return chords[group[0]];
        }

        // Pick randomly from remaining chords
        return candidates[Math.floor(Math.random() * candidates.length)];
    }





    const chordCount = document.getElementById("countToggle").checked ? 8 : 4;

    let progression = [];

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

    // ⭐ THIS WAS MISSING
    currentProgression = progression;

    // Update UI
    updateProgressionDisplay();

    return {
        key: `${root} ${isMinor ? "minor" : "major"}`,
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
    canvas.height = canvas.clientHeight;

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

const piano = new Tone.Sampler({
    urls: {
        "A0": "A0.mp3",
        "C1": "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        "A1": "A1.mp3",
        "C2": "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        "A2": "A2.mp3",
        "C3": "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        "A3": "A3.mp3",
        "C4": "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        "A4": "A4.mp3",
        "C5": "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        "A5": "A5.mp3",
        "C6": "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        "A6": "A6.mp3",
        "C7": "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        "A7": "A7.mp3",
        "C8": "C8.mp3"
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/"
}).toDestination();

piano.volume.value = 0;

// ----------------------
// Preview Audio (FINAL)
// ----------------------

async function previewAudio() {
    if (!currentProgression.length) return;

    await Tone.start();

    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;

    piano.releaseAll();

    const canvas = document.getElementById("pianoRoll");

    const patternName = document.getElementById("rhythmSelector").value;
    const rhythm = RHYTHM_SETS[patternName] || RHYTHM_SETS["none"];

    cursorX = 0;
    isPlaying = true;

    let tickTime = 0; // <-- master tick counter

    // -------------------------
    // CHORDS (no bass)
    // -------------------------
    currentProgression.forEach(chord => {
        const chordNotes = chord.notes.slice(1);

        rhythm.chords.forEach(step => {
            if (step > 0 && chordNotes.length) {
                Tone.Transport.schedule(time => {
                    chordNotes.forEach(n => {
                        piano.triggerAttackRelease(n, "T" + step, time);
                    });
                }, "T" + tickTime);
            }

            tickTime += step; // <-- accumulate ticks
        });
    });

    // -------------------------
    // BASS (root only)
    // -------------------------
    let bassTick = 0; // <-- separate counter for bass scheduling

    currentProgression.forEach(chord => {
        const root = chord.notes[0];

        rhythm.bass.forEach(step => {
            if (step > 0) {
                Tone.Transport.schedule(time => {
                    piano.triggerAttackRelease(root, "T" + step, time);
                }, "T" + bassTick);
            }

            bassTick += step;
        });
    });

    // -------------------------
    // TOTAL LENGTH = chord timeline
    // -------------------------
    const totalTicks = tickTime;  // <-- correct

    function animateCursor() {
        if (!isPlaying) return;

        const elapsedTicks = Tone.Transport.ticks;
        cursorX = (elapsedTicks / totalTicks) * canvas.width;

        drawPianoRoll();

        if (elapsedTicks < totalTicks) {
            requestAnimationFrame(animateCursor);
        } else {
            isPlaying = false;
            drawPianoRoll();
        }
    }

    Tone.Transport.start("+0.05");
    requestAnimationFrame(animateCursor);

    // expose for loop button
    window.totalTicks = totalTicks;
}




// ----------------------
// MIDI export (FINAL)
// ----------------------

function unitsToMidiDuration(units) {
    switch (units) {
        case 1: return "16"; // sixteenth
        case 2: return "8";  // eighth
        case 4: return "4";  // quarter
        case 8: return "2";  // half
        case 16: return "1"; // whole
        default:
            return "16"; // fallback
    }
}

function exportToMIDI() {
    if (!currentProgression.length) return;

    const patternName = document.getElementById("rhythmSelector").value;
    const rhythm = RHYTHM_SETS[patternName] || RHYTHM_SETS["none"];

    const chordTrack = new MidiWriter.Track();
    const bassTrack  = new MidiWriter.Track();

    chordTrack.setTempo(120);
    bassTrack.setTempo(120);

    const REST_UNIT = 1;

    // CHORD TRACK (no bass note)
    currentProgression.forEach(chord => {
        const chordNotes = chord.notes.slice(1);

        rhythm.chords.forEach(step => {
            const units = step === 0 ? REST_UNIT : step;
            const dur = unitsToMidiDuration(units);

            if (step === 0) {
                // Rest
                chordTrack.addEvent(new MidiWriter.NoteEvent({
                    rest: true,
                    duration: dur
                }));
            } else {
                // Notes
                chordTrack.addEvent(new MidiWriter.NoteEvent({
                    pitch: chordNotes,
                    duration: dur
                }));
            }
        });
    });

    // BASS TRACK (root only)
    currentProgression.forEach(chord => {
        const root = chord.notes[0];

        rhythm.bass.forEach(step => {
            const units = step === 0 ? REST_UNIT : step;
            const dur = unitsToMidiDuration(units);

            if (step === 0) {
                bassTrack.addEvent(new MidiWriter.NoteEvent({
                    rest: true,
                    duration: dur
                }));
            } else {
                bassTrack.addEvent(new MidiWriter.NoteEvent({
                    pitch: [root],
                    duration: dur
                }));
            }
        });
    });

    // Filename: Key + Roman numerals
    const progressionSymbols = currentProgression
        .map(ch => romanNumeralForChord(currentScale, currentIsMinor, ch.name, ch.quality))
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

    await Tone.start(); // required for audio
    console.log("Tone started");

    previewAudio(); // schedules notes + starts transport
};


const stopBtn = document.getElementById("stopBtn");

stopBtn.onclick = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    piano.releaseAll();
    isPlaying = false;
    drawPianoRoll();
};

const loopBtn = document.getElementById("loopBtn");
let isLooping = false;

loopBtn.onclick = () => {
    isLooping = !isLooping;

    loopBtn.classList.toggle("active", isLooping);

    if (isLooping) {
        Tone.Transport.loop = true;
        Tone.Transport.loopStart = "T0";
        Tone.Transport.loopEnd = "T" + totalTicks; // <-- correct
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
