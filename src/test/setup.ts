// Minimal canvas mock so paper.js can initialise in the jsdom/vitest test
// environment without requiring native binaries (e.g. the `canvas` npm package).
// paper.js only calls `setup(canvas)` to bind a rendering context; all geometric
// computations (getIntersections, bounds, etc.) are pure JS and don't depend on
// actual pixel rendering.
//
// Strategy: return a real jsdom HTMLCanvasElement (which has all DOM methods),
// but override getContext() to return a no-op 2D context so paper.js initialises
// without throwing.

const noop = () => {}

function makeContext2D(canvas: HTMLCanvasElement) {
  return {
    canvas,
    save: noop, restore: noop,
    translate: noop, scale: noop, rotate: noop,
    transform: noop, setTransform: noop, resetTransform: noop,
    beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, arcTo: noop,
    bezierCurveTo: noop, quadraticCurveTo: noop,
    rect: noop, ellipse: noop,
    fill: noop, stroke: noop, clip: noop,
    clearRect: noop, fillRect: noop, strokeRect: noop,
    drawImage: noop,
    fillText: noop, strokeText: noop,
    measureText: () => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0,
      actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0,
      fontBoundingBoxAscent: 0, fontBoundingBoxDescent: 0 }),
    createImageData: (_w: number, _h: number) => ({ data: new Uint8ClampedArray(0), width: _w ?? 0, height: _h ?? 0 }),
    getImageData: (_x: number, _y: number, _w: number, _h: number) => ({ data: new Uint8ClampedArray(_w * _h * 4), width: _w, height: _h }),
    putImageData: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    setLineDash: noop, getLineDash: () => [] as number[],
    isPointInPath: () => false, isPointInStroke: () => false,
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    shadowBlur: 0, shadowColor: '', shadowOffsetX: 0, shadowOffsetY: 0,
    font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic',
    imageSmoothingEnabled: true, lineDashOffset: 0,
    direction: 'ltr', filter: 'none',
  } as unknown as CanvasRenderingContext2D
}

if (typeof document !== 'undefined') {
  const origCreateElement = document.createElement.bind(document)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(document as any).createElement = (tag: string, options?: ElementCreationOptions) => {
    const el = origCreateElement(tag, options)
    if (tag === 'canvas') {
      const canvas = el as HTMLCanvasElement
      const ctx = makeContext2D(canvas)
      canvas.getContext = (_type: string) => ctx as unknown as null
      return canvas
    }
    return el
  }
}
