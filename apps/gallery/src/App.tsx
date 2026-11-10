import { chartFromTable, chartSvg, themes } from "hunter-charts"
import type { ChartSpec, ModernSpec, Theme } from "hunter-charts"
import { useEffect, useRef, useState } from "react"
import { modernGroups } from "./modern-samples.ts"
import { pasteExample, samples, themeLabel } from "./samples.ts"

const kinds = [
  { id: "report", label: "증권사 레포트형" },
  { id: "modern", label: "모던형" },
] as const

function download(filename: string, href: string) {
  const link = document.createElement("a")
  link.href = href
  link.download = filename
  link.click()
}

function downloadSvg(svg: string, filename: string) {
  download(filename, URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" })))
}

function downloadPng(svg: string, filename: string) {
  const image = new Image()
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))
  image.onload = () => {
    const scale = 2
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth * scale
    canvas.height = image.naturalHeight * scale
    const ctx = canvas.getContext("2d")

    if (!ctx) return
    ctx.fillStyle = "#FFFFFF"
    ctx.scale(scale, scale)
    ctx.drawImage(image, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) download(filename, URL.createObjectURL(blob))
      URL.revokeObjectURL(url)
    }, "image/png")
  }

  image.src = url
}

function Tooltip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const text = event.target instanceof Element ? event.target.closest("[data-tip]")?.getAttribute("data-tip") : null
      setTip(text ? { text, x: event.clientX, y: event.clientY } : null)
    }

    // 휠로 넘기면 포인터가 움직이지 않아 지나간 차트의 문구가 남는다.
    const clear = () => setTip(null)
    document.addEventListener("pointermove", move)
    document.documentElement.addEventListener("pointerleave", clear)
    window.addEventListener("scroll", clear, { passive: true })

    return () => {
      document.removeEventListener("pointermove", move)
      document.documentElement.removeEventListener("pointerleave", clear)
      window.removeEventListener("scroll", clear)
    }
  }, [])

  if (!tip) return null
  const dx = tip.x > window.innerWidth - 220 ? "calc(-100% - 12px)" : "12px"
  const dy = tip.y > window.innerHeight - 140 ? "calc(-100% - 12px)" : "14px"

  return (
    <div className="tip" role="tooltip" style={{ left: tip.x, top: tip.y, transform: `translate(${dx}, ${dy})` }}>
      {tip.text}
    </div>
  )
}

function Figure({ spec, theme, run }: { spec: ChartSpec | ModernSpec; theme: Theme; run: number }) {
  const sized =
    spec.kind === "modern"
      ? { ...spec, theme, width: spec.width ?? 640, height: spec.height ?? 400 }
      : { ...spec, theme, width: spec.width ?? 640, height: ["table", "heatmap", "rating"].includes(spec.type) ? undefined : (spec.height ?? 380) }

  // 내려받는 파일은 동작이 없는 SVG로 만든다. 동작이 있으면 PNG에 첫 프레임이 찍힌다.
  const svg = chartSvg(sized)
  const name = (spec.title ?? "chart").replaceAll(" ", "-")
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [played, setPlayed] = useState(-1)
  const [own, setOwn] = useState(0)
  useEffect(() => {
    const node = ref.current

    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 })
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  // 화면 밖에서 받은 전체 재생은 보일 때까지 미룬다.
  if (visible && played !== run) setPlayed(run)

  return (
    <figure ref={ref}>
      {/* key가 바뀌면 SVG를 새로 붙여서 CSS 동작이 처음부터 다시 돈다. */}
      <div key={`${played}:${own}`} className="plot" onClick={() => setOwn(own + 1)} dangerouslySetInnerHTML={{ __html: chartSvg({ ...sized, live: true }) }} />
      <div className="actions">
        <button type="button" onClick={() => downloadSvg(svg, `${name}.svg`)}>
          SVG
        </button>
        <button type="button" onClick={() => downloadPng(svg, `${name}.png`)}>
          PNG
        </button>
      </div>
    </figure>
  )
}

export function App() {
  const [name, setName] = useState(themes[0].name)
  const [kind, setKind] = useState<(typeof kinds)[number]["id"]>("report")
  const [pasted, setPasted] = useState(pasteExample)
  const [run, setRun] = useState(0)
  const theme = themes.find((item) => item.name === name) ?? themes[0]
  let pastedSpec: ChartSpec | null = null
  let pastedError = ""

  try {
    pastedSpec = chartFromTable(pasted, { title: "붙여넣은 표" })
  } catch (error) {
    pastedError = error instanceof Error ? error.message : "표를 읽지 못했습니다."
  }

  return (
    <main className="page">
      <div className="bar">
        {kind === "modern" ? (
          <p className="credit">
            모던형 디자인은{" "}
            <a href="https://github.com/Junhan2/ztd-charts" target="_blank" rel="noreferrer">
              ztd-charts
            </a>
            를 차용했습니다.
          </p>
        ) : null}
        <button type="button" className="play" onClick={() => setRun(run + 1)}>
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 0 9 5 1 10z" />
          </svg>
          전체 재생
        </button>
      </div>
      <Tooltip />
      <p className="kicker">Hunter Charts</p>
      <h1>{kind === "modern" ? "모던형 차트" : "증권사 레포트형 차트"}</h1>
      <hr className="rule" style={{ background: theme.series[0].ink }} />
      <div className="kinds" role="group" aria-label="차트 유형">
        {kinds.map((item) => (
          <button key={item.id} type="button" aria-pressed={item.id === kind} onClick={() => setKind(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="themes" role="group" aria-label="테마">
        {themes.map((item) => (
          <button key={item.name} type="button" aria-pressed={item.name === theme.name} onClick={() => setName(item.name)}>
            <span>{themeLabel(item.name)}</span>
            <span className="chips" aria-hidden="true">
              {item.series.map((tone) => (
                <i key={tone.ink} style={{ background: tone.ink }} />
              ))}
            </span>
          </button>
        ))}
      </div>
      {kind === "modern" ? (
        modernGroups.map((group) => (
          <section key={group.name} className="group">
            <h2>{group.name}</h2>
            <div className="grid cards">
              {group.specs.map((spec) => (
                <Figure key={spec.title} spec={spec} theme={theme} run={run} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <>
          <div className="grid">
            {samples.map((spec) => (
              <Figure key={spec.title} spec={spec} theme={theme} run={run} />
            ))}
          </div>
          <section className="paste">
            <h2>엑셀에서 붙여넣기</h2>
            <p>첫 행은 범주, 첫 열은 시리즈 이름입니다. 빈 칸과 하이픈은 빠지고, (12)는 음수입니다.</p>
            <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} aria-label="엑셀 표" spellCheck={false} />
            {pastedError ? <p className="error">{pastedError}</p> : pastedSpec ? <Figure spec={pastedSpec} theme={theme} run={run} /> : null}
          </section>
        </>
      )}
    </main>
  )
}
