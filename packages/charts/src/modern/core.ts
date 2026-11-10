import { attrs, line, liveOf, niceDomain, num, text, textWidth } from "../chart.ts"
import type { Guide, WaterfallStep } from "../chart.ts"
import { contrast, inferDigits, mix } from "../format.ts"
import type { Theme } from "../theme.ts"

export type ModernType =
  | "pie" | "donut" | "waffle" | "marimekko" | "segmented"
  | "treemap" | "sunburst"
  | "funnel" | "sankey" | "chord" | "tree"
  | "bar" | "waterfall" | "pareto" | "radar" | "slope" | "dumbbell" | "lollipop" | "combo" | "diverging" | "butterfly" | "tornado" | "rangeBar"
  | "line" | "area" | "stream" | "sparkline" | "calendar" | "bump" | "candlestick" | "skyline"
  | "box" | "beeswarm" | "ridgeline" | "histogram"
  | "heatmap" | "bubble" | "scatter" | "parallel"
  | "gauge" | "bullet" | "radialBar" | "stat"

export type ModernSeries = {
  name: string
  // 분포 차트(box, beeswarm, ridgeline, histogram)에서는 관측값 목록이다.
  values: readonly (number | null)[]
  low?: readonly (number | null)[]
  high?: readonly (number | null)[]
  // skyline 전용. 같은 눈금의 앞줄에 따로 세운다.
  front?: boolean
}

export type ModernItem = { label: string; value: number; group?: string }

export type ModernPoint = { x: number; y: number; label?: string; size?: number; group?: string }

export type ModernLink = { from: string; to: string; value: number }

export type Candle = { date: string; open: number; high: number; low: number; close: number; volume?: number }

export type Bullet = { label: string; value: number; target: number; ranges: readonly [number, number, number] }

export type ModernSpec = {
  kind: "modern"
  type: ModernType
  variant?: string
  theme?: Theme
  title?: string
  subtitle?: string
  takeaway?: string
  // 강조할 항목이나 시리즈의 이름. 생략하면 차트마다 정해진 항목(가장 큰 값 등)을 강조한다.
  highlight?: string
  unit?: string
  caption?: string
  digits?: number
  categories?: readonly string[]
  series?: readonly ModernSeries[]
  items?: readonly ModernItem[]
  steps?: readonly WaterfallStep[]
  points?: readonly ModernPoint[]
  links?: readonly ModernLink[]
  candles?: readonly Candle[]
  bullets?: readonly Bullet[]
  guides?: readonly Guide[]
  target?: number
  max?: number
  forecastFrom?: number
  xLabel?: string
  yLabel?: string
  width?: number
  height?: number
  live?: boolean
}

export type Box = { x: number; y: number; w: number; h: number }

export type Key = { label: string; color: string; mark?: "line" | "dot" }

export type Pal = {
  accent: string
  wash: string
  ink: string
  strong: string
  neutral: string
  soft: string
  line: string
  text: string
  muted: string
}

export type Ctx = ReturnType<typeof liveOf> & {
  spec: ModernSpec
  pal: Pal
  box: Box
  unit: string
  show: (value: number, digits?: number) => string
  legend: (keys: readonly Key[]) => void
}

export function paletteOf(theme: Theme): Pal {
  // 두 번째 색은 테마의 나머지 색 중 가장 어두운 것이다. 흰 바탕에서 글자만큼 진하지 않으면 본문 색을 쓴다.
  const dark = theme.series.slice(1).map((tone) => tone.ink).sort((a, b) => contrast(b, "#FFFFFF") - contrast(a, "#FFFFFF"))[0]

  return {
    accent: theme.series[0].ink,
    // 테마의 wash는 테마마다 진하기가 달라서, 넓은 면에 깔 옅은 강조색은 강조색에서 직접 만든다.
    wash: mix("#FFFFFF", theme.series[0].ink, 0.26),
    ink: contrast(dark, "#FFFFFF") >= 4.5 ? dark : theme.text,
    strong: mix(theme.band, theme.muted, 0.6),
    neutral: mix(theme.band, theme.muted, 0.15),
    soft: mix("#FFFFFF", theme.band, 0.6),
    line: theme.band,
    text: theme.text,
    muted: theme.muted,
  }
}

// 강조 항목만 강조색이고 나머지는 두 번째 색에서 옅은 회색까지 차례로 옅어진다.
// 넓은 면(쌓은 영역 등)은 wide를 켜서 두 번째 색이 화면을 덮지 않게 회색 단계만 쓴다.
export function tones(pal: Pal, count: number, hi: number, wide = false): string[] {
  const rest = count - (hi >= 0 && hi < count ? 1 : 0)
  const from = wide ? 0 : 1
  let at = 0

  return Array.from({ length: count }, (_, index) => {
    if (index === hi) return pal.accent
    const order = at++

    if (rest === 1) return pal.neutral

    if (order < from) return pal.ink
    const span = rest - 1 - from

    return span <= 0 ? pal.neutral : mix(pal.strong, pal.neutral, (order - from) / span)
  })
}

// 이름으로 고른 항목의 위치. 이름을 주지 않으면 차트의 기본 항목이고, 없는 이름이면 아무것도 강조하지 않는다.
export function pick(names: readonly string[], wanted: string | undefined, fallback: number): number {
  return wanted === undefined ? fallback : names.indexOf(wanted)
}

export function maxAt(values: readonly number[]): number {
  return values.indexOf(Math.max(...values))
}

export function total(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0)
}

export function need<T>(list: readonly T[] | undefined, name: string): readonly T[] {
  if (!list?.length) throw new Error(`${name} 값이 필요합니다.`)

  return list
}

export function numbers(values: readonly (number | null)[]): number[] {
  return values.filter((value): value is number => value !== null)
}

export function percent(share: number): string {
  const value = share * 100

  return `${value >= 0.95 || value === 0 ? value.toFixed(0) : value.toFixed(1)}%`
}

export function showWith(theme: Theme, fixed: number | undefined): Ctx["show"] {
  return (value, digits = fixed ?? inferDigits([value])) => {
    const body = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })

    if (Number(value.toFixed(digits)) >= 0) return body

    return theme.negative === "paren" ? `(${body})` : `-${body}`
  }
}

type TextOpt = { size?: number; bold?: boolean; anchor?: "start" | "middle" | "end"; mid?: boolean; halo?: boolean }

export function label(x: number, y: number, content: string, fill: string, opt: TextOpt = {}): string {
  return text(x, y, content, {
    fill,
    "font-size": opt.size ?? 11,
    "font-weight": opt.bold ? 700 : undefined,
    "text-anchor": opt.anchor,
    "dominant-baseline": opt.mid ? "middle" : undefined,
    // 선이나 도형 위에 놓이는 글자는 둘레를 희게 둘러 읽히게 한다.
    stroke: opt.halo ? "#FFFFFF" : undefined,
    "stroke-width": opt.halo ? 3 : undefined,
    "paint-order": opt.halo ? "stroke" : undefined,
  })
}

export function filled(d: string, fill: string, extra?: Record<string, string | number | undefined>): string {
  return `<path ${attrs({ d, fill, ...extra })}/>`
}

// 강조색이 아래로 옅어지는 면. 색이 같으면 id와 내용도 같아서 한 문서에 차트가 여러 장 있어도 서로 덮어쓰지 않는다.
export function fade(pal: Pal, d: string): string {
  const id = `hm-fade-${pal.accent.slice(1)}`

  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.accent}" stop-opacity="0.28"/><stop offset="1" stop-color="${pal.accent}" stop-opacity="0"/></linearGradient></defs>${filled(d, `url(#${id})`)}`
}

export function scale(d0: number, d1: number, r0: number, r1: number): (value: number) => number {
  return (value) => r0 + ((value - d0) / (d1 - d0 || 1)) * (r1 - r0)
}

type Pt = { x: number; y: number }

// 부드러운 선. 조절점을 두 점 사이에 가둬서 곡선이 실제 값보다 높거나 낮게 튀지 않게 한다.
export function curve(points: readonly Pt[], start = "M"): string {
  return points
    .map((point, index) => {
      if (!index) return `${start} ${num(point.x)} ${num(point.y)}`
      const prev = points[index - 1]
      const before = points[index - 2] ?? prev
      const after = points[index + 1] ?? point
      const within = (y: number) => Math.min(Math.max(y, Math.min(prev.y, point.y)), Math.max(prev.y, point.y))

      return `C ${num(prev.x + (point.x - before.x) / 6)} ${num(within(prev.y + (point.y - before.y) / 6))} ${num(point.x - (after.x - prev.x) / 6)} ${num(within(point.y - (after.y - prev.y) / 6))} ${num(point.x)} ${num(point.y)}`
    })
    .join(" ")
}

// 위쪽 선과 아래쪽 선 사이를 채운 면.
export function ribbon(top: readonly Pt[], base: readonly Pt[]): string {
  return `${curve(top)} ${curve([...base].reverse(), "L")} Z`
}

// 각도는 12시에서 시작해 시계 방향으로 도는 라디안이다.
export function polar(cx: number, cy: number, r: number, angle: number): Pt {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) }
}

export function sector(cx: number, cy: number, r0: number, r1: number, from: number, to: number): string {
  // 한 바퀴를 꽉 채우면 시작점과 끝점이 같아 호가 그려지지 않으므로 끝을 조금 덜 채운다.
  const end = Math.min(to, from + Math.PI * 2 - 1e-4)

  const at = (r: number, angle: number) => {
    const point = polar(cx, cy, r, angle)

    return `${num(point.x)} ${num(point.y)}`
  }

  const big = end - from > Math.PI ? 1 : 0

  if (r0 <= 0) return `M ${num(cx)} ${num(cy)} L ${at(r1, from)} A ${num(r1)} ${num(r1)} 0 ${big} 1 ${at(r1, end)} Z`

  return `M ${at(r1, from)} A ${num(r1)} ${num(r1)} 0 ${big} 1 ${at(r1, end)} L ${at(r0, end)} A ${num(r0)} ${num(r0)} 0 ${big} 0 ${at(r0, from)} Z`
}

export function arc(cx: number, cy: number, r: number, from: number, to: number, stroke: string, width: number): string {
  const end = Math.min(to, from + Math.PI * 2 - 1e-4)
  const a = polar(cx, cy, r, from)
  const b = polar(cx, cy, r, end)
  const d = `M ${num(a.x)} ${num(a.y)} A ${num(r)} ${num(r)} 0 ${end - from > Math.PI ? 1 : 0} 1 ${num(b.x)} ${num(b.y)}`

  return `<path ${attrs({ d, fill: "none", stroke, "stroke-width": width, "stroke-linecap": "round" })}/>`
}

// 겹치는 글자를 위아래로 밀어 최소 간격을 지킨다. 받은 순서대로 돌려준다.
export function apart(ys: readonly number[], gap: number, lo: number, hi: number): number[] {
  const order = ys.map((y, index) => ({ y, index })).sort((a, b) => a.y - b.y)
  let floor = lo

  for (const item of order) {
    item.y = Math.max(item.y, floor)
    floor = item.y + gap
  }

  let ceil = hi

  for (const item of [...order].reverse()) {
    item.y = Math.min(item.y, ceil)
    ceil = item.y - gap
  }

  const out: number[] = []

  for (const item of order) out[item.index] = item.y

  return out
}

type AxisOpt = { zero?: boolean; left?: number; right?: number; top?: number; foot?: number; fmt?: (value: number) => string }

// 세로 값 축. 가로 눈금선과 눈금 글자를 그리고, 남은 그림 영역과 위치 함수를 돌려준다.
export function valueAxis(c: Ctx, values: readonly number[], opt: AxisOpt = {}) {
  const domain = niceDomain(Math.min(...values), Math.max(...values), opt.zero ?? true)
  const fmt = opt.fmt ?? ((value: number) => c.show(value))
  const gutter = Math.max(...domain.ticks.map((tick) => textWidth(fmt(tick), 11))) + 10
  const top = 8 + (opt.top ?? 0)
  const inner: Box = { x: c.box.x + gutter, y: c.box.y + top, w: c.box.w - gutter - (opt.right ?? 0), h: c.box.h - top - (opt.foot ?? 22) }
  const y = scale(domain.min, domain.max, inner.y + inner.h, inner.y)
  let svg = ""

  for (const tick of domain.ticks) svg += line(inner.x, y(tick), inner.x + inner.w, y(tick), c.pal.line, 1) + label(inner.x - 8, y(tick), fmt(tick), c.pal.muted, { anchor: "end", mid: true })

  return { svg, inner, y, domain }
}

// 가로 값 축. 세로 눈금선과 아래쪽 눈금 글자를 그린다. left는 왼쪽 이름 칸의 폭이다.
export function valueAxisX(c: Ctx, values: readonly number[], opt: AxisOpt = {}) {
  const domain = niceDomain(Math.min(...values), Math.max(...values), opt.zero ?? true)
  const fmt = opt.fmt ?? ((value: number) => c.show(value))
  const top = 4 + (opt.top ?? 0)
  const inner: Box = { x: c.box.x + (opt.left ?? 0), y: c.box.y + top, w: c.box.w - (opt.left ?? 0) - (opt.right ?? 0), h: c.box.h - top - (opt.foot ?? 22) }
  const x = scale(domain.min, domain.max, inner.x, inner.x + inner.w)
  let svg = ""

  for (const tick of domain.ticks) svg += line(x(tick), inner.y, x(tick), inner.y + inner.h, c.pal.line, 1) + label(x(tick), inner.y + inner.h + 16, fmt(tick), c.pal.muted, { anchor: "middle" })

  return { svg, inner, x, domain }
}

// 아래쪽 범주 이름. 촘촘해서 겹치면 건너뛰며 적고, 강조한 범주는 굵게 적는다.
export function slotLabels(c: Ctx, names: readonly string[], xAt: (index: number) => number, y: number, hi = -1): string {
  const gap = names.length > 1 ? Math.abs(xAt(1) - xAt(0)) : Infinity
  const every = Math.max(1, Math.ceil((Math.max(...names.map((name) => textWidth(name, 11))) + 10) / gap))

  return names.map((name, index) => (index % every && index !== hi ? "" : label(xAt(index), y, name, index === hi ? c.pal.text : c.pal.muted, { anchor: "middle", bold: index === hi }))).join("")
}

// 왼쪽 이름 칸의 폭.
export function gutterOf(names: readonly string[], size = 11): number {
  return Math.max(...names.map((name) => textWidth(name, size))) + 12
}
