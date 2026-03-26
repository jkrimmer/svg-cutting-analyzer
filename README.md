# SVG Overlap Analyzer

A browser-based tool that detects spatially overlapping outlines in SVG files.
Drop in an `.svg` file and get an instant visual report of every pair of shapes whose outlines intersect.

---

## Purpose

SVG files often contain layered shapes that unintentionally overlap. This tool uses **paper.js** to parse and normalize every shape in an SVG (including `<rect>`, `<circle>`, `<ellipse>`, `<polygon>`, and complex `<path>` elements), then calls `getIntersections()` on each candidate pair to find exact crossing points. An **R-tree** (via rbush) pre-filters pairs by bounding box so the check scales to large files.

---

## Setup

**Requirements:** Node.js ≥ 18

```bash
git clone https://github.com/jkrimmer/svg-overlap-analyzer.git
cd svg-overlap-analyzer
npm install
```

---

## Usage

Start the development server:

```bash
npm run dev
```

Then open **http://localhost:5173** in your browser.

1. Drag and drop any `.svg` file onto the drop zone (or click to browse).
2. The app parses all shapes, runs the overlap analysis, and shows:
   - A **live SVG preview** with red dots at every intersection point.
   - A **table** of all overlapping shape pairs — hover a row to highlight its intersections in amber.

To build for production:

```bash
npm run build
```

---

## Tests

Run the test suite once:

```bash
npm test
```

Run in watch mode:

```bash
npm run test:watch
```

The tests are in `src/test/svgAnalyzer.test.ts` and cover:

| # | Scenario |
|---|---|
| 1 | Two fully overlapping circles → ≥ 1 overlap, ≥ 2 intersection points |
| 2 | Two non-overlapping circles → 0 overlaps |
| 3 | Two tangent circles → 0 or 1 overlap (tangent point) |
| 4 | Two overlapping rectangles → ≥ 1 overlap |
| 5 | Two non-overlapping rectangles → 0 overlaps |
| 6 | Overlapping rectangle and circle → ≥ 1 overlap |
| 7 | Non-overlapping rectangle and circle → 0 overlaps |
| 8 | Three shapes, two overlapping pairs → exactly 2 overlaps |
| 9 | Empty SVG → 0 shapes, 0 overlaps |
| 10 | Single shape → 0 overlaps |
| 11 | Shapes with explicit `id` attributes → IDs reflected in results |
| 12 | `totalShapes` correctness |

---

## Architecture

```
src/
├── lib/svgAnalyzer.ts          ← core engine: paper.js + rbush
├── components/
│   ├── FileDropZone.tsx        ← drag-and-drop upload
│   ├── SvgViewer.tsx           ← SVG preview + intersection dot overlay
│   └── OverlapTable.tsx        ← table of overlapping pairs
├── App.tsx                     ← application shell
├── main.tsx                    ← React 18 entry point
└── test/
    ├── setup.ts                ← node-canvas polyfill for paper.js in jsdom
    └── svgAnalyzer.test.ts     ← unit tests
```

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · paper.js · rbush · Vitest
