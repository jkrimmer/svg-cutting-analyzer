import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClipPathShape, OverlapEntry } from '../lib/svgAnalyzer'

interface Props {
  svgText: string
  overlaps: OverlapEntry[]
  highlightedPair: [number, number] | null
  outlineMode?: boolean
  clipPathShapes?: ClipPathShape[]
}

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

interface Transform {
  zoom: number
  pan: { x: number; y: number }
}

const INITIAL_TRANSFORM: Transform = { zoom: 1, pan: { x: 0, y: 0 } }

const OUTLINE_STYLE = '<style>path, circle, ellipse, rect, polygon, polyline, line, use { fill: none !important; stroke: #374151 !important; stroke-width: 1 !important; }</style>'

/** Injects a viewBox attribute into older SVGs that only declare width/height. */
function ensureViewBox(svgText: string): string {
  if (/\bviewBox=/i.test(svgText)) return svgText
  const wMatch = svgText.match(/\bwidth=["']([0-9.]+)["']/)
  const hMatch = svgText.match(/\bheight=["']([0-9.]+)["']/)
  if (!wMatch || !hMatch) return svgText
  const w = parseFloat(wMatch[1])
  const h = parseFloat(hMatch[1])
  if (isNaN(w) || isNaN(h)) return svgText
  return svgText.replace(/(<svg\b)/, `$1 viewBox="0 0 ${w} ${h}"`)
}

function parseViewBox(svgText: string): ViewBox | null {
  const match = svgText.match(/viewBox=["']([^"']+)["']/)
  if (match) {
    const [x, y, width, height] = match[1].trim().split(/[\s,]+/).map(Number)
    if ([x, y, width, height].every((n) => !isNaN(n))) {
      return { x, y, width, height }
    }
  }
  // Fall back to width/height attributes
  const wMatch = svgText.match(/\bwidth=["']([0-9.]+)["']/)
  const hMatch = svgText.match(/\bheight=["']([0-9.]+)["']/)
  if (wMatch && hMatch) {
    return { x: 0, y: 0, width: parseFloat(wMatch[1]), height: parseFloat(hMatch[1]) }
  }
  return null
}

export default function SvgViewer({ svgText, overlaps, highlightedPair, outlineMode = false, clipPathShapes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [transform, setTransform] = useState<Transform>(INITIAL_TRANSFORM)
  const transformRef = useRef<Transform>(INITIAL_TRANSFORM)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null)

  // Keep transformRef in sync with state so the wheel handler (closed over once) always sees fresh values
  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  // Reset view whenever a new SVG is loaded
  useEffect(() => {
    setTransform(INITIAL_TRANSFORM)
  }, [svgText])

  // ResizeObserver for container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0]
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Non-passive wheel listener so we can call preventDefault and prevent page scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { zoom, pan } = transformRef.current
      const newZoom = Math.max(0.1, Math.min(20, zoom * factor))
      setTransform({
        zoom: newZoom,
        pan: {
          x: cx - (cx - pan.x) * (newZoom / zoom),
          y: cy - (cy - pan.y) * (newZoom / zoom),
        },
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    setIsPanning(true)
    panStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: transformRef.current.pan.x,
      panY: transformRef.current.pan.y,
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !panStart.current) return
    const { panX, panY, mouseX, mouseY } = panStart.current
    setTransform((prev) => ({
      ...prev,
      pan: {
        x: panX + (e.clientX - mouseX),
        y: panY + (e.clientY - mouseY),
      },
    }))
  }, [isPanning])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    panStart.current = null
  }, [])

  const resetView = useCallback(() => {
    setTransform(INITIAL_TRANSFORM)
  }, [])

  const viewBox = parseViewBox(svgText)

  // Compute scale to map SVG coordinates → container pixels
  let scaleX = 1
  let scaleY = 1
  let offsetX = 0
  let offsetY = 0

  if (viewBox && containerSize.width > 0 && containerSize.height > 0) {
    const svgAspect = viewBox.width / viewBox.height
    const containerAspect = containerSize.width / containerSize.height

    if (svgAspect > containerAspect) {
      // Letterboxed top/bottom
      scaleX = containerSize.width / viewBox.width
      scaleY = scaleX
      offsetX = 0
      offsetY = (containerSize.height - viewBox.height * scaleY) / 2
    } else {
      // Letterboxed left/right
      scaleY = containerSize.height / viewBox.height
      scaleX = scaleY
      offsetY = 0
      offsetX = (containerSize.width - viewBox.width * scaleX) / 2
    }
  }

  const toPixel = (x: number, y: number) => ({
    px: (x - (viewBox?.x ?? 0)) * scaleX + offsetX,
    py: (y - (viewBox?.y ?? 0)) * scaleY + offsetY,
  })

  // Step 1: ensure older SVGs (width/height only) have a viewBox so the browser scales them correctly
  const svgWithViewBox = ensureViewBox(svgText)

  // Step 2: in outline mode inject a <style> block that strips fills and shows strokes only
  const processedSvg = outlineMode
    ? svgWithViewBox.replace(/(<svg\b[^>]*>)/, `$1${OUTLINE_STYLE}`)
    : svgWithViewBox

  // Collect highlighted intersection points
  const highlightedPoints =
    highlightedPair !== null
      ? overlaps
        .filter(
          (o) =>
            o.shapeAIndex === highlightedPair[0] &&
            o.shapeBIndex === highlightedPair[1],
        )
        .flatMap((o) => o.intersectionPoints)
      : []

  const highlightedSet = new Set(
    highlightedPoints.map((p) => `${p.x},${p.y}`),
  )

  const isTransformed = transform.zoom !== 1 || transform.pan.x !== 0 || transform.pan.y !== 0

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      {/* Transform wrapper for zoom/pan */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${transform.pan.x}px, ${transform.pan.y}px) scale(${transform.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Original SVG rendered inline */}
        <div
          className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: processedSvg }}
          style={{ lineHeight: 0 }}
        />

        {/* Overlay SVG for clip path shapes (green) when considerClipPaths is enabled */}
        {containerSize.width > 0 && clipPathShapes && clipPathShapes.length > 0 && viewBox && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={containerSize.width}
            height={containerSize.height}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {clipPathShapes.map((shape, idx) => (
              <path
                key={`clip-${idx}-${shape.pathData.slice(0, 32)}`}
                d={shape.pathData}
                fill="none"
                stroke="#16a34a"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        )}

        {/* Overlay SVG for intersection circles */}
        {containerSize.width > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={containerSize.width}
            height={containerSize.height}
          >
            {overlaps.flatMap((entry) =>
              entry.intersectionPoints.map((pt, idx) => {
                const key = `${pt.x},${pt.y}`
                const isHighlighted = highlightedSet.has(key)
                const isDimmed = highlightedPair !== null && !isHighlighted
                const { px, py } = toPixel(pt.x, pt.y)
                return (
                  <circle
                    key={`${entry.shapeAIndex}-${entry.shapeBIndex}-${idx}`}
                    cx={px}
                    cy={py}
                    r={isHighlighted ? 8 : 6}
                    fill={isHighlighted ? '#f59e0b' : '#ef4444'}
                    fillOpacity={isDimmed ? 0.25 : 0.6}
                    stroke={isHighlighted ? '#d97706' : '#b91c1c'}
                    strokeWidth={1.5}
                  />
                )
              }),
            )}
          </svg>
        )}
      </div>

      {/* Reset view button — only visible when the view has been transformed */}
      {isTransformed && (
        <button
          className="absolute bottom-2 right-2 z-10 bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 shadow-sm"
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
          onClick={resetView}
        >
          Reset view
        </button>
      )}
    </div>
  )
}
