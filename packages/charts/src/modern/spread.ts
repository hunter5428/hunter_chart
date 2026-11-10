import { circle, line, niceDomain, num, path, rect } from "../chart.ts"
import { inkOn } from "../format.ts"
import { curve, gutterOf, label, maxAt, need, numbers, pick, ribbon, scale, filled, slotLabels, total, valueAxis, valueAxisX } from "./core.ts"
import type { Ctx } from "./core.ts"

function quantile(sorted: readonly number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const low = Math.floor(pos)

  return sorted[low] + (sorted[Math.ceil(pos)] - sorted[low]) * (pos - low)
}

// 가우스 커널 밀도. 대역폭은 실버만 규칙으로 잡는다.
function density(sorted: readonly number[], grid: readonly number[]): number[] {
  const n = sorted.length
  const mean = total(sorted) / n
  const sd = Math.sqrt(total(sorted.map((value) => (value - mean) ** 2)) / n)
  const h = 0.9 * (Math.min(sd, (quantile(sorted, 0.75) - quantile(sorted, 0.25)) / 1.34) || sd || 1) * n ** -0.2

  return grid.map((x) => total(sorted.map((value) => Math.exp(-0.5 * ((x - value) / h) ** 2))) / (n * h * Math.sqrt(2 * Math.PI)))
}

// 시리즈의 values를 관측값으로 읽는다. 기본 강조는 중앙값이 가장 높은 묶음이다.
function groupsOf(c: Ctx) {
  const groups = need(c.spec.series, "series").map((item) => {
    const sorted = numbers(item.values).sort((a, b) => a - b)

    return { name: item.name, sorted, median: quantile(sorted, 0.5) }
  })

  return { groups, hi: pick(groups.map((group) => group.name), c.spec.highlight, maxAt(groups.map((group) => group.median))) }
}

const tidy = (value: number) => Number(value.toFixed(1))

export function box(c: Ctx): string {
  const { pal, spec } = c
  const { groups, hi } = groupsOf(c)
  const axis = valueAxis(c, groups.flatMap((group) => group.sorted), { zero: false })
  const { inner, y } = axis
  const slot = inner.w / groups.length
  const w = Math.min(slot * 0.5, 64)
  const violin = spec.variant === "violin" || spec.variant === "both"
  const boxed = spec.variant !== "violin"
  let body = axis.svg
  groups.forEach((group, index) => {
    const cx = inner.x + slot * (index + 0.5)
    const on = index === hi
    const q1 = quantile(group.sorted, 0.25)
    const q3 = quantile(group.sorted, 0.75)
    // 수염은 사분위 범위의 1.5배 안에서 가장 먼 값까지 뻗고, 그 밖의 값은 점으로 찍는다.
    const within = group.sorted.filter((value) => value >= q1 - 1.5 * (q3 - q1) && value <= q3 + 1.5 * (q3 - q1))
    const low = within[0]
    const high = within[within.length - 1]
    let part = ""

    if (violin) {
      const grid = Array.from({ length: 40 }, (_, k) => group.sorted[0] + ((group.sorted[group.sorted.length - 1] - group.sorted[0]) * k) / 39)
      const dense = density(group.sorted, grid)
      const reach = (boxed ? w * 0.8 : w * 0.6) / Math.max(...dense)
      const side = (sign: number) => grid.map((value, k) => ({ x: cx + sign * dense[k] * reach, y: y(value) }))
      part += filled(ribbon(side(1), side(-1)), boxed ? (on ? pal.wash : pal.soft) : on ? pal.accent : pal.neutral)
    }

    if (boxed) {
      const bw = violin ? w * 0.34 : w
      part += line(cx, y(high), cx, y(q3), pal.strong, 1.5) + line(cx, y(q1), cx, y(low), pal.strong, 1.5)
      part += line(cx - bw / 4, y(high), cx + bw / 4, y(high), pal.strong, 1.5) + line(cx - bw / 4, y(low), cx + bw / 4, y(low), pal.strong, 1.5)
      part += rect(cx - bw / 2, y(q3), bw, Math.max(y(q1) - y(q3), 1), on ? pal.accent : pal.neutral, { rx: 3 })
      part += line(cx - bw / 2, y(group.median), cx + bw / 2, y(group.median), on ? inkOn(pal.accent) : pal.ink, 2)

      for (const value of group.sorted.filter((item) => item < low || item > high)) part += circle(cx, y(value), 3, "#FFFFFF", { stroke: on ? pal.accent : pal.strong, "stroke-width": 1.5 })
    } else {
      part += line(cx - w * 0.3, y(group.median), cx + w * 0.3, y(group.median), on ? inkOn(pal.accent) : pal.ink, 2)
    }

    body += c.tip(c.move(part, "pop", index * 90), `${group.name}\n중앙값 ${c.show(tidy(group.median))}${c.unit}\n사분위 ${c.show(tidy(q1))} ~ ${c.show(tidy(q3))}${c.unit}`)
  })

  return body + slotLabels(c, groups.map((group) => group.name), (index) => inner.x + slot * (index + 0.5), inner.y + inner.h + 16, hi)
}

export function beeswarm(c: Ctx): string {
  const { pal } = c
  const { groups, hi } = groupsOf(c)
  const axis = valueAxisX(c, groups.flatMap((group) => group.sorted), { zero: false, left: gutterOf(groups.map((group) => group.name)) })
  const { inner, x } = axis
  const rowH = inner.h / groups.length
  const r = 3
  const gap = r * 2 + 0.8
  let body = axis.svg
  groups.forEach((group, index) => {
    const cy = inner.y + rowH * (index + 0.5) + 5
    const on = index === hi
    const placed: { x: number; y: number }[] = []
    let dots = ""

    for (const value of group.sorted) {
      const px = x(value)
      const near = placed.filter((spot) => Math.abs(spot.x - px) < gap)
      // 가운데 줄에서 시작해 위아래로 번갈아 물러나며 겹치지 않는 첫 자리에 놓는다. 줄을 벗어나면 그 자리에서 멈춘다.
      let dy = 0

      for (let step = 1; near.some((spot) => (spot.x - px) ** 2 + (spot.y - dy) ** 2 < gap * gap) && Math.abs(dy) < rowH / 2 - 14; step += 1) dy = (step % 2 ? -1 : 1) * Math.ceil(step / 2) * r * 0.7
      placed.push({ x: px, y: dy })
      dots += c.tip(circle(px, cy + dy, r, on ? pal.accent : pal.strong), `${group.name}: ${c.show(value)}${c.unit}`)
    }

    body += c.move(dots, "fade", index * 150)
    body += line(x(group.median), cy - rowH * 0.36, x(group.median), cy + rowH * 0.36, pal.text, 1.5, "2 3")
    body += label(x(group.median), cy - rowH * 0.36 - 5, `중앙값 ${c.show(tidy(group.median))}${c.unit}`, pal.text, { size: 10, bold: true, anchor: "middle", halo: true })
    body += label(inner.x - 12, cy, group.name, on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true })
  })

  return body
}

export function ridgeline(c: Ctx): string {
  const { pal } = c
  const { groups, hi } = groupsOf(c)
  const axis = valueAxisX(c, groups.flatMap((group) => group.sorted), { left: gutterOf(groups.map((group) => group.name)) })
  const { inner, x, domain } = axis
  // 곡선이 윗줄로 넘쳐 겹치므로 첫 줄 위에 그만큼 자리를 남긴다.
  const rowH = inner.h / (groups.length + 0.8)
  const grid = Array.from({ length: 60 }, (_, k) => domain.min + ((domain.max - domain.min) * k) / 59)
  const curves = groups.map((group) => density(group.sorted, grid))
  const reach = (rowH * 1.8) / Math.max(...curves.flat())
  let body = axis.svg
  let marks = ""
  groups.forEach((group, index) => {
    const base = inner.y + rowH * (index + 1.8)
    const on = index === hi
    const top = grid.map((value, k) => ({ x: x(value), y: base - curves[index][k] * reach }))
    const face = filled(`${curve(top)} L ${num(inner.x + inner.w)} ${num(base)} L ${num(inner.x)} ${num(base)} Z`, on ? pal.accent : pal.neutral, { "fill-opacity": 0.9, stroke: on ? pal.accent : pal.strong, "stroke-width": 1 })
    body += c.tip(c.move(face, "rise", index * 90, `0 ${num(base)}px`), `${group.name}\n중앙값 ${c.show(tidy(group.median))}${c.unit}`)
    // 중앙값 눈금은 아랫줄 곡선에 가려지지 않게 맨 위에 그린다.
    marks += line(x(group.median), base - 6, x(group.median), base, pal.text, 1.5)
    body += label(inner.x - 12, base - 4, group.name, on ? pal.text : pal.muted, { bold: on, anchor: "end" })
  })

  return body + marks
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw))

  return ([1, 2, 2.5, 5, 10].find((times) => times * power >= raw) ?? 10) * power
}

export function histogram(c: Ctx): string {
  const { pal, spec } = c
  const sorted = numbers(need(spec.series, "series")[0].values).sort((a, b) => a - b)
  const n = sorted.length
  const span = sorted[n - 1] - sorted[0]
  // 구간 폭은 프리드먼-다이어코니스 규칙으로 잡고 읽기 쉬운 수로 올린다.
  const step = niceStep((2 * (quantile(sorted, 0.75) - quantile(sorted, 0.25))) / Math.cbrt(n) || span / 10 || 1)
  const first = Math.floor(sorted[0] / step) * step
  const bins = Array.from({ length: Math.floor((sorted[n - 1] - first) / step + 1e-9) + 1 }, (_, k) => ({ from: first + k * step, count: 0 }))

  for (const value of sorted) bins[Math.min(bins.length - 1, Math.floor((value - first) / step + 1e-9))].count += 1
  const limit = spec.target
  const name = spec.caption ?? "기준"
  const axis = valueAxis(c, [0, Math.max(...bins.map((bin) => bin.count))], { top: 20 })
  const { inner, y } = axis
  const end = first + bins.length * step
  const x = scale(first, end, inner.x, inner.x + inner.w)
  const w = x(first + step) - x(first)
  const ground = y(0)
  let body = axis.svg

  for (const tick of niceDomain(first, end, false).ticks) if (tick >= first && tick <= end) body += label(x(tick), ground + 16, c.show(tick), pal.muted, { anchor: "middle" })
  const colorOf = (from: number) => (limit !== undefined && from + 1e-9 >= limit ? pal.accent : pal.neutral)

  if (spec.variant === "step") {
    const outline = bins.map((bin) => `V ${num(y(bin.count))} H ${num(x(bin.from + step))}`).join(" ")
    body += c.move(path(`M ${num(x(first))} ${num(ground)} ${outline} V ${num(ground)}`, pal.ink, 1.5), "wipe")
  } else if (spec.variant === "dots") {
    const r = Math.min(4, w / 2 - 0.5)
    // 점 하나가 여러 건을 대신해서 가장 높은 구간도 그림 안에 들어오게 한다.
    const per = Math.max(1, Math.ceil(Math.max(...bins.map((bin) => bin.count)) / Math.floor(inner.h / (r * 2 + 1))))
    bins.forEach((bin, index) => {
      let dots = ""

      for (let k = 0; k < Math.ceil(bin.count / per); k += 1) dots += circle(x(bin.from) + w / 2, ground - r - 1 - k * (r * 2 + 1), r, colorOf(bin.from))
      body += c.tip(c.move(dots, "fade", index * 25), `${c.show(bin.from)} ~ ${c.show(bin.from + step)}${c.unit}: ${bin.count}건`)
    })
  } else {
    bins.forEach((bin, index) => {
      const mark = rect(x(bin.from) + 0.5, y(bin.count), w - 1, ground - y(bin.count), colorOf(bin.from), { rx: 1.5 })
      body += c.tip(c.move(mark, "rise", index * 25, `0 ${num(ground)}px`), `${c.show(bin.from)} ~ ${c.show(bin.from + step)}${c.unit}: ${bin.count}건`)
    })
  }

  if (spec.variant === "kde") {
    const grid = Array.from({ length: 80 }, (_, k) => first + ((end - first) * k) / 79)
    // 밀도에 표본 수와 구간 폭을 곱하면 막대와 같은 눈금이 된다.
    const dense = density(sorted, grid)
    body += c.move(path(curve(grid.map((value, k) => ({ x: x(value), y: y(dense[k] * n * step) }))), pal.ink, 1.5), "wipe", 400)
  }

  const p50 = tidy(quantile(sorted, 0.5))
  const p95 = tidy(quantile(sorted, 0.95))
  body += line(x(p50), inner.y - 4, x(p50), ground, pal.text, 1.5) + label(x(p50) - 5, inner.y - 9, `p50 ${c.show(p50)}${c.unit}`, pal.text, { size: 10, bold: true, anchor: "end" })
  body += line(x(p95), inner.y - 4, x(p95), ground, pal.text, 1, "3 3") + label(x(p95) + 5, inner.y - 9, `p95 ${c.show(p95)}${c.unit}`, pal.text, { size: 10, bold: true })

  if (limit !== undefined) {
    body += line(x(limit), inner.y + 4, x(limit), ground, pal.accent, 1.5) + label(x(limit) + 5, inner.y + 12, `${name} ${c.show(limit)}${c.unit}`, pal.text, { size: 10, bold: true, halo: true })
    c.legend([
      { label: `${name} 초과`, color: pal.accent },
      { label: `${name} 안`, color: pal.neutral },
    ])
  }

  return body
}
