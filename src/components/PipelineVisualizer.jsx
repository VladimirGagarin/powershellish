import { useState } from 'react'

const stages = [
  {
    command: 'Get-ChildItem',
    job: 'Make file objects',
    data: [
      { Name: 'start-here.ps1', Extension: '.ps1', Length: 820 },
      { Name: 'ideas.txt', Extension: '.txt', Length: 142 },
      { Name: 'backup.ps1', Extension: '.ps1', Length: 2048 },
    ],
    explanation: 'The first command sends a stream of file objects down the conveyor belt. Each object has named properties.',
  },
  {
    command: "Where-Object { $_.Extension -eq '.ps1' }",
    job: 'Keep matching objects',
    data: [
      { Name: 'start-here.ps1', Extension: '.ps1', Length: 820 },
      { Name: 'backup.ps1', Extension: '.ps1', Length: 2048 },
    ],
    explanation: 'Where-Object checks each object. $_ means “the current object”; only objects whose Extension is .ps1 continue.',
  },
  {
    command: 'Select-Object Name',
    job: 'Choose the fields',
    data: [{ Name: 'start-here.ps1' }, { Name: 'backup.ps1' }],
    explanation: 'Select-Object makes a smaller object with just the Name property. The pipeline passes objects, not just printed text.',
  },
]

export default function PipelineVisualizer() {
  const [activeStage, setActiveStage] = useState(0)
  const active = stages[activeStage]

  return (
    <section className="pipeline-section" aria-labelledby="pipeline-title">
      <header className="section-header">
        <div>
          <span className="section-kicker">FOLLOW THE OBJECTS</span>
          <h2 id="pipeline-title">A pipe is a conveyor belt</h2>
          <p>Choose a stage to see what the next command receives and sends onward.</p>
        </div>
      </header>
      <div className="pipeline-demo">
        <div className="pipeline-source" aria-label="Example pipeline">
          <code>Get-ChildItem | Where-Object {'{'} $_.Extension -eq '.ps1' {'}'} | Select-Object Name</code>
          <span>Illustrative native PowerShell example · this pipeline is not executed by the simulator.</span>
        </div>
        <div className="pipeline-stages" role="group" aria-label="Select a pipeline stage to inspect">
          {stages.map((stage, index) => (
            <div className="pipeline-stage-wrap" key={stage.command}>
              <button
                type="button"
                aria-pressed={activeStage === index}
                className={`pipeline-stage${activeStage === index ? ' pipeline-stage-active' : ''}`}
                onClick={() => setActiveStage(index)}
              >
                <span>STAGE {index + 1}</span>
                <code>{stage.command}</code>
                <small>{stage.job}</small>
              </button>
              {index < stages.length - 1 && <span className="pipeline-arrow" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
        <div className="pipeline-output" aria-live="polite">
          <div className="pipeline-output-heading">
            <strong>After stage {activeStage + 1}</strong>
            <span>{active.data.length} {active.data.length === 1 ? 'object' : 'objects'} on the belt</span>
          </div>
          <p>{active.explanation}</p>
          <pre>{JSON.stringify(active.data, null, 2)}</pre>
        </div>
      </div>
    </section>
  )
}
