import { circle, line, niceDomain, num, path, rect, textWidth } from "../chart.ts"
import { inkOn, mix } from "../format.ts"
import { apart, curve, fade, gutterOf, label, maxAt, need, numbers, percent, pick, ribbon, scale, filled, slotLabels, tones, total, valueAxis } from "./core.ts"
import type { Box, Ctx, Key, ModernSeries } from "./core.ts"

type Pt = { x: number; y: number; index: number }

// 선과 면은 마우스가 닿을 도형이 없어서 범주마다 투명한 칸을 덮는다.
function slotHits(c: Ctx, cats: readonly string[], series: readonly ModernSeries[], xAt: (index: number) => number, area: Box): string {
  const step = cats.length > 1 ? Math.abs(xAt(1) - xAt(0)) : area.w

  return cats
    .map((cat, index) => {
      const rows = series.flatMap((item) => {
        const value = item.values[index] ?? null

        return value === null ? [] : [`${item.name}: ${c.show(value)}${c.unit}`]
      })

      return c.hit(xAt(index) - step / 2, area.y, step, area.h, [cat, ...rows].join("\n"))
    })
    .join("")
}

// 큰 수는 만, 억 단위로 줄여 적는다.
function compact(value: number): string {
  const units: [number, string][] = [
    [1e8, "억"],
    [1e4, "만"],
  ]

  for (const [size, unit] of units) if (Math.abs(value) >= size) return `${Number((value / size).toFixed(1)).toLocaleString("en-US")}${unit}`

  return value.toLocaleString("en-US")
}

export function lineChart(c: Ctx): string {
  const { pal, spec } = c
  const cats = need(spec.categories, "categories")
  const series = need(spec.series, "series")
  const kind = spec.variant
  const hi = pick(series.map((item) => item.name), spec.highlight, 0)
  const colors = kind === "multi" ? tones(pal, series.length, hi) : series.map((_, index) => (index === hi ? pal.accent : pal.strong))
  const main = series[hi]
  const band = kind === "band" && main?.low && main.high ? { low: main.low, high: main.high } : undefined
  const all = [...series.flatMap((item) => numbers(item.values)), ...(band ? [...numbers(band.low), ...numbers(band.high)] : []), ...(spec.guides ?? []).map((guide) => guide.value)]
  const axis = valueAxis(c, all, { zero: false, right: Math.max(...series.map((item) => textWidth(item.name, 11))) + 16 })
  const { inner, y } = axis
  const xAt = (index: number) => inner.x + 6 + (cats.length > 1 ? ((inner.w - 12) * index) / (cats.length - 1) : (inner.w - 12) / 2)
  const pointsOf = (values: readonly (number | null)[]): Pt[] => values.flatMap((value, index) => (value === null ? [] : [{ x: xAt(index), y: y(value), index }]))
  const trace = (points: readonly Pt[]) => (kind === "step" ? points.map((point, index) => (index ? `H ${num(point.x)} V ${num(point.y)}` : `M ${num(point.x)} ${num(point.y)}`)).join(" ") : curve(points))
  let body = axis.svg

  for (const guide of spec.guides ?? []) {
    body += line(inner.x, y(guide.value), inner.x + inner.w, y(guide.value), pal.strong, 1, "3 3")

    if (guide.label) body += label(inner.x + 4, y(guide.value) - 5, guide.label, pal.muted, { size: 10 })
  }

  if (band) body += c.move(filled(ribbon(pointsOf(band.high), pointsOf(band.low)), pal.wash), "fade", 200)
  // 예측 구간은 이 위치부터 점선으로 그린다.
  const split = kind === "forecast" ? (spec.forecastFrom ?? Math.floor(cats.length * 0.75)) : -1

  if (split >= 0) body += line(xAt(split), inner.y, xAt(split), inner.y + inner.h, pal.strong, 1, "3 3") + label(xAt(split) + 6, inner.y + 10, "예측", pal.muted, { size: 10 })
  const order = series.map((_, index) => index).sort((a, b) => Number(a === hi) - Number(b === hi))

  for (const index of order) {
    const on = index === hi
    const color = colors[index]
    const points = pointsOf(series[index].values)
    let part = ""

    if (on && kind === undefined && points.length > 1) part += fade(pal, `${trace(points)} L ${num(points[points.length - 1].x)} ${num(inner.y + inner.h)} L ${num(points[0].x)} ${num(inner.y + inner.h)} Z`)

    if (on && split >= 0) part += path(trace(points.filter((point) => point.index <= split)), color, 2.5) + path(trace(points.filter((point) => point.index >= split)), color, 2.5, "5 5")
    else part += path(trace(points), color, on ? 2.5 : 1.5)

    if (cats.length <= 16) for (const point of points) part += circle(point.x, point.y, on ? 3 : 2.5, on ? color : "#FFFFFF", { stroke: on ? "#FFFFFF" : color, "stroke-width": 1.5 })
    body += c.move(part, "wipe", on ? 300 : 0)
  }

  const ends = apart(series.map((item) => pointsOf(item.values).at(-1)?.y ?? inner.y), 13, inner.y, inner.y + inner.h)
  series.forEach((item, index) => (body += label(inner.x + inner.w + 6, ends[index], item.name, index === hi ? pal.text : pal.muted, { bold: index === hi, mid: true })))

  return body + slotHits(c, cats, series, xAt, inner) + slotLabels(c, cats, xAt, inner.y + inner.h + 16)
}

export function area(c: Ctx): string {
  const { pal, spec } = c
  const cats = need(spec.categories, "categories")
  const series = need(spec.series, "series")
  const full = spec.variant === "percent"
  const hi = pick(series.map((item) => item.name), spec.highlight, 0)
  const colors = tones(pal, series.length, hi, true)
  const sums = cats.map((_, index) => total(series.map((item) => item.values[index] ?? 0)))
  const axis = valueAxis(c, [0, full ? 100 : Math.max(...sums)], { right: Math.max(...series.map((item) => textWidth(item.name, 11))) + 14 })
  const { inner, y } = axis
  const xAt = (index: number) => inner.x + (cats.length > 1 ? (inner.w * index) / (cats.length - 1) : inner.w / 2)
  let body = axis.svg
  let base = cats.map(() => 0)
  const ends: number[] = []
  series.forEach((item, at) => {
    const top = base.map((value, index) => value + ((item.values[index] ?? 0) / (full ? sums[index] / 100 : 1)))
    const edge = (values: readonly number[]) => values.map((value, index) => ({ x: xAt(index), y: y(value) }))
    body += c.move(filled(ribbon(edge(top), edge(base)), colors[at], { stroke: "#FFFFFF", "stroke-width": 1 }), "rise", at * 90, `0 ${num(y(0))}px`)
    ends.push((y(top[top.length - 1]) + y(base[base.length - 1])) / 2)
    base = top
  })
  const ys = apart(ends, 13, inner.y, inner.y + inner.h)
  series.forEach((item, index) => (body += label(inner.x + inner.w + 8, ys[index], item.name, index === hi ? pal.text : pal.muted, { bold: index === hi, mid: true })))
  c.legend(series.map((item, index) => ({ label: item.name, color: colors[index] })))

  return body + slotHits(c, cats, series, xAt, inner) + slotLabels(c, cats, xAt, inner.y + inner.h + 16)
}

export function stream(c: Ctx): string {
  const { pal, box, spec } = c
  const cats = need(spec.categories, "categories")
  const series = need(spec.series, "series")
  const value = (s: number, index: number) => series[s].values[index] ?? 0
  const hi = pick(series.map((item) => item.name), spec.highlight, 0)
  const colors = tones(pal, series.length, hi, true)
  // 봉우리가 이른 띠부터 위아래로 번갈아 놓아서 큰 띠가 가운데에 오게 한다.
  const sums = series.map((_, s) => total(cats.map((_, index) => value(s, index))))
  const peaks = series.map((_, s) => maxAt(cats.map((_, index) => value(s, index))))
  const upper: number[] = []
  const lower: number[] = []
  let up = 0
  let down = 0

  for (const s of series.map((_, index) => index).sort((a, b) => peaks[a] - peaks[b])) {
    if (up < down) {
      up += sums[s]
      upper.push(s)
    } else {
      down += sums[s]
      lower.push(s)
    }
  }

  const order = [...lower.reverse(), ...upper]
  // 바닥선을 띠의 기울기 변화가 가장 작아지게 움직여서 띠가 덜 출렁이게 한다.
  const floor = [0]

  for (let index = 1; index < cats.length; index += 1) {
    let whole = 0
    let drift = 0
    order.forEach((s, at) => {
      let shift = (value(s, index) - value(s, index - 1)) / 2

      for (const below of order.slice(0, at)) shift += value(below, index) - value(below, index - 1)
      whole += value(s, index)
      drift += shift * value(s, index)
    })
    floor.push(floor[index - 1] - (whole ? drift / whole : 0))
  }

  let base = floor

  const layers = order.map((s) => {
    const top = base.map((level, index) => level + value(s, index))
    const layer = { s, base, top }
    base = top

    return layer
  })

  const inner: Box = { x: box.x, y: box.y + 4, w: box.w, h: box.h - 28 }
  const y = scale(Math.min(...floor), Math.max(...base), inner.y + inner.h, inner.y)
  const xAt = (index: number) => inner.x + (cats.length > 1 ? (inner.w * index) / (cats.length - 1) : inner.w / 2)
  let body = ""
  let words = ""
  layers.forEach((layer, at) => {
    const edge = (values: readonly number[]) => values.map((level, index) => ({ x: xAt(index), y: y(level) }))
    body += c.move(filled(ribbon(edge(layer.top), edge(layer.base)), colors[layer.s], { stroke: "#FFFFFF", "stroke-width": 1 }), "fade", at * 90)
    // 이름은 띠가 가장 두꺼운 곳에 적는다. 양 끝은 글자가 잘리므로 피한다.
    const inside = cats.map((_, index) => (index && index < cats.length - 1 ? value(layer.s, index) : -1))
    const spot = maxAt(inside)
    const thick = y(layer.base[spot]) - y(layer.top[spot])

    if (thick >= 15) words += label(xAt(spot), (y(layer.base[spot]) + y(layer.top[spot])) / 2, series[layer.s].name, inkOn(colors[layer.s]), { size: 10, bold: true, anchor: "middle", mid: true })
  })

  return body + words + slotHits(c, cats, series, xAt, inner) + slotLabels(c, cats, xAt, inner.y + inner.h + 18)
}

export function sparkline(c: Ctx): string {
  const { pal, box, spec } = c
  const item = need(spec.series, "series")[0]
  const values = numbers(item.values)
  const end = values.length - 1
  const word = c.show(values[end])
  const inner: Box = { x: box.x + 6, y: box.y + 12, w: box.w - textWidth(word, 15) - 26, h: box.h - 24 }
  const bottom = inner.y + inner.h
  const tipOf = (index: number) => `${spec.categories?.[index] ?? item.name}: ${c.show(values[index])}${c.unit}`
  let body = ""
  let wordY = inner.y + inner.h / 2

  if (spec.variant === "bar") {
    const y = scale(Math.min(0, ...values), Math.max(...values), bottom, inner.y)
    const slot = inner.w / values.length
    values.forEach((value, index) => (body += c.tip(c.move(rect(inner.x + slot * (index + 0.15), y(value), slot * 0.7, bottom - y(value), index === end ? pal.accent : pal.neutral, { rx: 2 }), "rise", index * 20, `0 ${num(bottom)}px`), tipOf(index))))
  } else {
    const y = scale(Math.min(...values), Math.max(...values), bottom - 4, inner.y + 4)
    const points = values.map((value, index) => ({ x: inner.x + (inner.w * index) / (end || 1), y: y(value) }))
    const d = curve(points)
    let part = spec.variant === "line" ? "" : fade(pal, `${d} L ${num(points[end].x)} ${num(bottom)} L ${num(points[0].x)} ${num(bottom)} Z`)
    part += path(d, pal.accent, 2)
    body += c.move(part, "wipe")

    // 최고점과 최저점은 속이 빈 점으로, 마지막 값은 찬 점으로 찍는다.
    if (spec.variant !== "line") for (const index of new Set([maxAt(values), values.indexOf(Math.min(...values))])) if (index !== end) body += circle(points[index].x, points[index].y, 4, "#FFFFFF", { stroke: pal.ink, "stroke-width": 1.5 })
    body += circle(points[end].x, points[end].y, 4, pal.accent)
    const step = inner.w / (end || 1)
    points.forEach((point, index) => (body += c.hit(point.x - step / 2, inner.y, step, inner.h, tipOf(index))))
    wordY = points[end].y
  }

  return body + label(inner.x + inner.w + 12, wordY, word, pal.text, { size: 15, bold: true, mid: true })
}

export function calendar(c: Ctx): string {
  const { pal, box, spec } = c
  const dates = need(spec.categories, "categories")
  const values = need(spec.series, "series")[0].values

  const days = dates.map((iso, index) => {
    const date = new Date(`${iso}T00:00:00Z`)

    return { iso, value: values[index] ?? 0, dow: date.getUTCDay(), n: Math.round(date.getTime() / 86400000), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
  })

  // 주는 일요일에 시작한다. 한 주가 한 열이다.
  const start = days[0].n - days[0].dow
  const weekOf = (day: (typeof days)[number]) => Math.floor((day.n - start) / 7)
  const weeks = weekOf(days[days.length - 1]) + 1
  const cell = Math.min((box.w - 24) / weeks, (box.h - 40) / 7)
  const x0 = box.x + 24
  const y0 = box.y + 18 + (box.h - 40 - cell * 7) / 2
  const max = Math.max(1, ...days.map((day) => day.value))
  const gap = Math.min(3, cell * 0.16)
  const levels = [0, 0.25, 0.5, 0.75, 1].map((level) => (level ? mix("#FFFFFF", pal.accent, level) : pal.soft))
  let body = ""
  days.forEach((day, index) => {
    const week = weekOf(day)
    const box2 = rect(x0 + week * cell, y0 + day.dow * cell, cell - gap, cell - gap, levels[day.value <= 0 ? 0 : Math.ceil((day.value / max) * 4)], { rx: Math.min(3, cell / 4) })
    body += c.tip(c.move(box2, "pop", week * 14), `${day.iso}: ${c.show(day.value)}${c.unit}`)

    if (day.day === 1 || (!index && day.day <= 15)) body += label(x0 + week * cell, y0 - 6, `${day.month}월`, pal.muted, { size: 10 })
  })

  for (const [dow, name] of [
    [1, "월"],
    [3, "수"],
    [5, "금"],
  ] as const)
    body += label(x0 - 8, y0 + dow * cell + (cell - gap) / 2, name, pal.muted, { size: 10, anchor: "end", mid: true })
  const right = box.x + box.w
  const y = y0 + cell * 7 + 14
  body += label(right, y, "많음", pal.muted, { size: 10, anchor: "end", mid: true })
  levels.forEach((fill, index) => (body += rect(right - 28 - (levels.length - index) * 13, y - 5, 10, 10, fill, { rx: 2 })))

  return body + label(right - 34 - levels.length * 13, y, "적음", pal.muted, { size: 10, anchor: "end", mid: true })
}

export function bump(c: Ctx): string {
  const { pal, box, spec } = c
  const cats = need(spec.categories, "categories")
  const series = need(spec.series, "series")

  const ends = series.map((item) => {
    const ranks = numbers(item.values)

    return { first: ranks[0], last: ranks[ranks.length - 1] }
  })

  // 기본 강조는 순위가 가장 많이 오른 항목이다.
  const hi = pick(series.map((item) => item.name), spec.highlight, maxAt(ends.map((end) => end.first - end.last)))
  const most = Math.max(...series.flatMap((item) => numbers(item.values)))
  const left = gutterOf(series.map((item) => item.name))
  const inner: Box = { x: box.x + left, y: box.y + 10, w: box.w - left - Math.max(...series.map((item) => textWidth(`#${most} ${item.name}`, 11))) - 14, h: box.h - 42 }
  const xAt = (index: number) => inner.x + (cats.length > 1 ? (inner.w * index) / (cats.length - 1) : inner.w / 2)
  const yAt = (rank: number) => inner.y + (most > 1 ? (rank - 1) / (most - 1) : 0.5) * inner.h
  let body = ""
  const order = series.map((_, index) => index).sort((a, b) => Number(a === hi) - Number(b === hi))

  for (const index of order) {
    const item = series[index]
    const on = index === hi
    const points = item.values.flatMap((rank, at) => (rank === null ? [] : [{ x: xAt(at), y: yAt(rank), rank, at }]))
    // 순위가 바뀌는 구간만 휘고 점 위에서는 수평으로 지나간다.
    const d = points.map((point, at) => (at ? `C ${num((points[at - 1].x + point.x) / 2)} ${num(points[at - 1].y)} ${num((points[at - 1].x + point.x) / 2)} ${num(point.y)} ${num(point.x)} ${num(point.y)}` : `M ${num(point.x)} ${num(point.y)}`)).join(" ")
    let part = path(d, on ? pal.accent : pal.neutral, on ? 3 : 2)

    for (const point of points) part += c.tip(circle(point.x, point.y, on ? 4.5 : 3.5, on ? pal.accent : "#FFFFFF", on ? undefined : { stroke: pal.strong, "stroke-width": 1.5 }), `${cats[point.at]} · ${item.name}: ${point.rank}위`)
    body += c.move(part, "wipe", on ? 300 : 0)
    body += label(inner.x - 12, yAt(ends[index].first), item.name, on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true })
    body += label(inner.x + inner.w + 12, yAt(ends[index].last), `#${ends[index].last} ${item.name}`, on ? pal.text : pal.muted, { bold: on, mid: true })
  }

  return body + slotLabels(c, cats, xAt, inner.y + inner.h + 24)
}

export function candlestick(c: Ctx): string {
  const { pal, box, spec } = c
  const candles = need(spec.candles, "candles")
  const peak = Math.max(...candles.map((candle) => candle.volume ?? 0))
  const volH = peak > 0 ? box.h * 0.18 : 0
  const low = Math.min(...candles.map((candle) => candle.low))
  const high = Math.max(...candles.map((candle) => candle.high))
  // 봉이 납작해지지 않게 눈금은 고르게 잡되 그림은 실제 고가와 저가 범위에 맞춘다.
  const domain = { ticks: niceDomain(low, high, false).ticks.filter((tick) => tick >= low && tick <= high) }
  const inner: Box = { x: box.x, y: box.y + 8, w: box.w - Math.max(...[low, high].map((tick) => textWidth(c.show(tick), 11))) - 22, h: box.h - 30 - (volH ? volH + 8 : 0) }
  const y = scale(low - (high - low) * 0.04, high + (high - low) * 0.04, inner.y + inner.h, inner.y)
  const floor = box.y + box.h - 22
  const step = inner.w / candles.length
  const w = Math.max(Math.min(step * 0.62, 12), 1.5)
  const xAt = (index: number) => inner.x + step * (index + 0.5)
  let body = ""

  for (const tick of domain.ticks) body += line(inner.x, y(tick), inner.x + inner.w, y(tick), pal.line, 1) + label(inner.x + inner.w + 8, y(tick), c.show(tick), pal.muted, { mid: true })
  let hits = ""
  candles.forEach((candle, index) => {
    const up = candle.close >= candle.open
    const color = up ? pal.accent : pal.strong
    const mark = line(xAt(index), y(candle.high), xAt(index), y(candle.low), color, 1) + rect(xAt(index) - w / 2, Math.min(y(candle.open), y(candle.close)), w, Math.max(Math.abs(y(candle.open) - y(candle.close)), 1), color, { rx: 1 })
    body += c.move(mark, "fade", index * 12)

    if (candle.volume) body += c.move(rect(xAt(index) - w / 2, floor - (candle.volume / peak) * volH, w, (candle.volume / peak) * volH, up ? pal.wash : pal.soft), "rise", index * 12, `0 ${num(floor)}px`)
    hits += c.hit(xAt(index) - step / 2, inner.y, step, floor - inner.y, `${candle.date}\n시가 ${c.show(candle.open)} · 고가 ${c.show(candle.high)}\n저가 ${c.show(candle.low)} · 종가 ${c.show(candle.close)}${candle.volume ? `\n거래량 ${c.show(candle.volume)}` : ""}`)
    const month = candle.date.slice(5, 7)

    if (month && month !== candles[index - 1]?.date.slice(5, 7)) body += label(xAt(index) - w / 2, floor + 16, `${Number(month)}월`, pal.muted)
  })

  const keys: Key[] = [
    { label: "상승", color: pal.accent },
    { label: "하락", color: pal.strong },
  ]

  const closes = candles.map((candle) => candle.close)

  const averages: [number, string][] = [
    [5, pal.ink],
    [20, pal.strong],
  ]

  // 봉만 그리는 꼴이 아니면 종가 이동평균선을 얹는다. 봉이 기간보다 적으면 그 선은 그리지 않는다.
  for (const [period, color] of spec.variant === "plain" ? [] : averages) {
    const points = closes.flatMap((_, index) => (index + 1 < period ? [] : [{ x: xAt(index), y: y(total(closes.slice(index + 1 - period, index + 1)) / period) }]))

    if (points.length < 2) continue
    body += c.move(path(curve(points), color, 1.2), "wipe", 500)
    keys.push({ label: `${period}일선`, color, mark: "line" })
  }

  const last = candles[candles.length - 1].close
  const word = c.show(last)
  const tagW = textWidth(word, 11) + 12
  body += line(inner.x, y(last), inner.x + inner.w, y(last), pal.accent, 1, "2 3") + rect(inner.x + inner.w + 3, y(last) - 9, tagW, 18, pal.accent, { rx: 4 }) + label(inner.x + inner.w + 3 + tagW / 2, y(last) + 0.5, word, inkOn(pal.accent), { bold: true, anchor: "middle", mid: true })
  c.legend(keys)

  return body + hits
}

export function skyline(c: Ctx): string {
  const { pal, box, spec } = c
  const cats = need(spec.categories, "categories")
  const series = need(spec.series, "series")
  const back = series.filter((item) => !item.front)
  const front = series.filter((item) => item.front)
  const colors = tones(pal, back.length, pick(back.map((item) => item.name), spec.highlight, 0), true)
  const frontColors = front.map((_, index) => (index ? pal.strong : pal.ink))
  const sumOf = (items: readonly ModernSeries[], index: number) => total(items.map((item) => item.values[index] ?? 0))
  const sums = cats.map((_, index) => sumOf(back, index))
  const peak = maxAt(sums)
  const domain = niceDomain(0, Math.max(...sums), true)
  const slotGuess = (box.w - 60) / cats.length
  // 블록의 옆면과 윗면이 뒤로 물러나는 거리.
  const dx = Math.min(8, slotGuess * 0.2)
  const dy = dx * 0.75
  const room = front.length ? 14 : 0
  const inner: Box = { x: box.x + 2, y: box.y + 26, w: box.w - Math.max(...domain.ticks.map((tick) => textWidth(compact(tick), 10))) - dx - 14, h: box.h - 50 - room }
  const y = scale(domain.min, domain.max, inner.y + inner.h, inner.y)
  const ground = y(0)
  let body = rect(inner.x + dx, inner.y - dy, inner.w, inner.h, pal.soft)

  for (const tick of domain.ticks) body += line(inner.x + dx, y(tick) - dy, inner.x + dx + inner.w, y(tick) - dy, pal.line, 1) + label(inner.x + dx + inner.w + 6, y(tick) - dy, compact(tick), pal.muted, { size: 10, mid: true })
  body += filled(`M ${num(inner.x)} ${num(ground + room)} L ${num(inner.x + dx)} ${num(ground - dy)} L ${num(inner.x + dx + inner.w)} ${num(ground - dy)} L ${num(inner.x + inner.w)} ${num(ground + room)} Z`, mix(pal.soft, pal.line, 0.6))
  const slot = inner.w / cats.length
  const w = slot * 0.72

  // 블록 하나: 앞면 네모에 옆면을 붙이고, 맨 위 조각에는 윗면을 얹는다.
  const block = (x: number, top: number, bottom: number, width: number, depth: number, fill: string, lid: boolean) => {
    const rise = depth * 0.75
    const side = filled(`M ${num(x + width)} ${num(top)} L ${num(x + width + depth)} ${num(top - rise)} L ${num(x + width + depth)} ${num(bottom - rise)} L ${num(x + width)} ${num(bottom)} Z`, mix(fill, "#000000", 0.22))
    const roof = lid ? filled(`M ${num(x)} ${num(top)} L ${num(x + depth)} ${num(top - rise)} L ${num(x + width + depth)} ${num(top - rise)} L ${num(x + width)} ${num(top)} Z`, mix(fill, "#FFFFFF", 0.4)) : ""

    return rect(x, top, width, bottom - top, fill) + side + roof
  }

  const rowsOf = (index: number) => series.map((item) => `${item.name}: ${c.show(item.values[index] ?? 0)}${c.unit}`)
  cats.forEach((cat, index) => {
    const x = inner.x + slot * index + (slot - w) / 2
    let level = 0
    let part = ""
    back.forEach((item, at) => {
      const next = level + (item.values[index] ?? 0)
      part += block(x, y(next), y(level), w, dx, colors[at], at === back.length - 1)
      level = next
    })
    body += c.move(part, "rise", index * 40, `0 ${num(ground)}px`)
    // 앞줄은 같은 눈금으로 바닥 앞쪽에 따로 세운다.
    let low = 0
    let small = ""
    front.forEach((item, at) => {
      const next = low + (item.values[index] ?? 0)
      small += block(x - 2, Math.min(y(next), y(low) - 1.5) + room - 3, y(low) + room - 3, w * 0.45, dx / 2, frontColors[at], at === front.length - 1)
      low = next
    })
    body += c.move(small, "rise", index * 40 + 300, `0 ${num(ground + room)}px`)
    body += c.hit(inner.x + slot * index, inner.y - dy, slot, inner.h + dy + room, [cat, ...rowsOf(index)].join("\n"))
  })
  // 오른쪽 끝 블록 위의 글자는 눈금 글자와 겹치지 않게 블록의 오른쪽 끝에 맞춘다.
  const late = peak > cats.length * 0.7
  body += label(inner.x + slot * (peak + (late ? 0.86 : 0.5)) + dx, y(sums[peak]) - dy - 6, `최고 ${compact(sums[peak])}`, pal.text, { size: 10, bold: true, anchor: late ? "end" : "middle", halo: true })
  // ISO 날짜는 월/일만 적는다.
  const short = (cat: string) => cat.replace(/^\d{4}-(\d\d)-(\d\d)$/, (_, month: string, day: string) => `${Number(month)}/${Number(day)}`)

  if (front.length) {
    const tops = cats.map((_, index) => sumOf(front, index))
    const at = maxAt(tops)
    body += label(inner.x + dx, inner.y - dy - 8, `${front.map((item) => item.name).join("·")} 최고 ${short(cats[at])} · ${compact(tops[at])} (${percent(tops[at] / sums[at])})`, pal.muted, { size: 10 })
  }

  c.legend([...back.map((item, index) => ({ label: item.name, color: colors[index] })), ...front.map((item, index) => ({ label: item.name, color: frontColors[index] }))])

  return body + slotLabels(c, cats.map(short), (index) => inner.x + slot * (index + 0.5), ground + room + 16, peak)
}
