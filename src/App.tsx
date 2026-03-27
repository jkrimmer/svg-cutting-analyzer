import { useState, useCallback } from 'react'
import FileDropZone from './components/FileDropZone'
import SvgViewer from './components/SvgViewer'
import OverlapTable from './components/OverlapTable'
import { analyzeSVG, type AnalysisResult } from './lib/svgAnalyzer'

type Status = 'idle' | 'analyzing' | 'done' | 'error'

export default function App() {
  const [svgText, setSvgText] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [highlightedPair, setHighlightedPair] = useState<[number, number] | null>(null)
  const [considerClipPaths, setConsiderClipPaths] = useState<boolean>(false)
  const [outlineMode, setOutlineMode] = useState<boolean>(true)

  const runAnalysis = useCallback((text: string, clipPaths: boolean) => {
    setResult(null)
    setHighlightedPair(null)
    setStatus('analyzing')
    setErrorMsg('')

    // Run analysis asynchronously so the UI can repaint first
    setTimeout(() => {
      try {
        const analysis = analyzeSVG(text, { considerClipPaths: clipPaths })
        setResult(analysis)
        setStatus('done')
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    }, 50)
  }, [])

  const handleFile = useCallback((text: string, name: string) => {
    setSvgText(text)
    setFileName(name)
    runAnalysis(text, considerClipPaths)
  }, [considerClipPaths, runAnalysis])

  const handleToggleClipPaths = useCallback((value: boolean) => {
    setConsiderClipPaths(value)
    if (svgText) {
      runAnalysis(svgText, value)
    }
  }, [svgText, runAnalysis])

  const handleReset = () => {
    setSvgText(null)
    setFileName('')
    setResult(null)
    setStatus('idle')
    setErrorMsg('')
    setHighlightedPair(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-xl font-semibold text-gray-800">SVG Overlap Analyzer</h1>
        </div>
        {status !== 'idle' && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← Upload new file
          </button>
        )}
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Upload screen */}
        {status === 'idle' && (
          <div className="max-w-lg mx-auto mt-16">
            <p className="text-gray-500 text-center mb-6">
              Upload an SVG file to detect spatially overlapping outlines.
            </p>
            <FileDropZone onFile={handleFile} />
          </div>
        )}

        {/* Analyzing spinner */}
        {status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center mt-24 gap-4 text-gray-500">
            <svg className="animate-spin w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Analyzing <span className="font-mono text-gray-700">{fileName}</span>…
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="max-w-lg mx-auto mt-16 bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            <p className="font-semibold mb-1">Analysis failed</p>
            <p className="text-sm font-mono">{errorMsg}</p>
          </div>
        )}

        {/* Results */}
        {status === 'done' && svgText && result && (
          <div className="flex flex-col gap-6">
            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-gray-200 px-5 py-3">
              <span className="text-gray-500 text-sm">
                File: <span className="font-mono text-gray-800">{fileName}</span>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500 text-sm">
                Shapes detected: <span className="font-semibold text-gray-800">{result.totalShapes}</span>
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm">
                Overlapping pairs:{' '}
                <span className={`font-semibold ${result.overlaps.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {result.overlaps.length}
                </span>
              </span>
              <span className="text-gray-300">|</span>
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={considerClipPaths}
                  onChange={(e) => handleToggleClipPaths(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                Consider clip paths
              </label>
              <span className="text-gray-300">|</span>
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={outlineMode}
                  onChange={(e) => setOutlineMode(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
                Outline mode
              </label>
            </div>

            {/* Viewer + Table side by side on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4" style={{ minHeight: 400 }}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h2>
                <div style={{ height: 420 }}>
                  <SvgViewer
                    svgText={svgText}
                    overlaps={result.overlaps}
                    highlightedPair={highlightedPair}
                    outlineMode={outlineMode}
                    clipPathShapes={result.clipPathShapes}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Overlapping Pairs
                  {result.overlaps.length > 0 && (
                    <span className="ml-2 text-gray-400 normal-case font-normal text-xs">
                      (hover a row to highlight)
                    </span>
                  )}
                </h2>
                <OverlapTable
                  overlaps={result.overlaps}
                  highlightedPair={highlightedPair}
                  onHover={setHighlightedPair}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}