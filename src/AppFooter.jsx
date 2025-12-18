{/* ═══════════════════════════════════════════════════════════════════════════
   APP FOOTER - Add this at the bottom of your App component, just before the
   closing </div> of your main app container
   ═══════════════════════════════════════════════════════════════════════════ */}

<footer className="app-footer">
  <div className="footer-content">
    
    {/* Primary Attribution */}
    <div className="footer-section footer-disclaimer">
      <p className="disclaimer-text">
        <strong>Malifaux®</strong> and all associated images, names, and game content are trademarks 
        and © <a href="https://www.wyrd-games.net" target="_blank" rel="noopener noreferrer">Wyrd Games, LLC</a>. 
        This is an <strong>unofficial fan-made tool</strong>, not produced, endorsed, or affiliated with Wyrd Games.
      </p>
    </div>

    {/* Links & Credits Row */}
    <div className="footer-section footer-links">
      <div className="footer-link-group">
        <span className="footer-label">Official Resources</span>
        <a href="https://www.wyrd-games.net" target="_blank" rel="noopener noreferrer">
          Wyrd Games
        </a>
        <a href="https://www.wyrd-games.net/malifaux" target="_blank" rel="noopener noreferrer">
          Malifaux
        </a>
      </div>
      
      <div className="footer-link-group">
        <span className="footer-label">Data Sources</span>
        <a href="https://www.longshanks.org" target="_blank" rel="noopener noreferrer">
          Longshanks
        </a>
        <span className="footer-note">(Tournament Data)</span>
      </div>
      
      <div className="footer-link-group">
        <span className="footer-label">Feedback & Bug Reports</span>
        <a href="mailto:prof.angrybeard@gmail.com">
          prof.angrybeard@gmail.com
        </a>
      </div>
    </div>

    {/* Bottom Line */}
    <div className="footer-section footer-bottom">
      <span className="footer-credit">
        Built with ☕ for the Malifaux community
      </span>
      <span className="footer-separator">•</span>
      <span className="footer-tech">
        Crew suggestions are experimental — use your own judgment!
      </span>
    </div>

  </div>
</footer>
