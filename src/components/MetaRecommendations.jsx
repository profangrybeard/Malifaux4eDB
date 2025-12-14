import React, { useMemo } from 'react';

/**
 * MetaRecommendations - Display competitive meta insights for crew building
 * 
 * Usage:
 *   <MetaRecommendations 
 *     faction="Neverborn"
 *     selectedStrategy="informants"
 *     selectedSchemes={["assassinate", "breakthrough"]}
 *     factionMeta={factionMetaData}
 *   />
 */

// Scheme key normalization (matches your objectives.json keys)
const normalizeSchemeKey = (scheme) => {
  return scheme
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
};

// Strategy display names
const STRATEGY_NAMES = {
  boundary_dispute: 'Boundary Dispute',
  collapsing_mines: 'Collapsing Mines',
  informants: 'Informants',
  plant_explosives: 'Plant Explosives',
  recover_evidence: 'Recover Evidence',
};

// Scheme display names
const SCHEME_NAMES = {
  assassinate: 'Assassinate',
  breakthrough: 'Breakthrough',
  detonate_charges: 'Detonate Charges',
  ensnare: 'Ensnare',
  frame_job: 'Frame Job',
  grave_robbing: 'Grave Robbing',
  harness_the_ley_line: 'Harness the Ley Line',
  leave_your_mark: 'Leave Your Mark',
  light_the_beacons: 'Light the Beacons',
  make_it_look_like_an_accident: 'Make it Look Like an Accident',
  public_demonstration: 'Public Demonstration',
  reshape_the_land: 'Reshape the Land',
  runic_binding: 'Runic Binding',
  scout_the_rooftops: 'Scout the Rooftops',
  search_the_area: 'Search the Area',
  take_the_highground: 'Take the Highground',
};

const getDisplayName = (key, type = 'scheme') => {
  const names = type === 'strategy' ? STRATEGY_NAMES : SCHEME_NAMES;
  return names[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// Rating badge component
const RatingBadge = ({ rating, size = 'sm' }) => {
  const colors = {
    strong: 'bg-green-500/20 text-green-400 border-green-500/30',
    neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    weak: 'bg-red-500/20 text-red-400 border-red-500/30',
    easy: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  
  return (
    <span className={`${colors[rating] || colors.neutral} ${sizeClasses} rounded border font-medium`}>
      {rating.toUpperCase()}
    </span>
  );
};

// Win rate display
const WinRate = ({ rate, showDelta = false, baseline = 0.5 }) => {
  const percent = Math.round(rate * 100);
  const delta = rate - baseline;
  const deltaPercent = Math.round(delta * 100);
  const color = rate >= 0.55 ? 'text-green-400' : rate >= 0.50 ? 'text-yellow-400' : 'text-red-400';
  
  return (
    <span className={color}>
      {percent}%
      {showDelta && delta !== 0 && (
        <span className="text-xs ml-1 opacity-75">
          ({delta > 0 ? '+' : ''}{deltaPercent}%)
        </span>
      )}
    </span>
  );
};

// Strategy recommendation panel
const StrategyInsight = ({ faction, strategy, factionData }) => {
  if (!factionData || !strategy) return null;
  
  const strategies = factionData.strategies_m4e || {};
  const strategyData = strategies[strategy];
  const factionAvg = factionData.overall?.win_rate || 0.5;
  
  if (!strategyData) return null;
  
  const delta = strategyData.win_rate - factionAvg;
  const rating = delta > 0.02 ? 'strong' : delta < -0.05 ? 'weak' : 'neutral';
  
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-white">
          {getDisplayName(strategy, 'strategy')}
        </h4>
        <RatingBadge rating={rating} />
      </div>
      <div className="text-sm text-gray-400">
        <span className="text-gray-500">{faction}:</span>{' '}
        <WinRate rate={strategyData.win_rate} showDelta baseline={factionAvg} />
        <span className="text-gray-600 ml-2">({strategyData.games} games)</span>
      </div>
      {rating === 'weak' && (
        <p className="text-xs text-red-400/80 mt-2">
          ⚠️ {faction} historically struggles with this strategy
        </p>
      )}
      {rating === 'strong' && (
        <p className="text-xs text-green-400/80 mt-2">
          ✓ Good strategy choice for {faction}
        </p>
      )}
    </div>
  );
};

// Scheme recommendation card
const SchemeCard = ({ scheme, factionData, isSelected, isRecommended, isWarning }) => {
  const factionAvg = factionData?.overall?.win_rate || 0.5;
  const schemeData = factionData?.schemes_chosen?.[scheme];
  
  let borderColor = 'border-gray-700';
  if (isSelected) borderColor = 'border-blue-500';
  else if (isRecommended) borderColor = 'border-green-500/50';
  else if (isWarning) borderColor = 'border-red-500/50';
  
  return (
    <div className={`bg-gray-800/30 rounded p-2 border ${borderColor} transition-colors`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-white truncate">
          {getDisplayName(scheme)}
        </span>
        {schemeData && (
          <WinRate rate={schemeData.win_rate} showDelta baseline={factionAvg} />
        )}
      </div>
      {isSelected && <span className="text-xs text-blue-400">Selected</span>}
    </div>
  );
};

// Main component
const MetaRecommendations = ({ 
  faction, 
  selectedStrategy, 
  selectedSchemes = [],
  factionMeta,
  onSchemeClick,
  compact = false 
}) => {
  const factionData = useMemo(() => {
    if (!factionMeta || !faction) return null;
    
    // Handle both direct FACTION_DATA format and the exported JSON format
    if (factionMeta.faction_scheme_affinity) {
      // It's the compact JSON export - we need the full data
      // This component expects the full FACTION_DATA structure
      return null;
    }
    
    return factionMeta[faction];
  }, [factionMeta, faction]);
  
  const { bestSchemes, worstSchemes, neutralSchemes } = useMemo(() => {
    if (!factionData) {
      return { bestSchemes: [], worstSchemes: [], neutralSchemes: [] };
    }
    
    const schemes = factionData.schemes_chosen || {};
    const factionAvg = factionData.overall?.win_rate || 0.5;
    
    const best = [];
    const worst = [];
    const neutral = [];
    
    Object.entries(schemes).forEach(([scheme, data]) => {
      if (data.games < 50) return; // Skip low sample size
      
      const delta = data.win_rate - factionAvg;
      const entry = { scheme, ...data, delta };
      
      if (delta > 0.03) best.push(entry);
      else if (delta < -0.03) worst.push(entry);
      else neutral.push(entry);
    });
    
    best.sort((a, b) => b.delta - a.delta);
    worst.sort((a, b) => a.delta - b.delta);
    
    return { 
      bestSchemes: best.slice(0, 5), 
      worstSchemes: worst.slice(0, 5),
      neutralSchemes: neutral
    };
  }, [factionData]);
  
  // Check if selected schemes are good/bad choices
  const schemeWarnings = useMemo(() => {
    const warnings = [];
    selectedSchemes.forEach(scheme => {
      const normalized = normalizeSchemeKey(scheme);
      if (worstSchemes.some(s => s.scheme === normalized)) {
        warnings.push({
          scheme: normalized,
          message: `${getDisplayName(normalized)} has below-average win rate for ${faction}`
        });
      }
    });
    return warnings;
  }, [selectedSchemes, worstSchemes, faction]);
  
  if (!faction) {
    return (
      <div className="text-gray-500 text-sm italic p-4">
        Select a faction to see competitive recommendations
      </div>
    );
  }
  
  if (!factionData) {
    return (
      <div className="text-gray-500 text-sm italic p-4">
        No meta data available for {faction}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Compact: Just show warnings and top picks */}
        {schemeWarnings.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
            <p className="text-red-400 text-xs">
              ⚠️ {schemeWarnings.map(w => w.message).join('. ')}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-500">Top picks:</span>
          {bestSchemes.slice(0, 3).map(s => (
            <span 
              key={s.scheme}
              className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded cursor-pointer hover:bg-green-500/30"
              onClick={() => onSchemeClick?.(s.scheme)}
            >
              {getDisplayName(s.scheme)}
            </span>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {faction} Meta Insights
        </h3>
        <div className="text-sm text-gray-400">
          <WinRate rate={factionData.overall.win_rate} /> overall
          <span className="text-gray-600 ml-1">
            ({factionData.overall.games.toLocaleString()} games)
          </span>
        </div>
      </div>
      
      {/* Strategy insight */}
      {selectedStrategy && (
        <StrategyInsight 
          faction={faction}
          strategy={selectedStrategy}
          factionData={factionData}
        />
      )}
      
      {/* Warnings for selected schemes */}
      {schemeWarnings.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <h4 className="text-red-400 font-medium text-sm mb-1">⚠️ Scheme Warnings</h4>
          <ul className="text-xs text-red-400/80 space-y-1">
            {schemeWarnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Best schemes */}
      <div>
        <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
          <span>✓ Recommended Schemes</span>
          <span className="text-xs text-gray-500 font-normal">above faction average</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bestSchemes.map(s => (
            <div 
              key={s.scheme}
              className="bg-green-500/10 border border-green-500/30 rounded p-2 cursor-pointer hover:bg-green-500/20 transition-colors"
              onClick={() => onSchemeClick?.(s.scheme)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{getDisplayName(s.scheme)}</span>
                <WinRate rate={s.win_rate} showDelta baseline={factionData.overall.win_rate} />
              </div>
              <div className="text-xs text-gray-500">{s.games} games</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Schemes to avoid */}
      <div>
        <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
          <span>✗ Schemes to Avoid</span>
          <span className="text-xs text-gray-500 font-normal">below faction average</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {worstSchemes.map(s => (
            <div 
              key={s.scheme}
              className="bg-red-500/10 border border-red-500/30 rounded p-2 opacity-75"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{getDisplayName(s.scheme)}</span>
                <WinRate rate={s.win_rate} showDelta baseline={factionData.overall.win_rate} />
              </div>
              <div className="text-xs text-gray-500">{s.games} games</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Data source */}
      <p className="text-xs text-gray-600 text-center pt-2 border-t border-gray-800">
        Data from Longshanks.org tournament results • {factionData.overall.games.toLocaleString()} games analyzed
      </p>
    </div>
  );
};

export default MetaRecommendations;

// Also export sub-components for flexibility
export { RatingBadge, WinRate, StrategyInsight, SchemeCard };
