/**
 * Malifaux 4E Synergy Helpers
 * 
 * Utility functions for working with pre-baked synergy data in the React app.
 * 
 * Usage:
 *   import { getSynergiesForCard, getCapabilityScore, filterByCapability } from './synergyHelpers';
 *   
 *   // Get synergies for a card
 *   const synergies = getSynergiesForCard(card, allCards);
 *   
 *   // Score a card for a pool
 *   const score = getPoolScore(card, { scheme_markers: 3, mobility: 2 });
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Synergy entry (compact format from bake_synergy_data.py)
 */
export interface Synergy {
  id: string;     // Card ID
  s: number;      // Score
  r: string[];    // Reasons (compact)
}

/**
 * Card capabilities for scheme/strategy matching
 */
export interface Capabilities {
  scheme_markers?: number;
  mobility?: number;
  flight?: number;
  survivability?: number;
  damage?: number;
  alpha_strike?: number;
  engagement?: number;
  melee?: number;
  push_pull?: number;
  kidnap?: number;
  board_control?: number;
  marker_creation?: number;
  marker_interaction?: number;
  corpse_markers?: number;
  cheap_activations?: number;
  activation_control?: number;
  minion_heavy?: number;
  spread?: number;
  interact?: number;
  dont_mind_me?: number;
}

/**
 * Synergy data stored on each card
 */
export interface SynergyData {
  conditions_applied?: string[];
  conditions_removed?: string[];
  benefits_from_conditions?: string[];
  markers_created?: string[];
  markers_consumed?: string[];
  buffs_characteristics?: string[];
  grants_bonus_action?: boolean;
  has_bonus_actions?: boolean;
}

// =============================================================================
// STRATEGY & SCHEME REQUIREMENTS
// =============================================================================

export const STRATEGIES: Record<string, { name: string; requirements: Capabilities }> = {
  plant_explosives: {
    name: 'Plant Explosives',
    requirements: { scheme_markers: 3, mobility: 2, survivability: 2, activation_control: 1 },
  },
  boundary_dispute: {
    name: 'Boundary Dispute',
    requirements: { survivability: 3, melee: 2, mobility: 1 },
  },
  recover_evidence: {
    name: 'Recover Evidence',
    requirements: { damage: 2, mobility: 2, scheme_markers: 1, kidnap: 1 },
  },
  informants: {
    name: 'Informants',
    requirements: { survivability: 3, spread: 2, activation_control: 2 },
  },
};

export const SCHEMES: Record<string, { name: string; requirements: Capabilities }> = {
  breakthrough: { name: 'Breakthrough', requirements: { scheme_markers: 3, mobility: 3, survivability: 1 } },
  harness_the_leyline: { name: 'Harness the Ley Line', requirements: { scheme_markers: 3, survivability: 2, spread: 1 } },
  search_the_area: { name: 'Search the Area', requirements: { scheme_markers: 2, mobility: 2, activation_control: 1 } },
  detonate_charges: { name: 'Detonate Charges', requirements: { scheme_markers: 3, interact: 2 } },
  runic_binding: { name: 'Runic Binding', requirements: { scheme_markers: 2, mobility: 2, melee: 1 } },
  reshape_the_land: { name: 'Reshape the Land', requirements: { scheme_markers: 3, marker_creation: 2 } },
  leave_your_mark: { name: 'Leave Your Mark', requirements: { scheme_markers: 2, survivability: 2, mobility: 1 } },
  scout_the_rooftops: { name: 'Scout the Rooftops', requirements: { flight: 2, mobility: 2, scheme_markers: 1 } },
  take_the_highground: { name: 'Take the Highground', requirements: { survivability: 2, melee: 2, mobility: 1 } },
  make_it_look_like_an_accident: { name: 'Make it Look Like an Accident', requirements: { push_pull: 2, melee: 1, mobility: 1 } },
  assassinate: { name: 'Assassinate', requirements: { damage: 3, alpha_strike: 2, mobility: 1 } },
  grave_robbing: { name: 'Grave Robbing', requirements: { corpse_markers: 2, marker_interaction: 2, damage: 1 } },
  frame_job: { name: 'Frame Job', requirements: { survivability: 2, mobility: 2, scheme_markers: 1 } },
  ensnare: { name: 'Ensnare', requirements: { scheme_markers: 2, engagement: 2, cheap_activations: 1 } },
  public_demonstration: { name: 'Public Demonstration', requirements: { minion_heavy: 3, engagement: 2, survivability: 1 } },
};

// =============================================================================
// SYNERGY HELPERS
// =============================================================================

/**
 * Expand compact synergy reasons to human-readable format
 */
export function expandReason(reason: string): string {
  const [type, value] = reason.split(':');
  
  switch (type) {
    case 'keyword':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} keyword`;
    case 'buffs':
      return `Buffs ${value}`;
    case 'condition':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} synergy`;
    case 'marker':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} markers`;
    case 'versatile':
      return 'Versatile (hires into any keyword)';
    case 'bonus_action':
      return 'Action economy synergy';
    default:
      return reason;
  }
}

/**
 * Get synergies for a card, expanded with full card data
 */
export function getSynergiesForCard<T extends { id: string; name: string }>(
  card: { synergies?: Synergy[] },
  allCards: T[]
): Array<T & { score: number; reasons: string[] }> {
  const synergies = card.synergies || [];
  const cardMap = new Map(allCards.map(c => [c.id, c]));
  
  return synergies
    .map(syn => {
      const targetCard = cardMap.get(syn.id);
      if (!targetCard) return null;
      
      return {
        ...targetCard,
        score: syn.s,
        reasons: syn.r.map(expandReason),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * Score a card against pool requirements
 */
export function getPoolScore(
  card: { capabilities?: Capabilities },
  requirements: Capabilities
): { score: number; matches: string[] } {
  const caps = card.capabilities || {};
  let score = 0;
  const matches: string[] = [];
  
  for (const [req, needed] of Object.entries(requirements)) {
    const has = caps[req as keyof Capabilities] || 0;
    if (has > 0) {
      const contribution = Math.min(has, needed);
      score += contribution * 2;
      matches.push(`${req}: ${has}/${needed}`);
    }
  }
  
  return { score, matches };
}

/**
 * Aggregate pool requirements from strategy + schemes
 */
export function getPoolRequirements(
  strategyKey: string | null,
  schemeKeys: string[]
): Capabilities {
  const requirements: Capabilities = {};
  
  // Add strategy requirements
  if (strategyKey && STRATEGIES[strategyKey]) {
    for (const [cap, val] of Object.entries(STRATEGIES[strategyKey].requirements)) {
      requirements[cap as keyof Capabilities] = (requirements[cap as keyof Capabilities] || 0) + val;
    }
  }
  
  // Add scheme requirements
  for (const schemeKey of schemeKeys) {
    if (SCHEMES[schemeKey]) {
      for (const [cap, val] of Object.entries(SCHEMES[schemeKey].requirements)) {
        requirements[cap as keyof Capabilities] = (requirements[cap as keyof Capabilities] || 0) + val;
      }
    }
  }
  
  return requirements;
}

/**
 * Filter cards by minimum capability score
 */
export function filterByCapability<T extends { capabilities?: Capabilities }>(
  cards: T[],
  capability: keyof Capabilities,
  minValue: number = 1
): T[] {
  return cards.filter(card => (card.capabilities?.[capability] || 0) >= minValue);
}

/**
 * Sort cards by pool fit
 */
export function sortByPoolFit<T extends { capabilities?: Capabilities }>(
  cards: T[],
  requirements: Capabilities,
  descending: boolean = true
): T[] {
  return [...cards].sort((a, b) => {
    const scoreA = getPoolScore(a, requirements).score;
    const scoreB = getPoolScore(b, requirements).score;
    return descending ? scoreB - scoreA : scoreA - scoreB;
  });
}

/**
 * Get top scheme runners (cards with high scheme marker capabilities)
 */
export function getSchemeRunners<T extends { capabilities?: Capabilities; cost?: number }>(
  cards: T[],
  limit: number = 10
): T[] {
  return cards
    .filter(card => (card.capabilities?.scheme_markers || 0) >= 2)
    .sort((a, b) => {
      const scoreA = (a.capabilities?.scheme_markers || 0) + (a.capabilities?.mobility || 0);
      const scoreB = (b.capabilities?.scheme_markers || 0) + (b.capabilities?.mobility || 0);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * Get top beaters (cards with high damage capabilities)
 */
export function getBeaters<T extends { capabilities?: Capabilities }>(
  cards: T[],
  limit: number = 10
): T[] {
  return cards
    .filter(card => (card.capabilities?.damage || 0) >= 2)
    .sort((a, b) => {
      const scoreA = (a.capabilities?.damage || 0) + (a.capabilities?.alpha_strike || 0);
      const scoreB = (b.capabilities?.damage || 0) + (b.capabilities?.alpha_strike || 0);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

// =============================================================================
// CREW ANALYSIS
// =============================================================================

/**
 * Analyze a crew's aggregate capabilities
 */
export function analyzeCrewCapabilities(
  crew: Array<{ capabilities?: Capabilities }>
): Capabilities {
  const aggregate: Capabilities = {};
  
  for (const model of crew) {
    const caps = model.capabilities || {};
    for (const [cap, val] of Object.entries(caps)) {
      aggregate[cap as keyof Capabilities] = (aggregate[cap as keyof Capabilities] || 0) + val;
    }
  }
  
  return aggregate;
}

/**
 * Find gaps in crew capabilities vs pool requirements
 */
export function findCrewGaps(
  crew: Array<{ capabilities?: Capabilities }>,
  requirements: Capabilities
): Array<{ capability: string; needed: number; have: number; gap: number }> {
  const crewCaps = analyzeCrewCapabilities(crew);
  const gaps: Array<{ capability: string; needed: number; have: number; gap: number }> = [];
  
  for (const [cap, needed] of Object.entries(requirements)) {
    const have = crewCaps[cap as keyof Capabilities] || 0;
    if (have < needed) {
      gaps.push({
        capability: cap,
        needed,
        have,
        gap: needed - have,
      });
    }
  }
  
  return gaps.sort((a, b) => b.gap - a.gap);
}

/**
 * Recommend models to fill crew gaps
 */
export function recommendForGaps<T extends { capabilities?: Capabilities; keywords?: string[] }>(
  gaps: Array<{ capability: string; gap: number }>,
  availableCards: T[],
  crewKeyword?: string,
  limit: number = 5
): T[] {
  // Score each card by how well it fills gaps
  const scored = availableCards.map(card => {
    let score = 0;
    const caps = card.capabilities || {};
    
    for (const { capability, gap } of gaps) {
      const has = caps[capability as keyof Capabilities] || 0;
      if (has > 0) {
        score += Math.min(has, gap) * 2;
      }
    }
    
    // Bonus for same keyword
    if (crewKeyword) {
      const keywords = card.keywords?.map(k => k.toLowerCase()) || [];
      if (keywords.includes(crewKeyword.toLowerCase())) {
        score += 3;
      } else if (keywords.includes('versatile')) {
        score += 1;
      }
    }
    
    return { card, score };
  });
  
  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.card);
}

export default {
  STRATEGIES,
  SCHEMES,
  expandReason,
  getSynergiesForCard,
  getPoolScore,
  getPoolRequirements,
  filterByCapability,
  sortByPoolFit,
  getSchemeRunners,
  getBeaters,
  analyzeCrewCapabilities,
  findCrewGaps,
  recommendForGaps,
};
