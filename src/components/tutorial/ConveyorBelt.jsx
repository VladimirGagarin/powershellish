import "../../styles/tutorial.css"

export default function ConveyorBelt({ variant = "intro" }) {
  return (
    <div className="conveyor">
      <div className="machines">
        <div className="machine left">Machine 1</div>
        <div className="pipe">|</div>
        <div className="machine right">Machine 2</div>
      </div>
      <div className="belt">
        <div className="belt-track" />
        {variant === "intro" && (
          <>
            <div className="item item-1">Item</div>
            <div className="item item-2">Item</div>
            <div className="item item-3">Item</div>
          </>
        )}
        {variant === "chain" && (
          <>
            <div className="machine small">Get</div>
            <div className="pipe small">|</div>
            <div className="machine small">Sort</div>
            <div className="pipe small">|</div>
            <div className="machine small">Pick</div>
          </>
        )}
      </div>
      <p className="conveyor-caption">
        {variant === "intro" ? "Send items down to the next thing" : "Each machine passes items to the next"}
      </p>
    </div>
  )
}
