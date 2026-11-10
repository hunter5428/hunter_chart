import assert from "node:assert/strict"
import test from "node:test"
import { blueMono, defineTheme, navyGold, orangeGray, themes } from "../src/index.ts"

test("색이 3개 미만이면 테마를 만들지 않는다", () => {
  assert.throws(
    () =>
      defineTheme({
        name: "short",
        series: [
          { ink: "#F58220", wash: "#F0B26B" },
          { ink: "#84888B", wash: "#B5B7B9" },
        ],
      }),
    /3개 이상/,
  )
})

test("기본 테마 세 개는 색이 3개 이상이고 첫 색이 정해져 있다", () => {
  assert.equal(orangeGray.series.length >= 3, true)
  assert.equal(navyGold.series.length >= 3, true)
  assert.equal(blueMono.series.length >= 3, true)
  assert.equal(orangeGray.series[0].ink, "#F58220")
  assert.equal(navyGold.series[0].ink, "#425288")
  assert.equal(blueMono.series[0].ink, "#003974")
  assert.equal(navyGold.negative, "paren")
  assert.equal(orangeGray.negative, "minus")
})

test("연두 테마 네 개는 목록 앞에 있고 첫 색이 밝은 연두다", () => {
  assert.deepEqual(
    themes.slice(0, 4).map((theme) => theme.name),
    ["lime-gray", "lime-navy", "lime-mono", "lime-gold"],
  )
  assert.equal(themes[4].name, "orange-gray")

  for (const theme of themes.slice(0, 4)) {
    assert.equal(theme.series.length >= 3, true)
    const value = parseInt(theme.series[0].ink.slice(1), 16)
    const red = (value >> 16) & 255
    const green = (value >> 8) & 255
    const blue = value & 255
    assert.equal(green > red && red > blue && green >= 180 && blue <= 80, true)
  }
})
