// ----------------------
// Music theory engine
// ----------------------

function scaleMidiSet(scale) {
    const set = new Set();
    scale.forEach(note => {
        const idx = NOTES.indexOf(note);
        for (let oct = 0; oct < 10; oct++) {
            set.add(idx + (oct + 1) * 12);
        }
    });
    return set;
}


const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

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

        const bass = root + "3";

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

// ----------------------
// Extensions (Advanced mode)
// ----------------------

function addEDMExtensions(chord) {
    const r = Math.random();

    const rootNote = chord.notes[1];
    const rootPitch = rootNote.slice(0, -1);
    const rootOct = rootNote.slice(-1);

    const rootIndex = NOTES.indexOf(rootPitch);

    const sus2Pitch = NOTES[(rootIndex + 2) % 12];
    const sus4Pitch = NOTES[(rootIndex + 5) % 12];

    const sus2 = sus2Pitch + rootOct;
    const sus4 = sus4Pitch + rootOct;

    // 50% sus2, 50% sus4 — no add9
    if (r < 0.5) chord.notes[2] = sus2;
    else chord.notes[2] = sus4;

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
    dominant: [4, 6]
};

function generateFunctionalProgression() {
    const { root, isMinor } = randomKey();
    const scale = buildScale(root, isMinor);
    const chords = buildTriads(scale, isMinor);

    // Store globally for chord picker
    currentScale = scale;
    currentIsMinor = isMinor;

    const pick = group => chords[group[Math.floor(Math.random() * group.length)]];

    const chordCount = document.getElementById("countToggle").checked ? 8 : 4;

    let progression = [];

    for (let i = 0; i < chordCount; i++) {
        const group = i % 4 === 0 ? FUNCTIONAL_GROUPS.tonic :
                      i % 4 === 1 ? FUNCTIONAL_GROUPS.pre :
                      i % 4 === 2 ? FUNCTIONAL_GROUPS.dominant :
                                    FUNCTIONAL_GROUPS.tonic;

        // Clone chord so edits don't mutate base triads
        progression.push({ ...pick(group) });
    }

    if (document.getElementById("modeToggle").checked) {
        progression = progression.map(ch => addEDMExtensions({ ...ch }));
    }

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
    draggedIndex = Number(e.target.dataset.index);
    e.target.classList.add("dragging");
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();

    const target = e.target.closest(".chord-card");
    if (!target) return;

    const targetIndex = Number(target.dataset.index);

    const moved = currentProgression.splice(draggedIndex, 1)[0];
    currentProgression.splice(targetIndex, 0, moved);

    renderChords();
    drawPianoRoll();
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

const scaleSet = scaleMidiSet(currentScale);

function noteToMidi(note) {
    const pitch = note.slice(0, -1);
    const octave = parseInt(note.slice(-1), 10);
    return NOTES.indexOf(pitch) + (octave + 1) * 12;
}

let cursorX = 0;
let isPlaying = false;

function drawPianoRoll() {
    const canvas = document.getElementById("pianoRoll");
    const ctx = canvas.getContext("2d");

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentProgression.length) return;

    const midiNotes = currentProgression.flatMap(ch => ch.notes.map(noteToMidi));
    const minMidi = Math.min(...midiNotes);
    const maxMidi = Math.max(...midiNotes);
    const range = maxMidi - minMidi + 1;

    const noteHeight = canvas.height / range;
    const chordWidth = canvas.width / currentProgression.length;

    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 1;

    for (let i = 0; i <= range; i++) {
        const midi = minMidi + i;
        const y = canvas.height - (i + 1) * noteHeight;
    
        // Highlight if note is in scale
        if (scaleSet.has(midi % 12 + 12)) {
            ctx.fillStyle = "rgba(0, 116, 201, 0.12)"; // subtle blue glow
            ctx.fillRect(0, y, canvas.width, noteHeight);
        }
    
        // Draw grid line
        ctx.strokeStyle = "#1f2937";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }


    currentProgression.forEach((chord, i) => {
        chord.notes.forEach(note => {
            const midi = noteToMidi(note);
            const y = canvas.height - ((midi - minMidi + 1) * noteHeight);
            const x = i * chordWidth;

            ctx.fillStyle = "#0074C9";
            ctx.fillRect(x + 4, y + 2, chordWidth - 8, noteHeight - 4);
        });
    });

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

async function previewAudio() {
    if (!currentProgression.length) return;

    await Tone.start();

    const canvas = document.getElementById("pianoRoll");

    const totalChords = currentProgression.length;
    const chordDuration = 1;

    cursorX = 0;
    isPlaying = true;

    const startTime = Tone.now();
    const animStart = performance.now();

    currentProgression.forEach((chord, i) => {
        const timeOffset = i * chordDuration;
        chord.notes.forEach(n => {
            piano.triggerAttackRelease(n, "1n", startTime + timeOffset);
        });
    });

    const totalDuration = totalChords * chordDuration;

    function animateCursor(now) {
        const elapsed = (now - animStart) / 1000;
        cursorX = (elapsed / totalDuration) * canvas.width;

        drawPianoRoll();

        if (elapsed < totalDuration) {
            requestAnimationFrame(animateCursor);
        } else {
            isPlaying = false;
            drawPianoRoll();
        }
    }

    requestAnimationFrame(animateCursor);
}

// ----------------------
// MIDI export
// ----------------------

function exportToMIDI() {
    if (!currentProgression.length) return;

    const track = new MidiWriter.Track();
    track.setTempo(120);

    currentProgression.forEach(chord => {
        track.addEvent(new MidiWriter.NoteEvent({
            pitch: chord.notes,
            duration: "1"
        }));
    });

    const writer = new MidiWriter.Writer(track);
    const a = document.createElement("a");
    a.href = writer.dataUri();
    a.download = "progression.mid";
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
document.getElementById("previewBtn").onclick = previewAudio;
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



