import { circle, line, niceDomain, num, path, rect, textWidth } from "../chart.ts"
import { inferDigits, inkOn, mix } from "../format.ts"
import { gutterOf, label, maxAt, need, numbers, pick, scale, tones, total, valueAxis } from "./core.ts"
import type { Box, Ctx } from "./core.ts"

// 점이 그림판 가장자리에 잘리지 않게 범위를 양쪽으로 조금 넓힌다.
function padded(values: readonly number[]): number[] {
  const low = Math.min(...values)
  const high = Math.max(...values)
  const room = (high - low) * 0.1 || 1

  // 음수가 없는 자료에 음수 눈금이 생기지 않게 0에서 멈춘다.
  return [low >= 0 ? Math.max(0, low - room) : low - room, high + room]
}

// 가로와 세로가 모두 값인 그림판. 눈금선과 눈금 글자, 축 이름을 그린다.
function plane(c: Ctx, xs: readonly number[], ys: readonly number[]) {
  const { pal, spec } = c
  const axis = valueAxis(c, padded(ys), { zero: false, top: spec.yLabel ? 14 : 0, foot: 24, right: 8 })
  const { inner } = axis
  const domain = niceDomain(Math.min(...padded(xs)), Math.max(...padded(xs)), false)
  const x = scale(domain.min, domain.max, inner.x, inner.x + inner.w)
  let svg = axis.svg

  for (const tick of domain.ticks) svg += label(x(tick), inner.y + inner.h + 16, c.show(tick), pal.muted, { anchor: "middle" })

  if (spec.yLabel) svg += label(inner.x, inner.y - 12, spec.yLabel, pal.muted, { size: 10 })

  if (spec.xLabel) svg += label(inner.x + inner.w, inner.y + inner.h - 6, spec.xLabel, pal.muted, { size: 10, anchor: "end" })

  return { svg, inner, x, y: axis.y }
}

export function heatmap(c: Ctx): string {
  const { pal, box, spec } = c
  const cols = need(spec.categories, "categories")
  const rows = need(spec.series, "series")
  const split = spec.variant === "diverging"
  const all = rows.flatMap((row) => numbers(row.values))
  const low = Math.min(...all)
  const high = Math.max(...all)
  const reach = Math.max(Math.abs(low), Math.abs(high)) || 1
  const digits = spec.digits ?? inferDigits(all)
  const light = mix("#FFFFFF", pal.accent, 0.1)
  // 양방향은 0이 가장 옅고, 양수는 강조색으로 음수는 회색으로 진해진다.
  const fillOf = (value: number) => (split ? mix(pal.soft, value >= 0 ? pal.accent : pal.strong, Math.abs(value) / reach) : mix(light, pal.accent, (value - low) / (high - low || 1)))
  const left = gutterOf(rows.map((row) => row.name))
  const w = (box.w - left) / cols.length
  const h = Math.min((box.h - 22) / rows.length, 46)
  const top = box.y + (box.h - 22 - h * rows.length) / 2
  let body = ""
  let found = false
  rows.forEach((row, at) => {
    body += label(box.x + left - 10, top + h * (at + 0.5), row.name, pal.muted, { anchor: "end", mid: true })
    cols.forEach((col, index) => {
      const value = row.values[index] ?? null

      if (value === null) return
      const fill = fillOf(value)
      // 가장 큰 칸 하나만 테두리로 표시한다.
      const on = !split && !found && value === high
      found ||= on
      const cell = rect(box.x + left + w * index + 1.5, top + h * at + 1.5, w - 3, h - 3, fill, { rx: 4, stroke: on ? pal.text : undefined, "stroke-width": on ? 1.5 : undefined })
      const word = c.show(value, digits)
      const inside = w - 3 >= textWidth(word, 10) + 6 && h >= 16 ? label(box.x + left + w * (index + 0.5), top + h * (at + 0.5) + 0.5, word, inkOn(fill), { size: 10, bold: on, anchor: "middle", mid: true }) : ""
      body += c.tip(c.move(cell + inside, "pop", (at + index) * 30), `${row.name} · ${col}: ${word}${c.unit}`)
    })
  })
  cols.forEach((col, index) => (body += label(box.x + left + w * (index + 0.5), top + h * rows.length + 15, col, pal.muted, { anchor: "middle" })))
  c.legend(
    split
      ? [
          { label: "낮음", color: mix(pal.soft, pal.strong, 0.8) },
          { label: "높음", color: pal.accent },
        ]
      : [
          { label: "적음", color: light },
          { label: "많음", color: pal.accent },
        ],
  )

  return body
}

export function bubble(c: Ctx): string {
  const { pal, spec } = c
  const points = need(spec.points, "points")
  const sizes = points.map((point) => point.size ?? 1)
  const big = Math.max(...sizes)
  const hi = pick(points.map((point) => point.label ?? ""), spec.highlight, maxAt(sizes))
  const field = plane(c, points.map((point) => point.x), points.map((point) => point.y))
  const { inner } = field
  let body = field.svg
  let words = ""
  // 큰 원부터 그려서 작은 원이 가려지지 않게 한다.
  const order = points.map((_, index) => index).sort((a, b) => sizes[b] - sizes[a])

  for (const index of order) {
    const point = points[index]
    const on = index === hi
    const r = 6 + Math.sqrt(sizes[index] / big) * 16
    const x = field.x(point.x)
    const y = field.y(point.y)
    const mark = circle(x, y, r, on ? pal.accent : pal.neutral, { "fill-opacity": on ? 1 : 0.85, stroke: "#FFFFFF", "stroke-width": 1.5 })
    body += c.tip(c.move(mark, "pop", index * 50), [point.label ?? "", `${spec.xLabel ?? "x"}: ${c.show(point.x)}`, `${spec.yLabel ?? "y"}: ${c.show(point.y)}`, ...(point.size === undefined ? [] : [`크기: ${c.show(point.size)}`])].filter(Boolean).join("\n"))

    if (!point.label) continue
    // 이름은 원의 오른쪽에 적고, 그림판을 벗어나면 왼쪽으로 옮긴다.
    const flip = x + r + 5 + textWidth(point.label, 10) > inner.x + inner.w
    words += label(flip ? x - r - 5 : x + r + 5, y, point.label, on ? pal.text : pal.muted, { size: 10, bold: on, mid: true, anchor: flip ? "end" : "start", halo: true })
  }

  return body + words
}

export function scatter(c: Ctx): string {
  const { pal, spec } = c
  const points = need(spec.points, "points")
  const groups = [...new Set(points.map((point) => point.group ?? ""))]
  const hi = pick(groups, spec.highlight, 0)
  const colors = tones(pal, groups.length, hi)
  const guides = spec.guides ?? []
  const upright = guides.filter((guide) => guide.axis === "x")
  const level = guides.filter((guide) => guide.axis !== "x")
  const field = plane(c, [...points.map((point) => point.x), ...upright.map((guide) => guide.value)], [...points.map((point) => point.y), ...level.map((guide) => guide.value)])
  const { inner, x, y } = field
  let body = field.svg

  for (const guide of level) body += line(inner.x, y(guide.value), inner.x + inner.w, y(guide.value), pal.strong, 1, "3 3") + (guide.label ? label(inner.x + inner.w - 4, y(guide.value) - 5, guide.label, pal.muted, { size: 10, anchor: "end" }) : "")

  for (const guide of upright) body += line(x(guide.value), inner.y, x(guide.value), inner.y + inner.h, pal.strong, 1, "3 3") + (guide.label ? label(x(guide.value) + 4, inner.y + 10, guide.label, pal.muted, { size: 10 }) : "")

  if (spec.variant === "fit") {
    // 모든 점에 맞춘 최소제곱 추세선.
    const n = points.length
    const mx = total(points.map((point) => point.x)) / n
    const my = total(points.map((point) => point.y)) / n
    const slope = total(points.map((point) => (point.x - mx) * (point.y - my))) / (total(points.map((point) => (point.x - mx) ** 2)) || 1)
    const from = Math.min(...points.map((point) => point.x))
    const to = Math.max(...points.map((point) => point.x))
    body += c.move(line(x(from), y(my + slope * (from - mx)), x(to), y(my + slope * (to - mx)), pal.ink, 1.5, "5 4"), "fade", 400)
  }

  const order = points.map((_, index) => index).sort((a, b) => Number(groups.indexOf(points[a].group ?? "") === hi) - Number(groups.indexOf(points[b].group ?? "") === hi))

  for (const index of order) {
    const point = points[index]
    const group = groups.indexOf(point.group ?? "")
    const mark = circle(x(point.x), y(point.y), 3.5, colors[group], { "fill-opacity": 0.9, stroke: "#FFFFFF", "stroke-width": 1 })
    body += c.tip(c.move(mark, "pop", index * 8), [point.label ?? point.group ?? "", `${spec.xLabel ?? "x"}: ${c.show(point.x)}`, `${spec.yLabel ?? "y"}: ${c.show(point.y)}${c.unit}`].filter(Boolean).join("\n"))
  }

  if (groups.some(Boolean)) c.legend(groups.map((group, index) => ({ label: group, color: colors[index] })))

  return body
}

export function parallel(c: Ctx): string {
  const { pal, box, spec } = c
  const dims = need(spec.categories, "categories")
  const rows = need(spec.series, "series")
  const hi = pick(rows.map((row) => row.name), spec.highlight, 0)
  const inner: Box = { x: box.x + 8, y: box.y + 36, w: box.w - 30 - (hi < 0 ? 0 : textWidth(rows[hi].name, 11)), h: box.h - 56 }
  const bottom = inner.y + inner.h
  const xAt = (index: number) => inner.x + (dims.length > 1 ? (inner.w * index) / (dims.length - 1) : inner.w / 2)

  // 축마다 단위가 달라서 눈금을 따로 잡는다. 위가 가장 큰 값이다.
  const scales = dims.map((_, index) => {
    const values = rows.map((row) => row.values[index] ?? 0)

    return { low: Math.min(...values), high: Math.max(...values), digits: inferDigits(values), y: scale(Math.min(...values), Math.max(...values), bottom, inner.y) }
  })

  let body = ""
  dims.forEach((name, index) => {
    const anchor = !index ? "start" : index === dims.length - 1 ? "end" : "middle"
    body += line(xAt(index), inner.y, xAt(index), bottom, pal.line, 1)
    body += label(xAt(index), box.y + 10, name, pal.text, { bold: true, anchor }) + label(xAt(index), inner.y - 8, c.show(scales[index].high, scales[index].digits), pal.muted, { size: 10, anchor }) + label(xAt(index), bottom + 14, c.show(scales[index].low, scales[index].digits), pal.muted, { size: 10, anchor })
  })
  const order = rows.map((_, index) => index).sort((a, b) => Number(a === hi) - Number(b === hi))

  for (const index of order) {
    const row = rows[index]
    const on = index === hi
    const d = dims.map((_, at) => `${at ? "L" : "M"} ${num(xAt(at))} ${num(scales[at].y(row.values[at] ?? 0))}`).join(" ")
    body += c.tip(c.move(path(d, on ? pal.accent : pal.neutral, on ? 2.5 : 1.2), "wipe", on ? 300 : 0), [row.name, ...dims.map((name, at) => `${name}: ${c.show(row.values[at] ?? 0, scales[at].digits)}`)].join("\n"))

    if (on) body += label(xAt(dims.length - 1) + 8, scales[dims.length - 1].y(row.values[dims.length - 1] ?? 0), row.name, pal.text, { bold: true, mid: true })
  }

  return body
}
