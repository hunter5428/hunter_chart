import assert from "node:assert/strict"
import test from "node:test"
import { chartSvg, limeNavy, orangeGray } from "../src/index.ts"
import type { ModernSpec } from "../src/index.ts"

const ACCENT = "#F58220"

function texts(svg: string): string[] {
  return [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((match) => match[1])
}

function tags(svg: string, name: string): Record<string, string>[] {
  return [...svg.matchAll(new RegExp(`<${name}\\b([^>]*?)/?>`, "g"))].map((match) => Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((pair) => [pair[1], pair[2]])))
}

function filled(svg: string, name: string, fill: string): Record<string, string>[] {
  return tags(svg, name).filter((tag) => tag.fill === fill)
}

function at(svg: string, content: string) {
  // 범례에도 같은 이름이 있으면 범례가 먼저 나오므로 차트 안의 마지막 글자를 고른다.
  const tag = [...svg.matchAll(new RegExp(`<text\\b([^>]*)>${content.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</text>`, "g"))].at(-1)?.[1] ?? ""

  return { x: Number(tag.match(/\bx="([^"]*)"/)?.[1]), y: Number(tag.match(/\by="([^"]*)"/)?.[1]) }
}

function marks(svg: string, name: string): Record<string, string>[] {
  // 카드 바탕과 범례의 네모는 차트의 도형이 아니다.
  return tags(svg, name).filter((tag) => tag.rx !== "18" && !(tag.width === "10" && tag.height === "10"))
}

function lit(svg: string, name: string): Record<string, string>[] {
  return marks(svg, name).filter((tag) => tag.fill === ACCENT)
}

function modern(spec: Omit<ModernSpec, "kind" | "theme">): string {
  return chartSvg({ kind: "modern", theme: orangeGray, ...spec })
}

const devices = [
  { label: "모바일", value: 72 },
  { label: "PC", value: 23 },
  { label: "태블릿", value: 5 },
]

test("모던형 카드는 제목, 부제, 한 줄 요약을 적고 가장 큰 조각만 테마의 첫 색으로 칠한다", () => {
  const svg = modern({ type: "pie", title: "기기별 매출", subtitle: "매출 비중(%)", takeaway: "매출 대부분이 모바일에서 나와요", items: devices })

  for (const label of ["기기별 매출", "매출 비중(%)", "매출 대부분이 모바일에서 나와요", "72%", "23%"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(filled(svg, "path", ACCENT).length, 1)
  assert.equal(tags(svg, "rect").some((tag) => tag.rx === "18"), true)
})

test("모던형도 고른 테마의 첫 색을 강조색으로 쓴다", () => {
  const svg = chartSvg({ kind: "modern", type: "pie", theme: limeNavy, items: devices })
  assert.equal(filled(svg, "path", "#C6E534").length, 1)
  assert.equal(svg.includes(ACCENT), false)
})

test("강조할 항목을 이름으로 고르면 그 조각이 강조색이다", () => {
  const svg = chartSvg({ kind: "modern", type: "pie", theme: orangeGray, items: devices, highlight: "PC", live: true })
  const accent = svg.match(/<g data-tip="([^"]*)">(?:<g[^>]*>)?<path[^>]*fill="#F58220"/)
  assert.equal(accent?.[1], "PC: 23 (23%)")
})

test("kind를 생략하면 지금의 증권사 레포트형으로 그린다", () => {
  const svg = chartSvg({ type: "pie", theme: orangeGray, title: "매출 구성", slices: [{ label: "백화점", value: 46 }, { label: "할인점", value: 54 }] })
  assert.equal(tags(svg, "rect").some((tag) => tag.rx === "18"), false)
  assert.equal(svg, chartSvg({ kind: "report", type: "pie", theme: orangeGray, title: "매출 구성", slices: [{ label: "백화점", value: 46 }, { label: "할인점", value: 54 }] }))
})

test("도넛은 가운데에 합계를 적고 오른쪽 목록에 비중을 적는다", () => {
  const svg = modern({
    type: "donut",
    caption: "전환(건)",
    items: [
      { label: "구매", value: 719 },
      { label: "회원가입", value: 260 },
      { label: "문의", value: 161 },
      { label: "전화", value: 100 },
    ],
  })

  for (const label of ["1,240", "전환(건)", "58%", "21%", "13%", "8%"]) assert.equal(texts(svg).includes(label), true, label)
})

test("와플은 100칸 중 첫 항목의 몫만큼 강조색으로 채운다", () => {
  const svg = modern({ type: "waffle", items: [{ label: "신규", value: 38 }, { label: "재구매", value: 62 }] })
  const cells = tags(svg, "rect").filter((tag) => tag.width === tag.height && Number(tag.width) > 10)
  assert.equal(cells.length, 100)
  assert.equal(cells.filter((tag) => tag.fill === ACCENT).length, 38)
  assert.equal(texts(svg).includes("38%"), true)
})

test("마리메코는 열의 폭으로 열 비중을, 칸의 높이로 열 안의 비중을 나타낸다", () => {
  const svg = modern({
    type: "marimekko",
    categories: ["검색", "PMax", "SNS"],
    series: [
      { name: "모바일", values: [26.1, 25.9, 17.6] },
      { name: "PC", values: [16.2, 7.7, 1.8] },
      { name: "태블릿", values: [2.7, 1.4, 0.6] },
    ],
  })

  for (const label of ["45%", "35%", "20%", "58%", "74%", "88%"]) assert.equal(texts(svg).includes(label), true, label)
  const mobile = filled(svg, "rect", ACCENT).filter((tag) => Number(tag.height) > 20)
  assert.deepEqual(mobile.map((tag) => Math.round((Number(tag.width) / Number(mobile[2].width)) * 20)), [45, 35, 20])
})

test("비율 막대는 한 줄 막대와 값, 비중 목록을 그린다", () => {
  const svg = modern({
    type: "segmented",
    highlight: "간편결제",
    items: [
      { label: "카드", value: 412 },
      { label: "간편결제", value: 278 },
      { label: "계좌이체", value: 134 },
      { label: "휴대폰", value: 45 },
      { label: "기타", value: 27 },
    ],
  })

  for (const label of ["46%", "31%", "15%", "412", "278", "간편결제"]) assert.equal(texts(svg).includes(label), true, label)
  const bar = filled(svg, "rect", ACCENT).filter((tag) => Number(tag.width) > 20)
  assert.equal(bar.length, 1)
})

const products = [
  { group: "러닝화", label: "쿠셔닝 런", value: 22 },
  { group: "러닝화", label: "레이스 엑스", value: 14 },
  { group: "러닝화", label: "데일리 런", value: 10 },
  { group: "아웃도어", label: "트레일", value: 14 },
  { group: "아웃도어", label: "등산화", value: 10 },
  { group: "의류", label: "재킷", value: 11 },
  { group: "의류", label: "티셔츠", value: 7 },
  { group: "용품", label: "양말", value: 7 },
  { group: "용품", label: "깔창", value: 5 },
]

test("트리맵은 묶음마다 비중을 적고 가장 큰 칸만 강조색으로 칠한다", () => {
  const svg = modern({ type: "treemap", items: products })

  for (const label of ["러닝화 46%", "아웃도어 24%", "쿠셔닝 런", "22%"]) assert.equal(texts(svg).includes(label), true, label)
  const cells = tags(svg, "rect").filter((tag) => Number(tag.width) > 20 && tag.rx !== "18")
  assert.equal(cells.length, 9)
  assert.equal(cells.filter((tag) => tag.fill === ACCENT).length, 1)
  const area = (tag: Record<string, string>) => Number(tag.width) * Number(tag.height)
  const biggest = cells.reduce((a, b) => (area(a) > area(b) ? a : b))
  assert.equal(biggest.fill, ACCENT)
})

test("선버스트는 안쪽 고리에 묶음, 바깥 고리에 항목을 두고 고른 항목만 강조색으로 칠한다", () => {
  const svg = modern({
    type: "sunburst",
    highlight: "전체 상품",
    items: [
      { group: "검색", label: "브랜드", value: 18 },
      { group: "검색", label: "일반", value: 30 },
      { group: "PMax", label: "전체 상품", value: 25 },
      { group: "PMax", label: "베스트", value: 12 },
      { group: "유튜브", label: "리마케팅", value: 9 },
      { group: "유튜브", label: "신규", value: 6 },
    ],
  })

  for (const label of ["전체 상품 25%", "일반 30%", "PMax", "검색"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(filled(svg, "path", ACCENT).length, 1)
  assert.equal(tags(svg, "path").length, 9)
})

const stages = [
  { label: "방문", value: 10000 },
  { label: "상품 조회", value: 6200 },
  { label: "장바구니", value: 1900 },
  { label: "구매", value: 760 },
]

test("퍼널은 전 단계 대비 비율을 적고 가장 많이 빠지는 단계를 강조한다", () => {
  const svg = modern({ type: "funnel", items: stages })

  for (const label of ["전 단계 대비", "62%", "31%", "40%", "10,000"]) assert.equal(texts(svg).includes(label), true, label)
  const bars = marks(svg, "rect")
  const accent = bars.filter((tag) => tag.fill === ACCENT)
  assert.equal(accent.length, 1)
  assert.equal(Math.round((Number(accent[0].width) / Math.max(...bars.map((tag) => Number(tag.width)))) * 100), 19)
})

test("퍼널은 첫 단계 대비 비율로 바꿔 적을 수 있다", () => {
  const svg = modern({ type: "funnel", variant: "from-first", items: stages })

  for (const label of ["첫 단계 대비", "62%", "19%", "8%"]) assert.equal(texts(svg).includes(label), true, label)
})

test("생키는 마디마다 흐름의 합을 적고 고른 마디에 닿는 띠만 강조색으로 칠한다", () => {
  const svg = modern({
    type: "sankey",
    highlight: "구매",
    links: [
      { from: "검색", to: "상품 상세", value: 4200 },
      { from: "SNS", to: "상품 상세", value: 2600 },
      { from: "SNS", to: "이벤트", value: 1400 },
      { from: "직접", to: "상품 상세", value: 1800 },
      { from: "직접", to: "이벤트", value: 600 },
      { from: "상품 상세", to: "장바구니", value: 3900 },
      { from: "상품 상세", to: "이탈", value: 4700 },
      { from: "이벤트", to: "장바구니", value: 900 },
      { from: "이벤트", to: "이탈", value: 1100 },
      { from: "장바구니", to: "구매", value: 2900 },
      { from: "장바구니", to: "이탈 ", value: 1900 },
    ],
  })

  for (const label of ["검색", "4,200", "상품 상세", "8,600", "장바구니", "4,800", "구매", "2,900", "5,800"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(filled(svg, "path", ACCENT).length, 1)
  assert.equal(filled(svg, "rect", ACCENT).length, 1)
  assert.equal(tags(svg, "path").length, 11)
  assert.equal(at(svg, "검색").x < at(svg, "상품 상세").x && at(svg, "상품 상세").x < at(svg, "장바구니").x && at(svg, "장바구니").x < at(svg, "구매").x, true)
})

test("코드 다이어그램은 합계가 가장 큰 묶음과 그 묶음에 닿는 띠를 강조색으로 칠한다", () => {
  const svg = modern({
    type: "chord",
    links: [
      { from: "디자인", to: "개발", value: 42 },
      { from: "개발", to: "디자인", value: 28 },
      { from: "기획", to: "디자인", value: 36 },
      { from: "기획", to: "개발", value: 54 },
      { from: "개발", to: "기획", value: 22 },
      { from: "마케팅", to: "기획", value: 31 },
      { from: "마케팅", to: "디자인", value: 26 },
      { from: "디자인", to: "마케팅", value: 12 },
      { from: "데이터", to: "기획", value: 18 },
      { from: "데이터", to: "마케팅", value: 24 },
      { from: "개발", to: "데이터", value: 16 },
      { from: "기획", to: "마케팅", value: 14 },
    ],
  })

  for (const label of ["디자인", "개발", "기획", "마케팅", "데이터"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(tags(svg, "path").length, 13)
  assert.equal(filled(svg, "path", ACCENT).length, 5)
})

test("트리는 부모 아래에 자식을 놓고 연결선에 값을 적는다", () => {
  const svg = modern({
    type: "tree",
    unit: "%",
    links: [
      { from: "지주", to: "은행", value: 100 },
      { from: "지주", to: "증권", value: 60 },
      { from: "증권", to: "자산운용", value: 51 },
    ],
  })

  for (const label of ["100%", "60%", "51%"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(at(svg, "지주").y < at(svg, "은행").y, true)
  assert.equal(at(svg, "은행").y, at(svg, "증권").y)
  assert.equal(at(svg, "증권").y < at(svg, "자산운용").y, true)
  assert.equal(at(svg, "은행").x < at(svg, "증권").x, true)
})

const quarters = {
  categories: ["1분기", "2분기", "3분기", "4분기"],
  series: [
    { name: "국내", values: [42, 48, 51, 55] },
    { name: "해외", values: [18, 24, 33, 41] },
  ],
}

const size = (tag: Record<string, string>, side: "width" | "height" | "x" | "y") => Number(tag[side])

test("막대는 시리즈가 하나면 가장 큰 막대만, 여럿이면 쌓아서 고른 시리즈만 강조색으로 칠한다", () => {
  const single = marks(modern({ type: "bar", categories: quarters.categories, series: [quarters.series[0]] }), "rect")
  assert.equal(single.length, 4)
  assert.deepEqual(single.map((tag) => tag.fill === ACCENT), [false, false, false, true])
  const svg = modern({ type: "bar", highlight: "해외", ...quarters })
  const accent = lit(svg, "rect")
  assert.equal(marks(svg, "rect").length, 8)
  assert.equal(accent.length, 4)
  assert.equal(Math.round((size(accent[3], "height") / size(accent[0], "height")) * 100), Math.round((41 / 18) * 100))
  // 쌓은 막대는 같은 범주의 두 시리즈가 같은 자리에 선다.
  assert.equal(new Set(marks(svg, "rect").map((tag) => tag.x)).size, 4)

  for (const label of ["국내", "해외", "1분기", "42", "41"]) assert.equal(texts(svg).includes(label), true, label)
})

test("막대는 묶음, 100%, 가로로 바꿔 그릴 수 있다", () => {
  const grouped = marks(modern({ type: "bar", variant: "grouped", ...quarters }), "rect")
  assert.equal(new Set(grouped.map((tag) => tag.x)).size, 8)
  const full = marks(modern({ type: "bar", variant: "percent", ...quarters }), "rect")
  const tall = (index: number) => size(full[index], "height") + size(full[index + 1], "height")
  assert.equal(Math.round(tall(0)), Math.round(tall(6)))
  const flat = marks(modern({ type: "bar", variant: "horizontal", ...quarters }), "rect")
  assert.equal(flat.every((tag) => size(tag, "width") > size(tag, "height")), true)
})

test("폭포는 합계 막대 사이에 증감을 이어 놓고 가장 큰 증감을 강조한다", () => {
  const svg = modern({
    type: "waterfall",
    steps: [
      { label: "9월", value: 3200, total: true },
      { label: "신규", value: 1100 },
      { label: "재구매", value: 450 },
      { label: "할인", value: -380 },
      { label: "환불", value: -270 },
      { label: "10월", value: 4100, total: true },
    ],
  })

  for (const label of ["3,200", "+1,100", "+450", "-380", "-270", "4,100", "증가", "감소"]) assert.equal(texts(svg).includes(label), true, label)
  const bars = marks(svg, "rect").filter((tag) => size(tag, "width") > 12)
  assert.equal(bars.length, 6)
  assert.equal(bars[1].fill, ACCENT)
  // 증가 막대의 위 끝에서 다음 막대가 시작한다.
  assert.equal(Math.round(size(bars[2], "y") + size(bars[2], "height")), Math.round(size(bars[1], "y")))
})

test("파레토는 큰 값부터 놓고 누적 비율이 기준선을 넘기 전까지만 강조한다", () => {
  const svg = modern({
    type: "pareto",
    items: [
      { label: "마라톤화", value: 25 },
      { label: "러닝화", value: 54 },
      { label: "운동화 추천", value: 7 },
      { label: "쿠션화", value: 4 },
      { label: "기타", value: 10 },
    ],
  })

  const bars = marks(svg, "rect").filter((tag) => size(tag, "width") > 12)
  assert.deepEqual(bars.map((tag) => tag.fill === ACCENT), [true, true, false, false, false])
  assert.equal(size(bars[0], "height") > size(bars[1], "height"), true)

  for (const label of ["1위", "5위", "79%", "80%", "비중", "누적"]) assert.equal(texts(svg).includes(label), true, label)
})

test("레이더는 첫 시리즈만 채우고 나머지는 선으로 그린다", () => {
  const spec = {
    type: "radar" as const,
    categories: ["속도", "안정성", "디자인", "가격", "지원", "기능"],
    series: [
      { name: "우리 앱", values: [86, 78, 92, 64, 70, 81] },
      { name: "업계 평균", values: [72, 74, 68, 71, 66, 75] },
    ],
  }

  const svg = modern(spec)
  assert.equal(filled(svg, "path", ACCENT).length, 1)
  assert.equal(tags(svg, "path").filter((tag) => tag.stroke && tag.stroke !== ACCENT && tag.fill === "none" && tag.d.endsWith("Z")).length >= 1, true)

  for (const label of [...spec.categories, "우리 앱", "업계 평균", "100"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(tags(modern({ ...spec, variant: "circular" }), "circle").filter((tag) => tag.fill === "none").length, 4)
})

test("기울기 차트는 가장 많이 오른 항목을 강조하고 양쪽에 이름과 값을 적는다", () => {
  const svg = modern({
    type: "slope",
    unit: "%",
    categories: ["2024", "2025"],
    series: [
      { name: "A사", values: [31, 28] },
      { name: "우리 브랜드", values: [18, 27] },
      { name: "B사", values: [24, 21] },
    ],
  })

  for (const label of ["2024", "2025", "우리 브랜드 18%", "27% 우리 브랜드", "A사 31%", "28% A사"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(tags(svg, "line").filter((tag) => tag.stroke === ACCENT).length, 1)
  assert.equal(at(svg, "A사 31%").y < at(svg, "우리 브랜드 18%").y, true)
})

test("덤벨은 변화가 가장 큰 항목을 강조하고 뒤 값이 큰 순서로 놓는다", () => {
  const svg = modern({
    type: "dumbbell",
    categories: ["2024", "2025"],
    series: [
      { name: "부산", values: [2.1, 2.6] },
      { name: "서울", values: [3.2, 4.6] },
      { name: "경기", values: [2.8, 3.9] },
    ],
  })

  assert.equal(at(svg, "서울").y < at(svg, "경기").y && at(svg, "경기").y < at(svg, "부산").y, true)
  assert.equal(tags(svg, "line").filter((tag) => tag.stroke === ACCENT).length, 1)
  assert.equal(filled(svg, "circle", ACCENT).length, 1)

  for (const label of ["4.6", "3.9", "2.6", "2024", "2025"]) assert.equal(texts(svg).includes(label), true, label)
})

test("롤리팝은 큰 값부터 놓고 가장 큰 항목을 강조한다", () => {
  const items = [
    { label: "리뷰", value: 48 },
    { label: "검색", value: 82 },
    { label: "장바구니", value: 74 },
  ]

  const svg = modern({ type: "lollipop", items })
  assert.equal(at(svg, "검색").y < at(svg, "장바구니").y && at(svg, "장바구니").y < at(svg, "리뷰").y, true)
  assert.equal(filled(svg, "circle", ACCENT).length, 1)
  const upright = modern({ type: "lollipop", variant: "vertical", items })
  assert.equal(at(upright, "검색").x < at(upright, "장바구니").x, true)
  assert.equal(at(upright, "검색").y, at(upright, "리뷰").y)
})

test("콤보는 첫 시리즈를 막대로, 나머지를 오른쪽 축의 선으로 그린다", () => {
  const svg = modern({
    type: "combo",
    categories: ["2022", "2023", "2024", "2025E"],
    series: [
      { name: "매출액", values: [302, 259, 301, 336] },
      { name: "영업이익률", values: [14.3, 2.5, 10.9, 13.2] },
    ],
  })

  assert.equal(marks(svg, "rect").length, 4)
  assert.equal(tags(svg, "path").filter((tag) => tag.stroke === ACCENT).length, 1)

  for (const label of ["매출액", "영업이익률", "2025E", "13.2"]) assert.equal(texts(svg).includes(label), true, label)
})

test("양방향 막대는 0을 기준으로 양수와 음수를 반대쪽으로 그린다", () => {
  const svg = modern({
    type: "diverging",
    unit: "%",
    categories: ["반도체", "은행", "2차전지", "화학"],
    series: [{ name: "수익률", values: [12.4, 5.1, -8.7, -3.2] }],
  })

  const bars = marks(svg, "rect")
  const zero = size(bars[0], "x")
  assert.equal(bars.filter((tag) => tag.fill === ACCENT).length, 2)
  assert.equal(bars.filter((tag) => tag.fill !== ACCENT).every((tag) => Math.round(size(tag, "x") + size(tag, "width")) === Math.round(zero)), true)

  for (const label of ["+12.4%", "-8.7%", "반도체"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(at(svg, "반도체").y < at(svg, "2차전지").y, true)
})

test("나비 차트는 두 시리즈를 가운데 이름의 양쪽으로 그린다", () => {
  const svg = modern({
    type: "butterfly",
    categories: ["20대", "30대", "40대"],
    series: [
      { name: "매수", values: [12, 30, 24] },
      { name: "매도", values: [8, 22, 31] },
    ],
  })

  const bars = marks(svg, "rect")
  const mid = at(svg, "30대").x
  assert.equal(bars.length, 6)
  assert.equal(bars.filter((tag) => size(tag, "x") + size(tag, "width") < mid).length, 3)
  assert.equal(bars.filter((tag) => size(tag, "x") > mid).length, 3)

  for (const label of ["매수", "매도", "30", "31"]) assert.equal(texts(svg).includes(label), true, label)
})

test("토네이도는 기준값에서 양쪽으로 뻗은 폭이 큰 변수부터 놓는다", () => {
  const svg = modern({
    type: "tornado",
    target: 85000,
    caption: "목표주가",
    categories: ["WACC ±1%p", "영구성장률 ±0.5%p", "ASP ±5%"],
    series: [
      { name: "하락", values: [79000, 81000, 70000] },
      { name: "상승", values: [92000, 90000, 99000] },
    ],
  })

  assert.equal(at(svg, "ASP ±5%").y < at(svg, "WACC ±1%p").y && at(svg, "WACC ±1%p").y < at(svg, "영구성장률 ±0.5%p").y, true)
  assert.equal(lit(svg, "rect").length, 3)

  for (const label of ["70,000", "99,000", "목표주가 85,000"]) assert.equal(texts(svg).includes(label), true, label)
})

test("범위 막대는 낮은 값에서 높은 값까지 띠를 그리고 현재 값을 점으로 찍는다", () => {
  const svg = modern({
    type: "rangeBar",
    target: 78000,
    caption: "현재가",
    categories: ["DCF", "PER 밴드", "52주 범위"],
    series: [{ name: "적정가", values: [91000, 84000, 78000], low: [82000, 70000, 61000], high: [104000, 96000, 89000] }],
  })

  const bars = marks(svg, "rect")
  assert.equal(bars.length, 3)
  assert.equal(size(bars[0], "width") / size(bars[2], "width") > 0.75 && size(bars[0], "x") > size(bars[2], "x"), true)
  assert.equal(filled(svg, "circle", ACCENT).length, 3)

  for (const label of ["82,000", "104,000", "현재가 78,000", "DCF"]) assert.equal(texts(svg).includes(label), true, label)
})

const months = ["1월", "2월", "3월", "4월", "5월", "6월"]

const apps = [
  { name: "우리 앱", values: [42, 46, 50, 52, 57, 61], low: [40, 43, 46, 48, 52, 55], high: [44, 49, 54, 57, 62, 67] },
  { name: "경쟁 A", values: [55, 56, 56, 57, 58, 58] },
  { name: "경쟁 B", values: [38, 37, 37, 36, 35, 35] },
]

const stroked = (svg: string, color: string) => tags(svg, "path").filter((tag) => tag.stroke === color)

test("라인은 첫 시리즈만 강조색으로 그리고 오른쪽 끝에 이름을 적는다", () => {
  const svg = modern({ type: "line", categories: months, series: apps })
  assert.equal(stroked(svg, ACCENT).length, 1)
  assert.equal(tags(svg, "path").filter((tag) => tag.stroke && tag.stroke !== ACCENT).length, 2)
  // 강조한 선 아래에는 옅게 사라지는 면을 깐다.
  assert.equal(tags(svg, "path").filter((tag) => tag.fill?.startsWith("url(#")).length, 1)

  for (const label of ["우리 앱", "경쟁 A", "경쟁 B", "1월", "6월"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(at(svg, "경쟁 A").x > at(svg, "6월").x, true)
})

test("라인은 계단, 시리즈마다 색, 범위 띠, 예측으로 바꿔 그릴 수 있다", () => {
  const spec = { type: "line" as const, categories: months, series: apps }
  assert.match(stroked(modern({ ...spec, variant: "step" }), ACCENT)[0].d, /^M [\d.]+ [\d.]+( H [\d.]+ V [\d.]+)+$/)
  assert.equal(new Set(tags(modern({ ...spec, variant: "multi" }), "path").map((tag) => tag.stroke)).size, 3)
  assert.equal(tags(modern({ ...spec, variant: "band" }), "path").filter((tag) => tag.fill !== "none").length, 1)
  const forecast = stroked(modern({ ...spec, variant: "forecast", forecastFrom: 3 }), ACCENT)
  assert.deepEqual(forecast.map((tag) => Boolean(tag["stroke-dasharray"])), [false, true])
  assert.equal(texts(modern({ ...spec, variant: "forecast", forecastFrom: 3 })).includes("예측"), true)
})

const channels = {
  categories: months,
  series: [
    { name: "검색", values: [120, 131, 139, 139, 138, 144] },
    { name: "SNS", values: [70, 76, 74, 77, 89, 108] },
    { name: "직접", values: [80, 83, 86, 86, 84, 81] },
  ],
}

test("영역은 시리즈를 쌓고 고른 시리즈만 강조색으로 칠한다", () => {
  const svg = modern({ type: "area", highlight: "SNS", ...channels })
  const faces = tags(svg, "path").filter((tag) => tag.fill !== "none")
  assert.equal(faces.length, 3)
  assert.equal(faces.filter((tag) => tag.fill === ACCENT).length, 1)

  for (const label of ["검색", "SNS", "직접", "300"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(at(svg, "직접").y < at(svg, "SNS").y && at(svg, "SNS").y < at(svg, "검색").y, true)
  const full = modern({ type: "area", variant: "percent", ...channels })
  assert.equal(texts(full).includes("100") && !texts(full).includes("300"), true)
})

test("스트림은 축 없이 띠를 가운데로 모아 쌓고 띠 안에 이름을 적는다", () => {
  const svg = modern({ type: "stream", highlight: "SNS", ...channels })
  const faces = tags(svg, "path").filter((tag) => tag.fill !== "none")
  assert.equal(faces.length, 3)
  assert.equal(faces.filter((tag) => tag.fill === ACCENT).length, 1)

  for (const label of ["검색", "SNS", "직접"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(texts(svg).includes("300"), false)
})

test("스파크라인은 마지막 값을 글자로 적고 최고점과 최저점을 표시한다", () => {
  const series = [{ name: "매출", values: [1200, 1350, 1290, 1720, 1180, 1610] }]
  const svg = modern({ type: "sparkline", series })
  assert.equal(texts(svg).includes("1,610"), true)
  assert.equal(stroked(svg, ACCENT).length, 1)
  assert.equal(tags(svg, "circle").length, 3)
  assert.equal(tags(modern({ type: "sparkline", variant: "line", series }), "circle").length, 1)
  const bars = modern({ type: "sparkline", variant: "bar", series })
  assert.equal(marks(bars, "rect").length, 6)
  assert.equal(lit(bars, "rect").length, 1)
})

test("캘린더는 하루를 한 칸으로 그리고 값이 클수록 진하게 칠한다", () => {
  const dates = Array.from({ length: 59 }, (_, index) => new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10))
  const svg = modern({ type: "calendar", categories: dates, series: [{ name: "커밋", values: dates.map((_, index) => (index === 40 ? 9 : index % 4)) }] })
  const cells = marks(svg, "rect")
  assert.equal(cells.length, 59)
  assert.equal(cells.filter((tag) => tag.fill === ACCENT).length, 1)
  assert.equal(new Set(cells.map((tag) => tag.y)).size, 7)

  for (const label of ["1월", "2월", "월", "수", "금"]) assert.equal(texts(svg).includes(label), true, label)
})

test("범프는 가장 많이 오른 항목을 강조하고 오른쪽에 마지막 순위를 적는다", () => {
  const svg = modern({
    type: "bump",
    categories: ["1월", "2월", "3월", "4월"],
    series: [
      { name: "A앱", values: [1, 1, 2, 3] },
      { name: "우리 앱", values: [3, 3, 1, 1] },
      { name: "B앱", values: [2, 2, 3, 2] },
    ],
  })

  assert.equal(stroked(svg, ACCENT).length, 1)

  for (const label of ["#1 우리 앱", "#2 B앱", "#3 A앱", "A앱", "4월"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(at(svg, "#1 우리 앱").y < at(svg, "#2 B앱").y && at(svg, "#2 B앱").y < at(svg, "#3 A앱").y, true)
  assert.equal(at(svg, "A앱").y < at(svg, "우리 앱").y, true)
})

const candles = [
  { date: "2025-09-29", open: 100, high: 108, low: 98, close: 106, volume: 900 },
  { date: "2025-09-30", open: 106, high: 107, low: 99, close: 101, volume: 700 },
  { date: "2025-10-01", open: 101, high: 112, low: 100, close: 110, volume: 1200 },
  { date: "2025-10-02", open: 110, high: 116, low: 109, close: 115, volume: 1500 },
  { date: "2025-10-03", open: 115, high: 117, low: 111, close: 112, volume: 800 },
  { date: "2025-10-06", open: 112, high: 121, low: 112, close: 120, volume: 1700 },
]

test("캔들스틱은 오른 봉만 강조색으로 칠하고 마지막 종가와 이동평균선을 그린다", () => {
  const svg = modern({ type: "candlestick", candles })
  // 오른 봉 4개와 마지막 종가 이름표.
  assert.equal(lit(svg, "rect").length, 5)
  assert.equal(marks(svg, "rect").length, 13)
  // 봉이 20개가 안 되면 20일선은 그리지 않는다.
  assert.equal(tags(svg, "path").length, 1)
  assert.equal(texts(svg).includes("20일선"), false)

  for (const label of ["120", "10월", "상승", "하락", "5일선"]) assert.equal(texts(svg).includes(label), true, label)
  const plain = modern({ type: "candlestick", variant: "plain", candles })
  assert.equal(tags(plain, "path").length, 0)
  assert.equal(texts(plain).includes("5일선"), false)
})

test("스카이라인은 기간마다 블록을 쌓고 앞줄 시리즈를 같은 눈금으로 따로 세운다", () => {
  const svg = modern({
    type: "skyline",
    categories: ["2026-11-03", "2026-11-04", "2026-11-05"],
    series: [
      { name: "입력", values: [586400, 587529, 622545] },
      { name: "출력", values: [276507, 271133, 282345] },
      { name: "실패", values: [10262, 12856, 19059], front: true },
    ],
  })

  const blocks = marks(svg, "rect")
  assert.equal(lit(svg, "rect").length, 3)
  assert.equal(blocks.length, 10)

  for (const label of ["최고 90.5만", "11/5", "입력", "출력", "실패"]) assert.equal(texts(svg).includes(label), true, label)
})

const samples = [
  { name: "/login", values: [100, 110, 120, 130, 140, 400] },
  { name: "/pay", values: [280, 300, 320, 340, 360] },
  { name: "/cart", values: [140, 150, 150, 160, 170] },
]

const faces = (svg: string) => tags(svg, "path").filter((tag) => tag.fill !== "none")

test("상자 그림은 중앙값이 가장 높은 묶음을 강조하고 벗어난 값을 점으로 찍는다", () => {
  const svg = modern({ type: "box", series: samples })
  assert.equal(marks(svg, "rect").length, 3)
  assert.deepEqual(marks(svg, "rect").map((tag) => tag.fill === ACCENT), [false, true, false])
  // /login의 400만 수염 밖이다.
  assert.equal(tags(svg, "circle").length, 1)

  for (const label of ["/login", "/pay", "/cart"]) assert.equal(texts(svg).includes(label), true, label)
  const violin = modern({ type: "box", variant: "violin", series: samples })
  assert.equal(marks(violin, "rect").length, 0)
  assert.equal(faces(violin).length, 3)
  const both = modern({ type: "box", variant: "both", series: samples })
  assert.equal(marks(both, "rect").length === 3 && faces(both).length === 3, true)
})

test("비스웜은 관측값마다 점을 찍고 묶음마다 중앙값을 적는다", () => {
  const svg = modern({ type: "beeswarm", unit: "분", series: samples })
  assert.equal(tags(svg, "circle").length, 16)
  assert.equal(filled(svg, "circle", ACCENT).length, 5)

  for (const label of ["중앙값 125분", "중앙값 320분", "중앙값 150분"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(at(svg, "/login").y < at(svg, "/pay").y, true)
})

test("릿지라인은 묶음마다 분포 곡선을 겹쳐 쌓는다", () => {
  const svg = modern({ type: "ridgeline", series: samples })
  assert.equal(faces(svg).length, 3)
  assert.equal(filled(svg, "path", ACCENT).length, 1)
  assert.equal(at(svg, "/login").y < at(svg, "/pay").y && at(svg, "/pay").y < at(svg, "/cart").y, true)
})

test("히스토그램은 기준을 넘는 구간만 강조하고 분위 선에 값을 적는다", () => {
  const values = [...Array.from({ length: 90 }, (_, index) => 100 + (index % 30) * 5), ...Array.from({ length: 10 }, (_, index) => 500 + index * 40)]
  const spec = { type: "histogram" as const, unit: "ms", target: 400, caption: "목표", series: [{ name: "지연", values }] }
  const svg = modern(spec)
  const bars = marks(svg, "rect")
  assert.equal(bars.length >= 6, true)
  assert.equal(lit(svg, "rect").length >= 1 && lit(svg, "rect").every((tag) => size(tag, "x") > size(bars[0], "x")), true)
  // 막대 높이의 합에서 강조한 막대가 차지하는 몫이 기준을 넘은 표본의 몫과 같다.
  const tall = (list: Record<string, string>[]) => list.reduce((sum, tag) => sum + size(tag, "height"), 0)
  assert.equal(Math.round((tall(lit(svg, "rect")) / tall(bars)) * 100), 10)

  for (const label of ["p50 180ms", "목표 400ms", "목표 초과", "목표 안"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(texts(svg).some((label) => label.startsWith("p95 ")), true)
  assert.equal(marks(modern({ ...spec, variant: "step" }), "rect").length, 0)
  assert.equal(tags(modern({ ...spec, variant: "dots" }), "circle").length > 20, true)
  assert.equal(tags(modern({ ...spec, variant: "kde" }), "path").length, 1)
})

test("히트맵은 값이 클수록 진하게 칠하고 가장 큰 칸을 테두리로 표시한다", () => {
  const svg = modern({
    type: "heatmap",
    categories: ["9시", "12시", "18시"],
    series: [
      { name: "월", values: [13, 22, 26] },
      { name: "금", values: [14, 20, 44] },
    ],
  })

  const cells = marks(svg, "rect")
  assert.equal(cells.length, 6)
  assert.deepEqual(cells.map((tag) => tag.fill === ACCENT), [false, false, false, false, false, true])
  assert.equal(cells.filter((tag) => tag.stroke).length, 1)

  for (const label of ["월", "금", "9시", "18시", "44", "13"]) assert.equal(texts(svg).includes(label), true, label)

  const split = modern({
    type: "heatmap",
    variant: "diverging",
    categories: ["A", "B"],
    series: [
      { name: "A", values: [1, -0.4] },
      { name: "B", values: [-0.4, 1] },
    ],
  })

  assert.deepEqual(marks(split, "rect").map((tag) => tag.fill === ACCENT), [true, false, false, true])
  assert.equal(texts(split).includes("-0.4"), true)
})

const dots = [
  { x: 420, y: 680, size: 1800, label: "브랜드 검색", group: "검색" },
  { x: 780, y: 310, size: 4200, label: "일반 검색", group: "검색" },
  { x: 560, y: 520, size: 3600, label: "PMax 전체", group: "PMax" },
  { x: 340, y: 180, size: 2100, label: "유튜브 신규", group: "영상" },
]

test("버블은 크기가 가장 큰 점을 강조하고 축 이름을 적는다", () => {
  const svg = modern({ type: "bubble", xLabel: "CPC(원)", yLabel: "ROAS(%)", points: dots })
  const circles = tags(svg, "circle")
  assert.equal(circles.length, 4)
  assert.deepEqual(circles.map((tag) => tag.fill === ACCENT).filter(Boolean).length, 1)
  assert.equal(Number(circles.find((tag) => tag.fill === ACCENT)?.r) === Math.max(...circles.map((tag) => Number(tag.r))), true)

  for (const label of ["CPC(원)", "ROAS(%)", "일반 검색"]) assert.equal(texts(svg).includes(label), true, label)
})

test("산점도는 묶음마다 색을 나누고 추세선과 기준선을 그릴 수 있다", () => {
  const svg = modern({ type: "scatter", highlight: "검색", points: dots, guides: [{ value: 500, label: "목표 ROAS" }] })
  assert.equal(tags(svg, "circle").length, 4)
  assert.equal(filled(svg, "circle", ACCENT).length, 2)

  for (const label of ["검색", "PMax", "영상", "목표 ROAS"]) assert.equal(texts(svg).includes(label), true, label)
  const dashed = (text: string) => tags(text, "line").filter((tag) => tag["stroke-dasharray"]).length
  assert.equal(dashed(modern({ type: "scatter", variant: "fit", points: dots })) - dashed(modern({ type: "scatter", points: dots })), 1)
})

test("평행 좌표는 축마다 눈금을 따로 잡고 고른 줄만 강조한다", () => {
  const svg = modern({
    type: "parallel",
    highlight: "에어 13",
    categories: ["가격", "무게", "성능"],
    series: [
      { name: "프로 14", values: [299, 1.55, 91] },
      { name: "에어 13", values: [159, 1.24, 72] },
      { name: "베이직 14", values: [89, 1.45, 48] },
    ],
  })

  assert.equal(stroked(svg, ACCENT).length, 1)
  assert.equal(tags(svg, "path").length, 3)

  for (const label of ["가격", "무게", "성능", "에어 13", "299", "89", "1.24"]) assert.equal(texts(svg).includes(label), true, label)
})

test("게이지는 현재 값을 크게 적고 목표를 표시한다", () => {
  const spec = { type: "gauge" as const, unit: "%", caption: "목표 달성률", target: 85, items: [{ label: "달성률", value: 73 }] }
  const svg = modern(spec)

  for (const label of ["73%", "목표 달성률", "목표 85", "0", "100"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(tags(svg, "path").length, 2)
  assert.equal(stroked(svg, ACCENT).length, 1)

  for (const variant of ["semi", "ring"]) assert.equal(stroked(modern({ ...spec, variant }), ACCENT).length, 1, variant)
  const ticks = tags(modern({ ...spec, variant: "ticks" }), "line").filter((tag) => tag["stroke-linecap"] === "round")
  assert.equal(ticks.length, 40)
  assert.equal(ticks.filter((tag) => tag.stroke === ACCENT).length, 29)
})

test("불릿은 목표 대비 실적이 가장 낮은 항목을 강조한다", () => {
  const svg = modern({
    type: "bullet",
    bullets: [
      { label: "매출(억)", value: 27.4, target: 30, ranges: [18, 25, 34] },
      { label: "신규 고객(천)", value: 12.8, target: 15, ranges: [8, 12, 18] },
    ],
  })

  const accent = lit(svg, "rect")
  assert.equal(accent.length, 1)
  // 구간 띠 3개와 실적 막대 1개가 한 줄이다.
  assert.equal(marks(svg, "rect").length, 8)
  assert.equal(Math.abs(size(accent[0], "y") - at(svg, "신규 고객(천)").y) < 12, true)

  for (const label of ["27.4", "12.8", "매출(억)"]) assert.equal(texts(svg).includes(label), true, label)
})

test("방사형 막대는 항목마다 고리를 그리고 가장 큰 항목을 강조한다", () => {
  const items = [
    { label: "매출", value: 82 },
    { label: "재구매", value: 91 },
    { label: "NPS", value: 47 },
  ]

  const svg = modern({ type: "radialBar", unit: "%", items })
  assert.equal(tags(svg, "path").length, 6)
  assert.equal(stroked(svg, ACCENT).length, 1)

  for (const label of ["매출 82%", "재구매 91%", "NPS 47%"]) assert.equal(texts(svg).includes(label), true, label)

  for (const variant of ["half", "full"]) assert.equal(stroked(modern({ type: "radialBar", variant, items }), ACCENT).length, 1, variant)
})

test("지표 카드는 시리즈마다 마지막 값과 처음 대비 등락을 적는다", () => {
  const series = [
    { name: "KOSPI", values: [2500, 2560, 2610, 2710] },
    { name: "원/달러", values: [1390, 1380, 1372, 1362.2] },
  ]

  const svg = modern({ type: "stat", series })

  for (const label of ["KOSPI", "2,710", "▲ 8.4%", "원/달러", "1,362.2", "▼ 2.0%"]) assert.equal(texts(svg).includes(label), true, label)
  assert.equal(tags(svg, "path").filter((tag) => tag.stroke).length, 2)
  assert.equal(at(svg, "KOSPI").y, at(svg, "원/달러").y)
  const rows = modern({ type: "stat", variant: "rows", series })
  assert.equal(at(rows, "KOSPI").y < at(rows, "원/달러").y, true)
  assert.equal(at(rows, "KOSPI").x, at(rows, "원/달러").x)
})
