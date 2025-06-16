/**
 * circle-logic.js
 * Core music theory logic and data structures for the circle of fifths
 * Separated from visualization logic
 */

 import { RING, CIRCLE_POSITIONS, findChordPosition } from './chord-position-map.js';
 import { ChordHighlighter } from './chord-highlight.js';

// ================ USER STATE DATA STRUCTURES ================

/**
 * Default initial state for the user
 * @type {Object}
 */
const DEFAULT_STATE = {
  key: 'C',                // Root key (e.g., 'C', 'G', 'F#')
  mode: 'ionian (major)',  // Musical mode (e.g., 'ionian (major)', 'aeolian (minor)', 'dorian')
  progression: []          // Array of scale degrees (e.g., ['I', 'IV', 'V'])
};

/**
 * Creates a new state object
 * @param {string} [key=DEFAULT_STATE.key] - The root key
 * @param {string} [mode=DEFAULT_STATE.mode] - The musical mode
 * @param {string[]} [progression=DEFAULT_STATE.progression] - Array of chord scale degrees
 * @returns {Object} A new state object
 */
function createState(key = DEFAULT_STATE.key, mode = DEFAULT_STATE.mode, progression = [...DEFAULT_STATE.progression]) {
  return {
    key,
    mode,
    progression
  };
}

/**
 * Creates a new state by transposing the current state to a new key
 * @param {Object} state - The current state
 * @param {string} newKey - The destination key to transpose to
 * @returns {Object} A new state with the transposed key and same progression
 */
function transposeState(state, newKey) {
  // This will create a new state object with the same progression but in a new key
  return createState(newKey, state.mode, [...state.progression]);
}

// ================ CORE DATA STRUCTURES ================

/**
 * All notes in the chromatic scale
 * @type {string[]}
 */
const NOTES = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];

/**
 * Notes in the circle of fifths order (clockwise)
 * @type {string[]}
 */
const CIRCLE_ORDER = ['C', 'G', 'D', 'A', 'E', 'B', 'F#/Gb', 'C#/Db', 'G#/Ab', 'D#/Eb', 'A#/Bb', 'F'];

/**
 * Map of enharmonic equivalents for each note
 * @type {Object.<string, string>}
 */
const ENHARMONIC_EQUIVALENTS = {
  'C#': 'Db',
  'Db': 'C#',
  'D#': 'Eb',
  'Eb': 'D#',
  'F#': 'Gb',
  'Gb': 'F#',
  'G#': 'Ab',
  'Ab': 'G#',
  'A#': 'Bb',
  'Bb': 'A#',
};

/**
 * Definition of available modes with their interval patterns
 * (number of semitones from the root)
 * @type {Object.<string, number[]>}
 */
const MODES = {
  'ionian (major)': [0, 2, 4, 5, 7, 9, 11],
  'aeolian (minor)': [0, 2, 3, 5, 7, 8, 10],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'locrian': [0, 1, 3, 5, 6, 8, 10],
};

/**
 * Definition of key signatures for each key in the circle
 * @type {Object.<string, Object.<string, {count: number, type: string}>>}
 */
const KEY_SIGNATURES = {
  'ionian (major)': {
    'C': { count: 0, type: 'natural' },
    'G': { count: 1, type: 'sharp' },
    'D': { count: 2, type: 'sharp' },
    'A': { count: 3, type: 'sharp' },
    'E': { count: 4, type: 'sharp' },
    'B': { count: 5, type: 'sharp' },
    'F#': { count: 6, type: 'sharp' },
    'Gb': { count: 6, type: 'flat' },
    'C#': { count: 7, type: 'sharp' },
    'Db': { count: 5, type: 'flat' },
    'G#': { count: 8, type: 'sharp' }, // Theoretical
    'Ab': { count: 4, type: 'flat' },
    'D#': { count: 9, type: 'sharp' }, // Theoretical
    'Eb': { count: 3, type: 'flat' },
    'A#': { count: 10, type: 'sharp' }, // Theoretical
    'Bb': { count: 2, type: 'flat' },
    'F': { count: 1, type: 'flat' },
  },
  'aeolian (minor)': {
    'A': { count: 0, type: 'natural' },
    'E': { count: 1, type: 'sharp' },
    'B': { count: 2, type: 'sharp' },
    'F#': { count: 3, type: 'sharp' },
    'C#': { count: 4, type: 'sharp' },
    'G#': { count: 5, type: 'sharp' },
    'D#': { count: 6, type: 'sharp' },
    'Eb': { count: 6, type: 'flat' },
    'A#': { count: 7, type: 'sharp' },
    'Bb': { count: 5, type: 'flat' },
    'F': { count: 4, type: 'flat' },
    'C': { count: 3, type: 'flat' },
    'G': { count: 2, type: 'flat' },
    'D': { count: 1, type: 'flat' },
  }
};

/**
 * Mapping of relative major/minor keys
 * @type {Object.<string, string>}
 */
const RELATIVE_KEYS = {
  // Major to minor (major key → relative minor)
  'C': 'A',
  'G': 'E',
  'D': 'B',
  'A': 'F#',
  'E': 'C#',
  'B': 'G#',
  'F#': 'D#',
  'Gb': 'Eb',
  'C#': 'A#',
  'Db': 'Bb',
  'G#': 'F',  // Enharmonic with Ab
  'Ab': 'F',
  'D#': 'C',  // Enharmonic with Eb
  'Eb': 'C',
  'A#': 'G',  // Enharmonic with Bb
  'Bb': 'G',
  'F': 'D',
};

/**
 * Triads for each scale degree in different modes
 * Using Roman numeral notation: uppercase = major, lowercase = minor
 * @type {Object.<string, string[]>}
 */
const SCALE_DEGREE_TRIADS = {
  'ionian (major)': ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  'aeolian (minor)': ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
  'dorian': ['i', 'ii', 'bIII', 'IV', 'v', 'vi°', 'bVII'],
  'phrygian': ['i', 'bII', 'bIII', 'iv', 'v°', 'bVI', 'bVII'],
  'lydian': ['I', 'II', 'iii', '#iv°', 'V', 'vi', 'vii'],
  'mixolydian': ['I', 'ii', 'iii°', 'IV', 'v', 'vi', 'bVII'],
  'locrian': ['i°', 'bII', 'biii', 'iv', 'bV', 'bVI', 'bVII'],
};

/**
 * Common chord progressions by mode
 * @type {Object.<string, string[][]>}
 */
const COMMON_PROGRESSIONS = {
  'ionian (major)': [
    ['I', 'IV', 'V'],
    ['I', 'vi', 'IV', 'V'],
    ['ii', 'V', 'I'],
    ['I', 'V', 'vi', 'IV'],
    ['I', 'IV', 'ii', 'V']
  ],
  'aeolian (minor)': [
    ['i', 'iv', 'V'],
    ['i', 'VI', 'VII'],
    ['i', 'iv', 'v'],
    ['i', 'bIII', 'bVII', 'bVI'],
    ['i', 'bVII', 'bVI', 'V']
  ]
};

/**
 * Seventh chord types for each scale degree in different modes
 * @type {Object.<string, string[]>}
 */
const SEVENTH_CHORDS = {
  'ionian (major)': ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'vii7b5'],
  'aeolian (minor)': ['i7', 'ii7b5', 'bIIImaj7', 'iv7', 'v7', 'bVImaj7', 'bVII7']
};

/**
 * Intervals in semitones
 * @type {Object.<string, number>}
 */
const INTERVALS = {
  'P1': 0,  // Perfect unison
  'm2': 1,  // Minor second
  'M2': 2,  // Major second
  'm3': 3,  // Minor third
  'M3': 4,  // Major third
  'P4': 5,  // Perfect fourth
  'A4': 6,  // Augmented fourth / Tritone
  'd5': 6,  // Diminished fifth / Tritone
  'P5': 7,  // Perfect fifth
  'm6': 8,  // Minor sixth
  'M6': 9,  // Major sixth
  'm7': 10, // Minor seventh
  'M7': 11, // Major seventh
  'P8': 12  // Perfect octave
};

// ================ FUNCTION SIGNATURES ================

/**
 * Calculates the next position in the circle based on the current mode and key
 * @param {string} currentKey - The current key/note in the circle
 * @param {string} mode - The current musical mode (e.g., 'major', 'minor', etc.)
 * @param {number} steps - Number of steps to move (positive for clockwise, negative for counter-clockwise)
 * @returns {string} The resulting key/note
 */
function calculateNextPosition(currentKey, mode, steps) {
  // Implementation will go here
}

/**
 * Returns all notes in the circle for a given mode
 * @param {string} mode - The musical mode ('major', 'minor', etc.)
 * @returns {string[]} Array of notes in the circle
 */
function getCircleNotes(mode) {
  // Implementation will go here
}

/**
 * Calculates relative minor/major key
 * @param {string} key - The current key
 * @param {string} currentMode - The current mode ('major' or 'minor')
 * @returns {string} The relative minor/major key
 */
function getRelativeKey(key, currentMode) {
  // Implementation will go here
}

/**
 * Returns the number of sharps or flats for a given key
 * @param {string} key - The key to analyze
 * @param {string} mode - The mode of the key
 * @returns {{ count: number, type: string }} Number of sharps/flats and their type
 */
function getKeySignature(key, mode) {
  // Implementation will go here
}

/**
 * Returns the key that is a specific interval away from the given key
 * @param {string} startKey - The starting key
 * @param {string} interval - The musical interval (e.g., 'P4', 'P5', 'M3', etc.)
 * @returns {string} The resulting key
 */
function getKeyByInterval(startKey, interval) {
  // Implementation will go here
}

/**
 * Validates if a given key exists in the circle
 * @param {string} key - The key to validate
 * @param {string} mode - The mode to check against
 * @returns {boolean} Whether the key is valid
 */
function isValidKey(key, mode) {
  // Implementation will go here
}

/**
 * Gets all possible modes for the circle
 * @returns {string[]} Array of available modes
 */
function getAvailableModes() {
  // Implementation will go here
}

/**
 * Returns the scale degrees for a given key and mode
 * @param {string} key - The key to analyze
 * @param {string} mode - The mode to use
 * @returns {string[]} Array of scale degrees
 */
function getScaleDegrees(key, mode) {
  // Implementation will go here
}

/**
 * Gets the notes in a scale for a given key and mode
 * @param {string} key - The root key
 * @param {string} mode - The mode to use
 * @returns {string[]} Array of notes in the scale
 */
function getScaleNotes(key, mode) {
  // Implementation will go here
}

/**
 * Gets the chords in a key
 * @param {string} key - The key to analyze
 * @param {string} mode - The mode to use
 * @param {boolean} [useSevenths=false] - Whether to include seventh chords
 * @returns {Object.<string, string>} Map of scale degrees to chord names
 */
function getChordsInKey(key, mode, useSevenths = false) {
  // Implementation will go here
}

/**
 * Returns common chord progressions for a given key and mode
 * @param {string} key - The key to use
 * @param {string} mode - The mode to use
 * @returns {Array<Array<string>>} Array of common progressions with actual chord names
 */
function getCommonProgressions(key, mode) {
  // Implementation will go here
}

/**
 * Gets the current chord progression with actual chord names
 * @param {Object} state - The current user state
 * @param {boolean} [useSevenths=false] - Whether to include seventh chords
 * @returns {string[]} Array of chord names in the current progression
 */
function getProgressionChords(state, useSevenths = false) {
  // Implementation will go here
  // This will convert roman numerals to actual chord names based on the current key and mode
}

/**
 * Adds a chord to the current progression
 * @param {Object} state - The current user state
 * @param {string} chordDegree - The scale degree to add (e.g., 'I', 'iv', 'V7')
 * @returns {Object} A new state with the updated progression
 */
function addChordToProgression(state, chordDegree) {
  // Create a new state with the updated progression
  return {
    ...state,
    progression: [...state.progression, chordDegree]
  };
}

/**
 * Removes a chord from the current progression at the specified index
 * @param {Object} state - The current user state
 * @param {number} index - The index of the chord to remove
 * @returns {Object} A new state with the updated progression
 */
function removeChordFromProgression(state, index) {
  const newProgression = [...state.progression];
  newProgression.splice(index, 1);
  return {
    ...state,
    progression: newProgression
  };
}

/**
 * Changes the mode while keeping the same tonal center
 * @param {Object} state - The current user state
 * @param {string} newMode - The new mode to change to
 * @returns {Object} A new state with the updated mode and equivalent key
 */
function changeMode(state, newMode) {
  // For a proper mode change, we need to keep the same tonal center
  // but adjust the key name according to the new mode
  // Implementation will go here

  return {
    ...state,
    mode: newMode
    // The key might need adjustment depending on implementation
  };
}

// Export all functions and constants for use in other modules
module.exports = {
  // Constants
  NOTES,
  CIRCLE_ORDER,
  ENHARMONIC_EQUIVALENTS,
  MODES,
  KEY_SIGNATURES,
  RELATIVE_KEYS,
  SCALE_DEGREE_TRIADS,
  COMMON_PROGRESSIONS,
  SEVENTH_CHORDS,
  INTERVALS,
  DEFAULT_STATE,

  // Functions
  calculateNextPosition,
  getCircleNotes,
  getRelativeKey,
  getKeySignature,
  getKeyByInterval,
  isValidKey,
  getAvailableModes,
  getScaleDegrees,
  getScaleNotes,
  getChordsInKey,
  getCommonProgressions,

  // State management
  createState,
  transposeState,
  getProgressionChords,
  addChordToProgression,
  removeChordFromProgression,
  changeMode
};
