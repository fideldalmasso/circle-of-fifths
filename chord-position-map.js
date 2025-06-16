/**
 * Chord Position Mapping for Circle of Fifths
 * 
 * This file provides a coordinate system to uniquely identify any chord position in the circle.
 * Each chord is identified by:
 * - ring: 'major', 'minor', or 'diminished' (indicating which concentric circle)
 * - index: 0-11 (position in the clockwise direction, starting from the top position)
 * 
 * The mapping follows the standard circle of fifths ordering, with:
 * - Major chords in the outer ring
 * - Minor chords in the middle ring
 * - Diminished chords in the inner ring
 */

// Define the constants for the three rings
const RING = {
  MAJOR: 'major',
  MINOR: 'minor',
  DIMINISHED: 'diminished'
};

/**
 * The chord names in circle of fifths order (clockwise from top)
 * Index 0 is at the top (12 o'clock position)
 */
const CIRCLE_POSITIONS = {
  // Major chords (outer ring)
  [RING.MAJOR]: ['C', 'G', 'D', 'A', 'E', 'B', 'Gb/F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'],

  // Minor chords (middle ring)
  [RING.MINOR]: ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm/D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'],

  // Diminished chords (inner ring)
  [RING.DIMINISHED]: ['B°', 'F#°', 'C#°', 'G#°', 'D#°', 'A#°', 'F°', 'C°', 'G°', 'D°', 'A°', 'E°']
};

/**
 * Gets the polar coordinates for a chord position
 * @param {string} ring - The ring identifier ('major', 'minor', 'diminished')
 * @param {number} index - The position index (0-11, clockwise from top)
 * @returns {Object} Object with angle (in radians) and radius properties
 */
function getChordPolarCoordinates(ring, index) {
  // Define radii for each ring (matching the CSS values from index.html)
  const radii = {
    [RING.MAJOR]: 150,      // Outer ring radius
    [RING.MINOR]: 110,      // Middle ring radius
    [RING.DIMINISHED]: 70   // Inner ring radius
  };

  // Calculate angle (in radians)
  // Start at top (π/2) and move clockwise (negative direction in canvas)
  const angleInRadians = (Math.PI / 2) - (index * (Math.PI / 6));

  return {
    angle: angleInRadians,
    radius: radii[ring]
  };
}

/**
 * Converts polar coordinates to cartesian coordinates
 * @param {number} angle - Angle in radians
 * @param {number} radius - Radius from center
 * @param {number} centerX - X coordinate of the center
 * @param {number} centerY - Y coordinate of the center
 * @returns {Object} Object with x and y properties
 */
function polarToCartesian(angle, radius, centerX = 190, centerY = 190) {
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY - radius * Math.sin(angle)
  };
}

/**
 * Gets a unique identifier string for a chord position
 * @param {string} ring - The ring identifier ('major', 'minor', 'diminished')
 * @param {number} index - The position index (0-11, clockwise from top)
 * @returns {string} A unique identifier for the chord position
 */
function getChordPositionId(ring, index) {
  return `${ring}-${index}`;
}

/**
 * Gets the chord name at a specific position
 * @param {string} ring - The ring identifier ('major', 'minor', 'diminished')
 * @param {number} index - The position index (0-11, clockwise from top)
 * @returns {string} The chord name
 */
function getChordNameAtPosition(ring, index) {
  return CIRCLE_POSITIONS[ring][index];
}

/**
 * Finds the position of a chord by its name
 * @param {string} chordName - The name of the chord to find
 * @returns {Object|null} Object with ring and index properties, or null if not found
 */
function findChordPosition(chordName) {
  for (const ring in CIRCLE_POSITIONS) {
    const index = CIRCLE_POSITIONS[ring].findIndex(chord => {
      // Handle compound names like 'Gb/F#'
      if (chord.includes('/')) {
        const alternatives = chord.split('/');
        return alternatives.includes(chordName);
      }
      return chord === chordName;
    });

    if (index !== -1) {
      return { ring, index };
    }
  }
  return null;
}

/**
 * Creates an array of positions for a polygon shape around multiple chord positions
 * @param {Array} positions - Array of objects with ring and index properties
 * @param {number} centerX - X coordinate of the center
 * @param {number} centerY - Y coordinate of the center
 * @returns {Array} Array of point coordinates { x, y }
 */
function createPolygonPoints(positions, centerX = 190, centerY = 190) {
  return positions.map(pos => {
    const { angle, radius } = getChordPolarCoordinates(pos.ring, pos.index);
    return polarToCartesian(angle, radius, centerX, centerY);
  });
}

/**
 * Maps all 36 positions to their coordinates for easy lookup
 * @param {number} centerX - X coordinate of the center
 * @param {number} centerY - Y coordinate of the center
 * @returns {Object} Map of position IDs to their coordinates
 */
function createPositionCoordinateMap(centerX = 190, centerY = 190) {
  const map = {};

  [RING.MAJOR, RING.MINOR, RING.DIMINISHED].forEach(ring => {
    for (let index = 0; index < 12; index++) {
      const { angle, radius } = getChordPolarCoordinates(ring, index);
      const coords = polarToCartesian(angle, radius, centerX, centerY);
      const id = getChordPositionId(ring, index);
      map[id] = coords;
    }
  });

  return map;
}

/**
 * Creates a path for drawing a curved outline around specified chord positions
 * @param {Array} positions - Array of objects with ring and index properties
 * @param {CanvasRenderingContext2D} ctx - Canvas context for drawing
 * @param {number} tension - Curve tension (0-1, higher means more curved)
 * @param {boolean} closed - Whether to close the path
 * @param {number} centerX - X coordinate of the center
 * @param {number} centerY - Y coordinate of the center
 */
function drawChordPolygon(positions, ctx, tension = 0.5, closed = true, centerX = 190, centerY = 190) {
  if (positions.length < 2) return;

  // Sort the positions to ensure they're in clockwise order around the circle
  const sortedPositions = sortPositionsClockwise(positions);
  const points = createPolygonPoints(sortedPositions, centerX, centerY);

  ctx.beginPath();

  // Move to the first point
  ctx.moveTo(points[0].x, points[0].y);

  // For each point after the first one
  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const previous = points[i - 1];

    // Calculate control points for curved lines
    const controlX = previous.x + (current.x - previous.x) * tension;
    const controlY = previous.y + (current.y - previous.y) * tension;

    // Draw curved line
    ctx.quadraticCurveTo(controlX, controlY, current.x, current.y);
  }

  // Close the path if needed
  if (closed && points.length > 2) {
    const last = points[points.length - 1];
    const first = points[0];

    // Calculate control points for the closing curve
    const controlX = last.x + (first.x - last.x) * tension;
    const controlY = last.y + (first.y - last.y) * tension;

    // Draw closing curve
    ctx.quadraticCurveTo(controlX, controlY, first.x, first.y);
  }

  // The path is now ready for stroking/filling
}

/**
 * Sorts chord positions in clockwise order around the circle
 * @param {Array} positions - Array of objects with ring and index properties
 * @returns {Array} Sorted array of positions
 */
function sortPositionsClockwise(positions) {
  return [...positions].sort((a, b) => {
    // If they're in the same ring, sort by index
    if (a.ring === b.ring) {
      return a.index - b.index;
    }

    // Otherwise, we need to compare angles from center
    const aCoords = getChordPolarCoordinates(a.ring, a.index);
    const bCoords = getChordPolarCoordinates(b.ring, b.index);

    // Normalize angles to 0-2π range for comparison
    const aAngle = aCoords.angle < 0 ? aCoords.angle + 2 * Math.PI : aCoords.angle;
    const bAngle = bCoords.angle < 0 ? bCoords.angle + 2 * Math.PI : bCoords.angle;

    return aAngle - bAngle;
  });
}

/**
 * Checks if two chord positions are adjacent in the circle
 * @param {Object} posA - First position with ring and index
 * @param {Object} posB - Second position with ring and index
 * @returns {boolean} True if positions are adjacent
 */
function arePositionsAdjacent(posA, posB) {
  // Same ring, adjacent indices (including wrap-around)
  if (posA.ring === posB.ring) {
    const diff = Math.abs(posA.index - posB.index);
    return diff === 1 || diff === 11; // 11 is the wrap around case (0 and 11 are adjacent)
  }

  // Different rings, same or adjacent indices
  const indexDiff = Math.abs(posA.index - posB.index);
  return indexDiff === 0 || indexDiff === 1 || indexDiff === 11;
}

/**
 * Creates path segments for a complex chord shape (only outlines the perimeter)
 * @param {Array} positions - Array of objects with ring and index properties
 * @param {CanvasRenderingContext2D} ctx - Canvas context for drawing
 * @param {number} centerX - X coordinate of the center
 * @param {number} centerY - Y coordinate of the center
 */
function drawChordComplexShape(positions, ctx, centerX = 190, centerY = 190) {
  if (positions.length < 2) return;

  // Group positions by ring
  const ringGroups = {};
  positions.forEach(pos => {
    if (!ringGroups[pos.ring]) {
      ringGroups[pos.ring] = [];
    }
    ringGroups[pos.ring].push(pos.index);
  });

  // For each ring, identify continuous segments
  const segments = [];

  Object.keys(ringGroups).forEach(ring => {
    const indices = ringGroups[ring].sort((a, b) => a - b);
    let currentSegment = [indices[0]];

    // Identify continuous segments in each ring
    for (let i = 1; i < indices.length; i++) {
      const prev = indices[i - 1];
      const curr = indices[i];

      // Check if indices are adjacent (including wrap around case)
      if (curr - prev === 1 || (curr === 0 && prev === 11)) {
        currentSegment.push(curr);
      } else {
        // Start a new segment
        segments.push({ ring, indices: [...currentSegment] });
        currentSegment = [curr];
      }
    }

    // Add the last segment
    segments.push({ ring, indices: [...currentSegment] });

    // Check if first and last indices form a continuous segment (wrapping around 0)
    if (indices.length > 1 && 
        segments.length > 1 && 
        indices.includes(0) && 
        indices.includes(11)) {

      // Find segments with indices 0 and 11
      const segmentWithZero = segments.find(s => s.ring === ring && s.indices.includes(0));
      const segmentWithEleven = segments.find(s => s.ring === ring && s.indices.includes(11));

      // If they're different segments, merge them
      if (segmentWithZero && segmentWithEleven && segmentWithZero !== segmentWithEleven) {
        segmentWithZero.indices = [...new Set([...segmentWithZero.indices, ...segmentWithEleven.indices])];
        // Remove the old segment
        const idx = segments.indexOf(segmentWithEleven);
        if (idx !== -1) segments.splice(idx, 1);
      }
    }
  });

  // Draw each segment as a curved outline
  ctx.beginPath();

  segments.forEach(segment => {
    const { ring, indices } = segment;

    // Sort indices in clockwise order
    const sortedIndices = [...indices].sort((a, b) => a - b);

    // Get the start and end points
    const startIdx = sortedIndices[0];
    const endIdx = sortedIndices[sortedIndices.length - 1];

    // Calculate arc parameters
    const startAngle = (Math.PI / 2) - (startIdx * (Math.PI / 6));
    const endAngle = (Math.PI / 2) - (endIdx * (Math.PI / 6));
    const radius = ring === RING.MAJOR ? 150 : (ring === RING.MINOR ? 110 : 70);

    // Draw the arc
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, true);
  });

  // Connect segments between rings with straight or curved lines
  // This part is complex and would depend on specific requirements
  // for how to connect segments between different rings

  // For now, we'll just close the path
  ctx.closePath();
}

/**
 * Draw an arc representing a highlighted segment of a ring
 * @param {string} ring - The ring identifier
 * @param {number} startIndex - Start position index
 * @param {number} endIndex - End position index
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 */
function drawRingSegment(ring, startIndex, endIndex, ctx, centerX = 190, centerY = 190) {
  const radius = ring === RING.MAJOR ? 150 : (ring === RING.MINOR ? 110 : 70);

  // Calculate start and end angles (adjust for clockwise drawing)
  let startAngle = (Math.PI / 2) - (startIndex * (Math.PI / 6));
  let endAngle = (Math.PI / 2) - (endIndex * (Math.PI / 6));

  // Ensure we're drawing in the correct direction
  // If endIndex < startIndex, we need to draw through the 0 position
  if (endIndex < startIndex) {
    endAngle -= 2 * Math.PI;  // Subtract 360 degrees to go the long way around
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle, true);
  ctx.stroke();
}

// Export all the functions for use in other modules
export {
  RING,
  CIRCLE_POSITIONS,
  getChordPolarCoordinates,
  polarToCartesian,
  getChordPositionId,
  getChordNameAtPosition,
  findChordPosition,
  createPolygonPoints,
  createPositionCoordinateMap,
  drawChordPolygon,
  sortPositionsClockwise,
  arePositionsAdjacent,
  drawChordComplexShape,
  drawRingSegment
};
