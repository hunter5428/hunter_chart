import { num, path, rect, textWidth } from "../chart.ts"
import { inkOn } from "../format.ts"
import { label, maxAt, need, percent, pick, polar, sector, filled, total } from "./core.ts"
import type { Ctx } from "./core.ts"

export function funnel(c: Ctx): string {
  const { pal, box, spec } = c
  const items = need(spec.items, "items")
  const first = spec.variant === "from-first"
  const rates = items.map((item, index) => (index ? item.value / items[first ? 0 : index - 1].value : 1))
  // 기본 강조는 가장 많이 빠지는 단계다.
  const hi = pick(items.map((item) => item.label), spec.highlight, rates.indexOf(Math.min(...rates.slice(1))))
  const left = Math.max(...items.map((item) => textWidth(item.label, 11))) + 16
  const full = box.w - left - 64
  const cx = box.x + left + full / 2
  const max = Math.max(...items.map((item) => item.value))
  const rowH = (box.h - 14) / items.length
  const barH = Math.min(34, rowH * 0.56)
  const widths = items.map((item) => (item.value / max) * full)
  const tops = items.map((_, index) => box.y + 14 + rowH * index + (rowH - barH) / 2)
  let necks = ""
  let body = label(box.x + box.w, box.y + 8, first ? "첫 단계 대비" : "전 단계 대비", pal.muted, { size: 10, anchor: "end" })
  items.forEach((item, index) => {
    const w = widths[index]
    const y = tops[index]
    const on = index === hi

    if (index) {
      const from = tops[index - 1] + barH
      const a = cx - widths[index - 1] / 2
      const b = cx + widths[index - 1] / 2
      const mid = (from + y) / 2
      necks += c.move(filled(`M ${num(a)} ${num(from)} L ${num(b)} ${num(from)} C ${num(b)} ${num(mid)} ${num(cx + w / 2)} ${num(mid)} ${num(cx + w / 2)} ${num(y)} L ${num(cx - w / 2)} ${num(y)} C ${num(cx - w / 2)} ${num(mid)} ${num(a)} ${num(mid)} ${num(a)} ${num(from)} Z`, pal.soft), "fade", index * 140)
      body += c.move(label(box.x + box.w, mid, percent(rates[index]), on ? pal.text : pal.muted, { bold: on, anchor: "end", mid: true }), "fade", index * 140 + 250)
    }

    const bar = rect(cx - w / 2, y, w, barH, on ? pal.accent : pal.neutral, { rx: Math.min(8, w / 2) })
    body += c.tip(c.move(bar, "pop", index * 140), `${item.label}: ${c.show(item.value)}${c.unit}${index ? ` (${percent(rates[index])})` : ""}`)
    body += label(box.x + left - 16, y + barH / 2 - 3, item.label, pal.text, { bold: true, anchor: "end" })
    body += label(box.x + left - 16, y + barH / 2 + 10, c.show(item.value), pal.muted, { size: 10, anchor: "end" })
  })

  return necks + body
}

export function sankey(c: Ctx): string {
  const { pal, box, spec } = c
  const links = need(spec.links, "links")
  const names = [...new Set(links.flatMap((link) => [link.from, link.to]))]
  const sum = (name: string, side: "from" | "to") => total(links.filter((link) => link[side] === name).map((link) => link.value))
  // 열은 출발점에서 가장 먼 길의 길이다. 더 흘러가지 않는 마디는 마지막 열에 모은다.
  const depths = new Map<string, number>()

  const depthOf = (name: string): number => {
    const known = depths.get(name)

    if (known !== undefined) return known
    // 흐름이 돌아오는 자료에서 끝없이 돌지 않게 먼저 자리를 잡아 둔다.
    depths.set(name, 0)
    const depth = Math.max(-1, ...links.filter((link) => link.to === name).map((link) => depthOf(link.from))) + 1
    depths.set(name, depth)

    return depth
  }

  const last = Math.max(1, ...names.map(depthOf))
  const nodes = names.map((name) => ({ name, value: Math.max(sum(name, "from"), sum(name, "to")), col: sum(name, "from") ? depthOf(name) : last, y: 0, h: 0 }))
  const cols = Array.from({ length: last + 1 }, (_, col) => nodes.filter((node) => node.col === col))
  const pad = 16
  const k = Math.min(...cols.filter((col) => col.length).map((col) => (box.h - pad * (col.length - 1)) / total(col.map((node) => node.value))))
  const nodeW = 8
  const tail = Math.max(...cols[last].map((node) => textWidth(node.name, 11))) + 14
  const xOf = (col: number) => box.x + (col * (box.w - nodeW - tail)) / last

  for (const col of cols) {
    let y = box.y + (box.h - total(col.map((node) => node.value)) * k - pad * (col.length - 1)) / 2

    for (const node of col) {
      node.h = node.value * k
      node.y = y
      y += node.h + pad
    }
  }

  const flows = links.map((link) => ({ link, from: nodes[names.indexOf(link.from)], to: nodes[names.indexOf(link.to)], y0: 0, y1: 0 }))

  type Node = (typeof nodes)[number]

  const center = (node: Node) => node.y + node.h / 2

  // 이웃 열과 이어진 띠가 덜 엇갈리게, 마디를 이어진 마디들의 가운데 쪽으로 여러 번 옮긴다.
  const settle = (col: Node[], side: "from" | "to") => {
    for (const node of col) {
      const near = flows.filter((flow) => flow[side === "from" ? "to" : "from"] === node)

      if (near.length) node.y = total(near.map((flow) => center(flow[side]) * flow.link.value)) / total(near.map((flow) => flow.link.value)) - node.h / 2
    }

    col.sort((a, b) => a.y - b.y)
    let y = box.y

    for (const node of col) {
      node.y = Math.max(node.y, y)
      y = node.y + node.h + pad
    }

    let bottom = box.y + box.h

    for (const node of [...col].reverse()) {
      node.y = Math.min(node.y, bottom - node.h)
      bottom = node.y - pad
    }
  }

  for (let round = 0; round < 6; round += 1) {
    for (const col of cols.slice(1)) settle(col, "from")

    for (const col of cols.slice(0, -1).reverse()) settle(col, "to")
  }

  for (const node of nodes) {
    let y = node.y

    for (const flow of flows.filter((item) => item.from === node).sort((a, b) => center(a.to) - center(b.to))) {
      flow.y0 = y
      y += flow.link.value * k
    }

    y = node.y

    for (const flow of flows.filter((item) => item.to === node).sort((a, b) => center(a.from) - center(b.from))) {
      flow.y1 = y
      y += flow.link.value * k
    }
  }

  const ends = cols[last]
  const hi = spec.highlight ?? ends[maxAt(ends.map((node) => node.value))].name
  let bands = ""
  let lit = ""

  for (const flow of flows) {
    const x0 = xOf(flow.from.col) + nodeW
    const x1 = xOf(flow.to.col)
    const mx = num((x0 + x1) / 2)
    const h = flow.link.value * k
    const on = flow.link.from === hi || flow.link.to === hi
    const d = `M ${num(x0)} ${num(flow.y0)} C ${mx} ${num(flow.y0)} ${mx} ${num(flow.y1)} ${num(x1)} ${num(flow.y1)} L ${num(x1)} ${num(flow.y1 + h)} C ${mx} ${num(flow.y1 + h)} ${mx} ${num(flow.y0 + h)} ${num(x0)} ${num(flow.y0 + h)} Z`
    const band = c.tip(c.move(filled(d, on ? pal.accent : pal.neutral, { "fill-opacity": on ? 0.6 : 0.55 }), "wipe", flow.from.col * 220), `${flow.link.from.trim()} → ${flow.link.to.trim()}: ${c.show(flow.link.value)}${c.unit}`)

    if (on) lit += band
    else bands += band
  }

  let body = ""

  for (const node of nodes) {
    const x = xOf(node.col)
    const on = node.name === hi
    body += c.tip(c.move(rect(x, node.y, nodeW, Math.max(node.h, 2), on ? pal.accent : pal.ink, { rx: 2 }), "fade", node.col * 220), `${node.name.trim()}: ${c.show(node.value)}${c.unit}`)
    body += label(x + nodeW + 7, center(node) - 2, node.name, pal.text, { bold: true, halo: true }) + label(x + nodeW + 7, center(node) + 11, c.show(node.value), pal.muted, { size: 10, halo: true })
  }

  return bands + lit + body
}

export function chord(c: Ctx): string {
  const { pal, box, spec } = c
  const links = need(spec.links, "links")
  const names = [...new Set(links.flatMap((link) => [link.from, link.to]))]
  const count = names.length
  // 두 묶음 사이에 오간 양은 방향을 가리지 않고 합친다. 그래야 호의 길이가 그 묶음의 합계가 된다.
  const between = (a: number, b: number) => total(links.filter((link) => (link.from === names[a] && link.to === names[b]) || (link.from === names[b] && link.to === names[a])).map((link) => link.value))
  const sums = names.map((_, a) => total(names.map((_, b) => (a === b ? 0 : between(a, b)))))
  const hi = pick(names, spec.highlight, maxAt(sums))
  const pad = 0.06
  const unit = (Math.PI * 2 - pad * count) / total(sums)
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const r = Math.min(box.h / 2 - 18, box.w * 0.3)
  const inner = r - 13
  const starts: number[] = []
  sums.reduce((angle, value) => {
    starts.push(angle)

    return angle + value * unit + pad
  }, 0)

  // 묶음 안에서는 시계 방향으로 먼 상대부터 놓아야 띠가 서로 덜 엇갈린다.
  const spans = names.map((_, a) => {
    const row: ([number, number] | undefined)[] = Array(count).fill(undefined)
    let at = starts[a]

    for (let step = count - 1; step >= 1; step -= 1) {
      const b = (a + step) % count
      const sweep = between(a, b) * unit

      if (!sweep) continue
      row[b] = [at, at + sweep]
      at += sweep
    }

    return row
  })

  const spot = (angle: number) => {
    const point = polar(cx, cy, inner, angle)

    return `${num(point.x)} ${num(point.y)}`
  }

  const edge = ([from, to]: [number, number]) => `${spot(from)} A ${num(inner)} ${num(inner)} 0 ${to - from > Math.PI ? 1 : 0} 1 ${spot(to)}`
  let bands = ""
  let lit = ""

  for (let a = 0; a < count; a += 1) {
    for (let b = a + 1; b < count; b += 1) {
      const near = spans[a][b]
      const far = spans[b][a]

      if (!near || !far) continue
      const on = a === hi || b === hi
      const d = `M ${edge(near)} Q ${num(cx)} ${num(cy)} ${edge(far)} Q ${num(cx)} ${num(cy)} ${spot(near[0])} Z`
      const band = c.tip(c.move(filled(d, on ? pal.accent : pal.neutral, { "fill-opacity": on ? 0.6 : 0.55 }), "fade", 300 + (a + b) * 60), `${names[a]} ↔ ${names[b]}: ${c.show(between(a, b))}${c.unit}`)

      if (on) lit += band
      else bands += band
    }
  }

  let ring = ""
  names.forEach((name, index) => {
    const from = starts[index]
    const to = from + sums[index] * unit
    const on = index === hi
    ring += c.tip(c.move(filled(sector(cx, cy, r - 10, r, from, to), on ? pal.accent : pal.ink), "pop", index * 70, `${num(cx)}px ${num(cy)}px`), `${name}: ${c.show(sums[index])}${c.unit}`)
    const mid = (from + to) / 2
    const at = polar(cx, cy, r + 12, mid)
    ring += label(at.x, at.y, name, on ? pal.text : pal.muted, { bold: on, mid: true, anchor: Math.abs(Math.sin(mid)) < 0.25 ? "middle" : Math.sin(mid) > 0 ? "start" : "end" })
  })

  return bands + lit + ring
}

export function tree(c: Ctx): string {
  const { pal, box, spec } = c
  const links = need(spec.links, "links")
  const names = [...new Set(links.flatMap((link) => [link.from, link.to]))]
  const tops = names.filter((name) => !links.some((link) => link.to === name))
  const roots = tops.length ? tops : [names[0]]
  const spots = new Map<string, { x: number; depth: number }>()
  let leaves = 0

  // 잎을 왼쪽부터 한 칸씩 놓고, 부모는 자식들의 가운데에 둔다. 부모가 둘인 마디는 먼저 만난 부모 아래에 놓는다.
  const place = (name: string, depth: number): number => {
    spots.set(name, { x: 0, depth })
    const xs = links.filter((link) => link.from === name && !spots.has(link.to)).map((link) => place(link.to, depth + 1))
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : leaves++
    spots.set(name, { x, depth })

    return x
  }

  for (const root of roots) place(root, 0)
  const levels = Math.max(...[...spots.values()].map((spot) => spot.depth)) + 1
  const slot = box.w / leaves
  const w = Math.min(slot - 10, Math.max(...names.map((name) => textWidth(name, 12))) + 28)
  const h = 30

  const at = (name: string) => {
    const spot = spots.get(name) ?? { x: 0, depth: 0 }

    return { x: box.x + slot * (spot.x + 0.5), y: box.y + h / 2 + (levels > 1 ? (spot.depth * (box.h - h)) / (levels - 1) : (box.h - h) / 2), depth: spot.depth }
  }

  const hi = pick(names, spec.highlight, names.indexOf(roots[0]))
  let wires = ""
  let words = ""

  for (const link of links) {
    const a = at(link.from)
    const b = at(link.to)
    const mid = (a.y + b.y) / 2
    wires += c.move(path(`M ${num(a.x)} ${num(a.y + h / 2)} V ${num(mid)} H ${num(b.x)} V ${num(b.y - h / 2)}`, pal.neutral, 1.5), "fade", b.depth * 160)
    words += c.move(label(b.x, (mid + b.y - h / 2) / 2, `${c.show(link.value)}${c.unit}`, pal.text, { size: 10, bold: true, anchor: "middle", mid: true, halo: true }), "fade", b.depth * 160 + 150)
  }

  let body = ""
  names.forEach((name, index) => {
    const spot = at(name)
    const fill = index === hi ? pal.accent : spot.depth ? pal.soft : pal.ink
    body += c.move(rect(spot.x - w / 2, spot.y - h / 2, w, h, fill, { rx: 8 }) + label(spot.x, spot.y + 0.5, name, inkOn(fill), { size: 12, bold: true, anchor: "middle", mid: true }), "pop", spot.depth * 160)
  })

  return wires + words + body
}
