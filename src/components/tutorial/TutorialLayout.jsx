import { useState } from "react"
import SlideRenderer from "./SlideRenderer"
import "../../styles/tutorial.css"

export default function TutorialLayout({ data }) {
  const lessons = data?.lessons || []
  const [activeLessonId, setActiveLessonId] = useState(lessons[0]?.id)
  const [slideIndex, setSlideIndex] = useState(0)

  const lesson = lessons.find((l) => l.id === activeLessonId) || lessons[0]
  const slides = lesson?.slides || []
  const slide = slides[slideIndex]

  function goNext() {
    if (slideIndex < slides.length - 1) setSlideIndex((i) => i + 1)
  }

  function goPrev() {
    if (slideIndex > 0) setSlideIndex((i) => i - 1)
  }

  function changeLesson(id) {
    setActiveLessonId(id)
    setSlideIndex(0)
  }

  return (
    <section id="pli5-tutorial" className="tutorial-section">
      <header className="section-header">
        <div>
          <span className="section-kicker">TUTORIALS</span>
          <h2>{data?.sectionTitle || "PowerShell Tutorials"}</h2>
          <p>Learn step by step with the conveyor belt approach.</p>
        </div>
      </header>

      <div className="tutorial-layout">
        <aside className="tutorial-menu">
          <div className="tutorial-menu-header">
            <span>Lessons</span>
          </div>
          <ul className="tutorial-lesson-list">
            {lessons.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className={`tutorial-lesson-btn ${l.id === lesson?.id ? "active" : ""}`}
                  onClick={() => changeLesson(l.id)}
                >
                  <div className="lesson-title">{l.title}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="tutorial-main">
          <div className="tutorial-main-header">
            <div>
              <h3>{lesson?.title}</h3>
              <p>Slide {slideIndex + 1} of {slides.length}</p>
            </div>
            <div className="tutorial-nav">
              <button type="button" onClick={goPrev} disabled={slideIndex === 0}>← Prev</button>
              <button type="button" onClick={goNext} disabled={slideIndex === slides.length - 1}>Next →</button>
            </div>
          </div>
          <div className="tutorial-slide">
            {slide ? <SlideRenderer slide={slide} /> : <p>No slides for this lesson.</p>}
          </div>
        </main>
      </div>
    </section>
  )
}
