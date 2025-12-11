import { useState, useMemo, useEffect } from 'react'
import cardData from './data/cards.json'

const IMAGE_BASE = 'https://raw.githubusercontent.com/profangrybeard/Malifaux4eDB-images/main'

// Display name for card types
const getCardTypeDisplay = (cardType) => {
  if (cardType === 'Stat') return 'Model'
  return cardType
}

function App() {
  // Filter state
  const [search, setSearch] = useState('')
  const [faction, setFaction] = useState('')
  const [baseSize, setBaseSize] = useState('')
  const [cardType, setCardType] = useState('')
  const [minCost, setMinCost] = useState('')
  const [maxCost, setMaxCost] = useState('')
  const [minHealth, setMinHealth] = useState('')
  const [maxHealth, setMaxHealth] = useState('')
  
  // Modal state
  const [selectedCard, setSelectedCard] = useState(null)
  const [modalView, setModalView] = useState('front')

  // Get cards array from data
  const cards = cardData.cards || []

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

  // FILTER CARDS
  const filteredCards = useMemo(() => {
    const searchLower = search.toLowerCase().trim()
    
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
      
      return true
    })
  }, [cards, search, faction, baseSize, cardType, minCost, maxCost, minHealth, maxHealth])

  // Open modal
  const openModal = (card) => {
    setSelectedCard(card)
    setModalView('front')
  }

  // Close modal
  const closeModal = () => {
    setSelectedCard(null)
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
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCard, filteredCards])

  return (
    <div className="app">
      <header className="header">
        <h1>Malifaux 4E Database</h1>
        <p className="header-sub">Card Browser</p>
      </header>

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
                {/* Stats overlay - only for Models */}
                {card.card_type === 'Stat' && (
                  <div className="card-stats-overlay">
                    <div className="stat-bar">
                      {card.defense && <span className="stat-item"><span className="stat-label">DF</span>{card.defense}</span>}
                      {card.speed && <span className="stat-item"><span className="stat-label">SP</span>{card.speed}</span>}
                      {card.willpower && <span className="stat-item"><span className="stat-label">WP</span>{card.willpower}</span>}
                      {card.size && <span className="stat-item"><span className="stat-label">SZ</span>{card.size}</span>}
                      <span className="stat-item stat-health"><span className="stat-label">HP</span>{card.health || 'N/D'}</span>
                      {(card.characteristics?.includes('Master') || card.characteristics?.includes('Henchman')) && (
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

      {selectedCard && (
        <div className="modal-overlay" onClick={closeModal}>
          {/* Previous card arrow */}
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
          
          {/* Next card arrow */}
          <button 
            className="nav-arrow nav-arrow-right"
            onClick={(e) => { e.stopPropagation(); navigateCard('next'); }}
            aria-label="Next card"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}

export default App
