export default function RunInTerminal({ code, label }) {
  const run = () => {
    const event = new CustomEvent("ps:run", { detail: { code } })
    window.dispatchEvent(event)
  }

  return (
    <button className="run-btn" type="button" onClick={run}>
      {label || "Run this in the terminal"}
    </button>
  )
}
