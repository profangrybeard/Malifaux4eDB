import React from 'react';
import { useFactionMeta } from './useFactionMeta';

/**
 * SchemeMetaBadge - Shows a simple badge indicating if a scheme is good/bad for a faction
 * 
 * Usage:
 *   <SchemeMetaBadge faction="Neverborn" scheme="assassinate" />
 *   // Renders: "−1%" in yellow (neutral)
 *   
 *   <SchemeMetaBadge faction="Neverborn" scheme="detonate_charges" />
 *   // Renders: "+5%" in green (strong)
 *   
 *   <SchemeMetaBadge faction="Neverborn" scheme="ensnare" showLabel />
 *   // Renders: "WEAK −6%" in red
 */

const SchemeMetaBadge = ({ 
  faction, 
  scheme,
  showLabel = false,
  showWinRate = false,
  size = 'sm',
  className = ''
}) => {
  const { getSchemeRating } = useFactionMeta();
  
  const rating = getSchemeRating(faction, scheme);
  
  if (!rating) return null;
  
  const colors = {
    strong: 'bg-green-500/20 text-green-400 border-green-500/40',
    neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
    weak: 'bg-red-500/20 text-red-400 border-red-500/40',
  };
  
  const sizeClasses = {
    xs: 'text-[10px] px-1 py-0.5',
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };
  
  const deltaPercent = Math.round(rating.delta * 100);
  const deltaStr = deltaPercent >= 0 ? `+${deltaPercent}%` : `${deltaPercent}%`;
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded border font-medium
        ${colors[rating.rating]}
        ${sizeClasses[size]}
        ${className}
      `}
      title={`${faction}: ${Math.round(rating.winRate * 100)}% win rate (${rating.games} games)`}
    >
      {showLabel && (
        <span className="uppercase">{rating.rating}</span>
      )}
      {showWinRate ? (
        <span>{Math.round(rating.winRate * 100)}%</span>
      ) : (
        <span>{deltaStr}</span>
      )}
    </span>
  );
};

/**
 * StrategyMetaBadge - Shows a simple badge for strategy faction affinity
 */
const StrategyMetaBadge = ({ 
  faction, 
  strategy,
  showLabel = false,
  size = 'sm',
  className = ''
}) => {
  const { getStrategyRating } = useFactionMeta();
  
  const rating = getStrategyRating(faction, strategy);
  
  if (!rating) return null;
  
  const colors = {
    strong: 'bg-green-500/20 text-green-400 border-green-500/40',
    neutral: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    weak: 'bg-red-500/20 text-red-400 border-red-500/40',
  };
  
  const icons = {
    strong: '✓',
    neutral: '~',
    weak: '✗',
  };
  
  const sizeClasses = {
    xs: 'text-[10px] px-1 py-0.5',
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded border font-medium
        ${colors[rating.rating]}
        ${sizeClasses[size]}
        ${className}
      `}
      title={`${faction}: ${Math.round(rating.winRate * 100)}% win rate on this strategy (${rating.games} games)`}
    >
      <span>{icons[rating.rating]}</span>
      {showLabel && (
        <span className="uppercase">{rating.rating}</span>
      )}
    </span>
  );
};

/**
 * FactionWinRateBadge - Shows faction's overall competitive performance
 */
const FactionWinRateBadge = ({ 
  faction,
  size = 'sm',
  className = ''
}) => {
  const { factionMeta } = useFactionMeta();
  
  const factionData = factionMeta[faction];
  if (!factionData) return null;
  
  const winRate = factionData.overall.win_rate;
  const tier = winRate >= 0.52 ? 'S' : winRate >= 0.50 ? 'A' : winRate >= 0.48 ? 'B' : 'C';
  
  const tierColors = {
    S: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    A: 'bg-green-500/20 text-green-400 border-green-500/40',
    B: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    C: 'bg-red-500/20 text-red-400 border-red-500/40',
  };
  
  const sizeClasses = {
    xs: 'text-[10px] px-1 py-0.5',
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded border font-medium
        ${tierColors[tier]}
        ${sizeClasses[size]}
        ${className}
      `}
      title={`${faction}: ${Math.round(winRate * 100)}% overall win rate (${factionData.overall.games} games)`}
    >
      <span>{Math.round(winRate * 100)}%</span>
    </span>
  );
};

/**
 * QuickRecommendations - Inline list of top scheme picks
 */
const QuickRecommendations = ({ 
  faction,
  limit = 3,
  onSchemeClick,
  className = ''
}) => {
  const { getBestSchemes } = useFactionMeta();
  
  const bestSchemes = getBestSchemes(faction, limit);
  
  if (bestSchemes.length === 0) return null;
  
  const formatName = (scheme) => 
    scheme.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <span className="text-xs text-gray-500">Try:</span>
      {bestSchemes.map(({ scheme, delta }) => (
        <button
          key={scheme}
          onClick={() => onSchemeClick?.(scheme)}
          className="text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded 
                     hover:bg-green-500/20 transition-colors cursor-pointer"
        >
          {formatName(scheme)}
          <span className="text-green-500/70 ml-1">+{Math.round(delta * 100)}%</span>
        </button>
      ))}
    </div>
  );
};

export { 
  SchemeMetaBadge, 
  StrategyMetaBadge, 
  FactionWinRateBadge,
  QuickRecommendations 
};

export default SchemeMetaBadge;
