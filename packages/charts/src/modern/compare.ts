import { circle, line, niceDomain, num, path, rect, textWidth } from "../chart.ts"
import { inferDigits, inkOn } from "../format.ts"
import { apart, curve, gutterOf, label, maxAt, need, numbers, percent, pick, polar, scale, filled, slotLabels, tones, total, valueAxis, valueAxisX } from "./core.ts"
import type { Ctx, Key } from "./core.ts"

export function bar(c: Ctx): string {
  const { pal, spec } = c
  const cats = need(spec.categories, "categories")
  const series = need(spec.series, "series")
  const single = series.length === 1
  const flat = spec.variant === "horizontal"
  const mode = single || spec.variant === "grouped" ? "grouped" : spec.variant === "percent" ? "percent" : "stacked"
  const value = (s: number, i: number) => series[s].values[i] ?? 0
  const sums = cats.map((_, i) => total(series.map((_, s) => value(s, i))))
  // 시리즈가 하나면 가장 큰 막대를, 여럿이면 고른 시리즈(기본은 마지막)를 강조한다.
  const hiSeries = single ? -1 : pick(series.map((item) => item.name), spec.highlight, series.length - 1)
  const hiCat = single ? pick(cats, spec.highlight, maxAt(cats.map((_, i) => value(0, i)))) : -1
  const colors = tones(pal, series.length, hiSeries, true)
  const all = series.flatMap((_, s) => cats.map((_, i) => value(s, i)))
  const top = mode === "percent" ? 100 : mode === "stacked" ? Math.max(...sums) : Math.max(...all) * 1.06
  const axis = flat ? valueAxisX(c, [Math.min(0, ...(mode === "grouped" ? all : [])), top], { left: gutterOf(cats), right: 34 }) : valueAxis(c, [Math.min(0, ...(mode === "grouped" ? all : [])), top])
  const pos = "x" in axis ? axis.x : axis.y
  const inner = axis.inner
  const slot = (flat ? inner.h : inner.w) / cats.length
  const lanes = mode === "grouped" ? series.length : 1
  const thick = Math.min(slot * (lanes > 1 ? 0.74 : 0.6), (flat ? 26 : 72) * lanes) / lanes
  const digits = spec.digits ?? inferDigits(all)
  let body = axis.svg
  let words = ""
  cats.forEach((cat, i) => {
    const start = (flat ? inner.y : inner.x) + slot * i + (slot - thick * lanes) / 2
    let base = 0
    series.forEach((item, s) => {
      const raw = value(s, i)
      const from = mode === "grouped" ? 0 : base
      const to = from + (mode === "percent" ? (raw / sums[i]) * 100 : raw)
      base = to
      const a = Math.min(pos(from), pos(to))
      const length = Math.abs(pos(to) - pos(from))
      const lane = start + (mode === "grouped" ? s * thick : 0)
      const inset = lanes > 1 ? 1 : 0
      const fill = single ? (i === hiCat ? pal.accent : pal.neutral) : colors[s]
      // 쌓은 조각은 높이가 값 그대로여야 하므로 틈을 띄우지 않고 흰 테두리로 나눈다.
      const extra = { rx: 3, stroke: mode === "grouped" ? undefined : "#FFFFFF", "stroke-width": mode === "grouped" ? undefined : 1.5 }
      const box = flat ? rect(a, lane + inset, length, thick - inset * 2, fill, extra) : rect(lane + inset, a, thick - inset * 2, length, fill, extra)
      body += c.tip(c.move(box, flat ? "run" : "rise", i * 80, flat ? `${num(pos(0))}px 0` : `0 ${num(pos(0))}px`), `${cat}${single ? "" : ` · ${item.name}`}: ${c.show(raw, digits)}${c.unit}${mode === "percent" ? ` (${percent(raw / sums[i])})` : ""}`)
      const word = mode === "percent" ? percent(raw / sums[i]) : c.show(raw, digits)
      const mid = lane + thick / 2
      let text = ""

      if (mode === "grouped") {
        const on = single ? i === hiCat : s === hiSeries

        // 묶은 막대가 글자보다 가늘면 값이 서로 겹치므로 적지 않는다.
        if (flat) text = thick >= 11 ? label(pos(to) + (raw < 0 ? -6 : 6), mid, word, on ? pal.text : pal.muted, { bold: on, mid: true, anchor: raw < 0 ? "end" : "start" }) : ""
        else if (thick >= textWidth(word, 11) + 2) text = label(mid, pos(to) + (raw < 0 ? 14 : -6), word, on ? pal.text : pal.muted, { bold: on, anchor: "middle" })
      } else if (length >= (flat ? textWidth(word, 11) + 8 : 16)) {
        text = label(flat ? a + length / 2 : mid, flat ? mid : a + length / 2, word, inkOn(fill), { bold: true, anchor: "middle", mid: true })
      }

      words += c.move(text, "fade", i * 80 + 350)
    })

    if (flat) body += label(inner.x - 10, start + (thick * lanes) / 2, cat, i === hiCat ? pal.text : pal.muted, { anchor: "end", mid: true, bold: i === hiCat })
  })

  if (!flat) body += slotLabels(c, cats, (i) => inner.x + slot * (i + 0.5), inner.y + inner.h + 16, hiCat)

  if (!single) c.legend(series.map((item, s) => ({ label: item.name, color: colors[s] })))

  return body + words
}

export function waterfall(c: Ctx): string {
  const { pal, spec } = c
  const steps = need(spec.steps, "steps")
  let run = 0

  const bars = steps.map((step) => {
    const from = step.total ? 0 : run
    run = step.total ? step.value : run + step.value

    return { step, from, to: run }
  })

  const hi = pick(steps.map((step) => step.label), spec.highlight, maxAt(steps.map((step) => (step.total ? 0 : Math.abs(step.value)))))
  const edges = bars.flatMap((bar) => [bar.from, bar.to])
  const axis = valueAxis(c, [Math.min(0, ...edges), Math.max(...edges) * 1.08])
  const slot = axis.inner.w / bars.length
  const w = Math.min(slot * 0.62, 64)
  let body = axis.svg
  bars.forEach((bar, index) => {
    const whole = bar.step.total === true
    const x = axis.inner.x + slot * index + (slot - w) / 2
    const y = Math.min(axis.y(bar.from), axis.y(bar.to))
    const h = Math.max(Math.abs(axis.y(bar.to) - axis.y(bar.from)), 1)
    const fill = whole ? pal.ink : index === hi ? pal.accent : bar.step.value >= 0 ? pal.neutral : pal.strong
    const word = whole ? c.show(bar.to) : `${bar.step.value > 0 ? "+" : ""}${c.show(bar.step.value)}`
    // 막대가 앞 막대의 끝에서 이어 자라도록 시작 높이를 기준으로 삼는다.
    body += c.tip(c.move(rect(x, y, w, h, fill, { rx: 3 }), "rise", index * 110, `0 ${num(axis.y(bar.from))}px`), `${bar.step.label}: ${word}${c.unit}`)
    body += c.move(label(x + w / 2, y - 6, word, whole || index === hi ? pal.text : pal.muted, { bold: whole || index === hi, anchor: "middle" }), "fade", index * 110 + 350)

    if (bars[index + 1]) body += c.move(line(x + w, axis.y(bar.to), x + slot, axis.y(bar.to), pal.strong, 1, "2 3"), "fade", index * 110 + 350)
    body += label(x + w / 2, axis.inner.y + axis.inner.h + 16, bar.step.label, whole ? pal.text : pal.muted, { anchor: "middle", bold: whole })
  })
  c.legend([
    { label: "증가", color: pal.neutral },
    { label: "감소", color: pal.strong },
  ])

  return body
}

export function pareto(c: Ctx): string {
  const { pal, spec } = c
  const items = [...need(spec.items, "items")].sort((a, b) => b.value - a.value)
  const sum = total(items.map((item) => item.value))
  const shares = items.map((item) => (item.value / sum) * 100)
  const piled = shares.map((_, index) => total(shares.slice(0, index + 1)))
  const limit = spec.target ?? 80
  // 누적 비율이 기준선에 닿기 전까지의 막대를 강조한다. 첫 막대가 이미 넘으면 그 막대만 강조한다.
  const edge = Math.max(0, piled.filter((value) => value <= limit).length - 1)
  const axis = valueAxis(c, [0, 100], { right: 34 })
  const { inner, y } = axis
  const slot = inner.w / items.length
  const w = Math.min(slot * 0.6, 56)
  const xAt = (index: number) => inner.x + slot * (index + 0.5)
  let body = axis.svg
  items.forEach((item, index) => {
    const box = rect(xAt(index) - w / 2, y(shares[index]), w, y(0) - y(shares[index]), index <= edge ? pal.accent : pal.neutral, { rx: 3 })
    body += c.tip(c.move(box, "rise", index * 60, `0 ${num(y(0))}px`), `${item.label}: ${c.show(item.value)}${c.unit} (${percent(shares[index] / 100)})\n누적 ${percent(piled[index] / 100)}`)
  })
  body += line(inner.x, y(limit), inner.x + inner.w, y(limit), pal.strong, 1, "2 3") + label(inner.x + inner.w + 6, y(limit), `${limit}%`, pal.muted, { mid: true })
  const points = piled.map((value, index) => ({ x: xAt(index), y: y(value) }))
  let top = path(points.map((point, index) => `${index ? "L" : "M"} ${num(point.x)} ${num(point.y)}`).join(" "), pal.ink, 2)
  points.forEach((point, index) => (top += circle(point.x, point.y, index === edge ? 4.5 : 2.5, pal.ink, index === edge ? { stroke: "#FFFFFF", "stroke-width": 2 } : undefined)))
  top += label(points[edge].x + 8, points[edge].y + 16, percent(piled[edge] / 100), pal.text, { bold: true, halo: true })
  body += c.move(top, "wipe", items.length * 60 + 200)
  body += slotLabels(c, items.map((_, index) => `${index + 1}위`), xAt, inner.y + inner.h + 16)
  c.legend([
    { label: "비중", color: pal.neutral },
    { label: "누적", color: pal.ink, mark: "line" },
  ])

  return body
}

export function radar(c: Ctx): string {
  const { pal, box, spec } = c
  const axes = need(spec.categories, "categories")
  const series = need(spec.series, "series")
  const hi = pick(series.map((item) => item.name), spec.highlight, 0)
  const max = spec.max ?? niceDomain(0, Math.max(...series.flatMap((item) => numbers(item.values))), true).max
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2 + 2
  const r = Math.min(box.h / 2 - 22, box.w * 0.3)
  const turn = (index: number) => (index / axes.length) * Math.PI * 2

  const loop = (ratio: (index: number) => number) =>
    `${axes
      .map((_, index) => {
        const point = polar(cx, cy, r * ratio(index), turn(index))

        return `${index ? "L" : "M"} ${num(point.x)} ${num(point.y)}`
      })
      .join(" ")} Z`

  let body = ""
  let rings = ""

  for (let level = 1; level <= 4; level += 1) {
    body += spec.variant === "circular" ? circle(cx, cy, (r * level) / 4, "none", { stroke: pal.line }) : path(loop(() => level / 4), pal.line, 1)
    rings += label(cx + 4, cy - (r * level) / 4 + 3, c.show((max * level) / 4), pal.muted, { size: 9, halo: true })
  }

  axes.forEach((name, index) => {
    const tip = polar(cx, cy, r, turn(index))
    const out = polar(cx, cy, r + 14, turn(index))
    const side = Math.sin(turn(index))
    body += line(cx, cy, tip.x, tip.y, pal.line, 1) + label(out.x, out.y, name, pal.text, { mid: true, anchor: Math.abs(side) < 0.25 ? "middle" : side > 0 ? "start" : "end" })
  })
  body += rings
  const order = series.map((_, index) => index).sort((a, b) => Number(a === hi) - Number(b === hi))

  for (const index of order) {
    const item = series[index]
    const on = index === hi
    const d = loop((at) => (item.values[at] ?? 0) / max)
    let part = on ? filled(d, pal.accent, { "fill-opacity": 0.18, stroke: pal.accent, "stroke-width": 2, "stroke-linejoin": "round" }) : path(d, pal.strong, 1.5)
    axes.forEach((name, at) => {
      const point = polar(cx, cy, (r * (item.values[at] ?? 0)) / max, turn(at))
      part += c.tip(circle(point.x, point.y, on ? 3 : 2.5, on ? pal.accent : pal.strong), `${name} · ${item.name}: ${c.show(item.values[at] ?? 0)}${c.unit}`)
    })
    body += c.move(part, "pop", on ? 250 : 0, `${num(cx)}px ${num(cy)}px`)
  }

  c.legend(series.map((item, index) => ({ label: item.name, color: index === hi ? pal.accent : pal.strong })))

  return body
}

export function slope(c: Ctx): string {
  const { pal, box, spec } = c
  const cats = need(spec.categories, "categories")
  const rows = need(spec.series, "series").map((item) => ({ name: item.name, a: item.values[0] ?? 0, b: item.values[1] ?? 0 }))
  const hi = pick(rows.map((row) => row.name), spec.highlight, maxAt(rows.map((row) => row.b - row.a)))
  const digits = spec.digits ?? inferDigits(rows.flatMap((row) => [row.a, row.b]))
  const lefts = rows.map((row) => `${row.name} ${c.show(row.a, digits)}${c.unit}`)
  const rights = rows.map((row) => `${c.show(row.b, digits)}${c.unit} ${row.name}`)
  const x0 = box.x + Math.max(...lefts.map((word) => textWidth(word, 11))) + 14
  const x1 = box.x + box.w - Math.max(...rights.map((word) => textWidth(word, 11))) - 14
  const top = box.y + 30
  const bottom = box.y + box.h - 8
  const y = scale(Math.min(...rows.flatMap((row) => [row.a, row.b])), Math.max(...rows.flatMap((row) => [row.a, row.b])), bottom, top)
  const ya = apart(rows.map((row) => y(row.a)), 14, top, bottom)
  const yb = apart(rows.map((row) => y(row.b)), 14, top, bottom)
  let body = label(x0, box.y + 12, cats[0], pal.text, { bold: true, anchor: "middle" }) + label(x1, box.y + 12, cats[1] ?? "", pal.text, { bold: true, anchor: "middle" })
  body += line(x0, top - 8, x0, bottom + 6, pal.line, 1) + line(x1, top - 8, x1, bottom + 6, pal.line, 1)
  const order = rows.map((_, index) => index).sort((a, b) => Number(a === hi) - Number(b === hi))

  for (const index of order) {
    const row = rows[index]
    const on = index === hi
    const color = on ? pal.accent : pal.neutral
    const mark = line(x0, y(row.a), x1, y(row.b), color, on ? 2.5 : 1.5) + circle(x0, y(row.a), on ? 4 : 3, color) + circle(x1, y(row.b), on ? 4 : 3, color)
    body += c.tip(c.move(mark, "wipe", on ? 300 : 0), `${row.name}: ${c.show(row.a, digits)}${c.unit} → ${c.show(row.b, digits)}${c.unit}`)
    body += label(x0 - 10, ya[index], lefts[index], on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true })
    body += label(x1 + 10, yb[index], rights[index], on ? pal.text : pal.muted, { bold: on, mid: true })
  }

  return body
}

export function dumbbell(c: Ctx): string {
  const { pal, spec } = c
  const cats = need(spec.categories, "categories")

  const rows = need(spec.series, "series")
    .map((item) => ({ name: item.name, a: item.values[0] ?? 0, b: item.values[1] ?? 0 }))
    .sort((a, b) => b.b - a.b)

  const hi = pick(rows.map((row) => row.name), spec.highlight, maxAt(rows.map((row) => Math.abs(row.b - row.a))))
  const all = rows.flatMap((row) => [row.a, row.b])
  const digits = spec.digits ?? inferDigits(all)
  const axis = valueAxisX(c, all, { zero: false, left: gutterOf(rows.map((row) => row.name)), right: 34 })
  const { inner, x } = axis
  const rowH = inner.h / rows.length
  let body = axis.svg
  rows.forEach((row, index) => {
    const y = inner.y + rowH * (index + 0.5)
    const on = index === hi
    const mark = line(x(row.a), y, x(row.b), y, on ? pal.accent : pal.neutral, 3) + circle(x(row.a), y, 4, pal.strong) + circle(x(row.b), y, 5, on ? pal.accent : pal.ink)
    body += c.tip(c.move(mark, "wipe", index * 70), `${row.name}: ${c.show(row.a, digits)}${c.unit} → ${c.show(row.b, digits)}${c.unit}`)
    body += label(inner.x - 12, y, row.name, on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true })
    body += c.move(label(x(row.b) + (row.b >= row.a ? 10 : -10), y, c.show(row.b, digits), pal.text, { bold: true, mid: true, anchor: row.b >= row.a ? "start" : "end" }), "fade", index * 70 + 400)
  })
  c.legend([
    { label: cats[0], color: pal.strong, mark: "dot" },
    { label: cats[1] ?? "", color: pal.ink, mark: "dot" },
  ])

  return body
}

export function lollipop(c: Ctx): string {
  const { pal, spec } = c
  const items = [...need(spec.items, "items")].sort((a, b) => b.value - a.value)
  const hi = pick(items.map((item) => item.label), spec.highlight, 0)
  const values = [0, Math.max(...items.map((item) => item.value)) * 1.04]
  const tipOf = (index: number) => `${items[index].label}: ${c.show(items[index].value)}${c.unit}`

  if (spec.variant === "vertical") {
    const axis = valueAxis(c, values)
    const slot = axis.inner.w / items.length
    const xAt = (index: number) => axis.inner.x + slot * (index + 0.5)
    let body = axis.svg
    items.forEach((item, index) => {
      const on = index === hi
      const mark = line(xAt(index), axis.y(0), xAt(index), axis.y(item.value), on ? pal.accent : pal.neutral, 2) + circle(xAt(index), axis.y(item.value), 5, on ? pal.accent : pal.strong)
      body += c.tip(c.move(mark, "rise", index * 60, `0 ${num(axis.y(0))}px`), tipOf(index))
      body += c.move(label(xAt(index), axis.y(item.value) - 11, c.show(item.value), on ? pal.text : pal.muted, { bold: on, anchor: "middle" }), "fade", index * 60 + 350)
    })

    return body + slotLabels(c, items.map((item) => item.label), xAt, axis.inner.y + axis.inner.h + 16, hi)
  }

  const axis = valueAxisX(c, values, { left: gutterOf(items.map((item) => item.label)), right: 30 })
  const rowH = axis.inner.h / items.length
  let body = axis.svg
  items.forEach((item, index) => {
    const y = axis.inner.y + rowH * (index + 0.5)
    const on = index === hi
    const mark = line(axis.x(0), y, axis.x(item.value), y, on ? pal.accent : pal.neutral, 2) + circle(axis.x(item.value), y, 5, on ? pal.accent : pal.strong)
    body += c.tip(c.move(mark, "run", index * 60, `${num(axis.x(0))}px 0`), tipOf(index))
    body += label(axis.inner.x - 12, y, item.label, on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true })
    body += c.move(label(axis.x(item.value) + 11, y, c.show(item.value), on ? pal.text : pal.muted, { bold: on, mid: true }), "fade", index * 60 + 350)
  })

  return body
}

export function combo(c: Ctx): string {
  const { pal, spec } = c
  const cats = need(spec.categories, "categories")
  const [bars, ...lines] = need(spec.series, "series")
  // 선은 단위가 다른 값(이익률 등)이라 오른쪽에 따로 눈금을 둔다.
  const side = lines.length ? niceDomain(Math.min(...lines.flatMap((item) => numbers(item.values))), Math.max(...lines.flatMap((item) => numbers(item.values))), true) : undefined
  const sideGutter = side ? Math.max(...side.ticks.map((tick) => textWidth(c.show(tick), 11))) + 12 : 0
  const axis = valueAxis(c, [0, ...numbers(bars.values)], { right: sideGutter })
  const { inner } = axis
  const slot = inner.w / cats.length
  const w = Math.min(slot * 0.5, 56)
  const xAt = (index: number) => inner.x + slot * (index + 0.5)
  let body = axis.svg
  bars.values.forEach((value, index) => {
    if (value === null) return
    const box = rect(xAt(index) - w / 2, Math.min(axis.y(value), axis.y(0)), w, Math.abs(axis.y(0) - axis.y(value)), pal.neutral, { rx: 3 })
    body += c.tip(c.move(box, "rise", index * 70, `0 ${num(axis.y(0))}px`), `${cats[index]} · ${bars.name}: ${c.show(value)}${c.unit}`)
  })
  const keys: Key[] = [{ label: bars.name, color: pal.neutral }]

  if (side) {
    const y = scale(side.min, side.max, inner.y + inner.h, inner.y)

    for (const tick of side.ticks) body += label(inner.x + inner.w + 8, y(tick), c.show(tick), pal.muted, { mid: true })
    lines.forEach((item, at) => {
      const color = at ? pal.ink : pal.accent
      const digits = spec.digits ?? inferDigits(numbers(item.values))
      const points = item.values.flatMap((value, index) => (value === null ? [] : [{ x: xAt(index), y: y(value), value, index }]))
      let part = path(curve(points), color, at ? 1.5 : 2.5)

      for (const point of points) {
        part += c.tip(circle(point.x, point.y, 3.5, color, { stroke: "#FFFFFF", "stroke-width": 1.5 }), `${cats[point.index]} · ${item.name}: ${c.show(point.value, digits)}`)

        if (!at) part += label(point.x, point.y - 10, c.show(point.value, digits), pal.text, { bold: true, anchor: "middle", halo: true })
      }

      body += c.move(part, "wipe", 400 + at * 150)
      keys.push({ label: item.name, color, mark: "line" })
    })
  }

  c.legend(keys)

  return body + slotLabels(c, cats, xAt, inner.y + inner.h + 16)
}

export function diverging(c: Ctx): string {
  const { pal, spec } = c
  const cats = need(spec.categories, "categories")
  const values = need(spec.series, "series")[0].values
  const rows = cats.map((name, index) => ({ name, value: values[index] ?? 0 })).sort((a, b) => b.value - a.value)
  const hi = pick(rows.map((row) => row.name), spec.highlight, -1)
  const digits = spec.digits ?? inferDigits(rows.map((row) => row.value))
  const word = (value: number) => `${value > 0 ? "+" : ""}${c.show(value, digits)}${c.unit}`
  const room = Math.max(...rows.map((row) => textWidth(word(row.value), 11))) + 10
  const axis = valueAxisX(c, [0, ...rows.map((row) => row.value)], { left: gutterOf(rows.map((row) => row.name)) + (rows.some((row) => row.value < 0) ? room : 0), right: room })
  const { inner, x } = axis
  const rowH = inner.h / rows.length
  const thick = Math.min(rowH * 0.62, 24)
  let body = axis.svg
  rows.forEach((row, index) => {
    const y = inner.y + rowH * (index + 0.5)
    const up = row.value >= 0
    // 고른 항목이 없으면 오른 쪽을 강조색으로, 내린 쪽을 회색으로 나눈다.
    const fill = (hi < 0 ? up : index === hi) ? pal.accent : up && hi >= 0 ? pal.neutral : pal.strong
    const box = rect(Math.min(x(0), x(row.value)), y - thick / 2, Math.abs(x(row.value) - x(0)), thick, fill, { rx: 3 })
    body += c.tip(c.move(box, "run", index * 60, `${num(x(0))}px 0`), `${row.name}: ${word(row.value)}`)
    body += c.move(label(x(row.value) + (up ? 6 : -6), y, word(row.value), pal.text, { bold: true, mid: true, anchor: up ? "start" : "end" }), "fade", index * 60 + 350)
    body += label(c.box.x + gutterOf(rows.map((item) => item.name)) - 12, y, row.name, pal.text, { anchor: "end", mid: true })
  })

  return body + line(x(0), inner.y, x(0), inner.y + inner.h, pal.text, 1)
}

export function butterfly(c: Ctx): string {
  const { pal, box, spec } = c
  const cats = need(spec.categories, "categories")
  const series = need(spec.series, "series")
  const colors = tones(pal, 2, pick(series.map((item) => item.name), spec.highlight, 1))
  const value = (s: number, i: number) => series[s]?.values[i] ?? 0
  const all = cats.flatMap((_, i) => [value(0, i), value(1, i)])
  const digits = spec.digits ?? inferDigits(all)
  const spine = Math.max(...cats.map((name) => textWidth(name, 11))) + 24
  const cx = box.x + box.w / 2
  const reach = (box.w - spine) / 2 - Math.max(...all.map((item) => textWidth(c.show(item, digits), 11))) - 10
  const rowH = (box.h - 20) / cats.length
  const thick = Math.min(rowH * 0.62, 26)
  const max = Math.max(...all)
  let body = label(cx - spine / 2, box.y + 10, series[0].name, pal.muted, { anchor: "end", bold: true }) + label(cx + spine / 2, box.y + 10, series[1]?.name ?? "", pal.muted, { bold: true })
  cats.forEach((cat, i) => {
    const y = box.y + 20 + rowH * (i + 0.5)
    body += label(cx, y, cat, pal.text, { anchor: "middle", mid: true })

    for (const s of [0, 1]) {
      const w = (value(s, i) / max) * reach
      const dir = s ? 1 : -1
      const x = cx + dir * (spine / 2) + (s ? 0 : -w)
      body += c.tip(c.move(rect(x, y - thick / 2, w, thick, colors[s], { rx: 3 }), "run", i * 60, `${num(cx + dir * (spine / 2))}px 0`), `${cat} · ${series[s].name}: ${c.show(value(s, i), digits)}${c.unit}`)
      body += c.move(label(cx + dir * (spine / 2 + w + 6), y, c.show(value(s, i), digits), pal.text, { bold: s === 1, mid: true, anchor: s ? "start" : "end" }), "fade", i * 60 + 350)
    }
  })

  return body
}

export function tornado(c: Ctx): string {
  const { pal, spec } = c
  const cats = need(spec.categories, "categories")
  const [low, high] = need(spec.series, "series")
  const rows = cats.map((name, index) => ({ name, low: low.values[index] ?? 0, high: high?.values[index] ?? 0 })).sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low))
  const ends = rows.flatMap((row) => [row.low, row.high])
  const base = spec.target ?? total(ends) / ends.length
  const room = Math.max(...ends.map((value) => textWidth(c.show(value), 11))) + 10
  const axis = valueAxisX(c, [...ends, base], { zero: false, left: gutterOf(cats) + room, right: room, top: 16 })
  const { inner, x } = axis
  const rowH = inner.h / rows.length
  const thick = Math.min(rowH * 0.62, 24)
  let body = axis.svg
  rows.forEach((row, index) => {
    const y = inner.y + rowH * (index + 0.5)

    const ends2 = [
      { value: row.low, fill: pal.strong, name: low.name },
      { value: row.high, fill: pal.accent, name: high?.name ?? "" },
    ]

    for (const end of ends2) {
      const right = end.value >= base
      const box = rect(Math.min(x(base), x(end.value)), y - thick / 2, Math.abs(x(end.value) - x(base)), thick, end.fill, { rx: 3 })
      body += c.tip(c.move(box, "run", index * 70, `${num(x(base))}px 0`), `${row.name} · ${end.name}: ${c.show(end.value)}${c.unit}`)
      body += c.move(label(x(end.value) + (right ? 6 : -6), y, c.show(end.value), pal.text, { mid: true, anchor: right ? "start" : "end" }), "fade", index * 70 + 350)
    }

    body += label(c.box.x + gutterOf(cats) - 12, y, row.name, pal.text, { anchor: "end", mid: true, bold: !index })
  })
  body += line(x(base), inner.y - 4, x(base), inner.y + inner.h, pal.text, 1) + label(x(base), inner.y - 9, `${spec.caption ?? "기준"} ${c.show(base)}`, pal.text, { bold: true, anchor: "middle" })
  c.legend([
    { label: low.name, color: pal.strong },
    { label: high?.name ?? "", color: pal.accent },
  ])

  return body
}

export function rangeBar(c: Ctx): string {
  const { pal, spec } = c
  const cats = need(spec.categories, "categories")
  const item = need(spec.series, "series")[0]
  const rows = cats.map((name, index) => ({ name, low: item.low?.[index] ?? 0, high: item.high?.[index] ?? 0, value: item.values[index] ?? null }))
  const ends = rows.flatMap((row) => [row.low, row.high])
  const room = Math.max(...ends.map((value) => textWidth(c.show(value), 11))) + 10
  const axis = valueAxisX(c, [...ends, ...(spec.target === undefined ? [] : [spec.target])], { zero: false, left: gutterOf(cats) + room, right: room, top: 16 })
  const { inner, x } = axis
  const rowH = inner.h / rows.length
  let body = axis.svg
  let marks = ""
  rows.forEach((row, index) => {
    const y = inner.y + rowH * (index + 0.5)
    body += c.tip(c.move(rect(x(row.low), y - 7, x(row.high) - x(row.low), 14, pal.neutral, { rx: 7 }), "run", index * 70, `${num(x(row.low))}px 0`), `${row.name}: ${c.show(row.low)} ~ ${c.show(row.high)}${c.unit}`)
    body += label(x(row.low) - 6, y, c.show(row.low), pal.muted, { mid: true, anchor: "end", halo: true }) + label(x(row.high) + 6, y, c.show(row.high), pal.muted, { mid: true, halo: true })
    body += label(c.box.x + gutterOf(cats) - 12, y, row.name, pal.text, { anchor: "end", mid: true })

    if (row.value !== null) marks += c.tip(c.move(circle(x(row.value), y, 6, pal.accent, { stroke: "#FFFFFF", "stroke-width": 2 }), "pop", index * 70 + 350), `${row.name} · ${item.name}: ${c.show(row.value)}${c.unit}`)
  })

  if (spec.target !== undefined) body += line(x(spec.target), inner.y - 4, x(spec.target), inner.y + inner.h, pal.text, 1, "3 3") + label(x(spec.target), inner.y - 9, `${spec.caption ?? "기준"} ${c.show(spec.target)}`, pal.text, { bold: true, anchor: "middle" })

  return body + marks
}
