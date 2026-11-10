import type { ChartSpec } from "./chart.ts"

function parseCell(raw: string): number | null {
  const text = raw.trim()

  if (!text || text === "-" || text === "—" || text === "–" || text.toLowerCase() === "n/a") return null
  const paren = /^\((.+)\)$/.exec(text)
  const body = (paren ? paren[1] : text).replace(/,/g, "").replace(/%/g, "").trim()
  const value = Number(body)

  if (!Number.isFinite(value)) throw new Error(`숫자로 읽을 수 없습니다: ${raw}`)

  return paren ? -Math.abs(value) : value
}

function splitLine(line: string, tabs: boolean): string[] {
  return (tabs ? line.split("\t") : line.split(",")).map((cell) => cell.trim())
}

export function chartFromTable(text: string, options?: { title?: string }): ChartSpec {
  // 첫 칸이 비어 있으면 행이 탭으로 시작한다. trim은 그 구분자를 지운다.
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")

  if (lines.length < 2) throw new Error("표에는 머리글과 데이터 행이 필요합니다.")
  const tabs = lines.some((line) => line.includes("\t"))
  const head = splitLine(lines[0], tabs)
  const categories = head.slice(1).filter((cell) => cell !== "")

  if (!categories.length) throw new Error("표의 첫 행에는 범주가 필요합니다.")

  const series = lines.slice(1).map((line) => {
    const cells = splitLine(line, tabs)

    return {
      name: cells[0] || "계열",
      values: categories.map((_, index) => parseCell(cells[index + 1] ?? "")),
      labels: "all" as const,
    }
  })

  return { type: "column", title: options?.title, categories, series }
}
