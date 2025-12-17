#!/usr/bin/env python3
"""
Malifaux 4E Synergy Detection Engine

Given a Master, recommends models that synergize well based on:
1. Keyword hiring (same keyword = no tax)
2. Characteristic buffs (buffs Constructs → pairs with Constructs)
3. Condition chains (applies Burning → pairs with Burning beneficiaries)
4. Marker economy (creates Corpse → pairs with Corpse consumers)
5. Trigger suits (needs Tomes → pairs with Tome generators)
6. Role balance (crew needs Schemer → recommend Schemers)
"""

import json
import argparse
from collections import defaultdict
from typing import Dict, List, Optional, Tuple


# =============================================================================
# SYNERGY WEIGHTS - Tune these to adjust recommendations
# =============================================================================

WEIGHTS = {
    # Keyword synergy
    'same_keyword': 5,
    'versatile': 3,
    'out_of_keyword': 0,
    
    # Characteristic synergy
    'characteristic_buff': 3,
    
    # Condition synergy (base - multiplied by condition tier)
    'condition_chain_base': 2,
    
    # Marker synergy
    'marker_generate_consume': 4,
    'marker_scheme': 2,  # Scheme markers are universal
    'marker_corpse': 4,  # Corpse/Scrap are crew-specific
    'marker_scrap': 4,
    
    # Role balance
    'fills_needed_role': 2,
    'duplicate_role': -1,
    
    # Action economy (NEW)
    'grants_bonus_action': 5,
    'has_bonus_actions': 1,
    
    # Station-specific targeting (NEW)
    'station_match_bonus': 1,
}

# Condition power tiers (NEW)
# Higher multiplier = more powerful condition
CONDITION_TIERS = {
    # Tier 1: Game-changing control (x2.0)
    'slow': 2.0,
    'stunned': 2.0,
    'staggered': 1.75,
    'distracted': 1.75,
    
    # Tier 2: Strong effects (x1.5)
    'burning': 1.5,
    'poison': 1.5,
    'injured': 1.5,
    'adversary': 1.5,
    
    # Tier 3: Positive buffs (x1.25)
    'focused': 1.25,
    'shielded': 1.25,
    'fast': 1.25,
    'bolstered': 1.25,
    
    # Tier 4: Situational (x1.0)
    'glutted': 1.0,
    'blight': 1.0,
}

def get_condition_multiplier(condition: str) -> float:
    """Get power multiplier for a condition."""
    return CONDITION_TIERS.get(condition.lower(), 1.0)


# =============================================================================
# SYNERGY ENGINE
# =============================================================================

class SynergyEngine:
    def __init__(self, cards_path: str):
        with open(cards_path) as f:
            self.cards = json.load(f)
        
        # Build indexes
        self._build_indexes()
    
    def _build_indexes(self):
        """Build lookup indexes for fast synergy detection."""
        # Cards by name
        self.cards_by_name = {c['name']: c for c in self.cards}
        
        # Cards by keyword
        self.cards_by_keyword = defaultdict(list)
        for card in self.cards:
            for kw in card.get('keywords', []):
                self.cards_by_keyword[kw.lower()].append(card)
        
        # Cards by characteristic
        self.cards_by_characteristic = defaultdict(list)
        for card in self.cards:
            for char in card.get('characteristics', []):
                # Normalize characteristic name
                char_clean = char.lower().split('(')[0].strip()
                self.cards_by_characteristic[char_clean].append(card)
        
        # Cards that benefit from each condition
        self.condition_beneficiaries = defaultdict(list)
        for card in self.cards:
            for cond in card.get('parsed', {}).get('benefits_from_conditions', []):
                self.condition_beneficiaries[cond.lower()].append(card)
        
        # Cards that consume each marker type
        self.marker_consumers = defaultdict(list)
        for card in self.cards:
            for marker in card.get('parsed', {}).get('markers_consumed', []):
                self.marker_consumers[marker.lower()].append(card)
            # Also check marker_interactions for consume function
            for mi in card.get('parsed', {}).get('marker_interactions', []):
                if mi.get('function') == 'consume':
                    self.marker_consumers[mi.get('marker_type', '').lower()].append(card)
        
        # Masters
        self.masters = [c for c in self.cards if c.get('station') == 'Master']
    
    def get_master(self, name: str) -> Optional[Dict]:
        """Find a master by name (partial match)."""
        name_lower = name.lower()
        for master in self.masters:
            if name_lower in master['name'].lower():
                return master
        return None
    
    def get_hiring_pool(self, master: Dict) -> List[Dict]:
        """Get all models that can be hired by this master."""
        master_keywords = set(kw.lower() for kw in master.get('keywords', []))
        
        pool = []
        for card in self.cards:
            # Skip masters and totems (totems are auto-included)
            if card.get('station') in ['Master']:
                continue
            
            card_keywords = set(kw.lower() for kw in card.get('keywords', []))
            
            # Same keyword = can hire
            if master_keywords & card_keywords:
                pool.append(card)
            # Versatile = can hire with tax
            elif 'versatile' in card_keywords:
                pool.append(card)
            # Out of keyword = can hire with bigger tax
            else:
                pool.append(card)
        
        return pool
    
    def calculate_synergy(self, candidate: Dict, master: Dict, 
                          current_crew: List[Dict] = None) -> Tuple[int, List[str]]:
        """
        Calculate synergy score between a candidate and master/crew.
        
        Returns (score, list_of_reasons)
        """
        if current_crew is None:
            current_crew = [master]
        
        score = 0
        reasons = []
        
        # 1. KEYWORD SYNERGY
        master_keywords = set(kw.lower() for kw in master.get('keywords', []))
        candidate_keywords = set(kw.lower() for kw in candidate.get('keywords', []))
        
        if master_keywords & candidate_keywords:
            shared = master_keywords & candidate_keywords
            score += WEIGHTS['same_keyword']
            reasons.append(f"Keyword: {', '.join(shared).title()} (+{WEIGHTS['same_keyword']})")
        elif 'versatile' in candidate_keywords:
            score += WEIGHTS['versatile']
            reasons.append(f"Versatile (+{WEIGHTS['versatile']})")
        
        # 2. CHARACTERISTIC SYNERGY
        # Check if crew buffs any characteristic that candidate has
        crew_buffs = set()
        for crew_member in current_crew:
            for buff in crew_member.get('parsed', {}).get('buffs_characteristics', []):
                crew_buffs.add(buff.lower())
        
        candidate_chars = set()
        for char in candidate.get('characteristics', []):
            char_clean = char.lower().split('(')[0].strip()
            candidate_chars.add(char_clean)
        
        matching_chars = crew_buffs & candidate_chars
        if matching_chars:
            score += WEIGHTS['characteristic_buff'] * len(matching_chars)
            for char in matching_chars:
                reasons.append(f"Crew buffs {char.title()} (+{WEIGHTS['characteristic_buff']})")
        
        # Check if candidate buffs characteristics that crew has
        candidate_buffs = set(b.lower() for b in 
                             candidate.get('parsed', {}).get('buffs_characteristics', []))
        crew_chars = set()
        for crew_member in current_crew:
            for char in crew_member.get('characteristics', []):
                crew_chars.add(char.lower().split('(')[0].strip())
        
        char_synergy = candidate_buffs & crew_chars
        if char_synergy:
            score += WEIGHTS['characteristic_buff']
            reasons.append(f"Buffs crew's {', '.join(char_synergy).title()} (+{WEIGHTS['characteristic_buff']})")
        
        # 3. CONDITION CHAIN SYNERGY (with tiered multipliers)
        # Crew applies conditions → candidate benefits from those conditions
        crew_conditions = set()
        for crew_member in current_crew:
            for cond in crew_member.get('parsed', {}).get('conditions_applied', []):
                crew_conditions.add(cond.lower())
        
        candidate_benefits = set(c.lower() for c in 
                                 candidate.get('parsed', {}).get('benefits_from_conditions', []))
        
        condition_synergy = crew_conditions & candidate_benefits
        if condition_synergy:
            for cond in condition_synergy:
                base = WEIGHTS['condition_chain_base']
                multiplier = get_condition_multiplier(cond)
                points = int(base * multiplier)
                score += points
                tier_note = f"x{multiplier}" if multiplier != 1.0 else ""
                reasons.append(f"Benefits from crew's {cond.title()} (+{points}{tier_note})")
        
        # Candidate applies conditions → does crew benefit?
        candidate_conditions = set(c.lower() for c in 
                                   candidate.get('parsed', {}).get('conditions_applied', []))
        crew_benefits = set()
        for crew_member in current_crew:
            for cond in crew_member.get('parsed', {}).get('benefits_from_conditions', []):
                crew_benefits.add(cond.lower())
        
        reverse_cond_synergy = candidate_conditions & crew_benefits
        if reverse_cond_synergy:
            for cond in reverse_cond_synergy:
                base = WEIGHTS['condition_chain_base']
                multiplier = get_condition_multiplier(cond)
                points = int(base * multiplier)
                score += points
                tier_note = f"x{multiplier}" if multiplier != 1.0 else ""
                reasons.append(f"Applies {cond.title()} crew needs (+{points}{tier_note})")
        
        # 4. MARKER ECONOMY SYNERGY
        # Crew creates markers → candidate consumes them
        crew_markers = set()
        for crew_member in current_crew:
            for marker in crew_member.get('parsed', {}).get('markers_created', []):
                crew_markers.add(marker.lower())
        
        candidate_consumes = set(m.lower() for m in 
                                 candidate.get('parsed', {}).get('markers_consumed', []))
        
        marker_synergy = crew_markers & candidate_consumes
        if marker_synergy:
            for marker in marker_synergy:
                weight = WEIGHTS.get(f'marker_{marker}', WEIGHTS['marker_generate_consume'])
                score += weight
                reasons.append(f"Consumes crew's {marker.title()} markers (+{weight})")
        
        # Candidate creates markers → does crew consume?
        candidate_markers = set(m.lower() for m in 
                                candidate.get('parsed', {}).get('markers_created', []))
        crew_consumes = set()
        for crew_member in current_crew:
            for marker in crew_member.get('parsed', {}).get('markers_consumed', []):
                crew_consumes.add(marker.lower())
        
        reverse_marker_synergy = candidate_markers & crew_consumes
        if reverse_marker_synergy:
            for marker in reverse_marker_synergy:
                weight = WEIGHTS.get(f'marker_{marker}', WEIGHTS['marker_generate_consume'])
                score += weight
                reasons.append(f"Creates {marker.title()} markers crew needs (+{weight})")
        
        # 5. ROLE BALANCE
        crew_roles = defaultdict(int)
        for crew_member in current_crew:
            for role in crew_member.get('roles', []):
                crew_roles[role] += 1
        
        candidate_roles = candidate.get('roles', [])
        for role in candidate_roles:
            if crew_roles[role] == 0:
                score += WEIGHTS['fills_needed_role']
                reasons.append(f"Fills {role} role (+{WEIGHTS['fills_needed_role']})")
                break  # Only count once
        
        # 6. ACTION ECONOMY SYNERGY (NEW)
        # Check if crew grants bonus actions that candidate can use
        crew_grants_bonus = False
        for crew_member in current_crew:
            if crew_member.get('parsed', {}).get('grants_bonus_action'):
                crew_grants_bonus = True
                break
        
        # Check if candidate has bonus actions to benefit from AP manipulation
        if candidate.get('parsed', {}).get('has_bonus_actions'):
            if crew_grants_bonus:
                score += WEIGHTS['grants_bonus_action']
                reasons.append(f"Can use crew's bonus action grants (+{WEIGHTS['grants_bonus_action']})")
            else:
                score += WEIGHTS['has_bonus_actions']
                reasons.append(f"Has bonus actions (+{WEIGHTS['has_bonus_actions']})")
        
        # Check if candidate grants bonus actions (valuable for crew)
        if candidate.get('parsed', {}).get('grants_bonus_action'):
            score += WEIGHTS['grants_bonus_action']
            reasons.append(f"Grants bonus actions to crew (+{WEIGHTS['grants_bonus_action']})")
        
        # 7. STATION-SPECIFIC TARGETING SYNERGY (NEW)
        # Check if crew abilities target candidate's station specifically
        candidate_station = candidate.get('station', '').lower()
        if candidate_station:
            for crew_member in current_crew:
                # Check parsed actions for station targeting
                for action_list in [crew_member.get('_parsed_attacks', []), 
                                   crew_member.get('_parsed_tactical', [])]:
                    for action in action_list:
                        target = action.get('target', {})
                        target_station = (target.get('station') or '').lower()
                        alignment = (target.get('alignment') or '').lower()
                        
                        # If crew ability targets friendly + candidate's station
                        if target_station == candidate_station and alignment in ['friendly', 'allied']:
                            score += WEIGHTS['station_match_bonus']
                            reasons.append(f"Crew targets {candidate_station.title()}s (+{WEIGHTS['station_match_bonus']})")
                            break
                    else:
                        continue
                    break  # Only count once per crew member
        
        return score, reasons
    
    def recommend_for_master(self, master_name: str, top_n: int = 10,
                             current_crew: List[str] = None) -> List[Dict]:
        """
        Get top N recommended models for a master.
        
        Args:
            master_name: Name of master (partial match OK)
            top_n: Number of recommendations
            current_crew: List of model names already in crew
        
        Returns:
            List of {name, station, score, reasons, cost}
        """
        master = self.get_master(master_name)
        if not master:
            raise ValueError(f"Master not found: {master_name}")
        
        # Build current crew
        crew = [master]
        if current_crew:
            for name in current_crew:
                card = self.cards_by_name.get(name)
                if card:
                    crew.append(card)
        
        # Get hiring pool
        pool = self.get_hiring_pool(master)
        
        # Score each candidate
        recommendations = []
        for candidate in pool:
            # Skip if already in crew
            if candidate['name'] in [c['name'] for c in crew]:
                continue
            
            score, reasons = self.calculate_synergy(candidate, master, crew)
            
            recommendations.append({
                'name': candidate['name'],
                'station': candidate.get('station', ''),
                'cost': candidate.get('cost', 0),
                'keywords': candidate.get('keywords', []),
                'score': score,
                'reasons': reasons,
            })
        
        # Sort by score descending
        recommendations.sort(key=lambda x: (-x['score'], x['name']))
        
        return recommendations[:top_n]
    
    def explain_synergy(self, model1_name: str, model2_name: str) -> Dict:
        """Explain synergy between two specific models."""
        card1 = self.cards_by_name.get(model1_name)
        card2 = self.cards_by_name.get(model2_name)
        
        if not card1:
            raise ValueError(f"Model not found: {model1_name}")
        if not card2:
            raise ValueError(f"Model not found: {model2_name}")
        
        # Calculate both directions
        score1, reasons1 = self.calculate_synergy(card2, card1, [card1])
        score2, reasons2 = self.calculate_synergy(card1, card2, [card2])
        
        return {
            'model1': model1_name,
            'model2': model2_name,
            f'{model1_name}_adds_to_{model2_name}': {
                'score': score1,
                'reasons': reasons1,
            },
            f'{model2_name}_adds_to_{model1_name}': {
                'score': score2,
                'reasons': reasons2,
            },
            'combined_score': score1 + score2,
        }
    
    def get_crew_synergy_summary(self, crew_names: List[str]) -> Dict:
        """Analyze synergy within a complete crew."""
        crew = []
        for name in crew_names:
            card = self.cards_by_name.get(name)
            if card:
                crew.append(card)
        
        if not crew:
            return {'error': 'No valid models found'}
        
        # Aggregate crew capabilities
        summary = {
            'models': [c['name'] for c in crew],
            'conditions_applied': set(),
            'conditions_benefited': set(),
            'markers_created': set(),
            'markers_consumed': set(),
            'characteristics_buffed': set(),
            'roles': defaultdict(int),
            'suits_needed': defaultdict(int),
        }
        
        for card in crew:
            parsed = card.get('parsed', {})
            
            for cond in parsed.get('conditions_applied', []):
                summary['conditions_applied'].add(cond)
            for cond in parsed.get('benefits_from_conditions', []):
                summary['conditions_benefited'].add(cond)
            for marker in parsed.get('markers_created', []):
                summary['markers_created'].add(marker)
            for marker in parsed.get('markers_consumed', []):
                summary['markers_consumed'].add(marker)
            for buff in parsed.get('buffs_characteristics', []):
                summary['characteristics_buffed'].add(buff)
            for role in card.get('roles', []):
                summary['roles'][role] += 1
            for suit_info in parsed.get('trigger_suits_needed', []):
                suit = suit_info.get('suit', '') if isinstance(suit_info, dict) else suit_info
                if suit:
                    summary['suits_needed'][suit] += 1
        
        # Convert sets to lists for JSON
        summary['conditions_applied'] = list(summary['conditions_applied'])
        summary['conditions_benefited'] = list(summary['conditions_benefited'])
        summary['markers_created'] = list(summary['markers_created'])
        summary['markers_consumed'] = list(summary['markers_consumed'])
        summary['characteristics_buffed'] = list(summary['characteristics_buffed'])
        summary['roles'] = dict(summary['roles'])
        summary['suits_needed'] = dict(summary['suits_needed'])
        
        # Check synergies
        condition_synergy = set(summary['conditions_applied']) & set(summary['conditions_benefited'])
        marker_synergy = set(summary['markers_created']) & set(summary['markers_consumed'])
        
        summary['condition_chains'] = list(condition_synergy)
        summary['marker_economy'] = list(marker_synergy)
        
        return summary


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='Malifaux Synergy Engine')
    parser.add_argument('cards_file', help='Path to cards_parsed.json')
    parser.add_argument('--master', '-m', help='Master name for recommendations')
    parser.add_argument('--top', '-n', type=int, default=10, help='Number of recommendations')
    parser.add_argument('--crew', '-c', nargs='*', help='Current crew members')
    parser.add_argument('--explain', '-e', nargs=2, help='Explain synergy between two models')
    parser.add_argument('--analyze', '-a', nargs='*', help='Analyze crew synergy')
    
    args = parser.parse_args()
    
    engine = SynergyEngine(args.cards_file)
    
    if args.explain:
        result = engine.explain_synergy(args.explain[0], args.explain[1])
        print(json.dumps(result, indent=2))
    
    elif args.analyze:
        result = engine.get_crew_synergy_summary(args.analyze)
        print(json.dumps(result, indent=2))
    
    elif args.master:
        recommendations = engine.recommend_for_master(
            args.master, 
            top_n=args.top,
            current_crew=args.crew
        )
        
        print(f"\n{'='*60}")
        print(f"RECOMMENDATIONS FOR: {args.master}")
        print(f"{'='*60}")
        
        for i, rec in enumerate(recommendations, 1):
            print(f"\n#{i} {rec['name']} ({rec['station']}) - Score: {rec['score']}")
            print(f"   Cost: {rec['cost']} | Keywords: {', '.join(rec['keywords'][:3])}")
            for reason in rec['reasons']:
                print(f"   • {reason}")
    
    else:
        # List available masters
        print("Available Masters:")
        for m in sorted(engine.masters, key=lambda x: x['name']):
            print(f"  {m['name']}")


if __name__ == '__main__':
    main()
