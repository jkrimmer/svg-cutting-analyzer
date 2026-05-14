import { describe, it, expect } from 'vitest'
import { analyzeSVG } from '../lib/svgAnalyzer'

/** Wraps shape markup in a minimal SVG document */
function makeSVG(shapes: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">${shapes.join('')}</svg>`
}

// ---------------------------------------------------------------------------
// 1. Two fully overlapping circles (concentric, same radius)
// ---------------------------------------------------------------------------
describe('two fully overlapping circles', () => {
  it('reports ≥ 1 overlap entry with ≥ 2 intersection points', () => {
    const svg = makeSVG([
      '<circle cx="100" cy="100" r="40" fill="none" stroke="black"/>',
      '<circle cx="120" cy="100" r="40" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBeGreaterThanOrEqual(1)
    expect(result.overlaps[0].intersectionPoints.length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// 2. Two non-overlapping circles (far apart)
// ---------------------------------------------------------------------------
describe('two non-overlapping circles', () => {
  it('reports 0 overlaps', () => {
    const svg = makeSVG([
      '<circle cx="30" cy="100" r="20" fill="none" stroke="black"/>',
      '<circle cx="170" cy="100" r="20" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Two tangent circles (touching at exactly one point)
// ---------------------------------------------------------------------------
describe('two tangent circles', () => {
  it('reports 0 or 1 overlap entries (tangent behaviour)', () => {
    // Circles touch at exactly (100, 100): centres at (80,100) r=20 and (120,100) r=20
    const svg = makeSVG([
      '<circle cx="80" cy="100" r="20" fill="none" stroke="black"/>',
      '<circle cx="120" cy="100" r="20" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    // Tangent detection is numerically sensitive; accept 0 or 1
    expect(result.overlaps.length).toBeLessThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 4. Two overlapping rectangles
// ---------------------------------------------------------------------------
describe('two overlapping rectangles', () => {
  it('reports ≥ 1 overlap entry', () => {
    const svg = makeSVG([
      '<rect x="30" y="30" width="80" height="80" fill="none" stroke="black"/>',
      '<rect x="80" y="80" width="80" height="80" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 5. Two non-overlapping rectangles
// ---------------------------------------------------------------------------
describe('two non-overlapping rectangles', () => {
  it('reports 0 overlaps', () => {
    const svg = makeSVG([
      '<rect x="10" y="10" width="50" height="50" fill="none" stroke="black"/>',
      '<rect x="140" y="140" width="50" height="50" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. A rectangle and a circle that overlap
// ---------------------------------------------------------------------------
describe('overlapping rectangle and circle', () => {
  it('reports ≥ 1 overlap entry', () => {
    const svg = makeSVG([
      '<rect x="60" y="60" width="80" height="80" fill="none" stroke="black"/>',
      '<circle cx="100" cy="100" r="50" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// 7. A rectangle and a circle that do NOT overlap
// ---------------------------------------------------------------------------
describe('non-overlapping rectangle and circle', () => {
  it('reports 0 overlaps', () => {
    const svg = makeSVG([
      '<rect x="10" y="10" width="40" height="40" fill="none" stroke="black"/>',
      '<circle cx="160" cy="160" r="20" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 8. Three shapes where two pairs overlap
// ---------------------------------------------------------------------------
describe('three shapes, two overlapping pairs', () => {
  it('reports exactly 2 overlap entries', () => {
    // Shape A overlaps Shape B; Shape B overlaps Shape C; A and C do not touch.
    const svg = makeSVG([
      '<rect x="10" y="10" width="80" height="80" fill="none" stroke="black"/>',   // A: 10-90
      '<rect x="60" y="10" width="80" height="80" fill="none" stroke="black"/>',   // B: 60-140, overlaps A
      '<rect x="130" y="10" width="50" height="80" fill="none" stroke="black"/>',  // C: 130-180, overlaps B
    ])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// 9. Empty SVG
// ---------------------------------------------------------------------------
describe('empty SVG', () => {
  it('returns totalShapes === 0 and no overlaps', () => {
    const result = analyzeSVG('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    expect(result.totalShapes).toBe(0)
    expect(result.overlaps.length).toBe(0)
    expect(result.populatedWidth).toBe(0)
    expect(result.populatedHeight).toBe(0)
    expect(result.totalOutlineLength).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 10. Single shape — nothing to compare against
// ---------------------------------------------------------------------------
describe('SVG with a single shape', () => {
  it('reports 0 overlaps', () => {
    const svg = makeSVG(['<circle cx="100" cy="100" r="40" fill="none" stroke="black"/>'])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 11. Shapes with explicit id attributes
// ---------------------------------------------------------------------------
describe('shapes with explicit id attributes', () => {
  it('returns shapeAId / shapeBId matching the SVG ids', () => {
    const svg = makeSVG([
      '<circle id="alpha" cx="80" cy="100" r="40" fill="none" stroke="black"/>',
      '<circle id="beta" cx="120" cy="100" r="40" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    expect(result.overlaps.length).toBeGreaterThanOrEqual(1)
    const entry = result.overlaps[0]
    // paper.js maps the SVG id attribute to item.name
    expect(entry.shapeAId).toBe('alpha')
    expect(entry.shapeBId).toBe('beta')
  })
})

// ---------------------------------------------------------------------------
// 12. totalShapes correctness
// ---------------------------------------------------------------------------
describe('totalShapes correctness', () => {
  it('equals the number of shape elements in the SVG', () => {
    const svg = makeSVG([
      '<circle cx="40" cy="40" r="20" fill="none" stroke="black"/>',
      '<rect x="80" y="80" width="40" height="40" fill="none" stroke="black"/>',
      '<circle cx="160" cy="160" r="20" fill="none" stroke="black"/>',
    ])
    const result = analyzeSVG(svg)
    expect(result.totalShapes).toBe(3)
    // Shapes span x=[20,180] and y=[20,180] in SVG user units (CSS px at 96 DPI).
    // Expected in mm: 160 px × (25.4/96) ≈ 42.33 mm.
    expect(result.populatedWidth).toBeCloseTo(160 * (25.4 / 96), 1)
    expect(result.populatedHeight).toBeCloseTo(160 * (25.4 / 96), 1)
    expect(result.totalOutlineLength).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 13. Clip mask items are excluded from shape analysis (bug fix)
//     A clipPath's inner path has clipMask=true and must not be counted or
//     matched as a regular shape — it has no visible content.
// ---------------------------------------------------------------------------
describe('SVG with clipPath — clip mask items are excluded', () => {
  it('does not include clip mask paths in totalShapes or as overlap candidates', () => {
    // One visible circle clipped by a rect, plus one separate circle.
    // The clip rect lives inside <defs><clipPath> and must NOT appear as a
    // shape, so totalShapes should be 2 and the two visible circles should
    // be the only candidates.
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <defs>
          <clipPath id="clip1">
            <rect x="0" y="0" width="100" height="200"/>
          </clipPath>
        </defs>
        <circle id="clipped-circle" cx="100" cy="100" r="60" clip-path="url(#clip1)" fill="none" stroke="black"/>
        <circle id="other-circle" cx="150" cy="100" r="20" fill="none" stroke="black"/>
      </svg>`
    const result = analyzeSVG(svg)
    // Only the two visible circles should be counted; the clipPath rect must be excluded.
    expect(result.totalShapes).toBe(2)
    // Both shape IDs should match the explicit SVG ids, not auto-generated names,
    // confirming that no stray clip mask path was included in the analysis.
    const allIds = result.overlaps.flatMap((o) => [o.shapeAId, o.shapeBId])
    const uniqueIds = [...new Set(allIds)]
    expect(uniqueIds.every((id) => id === 'clipped-circle' || id === 'other-circle')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 14. considerClipPaths option
//     A circle clipped to the left half (x < 80) should not overlap a shape
//     placed entirely in the clipped (invisible) right region when clip paths
//     are considered, but should when they are not.
//
//     Geometry: circle cx=100 cy=100 r=60  →  full bounds x=[40,160]
//               clip rect x=[0,80] keeps only the left arc.
//               target rect x=[140,180] y=[85,115] straddles the right side
//               of the unclipped circle boundary (circle at y=85/115 is at
//               x≈158) so the two outlines DO intersect when unclipped.
// ---------------------------------------------------------------------------
describe('considerClipPaths option', () => {
  it('with considerClipPaths=false reports overlap in unclipped geometry', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <defs>
          <clipPath id="clip2">
            <rect x="0" y="0" width="80" height="200"/>
          </clipPath>
        </defs>
        <circle id="big-circle" cx="100" cy="100" r="60" clip-path="url(#clip2)" fill="none" stroke="black"/>
        <rect id="far-rect" x="140" y="85" width="40" height="30" fill="none" stroke="black"/>
      </svg>`
    const resultFull = analyzeSVG(svg, { considerClipPaths: false })
    // Full circle extends to x≈160 and crosses the rect outline (rect left edge is inside circle,
    // rect right edge is outside → circle outline intersects rect's top/bottom edges).
    expect(resultFull.overlaps.length).toBeGreaterThanOrEqual(1)
  })

  it('with considerClipPaths=true reports no overlap outside the clipped region', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <defs>
          <clipPath id="clip3">
            <rect x="0" y="0" width="80" height="200"/>
          </clipPath>
        </defs>
        <circle id="big-circle" cx="100" cy="100" r="60" clip-path="url(#clip3)" fill="none" stroke="black"/>
        <rect id="far-rect" x="140" y="85" width="40" height="30" fill="none" stroke="black"/>
      </svg>`
    const resultClipped = analyzeSVG(svg, { considerClipPaths: true })
    // After applying the clip, the circle only occupies x<80, so no overlap with rect at x=140.
    expect(resultClipped.overlaps.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 15. SVG with explicit mm width + viewBox — dimension conversion correctness
//     The SVG viewport is declared as 100mm wide with a 200-unit viewBox.
//     A rect fills the left half of the viewBox (100 user units = 50 mm).
// ---------------------------------------------------------------------------
describe('SVG dimension unit conversion (mm width + viewBox)', () => {
  it('reports populatedWidth in mm, not raw user units', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 200 200">
      <rect x="0" y="0" width="100" height="200" fill="none" stroke="black"/>
    </svg>`
    const result = analyzeSVG(svg)
    // 100 viewBox units / 200 viewBox total = 50 mm of the 100 mm viewport
    expect(result.populatedWidth).toBeCloseTo(50, 1)
    // Full height: 200 viewBox units = 100 mm
    expect(result.populatedHeight).toBeCloseTo(100, 1)
    expect(result.totalOutlineLength).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 16. Unsupported elements: non-path graphical elements are detected
// ---------------------------------------------------------------------------
describe('unsupportedElements — non-path elements are listed', () => {
  it('flags circle, rect, and text elements with correct tagName and id', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <circle id="my-circle" cx="50" cy="50" r="20"/>
      <rect id="my-rect" x="80" y="80" width="40" height="40"/>
      <text id="my-text" x="10" y="10">Hello</text>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.unsupportedElements.length).toBe(3)
    expect(result.unsupportedElements.find((e) => e.tagName === 'circle')?.id).toBe('my-circle')
    expect(result.unsupportedElements.find((e) => e.tagName === 'rect')?.id).toBe('my-rect')
    expect(result.unsupportedElements.find((e) => e.tagName === 'text')?.id).toBe('my-text')
  })

  it('auto-generates labels when elements have no id attribute', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <circle cx="50" cy="50" r="20"/>
      <circle cx="100" cy="100" r="20"/>
      <rect x="10" y="10" width="30" height="30"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.unsupportedElements.length).toBe(3)
    expect(result.unsupportedElements[0]).toEqual({ id: 'circle-1', tagName: 'circle' })
    expect(result.unsupportedElements[1]).toEqual({ id: 'circle-2', tagName: 'circle' })
    expect(result.unsupportedElements[2]).toEqual({ id: 'rect-1', tagName: 'rect' })
  })
})

// ---------------------------------------------------------------------------
// 17. Unsupported elements: pure-path SVGs produce an empty list
// ---------------------------------------------------------------------------
describe('unsupportedElements — path-only SVG returns empty list', () => {
  it('returns [] when all shapes are <path> elements', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <path id="p1" d="M 10,10 L 90,10 L 90,90 L 10,90 Z"/>
      <path id="p2" d="M 110,10 L 190,10 L 190,90 Z"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.unsupportedElements).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 18. Unsupported elements: elements inside <defs> are excluded
// ---------------------------------------------------------------------------
describe('unsupportedElements — elements inside <defs> are excluded', () => {
  it('does not flag a <rect> that lives inside <defs>', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <defs>
        <rect id="template" x="0" y="0" width="50" height="50"/>
      </defs>
      <path d="M 10,10 L 50,10 Z"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.unsupportedElements).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 19. Unsupported elements: hidden elements are excluded
// ---------------------------------------------------------------------------
describe('unsupportedElements — hidden elements are excluded', () => {
  it('does not flag a circle with display="none"', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <circle id="hidden" cx="50" cy="50" r="20" display="none"/>
      <circle id="visible" cx="100" cy="100" r="20"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.unsupportedElements.length).toBe(1)
    expect(result.unsupportedElements[0].id).toBe('visible')
  })

  it('does not flag elements inside a hidden group', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <g display="none">
        <circle cx="50" cy="50" r="20"/>
        <rect x="10" y="10" width="30" height="30"/>
      </g>
      <circle id="shown" cx="150" cy="150" r="10"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.unsupportedElements.length).toBe(1)
    expect(result.unsupportedElements[0].id).toBe('shown')
  })
})

// ---------------------------------------------------------------------------
// 20. openPaths: open <path> elements are detected
// ---------------------------------------------------------------------------
describe('openPaths — open path elements are listed', () => {
  it('flags a <path> with no Z command', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <path id="open-line" d="M 0,0 L 50,50"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.openPaths.length).toBe(1)
    expect(result.openPaths[0].id).toBe('open-line')
  })

  it('auto-generates id label when <path> has no id attribute', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <path d="M 0,0 L 50,50"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.openPaths.length).toBe(1)
    expect(result.openPaths[0].id).toBe('path-1')
  })
})

// ---------------------------------------------------------------------------
// 21. openPaths: closed <path> elements are NOT flagged
// ---------------------------------------------------------------------------
describe('openPaths — closed path elements are not flagged', () => {
  it('returns [] for a <path> that ends with Z', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <path id="closed" d="M 10,10 L 90,10 L 90,90 L 10,90 Z"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.openPaths).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 22. openPaths: compound path with an open sub-path is flagged
// ---------------------------------------------------------------------------
describe('openPaths — compound path with open sub-path', () => {
  it('flags a <path> whose second sub-path is not closed', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <path id="mixed" d="M 0,0 L 50,0 Z M 100,100 L 150,100"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.openPaths.length).toBe(1)
    expect(result.openPaths[0].id).toBe('mixed')
  })

  it('does not flag a <path> where every sub-path is closed', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <path id="all-closed" d="M 0,0 L 50,0 L 50,50 Z M 100,100 L 150,100 L 150,150 Z"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.openPaths).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 23. <polygon> appears in unsupportedElements but NOT in openPaths
// ---------------------------------------------------------------------------
describe('<polygon> is flagged as unsupported but not as open path', () => {
  it('polygon is in unsupportedElements and openPaths is empty', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <polygon id="tri" points="100,10 190,190 10,190"/>
    </svg>`
    const result = analyzeSVG(svg)
    expect(result.unsupportedElements.length).toBe(1)
    expect(result.unsupportedElements[0].tagName).toBe('polygon')
    expect(result.openPaths).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 24. Empty SVG: both new lists are empty arrays
// ---------------------------------------------------------------------------
describe('empty SVG — unsupportedElements and openPaths are empty', () => {
  it('returns empty arrays for both diagnostic lists', () => {
    const result = analyzeSVG('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    expect(result.unsupportedElements).toEqual([])
    expect(result.openPaths).toEqual([])
  })
})
