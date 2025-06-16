/**
 * chord-highlight.js
 * Specialized module for highlighting chords and creating curved polygons
 * around adjacent chords in the circle of fifths.
 */

import { RING, findChordPosition } from './chord-position-map.js';

/**
 * Represents a collection of highlighted chords in the circle
 */
/**
 * A class for highlighting chords in the circle of fifths.
 * Uses a sector-based approach to determine areas and draws only the perimeter.
 */
class ChordHighlighter {
  constructor(canvasContext, centerX = 190, centerY = 190) {
    this.ctx = canvasContext;
    this.centerX = centerX;
    this.centerY = centerY;
    this.selectedChords = [];

    // Canvas for off-screen rendering (to determine the shape area)
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 380;
    this.offscreenCanvas.height = 380;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');

    // Default styling
    this.outlineColor = 'rgba(255, 0, 0, 0.8)';
    this.outlineWidth = 4;
    this.fillColor = 'rgba(255, 0, 0, 0.1)';
  }

  /**
   * Add a chord to the highlighted set
   * @param {string} chordName - Name of the chord to highlight
   * @returns {boolean} True if chord was added successfully
   */
  addChord(chordName) {
    const position = findChordPosition(chordName);
    if (!position) return false;

    this.selectedChords.push(position);
    return true;
  }

  /**
   * Add a chord by its position directly
   * @param {string} ring - The ring identifier
   * @param {number} index - Position index
   */
  addChordByPosition(ring, index) {
    this.selectedChords.push({ ring, index });
  }

  /**
   * Remove a chord from the highlighted set
   * @param {string} chordName - Name of the chord to remove
   */
  removeChord(chordName) {
    const position = findChordPosition(chordName);
    if (!position) return;

    this.selectedChords = this.selectedChords.filter(pos => 
      !(pos.ring === position.ring && pos.index === position.index)
    );
  }

  /**
   * Clear all highlighted chords
   */
  clearAll() {
    this.selectedChords = [];
  }

  /**
   * Get coordinates for a position
   * @param {string} ring - The ring identifier
   * @param {number} index - Position index
   * @returns {Object} Coordinates {x, y}
   */
  getPositionCoordinates(ring, index) {
    // Calculate angle in radians
    const angle = (Math.PI / 2) - (index * (Math.PI / 6));

    // Get radius for this ring
    const radius = ring === RING.MAJOR ? 150 : 
                 (ring === RING.MINOR ? 110 : 70);

    // Convert to cartesian coordinates
    return {
      x: this.centerX + radius * Math.cos(angle),
      y: this.centerY - radius * Math.sin(angle)
    };
  }

  /**
   * Draw the outline of each chord sector in the offscreen canvas
   * to determine the total area shape
   */
  drawSectors() {
    // Clear the offscreen canvas
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

    // Use a unique fill color for the sectors
    this.offscreenCtx.fillStyle = 'rgba(255, 0, 0, 1)';

    // Draw each chord as a sector
    this.selectedChords.forEach(chord => {
      const { ring, index } = chord;

      // Calculate angles
      const startAngle = (Math.PI / 2) - ((index - 0.5) * (Math.PI / 6));
      const endAngle = (Math.PI / 2) - ((index + 0.5) * (Math.PI / 6));

      // Calculate inner and outer radii based on ring
      let outerRadius, innerRadius;

      if (ring === RING.MAJOR) {
        outerRadius = 165; // Major outer ring
        innerRadius = 130; // Border with minor ring
      } else if (ring === RING.MINOR) {
        outerRadius = 130; // Border with major ring
        innerRadius = 90;  // Border with diminished ring
      } else { // DIMINISHED
        outerRadius = 90;  // Border with minor ring
        innerRadius = 50;  // Inner border
      }

      // Draw the sector
      this.offscreenCtx.beginPath();

      // Outer arc
      this.offscreenCtx.arc(
        this.centerX, 
        this.centerY, 
        outerRadius, 
        endAngle, // Swap for clockwise
        startAngle, 
        true
      );

      // Line to inner radius
      this.offscreenCtx.lineTo(
        this.centerX + innerRadius * Math.cos(startAngle),
        this.centerY - innerRadius * Math.sin(startAngle)
      );

      // Inner arc
      this.offscreenCtx.arc(
        this.centerX, 
        this.centerY, 
        innerRadius, 
        startAngle,
        endAngle,
        false
      );

      // Close the path
      this.offscreenCtx.closePath();
      this.offscreenCtx.fill();
    });
  }

  /**
   * Find the outline of the total area using edge detection
   */
  findOutline() {
    // Get the image data from the offscreen canvas
    const imageData = this.offscreenCtx.getImageData(
      0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height
    );

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Create a new ImageData for the outline
    const outlineData = this.offscreenCtx.createImageData(width, height);
    const outlinePixels = outlineData.data;

    // Edge detection - look for red pixels adjacent to non-red pixels
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // If this pixel is red (part of our area)
        if (data[idx] > 200 && data[idx + 3] > 200) {
          // Check if any of the 8 surrounding pixels are not red
          let isEdge = false;

          // Check 8 surrounding pixels
          const directions = [
            {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1},
            {dx: -1, dy: 0},                  {dx: 1, dy: 0},
            {dx: -1, dy: 1},  {dx: 0, dy: 1},  {dx: 1, dy: 1}
          ];

          for (const dir of directions) {
            const neighborIdx = ((y + dir.dy) * width + (x + dir.dx)) * 4;
            if (data[neighborIdx] < 200 || data[neighborIdx + 3] < 200) {
              isEdge = true;
              break;
            }
          }

          if (isEdge) {
            // Mark this pixel as part of the outline
            outlinePixels[idx] = 255;     // R
            outlinePixels[idx + 1] = 0;   // G
            outlinePixels[idx + 2] = 0;   // B
            outlinePixels[idx + 3] = 255; // A
          }
        }
      }
    }

    return outlineData;
  }

  /**
   * Draw the highlighted chords using the area-based approach
   */
  drawHighlights() {
    if (this.selectedChords.length === 0) return;

    // First, draw all sectors to the offscreen canvas
    this.drawSectors();

    // Find the outline of the total area
    const outlineData = this.findOutline();

    // Draw the outline to the visible canvas
    this.ctx.putImageData(outlineData, 0, 0);
  }

  /**
   * Alternative method that uses canvas stroke to draw the perimeter
   * This provides better control over line width and style
   */
  drawHighlightsWithPath() {
    if (this.selectedChords.length === 0) return;

    // First, draw all sectors to the offscreen canvas
    this.drawSectors();

    // Set up the stroke style for the visible canvas
    this.ctx.strokeStyle = this.outlineColor;
    this.ctx.lineWidth = this.outlineWidth;

    // Trace the perimeter using the offscreen canvas data
    this.tracePerimeter();
  }

  /**
   * Trace the perimeter of the shape on the offscreen canvas
   * and draw it to the visible canvas
   */
  tracePerimeter() {
    // Starting point for perimeter tracing
    const startPoint = this.findStartingPoint();
    if (!startPoint) return;

    // Get the image data from the offscreen canvas
    const imageData = this.offscreenCtx.getImageData(
      0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height
    );
    const data = imageData.data;
    const width = imageData.width;

    // Direction vectors for the 8 neighbors (clockwise order)
    const directions = [
      {dx: 1, dy: 0},   // Right
      {dx: 1, dy: 1},   // Down-Right
      {dx: 0, dy: 1},   // Down
      {dx: -1, dy: 1},  // Down-Left
      {dx: -1, dy: 0},  // Left
      {dx: -1, dy: -1}, // Up-Left
      {dx: 0, dy: -1},  // Up
      {dx: 1, dy: -1}   // Up-Right
    ];

    // Begin tracing
    this.ctx.beginPath();
    this.ctx.moveTo(startPoint.x, startPoint.y);

    let currentX = startPoint.x;
    let currentY = startPoint.y;
    let currentDir = 0; // Start looking to the right
    let steps = 0;
    const maxSteps = width * this.offscreenCanvas.height; // Safety limit

    // Use a simplified outline tracer
    this.ctx.beginPath();

    // Extract perimeter pixels and draw line segments
    for (let y = 0; y < this.offscreenCanvas.height; y++) {
      let inShape = false;
      let lastTransitionX = -1;

      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isRed = data[idx] > 200 && data[idx + 3] > 200;

        // When transitioning from outside to inside
        if (!inShape && isRed) {
          inShape = true;
          lastTransitionX = x;
          this.ctx.moveTo(x, y);
        }
        // When transitioning from inside to outside
        else if (inShape && !isRed) {
          inShape = false;
          this.ctx.lineTo(x - 1, y);
          this.ctx.stroke();
        }
      }

      // If we ended the line still inside the shape, draw to the edge
      if (inShape) {
        this.ctx.lineTo(width - 1, y);
        this.ctx.stroke();
      }
    }

    // Vertical passes for better coverage
    for (let x = 0; x < width; x++) {
      let inShape = false;
      let lastTransitionY = -1;

      for (let y = 0; y < this.offscreenCanvas.height; y++) {
        const idx = (y * width + x) * 4;
        const isRed = data[idx] > 200 && data[idx + 3] > 200;

        if (!inShape && isRed) {
          inShape = true;
          lastTransitionY = y;
          this.ctx.moveTo(x, y);
        }
        else if (inShape && !isRed) {
          inShape = false;
          this.ctx.lineTo(x, y - 1);
          this.ctx.stroke();
        }
      }

      if (inShape) {
        this.ctx.lineTo(x, this.offscreenCanvas.height - 1);
        this.ctx.stroke();
      }
    }
  }

  /**
   * Find a starting point on the perimeter for tracing
   * @returns {Object|null} The starting point {x, y} or null if not found
   */
  findStartingPoint() {
    // Get the image data from the offscreen canvas
    const imageData = this.offscreenCtx.getImageData(
      0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height
    );
    const data = imageData.data;
    const width = imageData.width;

    // Scan from the top-left to find the first red pixel
    for (let y = 0; y < this.offscreenCanvas.height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx] > 200 && data[idx + 3] > 200) {
          return { x, y };
        }
      }
    }

    return null; // No red pixels found
  }
}

export { ChordHighlighter };
