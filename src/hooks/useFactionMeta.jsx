import { useMemo } from 'react';

/**
 * FACTION_META - Tournament data from Longshanks (15,893 games analyzed)
 * This data powers scheme/strategy recommendations based on historical win rates
 */
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
      "assassinate": {"win_rate": 0.47, "games": 175},
      "breakthrough": {"win_rate": 0.52, "games": 150},
      "detonate_charges": {"win_rate": 0.51, "games": 169},
      "ensnare": {"win_rate": 0.44, "games": 149},
      "frame_job": {"win_rate": 0.46, "games": 148},
      "harness_the_ley_line": {"win_rate": 0.53, "games": 141},
      "leave_your_mark": {"win_rate": 0.48, "games": 152},
      "make_it_look_like_an_accident": {"win_rate": 0.49, "games": 97},
      "public_demonstration": {"win_rate": 0.52, "games": 52},
      "reshape_the_land": {"win_rate": 0.50, "games": 104},
      "runic_binding": {"win_rate": 0.45, "games": 152},
      "scout_the_rooftops": {"win_rate": 0.45, "games": 150},
      "search_the_area": {"win_rate": 0.50, "games": 102},
      "take_the_highground": {"win_rate": 0.49, "games": 160}
    }
  }
};

// Minimum games threshold for reliable data
const MIN_GAMES_THRESHOLD = 50;

/**
 * Normalize scheme key to match data format
 */
const normalizeSchemeKey = (scheme) => {
  if (!scheme) return '';
  return scheme
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
};

/**
 * useFactionMeta - Hook for accessing faction tournament meta data
 * 
 * Provides functions to:
 * - Get scheme ratings for a faction
 * - Get strategy ratings for a faction
 * - Get best/worst schemes for a faction
 * - Access raw faction meta data
 */
export function useFactionMeta() {
  
  /**
   * Get rating info for a specific scheme and faction
   * @returns {Object|null} { rating: 'strong'|'neutral'|'weak', winRate, delta, games }
   */
  const getSchemeRating = useMemo(() => (faction, scheme) => {
    if (!faction || !scheme) return null;
    
    const factionData = FACTION_META[faction];
    if (!factionData) return null;
    
    const normalizedScheme = normalizeSchemeKey(scheme);
    const schemeData = factionData.schemes_chosen?.[normalizedScheme];
    if (!schemeData) return null;
    
    // Skip low sample size data
    if (schemeData.games < MIN_GAMES_THRESHOLD) return null;
    
    const factionAvg = factionData.overall.win_rate;
    const delta = schemeData.win_rate - factionAvg;
    
    // Determine rating based on delta from faction average
    let rating;
    if (delta > 0.03) rating = 'strong';
    else if (delta < -0.03) rating = 'weak';
    else rating = 'neutral';
    
    return {
      rating,
      winRate: schemeData.win_rate,
      delta,
      games: schemeData.games
    };
  }, []);
  
  /**
   * Get rating info for a specific strategy and faction
   * @returns {Object|null} { rating: 'strong'|'neutral'|'weak', winRate, delta, games }
   */
  const getStrategyRating = useMemo(() => (faction, strategy) => {
    if (!faction || !strategy) return null;
    
    const factionData = FACTION_META[faction];
    if (!factionData) return null;
    
    const normalizedStrategy = normalizeSchemeKey(strategy);
    const strategyData = factionData.strategies_m4e?.[normalizedStrategy];
    if (!strategyData) return null;
    
    // Skip very low sample size
    if (strategyData.games < 10) return null;
    
    const factionAvg = factionData.overall.win_rate;
    const delta = strategyData.win_rate - factionAvg;
    
    // Determine rating based on delta from faction average
    let rating;
    if (delta > 0.02) rating = 'strong';
    else if (delta < -0.05) rating = 'weak';
    else rating = 'neutral';
    
    return {
      rating,
      winRate: strategyData.win_rate,
      delta,
      games: strategyData.games
    };
  }, []);
  
  /**
   * Get best schemes for a faction (sorted by delta from average)
   * @param {string} faction - Faction name
   * @param {number} limit - Max schemes to return
   * @returns {Array} [{ scheme, winRate, delta, games }, ...]
   */
  const getBestSchemes = useMemo(() => (faction, limit = 5) => {
    if (!faction) return [];
    
    const factionData = FACTION_META[faction];
    if (!factionData) return [];
    
    const factionAvg = factionData.overall.win_rate;
    const schemes = factionData.schemes_chosen || {};
    
    const ranked = Object.entries(schemes)
      .filter(([_, data]) => data.games >= MIN_GAMES_THRESHOLD)
      .map(([scheme, data]) => ({
        scheme,
        winRate: data.win_rate,
        delta: data.win_rate - factionAvg,
        games: data.games
      }))
      .filter(s => s.delta > 0.02) // Only above average
      .sort((a, b) => b.delta - a.delta)
      .slice(0, limit);
    
    return ranked;
  }, []);
  
  /**
   * Get worst schemes for a faction (sorted by delta from average)
   * @param {string} faction - Faction name
   * @param {number} limit - Max schemes to return
   * @returns {Array} [{ scheme, winRate, delta, games }, ...]
   */
  const getWorstSchemes = useMemo(() => (faction, limit = 5) => {
    if (!faction) return [];
    
    const factionData = FACTION_META[faction];
    if (!factionData) return [];
    
    const factionAvg = factionData.overall.win_rate;
    const schemes = factionData.schemes_chosen || {};
    
    const ranked = Object.entries(schemes)
      .filter(([_, data]) => data.games >= MIN_GAMES_THRESHOLD)
      .map(([scheme, data]) => ({
        scheme,
        winRate: data.win_rate,
        delta: data.win_rate - factionAvg,
        games: data.games
      }))
      .filter(s => s.delta < -0.02) // Only below average
      .sort((a, b) => a.delta - b.delta)
      .slice(0, limit);
    
    return ranked;
  }, []);
  
  /**
   * Get faction's overall performance
   * @param {string} faction - Faction name
   * @returns {Object|null} { winRate, games, tier }
   */
  const getFactionOverall = useMemo(() => (faction) => {
    if (!faction) return null;
    
    const factionData = FACTION_META[faction];
    if (!factionData) return null;
    
    const winRate = factionData.overall.win_rate;
    
    // Assign tier based on win rate
    let tier;
    if (winRate >= 0.52) tier = 'S';
    else if (winRate >= 0.50) tier = 'A';
    else if (winRate >= 0.48) tier = 'B';
    else tier = 'C';
    
    return {
      winRate,
      games: factionData.overall.games,
      tier
    };
  }, []);
  
  return {
    factionMeta: FACTION_META,
    getSchemeRating,
    getStrategyRating,
    getBestSchemes,
    getWorstSchemes,
    getFactionOverall,
    normalizeSchemeKey
  };
}

export default useFactionMeta;
