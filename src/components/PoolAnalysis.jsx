import React, { useMemo } from 'react';

/**
 * PoolAnalysis - Analyze crew capabilities vs scheme/strategy pool requirements
 * 
 * This component answers the real questions players have:
 * 1. Is this pool good for my faction?
 * 2. Does my crew have the tools to score it?
 * 3. What am I missing?
 * 4. What should I add?
 */

// =============================================================================
// SCHEME/STRATEGY REQUIREMENTS
// What capabilities does each objective actually need?
// =============================================================================

const STRATEGY_REQUIREMENTS = {
  plant_explosives: {
    name: 'Plant Explosives',
    needs: {
      scheme_markers: 3,    // Must drop markers in enemy territory
      mobility: 3,          // Need to get across the board
      survivability: 2,     // Stay alive to score end of turn
    },
    tips: 'Spread out, fast models with Interact abilities shine',
  },
  boundary_dispute: {
    name: 'Boundary Dispute',
    needs: {
      melee: 3,             // Fight for table quarters
      survivability: 3,     // Hold ground
      mobility: 1,          // Get to quarters
    },
    tips: 'Durable beaters that can hold a quarter',
  },
  recover_evidence: {
    name: 'Recover Evidence',
    needs: {
      damage: 2,            // Kill to drop evidence
      mobility: 2,          // Grab evidence quickly
      interact: 2,          // Pick up markers
    },
    tips: 'Kill models, grab the evidence they drop',
  },
  informants: {
    name: 'Informants',
    needs: {
      survivability: 3,     // Keep informant alive
      spread: 2,            // Models in multiple quarters
      cheap_activations: 2, // Activation control matters
    },
    tips: 'Protect your informant, spread models across quarters',
  },
  clashing_forces: {
    name: 'Clashing Forces',
    needs: {
      melee: 3,
      damage: 2,
      survivability: 2,
    },
    tips: 'Get stuck in and fight for the center',
  },
};

const SCHEME_REQUIREMENTS = {
  breakthrough: {
    name: 'Breakthrough',
    needs: {
      scheme_markers: 2,
      mobility: 3,
      survivability: 1,
    },
    tips: 'Fast schemer that can survive in enemy deployment',
    role: 'schemer',
  },
  assassinate: {
    name: 'Assassinate',
    needs: {
      damage: 3,
      alpha_strike: 2,
      mobility: 2,
    },
    tips: 'High damage output, ability to reach enemy master',
    role: 'aggro',
  },
  detonate_charges: {
    name: 'Detonate Charges',
    needs: {
      scheme_markers: 3,
      interact: 2,
      mobility: 1,
    },
    tips: 'Drop 2 markers within 3" then remove them',
    role: 'schemer',
  },
  harness_the_ley_line: {
    name: 'Harness the Ley Line',
    needs: {
      scheme_markers: 2,
      survivability: 2,
      spread: 2,
    },
    tips: 'Markers on centerline, keep models nearby',
    role: 'schemer',
  },
  leave_your_mark: {
    name: 'Leave Your Mark',
    needs: {
      scheme_markers: 2,
      mobility: 2,
      survivability: 2,
    },
    tips: 'Drop markers in enemy half, stay alive',
    role: 'schemer',
  },
  take_the_highground: {
    name: 'Take the Highground',
    needs: {
      mobility: 2,
      survivability: 3,
      melee: 1,
    },
    tips: 'Get on terrain, stay there',
    role: 'tank',
  },
  scout_the_rooftops: {
    name: 'Scout the Rooftops',
    needs: {
      flight: 3,
      mobility: 2,
      scheme_markers: 1,
    },
    tips: 'Models with Flight or Incorporeal on terrain features',
    role: 'schemer',
  },
  make_it_look_like_an_accident: {
    name: 'Make it Look Like an Accident',
    needs: {
      push_pull: 3,
      damage: 1,
      melee: 1,
    },
    tips: 'Kill enemies with hazardous terrain or falling',
    role: 'control',
  },
  runic_binding: {
    name: 'Runic Binding',
    needs: {
      scheme_markers: 2,
      mobility: 2,
      engagement: 2,
    },
    tips: 'Markers near enemy models you are engaging',
    role: 'schemer',
  },
  ensnare: {
    name: 'Ensnare',
    needs: {
      scheme_markers: 2,
      engagement: 2,
      cheap_activations: 2,
    },
    tips: '2 markers within 2" of unique enemies',
    role: 'schemer',
  },
  search_the_area: {
    name: 'Search the Area',
    needs: {
      scheme_markers: 2,
      mobility: 2,
      spread: 1,
    },
    tips: 'Markers in different table quarters',
    role: 'schemer',
  },
  public_demonstration: {
    name: 'Public Demonstration',
    needs: {
      minion_count: 3,
      engagement: 2,
      survivability: 2,
    },
    tips: '2+ friendly minions engaging same enemy',
    role: 'control',
  },
  frame_job: {
    name: 'Frame Job',
    needs: {
      survivability: 2,
      mobility: 2,
      scheme_markers: 1,
    },
    tips: 'Friendly takes damage from enemy in their half',
    role: 'schemer',
  },
  reshape_the_land: {
    name: 'Reshape the Land',
    needs: {
      marker_creation: 3,
      scheme_markers: 2,
    },
    tips: 'Create non-scheme markers, drop schemes nearby',
    role: 'schemer',
  },
};

// =============================================================================
// CAPABILITY DETECTION
// Analyze what a model brings to the table
// =============================================================================

const getModelCapabilities = (card) => {
  const caps = {};
  const parsed = card.parsed || card.synergy_data || {};
  const roles = card.roles || [];
  const chars = (card.characteristics || []).join(' ').toLowerCase();
  
  // Build searchable text from abilities
  let allText = '';
  (card.abilities || []).forEach(ab => {
    allText += ' ' + ((ab.name || '') + ' ' + (ab.description || '')).toLowerCase();
  });
  (card.attack_actions || []).forEach(atk => {
    allText += ' ' + (atk.description || '').toLowerCase();
  });
  (card.tactical_actions || []).forEach(tac => {
    allText += ' ' + (tac.description || '').toLowerCase();
  });
  
  // SCHEME MARKERS
  const markersCreated = parsed.markers_created || [];
  if (markersCreated.includes('scheme')) caps.scheme_markers = (caps.scheme_markers || 0) + 3;
  if (roles.includes('schemer')) caps.scheme_markers = (caps.scheme_markers || 0) + 2;
  if (allText.includes("don't mind me") || allText.includes('dont mind me')) {
    caps.scheme_markers = (caps.scheme_markers || 0) + 2;
    caps.interact = (caps.interact || 0) + 2;
  }
  if (allText.includes('interact') && (allText.includes('bonus') || allText.includes('free'))) {
    caps.interact = (caps.interact || 0) + 2;
  }
  
  // MOBILITY
  if (chars.includes('incorporeal')) {
    caps.mobility = (caps.mobility || 0) + 3;
    caps.flight = (caps.flight || 0) + 3;
  }
  if (chars.includes('flight')) {
    caps.mobility = (caps.mobility || 0) + 2;
    caps.flight = (caps.flight || 0) + 3;
  }
  if (allText.includes('leap') || allText.includes('unimpeded')) {
    caps.mobility = (caps.mobility || 0) + 1;
  }
  if (allText.includes('place') && !allText.includes('marker')) {
    caps.mobility = (caps.mobility || 0) + 2;
  }
  const mv = card.mv || card.speed || 0;
  if (mv >= 6) caps.mobility = (caps.mobility || 0) + 1;
  if (mv >= 7) caps.mobility = (caps.mobility || 0) + 1;
  
  // SURVIVABILITY
  if (allText.includes('hard to kill')) caps.survivability = (caps.survivability || 0) + 2;
  if (allText.includes('hard to wound')) caps.survivability = (caps.survivability || 0) + 2;
  if (allText.includes('armor')) caps.survivability = (caps.survivability || 0) + 1;
  if (allText.includes('regeneration')) caps.survivability = (caps.survivability || 0) + 1;
  if (allText.includes('demise')) caps.survivability = (caps.survivability || 0) + 1;
  const df = card.df || card.defense || 0;
  if (df >= 6) caps.survivability = (caps.survivability || 0) + 1;
  const wounds = card.health || card.wounds || 0;
  if (wounds >= 8) caps.survivability = (caps.survivability || 0) + 1;
  if (wounds >= 10) caps.survivability = (caps.survivability || 0) + 1;
  
  // DAMAGE
  if (roles.includes('aggro')) caps.damage = (caps.damage || 0) + 2;
  if (roles.includes('beater')) caps.damage = (caps.damage || 0) + 2;
  (card.attack_actions || []).forEach(atk => {
    const dmg = atk.damage;
    if (dmg && typeof dmg === 'object' && dmg.severe >= 5) {
      caps.damage = (caps.damage || 0) + 1;
      caps.alpha_strike = (caps.alpha_strike || 0) + 1;
    }
  });
  if (allText.includes('execute') || allText.includes('one-shot')) {
    caps.alpha_strike = (caps.alpha_strike || 0) + 2;
  }
  
  // MELEE / ENGAGEMENT
  const meleeAttacks = (card.attack_actions || []).filter(atk => {
    const range = atk.range;
    return range && (range <= 2 || range === '1' || range === '2' || range === 'y1' || range === 'y2');
  }).length;
  if (meleeAttacks > 0) {
    caps.melee = (caps.melee || 0) + 1;
    caps.engagement = (caps.engagement || 0) + 1;
  }
  if (meleeAttacks >= 2) {
    caps.melee = (caps.melee || 0) + 1;
    caps.engagement = (caps.engagement || 0) + 1;
  }
  if (allText.includes('cannot disengage') || allText.includes('engagement range')) {
    caps.engagement = (caps.engagement || 0) + 2;
  }
  
  // PUSH/PULL/CONTROL
  if (roles.includes('control')) caps.push_pull = (caps.push_pull || 0) + 1;
  if (allText.includes('lure') || allText.includes('obey')) {
    caps.push_pull = (caps.push_pull || 0) + 3;
  }
  if (allText.includes('push') || allText.includes('place this model') || allText.includes('place target')) {
    caps.push_pull = (caps.push_pull || 0) + 1;
  }
  
  // MARKER CREATION (non-scheme)
  const nonSchemeMarkers = markersCreated.filter(m => m !== 'scheme').length;
  if (nonSchemeMarkers > 0) caps.marker_creation = (caps.marker_creation || 0) + nonSchemeMarkers * 2;
  
  // ACTIVATION EFFICIENCY
  const station = (card.station || '').toLowerCase();
  const cost = card.cost || 0;
  if (station === 'minion' && cost <= 5) {
    caps.cheap_activations = (caps.cheap_activations || 0) + 2;
  }
  if (station === 'minion') {
    caps.minion_count = (caps.minion_count || 0) + 1;
  }
  
  // SPREAD (ability to cover ground)
  if (allText.includes('unbury') || allText.includes('from buried')) {
    caps.spread = (caps.spread || 0) + 2;
  }
  if ((caps.mobility || 0) >= 3) {
    caps.spread = (caps.spread || 0) + 1;
  }
  
  return caps;
};

// =============================================================================
// AGGREGATE CREW CAPABILITIES
// =============================================================================

const aggregateCrewCapabilities = (crew) => {
  const totals = {};
  
  crew.forEach(model => {
    const caps = model.capabilities || getModelCapabilities(model);
    Object.entries(caps).forEach(([cap, val]) => {
      totals[cap] = (totals[cap] || 0) + val;
    });
  });
  
  return totals;
};

// =============================================================================
// GAP ANALYSIS
// =============================================================================

const analyzeGaps = (crewCaps, poolRequirements) => {
  const gaps = [];
  const strengths = [];
  
  Object.entries(poolRequirements).forEach(([cap, needed]) => {
    const have = crewCaps[cap] || 0;
    const ratio = have / needed;
    
    if (ratio < 0.5) {
      gaps.push({ 
        capability: cap, 
        needed, 
        have, 
        severity: 'critical',
        shortfall: needed - have 
      });
    } else if (ratio < 1) {
      gaps.push({ 
        capability: cap, 
        needed, 
        have, 
        severity: 'warning',
        shortfall: needed - have 
      });
    } else if (ratio >= 1.5) {
      strengths.push({ capability: cap, have, needed });
    }
  });
  
  gaps.sort((a, b) => b.shortfall - a.shortfall);
  
  return { gaps, strengths };
};

// =============================================================================
// POOL REQUIREMENTS AGGREGATION
// =============================================================================

const getPoolRequirements = (strategyKey, schemeKeys) => {
  const requirements = {};
  
  // Normalize keys
  const normalizeKey = (key) => key?.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_');
  
  // Add strategy requirements
  const stratKey = normalizeKey(strategyKey);
  if (STRATEGY_REQUIREMENTS[stratKey]) {
    Object.entries(STRATEGY_REQUIREMENTS[stratKey].needs).forEach(([cap, val]) => {
      requirements[cap] = (requirements[cap] || 0) + val;
    });
  }
  
  // Add scheme requirements
  schemeKeys.forEach(scheme => {
    const schemeKey = normalizeKey(scheme);
    if (SCHEME_REQUIREMENTS[schemeKey]) {
      Object.entries(SCHEME_REQUIREMENTS[schemeKey].needs).forEach(([cap, val]) => {
        requirements[cap] = (requirements[cap] || 0) + val;
      });
    }
  });
  
  return requirements;
};

// =============================================================================
// CAPABILITY DISPLAY NAMES
// =============================================================================

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
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PoolAnalysis = ({
  faction,
  factionMeta,
  selectedStrategy,
  selectedSchemes = [],
  crew = [],
  onRecommendationClick,
  availableModels = [],
}) => {
  // Get faction-specific data
  const factionData = factionMeta?.[faction];
  
  // Aggregate pool requirements
  const poolRequirements = useMemo(() => {
    return getPoolRequirements(selectedStrategy, selectedSchemes);
  }, [selectedStrategy, selectedSchemes]);
  
  // Aggregate crew capabilities
  const crewCapabilities = useMemo(() => {
    return aggregateCrewCapabilities(crew);
  }, [crew]);
  
  // Analyze gaps
  const { gaps, strengths } = useMemo(() => {
    if (Object.keys(poolRequirements).length === 0) {
      return { gaps: [], strengths: [] };
    }
    return analyzeGaps(crewCapabilities, poolRequirements);
  }, [crewCapabilities, poolRequirements]);
  
  // Get faction win rates for selected objectives
  const strategyMeta = useMemo(() => {
    if (!factionData || !selectedStrategy) return null;
    const key = selectedStrategy.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_');
    return factionData.strategies_m4e?.[key];
  }, [factionData, selectedStrategy]);
  
  const schemeMetas = useMemo(() => {
    if (!factionData) return [];
    return selectedSchemes.map(scheme => {
      const key = scheme.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_');
      const data = factionData.schemes_chosen?.[key];
      if (!data) return null;
      const delta = data.win_rate - (factionData.overall?.win_rate || 0.5);
      return { 
        scheme, 
        key,
        ...data, 
        delta,
        rating: delta > 0.03 ? 'strong' : delta < -0.03 ? 'weak' : 'neutral'
      };
    }).filter(Boolean);
  }, [factionData, selectedSchemes]);
  
  // Find models that would help fill gaps
  const recommendations = useMemo(() => {
    if (gaps.length === 0 || availableModels.length === 0) return [];
    
    const crewIds = new Set(crew.map(c => c.id));
    const candidates = availableModels.filter(m => !crewIds.has(m.id) && m.cost > 0);
    
    // Score each candidate by how well they fill gaps
    const scored = candidates.map(model => {
      const caps = model.capabilities || getModelCapabilities(model);
      let score = 0;
      const helps = [];
      
      gaps.forEach(({ capability, shortfall }) => {
        const has = caps[capability] || 0;
        if (has > 0) {
          score += Math.min(has, shortfall) * (capability === gaps[0]?.capability ? 2 : 1);
          helps.push(capability);
        }
      });
      
      return { model, score, helps };
    });
    
    return scored
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [gaps, availableModels, crew]);
  
  // No pool selected
  if (!selectedStrategy && selectedSchemes.length === 0) {
    return (
      <div className="pool-analysis pool-analysis-empty">
        <p>Select a strategy and schemes to see pool analysis</p>
      </div>
    );
  }
  
  return (
    <div className="pool-analysis">
      {/* Faction Win Rate Summary */}
      {factionData && (
        <div className="pool-faction-summary">
          <div className="faction-header">
            <span className="faction-name">{faction}</span>
            <span className="faction-overall">
              {Math.round(factionData.overall?.win_rate * 100)}% overall
              <span className="faction-games">({factionData.overall?.games?.toLocaleString()} games)</span>
            </span>
          </div>
          
          {/* Strategy Rating */}
          {strategyMeta && (
            <div className={`pool-objective-rating ${strategyMeta.win_rate >= factionData.overall?.win_rate ? 'positive' : 'negative'}`}>
              <span className="objective-name">{STRATEGY_REQUIREMENTS[selectedStrategy.toLowerCase().replace(/\s+/g, '_')]?.name || selectedStrategy}</span>
              <span className="objective-winrate">{Math.round(strategyMeta.win_rate * 100)}%</span>
              <span className="objective-delta">
                {strategyMeta.win_rate >= factionData.overall?.win_rate ? '+' : ''}
                {Math.round((strategyMeta.win_rate - factionData.overall?.win_rate) * 100)}%
              </span>
            </div>
          )}
          
          {/* Scheme Ratings */}
          {schemeMetas.map(meta => (
            <div 
              key={meta.key} 
              className={`pool-objective-rating ${meta.rating}`}
            >
              <span className="objective-name">{SCHEME_REQUIREMENTS[meta.key]?.name || meta.scheme}</span>
              <span className="objective-winrate">{Math.round(meta.win_rate * 100)}%</span>
              <span className="objective-delta">
                {meta.delta >= 0 ? '+' : ''}{Math.round(meta.delta * 100)}%
              </span>
              {meta.rating === 'weak' && <span className="objective-warning">⚠️</span>}
            </div>
          ))}
        </div>
      )}
      
      {/* Crew Capability Analysis */}
      {crew.length > 0 && Object.keys(poolRequirements).length > 0 && (
        <div className="pool-capability-analysis">
          <h4>Crew vs Pool</h4>
          
          {/* Gap Warnings */}
          {gaps.length > 0 && (
            <div className="pool-gaps">
              {gaps.map(({ capability, needed, have, severity }) => (
                <div key={capability} className={`pool-gap ${severity}`}>
                  <span className="gap-icon">{CAPABILITY_LABELS[capability]?.icon || '❓'}</span>
                  <span className="gap-label">{CAPABILITY_LABELS[capability]?.label || capability}</span>
                  <span className="gap-values">{have}/{needed}</span>
                  <div className="gap-bar">
                    <div 
                      className="gap-bar-fill" 
                      style={{ width: `${Math.min(100, (have / needed) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* All Good */}
          {gaps.length === 0 && (
            <div className="pool-status-good">
              ✓ Crew covers pool requirements
            </div>
          )}
          
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="pool-strengths">
              <span className="strengths-label">Strong in:</span>
              {strengths.slice(0, 3).map(({ capability }) => (
                <span key={capability} className="strength-badge">
                  {CAPABILITY_LABELS[capability]?.icon} {CAPABILITY_LABELS[capability]?.label || capability}
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
            {recommendations.map(({ model, score, helps }) => (
              <div 
                key={model.id} 
                className="recommendation-item"
                onClick={() => onRecommendationClick?.(model)}
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
      {(selectedStrategy || selectedSchemes.length > 0) && (
        <div className="pool-tips">
          {selectedStrategy && STRATEGY_REQUIREMENTS[selectedStrategy.toLowerCase().replace(/\s+/g, '_')]?.tips && (
            <div className="tip-item">
              <strong>Strategy:</strong> {STRATEGY_REQUIREMENTS[selectedStrategy.toLowerCase().replace(/\s+/g, '_')].tips}
            </div>
          )}
          {selectedSchemes.slice(0, 2).map(scheme => {
            const key = scheme.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '_');
            const req = SCHEME_REQUIREMENTS[key];
            return req?.tips ? (
              <div key={key} className="tip-item">
                <strong>{req.name}:</strong> {req.tips}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

export default PoolAnalysis;

// Also export utilities for use elsewhere
export { 
  getModelCapabilities, 
  aggregateCrewCapabilities, 
  analyzeGaps, 
  getPoolRequirements,
  SCHEME_REQUIREMENTS,
  STRATEGY_REQUIREMENTS,
  CAPABILITY_LABELS 
};
