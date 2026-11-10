export type Tone = { ink: string; wash: string }

export type NegativeStyle = "minus" | "paren"

export type Theme = {
  name: string
  series: readonly Tone[]
  text: string
  muted: string
  axis: string
  emphasis: string
  forecast: string
  band: string
  bandRadius: number
  negative: NegativeStyle
  lineWidth: number
  font: string
}

export type ThemeInput = {
  name: string
  series: readonly Tone[]
  text?: string
  muted?: string
  axis?: string
  emphasis?: string
  forecast?: string
  band?: string
  bandRadius?: number
  negative?: NegativeStyle
  lineWidth?: number
  font?: string
}

const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif'
const HEX = /^#[0-9A-Fa-f]{6}$/

function hex(value: string, field: string): string {
  if (!HEX.test(value)) throw new Error(`${field} 색은 #RRGGBB 형식이어야 합니다: ${value}`)

  return value.toUpperCase()
}

export function defineTheme(input: ThemeInput): Theme {
  if (!input.name.trim()) throw new Error("테마 이름이 필요합니다.")

  if (input.series.length < 3) throw new Error("테마 색은 3개 이상이어야 합니다.")

  const series = input.series.map((tone, i) => ({
    ink: hex(tone.ink, `series[${i}].ink`),
    wash: hex(tone.wash, `series[${i}].wash`),
  }))

  return {
    name: input.name.trim(),
    series,
    text: hex(input.text ?? "#222222", "text"),
    muted: hex(input.muted ?? "#666666", "muted"),
    axis: hex(input.axis ?? "#7F7F7F", "axis"),
    emphasis: hex(input.emphasis ?? "#C00000", "emphasis"),
    forecast: hex(input.forecast ?? series[0].wash, "forecast"),
    band: hex(input.band ?? "#E6E7E8", "band"),
    bandRadius: input.bandRadius ?? 0,
    negative: input.negative ?? "minus",
    lineWidth: input.lineWidth ?? 1.75,
    font: input.font ?? FONT,
  }
}

export const limeGray = defineTheme({
  name: "lime-gray",
  series: [
    { ink: "#97D12E", wash: "#E4F5B8" },
    { ink: "#8A8E86", wash: "#D4D6D1" },
    { ink: "#1C2418", wash: "#6A7364" },
    { ink: "#C6E36A", wash: "#F4F9D8" },
    { ink: "#3E6E28", wash: "#D5E8C4" },
  ],
  forecast: "#F4F9D4",
  band: "#E8EDDE",
  bandRadius: 2,
  negative: "minus",
  lineWidth: 1.75,
  axis: "#7A7F74",
})

export const limeNavy = defineTheme({
  name: "lime-navy",
  series: [
    { ink: "#C6E534", wash: "#F1F9C4" },
    { ink: "#243E66", wash: "#D7E3F4" },
    { ink: "#A3AA96", wash: "#E6E8E1" },
    { ink: "#7EBF3A", wash: "#E1F3C4" },
    { ink: "#5C7A3A", wash: "#E2EBD4" },
  ],
  forecast: "#F6F9D8",
  band: "#E6E9E2",
  negative: "minus",
  lineWidth: 2,
  axis: "#243E66",
})

export const limeMono = defineTheme({
  name: "lime-mono",
  series: [
    { ink: "#78B82A", wash: "#D7F0A8" },
    { ink: "#C5E56A", wash: "#F4F9D6" },
    { ink: "#3F6B22", wash: "#D5E6C2" },
  ],
  forecast: "#F3F8DC",
  band: "#F1F4E8",
  negative: "minus",
  lineWidth: 1.5,
  axis: "#7A8A68",
})

export const limeGold = defineTheme({
  name: "lime-gold",
  series: [
    { ink: "#B4E23A", wash: "#EEF8C2" },
    { ink: "#E0C24A", wash: "#F8EEC0" },
    { ink: "#6A8F45", wash: "#E3EDD4" },
    { ink: "#2F4A28", wash: "#D3E4CC" },
  ],
  forecast: "#F8F6D4",
  band: "#EFEDE0",
  negative: "minus",
  lineWidth: 1.75,
  axis: "#8A8660",
})

export const orangeGray = defineTheme({
  name: "orange-gray",
  series: [
    { ink: "#F58220", wash: "#F0B26B" },
    { ink: "#84888B", wash: "#B5B7B9" },
    { ink: "#000000", wash: "#595959" },
    { ink: "#8DC8E8", wash: "#E8F4FA" },
    { ink: "#002F6C", wash: "#DDEBF7" },
  ],
  forecast: "#FDE6D2",
  band: "#E6E7E8",
  bandRadius: 2,
  negative: "minus",
  lineWidth: 1.75,
  axis: "#7F7F7F",
})

export const navyGold = defineTheme({
  name: "navy-gold",
  series: [
    { ink: "#425288", wash: "#DEEAF6" },
    { ink: "#CC9900", wash: "#F7C773" },
    { ink: "#A6A6A6", wash: "#F2F2F2" },
    { ink: "#1C9AD1", wash: "#BAE2F8" },
    { ink: "#002060", wash: "#D6DCE4" },
  ],
  forecast: "#DEEAF6",
  band: "#E6E6E6",
  negative: "paren",
  lineWidth: 2.25,
  axis: "#000000",
})

export const blueMono = defineTheme({
  name: "blue-mono",
  series: [
    { ink: "#003974", wash: "#BDD2FF" },
    { ink: "#808080", wash: "#C0C0C0" },
    { ink: "#0039B6", wash: "#DDE9F7" },
  ],
  forecast: "#DDE9F7",
  band: "#F2F2F2",
  negative: "minus",
  lineWidth: 1.5,
  axis: "#808080",
})

export const themes = [limeGray, limeNavy, limeMono, limeGold, orangeGray, navyGold, blueMono] as const
