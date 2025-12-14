import { useState, useEffect, useMemo } from 'react';

/**
 * useFactionMeta - Hook for loading and using faction meta data
 * 
 * Usage:
 *   const { factionMeta, loading, getSchemeRating, getStrategyRating } = useFactionMeta();
 *   
 *   // Get scheme recommendation for a faction
 *   const rating = getSchemeRating('Neverborn', 'assassinate');
 *   // Returns: { rating: 'neutral', winRate: 0.51, delta: -0.01, games: 271 }
 */

// Default path - adjust based on your project structure
const DEFAULT_META_PATH = '/data/faction_meta.json';

// Full faction data (embedded for offline use)
// This matches the FACTION_DATA structure from faction_meta.py
const EMBEDDED_FACTION_DATA = {
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
  "Explorers": {
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
      "informants": {"win_rate": 0.40, "games": 206},
      "plant_explosives": {"win_rate": 0.37, "games": 201},
      "recover_evidence": {"win_rate": 0.43, "games": 208}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.54, "games": 240},
      "breakthrough": {"win_rate": 0.57, "games": 147},
      "detonate_charges": {"win_rate": 0.55, "games": 170},
      "ensnare": {"win_rate": 0.47, "games": 136},
      "frame_job": {"win_rate": 0.40, "games": 159},
      "harness_the_ley_line": {"win_rate": 0.57, "games": 136},
      "leave_your_mark": {"win_rate": 0.56, "games": 147},
      "make_it_look_like_an_accident": {"win_rate": 0.51, "games": 96},
      "public_demonstration": {"win_rate": 0.41, "games": 50},
      "reshape_the_land": {"win_rate": 0.56, "games": 89},
      "runic_binding": {"win_rate": 0.51, "games": 157},
      "scout_the_rooftops": {"win_rate": 0.55, "games": 172},
      "search_the_area": {"win_rate": 0.64, "games": 103},
      "take_the_highground": {"win_rate": 0.50, "games": 194}
    }
  },
  "Resurrectionists": {
    "overall": {"win_rate": 0.47, "games": 1921},
    "strategies_m4e": {
      "boundary_dispute": {"win_rate": 0.31, "games": 184},
      "collapsing_mines": {"win_rate": 0.30, "games": 14},
      "informants": {"win_rate": 0.42, "games": 178},
      "plant_explosives": {"win_rate": 0.42, "games": 161},
      "recover_evidence": {"win_rate": 0.43, "games": 190}
    },
    "schemes_chosen": {
      "assassinate": {"win_rate": 0.51, "games": 196},
      "breakthrough": {"win_rate": 0.57, "games": 128},
      "detonate_charges": {"win_rate": 0.45, "games": 149},
      "ensnare": {"win_rate": 0.47, "games": 157},
      "frame_job": {"win_rate": 0.44, "games": 127},
      "harness_the_ley_line": {"win_rate": 0.46, "games": 131},
      "leave_your_mark": {"win_rate": 0.53, "games": 148},
      "make_it_look_like_an_accident": {"win_rate": 0.49, "games": 78},
      "public_demonstration": {"win_rate": 0.46, "games": 48},
      "reshape_the_land": {"win_rate": 0.46, "games": 97},
      "runic_binding": {"win_rate": 0.46, "games": 77},
      "scout_the_rooftops": {"win_rate": 0.46, "games": 165},
      "search_the_area": {"win_rate": 0.50, "games": 105},
      "take_the_highground": {"win_rate": 0.52, "games": 168}
    }
  }
};

export const useFactionMeta = (metaPath = DEFAULT_META_PATH) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use embedded data by default (faster, works offline)
  const factionMeta = EMBEDDED_FACTION_DATA;
  
  // Helper: Get scheme rating for a faction
  const getSchemeRating = useMemo(() => {
    return (faction, scheme) => {
      const factionData = factionMeta[faction];
      if (!factionData) return null;
      
      const normalizedScheme = scheme.toLowerCase().replace(/\s+/g, '_');
      const schemeData = factionData.schemes_chosen?.[normalizedScheme];
      if (!schemeData) return null;
      
      const factionAvg = factionData.overall.win_rate;
      const delta = schemeData.win_rate - factionAvg;
      
      let rating = 'neutral';
      if (delta > 0.03) rating = 'strong';
      else if (delta < -0.03) rating = 'weak';
      
      return {
        rating,
        winRate: schemeData.win_rate,
        delta: Math.round(delta * 100) / 100,
        games: schemeData.games,
        factionAvg
      };
    };
  }, [factionMeta]);
  
  // Helper: Get strategy rating for a faction
  const getStrategyRating = useMemo(() => {
    return (faction, strategy) => {
      const factionData = factionMeta[faction];
      if (!factionData) return null;
      
      const normalizedStrategy = strategy.toLowerCase().replace(/\s+/g, '_');
      const strategyData = factionData.strategies_m4e?.[normalizedStrategy];
      if (!strategyData) return null;
      
      const factionAvg = factionData.overall.win_rate;
      const delta = strategyData.win_rate - factionAvg;
      
      let rating = 'neutral';
      if (delta > 0.02) rating = 'strong';
      else if (delta < -0.05) rating = 'weak';
      
      return {
        rating,
        winRate: strategyData.win_rate,
        delta: Math.round(delta * 100) / 100,
        games: strategyData.games,
        factionAvg
      };
    };
  }, [factionMeta]);
  
  // Helper: Get best schemes for a faction
  const getBestSchemes = useMemo(() => {
    return (faction, limit = 5) => {
      const factionData = factionMeta[faction];
      if (!factionData) return [];
      
      const factionAvg = factionData.overall.win_rate;
      const schemes = factionData.schemes_chosen || {};
      
      return Object.entries(schemes)
        .filter(([_, data]) => data.games >= 50)
        .map(([scheme, data]) => ({
          scheme,
          winRate: data.win_rate,
          delta: data.win_rate - factionAvg,
          games: data.games
        }))
        .sort((a, b) => b.delta - a.delta)
        .slice(0, limit);
    };
  }, [factionMeta]);
  
  // Helper: Get worst schemes for a faction
  const getWorstSchemes = useMemo(() => {
    return (faction, limit = 5) => {
      const factionData = factionMeta[faction];
      if (!factionData) return [];
      
      const factionAvg = factionData.overall.win_rate;
      const schemes = factionData.schemes_chosen || {};
      
      return Object.entries(schemes)
        .filter(([_, data]) => data.games >= 50)
        .map(([scheme, data]) => ({
          scheme,
          winRate: data.win_rate,
          delta: data.win_rate - factionAvg,
          games: data.games
        }))
        .sort((a, b) => a.delta - b.delta)
        .slice(0, limit);
    };
  }, [factionMeta]);
  
  // Helper: Get faction rankings
  const getFactionRankings = useMemo(() => {
    return () => {
      return Object.entries(factionMeta)
        .map(([faction, data]) => ({
          faction,
          winRate: data.overall.win_rate,
          games: data.overall.games
        }))
        .sort((a, b) => b.winRate - a.winRate);
    };
  }, [factionMeta]);
  
  return {
    factionMeta,
    loading,
    error,
    getSchemeRating,
    getStrategyRating,
    getBestSchemes,
    getWorstSchemes,
    getFactionRankings
  };
};

export default useFactionMeta;