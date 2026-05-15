# SVG Cutting Analyzer

A browser-based tool for verifying the readiness of an SVG file for use with a cutting plotter.
Drop in an `.svg` file and get an instant report covering shape dimensions, total outline length, estimated cutting time, and any overlapping outlines that would cause issues on the plotter.

---

## Purpose

Before sending an SVG to a cutting plotter, several properties of the file need to be checked:

- **Populated dimensions** — the bounding box of all shapes must fit within the machine bed.
- **Total outline length** — the combined path length of all shapes determines how long a job will take.
- **Estimated cutting time** — calculated from the total outline length and a configurable cutting velocity.
- **Overlapping outlines** — shapes whose outlines intersect each other cause the plotter to cut the same material twice, which can damage tooling or the workpiece.
- **Clip path regions** — optionally constrain overlap detection to only the visible (non-clipped) area of each shape.

This tool uses **paper.js** to parse and normalize every shape in an SVG (including `<rect>`, `<circle>`, `<ellipse>`, `<polygon>`, and complex `<path>` elements). An **R-tree** (via rbush) pre-filters shape pairs by bounding box before the exact `getIntersections()` check, so the analysis scales to large files.

---

## Setup

**Requirements:** Node.js ≥ 18

```bash
git clone https://github.com/jkrimmer/svg-cutting-analyzer.git
cd svg-cutting-analyzer
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
2. The app parses all shapes and displays:
   - **Populated width / height** — the bounding box of all shapes in millimetres, with a warning when both dimensions exceed the 460 mm machine bed limit.
   - **Total outline length** — the sum of all path lengths in millimetres.
   - **Estimated cutting time** — enter your plotter's cutting velocity (mm/s) to get a time estimate.
   - **Live SVG preview** — with red dots at every intersection point; toggle *Outline mode* to see bare outlines without fills and use *Overwrite stroke opacity* (enabled by default) to force path stroke opacity to `1`.
   - **Overlapping pairs table** — every pair of shapes whose outlines intersect; hover a row to highlight that pair's intersections in amber.
3. Use the **Consider clip paths** toggle to restrict overlap detection to the visually visible (non-clipped) region of each shape. Clip regions are then shown in the preview.

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
├── lib/svgAnalyzer.ts          ← core engine: paper.js + rbush; computes dimensions, outline length, and overlaps
├── components/
│   ├── FileDropZone.tsx        ← drag-and-drop upload
│   ├── SvgViewer.tsx           ← SVG preview + intersection dot overlay + clip region display
│   └── OverlapTable.tsx        ← table of overlapping pairs
├── App.tsx                     ← application shell; cutting velocity input and time estimate
├── main.tsx                    ← React 18 entry point
└── test/
    ├── setup.ts                ← node-canvas polyfill for paper.js in jsdom
    └── svgAnalyzer.test.ts     ← unit tests
```

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · paper.js · rbush · Vitest
