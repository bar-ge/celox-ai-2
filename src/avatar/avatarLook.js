// TCEL-069 — geometry and per-state looks for the explorer mascot.
// Kept out of AvatarMascot.jsx so that file only exports a component
// (react-refresh/only-export-components).
//
// Every number here was measured off src/avatar/assets/explorer.webp.
// If the artwork is ever re-exported at a different crop, re-measure —
// do not nudge these by eye.

export const ART_W = 741
export const ART_H = 815

// viewBox windows onto the same file — no second asset to download.
export const FRAME = {
  full: `0 0 ${ART_W} ${ART_H}`,
  head: '210 -8 380 350',   // helmet, slightly wide — for the panel header
  bust: '213 -19 372 372',  // square — for circular containers
}

// Below this height the full figure's helmet drops under ~12px and the
// eyes stop reading, so the mascot swaps itself to the head crop.
export const HEAD_CROP_BELOW = 72

export const EYE_L = { x: 416, y: 201, r: 40 }
export const EYE_R = { x: 518, y: 200, r: 33 }
export const VISOR = { cx: 445, cy: 202, rx: 102, ry: 69 }

export const STATE_LOOK = {
  idle:       { eye: '#4FD8FF', opacity: 0.86, face: 'wink' },
  onboarding: { eye: '#7FE3FF', opacity: 1,    face: 'open',    sparkle: true },
  qa:         { eye: '#4FD8FF', opacity: 1,    face: 'open' },
  navigating: { eye: '#4FD8FF', opacity: 1,    face: 'chevron' },
  escalating: { eye: '#FF7A6E', opacity: 1,    face: 'narrow' },
  success:    { eye: '#6BE3AC', opacity: 1,    face: 'happy' },
  confused:   { eye: '#FFC14D', opacity: 0.95, face: 'lost',    query: true },
}
