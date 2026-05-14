import type { OpenPath, UnsupportedElement } from '../lib/svgAnalyzer'

interface Props {
  unsupportedElements: UnsupportedElement[]
  openPaths: OpenPath[]
}

function OkBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm font-medium">
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {label}
    </div>
  )
}

export default function UnsupportedList({ unsupportedElements, openPaths }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* Non-path elements */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Non-path elements
        </h3>
        {unsupportedElements.length === 0 ? (
          <OkBadge label="No non-path elements detected" />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold w-10">#</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Tag</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">ID / Label</th>
                </tr>
              </thead>
              <tbody>
                {unsupportedElements.map((el, idx) => (
                  <tr key={`${el.tagName}-${el.id}-${idx}`} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <span className="inline-block bg-amber-100 text-amber-700 rounded px-2 py-0.5 text-xs font-semibold font-mono">
                        &lt;{el.tagName}&gt;
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-800">{el.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Non-closed paths */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Non-closed paths
        </h3>
        {openPaths.length === 0 ? (
          <OkBadge label="No non-closed paths detected" />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold w-10">#</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">ID / Label</th>
                </tr>
              </thead>
              <tbody>
                {openPaths.map((p, idx) => (
                  <tr key={`${p.id}-${idx}`} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono text-gray-800">{p.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
