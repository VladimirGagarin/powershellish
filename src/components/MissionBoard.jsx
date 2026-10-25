import { useState } from 'react'
import { missions } from '../data/missions.js'
import { loadLessonProgress, saveLessonProgress } from '../lib/storage.js'

export default function MissionBoard({ engine, onLoadCommand }) {
  const [completedIds, setCompletedIds] = useState(loadLessonProgress)
  const [hints, setHints] = useState({})
  const [feedback, setFeedback] = useState({})

  function checkMission(mission) {
    const passed = mission.verify(engine.context.vfs)
    if (!passed) {
      setFeedback((current) => ({ ...current, [mission.id]: 'Not quite yet. Run the steps, then check again.' }))
      return
    }
    const nextIds = [...new Set([...completedIds, mission.id])]
    const saved = saveLessonProgress(nextIds)
    setCompletedIds(nextIds)
    setFeedback((current) => ({
      ...current,
      [mission.id]: saved
        ? `Mission complete! You earned the ${mission.badge} badge. Progress is saved on this device.`
        : `Mission complete! You earned the ${mission.badge} badge for this visit. Browser storage is unavailable, so progress may not persist.`,
    }))
  }

  return (
    <section className="mission-section" aria-labelledby="mission-title">
      <header className="section-header">
        <div>
          <span className="section-kicker">POWERSHELLISH QUESTS</span>
          <h2 id="mission-title">Choose a mission</h2>
          <p>Load each step into the terminal, review it, then press Enter. Your files stay in this browser workspace.</p>
        </div>
        <div className="mission-progress" aria-live="polite">
          <strong>{completedIds.length} / {missions.length}</strong>
          <span>badges earned on this device</span>
        </div>
      </header>
      <div className="mission-grid">
        {missions.map((mission, index) => {
          const isComplete = completedIds.includes(mission.id)
          return (
            <article className={`mission-card${isComplete ? ' mission-card-complete' : ''}`} key={mission.id}>
              <div className="mission-card-top">
                <span className="mission-number">MISSION {String(index + 1).padStart(2, '0')}</span>
                <span className="mission-badge">{isComplete ? '✦' : '◇'} {mission.badge}</span>
              </div>
              <h3>{mission.title}</h3>
              <p>{mission.objective}</p>
              <div className="mission-steps">
                {mission.steps.map((step, stepIndex) => (
                  <div className="mission-step" key={step.label}>
                    <span className="mission-step-number">{stepIndex + 1}</span>
                    <span>{step.label}</span>
                    <button type="button" onClick={() => onLoadCommand(step.command)}>Load</button>
                  </div>
                ))}
              </div>
              {hints[mission.id] && <p className="mission-hint"><strong>Hint:</strong> {mission.hint}</p>}
              {feedback[mission.id] && <p className="mission-feedback" role="status">{feedback[mission.id]}</p>}
              <div className="mission-actions">
                <button type="button" className="mission-check" onClick={() => checkMission(mission)}>Check mission</button>
                <button type="button" className="mission-hint-toggle" onClick={() => setHints((current) => ({ ...current, [mission.id]: !current[mission.id] }))}>
                  {hints[mission.id] ? 'Hide hint' : 'Need a hint?'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
