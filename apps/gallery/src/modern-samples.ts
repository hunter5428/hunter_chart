import type { ModernSpec } from "hunter-charts"

type Sample = Omit<ModernSpec, "kind">

// 같은 자료를 다른 꼴로 한 번 더 보여 준다.
function variant(base: Sample, name: string, change: Partial<Sample>): Sample {
  return { ...base, title: `${base.title} · ${name}`, takeaway: undefined, ...change }
}

const pie: Sample = {
  type: "pie",
  title: "파이 차트",
  subtitle: "기기별 매출 비중",
  takeaway: "2~4개 항목만",
  highlight: "모바일",
  items: [
    { label: "모바일", value: 72 },
    { label: "PC", value: 23 },
    { label: "태블릿", value: 5 },
  ],
}

const donut: Sample = {
  type: "donut",
  title: "도넛 차트",
  subtitle: "전환 유형별 비중",
  takeaway: "가운데에 총합",
  caption: "전환(건)",
  items: [
    { label: "구매", value: 719 },
    { label: "회원가입", value: 260 },
    { label: "문의", value: 161 },
    { label: "전화", value: 100 },
  ],
}

const waffle: Sample = {
  type: "waffle",
  title: "와플 차트",
  subtitle: "고객 100명 중",
  takeaway: "100칸으로 보는 비율",
  caption: "신규 고객",
  unit: "명",
  items: [
    { label: "신규", value: 38 },
    { label: "재구매", value: 62 },
  ],
}

const marimekko: Sample = {
  type: "marimekko",
  title: "마리메코 차트",
  subtitle: "채널 매출, 기기 구성(%)",
  takeaway: "폭과 높이로 두 비율",
  categories: ["검색", "PMax", "SNS"],
  series: [
    { name: "모바일", values: [26.1, 25.9, 17.6] },
    { name: "PC", values: [16.2, 7.7, 1.8] },
    { name: "태블릿", values: [2.7, 1.4, 0.6] },
  ],
}

const segmented: Sample = {
  type: "segmented",
  title: "비율 막대",
  subtitle: "결제 수단별 거래액(억 원)",
  takeaway: "간편결제가 셋 중 하나",
  unit: "억",
  highlight: "간편결제",
  items: [
    { label: "카드", value: 412 },
    { label: "간편결제", value: 278 },
    { label: "계좌이체", value: 134 },
    { label: "휴대폰", value: 45 },
    { label: "기타", value: 27 },
  ],
}

const treemap: Sample = {
  type: "treemap",
  title: "트리맵",
  subtitle: "카테고리별 상품 매출 비중",
  takeaway: "계층의 비율",
  items: [
    { group: "러닝화", label: "쿠셔닝 런", value: 22 },
    { group: "러닝화", label: "레이스 엑스", value: 14 },
    { group: "러닝화", label: "데일리 런", value: 10 },
    { group: "아웃도어", label: "트레일", value: 14 },
    { group: "아웃도어", label: "등산화", value: 10 },
    { group: "의류", label: "재킷", value: 11 },
    { group: "의류", label: "티셔츠", value: 7 },
    { group: "용품", label: "양말", value: 7 },
    { group: "용품", label: "깔창", value: 5 },
  ],
}

const sunburst: Sample = {
  type: "sunburst",
  title: "선버스트",
  subtitle: "채널별, 캠페인별 광고비 비중",
  takeaway: "원형으로 그린 계층",
  highlight: "전체 상품",
  items: [
    { group: "검색", label: "브랜드", value: 18 },
    { group: "검색", label: "일반", value: 30 },
    { group: "PMax", label: "전체 상품", value: 25 },
    { group: "PMax", label: "베스트", value: 12 },
    { group: "유튜브", label: "리마케팅", value: 9 },
    { group: "유튜브", label: "신규", value: 6 },
  ],
}

const funnel: Sample = {
  type: "funnel",
  title: "퍼널 차트",
  subtitle: "단계별 사용자(명)",
  takeaway: "단계별 이탈",
  unit: "명",
  items: [
    { label: "방문", value: 10000 },
    { label: "상품 조회", value: 6200 },
    { label: "장바구니", value: 1900 },
    { label: "구매", value: 760 },
  ],
}

const sankey: Sample = {
  type: "sankey",
  title: "생키 다이어그램",
  subtitle: "유입에서 구매까지(명)",
  takeaway: "상품 상세에서 절반이 떠나요",
  unit: "명",
  highlight: "구매",
  // 두 번째 "이탈 "은 끝에 빈칸이 있다. 장바구니 뒤 이탈을 다른 마디로 그리기 위해서다.
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
}

const chord: Sample = {
  type: "chord",
  title: "코드 다이어그램",
  subtitle: "팀 사이 협업 요청(건)",
  takeaway: "기획이 허브예요",
  unit: "건",
  highlight: "기획",
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
}

const tree: Sample = {
  type: "tree",
  title: "지배구조도",
  subtitle: "금융지주 계열사 지분율(%)",
  takeaway: "지주가 핵심 계열사를 100% 보유",
  unit: "%",
  links: [
    { from: "금융지주", to: "은행", value: 100 },
    { from: "금융지주", to: "증권", value: 100 },
    { from: "금융지주", to: "카드", value: 100 },
    { from: "금융지주", to: "캐피탈", value: 86.9 },
    { from: "은행", to: "해외법인", value: 67 },
    { from: "증권", to: "자산운용", value: 51 },
    { from: "증권", to: "벤처투자", value: 100 },
  ],
}

const bar: Sample = {
  type: "bar",
  title: "막대 차트",
  subtitle: "분기별 매출(억 원)",
  takeaway: "해외 비중이 매 분기 커져요",
  unit: "억",
  highlight: "해외",
  categories: ["1분기", "2분기", "3분기", "4분기"],
  series: [
    { name: "국내", values: [42, 48, 51, 55] },
    { name: "해외", values: [18, 24, 33, 41] },
  ],
}

const waterfall: Sample = {
  type: "waterfall",
  title: "폭포 차트",
  subtitle: "9~10월 매출 변화(만 원)",
  takeaway: "증감 요인 분해",
  steps: [
    { label: "9월", value: 3200, total: true },
    { label: "신규", value: 1100 },
    { label: "재구매", value: 450 },
    { label: "할인", value: -380 },
    { label: "환불", value: -270 },
    { label: "10월", value: 4100, total: true },
  ],
}

const pareto: Sample = {
  type: "pareto",
  title: "파레토 차트",
  subtitle: "키워드별 광고비 비중(%)",
  takeaway: "상위 20%가 80%?",
  unit: "%",
  items: [
    { label: "러닝화", value: 54 },
    { label: "마라톤화", value: 25 },
    { label: "운동화 추천", value: 7 },
    { label: "쿠션화", value: 4 },
    { label: "트레일화", value: 3 },
    { label: "경량화", value: 2.5 },
    { label: "러닝 양말", value: 2 },
    { label: "깔창", value: 1.2 },
    { label: "러닝 벨트", value: 0.8 },
    { label: "아대", value: 0.5 },
  ],
}

const radar: Sample = {
  type: "radar",
  title: "레이더 차트",
  subtitle: "제품 평가(100점 만점)",
  takeaway: "디자인은 앞서고 가격은 뒤져요",
  max: 100,
  categories: ["속도", "안정성", "디자인", "가격", "지원", "기능"],
  series: [
    { name: "우리 앱", values: [86, 78, 92, 64, 70, 81] },
    { name: "업계 평균", values: [72, 74, 68, 71, 66, 75] },
  ],
}

const slope: Sample = {
  type: "slope",
  title: "기울기 차트",
  subtitle: "브랜드 점유율(%)",
  takeaway: "우리만 크게 올랐어요",
  unit: "%",
  categories: ["2024", "2025"],
  series: [
    { name: "우리 브랜드", values: [18, 27] },
    { name: "A사", values: [31, 28] },
    { name: "B사", values: [24, 21] },
    { name: "C사", values: [15, 14] },
    { name: "D사", values: [12, 10] },
  ],
}

const dumbbell: Sample = {
  type: "dumbbell",
  title: "덤벨 차트",
  subtitle: "지역별 구매 전환율(%)",
  takeaway: "서울이 가장 크게 올랐어요",
  unit: "%",
  categories: ["2024", "2025"],
  series: [
    { name: "서울", values: [3.2, 4.6] },
    { name: "경기", values: [2.8, 3.9] },
    { name: "부산", values: [2.1, 2.6] },
    { name: "대구", values: [1.9, 2.2] },
    { name: "인천", values: [2.3, 3.1] },
    { name: "광주", values: [1.6, 1.8] },
    { name: "대전", values: [1.7, 2.4] },
  ],
}

const lollipop: Sample = {
  type: "lollipop",
  title: "롤리팝 차트",
  subtitle: "기능별 주간 사용률(%)",
  takeaway: "검색이 압도적이에요",
  unit: "%",
  items: [
    { label: "검색", value: 82 },
    { label: "장바구니", value: 74 },
    { label: "찜하기", value: 61 },
    { label: "리뷰", value: 48 },
    { label: "쿠폰함", value: 39 },
    { label: "선물하기", value: 22 },
    { label: "라이브", value: 14 },
  ],
}

const combo: Sample = {
  type: "combo",
  title: "콤보 차트",
  subtitle: "매출액(조 원)과 영업이익률(%)",
  takeaway: "이익률이 2023년 바닥에서 회복",
  categories: ["2021", "2022", "2023", "2024", "2025E", "2026E"],
  series: [
    { name: "매출액", values: [279.6, 302.2, 258.9, 300.9, 336.4, 358.1] },
    { name: "영업이익률", values: [18.5, 14.3, 2.5, 10.9, 13.2, 15.1] },
  ],
}

const diverging: Sample = {
  type: "diverging",
  title: "양방향 막대",
  subtitle: "업종별 월간 수익률(%)",
  takeaway: "반도체와 조선이 지수를 끌었어요",
  unit: "%",
  categories: ["반도체", "조선", "은행", "자동차", "인터넷", "화학", "2차전지", "건설"],
  series: [{ name: "수익률", values: [12.4, 9.8, 5.1, 2.3, -1.9, -3.2, -8.7, -4.4] }],
}

const butterfly: Sample = {
  type: "butterfly",
  title: "나비 차트",
  subtitle: "투자자별 순매수 상위 업종(천억 원)",
  takeaway: "외국인과 기관이 반도체에서 엇갈려요",
  categories: ["반도체", "자동차", "은행", "조선", "바이오", "인터넷"],
  series: [
    { name: "기관", values: [8.2, 6.1, 5.4, 3.9, 2.8, 1.6] },
    { name: "외국인", values: [21.5, 4.2, 7.7, 6.3, 1.1, 3.4] },
  ],
}

const tornado: Sample = {
  type: "tornado",
  title: "토네이도 차트",
  subtitle: "가정 변화에 따른 목표주가(원)",
  takeaway: "판매단가 가정이 목표주가를 가장 크게 흔들어요",
  target: 85000,
  caption: "목표주가",
  categories: ["WACC ±1%p", "영구성장률 ±0.5%p", "판매단가 ±5%", "환율 ±50원", "출하량 ±5%"],
  series: [
    { name: "불리한 가정", values: [77000, 81000, 70000, 80500, 76000] },
    { name: "유리한 가정", values: [95000, 90000, 99000, 89500, 94000] },
  ],
}

const rangeBar: Sample = {
  type: "rangeBar",
  title: "범위 막대",
  subtitle: "평가 방법별 적정주가 범위(원)",
  takeaway: "현재가는 모든 방법의 하단 근처예요",
  target: 78000,
  caption: "현재가",
  categories: ["DCF", "PER 밴드", "PBR 밴드", "EV/EBITDA", "52주 범위"],
  series: [{ name: "적정가", values: [93000, 86000, 88000, 90000, null], low: [82000, 70000, 74000, 77000, 61000], high: [104000, 98000, 101000, 102000, 89000] }],
}

const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]
const round1 = (value: number) => Math.round(value * 10) / 10

// 예시 자료가 그릴 때마다 같도록 씨앗이 정해진 난수를 쓴다.
function seeded(seed: number) {
  let s = seed >>> 0

  return () => {
    s = (s * 1664525 + 1013904223) >>> 0

    return s / 4294967296
  }
}

function gauss(rnd: () => number) {
  const u = Math.max(1e-9, rnd())
  const v = rnd()

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const line: Sample = {
  type: "line",
  title: "라인 차트",
  subtitle: "월간 활성 사용자(만 명)",
  takeaway: "우리 앱만 꾸준히 올라요",
  unit: "만",
  categories: MONTHS,
  series: [
    {
      name: "우리 앱",
      values: MONTHS.map((_, i) => round1(42 + i * 3.1 + Math.sin(i * 0.9) * 2.2)),
      low: MONTHS.map((_, i) => round1(39.4 + i * 2.9)),
      high: MONTHS.map((_, i) => round1(44.6 + i * 3.3)),
    },
    { name: "경쟁 A", values: MONTHS.map((_, i) => round1(55 + i * 0.9 + Math.cos(i * 0.7) * 1.8)) },
    { name: "경쟁 B", values: MONTHS.map((_, i) => round1(38 - i * 0.6 + Math.sin(i * 1.3) * 1.5)) },
  ],
}

const area: Sample = {
  type: "area",
  title: "영역 차트",
  subtitle: "채널별 월 유입(천 명)",
  takeaway: "SNS 몫이 가장 빨리 커져요",
  unit: "천",
  highlight: "SNS",
  categories: MONTHS,
  series: [
    { name: "검색", values: MONTHS.map((_, i) => Math.round(120 + i * 6 + Math.sin(i) * 8)) },
    { name: "SNS", values: MONTHS.map((_, i) => Math.round(60 + i * 9 + Math.cos(i * 0.8) * 10)) },
    { name: "직접", values: MONTHS.map((_, i) => Math.round(80 + Math.sin(i * 0.6) * 6)) },
    { name: "추천", values: MONTHS.map((_, i) => Math.round(30 + i * 2)) },
  ],
}

const WEEKS = Array.from({ length: 20 }, (_, w) => `${w + 1}주`)

const stream: Sample = {
  type: "stream",
  title: "스트림그래프",
  subtitle: "주별 장르 시청 시간(만 시간)",
  takeaway: "예능이 여름을 지배했어요",
  unit: "만",
  highlight: "예능",
  categories: WEEKS,
  series: ["드라마", "예능", "다큐", "애니", "스포츠", "영화"].map((name, gi) => ({
    name,
    values: WEEKS.map((_, w) => round1(6 + [38, 30, 14, 20, 26, 22][gi] * Math.exp(-((w - [4, 9, 14, 6, 17, 11][gi]) ** 2) / (2 * (3 + gi) ** 2)) + ((w * (gi + 3)) % 4))),
  })),
}

const JUNE = Array.from({ length: 30 }, (_, i) => `6월 ${i + 1}일`)

const sparkline: Sample = {
  type: "sparkline",
  title: "스파크라인",
  subtitle: "6월 일 매출(만 원)",
  takeaway: "주말마다 튀어요",
  unit: "만",
  height: 260,
  categories: JUNE,
  series: [{ name: "매출", values: JUNE.map((_, i) => Math.round(1200 + i * 18 + Math.sin(i * 0.8) * 120 + (i % 7 === 5 ? 160 : 0))) }],
}

const calendar: Sample = (() => {
  const rnd = seeded(3)
  const start = new Date(2025, 0, 1)

  const days = Array.from({ length: 365 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const weekend = date.getDay() === 0 || date.getDay() === 6
    const season = 1 + 0.5 * Math.sin((i / 365) * Math.PI * 2 - 1)
    const burst = rnd() < 0.05 ? 8 : 0

    return { date: isoDate(date), value: Math.max(0, Math.round((weekend ? 0.6 : 4.2) * season + gauss(rnd) * 1.6 + burst)) }
  })

  return {
    type: "calendar",
    title: "캘린더 히트맵",
    subtitle: "2025년 하루 커밋 수",
    takeaway: "주말은 조용해요",
    unit: "회",
    height: 250,
    categories: days.map((day) => day.date),
    series: [{ name: "커밋", values: days.map((day) => day.value) }],
  }
})()

const bump: Sample = {
  type: "bump",
  title: "범프 차트",
  subtitle: "월별 앱스토어 순위",
  takeaway: "5위에서 1위까지",
  categories: MONTHS.slice(0, 7),
  series: [
    { name: "우리 앱", values: [5, 4, 4, 3, 2, 2, 1] },
    { name: "A앱", values: [1, 1, 2, 2, 3, 3, 3] },
    { name: "B앱", values: [2, 3, 1, 1, 1, 1, 2] },
    { name: "C앱", values: [3, 2, 3, 4, 4, 5, 5] },
    { name: "D앱", values: [4, 5, 6, 5, 5, 4, 4] },
    { name: "E앱", values: [6, 6, 5, 6, 6, 6, 6] },
  ],
}

const candlestick: Sample = (() => {
  const rnd = seeded(23)
  const candles: NonNullable<Sample["candles"]>[number][] = []
  const day = new Date(2025, 8, 1)
  let close = 61200

  while (candles.length < 60) {
    if (day.getDay() !== 0 && day.getDay() !== 6) {
      const k = candles.length
      // 초반 조정, 중반 반등, 후반 상승 추세
      const drift = k < 18 ? -0.004 : k < 34 ? 0.003 : 0.0065
      const open = Math.round((close * (1 + gauss(rnd) * 0.006)) / 100) * 100
      const next = Math.round((open * (1 + drift + gauss(rnd) * 0.014)) / 100) * 100
      const high = Math.round((Math.max(open, next) * (1 + Math.abs(gauss(rnd)) * 0.007)) / 100) * 100
      const low = Math.round((Math.min(open, next) * (1 - Math.abs(gauss(rnd)) * 0.007)) / 100) * 100
      const volume = Math.round((900 + Math.abs(next - open) / 20 + rnd() * 600) * 1000)
      candles.push({ date: isoDate(day), open, high, low, close: next, volume })
      close = next
    }

    day.setDate(day.getDate() + 1)
  }

  return { type: "candlestick", title: "캔들스틱 차트", subtitle: "가상 종목 일봉(원)", takeaway: "10월 중순부터 고점을 높여요", unit: "원", candles }
})()

const skylineRows = [
  ["2026-10-23", 410000, 317223, 186999, 79534, 11000, 10000],
  ["2026-10-24", 446030, 337921, 202044, 87942, 15314, 9190],
  ["2026-10-25", 440886, 336150, 202507, 87489, 15398, 6051],
  ["2026-10-26", 472300, 370227, 221753, 92899, 13276, 4626],
  ["2026-10-27", 456358, 366468, 216506, 88261, 9041, 5714],
  ["2026-10-28", 482495, 386711, 226337, 92466, 8633, 9460],
  ["2026-10-29", 519595, 405554, 238274, 100345, 12610, 12608],
  ["2026-10-30", 509048, 387050, 230518, 99954, 16653, 11318],
  ["2026-10-31", 545022, 413595, 248950, 108123, 90000, 126000],
  ["2026-11-01", 566932, 440538, 264628, 111944, 17316, 5841],
  ["2026-11-02", 550201, 439688, 260808, 106914, 12001, 6097],
  ["2026-11-03", 586400, 471716, 276507, 112488, 10262, 10281],
  ["2026-11-04", 587529, 462627, 271133, 113044, 12856, 13840],
  ["2026-11-05", 622545, 476047, 282345, 121668, 19059, 14613],
] as const

const skyline: Sample = {
  type: "skyline",
  title: "스카이라인",
  subtitle: "일별 토큰(최근 14일)",
  takeaway: "11월 5일이 가장 많았어요",
  categories: skylineRows.map((row) => row[0]),
  series: ["입력", "캐시", "출력", "추론", "실패", "재시도"].map((name, index) => ({
    name,
    values: skylineRows.map((row) => {
      const [, ...counts] = row

      return counts[index]
    }),
    front: index >= 4,
  })),
}

// 평균과 표준편차로 만든 가상의 관측값.
function observations(seed: number, groups: readonly { name: string; mu: number; sd: number; n: number }[], floor: number, spike = 0) {
  const rnd = seeded(seed)

  return groups.map((group) => ({ name: group.name, values: Array.from({ length: group.n }, (_, i) => Math.max(floor, round1(group.mu + gauss(rnd) * group.sd + (spike && i % 37 === 0 ? group.sd * spike : 0)))) }))
}

const box: Sample = {
  type: "box",
  title: "상자 그림",
  subtitle: "API별 응답 시간(ms)",
  takeaway: "결제 API가 가장 느려요",
  unit: "ms",
  series: observations(
    5,
    [
      { name: "/login", mu: 120, sd: 30, n: 80 },
      { name: "/search", mu: 210, sd: 60, n: 80 },
      { name: "/cart", mu: 150, sd: 35, n: 80 },
      { name: "/pay", mu: 320, sd: 80, n: 80 },
      { name: "/feed", mu: 180, sd: 45, n: 80 },
    ],
    30,
    3.2,
  ),
}

const beeswarm: Sample = {
  type: "beeswarm",
  title: "비스웜",
  subtitle: "플랜별 하루 사용 시간(분)",
  takeaway: "프로 플랜은 퍼짐도 커요",
  unit: "분",
  series: observations(
    7,
    [
      { name: "무료", mu: 9, sd: 4, n: 70 },
      { name: "베이직", mu: 17, sd: 5, n: 55 },
      { name: "프로", mu: 26, sd: 6, n: 40 },
    ],
    1,
  ),
}

const ridgeline: Sample = {
  type: "ridgeline",
  title: "릿지라인",
  subtitle: "지역별 배송 소요 시간",
  takeaway: "제주만 꼬리가 길어요",
  unit: "시간",
  series: observations(
    11,
    [
      { name: "서울", mu: 18, sd: 5, n: 120 },
      { name: "경기", mu: 22, sd: 6, n: 120 },
      { name: "강원", mu: 34, sd: 9, n: 120 },
      { name: "충청", mu: 28, sd: 7, n: 120 },
      { name: "전라", mu: 31, sd: 8, n: 120 },
      { name: "경상", mu: 29, sd: 7, n: 120 },
      { name: "제주", mu: 46, sd: 11, n: 120 },
    ],
    2,
  ),
}

const histogram: Sample = (() => {
  const rnd = seeded(17)
  // 대부분 170ms 언저리이고, 25건마다 하나씩 캐시를 놓친 느린 요청이 꼬리를 만든다.
  const values = Array.from({ length: 320 }, (_, i) => Math.round(i % 25 === 0 ? 650 + rnd() * 800 : Math.exp(Math.log(170) + gauss(rnd) * 0.42)))

  return { type: "histogram", title: "히스토그램", subtitle: "API 요청 지연 시간(ms)", takeaway: "16건 중 1건이 목표를 넘어요", unit: "ms", target: 400, caption: "목표", series: [{ name: "지연", values }] }
})()

const HOURS = ["0시", "3시", "6시", "9시", "12시", "15시", "18시", "21시"]

const heatmap: Sample = {
  type: "heatmap",
  title: "히트맵",
  subtitle: "요일 × 시간대 주문 수",
  takeaway: "금요일 밤이 가장 붐벼요",
  unit: "건",
  categories: HOURS,
  series: ["월", "화", "수", "목", "금", "토", "일"].map((name, di) => ({
    name,
    values: HOURS.map((_, hi) => Math.round([2, 1, 3, 14, 22, 18, 26, 31][hi] * (di >= 5 ? (hi >= 4 ? 1.35 : 0.8) : 1) * (di === 4 && hi >= 6 ? 1.3 : 1) * (0.9 + ((di * 7 + hi * 3) % 5) * 0.06))),
  })),
}

const SECTORS = ["반도체", "자동차", "은행", "바이오", "인터넷", "조선"]

const correlation: Sample = {
  type: "heatmap",
  variant: "diverging",
  title: "상관관계 히트맵",
  subtitle: "업종 지수 일간 수익률 상관계수",
  takeaway: "은행은 성장주와 반대로 움직여요",
  digits: 2,
  categories: SECTORS,
  series: [
    [1, 0.42, -0.18, 0.21, 0.63, 0.35],
    [0.42, 1, 0.24, 0.05, 0.31, 0.48],
    [-0.18, 0.24, 1, -0.32, -0.41, 0.12],
    [0.21, 0.05, -0.32, 1, 0.44, -0.08],
    [0.63, 0.31, -0.41, 0.44, 1, 0.14],
    [0.35, 0.48, 0.12, -0.08, 0.14, 1],
  ].map((values, index) => ({ name: SECTORS[index], values })),
}

const bubble: Sample = {
  type: "bubble",
  title: "버블 차트",
  subtitle: "캠페인별 CPC, ROAS, 광고비",
  takeaway: "큰 원이 효율도 좋을까요?",
  xLabel: "CPC(원)",
  yLabel: "ROAS(%)",
  points: [
    { label: "브랜드 검색", x: 420, y: 680, size: 1800 },
    { label: "일반 검색", x: 780, y: 310, size: 4200 },
    { label: "PMax 전체", x: 560, y: 520, size: 3600 },
    { label: "PMax 베스트", x: 610, y: 430, size: 1500 },
    { label: "유튜브 신규", x: 340, y: 180, size: 2100 },
    { label: "리마케팅", x: 290, y: 610, size: 900 },
    { label: "인스타 피드", x: 470, y: 260, size: 2600 },
    { label: "인스타 릴스", x: 390, y: 340, size: 1700 },
    { label: "카카오 비즈", x: 520, y: 240, size: 1200 },
    { label: "네이버 쇼핑", x: 690, y: 470, size: 2900 },
  ],
}

const scatter: Sample = (() => {
  const rnd = seeded(29)

  const models = [
    { group: "대형", cost: [5, 14], base: 1400, perCent: 150, sd: 260 },
    { group: "중형", cost: [2, 7], base: 650, perCent: 150, sd: 170 },
    { group: "소형", cost: [1, 3], base: 280, perCent: 130, sd: 90 },
  ]

  const points = Array.from({ length: 54 }, (_, i) => {
    const model = models[i % 3]
    const cost = round1(model.cost[0] + rnd() * (model.cost[1] - model.cost[0]))

    return { label: `요청 ${i + 1}`, group: model.group, x: cost, y: Math.max(120, Math.round((model.base + cost * model.perCent + gauss(rnd) * model.sd) / 10) * 10) }
  })

  return { type: "scatter", title: "산점도", subtitle: "모델별 요청 비용과 응답 시간", takeaway: "2초를 넘는 건 대형 모델뿐이에요", highlight: "대형", unit: "ms", xLabel: "비용(센트)", yLabel: "응답 시간(ms)", guides: [{ value: 2000, label: "2초" }], points }
})()

const parallel: Sample = {
  type: "parallel",
  title: "평행 좌표",
  subtitle: "노트북 모델 비교",
  takeaway: "에어 13은 가볍고 싸요",
  highlight: "에어 13",
  categories: ["가격(만 원)", "무게(kg)", "배터리(시간)", "성능", "화면(인치)"],
  series: [
    { name: "에어 13", values: [159, 1.24, 18, 72, 13.6] },
    { name: "프로 14", values: [299, 1.55, 17, 91, 14.2] },
    { name: "울트라 16", values: [389, 2.14, 14, 97, 16.2] },
    { name: "슬림 15", values: [189, 1.51, 15, 70, 15.3] },
    { name: "게이밍 17", values: [329, 2.8, 6, 95, 17.3] },
    { name: "베이직 14", values: [89, 1.45, 10, 48, 14] },
    { name: "투인원 13", values: [179, 1.29, 13, 66, 13.3] },
    { name: "크리에이터 16", values: [349, 1.98, 12, 93, 16] },
  ],
}

const gauge: Sample = {
  type: "gauge",
  title: "게이지",
  subtitle: "분기 매출 목표(%)",
  takeaway: "목표까지 12%p 남았어요",
  unit: "%",
  caption: "목표 달성률",
  target: 85,
  items: [{ label: "목표 달성률", value: 73 }],
}

const bullet: Sample = {
  type: "bullet",
  title: "불릿 차트",
  subtitle: "상반기 KPI(목표: 세로선)",
  takeaway: "신규 고객이 가장 뒤처져요",
  bullets: [
    { label: "매출(억)", value: 27.4, target: 30, ranges: [18, 25, 34] },
    { label: "영업이익(억)", value: 4.1, target: 3.6, ranges: [2, 3, 5] },
    { label: "신규 고객(천)", value: 12.8, target: 15, ranges: [8, 12, 18] },
    { label: "만족도(점)", value: 4.3, target: 4.5, ranges: [3.5, 4, 5] },
  ],
}

const radialBar: Sample = {
  type: "radialBar",
  title: "방사형 막대",
  subtitle: "분기 목표 달성률",
  takeaway: "재구매만 목표에 가까워요",
  unit: "%",
  items: [
    { label: "매출", value: 82 },
    { label: "신규 가입", value: 64 },
    { label: "재구매", value: 91 },
    { label: "NPS", value: 47 },
  ],
}

const stat: Sample = {
  type: "stat",
  title: "지표 카드",
  subtitle: "주요 시장 지표(최근 12주)",
  takeaway: "지수는 오르고 환율과 금리는 내렸어요",
  categories: Array.from({ length: 12 }, (_, i) => `${i + 1}주`),
  series: [
    { name: "KOSPI", values: [2512, 2538, 2521, 2566, 2590, 2574, 2611, 2640, 2625, 2668, 2702, 2731.4] },
    { name: "KOSDAQ", values: [812, 820, 815, 829, 841, 836, 848, 861, 855, 870, 882, 889.6] },
    { name: "원/달러", values: [1392, 1388, 1395, 1381, 1376, 1379, 1370, 1366, 1371, 1362, 1358, 1354.8] },
    { name: "국고 3년", values: [3.42, 3.4, 3.41, 3.37, 3.35, 3.36, 3.31, 3.29, 3.3, 3.26, 3.24, 3.21] },
  ],
}

const groups: [string, Sample[]][] = [
  [
    "비율",
    [
      pie,
      variant(pie, "조각에 값", { variant: "values" }),
      variant(pie, "조각에 이름", { variant: "names" }),
      variant(pie, "강조만 색", { variant: "emphasis" }),
      donut,
      variant(donut, "얇은 고리", { variant: "thin" }),
      waffle,
      variant(waffle, "촘촘한 격자", { variant: "fine" }),
      marimekko,
      segmented,
    ],
  ],
  ["계층", [treemap, sunburst, variant(sunburst, "가운데 없음", { variant: "solid" })]],
  ["흐름", [funnel, variant(funnel, "첫 단계 대비 비율", { variant: "from-first" }), sankey, chord]],
  [
    "비교",
    [
      bar,
      variant(bar, "묶은 막대", { variant: "grouped" }),
      variant(bar, "100% 막대", { variant: "percent" }),
      variant(bar, "가로 막대", { variant: "horizontal" }),
      waterfall,
      pareto,
      radar,
      variant(radar, "원형 격자", { variant: "circular" }),
      slope,
      dumbbell,
      lollipop,
      variant(lollipop, "세로", { variant: "vertical" }),
    ],
  ],
  [
    "추이",
    [
      line,
      variant(line, "계단", { variant: "step" }),
      variant(line, "계열마다 색", { variant: "multi" }),
      variant(line, "범위 띠", { variant: "band" }),
      variant(line, "목표 구간과 예측", { variant: "forecast", forecastFrom: 9, guides: [{ value: 70, label: "목표 70만" }] }),
      area,
      variant(area, "100% 쌓기", { variant: "percent" }),
      stream,
      sparkline,
      variant(sparkline, "막대", { variant: "bar" }),
      variant(sparkline, "선만", { variant: "line" }),
      calendar,
      bump,
      candlestick,
      variant(candlestick, "봉만", { variant: "plain" }),
      skyline,
    ],
  ],
  [
    "분포",
    [
      box,
      variant(box, "바이올린", { variant: "violin" }),
      variant(box, "상자와 바이올린", { variant: "both" }),
      beeswarm,
      ridgeline,
      histogram,
      variant(histogram, "점", { variant: "dots" }),
      variant(histogram, "윤곽", { variant: "step" }),
      variant(histogram, "밀도 곡선", { variant: "kde" }),
    ],
  ],
  ["관계", [heatmap, bubble, scatter, variant(scatter, "추세선", { variant: "fit" }), variant(scatter, "사분면", { guides: [{ value: 2000 }, { value: 5, axis: "x" }] }), parallel]],
  ["KPI", [gauge, variant(gauge, "반원", { variant: "semi" }), variant(gauge, "진행 고리", { variant: "ring" }), variant(gauge, "눈금", { variant: "ticks" }), bullet, radialBar, variant(radialBar, "반원", { variant: "half" }), variant(radialBar, "원", { variant: "full" })]],
  ["추가 시안", [combo, diverging, butterfly, tornado, rangeBar, tree, correlation, stat, variant(stat, "표", { variant: "rows" })]],
]

export const modernGroups = groups.map(([name, samples]) => ({ name, specs: samples.map((sample): ModernSpec => ({ kind: "modern", ...sample })) }))
