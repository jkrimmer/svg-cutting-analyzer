import paper from 'paper'
import RBush from 'rbush'

export interface OverlapEntry {
  shapeAIndex: number
  shapeBIndex: number
  shapeAId: string
  shapeBId: string
  intersectionPoints: { x: number; y: number }[]
}

export interface AnalysisResult {
  totalShapes: number
  overlaps: OverlapEntry[]
}

interface BBoxItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  index: number
}

function shapeLabel(item: paper.PathItem, index: number): string {
  if (item.name && item.name.trim() !== '') return item.name.trim()
  const dataId = (item as unknown as { data?: { id?: string } }).data?.id
  if (dataId && dataId.trim() !== '') return dataId.trim()
  return `shape-${index + 1}`
}

export function analyzeSVG(svgText: string): AnalysisResult {
  const canvas = document.createElement('canvas')
  const scope = new paper.PaperScope()
  scope.setup(canvas)

  const root = scope.project.importSVG(svgText, {
    expandShapes: true,
    insert: true,
  })

  if (!root) {
    throw new Error('Failed to parse SVG — the file may be empty or malformed.')
  }

  const paths: paper.PathItem[] = []
  root
    .getItems({
      match: (item: paper.Item) =>
        item instanceof scope.Path || item instanceof scope.CompoundPath,
    })
    .forEach((item) => paths.push(item as paper.PathItem))

  if (paths.length === 0) {
    return { totalShapes: 0, overlaps: [] }
  }

  const tree = new RBush<BBoxItem>()
  const boxes: BBoxItem[] = paths.map((p, i) => {
    const b = p.bounds
    return { minX: b.left, minY: b.top, maxX: b.right, maxY: b.bottom, index: i }
  })
  tree.load(boxes)

  const overlaps: OverlapEntry[] = []
  const seen = new Set<string>()

  for (let i = 0; i < paths.length; i++) {
    const candidates = tree.search(boxes[i])
    for (const candidate of candidates) {
      const j = candidate.index
      if (j <= i) continue
      const key = `${i}:${j}`
      if (seen.has(key)) continue
      seen.add(key)

      let intersections: paper.CurveLocation[] = []
      try {
        intersections = paths[i].getIntersections(paths[j])
      } catch {
        continue
      }

      if (intersections.length > 0) {
        overlaps.push({
          shapeAIndex: i,
          shapeBIndex: j,
          shapeAId: shapeLabel(paths[i], i),
          shapeBId: shapeLabel(paths[j], j),
          intersectionPoints: intersections.map((loc) => ({
            x: loc.point.x,
            y: loc.point.y,
          })),
        })
      }
    }
  }

  return { totalShapes: paths.length, overlaps }
}
