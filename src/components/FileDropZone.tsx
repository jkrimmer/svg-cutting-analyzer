import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface Props {
  onFile: (svgText: string, fileName: string) => void
}

export default function FileDropZone({ onFile }: Props) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: { file: File }[]) => {
      setError(null)

      if (rejectedFiles.length > 0) {
        setError('Only .svg files are accepted.')
        return
      }

      const file = acceptedFiles[0]
      if (!file) return

      if (!file.name.toLowerCase().endsWith('.svg')) {
        setError('Only .svg files are accepted.')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result
        if (typeof text === 'string') {
          onFile(text, file.name)
        }
      }
      reader.readAsText(file)
    },
    [onFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/svg+xml': ['.svg'] },
    multiple: false,
  })

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13.5l3-3m0 0l3 3m-3-3v7.5M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.076 11.094"
          />
        </svg>
        <div className="text-center">
          <p className="text-gray-700 font-medium">
            {isDragActive ? 'Drop the SVG here…' : 'Drag & drop an SVG file'}
          </p>
          <p className="text-sm text-gray-400 mt-1">or click to browse</p>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
