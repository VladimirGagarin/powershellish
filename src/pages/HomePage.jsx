import Terminal from '../components/Terminal'
import LocalSessionNotice from '../components/LocalSessionNotice'

export default function HomePage({ engine, cwd, userName }) {
  return (
    <div className="page page-home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> POWER SHELLISH · LEARN BY DOING</div>
          <h1>Make friends with the<br /><em>command line</em><span className="period">.</span></h1>
          <p className="hero-description">PowerShellish is a browser-based PowerShell learning playground. Type commands, build a virtual workspace, edit files, and export your work. No account, no server, no cloud sync.</p>
          <div className="hero-actions">
            <a className="button button-accent" href="/terminal/">Open workspace <span>↗</span></a>
            <a className="text-link" href="/help/">Browse lessons <span>→</span></a>
          </div>
          <div className="hero-note">
            <span className="note-spark">✳</span>
            <span>Simulated engine · Everything stays on your device<br /><strong>Export often to keep a copy.</strong></span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <Terminal engine={engine} cwd={cwd} mode="compact" idPrefix="home" userName={userName} />
          <div className="floating-sticker"><span>✳</span><b>learn by<br />doing</b></div>
          <div className="art-caption">YOUR FIRST COMMAND<br /><span>IS A KEYSTROKE AWAY</span></div>
        </div>
      </section>
      <section className="home-strip">
        <div className="strip-grid">
          <article className="strip-card">
            <span className="strip-kicker">DISCOVER</span>
            <h3>Real cmdlets, explained</h3>
            <p>Try Get-ChildItem, Get-Content, Set-Content, New-Item and more. Each is simulated and clearly labeled.</p>
            <code>Get-Help Get-ChildItem</code>
          </article>
          <article className="strip-card">
            <span className="strip-kicker">CREATE</span>
            <h3>Build a virtual workspace</h3>
            <p>Create files and folders, edit in the browser, import local text files, and rename or delete safely.</p>
            <code>New-Item -ItemType File -Path notes.ps1</code>
          </article>
          <article className="strip-card">
            <span className="strip-kicker">EXPORT</span>
            <h3>Take your work with you</h3>
            <p>Download a single file or the entire workspace as a ZIP. No server required.</p>
            <code>Export-Workspace</code>
          </article>
        </div>
        <LocalSessionNotice className="home-notice" />
      </section>
    </div>
  )
}
