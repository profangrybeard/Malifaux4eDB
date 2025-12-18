{/* ═══════════════════════════════════════════════════════════════════════════
   UPDATED HEADER WITH VERSION BADGE
   
   Don't forget to add the import at the top of App.jsx:
   import versionInfo from './version.json';
   ═══════════════════════════════════════════════════════════════════════════ */}

    <div className="app">
      <header className="header">
        <div>
          <h1>Malifaux 4E Crew Builder</h1>
          <span className="header-sub">{cards.length} models loaded</span>
        </div>
        <nav className="header-nav">
          <button 
            className={`nav-tab ${viewMode === 'crew' ? 'active' : ''}`}
            onClick={() => setViewMode('crew')}
          >Build Crew
          </button>
          <button 
            className={`nav-tab ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
          >Card Gallery
          </button>
        </nav>
        <div className="header-version">
          <span 
            className="version-badge" 
            title={`Build: ${versionInfo.build} • ${versionInfo.buildDateShort}`}
          >
            {versionInfo.display}
          </span>
        </div>
      </header>
