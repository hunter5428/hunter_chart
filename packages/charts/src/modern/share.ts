import { line, num, rect, textWidth } from "../chart.ts"
import { inkOn } from "../format.ts"
import { label, maxAt, need, percent, pick, polar, sector, filled, tones, total } from "./core.ts"
import type { Box, Ctx } from "./core.ts"

export function pie(c: Ctx): string {
  const { pal, box, spec } = c
  const items = need(spec.items, "items").filter((item) => item.value > 0)
  const donut = spec.type === "donut"
  const sum = total(items.map((item) => item.value))
  const hi = pick(items.map((item) => item.label), spec.highlight, maxAt(items.map((item) => item.value)))
  const colors = spec.variant === "emphasis" ? items.map((_, index) => (index === hi ? pal.accent : pal.neutral)) : tones(pal, items.length, hi)
  const r = Math.min(box.h / 2 - (donut ? 4 : 18), box.w * 0.24)
  const cx = box.x + box.w * (donut ? 0.28 : 0.5)
  const cy = box.y + box.h / 2
  const hole = donut ? r * (spec.variant === "thin" ? 0.8 : 0.62) : 0
  let angle = 0
  let body = ""
  let words = ""
  items.forEach((item, index) => {
    const share = item.value / sum
    const sweep = share * Math.PI * 2
    const mid = angle + sweep / 2
    const delay = (index / items.length) * 400
    const slice = filled(sector(cx, cy, hole, r, angle, angle + sweep), colors[index], { stroke: "#FFFFFF", "stroke-width": 2, "stroke-linejoin": "round" })
    body += c.tip(c.move(slice, "pop", delay, `${num(cx)}px ${num(cy)}px`), `${item.label}: ${c.show(item.value)}${c.unit} (${percent(share)})`)

    if (!donut) {
      const word = spec.variant === "values" ? c.show(item.value) : spec.variant === "names" ? item.label : percent(share)
      const inside = sweep > 0.5 && textWidth(word, 11) < r * 0.7
      const at = polar(cx, cy, inside ? r * 0.62 : r + 12, mid)
      const anchor = inside || Math.abs(Math.sin(mid)) < 0.3 ? "middle" : Math.sin(mid) > 0 ? "start" : "end"
      words += c.move(label(at.x, at.y, word, inside ? inkOn(colors[index]) : pal.text, { bold: true, mid: true, anchor }), "fade", delay + 350)
    }

    angle += sweep
  })

  if (!donut) {
    c.legend(items.map((item, index) => ({ label: item.label, color: colors[index] })))

    return body + words
  }

  body += label(cx, cy - (spec.caption ? 5 : 0), c.show(sum), pal.text, { size: 26, bold: true, anchor: "middle", mid: true })

  if (spec.caption) body += label(cx, cy + 18, spec.caption, pal.muted, { anchor: "middle" })
  const left = box.x + box.w * 0.58
  const rowH = Math.min(26, box.h / items.length)
  items.forEach((item, index) => {
    const y = cy + rowH * (index + 0.5 - items.length / 2)
    const on = index === hi
    body += rect(left, y - 5, 10, 10, colors[index], { rx: 2 })
    body += label(left + 18, y, item.label, pal.text, { size: 12, bold: on, mid: true })
    body += label(box.x + box.w, y, percent(item.value / sum), on ? pal.text : pal.muted, { size: 12, bold: on, mid: true, anchor: "end" })
  })

  return body
}

export function waffle(c: Ctx): string {
  const { pal, box, spec } = c
  const items = need(spec.items, "items")
  const fine = spec.variant === "fine"
  const cells = fine ? 200 : 100
  const cols = fine ? 20 : 10
  const sum = total(items.map((item) => item.value))
  // 칸 수는 내림한 뒤, 남은 칸을 소수 부분이 큰 항목부터 하나씩 준다.
  const exact = items.map((item) => (item.value / sum) * cells)
  const counts = exact.map(Math.floor)
  const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest)

  for (let k = 0; total(counts) < cells; k += 1) counts[order[k % order.length].index] += 1
  const hi = pick(items.map((item) => item.label), spec.highlight, 0)
  const colors = tones(pal, items.length, hi, true)
  const size = Math.min(box.h / (cells / cols), (box.w * 0.5) / cols)
  const left = box.x + (box.w * 0.5 - cols * size) / 2
  const top = box.y + (box.h - (cells / cols) * size) / 2
  const owner = counts.flatMap((count, index) => Array<number>(count).fill(index))
  let body = ""
  owner.forEach((index, k) => {
    const row = Math.floor(k / cols)
    const cell = rect(left + (k % cols) * size, top + row * size, size * 0.86, size * 0.86, colors[index], { rx: 3 })
    body += c.tip(c.move(cell, "pop", row * 40 + (k % cols) * 12), `${items[index].label}: ${c.show(items[index].value)}${c.unit} (${percent(items[index].value / sum)})`)
  })
  const main = items[Math.max(hi, 0)]
  const x = box.x + box.w * 0.58
  const cy = box.y + box.h / 2
  body += label(x, cy - 8, percent(main.value / sum), pal.text, { size: 40, bold: true })
  body += label(x, cy + 14, spec.caption ?? main.label, pal.text, { size: 12, bold: true })
  body += label(x, cy + 31, items.filter((item) => item !== main).map((item) => `${item.label} ${c.show(item.value)}${c.unit}`).join(" · "), pal.muted)
  c.legend(items.map((item, index) => ({ label: item.label, color: colors[index] })))

  return body
}

export function marimekko(c: Ctx): string {
  const { pal, box, spec } = c
  const cats = need(spec.categories, "categories")
  const series = need(spec.series, "series")
  const sums = cats.map((_, index) => total(series.map((item) => item.values[index] ?? 0)))
  const all = total(sums)
  const colors = tones(pal, series.length, pick(series.map((item) => item.name), spec.highlight, 0))
  const inner: Box = { x: box.x + 30, y: box.y + 8, w: box.w - 30, h: box.h - 44 }
  const bottom = inner.y + inner.h
  let body = ""

  for (const tick of [0, 50, 100]) {
    const y = bottom - (tick / 100) * inner.h
    body += line(inner.x, y, inner.x + inner.w, y, pal.line, 1) + label(inner.x - 8, y, String(tick), pal.muted, { anchor: "end", mid: true })
  }

  let x = inner.x
  cats.forEach((cat, index) => {
    const w = (sums[index] / all) * inner.w
    let y = bottom
    series.forEach((item, at) => {
      const value = item.values[index] ?? 0
      const share = value / sums[index]
      const h = share * inner.h
      y -= h
      const fill = colors[at]
      body += c.tip(c.move(rect(x + 1, y + 1, w - 2, h - 2, fill, { rx: 3 }), "rise", index * 120, `0 ${num(bottom)}px`), `${cat} · ${item.name}: ${c.show(value)}${c.unit} (${percent(share)})`)

      if (h >= 18 && w >= 36) body += c.move(label(x + w / 2, y + h / 2, percent(share), inkOn(fill), { bold: true, anchor: "middle", mid: true }), "fade", index * 120 + 350)
    })
    body += label(x + w / 2, bottom + 16, cat, pal.text, { bold: true, anchor: "middle" }) + label(x + w / 2, bottom + 30, percent(sums[index] / all), pal.muted, { size: 10, anchor: "middle" })
    x += w
  })
  c.legend(series.map((item, index) => ({ label: item.name, color: colors[index] })))

  return body
}

export function segmented(c: Ctx): string {
  const { pal, box, spec } = c
  const items = need(spec.items, "items")
  const sum = total(items.map((item) => item.value))
  const hi = pick(items.map((item) => item.label), spec.highlight, maxAt(items.map((item) => item.value)))
  const colors = tones(pal, items.length, hi)
  const colW = box.w / 2
  const top = box.y + Math.max(0, (box.h - 60 - Math.ceil(items.length / 2) * 26) / 2)
  let body = ""
  let x = box.x
  items.forEach((item, index) => {
    const share = item.value / sum
    const w = share * box.w
    const gap = index ? 2 : 0
    body += c.tip(c.move(rect(x + gap, top, w - gap, 30, colors[index], { rx: 5 }), "run", index * 80, `${num(box.x)}px 0`), `${item.label}: ${c.show(item.value)}${c.unit} (${percent(share)})`)

    if (w > 42) body += c.move(label(x + gap + 9, top + 15, percent(share), inkOn(colors[index]), { bold: true, mid: true }), "fade", index * 80 + 350)
    x += w
    const cx = box.x + (index % 2) * colW
    const y = top + 60 + Math.floor(index / 2) * 26
    body += rect(cx, y - 5, 10, 10, colors[index], { rx: 2 }) + label(cx + 18, y, item.label, pal.text, { size: 12, bold: index === hi, mid: true })
    body += label(cx + colW - 70, y, `${c.show(item.value)}${c.unit}`, pal.text, { size: 12, bold: true, mid: true, anchor: "end" })
    body += label(cx + colW - 30, y, percent(share), pal.muted, { mid: true, anchor: "end" })
  })

  return body
}

// 큰 값부터 한 줄씩 채운다. 줄에 칸을 더 넣으면 칸이 더 납작해질 때 그 줄을 닫는다.
function squarify(values: readonly number[], box: Box): Box[] {
  const unit = (box.w * box.h) / total(values)
  const out: Box[] = []
  let { x, y, w, h } = box
  let from = 0

  while (from < values.length) {
    const short = Math.min(w, h)

    const worst = (count: number) => {
      const row = values.slice(from, from + count)
      const side = (total(row) * unit) / short

      return Math.max(...row.map((value) => Math.max(side / ((value * unit) / side), (value * unit) / side / side)))
    }

    let count = 1

    while (from + count < values.length && worst(count + 1) <= worst(count)) count += 1
    const side = (total(values.slice(from, from + count)) * unit) / short
    let offset = 0

    for (const value of values.slice(from, from + count)) {
      const length = (value * unit) / side
      out.push(w >= h ? { x, y: y + offset, w: side, h: length } : { x: x + offset, y, w: length, h: side })
      offset += length
    }

    if (w >= h) {
      x += side
      w -= side
    } else {
      y += side
      h -= side
    }

    from += count
  }

  return out
}

export function treemap(c: Ctx): string {
  const { pal, box, spec } = c
  const items = need(spec.items, "items")
  const sum = total(items.map((item) => item.value))

  const groups = [...new Set(items.map((item) => item.group ?? ""))]
    .map((name) => {
      const leaves = items.filter((item) => (item.group ?? "") === name).sort((a, b) => b.value - a.value)

      return { name, leaves, value: total(leaves.map((leaf) => leaf.value)) }
    })
    .sort((a, b) => b.value - a.value)

  const hi = spec.highlight ?? items[maxAt(items.map((item) => item.value))].label
  const areas = squarify(groups.map((group) => group.value), box)
  let body = ""
  groups.forEach((group, at) => {
    const area = areas[at]
    const head = group.name ? 16 : 0

    if (group.name) body += label(area.x + 2, area.y + 11, `${group.name} ${percent(group.value / sum)}`, pal.muted, { size: 10 })
    const cells = squarify(group.leaves.map((leaf) => leaf.value), { x: area.x, y: area.y + head, w: area.w, h: area.h - head })
    group.leaves.forEach((leaf, index) => {
      const cell = cells[index]
      const fill = leaf.label === hi ? pal.accent : pal.neutral
      body += c.tip(c.move(rect(cell.x + 1.5, cell.y + 1.5, cell.w - 3, cell.h - 3, fill, { rx: 4 }), "pop", at * 90 + index * 50), `${leaf.label}: ${c.show(leaf.value)}${c.unit} (${percent(leaf.value / sum)})`)

      if (cell.w < textWidth(leaf.label, 11) + 16 || cell.h < 38) return
      body += label(cell.x + 9, cell.y + 19, leaf.label, inkOn(fill), { bold: true }) + label(cell.x + 9, cell.y + 33, percent(leaf.value / sum), inkOn(fill), { size: 10 })
    })
  })

  return body
}

export function sunburst(c: Ctx): string {
  const { pal, box, spec } = c
  const items = need(spec.items, "items")
  const sum = total(items.map((item) => item.value))
  const groups = [...new Set(items.map((item) => item.group ?? ""))]
  const hi = spec.highlight ?? items[maxAt(items.map((item) => item.value))].label
  const parent = groups.indexOf(items.find((item) => item.label === hi)?.group ?? "")
  // 강조한 항목의 묶음은 두 번째 색, 나머지 묶음은 회색 단계다.
  const grays = tones(pal, groups.length - (parent < 0 ? 0 : 1), -1, true)
  const groupColors = groups.map((_, index) => (index === parent ? pal.ink : grays[index - (parent >= 0 && index > parent ? 1 : 0)]))
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const r = Math.min(box.h / 2 - 16, box.w * 0.26)
  const hole = spec.variant === "solid" ? 0 : r * 0.3
  const mid = hole + (r - hole) * 0.52
  let inner = ""
  let outer = ""
  let angle = 0
  groups.forEach((group, at) => {
    const leaves = items.filter((item) => (item.group ?? "") === group)
    const span = (total(leaves.map((leaf) => leaf.value)) / sum) * Math.PI * 2
    const stroke = { stroke: "#FFFFFF", "stroke-width": 2, "stroke-linejoin": "round" }
    inner += c.tip(c.move(filled(sector(cx, cy, hole, mid, angle, angle + span), groupColors[at], stroke), "pop", at * 80, `${num(cx)}px ${num(cy)}px`), `${group}: ${percent(span / (Math.PI * 2))}`)
    const ringR = (hole + mid) / 2

    if (group && span * ringR > textWidth(group, 10) + 8) {
      const at2 = polar(cx, cy, ringR, angle + span / 2)
      inner += label(at2.x, at2.y, group, inkOn(groupColors[at]), { size: 10, bold: true, anchor: "middle", mid: true })
    }

    let from = angle

    for (const leaf of leaves) {
      const sweep = (leaf.value / sum) * Math.PI * 2
      const on = leaf.label === hi
      const center = from + sweep / 2
      outer += c.tip(c.move(filled(sector(cx, cy, mid, r, from, from + sweep), on ? pal.accent : pal.neutral, stroke), "pop", 250 + at * 80, `${num(cx)}px ${num(cy)}px`), `${group} · ${leaf.label}: ${c.show(leaf.value)}${c.unit} (${percent(leaf.value / sum)})`)
      const spot = polar(cx, cy, r + 10, center)
      const anchor = Math.abs(Math.sin(center)) < 0.25 ? "middle" : Math.sin(center) > 0 ? "start" : "end"
      outer += c.move(label(spot.x, spot.y, `${leaf.label} ${percent(leaf.value / sum)}`, on ? pal.text : pal.muted, { size: 10, bold: on, mid: true, anchor }), "fade", 600)
      from += sweep
    }

    angle += span
  })

  return inner + outer
}
