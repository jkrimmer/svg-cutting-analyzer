import type { OverlapEntry } from '../lib/svgAnalyzer'

interface Props {
  overlaps: OverlapEntry[]
  highlightedPair: [number, number] | null
  onHover: (pair: [number, number] | null) => void
}

export default function OverlapTable({ overlaps, highlightedPair, onHover }: Props) {
  if (overlaps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm font-medium">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        No overlapping outlines detected
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-gray-500 font-semibold w-10">#</th>
            <th className="text-left py-2 px-3 text-gray-500 font-semibold">Shape A</th>
            <th className="text-left py-2 px-3 text-gray-500 font-semibold">Shape B</th>
            <th className="text-right py-2 px-3 text-gray-500 font-semibold">Intersections</th>
          </tr>
        </thead>
        <tbody>
          {overlaps.map((entry, idx) => {
            const isHighlighted =
              highlightedPair !== null &&
              highlightedPair[0] === entry.shapeAIndex &&
              highlightedPair[1] === entry.shapeBIndex

            return (
              <tr
                key={`${entry.shapeAIndex}-${entry.shapeBIndex}`}
                className={`border-b border-gray-100 cursor-default transition-colors ${
                  isHighlighted ? 'bg-amber-50' : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => onHover([entry.shapeAIndex, entry.shapeBIndex])}
                onMouseLeave={() => onHover(null)}
              >
                <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                <td className="py-2 px-3 font-mono text-gray-800">{entry.shapeAId}</td>
                <td className="py-2 px-3 font-mono text-gray-800">{entry.shapeBId}</td>
                <td className="py-2 px-3 text-right">
                  <span className="inline-block bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs font-semibold">
                    {entry.intersectionPoints.length}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
