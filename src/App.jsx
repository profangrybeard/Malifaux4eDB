import React, { useState, useMemo, useEffect, useCallback } from 'react'
import cardData from './data/cards.json'
import crewData from './data/crew.json'
import upgradeData from './data/upgrade_cards.json'
import objectivesData from './data/objectives.json'
import versionInfo from './version.json';


const IMAGE_BASE = 'https://raw.githubusercontent.com/profangrybeard/Malifaux4eDB-images/main'

// ===========================================================================
// FACTION COLORS - Official M4E palette
// ===========================================================================
const FACTION_COLORS = {
  'Guild': { primary: '#8B1538', light: '#c42a52', bg: 'rgba(139, 21, 56, 0.25)' },
  'Resurrectionists': { primary: '#2D5A4A', light: '#3d7a64', bg: 'rgba(45, 90, 74, 0.25)' },
  'Arcanists': { primary: '#0077B6', light: '#0096e0', bg: 'rgba(0, 119, 182, 0.25)' },
  'Neverborn': { primary: '#6B2D7B', light: '#8e3da3', bg: 'rgba(107, 45, 123, 0.25)' },
  'Outcasts': { primary: '#8B6914', light: '#b8891a', bg: 'rgba(139, 105, 20, 0.25)' },
  'Bayou': { primary: '#5C5410', light: '#7d7216', bg: 'rgba(92, 84, 16, 0.25)' },
  'Ten Thunders': { primary: '#CC5500', light: '#ff6b00', bg: 'rgba(204, 85, 0, 0.25)' },
  'Explorers Society': { primary: '#1A6B6B', light: '#238f8f', bg: 'rgba(26, 107, 107, 0.25)' }
}

const getFactionColor = (faction, type = 'primary') => {
  const colors = FACTION_COLORS[faction]
  if (!colors) return type === 'bg' ? 'rgba(128, 128, 128, 0.15)' : '#888888'
  return colors[type] || colors.primary
}

// ===========================================================================
// FACTION META DATA - Embedded from Longshanks tournament analysis (15,893 games)
// ===========================================================================
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

// ===========================================================================
// POOL ANALYSIS - Scheme/Strategy capability requirements and crew analysis
// ===========================================================================

// ===========================================================================
// STRATEGY REQUIREMENTS - Validated against official M4E GG0 cards 2025-12-17
// ===========================================================================
const STRATEGY_REQUIREMENTS = {
  plant_explosives: {
    name: 'Plant Explosives',
    needs: { interact: 3, mobility: 3, spread: 2 },
    tips: 'All non-peon models get Explosive tokens. Interact to place marker within 1", not within 4" of friendly marker. Most markers completely on enemy half wins.',
    setup: 'After deployment, each non-peon model gains an Explosive token.',
    scoring: 'End of turn: Most friendly Strategy Markers completely on enemy table half = 1 VP. Ties: both score.',
    bonus: 'Once per game: 2+ friendly markers IN enemy deployment zone = +1 VP.',
    key_rules: [
      'Explosive tokens can only be removed by placing a marker',
      'Interact to pick up marker and gain Explosive token (if you don\'t have one)',
      'When model with Explosive token is killed, the KILLER places neutral marker within 1"',
      'Models may move on top of Strategy markers',
      'Max 5 friendly markers on field'
    ]
  },
  boundary_dispute: {
    name: 'Boundary Dispute',
    needs: { melee: 3, survivability: 3, push_pull: 2 },
    tips: 'Brawl-focused. Kick markers forward with Interact. Markers in enemy deployment count DOUBLE. Turn 4 scoring is doubled.',
    setup: 'Each player alternates placing 3 Strategy Markers completely in deployment zone, not within 6" of another Strategy marker.',
    scoring: 'End of turn: Most friendly markers completely on enemy half = 1 VP. Markers completely in enemy deployment count as 2. Ties: both score.',
    bonus: 'Turn 4: Double all VP gained from this strategy.',
    key_rules: [
      'Interact with marker to place it within 6" of current location, not in base contact with models',
      'Catchup: Player with fewer cumulative VP may place one marker within 4" after scoring',
      'Markers are friendly to the crew that made them'
    ]
  },
  recover_evidence: {
    name: 'Recover Evidence',
    needs: { mobility: 3, scheme_markers: 2, survivability: 2 },
    tips: 'CRITICAL: When YOU kill enemies, the ENEMY gets the marker! Encourages avoidant play - kidnap and scheme rather than kill.',
    setup: 'Each player makes 1 Strategy Marker completely on enemy table half.',
    scoring: 'End of turn: Most Strategy Markers on crew card = 1 VP. Ties: both score. ALL markers removed from ALL crew cards after scoring.',
    bonus: 'Once per game, end of friendly activation: Remove Scheme Markers equal to turn number from within 1" of terrain within 6" of enemy deployment zone = +1 VP.',
    key_rules: [
      'When YOUR crew kills an enemy model, the ENEMY places a marker within 3" of the killed model',
      'Interact with friendly marker to remove it and place on your crew card',
      'Models may move on top of Strategy markers',
      'Killing helps your OPPONENT score - focus on schemes and kidnapping instead'
    ]
  },
  informants: {
    name: 'Informants',
    needs: { survivability: 3, cheap_activations: 3, spread: 2 },
    tips: 'Models with Summon TOKENS cannot control markers (but tokens can be removed!). Turn 4 scoring is doubled. Control = most models without Summon tokens within 2".',
    setup: '5 markers: centerpoint, 10" left/right on centerline, each player places 1 in center of table quarter on their side.',
    scoring: 'End of turn: Control most Strategy Markers = 1 VP. Ties: both score.',
    bonus: 'Turn 4: Double all VP gained from this strategy.',
    key_rules: [
      'Control = most models WITHOUT Summon tokens within 2" of marker',
      'Summon tokens can be removed by some abilities - then those models CAN contribute',
      'Catchup: Player with fewer cumulative VP may move up to 2 markers within 3", not in base contact with models, not within 8" of other Strategy markers',
      'Summoning is heavily penalized but not completely useless'
    ]
  },
}

// ===========================================================================
// SCHEME REQUIREMENTS - Validated against official M4E GG0 cards 2025-12-17
// ===========================================================================
// SCHEME CARD IMAGES - Maps scheme IDs to image filenames in the repo
// ===========================================================================
const SCHEME_CARD_IMAGES = {
  breakthrough: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Breakthrough_front.png',
  assassinate: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Assassinate_front.png',
  detonate_charges: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Detonate_Charges_front.png',
  harness_the_ley_line: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Harness_the_Leyline_front.png',
  leave_your_mark: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Leave_Your_Mark_front.png',
  take_the_highground: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Take_the_Highground_front.png',
  make_it_look_like_an_accident: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Make_It_Look_Like_an_Accident_front.png',
  ensnare: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Ensnare_front.png',
  search_the_area: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Search_the_Area_front.png',
  scout_the_rooftops: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Scout_the_Rooftops_front.png',
  grave_robbing: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Grave_Robbing_front.png',
  runic_binding: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Runic_Binding_front.png',
  frame_job: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Frame_Job_front.png',
  public_demonstration: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Public_Demonstration_front.png',
  reshape_the_land: 'Rules%20and%20Objectives/Scheme%20Cards/M4E_Scheme_Reshape_the_Land_front.png',
}

// ===========================================================================
// STRATEGY CARD IMAGES - Maps strategy IDs to image filenames
// ===========================================================================
const STRATEGY_CARD_IMAGES = {
  plant_explosives: 'Rules%20and%20Objectives/Strategy%20Cards/M4E_Strategy_Plant_Explosives_front.png',
  boundary_dispute: 'Rules%20and%20Objectives/Strategy%20Cards/M4E_Strategy_Boundary_Dispute_front.png', 
  recover_evidence: 'Rules%20and%20Objectives/Strategy%20Cards/M4E_Strategy_Recover%20Evidence_front.png',
  informants: 'Rules%20and%20Objectives/Strategy%20Cards/M4E_Strategy_Informants_front.png',
}

// All schemes score max 2 VP (1 base + 1 bonus)
// ===========================================================================
const SCHEME_REQUIREMENTS = {
  breakthrough: {
    name: 'Breakthrough',
    needs: { scheme_markers: 3, mobility: 3, survivability: 1 },
    tips: 'Scores at end of ENEMY activation (not end of turn). Need marker in enemy deployment with no enemies within 2".',
    reveal: 'When an enemy model ends its activation',
    scoring: 'Remove 1 friendly Scheme Marker in enemy deployment zone with no enemy within 2" = 1 VP',
    bonus: 'Also remove 1 from centerline AND 1 from your deployment zone = +1 VP',
    next_schemes: ['Assassinate', 'Public Demonstration', 'Frame Job'],
    difficulty: 'easy'
  },
  assassinate: {
    name: 'Assassinate',
    needs: { damage: 3, alpha_strike: 2, mobility: 2 },
    tips: 'Choose unique enemy with 50%+ health. Score when you reduce them below half. Ask about multiple models to bluff!',
    secret: 'Choose a unique enemy model with half or more of its maximum health remaining',
    reveal: 'After the chosen model is reduced to below half of its maximum health',
    scoring: 'When this scheme is revealed = 1 VP',
    bonus: 'At end of turn, if chosen model has been killed = +1 VP',
    next_schemes: ['Scout the Rooftops', 'Detonate Charges', 'Runic Binding'],
    difficulty: 'medium'
  },
  detonate_charges: {
    name: 'Detonate Charges',
    needs: { scheme_markers: 3, mobility: 2, activation_control: 2 },
    tips: 'Remove 2 markers within 2" of enemy model(s). Can be same enemy or different. Don\'t target models that haven\'t activated!',
    reveal: 'At the end of any turn',
    scoring: 'Remove 2 friendly Scheme Markers within 2" of enemy model(s) = 1 VP',
    bonus: 'Remove 1 additional qualifying marker = +1 VP',
    next_schemes: ['Grave Robbing', 'Runic Binding', 'Take the Highground'],
    difficulty: 'medium'
  },
  harness_the_ley_line: {
    name: 'Harness the Leyline',
    needs: { scheme_markers: 3, spread: 2, survivability: 1 },
    tips: 'Markers on centerline, 6"+ apart, no enemies within 2". Centerline is huge - easy if opponent is swept away.',
    reveal: 'At the end of any turn',
    scoring: 'Remove 2 friendly Scheme Markers on centerline, not within 6" of another marker used for this scheme, no enemy within 2" = 1 VP',
    bonus: 'Remove 1 additional qualifying marker = +1 VP',
    next_schemes: ['Assassinate', 'Scout the Rooftops', 'Grave Robbing'],
    difficulty: 'medium'
  },
  leave_your_mark: {
    name: 'Leave Your Mark',
    needs: { scheme_markers: 2, mobility: 2, dont_mind_me: 2 },
    tips: 'More friendly markers within 1" of centerpoint than enemy markers. Very telegraphed but easy if uncontested.',
    reveal: 'At the end of any turn',
    scoring: 'More friendly Scheme Markers within 1" of centerpoint than enemy Scheme Markers = 1 VP. Remove all friendly markers within 1" after scoring.',
    bonus: 'At least 2 more friendly than enemy markers = +1 VP',
    next_schemes: ['Take the Highground', 'Make it Look Like an Accident', 'Reshape the Land'],
    difficulty: 'easy'
  },
  take_the_highground: {
    name: 'Take the Highground',
    needs: { mobility: 2, survivability: 3, spread: 2 },
    tips: 'Control terrain (most friendly models on it). Models within 6" of YOUR deployment zone are ignored. Need Ht 2+ terrain.',
    reveal: 'At the end of any turn',
    scoring: 'Control at least 2 terrain pieces of Ht 2 or greater = 1 VP',
    bonus: 'Control at least 3 qualifying terrain pieces = +1 VP',
    next_schemes: ['Make it Look Like an Accident', 'Ensnare', 'Search the Area'],
    difficulty: 'easy'
  },
  scout_the_rooftops: {
    name: 'Scout the Rooftops',
    needs: { flight: 3, mobility: 2, scheme_markers: 2 },
    tips: 'Markers at elevation 2+, on 2 DIFFERENT terrain pieces, not within 6" of deployment, no enemies at same elevation within 2".',
    reveal: 'At the end of any turn',
    scoring: 'Remove 1 qualifying Scheme Marker from each of 2 different terrain pieces = 1 VP. Qualifying: elevation 2+, not within 6" of deployment, no enemy at same elevation within 2".',
    bonus: 'Remove 1 additional qualifying marker completely on enemy table half = +1 VP (may be on same terrain as another)',
    next_schemes: ['Detonate Charges', 'Grave Robbing', 'Leave Your Mark'],
    difficulty: 'medium'
  },
  make_it_look_like_an_accident: {
    name: 'Make it Look Like an Accident',
    needs: { push_pull: 3, mobility: 1, damage: 1 },
    tips: 'Very binary - either you have push/pull effects or you don\'t. Requires elevation 2+ terrain on the board.',
    reveal: 'When an enemy model suffers damage due to falling',
    scoring: 'When this scheme is revealed = 1 VP',
    bonus: 'At end of turn, if that enemy model has been killed or has less than half health = +1 VP',
    next_schemes: ['Ensnare', 'Reshape the Land', 'Breakthrough'],
    difficulty: 'medium'
  },
  runic_binding: {
    name: 'Runic Binding',
    needs: { scheme_markers: 3, spread: 3, mobility: 2 },
    tips: 'Form triangle with 3 markers (each within 14" of at least one other). Very AP intensive and telegraphed.',
    reveal: 'When an enemy model ends its activation',
    scoring: 'Choose 3 friendly Scheme Markers in play (each within 14" of at least one other). If at least 1 enemy inside the triangle = 1 VP. Remove chosen markers.',
    bonus: 'Combined cost of enemy models inside triangle is 15+ = +1 VP',
    next_schemes: ['Leave Your Mark', 'Take the Highground', 'Ensnare'],
    difficulty: 'hard'
  },
  ensnare: {
    name: 'Ensnare',
    needs: { scheme_markers: 2, engagement: 2, cheap_activations: 2 },
    tips: 'Remove 2 markers within 2" of a SINGLE unique enemy when ANY enemy ends activation. Bonus if engaged by cheaper model.',
    reveal: 'When an enemy model ends its activation',
    scoring: 'Remove 2 friendly Scheme Markers from within 2" of a single unique enemy model = 1 VP',
    bonus: 'If that unique enemy is engaged by a friendly model of lower cost = +1 VP',
    next_schemes: ['Reshape the Land', 'Search the Area', 'Frame Job'],
    difficulty: 'hard'
  },
  search_the_area: {
    name: 'Search the Area',
    needs: { scheme_markers: 3, mobility: 3, spread: 1 },
    tips: 'Select terrain completely on enemy half. Remove 3 markers within 1" of it with no enemies within 2".',
    reveal: 'At the end of any enemy activation',
    scoring: 'Select terrain completely on enemy table half. Remove 3 friendly Scheme Markers from within 1" of it that do not have enemy models within 2" = 1 VP',
    bonus: 'At end of turn, remove 1 more friendly Scheme Marker from within 1" of selected terrain = +1 VP',
    next_schemes: ['Breakthrough', 'Frame Job', 'Harness the Leyline'],
    difficulty: 'easy'
  },
  public_demonstration: {
    name: 'Public Demonstration',
    needs: { minion_count: 3, engagement: 2, survivability: 2 },
    tips: 'Need 2+ friendly MINIONS within 2" of chosen unique enemy. NO anti-summon clause - summoned minions work great!',
    secret: 'Choose a unique enemy model',
    reveal: 'At the end of any turn',
    scoring: 'If there are 2 or more friendly Minions within 2" of the chosen model = 1 VP',
    bonus: 'If there is a friendly Scheme Marker within 1" of the chosen model = +1 VP',
    next_schemes: ['Harness the Leyline', 'Assassinate', 'Detonate Charges'],
    difficulty: 'medium'
  },
  frame_job: {
    name: 'Frame Job',
    needs: { survivability: 3, mobility: 2, scheme_markers: 1 },
    tips: 'OPPONENT DEPENDENT - they must attack your chosen model on enemy table half. They can completely lock you out.',
    secret: 'Choose a friendly model',
    reveal: 'After the chosen model suffers damage from an enemy Attack Action targeting it while it is on the enemy table half',
    scoring: 'When this scheme is revealed = 1 VP',
    bonus: 'Remove a friendly Scheme Marker from within 2" of the chosen model = +1 VP',
    next_schemes: ['Public Demonstration', 'Harness the Leyline', 'Scout the Rooftops'],
    difficulty: 'hard'
  },
  reshape_the_land: {
    name: 'Reshape the Land',
    needs: { marker_creation: 3, scheme_markers: 2, mobility: 2 },
    tips: 'Choose marker type secretly. Need 4 of that type completely on enemy half. If Scheme markers, they\'re removed after scoring.',
    secret: 'Choose a marker type',
    reveal: 'At the end of any turn',
    scoring: 'If there are 4 friendly markers of the chosen type completely on enemy table half = 1 VP. If Scheme markers, remove all used to score.',
    bonus: 'If there are 5 or more qualifying markers = +1 VP',
    next_schemes: ['Search the Area', 'Breakthrough', 'Public Demonstration'],
    difficulty: 'medium'
  },
  grave_robbing: {
    name: 'Grave Robbing',
    needs: { damage: 2, scheme_markers: 2, marker_creation: 2 },
    tips: 'Kill enemy within 2" of both Scheme marker(s) AND your chosen non-Scheme marker type. Then collect Remains markers.',
    secret: 'Choose a type of non-Scheme marker',
    reveal: 'After killing an enemy model within 2" of both one or more friendly Scheme markers AND one or more of the chosen marker type',
    scoring: 'Remove 1 friendly Scheme Marker within 2" of killed model = 1 VP',
    bonus: 'Until end of turn, may Interact with enemy Remains markers to place on crew card. If 2+ removed at end of turn = +1 VP',
    next_schemes: ['Runic Binding', 'Leave Your Mark', 'Make it Look Like an Accident'],
    difficulty: 'hard'
  },
}

const CAPABILITY_LABELS = {
  scheme_markers: { label: 'Scheme Running', icon: '📍' },
  mobility: { label: 'Mobility', icon: '💨' },
  flight: { label: 'Flight/Incorporeal', icon: '🦅' },
  survivability: { label: 'Survivability', icon: '🛡️' },
  damage: { label: 'Damage Output', icon: '⚔️' },
  alpha_strike: { label: 'Alpha Strike', icon: '🎯' },
  melee: { label: 'Melee Presence', icon: '🗡️' },
  engagement: { label: 'Engagement Control', icon: '⛓️' },
  push_pull: { label: 'Push/Pull/Lure', icon: '🧲' },
  marker_creation: { label: 'Marker Creation', icon: '🔷' },
  interact: { label: 'Interact Actions', icon: '👆' },
  cheap_activations: { label: 'Cheap Activations', icon: '💰' },
  minion_count: { label: 'Minion Count', icon: '👥' },
  spread: { label: 'Board Coverage', icon: '📡' },
  activation_control: { label: 'Activation Control', icon: '⏱️' },
  dont_mind_me: { label: "Don't Mind Me", icon: '🥷' },
}

// Analyze a model's capabilities for pool matching
const getModelCapabilities = (card) => {
  const caps = {}
  const roles = card.roles || []
  const chars = (card.characteristics || []).join(' ').toLowerCase()
  
  let allText = ''
  ;(card.abilities || []).forEach(ab => {
    allText += ' ' + ((ab.name || '') + ' ' + (ab.description || '')).toLowerCase()
  })
  ;(card.attack_actions || []).forEach(atk => {
    allText += ' ' + (atk.description || '').toLowerCase()
  })
  ;(card.tactical_actions || []).forEach(tac => {
    allText += ' ' + (tac.description || '').toLowerCase()
  })
  
  // SCHEME MARKERS
  if (roles.includes('schemer') || roles.includes('scheme_runner')) caps.scheme_markers = (caps.scheme_markers || 0) + 2
  if (allText.includes("don't mind me") || allText.includes('dont mind me')) {
    caps.scheme_markers = (caps.scheme_markers || 0) + 2
    caps.interact = (caps.interact || 0) + 2
  }
  if (allText.includes('interact') && (allText.includes('bonus') || allText.includes('free'))) {
    caps.interact = (caps.interact || 0) + 2
  }
  if (allText.includes('scheme marker')) caps.scheme_markers = (caps.scheme_markers || 0) + 1
  
  // MOBILITY
  if (chars.includes('incorporeal')) {
    caps.mobility = (caps.mobility || 0) + 3
    caps.flight = (caps.flight || 0) + 3
  }
  if (chars.includes('flight')) {
    caps.mobility = (caps.mobility || 0) + 2
    caps.flight = (caps.flight || 0) + 3
  }
  if (allText.includes('leap') || allText.includes('unimpeded')) caps.mobility = (caps.mobility || 0) + 1
  if (allText.includes('place') && !allText.includes('marker')) caps.mobility = (caps.mobility || 0) + 2
  const mv = card.mv || card.speed || 0
  if (mv >= 6) caps.mobility = (caps.mobility || 0) + 1
  if (mv >= 7) caps.mobility = (caps.mobility || 0) + 1
  
  // SURVIVABILITY
  if (allText.includes('hard to kill')) caps.survivability = (caps.survivability || 0) + 2
  if (allText.includes('hard to wound')) caps.survivability = (caps.survivability || 0) + 2
  if (allText.includes('armor')) caps.survivability = (caps.survivability || 0) + 1
  if (allText.includes('regeneration')) caps.survivability = (caps.survivability || 0) + 1
  if (allText.includes('demise')) caps.survivability = (caps.survivability || 0) + 1
  const df = card.df || card.defense || 0
  if (df >= 6) caps.survivability = (caps.survivability || 0) + 1
  const wounds = card.health || card.wounds || 0
  if (wounds >= 8) caps.survivability = (caps.survivability || 0) + 1
  if (wounds >= 10) caps.survivability = (caps.survivability || 0) + 1
  
  // DAMAGE
  if (roles.includes('aggro') || roles.includes('beater')) caps.damage = (caps.damage || 0) + 2
  ;(card.attack_actions || []).forEach(atk => {
    const dmg = atk.damage
    if (dmg && typeof dmg === 'object' && dmg.severe >= 5) {
      caps.damage = (caps.damage || 0) + 1
      caps.alpha_strike = (caps.alpha_strike || 0) + 1
    }
  })
  if (allText.includes('execute')) caps.alpha_strike = (caps.alpha_strike || 0) + 2
  
  // MELEE / ENGAGEMENT
  const meleeAttacks = (card.attack_actions || []).filter(atk => {
    const range = atk.range
    return range && (range <= 2 || range === '1' || range === '2')
  }).length
  if (meleeAttacks > 0) {
    caps.melee = (caps.melee || 0) + 1
    caps.engagement = (caps.engagement || 0) + 1
  }
  if (meleeAttacks >= 2) {
    caps.melee = (caps.melee || 0) + 1
    caps.engagement = (caps.engagement || 0) + 1
  }
  if (allText.includes('cannot disengage') || allText.includes('engagement range')) {
    caps.engagement = (caps.engagement || 0) + 2
  }
  
  // PUSH/PULL/CONTROL
  if (roles.includes('control')) caps.push_pull = (caps.push_pull || 0) + 1
  if (allText.includes('lure') || allText.includes('obey')) caps.push_pull = (caps.push_pull || 0) + 3
  if (allText.includes('push') || allText.includes('place target')) caps.push_pull = (caps.push_pull || 0) + 1
  
  // MARKER CREATION (non-scheme)
  if (allText.includes('corpse marker') || allText.includes('scrap marker') || allText.includes('pyre marker')) {
    caps.marker_creation = (caps.marker_creation || 0) + 2
  }
  
  // ACTIVATION EFFICIENCY
  const station = (card.station || '').toLowerCase()
  const cost = card.cost || 0
  if (station === 'minion' && cost <= 5) caps.cheap_activations = (caps.cheap_activations || 0) + 2
  if (station === 'minion') caps.minion_count = (caps.minion_count || 0) + 1
  
  // SPREAD
  if (allText.includes('unbury') || allText.includes('from buried')) caps.spread = (caps.spread || 0) + 2
  if ((caps.mobility || 0) >= 3) caps.spread = (caps.spread || 0) + 1
  
  return caps
}

// Aggregate crew capabilities
const aggregateCrewCapabilities = (crew) => {
  const totals = {}
  crew.forEach(model => {
    const caps = getModelCapabilities(model)
    Object.entries(caps).forEach(([cap, val]) => {
      totals[cap] = (totals[cap] || 0) + val
    })
  })
  return totals
}

// Get pool requirements from selected objectives
const getPoolRequirements = (strategyName, schemeNames) => {
  const requirements = {}
  const normalize = (key) => key?.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_')
  
  const stratKey = normalize(strategyName)
  if (STRATEGY_REQUIREMENTS[stratKey]) {
    Object.entries(STRATEGY_REQUIREMENTS[stratKey].needs).forEach(([cap, val]) => {
      requirements[cap] = (requirements[cap] || 0) + val
    })
  }
  
  schemeNames.forEach(scheme => {
    const schemeKey = normalize(scheme)
    if (SCHEME_REQUIREMENTS[schemeKey]) {
      Object.entries(SCHEME_REQUIREMENTS[schemeKey].needs).forEach(([cap, val]) => {
        requirements[cap] = (requirements[cap] || 0) + val
      })
    }
  })
  
  return requirements
}

// Analyze gaps between crew and requirements
const analyzePoolGaps = (crewCaps, requirements) => {
  const gaps = []
  const strengths = []
  
  Object.entries(requirements).forEach(([cap, needed]) => {
    const have = crewCaps[cap] || 0
    const ratio = needed > 0 ? have / needed : 1
    
    if (ratio < 0.5) {
      gaps.push({ capability: cap, needed, have, severity: 'critical', shortfall: needed - have })
    } else if (ratio < 1) {
      gaps.push({ capability: cap, needed, have, severity: 'warning', shortfall: needed - have })
    } else if (ratio >= 1.5) {
      strengths.push({ capability: cap, have, needed })
    }
  })
  
  gaps.sort((a, b) => b.shortfall - a.shortfall)
  return { gaps, strengths }
}

// ===========================================================================
// ROLE DESCRIPTIONS - for display in crew builder
// ===========================================================================
const ROLE_DESCRIPTIONS = {
  'scheme_runner': {
    label: 'Scheme Runner',
    description: 'Fast, evasive models that score schemes',
    icon: ''
  },
  'beater': {
    label: 'Beater',
    description: 'High damage dealers',
    icon: ''
  },
  'tank': {
    label: 'Tank',
    description: 'Durable models that absorb damage',
    icon: ''
  },
  'support': {
    label: 'Support',
    description: 'Buffs allies or heals',
    icon: ''
  },
  'control': {
    label: 'Control',
    description: 'Manipulates enemy positioning or actions',
    icon: ''
  },
  'summoner': {
    label: 'Summoner',
    description: 'Creates new models',
    icon: ''
  },
  'marker_manipulation': {
    label: 'Marker Manipulation',
    description: 'Interacts with strategy/scheme markers',
    icon: ''
  },
  'condition_specialist': {
    label: 'Condition Specialist',
    description: 'Applies or removes conditions',
    icon: ''
  }
}

// ===========================================================================
// OBJECTIVE REQUIREMENTS - what cards need to satisfy objectives
// ===========================================================================
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

// ===========================================================================
// SYNERGY SYSTEM - Detect beneficial interactions between models
// ===========================================================================

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

// ===========================================================================
// CREW SERIALIZATION - URL sharing and localStorage persistence
// ===========================================================================
const CREW_STORAGE_KEY = 'malifaux_crew_draft'

// Serialize crew state to compact JSON
const serializeCrew = (crewState) => {
  const { selectedMaster, crewBudget, crewRoster, crewStrategy, schemePool, chosenSchemes } = crewState
  if (!selectedMaster) return null
  return {
    m: selectedMaster.id,
    b: crewBudget,
    r: crewRoster.map(model => model.id),
    s: crewStrategy || '',
    sp: schemePool || [],       // 5 available schemes
    sc: chosenSchemes || []     // 2 chosen schemes
  }
}

// Deserialize compact JSON back to IDs
const deserializeCrew = (data) => {
  if (!data || !data.m) return null
  return {
    masterId: data.m,
    budget: data.b || 50,
    modelIds: data.r || [],
    strategyId: data.s || '',
    schemePoolIds: data.sp || [],
    schemeIds: data.sc || []
  }
}

// Encode crew to URL-safe base64 string
const encodeCrewToURL = (crewState) => {
  const serialized = serializeCrew(crewState)
  if (!serialized) return null
  const json = JSON.stringify(serialized)
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Decode URL parameter back to crew data
const decodeCrewFromURL = (encoded) => {
  if (!encoded) return null
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) base64 += '='
    const json = atob(base64)
    return deserializeCrew(JSON.parse(json))
  } catch (e) {
    console.error('Failed to decode crew URL:', e)
    return null
  }
}

// Generate full shareable URL
const generateShareURL = (crewState) => {
  const encoded = encodeCrewToURL(crewState)
  if (!encoded) return null
  const url = new URL(window.location.href)
  url.searchParams.set('crew', encoded)
  url.hash = ''
  return url.toString()
}

// Check URL for crew parameter on page load
const getCrewFromCurrentURL = () => {
  const params = new URLSearchParams(window.location.search)
  return decodeCrewFromURL(params.get('crew'))
}

// Clear crew parameter from URL (after loading)
const clearCrewFromURL = () => {
  const url = new URL(window.location.href)
  url.searchParams.delete('crew')
  window.history.replaceState({}, '', url.toString())
}

// Save crew to localStorage
const saveCrewToStorage = (crewState) => {
  const serialized = serializeCrew(crewState)
  if (!serialized) {
    localStorage.removeItem(CREW_STORAGE_KEY)
    return
  }
  localStorage.setItem(CREW_STORAGE_KEY, JSON.stringify({ ...serialized, _saved: Date.now() }))
}

// Load crew from localStorage
const loadCrewFromStorage = () => {
  try {
    const stored = localStorage.getItem(CREW_STORAGE_KEY)
    if (!stored) return null
    return deserializeCrew(JSON.parse(stored))
  } catch (e) {
    console.error('Failed to load crew from storage:', e)
    return null
  }
}

// Clear saved crew from localStorage
const clearCrewStorage = () => {
  localStorage.removeItem(CREW_STORAGE_KEY)
}

// Hydrate deserialized IDs back to full objects
const hydrateCrew = (crewData, cards, strategies, schemes) => {
  if (!crewData) return null
  const { masterId, budget, modelIds, strategyId, schemePoolIds, schemeIds } = crewData
  
  // Find master
  const master = cards.find(c => c.id === masterId)
  if (!master) {
    console.warn('Could not find master:', masterId)
    return null
  }
  
  // Find roster models (preserve duplicates, add rosterId)
  const roster = []
  modelIds.forEach((id, index) => {
    const model = cards.find(c => c.id === id)
    if (model) {
      roster.push({ ...model, rosterId: Date.now() + index })
    } else {
      console.warn('Could not find model:', id)
    }
  })
  
  // Validate strategy and schemes
  const validStrategy = strategies[strategyId] ? strategyId : ''
  const validSchemePool = (schemePoolIds || []).filter(id => schemes[id])
  const validSchemes = schemeIds.filter(id => schemes[id]).slice(0, 2)
  
  return {
    selectedMaster: master,
    crewBudget: budget,
    crewRoster: roster,
    crewStrategy: validStrategy,
    schemePool: validSchemePool,
    chosenSchemes: validSchemes
  }
}

// Copy shareable URL to clipboard
const copyCrewToClipboard = async (crewState) => {
  const url = generateShareURL(crewState)
  if (!url) return false
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch (e) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = url
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return true
  }
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
  const [stationFilter, setStationFilter] = useState('')
  const [dataIssueFilter, setDataIssueFilter] = useState('')
  
  // State - Modal
  const [selectedCard, setSelectedCard] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null) // Track which variant art to show
  const [modalView, setModalView] = useState('dual') // 'dual', 'front', 'back'
  const [modalImagesLoaded, setModalImagesLoaded] = useState({ front: false, back: false })
  
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
  const [counterCrewReasoning, setCounterCrewReasoning] = useState(null) // Explains why counter-crew was picked
  const [counterDifficulty, setCounterDifficulty] = useState('challenging') // 'well-matched', 'challenging', 'strongest'
  
  // State - Crew Builder
  const [selectedMaster, setSelectedMaster] = useState(null)
  const [hoveredMaster, setHoveredMaster] = useState(null)
  const [masterFilter, setMasterFilter] = useState('')
  const [crewRoster, setCrewRoster] = useState([])
  const [crewBudget, setCrewBudget] = useState(50)
  const [crewStrategy, setCrewStrategy] = useState('')
  const [schemePool, setSchemePool] = useState([]) // 5 schemes flipped face-up (available)
  const [chosenSchemes, setChosenSchemes] = useState([]) // 2 schemes player chooses to score
  const [synergyPanelOpen, setSynergyPanelOpen] = useState(false)
  const [opponentSynergyPanelOpen, setOpponentSynergyPanelOpen] = useState(false)
  const [poolAnalysisOpen, setPoolAnalysisOpen] = useState(true)
  const [objectivesCardsOpen, setObjectivesCardsOpen] = useState(true) // Show objective cards when selected
  const [masterCrewCardFlipped, setMasterCrewCardFlipped] = useState(false) // false = Master front, true = Crew front
  const [opponentCrewCardFlipped, setOpponentCrewCardFlipped] = useState(false) // false = Master front, true = Crew front
  const [shareStatus, setShareStatus] = useState('') // For share button feedback

  // Parse card data - handle both array and {cards: [...]} formats, merge with crew and upgrade data
  const allCards = useMemo(() => {
    const cards = Array.isArray(cardData) ? cardData : (cardData.cards || [])
    const crews = Array.isArray(crewData) ? crewData : (crewData.cards || [])
    const upgrades = Array.isArray(upgradeData) ? upgradeData : (upgradeData.cards || [])
    return [...cards, ...crews, ...upgrades]
  }, [])
  
  // Create a stats fingerprint for a card (used to detect gameplay vs cosmetic variants)
  const getStatsFingerprint = (card) => {
    return `${card.cost}|${card.defense}|${card.health}|${card.willpower}`
  }
  
  // Group cosmetic variants by name+stats for lookup (same name + same stats = cosmetic variant)
  const variantGroups = useMemo(() => {
    const groups = {}
    const seenIds = new Set()
    
    allCards.forEach(card => {
      if (card.card_type !== 'Stat') return
      // Skip true duplicates (same ID)
      if (seenIds.has(card.id)) return
      seenIds.add(card.id)
      
      const name = card.name
      const fingerprint = getStatsFingerprint(card)
      const groupKey = `${name}|${fingerprint}`
      
      if (!groups[groupKey]) groups[groupKey] = []
      // Avoid adding cards with same variant letter
      const isDupe = groups[groupKey].some(c => c.variant === card.variant)
      if (!isDupe) groups[groupKey].push(card)
    })
    
    // Sort each group so 'A' or null comes first
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const vA = a.variant || ''
        const vB = b.variant || ''
        if (vA === 'None' || vA === '') return -1
        if (vB === 'None' || vB === '') return 1
        return vA.localeCompare(vB)
      })
    })
    return groups
  }, [allCards])
  
  // Get cosmetic variants for a specific card (same name AND same stats)
  const getCardVariants = useCallback((card) => {
    if (!card?.name) return []
    const fingerprint = getStatsFingerprint(card)
    const groupKey = `${card.name}|${fingerprint}`
    return variantGroups[groupKey] || [card]
  }, [variantGroups])
  
  const cards = useMemo(() => {
    // Process all card types:
    // - Stat cards: deduplicate cosmetic variants (same name + same stats, keep only first/A variant)
    // - Crew/Upgrade cards: include as-is (no deduplication needed)
    
    const seenIds = new Set()
    const seenNameStats = new Set() // Track name+stats combo for cosmetic dedup (Stat cards only)
    const primaryCards = []
    
    // Separate Stat cards (need deduplication) from other card types
    const statCards = allCards.filter(card => card.card_type === 'Stat')
    const otherCards = allCards.filter(card => card.card_type !== 'Stat')
    
    // Sort Stat cards so A variants or null come first
    const sortedStatCards = [...statCards].sort((a, b) => {
      const vA = a.variant || ''
      const vB = b.variant || ''
      if (vA === 'None' || vA === '') return -1
      if (vB === 'None' || vB === '') return 1
      return vA.localeCompare(vB)
    })
    
    // Process Stat cards with deduplication
    sortedStatCards.forEach(card => {
      // Skip true duplicates (same ID)
      if (seenIds.has(card.id)) return
      seenIds.add(card.id)
      
      // For cosmetic variants: same name + same stats = only keep first
      const fingerprint = getStatsFingerprint(card)
      const nameStatsKey = `${card.name}|${fingerprint}`
      
      if (!seenNameStats.has(nameStatsKey)) {
        seenNameStats.add(nameStatsKey)
        primaryCards.push(card)
      }
      // If same name but DIFFERENT stats, it's a gameplay variant - already added with different fingerprint
    })
    
    // Add other card types (Crew, Upgrade, etc.) without deduplication
    otherCards.forEach(card => {
      if (seenIds.has(card.id)) return
      seenIds.add(card.id)
      primaryCards.push(card)
    })
    
    return primaryCards
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
    // Use allCards to include all card types (Stat, Crew, Upgrade, etc.)
    return [...new Set(allCards.map(c => c.card_type).filter(Boolean))].sort()
  }, [allCards])
  const metaFactions = useMemo(() =>Object.keys(FACTION_META).sort(), [])

  // Get station counts for filter dropdown (shows counts for quick data validation)
  const stationCounts = useMemo(() => {
    const counts = {}
    const STATIONS = ['Master', 'Henchman', 'Enforcer', 'Minion', 'Totem', 'Peon']
    STATIONS.forEach(s => counts[s] = 0)
    
    cards.forEach(card => {
      // Use card.station field if available, fall back to checking characteristics
      const station = card.station
      if (station && STATIONS.includes(station)) {
        counts[station]++
      } else {
        // Fallback for legacy data format
        const chars = card.characteristics || []
        for (const s of STATIONS) {
          if (chars.includes(s)) {
            counts[s]++
            break
          }
        }
      }
    })
    return counts
  }, [cards])

  // Get data issue counts for debug filter dropdown
  const dataIssueCounts = useMemo(() => {
    const counts = {
      any: 0,
      missing_cost: 0,
      missing_chars: 0,
      missing_keywords: 0,
      missing_station: 0,
    }
    
    const STATIONS = ['Master', 'Henchman', 'Enforcer', 'Minion', 'Totem', 'Peon']
    
    cards.forEach(card => {
      const chars = card.characteristics || []
      // Use card.station field if available, fall back to checking characteristics
      const station = card.station
      const hasStation = station ? STATIONS.includes(station) : STATIONS.some(s => chars.includes(s))
      
      // Use the hireable field if present, otherwise fall back to station-based check
      const isHireable = card.hireable !== undefined 
        ? card.hireable 
        : !['Master', 'Totem'].includes(station)
      
      let hasIssue = false
      
      // Missing cost (only for hireable models - not summoned-only)
      if (card.cost == null && isHireable) {
        counts.missing_cost++
        hasIssue = true
      }
      
      // Missing characteristics entirely
      if (chars.length === 0) {
        counts.missing_chars++
        hasIssue = true
      }
      
      // Missing keywords
      if (!card.keywords || card.keywords.length === 0) {
        counts.missing_keywords++
        hasIssue = true
      }
      
      // Has characteristics but no station
      if (chars.length > 0 && !hasStation) {
        counts.missing_station++
        hasIssue = true
      }
      
      if (hasIssue) counts.any++
    })
    
    return counts
  }, [cards])

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

  // ===========================================================================
// FIXED HIRING POOLS - Filter to only include Stat cards (actual models)
// ===========================================================================
// Replace lines ~1394-1460 in App.jsx with these three useMemo hooks

  // Get keyword models for selected master (deduplicated)
  const keywordModels = useMemo(() => {
    if (!selectedMaster) return []
    const primaryKeyword = selectedMaster.primary_keyword
    if (!primaryKeyword) return []
    
    const filtered = cards.filter(card => 
      card.card_type === 'Stat' &&    // ONLY actual models, not Crew/Upgrade cards
      card.id !== selectedMaster.id &&
      (card.keywords || []).includes(primaryKeyword) &&
      card.station !== 'Master' &&   // No masters
      card.station !== 'Totem'       // No totems (they're free with master)
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
  // IMPORTANT: Versatile is in characteristics, not keywords!
  const versatileModels = useMemo(() => {
    if (!selectedMaster) return []
    const masterFaction = selectedMaster.faction
    const primaryKeyword = selectedMaster.primary_keyword
    
    const filtered = cards.filter(card => 
      card.card_type === 'Stat' &&                            // ONLY actual models, not Crew/Upgrade cards
      card.faction === masterFaction &&
      (card.characteristics || []).includes('Versatile') &&  // Check characteristics, not keywords!
      !(card.keywords || []).includes(primaryKeyword) &&     // Not already in-keyword
      card.station !== 'Master' &&                           // No masters
      card.station !== 'Totem'                               // No totems (they're free with master)
    ).sort((a, b) => (b.cost || 0) - (a.cost || 0))
    
    // Deduplicate by name
    const seen = new Set()
    return filtered.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    })
  }, [selectedMaster, cards])

  // Get Out-of-Keyword (OOK) models - same faction, not keyword, not versatile
  // These cost +1ss to hire and count toward the 2 OOK limit
  const ookModels = useMemo(() => {
    if (!selectedMaster) return []
    const masterFaction = selectedMaster.faction
    const primaryKeyword = selectedMaster.primary_keyword
    
    const filtered = cards.filter(card => 
      card.card_type === 'Stat' &&                            // ONLY actual models, not Crew/Upgrade cards
      card.faction === masterFaction &&
      !(card.keywords || []).includes(primaryKeyword) &&     // Not in-keyword
      !(card.characteristics || []).includes('Versatile') && // Not versatile
      card.station !== 'Master' &&                           // No masters
      card.station !== 'Totem'                               // No totems
    ).sort((a, b) => (b.cost || 0) - (a.cost || 0))
    
    // Deduplicate by name
    const seen = new Set()
    return filtered.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    })
  }, [selectedMaster, cards])

  // State for OOK section collapse
  const [ookSectionOpen, setOokSectionOpen] = useState(false)

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
    chosenSchemes.forEach(schemeId => {
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
      
      // Add randomization factor (30% variation)
      const randomFactor = 0.7 + Math.random() * 0.6
      score *= randomFactor
      
      return score
    }
    
    // Get keyword pool (models sharing master's keyword)
    const rawKeywordPool = cards.filter(card => 
      card.id !== opponentMaster.id &&
      (card.keywords || []).includes(keyword) &&
      !(card.characteristics || []).includes('Master')
    )
    
    const seen = new Set()
    const keywordPool = rawKeywordPool.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    }).map(card => ({
      ...card,
      opponentScore: scoreCard(card),
      isOOK: false
    })).sort((a, b) => b.opponentScore - a.opponentScore)
    
    // Get versatile pool (faction models with Versatile keyword, not in keyword pool)
    const masterFaction = opponentMaster.faction
    const rawVersatilePool = cards.filter(card =>
      card.faction === masterFaction &&
      (card.keywords || []).includes('Versatile') &&
      !(card.keywords || []).includes(keyword) &&
      !(card.characteristics || []).includes('Master')
    )
    
    const versatilePool = rawVersatilePool.filter(card => {
      if (seen.has(card.name)) return false
      seen.add(card.name)
      return true
    }).map(card => ({
      ...card,
      opponentScore: scoreCard(card) * 0.9, // Slight preference for keyword
      isOOK: true
    })).sort((a, b) => b.opponentScore - a.opponentScore)
    
    // Combined pool for filling
    const allPool = [...keywordPool, ...versatilePool].sort((a, b) => b.opponentScore - a.opponentScore)
    
    // Build crew with budget
    const crew = []
    const targetBudget = 44 + Math.floor(Math.random() * 3) // 44-46ss target
    const maxBudget = 50
    let currentBudget = 0
    const minionCounts = {}
    const usedNames = new Set()
    let ookCount = 0
    const ookLimit = 2
    
    // Helper to try adding
    const tryAdd = (card) => {
      const isOOK = card.isOOK || false
      const tax = isOOK ? 1 : 0
      const cost = (card.cost || 0) + tax
      
      if (cost === 0) return false // Skip cards with no cost data
      if (currentBudget + cost > maxBudget) return false
      if (isOOK && ookCount >= ookLimit) return false
      
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
      if (isOOK) ookCount++
      return true
    }
    
    // Phase 1: Totem (high chance but not guaranteed)
    const totem = keywordPool.find(c => (c.characteristics || []).includes('Totem'))
    if (totem && Math.random() > 0.15) { // 85% chance to take totem
      tryAdd(totem)
    }
    
    // Phase 2: Henchmen from keyword pool first, then versatile if needed
    const keywordHench = keywordPool.filter(c => (c.characteristics || []).includes('Henchman'))
    const versatileHench = versatilePool.filter(c => (c.characteristics || []).includes('Henchman'))
    const allHench = [...keywordHench, ...versatileHench].sort(() => Math.random() - 0.5)
    const henchToTake = Math.random() > 0.6 ? 2 : 1
    for (let i = 0; i < Math.min(henchToTake, allHench.length); i++) {
      if (currentBudget < targetBudget - 5) {
        tryAdd(allHench[i])
      }
    }
    
    // Phase 3: Enforcers from combined pool
    const allEnforcers = allPool
      .filter(c => (c.characteristics || []).includes('Enforcer'))
      .sort((a, b) => b.opponentScore - a.opponentScore)
    const enfToTake = Math.random() > 0.5 ? 2 : 1
    for (let i = 0; i < Math.min(enfToTake, allEnforcers.length); i++) {
      if (currentBudget < targetBudget - 4) {
        tryAdd(allEnforcers[i])
      }
    }
    
    // Phase 4: Fill with minions from combined pool
    const allMinions = allPool
      .filter(c => (c.characteristics || []).includes('Minion'))
      .sort((a, b) => b.opponentScore - a.opponentScore)
    
    // First pass: one of each high-scoring minion
    for (const minion of allMinions) {
      if (currentBudget >= targetBudget) break
      tryAdd(minion)
    }
    
    // Second pass: fill with duplicates if needed
    let fillAttempts = 0
    while (currentBudget < targetBudget - 2 && fillAttempts < 20) {
      fillAttempts++
      let added = false
      for (const minion of allMinions) {
        if (currentBudget >= targetBudget) break
        if (tryAdd(minion)) {
          added = true
          break
        }
      }
      if (!added) break
    }
    
    // Phase 5: Final fill - try any remaining models
    if (currentBudget < targetBudget - 4) {
      for (const card of allPool) {
        if (currentBudget >= targetBudget) break
        tryAdd(card)
      }
    }
    
    setOpponentCrew(crew)
  }, [opponentMaster, cards, crewStrategy, chosenSchemes, strategies, schemes])

  // Regenerate opponent crew when master or objectives change
  useEffect(() => {
    generateOpponentCrew()
  }, [opponentMaster, crewStrategy, chosenSchemes])

  // Get opponent crew cost (including OOK tax)
  const opponentCrewCost = useMemo(() => {
    return opponentCrew.reduce((sum, card) => {
      const tax = card.isOOK ? 1 : 0
      return sum + (card.cost || 0) + tax
    }, 0)
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

  // ===========================================================================
  // COUNTER-CREW GENERATOR - Builds an opponent crew that counters the player's crew
  // ===========================================================================
  
  // Creature types to exclude from keyword matching
  const CREATURE_TYPES = new Set(['Living', 'Undead', 'Construct', 'Beast', 'Spirit', 'Nightmare', 'Tyrant', 'Elemental'])
  
  // Analyze player's crew for weaknesses
  const analyzePlayerCrew = useCallback(() => {
    if (!selectedMaster || crewRoster.length === 0) return null
    
    const allModels = [selectedMaster, ...crewRoster]
    
    // Collect conditions applied/required across crew
    const conditionsApplied = new Set()
    const conditionsRequired = new Set()
    const combatTags = new Set()
    const defenseTags = new Set()
    const roles = new Set()
    
    let totalDf = 0, totalWp = 0, totalSp = 0, modelCount = 0
    let hasHealing = false
    let hasArmor = false
    
    allModels.forEach(model => {
      const tags = model.extracted_tags || {}
      const modelRoles = model.roles || []
      const defTags = tags.defense_tags || []
      
      // Collect tags
      ;(tags.conditions_applied || []).forEach(c => conditionsApplied.add(c))
      ;(tags.conditions_required || []).forEach(c => conditionsRequired.add(c))
      ;(tags.combat_tags || []).forEach(c => combatTags.add(c))
      ;(tags.defense_tags || []).forEach(c => defenseTags.add(c))
      modelRoles.forEach(r => roles.add(r))
      
      // Stats
      if (model.defense) { totalDf += model.defense; modelCount++ }
      if (model.willpower) totalWp += model.willpower
      if (model.speed != null) totalSp += model.speed
      
      // Capabilities
      if (modelRoles.includes('support')) hasHealing = true
      if (defTags.includes('armor') || defTags.includes('damage_reduction')) hasArmor = true
    })
    
    // Conditions player is WEAK to = all conditions minus ones they require/handle
    const allConditions = ['burning', 'slow', 'poison', 'stunned', 'injured', 'staggered', 'distracted', 'shielded', 'focused']
    const conditionsWeakTo = allConditions.filter(c => !conditionsRequired.has(c) && !conditionsApplied.has(c))
    
    const avgDf = modelCount > 0 ? totalDf / modelCount : 5
    const avgWp = modelCount > 0 ? totalWp / modelCount : 5
    const avgSp = modelCount > 0 ? totalSp / modelCount : 5
    
    return {
      conditionsApplied: Array.from(conditionsApplied),
      conditionsRequired: Array.from(conditionsRequired),
      conditionsWeakTo,
      combatTags: Array.from(combatTags),
      defenseTags: Array.from(defenseTags),
      roles: Array.from(roles),
      avgDf,
      avgWp,
      avgSp,
      lowestStat: avgWp < avgDf ? 'wp' : 'df',
      hasHealing,
      hasArmor,
      isSlowCrew: avgSp < 5,
      modelCount: allModels.length,
    }
  }, [selectedMaster, crewRoster])
  
  // Build keyword profile for a master's crew
  const getKeywordProfile = useCallback((masterCard) => {
    const keyword = masterCard.primary_keyword
    if (!keyword) return null
    
    const keywordModels = cards.filter(c => 
      c.card_type === 'Stat' &&
      c.keywords?.some(k => !CREATURE_TYPES.has(k) && k === keyword)
    )
    
    const profile = {
      conditionsApplied: new Set(),
      conditionsRequired: new Set(),
      combatTags: new Set(),
      defenseTags: new Set(),
      roles: new Set(),
    }
    
    keywordModels.forEach(m => {
      const tags = m.extracted_tags || {}
      ;(tags.conditions_applied || []).forEach(c => profile.conditionsApplied.add(c))
      ;(tags.conditions_required || []).forEach(c => profile.conditionsRequired.add(c))
      ;(tags.combat_tags || []).forEach(c => profile.combatTags.add(c))
      ;(tags.defense_tags || []).forEach(c => profile.defenseTags.add(c))
      ;(m.roles || []).forEach(r => profile.roles.add(r))
    })
    
    return profile
  }, [cards])
  
  // Generate a counter-crew based on player's crew weaknesses
  const generateCounterCrew = useCallback(() => {
    const playerProfile = analyzePlayerCrew()
    if (!playerProfile) {
      setCounterCrewReasoning(null)
      return
    }
    
    // Get all masters not in player's faction
    const playerFaction = selectedMaster?.faction
    const availableMasters = cards.filter(c => 
      c.card_type === 'Stat' &&
      (c.characteristics || []).includes('Master') &&
      c.faction !== playerFaction &&
      c.primary_keyword
    )
    
    // Deduplicate masters by name
    const uniqueMasters = []
    const seenNames = new Set()
    availableMasters.forEach(m => {
      const baseName = m.name?.split(',')[0]
      if (!seenNames.has(baseName)) {
        seenNames.add(baseName)
        uniqueMasters.push(m)
      }
    })
    
    // Difficulty settings
    const difficultyConfig = {
      'well-matched': { scoreMultiplier: 0.5, poolSize: 10, pickStrategy: 'random' },
      'challenging': { scoreMultiplier: 1.0, poolSize: 5, pickStrategy: 'weighted' },
      'strongest': { scoreMultiplier: 1.5, poolSize: 3, pickStrategy: 'top' },
    }
    const config = difficultyConfig[counterDifficulty] || difficultyConfig['challenging']
    
    // Score each master for counter-picking
    const scoredMasters = uniqueMasters.map(master => {
      const profile = getKeywordProfile(master)
      if (!profile) return { master, score: 0, reasons: [] }
      
      let score = 0
      const reasons = []
      
      // Does this keyword BENEFIT from conditions player applies?
      const benefitsFrom = playerProfile.conditionsApplied.filter(c => 
        profile.conditionsRequired.has(c)
      )
      if (benefitsFrom.length > 0) {
        score += benefitsFrom.length * 15 * config.scoreMultiplier
        reasons.push(`Benefits from ${benefitsFrom.join(', ')} you apply`)
      }
      
      // Does this keyword APPLY conditions player is weak to?
      const appliesWeakness = playerProfile.conditionsWeakTo.filter(c =>
        profile.conditionsApplied.has(c)
      )
      if (appliesWeakness.length > 0) {
        score += appliesWeakness.length * 12 * config.scoreMultiplier
        reasons.push(`Applies ${appliesWeakness.join(', ')} you can't handle`)
      }
      
      // Anti-armor if player has armor
      if (playerProfile.hasArmor && 
          (profile.combatTags.has('irreducible') || profile.combatTags.has('armor_piercing'))) {
        score += 15 * config.scoreMultiplier
        reasons.push('Irreducible/armor-piercing bypasses your armor')
      }
      
      // Execute if player has healing
      if (playerProfile.hasHealing && profile.combatTags.has('execute')) {
        score += 10 * config.scoreMultiplier
        reasons.push('Execute abilities counter your healing')
      }
      
      // Target weak stat
      if (playerProfile.lowestStat === 'wp' && profile.roles.has('control')) {
        score += 8 * config.scoreMultiplier
        reasons.push(`Your crew has low Wp (avg ${playerProfile.avgWp.toFixed(1)}) - Wp-targeting attacks hurt`)
      }
      
      // Fast crew vs slow player
      if (playerProfile.isSlowCrew && profile.roles.has('scheme_runner')) {
        score += 8 * config.scoreMultiplier
        reasons.push('Mobile crew can out-position your slower models')
      }
      
      // Add random factor based on difficulty (more randomness = less optimal picks)
      const randomFactor = counterDifficulty === 'well-matched' ? 15 : 
                           counterDifficulty === 'strongest' ? 2 : 5
      score += Math.random() * randomFactor
      
      return { master, score, reasons }
    })
    
    // Sort by score and pick based on difficulty
    scoredMasters.sort((a, b) => b.score - a.score)
    const topMasters = scoredMasters.slice(0, config.poolSize).filter(m => m.score > 0)
    
    if (topMasters.length === 0) {
      // Fallback: random master
      const randomMaster = uniqueMasters[Math.floor(Math.random() * uniqueMasters.length)]
      setOpponentFaction(randomMaster.faction)
      setOpponentMaster(randomMaster)
      setOpponentCrewCardFlipped(false) // Reset to Master in front
      setCounterCrewReasoning({
        masterReason: 'Random selection (no specific counters found)',
        difficulty: counterDifficulty,
        highlights: []
      })
      return
    }
    
    // Pick based on strategy
    let selected
    if (config.pickStrategy === 'top') {
      // Strongest: always pick the best counter
      selected = topMasters[0]
    } else if (config.pickStrategy === 'random') {
      // Well-matched: more random selection from larger pool
      selected = topMasters[Math.floor(Math.random() * topMasters.length)]
    } else {
      // Challenging: weighted random from top contenders
      const weights = topMasters.map((m, i) =>Math.pow(0.6, i)) // 1, 0.6, 0.36, ...
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      let random = Math.random() * totalWeight
      let selectedIdx = 0
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i]
        if (random <= 0) {
          selectedIdx = i
          break
        }
      }
      selected = topMasters[selectedIdx]
    }
    
    // Set opponent faction and master (this triggers generateOpponentCrew via useEffect)
    setOpponentFaction(selected.master.faction)
    setOpponentMaster(selected.master)
    setOpponentCrewCardFlipped(false) // Reset to Master in front
    
    // Store reasoning
    setCounterCrewReasoning({
      masterName: selected.master.name,
      masterReason: selected.reasons.length > 0 
        ? selected.reasons[0] 
        : 'Strong keyword for this matchup',
      allReasons: selected.reasons,
      difficulty: counterDifficulty,
      playerProfile: {
        conditionsApplied: playerProfile.conditionsApplied,
        hasArmor: playerProfile.hasArmor,
        hasHealing: playerProfile.hasHealing,
        avgWp: playerProfile.avgWp.toFixed(1),
        avgDf: playerProfile.avgDf.toFixed(1),
      },
      highlights: [] // Will be populated after crew is generated
    })
    
  }, [analyzePlayerCrew, selectedMaster, cards, getKeywordProfile, counterDifficulty])

  // ===========================================================================
  // CREW MATH - Comprehensive cost tracking with M4E hiring rules
  // ===========================================================================
  
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
    setSelectedMaster(null)
    setCrewStrategy('')
    setSchemePool([])
    setChosenSchemes([])
    clearCrewStorage()
  }

  // ===========================================================================
  // SUGGEST CREW - Auto-populate crew using objective scoring and heuristics
  // Priority: Strategy >Schemes, Diversity >Stacking, Target 44-46ss
  // ALWAYS fills to target - uses Versatile/OOK when keyword lacks objective fit
  // ===========================================================================
  
  // Calculate keyword fit score for current objectives
  const keywordFitAnalysis = useMemo(() => {
    if (!selectedMaster) return { score: 0, maxScore: 0, percentage: 100, warning: null, suggestions: [] }
    
    // Get all required roles
    const requiredRoles = new Set()
    if (crewStrategy && strategies[crewStrategy]?.favors_roles) {
      strategies[crewStrategy].favors_roles.forEach(r => requiredRoles.add(r))
    }
    chosenSchemes.forEach(schemeId => {
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
          rolesDisplay: matchingRoles.map(r =>ROLE_DESCRIPTIONS[r]?.label || r).join(', ')
        })
      }
    })
    
    const coveredByKeyword = keywordRoles.size
    const totalRequired = requiredRoles.size
    const percentage = Math.round((coveredByKeyword / totalRequired) * 100)
    
    // Find missing roles
    const missingRoles = [...requiredRoles].filter(r => !keywordRoles.has(r))
    const missingRolesDisplay = missingRoles.map(r =>ROLE_DESCRIPTIONS[r]?.label || r)
    
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
  }, [selectedMaster, crewStrategy, chosenSchemes, keywordModels, versatileModels, strategies, schemes])
  
  // ===========================================================================
  // SYNERGY CALCULATOR - Reusable function for both player and opponent crews
  // ===========================================================================
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
        
        // =========================================================================== SYNERGY DETECTION 
        
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
            icon: ''
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
            icon: ''
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
            icon: ''
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
                    icon: ''
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
              icon: ''
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
              icon: ''
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
              icon: ''
            })
            modelSynergyCounts[idA].synergies++
            modelSynergyCounts[idB].synergies++
          }
        }
        
        // 6. Resource generation  consumption synergy
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
              icon: ''
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
              icon: ''
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
              icon: ''
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
            icon: ''
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
    chosenSchemes.forEach(schemeId => {
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

  // Toggle scheme in the available pool (5 schemes flipped face-up per encounter)
  const togglePoolScheme = (schemeId) => {
    if (schemePool.includes(schemeId)) {
      setSchemePool(schemePool.filter(s => s !== schemeId))
      // Also remove from chosen if it was chosen
      setChosenSchemes(chosenSchemes.filter(s => s !== schemeId))
    } else if (schemePool.length < 5) {
      setSchemePool([...schemePool, schemeId])
    }
  }
  
  // Toggle scheme selection for scoring (pick 2 from the pool)
  const toggleChosenScheme = (schemeId) => {
    if (!schemePool.includes(schemeId)) return // Can only choose from pool
    if (chosenSchemes.includes(schemeId)) {
      setChosenSchemes(chosenSchemes.filter(s => s !== schemeId))
    } else if (chosenSchemes.length < 2) {
      setChosenSchemes([...chosenSchemes, schemeId])
    }
  }

  // Get favored roles for current crew objectives (based on chosen schemes, not full pool)
  const crewFavoredRoles = useMemo(() => {
    const roles = new Set()
    
    if (crewStrategy && strategies[crewStrategy]?.favors_roles) {
      strategies[crewStrategy].favors_roles.forEach(r => roles.add(r))
    }
    
    // Use chosenSchemes (the 2 player picked) not the full pool
    chosenSchemes.forEach(schemeId => {
      if (schemes[schemeId]?.favors_roles) {
        schemes[schemeId].favors_roles.forEach(r => roles.add(r))
      }
    })
    
    return roles
  }, [crewStrategy, chosenSchemes, strategies, schemes])

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
  // Uses bluepurplegold progression (safe for red-green colorblindness)
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
    if (!keyword) {
      console.log('[CrewCard Debug] Master has no primary_keyword:', selectedMaster.name)
      return null
    }
    
    // Normalize for comparison (remove hyphens, lowercase)
    const normalizeKeyword = (k) => k?.toLowerCase().replace(/-/g, ' ').trim()
    const normalizedKeyword = normalizeKeyword(keyword)
    
    // Debug: Log what we're looking for and what's available
    const crewCards = allCards.filter(c => c.card_type === 'Crew')
    console.log(`[CrewCard Debug] Looking for keyword: "${keyword}" (normalized: "${normalizedKeyword}")`)
    console.log(`[CrewCard Debug] Total Crew cards in allCards: ${crewCards.length}`)
    if (crewCards.length > 0) {
      console.log('[CrewCard Debug] Sample crew cards:', crewCards.slice(0, 3).map(c => ({
        name: c.name,
        subfaction: c.subfaction,
        keywords: c.keywords
      })))
    }
    
    // Find crew card by subfaction (primary match method)
    const bySubfaction = allCards.find(card => 
      card.card_type === 'Crew' &&
      normalizeKeyword(card.subfaction) === normalizedKeyword
    )
    if (bySubfaction) {
      console.log('[CrewCard Debug] Found by subfaction:', bySubfaction.name)
      return bySubfaction
    }
    
    // Fallback: check if keyword appears in crew card's keywords array
    const byKeywordArray = allCards.find(card =>
      card.card_type === 'Crew' &&
      (card.keywords || []).some(k => normalizeKeyword(k) === normalizedKeyword)
    )
    if (byKeywordArray) {
      console.log('[CrewCard Debug] Found by keywords array:', byKeywordArray.name)
      return byKeywordArray
    }
    
    // Last resort: name matching
    const byName = allCards.find(card => 
      card.card_type === 'Crew' &&
      card.name.toLowerCase().includes(selectedMaster.name.split(',')[0].toLowerCase())
    )
    if (byName) {
      console.log('[CrewCard Debug] Found by name match:', byName.name)
      return byName
    }
    
    console.log('[CrewCard Debug] NO CREW CARD FOUND for', selectedMaster.name)
    return null
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
  
  // ===========================================================================
  // CREW CARD TEXT ANALYSIS - Extract and highlight relevant rules
  // ===========================================================================
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
  
  // ===========================================================================
  // CARD SYNERGIES - Find synergizing cards for any given card (used in modal)
  // ===========================================================================
  const getCardSynergies = useCallback((card) => {
    if (!card) return { synergies: [], antiSynergies: [] }
    
    const synergies = []
    const antiSynergies = []
    const seenIds = new Set([card.id])
    
    const cardKeywords = card.keywords || []
    const cardRoles = card.roles || []
    const cardChars = card.characteristics || []
    const cardAbilityText = getAbilityText(card)
    const primaryKeyword = card.primary_keyword || cardKeywords[0]
    
    // Helper to add synergy if not duplicate
    const addSynergy = (targetCard, type, strength, reason, icon) => {
      if (seenIds.has(targetCard.id)) return
      seenIds.add(targetCard.id)
      synergies.push({ card: targetCard, type, strength, reason, icon })
    }
    
    // Scan all cards for synergies
    cards.forEach(other => {
      if (other.id === card.id) return
      
      const otherKeywords = other.keywords || []
      const otherRoles = other.roles || []
      const otherChars = other.characteristics || []
      const otherAbilityText = getAbilityText(other)
      const otherPrimaryKeyword = other.primary_keyword || otherKeywords[0]
      
      // 1. SHARED KEYWORD - same keyword means designed to work together
      const sharedKeywords = cardKeywords.filter(k => 
        otherKeywords.includes(k) && k !== 'Versatile'
      )
      if (sharedKeywords.length > 0) {
        addSynergy(other, 'shared_keyword', 0.8, `Shares ${sharedKeywords[0]} keyword`, '*')
      }
      
      // 2. KEYWORD BUFF - other card's abilities reference this card's keyword
      if (primaryKeyword && referencesKeyword(other, primaryKeyword)) {
        addSynergy(other, 'keyword_buff', 0.9, `Buffs ${primaryKeyword} models`, '+')
      }
      
      // 3. THIS CARD BUFFS OTHER - this card's abilities reference other's keyword  
      if (otherPrimaryKeyword && referencesKeyword(card, otherPrimaryKeyword)) {
        addSynergy(other, 'buffs_keyword', 0.85, `Benefits from ${card.name}'s buffs`, '+')
      }
      
      // 4. ROLE COMPLEMENTARITY
      for (const role of cardRoles) {
        const synData = ROLE_SYNERGIES[role]
        if (synData) {
          for (const otherRole of otherRoles) {
            if (synData.synergizes.includes(otherRole)) {
              addSynergy(other, 'role_complement', 0.6, 
                `${ROLE_DESCRIPTIONS[role]?.label || role} + ${ROLE_DESCRIPTIONS[otherRole]?.label || otherRole}`, '=')
              break
            }
          }
        }
      }
      
      // 5. CHARACTERISTIC SYNERGY (Totem + Master, Effigy + Emissary)
      for (const [charType, charData] of Object.entries(CHARACTERISTIC_SYNERGIES)) {
        if (cardChars.includes(charType) && otherChars.includes(charData.synergizesWith)) {
          addSynergy(other, 'characteristic', charData.strength, charData.reason, '~')
        }
        if (otherChars.includes(charType) && cardChars.includes(charData.synergizesWith)) {
          addSynergy(other, 'characteristic', charData.strength, charData.reason, '~')
        }
      }
      
      // 6. ABILITY STACKING (Black Blood, etc.)
      const cardAbilities = (card.abilities || []).map(a => (a.name || '').toLowerCase())
      const otherAbilities = (other.abilities || []).map(a => (a.name || '').toLowerCase())
      
      for (const [abilityKey, abilityData] of Object.entries(ABILITY_SYNERGIES)) {
        const hasCard = cardAbilities.some(a => a.includes(abilityKey.replace('_', ' ')))
        const hasOther = otherAbilities.some(a => a.includes(abilityKey.replace('_', ' ')))
        
        if (hasCard && hasOther && abilityData.stacksWith?.includes(abilityKey)) {
          addSynergy(other, 'ability_stack', 0.7, abilityData.reason, '#')
        }
      }
      
      // 7. RESOURCE FLOW - this card generates what other consumes (or vice versa)
      for (const [resourceType, patterns] of Object.entries(RESOURCE_PATTERNS)) {
        const cardGenerates = patterns.generators.some(p => cardAbilityText.includes(p.toLowerCase()))
        const cardConsumes = patterns.consumers.some(p => new RegExp(p, 'i').test(cardAbilityText))
        const otherGenerates = patterns.generators.some(p => otherAbilityText.includes(p.toLowerCase()))
        const otherConsumes = patterns.consumers.some(p => new RegExp(p, 'i').test(otherAbilityText))
        
        if (cardGenerates && otherConsumes) {
          addSynergy(other, 'resource_flow', 0.75, `Uses ${patterns.type} markers you create`, '@')
        }
        if (otherGenerates && cardConsumes) {
          addSynergy(other, 'resource_flow', 0.75, `Creates ${patterns.type} markers you need`, '@')
        }
        
        // Anti-synergy: both consume same resource
        if (cardConsumes && otherConsumes && !cardGenerates && !otherGenerates) {
          if (!antiSynergies.find(a => a.card.id === other.id)) {
            antiSynergies.push({ 
              card: other, 
              type: 'resource_competition', 
              reason: `Both compete for ${patterns.type} markers`,
              icon: ''
            })
          }
        }
      }
    })
    
    // Sort by strength
    synergies.sort((a, b) => b.strength - a.strength)
    
    return { synergies: synergies.slice(0, 12), antiSynergies: antiSynergies.slice(0, 4) }
  }, [cards])

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
    chosenSchemes.forEach(schemeId => {
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
  }, [selectedMaster, crewRoster, crewStrategy, schemePool, strategies, schemes, 
      keywordModels, versatileModels, remainingBudget])

  // ===========================================================================
  // SCHEME COVERAGE ANALYSIS - Can your crew score EACH scheme in the pool?
  // ===========================================================================
  const schemeCoverage = useMemo(() => {
    if (!selectedMaster || schemePool.length === 0) return []
    
    const allCrewModels = [selectedMaster, ...crewRoster]
    
    return schemePool.map(schemeId => {
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
        icon = ''
        message = `${count} models can score this`
      } else if (count >= 2) {
        level = 'adequate'
        icon = ''
        message = `${count} models - workable`
      } else if (count >= 1) {
        level = 'light'
        icon = ''
        message = `Only ${count} model - risky`
      } else {
        level = 'missing'
        icon = ''
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
  }, [selectedMaster, crewRoster, schemePool, schemes])

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
      
      // Station filter
      if (stationFilter) {
        // Use card.station field if available, fall back to checking characteristics
        const station = card.station
        const chars = card.characteristics || []
        const matchesStation = station === stationFilter || chars.includes(stationFilter)
        if (!matchesStation) return false
      }
      
      // Data issue filter (debug)
      if (dataIssueFilter) {
        const chars = card.characteristics || []
        const STATIONS = ['Master', 'Henchman', 'Enforcer', 'Minion', 'Totem', 'Peon']
        // Use card.station field if available, fall back to checking characteristics
        const station = card.station
        const hasStation = station ? STATIONS.includes(station) : STATIONS.some(s => chars.includes(s))
        
        // Use the hireable field if present, otherwise fall back to station-based check
        const isHireable = card.hireable !== undefined 
          ? card.hireable 
          : !['Master', 'Totem'].includes(station)
        
        if (dataIssueFilter === 'missing_cost') {
          if (!(card.cost == null && isHireable)) return false
        } else if (dataIssueFilter === 'missing_chars') {
          if (chars.length !== 0) return false
        } else if (dataIssueFilter === 'missing_keywords') {
          if (card.keywords && card.keywords.length > 0) return false
        } else if (dataIssueFilter === 'missing_station') {
          if (!(chars.length > 0 && !hasStation)) return false
        } else if (dataIssueFilter === 'any') {
          const hasMissingCost = card.cost == null && isHireable
          const hasMissingChars = chars.length === 0
          const hasMissingKeywords = !card.keywords || card.keywords.length === 0
          const hasMissingStation = chars.length > 0 && !hasStation
          if (!hasMissingCost && !hasMissingChars && !hasMissingKeywords && !hasMissingStation) return false
        }
      }
      
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
      soulstoneFilter, stationFilter, dataIssueFilter, selectedSchemes, selectedStrategy, schemes, strategies])

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
    setSelectedVariant(card) // Start with the card itself as the variant
    setModalView('dual')
    setModalImagesLoaded({ front: false, back: false })
    // Set navigation list - if provided, use it; otherwise default to filteredCards
    setModalNavigationList(navigationList || filteredCards)
  }
  
  const closeModal = () => {
    setSelectedCard(null)
    setSelectedVariant(null)
    setModalNavigationList([])
    setModalImagesLoaded({ front: false, back: false })
  }

  // Navigate between cards using the modal's navigation list
  const navigateCard = (direction) => {
    if (!selectedCard || modalNavigationList.length === 0) return
    
    // Reset loading state and variant for new card
    setModalImagesLoaded({ front: false, back: false })
    
    // Find current card in navigation list (match by id or rosterId for crew cards)
    const currentIndex = modalNavigationList.findIndex(c => 
      c.rosterId ? c.rosterId === selectedCard.rosterId : c.id === selectedCard.id
    )
    if (currentIndex === -1) return
    
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % modalNavigationList.length
      : (currentIndex - 1 + modalNavigationList.length) % modalNavigationList.length
    
    const newCard = modalNavigationList[newIndex]
    setSelectedCard(newCard)
    setSelectedVariant(newCard) // Reset to primary variant
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

  // ===========================================================================
  // CREW PERSISTENCE - Load from URL or localStorage, auto-save changes
  // ===========================================================================
  
  // Load crew from URL or localStorage on mount
  useEffect(() => {
    // Skip if data not ready
    if (!cards.length || !Object.keys(strategies).length) return
    
    // Priority 1: URL parameter (shared link)
    const urlCrew = getCrewFromCurrentURL()
    if (urlCrew) {
      const hydrated = hydrateCrew(urlCrew, cards, strategies, schemes)
      if (hydrated) {
        setSelectedMaster(hydrated.selectedMaster)
        setCrewBudget(hydrated.crewBudget)
        setCrewRoster(hydrated.crewRoster)
        setCrewStrategy(hydrated.crewStrategy)
        if (hydrated.schemePool?.length > 0) {
          setSchemePool(hydrated.schemePool)
        }
        setChosenSchemes(hydrated.chosenSchemes)
        
        // Switch to crew builder tab
        setViewMode('crew')
        
        // Clean URL so refreshing doesn't re-import
        clearCrewFromURL()
        
        console.log('Loaded crew from shared URL:', hydrated.selectedMaster.name, 
          '| Strategy:', hydrated.crewStrategy || 'none',
          '| Schemes:', hydrated.chosenSchemes.length)
        return
      }
    }
    
    // Priority 2: localStorage (resume draft)
    const savedCrew = loadCrewFromStorage()
    if (savedCrew) {
      const hydrated = hydrateCrew(savedCrew, cards, strategies, schemes)
      if (hydrated) {
        setSelectedMaster(hydrated.selectedMaster)
        setCrewBudget(hydrated.crewBudget)
        setCrewRoster(hydrated.crewRoster)
        setCrewStrategy(hydrated.crewStrategy)
        if (hydrated.schemePool?.length > 0) {
          setSchemePool(hydrated.schemePool)
        }
        setChosenSchemes(hydrated.chosenSchemes)
        
        console.log('Restored crew from localStorage:', hydrated.selectedMaster.name)
      }
    }
  }, [cards, strategies, schemes])

  // Auto-save crew to localStorage when it changes
  useEffect(() => {
    if (selectedMaster) {
      saveCrewToStorage({
        selectedMaster,
        crewBudget,
        crewRoster,
        crewStrategy,
        schemePool,
        chosenSchemes
      })
    }
  }, [selectedMaster, crewBudget, crewRoster, crewStrategy, schemePool, chosenSchemes])

  // Handle share crew button
  const handleShareCrew = async () => {
    if (!selectedMaster) {
      setShareStatus('Select a master first')
      setTimeout(() => setShareStatus(''), 2000)
      return
    }
    
    const success = await copyCrewToClipboard({
      selectedMaster,
      crewBudget,
      crewRoster,
      crewStrategy,
      schemePool,
      chosenSchemes
    })
    
    if (success) {
      setShareStatus('✓ Link copied!')
      setTimeout(() => setShareStatus(''), 2000)
    } else {
      setShareStatus('Failed to copy')
      setTimeout(() => setShareStatus(''), 2000)
    }
  }

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
  <h1>
  Malifaux 4E Crew Builder 
  <span style={{
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '400',
    verticalAlign: 'middle',
    marginLeft: '0.5rem'
  }}>Unofficial</span>
</h1>
    <span className="header-sub">{cards.length} models loaded</span>
  </div>
  <div className="header-right">
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
    title="December 2024"
    style={{
      fontSize: '0.75rem',
      padding: '0.1rem 0.3rem',
      opacity: '0.5'
    }}
  >
    v1.0.0
  </span>
</div>
  </div>
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
               {strategies[selectedStrategy].name}
              <span className="chip-remove"></span>
            </span>
          )}
          {selectedSchemes.map(schemeId => schemes[schemeId] && (
            <span 
              key={schemeId}
              className="objective-chip scheme"
              onClick={() => toggleScheme(schemeId)}
            >
               {schemes[schemeId].name}
              <span className="chip-remove"></span>
            </span>
          ))}
          <button className="clear-objectives" onClick={clearObjectives}>Clear All
          </button>
          <span className="objectives-hint">Cards sorted by objective synergy
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
              value={faction}
              onChange={e => setFaction(e.target.value)}
            >
              <option value="">All Factions</option>
              {factions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select 
              className="filter-select station-filter"
              value={stationFilter}
              onChange={e => setStationFilter(e.target.value)}
            >
              <option value="">All Stations</option>
              <option value="Master">Master ({stationCounts.Master})</option>
              <option value="Henchman">Henchman ({stationCounts.Henchman})</option>
              <option value="Enforcer">Enforcer ({stationCounts.Enforcer})</option>
              <option value="Minion">Minion ({stationCounts.Minion})</option>
              <option value="Totem">Totem ({stationCounts.Totem})</option>
              <option value="Peon">Peon ({stationCounts.Peon})</option>
            </select>
            <select 
              className="filter-select"
              value={soulstoneFilter}
              onChange={e => setSoulstoneFilter(e.target.value)}
            >
              <option value="">Soulstone: All</option>
              <option value="yes">Soulstone Users</option>
              <option value="no">No Soulstone</option>
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
            {/* Data Issues filter - hidden, enable for debugging
            <select 
              className="filter-select data-issue-filter"
              value={dataIssueFilter}
              onChange={e => setDataIssueFilter(e.target.value)}
            >
              <option value="">Data Issues</option>
              {dataIssueCounts.any > 0 && (
                <option value="any">Any Issue ({dataIssueCounts.any})</option>
              )}
              {dataIssueCounts.missing_cost > 0 && (
                <option value="missing_cost">Missing Cost ({dataIssueCounts.missing_cost})</option>
              )}
              {dataIssueCounts.missing_chars > 0 && (
                <option value="missing_chars">Missing Chars ({dataIssueCounts.missing_chars})</option>
              )}
              {dataIssueCounts.missing_keywords > 0 && (
                <option value="missing_keywords">Missing Keywords ({dataIssueCounts.missing_keywords})</option>
              )}
              {dataIssueCounts.missing_station > 0 && (
                <option value="missing_station">Missing Station ({dataIssueCounts.missing_station})</option>
              )}
            </select>
            */}
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
                    {/* Hover Stats Preview */}
                    {card.card_type === 'Stat' && (
                      <div className="card-hover-stats">
                        <div className="hover-stats-row">
                          {card.defense && <span className="hover-stat core"><span className="hover-stat-val">{card.defense}</span><span className="hover-stat-lbl">Df</span></span>}
                          {card.speed && <span className="hover-stat core"><span className="hover-stat-val">{card.speed}</span><span className="hover-stat-lbl">Sp</span></span>}
                          {card.willpower && <span className="hover-stat core"><span className="hover-stat-val">{card.willpower}</span><span className="hover-stat-lbl">Wp</span></span>}
                          {card.size && <span className="hover-stat core"><span className="hover-stat-val">{card.size}</span><span className="hover-stat-lbl">Sz</span></span>}
                        </div>
                        <div className="hover-stats-row secondary">
                          {card.health && <span className="hover-stat health"><span className="hover-stat-val">{card.health}</span><span className="hover-stat-lbl">HP</span></span>}
                          {card.soulstone_cache && <span className="hover-stat ss"><span className="hover-stat-val"></span><span className="hover-stat-lbl">SS</span></span>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="card-info">
                    <div className="card-name">{card.name}</div>
                    <div className="card-faction">{card.faction}</div>
                    {card.cost != null && (
                      <span className="card-info-cost">{card.cost}ss</span>
                    )}
                    {/* Debug badges for data quality issues */}
                    <div className="data-quality-badges">
                      {card.cost == null && (card.hireable !== false) && !['Master', 'Totem'].some(c => (card.characteristics || []).includes(c)) && (
                        <span className="debug-badge debug-no-cost" title="Missing cost data">COST</span>
                      )}
                      {(!card.characteristics || card.characteristics.length === 0) && (
                        <span className="debug-badge debug-no-char" title="Missing characteristics">CHAR</span>
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
            <select 
              className="filter-select meta-faction-select"
              value={metaFaction}
              onChange={e => setMetaFaction(e.target.value)}
            >
              <option value="">Your Faction</option>
              {metaFactions.map(f => (
                <option key={f} value={f}>{f} ({Math.round(FACTION_META[f].overall.win_rate * 100)}%)</option>
              ))}
            </select>
            <select 
              className="filter-select opponent-faction-select"
              value={opponentFaction}
              onChange={e => setOpponentFaction(e.target.value)}
            >
              <option value="">Opponent</option>
              {metaFactions.map(f => (
                <option key={f} value={f}>{f} ({Math.round(FACTION_META[f].overall.win_rate * 100)}%)</option>
              ))}
            </select>
            <span className="result-count">
              {filteredSchemes.length} schemes  {filteredStrategies.length} strategies
            </span>
          </div>

          {/* Meta Recommendations Panel */}
          {(metaFaction || opponentFaction) && (
            <div className="meta-recommendations-panel">
              <div className="meta-panel-header">
                <h3>
                  {metaFaction && opponentFaction 
                    ? ` ${metaFaction} vs ${opponentFaction}`
                    : metaFaction 
                      ? ` ${metaFaction} Meta Insights`
                      : ` Scouting ${opponentFaction}`
                  }
                </h3>
                <span className="meta-faction-stats">
                  {metaFaction && (
                    <span className="meta-stat-you">You: {Math.round(FACTION_META[metaFaction].overall.win_rate * 100)}%
                    </span>
                  )}
                  {metaFaction && opponentFaction && <span className="meta-stat-divider"></span>}
                  {opponentFaction && (
                    <span className="meta-stat-opponent">Opponent: {Math.round(FACTION_META[opponentFaction].overall.win_rate * 100)}%
                    </span>
                  )}
                </span>
              </div>
              
              <div className="meta-recommendations">
                {metaFaction && (
                  <>
                    <div className="meta-rec-section">
                      <span className="meta-rec-label">Strong Schemes:</span>
                      <span className="meta-rec-items">
                        {Object.entries(FACTION_META[metaFaction].schemes_chosen)
                          .filter(([_, data]) => data.win_rate >FACTION_META[metaFaction].overall.win_rate + 0.03)
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
                      <span className="meta-rec-label">Weak Schemes:</span>
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
                <span className="section-icon"></span>Strategies
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
                      >View Details
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Schemes Section */}
            <section className="objectives-section">
              <h2 className="section-title">
                <span className="section-icon"></span>Schemes
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
                      >View Details
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
          {/* 
              STEP 1: ENCOUNTER SETUP - Strategy + Schemes Pool
               */}
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
                  <label>Scheme Pool ({schemePool.length}/5 flipped):</label>
                  <button 
                    className="randomize-btn"
                    onClick={() => {
                      // Randomly select 5 schemes for the pool
                      const availableSchemes = [...schemeList]
                      const randomSchemes = []
                      for (let i = 0; i < 5 && availableSchemes.length > 0; i++) {
                        const idx = Math.floor(Math.random() * availableSchemes.length)
                        randomSchemes.push(availableSchemes[idx].id)
                        availableSchemes.splice(idx, 1)
                      }
                      setSchemePool(randomSchemes)
                      setChosenSchemes([]) // Clear chosen when pool changes
                    }}
                    title="Randomly flip 5 scheme cards face-up"
                  >Random Pool
                  </button>
                </div>
                <div className="scheme-chips">
                  {schemeList.map(s => {
                    const isInPool = schemePool.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        className={`scheme-chip-btn ${isInPool ? 'selected' : ''}`}
                        onClick={() => togglePoolScheme(s.id)}
                        title={s.name}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Choose 2 Schemes from Pool */}
              {schemePool.length > 0 && (
                <div className="encounter-chosen-schemes">
                  <div className="encounter-schemes-header">
                    <label>Your Schemes ({chosenSchemes.length}/2 chosen to score):</label>
                  </div>
                  <div className="scheme-chips chosen">
                    {schemePool.map(schemeId => {
                      const scheme = schemes[schemeId]
                      const isChosen = chosenSchemes.includes(schemeId)
                      return (
                        <button
                          key={schemeId}
                          className={`scheme-chip-btn ${isChosen ? 'chosen' : 'available'}`}
                          onClick={() => toggleChosenScheme(schemeId)}
                          title={isChosen ? 'Click to deselect' : chosenSchemes.length >= 2 ? 'Already chose 2 schemes' : 'Click to choose this scheme'}
                        >
                          {isChosen && '✓ '}{scheme?.name || schemeId}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Full Random Encounter Button */}
              <button 
                className="randomize-encounter-btn"
                onClick={() => {
                  // Random strategy
                  if (strategyList.length > 0) {
                    const randomStrategy = strategyList[Math.floor(Math.random() * strategyList.length)]
                    setCrewStrategy(randomStrategy.id)
                  }
                  // Random 5 schemes for pool
                  const availableSchemes = [...schemeList]
                  const randomPool = []
                  for (let i = 0; i < 5 && availableSchemes.length > 0; i++) {
                    const idx = Math.floor(Math.random() * availableSchemes.length)
                    randomPool.push(availableSchemes[idx].id)
                    availableSchemes.splice(idx, 1)
                  }
                  setSchemePool(randomPool)
                  // Auto-select first 2 as chosen
                  setChosenSchemes(randomPool.slice(0, 2))
                }}
                title="Generate a complete random encounter (Strategy + 5 Scheme pool + 2 chosen)"
              >Generate Random Encounter
              </button>
              
              {/* Collapsible Objective Cards Display */}
              {(crewStrategy || schemePool.length > 0) && (
                <div className={`objectives-cards-section ${objectivesCardsOpen ? 'open' : 'collapsed'}`}>
                  <div 
                    className="objectives-cards-header"
                    onClick={() => setObjectivesCardsOpen(!objectivesCardsOpen)}
                  >
                    <span className="objectives-cards-title">
                      🎴 Selected Objectives
                      {crewStrategy && <span className="objective-count-badge">1 Strategy</span>}
                      {schemePool.length > 0 && <span className="objective-count-badge">{schemePool.length} Pool</span>}
                      {chosenSchemes.length > 0 && <span className="objective-count-badge chosen">{chosenSchemes.length} Chosen</span>}
                    </span>
                    <span className="objectives-cards-toggle">{objectivesCardsOpen ? '▼' : '▶'}</span>
                  </div>
                  
                  {objectivesCardsOpen && (
                    <div className="objectives-cards-display">
                      {/* Strategy Card */}
                      {crewStrategy && STRATEGY_CARD_IMAGES[crewStrategy] && (
                        <div 
                          className="objective-card strategy-card"
                          onClick={() => setSelectedObjective(strategies[crewStrategy])}
                        >
                          <img 
                            src={`${IMAGE_BASE}/${STRATEGY_CARD_IMAGES[crewStrategy]}`}
                            alt={strategies[crewStrategy]?.name || crewStrategy}
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                          <div className="objective-card-label strategy">Strategy</div>
                        </div>
                      )}
                      {/* Fallback if no strategy image */}
                      {crewStrategy && !STRATEGY_CARD_IMAGES[crewStrategy] && (
                        <div 
                          className="objective-card strategy-card no-image"
                          onClick={() => setSelectedObjective(strategies[crewStrategy])}
                        >
                          <div className="objective-card-placeholder">
                            <span className="placeholder-icon">🎯</span>
                            <span className="placeholder-name">{strategies[crewStrategy]?.name || crewStrategy}</span>
                          </div>
                          <div className="objective-card-label strategy">Strategy</div>
                        </div>
                      )}
                      
                      {/* Scheme Cards - Show all pool, highlight chosen */}
                      {schemePool.map(schemeId => {
                        const isChosen = chosenSchemes.includes(schemeId)
                        return (
                          <div 
                            key={schemeId} 
                            className={`objective-card scheme-card ${isChosen ? 'chosen' : 'in-pool'}`}
                            onClick={() => setSelectedObjective(schemes[schemeId])}
                          >
                            {SCHEME_CARD_IMAGES[schemeId] ? (
                              <img 
                                src={`${IMAGE_BASE}/${SCHEME_CARD_IMAGES[schemeId]}`}
                                alt={schemes[schemeId]?.name || schemeId}
                                onError={(e) => { 
                                  e.target.style.display = 'none'
                                  e.target.nextSibling && (e.target.nextSibling.style.display = 'flex')
                                }}
                              />
                            ) : null}
                            {/* Fallback placeholder */}
                            <div className="objective-card-placeholder" style={{ display: SCHEME_CARD_IMAGES[schemeId] ? 'none' : 'flex' }}>
                              <span className="placeholder-icon">📋</span>
                              <span className="placeholder-name">{schemes[schemeId]?.name || schemeId}</span>
                            </div>
                            {/* Choose/Unchose button - top right corner */}
                            <button
                              className={`scheme-choose-btn ${isChosen ? 'chosen' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation() // Don't trigger card click
                                toggleChosenScheme(schemeId)
                              }}
                              title={isChosen ? 'Remove from chosen' : chosenSchemes.length >= 2 ? 'Already chose 2 schemes' : 'Choose this scheme'}
                              disabled={!isChosen && chosenSchemes.length >= 2}
                            >
                              {isChosen ? '✓' : '+'}
                            </button>
                            <div className="objective-card-label scheme">
                              {isChosen ? 'Chosen' : 'Pool'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* Next Round's Scheme Pool - Based on chosen schemes */}
                  {objectivesCardsOpen && chosenSchemes.length > 0 && (
                    <div className="next-schemes-section">
                      <div className="next-schemes-header">
                        <span className="next-schemes-icon">🔄</span>
                        <span className="next-schemes-title">Next Round's Pool</span>
                        <span className="next-schemes-hint">(based on your chosen schemes)</span>
                      </div>
                      <div className="next-schemes-list">
                        {(() => {
                          // Collect all next schemes from chosen schemes, deduplicate
                          const nextSchemesSet = new Set()
                          chosenSchemes.forEach(schemeId => {
                            const schemeData = SCHEME_REQUIREMENTS[schemeId]
                            if (schemeData?.next_schemes) {
                              schemeData.next_schemes.forEach(name => nextSchemesSet.add(name))
                            }
                          })
                          const nextSchemes = Array.from(nextSchemesSet)
                          
                          if (nextSchemes.length === 0) {
                            return <span className="next-schemes-empty">No chain data available</span>
                          }
                          
                          return nextSchemes.map(name => (
                            <span key={name} className="next-scheme-chip">{name}</span>
                          ))
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {/* Objective Cards Styles */}
                  <style>{`
                    .objectives-cards-section {
                      margin-top: 16px;
                      background: #0F0A14;
                      border-radius: 8px;
                      overflow: hidden;
                    }
                    
                    .objectives-cards-header {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      padding: 12px 16px;
                      cursor: pointer;
                      background: #1C1425;
                      transition: background 0.2s ease;
                    }
                    
                    .objectives-cards-header:hover {
                      background: #64748B;
                    }
                    
                    .objectives-cards-title {
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      font-weight: 600;
                      color: #E2E8F0;
                    }
                    
                    .objective-count-badge {
                      background: rgba(139, 92, 246, 0.4);
                      color: #E2E8F0;
                      padding: 2px 8px;
                      border-radius: 12px;
                      font-size: 0.75rem;
                      font-weight: 500;
                    }
                    
                    .objectives-cards-toggle {
                      color: #64748B;
                      font-size: 0.875rem;
                    }
                    
                    .objectives-cards-display {
                      display: flex;
                      flex-wrap: wrap;
                      gap: 12px;
                      padding: 16px;
                      justify-content: center;
                    }
                    
                    .objective-card {
                      position: relative;
                      width: 140px;
                      border-radius: 8px;
                      overflow: hidden;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                      transition: transform 0.2s ease, box-shadow 0.2s ease;
                      cursor: pointer;
                    }
                    
                    .objective-card:hover {
                      transform: translateY(-4px) scale(1.02);
                      box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                    }
                    
                    .objective-card img {
                      width: 100%;
                      height: auto;
                      display: block;
                    }
                    
                    .objective-card-placeholder {
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      height: 200px;
                      background: linear-gradient(135deg, #1C1425 0%, #64748B 100%);
                      padding: 16px;
                      text-align: center;
                    }
                    
                    .placeholder-icon {
                      font-size: 2.5rem;
                      margin-bottom: 8px;
                    }
                    
                    .placeholder-name {
                      color: #E2E8F0;
                      font-weight: 600;
                      font-size: 0.875rem;
                      line-height: 1.3;
                    }
                    
                    .objective-card-label {
                      position: absolute;
                      bottom: 0;
                      left: 0;
                      right: 0;
                      padding: 8px 4px 4px;
                      font-size: 0.7rem;
                      font-weight: 600;
                      text-align: center;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                      color: #E2E8F0;
                    }
                    
                    .objective-card-label.strategy {
                      background: linear-gradient(transparent, rgba(139, 92, 246, 0.9));
                    }
                    
                    .objective-card-label.scheme {
                      background: linear-gradient(transparent, rgba(28, 20, 37, 0.9));
                    }
                    
                    .strategy-card {
                      border: 2px solid rgba(139, 92, 246, 0.6);
                    }
                    
                    .scheme-card {
                      border: 2px solid #64748B;
                    }
                    
                    .scheme-card.chosen {
                      border: 3px solid #10B981;
                      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                    }
                    
                    .scheme-card.in-pool {
                      opacity: 0.7;
                    }
                    
                    .scheme-card.in-pool:hover {
                      opacity: 1;
                    }
                    
                    .scheme-choose-btn {
                      position: absolute;
                      top: 6px;
                      right: 6px;
                      width: 28px;
                      height: 28px;
                      border-radius: 50%;
                      border: 2px solid rgba(216, 202, 188, 0.6);
                      background: rgba(20, 20, 22, 0.7);
                      color: #E2E8F0;
                      font-size: 1rem;
                      font-weight: bold;
                      cursor: pointer;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      transition: all 0.2s ease;
                      z-index: 5;
                    }
                    
                    .scheme-choose-btn:hover:not(:disabled) {
                      background: rgba(139, 92, 246, 0.7);
                      border-color: #8B5CF6;
                      transform: scale(1.1);
                    }
                    
                    .scheme-choose-btn.chosen {
                      background: #10B981;
                      border-color: #10B981;
                      color: white;
                    }
                    
                    .scheme-choose-btn.chosen:hover {
                      background: #059669;
                      border-color: #059669;
                    }
                    
                    .scheme-choose-btn:disabled {
                      opacity: 0.4;
                      cursor: not-allowed;
                    }
                    
                    .objective-count-badge.chosen {
                      background: rgba(16, 185, 129, 0.3);
                      color: #10B981;
                    }
                    
                    .encounter-chosen-schemes {
                      margin-top: 12px;
                      padding-top: 12px;
                      border-top: 1px solid #64748B;
                    }
                    
                    .scheme-chips.chosen .scheme-chip-btn {
                      background: rgba(139, 92, 246, 0.2);
                      border-color: rgba(139, 92, 246, 0.4);
                    }
                    
                    .scheme-chips.chosen .scheme-chip-btn.chosen {
                      background: rgba(139, 92, 246, 0.4);
                      border-color: #8B5CF6;
                      color: #E2E8F0;
                    }
                    
                    .scheme-chips.chosen .scheme-chip-btn.available:hover {
                      background: rgba(139, 92, 246, 0.3);
                      border-color: rgba(139, 92, 246, 0.5);
                    }
                    
                    .next-schemes-section {
                      margin-top: 16px;
                      padding: 12px 16px;
                      background: rgba(139, 92, 246, 0.15);
                      border-top: 1px solid rgba(139, 92, 246, 0.3);
                    }
                    
                    .next-schemes-header {
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      margin-bottom: 10px;
                    }
                    
                    .next-schemes-icon {
                      font-size: 1rem;
                    }
                    
                    .next-schemes-title {
                      font-weight: 600;
                      color: #E2E8F0;
                      font-size: 0.9rem;
                    }
                    
                    .next-schemes-hint {
                      font-size: 0.75rem;
                      color: #64748B;
                      font-style: italic;
                    }
                    
                    .next-schemes-list {
                      display: flex;
                      flex-wrap: wrap;
                      gap: 8px;
                    }
                    
                    .next-scheme-chip {
                      background: rgba(139, 92, 246, 0.3);
                      border: 1px solid rgba(139, 92, 246, 0.5);
                      color: #E2E8F0;
                      padding: 4px 10px;
                      border-radius: 12px;
                      font-size: 0.8rem;
                      font-weight: 500;
                    }
                    
                    .next-schemes-empty {
                      color: #64748B;
                      font-size: 0.8rem;
                      font-style: italic;
                    }
                    
                    @media (max-width: 600px) {
                      .objective-card {
                        width: 110px;
                      }
                      .objective-card-placeholder {
                        height: 160px;
                      }
                    }
                  `}</style>
                </div>
              )}
            </div>
          </div>

          {/* 
              A|B CREW COMPARISON - Side by Side
               */}
          <div className={`ab-comparison-layout ${!crewStrategy ? 'awaiting-step-1' : ''}`}>
            
            {/*  SIDE A: YOUR CREW  */}
            <div className="ab-side ab-side-a">
              <div className="step-indicator">
                <span className="step-number">2</span>
                <span className="step-label">BUILD</span>
              </div>
              <div className="ab-side-header your-side">
                <h2>Your Crew</h2>
                <div className="ab-side-budget">
                  {crewMath.totalCost}/{crewBudget}ss
                  {remainingBudget > 0 && <span className="remaining"> ({remainingBudget} left)</span>}
                </div>
              </div>
              
              {/* 6ss Pool Cap Warning */}
              {remainingBudget > 6 && (
                <div className="ab-ss-warning">SS pool capped at 6  <strong>{remainingBudget - 6}ss wasted!</strong>
                </div>
              )}
              
              {/* Optimal spending indicator */}
              {remainingBudget > 0 && remainingBudget <= 6 && crewRoster.length > 0 && (
                <div className="ab-ss-optimal">
                   {remainingBudget}ss  Soulstone Pool
                </div>
              )}
              
              {/* Master Picker Styles - Malifaux Concept Art Palette */}
              <style>{`
                .master-picker {
                  background: #0F0A14;
                  border: 1px solid #64748B;
                  border-radius: 8px;
                  padding: 16px;
                  margin-bottom: 16px;
                }
                .master-picker-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 12px;
                  padding-bottom: 10px;
                  border-bottom: 1px solid #8B5CF6;
                }
                .master-picker-header > span:first-child {
                  font-size: 1rem;
                  font-weight: 700;
                  color: #E2E8F0;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                .master-picker-hint {
                  font-size: 0.7rem;
                  color: #64748B;
                }
                .master-filter-input {
                  width: 100%;
                  padding: 8px 12px;
                  font-size: 0.85rem;
                  background: #0F0A14;
                  border: 1px solid #64748B;
                  border-radius: 4px;
                  color: #E2E8F0;
                  margin-bottom: 12px;
                }
                .master-filter-input:focus {
                  outline: none;
                  border-color: #8B5CF6;
                }
                .master-filter-input::placeholder {
                  color: #64748B;
                }
                .master-stat-list {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                  max-height: 380px;
                  overflow-y: auto;
                  overflow-x: hidden;
                }
                .master-faction-header {
                  padding: 8px 12px;
                  margin-top: 8px;
                  margin-bottom: 2px;
                  font-size: 0.7rem;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 2px;
                  color: #E2E8F0;
                  background: linear-gradient(90deg, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
                  border-left: 3px solid #8B5CF6;
                  pointer-events: none;
                  user-select: none;
                }
                .master-faction-header:first-child {
                  margin-top: 0;
                }
                .master-stat-row {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 10px 14px;
                  background: #0F0A14;
                  border: 1px solid #1C1425;
                  border-left: 3px solid transparent;
                  border-radius: 4px;
                  cursor: pointer;
                  transition: all 0.15s ease;
                  min-height: 42px;
                  gap: 8px;
                }
                .master-stat-row:hover {
                  background: #1C1425;
                  border-color: #64748B;
                  border-left-color: var(--faction-color, #8B5CF6);
                  transform: translateX(2px);
                }
                .master-stat-name {
                  font-size: 0.9rem;
                  font-weight: 600;
                  color: #E2E8F0;
                  flex: 1;
                  min-width: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                .master-stat-keyword {
                  font-size: 0.7rem;
                  color: #E2E8F0;
                  font-weight: 500;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  padding: 2px 8px;
                  background: #1C1425;
                  border-radius: 3px;
                  opacity: 0.7;
                  flex-shrink: 0;
                  max-width: 80px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                .master-selected {
                  background: #0F0A14;
                  border: 1px solid #8B5CF6;
                  border-radius: 8px;
                  padding: 12px 16px;
                  margin-bottom: 16px;
                }
                .master-selected-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .master-selected-name {
                  font-size: 1.1rem;
                  font-weight: 700;
                  color: #E2E8F0;
                }
                .master-change-btn {
                  padding: 5px 14px;
                  font-size: 0.75rem;
                  font-weight: 600;
                  background: transparent;
                  border: 1px solid #64748B;
                  border-radius: 4px;
                  color: #E2E8F0;
                  cursor: pointer;
                  transition: all 0.15s ease;
                  text-transform: uppercase;
                  opacity: 0.7;
                }
                .master-change-btn:hover {
                  border-color: #8B5CF6;
                  color: #E2E8F0;
                  background: rgba(139, 92, 246, 0.2);
                  opacity: 1;
                }
                .master-stat-list::-webkit-scrollbar {
                  width: 6px;
                }
                .master-stat-list::-webkit-scrollbar-track {
                  background: #0F0A14;
                }
                .master-stat-list::-webkit-scrollbar-thumb {
                  background: #8B5CF6;
                  border-radius: 3px;
                }
                
                /* Mobile fixes for master picker */
                @media (max-width: 500px) {
                  .master-picker {
                    padding: 10px;
                  }
                  .master-picker-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 2px;
                    margin-bottom: 8px;
                    padding-bottom: 8px;
                  }
                  .master-picker-header > span:first-child {
                    font-size: 0.85rem;
                  }
                  .master-picker-hint {
                    font-size: 0.6rem;
                  }
                  .master-filter-input {
                    padding: 6px 10px;
                    font-size: 0.8rem;
                  }
                  .master-stat-row {
                    padding: 8px 10px;
                    min-height: 36px;
                  }
                  .master-stat-name {
                    font-size: 0.8rem;
                  }
                  .master-stat-keyword {
                    font-size: 0.55rem;
                    padding: 2px 6px;
                    max-width: 55px;
                  }
                  .master-selected {
                    padding: 10px 12px;
                  }
                  .master-selected-name {
                    font-size: 0.95rem;
                  }
                }
              `}</style>
              
              {/* Master Selection - Compact Stat List */}
              {!selectedMaster ? (
                <div className="master-picker">
                  <div className="master-picker-header">
                    <span>Select Your Master</span>
                    <span className="master-picker-hint">Hover to preview  Click to lock in</span>
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
                      .sort((a, b) => {
                        // Sort by faction first, then alphabetically by name
                        if (a.faction !== b.faction) return a.faction.localeCompare(b.faction)
                        return a.name.localeCompare(b.name)
                      })
                      .map((m, idx, arr) => {
                      // Check if this is first master of a new faction
                      const isNewFaction = idx === 0 || arr[idx - 1].faction !== m.faction
                      
                      return (
                        <React.Fragment key={m.id}>
                          {isNewFaction && (
                            <div 
                              className="master-faction-header"
                              style={{
                                borderLeftColor: getFactionColor(m.faction),
                                background: `linear-gradient(90deg, ${getFactionColor(m.faction, 'bg')} 0%, transparent 70%)`
                              }}
                            >
                              {m.faction}
                            </div>
                          )}
                          <div 
                            className="master-stat-row"
                            onClick={() => {
                              setSelectedMaster(m)
                              setCrewRoster([])
                              setMasterFilter('')
                              setMasterCrewCardFlipped(false)
                              // Clear opponent data when selecting new master
                              setOpponentMaster(null)
                              setOpponentCrew([])
                              setOpponentFaction('')
                            }}
                            onMouseEnter={() => setHoveredMaster(m)}
                            onMouseLeave={() => setHoveredMaster(null)}
                            style={{ '--faction-color': getFactionColor(m.faction) }}
                          >
                            <span className="master-stat-name">{m.name}</span>
                            <span className="master-stat-keyword">{m.primary_keyword}</span>
                          </div>
                        </React.Fragment>
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
                        // Clear opponent data when changing master
                        setOpponentMaster(null)
                        setOpponentCrew([])
                        setOpponentFaction('')
                      }}
                    >Change
                    </button>
                  </div>
                </div>
              )}
              
              
              {/*  LEADER DISPLAY - Master + Crew Card Stacked  */}
              {selectedMaster && (
                <div className="crew-leaders-display">
                  {selectedCrewCard ? (
                    /* Stacked cards when both Master and Crew card exist */
                    <div className="leader-card-stack">
                      {/* Back card (angled) - clicking swaps positions */}
                      <div 
                        className={`leader-card-stacked back-card ${masterCrewCardFlipped ? 'is-master' : 'is-crew'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMasterCrewCardFlipped(!masterCrewCardFlipped)
                        }}
                        style={{
                          transform: 'rotate(12deg)',
                          transformOrigin: 'bottom center'
                        }}
                      >
                        <img 
                          src={`${IMAGE_BASE}/${masterCrewCardFlipped ? selectedMaster.front_image : selectedCrewCard.front_image}`}
                          alt={masterCrewCardFlipped ? selectedMaster.name : selectedCrewCard.name}
                        />
                        <div className="leader-card-label">
                          {masterCrewCardFlipped ? 'Master' : 'Crew Rules'}
                        </div>
                      </div>
                      
                      {/* Front card - clicking opens modal */}
                      <div 
                        className={`leader-card-stacked front-card ${masterCrewCardFlipped ? 'is-crew' : 'is-master'}`}
                        onClick={() => openModal(
                          masterCrewCardFlipped ? selectedCrewCard : selectedMaster, 
                          [selectedMaster, selectedCrewCard, ...crewRoster].filter(Boolean)
                        )}
                      >
                        <img 
                          src={`${IMAGE_BASE}/${masterCrewCardFlipped ? selectedCrewCard.front_image : selectedMaster.front_image}`}
                          alt={masterCrewCardFlipped ? selectedCrewCard.name : selectedMaster.name}
                        />
                        <div className="leader-card-label">
                          {masterCrewCardFlipped ? 'Crew Rules' : 'Master'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Single Master card when no Crew card available */
                    <div 
                      className="leader-card-single"
                      onClick={() => openModal(selectedMaster, [selectedMaster, ...crewRoster].filter(Boolean))}
                    >
                      <img 
                        src={`${IMAGE_BASE}/${selectedMaster.front_image}`}
                        alt={selectedMaster.name}
                      />
                      <div className="leader-card-label">Master</div>
                    </div>
                  )}
                  
                  {/* Stacked card styles */}
                  <style>{`
                    .leader-card-stack {
                      position: relative;
                      width: 160px;
                      height: 240px;
                      margin: 0 auto 20px;
                    }
                    
                    .leader-card-stacked {
                      position: absolute;
                      width: 150px;
                      cursor: pointer;
                      border-radius: 8px;
                      overflow: hidden;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                      transition: transform 0.3s ease, box-shadow 0.2s ease, opacity 0.2s ease;
                    }
                    
                    .leader-card-stacked img {
                      width: 100%;
                      height: auto;
                      display: block;
                    }
                    
                    .leader-card-stacked .leader-card-label {
                      position: absolute;
                      bottom: 0;
                      left: 0;
                      right: 0;
                      background: linear-gradient(transparent, rgba(20, 20, 22, 0.9));
                      color: #E2E8F0;
                      font-size: 0.7rem;
                      font-weight: 600;
                      text-align: center;
                      padding: 12px 4px 4px;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                    }
                    
                    .leader-card-stacked.back-card {
                      z-index: 1;
                      top: 0;
                      left: 0;
                      opacity: 0.85;
                    }
                    
                    .leader-card-stacked.back-card:hover {
                      opacity: 1;
                      box-shadow: 0 6px 16px rgba(0,0,0,0.5);
                    }
                    
                    .leader-card-stacked.front-card {
                      z-index: 2;
                      top: 15px;
                      left: 10px;
                    }
                    
                    .leader-card-stacked.front-card:hover {
                      transform: scale(1.03);
                      box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                    }
                    
                    .leader-card-stacked.is-master .leader-card-label {
                      background: linear-gradient(transparent, rgba(28, 20, 37, 0.95));
                    }
                    
                    .leader-card-stacked.is-crew .leader-card-label {
                      background: linear-gradient(transparent, rgba(139, 92, 246, 0.95));
                    }
                    
                    .leader-card-single {
                      width: 140px;
                      margin: 0 auto;
                      cursor: pointer;
                      border-radius: 8px;
                      overflow: hidden;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                      transition: transform 0.2s ease, box-shadow 0.2s ease;
                      position: relative;
                    }
                    
                    .leader-card-single:hover {
                      transform: scale(1.03);
                      box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                    }
                    
                    .leader-card-single img {
                      width: 100%;
                      height: auto;
                      display: block;
                    }
                    
                    .leader-card-single .leader-card-label {
                      position: absolute;
                      bottom: 0;
                      left: 0;
                      right: 0;
                      background: linear-gradient(transparent, rgba(28, 20, 37, 0.95));
                      color: #E2E8F0;
                      font-size: 0.7rem;
                      font-weight: 600;
                      text-align: center;
                      padding: 12px 4px 4px;
                      text-transform: uppercase;
                      letter-spacing: 0.5px;
                    }
                  `}</style>
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
                                {synergyCount}
                              </div>
                            )}
                            <div className="roster-card-cost">{card.cost || 0}ss</div>
                            <button 
                              className="ab-roster-remove"
                              onClick={(e) => { e.stopPropagation(); removeFromCrew(card.rosterId); }}
                            >
                              
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
                    className="ab-share-btn" 
                    onClick={handleShareCrew}
                    disabled={crewRoster.length === 0}
                    title={crewRoster.length === 0 ? "Add models to share crew" : "Copy shareable link to clipboard"}
                  >{shareStatus || '🔗 Share'}
                  </button>
                  <button 
                    className="ab-suggest-btn" 
                    onClick={suggestCrew}
                    title="Auto-build crew based on selected objectives"
                  >Suggest Crew
                  </button>
                  {crewRoster.length > 0 && (
                    <button className="ab-clear-btn" onClick={clearCrew}>Clear Crew</button>
                  )}
                </div>
              )}
              
              {/*  SYNERGY PANEL - Collapsible  */}
              {selectedMaster && crewRoster.length > 0 && (
                <div className={`synergy-panel ${synergyPanelOpen ? 'open' : 'collapsed'}`}>
                  <div 
                    className="synergy-panel-header"
                    onClick={() => setSynergyPanelOpen(!synergyPanelOpen)}
                  >
                    <span className="synergy-panel-title">Crew Synergies
                      {crewSynergies.synergies.length > 0 && (
                        <span className="synergy-count-badge">
                          {crewSynergies.synergies.length}
                        </span>
                      )}
                    </span>
                    <span className="synergy-panel-toggle">
                      {synergyPanelOpen ? '' : ''}
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
                                  {syn.direction === 'bidirectional' ? '' : 
                                   syn.direction === 'A_buffs_B' || syn.direction === 'A_feeds_B' || syn.direction === 'A_supports_B' ? '' : ''}
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
                        <div className="synergy-empty">No strong synergies detected yet. Add more models to see combos.
                        </div>
                      )}
                      
                      {/* Anti-Synergies Warning */}
                      {crewSynergies.antiSynergies.length > 0 && (
                        <div className="anti-synergy-list">
                          <div className="anti-synergy-header">Potential Conflicts</div>
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
              
              {/*  POOL ANALYSIS PANEL  */}
              {selectedMaster && (selectedStrategy || selectedSchemes.length > 0) && (
                <div className={`pool-analysis-panel ${poolAnalysisOpen ? 'open' : 'collapsed'}`}>
                  <div 
                    className="pool-analysis-header"
                    onClick={() => setPoolAnalysisOpen(!poolAnalysisOpen)}
                  >
                    <span className="pool-analysis-title">
                      📊 Pool Analysis
                    </span>
                    <span className="pool-analysis-toggle">
                      {poolAnalysisOpen ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {poolAnalysisOpen && (() => {
                    const crew = [selectedMaster, ...crewRoster]
                    const stratName = strategies[selectedStrategy]?.name || ''
                    const schemeNames = selectedSchemes.map(id => schemes[id]?.name || '').filter(Boolean)
                    const requirements = getPoolRequirements(stratName, schemeNames)
                    const crewCaps = aggregateCrewCapabilities(crew)
                    const { gaps, strengths } = analyzePoolGaps(crewCaps, requirements)
                    const factionData = FACTION_META[selectedMaster.faction]
                    
                    // Get meta ratings for selected objectives
                    const normalize = (key) => key?.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_')
                    const stratMeta = factionData?.strategies_m4e?.[normalize(stratName)]
                    const schemeMetas = schemeNames.map(name => {
                      const key = normalize(name)
                      const data = factionData?.schemes_chosen?.[key]
                      if (!data) return null
                      const delta = data.win_rate - (factionData.overall?.win_rate || 0.5)
                      return { name, key, ...data, delta, rating: delta > 0.03 ? 'strong' : delta < -0.03 ? 'weak' : 'neutral' }
                    }).filter(Boolean)
                    
                    // Find models that fill gaps
                    const crewIds = new Set(crew.map(c => c.id))
                    const recommendations = gaps.length > 0 ? filteredCards
                      .filter(m => !crewIds.has(m.id) && m.cost > 0 && m.station !== 'Master')
                      .map(model => {
                        const caps = getModelCapabilities(model)
                        let score = 0
                        const helps = []
                        gaps.forEach(({ capability, shortfall }) => {
                          const has = caps[capability] || 0
                          if (has > 0) {
                            score += Math.min(has, shortfall) * 2
                            helps.push(capability)
                          }
                        })
                        return { model, score, helps }
                      })
                      .filter(x => x.score > 0)
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 5) : []
                    
                    return (
                      <div className="pool-analysis-content">
                        {/* Faction Meta Summary */}
                        {factionData && (
                          <div className="pool-faction-summary">
                            <div className="faction-header">
                              <span className="faction-name">{selectedMaster.faction}</span>
                              <span className="faction-overall">
                                {Math.round(factionData.overall?.win_rate * 100)}% overall
                              </span>
                            </div>
                            
                            {/* Strategy Rating */}
                            {stratMeta && (
                              <div className={`pool-objective-rating ${stratMeta.win_rate >= factionData.overall?.win_rate ? 'positive' : 'negative'}`}>
                                <span className="objective-name">{stratName}</span>
                                <span className="objective-winrate">{Math.round(stratMeta.win_rate * 100)}%</span>
                                <span className="objective-delta">
                                  {stratMeta.win_rate >= factionData.overall?.win_rate ? '+' : ''}
                                  {Math.round((stratMeta.win_rate - factionData.overall?.win_rate) * 100)}%
                                </span>
                              </div>
                            )}
                            
                            {/* Scheme Ratings */}
                            {schemeMetas.map(meta => (
                              <div key={meta.key} className={`pool-objective-rating ${meta.rating}`}>
                                <span className="objective-name">{meta.name}</span>
                                <span className="objective-winrate">{Math.round(meta.win_rate * 100)}%</span>
                                <span className="objective-delta">
                                  {meta.delta >= 0 ? '+' : ''}{Math.round(meta.delta * 100)}%
                                </span>
                                {meta.rating === 'weak' && <span className="objective-warning">⚠️</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Capability Gap Analysis */}
                        {Object.keys(requirements).length > 0 && (
                          <div className="pool-capability-analysis">
                            <h4>Crew vs Pool Requirements</h4>
                            
                            {gaps.length > 0 ? (
                              <div className="pool-gaps">
                                {gaps.map(({ capability, needed, have, severity }) => (
                                  <div key={capability} className={`pool-gap ${severity}`}>
                                    <span className="gap-icon">{CAPABILITY_LABELS[capability]?.icon || '❓'}</span>
                                    <span className="gap-label">{CAPABILITY_LABELS[capability]?.label || capability}</span>
                                    <span className="gap-values">{have}/{needed}</span>
                                    <div className="gap-bar">
                                      <div className="gap-bar-fill" style={{ width: `${Math.min(100, (have / needed) * 100)}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="pool-status-good">✓ Crew covers pool requirements</div>
                            )}
                            
                            {strengths.length > 0 && (
                              <div className="pool-strengths">
                                <span className="strengths-label">Strong in:</span>
                                {strengths.slice(0, 3).map(({ capability }) => (
                                  <span key={capability} className="strength-badge">
                                    {CAPABILITY_LABELS[capability]?.icon} {CAPABILITY_LABELS[capability]?.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                          <div className="pool-recommendations">
                            <h4>Consider Adding</h4>
                            <div className="recommendation-list">
                              {recommendations.map(({ model, helps }) => (
                                <div 
                                  key={model.id} 
                                  className="recommendation-item"
                                  onClick={() => addToCrew(model)}
                                >
                                  <span className="rec-name">{model.name}</span>
                                  <span className="rec-cost">{model.cost}ss</span>
                                  <span className="rec-helps">
                                    {helps.slice(0, 2).map(cap => CAPABILITY_LABELS[cap]?.icon || '').join(' ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Tips */}
                        <div className="pool-tips">
                          {stratName && STRATEGY_REQUIREMENTS[normalize(stratName)]?.tips && (
                            <div className="tip-item">
                              <strong>Strategy:</strong> {STRATEGY_REQUIREMENTS[normalize(stratName)].tips}
                            </div>
                          )}
                          {schemeNames.slice(0, 2).map(name => {
                            const key = normalize(name)
                            const req = SCHEME_REQUIREMENTS[key]
                            return req?.tips ? (
                              <div key={key} className="tip-item">
                                <strong>{req.name}:</strong> {req.tips}
                              </div>
                            ) : null
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
              
              {/*  CREW CARD RULES PANEL  */}
              {selectedCrewCard && crewCardAnalysis && (
                <div className="crew-rules-panel">
                  <div className="crew-rules-header">
                    <span className="crew-rules-title"> {selectedCrewCard.name}</span>
                    <span className="crew-rules-subtitle">Crew Card Rules</span>
                  </div>
                  
                  {crewCardAnalysis.activeRules.length > 0 && (
                    <div className="crew-rules-section active">
                      <div className="crew-rules-section-header">
                        <span className="rules-status-icon"></span>Active Rules ({crewCardAnalysis.activeRules.length})
                      </div>
                      {crewCardAnalysis.activeRules.slice(0, 5).map((rule, idx) => (
                        <div key={idx} className="crew-rule-item active">
                          <span className="rule-text">{rule.text}</span>
                          <div className="rule-applies-to">Applies to: {rule.mentions.join(', ')}
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
                        <span className="rules-status-icon"></span>Unused Rules ({crewCardAnalysis.inactiveRules.length})
                      </div>
                      {crewCardAnalysis.inactiveRules.slice(0, 3).map((rule, idx) => (
                        <div key={idx} className="crew-rule-item inactive">
                          <span className="rule-text">{rule.text}</span>
                          <div className="rule-requires">Requires: {rule.mentions.join(', ')}
                          </div>
                        </div>
                      ))}
                      {crewCardAnalysis.inactiveRules.length > 3 && (
                        <div className="crew-rules-more">+{crewCardAnalysis.inactiveRules.length - 3} more</div>
                      )}
                    </div>
                  )}
                  
                  {crewCardAnalysis.activeRules.length === 0 && crewCardAnalysis.inactiveRules.length === 0 && (
                    <div className="crew-rules-empty">Add models to see which crew card rules apply
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* ═══ CENTER: POOL ANALYSIS ═══ */}
            <div className="ab-intel-panel pool-analysis-panel">
              <h3>🏛️ POOL ANALYSIS</h3>
              
              {/* No objectives yet */}
              {!crewStrategy && schemePool.length === 0 && (
                <div className="ab-intel-empty">
                  <p>Select Strategy & Schemes above to see pool analysis</p>
                </div>
              )}
              
              {/* Pool Analysis Content */}
              {(crewStrategy || schemePool.length > 0) && (() => {
                const previewMaster = selectedMaster || hoveredMaster
                const stratName = strategies[crewStrategy]?.name || ''
                const schemeNames = chosenSchemes.map(id => schemes[id]?.name).filter(Boolean)
                
                // Build pool requirements
                const POOL_STRATEGY_NEEDS = {
                  'Plant Explosives': { scheme_markers: 3, mobility: 3, survivability: 2 },
                  'Boundary Dispute': { melee: 3, survivability: 3, mobility: 1 },
                  'Recover Evidence': { damage: 2, mobility: 2, interact: 2 },
                  'Informants': { survivability: 3, spread: 2, cheap_activations: 2 },
                  'Clashing Forces': { melee: 3, damage: 2, survivability: 2 },
                }
                const POOL_SCHEME_NEEDS = {
                  'Breakthrough': { scheme_markers: 2, mobility: 3 },
                  'Assassinate': { damage: 3, mobility: 2 },
                  'Detonate Charges': { scheme_markers: 3, interact: 2 },
                  'Harness the Ley Line': { scheme_markers: 2, spread: 2 },
                  'Leave Your Mark': { scheme_markers: 2, survivability: 1 },
                  'Ensnare': { engagement: 2, survivability: 2 },
                  'Frame Job': { scheme_markers: 2, mobility: 2 },
                  'Take the Highground': { mobility: 2, survivability: 2 },
                  'Runic Binding': { scheme_markers: 2, spread: 2 },
                  'Scout the Rooftops': { mobility: 3, spread: 2 },
                  'Search the Area': { interact: 2, spread: 2 },
                  'Reshape the Land': { marker_creation: 3, scheme_markers: 2 },
                }
                const POOL_TIPS = {
                  'Plant Explosives': 'Spread out, fast models with Interact abilities shine',
                  'Boundary Dispute': 'Durable beaters that can hold a quarter',
                  'Recover Evidence': 'Kill models, grab the evidence they drop',
                  'Breakthrough': 'Fast schemer that can survive in enemy deployment',
                  'Assassinate': 'High damage output, ability to reach enemy master',
                  'Detonate Charges': 'Drop 2 markers within 3" then remove them',
                }
                const CAP_LABELS = {
                  scheme_markers: { label: 'Scheme Running', icon: '📍' },
                  mobility: { label: 'Mobility', icon: '💨' },
                  survivability: { label: 'Survivability', icon: '🛡️' },
                  damage: { label: 'Damage Output', icon: '⚔️' },
                  melee: { label: 'Melee Presence', icon: '🗡️' },
                  interact: { label: 'Interact Actions', icon: '👆' },
                  cheap_activations: { label: 'Cheap Activations', icon: '💰' },
                  spread: { label: 'Board Coverage', icon: '📡' },
                  engagement: { label: 'Engagement', icon: '⛓️' },
                  marker_creation: { label: 'Marker Creation', icon: '🔷' },
                }
                
                // Calculate requirements from pool
                const requirements = {}
                if (stratName && POOL_STRATEGY_NEEDS[stratName]) {
                  Object.entries(POOL_STRATEGY_NEEDS[stratName]).forEach(([k, v]) => {
                    requirements[k] = (requirements[k] || 0) + v
                  })
                }
                schemeNames.forEach(name => {
                  if (POOL_SCHEME_NEEDS[name]) {
                    Object.entries(POOL_SCHEME_NEEDS[name]).forEach(([k, v]) => {
                      requirements[k] = (requirements[k] || 0) + v
                    })
                  }
                })
                
                // Calculate crew capabilities using the comprehensive getModelCapabilities function
                const crewCaps = {}
                const allModels = selectedMaster ? [selectedMaster, ...crewRoster] : []
                allModels.forEach(model => {
                  const modelCaps = getModelCapabilities(model)
                  Object.entries(modelCaps).forEach(([cap, value]) => {
                    crewCaps[cap] = (crewCaps[cap] || 0) + value
                  })
                })
                
                // Find gaps and strengths
                const gaps = []
                const strengths = []
                Object.entries(requirements).forEach(([cap, needed]) => {
                  const have = crewCaps[cap] || 0
                  const ratio = have / needed
                  if (ratio < 1) {
                    gaps.push({ cap, needed, have, severity: ratio < 0.5 ? 'critical' : 'warning' })
                  } else if (ratio >= 1.5) {
                    strengths.push({ cap, needed, have })
                  }
                })
                gaps.sort((a, b) => (a.have / a.needed) - (b.have / b.needed))
                
                // Find recommendations
                const recommendations = []
                if (gaps.length > 0 && selectedMaster) {
                  const crewIds = new Set(crewRoster.map(c => c.id))
                  const candidates = [...keywordModels, ...versatileModels].filter(m => !crewIds.has(m.id))
                  
                  candidates.forEach(model => {
                    let score = 0
                    const roles = model.roles || []
                    gaps.forEach(({ cap }) => {
                      if (cap === 'scheme_markers' && roles.includes('scheme_runner')) score += 3
                      if (cap === 'mobility' && roles.includes('scheme_runner')) score += 2
                      if (cap === 'damage' && roles.includes('beater')) score += 3
                      if (cap === 'survivability' && roles.includes('tank')) score += 2
                      if (cap === 'interact' && roles.includes('scheme_runner')) score += 2
                    })
                    if (score > 0) recommendations.push({ model, score })
                  })
                  recommendations.sort((a, b) => b.score - a.score)
                }
                
                return (
                  <div className="pool-analysis-content">
                    {/* Tips */}
                    <div className="pool-tips">
                      {stratName && POOL_TIPS[stratName] && (
                        <div className="pool-tip strategy-tip">
                          <span className="tip-icon">⚔️</span>
                          <span className="tip-text">{POOL_TIPS[stratName]}</span>
                        </div>
                      )}
                      {schemeNames.slice(0, 2).map(name => POOL_TIPS[name] && (
                        <div key={name} className="pool-tip scheme-tip">
                          <span className="tip-icon">◈</span>
                          <span className="tip-text">{POOL_TIPS[name]}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Capability Bars */}
                    {selectedMaster && Object.keys(requirements).length > 0 && (
                      <div className="capability-bars">
                        <h4>Crew Capabilities</h4>
                        {Object.entries(requirements)
                          .sort((a, b) => {
                            const aRatio = (crewCaps[a[0]] || 0) / a[1]
                            const bRatio = (crewCaps[b[0]] || 0) / b[1]
                            return aRatio - bRatio
                          })
                          .map(([cap, needed]) => {
                            const have = crewCaps[cap] || 0
                            const ratio = have / needed
                            const level = ratio >= 1 ? 'good' : ratio >= 0.5 ? 'warning' : 'critical'
                            const label = CAP_LABELS[cap] || { label: cap, icon: '•' }
                            return (
                              <div key={cap} className={`capability-row ${level}`}>
                                <span className="cap-icon">{label.icon}</span>
                                <span className="cap-label">{label.label}</span>
                                <div className="cap-bar-container">
                                  <div 
                                    className="cap-bar-fill" 
                                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                                  />
                                </div>
                                <span className="cap-values">{have}/{needed}</span>
                              </div>
                            )
                          })}
                      </div>
                    )}
                    
                    {/* Strengths */}
                    {strengths.length > 0 && (
                      <div className="pool-strengths">
                        <span className="strengths-label">✓ Strong:</span>
                        {strengths.slice(0, 3).map(({ cap }) => (
                          <span key={cap} className="strength-badge">
                            {CAP_LABELS[cap]?.label || cap}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                      <div className="pool-recommendations">
                        <h4>CONSIDER ADDING</h4>
                        <div className="recommendation-list">
                          {recommendations.slice(0, 3).map(({ model }) => (
                            <div 
                              key={model.id} 
                              className="recommendation-item"
                              onClick={() => openModal(model)}
                            >
                              <span className="rec-name">{model.name}</span>
                              <span className="rec-cost">{model.cost}ss</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Scheme Scoring Buttons */}
                    {chosenSchemes.length > 0 && (
                      <div className="scheme-scoring-section">
                        <h4>SCHEME SCORING</h4>
                        <div className="scheme-buttons">
                          {schemeNames.map(name => (
                            <button key={name} className="scheme-score-btn">
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Tournament Meta - Collapsible */}
                    {previewMaster && (
                      <details className="meta-insights-collapsible">
                        <summary className="meta-insights-header">
                          <input type="checkbox" className="meta-checkbox" readOnly checked={!!FACTION_META[previewMaster.faction]} />
                          <span className="meta-toggle-text">Tournament Meta (Longshanks data)</span>
                        </summary>
                        <div className="meta-insights-content">
                          {(() => {
                            const factionData = FACTION_META[previewMaster.faction]
                            if (!factionData) return <p className="meta-no-data">No data for {previewMaster.faction}</p>
                            
                            const normalize = (key) => key?.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_')
                            const stratMeta = factionData.strategies_m4e?.[normalize(stratName)]
                            const factionWR = factionData.overall?.win_rate || 0.5
                            
                            return (
                              <>
                                <div className="meta-faction-line">
                                  <span className="meta-faction-name">{previewMaster.faction}</span>
                                  <span className="meta-faction-wr">{Math.round(factionWR * 100)}% overall</span>
                                </div>
                                {stratMeta && (
                                  <div className={`meta-objective-line ${stratMeta.win_rate >= factionWR ? 'positive' : 'negative'}`}>
                                    <span className="meta-obj-name">⚔️ {stratName}</span>
                                    <span className="meta-obj-wr">{Math.round(stratMeta.win_rate * 100)}%</span>
                                  </div>
                                )}
                                {schemeNames.map(name => {
                                  const key = normalize(name)
                                  const data = factionData.schemes_chosen?.[key]
                                  if (!data) return null
                                  return (
                                    <div key={key} className={`meta-objective-line ${data.win_rate >= factionWR ? 'positive' : 'negative'}`}>
                                      <span className="meta-obj-name">◈ {name}</span>
                                      <span className="meta-obj-wr">{Math.round(data.win_rate * 100)}%</span>
                                    </div>
                                  )
                                })}
                              </>
                            )
                          })()}
                        </div>
                      </details>
                    )}
                  </div>
                )
              })()}
              
              {/* 
                  HIRING POOL - Available Models to Add (moved inside Your Crew side)
               */}
              {selectedMaster && (
                <div className="hiring-pool">
                  <h2 className="hiring-pool-title">Hiring Pool 
                    <span className="hiring-pool-budget">({remainingBudget}ss remaining)</span>
                  </h2>
                  
                  {/* Badge Key */}
                  <div className="hiring-badge-key">
                    <span className="badge-key-item">
                      <span className="badge-key-icon hired"></span>
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
                      <span className="keyword-badge">{selectedMaster.primary_keyword}</span>Keyword
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
                            key={`kw-${card.id}-${index}`}
                            className={`hiring-card keyword ${inRoster ? 'in-roster' : ''} ${blockReason === 'budget' ? 'unaffordable' : ''} ${atLimit ? 'at-limit' : ''}`}
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
                            {inRoster && !isMinion && <div className="in-roster-badge"></div>}
                            {atLimit && <div className="at-limit-badge">MAX</div>}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                  
                  {/* Versatile Models (+1ss tax, counts toward OOK limit) */}
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
                              {inRoster && !isMinion && <div className="in-roster-badge"></div>}
                              {atLimit && <div className="at-limit-badge">MAX</div>}
                              {blockReason === 'ook-limit' && <div className="ook-limit-badge">OOK FULL</div>}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {/* Out-of-Keyword (OOK) Models - Collapsible */}
                  {ookModels.length > 0 && (
                    <section className="hiring-section ook-section">
                      <h3 
                        className="hiring-section-title collapsible"
                        onClick={() => setOokSectionOpen(!ookSectionOpen)}
                      >
                        <span className="collapse-toggle">{ookSectionOpen ? '▼' : '▶'}</span>
                        <span className="ook-badge">OOK</span>
                        Out-of-Keyword (+1ss tax)
                        <span className="ook-model-count">{ookModels.length} models</span>
                        <span className={`ook-counter ${crewMath.ookCount >= crewMath.ookLimit ? 'at-limit' : ''}`}>
                          OOK: {crewMath.ookCount}/{crewMath.ookLimit}
                        </span>
                      </h3>
                      {ookSectionOpen && (
                        <div className="hiring-grid">
                          {ookModels.map((card, index) => {
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
                                key={`ook-${card.id}-${index}`}
                                className={`hiring-card ook ${inRoster ? 'in-roster' : ''} ${blockReason === 'budget' ? 'unaffordable' : ''} ${blockReason === 'ook-limit' ? 'ook-blocked' : ''} ${atLimit ? 'at-limit' : ''}`}
                                onClick={() => canAdd && addToCrew(card)}
                                title={blockReason === 'ook-limit' ? 'Out-of-keyword limit reached (2 max)' : blockReason === 'budget' ? 'Not enough soulstones' : `${card.primary_keyword || 'Unknown'} keyword`}
                              >
                                <div className="hiring-card-header">
                                  <span className="hiring-card-name">{card.name}</span>
                                  <span className="hiring-card-cost">
                                    {baseCost}<span className="tax-indicator">+1</span>ss
                                  </span>
                                </div>
                                <div className="hiring-card-info">
                                  <span className="hiring-card-char">
                                    {(card.characteristics || []).filter(c => ['Henchman','Enforcer','Minion'].includes(c))[0] || 'Model'}
                                  </span>
                                  <span className="hiring-card-keyword" title="Original keyword">
                                    {card.primary_keyword || '?'}
                                  </span>
                                  {isMinion && (
                                    <span className={`minion-count ${minionCount >= minionLimit ? 'at-limit' : ''}`}>
                                      {minionCount}/{minionLimit}
                                    </span>
                                  )}
                                  {score > 0 && renderStars(score)}
                                </div>
                                {inRoster && !isMinion && <div className="in-roster-badge"></div>}
                                {atLimit && <div className="at-limit-badge">MAX</div>}
                                {blockReason === 'ook-limit' && <div className="ook-limit-badge">OOK FULL</div>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}
            </div>
            
            {/*  SIDE B: OPPONENT CREW  */}
            <div className="ab-side ab-side-b">
              <div className="step-indicator optional">
                <span className="step-number">3</span>
                <span className="step-label">MATCHUP</span>
              </div>
              <div className="ab-side-header opponent-side">
                <h2>Opponent</h2>
                {opponentMaster && (
                  <div className="ab-side-budget">{opponentCrewCost}/50ss</div>
                )}
              </div>
              
              {/* Counter-Crew Generator Button */}
              <div className="counter-crew-section">
                <button 
                  className={`counter-crew-btn ${(!selectedMaster || crewRoster.length === 0) ? 'disabled' : ''}`}
                  onClick={generateCounterCrew}
                  disabled={!selectedMaster || crewRoster.length === 0}
                  title={!selectedMaster || crewRoster.length === 0 
                    ? "Add models to your crew first" 
                    : "Generate an opponent crew that counters your crew"}
                >Build Counter-Crew
                </button>
                
                {/* Difficulty Slider */}
                <div className="difficulty-slider-container">
                  <label className="difficulty-label">Difficulty:</label>
                  <div className="difficulty-slider-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      value={counterDifficulty === 'well-matched' ? 0 : counterDifficulty === 'challenging' ? 1 : 2}
                      onChange={(e) => {
                        const levels = ['well-matched', 'challenging', 'strongest']
                        setCounterDifficulty(levels[parseInt(e.target.value)])
                      }}
                      className="difficulty-slider"
                    />
                    <div className="difficulty-labels">
                      <span className={counterDifficulty === 'well-matched' ? 'active' : ''}>Well Matched</span>
                      <span className={counterDifficulty === 'challenging' ? 'active' : ''}>Challenging</span>
                      <span className={counterDifficulty === 'strongest' ? 'active' : ''}>Strongest</span>
                    </div>
                  </div>
                </div>
                
                {(!selectedMaster || crewRoster.length === 0) && (
                  <div className="counter-crew-hint">Add models to your crew to enable
                  </div>
                )}
              </div>
              
              <div className="opponent-divider">
                <span> or select manually </span>
              </div>
              
              {/* Opponent Faction Selection */}
              <div className="ab-master-select">
                <select 
                  value={opponentFaction}
                  onChange={e => {
                    setOpponentFaction(e.target.value)
                    setOpponentMaster(null)
                    setCounterCrewReasoning(null) // Clear counter-crew reasoning on manual selection
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
                      setCounterCrewReasoning(null) // Clear counter-crew reasoning on manual selection
                      setOpponentCrewCardFlipped(false) // Reset to Master in front
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
              
              {/*  OPPONENT LEADER DISPLAY - Master + Crew Card Stacked  */}
              {opponentMaster && (() => {
                const oppCrewCard = getCrewCardForMaster(opponentMaster)
                return (
                  <div className="crew-leaders-display opponent">
                    {oppCrewCard ? (
                      /* Stacked cards when both Master and Crew card exist */
                      <div className="leader-card-stack">
                        {/* Back card (angled) - clicking swaps positions */}
                        <div 
                          className={`leader-card-stacked back-card ${opponentCrewCardFlipped ? 'is-master' : 'is-crew'}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpponentCrewCardFlipped(!opponentCrewCardFlipped)
                          }}
                          style={{
                            transform: 'rotate(12deg)',
                            transformOrigin: 'bottom center'
                          }}
                        >
                          <img 
                            src={`${IMAGE_BASE}/${opponentCrewCardFlipped ? opponentMaster.front_image : oppCrewCard.front_image}`}
                            alt={opponentCrewCardFlipped ? opponentMaster.name : oppCrewCard.name}
                          />
                          <div className="leader-card-label">
                            {opponentCrewCardFlipped ? 'Master' : 'Crew Rules'}
                          </div>
                        </div>
                        
                        {/* Front card - clicking opens modal */}
                        <div 
                          className={`leader-card-stacked front-card ${opponentCrewCardFlipped ? 'is-crew' : 'is-master'}`}
                          onClick={() => openModal(
                            opponentCrewCardFlipped ? oppCrewCard : opponentMaster, 
                            [opponentMaster, oppCrewCard, ...opponentCrew].filter(Boolean)
                          )}
                        >
                          <img 
                            src={`${IMAGE_BASE}/${opponentCrewCardFlipped ? oppCrewCard.front_image : opponentMaster.front_image}`}
                            alt={opponentCrewCardFlipped ? oppCrewCard.name : opponentMaster.name}
                          />
                          <div className="leader-card-label">
                            {opponentCrewCardFlipped ? 'Crew Rules' : 'Master'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Single Master card when no Crew card available */
                      <div 
                        className="leader-card-single"
                        onClick={() => openModal(opponentMaster, [opponentMaster, ...opponentCrew].filter(Boolean))}
                      >
                        <img 
                          src={`${IMAGE_BASE}/${opponentMaster.front_image}`}
                          alt={opponentMaster.name}
                        />
                        <div className="leader-card-label">Master</div>
                      </div>
                    )}
                  </div>
                )
              })()}
              
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
                    <div className="ab-roster-empty opponent">Select opponent faction & master to see expected crew
                    </div>
                  ) : opponentCrew.length === 0 ? (
                    <div className="ab-roster-empty opponent">No keyword models found for {opponentMaster.primary_keyword}
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
                                {synergyCount}
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
                  >Reroll Crew
                  </button>
                  <div className="ab-opp-note">Simulated {opponentMaster.primary_keyword} crew  Not optimal, just plausible
                  </div>
                </div>
              )}
              
              {/* Counter-Crew Reasoning Display - Shows why this opponent was picked */}
              {counterCrewReasoning && opponentMaster && (
                <div className="counter-crew-reasoning">
                  <div className="reasoning-header">
                    <span className="reasoning-icon"></span>
                    <span className="reasoning-title">Counter Analysis</span>
                    {counterCrewReasoning.difficulty && (
                      <span className={`reasoning-difficulty ${counterCrewReasoning.difficulty}`}>
                        {counterCrewReasoning.difficulty === 'well-matched' ? 'Well Matched' :
                         counterCrewReasoning.difficulty === 'challenging' ? 'Challenging' : 'Strongest'}
                      </span>
                    )}
                  </div>
                  <div className="reasoning-content">
                    <div className="reasoning-master">
                      <strong>{counterCrewReasoning.masterName}</strong>
                    </div>
                    <div className="reasoning-main">
                      {counterCrewReasoning.masterReason}
                    </div>
                    {counterCrewReasoning.allReasons?.length > 1 && (
                      <ul className="reasoning-list">
                        {counterCrewReasoning.allReasons.slice(1).map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              
              {/*  OPPONENT SYNERGY PANEL - Collapsible  */}
              {opponentMaster && opponentCrew.length > 0 && (
                <div className={`synergy-panel opponent ${opponentSynergyPanelOpen ? 'open' : 'collapsed'}`}>
                  <div 
                    className="synergy-panel-header"
                    onClick={() => setOpponentSynergyPanelOpen(!opponentSynergyPanelOpen)}
                  >
                    <span className="synergy-panel-title">Opponent Synergies
                      {opponentCrewSynergies.synergies.length > 0 && (
                        <span className="synergy-count-badge">
                          {opponentCrewSynergies.synergies.length}
                        </span>
                      )}
                    </span>
                    <span className="synergy-panel-toggle">
                      {opponentSynergyPanelOpen ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {opponentSynergyPanelOpen && (
                    <>
                      {/* Synergy Score */}
                      <div className="synergy-score-summary">
                        <span className="synergy-score-label">Synergy Score:</span>
                        <span className={`synergy-score-value ${opponentCrewSynergies.totalScore >= 3 ? 'good' : opponentCrewSynergies.totalScore >= 1 ? 'ok' : 'low'}`}>
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
                            ⚠ {opponentCrewSynergies.antiSynergies.length} potential conflict(s)
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/*  OPPONENT CREW CARD RULES  */}
              {opponentMaster && opponentCrewCardAnalysis && (() => {
                const oppCrewCard = getCrewCardForMaster(opponentMaster)
                return oppCrewCard && (
                  <div className="crew-rules-panel opponent">
                    <div className="crew-rules-header">
                      <span className="crew-rules-title"> {oppCrewCard.name}</span>
                      <span className="crew-rules-subtitle">Their Crew Rules</span>
                    </div>
                    
                    {opponentCrewCardAnalysis.activeRules.length > 0 && (
                      <div className="crew-rules-section active">
                        <div className="crew-rules-section-header">
                          <span className="rules-status-icon"></span>Active ({opponentCrewCardAnalysis.activeRules.length})
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
        </>
      )}

      {/* 
          ENHANCED CARD MODAL - Mobile-first dual card view
           */}
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
            
            {/* Data Quality Debug Banner */}
            {/* Only show MISSING COST for hireable models (not Masters, Totems, or summoned models) */}
            {/* hireable flag is set by data pipeline - fall back to characteristics check if missing */}
            {(() => {
              const isHireable = selectedCard.hireable !== undefined 
                ? selectedCard.hireable 
                : !['Master', 'Totem'].some(c => (selectedCard.characteristics || []).includes(c));
              const hasCostIssue = selectedCard.cost == null && isHireable;
              const hasCharIssue = !selectedCard.characteristics || selectedCard.characteristics.length === 0;
              
              return (hasCostIssue || hasCharIssue) ? (
              <div className="modal-debug-banner">
                <span className="debug-banner-label">Data Quality Issues:</span>
                {hasCostIssue && (
                  <span className="debug-banner-item cost">Missing COST</span>
                )}
                {hasCharIssue && (
                  <span className="debug-banner-item char">Missing CHARACTERISTICS</span>
                )}
              </div>
            ) : null;
            })()}
            
            <div className="card-detail-body">
              {/* View Mode Toggle */}
              <div className="card-view-toggle">
                <button 
                  className={modalView === 'dual' ? 'active' : ''} 
                  onClick={() => setModalView('dual')}
                >Both Sides
                </button>
                <button 
                  className={modalView === 'front' ? 'active' : ''} 
                  onClick={() => setModalView('front')}
                >Front
                </button>
                <button 
                  className={modalView === 'back' ? 'active' : ''} 
                  onClick={() => setModalView('back')}
                >Back
                </button>
              </div>

              {/* Card Images - Dual view is the star! */}
              <div className={`card-images-container ${modalView}`}>
                {(modalView === 'dual' || modalView === 'front') && (
                  <div className={`card-image-wrapper ${!modalImagesLoaded.front ? 'loading' : ''}`}>
                    {!modalImagesLoaded.front && <div className="loading-spinner" />}
                    <img 
                      className={`detail-card-image ${modalImagesLoaded.front ? 'loaded' : ''}`}
                      src={`${IMAGE_BASE}/${(selectedVariant || selectedCard).front_image}`}
                      alt={`${selectedCard.name} front`}
                      onLoad={() => setModalImagesLoaded(prev => ({ ...prev, front: true }))}
                      onError={e => { 
                        e.target.onerror = null
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect fill="%23333" width="300" height="420"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">No Image</text></svg>'
                        setModalImagesLoaded(prev => ({ ...prev, front: true }))
                      }}
                    />
                  </div>
                )}
                {(modalView === 'dual' || modalView === 'back') && (selectedVariant || selectedCard).back_image && (
                  <div className={`card-image-wrapper ${!modalImagesLoaded.back ? 'loading' : ''}`}>
                    {!modalImagesLoaded.back && <div className="loading-spinner" />}
                    <img 
                      className={`detail-card-image ${modalImagesLoaded.back ? 'loaded' : ''}`}
                      src={`${IMAGE_BASE}/${(selectedVariant || selectedCard).back_image}`}
                      alt={`${selectedCard.name} back`}
                      onLoad={() => setModalImagesLoaded(prev => ({ ...prev, back: true }))}
                      onError={e => { 
                        e.target.onerror = null
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect fill="%23333" width="300" height="420"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">No Image</text></svg>'
                        setModalImagesLoaded(prev => ({ ...prev, back: true }))
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Quick Stats Bar - Always visible, BEFORE variant picker */}
              <div className="quick-stats-bar">
                {/* Cost - Left side, visually distinct */}
                {selectedCard.cost != null && (
                  <div className="quick-stat cost-stat">
                    <span className="quick-stat-value">{selectedCard.cost}</span>
                    <span className="quick-stat-label">Cost</span>
                  </div>
                )}
                
                {/* Main 4 Stats - DF, SP, WP, SZ */}
                <div className="core-stats-group">
                  {selectedCard.defense && (
                    <div className="quick-stat core-stat">
                      <span className="quick-stat-value">{selectedCard.defense}</span>
                      <span className="quick-stat-label">Df</span>
                    </div>
                  )}
                  {selectedCard.speed && (
                    <div className="quick-stat core-stat">
                      <span className="quick-stat-value">{selectedCard.speed}</span>
                      <span className="quick-stat-label">Sp</span>
                    </div>
                  )}
                  {selectedCard.willpower && (
                    <div className="quick-stat core-stat">
                      <span className="quick-stat-value">{selectedCard.willpower}</span>
                      <span className="quick-stat-label">Wp</span>
                    </div>
                  )}
                  {selectedCard.size && (
                    <div className="quick-stat core-stat">
                      <span className="quick-stat-value">{selectedCard.size}</span>
                      <span className="quick-stat-label">Sz</span>
                    </div>
                  )}
                </div>
                
                {/* Resource Stats - HP, SS */}
                <div className="resource-stats-group">
                  {selectedCard.health && (
                    <div className="quick-stat health">
                      <span className="quick-stat-value">{selectedCard.health}</span>
                      <span className="quick-stat-label">HP</span>
                    </div>
                  )}
                  {selectedCard.soulstone_cache && (
                    <div className="quick-stat soulstone">
                      <span className="quick-stat-value"></span>
                      <span className="quick-stat-label">SS</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Variant Art Picker - Show when multiple variants exist, AFTER stats */}
              {(() => {
                const variants = getCardVariants(selectedCard)
                if (variants.length <= 1) return null
                
                return (
                  <div className="variant-picker">
                    <div className="variant-picker-label">
                      <span className="variant-icon"></span>Art Variants ({variants.length})
                    </div>
                    <div className="variant-thumbnails">
                      {variants.map((variant, idx) => (
                        <button
                          key={variant.id || idx}
                          className={`variant-thumb ${(selectedVariant || selectedCard).id === variant.id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedVariant(variant)
                            setModalImagesLoaded({ front: false, back: false })
                          }}
                          title={`Variant ${variant.variant || 'A'}`}
                        >
                          <img 
                            src={`${IMAGE_BASE}/${variant.front_image}`}
                            alt={`Variant ${variant.variant || 'A'}`}
                          />
                          <span className="variant-letter">{variant.variant || 'A'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Collapsible Data Sections */}
              <div className="card-data-sections">
                {/* Identity Section */}
                <details className="data-section" open>
                  <summary className="data-section-header">
                    <span className="section-icon"></span>Identity
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
                      <span className="section-icon"></span>Characteristics
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
                      <span className="section-icon"></span>Keywords
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
                      <span className="section-icon"></span>Roles
                    </summary>
                    <div className="data-section-content">
                      <div className="tag-list">
                        {selectedCard.roles.map(r => (
                          <span key={r} className="detail-tag role">
                            {ROLE_DESCRIPTIONS[r]?.icon || ''} {ROLE_DESCRIPTIONS[r]?.label || r}
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
                      <span className="section-icon"></span>Keyword Family ({getRelatedModels(selectedCard).length})
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

                {/* Card Synergies - Real Implementation */}
                {(() => {
                  const cardSyns = getCardSynergies(selectedCard)
                  return (
                    <details className="data-section card-synergies-section" open={cardSyns.synergies.length > 0}>
                      <summary className="data-section-header">
                        <span className="section-icon"></span>Synergies
                        {cardSyns.synergies.length > 0 && (
                          <span className="synergy-count">{cardSyns.synergies.length}</span>
                        )}
                      </summary>
                      <div className="data-section-content">
                        {cardSyns.synergies.length > 0 ? (
                          <>
                            <div className="card-synergies-grid">
                              {cardSyns.synergies.map((syn, idx) => (
                                <div 
                                  key={idx} 
                                  className="synergy-card-item"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedCard(syn.card)
                                  }}
                                >
                                  <div className="synergy-card-img-wrap">
                                    <img 
                                      src={`${IMAGE_BASE}/${syn.card.front_image}`}
                                      alt={syn.card.name}
                                      className="synergy-card-img"
                                    />
                                    <span className="synergy-type-icon">{syn.icon}</span>
                                  </div>
                                  <div className="synergy-card-info">
                                    <span className="synergy-card-name">{syn.card.name}</span>
                                    <span className="synergy-card-reason">{syn.reason}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {cardSyns.antiSynergies.length > 0 && (
                              <div className="anti-synergies-section">
                                <div className="anti-synergies-header">Potential Conflicts</div>
                                {cardSyns.antiSynergies.map((anti, idx) => (
                                  <div key={idx} className="anti-synergy-card-item">
                                    <span className="anti-synergy-name">{anti.card.name}</span>
                                    <span className="anti-synergy-reason">{anti.reason}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="no-synergies-text">No strong synergies detected. This model may work independently or with any crew.
                          </p>
                        )}
                      </div>
                    </details>
                  )
                })()}
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
                  {selectedObjective.card_type === 'strategy' ? '' : ''}
                </span>
                {selectedObjective.name}
              </h2>
              <button className="close-btn" onClick={closeObjectiveModal}>×</button>
            </div>
            <div className="objective-modal-body">
              {/* Card Image */}
              {(() => {
                const imageMap = selectedObjective.card_type === 'strategy' 
                  ? STRATEGY_CARD_IMAGES 
                  : SCHEME_CARD_IMAGES
                const imagePath = imageMap[selectedObjective.id]
                return imagePath && (
                  <div className="objective-modal-image" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}>
                    <img 
                      src={`${IMAGE_BASE}/${imagePath}`}
                      alt={selectedObjective.name}
                      style={{
                        maxWidth: '280px',
                        width: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                      }}
                    />
                  </div>
                )
              })()}
              
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
                          <span className="meta-faction-label"> {metaFaction}</span>
                          {meta ? (
                            <div className="meta-detail">
                              <span className={`meta-rating ${meta.rating}`}>
                                {meta.rating === 'strong' ? ' Strong' : meta.rating === 'weak' ? ' Weak' : '~ Neutral'}
                              </span>
                              <span className="meta-stats">
                                {Math.round(meta.winRate * 100)}% ({meta.games}g)
                              </span>
                              <span className="meta-delta" style={{ color: meta.delta >= 0 ? '#E2E8F0' : '#8B5CF6' }}>
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
                          <span className="meta-faction-label"> {opponentFaction}</span>
                          {meta ? (
                            <div className="meta-detail">
                              <span className={`meta-rating ${meta.rating}`}>
                                {meta.rating === 'strong' ? ' Strong' : meta.rating === 'weak' ? ' Weak' : '~ Neutral'}
                              </span>
                              <span className="meta-stats">
                                {Math.round(meta.winRate * 100)}% ({meta.games}g)
                              </span>
                              <span className="meta-delta" style={{ color: meta.delta >= 0 ? '#E2E8F0' : '#8B5CF6' }}>
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
                    <div className="req-item active">Requires Killing</div>
                  )}
                  {selectedObjective.requires_scheme_markers && (
                    <div className="req-item active">Scheme Markers</div>
                  )}
                  {selectedObjective.requires_strategy_markers && (
                    <div className="req-item active">Strategy Markers</div>
                  )}
                  {selectedObjective.requires_positioning && (
                    <div className="req-item active">Positioning</div>
                  )}
                  {selectedObjective.requires_terrain && (
                    <div className="req-item active">Terrain</div>
                  )}
                  {selectedObjective.requires_interact && (
                    <div className="req-item active">Interact Actions</div>
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
                      <h4 style={{marginTop: '0.5rem', color: '#E2E8F0', fontSize: '0.85rem'}}>Useful Abilities</h4>
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
                <button 
                  className="modal-close-bottom"
                  onClick={closeObjectiveModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

    </div>
  )
}

export default App
