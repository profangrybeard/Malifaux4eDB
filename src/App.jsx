import { useState, useMemo } from 'react'
import cardData from './data/cards.json'

const IMAGE_BASE = 'https://raw.githubusercontent.com/profangrybeard/Malifaux4eDB-images/main'

// Helper function to display card type names
const getCardTypeDisplay = (cardType) => {
  return cardType === 'Stat' ? 'Model' : cardType
}

function App() {
  const [search, setSearch] = useState('')
  const [faction, setFaction] = useState('')
  const [baseSize, setBaseSize] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)

  const allCards = useMemo(() => cardData.cards || [], [])

  // Get unique factions
  const factions = useMemo(() => {
    const set = new Set(allCards.map(c => c.faction).filter(Boolean))
    return [...set].sort()
  }, [allCards])

  // Get unique base sizes
  const baseSizes = useMemo(() => {
    const set = new Set(allCards.map(c => c.base_size).filter(Boolean))
    return [...set].sort((a, b) => {
      const aNum = parseInt(a)
      const bNum = parseInt(b)
      return aNum - bNum
    })
  }, [allCards])

  // Filter cards - THIS IS THE CRITICAL PART
  const filteredCards = useMemo(() => {
    console.log('=== FILTERING START ===')
    console.log('Total cards:', allCards.length)
    console.log('Filters:', { search, faction, baseSize })
    
    const result = allCards.filter(card => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const nameMatch = card.name?.toLowerCase().includes(searchLower)
        const keywordMatch = card.keywords?.some(k => k.toLowerCase().includes(searchLower))
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
      
      return true
    })
    
    console.log('Filtered result:', result.length, 'cards')
    console.log('First 3 cards:', result.slice(0, 3).map(c => ({ name: c.name, faction: c.faction, base: c.base_size })))
    console.log('=== FILTERING END ===')
    
    return result
  }, [allCards, search, faction, baseSize])

  const handleSearchChange = (e) => {
    const value = e.target.value
    console.log('Search changed to:', value)
    setSearch(value)
  }

  const handleFactionChange = (e) => {
    const value = e.target.value
    console.log('Faction changed to:', value)
    setFaction(value)
  }

  const handleBaseSizeChange = (e) => {
    const value = e.target.value
    console.log('Base size changed to:', value)
    setBaseSize(value)
  }

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
          onChange={handleSearchChange}
        />
        <select 
          className="filter-select"
          value={faction}
          onChange={handleFactionChange}
        >
          <option value="">All Factions</option>
          {factions.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select 
          className="filter-select"
          value={baseSize}
          onChange={handleBaseSizeChange}
        >
          <option value="">All Base Sizes</option>
          {baseSizes.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span className="result-count">{filteredCards.length} cards</span>
      </div>

      <div className="content">
        {filteredCards.length === 0 ? (
          <div className="empty">
            <h3>No cards found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="card-grid">
            {filteredCards.map((card) => (
              <CardItem 
                key={card.id} 
                card={card} 
                onClick={() => setSelectedCard(card)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  )
}

// Separate component for individual cards
function CardItem({ card, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      <img 
        className="card-image"
        src={`${IMAGE_BASE}/${card.front_image}`}
        alt={card.name}
        loading="lazy"
        onError={e => { 
          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">No Image</text></svg>' 
        }}
      />
      <div className="card-info">
        <h3 className="card-name">{card.name}</h3>
        <p className="card-meta">
          <span className="card-faction">{card.faction}</span>
          {card.subfaction && ` • ${card.subfaction}`}
        </p>
        {card.cost && (
          <div className="card-stats">
            <span className="stat">Cost: {card.cost}</span>
            {card.defense && <span className="stat">Df: {card.defense}</span>}
            {card.speed && <span className="stat">Sp: {card.speed}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function CardModal({ card, onClose }) {
  const [view, setView] = useState('front')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{card.name}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="modal-images">
            <div className="image-tabs">
              <button 
                className={view === 'front' ? 'active' : ''} 
                onClick={() => setView('front')}
              >
                Front
              </button>
              <button 
                className={view === 'back' ? 'active' : ''} 
                onClick={() => setView('back')}
              >
                Back
              </button>
            </div>
            <img 
              className="modal-image"
              src={`${IMAGE_BASE}/${view === 'front' ? card.front_image : card.back_image}`}
              alt={`${card.name} ${view}`}
            />
          </div>
          <div className="modal-details">
            <section>
              <h3>Stats</h3>
              <div className="stats-grid">
                {card.cost && <div className="stat-box"><div className="stat-label">Cost</div><div className="stat-value">{card.cost}</div></div>}
                {card.defense && <div className="stat-box"><div className="stat-label">Defense</div><div className="stat-value">{card.defense}</div></div>}
                {card.speed && <div className="stat-box"><div className="stat-label">Speed</div><div className="stat-value">{card.speed}</div></div>}
                {card.willpower && <div className="stat-box"><div className="stat-label">Willpower</div><div className="stat-value">{card.willpower}</div></div>}
                {card.size && <div className="stat-box"><div className="stat-label">Size</div><div className="stat-value">{card.size}</div></div>}
                {card.health && <div className="stat-box"><div className="stat-label">Health</div><div className="stat-value">{card.health}</div></div>}
              </div>
            </section>

            {card.characteristics?.length > 0 && (
              <section>
                <h3>Characteristics</h3>
                <div className="keywords-list">
                  {card.characteristics.map(c => (
                    <span key={c} className="keyword-tag characteristic">
                      {c}{c === 'Minion' && card.minion_limit ? `(${card.minion_limit})` : ''}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {card.keywords?.length > 0 && (
              <section>
                <h3>Keywords</h3>
                <div className="keywords-list">
                  {card.keywords.map(k => (
                    <span key={k} className="keyword-tag">{k}</span>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3>Info</h3>
              <p><strong>Faction:</strong> {card.faction}</p>
              {card.subfaction && <p><strong>Subfaction:</strong> {card.subfaction}</p>}
              {card.card_type && <p><strong>Card Type:</strong> {getCardTypeDisplay(card.card_type)}</p>}
              {card.base_size && <p><strong>Base Size:</strong> {card.base_size}</p>}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
