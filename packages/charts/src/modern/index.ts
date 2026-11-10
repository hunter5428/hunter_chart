import { circle, esc, line, liveCss, liveOf, rect, textWidth } from "../chart.ts"
import { orangeGray } from "../theme.ts"
import { label, paletteOf, showWith } from "./core.ts"
import type { Ctx, Key, ModernSpec, ModernType } from "./core.ts"
import { bar, butterfly, combo, diverging, dumbbell, lollipop, pareto, radar, rangeBar, slope, tornado, waterfall } from "./compare.ts"
import { chord, funnel, sankey, tree } from "./flow.ts"
import { bullet, gauge, radialBar, stat } from "./kpi.ts"
import { bubble, heatmap, parallel, scatter } from "./relation.ts"
import { marimekko, pie, segmented, sunburst, treemap, waffle } from "./share.ts"
import { beeswarm, box, histogram, ridgeline } from "./spread.ts"
import { area, bump, calendar, candlestick, lineChart, skyline, sparkline, stream } from "./trend.ts"

const renderers: Record<ModernType, (c: Ctx) => string> = {
  pie,
  donut: pie,
  waffle,
  marimekko,
  segmented,
  treemap,
  sunburst,
  funnel,
  sankey,
  chord,
  tree,
  bar,
  waterfall,
  pareto,
  radar,
  slope,
  dumbbell,
  lollipop,
  combo,
  diverging,
  butterfly,
  tornado,
  rangeBar,
  line: lineChart,
  area,
  stream,
  sparkline,
  calendar,
  bump,
  candlestick,
  skyline,
  box,
  beeswarm,
  ridgeline,
  histogram,
  heatmap,
  bubble,
  scatter,
  parallel,
  gauge,
  bullet,
  radialBar,
  stat,
}

function legendRow(keys: readonly Key[], right: number, y: number, color: string): string {
  let x = right - keys.reduce((sum, key) => sum + (key.mark === "line" ? 16 : 10) + 6 + textWidth(key.label, 11) + 14, -14)
  let out = ""

  for (const key of keys) {
    const swatch = key.mark === "line" ? 16 : 10

    if (key.mark === "line") out += line(x, y, x + 16, y, key.color, 2)
    else if (key.mark === "dot") out += circle(x + 5, y, 4, key.color)
    else out += rect(x, y - 5, 10, 10, key.color, { rx: 2 })
    out += label(x + swatch + 6, y, key.label, color, { mid: true })
    x += swatch + 6 + textWidth(key.label, 11) + 14
  }

  return out
}

export function modernSvg(spec: ModernSpec): string {
  const theme = spec.theme ?? orangeGray
  const pal = paletteOf(theme)
  const width = spec.width ?? 640
  const height = spec.height ?? 400
  const top = spec.title ? (spec.subtitle ? 74 : 54) : 34
  const keys: Key[] = []

  const body = renderers[spec.type]({
    ...liveOf(spec),
    spec,
    pal,
    box: { x: 24, y: top, w: width - 48, h: height - top - (spec.takeaway ? 52 : 22) },
    unit: spec.unit ?? "",
    show: showWith(theme, spec.digits),
    legend: (items) => keys.push(...items),
  })

  const name = esc(spec.title || "차트")
  let head = ""

  if (spec.title) head += label(24, 37, spec.title, pal.text, { size: 17, bold: true })

  if (spec.subtitle) head += label(24, 57, spec.subtitle, pal.muted, { size: 12 })

  if (keys.length) {
    // 범례는 제목 줄 오른쪽에 둔다. 제목과 겹치면 부제 줄로 내린다.
    const wide = keys.reduce((sum, key) => sum + 30 + textWidth(key.label, 11), 0)
    const beside = 24 + textWidth(spec.title ?? "", 17) + 16 + wide <= width - 24
    head += legendRow(keys, width - 24, !spec.title ? 18 : beside || !spec.subtitle ? 31 : 53, pal.muted)
  }

  return [
    // 루트 title은 브라우저 기본 툴팁으로 떠서 data-tip 툴팁과 겹치므로 화면용은 aria-label로 이름을 준다.
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"${spec.live ? ` aria-label="${name}"` : ""}>`,
    spec.live ? "" : `<title>${name}</title>`,
    spec.takeaway ? `<desc>${esc(spec.takeaway)}</desc>` : "",
    `<style>text{font-family:${theme.font}}${spec.live ? liveCss : ""}</style>`,
    rect(0.5, 0.5, width - 1, height - 1, "#FFFFFF", { rx: 18, stroke: pal.line }),
    head,
    body,
    spec.takeaway ? label(24, height - 24, spec.takeaway, pal.text, { size: 14, bold: true }) : "",
    "</svg>",
  ].join("")
}
