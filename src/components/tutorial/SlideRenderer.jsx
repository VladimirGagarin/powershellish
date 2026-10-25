import ConveyorBelt from "./ConveyorBelt"
import RunInTerminal from "./RunInTerminal"

export default function SlideRenderer({ slide }) {
  switch (slide.type) {
    case "animation":
      return (
        <div className="slide">
          <h2>{slide.title}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{slide.body}</p>
          {slide.animationKey === "conveyor-chain" ? <ConveyorBelt variant="chain" /> : <ConveyorBelt variant="intro" />}
          {slide.code && (
            <pre className="code-block">
              <code>{slide.code}</code>
            </pre>
          )}
          {slide.explain && <p className="explain">💡 {slide.explain}</p>}
        </div>
      )
    case "split":
    case "highlight":
      return (
        <div className="slide">
          <h2>{slide.title}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{slide.body}</p>
          <pre className="code-block">
            <code>{slide.code}</code>
          </pre>
          <p className="explain">💡 {slide.explain}</p>
        </div>
      )
    case "carousel":
      return (
        <div className="slide">
          <h2>{slide.title}</h2>
          <p>{slide.body}</p>
          <div className="carousel">
            {slide.items?.map((item) => (
              <details key={item.name} className="carousel-item">
                <summary>
                  <strong>{item.name}</strong> — {item.kid}
                </summary>
                <pre className="code-block">
                  <code>{item.code}</code>
                </pre>
                <p className="explain">💡 {item.explain}</p>
              </details>
            ))}
          </div>
        </div>
      )
    case "checklist":
      return (
        <div className="slide">
          <h2>{slide.title}</h2>
          <p>{slide.body}</p>
          <ul className="checklist">
            {slide.items?.map((item) => (
              <li key={item.rule}>
                <strong>{item.rule}</strong> — {item.kid}
              </li>
            ))}
          </ul>
        </div>
      )
    case "interactive":
      return (
        <div className="slide">
          <h2>{slide.title}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{slide.body}</p>
          <pre className="code-block">
            <code>{slide.code}</code>
          </pre>
          <p className="explain">💡 {slide.explain}</p>
          {slide.action?.type === "run-in-terminal" && <RunInTerminal code={slide.code} label={slide.action.label} />}
        </div>
      )
    default:
      return null
  }
}
