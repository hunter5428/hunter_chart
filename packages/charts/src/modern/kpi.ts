import { attrs, circle, line, niceDomain, num, path, rect, textWidth } from "../chart.ts"
import { arc, curve, fade, gutterOf, label, maxAt, need, numbers, pick, polar, scale } from "./core.ts"
import type { Box, Ctx } from "./core.ts"

export function gauge(c: Ctx): string {
  const { pal, box, spec } = c
  const item = need(spec.items, "items")[0]
  const max = spec.max ?? 100
  const ratio = Math.min(Math.max(item.value / max, 0), 1)
  const kind = spec.variant
  const sweep = kind === "ring" ? Math.PI * 2 : kind === "semi" ? Math.PI : Math.PI * 1.5
  const from = kind === "ring" ? 0 : -sweep / 2
  const cx = box.x + box.w / 2
  // 반원은 아래 절반이 비므로 반지름을 키우고 중심을 아래로 내린다.
  const r = kind === "semi" ? Math.min(box.h - 44, box.w * 0.36) : Math.min(box.h / 2 - 16, box.w * 0.3)
  const cy = kind === "semi" ? box.y + (box.h + r) / 2 - 12 : box.y + box.h / 2 + (kind === "ring" ? 0 : r * 0.1)
  const width = Math.min(18, Math.max(10, r * 0.16))
  let body = ""

  if (kind === "ticks") {
    // 눈금이 값까지만 켜진다.
    for (let k = 0; k < 40; k += 1) {
      const a = polar(cx, cy, r, from + (sweep * k) / 39)
      const b = polar(cx, cy, r - width * 1.4, from + (sweep * k) / 39)
      body += c.move(`<line ${attrs({ x1: num(a.x), y1: num(a.y), x2: num(b.x), y2: num(b.y), stroke: k < Math.round(ratio * 40) ? pal.accent : pal.line, "stroke-width": 3, "stroke-linecap": "round" })}/>`, "fade", k * 18)
    }
  } else {
    body += arc(cx, cy, r - width / 2, from, from + sweep, pal.line, width) + c.move(arc(cx, cy, r - width / 2, from, from + sweep * ratio, pal.accent, width), "wipe")
  }

  const middle = kind === "semi" ? cy - r * 0.22 : cy
  body += label(cx, middle - (spec.caption ? 4 : 0), `${c.show(item.value)}${c.unit}`, pal.text, { size: 34, bold: true, anchor: "middle", mid: true })

  if (spec.caption) body += label(cx, middle + 24, spec.caption, pal.muted, { anchor: "middle" })

  if (kind === "ring") return body

  for (const [value, angle] of [
    [0, from],
    [max, from + sweep],
  ]) {
    const end = polar(cx, cy, r - width / 2, angle)
    body += label(end.x, end.y + width / 2 + 14, c.show(value), pal.muted, { size: 10, anchor: "middle" })
  }

  if (spec.target !== undefined) {
    const angle = from + sweep * Math.min(Math.max(spec.target / max, 0), 1)
    const a = polar(cx, cy, r - width - 4, angle)
    const b = polar(cx, cy, r + 5, angle)
    const out = polar(cx, cy, r + 12, angle)
    const side = Math.sin(angle)
    body += line(a.x, a.y, b.x, b.y, pal.text, 2) + label(out.x, out.y, `목표 ${c.show(spec.target)}`, pal.text, { size: 10, bold: true, mid: true, anchor: Math.abs(side) < 0.25 ? "middle" : side > 0 ? "start" : "end" })
  }

  return body
}

export function bullet(c: Ctx): string {
  const { pal, box, spec } = c
  const rows = need(spec.bullets, "bullets")
  // 기본 강조는 목표 대비 실적이 가장 낮은 항목이다.
  const hi = pick(rows.map((row) => row.label), spec.highlight, maxAt(rows.map((row) => -row.value / row.target)))
  const left = gutterOf(rows.map((row) => row.label))
  const w = box.w - left - Math.max(...rows.map((row) => textWidth(c.show(row.value), 11))) - 12
  const rowH = Math.min(box.h / rows.length, 56)
  const top = box.y + (box.h - rowH * rows.length) / 2
  const shades = [pal.neutral, pal.line, pal.soft]
  let body = ""
  rows.forEach((row, index) => {
    const cy = top + rowH * (index + 0.5)
    const on = index === hi
    // 줄마다 단위가 달라서 축 범위를 따로 잡는다.
    const x = scale(0, Math.max(row.ranges[2], row.value, row.target), box.x + left, box.x + left + w)

    // 넓은 구간부터 깔아서 나쁨 구간이 가장 진하게 남는다.
    for (const at of [2, 1, 0]) body += rect(x(0), cy - 9, x(row.ranges[at]) - x(0), 18, shades[at], { rx: 3 })
    body += c.tip(c.move(rect(x(0), cy - 4, x(row.value) - x(0), 8, on ? pal.accent : pal.ink, { rx: 2 }), "run", index * 90, `${num(x(0))}px 0`), `${row.label}: ${c.show(row.value)} (목표 ${c.show(row.target)})`)
    body += line(x(row.target), cy - 12, x(row.target), cy + 12, pal.text, 2)
    body += label(box.x + left - 12, cy, row.label, on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true })
    body += label(box.x + left + w + 10, cy, c.show(row.value), on ? pal.text : pal.muted, { bold: on, mid: true })
  })

  return body
}

export function radialBar(c: Ctx): string {
  const { pal, box, spec } = c
  const items = need(spec.items, "items")
  const top = Math.max(...items.map((item) => item.value))
  const max = spec.max ?? (top <= 100 ? 100 : niceDomain(0, top, true).max)
  const hi = pick(items.map((item) => item.label), spec.highlight, maxAt(items.map((item) => item.value)))
  const half = spec.variant === "half"
  const sweep = half ? Math.PI : spec.variant === "full" ? Math.PI * 2 : Math.PI * 1.5
  const from = half ? -Math.PI / 2 : 0
  const full = spec.variant === "full"
  // 한 바퀴를 다 쓰면 고리 안에 빈 자리가 없어서 이름을 왼쪽 바깥에 적는다.
  const cx = box.x + box.w * (full ? 0.62 : 0.5)
  const outer = half ? Math.min(box.h - 20 - items.length * 16, box.w * 0.34) : Math.min(box.h / 2 - 6, box.w * 0.3)
  const cy = half ? box.y + outer + 6 : box.y + box.h / 2
  const width = Math.min(14, (outer * 0.66) / items.length - 5)
  let body = ""
  items.forEach((item, index) => {
    const r = outer - index * (width + 5) - width / 2
    const on = index === hi
    const word = `${item.label} ${c.show(item.value)}${c.unit}`
    body += arc(cx, cy, r, from, from + sweep, pal.line, width)
    body += c.tip(c.move(arc(cx, cy, r, from, from + sweep * Math.min(item.value / max, 1), on ? pal.accent : pal.strong, width), "wipe", index * 120), word)

    // 고리가 시작하는 12시 왼쪽의 빈 자리에 이름을 적는다. 반원은 빈 아래쪽에 차례로 적는다.
    if (full) body += label(cx - outer - 20, cy + (index - (items.length - 1) / 2) * 20, word, on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true })
    else body += half ? label(cx, cy + 20 + index * 16, word, on ? pal.text : pal.muted, { bold: on, anchor: "middle" }) : label(cx - width / 2 - 8, cy - r, word, on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true, halo: true })
  })

  return body
}

export function stat(c: Ctx): string {
  const { pal, box, spec } = c

  const tiles = need(spec.series, "series").map((item) => {
    const values = numbers(item.values)
    const last = values[values.length - 1] ?? 0
    const first = values[0] ?? last

    return { name: item.name, values, last, change: first ? (last - first) / Math.abs(first) : 0 }
  })

  const wordOf = (change: number) => `${change >= 0 ? "▲" : "▼"} ${Math.abs(change * 100).toFixed(1)}%`

  // 작은 추세선. 오른 지표는 강조색에 옅은 면을 깔고, 내린 지표는 회색 선만 그린다.
  const spark = (values: readonly number[], area: Box, up: boolean) => {
    if (values.length < 2 || area.h < 8) return ""
    const y = scale(Math.min(...values), Math.max(...values), area.y + area.h - 3, area.y + 3)
    const points = values.map((value, index) => ({ x: area.x + (area.w * index) / (values.length - 1), y: y(value) }))
    const d = curve(points)
    const end = points[points.length - 1]

    return c.move((up ? fade(pal, `${d} L ${num(end.x)} ${num(area.y + area.h)} L ${num(area.x)} ${num(area.y + area.h)} Z`) : "") + path(d, up ? pal.accent : pal.strong, 2) + circle(end.x, end.y, 3, up ? pal.accent : pal.strong), "wipe")
  }

  let body = ""

  if (spec.variant === "rows") {
    const rowH = Math.min(box.h / tiles.length, 52)
    const top = box.y + (box.h - rowH * tiles.length) / 2
    const left = gutterOf(tiles.map((tile) => tile.name), 12) + 8
    tiles.forEach((tile, index) => {
      const cy = top + rowH * (index + 0.5)
      const up = tile.change >= 0

      if (index) body += line(box.x, cy - rowH / 2, box.x + box.w, cy - rowH / 2, pal.line, 1)
      body += label(box.x, cy, tile.name, pal.text, { size: 12, bold: true, mid: true })
      body += spark(tile.values, { x: box.x + left, y: cy - rowH * 0.32, w: box.w - left - 170, h: rowH * 0.64 }, up)
      body += label(box.x + box.w - 70, cy, `${c.show(tile.last)}${c.unit}`, pal.text, { size: 13, bold: true, mid: true, anchor: "end" })
      body += label(box.x + box.w, cy, wordOf(tile.change), up ? pal.text : pal.muted, { bold: true, mid: true, anchor: "end" })
    })

    return body
  }

  const cols = tiles.length > 4 ? Math.ceil(tiles.length / 2) : tiles.length
  const lines = Math.ceil(tiles.length / cols)
  const w = (box.w - 10 * (cols - 1)) / cols
  const h = (box.h - 10 * (lines - 1)) / lines
  tiles.forEach((tile, index) => {
    const x = box.x + (index % cols) * (w + 10)
    const y = box.y + Math.floor(index / cols) * (h + 10)
    const up = tile.change >= 0
    body += rect(x + 0.5, y + 0.5, w - 1, h - 1, "#FFFFFF", { rx: 12, stroke: pal.line })
    body += label(x + 14, y + 24, tile.name, pal.muted, { size: 12 })
    body += label(x + 14, y + 52, `${c.show(tile.last)}${c.unit}`, pal.text, { size: 22, bold: true })
    body += label(x + 14, y + 72, wordOf(tile.change), up ? pal.text : pal.muted, { bold: true })
    body += spark(tile.values, { x: x + 14, y: y + 84, w: w - 28, h: h - 98 }, up)
  })

  return body
}
