# Interactive Circle of Fifths

An interactive music theory tool that visualizes the circle of fifths and helps musicians understand key relationships, chord progressions, and music theory concepts.

## Current Status

The application is currently undergoing refactoring to separate the musical logic from the visualization. The plan is to move all musical theory logic to `circle-logic.js` while keeping the HTML/CSS display structure in `index.html`.

## Refactoring Plan

1. ✅ Remove all musical logic from index.html, keeping only the basic HTML display structure
2. Build connections between the UI and the circle-logic.js module
3. Implement drawing functions and event handlers
4. Add chord progression tracking functionality
5. Implement key transposition and mode switching logic

## Features

- Interactive circle of fifths visualization
- Support for different musical modes
- Key transposition functionality
- Chord progression creation and visualization
- Toggle between chord names and Roman numerals

## Technology

- Vanilla JavaScript
- HTML5 Canvas for visual elements
- CSS for styling
