import { useEffect, useRef, useState } from 'react'
import type { OverlapEntry } from '../lib/svgAnalyzer'

interface Props {
  svgText: string
  overlaps: OverlapEntry[]
  highlightedPair: [number, number] | null
}

interface ViewBox {
  x: number
  y: number
  width: number
  height: number
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

export default function SvgViewer({ svgText, overlaps, highlightedPair }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

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

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Original SVG rendered inline */}
      <div
        className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
        dangerouslySetInnerHTML={{ __html: svgText }}
        style={{ lineHeight: 0 }}
      />

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
  )
}
