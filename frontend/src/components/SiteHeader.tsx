export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Lifeguard AI home">Lifeguard AI</a>
      <nav className="home-nav" aria-label="Main navigation">
        <a href="/monitor">Monitor</a>
        <a href="/demo">Human vs AI</a>
        <a href="/incidents">Incidents</a>
      </nav>
    </header>
  )
}
