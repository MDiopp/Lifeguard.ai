export function SiteHeader({ currentPage }: { currentPage?: 'home' | 'demo' | 'monitor' }) {
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Lifeguard AI home">Lifeguard AI</a>
      <nav className="home-nav" aria-label="Main navigation">
        <a href="/monitor" aria-current={currentPage === 'monitor' ? 'page' : undefined}>Monitor</a>
        <a href="/demo" aria-current={currentPage === 'demo' ? 'page' : undefined}>Human vs AI</a>
        <a href="/" aria-current={currentPage === 'home' ? 'page' : undefined}>Home</a>
      </nav>
    </header>
  )
}
