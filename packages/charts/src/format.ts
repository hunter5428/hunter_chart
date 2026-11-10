import type { NegativeStyle } from "./theme.ts"

export function formatValue(value: number, negative: NegativeStyle, digits: number): string {
  const rounded = Number(value.toFixed(digits))
  const body = Math.abs(rounded).toFixed(digits)

  if (rounded < 0) return negative === "paren" ? `(${body})` : `-${body}`

  return body
}

export function inferDigits(values: readonly number[]): number {
  let digits = 0

  for (const value of values) {
    const text = String(Math.abs(value))
    const dot = text.indexOf(".")

    if (dot >= 0) digits = Math.max(digits, Math.min(2, text.length - dot - 1))
  }

  return digits
}

export function formatTick(value: number, negative: NegativeStyle): string {
  const rounded = Number(value.toFixed(10))

  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return formatValue(rounded, negative, 0)

  if (Math.abs(rounded * 10 - Math.round(rounded * 10)) < 1e-6) return formatValue(rounded, negative, 1)

  return formatValue(rounded, negative, 2)
}

function channel(c: number): number {
  const s = c / 255

  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function contrast(hex: string, other: string): number {
  const lum = (h: string) => {
    const n = parseInt(h.slice(1), 16)
    const r = channel((n >> 16) & 255)
    const g = channel((n >> 8) & 255)
    const b = channel(n & 255)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const a = lum(hex)
  const b = lum(other)

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export function mix(from: string, to: string, ratio: number): string {
  const a = parseInt(from.slice(1), 16)
  const b = parseInt(to.slice(1), 16)
  const part = (shift: number) => Math.round(((a >> shift) & 255) + (((b >> shift) & 255) - ((a >> shift) & 255)) * ratio)

  return `#${[16, 8, 0].map((shift) => part(shift).toString(16).padStart(2, "0")).join("")}`.toUpperCase()
}

export function inkOn(background: string): string {
  const dark = "#14171B"
  const light = "#FFFFFF"

  return contrast(light, background) >= contrast(dark, background) ? light : dark
}
