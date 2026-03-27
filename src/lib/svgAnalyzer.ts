import paper from 'paper'
import RBush from 'rbush'

export interface OverlapEntry {
  shapeAIndex: number
  shapeBIndex: number
  shapeAId: string
  shapeBId: string
  intersectionPoints: { x: number; y: number }[]
}

export interface ClipPathShape {
  /** SVG path data string (in SVG document coordinate space). */
  pathData: string
}

export interface AnalysisResult {
  totalShapes: number
  overlaps: OverlapEntry[]
  /**
   * Clip path shapes collected when `considerClipPaths` is enabled.
   * Each entry holds the SVG path data of one clip mask so that the viewer
   * can render the clip regions visually (e.g. in green).
   */
  clipPathShapes?: ClipPathShape[]
}

export interface AnalysisOptions {
  /**
   * When true, clip paths are applied to shape geometry before overlap
   * detection so that only visually visible (non-clipped) regions are checked.
   * When false (default), clip masks are excluded from the shape list but
   * the full unclipped geometry of each shape is used.
   */
  considerClipPaths?: boolean
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

/**
 * Returns the effectively visible portion of a path by intersecting it with
 * every ancestor clip mask found in the parent hierarchy.
 */
function getEffectivePath(
  path: paper.PathItem,
  scope: paper.PaperScope,
): paper.PathItem {
  const originalName = path.name
  let effectivePath: paper.PathItem = path
  let parent = path.parent

  while (parent) {
    if (
      parent instanceof scope.Group &&
      parent.clipped &&
      parent.firstChild?.clipMask
    ) {
      const clipMask = parent.firstChild as paper.PathItem
      try {
        const clipped = effectivePath.intersect(clipMask) as paper.PathItem
        clipped.name = originalName
        if (effectivePath !== path) effectivePath.remove()
        effectivePath = clipped
      } catch {
        // If intersection fails, keep the current effective path
      }
    }
    parent = parent.parent
  }

  return effectivePath
}

export function analyzeSVG(svgText: string, options: AnalysisOptions = {}): AnalysisResult {
  const { considerClipPaths = false } = options

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

  // Collect visible path items, always excluding clip mask items.
  // Clip mask items (clipMask === true) are invisible shapes used only to
  // define clipping regions — including them causes false overlaps in areas
  // with no visible content.
  //
  // Note: paper.js sometimes keeps shapes inside clip groups as Shape items
  // rather than expanding them to Path items. We explicitly include Shape
  // instances and convert them via toPath() so they participate in
  // intersection testing.
  const collected = root.getItems({
    match: (item: paper.Item) => {
      // 1. Exclude clip masks
      if (item.clipMask) return false

      // 2. Exclude hidden shapes (Inkscape wouldn't show these)
      if (!item.visible) return false

      // 3. CRITICAL: Exclude sub-paths that belong to a CompoundPath.
      // We only want the parent CompoundPath to participate in the intersection test.
      if (item.parent instanceof scope.CompoundPath) return false

      // 4. Match the actual drawing primitives
      return (
        item instanceof scope.Path ||
        item instanceof scope.CompoundPath ||
        item instanceof scope.Shape
      )
    },
  })

  const rawPaths: paper.PathItem[] = []
  for (const item of collected) {
    if (item instanceof scope.Shape) {
      // Convert to a Path (inserted in the same scene position so that the
      // parent hierarchy is preserved for clip-mask resolution).
      const path = (item as paper.Shape).toPath() as paper.PathItem
      rawPaths.push(path)
    } else {
      rawPaths.push(item as paper.PathItem)
    }
  }

  if (rawPaths.length === 0) {
    return { totalShapes: 0, overlaps: [] }
  }

  // When considerClipPaths is true, intersect each shape with its ancestor
  // clip mask(s) so overlap detection only covers visible geometry.
  const paths: paper.PathItem[] = considerClipPaths
    ? rawPaths.map((p) => getEffectivePath(p, scope))
    : rawPaths

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
          shapeAId: shapeLabel(rawPaths[i], i),
          shapeBId: shapeLabel(rawPaths[j], j),
          intersectionPoints: intersections.map((loc) => ({
            x: loc.point.x,
            y: loc.point.y,
          })),
        })
      }
    }
  }

  // When considerClipPaths is enabled, collect each clip mask's geometry so
  // the viewer can render the clipping regions visually (e.g. highlighted in
  // green). Clip mask items are invisible by design, so we must query for them
  // explicitly (they are excluded from `rawPaths` above).
  let clipPathShapes: ClipPathShape[] | undefined
  if (considerClipPaths) {
    const clipMaskItems = root.getItems({
      match: (item: paper.Item) => {
        if (!item.clipMask) return false
        return (
          item instanceof scope.Path ||
          item instanceof scope.CompoundPath ||
          item instanceof scope.Shape
        )
      },
    })
    clipPathShapes = clipMaskItems.map((item) => {
      const isShape = item instanceof scope.Shape
      const pathItem = isShape
        ? (item as paper.Shape).toPath() as paper.PathItem
        : (item as paper.PathItem)
      const pathData = pathItem.pathData
      // Remove the temporary path created by toPath() to avoid leaking it
      // into the Paper.js project.
      if (isShape) pathItem.remove()
      return { pathData }
    })
  }

  return { totalShapes: rawPaths.length, overlaps, clipPathShapes }
}
