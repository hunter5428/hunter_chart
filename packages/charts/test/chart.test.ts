import assert from "node:assert/strict"
import test from "node:test"
import { chartFromTable, chartSvg, navyGold, orangeGray } from "../src/index.ts"

function texts(svg: string): string[] {
  return [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((match) => match[1])
}

function rects(svg: string): { fill?: string; x: number; y: number; width: number; height: number }[] {
  return [...svg.matchAll(/<rect\b([^>]*)\/>/g)].map((match) => {
    const attr = (name: string) => match[1].match(new RegExp(`${name}="([^"]*)"`))?.[1]

    return { fill: attr("fill"), x: Number(attr("x")), y: Number(attr("y")), width: Number(attr("width")), height: Number(attr("height")) }
  })
}

function tags(svg: string, name: string): Record<string, string>[] {
  return [...svg.matchAll(new RegExp(`<${name}\\b([^>]*?)/?>`, "g"))].map((match) => Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((pair) => [pair[1], pair[2]])))
}

test("세로 막대는 테마의 첫 색, 값, 단위를 표시한다", () => {
  const svg = chartSvg({
    type: "column",
    theme: orangeGray,
    title: "증가율",
    unitLeft: "(%)",
    categories: ["2026F", "2027F"],
    series: [{ name: "증가율", values: [33.5, 15.9], labels: "all" }],
  })

  assert.equal(svg.includes('fill="#F58220"'), true)
  assert.equal(texts(svg).includes("33.5"), true)
  assert.equal(texts(svg).includes("(%)"), true)
  assert.equal(texts(svg).includes("증가율"), true)
})

test("괄호 테마는 음수를 괄호로 적고 축에도 마이너스를 쓰지 않는다", () => {
  const svg = chartSvg({
    type: "column",
    theme: navyGold,
    categories: ["A", "B"],
    series: [{ name: "순매수", values: [8, -12], labels: "all" }],
    digits: 1,
  })

  assert.equal(texts(svg).includes("(12.0)"), true)
  assert.equal(texts(svg).some((label) => label.startsWith("-")), false)
  assert.equal(svg.includes('fill="#425288"'), true)
})

test("전망 구간은 테마의 전망 색으로 칠한다", () => {
  const svg = chartSvg({
    type: "column",
    theme: orangeGray,
    categories: ["2024", "2025", "2026F", "2027F"],
    series: [{ name: "증가율", values: [5, 6, 15, 8] }],
    forecastFrom: 2,
  })

  assert.equal(svg.includes('fill="#FDE6D2"'), true)
})

test("쌓은 막대는 나중 시리즈가 위쪽에 있다", () => {
  const svg = chartSvg({
    type: "column",
    theme: orangeGray,
    categories: ["2024"],
    stack: true,
    series: [
      { name: "기존", values: [10], tone: 0 },
      { name: "추가", values: [20], tone: 1 },
    ],
  })

  const bars = (fill: string) => rects(svg).filter((item) => item.fill === fill && item.height > 12 && item.width > 12)
  const lower = bars("#F58220")
  const upper = bars("#84888B")
  assert.equal(lower.length, 1)
  assert.equal(upper.length, 1)
  assert.equal(upper[0].y < lower[0].y, true)
})

test("오른쪽 축 값은 왼쪽 막대 눈금으로 줄어들지 않는다", () => {
  const svg = chartSvg({
    type: "combo",
    theme: orangeGray,
    categories: ["2024", "2025"],
    series: [
      { name: "막대", values: [10, 10], mark: "bar", axis: "left" },
      { name: "선", values: [100, 100], mark: "line", axis: "right" },
    ],
  })

  const axis = [...svg.matchAll(/<line\b([^>]*)\/>/g)].flatMap((match) => {
    const attr = (name: string) => Number(match[1].match(new RegExp(`${name}="([^"]*)"`))?.[1])
    const item = { x1: attr("x1"), y1: attr("y1"), x2: attr("x2"), y2: attr("y2") }

    return item.x1 === item.x2 && item.y2 - item.y1 > 40 ? [item] : []
  }).sort((a, b) => b.y2 - b.y1 - (a.y2 - a.y1))[0]

  const bar = rects(svg).filter((item) => item.fill === "#F58220" && item.height > 12 && item.width > 12)[0]
  assert.ok(axis)
  assert.ok(bar)
  assert.equal(bar.height > (axis.y2 - axis.y1) * 0.45, true)
})

test("이중축은 왼쪽 단위와 오른쪽 단위를 같이 적는다", () => {
  const svg = chartSvg({
    type: "combo",
    theme: orangeGray,
    unitLeft: "(%)",
    unitRight: "(배)",
    categories: ["2024", "2025", "2026"],
    series: [
      { name: "증가율", values: [5, 8, 6], mark: "bar", axis: "left" },
      { name: "PER", values: [10, 11, 9], mark: "line", axis: "right" },
    ],
  })

  assert.equal(texts(svg).includes("(%)"), true)
  assert.equal(texts(svg).includes("(배)"), true)
})

test("점선 선은 파선으로 그린다", () => {
  const svg = chartSvg({
    type: "line",
    theme: orangeGray,
    categories: ["2024", "2025"],
    series: [{ name: "평균", values: [10, 10], dashed: true }],
    guides: [{ value: 10, label: "평균 10" }],
  })

  assert.equal(svg.includes('stroke-dasharray="5 3"'), true)
  assert.equal(texts(svg).includes("평균 10"), true)
})

test("엑셀에서 붙인 표는 세로 막대 데이터가 된다", () => {
  const spec = chartFromTable("\t2024\t2025\n매출\t1,234\t(2)\n")
  assert.equal(spec.type, "column")
  assert.deepEqual(spec.categories, ["2024", "2025"])
  assert.equal(spec.series?.[0].name, "매출")
  assert.deepEqual(spec.series?.[0].values, [1234, -2])
  assert.throws(() => chartFromTable("항목,값\n매출,없음"), /숫자로 읽을 수 없습니다/)
})

test("면적 차트는 막대 없이 선 아래를 테마 색으로 채운다", () => {
  const svg = chartSvg({
    type: "area",
    theme: orangeGray,
    categories: ["24", "25", "26"],
    series: [{ name: "누적 순매수", values: [1, 3, 2] }],
  })

  const filled = tags(svg, "path").filter((item) => item.fill === "#F58220")
  assert.equal(filled.length, 1)
  assert.equal(filled[0].d.endsWith("Z"), true)
  assert.equal(rects(svg).some((item) => item.fill === "#F58220" && item.height > 12 && item.width > 12), false)
})

function ys(d: string): number[] {
  return [...d.matchAll(/[ML] [\d.-]+ ([\d.-]+)/g)].map((match) => Number(match[1]))
}

test("누적 면적은 나중 시리즈가 앞 시리즈 위에 얹힌다", () => {
  const svg = chartSvg({
    type: "area",
    theme: orangeGray,
    stack: true,
    categories: ["24", "25"],
    series: [
      { name: "단기금리 기대", values: [10, 10] },
      { name: "기간 프리미엄", values: [20, 20] },
    ],
  })

  const lower = ys(tags(svg, "path").filter((item) => item.fill === "#F58220")[0].d)
  const upper = ys(tags(svg, "path").filter((item) => item.fill === "#84888B")[0].d)
  assert.equal(Math.max(...upper), Math.min(...lower))
  assert.equal(Math.min(...upper) < Math.min(...lower), true)
})

test("막대에 얹은 점 시리즈는 막대가 아니라 점으로 그린다", () => {
  const svg = chartSvg({
    type: "combo",
    theme: orangeGray,
    categories: ["영업이익", "순이익"],
    series: [
      { name: "실적", values: [10, 20] },
      { name: "증가율", values: [5, 8], mark: "dot", axis: "right", tone: 4 },
    ],
  })

  assert.equal(rects(svg).some((item) => item.fill === "#002F6C" && item.height > 12), false)
  assert.equal(tags(svg, "circle").filter((item) => item.fill === "#002F6C" && Number(item.r) > 4).length, 2)
})

test("100% 누적 막대는 범주마다 합을 100으로 맞추고 비중을 막대 안에 적는다", () => {
  const svg = chartSvg({
    type: "column",
    theme: orangeGray,
    stack: "percent",
    categories: ["2026F", "2027F"],
    series: [
      { name: "매출 감소", values: [30, 10], labels: "all" },
      { name: "매출 증가", values: [90, 30], labels: "all" },
    ],
  })

  const bars = (fill: string) => rects(svg).filter((item) => item.fill === fill && item.height > 12 && item.width > 12)
  const lower = bars("#F58220")
  const upper = bars("#84888B")
  assert.equal(lower.length, 2)
  assert.equal(Math.abs(lower[0].height - lower[1].height) < 0.1, true)
  assert.equal(Math.abs(upper[0].height - lower[0].height * 3) < 0.1, true)
  assert.deepEqual(texts(svg).filter((label) => label === "25.0" || label === "75.0").sort(), ["25.0", "25.0", "75.0", "75.0"])
  assert.equal(texts(svg).includes("120"), false)
})

test("시작값이 있는 막대는 0이 아니라 시작값에서 떠서 그려지고 양 끝 값을 적는다", () => {
  const svg = chartSvg({
    type: "column",
    theme: orangeGray,
    categories: ["하단", "상반기 상단"],
    series: [{ name: "코스피", low: [4845, 6315], values: [5384, 7801], labels: "all" }],
  })

  const bars = rects(svg).filter((item) => item.fill === "#F58220" && item.height > 12 && item.width > 12)
  assert.equal(bars.length, 2)
  assert.equal(bars[1].y + bars[1].height < bars[0].y, true)
  assert.equal(texts(svg).includes("0"), false)

  for (const label of ["4845", "5384", "6315", "7801"]) assert.equal(texts(svg).includes(label), true)
})

test("범위 띠 시리즈는 하단과 상단 사이를 테마의 옅은 색으로 채운다", () => {
  const svg = chartSvg({
    type: "line",
    theme: orangeGray,
    categories: ["26.10", "27.4", "27.10"],
    series: [
      { name: "코스피", values: [5384, null, null] },
      { name: "전망 범위", mark: "ribbon", low: [5384, 5300, 5304], values: [5384, 7463, 8536], tone: 0 },
    ],
  })

  const band = tags(svg, "path").filter((item) => item.fill === "#F0B26B")
  assert.equal(band.length, 1)
  const points = ys(band[0].d)
  assert.equal(points.length, 6)
  assert.equal(Math.min(...points) < Math.max(...points) - 40, true)
})

function strokes(svg: string, stroke: string): { dx: number; dy: number }[] {
  return tags(svg, "line")
    .filter((item) => item.stroke === stroke && item["stroke-width"] === "1.5")
    .map((item) => ({ dx: Math.abs(Number(item.x2) - Number(item.x1)), dy: Math.abs(Number(item.y2) - Number(item.y1)) }))
}

test("오차 막대 시리즈는 하단에서 상단까지 세로선을 긋고 양 끝에 마개를 단다", () => {
  const svg = chartSvg({
    type: "column",
    theme: orangeGray,
    categories: ["한국 27F"],
    series: [
      { name: "주주환원수익률", values: [4.1] },
      { name: "범위", mark: "whisker", low: [2.7], values: [5.1], tone: 2 },
    ],
  })

  const drawn = strokes(svg, "#000000")
  assert.equal(drawn.filter((item) => item.dx === 0 && item.dy > 20).length, 1)
  assert.equal(drawn.filter((item) => item.dy === 0 && item.dx === 8).length, 2)
  assert.equal(rects(svg).some((item) => item.fill === "#000000" && item.height > 12), false)
})

test("가로 막대 차트에서 범위는 가로선으로, 중앙값은 점으로 그린다", () => {
  const svg = chartSvg({
    type: "bar",
    theme: orangeGray,
    categories: ["바이오", "은행"],
    series: [
      { name: "범위", mark: "whisker", low: [-75, -10], values: [-5, 30], tone: 4 },
      { name: "중앙값", mark: "dot", values: [-35, 10], tone: 3 },
    ],
  })

  assert.equal(strokes(svg, "#002F6C").filter((item) => item.dy === 0 && item.dx > 20).length, 2)
  assert.equal(tags(svg, "circle").filter((item) => item.fill === "#8DC8E8" && Number(item.r) > 4).length, 2)
  assert.equal(rects(svg).some((item) => (item.fill === "#002F6C" || item.fill === "#8DC8E8") && item.width > 12), false)
})

test("곡선 옵션을 켠 선은 꺾은선 대신 곡선 구간으로 잇는다", () => {
  const svg = chartSvg({
    type: "line",
    theme: orangeGray,
    categories: ["23", "24", "25", "26"],
    series: [{ name: "증가율", values: [1, 5, 2, 6], smooth: true }],
  })

  const d = tags(svg, "path").find((item) => item.stroke === "#F58220")?.d ?? ""
  assert.equal(d.split(" C ").length - 1, 3)
  assert.equal(d.includes(" L "), false)
})

test("로그 축은 값이 열 배가 될 때마다 같은 높이만큼 올라간다", () => {
  const spec = { type: "line", theme: orangeGray, log: true, categories: ["15", "19", "23", "26"], series: [{ name: "비트코인", values: [1, 10, 100, 1000] }] } as const
  const svg = chartSvg(spec)
  const points = ys(tags(svg, "path").find((item) => item.stroke === "#F58220")?.d ?? "")
  assert.equal(points.length, 4)
  assert.equal(Math.abs(points[0] - points[1] - (points[2] - points[3])) < 0.1, true)
  assert.equal(points[0] - points[1] > 40, true)

  for (const label of ["1", "10", "100", "1000"]) assert.equal(texts(svg).includes(label), true)
  assert.throws(() => chartSvg({ ...spec, series: [{ name: "수익률", values: [-1, 10, 100, 1000] }] }), /0보다 큰 값/)
})

function xs(d: string): number[] {
  return [...d.matchAll(/[ML] ([\d.-]+) [\d.-]+/g)].map((match) => Number(match[1]))
}

test("음영 구간은 지정한 범주 범위만 테마의 전망 색으로 칠하고 이름을 적는다", () => {
  const svg = chartSvg({
    type: "line",
    theme: orangeGray,
    categories: ["20", "21", "22", "23", "24", "25"],
    series: [{ name: "기준금리", values: [1, 2, 3, 4, 3, 2] }],
    spans: [{ from: 1, to: 2, label: "긴축" }],
  })

  const shade = rects(svg).filter((item) => item.fill === "#FDE6D2")
  const points = xs(tags(svg, "path").find((item) => item.stroke === "#F58220")?.d ?? "")
  assert.equal(shade.length, 1)
  assert.equal(Math.abs(shade[0].width - (points[1] - points[0]) * 2) < 0.1, true)
  assert.equal(shade[0].x < points[1] && shade[0].x + shade[0].width > points[2], true)
  assert.equal(texts(svg).includes("긴축"), true)
})

test("밴드 차트는 주가 선 위에 농도가 다른 배수 선을 깔고 배수 이름을 선 끝에 적는다", () => {
  const svg = chartSvg({
    type: "band",
    theme: orangeGray,
    categories: ["24", "25", "26"],
    series: [
      { name: "주가", values: [90, 120, 100] },
      { name: "0.2x", values: [60, 62, 64] },
      { name: "0.3x", values: [90, 93, 96] },
      { name: "0.4x", values: [120, 124, 128] },
    ],
  })

  const lines = tags(svg, "path").filter((item) => item.fill === "none")
  assert.equal(lines.length, 4)
  assert.equal(lines[3].stroke, "#F58220")
  assert.equal(new Set(lines.slice(0, 3).map((item) => item.stroke)).size, 3)
  assert.equal(lines.slice(0, 3).every((item) => Number(item["stroke-width"]) < Number(lines[3]["stroke-width"])), true)

  for (const label of ["주가", "0.2x", "0.3x", "0.4x"]) assert.equal(texts(svg).filter((item) => item === label).length, 1)
  const name = tags(svg, "text").find((item) => item.fill === lines[2].stroke)
  assert.equal(Number(name?.x) > Math.max(...xs(lines[2].d)), true)
})

test("산점도의 기준선은 x값에는 세로 점선을, y값에는 가로 점선을 긋고 이름을 적는다", () => {
  const svg = chartSvg({
    type: "scatter",
    theme: orangeGray,
    points: [
      { x: 0, y: 0 },
      { x: 40, y: 8 },
    ],
    guides: [
      { value: 15, axis: "x", label: "반도체 제외 15%" },
      { value: 4.8, label: "미국 금리 4.8%" },
    ],
  })

  const dashed = tags(svg, "line").filter((item) => item["stroke-dasharray"] === "4 3")
  assert.equal(dashed.filter((item) => item.x1 === item.x2 && item.y1 !== item.y2).length, 1)
  assert.equal(dashed.filter((item) => item.y1 === item.y2 && item.x1 !== item.x2).length, 1)
  assert.equal(texts(svg).includes("반도체 제외 15%"), true)
  assert.equal(texts(svg).includes("미국 금리 4.8%"), true)
})

test("추세선을 켠 산점도는 회귀선을 점선으로 긋고 결정계수를 적는다", () => {
  const svg = chartSvg({
    type: "scatter",
    theme: orangeGray,
    trend: true,
    points: [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 4, y: 9 },
    ],
  })

  const trend = tags(svg, "line").filter((item) => item["stroke-dasharray"] === "5 3")
  assert.equal(trend.length, 1)
  assert.equal(Number(trend[0].x2) > Number(trend[0].x1) && Number(trend[0].y2) < Number(trend[0].y1), true)
  assert.equal(texts(svg).includes("R² = 1.00"), true)
})

function textAt(svg: string, label: string) {
  const found = new RegExp(`<text\\b[^>]*\\bx="([\\d.-]+)" y="([\\d.-]+)"[^>]*>${label}</text>`).exec(svg)

  return { x: Number(found?.[1]), y: Number(found?.[2]) }
}

test("사분면 차트는 원점을 지나는 십자 축을 긋고 네 구석에 이름을 적는다", () => {
  const svg = chartSvg({
    type: "quadrant",
    theme: orangeGray,
    points: [
      { x: -50, y: 20, label: "운송" },
      { x: 60, y: -30, label: "전력기기" },
      { x: 30, y: 40 },
      { x: -20, y: -10 },
    ],
    quadrants: ["성과 개선", "성과 우수", "성과 부진", "성과 둔화"],
  })

  const solid = tags(svg, "line").filter((item) => !item["stroke-dasharray"])
  const tall = solid.filter((item) => item.x1 === item.x2 && Math.abs(Number(item.y2) - Number(item.y1)) > 100).map((item) => Number(item.x1))
  const wide = solid.filter((item) => item.y1 === item.y2 && Math.abs(Number(item.x2) - Number(item.x1)) > 100).map((item) => Number(item.y1))
  assert.equal(tall.length, 2)
  assert.equal(wide.length, 2)
  const crossX = Math.max(...tall)
  const crossY = Math.min(...wide)
  assert.equal(textAt(svg, "성과 개선").x < crossX && textAt(svg, "성과 개선").y < crossY, true)
  assert.equal(textAt(svg, "성과 우수").x > crossX && textAt(svg, "성과 우수").y < crossY, true)
  assert.equal(textAt(svg, "성과 부진").x < crossX && textAt(svg, "성과 부진").y > crossY, true)
  assert.equal(textAt(svg, "성과 둔화").x > crossX && textAt(svg, "성과 둔화").y > crossY, true)
})

test("히트맵은 숫자 칸을 값의 크기만큼 진하게 칠하고 음수는 둘째 색으로 칠한다", () => {
  const table = { theme: orangeGray, columns: ["업종", "1M", "3M"], rows: [["반도체", 10, -5], ["은행", 2, -10]] } as const
  const plain = rects(chartSvg({ type: "table", ...table })).map((item) => item.fill)
  const cells = rects(chartSvg({ type: "heatmap", ...table })).filter((item) => !plain.includes(item.fill))
  assert.equal(cells.length, 4)
  const fillAt = (row: number, column: number) => [...cells].sort((a, b) => a.y - b.y || a.x - b.x)[row * 2 + column].fill ?? ""
  const channel = (hex: string, shift: number) => (parseInt(hex.slice(1), 16) >> shift) & 255
  assert.equal(channel(fillAt(0, 0), 0) < channel(fillAt(1, 0), 0), true)
  assert.equal(channel(fillAt(1, 1), 16) < channel(fillAt(0, 1), 16), true)
  assert.equal(channel(fillAt(0, 0), 16) > channel(fillAt(0, 0), 0), true)
  assert.equal(Math.abs(channel(fillAt(1, 1), 16) - channel(fillAt(1, 1), 0)) < 16, true)
})

test("분포 차트는 범주 안에서 시리즈마다 자리를 나눠 관측값을 점으로 찍고 평균을 강조 색으로 얹는다", () => {
  const svg = chartSvg({
    type: "strip",
    theme: orangeGray,
    categories: ["2027F", "2028F"],
    series: [
      { name: "3개월 전", values: [555.7, 553.1], spread: [[350, 500, 662.5], [300, 761.3]] },
      { name: "현재", values: [606.6, 668.8], spread: [[440, 711.8], [340, 868.6]] },
    ],
  })

  // 범례의 점은 r이 다르므로 관측값과 평균만 고른다.
  const dots = tags(svg, "circle").filter((item) => item.r === "3.5")
  const means = tags(svg, "circle").filter((item) => item.fill === "#C00000" && item.r === "5.5")
  assert.equal(dots.filter((item) => item.fill === "#F58220").length, 5)
  assert.equal(dots.filter((item) => item.fill === "#84888B").length, 4)
  assert.equal(means.length, 4)
  const columns = [...new Set(dots.map((item) => Number(item.cx)))]
  assert.equal(columns.length, 4)
  assert.deepEqual(columns, [...columns].sort((a, b) => a - b))
  // 최댓값끼리, 최솟값끼리 시리즈를 잇는 선이 범주마다 2개씩 있다.
  assert.equal(tags(svg, "line").filter((item) => item.stroke === "#F0B26B").length, 4)

  for (const label of ["555.7", "662.5", "868.6", "평균"]) assert.equal(texts(svg).includes(label), true)
})

test("프로파일 차트는 범주 축 하나를 나눠 쓰는 가로 막대 패널을 시리즈마다 따로 눈금을 잡아 나란히 놓는다", () => {
  const svg = chartSvg({
    type: "profile",
    theme: orangeGray,
    categories: ["9,200", "8,200", "7,200"],
    series: [
      { name: "거래대금 비중", values: [2, 8, 4] },
      { name: "개인 순매수", values: [10, -20, 30] },
    ],
  })

  const first = rects(svg).filter((item) => item.fill === "#F58220")
  const second = rects(svg).filter((item) => item.fill === "#84888B")
  assert.equal(first.length, 3)
  assert.equal(second.length, 3)
  assert.equal(Math.max(...first.map((item) => item.x + item.width)) < Math.min(...second.map((item) => item.x)), true)
  assert.deepEqual(first.map((item) => item.y), second.map((item) => item.y))
  assert.equal(first[0].y < first[1].y, true)
  // 값이 8과 30으로 달라도 패널마다 눈금이 따로라 가장 긴 막대의 길이는 비슷하다.
  assert.equal(Math.abs(first[1].width - second[2].width) < first[1].width * 0.5, true)
  assert.equal(second[1].x + second[1].width <= second[0].x, true)

  for (const label of ["거래대금 비중", "개인 순매수", "9,200", "7,200"]) assert.equal(texts(svg).includes(label), true)
})

test("소형 다중 차트는 시리즈마다 칸을 하나씩 주고 같은 줄의 칸은 세로 눈금을 함께 쓴다", () => {
  const svg = chartSvg({
    type: "multiples",
    theme: orangeGray,
    categories: ["2025", "2026", "2027F"],
    series: [
      { name: "에너지", values: [-1.5, 23.9, 17.2], labels: "all" },
      { name: "화학", values: [-4.9, 1.7, 4.1] },
      { name: "철강", values: [1.1, 2.5, 3.4] },
    ],
  })

  const lines = tags(svg, "path").filter((item) => item.stroke === "#F58220")
  assert.equal(lines.length, 3)
  assert.equal(Math.max(...xs(lines[0].d)) < Math.min(...xs(lines[1].d)), true)
  assert.equal(Math.max(...xs(lines[1].d)) < Math.min(...xs(lines[2].d)), true)
  assert.equal(Math.min(...ys(lines[0].d)) < Math.min(...ys(lines[1].d)), true)
  assert.equal(ys(lines[1].d)[2] < ys(lines[2].d)[2], true)
  assert.equal(tags(svg, "circle").filter((item) => item.fill === "#FFFFFF" && item.stroke === "#F58220" && item.r === "3.5").length, 9)
  // 칸을 구분하려고 짝수 번째 칸에만 바탕을 깐다.
  assert.equal(rects(svg).filter((item) => item.fill === "#E6E7E8").length, 1)
  assert.equal(texts(svg).includes("23.9"), true)
  assert.equal(texts(svg).includes("1.7"), false)

  for (const label of ["에너지", "화학", "철강"]) assert.equal(texts(svg).includes(label), true)
})

test("등급 격자는 범주마다 점수 칸 하나를 칠하고 나머지 시리즈를 숫자 열로 적는다", () => {
  const svg = chartSvg({
    type: "rating",
    theme: navyGold,
    categories: ["미국", "선진", "글로벌HY"],
    series: [
      { name: "투자 매력도 6M", values: [1, -1, -1] },
      { name: "12M", values: [0, 0, -1] },
    ],
  })

  const filled = rects(svg).filter((item) => item.fill === "#425288")
  assert.equal(filled.length, 3)
  assert.equal(filled[0].x > filled[1].x, true)
  assert.equal(filled[1].x, filled[2].x)
  assert.equal(filled[0].y < filled[1].y && filled[1].y < filled[2].y, true)

  // 점수 눈금은 -3부터 3까지 7칸이고 음수는 테마 방식(괄호)으로 적는다.
  for (const label of ["(3)", "(2)", "(1)", "0", "1", "2", "3", "투자 매력도 6M", "12M", "미국", "글로벌HY"]) assert.equal(texts(svg).includes(label), true)
  assert.equal(texts(svg).filter((item) => item === "(1)").length, 2)
})

test("화면용 세로 막대는 막대마다 자라는 동작을 붙이고 범주마다 툴팁 문구를 싣는다", () => {
  const spec = { type: "column", theme: orangeGray, title: "증가율", categories: ["2026F", "2027F"], series: [{ name: "증가율", values: [33.5, 15.9] }] } as const
  const svg = chartSvg({ ...spec, live: true })
  assert.equal(tags(svg, "g").filter((item) => item.class === "hc-rise").length, 2)
  assert.equal(svg.includes("@keyframes hc-rise"), true)
  assert.deepEqual(tags(svg, "rect").flatMap((item) => item["data-tip"] ?? []), ["2026F&#10;증가율: 33.5", "2027F&#10;증가율: 15.9"])
  // 루트 title은 브라우저 기본 툴팁으로 떠서 차트 툴팁과 겹친다.
  assert.equal(svg.includes("<title>"), false)
  assert.equal(svg.includes('aria-label="증가율"'), true)
  // 동작이 든 SVG를 PNG로 찍으면 첫 프레임이 찍히므로 내보내는 SVG에는 넣지 않는다.
  const still = chartSvg(spec)
  assert.equal(still.includes("hc-") || still.includes("data-tip"), false)
  assert.equal(still.includes("<title>증가율</title>"), true)
})

function tips(svg: string, name: string): string[] {
  return tags(svg, name).flatMap((item) => item["data-tip"] ?? [])
}

function moves(svg: string, kind: string): number {
  return tags(svg, "g").filter((item) => item.class === `hc-${kind}`).length
}

test("화면용 파이, 산점도, 폭포는 도형마다 툴팁 문구를 싣고 등장 동작을 붙인다", () => {
  const pie = chartSvg({ type: "pie", theme: orangeGray, live: true, slices: [{ label: "백화점", value: 46 }, { label: "할인점", value: 32 }, { label: "기타", value: 22 }] })
  assert.deepEqual(tips(pie, "g"), ["백화점: 46 (46%)", "할인점: 32 (32%)", "기타: 22 (22%)"])
  assert.equal(moves(pie, "pop"), 3)
  const scatter = chartSvg({ type: "scatter", theme: orangeGray, live: true, xLabel: "이익 증가율", yLabel: "PBR", points: [{ x: 10, y: 1.5, label: "반도체" }, { x: 40, y: 3 }] })
  assert.deepEqual(tips(scatter, "g"), ["반도체&#10;이익 증가율: 10&#10;PBR: 1.5", "이익 증가율: 40&#10;PBR: 3.0"])
  assert.equal(moves(scatter, "pop"), 2)
  const waterfall = chartSvg({ type: "waterfall", theme: orangeGray, live: true, steps: [{ label: "기초", value: 100, total: true }, { label: "증가", value: 20 }, { label: "기말", value: 120, total: true }] })
  assert.deepEqual(tips(waterfall, "g"), ["기초: 100", "증가: 20", "기말: 120"])
  assert.equal(moves(waterfall, "rise"), 3)
})

test("화면용 범위, 프로파일, 소형 다중 차트는 범주나 점마다 툴팁 문구를 싣는다", () => {
  const categories = ["2026", "2027F"]
  const series = [{ name: "하단", values: [10, 12] }, { name: "상단", values: [20, 26] }]
  assert.deepEqual(tips(chartSvg({ type: "range", theme: orangeGray, live: true, categories, series }), "rect"), ["2026&#10;하단: 10&#10;상단: 20", "2027F&#10;하단: 12&#10;상단: 26"])
  assert.deepEqual(tips(chartSvg({ type: "profile", theme: orangeGray, live: true, categories, series }), "rect"), ["2026&#10;하단: 10&#10;상단: 20", "2027F&#10;하단: 12&#10;상단: 26"])
  assert.deepEqual(tips(chartSvg({ type: "multiples", theme: orangeGray, live: true, categories, series }), "g"), ["하단&#10;2026: 10", "하단&#10;2027F: 12", "상단&#10;2026: 20", "상단&#10;2027F: 26"])
  const strip = chartSvg({ type: "strip", theme: orangeGray, live: true, categories: ["2027F"], series: [{ name: "현재", values: [600], spread: [[440, 700]] }] })
  assert.deepEqual(tips(strip, "rect"), ["2027F&#10;현재: 평균 600 (440 ~ 700)"])
})

test("파이 차트의 오른쪽 범례는 원 높이에 맞춰 세로 가운데에 있다", () => {
  const svg = chartSvg({
    type: "pie",
    theme: orangeGray,
    title: "매출 구성",
    slices: [
      { label: "백화점", value: 46 },
      { label: "할인점", value: 32 },
      { label: "기타", value: 22 },
    ],
  })

  const center = svg.match(/<path\b[^>]*\bd="M ([\d.]+) ([\d.]+)/)
  const top = textAt(svg, "백화점 46%").y
  const bottom = textAt(svg, "기타 22%").y
  assert.equal(top < bottom, true)
  assert.equal(Math.abs((top + bottom) / 2 - Number(center?.[2])) < 1, true)
})
