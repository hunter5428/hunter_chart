import { formatTick, formatValue, inferDigits, inkOn, mix } from "./format.ts"
import { orangeGray } from "./theme.ts"
import type { Theme, Tone } from "./theme.ts"

export type SeriesMark = "bar" | "line" | "dot" | "mean" | "area" | "ribbon" | "whisker"

export type Series = {
  name: string
  values: readonly (number | null)[]
  low?: readonly (number | null)[]
  // strip 전용. 범주마다 관측값 목록을 주고, values에는 평균을 둔다.
  spread?: readonly (readonly number[])[]
  axis?: "left" | "right"
  mark?: SeriesMark
  tone?: number
  dashed?: boolean
  step?: boolean
  smooth?: boolean
  labels?: "all" | "end" | "none"
  width?: number
}

export type Guide = {
  value: number
  axis?: "left" | "right" | "x"
  label?: string
  tone?: number
}

export type Span = { from: number; to: number; label?: string }

export type ScatterPoint = {
  x: number
  y: number
  label?: string
  tone?: number
  size?: number
}

export type WaterfallStep = {
  label: string
  value: number
  total?: boolean
}

export type Slice = { label: string; value: number }

export type ChartSpec = {
  kind?: "report"
  type: "column" | "bar" | "line" | "combo" | "lollipop" | "scatter" | "pie" | "waterfall" | "range" | "table" | "area" | "band" | "quadrant" | "heatmap" | "strip" | "profile" | "multiples" | "rating"
  theme?: Theme
  title?: string
  unitLeft?: string
  unitRight?: string
  categories?: readonly string[]
  series?: readonly Series[]
  stack?: boolean | "percent"
  log?: boolean
  forecastFrom?: number
  spans?: readonly Span[]
  guides?: readonly Guide[]
  highlight?: readonly string[]
  digits?: number
  points?: readonly ScatterPoint[]
  trend?: boolean
  // 좌상, 우상, 좌하, 우하 순서
  quadrants?: readonly string[]
  xLabel?: string
  yLabel?: string
  steps?: readonly WaterfallStep[]
  slices?: readonly Slice[]
  columns?: readonly string[]
  rows?: readonly (readonly (string | number)[])[]
  note?: string
  source?: string
  width?: number
  height?: number
  // 화면에 띄울 때만 켠다. 등장 동작과 툴팁 정보(data-tip)가 들어간다.
  // 파일로 내보낼 때 켜면 PNG에 동작의 첫 프레임(빈 차트)이 찍힌다.
  live?: boolean
}

type Box = { x: number; y: number; w: number; h: number }

export function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export function attrs(values: Record<string, string | number | undefined>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${esc(String(value))}"`)
    .join(" ")
}

export function num(value: number): number {
  return Math.round(value * 100) / 100
}

function isNumber(value: string | number | null | undefined): value is number {
  return typeof value === "number"
}

export function rect(x: number, y: number, w: number, h: number, fill: string, extra?: Record<string, string | number | undefined>): string {
  if (w <= 0 || h <= 0) return ""

  return `<rect ${attrs({ x: num(x), y: num(y), width: num(w), height: num(h), fill, ...extra })}/>`
}

export function line(x1: number, y1: number, x2: number, y2: number, stroke: string, width: number, dash?: string): string {
  return `<line ${attrs({ x1: num(x1), y1: num(y1), x2: num(x2), y2: num(y2), stroke, "stroke-width": width, "stroke-dasharray": dash })}/>`
}

export function path(d: string, stroke: string, width: number, dash?: string): string {
  return `<path ${attrs({ d, fill: "none", stroke, "stroke-width": width, "stroke-linejoin": "round", "stroke-linecap": "round", "stroke-dasharray": dash })}/>`
}

export function circle(cx: number, cy: number, r: number, fill: string, extra?: Record<string, string | number | undefined>): string {
  return `<circle ${attrs({ cx: num(cx), cy: num(cy), r: num(r), fill, ...extra })}/>`
}

export function text(x: number, y: number, content: string, extra: Record<string, string | number | undefined>): string {
  return `<text ${attrs({ x: num(x), y: num(y), ...extra })}>${esc(content)}</text>`
}

type Motion = "rise" | "run" | "wipe" | "pop" | "fade"

// wipe는 끝난 뒤 clip-path가 none으로 돌아가야 선 끝의 점과 라벨이 잘리지 않는다. 그래서 forwards를 쓰지 않는다.
export const liveCss =
  "[class^=hc-]{animation:.7s cubic-bezier(.22,.9,.3,1) backwards}" +
  ".hc-rise{animation-name:hc-rise}.hc-run{animation-name:hc-run}.hc-fade{animation-name:hc-fade}" +
  ".hc-pop{animation-name:hc-pop;transform-box:fill-box;transform-origin:center}" +
  ".hc-wipe{animation-name:hc-wipe;animation-duration:1s;animation-timing-function:ease-in-out}" +
  "@keyframes hc-rise{from{transform:scaleY(0)}}@keyframes hc-run{from{transform:scaleX(0)}}@keyframes hc-fade{from{opacity:0}}" +
  "@keyframes hc-pop{from{opacity:0;transform:scale(.3)}}" +
  "@keyframes hc-wipe{from{clip-path:inset(-9px 100% -9px -9px)}to{clip-path:inset(-9px)}}" +
  "@media (prefers-reduced-motion:reduce){[class^=hc-]{animation:none}}"

// 꺼져 있으면 받은 조각을 그대로 돌려줘서 내보내는 SVG가 한 글자도 달라지지 않는다.
export function liveOf(spec: { live?: boolean }) {
  const on = spec.live === true
  // XML로 읽으면 속성 안의 줄바꿈이 공백으로 바뀌므로 문자 참조로 적는다.
  const tipAttr = (label: string) => `data-tip="${esc(label).replace(/\n/g, "&#10;")}"`

  return {
    // origin은 viewBox 좌표다. 주지 않으면 도형 자신의 가운데가 기준이다.
    move: (svg: string, kind: Motion, delay = 0, origin?: string) =>
      on && svg ? `<g class="hc-${kind}" style="animation-delay:${Math.round(delay)}ms${origin ? `;transform-box:view-box;transform-origin:${origin}` : ""}">${svg}</g>` : svg,
    tip: (svg: string, label: string) => (on && svg ? `<g ${tipAttr(label)}>${svg}</g>` : svg),
    // 선과 면적은 마우스가 닿을 도형이 없어서 범주 칸 전체를 투명한 칸으로 덮는다.
    hit: (x: number, y: number, w: number, h: number, label: string) => (on ? `<rect ${attrs({ x: num(x), y: num(y), width: num(w), height: num(h), fill: "transparent" })} ${tipAttr(label)}/>` : ""),
  }
}

// 범주 칸 하나의 툴팁. 범주 이름 아래에 시리즈마다 값을 한 줄씩 적는다.
function slotTip(category: string, series: readonly Series[], index: number, show: (value: number) => string): string {
  const rows = series.flatMap((item) => {
    const value = item.values[index]
    const low = item.low?.[index] ?? null

    return value === null ? [] : [`${item.name}: ${low === null ? "" : `${show(low)} ~ `}${show(value)}`]
  })

  return [category, ...rows].join("\n")
}

export function textWidth(value: string, size: number): number {
  let width = 0

  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    width += code > 255 ? size : ch === " " ? size * 0.33 : size * 0.56
  }

  return width
}

function toneAt(theme: Theme, index: number): Tone {
  const count = theme.series.length

  return theme.series[((index % count) + count) % count]
}

function footHeight(spec: ChartSpec): number {
  return 8 + (spec.note ? 14 : 0) + (spec.source ? 14 : 0)
}

function footer(spec: ChartSpec, theme: Theme, height: number): string {
  let y = height - footHeight(spec) + 12
  let out = ""

  if (spec.note) {
    out += text(8, y, spec.note, { fill: theme.muted, "font-size": 10 })
    y += 14
  }

  if (spec.source) out += text(8, y, spec.source, { fill: theme.muted, "font-size": 10 })

  return out
}

function titleBand(spec: ChartSpec, theme: Theme, width: number): string {
  if (!spec.title) return ""

  return (
    rect(0, 0, width, 28, theme.band, { rx: theme.bandRadius }) +
    text(width / 2, 15, spec.title, {
      fill: theme.text,
      "font-size": 13,
      "font-weight": 600,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    })
  )
}

function svgDoc(spec: ChartSpec, theme: Theme, width: number, height: number, body: string): string {
  const desc = [spec.note, spec.source].filter(Boolean).join(" ")
  const name = esc(spec.title || "차트")

  return [
    // 루트 title은 브라우저 기본 툴팁으로 떠서 data-tip 툴팁과 겹치므로 화면용은 aria-label로 이름을 준다.
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"${spec.live ? ` aria-label="${name}"` : ""}>`,
    spec.live ? "" : `<title>${name}</title>`,
    desc ? `<desc>${esc(desc)}</desc>` : "",
    `<style>text{font-family:${theme.font}}${spec.live ? liveCss : ""}</style>`,
    rect(0, 0, width, height, "#FFFFFF"),
    titleBand(spec, theme, width),
    body,
    footer(spec, theme, height),
    "</svg>",
  ].join("")
}

type Nice = { min: number; max: number; ticks: number[] }

type Scale = { min: number; max: number; log?: boolean }

export function niceDomain(min: number, max: number, includeZero: boolean): Nice {
  let lo = min
  let hi = max

  if (includeZero) {
    lo = Math.min(lo, 0)
    hi = Math.max(hi, 0)
  }

  if (lo === hi) {
    lo -= 1
    hi += 1
  }

  const raw = (hi - lo) / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm <= 1.5 ? 1 : norm <= 3 ? 2 : norm <= 7 ? 5 : 10) * mag
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks: number[] = []

  for (let value = start; value <= end + step * 0.01; value += step) {
    const tick = Number(value.toFixed(8))

    if (tick > end + step * 0.001) break
    ticks.push(tick)
  }

  return { min: ticks[0] ?? start, max: ticks[ticks.length - 1] ?? end, ticks }
}

function logDomain(min: number, max: number): Nice {
  if (min <= 0) throw new Error("로그 축에는 0보다 큰 값만 쓸 수 있습니다.")
  const lo = Math.floor(Math.log10(min))
  const hi = Math.ceil(Math.log10(max))
  const all: number[] = []

  for (let power = lo; power <= hi; power += 1) for (const digit of hi - lo > 2 ? [1] : [1, 2, 5]) all.push(Number((digit * 10 ** power).toPrecision(12)))
  const ticks = all.filter((tick, index) => (all[index + 1] ?? Infinity) > min && (all[index - 1] ?? -Infinity) < max)

  return { min: ticks[0], max: ticks[ticks.length - 1], ticks }
}

function padDomain(domain: Nice, ratio: number, includeZero: boolean) {
  const span = domain.max - domain.min || 1

  return {
    min: includeZero && domain.min >= 0 ? domain.min : domain.min - span * ratio,
    max: includeZero && domain.max <= 0 ? domain.max : domain.max + span * ratio,
  }
}

function categoriesOf(spec: ChartSpec): string[] {
  if (!spec.categories?.length) throw new Error("범주가 필요합니다.")

  return [...spec.categories]
}

function seriesOf(spec: ChartSpec, count: number): Series[] {
  if (!spec.series?.length) throw new Error("시리즈가 필요합니다.")

  return spec.series.map((series) => {
    if (series.values.length !== count) throw new Error(`시리즈 "${series.name}"의 값 개수가 범주와 다릅니다.`)

    return series
  })
}

function markOf(type: ChartSpec["type"], series: Series): SeriesMark {
  if (series.mark) return series.mark

  return type === "line" || type === "band" ? "line" : type === "area" ? "area" : "bar"
}

function legendMark(type: ChartSpec["type"], series: Series): "bar" | "line" | "dot" {
  if (type === "lollipop") return "dot"
  const mark = markOf(type, series)

  return mark === "line" || mark === "whisker" ? "line" : mark === "dot" || mark === "mean" ? "dot" : "bar"
}

function whisker(x1: number, y1: number, x2: number, y2: number, color: string): string {
  const cap = (x: number, y: number) => (x1 === x2 ? line(x - 4, y, x + 4, y, color, 1.5) : line(x, y - 4, x, y + 4, color, 1.5))

  return line(x1, y1, x2, y2, color, 1.5) + cap(x1, y1) + cap(x2, y2)
}

function shares(type: ChartSpec["type"], series: Series[]): Series[] {
  return series.map((item) => {
    const mark = markOf(type, item)

    if (mark !== "bar" && mark !== "area") return item
    const group = series.filter((other) => markOf(type, other) === mark)

    const values = item.values.map((value, index) => {
      const total = group.reduce((sum, other) => sum + Math.abs(other.values[index] ?? 0), 0)

      return value === null || !total ? value : (value / total) * 100
    })

    return { ...item, values }
  })
}

function fillBetween(points: { x: number; top: number; base: number }[], fill: string): string {
  if (points.length < 2) return ""
  const top = points.map((point, index) => `${index ? "L" : "M"} ${num(point.x)} ${num(point.top)}`).join(" ")
  const base = [...points].reverse().map((point) => `L ${num(point.x)} ${num(point.base)}`).join(" ")

  return `<path ${attrs({ d: `${top} ${base} Z`, fill, "fill-opacity": 0.6 })}/>`
}

function drawLegend(items: { mark: "bar" | "line" | "dot"; color: string; label: string }[], centerX: number, top: number, maxWidth: number, theme: Theme) {
  const rows: (typeof items)[] = [[]]
  let used = 0

  for (const item of items) {
    const swatch = item.mark === "line" ? 16 : 9
    const width = swatch + 6 + textWidth(item.label, 11)
    const gap = rows[rows.length - 1].length ? 16 : 0

    if (used + gap + width > maxWidth && rows[rows.length - 1].length) {
      rows.push([item])
      used = width
    } else {
      rows[rows.length - 1].push(item)
      used += gap + width
    }
  }

  let svg = ""
  rows.forEach((row, index) => {
    const total = row.reduce((sum, item, itemIndex) => {
      const swatch = item.mark === "line" ? 16 : 9

      return sum + swatch + 6 + textWidth(item.label, 11) + (itemIndex ? 16 : 0)
    }, 0)

    let x = centerX - total / 2
    const y = top + index * 18

    for (const item of row) {
      const swatch = item.mark === "line" ? 16 : 9

      if (item.mark === "line") svg += line(x, y + 8, x + 16, y + 8, item.color, 2)
      else if (item.mark === "dot") svg += circle(x + 4, y + 8, 4, item.color)
      else svg += rect(x, y + 3, 9, 9, item.color)
      svg += text(x + swatch + 6, y + 8, item.label, { fill: theme.text, "font-size": 11, "dominant-baseline": "middle" })
      x += swatch + 6 + textWidth(item.label, 11) + 16
    }
  })

  return { svg, height: Math.max(18, rows.length * 18) }
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function renderCartesian(spec: ChartSpec, theme: Theme): string {
  const horizontal = spec.type === "bar"
  const categories = categoriesOf(spec)
  const percent = spec.stack === "percent"
  const series = percent ? shares(spec.type, seriesOf(spec, categories.length)) : seriesOf(spec, categories.length)
  const count = categories.length
  const highlight = new Set(spec.highlight ?? [])
  const digits = spec.digits ?? (percent ? 1 : inferDigits(series.flatMap((item) => item.values.filter((value): value is number => value !== null))))

  const onAxis = (side: "left" | "right") => series.filter((item) => (horizontal ? "left" : (item.axis ?? "left")) === side)

  const extentOf = (items: Series[], side: "left" | "right") => {
    let lo = Infinity
    let hi = -Infinity

    const take = (value: number) => {
      lo = Math.min(lo, value)
      hi = Math.max(hi, value)
    }

    const marked = (mark: SeriesMark) => items.filter((item) => markOf(spec.type, item) === mark)
    const stacks = spec.stack ? [marked("bar"), marked("area")].filter((group) => group.length > 1) : []

    for (const group of stacks) {
      for (let index = 0; index < count; index += 1) {
        let pos = 0
        let neg = 0

        for (const item of group) {
          const value = item.values[index]

          if (value === null) continue

          if (value >= 0) pos += value
          else neg += value
        }

        // 비중의 합이 100.0000001이 되면 눈금이 120까지 늘어난다.
        take(Number(pos.toFixed(4)))
        take(Number(neg.toFixed(4)))
      }
    }

    for (const item of items) {
      if (stacks.some((group) => group.includes(item))) continue

      for (const value of [...item.values, ...(item.low ?? [])]) if (value !== null) take(value)
    }

    for (const guide of spec.guides ?? []) if ((guide.axis ?? "left") === side) take(guide.value)

    if (lo === Infinity) return { min: 0, max: 1 }

    return { min: lo, max: hi }
  }

  const axisLeft = onAxis("left")
  const axisRight = onAxis("right")
  const leftItems = axisLeft.length ? axisLeft : axisRight
  const rightItems = axisLeft.length ? axisRight : []
  const wantsZero = (items: Series[]) => spec.type === "lollipop" || items.some((item) => ["bar", "area"].includes(markOf(spec.type, item)) && !item.low)
  // 100% 누적은 막대가 축 끝까지 차야 하므로 여백을 두지 않는다.
  const padOf = (items: Series[]) => (percent && wantsZero(items) ? 0 : items.some((item) => (item.labels ?? "none") !== "none") ? 0.18 : 0.08)
  const leftExtent = extentOf(leftItems, axisLeft.length ? "left" : "right")
  const leftZero = wantsZero(leftItems)

  if (spec.log && leftZero) throw new Error("로그 축은 선과 점에만 쓸 수 있습니다.")
  const leftDomain = spec.log ? logDomain(leftExtent.min, leftExtent.max) : niceDomain(leftExtent.min, leftExtent.max, leftZero)

  // 로그 축의 눈금은 실제 값으로 두고, 위치를 계산하는 범위만 로그 값으로 바꾼다.
  const leftScale: Scale = spec.log
    ? { ...padDomain({ ...leftDomain, min: Math.log10(leftDomain.min), max: Math.log10(leftDomain.max) }, padOf(leftItems), false), log: true }
    : padDomain(leftDomain, padOf(leftItems), leftZero)

  const rightExtent = rightItems.length ? extentOf(rightItems, "right") : null
  const rightZero = rightItems.length ? wantsZero(rightItems) : false
  const rightDomain = rightExtent ? niceDomain(rightExtent.min, rightExtent.max, rightZero) : null
  const rightScale = rightDomain ? padDomain(rightDomain, padOf(rightItems), rightZero) : null

  const width = spec.width ?? 680
  const height = spec.height ?? 400
  const titleH = spec.title ? 36 : 8
  const footH = footHeight(spec)
  const tickText = (domain: Nice) => Math.max(...domain.ticks.map((tick) => textWidth(formatTick(tick, theme.negative), 11)))
  const leftGutter = horizontal ? Math.max(...categories.map((label) => textWidth(label, 11))) + 14 : tickText(leftDomain) + 16
  const band = spec.type === "band"
  const rightGutter = rightDomain ? tickText(rightDomain) + 16 : band ? Math.max(0, ...series.slice(1).map((item) => textWidth(item.name, 10))) + 12 : 12
  const plotLeft = leftGutter
  const plotRight = width - rightGutter
  const plotW = Math.max(20, plotRight - plotLeft)
  const slot = plotW / count
  const rotate = !horizontal && categories.some((label) => textWidth(label, 11) > slot * 0.88)
  const longest = Math.max(...categories.map((label) => textWidth(label, 11)))
  const xLabelH = horizontal ? 28 : rotate ? Math.min(100, Math.max(52, longest * Math.sin((40 * Math.PI) / 180) + 18)) : 28

  const legendItems = (band ? series.slice(0, 1) : series).map((item, index) => ({
    mark: legendMark(spec.type, item),
    color: toneAt(theme, item.tone ?? index).ink,
    label: item.name,
  }))

  const legend = drawLegend(legendItems, (plotLeft + plotRight) / 2, titleH, plotW, theme)
  const unitH = spec.unitLeft || spec.unitRight || spec.yLabel ? 14 : 0
  const plotTop = titleH + legend.height + unitH + 2
  const plotBottom = height - footH - xLabelH
  const plotH = Math.max(20, plotBottom - plotTop)

  const yOf = (value: number, scale: Scale) => plotTop + (1 - ((scale.log ? Math.log10(value) : value) - scale.min) / (scale.max - scale.min || 1)) * plotH
  const xOf = (value: number, scale: { min: number; max: number }) => plotLeft + ((value - scale.min) / (scale.max - scale.min || 1)) * plotW
  const yLeft = (value: number) => yOf(value, leftScale)
  const yRight = (value: number) => (rightScale ? yOf(value, rightScale) : yLeft(value))

  const { move, hit } = liveOf(spec)
  // 범주가 많아도 왼쪽에서 오른쪽으로 번지는 데 0.4초를 넘기지 않는다.
  const wait = (index: number) => (index / count) * 400
  // 0이 축 밖이면 막대가 축 너머에서 밀려 들어오므로 기준선을 그림 영역 안에 가둔다.
  const floorOf = (scale: Scale) => `0 ${num(Math.min(plotBottom, Math.max(plotTop, yOf(0, scale))))}px`
  const tipOf = (index: number) => slotTip(categories[index], series, index, (value) => formatValue(value, theme.negative, digits))

  let body = legend.svg
  const unitY = titleH + legend.height + 11

  if (spec.unitLeft || spec.yLabel) body += text(plotLeft, unitY, spec.unitLeft || spec.yLabel || "", { fill: theme.muted, "font-size": 10 })

  if (spec.unitRight) body += text(plotRight, unitY, spec.unitRight, { fill: theme.muted, "font-size": 10, "text-anchor": "end" })

  if (!horizontal && spec.forecastFrom !== undefined && spec.forecastFrom < count) {
    const x = plotLeft + spec.forecastFrom * slot
    body += rect(x, plotTop, plotRight - x, plotH, theme.forecast)
  }

  if (!horizontal) {
    for (const span of spec.spans ?? []) {
      const x = plotLeft + span.from * slot
      const w = (span.to - span.from + 1) * slot
      body += rect(x, plotTop, w, plotH, theme.forecast)

      if (span.label) body += text(x + w / 2, plotTop + 12, span.label, { fill: theme.muted, "font-size": 10, "text-anchor": "middle" })
    }
  }

  // 점은 막대 위에 겹쳐 놓이므로 halo로 숫자 둘레를 희게 둘러 읽히게 한다.
  const drawLabels = (value: number, x: number, yTop: number, yBottom: number, index: number, color: string, halo = false) => {
    const above = value >= 0
    const category = categories[index]

    const label = text(x, above ? yTop - 4 : yBottom + 12, formatValue(value, theme.negative, digits), {
      fill: highlight.has(category) ? theme.emphasis : color,
      "font-size": 11,
      "font-weight": highlight.has(category) ? 600 : 400,
      "text-anchor": "middle",
      "dominant-baseline": above ? "auto" : "hanging",
      stroke: halo ? "#FFFFFF" : undefined,
      "stroke-width": halo ? 3 : undefined,
      "paint-order": halo ? "stroke" : undefined,
    })

    body += move(label, "fade", wait(index) + 350)
  }

  if (horizontal) {
    const row = plotH / count
    const bars = series.filter((item) => markOf(spec.type, item) === "bar")
    const grouped = !(spec.stack && bars.length > 1)
    const inner = row * 0.7
    const thickness = grouped ? inner / Math.max(1, bars.length) : inner * 0.72
    const pos = Array(count).fill(0)
    const neg = Array(count).fill(0)
    const origin = `${num(Math.min(plotRight, Math.max(plotLeft, xOf(0, leftScale))))}px 0`
    series.forEach((item, seriesIndex) => {
      const tone = toneAt(theme, item.tone ?? seriesIndex)
      const mark = markOf(spec.type, item)

      if (mark === "whisker" || mark === "dot") {
        item.values.forEach((value, index) => {
          if (value === null) return
          const cy = plotTop + index * row + row / 2
          const low = item.low?.[index] ?? null

          if (mark === "dot") body += move(circle(xOf(value, leftScale), cy, 4.5, tone.ink, { stroke: "#FFFFFF", "stroke-width": 1 }), "pop", wait(index) + 300)
          else if (low !== null) body += move(whisker(xOf(low, leftScale), cy, xOf(value, leftScale), cy, tone.ink), "fade", wait(index) + 150)
        })
      }

      if (mark !== "bar") return
      const order = bars.indexOf(item)
      item.values.forEach((value, index) => {
        if (value === null) return
        let start = 0
        let end = value

        if (!grouped) {
          if (value >= 0) {
            start = pos[index]
            end = pos[index] + value
            pos[index] = end
          } else {
            start = neg[index]
            end = neg[index] + value
            neg[index] = end
          }
        }

        const x = Math.min(xOf(start, leftScale), xOf(end, leftScale))
        const w = Math.abs(xOf(end, leftScale) - xOf(start, leftScale))
        const y = plotTop + index * row + (row - (grouped ? inner : thickness)) / 2 + (grouped ? order * thickness : 0)
        const h = grouped ? Math.max(1, thickness - 2) : thickness
        body += move(rect(x, y, Math.max(w, value === 0 ? 1 : w), h, tone.ink), "run", wait(index), origin)

        if ((item.labels ?? "none") !== "none") {
          const label = formatValue(value, theme.negative, digits)
          const positive = value >= 0

          const drawn = text(positive ? x + w + 4 : x - 4, y + h / 2, label, {
            fill: highlight.has(categories[index]) ? theme.emphasis : theme.text,
            "font-size": 11,
            "text-anchor": positive ? "start" : "end",
            "dominant-baseline": "middle",
          })

          body += move(drawn, "fade", wait(index) + 350)
        }
      })
    })

    if (leftDomain.min < 0 && leftDomain.max > 0) body += line(xOf(0, leftScale), plotTop, xOf(0, leftScale), plotBottom, theme.axis, 1)
    body += line(plotLeft, plotBottom, plotRight, plotBottom, theme.axis, 1)
    body += line(plotLeft, plotTop, plotLeft, plotBottom, theme.axis, 1)

    for (const tick of leftDomain.ticks) {
      const x = xOf(tick, leftScale)
      body += line(x, plotBottom, x, plotBottom + 4, theme.axis, 1)
      body += text(x, plotBottom + 16, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "middle" })
    }

    categories.forEach((label, index) => {
      const y = plotTop + index * row + row / 2
      body += text(plotLeft - 8, y, label, { fill: theme.text, "font-size": 11, "text-anchor": "end", "dominant-baseline": "middle" })
      body += hit(plotLeft, plotTop + index * row, plotW, row, tipOf(index))
    })

    return svgDoc(spec, theme, width, height, body)
  }

  const bars = series.filter((item) => markOf(spec.type, item) === "bar")
  const grouped = !(spec.stack && bars.length > 1)
  const inner = slot * (count > 6 ? 0.62 : 0.7)
  const barW = grouped ? Math.max(1, (inner - 2 * Math.max(0, bars.length - 1)) / Math.max(1, bars.length)) : inner
  const pos = Array(count).fill(0)
  const neg = Array(count).fill(0)

  const areas = series.filter((item) => markOf(spec.type, item) === "area")
  const floor = Array(count).fill(0)

  for (const item of series) {
    const mark = markOf(spec.type, item)

    if (mark !== "area" && mark !== "ribbon") continue
    const tone = toneAt(theme, item.tone ?? series.indexOf(item))
    const fill = mark === "area" ? tone.ink : tone.wash
    const scale = (item.axis ?? "left") === "right" && rightScale ? rightScale : leftScale
    // 값이 없는 칸에서 면적을 끊는다.
    let run: { x: number; top: number; base: number }[] = []
    let band = ""
    item.values.forEach((value, index) => {
      const base = mark === "ribbon" ? (item.low?.[index] ?? null) : spec.stack && areas.length > 1 ? floor[index] : 0

      if (value === null || base === null) {
        band += fillBetween(run, fill)
        run = []

        return
      }

      const top = mark === "ribbon" ? value : base + value

      if (mark === "area") floor[index] = top
      run.push({ x: plotLeft + index * slot + slot / 2, top: yOf(top, scale), base: yOf(base, scale) })
    })
    body += move(band + fillBetween(run, fill), "wipe")
  }

  if (spec.type === "lollipop") {
    series.forEach((item, seriesIndex) => {
      const tone = toneAt(theme, item.tone ?? seriesIndex)
      item.values.forEach((value, index) => {
        if (value === null) return
        const cx = plotLeft + index * slot + slot / 2
        const y = (item.axis ?? "left") === "right" ? yRight(value) : yLeft(value)
        const base = (item.axis ?? "left") === "right" && rightScale ? yOf(0, rightScale) : yLeft(0)
        body += move(line(cx, base, cx, y, tone.ink, 1.5), "rise", wait(index), `0 ${num(base)}px`)
        body += move(circle(cx, y, 4.5, tone.ink), "pop", wait(index) + 300)

        if ((item.labels ?? "none") !== "none") drawLabels(value, cx, Math.min(y, base), Math.max(y, base), index, theme.text)
      })
    })
  } else {
    series.forEach((item, seriesIndex) => {
      const tone = toneAt(theme, item.tone ?? seriesIndex)

      if (!bars.includes(item)) return
      const scale = (item.axis ?? "left") === "right" && rightScale ? rightScale : leftScale
      const order = bars.indexOf(item)
      const origin = plotLeft + (slot - inner) / 2
      item.values.forEach((value, index) => {
        if (value === null) return
        const low = item.low?.[index] ?? null
        let start = low ?? 0
        let end = value

        if (!grouped) {
          if (value >= 0) {
            start = pos[index]
            end = pos[index] + value
            pos[index] = end
          } else {
            start = neg[index]
            end = neg[index] + value
            neg[index] = end
          }
        }

        const y = Math.min(yOf(start, scale), yOf(end, scale))
        const h = Math.max(Math.abs(yOf(end, scale) - yOf(start, scale)), value === 0 ? 1 : 0)
        const x = grouped ? origin + index * slot + order * (barW + 2) : origin + index * slot
        const w = grouped ? barW : inner
        body += move(rect(x, y, w, h, tone.ink), "rise", wait(index), floorOf(scale))

        if ((item.labels ?? "none") === "none") return

        if (grouped && low !== null) body += move(text(x + w / 2, y + h + 12, formatValue(low, theme.negative, digits), { fill: theme.text, "font-size": 11, "text-anchor": "middle" }), "fade", wait(index) + 350)

        if (!percent) drawLabels(value, x + w / 2, y, y + h, index, theme.text)
        else if (h >= 14) body += move(text(x + w / 2, y + h / 2, formatValue(value, theme.negative, digits), { fill: inkOn(tone.ink), "font-size": 11, "text-anchor": "middle", "dominant-baseline": "middle" }), "fade", wait(index) + 350)
      })
    })
  }

  // 밴드는 주가 선을 마지막에 그려 배수 선 위에 오게 한다.
  const lineOrder = band ? [...series.slice(1), series[0]] : series
  lineOrder.forEach((item) => {
    const seriesIndex = series.indexOf(item)

    if (markOf(spec.type, item) !== "line" || spec.type === "lollipop") return
    const multiple = band && seriesIndex > 0
    const ink = multiple ? mix(theme.series[1].wash, theme.series[1].ink, series.length > 2 ? (seriesIndex - 1) / (series.length - 2) : 1) : toneAt(theme, item.tone ?? seriesIndex).ink
    const scale = (item.axis ?? "left") === "right" && rightScale ? rightScale : leftScale
    const points: { x: number; y: number; value: number; index: number }[] = []
    item.values.forEach((value, index) => {
      if (value === null) return
      points.push({ x: plotLeft + index * slot + slot / 2, y: yOf(value, scale), value, index })
    })
    let d = ""
    points.forEach((point, index) => {
      const prev = points[index - 1]

      if (!prev || point.index !== prev.index + 1) d += `M ${num(point.x)} ${num(point.y)}`
      else if (item.step) d += ` L ${num(point.x)} ${num(prev.y)} L ${num(point.x)} ${num(point.y)}`
      else if (item.smooth) {
        const before = points[index - 2]?.index === prev.index - 1 ? points[index - 2] : prev
        const after = points[index + 1]?.index === point.index + 1 ? points[index + 1] : point
        // 조절점을 두 점 사이에 가둬서 곡선이 실제 값보다 높거나 낮게 튀지 않게 한다.
        const within = (y: number) => Math.min(Math.max(y, Math.min(prev.y, point.y)), Math.max(prev.y, point.y))
        d += ` C ${num(prev.x + (point.x - before.x) / 6)} ${num(within(prev.y + (point.y - before.y) / 6))} ${num(point.x - (after.x - prev.x) / 6)} ${num(within(point.y - (after.y - prev.y) / 6))} ${num(point.x)} ${num(point.y)}`
      } else d += ` L ${num(point.x)} ${num(point.y)}`
    })
    // 선, 점, 라벨을 한 묶음으로 두어 왼쪽에서 오른쪽으로 같이 드러나게 한다.
    let drawn = d ? path(d, ink, multiple ? 1 : (item.width ?? theme.lineWidth), item.dashed ? "5 3" : undefined) : ""
    const delay = Math.min(seriesIndex * 100, 400)

    if (multiple) {
      const last = points[points.length - 1]

      if (last) drawn += text(last.x + 5, last.y, item.name, { fill: ink, "font-size": 10, "dominant-baseline": "middle" })
      body += move(drawn, "wipe", delay)

      return
    }

    // 점이 촘촘하면 표식이 선을 덮어 월간 시계열은 선만 둔다.
    if (points.length <= 14) for (const point of points) drawn += circle(point.x, point.y, 3.2, ink, { stroke: "#FFFFFF", "stroke-width": 1 })
    const mode = item.labels ?? "none"
    const shown = mode === "all" ? points : mode === "end" ? points.slice(-1) : []

    for (const point of shown) {
      const label = formatValue(point.value, theme.negative, digits)
      const wide = textWidth(label, 11)
      const end = mode === "end"
      const x = end && point.x + 6 + wide < plotRight - 2 ? point.x + 6 : point.x
      drawn += text(x, end ? point.y : point.y - 8, label, {
        fill: highlight.has(categories[point.index]) ? theme.emphasis : ink,
        "font-size": 11,
        "text-anchor": end && x !== point.x ? "start" : "middle",
        "dominant-baseline": end ? "middle" : "auto",
      })
    }

    body += move(drawn, "wipe", delay)
  })

  series.forEach((item, seriesIndex) => {
    const mark = markOf(spec.type, item)

    if ((mark !== "dot" && mark !== "whisker") || spec.type === "lollipop") return
    const tone = toneAt(theme, item.tone ?? seriesIndex)
    const scale = (item.axis ?? "left") === "right" && rightScale ? rightScale : leftScale
    item.values.forEach((value, index) => {
      if (value === null) return
      const cx = plotLeft + index * slot + slot / 2
      const cy = yOf(value, scale)
      const low = item.low?.[index] ?? null

      if (mark === "whisker") {
        if (low !== null) body += move(whisker(cx, yOf(low, scale), cx, cy, tone.ink), "fade", wait(index) + 300)

        return
      }

      body += move(circle(cx, cy, 4.5, tone.ink, { stroke: "#FFFFFF", "stroke-width": 1 }), "pop", wait(index) + 300)

      if ((item.labels ?? "none") !== "none") drawLabels(value, cx, cy - 5, cy + 5, index, tone.ink, true)
    })
  })

  for (const guide of spec.guides ?? []) {
    const right = guide.axis === "right" && rightScale
    const scale = right ? rightScale : leftScale
    const y = yOf(guide.value, scale)

    if (y < plotTop || y > plotBottom) continue
    const color = guide.tone === undefined ? theme.axis : toneAt(theme, guide.tone).ink
    body += line(plotLeft, y, plotRight, y, color, 1, "4 3")

    if (guide.label) body += text(plotRight - 4, y - 4, guide.label, { fill: color, "font-size": 10, "text-anchor": "end" })
  }

  if (leftDomain.min < 0 && leftDomain.max > 0) body += line(plotLeft, yLeft(0), plotRight, yLeft(0), theme.axis, 1)
  body += line(plotLeft, plotTop, plotLeft, plotBottom, theme.axis, 1)
  body += line(plotLeft, plotBottom, plotRight, plotBottom, theme.axis, 1)

  if (rightScale) body += line(plotRight, plotTop, plotRight, plotBottom, theme.axis, 1)

  for (const tick of leftDomain.ticks) {
    const y = yLeft(tick)

    if (y < plotTop - 1 || y > plotBottom + 1) continue
    body += line(plotLeft, y, plotLeft - 4, y, theme.axis, 1)
    body += text(plotLeft - 6, y, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "end", "dominant-baseline": "middle" })
  }

  if (rightDomain && rightScale) {
    for (const tick of rightDomain.ticks) {
      const y = yOf(tick, rightScale)

      if (y < plotTop - 1 || y > plotBottom + 1) continue
      body += line(plotRight, y, plotRight + 4, y, theme.axis, 1)
      body += text(plotRight + 6, y, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "start", "dominant-baseline": "middle" })
    }
  }

  categories.forEach((label, index) => {
    const x = plotLeft + index * slot + slot / 2
    const y = plotBottom + 16
    body += text(x, y, label, {
      fill: theme.text,
      "font-size": 11,
      "text-anchor": rotate ? "end" : "middle",
      transform: rotate ? `rotate(-40 ${num(x)} ${num(y)})` : undefined,
    })
    body += hit(plotLeft + index * slot, plotTop, slot, plotH, tipOf(index))
  })

  if (spec.xLabel) body += text((plotLeft + plotRight) / 2, height - footH - 4, spec.xLabel, { fill: theme.muted, "font-size": 10, "text-anchor": "middle" })

  return svgDoc(spec, theme, width, height, body)
}

function renderScatter(spec: ChartSpec, theme: Theme): string {
  const points = spec.points ?? []

  if (!points.length) throw new Error("점이 필요합니다.")
  const width = spec.width ?? 680
  const height = spec.height ?? 400
  const titleH = spec.title ? 36 : 8
  const footH = footHeight(spec)
  const guides = spec.guides ?? []
  const xs = [...points.map((point) => point.x), ...guides.filter((guide) => guide.axis === "x").map((guide) => guide.value)]
  const ys = [...points.map((point) => point.y), ...guides.filter((guide) => guide.axis !== "x").map((guide) => guide.value)]
  const quadrant = spec.type === "quadrant"

  if (quadrant) {
    xs.push(0)
    ys.push(0)
  }

  const xDomain = niceDomain(Math.min(...xs), Math.max(...xs), false)
  const yDomain = niceDomain(Math.min(...ys), Math.max(...ys), false)
  const xScale = padDomain(xDomain, 0.12, false)
  const yScale = padDomain(yDomain, 0.14, false)
  const left = Math.max(...yDomain.ticks.map((tick) => textWidth(formatTick(tick, theme.negative), 11))) + 16
  const plotLeft = left
  const plotRight = width - 16
  const plotTop = titleH + (spec.yLabel ? 16 : 6)
  const plotBottom = height - footH - (spec.xLabel ? 34 : 24)
  const plotW = plotRight - plotLeft
  const plotH = plotBottom - plotTop
  const xOf = (value: number) => plotLeft + ((value - xScale.min) / (xScale.max - xScale.min || 1)) * plotW
  const yOf = (value: number) => plotTop + (1 - (value - yScale.min) / (yScale.max - yScale.min || 1)) * plotH
  const sizes = points.map((point) => point.size).filter((size): size is number => size !== undefined)
  const minSize = sizes.length ? Math.min(...sizes) : 0
  const maxSize = sizes.length ? Math.max(...sizes) : 0
  const { move, tip } = liveOf(spec)

  const radius = (point: ScatterPoint) => {
    if (point.size === undefined || !sizes.length || maxSize === minSize) return point.size === undefined ? 5 : 8

    return 5 + (13 * (point.size - minSize)) / (maxSize - minSize)
  }

  let body = ""

  if (spec.yLabel) body += text(plotLeft, plotTop - 6, spec.yLabel, { fill: theme.muted, "font-size": 10 })
  body += line(plotLeft, plotTop, plotLeft, plotBottom, theme.axis, 1)
  body += line(plotLeft, plotBottom, plotRight, plotBottom, theme.axis, 1)

  for (const tick of yDomain.ticks) {
    const y = yOf(tick)

    if (y < plotTop - 1 || y > plotBottom + 1) continue
    body += line(plotLeft, y, plotLeft - 4, y, theme.axis, 1)
    body += text(plotLeft - 6, y, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "end", "dominant-baseline": "middle" })
  }

  for (const tick of xDomain.ticks) {
    const x = xOf(tick)
    body += line(x, plotBottom, x, plotBottom + 4, theme.axis, 1)
    body += text(x, plotBottom + 16, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "middle" })
  }

  if (quadrant) {
    body += line(xOf(0), plotTop, xOf(0), plotBottom, theme.text, 1)
    body += line(plotLeft, yOf(0), plotRight, yOf(0), theme.text, 1)
    ;(spec.quadrants ?? []).slice(0, 4).forEach((name, index) => {
      const right = index % 2 === 1
      const w = textWidth(name, 11) + 12
      const x = right ? plotRight - w - 4 : plotLeft + 4
      const y = index < 2 ? plotTop + 4 : plotBottom - 22
      body += rect(x, y, w, 18, theme.forecast)
      body += text(x + 6, y + 13, name, { fill: theme.text, "font-size": 11, "font-weight": 600 })
    })
  }

  for (const guide of guides) {
    const color = guide.tone === undefined ? theme.axis : toneAt(theme, guide.tone).ink

    if (guide.axis === "x") {
      body += line(xOf(guide.value), plotTop, xOf(guide.value), plotBottom, color, 1, "4 3")

      if (guide.label) body += text(xOf(guide.value) + 4, plotTop + 10, guide.label, { fill: color, "font-size": 10 })
    } else {
      body += line(plotLeft, yOf(guide.value), plotRight, yOf(guide.value), color, 1, "4 3")

      if (guide.label) body += text(plotRight - 4, yOf(guide.value) - 4, guide.label, { fill: color, "font-size": 10, "text-anchor": "end" })
    }
  }

  if (spec.trend) {
    const mx = points.reduce((sum, point) => sum + point.x, 0) / points.length
    const my = points.reduce((sum, point) => sum + point.y, 0) / points.length
    const sxx = points.reduce((sum, point) => sum + (point.x - mx) ** 2, 0)
    const sxy = points.reduce((sum, point) => sum + (point.x - mx) * (point.y - my), 0)
    const syy = points.reduce((sum, point) => sum + (point.y - my) ** 2, 0)

    // x가 모두 같으면 기울기를 구할 수 없다.
    if (sxx > 0) {
      const at = (x: number) => my + (sxy / sxx) * (x - mx)
      const from = Math.min(...points.map((point) => point.x))
      const to = Math.max(...points.map((point) => point.x))
      const trend = line(xOf(from), yOf(at(from)), xOf(to), yOf(at(to)), theme.text, 1, "5 3")
      body += move(trend + text(xOf(to), yOf(at(to)) - 6, `R² = ${(syy ? sxy ** 2 / (sxx * syy) : 1).toFixed(2)}`, { fill: theme.muted, "font-size": 10, "text-anchor": "end" }), "fade", 600)
    }
  }

  const placed: Box[] = []
  const xDigits = inferDigits(points.map((point) => point.x))
  const yDigits = inferDigits(points.map((point) => point.y))

  for (const [index, point] of points.entries()) {
    const tone = toneAt(theme, point.tone ?? 0)
    const cx = xOf(point.x)
    const cy = yOf(point.y)
    const delay = (index / points.length) * 400
    const about = [point.label, `${spec.xLabel ?? "x"}: ${formatValue(point.x, theme.negative, xDigits)}`, `${spec.yLabel ?? "y"}: ${formatValue(point.y, theme.negative, yDigits)}`]
    body += tip(move(circle(cx, cy, radius(point), tone.ink, { "fill-opacity": 0.9 }), "pop", delay), about.filter(Boolean).join("\n"))

    if (!point.label) continue
    const labelW = textWidth(point.label, 11)
    let x = cx + radius(point) + 4
    let y = cy
    let anchor: "start" | "end" = "start"

    if (x + labelW > plotRight) {
      x = cx - radius(point) - 4
      anchor = "end"
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const box = { x: anchor === "start" ? x : x - labelW, y: y - 8, w: labelW, h: 12 }

      if (!placed.some((item) => overlaps(item, box))) {
        placed.push(box)
        break
      }

      y -= 12
    }

    body += move(text(x, y, point.label, { fill: theme.text, "font-size": 11, "text-anchor": anchor, "dominant-baseline": "middle" }), "fade", delay + 250)
  }

  if (spec.xLabel) body += text((plotLeft + plotRight) / 2, plotBottom + 30, spec.xLabel, { fill: theme.muted, "font-size": 10, "text-anchor": "middle" })

  return svgDoc(spec, theme, width, height, body)
}

function renderPie(spec: ChartSpec, theme: Theme): string {
  const slices = (spec.slices ?? []).filter((slice) => slice.value > 0)
  const width = spec.width ?? 680
  const height = spec.height ?? 400
  const titleH = spec.title ? 36 : 8
  const footH = footHeight(spec)

  if (!slices.length) {
    const body = text(width / 2, height / 2, "표시할 값이 없습니다.", { fill: theme.muted, "font-size": 13, "text-anchor": "middle" })

    return svgDoc(spec, theme, width, height, body)
  }

  const sum = slices.reduce((total, slice) => total + slice.value, 0)
  const cx = width * 0.34
  const cy = titleH + (height - titleH - footH) / 2
  const radius = Math.max(40, Math.min(width * 0.2, (height - titleH - footH) * 0.34))
  let angle = -Math.PI / 2
  let body = ""
  const { move, tip } = liveOf(spec)
  const digits = spec.digits ?? inferDigits(slices.map((slice) => slice.value))
  const legend: { mark: "bar"; color: string; label: string }[] = []
  slices.forEach((slice, index) => {
    const sweep = (slice.value / sum) * Math.PI * 2
    const tone = toneAt(theme, index)
    const start = angle
    const end = angle + sweep
    angle = end

    // 한 조각이 원 전체면 SVG 호는 시작점과 끝점이 같아 아무것도 그리지 않는다.
    const pathD =
      sweep >= Math.PI * 2 - 1e-4
        ? `M ${num(cx)} ${num(cy - radius)} A ${num(radius)} ${num(radius)} 0 1 1 ${num(cx)} ${num(cy + radius)} A ${num(radius)} ${num(radius)} 0 1 1 ${num(cx)} ${num(cy - radius)} Z`
        : `M ${num(cx)} ${num(cy)} L ${num(cx + radius * Math.cos(start))} ${num(cy + radius * Math.sin(start))} A ${num(radius)} ${num(radius)} 0 ${sweep > Math.PI ? 1 : 0} 1 ${num(cx + radius * Math.cos(end))} ${num(cy + radius * Math.sin(end))} Z`

    const percent = (slice.value / sum) * 100
    const label = `${percent >= 10 ? percent.toFixed(0) : percent.toFixed(1)}%`
    // 조각마다 원의 중심에서 차례로 펼쳐진다.
    const delay = (index / slices.length) * 400
    body += tip(move(`<path ${attrs({ d: pathD, fill: tone.ink })}/>`, "pop", delay, `${num(cx)}px ${num(cy)}px`), `${slice.label}: ${formatValue(slice.value, theme.negative, digits)} (${label})`)

    if (percent >= 8 && slices.length > 1) {
      const mid = start + sweep / 2
      const outside = radius + 16

      const drawn = text(cx + Math.cos(mid) * outside, cy + Math.sin(mid) * outside, label, {
        fill: theme.text,
        "font-size": 11,
        "text-anchor": Math.cos(mid) >= 0 ? "start" : "end",
        "dominant-baseline": "middle",
      })

      body += move(drawn, "fade", delay + 350)
    }

    legend.push({ mark: "bar", color: tone.ink, label: `${slice.label} ${label}` })
  })
  const gap = 22
  const span = (legend.length - 1) * gap
  const minY = titleH + 4
  // 조각이 많아 가운데에 두면 제목이나 각주와 겹치면 위쪽에 붙인다.
  const maxY = Math.max(minY, height - footH - 16 - span)
  let legendY = Math.min(Math.max(cy - span / 2 - 8, minY), maxY)
  const legendX = width * 0.62

  for (const item of legend) {
    body += rect(legendX, legendY, 9, 9, item.color)
    body += text(legendX + 16, legendY + 8, item.label, { fill: theme.text, "font-size": 12, "dominant-baseline": "middle" })
    legendY += gap
  }

  return svgDoc(spec, theme, width, height, body)
}

function renderWaterfall(spec: ChartSpec, theme: Theme): string {
  const steps = spec.steps ?? []

  if (!steps.length) throw new Error("폭포 단계가 필요합니다.")
  let running = 0

  const bars = steps.map((step) => {
    if (step.total) {
      const bar = { ...step, y0: 0, y1: step.value }
      running = step.value

      return bar
    }

    const y0 = running
    running += step.value

    return { ...step, y0, y1: running }
  })

  const values = bars.flatMap((bar) => [bar.y0, bar.y1])
  const domain = niceDomain(Math.min(...values, 0), Math.max(...values, 0), true)
  const width = spec.width ?? 680
  const height = spec.height ?? 400
  const titleH = spec.title ? 36 : 8
  const footH = footHeight(spec)
  const left = Math.max(...domain.ticks.map((tick) => textWidth(formatTick(tick, theme.negative), 11))) + 16
  const plotLeft = left
  const plotRight = width - 16
  const count = bars.length
  const slot = (plotRight - plotLeft) / count
  const rotate = count > 6 || steps.some((step) => textWidth(step.label, 11) > slot * 0.8)
  const xLabelH = rotate ? 64 : 22
  const plotTop = titleH + 8 + (spec.unitLeft ? 14 : 0)
  const plotBottom = height - footH - xLabelH
  const plotH = Math.max(20, plotBottom - plotTop)
  const scale = padDomain(domain, 0.16, true)
  const yOf = (value: number) => plotTop + (1 - (value - scale.min) / (scale.max - scale.min || 1)) * plotH
  const digits = spec.digits ?? inferDigits(steps.map((step) => step.value))
  const { move, tip } = liveOf(spec)
  let body = ""

  if (spec.unitLeft) body += text(plotLeft, plotTop - 4, spec.unitLeft, { fill: theme.muted, "font-size": 10 })
  const inner = slot * 0.62
  bars.forEach((bar, index) => {
    const up = bar.y1 >= bar.y0
    const color = bar.total ? toneAt(theme, 1).ink : up ? toneAt(theme, 0).ink : theme.emphasis
    const y = Math.min(yOf(bar.y0), yOf(bar.y1))
    const h = Math.max(1, Math.abs(yOf(bar.y1) - yOf(bar.y0)))
    const x = plotLeft + index * slot + (slot - inner) / 2
    const labelValue = formatValue(bar.total ? bar.y1 : bar.y1 - bar.y0, theme.negative, digits)
    // 단계가 앞 단계의 끝에서 이어 자라도록 시작 높이를 기준으로 삼고 차례로 늦춘다.
    const delay = index * Math.min(120, 700 / count)
    body += tip(move(rect(x, y, inner, h, color), "rise", delay, `0 ${num(yOf(bar.y0))}px`), `${bar.label}: ${labelValue}`)

    const label = text(x + inner / 2, up ? y - 4 : y + h + 12, labelValue, {
      fill: theme.text,
      "font-size": 11,
      "text-anchor": "middle",
      "dominant-baseline": up ? "auto" : "hanging",
    })

    body += move(label, "fade", delay + 350)
    const next = bars[index + 1]

    if (next && !next.total) {
      const x2 = plotLeft + (index + 1) * slot + (slot - inner) / 2
      body += move(line(x + inner, yOf(bar.y1), x2, yOf(bar.y1), theme.axis, 1), "fade", delay + 350)
    }

    if (next?.total) {
      const x2 = plotLeft + (index + 1) * slot + (slot - inner) / 2
      body += move(line(x + inner, yOf(bar.y1), x2, yOf(next.y1), theme.axis, 1), "fade", delay + 350)
    }
  })
  body += line(plotLeft, plotTop, plotLeft, plotBottom, theme.axis, 1)
  body += line(plotLeft, plotBottom, plotRight, plotBottom, theme.axis, 1)

  if (domain.min < 0 && domain.max > 0) body += line(plotLeft, yOf(0), plotRight, yOf(0), theme.axis, 1)

  for (const tick of domain.ticks) {
    const y = yOf(tick)

    if (y < plotTop - 1 || y > plotBottom + 1) continue
    body += line(plotLeft, y, plotLeft - 4, y, theme.axis, 1)
    body += text(plotLeft - 6, y, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "end", "dominant-baseline": "middle" })
  }

  steps.forEach((step, index) => {
    const x = plotLeft + index * slot + slot / 2
    const y = plotBottom + 16
    body += text(x, y, step.label, {
      fill: theme.text,
      "font-size": 11,
      "text-anchor": rotate ? "end" : "middle",
      transform: rotate ? `rotate(-40 ${num(x)} ${num(y)})` : undefined,
    })
  })

  return svgDoc(spec, theme, width, height, body)
}

function renderRange(spec: ChartSpec, theme: Theme): string {
  const categories = categoriesOf(spec)
  const series = seriesOf(spec, categories.length)
  const values = series.flatMap((item) => item.values.filter((value): value is number => value !== null))

  if (!values.length) throw new Error("값이 필요합니다.")
  const domain = niceDomain(Math.min(...values), Math.max(...values), false)
  const scale = padDomain(domain, 0.14, false)
  const width = spec.width ?? 680
  const height = spec.height ?? 400
  const titleH = spec.title ? 36 : 8
  const footH = footHeight(spec)
  const left = Math.max(...domain.ticks.map((tick) => textWidth(formatTick(tick, theme.negative), 11))) + 16
  const plotLeft = left
  const plotRight = width - 16
  const count = categories.length
  const slot = (plotRight - plotLeft) / count

  const legend = drawLegend(
    series.map((item, index) => ({ mark: "dot" as const, color: toneAt(theme, item.tone ?? index).ink, label: item.name })),
    (plotLeft + plotRight) / 2,
    titleH,
    plotRight - plotLeft,
    theme,
  )

  const plotTop = titleH + legend.height + (spec.unitLeft ? 16 : 4)
  const plotBottom = height - footH - 24
  const plotH = Math.max(20, plotBottom - plotTop)
  const yOf = (value: number) => plotTop + (1 - (value - scale.min) / (scale.max - scale.min || 1)) * plotH
  const { move, hit } = liveOf(spec)
  const wait = (index: number) => (index / count) * 400
  const digits = spec.digits ?? inferDigits(values)
  let body = legend.svg

  if (spec.unitLeft) body += text(plotLeft, plotTop - 4, spec.unitLeft, { fill: theme.muted, "font-size": 10 })
  categories.forEach((_, index) => {
    const column = series.map((item) => item.values[index]).filter((value): value is number => value !== null)

    if (!column.length) return
    const lo = Math.min(...column)
    const hi = Math.max(...column)
    const x = plotLeft + index * slot + slot / 2
    // 띠는 가운데에서 위아래로 벌어진다.
    body += move(rect(x - 3, yOf(hi), 6, Math.max(2, yOf(lo) - yOf(hi)), toneAt(theme, 1).wash), "rise", wait(index), `0 ${num((yOf(lo) + yOf(hi)) / 2)}px`)
  })
  series.forEach((item, seriesIndex) => {
    const tone = toneAt(theme, item.tone ?? seriesIndex)
    const mean = item.mark === "mean"
    item.values.forEach((value, index) => {
      if (value === null) return
      const x = plotLeft + index * slot + slot / 2
      body += move(circle(x, yOf(value), mean ? 6 : 4, tone.ink, mean ? { stroke: "#FFFFFF", "stroke-width": 1.5 } : undefined), "pop", wait(index) + 300)
    })
  })
  body += line(plotLeft, plotTop, plotLeft, plotBottom, theme.axis, 1)
  body += line(plotLeft, plotBottom, plotRight, plotBottom, theme.axis, 1)

  for (const tick of domain.ticks) {
    const y = yOf(tick)

    if (y < plotTop - 1 || y > plotBottom + 1) continue
    body += line(plotLeft, y, plotLeft - 4, y, theme.axis, 1)
    body += text(plotLeft - 6, y, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "end", "dominant-baseline": "middle" })
  }

  categories.forEach((label, index) => {
    body += text(plotLeft + index * slot + slot / 2, plotBottom + 16, label, { fill: theme.text, "font-size": 11, "text-anchor": "middle" })
    body += hit(plotLeft + index * slot, plotTop, slot, plotH, slotTip(label, series, index, (value) => formatValue(value, theme.negative, digits)))
  })

  return svgDoc(spec, theme, width, height, body)
}

function renderStrip(spec: ChartSpec, theme: Theme): string {
  const categories = categoriesOf(spec)
  const series = seriesOf(spec, categories.length)
  const values = series.flatMap((item) => [...item.values.filter((value): value is number => value !== null), ...(item.spread ?? []).flat()])

  if (!values.length) throw new Error("값이 필요합니다.")
  const digits = spec.digits ?? inferDigits(values)
  const domain = niceDomain(Math.min(...values), Math.max(...values), false)
  const scale = padDomain(domain, 0.08, false)
  const width = spec.width ?? 680
  const height = spec.height ?? 400
  const titleH = spec.title ? 36 : 8
  const footH = footHeight(spec)
  const plotLeft = Math.max(...domain.ticks.map((tick) => textWidth(formatTick(tick, theme.negative), 11))) + 16
  const plotRight = width - 16
  const slot = (plotRight - plotLeft) / categories.length

  const legend = drawLegend(
    [
      ...series.map((item, index) => ({ mark: "dot" as const, color: toneAt(theme, item.tone ?? index).ink, label: item.name })),
      { mark: "dot" as const, color: theme.emphasis, label: "평균" },
    ],
    (plotLeft + plotRight) / 2,
    titleH,
    plotRight - plotLeft,
    theme,
  )

  const plotTop = titleH + legend.height + (spec.unitLeft ? 16 : 4)
  const plotBottom = height - footH - 24
  const plotH = Math.max(20, plotBottom - plotTop)
  const yOf = (value: number) => plotTop + (1 - (value - scale.min) / (scale.max - scale.min || 1)) * plotH

  const label = (x: number, y: number, value: number) =>
    text(x, y, formatValue(value, theme.negative, digits), { fill: theme.text, "font-size": 10, "text-anchor": "middle", stroke: "#FFFFFF", "stroke-width": 3, "paint-order": "stroke" })

  let body = legend.svg

  if (spec.unitLeft) body += text(plotLeft, plotTop - 4, spec.unitLeft, { fill: theme.muted, "font-size": 10 })
  const { move, hit } = liveOf(spec)
  const show = (value: number) => formatValue(value, theme.negative, digits)
  let marks = ""
  let hits = ""
  categories.forEach((category, index) => {
    const xAt = (seriesIndex: number) => plotLeft + index * slot + (slot * (seriesIndex + 1)) / (series.length + 1)

    const ends = series.map((item) => {
      const spread = item.spread?.[index] ?? []

      return spread.length ? { low: Math.min(...spread), high: Math.max(...spread) } : null
    })

    const waitOf = (seriesIndex: number) => ((index * series.length + seriesIndex) / (categories.length * series.length)) * 400
    series.forEach((item, seriesIndex) => {
      const x = xAt(seriesIndex)
      const end = ends[seriesIndex]
      const before = ends[seriesIndex - 1]
      const delay = waitOf(seriesIndex)
      body += line(x, plotTop, x, plotBottom, "#E6E6E6", 1)

      if (end && before) {
        const links = line(xAt(seriesIndex - 1), yOf(before.high), x, yOf(end.high), toneAt(theme, 0).wash, 1) + line(xAt(seriesIndex - 1), yOf(before.low), x, yOf(end.low), toneAt(theme, 0).wash, 1)
        body += move(links, "fade", delay + 300)
      }

      for (const value of item.spread?.[index] ?? []) marks += move(circle(x, yOf(value), 3.5, toneAt(theme, item.tone ?? seriesIndex).ink, { "fill-opacity": 0.85 }), "pop", delay)

      if (end) marks += move(label(x, yOf(end.high) - 8, end.high), "fade", delay + 350)
    })
    series.forEach((item, seriesIndex) => {
      const mean = item.values[index]

      if (mean === null) return
      marks += move(circle(xAt(seriesIndex), yOf(mean), 5.5, theme.emphasis, { stroke: theme.text, "stroke-width": 1 }), "pop", waitOf(seriesIndex) + 300)
      marks += move(label(xAt(seriesIndex), yOf(mean) + 18, mean), "fade", waitOf(seriesIndex) + 350)
    })
    body += text(plotLeft + index * slot + slot / 2, plotBottom + 16, category, { fill: theme.text, "font-size": 11, "text-anchor": "middle" })

    const rows = series.flatMap((item, seriesIndex) => {
      const mean = item.values[index]
      const end = ends[seriesIndex]
      const range = end ? `${show(end.low)} ~ ${show(end.high)}` : ""

      if (mean === null) return range ? [`${item.name}: ${range}`] : []

      return [`${item.name}: 평균 ${show(mean)}${range ? ` (${range})` : ""}`]
    })

    hits += hit(plotLeft + index * slot, plotTop, slot, plotH, [category, ...rows].join("\n"))
  })
  body += marks + hits
  body += line(plotLeft, plotTop, plotLeft, plotBottom, theme.axis, 1)
  body += line(plotLeft, plotBottom, plotRight, plotBottom, theme.axis, 1)

  for (const tick of domain.ticks) {
    const y = yOf(tick)

    if (y < plotTop - 1 || y > plotBottom + 1) continue
    body += line(plotLeft, y, plotLeft - 4, y, theme.axis, 1)
    body += text(plotLeft - 6, y, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "end", "dominant-baseline": "middle" })
  }

  return svgDoc(spec, theme, width, height, body)
}

function renderProfile(spec: ChartSpec, theme: Theme): string {
  const categories = categoriesOf(spec)
  const series = seriesOf(spec, categories.length)
  const width = spec.width ?? 680
  const height = spec.height ?? 400
  const titleH = spec.title ? 36 : 8
  const gap = 28
  const plotLeft = Math.max(...categories.map((category) => textWidth(category, 11))) + 16
  const plotRight = width - 16
  const plotTop = titleH + 18
  const plotBottom = height - footHeight(spec) - 22
  const panelW = (plotRight - plotLeft - gap * (series.length - 1)) / series.length
  const row = (plotBottom - plotTop) / categories.length
  // 줄이 촘촘하면 범주 이름이 겹치므로 건너뛰며 적는다.
  const every = Math.ceil(13 / row)
  const { move, hit } = liveOf(spec)
  const digits = spec.digits ?? inferDigits(series.flatMap((item) => item.values.filter((value): value is number => value !== null)))
  let body = ""
  let hits = ""
  categories.forEach((category, index) => {
    if (index % every === 0) body += text(plotLeft - 6, plotTop + row * (index + 0.5), category, { fill: theme.text, "font-size": 11, "text-anchor": "end", "dominant-baseline": "middle" })
    hits += hit(plotLeft, plotTop + row * index, plotRight - plotLeft, row, slotTip(category, series, index, (value) => formatValue(value, theme.negative, digits)))
  })
  series.forEach((item, seriesIndex) => {
    const values = item.values.filter((value): value is number => value !== null)

    if (!values.length) throw new Error("값이 필요합니다.")
    const domain = niceDomain(Math.min(...values), Math.max(...values), true)
    const left = plotLeft + seriesIndex * (panelW + gap)
    const xOf = (value: number) => left + ((value - domain.min) / (domain.max - domain.min)) * panelW
    body += text(left + panelW / 2, plotTop - 6, item.name, { fill: theme.text, "font-size": 11, "font-weight": 600, "text-anchor": "middle" })
    item.values.forEach((value, index) => {
      if (value === null) return
      const bar = rect(Math.min(xOf(0), xOf(value)), plotTop + row * (index + 0.2), Math.abs(xOf(value) - xOf(0)), row * 0.6, toneAt(theme, item.tone ?? seriesIndex).ink)
      body += move(bar, "run", (index / categories.length) * 400, `${num(xOf(0))}px 0`)
    })
    body += line(xOf(0), plotTop, xOf(0), plotBottom, theme.axis, 1)
    body += line(left, plotBottom, left + panelW, plotBottom, theme.axis, 1)

    for (const tick of domain.ticks) {
      body += line(xOf(tick), plotBottom, xOf(tick), plotBottom + 4, theme.axis, 1)
      body += text(xOf(tick), plotBottom + 16, formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "middle" })
    }
  })

  return svgDoc(spec, theme, width, height, body + hits)
}

function renderMultiples(spec: ChartSpec, theme: Theme): string {
  const categories = categoriesOf(spec)
  const series = seriesOf(spec, categories.length)
  const numbers = (items: readonly Series[]) => items.flatMap((item) => item.values.filter((value): value is number => value !== null))
  const digits = spec.digits ?? inferDigits(numbers(series))
  const width = spec.width ?? 680
  const height = spec.height ?? 400
  const top = spec.title ? 36 : 8
  const rowCount = Math.ceil(series.length / 6)
  const perRow = Math.ceil(series.length / rowCount)
  const rowH = (height - footHeight(spec) - top) / rowCount
  const ink = toneAt(theme, 0).ink
  const { move, tip } = liveOf(spec)
  let body = ""

  for (let row = 0; row < rowCount; row += 1) {
    const items = series.slice(row * perRow, (row + 1) * perRow)
    const values = numbers(items)

    if (!values.length) throw new Error("값이 필요합니다.")
    // 줄마다 값의 크기가 다를 수 있어 눈금을 줄 단위로 잡는다.
    const domain = niceDomain(Math.min(...values), Math.max(...values), false)
    const scale = padDomain(domain, 0.12, false)
    const plotLeft = Math.max(...domain.ticks.map((tick) => textWidth(formatTick(tick, theme.negative), 11))) + 16
    const plotTop = top + row * rowH + 24
    const plotBottom = top + (row + 1) * rowH - 8
    const panelW = (width - 8 - plotLeft) / perRow
    const yOf = (value: number) => plotTop + (1 - (value - scale.min) / (scale.max - scale.min)) * (plotBottom - plotTop)
    items.forEach((_, index) => {
      if (index % 2 === 1) body += rect(plotLeft + index * panelW, plotTop - 22, panelW, plotBottom - plotTop + 22, theme.band)
    })

    if (spec.unitLeft) body += text(8, plotTop - 12, spec.unitLeft, { fill: theme.muted, "font-size": 10 })
    body += line(plotLeft, plotTop, plotLeft, plotBottom, theme.axis, 1)

    if (scale.min < 0 && scale.max > 0) body += line(plotLeft, yOf(0), width - 8, yOf(0), theme.axis, 1)

    for (const tick of domain.ticks) {
      body += line(plotLeft, yOf(tick), plotLeft - 4, yOf(tick), theme.axis, 1)
      body += text(plotLeft - 6, yOf(tick), formatTick(tick, theme.negative), { fill: theme.muted, "font-size": 11, "text-anchor": "end", "dominant-baseline": "middle" })
    }

    items.forEach((item, index) => {
      const left = plotLeft + index * panelW
      const nameX = left + (panelW - 22 - textWidth(item.name, 11)) / 2
      body += line(nameX, plotTop - 12, nameX + 18, plotTop - 12, ink, theme.lineWidth)
      body += circle(nameX + 9, plotTop - 12, 3, "#FFFFFF", { stroke: ink, "stroke-width": 1.5 })
      body += text(nameX + 22, plotTop - 8, item.name, { fill: theme.text, "font-size": 11 })
      const xOf = (at: number) => left + 16 + (panelW - 32) * (categories.length === 1 ? 0.5 : at / (categories.length - 1))
      let d = ""
      let pen = false
      let marks = ""
      item.values.forEach((value, at) => {
        if (value === null) {
          pen = false

          return
        }

        d += `${pen ? " L" : `${d ? " " : ""}M`} ${num(xOf(at))} ${num(yOf(value))}`
        pen = true
        marks += tip(circle(xOf(at), yOf(value), 3.5, "#FFFFFF", { stroke: ink, "stroke-width": 1.5 }), `${item.name}\n${categories[at]}: ${formatValue(value, theme.negative, digits)}`)

        if (item.labels === "all" || (item.labels === "end" && at === categories.length - 1)) {
          // 골짜기 점은 양옆 선이 위로 지나가므로 숫자를 아래에 둔다.
          const near = [item.values[at - 1], item.values[at + 1]].filter((other) => isNumber(other))
          const below = near.length > 0 && near.every((other) => other > value)
          marks += text(xOf(at), yOf(value) + (below ? 16 : -8), formatValue(value, theme.negative, digits), { fill: theme.text, "font-size": 10, "text-anchor": "middle" })
        }
      })
      body += move(path(d, ink, theme.lineWidth) + marks, "wipe", Math.min((row * perRow + index) * 80, 480))
    })
  }

  return svgDoc(spec, theme, width, height, body)
}

function renderRating(spec: ChartSpec, theme: Theme): string {
  const categories = categoriesOf(spec)
  const [score, ...extras] = seriesOf(spec, categories.length)
  const reach = Math.max(3, ...score.values.map((value) => Math.abs(Math.round(value ?? 0))))
  const digits = spec.digits ?? inferDigits(extras.flatMap((item) => item.values.filter((value): value is number => value !== null)))
  const width = spec.width ?? 680
  const titleH = spec.title ? 36 : 8
  const headH = 44
  const rowH = 26
  const height = spec.height ?? titleH + headH + categories.length * rowH + footHeight(spec)
  const gridLeft = 8 + Math.max(...categories.map((category) => textWidth(category, 12))) + 24
  const extraW = extras.map((item) => Math.max(64, textWidth(item.name, 12) + 24))
  const gridRight = width - 8 - extraW.reduce((sum, item) => sum + item, 0)
  const cell = (gridRight - gridLeft) / (reach * 2 + 1)
  const bottom = titleH + headH + categories.length * rowH
  let body = rect(8, titleH, width - 16, headH, theme.band)
  body += text((gridLeft + gridRight) / 2, titleH + 16, score.name, { fill: theme.text, "font-size": 12, "font-weight": 600, "text-anchor": "middle" })

  for (let step = -reach; step <= reach; step += 1) {
    const x = gridLeft + (step + reach) * cell
    body += line(x, titleH + 24, x, bottom, "#D9D9D9", 1)
    body += text(x + cell / 2, titleH + 38, formatValue(step, theme.negative, 0), { fill: theme.text, "font-size": 11, "text-anchor": "middle" })
  }

  body += line(gridRight, titleH + 24, gridRight, bottom, "#D9D9D9", 1)
  let extraX = gridRight
  extras.forEach((item, index) => {
    body += text(extraX + extraW[index] / 2, titleH + 26, item.name, { fill: theme.text, "font-size": 12, "font-weight": 600, "text-anchor": "middle" })
    extraX += extraW[index]
  })
  categories.forEach((category, index) => {
    const y = titleH + headH + index * rowH
    body += line(8, y + rowH, width - 8, y + rowH, "#E6E6E6", 1)
    body += text(16, y + 17, category, { fill: theme.text, "font-size": 12 })
    const value = score.values[index]

    if (value !== null) body += liveOf(spec).move(rect(gridLeft + (Math.round(value) + reach) * cell + 1, y + 1, cell - 2, rowH - 2, toneAt(theme, score.tone ?? 0).ink), "pop", (index / categories.length) * 400)
    let x = gridRight
    extras.forEach((item, at) => {
      const extra = item.values[index]

      if (extra !== null) body += text(x + extraW[at] / 2, y + 17, formatValue(extra, theme.negative, digits), { fill: theme.text, "font-size": 12, "text-anchor": "middle" })
      x += extraW[at]
    })
  })

  return svgDoc(spec, theme, width, height, body)
}

function renderTable(spec: ChartSpec, theme: Theme): string {
  const columns = spec.columns ?? []
  const rows = spec.rows ?? []

  if (!columns.length) throw new Error("표의 열이 필요합니다.")
  const numbers = rows.flatMap((row) => row.filter((cell) => isNumber(cell)))
  const digits = spec.digits ?? inferDigits(numbers)

  const formatted = rows.map((row) => columns.map((_, index) => {
    const cell = row[index]

    if (isNumber(cell)) return formatValue(cell, theme.negative, digits)

    return cell === undefined || cell === null ? "" : String(cell)
  }))

  const numeric = columns.map((_, index) => rows.length > 0 && rows.every((row) => isNumber(row[index])))

  const widths = columns.map((column, index) => {
    const cells = [column, ...formatted.map((row) => row[index])]

    return Math.max(...cells.map((cell) => textWidth(cell, 12))) + 22
  })

  const natural = widths.reduce((sum, width) => sum + width, 0)
  const width = Math.max(spec.width ?? 680, natural + 16)
  const scale = (width - 16) / natural
  const cols = widths.map((item) => item * scale)
  const titleH = spec.title ? 36 : 8
  const footH = footHeight(spec)
  const headH = 28
  const rowH = 26
  const height = spec.height ?? titleH + headH + rows.length * rowH + footH
  const headerFill = theme.series[0].ink
  const headerText = inkOn(headerFill)
  const low = Math.min(...numbers)
  const high = Math.max(...numbers)
  let body = rect(8, titleH, width - 16, headH, headerFill)
  let x = 8
  columns.forEach((column, index) => {
    const align = numeric[index] ? "end" : "start"
    const tx = align === "end" ? x + cols[index] - 8 : x + 8
    body += text(tx, titleH + 18, column, { fill: headerText, "font-size": 12, "font-weight": 600, "text-anchor": align })
    x += cols[index]
  })
  formatted.forEach((row, rowIndex) => {
    const y = titleH + headH + rowIndex * rowH

    if (rowIndex % 2 === 1) body += rect(8, y, width - 16, rowH, "#FAFAFA")
    body += line(8, y + rowH, width - 8, y + rowH, "#E6E6E6", 1)
    let cellX = 8
    row.forEach((cell, index) => {
      const align = numeric[index] ? "end" : "start"
      const tx = align === "end" ? cellX + cols[index] - 8 : cellX + 8
      const raw = rows[rowIndex][index]
      let fill = theme.text

      if (spec.type === "heatmap" && isNumber(raw)) {
        const ratio = low < 0 ? Math.abs(raw) / Math.max(-low, high) : (raw - low) / (high - low || 1)
        const heat = mix("#FFFFFF", toneAt(theme, raw < 0 ? 1 : 0).ink, 0.85 * ratio)
        body += liveOf(spec).move(rect(cellX + 1, y + 1, cols[index] - 2, rowH - 2, heat), "fade", ((rowIndex + index) / (rows.length + columns.length)) * 400)
        fill = inkOn(heat)
      }

      body += text(tx, y + 17, cell, { fill, "font-size": 12, "text-anchor": align })
      cellX += cols[index]
    })
  })

  return svgDoc(spec, theme, width, height, body)
}

export function chartSvg(spec: ChartSpec): string {
  const theme = spec.theme ?? orangeGray

  switch (spec.type) {
    case "column":
    case "bar":
    case "line":
    case "combo":
    case "lollipop":
    case "area":
    case "band":
      return renderCartesian(spec, theme)
    case "scatter":
    case "quadrant":
      return renderScatter(spec, theme)
    case "pie":
      return renderPie(spec, theme)
    case "waterfall":
      return renderWaterfall(spec, theme)
    case "range":
      return renderRange(spec, theme)
    case "strip":
      return renderStrip(spec, theme)
    case "profile":
      return renderProfile(spec, theme)
    case "multiples":
      return renderMultiples(spec, theme)
    case "rating":
      return renderRating(spec, theme)
    case "table":
    case "heatmap":
      return renderTable(spec, theme)
  }
}
