import { useState, useMemo, useEffect } from 'react'
import cardData from './data/cards.json'
import objectivesData from './data/objectives.json'

const IMAGE_BASE = 'https://raw.githubusercontent.com/profangrybeard/Malifaux4eDB-images/main'

// Display name for card types
const getCardTypeDisplay = (cardType) => {
  if (cardType === 'Stat') return 'Model'
  return cardType
}

function App() {
  // View mode: 'cards' or 'objectives'
  const [viewMode, setViewMode] = useState('cards')
  
  // Card Filter state
  const [search, setSearch] = useState('')
  const [faction, setFaction] = useState('')
  const [baseSize, setBaseSize] = useState('')
  const [cardType, setCardType] = useState('')
  const [minCost, setMinCost] = useState('')
  const [maxCost, setMaxCost] = useState('')
  const [minHealth, setMinHealth] = useState('')
  const [maxHealth, setMaxHealth] = useState('')
  const [soulstoneFilter, setSoulstoneFilter] = useState('')  // '', 'yes', 'no'
  
  // Objective filter state
  const [selectedSchemes, setSelectedSchemes] = useState([])
  const [selectedStrategy, setSelectedStrategy] = useState('')
  const [objectiveSearch, setObjectiveSearch] = useState('')
  
  // Modal state
  const [selectedCard, setSelectedCard] = useState(null)
  const [modalView, setModalView] = useState('front')
  const [selectedObjective, setSelectedObjective] = useState(null)

  // Get data arrays
  const cards = cardData.cards || []
  const schemes = objectivesData?.schemes || {}
  const strategies = objectivesData?.strategies || {}

  // Extract unique factions for dropdown
  const factions = useMemo(() => {
    const set = new Set()
    cards.forEach(c => {
      if (c.faction) set.add(c.faction)
    })
    return Array.from(set).sort()
  }, [cards])

  // Extract unique base sizes for dropdown
  const baseSizes = useMemo(() => {
    const set = new Set()
    cards.forEach(c => {
      if (c.base_size) set.add(c.base_size)
    })
    return Array.from(set).sort((a, b) => {
      const aNum = parseInt(a) || 0
      const bNum = parseInt(b) || 0
      return aNum - bNum
    })
  }, [cards])

  // Extract unique card types for dropdown
  const cardTypes = useMemo(() => {
    const set = new Set()
    cards.forEach(c => {
      if (c.card_type) set.add(c.card_type)
    })
    return Array.from(set).sort()
  }, [cards])

  // Get scheme and strategy arrays
  const schemeList = useMemo(() => {
    return Object.values(schemes).sort((a, b) => a.name.localeCompare(b.name))
  }, [schemes])

  const strategyList = useMemo(() => {
    return Object.values(strategies).sort((a, b) => a.name.localeCompare(b.name))
  }, [strategies])

  // Filter objectives based on search
  const filteredSchemes = useMemo(() => {
    if (!objectiveSearch) return schemeList
    const searchLower = objectiveSearch.toLowerCase()
    return schemeList.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.setup_text?.toLowerCase().includes(searchLower) ||
      s.scoring_text?.toLowerCase().includes(searchLower)
    )
  }, [schemeList, objectiveSearch])

  const filteredStrategies = useMemo(() => {
    if (!objectiveSearch) return strategyList
    const searchLower = objectiveSearch.toLowerCase()
    return strategyList.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.setup_text?.toLowerCase().includes(searchLower) ||
      s.scoring_text?.toLowerCase().includes(searchLower)
    )
  }, [strategyList, objectiveSearch])

  // FILTER CARDS - now also considers selected schemes/strategy
  const filteredCards = useMemo(() => {
    const searchLower = search.toLowerCase().trim()
    
    // Get favored roles/abilities from selected objectives
    let favoredRoles = new Set()
    let favoredAbilities = new Set()
    
    selectedSchemes.forEach(schemeId => {
      const scheme = schemes[schemeId]
      if (scheme?.favors_roles) {
        scheme.favors_roles.forEach(r => favoredRoles.add(r))
      }
      if (scheme?.favors_abilities) {
        scheme.favors_abilities.forEach(a => favoredAbilities.add(a))
      }
    })
    
    if (selectedStrategy && strategies[selectedStrategy]) {
      const strat = strategies[selectedStrategy]
      if (strat.favors_roles) {
        strat.favors_roles.forEach(r => favoredRoles.add(r))
      }
      if (strat.favors_abilities) {
        strat.favors_abilities.forEach(a => favoredAbilities.add(a))
      }
    }
    
    return cards.filter(card => {
      // Search filter: match name or keywords
      if (searchLower) {
        const nameMatch = card.name && card.name.toLowerCase().includes(searchLower)
        const keywordMatch = card.keywords && card.keywords.some(k => 
          k.toLowerCase().includes(searchLower)
        )
        if (!nameMatch && !keywordMatch) {
          return false
        }
      }
      
      // Faction filter
      if (faction && card.faction !== faction) {
        return false
      }
      
      // Base size filter
      if (baseSize && card.base_size !== baseSize) {
        return false
      }

      // Card type filter
      if (cardType && card.card_type !== cardType) {
        return false
      }

      // Cost filters
      if (minCost !== '' && (card.cost === null || card.cost < parseInt(minCost))) {
        return false
      }
      if (maxCost !== '' && (card.cost === null || card.cost > parseInt(maxCost))) {
        return false
      }

      // Health filters
      if (minHealth !== '' && (card.health === null || card.health === undefined || card.health < parseInt(minHealth))) {
        return false
      }
      if (maxHealth !== '' && (card.health === null || card.health === undefined || card.health > parseInt(maxHealth))) {
        return false
      }

      // Soulstone filter
      if (soulstoneFilter === 'yes' && !card.soulstone_cache) {
        return false
      }
      if (soulstoneFilter === 'no' && card.soulstone_cache) {
        return false
      }
      
      return true
    }).map(card => {
      // Calculate objective match score
      let objectiveScore = 0
      const cardRoles = card.roles || []
      const cardAbilities = card.abilities?.map(a => a.name?.toLowerCase()) || []
      
      cardRoles.forEach(role => {
        if (favoredRoles.has(role)) objectiveScore += 2
      })
      cardAbilities.forEach(ability => {
        if (favoredAbilities.has(ability)) objectiveScore += 1
      })
      
      return { ...card, objectiveScore }
    }).sort((a, b) => {
      // If objectives are selected, sort by match score
      if (selectedSchemes.length > 0 || selectedStrategy) {
        return b.objectiveScore - a.objectiveScore
      }
      return 0
    })
  }, [cards, search, faction, baseSize, cardType, minCost, maxCost, minHealth, maxHealth, soulstoneFilter,
      selectedSchemes, selectedStrategy, schemes, strategies])

  // Toggle scheme selection
  const toggleScheme = (schemeId) => {
    setSelectedSchemes(prev => {
      if (prev.includes(schemeId)) {
        return prev.filter(id => id !== schemeId)
      }
      if (prev.length >= 2) {
        // Max 2 schemes in M4E
        return [...prev.slice(1), schemeId]
      }
      return [...prev, schemeId]
    })
  }

  // Open card modal
  const openModal = (card) => {
    setSelectedCard(card)
    setModalView('front')
  }

  // Close card modal
  const closeModal = () => {
    setSelectedCard(null)
  }

  // Open objective modal
  const openObjectiveModal = (objective) => {
    setSelectedObjective(objective)
  }

  // Close objective modal
  const closeObjectiveModal = () => {
    setSelectedObjective(null)
  }

  // Navigate to previous/next card in filtered list
  const navigateCard = (direction) => {
    if (!selectedCard || filteredCards.length === 0) return
    const currentIndex = filteredCards.findIndex(c => c.id === selectedCard.id)
    if (currentIndex === -1) return
    
    let newIndex
    if (direction === 'prev') {
      newIndex = currentIndex === 0 ? filteredCards.length - 1 : currentIndex - 1
    } else {
      newIndex = currentIndex === filteredCards.length - 1 ? 0 : currentIndex + 1
    }
    setSelectedCard(filteredCards[newIndex])
    setModalView('front')
  }

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedCard) return
      if (e.key === 'ArrowLeft') {
        navigateCard('prev')
      } else if (e.key === 'ArrowRight') {
        navigateCard('next')
      } else if (e.key === 'Escape') {
        closeModal()
        closeObjectiveModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCard, filteredCards])

  // Clear objective selections
  const clearObjectives = () => {
    setSelectedSchemes([])
    setSelectedStrategy('')
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Malifaux 4E Database</h1>
        <div className="header-nav">
          <button 
            className={`nav-tab ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
          >
            Card Browser
          </button>
          <button 
            className={`nav-tab ${viewMode === 'objectives' ? 'active' : ''}`}
            onClick={() => setViewMode('objectives')}
          >
            Schemes & Strategies
          </button>
        </div>
      </header>

      {/* Selected Objectives Bar */}
      {(selectedSchemes.length > 0 || selectedStrategy) && (
        <div className="objectives-bar">
          <span className="objectives-label">Active Objectives:</span>
          {selectedStrategy && (
            <span className="objective-chip strategy" onClick={() => setSelectedStrategy('')}>
              ⚔ {strategies[selectedStrategy]?.name}
              <span className="chip-remove">×</span>
            </span>
          )}
          {selectedSchemes.map(schemeId => (
            <span 
              key={schemeId} 
              className="objective-chip scheme"
              onClick={() => toggleScheme(schemeId)}
            >
              ◈ {schemes[schemeId]?.name}
              <span className="chip-remove">×</span>
            </span>
          ))}
          <button className="clear-objectives" onClick={clearObjectives}>
            Clear All
          </button>
          <span className="objectives-hint">
            Cards sorted by objective synergy
          </span>
        </div>
      )}

      {viewMode === 'cards' && (
        <>
          <div className="controls">
            <input
              type="text"
              className="search-box"
              placeholder="Search cards or keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select 
              className="filter-select"
              value={faction}
              onChange={e => setFaction(e.target.value)}
            >
              <option value="">All Factions</option>
              {factions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select 
              className="filter-select"
              value={cardType}
              onChange={e => setCardType(e.target.value)}
            >
              <option value="">All Types</option>
              {cardTypes.map(t => (
                <option key={t} value={t}>{getCardTypeDisplay(t)}</option>
              ))}
            </select>
            <select 
              className="filter-select"
              value={baseSize}
              onChange={e => setBaseSize(e.target.value)}
            >
              <option value="">All Base Sizes</option>
              {baseSizes.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <div className="cost-filter">
              <span className="cost-label">Cost:</span>
              <input
                type="number"
                className="cost-input"
                placeholder="Min"
                min="0"
                value={minCost}
                onChange={e => setMinCost(e.target.value)}
              />
              <span className="cost-separator">-</span>
              <input
                type="number"
                className="cost-input"
                placeholder="Max"
                min="0"
                value={maxCost}
                onChange={e => setMaxCost(e.target.value)}
              />
            </div>
            <div className="cost-filter">
              <span className="cost-label">Health:</span>
              <input
                type="number"
                className="cost-input"
                placeholder="Min"
                min="0"
                value={minHealth}
                onChange={e => setMinHealth(e.target.value)}
              />
              <span className="cost-separator">-</span>
              <input
                type="number"
                className="cost-input"
                placeholder="Max"
                min="0"
                value={maxHealth}
                onChange={e => setMaxHealth(e.target.value)}
              />
            </div>
            <select 
              className="filter-select"
              value={soulstoneFilter}
              onChange={e => setSoulstoneFilter(e.target.value)}
            >
              <option value="">Soulstone: All</option>
              <option value="yes">✦ Soulstone Users</option>
              <option value="no">No Soulstone</option>
            </select>
            <span className="result-count">{filteredCards.length} cards</span>
          </div>

          {filteredCards.length === 0 ? (
            <div className="empty">
              <h3>No cards found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="card-grid">
              {filteredCards.map((card, index) => (
                <div key={`${card.id}-${index}`} className="card" onClick={() => openModal(card)}>
                  <div className="card-image-container">
                    <img 
                      className="card-image"
                      src={`${IMAGE_BASE}/${card.front_image}`}
                      alt={card.name}
                      loading="lazy"
                      onError={e => { 
                        e.target.onerror = null
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">No Image</text></svg>' 
                      }}
                    />
                    {/* Objective match indicator */}
                    {card.objectiveScore > 0 && (
                      <div className="objective-match-badge">
                        ★ {card.objectiveScore}
                      </div>
                    )}
                    {/* Stats overlay - only for Models */}
                    {card.card_type === 'Stat' && (
                      <div className="card-stats-overlay">
                        <div className="stat-bar">
                          {card.defense && <span className="stat-item"><span className="stat-label">DF</span>{card.defense}</span>}
                          {card.speed && <span className="stat-item"><span className="stat-label">SP</span>{card.speed}</span>}
                          {card.willpower && <span className="stat-item"><span className="stat-label">WP</span>{card.willpower}</span>}
                          {card.size && <span className="stat-item"><span className="stat-label">SZ</span>{card.size}</span>}
                          <span className="stat-item stat-health"><span className="stat-label">HP</span>{card.health || 'N/D'}</span>
                          {card.soulstone_cache && (
                            <span className="stat-item stat-soulstone"><span className="stat-label">SS</span>✦</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card-info">
                    <div className="card-info-row">
                      <div className="card-info-text">
                        <h3 className="card-name">{card.name}</h3>
                        <p className="card-meta">
                          <span className="card-faction">{card.faction}</span>
                          {card.subfaction && ` • ${card.subfaction}`}
                        </p>
                      </div>
                      {card.card_type && (
                        <span className={`card-type-tag card-type-${card.card_type.toLowerCase()}`}>
                          {getCardTypeDisplay(card.card_type)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'objectives' && (
        <>
          <div className="controls">
            <input
              type="text"
              className="search-box"
              placeholder="Search schemes and strategies..."
              value={objectiveSearch}
              onChange={e => setObjectiveSearch(e.target.value)}
            />
            <span className="result-count">
              {filteredSchemes.length} schemes • {filteredStrategies.length} strategies
            </span>
          </div>

          <div className="objectives-container">
            {/* Strategies Section */}
            <section className="objectives-section">
              <h2 className="section-title">
                <span className="section-icon">⚔</span>
                Strategies
              </h2>
              <p className="section-desc">Select one strategy for the encounter</p>
              <div className="objectives-grid strategies-grid">
                {filteredStrategies.map(strategy => (
                  <div 
                    key={strategy.id}
                    className={`objective-card strategy-card ${selectedStrategy === strategy.id ? 'selected' : ''}`}
                    onClick={() => setSelectedStrategy(selectedStrategy === strategy.id ? '' : strategy.id)}
                  >
                    <div className="objective-header">
                      <h3>{strategy.name}</h3>
                      <span className="vp-badge">{strategy.max_vp} VP</span>
                    </div>
                    <p className="objective-preview">
                      {strategy.setup_text?.slice(0, 120)}...
                    </p>
                    {strategy.uses_strategy_markers && (
                      <div className="objective-tags">
                        <span className="obj-tag markers">📍 {strategy.marker_count} Markers</span>
                      </div>
                    )}
                    <button 
                      className="objective-details-btn"
                      onClick={(e) => { e.stopPropagation(); openObjectiveModal(strategy); }}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Schemes Section */}
            <section className="objectives-section">
              <h2 className="section-title">
                <span className="section-icon">◈</span>
                Schemes
              </h2>
              <p className="section-desc">Select up to 2 schemes (click to toggle)</p>
              <div className="objectives-grid schemes-grid">
                {filteredSchemes.map(scheme => (
                  <div 
                    key={scheme.id}
                    className={`objective-card scheme-card ${selectedSchemes.includes(scheme.id) ? 'selected' : ''}`}
                    onClick={() => toggleScheme(scheme.id)}
                  >
                    <div className="objective-header">
                      <h3>{scheme.name}</h3>
                      <span className="vp-badge">{scheme.max_vp} VP</span>
                    </div>
                    <p className="objective-preview">
                      {scheme.reveal_condition?.slice(0, 100) || scheme.setup_text?.slice(0, 100)}...
                    </p>
                    <div className="objective-tags">
                      {scheme.requires_killing && <span className="obj-tag killing">⚔ Killing</span>}
                      {scheme.requires_scheme_markers && <span className="obj-tag markers">📍 Markers</span>}
                      {scheme.requires_positioning && <span className="obj-tag position">📐 Position</span>}
                      {scheme.requires_terrain && <span className="obj-tag terrain">🏔 Terrain</span>}
                    </div>
                    {scheme.next_available_schemes?.length > 0 && (
                      <div className="scheme-branches">
                        <span className="branches-label">Branches to:</span>
                        {scheme.next_available_schemes.slice(0, 3).map((next, i) => (
                          <span key={i} className="branch-name">{next}</span>
                        ))}
                      </div>
                    )}
                    <button 
                      className="objective-details-btn"
                      onClick={(e) => { e.stopPropagation(); openObjectiveModal(scheme); }}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {/* Card Modal */}
      {selectedCard && (
        <div className="modal-overlay" onClick={closeModal}>
          <button 
            className="nav-arrow nav-arrow-left"
            onClick={(e) => { e.stopPropagation(); navigateCard('prev'); }}
            aria-label="Previous card"
          >
            ‹
          </button>
          
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCard.name}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-images">
                <div className="image-tabs">
                  <button 
                    className={modalView === 'front' ? 'active' : ''} 
                    onClick={() => setModalView('front')}
                  >
                    Front
                  </button>
                  <button 
                    className={modalView === 'back' ? 'active' : ''} 
                    onClick={() => setModalView('back')}
                  >
                    Back
                  </button>
                </div>
                <img 
                  className="modal-image"
                  src={`${IMAGE_BASE}/${modalView === 'front' ? selectedCard.front_image : selectedCard.back_image}`}
                  alt={`${selectedCard.name} ${modalView}`}
                />
              </div>
              <div className="modal-details">
                <section>
                  <h3>Stats</h3>
                  <div className="stats-grid">
                    {selectedCard.cost && (
                      <div className="stat-box">
                        <div className="stat-label">Cost</div>
                        <div className="stat-value">{selectedCard.cost}</div>
                      </div>
                    )}
                    {selectedCard.defense && (
                      <div className="stat-box">
                        <div className="stat-label">Defense</div>
                        <div className="stat-value">{selectedCard.defense}</div>
                      </div>
                    )}
                    {selectedCard.speed && (
                      <div className="stat-box">
                        <div className="stat-label">Speed</div>
                        <div className="stat-value">{selectedCard.speed}</div>
                      </div>
                    )}
                    {selectedCard.willpower && (
                      <div className="stat-box">
                        <div className="stat-label">Willpower</div>
                        <div className="stat-value">{selectedCard.willpower}</div>
                      </div>
                    )}
                    {selectedCard.size && (
                      <div className="stat-box">
                        <div className="stat-label">Size</div>
                        <div className="stat-value">{selectedCard.size}</div>
                      </div>
                    )}
                    {selectedCard.health && (
                      <div className="stat-box">
                        <div className="stat-label">Health</div>
                        <div className="stat-value">{selectedCard.health}</div>
                      </div>
                    )}
                    {selectedCard.soulstone_cache && (
                      <div className="stat-box stat-box-soulstone">
                        <div className="stat-label">Soulstone</div>
                        <div className="stat-value">✦</div>
                      </div>
                    )}
                  </div>
                </section>

                {selectedCard.characteristics?.length > 0 && (
                  <section>
                    <h3>Characteristics</h3>
                    <div className="keywords-list">
                      {selectedCard.characteristics.map(c => (
                        <span key={c} className="keyword-tag characteristic">
                          {c}{c === 'Minion' && selectedCard.minion_limit ? `(${selectedCard.minion_limit})` : ''}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {selectedCard.keywords?.length > 0 && (
                  <section>
                    <h3>Keywords</h3>
                    <div className="keywords-list">
                      {selectedCard.keywords.map(k => (
                        <span key={k} className="keyword-tag">{k}</span>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h3>Info</h3>
                  <p><strong>Faction:</strong> {selectedCard.faction}</p>
                  {selectedCard.subfaction && <p><strong>Subfaction:</strong> {selectedCard.subfaction}</p>}
                  {selectedCard.card_type && (
                    <p><strong>Card Type:</strong> {selectedCard.card_type === 'Stat' ? 'Model' : selectedCard.card_type}</p>
                  )}
                  {selectedCard.base_size && <p><strong>Base Size:</strong> {selectedCard.base_size}</p>}
                </section>
              </div>
            </div>
          </div>
          
          <button 
            className="nav-arrow nav-arrow-right"
            onClick={(e) => { e.stopPropagation(); navigateCard('next'); }}
            aria-label="Next card"
          >
            ›
          </button>
        </div>
      )}

      {/* Objective Modal */}
      {selectedObjective && (
        <div className="modal-overlay" onClick={closeObjectiveModal}>
          <div className="modal objective-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <span className="objective-type-icon">
                  {selectedObjective.card_type === 'strategy' ? '⚔' : '◈'}
                </span>
                {selectedObjective.name}
              </h2>
              <button className="close-btn" onClick={closeObjectiveModal}>×</button>
            </div>
            <div className="objective-modal-body">
              <div className="objective-vp-display">
                <span className="vp-number">{selectedObjective.max_vp}</span>
                <span className="vp-text">Victory Points</span>
              </div>

              {selectedObjective.setup_text && (
                <section className="objective-section">
                  <h3>{selectedObjective.card_type === 'strategy' ? 'Setup' : 'Selection'}</h3>
                  <p>{selectedObjective.setup_text}</p>
                </section>
              )}

              {selectedObjective.reveal_condition && (
                <section className="objective-section">
                  <h3>Reveal</h3>
                  <p>{selectedObjective.reveal_condition}</p>
                </section>
              )}

              {selectedObjective.rules_text && (
                <section className="objective-section">
                  <h3>Rules</h3>
                  <p>{selectedObjective.rules_text}</p>
                </section>
              )}

              {selectedObjective.scoring_text && (
                <section className="objective-section">
                  <h3>Scoring</h3>
                  <p>{selectedObjective.scoring_text}</p>
                </section>
              )}

              {selectedObjective.additional_vp_text && (
                <section className="objective-section">
                  <h3>Additional VP</h3>
                  <p>{selectedObjective.additional_vp_text}</p>
                </section>
              )}

              {selectedObjective.next_available_schemes?.length > 0 && (
                <section className="objective-section">
                  <h3>Branches To</h3>
                  <div className="branches-list">
                    {selectedObjective.next_available_schemes.map((scheme, i) => (
                      <span key={i} className="branch-chip">{scheme}</span>
                    ))}
                  </div>
                </section>
              )}

              <section className="objective-section">
                <h3>Requirements Analysis</h3>
                <div className="requirements-grid">
                  {selectedObjective.requires_killing && (
                    <div className="req-item active">⚔ Requires Killing</div>
                  )}
                  {selectedObjective.requires_scheme_markers && (
                    <div className="req-item active">📍 Scheme Markers</div>
                  )}
                  {selectedObjective.requires_strategy_markers && (
                    <div className="req-item active">🎯 Strategy Markers</div>
                  )}
                  {selectedObjective.requires_positioning && (
                    <div className="req-item active">📐 Positioning</div>
                  )}
                  {selectedObjective.requires_terrain && (
                    <div className="req-item active">🏔 Terrain</div>
                  )}
                  {selectedObjective.requires_interact && (
                    <div className="req-item active">👆 Interact Actions</div>
                  )}
                </div>
              </section>

              {(selectedObjective.favors_roles?.length > 0 || selectedObjective.favors_abilities?.length > 0) && (
                <section className="objective-section">
                  <h3>Recommended Crew Roles</h3>
                  <div className="keywords-list">
                    {selectedObjective.favors_roles?.map(role => (
                      <span key={role} className="keyword-tag role-tag">{role.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                  {selectedObjective.favors_abilities?.length > 0 && (
                    <>
                      <h4 style={{marginTop: '0.5rem', color: '#888', fontSize: '0.85rem'}}>Useful Abilities</h4>
                      <div className="keywords-list">
                        {selectedObjective.favors_abilities?.map(ability => (
                          <span key={ability} className="keyword-tag ability-tag">{ability.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}

              <div className="objective-actions">
                <button 
                  className={`select-objective-btn ${
                    selectedObjective.card_type === 'strategy' 
                      ? (selectedStrategy === selectedObjective.id ? 'selected' : '')
                      : (selectedSchemes.includes(selectedObjective.id) ? 'selected' : '')
                  }`}
                  onClick={() => {
                    if (selectedObjective.card_type === 'strategy') {
                      setSelectedStrategy(selectedStrategy === selectedObjective.id ? '' : selectedObjective.id)
                    } else {
                      toggleScheme(selectedObjective.id)
                    }
                  }}
                >
                  {selectedObjective.card_type === 'strategy'
                    ? (selectedStrategy === selectedObjective.id ? '✓ Strategy Selected' : 'Select Strategy')
                    : (selectedSchemes.includes(selectedObjective.id) ? '✓ Scheme Selected' : 'Select Scheme')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
