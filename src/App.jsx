import { useState, useMemo, useEffect, useCallback } from 'react'
import cardData from './data/cards.json'
import objectivesData from './data/objectives.json'

const IMAGE_BASE = 'https://raw.githubusercontent.com/profangrybeard/Malifaux4eDB-images/main'

// ═══════════════════════════════════════════════════════════════════════════════
// FACTION META DATA - Embedded from Longshanks tournament analysis (15,893 games)
// ═══════════════════════════════════════════════════════════════════════════════
const FACTION_META = {
  "Neverborn": {
    "overall": {"win_rate": 0.52, "games": 2554},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.43, "games": 260},
      "collapsing_mines": {"win_rate": 0.61, "games": 18},
      "informants": {"win_rate": 0.53, "games": 264},
      "plant_explosives": {"win_rate": 0.43, "games": 223},
      "recover_evidence": {"win_rate": 0.45, "games": 238}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.51, "games": 271},
      "breakthrough": {"win_rate": 0.55, "games": 163},
      "detonate_charges": {"win_rate": 0.57, "games": 231},
      "ensnare": {"win_rate": 0.46, "games": 191},
      "frame_job": {"win_rate": 0.49, "games": 173},
      "harness_the_ley_line": {"win_rate": 0.49, "games": 169},
      "leave_your_mark": {"win_rate": 0.47, "games": 184},
      "make_it_look_like_an_accident": {"win_rate": 0.56, "games": 154},
      "public_demonstration": {"win_rate": 0.53, "games": 80},
      "reshape_the_land": {"win_rate": 0.56, "games": 137},
      "runic_binding": {"win_rate": 0.55, "games": 193},
      "scout_the_rooftops": {"win_rate": 0.51, "games": 217},
      "search_the_area": {"win_rate": 0.58, "games": 197},
      "take_the_highground": {"win_rate": 0.58, "games": 241}
    }
  },
  "Explorers Society": {
    "overall": {"win_rate": 0.51, "games": 1902},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.46, "games": 204},
      "collapsing_mines": {"win_rate": 0.31, "games": 13},
      "informants": {"win_rate": 0.43, "games": 209},
      "plant_explosives": {"win_rate": 0.51, "games": 172},
      "recover_evidence": {"win_rate": 0.47, "games": 206}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.62, "games": 196},
      "breakthrough": {"win_rate": 0.59, "games": 181},
      "detonate_charges": {"win_rate": 0.55, "games": 174},
      "ensnare": {"win_rate": 0.53, "games": 173},
      "frame_job": {"win_rate": 0.41, "games": 151},
      "harness_the_ley_line": {"win_rate": 0.52, "games": 127},
      "leave_your_mark": {"win_rate": 0.58, "games": 139},
      "make_it_look_like_an_accident": {"win_rate": 0.67, "games": 105},
      "reshape_the_land": {"win_rate": 0.51, "games": 136},
      "runic_binding": {"win_rate": 0.50, "games": 145},
      "scout_the_rooftops": {"win_rate": 0.51, "games": 179},
      "search_the_area": {"win_rate": 0.56, "games": 146},
      "take_the_highground": {"win_rate": 0.62, "games": 181}
    }
  },
  "Ten Thunders": {
    "overall": {"win_rate": 0.51, "games": 1934},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.48, "games": 185},
      "collapsing_mines": {"win_rate": 0.27, "games": 15},
      "informants": {"win_rate": 0.35, "games": 163},
      "plant_explosives": {"win_rate": 0.43, "games": 159},
      "recover_evidence": {"win_rate": 0.44, "games": 170}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.47, "games": 182},
      "breakthrough": {"win_rate": 0.52, "games": 164},
      "detonate_charges": {"win_rate": 0.51, "games": 135},
      "ensnare": {"win_rate": 0.45, "games": 90},
      "frame_job": {"win_rate": 0.41, "games": 128},
      "harness_the_ley_line": {"win_rate": 0.44, "games": 102},
      "leave_your_mark": {"win_rate": 0.51, "games": 153},
      "make_it_look_like_an_accident": {"win_rate": 0.52, "games": 119},
      "public_demonstration": {"win_rate": 0.64, "games": 35},
      "reshape_the_land": {"win_rate": 0.55, "games": 131},
      "runic_binding": {"win_rate": 0.47, "games": 110},
      "scout_the_rooftops": {"win_rate": 0.48, "games": 167},
      "search_the_area": {"win_rate": 0.61, "games": 90},
      "take_the_highground": {"win_rate": 0.53, "games": 160}
    }
  },
  "Bayou": {
    "overall": {"win_rate": 0.51, "games": 1776},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.47, "games": 148},
      "collapsing_mines": {"win_rate": 0.00, "games": 4},
      "informants": {"win_rate": 0.41, "games": 145},
      "plant_explosives": {"win_rate": 0.46, "games": 136},
      "recover_evidence": {"win_rate": 0.37, "games": 141}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.54, "games": 138},
      "breakthrough": {"win_rate": 0.53, "games": 106},
      "detonate_charges": {"win_rate": 0.62, "games": 129},
      "ensnare": {"win_rate": 0.48, "games": 107},
      "frame_job": {"win_rate": 0.52, "games": 115},
      "harness_the_ley_line": {"win_rate": 0.62, "games": 123},
      "leave_your_mark": {"win_rate": 0.48, "games": 126},
      "make_it_look_like_an_accident": {"win_rate": 0.43, "games": 77},
      "reshape_the_land": {"win_rate": 0.52, "games": 61},
      "runic_binding": {"win_rate": 0.46, "games": 116},
      "scout_the_rooftops": {"win_rate": 0.52, "games": 112},
      "search_the_area": {"win_rate": 0.51, "games": 72},
      "take_the_highground": {"win_rate": 0.55, "games": 121}
    }
  },
  "Arcanists": {
    "overall": {"win_rate": 0.50, "games": 1694},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.41, "games": 177},
      "collapsing_mines": {"win_rate": 0.40, "games": 10},
      "informants": {"win_rate": 0.44, "games": 164},
      "plant_explosives": {"win_rate": 0.46, "games": 158},
      "recover_evidence": {"win_rate": 0.42, "games": 156}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.56, "games": 156},
      "breakthrough": {"win_rate": 0.63, "games": 119},
      "detonate_charges": {"win_rate": 0.60, "games": 154},
      "ensnare": {"win_rate": 0.55, "games": 122},
      "frame_job": {"win_rate": 0.54, "games": 100},
      "harness_the_ley_line": {"win_rate": 0.46, "games": 98},
      "leave_your_mark": {"win_rate": 0.64, "games": 116},
      "make_it_look_like_an_accident": {"win_rate": 0.49, "games": 84},
      "public_demonstration": {"win_rate": 0.61, "games": 44},
      "reshape_the_land": {"win_rate": 0.50, "games": 92},
      "runic_binding": {"win_rate": 0.48, "games": 121},
      "scout_the_rooftops": {"win_rate": 0.51, "games": 120},
      "search_the_area": {"win_rate": 0.58, "games": 60},
      "take_the_highground": {"win_rate": 0.55, "games": 124}
    }
  },
  "Guild": {
    "overall": {"win_rate": 0.50, "games": 1919},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.45, "games": 210},
      "collapsing_mines": {"win_rate": 0.50, "games": 10},
      "informants": {"win_rate": 0.31, "games": 200},
      "plant_explosives": {"win_rate": 0.51, "games": 168},
      "recover_evidence": {"win_rate": 0.47, "games": 205}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.50, "games": 207},
      "breakthrough": {"win_rate": 0.52, "games": 143},
      "detonate_charges": {"win_rate": 0.50, "games": 158},
      "ensnare": {"win_rate": 0.57, "games": 161},
      "frame_job": {"win_rate": 0.44, "games": 140},
      "harness_the_ley_line": {"win_rate": 0.52, "games": 124},
      "leave_your_mark": {"win_rate": 0.58, "games": 163},
      "make_it_look_like_an_accident": {"win_rate": 0.55, "games": 124},
      "public_demonstration": {"win_rate": 0.60, "games": 46},
      "reshape_the_land": {"win_rate": 0.51, "games": 92},
      "runic_binding": {"win_rate": 0.54, "games": 134},
      "scout_the_rooftops": {"win_rate": 0.52, "games": 175},
      "search_the_area": {"win_rate": 0.55, "games": 111},
      "take_the_highground": {"win_rate": 0.56, "games": 188}
    }
  },
  "Outcasts": {
    "overall": {"win_rate": 0.48, "games": 2193},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.46, "games": 229},
      "collapsing_mines": {"win_rate": 0.44, "games": 16},
      "informants": {"win_rate": 0.40, "games": 229},
      "plant_explosives": {"win_rate": 0.40, "games": 171},
      "recover_evidence": {"win_rate": 0.42, "games": 204}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.47, "games": 215},
      "breakthrough": {"win_rate": 0.52, "games": 146},
      "detonate_charges": {"win_rate": 0.51, "games": 157},
      "ensnare": {"win_rate": 0.47, "games": 135},
      "frame_job": {"win_rate": 0.45, "games": 172},
      "harness_the_ley_line": {"win_rate": 0.44, "games": 127},
      "leave_your_mark": {"win_rate": 0.46, "games": 135},
      "make_it_look_like_an_accident": {"win_rate": 0.40, "games": 86},
      "public_demonstration": {"win_rate": 0.56, "games": 63},
      "reshape_the_land": {"win_rate": 0.43, "games": 101},
      "runic_binding": {"win_rate": 0.48, "games": 126},
      "scout_the_rooftops": {"win_rate": 0.40, "games": 164},
      "search_the_area": {"win_rate": 0.51, "games": 120},
      "take_the_highground": {"win_rate": 0.47, "games": 165}
    }
  },
  "Resurrectionists": {
    "overall": {"win_rate": 0.48, "games": 1921},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.50, "games": 197},
      "collapsing_mines": {"win_rate": 0.38, "games": 8},
      "informants": {"win_rate": 0.37, "games": 190},
      "plant_explosives": {"win_rate": 0.40, "games": 150},
      "recover_evidence": {"win_rate": 0.45, "games": 186}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.46, "games": 160},
      "breakthrough": {"win_rate": 0.52, "games": 122},
      "detonate_charges": {"win_rate": 0.45, "games": 136},
      "ensnare": {"win_rate": 0.46, "games": 161},
      "frame_job": {"win_rate": 0.53, "games": 159},
      "harness_the_ley_line": {"win_rate": 0.47, "games": 149},
      "leave_your_mark": {"win_rate": 0.54, "games": 126},
      "make_it_look_like_an_accident": {"win_rate": 0.48, "games": 103},
      "public_demonstration": {"win_rate": 0.48, "games": 46},
      "reshape_the_land": {"win_rate": 0.44, "games": 116},
      "runic_binding": {"win_rate": 0.55, "games": 132},
      "scout_the_rooftops": {"win_rate": 0.53, "games": 131},
      "search_the_area": {"win_rate": 0.48, "games": 90},
      "take_the_highground": {"win_rate": 0.48, "games": 123}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE DESCRIPTIONS - for display in crew builder
// ═══════════════════════════════════════════════════════════════════════════════
const ROLE_DESCRIPTIONS = {
  'scheme_runner': {
    label: 'Scheme Runner',
    description: 'Fast, evasive models that score schemes',
    icon: '🏃'
  },
  'beater': {
    label: 'Beater',
    description: 'High damage dealers',
    icon: '⚔'
  },
  'tank': {
    label: 'Tank',
    description: 'Durable models that absorb damage',
    icon: '🛡'
  },
  'support': {
    label: 'Support',
    description: 'Buffs allies or heals',
    icon: '💫'
  },
  'control': {
    label: 'Control',
    description: 'Manipulates enemy positioning or actions',
    icon: '🎯'
  },
  'summoner': {
    label: 'Summoner',
    description: 'Creates new models',
    icon: '✨'
  },
  'marker_manipulation': {
    label: 'Marker Manipulation',
    description: 'Interacts with strategy/scheme markers',
    icon: '📍'
  },
  'condition_specialist': {
    label: 'Condition Specialist',
    description: 'Applies or removes conditions',
    icon: '🔮'
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE REQUIREMENTS - what cards need to satisfy objectives
// ═══════════════════════════════════════════════════════════════════════════════
const OBJECTIVE_REQUIREMENTS = {
  requires_killing: {
    key: 'killing',
    label: 'Kill Power',
    description: 'Damage dealers to take out enemy models',
    roles: ['beater'],
    abilities: ['execute', 'assassin', 'critical_strike'],
    thresholds: { strong: 4, adequate: 2, light: 1 }
  },
  requires_scheme_markers: {
    key: 'scheme_markers',
    label: 'Scheme Markers',
    description: 'Drop and interact with scheme markers',
    roles: ['scheme_runner', 'marker_manipulation'],
    abilities: ['drop_it', 'plant_evidence'],
    thresholds: { strong: 3, adequate: 2, light: 1 }
  },
  requires_positioning: {
    key: 'positioning',
    label: 'Positioning',
    description: 'Get to specific board positions',
    roles: ['scheme_runner'],
    abilities: ['flight', 'incorporeal', 'leap', 'nimble'],
    thresholds: { strong: 3, adequate: 2, light: 1 }
  },
  requires_interact: {
    key: 'interact',
    label: 'Interact Actions',
    description: 'Perform interact actions efficiently',
    roles: ['scheme_runner', 'marker_manipulation'],
    abilities: ['nimble', 'fast'],
    thresholds: { strong: 3, adequate: 2, light: 1 }
  },
  requires_terrain: {
    key: 'terrain',
    label: 'Terrain Usage',
    description: 'Climb, fly over, or interact with terrain',
    roles: ['scheme_runner'],
    abilities: ['flight', 'incorporeal', 'unimpeded'],
    thresholds: { strong: 2, adequate: 1, light: 1 }
  },
  requires_strategy_markers: {
    key: 'strategy_markers',
    label: 'Strategy Markers',
    description: 'Interact with strategy-specific markers',
    roles: ['marker_manipulation', 'scheme_runner'],
    abilities: [],
    thresholds: { strong: 3, adequate: 2, light: 1 }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNERGY SYSTEM - Detect beneficial interactions between models
// ═══════════════════════════════════════════════════════════════════════════════

// Role complementarity matrix - which roles work well together
const ROLE_SYNERGIES = {
  'tank': {
    synergizes: ['scheme_runner', 'support', 'beater'],
    reason: 'Tank holds attention while allies operate'
  },
  'scheme_runner': {
    synergizes: ['tank', 'control'],
    reason: 'Needs distraction to score safely'
  },
  'support': {
    synergizes: ['beater', 'tank', 'summoner'],
    reason: 'Buffs maximize elite model effectiveness'
  },
  'beater': {
    synergizes: ['support', 'control'],
    reason: 'Benefits from setup and buffs'
  },
  'control': {
    synergizes: ['beater', 'scheme_runner', 'assassin'],
    reason: 'Locks down targets for others'
  },
  'summoner': {
    synergizes: ['support', 'tank'],
    reason: 'Needs protection and activation efficiency'
  },
  'condition_specialist': {
    synergizes: ['beater', 'control'],
    reason: 'Conditions amplify damage and control'
  }
}

// Shared abilities that stack or combo well
const ABILITY_SYNERGIES = {
  'black_blood': {
    stacksWith: ['black_blood'],
    reason: 'Multiple Black Blood creates dangerous proximity damage zones',
    type: 'defensive_aura'
  },
  'terrifying': {
    stacksWith: ['manipulative', 'ruthless'],
    reason: 'WP pressure compounds',
    type: 'wp_pressure'
  },
  'ruthless': {
    counters: ['terrifying', 'manipulative'],
    reason: 'Ignores WP-based defenses',
    type: 'wp_bypass'
  },
  'armor': {
    synergizesWith: ['healing', 'shielded'],
    reason: 'Damage reduction + healing = very durable',
    type: 'durability'
  },
  'incorporeal': {
    synergizesWith: ['flight'],
    reason: 'Maximum mobility and damage reduction',
    type: 'mobility'
  }
}

// Resource generation/consumption patterns
const RESOURCE_PATTERNS = {
  corpse_markers: {
    generators: ['creates corpse', 'drop corpse', 'corpse marker within'],
    consumers: ['remove corpse', 'consume corpse', 'corpse marker to'],
    type: 'corpse'
  },
  scrap_markers: {
    generators: ['creates scrap', 'drop scrap', 'scrap marker within'],
    consumers: ['remove scrap', 'consume scrap', 'scrap marker to'],
    type: 'scrap'
  },
  scheme_markers: {
    generators: ['place a scheme marker', 'drop a scheme marker'],
    consumers: ['remove.*scheme marker', 'enemy scheme marker'],
    type: 'scheme'
  }
}

// Characteristic-based synergies
const CHARACTERISTIC_SYNERGIES = {
  'Totem': { synergizesWith: 'Master', strength: 1.0, reason: 'Designed to support their Master' },
  'Effigy': { synergizesWith: 'Emissary', strength: 0.9, reason: 'Can transform into Emissary' },
  'Henchman': { synergizesWith: 'Master', strength: 0.7, reason: 'Often has crew-wide buffs' }
}

// Anti-synergy patterns - things that work against each other
const ANTI_SYNERGY_PATTERNS = {
  resource_competition: {
    description: 'Both models consume the same resource',
    severity: 0.4
  },
  activation_hungry: {
    description: 'Both models need significant activation investment',
    roles: ['summoner', 'summoner'],
    severity: 0.3
  },
  positioning_conflict: {
    description: 'Models want to be in conflicting positions',
    severity: 0.3
  }
}

// Helper: Check if ability text contains a pattern
const abilityContains = (abilities, pattern) => {
  if (!abilities || !Array.isArray(abilities)) return false
  const regex = new RegExp(pattern, 'i')
  return abilities.some(a => {
    const text = a.text || a.name || ''
    return regex.test(text)
  })
}

// Helper: Get all ability text for a card
const getAbilityText = (card) => {
  if (!card.abilities) return ''
  return card.abilities.map(a => `${a.name || ''} ${a.text || ''}`).join(' ').toLowerCase()
}

// Helper: Check if card references a keyword in its abilities
const referencesKeyword = (card, keyword) => {
  if (!keyword) return false
  const text = getAbilityText(card)
  const patterns = [
    `friendly ${keyword.toLowerCase()}`,
    `other ${keyword.toLowerCase()}`,
    `${keyword.toLowerCase()} model`,
    `${keyword.toLowerCase()} only`
  ]
  return patterns.some(p => text.includes(p))
}

function App() {
  // State - View Mode
  const [viewMode, setViewMode] = useState('crew')
  
  // State - Filters
  const [search, setSearch] = useState('')
  const [faction, setFaction] = useState('')
  const [baseSize, setBaseSize] = useState('')
  const [cardType, setCardType] = useState('')
  const [minCost, setMinCost] = useState('')
  const [maxCost, setMaxCost] = useState('')
  const [minHealth, setMinHealth] = useState('')
  const [maxHealth, setMaxHealth] = useState('')
  const [soulstoneFilter, setSoulstoneFilter] = useState('')
  
  // State - Modal
  const [selectedCard, setSelectedCard] = useState(null)
  const [modalView, setModalView] = useState('dual') // 'dual', 'front', 'back'
  
  // State - Objectives selection (browse view)
  const [selectedStrategy, setSelectedStrategy] = useState('')
  const [selectedSchemes, setSelectedSchemes] = useState([])
  const [objectiveSearch, setObjectiveSearch] = useState('')
  const [selectedObjective, setSelectedObjective] = useState(null)
  
  // State - Meta faction selection
  const [metaFaction, setMetaFaction] = useState('')
  const [opponentFaction, setOpponentFaction] = useState('')
  const [opponentMaster, setOpponentMaster] = useState(null)
  const [opponentCrew, setOpponentCrew] = useState([])
  
  // State - Crew Builder
  const [selectedMaster, setSelectedMaster] = useState(null)
  const [hoveredMaster, setHoveredMaster] = useState(null)
  const [masterFilter, setMasterFilter] = useState('')
  const [crewRoster, setCrewRoster] = useState([])
  const [crewBudget, setCrewBudget] = useState(50)
  const [crewStrategy, setCrewStrategy] = useState('')
  const [crewSchemes, setCrewSchemes] = useState([])
  const [synergyPanelOpen, setSynergyPanelOpen] = useState(true)

  // Parse card data - handle both array and {cards: [...]} formats
  const allCards = useMemo(() => {
    return Array.isArray(cardData) ? cardData : (cardData.cards || [])
  }, [])
  
  const cards = useMemo(() => {
    return allCards.filter(card => card.card_type === 'Stat')
  }, [allCards])
  
  // Parse objectives data - handle various formats
  const { strategies, schemes, schemeList, strategyList } = useMemo(() => {
    let strats = {}
    let schs = {}
    
    if (Array.isArray(objectivesData)) {
      // Array format: [{card_type: 'scheme', ...}, {card_type: 'strategy', ...}]
      objectivesData.forEach(obj => {
        if (obj.card_type === 'strategy') {
          strats[obj.id] = obj
        } else if (obj.card_type === 'scheme') {
          schs[obj.id] = obj
        }
      })
    } else if (objectivesData) {
      // Object format: { schemes: {...}, strategies: {...} }
      if (objectivesData.schemes) {
        schs = typeof objectivesData.schemes === 'object' 
          ? objectivesData.schemes 
          : {}
      }
      if (objectivesData.strategies) {
        strats = typeof objectivesData.strategies === 'object'
          ? objectivesData.strategies
          : {}
      }
      // Also handle array wrappers
      const objectiveArray = objectivesData.objectives || objectivesData.cards || objectivesData.data || []
      if (Array.isArray(objectiveArray)) {
        objectiveArray.forEach(obj => {
          if (obj.card_type === 'strategy') {
            strats[obj.id] = obj
          } else if (obj.card_type === 'scheme') {
            schs[obj.id] = obj
          }
        })
      }
    }
    
    return { 
      strategies: strats, 
      schemes: schs,
      schemeList: Object.values(schs),
      strategyList: Object.values(strats)
    }
  }, [])

  // Get unique filter options
  const factions = useMemo(() => {
    const validFactions = ['Arcanists', 'Bayou', 'Explorer\'s Society', 'Guild', 'Neverborn', 'Outcasts', 'Resurrectionists', 'Ten Thunders']
    return [...new Set(cards.map(c => c.faction).filter(f => f && validFactions.includes(f)))].sort()
  }, [cards])
  const baseSizes = useMemo(() => [...new Set(cards.map(c => c.base_size).filter(Boolean))].sort(), [cards])
  const cardTypes = useMemo(() => {
    const cardArray = Array.isArray(cardData) ? cardData : (cardData.cards || [])
    return [...new Set(cardArray.map(c => c.card_type).filter(Boolean))].sort()
  }, [])
  const metaFactions = useMemo(() => Object.keys(FACTION_META).sort(), [])

  // Get masters for crew builder (deduplicated by name)
  const masters = useMemo(() => {
    const masterCards = cards.filter(card => 
      (card.characteristics || []).includes('Master')
    ).sort((a, b) => a.name.localeCompare(b.name))
    
    // Deduplicate by name - keep first occurrence (usually the stat card)
    const seen = new Set()
    return masterCards.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    })
  }, [cards])

  // Get keyword models for selected master (deduplicated)
  const keywordModels = useMemo(() => {
    if (!selectedMaster) return []
    const primaryKeyword = selectedMaster.primary_keyword
    if (!primaryKeyword) return []
    
    const filtered = cards.filter(card => 
      card.id !== selectedMaster.id &&
      (card.keywords || []).includes(primaryKeyword) &&
      !(card.characteristics || []).includes('Master')
    ).sort((a, b) => (b.cost || 0) - (a.cost || 0))
    
    // Deduplicate by name
    const seen = new Set()
    return filtered.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    })
  }, [selectedMaster, cards])

  // Get versatile models for selected master's faction (deduplicated)
  const versatileModels = useMemo(() => {
    if (!selectedMaster) return []
    const masterFaction = selectedMaster.faction
    const primaryKeyword = selectedMaster.primary_keyword
    
    const filtered = cards.filter(card => 
      card.faction === masterFaction &&
      (card.keywords || []).includes('Versatile') &&
      !(card.keywords || []).includes(primaryKeyword) &&
      !(card.characteristics || []).includes('Master')
    ).sort((a, b) => (b.cost || 0) - (a.cost || 0))
    
    // Deduplicate by name
    const seen = new Set()
    return filtered.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    })
  }, [selectedMaster, cards])

  // Get opponent faction's masters (deduplicated by name)
  const opponentMasters = useMemo(() => {
    if (!opponentFaction) return []
    const masterCards = cards.filter(card => 
      card.faction === opponentFaction &&
      (card.characteristics || []).includes('Master')
    ).sort((a, b) => a.name.localeCompare(b.name))
    
    // Deduplicate by name
    const seen = new Set()
    return masterCards.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    })
  }, [opponentFaction, cards])

  // Generate opponent crew with smart randomization and objective awareness
  const generateOpponentCrew = useCallback(() => {
    if (!opponentMaster) {
      setOpponentCrew([])
      return
    }
    
    const keyword = opponentMaster.primary_keyword
    if (!keyword) {
      setOpponentCrew([])
      return
    }
    
    // Get strategy-favored roles
    const strategyRoles = new Set()
    if (crewStrategy && strategies[crewStrategy]?.favors_roles) {
      strategies[crewStrategy].favors_roles.forEach(r => strategyRoles.add(r))
    }
    
    // Get scheme-favored roles
    const schemeRoles = new Set()
    crewSchemes.forEach(schemeId => {
      if (schemes[schemeId]?.favors_roles) {
        schemes[schemeId].favors_roles.forEach(r => schemeRoles.add(r))
      }
    })
    
    // Score a card for opponent crew (similar logic to player but with randomization)
    const scoreCard = (card) => {
      let score = 0
      const cardRoles = card.roles || []
      const characteristics = card.characteristics || []
      
      // Objective role matches
      strategyRoles.forEach(role => {
        if (cardRoles.includes(role)) score += 2
      })
      schemeRoles.forEach(role => {
        if (cardRoles.includes(role)) score += 1
      })
      
      // Base value by type
      if (characteristics.includes('Henchman')) score += 2
      if (characteristics.includes('Enforcer')) score += 1.5
      if (characteristics.includes('Totem')) score += 2.5
      if (characteristics.includes('Minion')) score += (card.cost || 4) * 0.15
      
      // Add randomization factor (±30% variation)
      const randomFactor = 0.7 + Math.random() * 0.6
      score *= randomFactor
      
      return score
    }
    
    // Get keyword pool
    const rawPool = cards.filter(card => 
      card.id !== opponentMaster.id &&
      (card.keywords || []).includes(keyword) &&
      !(card.characteristics || []).includes('Master')
    )
    
    const seen = new Set()
    const keywordPool = rawPool.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    }).map(card => ({
      ...card,
      opponentScore: scoreCard(card)
    })).sort((a, b) => b.opponentScore - a.opponentScore)
    
    // Build crew with budget
    const crew = []
    const targetBudget = 44 + Math.floor(Math.random() * 3) // 44-46ss target
    let currentBudget = 0
    const minionCounts = {}
    const usedNames = new Set()
    
    // Helper to try adding
    const tryAdd = (card) => {
      const cost = card.cost || 0
      if (currentBudget + cost > targetBudget + 4) return false // Allow slight overflow
      
      const isMinion = (card.characteristics || []).includes('Minion')
      
      if (usedNames.has(card.name)) {
        if (!isMinion) return false
        const count = minionCounts[card.name] || 0
        const limit = card.minion_limit || 3
        // Random chance to add duplicates (50%)
        if (count >= 1 && Math.random() > 0.5) return false
        if (count >= limit) return false
        minionCounts[card.name] = count + 1
      }
      
      if (isMinion && !usedNames.has(card.name)) {
        minionCounts[card.name] = 1
      }
      
      crew.push({ ...card, opponentRosterId: Date.now() + crew.length + Math.random() })
      currentBudget += cost
      usedNames.add(card.name)
      return true
    }
    
    // Phase 1: Totem (high chance but not guaranteed)
    const totem = keywordPool.find(c => (c.characteristics || []).includes('Totem'))
    if (totem && Math.random() > 0.15) { // 85% chance to take totem
      tryAdd(totem)
    }
    
    // Phase 2: Henchmen (usually take 1, sometimes 2)
    const henchmen = keywordPool.filter(c => (c.characteristics || []).includes('Henchman'))
    const shuffledHench = [...henchmen].sort(() => Math.random() - 0.5)
    const henchToTake = Math.random() > 0.6 ? 2 : 1
    for (let i = 0; i < Math.min(henchToTake, shuffledHench.length); i++) {
      if (currentBudget < targetBudget - 5) {
        tryAdd(shuffledHench[i])
      }
    }
    
    // Phase 3: Enforcers (take 1-2 based on score)
    const enforcers = keywordPool
      .filter(c => (c.characteristics || []).includes('Enforcer'))
      .sort((a, b) => b.opponentScore - a.opponentScore)
    const enfToTake = Math.random() > 0.5 ? 2 : 1
    for (let i = 0; i < Math.min(enfToTake, enforcers.length); i++) {
      if (currentBudget < targetBudget - 4) {
        tryAdd(enforcers[i])
      }
    }
    
    // Phase 4: Fill with minions (use scoring but with variety)
    const minions = keywordPool
      .filter(c => (c.characteristics || []).includes('Minion'))
      .sort((a, b) => b.opponentScore - a.opponentScore)
    
    // First pass: one of each high-scoring minion
    for (const minion of minions) {
      if (currentBudget >= targetBudget) break
      tryAdd(minion)
    }
    
    // Second pass: fill with duplicates if needed
    if (currentBudget < targetBudget - 4) {
      for (const minion of minions) {
        if (currentBudget >= targetBudget) break
        tryAdd(minion) // Will check limits internally
      }
    }
    
    setOpponentCrew(crew)
  }, [opponentMaster, cards, crewStrategy, crewSchemes, strategies, schemes])

  // Regenerate opponent crew when master or objectives change
  useEffect(() => {
    generateOpponentCrew()
  }, [opponentMaster, crewStrategy, crewSchemes])

  // Get opponent crew cost
  const opponentCrewCost = useMemo(() => {
    return opponentCrew.reduce((sum, card) => sum + (card.cost || 0), 0)
  }, [opponentCrew])
  
  // Opponent crew math (similar to player's crewMath)
  const opponentCrewMath = useMemo(() => {
    const models = opponentCrew.length
    const totalCost = opponentCrew.reduce((sum, card) => sum + (card.cost || 0), 0)
    const remaining = 50 - totalCost
    return {
      models,
      totalCost,
      remaining,
      ssPool: Math.min(6, Math.max(0, remaining))
    }
  }, [opponentCrew])

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREW MATH - Comprehensive cost tracking with M4E hiring rules
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const crewMath = useMemo(() => {
    if (!selectedMaster) {
      return {
        baseCost: 0,
        ookTax: 0,
        totalCost: 0,
        ookCount: 0,
        ookLimit: 2,
        minionCounts: {},
        models: []
      }
    }
    
    const primaryKeyword = selectedMaster.primary_keyword
    const minionCounts = {}
    let baseCost = 0
    let ookTax = 0
    let ookCount = 0
    
    const models = crewRoster.map(card => {
      const cost = card.cost || 0
      const isMinion = (card.characteristics || []).includes('Minion')
      
      // Check if model is in-keyword or out-of-keyword
      const cardKeywords = card.keywords || []
      const isInKeyword = cardKeywords.includes(primaryKeyword)
      const isVersatile = cardKeywords.includes('Versatile')
      const isOOK = !isInKeyword // Versatile counts as OOK for the limit
      
      // Track minion counts
      if (isMinion) {
        minionCounts[card.name] = (minionCounts[card.name] || 0) + 1
      }
      
      // Calculate tax (Versatile and OOK both pay +1ss)
      const tax = isOOK ? 1 : 0
      if (isOOK) ookCount++
      
      baseCost += cost
      ookTax += tax
      
      return {
        ...card,
        isInKeyword,
        isVersatile,
        isOOK,
        baseCost: cost,
        tax,
        effectiveCost: cost + tax
      }
    })
    
    return {
      baseCost,
      ookTax,
      totalCost: baseCost + ookTax,
      ookCount,
      ookLimit: 2,
      minionCounts,
      models
    }
  }, [crewRoster, selectedMaster])

  const remainingBudget = crewBudget - crewMath.totalCost

  // Check if a card can be added to crew
  const canAddToCrew = (card) => {
    if (!selectedMaster) return false
    
    const primaryKeyword = selectedMaster.primary_keyword
    const cardKeywords = card.keywords || []
    const isInKeyword = cardKeywords.includes(primaryKeyword)
    const isOOK = !isInKeyword
    
    // Calculate effective cost with tax
    const baseCost = card.cost || 0
    const tax = isOOK ? 1 : 0
    const effectiveCost = baseCost + tax
    
    // Check budget
    if (effectiveCost > remainingBudget) return false
    
    // Check OOK limit (max 2)
    if (isOOK && crewMath.ookCount >= crewMath.ookLimit) return false
    
    // Check minion limits
    if ((card.characteristics || []).includes('Minion')) {
      const currentCount = crewMath.minionCounts[card.name] || 0
      const limit = card.minion_limit || 3
      if (currentCount >= limit) return false
    } else {
      // Non-minions can only be hired once
      if (crewRoster.some(c => c.id === card.id)) return false
    }
    
    return true
  }
  
  // Check why a card can't be added (for UI feedback)
  const getHiringBlockReason = (card) => {
    if (!selectedMaster) return null
    
    const primaryKeyword = selectedMaster.primary_keyword
    const cardKeywords = card.keywords || []
    const isInKeyword = cardKeywords.includes(primaryKeyword)
    const isOOK = !isInKeyword
    
    const baseCost = card.cost || 0
    const tax = isOOK ? 1 : 0
    const effectiveCost = baseCost + tax
    
    if (isOOK && crewMath.ookCount >= crewMath.ookLimit) return 'ook-limit'
    if (effectiveCost > remainingBudget) return 'budget'
    
    if ((card.characteristics || []).includes('Minion')) {
      const currentCount = crewMath.minionCounts[card.name] || 0
      const limit = card.minion_limit || 3
      if (currentCount >= limit) return 'minion-limit'
    } else {
      if (crewRoster.some(c => c.id === card.id)) return 'already-hired'
    }
    
    return null
  }

  // Soulstone pool warning
  const ssPoolWarning = remainingBudget > 6

  // Add model to crew
  const addToCrew = (card) => {
    if (canAddToCrew(card)) {
      setCrewRoster([...crewRoster, { ...card, rosterId: Date.now() }])
    }
  }

  // Remove model from crew
  const removeFromCrew = (rosterId) => {
    setCrewRoster(crewRoster.filter(c => c.rosterId !== rosterId))
  }

  // Clear crew
  const clearCrew = () => {
    setCrewRoster([])
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUGGEST CREW - Auto-populate crew using objective scoring and heuristics
  // Priority: Strategy > Schemes, Diversity > Stacking, Target 44-46ss
  // ALWAYS fills to target - uses Versatile/OOK when keyword lacks objective fit
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Calculate keyword fit score for current objectives
  const keywordFitAnalysis = useMemo(() => {
    if (!selectedMaster) return { score: 0, maxScore: 0, percentage: 100, warning: null, suggestions: [] }
    
    // Get all required roles
    const requiredRoles = new Set()
    if (crewStrategy && strategies[crewStrategy]?.favors_roles) {
      strategies[crewStrategy].favors_roles.forEach(r => requiredRoles.add(r))
    }
    crewSchemes.forEach(schemeId => {
      if (schemes[schemeId]?.favors_roles) {
        schemes[schemeId].favors_roles.forEach(r => requiredRoles.add(r))
      }
    })
    
    if (requiredRoles.size === 0) return { score: 0, maxScore: 0, percentage: 100, warning: null, suggestions: [] }
    
    // Check how many roles the keyword pool can fill
    const keywordRoles = new Set()
    keywordModels.forEach(card => {
      (card.roles || []).forEach(role => {
        if (requiredRoles.has(role)) keywordRoles.add(role)
      })
    })
    
    // Check what versatile can add
    const versatileRoles = new Set()
    const versatileSuggestions = []
    versatileModels.forEach(card => {
      const matchingRoles = (card.roles || []).filter(r => requiredRoles.has(r) && !keywordRoles.has(r))
      if (matchingRoles.length > 0) {
        matchingRoles.forEach(r => versatileRoles.add(r))
        versatileSuggestions.push({
          card,
          roles: matchingRoles,
          rolesDisplay: matchingRoles.map(r => ROLE_DESCRIPTIONS[r]?.label || r).join(', ')
        })
      }
    })
    
    const coveredByKeyword = keywordRoles.size
    const totalRequired = requiredRoles.size
    const percentage = Math.round((coveredByKeyword / totalRequired) * 100)
    
    // Find missing roles
    const missingRoles = [...requiredRoles].filter(r => !keywordRoles.has(r))
    const missingRolesDisplay = missingRoles.map(r => ROLE_DESCRIPTIONS[r]?.label || r)
    
    let warning = null
    if (percentage < 50) {
      warning = {
        level: 'severe',
        message: `Your keyword lacks ${missingRolesDisplay.join(', ')} - consider Versatile/OOK`,
        missingRoles: missingRolesDisplay
      }
    } else if (percentage < 75) {
      warning = {
        level: 'moderate',
        message: `Limited keyword coverage for ${missingRolesDisplay.join(', ')}`,
        missingRoles: missingRolesDisplay
      }
    }
    
    return {
      score: coveredByKeyword,
      maxScore: totalRequired,
      percentage,
      warning,
      missingRoles: missingRolesDisplay,
      suggestions: versatileSuggestions.slice(0, 3) // Top 3 suggestions
    }
  }, [selectedMaster, crewStrategy, crewSchemes, keywordModels, versatileModels, strategies, schemes])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SYNERGY CALCULATOR - Reusable function for both player and opponent crews
  // ═══════════════════════════════════════════════════════════════════════════════
  const calculateCrewSynergies = useCallback((master, roster) => {
    if (!master || roster.length === 0) {
      return { synergies: [], antiSynergies: [], totalScore: 0, modelSynergyCounts: {} }
    }
    
    const allCrewModels = [master, ...roster]
    const synergies = []
    const antiSynergies = []
    const modelSynergyCounts = {}
    
    // Initialize synergy counts
    allCrewModels.forEach(m => {
      modelSynergyCounts[m.rosterId || m.opponentRosterId || m.id] = { synergies: 0, antiSynergies: 0 }
    })
    
    // Check each pair of models
    for (let i = 0; i < allCrewModels.length; i++) {
      for (let j = i + 1; j < allCrewModels.length; j++) {
        const modelA = allCrewModels[i]
        const modelB = allCrewModels[j]
        const idA = modelA.rosterId || modelA.opponentRosterId || modelA.id
        const idB = modelB.rosterId || modelB.opponentRosterId || modelB.id
        
        // ═══ SYNERGY DETECTION ═══
        
        // 1. Keyword synergies - model A's abilities reference model B's keyword
        const keywordA = modelA.primary_keyword || (modelA.keywords || [])[0]
        const keywordB = modelB.primary_keyword || (modelB.keywords || [])[0]
        
        if (keywordA && referencesKeyword(modelB, keywordA)) {
          synergies.push({
            modelA: modelA,
            modelB: modelB,
            type: 'keyword_buff',
            direction: 'B_buffs_A',
            strength: 0.8,
            reason: `${modelB.name} buffs ${keywordA} models`,
            icon: '🔗'
          })
          modelSynergyCounts[idA].synergies++
          modelSynergyCounts[idB].synergies++
        }
        
        if (keywordB && referencesKeyword(modelA, keywordB)) {
          synergies.push({
            modelA: modelA,
            modelB: modelB,
            type: 'keyword_buff',
            direction: 'A_buffs_B',
            strength: 0.8,
            reason: `${modelA.name} buffs ${keywordB} models`,
            icon: '🔗'
          })
          modelSynergyCounts[idA].synergies++
          modelSynergyCounts[idB].synergies++
        }
        
        // 2. Shared keyword (same keyword = designed to work together)
        const sharedKeywords = (modelA.keywords || []).filter(k => 
          (modelB.keywords || []).includes(k) && k !== 'Versatile'
        )
        if (sharedKeywords.length > 0 && modelA.id !== modelB.id) {
          synergies.push({
            modelA: modelA,
            modelB: modelB,
            type: 'shared_keyword',
            direction: 'bidirectional',
            strength: 0.6,
            reason: `Share ${sharedKeywords[0]} keyword`,
            icon: '👥'
          })
          modelSynergyCounts[idA].synergies++
          modelSynergyCounts[idB].synergies++
        }
        
        // 3. Role complementarity
        const rolesA = modelA.roles || []
        const rolesB = modelB.roles || []
        
        for (const roleA of rolesA) {
          const synData = ROLE_SYNERGIES[roleA]
          if (synData) {
            for (const roleB of rolesB) {
              if (synData.synergizes.includes(roleB)) {
                const existing = synergies.find(s => 
                  s.type === 'role_complement' &&
                  ((s.modelA.id === modelA.id && s.modelB.id === modelB.id) ||
                   (s.modelA.id === modelB.id && s.modelB.id === modelA.id))
                )
                if (!existing) {
                  synergies.push({
                    modelA: modelA,
                    modelB: modelB,
                    type: 'role_complement',
                    direction: 'bidirectional',
                    strength: 0.5,
                    reason: `${ROLE_DESCRIPTIONS[roleA]?.label || roleA} + ${ROLE_DESCRIPTIONS[roleB]?.label || roleB}`,
                    icon: '⚡'
                  })
                  modelSynergyCounts[idA].synergies++
                  modelSynergyCounts[idB].synergies++
                }
              }
            }
          }
        }
        
        // 4. Shared defensive abilities that stack
        const abilitiesA = (modelA.abilities || []).map(a => (a.name || '').toLowerCase())
        const abilitiesB = (modelB.abilities || []).map(a => (a.name || '').toLowerCase())
        
        for (const [abilityKey, abilityData] of Object.entries(ABILITY_SYNERGIES)) {
          const hasA = abilitiesA.some(a => a.includes(abilityKey.replace('_', ' ')))
          const hasB = abilitiesB.some(a => a.includes(abilityKey.replace('_', ' ')))
          
          if (hasA && hasB && abilityData.stacksWith?.includes(abilityKey)) {
            synergies.push({
              modelA: modelA,
              modelB: modelB,
              type: 'ability_stack',
              direction: 'bidirectional',
              strength: 0.7,
              reason: abilityData.reason,
              icon: '🔥'
            })
            modelSynergyCounts[idA].synergies++
            modelSynergyCounts[idB].synergies++
          }
        }
        
        // 5. Characteristic synergies (Totem + Master, etc)
        const charsA = modelA.characteristics || []
        const charsB = modelB.characteristics || []
        
        for (const [charType, charData] of Object.entries(CHARACTERISTIC_SYNERGIES)) {
          if (charsA.includes(charType) && charsB.includes(charData.synergizesWith)) {
            synergies.push({
              modelA: modelA,
              modelB: modelB,
              type: 'characteristic',
              direction: 'A_supports_B',
              strength: charData.strength,
              reason: charData.reason,
              icon: '✨'
            })
            modelSynergyCounts[idA].synergies++
            modelSynergyCounts[idB].synergies++
          }
          if (charsB.includes(charType) && charsA.includes(charData.synergizesWith)) {
            synergies.push({
              modelA: modelB,
              modelB: modelA,
              type: 'characteristic',
              direction: 'A_supports_B',
              strength: charData.strength,
              reason: charData.reason,
              icon: '✨'
            })
            modelSynergyCounts[idA].synergies++
            modelSynergyCounts[idB].synergies++
          }
        }
        
        // 6. Resource generation → consumption synergy
        const textA = getAbilityText(modelA)
        const textB = getAbilityText(modelB)
        
        for (const [resourceType, patterns] of Object.entries(RESOURCE_PATTERNS)) {
          const aGenerates = patterns.generators.some(p => textA.includes(p.toLowerCase()))
          const bConsumes = patterns.consumers.some(p => new RegExp(p, 'i').test(textB))
          const bGenerates = patterns.generators.some(p => textB.includes(p.toLowerCase()))
          const aConsumes = patterns.consumers.some(p => new RegExp(p, 'i').test(textA))
          
          if (aGenerates && bConsumes) {
            synergies.push({
              modelA: modelA,
              modelB: modelB,
              type: 'resource_flow',
              direction: 'A_feeds_B',
              strength: 0.75,
              reason: `${modelA.name} generates ${patterns.type} for ${modelB.name}`,
              icon: '🔄'
            })
            modelSynergyCounts[idA].synergies++
            modelSynergyCounts[idB].synergies++
          }
          if (bGenerates && aConsumes) {
            synergies.push({
              modelA: modelB,
              modelB: modelA,
              type: 'resource_flow',
              direction: 'A_feeds_B',
              strength: 0.75,
              reason: `${modelB.name} generates ${patterns.type} for ${modelA.name}`,
              icon: '🔄'
            })
            modelSynergyCounts[idA].synergies++
            modelSynergyCounts[idB].synergies++
          }
          
          // Anti-synergy: Resource competition
          if (aConsumes && bConsumes && !aGenerates && !bGenerates) {
            antiSynergies.push({
              modelA: modelA,
              modelB: modelB,
              type: 'resource_competition',
              strength: 0.4,
              reason: `Both consume ${patterns.type} markers`,
              icon: '⚠️'
            })
            modelSynergyCounts[idA].antiSynergies++
            modelSynergyCounts[idB].antiSynergies++
          }
        }
        
        // 7. Anti-synergy: Multiple summoners
        if (rolesA.includes('summoner') && rolesB.includes('summoner')) {
          antiSynergies.push({
            modelA: modelA,
            modelB: modelB,
            type: 'activation_competition',
            strength: 0.3,
            reason: 'Multiple summoners compete for activations',
            icon: '⚠️'
          })
          modelSynergyCounts[idA].antiSynergies++
          modelSynergyCounts[idB].antiSynergies++
        }
      }
    }
    
    // Calculate total synergy score
    const totalScore = synergies.reduce((sum, s) => sum + s.strength, 0) -
                       antiSynergies.reduce((sum, s) => sum + s.strength, 0)
    
    // Deduplicate synergies
    const uniqueSynergies = []
    const seenPairs = new Set()
    for (const syn of synergies) {
      const pairKey = [syn.modelA.id, syn.modelB.id, syn.type].sort().join('|')
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey)
        uniqueSynergies.push(syn)
      }
    }
    
    return {
      synergies: uniqueSynergies.sort((a, b) => b.strength - a.strength),
      antiSynergies,
      totalScore: Math.round(totalScore * 10) / 10,
      modelSynergyCounts
    }
  }, [])
  
  // Player crew synergies
  const crewSynergies = useMemo(() => {
    return calculateCrewSynergies(selectedMaster, crewRoster)
  }, [selectedMaster, crewRoster, calculateCrewSynergies])
  
  // Opponent crew synergies
  const opponentCrewSynergies = useMemo(() => {
    return calculateCrewSynergies(opponentMaster, opponentCrew)
  }, [opponentMaster, opponentCrew, calculateCrewSynergies])
  
  const suggestCrew = () => {
    if (!selectedMaster) return
    
    const targetBudget = 44 // Aim for 44ss, accept 45-46
    const maxBudget = 50 // Allow up to 50 to ensure we fill
    const minBudget = 42 // Minimum acceptable
    
    // Get strategy-favored roles (higher priority - worth 5VP)
    const strategyRoles = new Set()
    if (crewStrategy && strategies[crewStrategy]?.favors_roles) {
      strategies[crewStrategy].favors_roles.forEach(r => strategyRoles.add(r))
    }
    
    // Get scheme-favored roles (lower priority - worth 2VP each)
    const schemeRoles = new Set()
    crewSchemes.forEach(schemeId => {
      if (schemes[schemeId]?.favors_roles) {
        schemes[schemeId].favors_roles.forEach(r => schemeRoles.add(r))
      }
    })
    
    // Score a card for crew selection
    const scoreCard = (card, isOOK = false) => {
      let score = 0
      const cardRoles = card.roles || []
      const characteristics = card.characteristics || []
      
      // Strategy role matches (high priority)
      strategyRoles.forEach(role => {
        if (cardRoles.includes(role)) score += 3
      })
      
      // Scheme role matches (lower priority)
      schemeRoles.forEach(role => {
        if (cardRoles.includes(role)) score += 1
      })
      
      // Bonus for versatile roles that help multiple objectives
      const roleCount = cardRoles.filter(r => strategyRoles.has(r) || schemeRoles.has(r)).length
      if (roleCount >= 2) score += 1
      
      // Base value by model type (ensures we always have a score)
      if (characteristics.includes('Totem')) score += 2.5
      if (characteristics.includes('Henchman')) score += 2
      if (characteristics.includes('Enforcer')) score += 1.5
      if (characteristics.includes('Minion')) score += (card.cost || 4) * 0.15
      
      // Small penalty for OOK (prefer keyword when equal)
      if (isOOK) score -= 0.5
      
      // Cost efficiency bonus
      score += (10 - (card.cost || 5)) * 0.05
      
      return score
    }
    
    // Build candidate pools
    const keywordPool = keywordModels.map(card => ({
      ...card,
      suggestionScore: scoreCard(card, false),
      isOOK: false,
      poolType: 'keyword'
    }))
    
    const versatilePool = versatileModels.map(card => ({
      ...card,
      suggestionScore: scoreCard(card, true),
      isOOK: true,
      poolType: 'versatile'
    }))
    
    // Combine and sort all candidates
    const allCandidates = [...keywordPool, ...versatilePool].sort((a, b) => b.suggestionScore - a.suggestionScore)
    
    // Build the crew
    const suggestedCrew = []
    let currentBudget = 0
    const minionCounts = {}
    const usedNames = new Set()
    let ookCount = 0
    const ookLimit = 2
    
    // Helper to try adding a card
    const tryAdd = (card) => {
      const isOOK = card.isOOK
      const tax = isOOK ? 1 : 0
      const cost = (card.cost || 0) + tax
      const isMinion = (card.characteristics || []).includes('Minion')
      
      // Check budget (allow up to maxBudget)
      if (currentBudget + cost > maxBudget) return false
      
      // Check OOK limit
      if (isOOK && ookCount >= ookLimit) return false
      
      // Handle duplicates
      if (usedNames.has(card.name)) {
        if (!isMinion) return false
        const count = minionCounts[card.name] || 0
        const limit = card.minion_limit || 3
        if (count >= limit) return false
        minionCounts[card.name] = count + 1
      } else {
        if (isMinion) minionCounts[card.name] = 1
      }
      
      // Add to crew
      suggestedCrew.push({ ...card, rosterId: Date.now() + suggestedCrew.length })
      currentBudget += cost
      usedNames.add(card.name)
      if (isOOK) ookCount++
      
      return true
    }
    
    // Phase 1: Totem (high value, usually want it)
    const totem = keywordPool.find(c => (c.characteristics || []).includes('Totem'))
    if (totem) tryAdd(totem)
    
    // Phase 2: High-scoring unique models (diversity first)
    for (const card of allCandidates) {
      if ((card.characteristics || []).includes('Totem')) continue
      if (usedNames.has(card.name)) continue
      if (currentBudget >= targetBudget) break
      tryAdd(card)
    }
    
    // Phase 3: Fill with duplicates if still under target
    let fillAttempts = 0
    while (currentBudget < minBudget && fillAttempts < 20) {
      fillAttempts++
      let added = false
      
      // Try minion duplicates sorted by score
      const minions = allCandidates
        .filter(c => (c.characteristics || []).includes('Minion'))
        .sort((a, b) => b.suggestionScore - a.suggestionScore)
      
      for (const card of minions) {
        if (currentBudget >= targetBudget) break
        if (tryAdd(card)) {
          added = true
          break
        }
      }
      
      if (!added) break // Can't add anything more
    }
    
    // Phase 4: Final fill - if still way under, take anything that fits
    if (currentBudget < minBudget) {
      const anyModel = allCandidates.filter(c => !usedNames.has(c.name) || (c.characteristics || []).includes('Minion'))
      for (const card of anyModel) {
        if (currentBudget >= minBudget) break
        tryAdd(card)
      }
    }
    
    setCrewRoster(suggestedCrew)
  }

  // Toggle crew scheme selection
  // Toggle scheme in the available pool (3 schemes available per encounter)
  const toggleCrewScheme = (schemeId) => {
    if (crewSchemes.includes(schemeId)) {
      setCrewSchemes(crewSchemes.filter(s => s !== schemeId))
    } else if (crewSchemes.length < 3) {
      setCrewSchemes([...crewSchemes, schemeId])
    }
  }

  // Get favored roles for current crew objectives
  const crewFavoredRoles = useMemo(() => {
    const roles = new Set()
    
    if (crewStrategy && strategies[crewStrategy]?.favors_roles) {
      strategies[crewStrategy].favors_roles.forEach(r => roles.add(r))
    }
    
    crewSchemes.forEach(schemeId => {
      if (schemes[schemeId]?.favors_roles) {
        schemes[schemeId].favors_roles.forEach(r => roles.add(r))
      }
    })
    
    return roles
  }, [crewStrategy, crewSchemes, strategies, schemes])

  // Calculate objective score for a card
  const getObjectiveScore = (card) => {
    let score = 0
    const cardRoles = card.roles || []
    
    crewFavoredRoles.forEach(role => {
      if (cardRoles.includes(role)) score += 1
    })
    
    return score
  }

  // Render stars with colorblind-friendly styling
  // Uses blue→purple→gold progression (safe for red-green colorblindness)
  const renderStars = (score, maxStars = 3) => {
    if (score <= 0) return null
    const displayScore = Math.min(score, maxStars)
    const levelClass = score >= 3 ? 'excellent' : score >= 2 ? 'good' : 'some'
    
    return (
      <span 
        className={`star-rating star-level-${levelClass}`}
        title={`Matches ${score} role(s) needed for your objectives`}
      >
        {'★'.repeat(displayScore)}
      </span>
    )
  }

  // Get the crew card for selected master
  const selectedCrewCard = useMemo(() => {
    if (!selectedMaster) return null
    
    const keyword = selectedMaster.primary_keyword
    if (!keyword) return null
    
    // Normalize for comparison (remove hyphens, lowercase)
    const normalizeKeyword = (k) => k?.toLowerCase().replace(/-/g, ' ').trim()
    const normalizedKeyword = normalizeKeyword(keyword)
    
    // Find crew card by subfaction (primary match method)
    const bySubfaction = allCards.find(card => 
      card.card_type === 'Crew' &&
      normalizeKeyword(card.subfaction) === normalizedKeyword
    )
    if (bySubfaction) return bySubfaction
    
    // Fallback: check if keyword appears in crew card's keywords array
    const byKeywordArray = allCards.find(card =>
      card.card_type === 'Crew' &&
      (card.keywords || []).some(k => normalizeKeyword(k) === normalizedKeyword)
    )
    if (byKeywordArray) return byKeywordArray
    
    // Last resort: name matching
    return allCards.find(card => 
      card.card_type === 'Crew' &&
      card.name.toLowerCase().includes(selectedMaster.name.split(',')[0].toLowerCase())
    )
  }, [selectedMaster, allCards])
  
  // Also create a lookup function for opponent crew card
  const getCrewCardForMaster = useCallback((master) => {
    if (!master?.primary_keyword) return null
    
    const normalizeKeyword = (k) => k?.toLowerCase().replace(/-/g, ' ').trim()
    const normalizedKeyword = normalizeKeyword(master.primary_keyword)
    
    return allCards.find(card => 
      card.card_type === 'Crew' &&
      normalizeKeyword(card.subfaction) === normalizedKeyword
    ) || allCards.find(card =>
      card.card_type === 'Crew' &&
      (card.keywords || []).some(k => normalizeKeyword(k) === normalizedKeyword)
    )
  }, [allCards])
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // CREW CARD TEXT ANALYSIS - Extract and highlight relevant rules
  // ═══════════════════════════════════════════════════════════════════════════════
  const analyzeCrewCardText = useCallback((crewCard, hiredModels) => {
    if (!crewCard?.raw_text) return null
    
    const text = crewCard.raw_text
    const lines = text.split('\n').filter(l => l.trim())
    
    // Get characteristics and keywords from hired models
    const hiredCharacteristics = new Set()
    const hiredKeywords = new Set()
    const hiredNames = new Set()
    
    hiredModels.forEach(m => {
      (m.characteristics || []).forEach(c => hiredCharacteristics.add(c.toLowerCase()))
      ;(m.keywords || []).forEach(k => hiredKeywords.add(k.toLowerCase()))
      hiredNames.add(m.name?.toLowerCase().split(',')[0])
    })
    
    // Patterns to look for in crew card text
    const relevantPatterns = [
      /friendly\s+(\w+)\s+models?\s+gain/gi,
      /friendly\s+non-(\w+)/gi,
      /friendly\s+(\w+)\s+(?:minion|enforcer|henchman)/gi,
      /(\w+)\s+models?\s+within/gi,
      /after\s+(?:a\s+)?friendly\s+(\w+)/gi,
      /when\s+(?:a\s+)?friendly\s+(\w+)/gi,
    ]
    
    // Analyze each line
    const analysis = {
      activeRules: [],    // Rules that apply to your hired models
      inactiveRules: [],  // Rules for models you don't have
      generalRules: [],   // Rules that apply generally
    }
    
    // Track rule blocks (crew cards have sections)
    let currentSection = ''
    
    lines.forEach((line, idx) => {
      const lineLower = line.toLowerCase()
      
      // Detect section headers
      if (lineLower.includes('gain the following')) {
        currentSection = line
        return
      }
      
      // Skip card name and master name lines
      if (idx < 2) return
      
      // Check if line references specific model types
      let isRelevant = false
      let mentionedTypes = []
      
      // Check for characteristic mentions (Minion, Totem, etc.)
      const charMatches = lineLower.match(/\b(master|totem|henchman|enforcer|minion|peon)\b/g)
      if (charMatches) {
        charMatches.forEach(char => {
          mentionedTypes.push(char)
          if (hiredCharacteristics.has(char)) isRelevant = true
        })
      }
      
      // Check for keyword mentions
      hiredKeywords.forEach(kw => {
        if (lineLower.includes(kw)) {
          isRelevant = true
          mentionedTypes.push(kw)
        }
      })
      
      // Check for specific model name mentions
      hiredNames.forEach(name => {
        if (name && lineLower.includes(name)) {
          isRelevant = true
          mentionedTypes.push(name)
        }
      })
      
      // Categorize the line
      if (mentionedTypes.length > 0) {
        if (isRelevant) {
          analysis.activeRules.push({ text: line, mentions: mentionedTypes, section: currentSection })
        } else {
          analysis.inactiveRules.push({ text: line, mentions: mentionedTypes, section: currentSection })
        }
      } else if (line.length > 20 && !line.match(/^[A-Z\s]+$/)) {
        // General rules (not just headers)
        analysis.generalRules.push({ text: line, section: currentSection })
      }
    })
    
    return analysis
  }, [])
  
  // Analyze your crew card
  const crewCardAnalysis = useMemo(() => {
    if (!selectedCrewCard || !selectedMaster) return null
    const allHired = [selectedMaster, ...crewRoster]
    return analyzeCrewCardText(selectedCrewCard, allHired)
  }, [selectedCrewCard, selectedMaster, crewRoster, analyzeCrewCardText])
  
  // Analyze opponent crew card  
  const opponentCrewCardAnalysis = useMemo(() => {
    if (!opponentMaster) return null
    const oppCrewCard = getCrewCardForMaster(opponentMaster)
    if (!oppCrewCard) return null
    const allOppHired = [opponentMaster, ...opponentCrew]
    return analyzeCrewCardText(oppCrewCard, allOppHired)
  }, [opponentMaster, opponentCrew, getCrewCardForMaster, analyzeCrewCardText])

  // Helper to check if a model covers a requirement
  const modelCoversRequirement = (card, reqDef) => {
    const cardRoles = card.roles || []
    const cardAbilities = (card.abilities || []).map(a => a.name?.toLowerCase())
    
    // Check roles
    if (reqDef.roles.some(r => cardRoles.includes(r))) return true
    
    // Check abilities
    if (reqDef.abilities.some(a => cardAbilities.includes(a))) return true
    
    return false
  }

  // Analyze crew against objectives
  const crewAnalysis = useMemo(() => {
    if (!selectedMaster) return { objectives: [], gaps: [], suggestions: [] }
    
    const analysis = {
      objectives: [],
      gaps: [],
      suggestions: []
    }
    
    // Get all crew models including master
    const allCrewModels = [selectedMaster, ...crewRoster]
    
    // Get selected objectives
    const selectedObjectives = []
    if (crewStrategy && strategies[crewStrategy]) {
      selectedObjectives.push(strategies[crewStrategy])
    }
    crewSchemes.forEach(schemeId => {
      if (schemes[schemeId]) {
        selectedObjectives.push(schemes[schemeId])
      }
    })
    
    // Analyze each objective
    selectedObjectives.forEach(objective => {
      const objectiveAnalysis = {
        id: objective.id,
        name: objective.name,
        type: objective.type,
        requirements: []
      }
      
      // Check each requirement type
      Object.entries(OBJECTIVE_REQUIREMENTS).forEach(([reqKey, reqDef]) => {
        if (objective[reqKey]) {
          // Find models that cover this requirement
          const coveringModels = allCrewModels.filter(card => 
            modelCoversRequirement(card, reqDef)
          )
          
          const count = coveringModels.length
          const { strong, adequate, light } = reqDef.thresholds
          
          let level = 'missing'
          if (count >= strong) level = 'strong'
          else if (count >= adequate) level = 'adequate'
          else if (count >= light) level = 'light'
          
          const requirement = {
            key: reqDef.key,
            label: reqDef.label,
            description: reqDef.description,
            count,
            level,
            models: coveringModels.map(m => m.name)
          }
          
          objectiveAnalysis.requirements.push(requirement)
          
          // Track gaps
          if (level === 'missing' || level === 'light') {
            analysis.gaps.push({
              objective: objective.name,
              requirement: reqDef.label,
              level,
              roles: reqDef.roles
            })
          }
        }
      })
      
      // Also track favored roles coverage
      if (objective.favors_roles && objective.favors_roles.length > 0) {
        objective.favors_roles.forEach(role => {
          const coveringModels = allCrewModels.filter(card => 
            (card.roles || []).includes(role)
          )
          
          const existing = objectiveAnalysis.requirements.find(r => 
            r.key === `role_${role}`
          )
          
          if (!existing) {
            const count = coveringModels.length
            let level = 'missing'
            if (count >= 3) level = 'strong'
            else if (count >= 2) level = 'adequate'
            else if (count >= 1) level = 'light'
            
            objectiveAnalysis.requirements.push({
              key: `role_${role}`,
              label: ROLE_DESCRIPTIONS[role]?.label || role,
              description: ROLE_DESCRIPTIONS[role]?.description || '',
              count,
              level,
              models: coveringModels.map(m => m.name),
              isRole: true
            })
            
            if (level === 'missing') {
              analysis.gaps.push({
                objective: objective.name,
                requirement: ROLE_DESCRIPTIONS[role]?.label || role,
                level,
                roles: [role]
              })
            }
          }
        })
      }
      
      analysis.objectives.push(objectiveAnalysis)
    })
    
    // Generate suggestions based on gaps
    if (analysis.gaps.length > 0) {
      const neededRoles = new Set()
      analysis.gaps.forEach(gap => {
        gap.roles.forEach(r => neededRoles.add(r))
      })
      
      // Find available models that fill gaps
      const availableModels = [...keywordModels, ...versatileModels]
        .filter(card => !crewRoster.some(c => c.id === card.id))
        .filter(card => (card.cost || 0) <= remainingBudget)
      
      const scoredSuggestions = availableModels.map(card => {
        const cardRoles = card.roles || []
        let score = 0
        const filledRoles = []
        
        neededRoles.forEach(role => {
          if (cardRoles.includes(role)) {
            score += 2
            filledRoles.push(role)
          }
        })
        
        // Also check tag matches
        analysis.gaps.forEach(gap => {
          const reqDef = Object.values(OBJECTIVE_REQUIREMENTS).find(r => 
            r.label === gap.requirement
          )
          if (reqDef && modelCoversRequirement(card, reqDef)) {
            score += 1
            if (!filledRoles.includes(gap.requirement)) {
              filledRoles.push(gap.requirement)
            }
          }
        })
        
        return { card, score, filledRoles }
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      
      analysis.suggestions = scoredSuggestions
    }
    
    return analysis
  }, [selectedMaster, crewRoster, crewStrategy, crewSchemes, strategies, schemes, 
      keywordModels, versatileModels, remainingBudget])

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHEME COVERAGE ANALYSIS - Can your crew score EACH scheme in the pool?
  // ═══════════════════════════════════════════════════════════════════════════════
  const schemeCoverage = useMemo(() => {
    if (!selectedMaster || crewSchemes.length === 0) return []
    
    const allCrewModels = [selectedMaster, ...crewRoster]
    
    return crewSchemes.map(schemeId => {
      const scheme = schemes[schemeId]
      if (!scheme) return null
      
      // Count models that can contribute to this scheme
      const contributingModels = []
      const matchedRoles = new Set()
      const matchedAbilities = new Set()
      
      allCrewModels.forEach(card => {
        const cardRoles = card.roles || []
        const cardAbilities = (card.abilities || []).map(a => a.name?.toLowerCase())
        const cardTags = card.tags || []
        
        let contributes = false
        
        // Check favored roles
        if (scheme.favors_roles) {
          scheme.favors_roles.forEach(role => {
            if (cardRoles.includes(role)) {
              contributes = true
              matchedRoles.add(role)
            }
          })
        }
        
        // Check favored abilities
        if (scheme.favors_abilities) {
          scheme.favors_abilities.forEach(ability => {
            const abilityLower = ability.toLowerCase()
            if (cardAbilities.some(a => a?.includes(abilityLower)) ||
                cardTags.some(t => t.toLowerCase().includes(abilityLower))) {
              contributes = true
              matchedAbilities.add(ability)
            }
          })
        }
        
        // Check specific scheme requirements
        if (scheme.requires_scheme_markers) {
          // Models with Interact or scheme marker abilities
          if (cardTags.some(t => t.toLowerCase().includes('scheme')) ||
              cardRoles.includes('scheme_runner')) {
            contributes = true
          }
        }
        
        if (scheme.requires_killing) {
          if (cardRoles.includes('beater') || cardRoles.includes('assassin') ||
              cardRoles.includes('melee_damage') || cardRoles.includes('ranged_damage')) {
            contributes = true
          }
        }
        
        if (contributes) {
          contributingModels.push(card.name)
        }
      })
      
      // Determine coverage level
      const count = contributingModels.length
      let level, icon, message
      
      if (count >= 3) {
        level = 'strong'
        icon = '✓'
        message = `${count} models can score this`
      } else if (count >= 2) {
        level = 'adequate'
        icon = '○'
        message = `${count} models - workable`
      } else if (count >= 1) {
        level = 'light'
        icon = '⚠'
        message = `Only ${count} model - risky`
      } else {
        level = 'missing'
        icon = '✗'
        message = 'No models can score this!'
      }
      
      // Get meta win rate if available
      const winRate = scheme.meta?.average_win_rate
      
      return {
        id: schemeId,
        name: scheme.name,
        count,
        level,
        icon,
        message,
        models: contributingModels,
        matchedRoles: Array.from(matchedRoles),
        matchedAbilities: Array.from(matchedAbilities),
        winRate,
        favoredRoles: scheme.favors_roles || [],
        favoredAbilities: scheme.favors_abilities || []
      }
    }).filter(Boolean)
  }, [selectedMaster, crewRoster, crewSchemes, schemes])

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
      // Search filter
      if (searchLower) {
        const nameMatch = card.name && card.name.toLowerCase().includes(searchLower)
        const keywordMatch = card.keywords && card.keywords.some(k => 
          k.toLowerCase().includes(searchLower)
        )
        if (!nameMatch && !keywordMatch) {
          return false
        }
      }
      
      if (faction && card.faction !== faction) return false
      if (baseSize && card.base_size !== baseSize) return false
      if (cardType && card.card_type !== cardType) return false
      if (minCost !== '' && (card.cost === null || card.cost < parseInt(minCost))) return false
      if (maxCost !== '' && (card.cost === null || card.cost > parseInt(maxCost))) return false
      if (minHealth !== '' && (card.health === null || card.health === undefined || card.health < parseInt(minHealth))) return false
      if (maxHealth !== '' && (card.health === null || card.health === undefined || card.health > parseInt(maxHealth))) return false
      if (soulstoneFilter === 'yes' && !card.soulstone_cache) return false
      if (soulstoneFilter === 'no' && card.soulstone_cache) return false
      
      return true
    }).map(card => {
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
      // Sort by objective score first if objectives are selected
      if (favoredRoles.size > 0 || favoredAbilities.size > 0) {
        if (b.objectiveScore !== a.objectiveScore) {
          return b.objectiveScore - a.objectiveScore
        }
      }
      return a.name.localeCompare(b.name)
    })
  }, [cards, search, faction, baseSize, cardType, minCost, maxCost, minHealth, maxHealth, 
      soulstoneFilter, selectedSchemes, selectedStrategy, schemes, strategies])

  // Filter objectives
  const filteredStrategies = useMemo(() => {
    const searchLower = objectiveSearch.toLowerCase().trim()
    return strategyList.filter(s => 
      !searchLower || s.name.toLowerCase().includes(searchLower)
    )
  }, [strategyList, objectiveSearch])

  const filteredSchemes = useMemo(() => {
    const searchLower = objectiveSearch.toLowerCase().trim()
    return schemeList.filter(s => 
      !searchLower || s.name.toLowerCase().includes(searchLower)
    )
  }, [schemeList, objectiveSearch])

  // Modal functions
  const [modalNavigationList, setModalNavigationList] = useState([])
  
  const openModal = (card, navigationList = null) => {
    setSelectedCard(card)
    setModalView('dual')
    // Set navigation list - if provided, use it; otherwise default to filteredCards
    setModalNavigationList(navigationList || filteredCards)
  }
  
  const closeModal = () => {
    setSelectedCard(null)
    setModalNavigationList([])
  }

  // Navigate between cards using the modal's navigation list
  const navigateCard = (direction) => {
    if (!selectedCard || modalNavigationList.length === 0) return
    
    // Find current card in navigation list (match by id or rosterId for crew cards)
    const currentIndex = modalNavigationList.findIndex(c => 
      c.rosterId ? c.rosterId === selectedCard.rosterId : c.id === selectedCard.id
    )
    if (currentIndex === -1) return
    
    let newIndex
    if (direction === 'next') {
      newIndex = currentIndex + 1 >= modalNavigationList.length ? 0 : currentIndex + 1
    } else {
      newIndex = currentIndex - 1 < 0 ? modalNavigationList.length - 1 : currentIndex - 1
    }
    
    setSelectedCard(modalNavigationList[newIndex])
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedCard) return
      if (e.key === 'ArrowLeft') navigateCard('prev')
      if (e.key === 'ArrowRight') navigateCard('next')
      if (e.key === 'Escape') closeModal()
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCard, modalNavigationList])

  // Objective modal functions
  const openObjectiveModal = (objective) => {
    setSelectedObjective(objective)
  }

  const closeObjectiveModal = () => {
    setSelectedObjective(null)
  }

  // Toggle scheme selection (browse view)
  const toggleScheme = (schemeId) => {
    if (selectedSchemes.includes(schemeId)) {
      setSelectedSchemes(selectedSchemes.filter(s => s !== schemeId))
    } else if (selectedSchemes.length < 2) {
      setSelectedSchemes([...selectedSchemes, schemeId])
    }
  }

  // Clear all objectives
  const clearObjectives = () => {
    setSelectedStrategy('')
    setSelectedSchemes([])
  }

  // Helper for card type display
  const getCardTypeDisplay = (type) => {
    switch(type) {
      case 'Stat': return 'Model'
      case 'Crew': return 'Crew'
      case 'Upgrade': return 'Upgrade'
      default: return type
    }
  }

  // Meta analysis helpers
  const getStrategyMeta = (factionName, strategyName) => {
    const factionData = FACTION_META[factionName]
    if (!factionData) return null
    
    const key = strategyName.toLowerCase().replace(/\s+/g, '_')
    const stratData = factionData.strategies_m4e[key]
    if (!stratData) return null
    
    const factionWinRate = factionData.overall.win_rate
    const delta = stratData.win_rate - factionWinRate
    
    return {
      winRate: stratData.win_rate,
      games: stratData.games,
      delta,
      rating: delta > 0.03 ? 'strong' : delta < -0.03 ? 'weak' : 'neutral'
    }
  }

  const getSchemeMeta = (factionName, schemeName) => {
    const factionData = FACTION_META[factionName]
    if (!factionData) return null
    
    const key = schemeName.toLowerCase().replace(/\s+/g, '_')
    const schemeData = factionData.schemes_chosen[key]
    if (!schemeData) return null
    
    const factionWinRate = factionData.overall.win_rate
    const delta = schemeData.win_rate - factionWinRate
    
    return {
      winRate: schemeData.win_rate,
      games: schemeData.games,
      delta,
      rating: delta > 0.03 ? 'strong' : delta < -0.03 ? 'weak' : 'neutral'
    }
  }

  // Find related models (same keyword)
  const getRelatedModels = (card) => {
    if (!card || !card.keywords || card.keywords.length === 0) return []
    
    const primaryKeyword = card.keywords.find(k => k !== 'Versatile') || card.keywords[0]
    
    return cards.filter(c => 
      c.id !== card.id &&
      c.keywords?.includes(primaryKeyword)
    ).slice(0, 6)
  }

  return (
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
          >
            Build Crew
          </button>
          <button 
            className={`nav-tab ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
          >
            Card Gallery
          </button>
        </nav>
      </header>

      {/* Selected Objectives Bar - shows in cards view when objectives selected */}
      {viewMode === 'cards' && (selectedStrategy || selectedSchemes.length > 0) && (
        <div className="objectives-bar">
          <span className="objectives-label">Active:</span>
          {selectedStrategy && strategies[selectedStrategy] && (
            <span 
              className="objective-chip strategy"
              onClick={() => setSelectedStrategy('')}
            >
              ⚔ {strategies[selectedStrategy].name}
              <span className="chip-remove">×</span>
            </span>
          )}
          {selectedSchemes.map(schemeId => schemes[schemeId] && (
            <span 
              key={schemeId}
              className="objective-chip scheme"
              onClick={() => toggleScheme(schemeId)}
            >
              ◈ {schemes[schemeId].name}
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
                    {card.objectiveScore > 0 && (
                      <div className="objective-match-badge">
                        {renderStars(card.objectiveScore)}
                      </div>
                    )}
                    {card.card_type === 'Stat' && (
                      <div className="card-stats-overlay">
                        {card.cost && <span className="stat-cost">{card.cost}</span>}
                        {card.health && <span className="stat-health">♥{card.health}</span>}
                      </div>
                    )}
                  </div>
                  <div className="card-info">
                    <div className="card-name">{card.name}</div>
                    <div className="card-faction">{card.faction}</div>
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
            <select 
              className="filter-select meta-faction-select"
              value={metaFaction}
              onChange={e => setMetaFaction(e.target.value)}
            >
              <option value="">📊 Your Faction</option>
              {metaFactions.map(f => (
                <option key={f} value={f}>{f} ({Math.round(FACTION_META[f].overall.win_rate * 100)}%)</option>
              ))}
            </select>
            <select 
              className="filter-select opponent-faction-select"
              value={opponentFaction}
              onChange={e => setOpponentFaction(e.target.value)}
            >
              <option value="">👁️ Opponent</option>
              {metaFactions.map(f => (
                <option key={f} value={f}>{f} ({Math.round(FACTION_META[f].overall.win_rate * 100)}%)</option>
              ))}
            </select>
            <span className="result-count">
              {filteredSchemes.length} schemes • {filteredStrategies.length} strategies
            </span>
          </div>

          {/* Meta Recommendations Panel */}
          {(metaFaction || opponentFaction) && (
            <div className="meta-recommendations-panel">
              <div className="meta-panel-header">
                <h3>
                  {metaFaction && opponentFaction 
                    ? `📊 ${metaFaction} vs ${opponentFaction}`
                    : metaFaction 
                      ? `📊 ${metaFaction} Meta Insights`
                      : `👁️ Scouting ${opponentFaction}`
                  }
                </h3>
                <span className="meta-faction-stats">
                  {metaFaction && (
                    <span className="meta-stat-you">
                      You: {Math.round(FACTION_META[metaFaction].overall.win_rate * 100)}%
                    </span>
                  )}
                  {metaFaction && opponentFaction && <span className="meta-stat-divider">•</span>}
                  {opponentFaction && (
                    <span className="meta-stat-opponent">
                      Opponent: {Math.round(FACTION_META[opponentFaction].overall.win_rate * 100)}%
                    </span>
                  )}
                </span>
              </div>
              
              <div className="meta-recommendations">
                {metaFaction && (
                  <>
                    <div className="meta-rec-section">
                      <span className="meta-rec-label">✓ Strong Schemes:</span>
                      <span className="meta-rec-items">
                        {Object.entries(FACTION_META[metaFaction].schemes_chosen)
                          .filter(([_, data]) => data.win_rate > FACTION_META[metaFaction].overall.win_rate + 0.03)
                          .sort((a, b) => b[1].win_rate - a[1].win_rate)
                          .slice(0, 3)
                          .map(([name, data]) => (
                            <span key={name} className="meta-rec-item strong">
                              {name.replace(/_/g, ' ')} ({Math.round(data.win_rate * 100)}%)
                            </span>
                          ))
                        }
                      </span>
                    </div>
                    <div className="meta-rec-section">
                      <span className="meta-rec-label">✗ Weak Schemes:</span>
                      <span className="meta-rec-items">
                        {Object.entries(FACTION_META[metaFaction].schemes_chosen)
                          .filter(([_, data]) => data.win_rate < FACTION_META[metaFaction].overall.win_rate - 0.03)
                          .sort((a, b) => a[1].win_rate - b[1].win_rate)
                          .slice(0, 3)
                          .map(([name, data]) => (
                            <span key={name} className="meta-rec-item weak">
                              {name.replace(/_/g, ' ')} ({Math.round(data.win_rate * 100)}%)
                            </span>
                          ))
                        }
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="objectives-container">
            {/* Strategies Section */}
            <section className="objectives-section">
              <h2 className="section-title">
                <span className="section-icon">⚔</span>
                Strategies
              </h2>
              <p className="section-desc">Select one strategy for the game</p>
              <div className="objectives-grid strategies-grid">
                {filteredStrategies.map(strategy => {
                  const meta = metaFaction ? getStrategyMeta(metaFaction, strategy.name) : null
                  return (
                    <div 
                      key={strategy.id}
                      className={`objective-card strategy-card ${selectedStrategy === strategy.id ? 'selected' : ''}`}
                      onClick={() => setSelectedStrategy(selectedStrategy === strategy.id ? '' : strategy.id)}
                    >
                      <div className="objective-header">
                        <h3>{strategy.name}</h3>
                        <span className="vp-badge">{strategy.max_vp} VP</span>
                      </div>
                      
                      {meta && (
                        <div className={`meta-indicator ${meta.rating}`}>
                          <span className="meta-win-rate">{Math.round(meta.winRate * 100)}%</span>
                          <span className="meta-delta">
                            {meta.delta >= 0 ? '+' : ''}{Math.round(meta.delta * 100)}%
                          </span>
                        </div>
                      )}
                      
                      <p className="objective-preview">
                        {strategy.scoring_text?.slice(0, 100)}...
                      </p>
                      
                      <div className="objective-tags">
                        {strategy.requires_killing && <span className="obj-tag killing">Killing</span>}
                        {strategy.requires_scheme_markers && <span className="obj-tag markers">Markers</span>}
                        {strategy.requires_positioning && <span className="obj-tag position">Positioning</span>}
                        {strategy.requires_terrain && <span className="obj-tag terrain">Terrain</span>}
                      </div>
                      
                      <button 
                        className="objective-details-btn"
                        onClick={(e) => { e.stopPropagation(); openObjectiveModal(strategy); }}
                      >
                        View Details
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Schemes Section */}
            <section className="objectives-section">
              <h2 className="section-title">
                <span className="section-icon">◈</span>
                Schemes
              </h2>
              <p className="section-desc">Select up to two schemes ({selectedSchemes.length}/2)</p>
              <div className="objectives-grid schemes-grid">
                {filteredSchemes.map(scheme => {
                  const meta = metaFaction ? getSchemeMeta(metaFaction, scheme.name) : null
                  return (
                    <div 
                      key={scheme.id}
                      className={`objective-card scheme-card ${selectedSchemes.includes(scheme.id) ? 'selected' : ''}`}
                      onClick={() => toggleScheme(scheme.id)}
                    >
                      <div className="objective-header">
                        <h3>{scheme.name}</h3>
                        <span className="vp-badge">{scheme.max_vp} VP</span>
                      </div>
                      
                      {meta && (
                        <div className={`meta-indicator ${meta.rating}`}>
                          <span className="meta-win-rate">{Math.round(meta.winRate * 100)}%</span>
                          <span className="meta-delta">
                            {meta.delta >= 0 ? '+' : ''}{Math.round(meta.delta * 100)}%
                          </span>
                        </div>
                      )}
                      
                      <p className="objective-preview">
                        {scheme.scoring_text?.slice(0, 100)}...
                      </p>
                      
                      <div className="objective-tags">
                        {scheme.requires_killing && <span className="obj-tag killing">Killing</span>}
                        {scheme.requires_scheme_markers && <span className="obj-tag markers">Markers</span>}
                        {scheme.requires_positioning && <span className="obj-tag position">Positioning</span>}
                        {scheme.requires_terrain && <span className="obj-tag terrain">Terrain</span>}
                      </div>
                      
                      {scheme.next_available_schemes?.length > 0 && (
                        <div className="scheme-branches">
                          <span className="branches-label">Branches to:</span>
                          {scheme.next_available_schemes.slice(0, 2).map((next, i) => (
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
                  )
                })}
              </div>
            </section>
          </div>
        </>
      )}

      {viewMode === 'crew' && (
        <>
          {/* ═══════════════════════════════════════════════════════════════════
              STEP 1: ENCOUNTER SETUP - Strategy + Schemes Pool
              ═══════════════════════════════════════════════════════════════════ */}
          <div className="encounter-setup">
            <div className="step-indicator">
              <span className="step-number">1</span>
              <span className="step-label">ENCOUNTER</span>
            </div>
            <h2 className="encounter-title">Select Strategy & Schemes</h2>
            <div className="encounter-grid">
              <div className="encounter-strategy">
                <label>Strategy:</label>
                <select 
                  value={crewStrategy}
                  onChange={e => setCrewStrategy(e.target.value)}
                  className="encounter-select"
                >
                  <option value="">Select Strategy...</option>
                  {strategyList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="encounter-schemes">
                <div className="encounter-schemes-header">
                  <label>Scheme Pool ({crewSchemes.length}/3 available):</label>
                  <button 
                    className="randomize-btn"
                    onClick={() => {
                      // Randomly select 3 schemes from the pool
                      const availableSchemes = [...schemeList]
                      const randomSchemes = []
                      for (let i = 0; i < 3 && availableSchemes.length > 0; i++) {
                        const idx = Math.floor(Math.random() * availableSchemes.length)
                        randomSchemes.push(availableSchemes[idx].id)
                        availableSchemes.splice(idx, 1)
                      }
                      setCrewSchemes(randomSchemes)
                    }}
                    title="Randomly generate scheme pool (simulates flipping 3 scheme cards)"
                  >
                    🎲 Random
                  </button>
                </div>
                <div className="scheme-chips">
                  {schemeList.map(s => {
                    const isSelected = crewSchemes.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        className={`scheme-chip-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleCrewScheme(s.id)}
                        title={s.name}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Full Random Encounter Button */}
              <button 
                className="randomize-encounter-btn"
                onClick={() => {
                  // Random strategy
                  if (strategyList.length > 0) {
                    const randomStrategy = strategyList[Math.floor(Math.random() * strategyList.length)]
                    setCrewStrategy(randomStrategy.id)
                  }
                  // Random 3 schemes
                  const availableSchemes = [...schemeList]
                  const randomSchemes = []
                  for (let i = 0; i < 3 && availableSchemes.length > 0; i++) {
                    const idx = Math.floor(Math.random() * availableSchemes.length)
                    randomSchemes.push(availableSchemes[idx].id)
                    availableSchemes.splice(idx, 1)
                  }
                  setCrewSchemes(randomSchemes)
                }}
                title="Generate a complete random encounter (Strategy + 3 Schemes)"
              >
                🎲 Generate Random Encounter
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              A|B CREW COMPARISON - Side by Side
              ═══════════════════════════════════════════════════════════════════ */}
          <div className={`ab-comparison-layout ${!crewStrategy ? 'awaiting-step-1' : ''}`}>
            
            {/* ═══ SIDE A: YOUR CREW ═══ */}
            <div className="ab-side ab-side-a">
              <div className="step-indicator">
                <span className="step-number">2</span>
                <span className="step-label">BUILD</span>
              </div>
              <div className="ab-side-header your-side">
                <h2>🔵 Your Crew</h2>
                <div className="ab-side-budget">
                  {crewMath.totalCost}/{crewBudget}ss
                  {remainingBudget > 0 && <span className="remaining"> ({remainingBudget} left)</span>}
                </div>
              </div>
              
              {/* 6ss Pool Cap Warning */}
              {remainingBudget > 6 && (
                <div className="ab-ss-warning">
                  ⚠ SS pool capped at 6 — <strong>{remainingBudget - 6}ss wasted!</strong>
                </div>
              )}
              
              {/* Optimal spending indicator */}
              {remainingBudget > 0 && remainingBudget <= 6 && crewRoster.length > 0 && (
                <div className="ab-ss-optimal">
                  ✓ {remainingBudget}ss → Soulstone Pool
                </div>
              )}
              
              {/* Master Selection - Compact Stat List */}
              {!selectedMaster ? (
                <div className="master-picker">
                  <div className="master-picker-header">
                    <span>Select Your Master</span>
                    <span className="master-picker-hint">Hover to preview • Click to lock in</span>
                  </div>
                  <input
                    type="text"
                    className="master-filter-input"
                    placeholder="Filter by name, faction, or keyword..."
                    value={masterFilter}
                    onChange={e => setMasterFilter(e.target.value)}
                  />
                  <div className="master-stat-list">
                    {masters
                      .filter(m => {
                        if (!masterFilter.trim()) return true
                        const filterLower = masterFilter.toLowerCase()
                        return (
                          m.name.toLowerCase().includes(filterLower) ||
                          m.faction?.toLowerCase().includes(filterLower) ||
                          m.primary_keyword?.toLowerCase().includes(filterLower)
                        )
                      })
                      .map(m => {
                      const metaData = FACTION_META[m.faction]
                      const masterCode = m.name.toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_')
                      const masterMeta = metaData?.masters?.[masterCode]
                      const strategyWinRate = crewStrategy && metaData?.strategies_m4e?.[crewStrategy]?.win_rate
                      
                      return (
                        <div 
                          key={m.id}
                          className="master-stat-row"
                          onClick={() => {
                            setSelectedMaster(m)
                            setCrewRoster([])
                            setMasterFilter('')
                          }}
                          onMouseEnter={() => setHoveredMaster(m)}
                          onMouseLeave={() => setHoveredMaster(null)}
                        >
                          <span className="master-stat-name">{m.name}</span>
                          <span className="master-stat-faction">{m.faction}</span>
                          <span className="master-stat-keyword">{m.primary_keyword}</span>
                          {strategyWinRate !== undefined && (
                            <span className={`master-stat-winrate ${strategyWinRate >= 0.5 ? 'good' : 'bad'}`}>
                              {Math.round(strategyWinRate * 100)}%
                            </span>
                          )}
                          {masterMeta?.games && (
                            <span className="master-stat-games">{masterMeta.games}g</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="master-selected">
                  <div className="master-selected-header">
                    <span className="master-selected-name">{selectedMaster.name}</span>
                    <button 
                      className="master-change-btn"
                      onClick={() => {
                        setSelectedMaster(null)
                        setCrewRoster([])
                      }}
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
              
              {/* Keyword Fit Warning - Shows when keyword lacks tools for objectives */}
              {selectedMaster && keywordFitAnalysis.warning && (crewStrategy || crewSchemes.length > 0) && (
                <div className={`keyword-fit-warning ${keywordFitAnalysis.warning.level}`}>
                  <div className="keyword-fit-header">
                    <span className="keyword-fit-icon">
                      {keywordFitAnalysis.warning.level === 'severe' ? '⚠️' : '⚡'}
                    </span>
                    <span className="keyword-fit-title">
                      Keyword Coverage: {keywordFitAnalysis.percentage}%
                    </span>
                  </div>
                  <p className="keyword-fit-message">{keywordFitAnalysis.warning.message}</p>
                  {keywordFitAnalysis.suggestions.length > 0 && (
                    <div className="keyword-fit-suggestions">
                      <span className="suggestions-label">Consider these Versatile models:</span>
                      <div className="suggestions-list">
                        {keywordFitAnalysis.suggestions.map((s, idx) => (
                          <div 
                            key={idx} 
                            className="suggestion-item"
                            onClick={() => openModal(s.card)}
                          >
                            <span className="suggestion-name">{s.card.name}</span>
                            <span className="suggestion-roles">({s.rolesDisplay})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* ═══ LEADER DISPLAY - Master + Crew Card Large ═══ */}
              {selectedMaster && (
                <div className="crew-leaders-display">
                  <div className="leader-card-large" onClick={() => openModal(selectedMaster, [selectedMaster, selectedCrewCard, ...crewRoster].filter(Boolean))}>
                    <img 
                      src={`${IMAGE_BASE}/${selectedMaster.front_image}`}
                      alt={selectedMaster.name}
                    />
                    <div className="leader-card-label">Master</div>
                  </div>
                  {selectedCrewCard && (
                    <div className="leader-card-large crew-card" onClick={() => openModal(selectedCrewCard, [selectedMaster, selectedCrewCard, ...crewRoster].filter(Boolean))}>
                      <img 
                        src={`${IMAGE_BASE}/${selectedCrewCard.front_image}`}
                        alt={selectedCrewCard.name}
                      />
                      <div className="leader-card-label">Crew Rules</div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Crew Roster Section - Horizontal layout with stats sidebar */}
              <div className="crew-roster-section">
                {/* Compact Stats Sidebar */}
                {selectedMaster && crewRoster.length > 0 && (
                  <div className="crew-stats-sidebar">
                    <div className="crew-stat-item">
                      <span className="crew-stat-value">{crewRoster.length}</span>
                      <span className="crew-stat-label">Models</span>
                    </div>
                    <div className="crew-stat-item">
                      <span className="crew-stat-value">{crewMath.totalCost}</span>
                      <span className="crew-stat-label">/ 50ss</span>
                    </div>
                    <div className={`crew-stat-item ${remainingBudget > 6 ? 'warning' : 'good'}`}>
                      <span className="crew-stat-value">{Math.min(6, remainingBudget)}</span>
                      <span className="crew-stat-label">SS Pool</span>
                      {remainingBudget > 6 && <span className="crew-stat-waste">-{remainingBudget - 6}</span>}
                    </div>
                    <div className={`crew-stat-item ${crewMath.ookCount >= crewMath.ookLimit ? 'at-limit' : ''}`}>
                      <span className="crew-stat-value">{crewMath.ookCount}/{crewMath.ookLimit}</span>
                      <span className="crew-stat-label">OOK</span>
                    </div>
                    {crewMath.ookTax > 0 && (
                      <div className="crew-stat-item tax">
                        <span className="crew-stat-value">+{crewMath.ookTax}</span>
                        <span className="crew-stat-label">Tax</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Your Crew Roster - Larger Cards */}
                <div className="ab-roster">
                  {crewRoster.length === 0 ? (
                    <div className="ab-roster-empty">
                      {selectedMaster ? 'Add models from pool below' : 'Select a Master to begin'}
                    </div>
                  ) : (
                    <div className="ab-roster-grid">
                      {crewRoster.map(card => {
                        // Build full crew navigation: Master + Crew Card + All Roster Models
                        const fullCrewNav = [selectedMaster, selectedCrewCard, ...crewRoster].filter(Boolean)
                        const score = getObjectiveScore(card)
                        const synergyCount = crewSynergies.modelSynergyCounts[card.rosterId]?.synergies || 0
                        const antiSynergyCount = crewSynergies.modelSynergyCounts[card.rosterId]?.antiSynergies || 0
                        return (
                          <div 
                            key={card.rosterId} 
                            className="ab-roster-card-large"
                            onClick={() => openModal(card, fullCrewNav)}
                          >
                            <img 
                              src={`${IMAGE_BASE}/${card.front_image}`}
                              alt={card.name}
                              className="ab-roster-img-large"
                            />
                            {score > 0 && (
                              <div className="roster-card-rating">
                                {renderStars(score)}
                              </div>
                            )}
                            {synergyCount > 0 && (
                              <div className={`roster-card-synergy ${antiSynergyCount > 0 ? 'has-anti' : ''}`}>
                                🔗{synergyCount}
                              </div>
                            )}
                            <div className="roster-card-cost">{card.cost || 0}ss</div>
                            <button 
                              className="ab-roster-remove"
                              onClick={(e) => { e.stopPropagation(); removeFromCrew(card.rosterId); }}
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Crew Action Buttons */}
              {selectedMaster && (
                <div className="crew-action-buttons">
                  <button 
                    className="ab-suggest-btn" 
                    onClick={suggestCrew}
                    title="Auto-build crew based on selected objectives"
                  >
                    ✨ Suggest Crew
                  </button>
                  {crewRoster.length > 0 && (
                    <button className="ab-clear-btn" onClick={clearCrew}>Clear Crew</button>
                  )}
                </div>
              )}
              
              {/* ═══ SYNERGY PANEL - Collapsible ═══ */}
              {selectedMaster && crewRoster.length > 0 && (
                <div className={`synergy-panel ${synergyPanelOpen ? 'open' : 'collapsed'}`}>
                  <div 
                    className="synergy-panel-header"
                    onClick={() => setSynergyPanelOpen(!synergyPanelOpen)}
                  >
                    <span className="synergy-panel-title">
                      🔗 Crew Synergies
                      {crewSynergies.synergies.length > 0 && (
                        <span className="synergy-count-badge">
                          {crewSynergies.synergies.length}
                        </span>
                      )}
                    </span>
                    <span className="synergy-panel-toggle">
                      {synergyPanelOpen ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {synergyPanelOpen && (
                    <div className="synergy-panel-content">
                      {/* Synergy Score Summary */}
                      <div className="synergy-score-summary">
                        <span className="synergy-score-label">Synergy Score:</span>
                        <span className={`synergy-score-value ${crewSynergies.totalScore >= 3 ? 'good' : crewSynergies.totalScore >= 1 ? 'ok' : 'low'}`}>
                          {crewSynergies.totalScore > 0 ? '+' : ''}{crewSynergies.totalScore}
                        </span>
                      </div>
                      
                      {/* Synergies List */}
                      {crewSynergies.synergies.length > 0 ? (
                        <div className="synergy-list">
                          <div className="synergy-list-header">Strong Combos</div>
                          {crewSynergies.synergies.slice(0, 6).map((syn, idx) => (
                            <div key={idx} className="synergy-item">
                              <div className="synergy-item-models">
                                <span className="synergy-icon">{syn.icon}</span>
                                <span className="synergy-model-name">{syn.modelA.name}</span>
                                <span className="synergy-arrow">
                                  {syn.direction === 'bidirectional' ? '↔' : 
                                   syn.direction === 'A_buffs_B' || syn.direction === 'A_feeds_B' || syn.direction === 'A_supports_B' ? '→' : '←'}
                                </span>
                                <span className="synergy-model-name">{syn.modelB.name}</span>
                              </div>
                              <div className="synergy-item-reason">{syn.reason}</div>
                            </div>
                          ))}
                          {crewSynergies.synergies.length > 6 && (
                            <div className="synergy-more">
                              +{crewSynergies.synergies.length - 6} more synergies
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="synergy-empty">
                          No strong synergies detected yet. Add more models to see combos.
                        </div>
                      )}
                      
                      {/* Anti-Synergies Warning */}
                      {crewSynergies.antiSynergies.length > 0 && (
                        <div className="anti-synergy-list">
                          <div className="anti-synergy-header">⚠️ Potential Conflicts</div>
                          {crewSynergies.antiSynergies.map((anti, idx) => (
                            <div key={idx} className="anti-synergy-item">
                              <span className="anti-synergy-models">
                                {anti.modelA.name} & {anti.modelB.name}
                              </span>
                              <span className="anti-synergy-reason">{anti.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* ═══ CREW CARD RULES PANEL ═══ */}
              {selectedCrewCard && crewCardAnalysis && (
                <div className="crew-rules-panel">
                  <div className="crew-rules-header">
                    <span className="crew-rules-title">📜 {selectedCrewCard.name}</span>
                    <span className="crew-rules-subtitle">Crew Card Rules</span>
                  </div>
                  
                  {crewCardAnalysis.activeRules.length > 0 && (
                    <div className="crew-rules-section active">
                      <div className="crew-rules-section-header">
                        <span className="rules-status-icon">✓</span>
                        Active Rules ({crewCardAnalysis.activeRules.length})
                      </div>
                      {crewCardAnalysis.activeRules.slice(0, 5).map((rule, idx) => (
                        <div key={idx} className="crew-rule-item active">
                          <span className="rule-text">{rule.text}</span>
                          <div className="rule-applies-to">
                            Applies to: {rule.mentions.join(', ')}
                          </div>
                        </div>
                      ))}
                      {crewCardAnalysis.activeRules.length > 5 && (
                        <div className="crew-rules-more">+{crewCardAnalysis.activeRules.length - 5} more</div>
                      )}
                    </div>
                  )}
                  
                  {crewCardAnalysis.inactiveRules.length > 0 && (
                    <div className="crew-rules-section inactive">
                      <div className="crew-rules-section-header">
                        <span className="rules-status-icon">○</span>
                        Unused Rules ({crewCardAnalysis.inactiveRules.length})
                      </div>
                      {crewCardAnalysis.inactiveRules.slice(0, 3).map((rule, idx) => (
                        <div key={idx} className="crew-rule-item inactive">
                          <span className="rule-text">{rule.text}</span>
                          <div className="rule-requires">
                            Requires: {rule.mentions.join(', ')}
                          </div>
                        </div>
                      ))}
                      {crewCardAnalysis.inactiveRules.length > 3 && (
                        <div className="crew-rules-more">+{crewCardAnalysis.inactiveRules.length - 3} more</div>
                      )}
                    </div>
                  )}
                  
                  {crewCardAnalysis.activeRules.length === 0 && crewCardAnalysis.inactiveRules.length === 0 && (
                    <div className="crew-rules-empty">
                      Add models to see which crew card rules apply
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* ═══ CENTER: MATCHUP INTEL ═══ */}
            <div className="ab-intel-panel">
              <h3>📊 Matchup Analysis</h3>
              
              {/* Preview indicator when hovering */}
              {hoveredMaster && !selectedMaster && (
                <div className="ab-intel-preview-badge">
                  👁 Previewing: {hoveredMaster.name}
                </div>
              )}
              
              {/* Strategy Analysis - works with hover preview */}
              {crewStrategy && (selectedMaster || hoveredMaster) && (
                <div className="ab-intel-section">
                  <h4>Strategy: {strategies[crewStrategy]?.name || crewStrategy}</h4>
                  {(() => {
                    const previewMaster = selectedMaster || hoveredMaster
                    const factionMeta = FACTION_META[previewMaster.faction]
                    const strategyData = factionMeta?.strategies_m4e?.[crewStrategy]
                    return strategyData && (
                      <div className="ab-intel-stat">
                        <span>{previewMaster.faction} win rate:</span>
                        <span className={`ab-winrate ${strategyData.win_rate >= 0.5 ? 'good' : 'bad'}`}>
                          {Math.round(strategyData.win_rate * 100)}%
                        </span>
                      </div>
                    )
                  })()}
                  {opponentMaster && FACTION_META[opponentMaster.faction]?.strategies_m4e?.[crewStrategy] && (
                    <div className="ab-intel-stat">
                      <span>Opponent win rate:</span>
                      <span className={`ab-winrate ${FACTION_META[opponentMaster.faction].strategies_m4e[crewStrategy].win_rate >= 0.5 ? 'good' : 'bad'}`}>
                        {Math.round(FACTION_META[opponentMaster.faction].strategies_m4e[crewStrategy].win_rate * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Scheme Pool Coverage - Can you score EACH scheme? */}
              {crewSchemes.length > 0 && selectedMaster && (
                <div className="ab-intel-section scheme-coverage">
                  <h4>Scheme Pool Coverage</h4>
                  <p className="scheme-coverage-hint">Can your crew score each scheme?</p>
                  {schemeCoverage.map(coverage => (
                    <div key={coverage.id} className={`scheme-coverage-item ${coverage.level}`}>
                      <div className="scheme-coverage-header">
                        <span className="scheme-coverage-icon">{coverage.icon}</span>
                        <span className="scheme-coverage-name">{coverage.name}</span>
                        {coverage.winRate && (
                          <span className={`scheme-coverage-winrate ${coverage.winRate >= 0.5 ? 'good' : 'bad'}`}>
                            {Math.round(coverage.winRate * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="scheme-coverage-detail">
                        <span className="scheme-coverage-message">{coverage.message}</span>
                      </div>
                      {coverage.count > 0 && (
                        <div className="scheme-coverage-models">
                          {coverage.models.slice(0, 3).join(', ')}
                          {coverage.models.length > 3 && ` +${coverage.models.length - 3} more`}
                        </div>
                      )}
                      {coverage.level === 'missing' && coverage.favoredRoles.length > 0 && (
                        <div className="scheme-coverage-need">
                          Need: {coverage.favoredRoles.slice(0, 2).map(r => 
                            ROLE_DESCRIPTIONS[r]?.label || r
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Overall Coverage Summary */}
                  {schemeCoverage.length === 3 && (
                    <div className={`scheme-coverage-summary ${
                      schemeCoverage.filter(s => s.level === 'missing').length > 0 ? 'has-gaps' :
                      schemeCoverage.filter(s => s.level === 'light').length > 0 ? 'has-risks' : 'all-good'
                    }`}>
                      {schemeCoverage.filter(s => s.level === 'missing').length > 0 
                        ? `⚠ Cannot score ${schemeCoverage.filter(s => s.level === 'missing').length} scheme(s)!`
                        : schemeCoverage.filter(s => s.level === 'light').length > 0
                          ? `○ ${schemeCoverage.filter(s => s.level === 'light').length} scheme(s) at risk`
                          : '✓ Good coverage on all schemes'
                      }
                    </div>
                  )}
                </div>
              )}
              
              {/* Crew Gaps Analysis */}
              {crewAnalysis.gaps.length > 0 && (
                <div className="ab-intel-section ab-intel-gaps">
                  <h4>⚠ Crew Gaps</h4>
                  <ul>
                    {crewAnalysis.gaps.slice(0, 4).map((gap, i) => (
                      <li key={i}>Need: {gap.requirement}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* All Good */}
              {crewAnalysis.gaps.length === 0 && crewAnalysis.objectives.length > 0 && (
                <div className="ab-intel-section ab-intel-good">
                  <span>✓ Crew covers objectives</span>
                </div>
              )}
              
              {!crewStrategy && !selectedMaster && (
                <div className="ab-intel-empty">
                  Select objectives and masters to see matchup analysis
                </div>
              )}
            </div>
            
            {/* ═══ SIDE B: OPPONENT CREW ═══ */}
            <div className="ab-side ab-side-b">
              <div className="step-indicator optional">
                <span className="step-number">3</span>
                <span className="step-label">MATCHUP</span>
              </div>
              <div className="ab-side-header opponent-side">
                <h2>🔴 Opponent</h2>
                {opponentMaster && (
                  <div className="ab-side-budget">{opponentCrewCost}/50ss</div>
                )}
              </div>
              
              {/* Opponent Faction Selection */}
              <div className="ab-master-select">
                <select 
                  value={opponentFaction}
                  onChange={e => {
                    setOpponentFaction(e.target.value)
                    setOpponentMaster(null)
                  }}
                  className="ab-master-dropdown opponent"
                >
                  <option value="">Select Opponent Faction...</option>
                  {factions.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              
              {/* Opponent Master Selection */}
              {opponentFaction && (
                <div className="ab-master-select">
                  <select 
                    value={opponentMaster?.id || ''}
                    onChange={e => {
                      const master = opponentMasters.find(m => m.id === e.target.value)
                      setOpponentMaster(master || null)
                    }}
                    className="ab-master-dropdown opponent"
                  >
                    <option value="">Select Opponent Master...</option>
                    {opponentMasters.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* ═══ OPPONENT LEADER DISPLAY - Master + Crew Card Large ═══ */}
              {opponentMaster && (
                <div className="crew-leaders-display opponent">
                  <div className="leader-card-large" onClick={() => openModal(opponentMaster, [opponentMaster, ...opponentCrew])}>
                    <img 
                      src={`${IMAGE_BASE}/${opponentMaster.front_image}`}
                      alt={opponentMaster.name}
                    />
                    <div className="leader-card-label">Master</div>
                  </div>
                  {/* Find opponent's crew card */}
                  {(() => {
                    const oppCrewCard = getCrewCardForMaster(opponentMaster)
                    return oppCrewCard && (
                      <div className="leader-card-large crew-card" onClick={() => openModal(oppCrewCard, [opponentMaster, oppCrewCard, ...opponentCrew])}>
                        <img 
                          src={`${IMAGE_BASE}/${oppCrewCard.front_image}`}
                          alt={oppCrewCard.name}
                        />
                        <div className="leader-card-label">Crew Rules</div>
                      </div>
                    )
                  })()}
                </div>
              )}
              
              {/* Opponent Crew Section - Horizontal layout with stats sidebar */}
              <div className="crew-roster-section opponent">
                {/* Compact Stats Sidebar */}
                {opponentMaster && opponentCrew.length > 0 && (
                  <div className="crew-stats-sidebar opponent">
                    <div className="crew-stat-item">
                      <span className="crew-stat-value">{opponentCrewMath.models}</span>
                      <span className="crew-stat-label">Models</span>
                    </div>
                    <div className="crew-stat-item">
                      <span className="crew-stat-value">{opponentCrewMath.totalCost}</span>
                      <span className="crew-stat-label">/ 50ss</span>
                    </div>
                    <div className={`crew-stat-item ${opponentCrewMath.remaining > 6 ? 'warning' : 'good'}`}>
                      <span className="crew-stat-value">{opponentCrewMath.ssPool}</span>
                      <span className="crew-stat-label">SS Pool</span>
                    </div>
                  </div>
                )}
                
                {/* Opponent Crew Roster */}
                <div className="ab-roster opponent">
                  {!opponentMaster ? (
                    <div className="ab-roster-empty opponent">
                      Select opponent faction & master to see expected crew
                    </div>
                  ) : opponentCrew.length === 0 ? (
                    <div className="ab-roster-empty opponent">
                      No keyword models found for {opponentMaster.primary_keyword}
                    </div>
                  ) : (
                    <div className="ab-roster-grid opponent">
                      {opponentCrew.map((card) => {
                        const score = getObjectiveScore(card)
                        const synergyCount = opponentCrewSynergies.modelSynergyCounts[card.opponentRosterId || card.id]?.synergies || 0
                        const antiSynergyCount = opponentCrewSynergies.modelSynergyCounts[card.opponentRosterId || card.id]?.antiSynergies || 0
                        return (
                          <div 
                            key={card.opponentRosterId || `opp-${card.id}`} 
                            className="ab-roster-card-large opponent"
                            onClick={() => openModal(card, [opponentMaster, ...opponentCrew])}
                          >
                            <img 
                              src={`${IMAGE_BASE}/${card.front_image}`}
                              alt={card.name}
                              className="ab-roster-img-large"
                            />
                            {score > 0 && (
                              <div className="roster-card-rating opponent">
                                {renderStars(score)}
                              </div>
                            )}
                            {synergyCount > 0 && (
                              <div className={`roster-card-synergy opponent ${antiSynergyCount > 0 ? 'has-anti' : ''}`}>
                                🔗{synergyCount}
                              </div>
                            )}
                            <div className="roster-card-cost">{card.cost || 0}ss</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Reroll Button and Note */}
              {opponentMaster && (
                <div className="opponent-crew-actions">
                  <button 
                    className="opponent-reroll-btn"
                    onClick={generateOpponentCrew}
                    title="Generate a different valid crew composition"
                  >
                    🎲 Reroll Crew
                  </button>
                  <div className="ab-opp-note">
                    Simulated {opponentMaster.primary_keyword} crew • Not optimal, just plausible
                  </div>
                </div>
              )}
              
              {/* ═══ OPPONENT SYNERGY PANEL ═══ */}
              {opponentMaster && opponentCrew.length > 0 && (
                <div className="synergy-panel opponent">
                  <div className="synergy-panel-header">
                    <span className="synergy-panel-title">
                      🔗 Opponent Synergies
                      {opponentCrewSynergies.synergies.length > 0 && (
                        <span className="synergy-count-badge">
                          {opponentCrewSynergies.synergies.length}
                        </span>
                      )}
                    </span>
                    <span className="synergy-score-compact">
                      {opponentCrewSynergies.totalScore > 0 ? '+' : ''}{opponentCrewSynergies.totalScore}
                    </span>
                  </div>
                  
                  {/* Compact Synergy List */}
                  {opponentCrewSynergies.synergies.length > 0 && (
                    <div className="synergy-panel-content compact">
                      {opponentCrewSynergies.synergies.slice(0, 4).map((syn, idx) => (
                        <div key={idx} className="synergy-item compact">
                          <span className="synergy-icon">{syn.icon}</span>
                          <span className="synergy-model-name">{syn.modelA.name}</span>
                          <span className="synergy-arrow">
                            {syn.direction === 'bidirectional' ? '↔' : '→'}
                          </span>
                          <span className="synergy-model-name">{syn.modelB.name}</span>
                        </div>
                      ))}
                      {opponentCrewSynergies.synergies.length > 4 && (
                        <div className="synergy-more">
                          +{opponentCrewSynergies.synergies.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Anti-synergies */}
                  {opponentCrewSynergies.antiSynergies.length > 0 && (
                    <div className="synergy-panel-content compact anti">
                      <span className="anti-synergy-note">
                        ⚠️ {opponentCrewSynergies.antiSynergies.length} potential conflict(s)
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* ═══ OPPONENT CREW CARD RULES ═══ */}
              {opponentMaster && opponentCrewCardAnalysis && (() => {
                const oppCrewCard = getCrewCardForMaster(opponentMaster)
                return oppCrewCard && (
                  <div className="crew-rules-panel opponent">
                    <div className="crew-rules-header">
                      <span className="crew-rules-title">📜 {oppCrewCard.name}</span>
                      <span className="crew-rules-subtitle">Their Crew Rules</span>
                    </div>
                    
                    {opponentCrewCardAnalysis.activeRules.length > 0 && (
                      <div className="crew-rules-section active">
                        <div className="crew-rules-section-header">
                          <span className="rules-status-icon">⚡</span>
                          Active ({opponentCrewCardAnalysis.activeRules.length})
                        </div>
                        {opponentCrewCardAnalysis.activeRules.slice(0, 3).map((rule, idx) => (
                          <div key={idx} className="crew-rule-item active">
                            <span className="rule-text">{rule.text}</span>
                          </div>
                        ))}
                        {opponentCrewCardAnalysis.activeRules.length > 3 && (
                          <div className="crew-rules-more">+{opponentCrewCardAnalysis.activeRules.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              HIRING POOL - Available Models to Add
              ═══════════════════════════════════════════════════════════════════ */}
          {selectedMaster && (
            <div className="hiring-pool">
              <h2 className="hiring-pool-title">
                Hiring Pool 
                <span className="hiring-pool-budget">({remainingBudget}ss remaining)</span>
              </h2>
              
              {/* Objective Scoring Legend */}
              {(crewStrategy || crewSchemes.length > 0) && (
                <div className="scoring-legend">
                  <div className="scoring-legend-header">
                    <span className="scoring-legend-icon">★</span>
                    <span className="scoring-legend-title">Objective Fit Score</span>
                  </div>
                  <p className="scoring-legend-explanation">
                    Stars indicate how well a model fits your selected objectives. 
                    Each ★ means the model has a role that helps score your Strategy or Schemes.
                  </p>
                  {crewFavoredRoles.size > 0 && (
                    <div className="scoring-legend-roles">
                      <span className="scoring-legend-label">Looking for:</span>
                      <div className="scoring-legend-role-list">
                        {Array.from(crewFavoredRoles).slice(0, 6).map(role => (
                          <span key={role} className="scoring-legend-role">
                            {ROLE_DESCRIPTIONS[role]?.label || role}
                          </span>
                        ))}
                        {crewFavoredRoles.size > 6 && (
                          <span className="scoring-legend-more">+{crewFavoredRoles.size - 6} more</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="scoring-legend-scale">
                    <span className="score-example"><span className="stars star-level-excellent">★★★</span> Excellent fit</span>
                    <span className="score-example"><span className="stars star-level-good">★★</span> Good fit</span>
                    <span className="score-example"><span className="stars star-level-some">★</span> Some fit</span>
                    <span className="score-example"><span className="stars dim">—</span> No match</span>
                  </div>
                </div>
              )}
              
              {/* Badge Key */}
              <div className="hiring-badge-key">
                <span className="badge-key-item">
                  <span className="badge-key-icon hired">✓</span>
                  <span className="badge-key-label">In Crew</span>
                </span>
                <span className="badge-key-item">
                  <span className="badge-key-icon limit">MAX</span>
                  <span className="badge-key-label">At Limit</span>
                </span>
                <span className="badge-key-item">
                  <span className="badge-key-icon count">0/3</span>
                  <span className="badge-key-label">Minion Count</span>
                </span>
                <span className="badge-key-item">
                  <span className="badge-key-icon ook">OOK FULL</span>
                  <span className="badge-key-label">No OOK Slots</span>
                </span>
              </div>
              
              {/* Keyword Models */}
              <section className="hiring-section">
                <h3 className="hiring-section-title">
                  <span className="keyword-badge">{selectedMaster.primary_keyword}</span>
                  Keyword
                </h3>
                <div className="hiring-grid">
                  {keywordModels.map((card, index) => {
                    const isMinion = (card.characteristics || []).includes('Minion')
                    const minionCount = isMinion ? (crewMath.minionCounts[card.name] || 0) : 0
                    const minionLimit = card.minion_limit || 3
                    const inRoster = isMinion ? minionCount > 0 : crewRoster.some(c => c.id === card.id)
                    const atLimit = isMinion && minionCount >= minionLimit
                    const canAdd = canAddToCrew(card)
                    const blockReason = getHiringBlockReason(card)
                    const score = getObjectiveScore(card)
                    return (
                      <div 
                        key={`${card.id}-${index}`}
                        className={`hiring-card ${inRoster ? 'in-roster' : ''} ${blockReason === 'budget' ? 'unaffordable' : ''} ${atLimit ? 'at-limit' : ''}`}
                        onClick={() => canAdd && addToCrew(card)}
                        title={blockReason === 'budget' ? 'Not enough soulstones' : ''}
                      >
                        <div className="hiring-card-header">
                          <span className="hiring-card-name">{card.name}</span>
                          <span className="hiring-card-cost">{card.cost || 0}ss</span>
                        </div>
                        <div className="hiring-card-info">
                          <span className="hiring-card-char">
                            {(card.characteristics || []).filter(c => ['Totem','Henchman','Enforcer','Minion'].includes(c))[0] || 'Model'}
                          </span>
                          {isMinion && (
                            <span className={`minion-count ${minionCount >= minionLimit ? 'at-limit' : ''}`}>
                              {minionCount}/{minionLimit}
                            </span>
                          )}
                          {score > 0 && renderStars(score)}
                        </div>
                        {inRoster && !isMinion && <div className="in-roster-badge">✓</div>}
                        {atLimit && <div className="at-limit-badge">MAX</div>}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Versatile Models - Out of Keyword with +1ss Tax */}
              {versatileModels.length > 0 && (
                <section className="hiring-section">
                  <h3 className="hiring-section-title">
                    <span className="versatile-badge">Versatile</span>
                    Faction (+1ss tax)
                    <span className={`ook-counter ${crewMath.ookCount >= crewMath.ookLimit ? 'at-limit' : ''}`}>
                      OOK: {crewMath.ookCount}/{crewMath.ookLimit}
                    </span>
                  </h3>
                  <div className="hiring-grid">
                    {versatileModels.map((card, index) => {
                      const isMinion = (card.characteristics || []).includes('Minion')
                      const minionCount = isMinion ? (crewMath.minionCounts[card.name] || 0) : 0
                      const minionLimit = card.minion_limit || 3
                      const inRoster = isMinion ? minionCount > 0 : crewRoster.some(c => c.id === card.id)
                      const atLimit = isMinion && minionCount >= minionLimit
                      const canAdd = canAddToCrew(card)
                      const blockReason = getHiringBlockReason(card)
                      const score = getObjectiveScore(card)
                      const baseCost = card.cost || 0
                      return (
                        <div 
                          key={`versatile-${card.id}-${index}`}
                          className={`hiring-card versatile ${inRoster ? 'in-roster' : ''} ${blockReason === 'budget' ? 'unaffordable' : ''} ${blockReason === 'ook-limit' ? 'ook-blocked' : ''} ${atLimit ? 'at-limit' : ''}`}
                          onClick={() => canAdd && addToCrew(card)}
                          title={blockReason === 'ook-limit' ? 'Out-of-keyword limit reached (2 max)' : blockReason === 'budget' ? 'Not enough soulstones' : ''}
                        >
                          <div className="hiring-card-header">
                            <span className="hiring-card-name">{card.name}</span>
                            <span className="hiring-card-cost">
                              {baseCost}<span className="tax-indicator">+1</span>ss
                            </span>
                          </div>
                          <div className="hiring-card-info">
                            <span className="hiring-card-char">
                              {(card.characteristics || []).filter(c => ['Totem','Henchman','Enforcer','Minion'].includes(c))[0] || 'Model'}
                            </span>
                            {isMinion && (
                              <span className={`minion-count ${minionCount >= minionLimit ? 'at-limit' : ''}`}>
                                {minionCount}/{minionLimit}
                              </span>
                            )}
                            {score > 0 && renderStars(score)}
                          </div>
                          {inRoster && !isMinion && <div className="in-roster-badge">✓</div>}
                          {atLimit && <div className="at-limit-badge">MAX</div>}
                          {blockReason === 'ook-limit' && <div className="ook-limit-badge">OOK FULL</div>}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ENHANCED CARD MODAL - Mobile-first dual card view
          ═══════════════════════════════════════════════════════════════════════ */}
      {selectedCard && (
        <div className="modal-overlay" onClick={closeModal}>
          <button 
            className="nav-arrow nav-arrow-left"
            onClick={(e) => { e.stopPropagation(); navigateCard('prev'); }}
            aria-label="Previous card"
          >
            ‹
          </button>
          
          <div className="modal card-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCard.name}</h2>
              {modalNavigationList.length > 1 && (
                <span className="modal-nav-indicator">
                  {(() => {
                    const idx = modalNavigationList.findIndex(c => 
                      c.rosterId ? c.rosterId === selectedCard.rosterId : c.id === selectedCard.id
                    )
                    return `${idx + 1} / ${modalNavigationList.length}`
                  })()}
                </span>
              )}
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="card-detail-body">
              {/* View Mode Toggle */}
              <div className="card-view-toggle">
                <button 
                  className={modalView === 'dual' ? 'active' : ''} 
                  onClick={() => setModalView('dual')}
                >
                  Both Sides
                </button>
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

              {/* Card Images - Dual view is the star! */}
              <div className={`card-images-container ${modalView}`}>
                {(modalView === 'dual' || modalView === 'front') && (
                  <div className="card-image-wrapper">
                    <img 
                      className="detail-card-image"
                      src={`${IMAGE_BASE}/${selectedCard.front_image}`}
                      alt={`${selectedCard.name} front`}
                      onError={e => { 
                        e.target.onerror = null
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect fill="%23333" width="300" height="420"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">No Image</text></svg>' 
                      }}
                    />
                  </div>
                )}
                {(modalView === 'dual' || modalView === 'back') && selectedCard.back_image && (
                  <div className="card-image-wrapper">
                    <img 
                      className="detail-card-image"
                      src={`${IMAGE_BASE}/${selectedCard.back_image}`}
                      alt={`${selectedCard.name} back`}
                      onError={e => { 
                        e.target.onerror = null
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect fill="%23333" width="300" height="420"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">No Image</text></svg>' 
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Quick Stats Bar - Always visible */}
              <div className="quick-stats-bar">
                {selectedCard.cost != null && (
                  <div className="quick-stat">
                    <span className="quick-stat-value">{selectedCard.cost}</span>
                    <span className="quick-stat-label">Cost</span>
                  </div>
                )}
                {selectedCard.defense && (
                  <div className="quick-stat">
                    <span className="quick-stat-value">{selectedCard.defense}</span>
                    <span className="quick-stat-label">Df</span>
                  </div>
                )}
                {selectedCard.willpower && (
                  <div className="quick-stat">
                    <span className="quick-stat-value">{selectedCard.willpower}</span>
                    <span className="quick-stat-label">Wp</span>
                  </div>
                )}
                {selectedCard.speed && (
                  <div className="quick-stat">
                    <span className="quick-stat-value">{selectedCard.speed}</span>
                    <span className="quick-stat-label">Mv</span>
                  </div>
                )}
                {selectedCard.health && (
                  <div className="quick-stat health">
                    <span className="quick-stat-value">{selectedCard.health}</span>
                    <span className="quick-stat-label">HP</span>
                  </div>
                )}
                {selectedCard.soulstone_cache && (
                  <div className="quick-stat soulstone">
                    <span className="quick-stat-value">✦</span>
                    <span className="quick-stat-label">SS</span>
                  </div>
                )}
              </div>

              {/* Collapsible Data Sections */}
              <div className="card-data-sections">
                {/* Identity Section */}
                <details className="data-section" open>
                  <summary className="data-section-header">
                    <span className="section-icon">📋</span>
                    Identity
                  </summary>
                  <div className="data-section-content">
                    <div className="data-row">
                      <span className="data-label">Faction</span>
                      <span className="data-value">{selectedCard.faction}</span>
                    </div>
                    {selectedCard.subfaction && (
                      <div className="data-row">
                        <span className="data-label">Subfaction</span>
                        <span className="data-value">{selectedCard.subfaction}</span>
                      </div>
                    )}
                    <div className="data-row">
                      <span className="data-label">Base Size</span>
                      <span className="data-value">{selectedCard.base_size || 'Unknown'}</span>
                    </div>
                    {selectedCard.size && (
                      <div className="data-row">
                        <span className="data-label">Size</span>
                        <span className="data-value">{selectedCard.size}</span>
                      </div>
                    )}
                  </div>
                </details>

                {/* Characteristics */}
                {selectedCard.characteristics?.length > 0 && (
                  <details className="data-section" open>
                    <summary className="data-section-header">
                      <span className="section-icon">🏷️</span>
                      Characteristics
                    </summary>
                    <div className="data-section-content">
                      <div className="tag-list">
                        {selectedCard.characteristics.map(c => (
                          <span key={c} className="detail-tag characteristic">
                            {c}{c === 'Minion' && selectedCard.minion_limit ? ` (${selectedCard.minion_limit})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </details>
                )}

                {/* Keywords */}
                {selectedCard.keywords?.length > 0 && (
                  <details className="data-section" open>
                    <summary className="data-section-header">
                      <span className="section-icon">🔑</span>
                      Keywords
                    </summary>
                    <div className="data-section-content">
                      <div className="tag-list">
                        {selectedCard.keywords.map(k => (
                          <span key={k} className="detail-tag keyword">{k}</span>
                        ))}
                      </div>
                    </div>
                  </details>
                )}

                {/* Roles */}
                {selectedCard.roles?.length > 0 && (
                  <details className="data-section" open>
                    <summary className="data-section-header">
                      <span className="section-icon">🎭</span>
                      Roles
                    </summary>
                    <div className="data-section-content">
                      <div className="tag-list">
                        {selectedCard.roles.map(r => (
                          <span key={r} className="detail-tag role">
                            {ROLE_DESCRIPTIONS[r]?.icon || '•'} {ROLE_DESCRIPTIONS[r]?.label || r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </details>
                )}

                {/* Related Models - Synergy Foundation */}
                {getRelatedModels(selectedCard).length > 0 && (
                  <details className="data-section">
                    <summary className="data-section-header">
                      <span className="section-icon">🔗</span>
                      Keyword Family ({getRelatedModels(selectedCard).length})
                    </summary>
                    <div className="data-section-content">
                      <div className="related-models-list">
                        {getRelatedModels(selectedCard).map((model, index) => (
                          <div 
                            key={`related-${model.id}-${index}`} 
                            className="related-model"
                            onClick={() => setSelectedCard(model)}
                          >
                            <span className="related-model-name">{model.name}</span>
                            <span className="related-model-cost">{model.cost}ss</span>
                          </div>
                        ))}
                      </div>
                      <div className="related-hint">Tap to view</div>
                    </div>
                  </details>
                )}

                {/* Synergies Placeholder - Future Feature */}
                <details className="data-section synergies-placeholder">
                  <summary className="data-section-header">
                    <span className="section-icon">⚡</span>
                    Synergies
                    <span className="coming-soon-badge">Coming Soon</span>
                  </summary>
                  <div className="data-section-content">
                    <p className="placeholder-text">
                      Synergy analysis will show which models work well together based on 
                      abilities, auras, and keyword interactions.
                    </p>
                  </div>
                </details>
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

              {/* Meta info in modal - show both factions if selected */}
              {(metaFaction || opponentFaction) && (
                <div className="objective-meta-section">
                  <h4>
                    {metaFaction && opponentFaction 
                      ? 'Faction Comparison'
                      : metaFaction 
                        ? `${metaFaction} Performance`
                        : `${opponentFaction} Performance`
                    }
                  </h4>
                  <div className="meta-comparison">
                    {/* Your faction */}
                    {metaFaction && (() => {
                      const meta = selectedObjective.card_type === 'strategy' 
                        ? getStrategyMeta(metaFaction, selectedObjective.name)
                        : getSchemeMeta(metaFaction, selectedObjective.name)
                      return (
                        <div className="meta-faction-block you">
                          <span className="meta-faction-label">📊 {metaFaction}</span>
                          {meta ? (
                            <div className="meta-detail">
                              <span className={`meta-rating ${meta.rating}`}>
                                {meta.rating === 'strong' ? '✓ Strong' : meta.rating === 'weak' ? '✗ Weak' : '~ Neutral'}
                              </span>
                              <span className="meta-stats">
                                {Math.round(meta.winRate * 100)}% ({meta.games}g)
                              </span>
                              <span className="meta-delta" style={{ color: meta.delta >= 0 ? '#22c55e' : '#ef4444' }}>
                                {meta.delta >= 0 ? '+' : ''}{Math.round(meta.delta * 100)}%
                              </span>
                            </div>
                          ) : (
                            <span className="meta-no-data">No data</span>
                          )}
                        </div>
                      )
                    })()}
                    
                    {/* Opponent faction */}
                    {opponentFaction && (() => {
                      const meta = selectedObjective.card_type === 'strategy' 
                        ? getStrategyMeta(opponentFaction, selectedObjective.name)
                        : getSchemeMeta(opponentFaction, selectedObjective.name)
                      return (
                        <div className="meta-faction-block opponent">
                          <span className="meta-faction-label">👁️ {opponentFaction}</span>
                          {meta ? (
                            <div className="meta-detail">
                              <span className={`meta-rating ${meta.rating}`}>
                                {meta.rating === 'strong' ? '✓ Strong' : meta.rating === 'weak' ? '✗ Weak' : '~ Neutral'}
                              </span>
                              <span className="meta-stats">
                                {Math.round(meta.winRate * 100)}% ({meta.games}g)
                              </span>
                              <span className="meta-delta" style={{ color: meta.delta >= 0 ? '#22c55e' : '#ef4444' }}>
                                {meta.delta >= 0 ? '+' : ''}{Math.round(meta.delta * 100)}%
                              </span>
                            </div>
                          ) : (
                            <span className="meta-no-data">No data</span>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

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
