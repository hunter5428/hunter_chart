import { chartSvg as reportSvg } from "./chart.ts"
import type { ChartSpec } from "./chart.ts"
import { modernSvg } from "./modern/index.ts"
import type { ModernSpec } from "./modern/core.ts"

export { blueMono, defineTheme, limeGold, limeGray, limeMono, limeNavy, navyGold, orangeGray, themes } from "./theme.ts"

export type { NegativeStyle, Theme, ThemeInput, Tone } from "./theme.ts"

export type { ChartSpec, Guide, ScatterPoint, Series, SeriesMark, Slice, Span, WaterfallStep } from "./chart.ts"

export type { Bullet, Candle, ModernItem, ModernLink, ModernPoint, ModernSeries, ModernSpec, ModernType } from "./modern/core.ts"

export { chartFromTable } from "./table.ts"

// 차트 유형은 두 가지다. kind를 생략하면 증권사 레포트형, "modern"이면 모던형이고 테마는 같이 쓴다.
export function chartSvg(spec: ChartSpec | ModernSpec): string {
  return spec.kind === "modern" ? modernSvg(spec) : reportSvg(spec)
}
