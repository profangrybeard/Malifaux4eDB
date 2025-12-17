#!/usr/bin/env python3
"""
Malifaux 4E Role Classifier v2

Uses official Malifaux community role terminology:
- Summoner: Generate models, activation advantage
- Control: Dictate enemy movement/actions, negative conditions  
- Aggro: High damage, eliminate key models
- Support: Buff allies, heal, grant actions
- Schemer: Score VPs, markers, mobility

Usage:
    python role_classifier.py cards_FINAL.json                    # Analyze and show stats
    python role_classifier.py cards_FINAL.json -o cards_roles.json # Save to file
    python role_classifier.py cards_FINAL.json --debug "Lady Justice"  # Debug one card
"""

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple


# =============================================================================
# MALIFAUX ROLE DEFINITIONS
# Based on community-accepted terminology and playstyles
# =============================================================================

ROLE_PATTERNS = {
    'summoner': {
        'description': 'Generate additional models for activation advantage and board presence',
        'examples': ['Nicodem', 'The Dreamer', 'Dashel'],
        'patterns': [
            (r'\bsummon\s+a\b', 5.0),              # "Summon a [model]"
            (r'\bsummon\s+[A-Z]', 4.0),            # Summon [Model Name]
            (r'\bcreate\b.*\bmodel\b', 3.0),
            (r'\bmanifest\b', 3.0),
            (r'\binto\s+play\b', 2.5),
            (r'\bcorpse\s+marker\b.*\b(summon|create)\b', 2.0),  # Corpse-based summoning
            (r'\bscrap\s+marker\b.*\b(summon|create)\b', 2.0),
        ],
        'threshold': 3.5,
    },
    
    'control': {
        'description': 'Dictate where enemies can go and what they can do',
        'examples': ['Pandora', 'Jack Daw', 'Zoraida'],
        'patterns': [
            (r'\bobey\b', 4.0),                    # Force enemy actions
            (r'\blure\b', 4.0),                    # Pull enemies
            (r'\bstunned\b', 3.0),                 # Major control condition
            (r'\bparalyzed\b', 3.0),
            (r'\binsignificant\b', 2.5),
            (r'\bbury\b(?!.*this\s+model)', 2.5), # Bury enemies
            (r'\bpush\b.*\benemy\b', 2.0),
            (r'\benemy\b.*\bpush\b', 2.0),
            (r'\bplace\b.*\benemy\b', 2.0),
            (r'\bslow\b', 2.0),
            (r'\bstagger\b', 1.5),
            (r'\bdistracted\b', 1.5),
            (r'\bterrain\b.*\bcreate\b', 1.5),    # Terrain generation
            (r'\bcreate\b.*\bterrain\b', 1.5),
            (r'\bpillar\b', 1.5),                  # Ice pillars etc
            (r'\bengaged\b.*\bmay\s+not\b', 1.5),
        ],
        'threshold': 4.0,
    },
    
    'aggro': {
        'description': 'High damage output, eliminate key enemy models',
        'examples': ['Lady Justice', 'The Viktorias', 'Misaki'],
        'patterns': [
            (r'\birreducible\b', 3.0),             # Ignores armor
            (r'\b(execute|decapitate)\b', 3.0),   # Kill triggers
            (r'\bcritical\s+strike\b', 2.5),      # Damage trigger
            (r'\bsevere\s+damage\b', 2.5),
            (r'\bflurry\b', 2.5),                  # Multiple attacks
            (r'\brapid\s+fire\b', 2.5),
            (r'\bmin\s*damage\b', 2.0),
            (r'\b\+\d\s*damage\b', 2.0),
            (r'\badditional\s+damage\b', 2.0),
            (r'\binjured\b.*\bdamage\b', 1.5),
            (r'\bafter\s+(damaging|killing)\b', 1.5),
            (r'\blethal\b', 1.5),
        ],
        'stat_bonus': {
            'min_attack_damage': (3, 3.0),        # 3+ damage = aggro indicator
            'high_ml': (6, 2.0),                  # Ml 6+ mentioned in description
        },
        'threshold': 4.5,
    },
    
    'support': {
        'description': 'Enhance crew capabilities, buff allies, heal',
        'examples': ['Colette Du Bois', 'Hoffman', 'McCabe'],
        'patterns': [
            (r'\bfriendly\b.*\bgain\b.*\bfocus\b', 3.0),    # Grant Focus
            (r'\bfriendly\b.*\bgain\b.*\bshielded\b', 3.0), # Grant Shielded
            (r'\bfriendly\s+(model|models)\b.*\bheals?\b', 3.0),
            (r'\b(target|friendly)\b.*\bheals?\s+[234]\b', 2.5),
            (r'\bfree\s+action\b.*\bfriendly\b', 2.5),      # Grant free actions
            (r'\bfriendly\b.*\bfree\s+action\b', 2.5),
            (r'\bbonus\s+action\b.*\bfriendly\b', 2.5),
            (r'\baura\b.*\bfriendly\b.*\b\+', 2.0),         # Stat auras
            (r'\bremove\b.*\bcondition\b.*\bfriendly\b', 2.0),
            (r'\bfriendly\b.*\bremove\b.*\bcondition\b', 2.0),
            (r'\bfriendly\b.*\b\+\d\b', 1.5),
            (r'\bprotect\b', 1.5),
        ],
        'threshold': 4.0,
    },
    
    'schemer': {
        'description': 'Maximize VP scoring from Schemes and Strategies',
        'examples': ['Mah Tucket', 'Nellie Cochrane'],
        'patterns': [
            (r'\bscheme\s+marker\b.*\b(drop|place|create)\b', 3.0),
            (r'\b(drop|place|create)\b.*\bscheme\s+marker\b', 3.0),
            (r'\binteract\b.*\b(bonus|free)\b', 3.0),      # Free interact
            (r'\bwithout\b.*\binteract\b', 2.5),           # Markers without interact
            (r'\b(leap|flight)\b', 2.0),                   # High mobility
            (r'\bunimpeded\b', 2.0),
            (r'\bswift\b', 2.0),
            (r'\bplace\b.*\bwithin\s+[56789]', 2.0),       # Long place
            (r'\bscheme\s+marker\b', 1.5),
            (r'\bstrategy\s+marker\b', 1.5),
            (r'\bendeavor\b', 1.5),
            (r'\bincorporeal\b', 1.5),
        ],
        'stat_bonus': {
            'min_speed': (7, 2.0),                         # Fast models
        },
        'threshold': 4.0,
    },
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def extract_all_text(card: dict) -> str:
    """Extract all searchable text from a card."""
    texts = []
    
    for ab in card.get('abilities', []):
        texts.append(ab.get('name') or '')
        texts.append(ab.get('description') or '')
    
    for atk in card.get('attack_actions', []):
        texts.append(atk.get('name') or '')
        texts.append(atk.get('description') or '')
        for trig in atk.get('triggers', []):
            texts.append(trig.get('name') or '')
            texts.append(trig.get('effect') or '')
    
    for tac in card.get('tactical_actions', []):
        texts.append(tac.get('name') or '')
        texts.append(tac.get('description') or '')
        for trig in tac.get('triggers', []):
            texts.append(trig.get('name') or '')
            texts.append(trig.get('effect') or '')
    
    texts.extend(card.get('characteristics', []))
    
    return ' '.join(t for t in texts if t).lower()


def get_max_attack_damage(card: dict) -> int:
    """Get the highest damage value from attack actions."""
    max_dmg = 0
    for atk in card.get('attack_actions', []):
        dmg = atk.get('damage')
        if isinstance(dmg, int):
            max_dmg = max(max_dmg, dmg)
        elif isinstance(dmg, str):
            try:
                parts = dmg.replace('+', '').split('/')
                max_dmg = max(max_dmg, max(int(p) for p in parts if p.isdigit()))
            except:
                pass
    return max_dmg


def get_attack_stat(card: dict) -> int:
    """Get the highest attack stat (Ml/Sh/Ca)."""
    max_stat = 0
    for atk in card.get('attack_actions', []):
        stat = atk.get('stat')
        if isinstance(stat, int):
            max_stat = max(max_stat, stat)
        elif isinstance(stat, str):
            try:
                max_stat = max(max_stat, int(stat))
            except:
                pass
    return max_stat


# =============================================================================
# ROLE SCORING
# =============================================================================

def score_card_for_role(card: dict, role: str, text: str = None) -> Tuple[float, List[str]]:
    """Score a card for a specific role."""
    if text is None:
        text = extract_all_text(card)
    
    role_def = ROLE_PATTERNS[role]
    score = 0.0
    matches = []
    
    # Pattern matching
    for pattern, weight in role_def['patterns']:
        if re.search(pattern, text, re.IGNORECASE):
            score += weight
            matches.append(f"{pattern[:25]}... (+{weight})")
    
    # Stat bonuses
    if 'stat_bonus' in role_def:
        for stat, (threshold, bonus) in role_def['stat_bonus'].items():
            if stat == 'min_attack_damage':
                if get_max_attack_damage(card) >= threshold:
                    score += bonus
                    matches.append(f"dmg>={threshold} (+{bonus})")
            elif stat == 'high_ml':
                if get_attack_stat(card) >= threshold:
                    score += bonus
                    matches.append(f"Ml>={threshold} (+{bonus})")
            elif stat == 'min_speed':
                if (card.get('speed') or 0) >= threshold:
                    score += bonus
                    matches.append(f"Spd>={threshold} (+{bonus})")
    
    return score, matches


def classify_card(card: dict) -> Dict:
    """Classify a card into Malifaux roles."""
    text = extract_all_text(card)
    
    scores = {}
    matches = {}
    assigned_roles = []
    
    for role, role_def in ROLE_PATTERNS.items():
        score, pattern_matches = score_card_for_role(card, role, text)
        scores[role] = round(score, 2)
        matches[role] = pattern_matches
        
        if score >= role_def['threshold']:
            assigned_roles.append(role)
    
    # Sort by score
    assigned_roles.sort(key=lambda r: scores[r], reverse=True)
    
    return {
        'roles': assigned_roles,
        'role_scores': scores,
        'role_matches': matches,
    }


# =============================================================================
# CORRECTIONS SYSTEM
# =============================================================================

def load_corrections(path: Path) -> dict:
    """Load manual role corrections."""
    if path.exists():
        with open(path, 'r') as f:
            return json.load(f)
    return {}


def apply_corrections(card: dict, corrections: dict) -> List[str]:
    """Apply manual corrections to a card's roles."""
    card_id = card.get('id', '')
    card_name = card.get('name', '')
    
    correction = corrections.get(card_id) or corrections.get(card_name)
    
    if correction:
        if isinstance(correction, list):
            return correction
        elif isinstance(correction, dict):
            return correction.get('roles', [])
    
    return None


# =============================================================================
# MAIN CLASSIFIER
# =============================================================================

def classify_all_cards(cards: List[dict], corrections: dict = None) -> Tuple[List[dict], dict]:
    """Classify all cards and return updated cards + stats."""
    stats = {
        'total': len(cards),
        'role_counts': defaultdict(int),
        'no_roles': 0,
        'multi_role': 0,
        'corrections_applied': 0,
    }
    
    for card in cards:
        result = classify_card(card)
        
        # Apply corrections if available
        if corrections:
            corrected_roles = apply_corrections(card, corrections)
            if corrected_roles is not None:
                result['roles'] = corrected_roles
                result['_corrected'] = True
                stats['corrections_applied'] += 1
        
        # Add to card
        card['roles'] = result['roles']
        card['_role_scores'] = result['role_scores']
        
        # Update stats
        if not result['roles']:
            stats['no_roles'] += 1
        elif len(result['roles']) > 1:
            stats['multi_role'] += 1
        
        for role in result['roles']:
            stats['role_counts'][role] += 1
    
    return cards, dict(stats)


def debug_card(cards: List[dict], name: str):
    """Debug role classification for a specific card."""
    for card in cards:
        if card.get('name', '').lower() == name.lower():
            print(f"\n{'='*60}")
            print(f"DEBUG: {card['name']} ({card['station']})")
            print(f"{'='*60}")
            
            print(f"\nStats: Df={card.get('defense')} Spd={card.get('speed')} Hp={card.get('health')}")
            print(f"Max attack damage: {get_max_attack_damage(card)}")
            print(f"Max attack stat: {get_attack_stat(card)}")
            
            text = extract_all_text(card)
            print(f"\nExtracted text ({len(text)} chars):")
            print(f"  {text[:200]}...")
            
            print(f"\nRole Scores (Malifaux terminology):")
            for role in ROLE_PATTERNS.keys():
                score, matches = score_card_for_role(card, role, text)
                threshold = ROLE_PATTERNS[role]['threshold']
                status = "ASSIGNED" if score >= threshold else ""
                print(f"\n  {role.upper()}: {score:.1f} (threshold: {threshold}) {status}")
                print(f"    Description: {ROLE_PATTERNS[role]['description'][:50]}...")
                for m in matches[:5]:
                    print(f"    - {m}")
            
            return
    
    print(f"Card not found: {name}")


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Classify Malifaux cards using community role terminology",
    )
    
    parser.add_argument('input', type=Path, help='Input cards JSON file')
    parser.add_argument('-o', '--output', type=Path, help='Output JSON file')
    parser.add_argument('--corrections', type=Path, default=Path('corrections_roles.json'),
                        help='Manual corrections file')
    parser.add_argument('--dry-run', action='store_true', help='Show stats only')
    parser.add_argument('--debug', type=str, metavar='NAME', help='Debug a specific card')
    
    args = parser.parse_args()
    
    # Load cards
    print(f"Loading: {args.input}")
    with open(args.input, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    print(f"Loaded {len(cards)} cards")
    
    # Debug mode
    if args.debug:
        debug_card(cards, args.debug)
        return
    
    # Load corrections
    corrections = {}
    if args.corrections.exists():
        corrections = load_corrections(args.corrections)
        print(f"Loaded {len(corrections)} corrections")
    
    # Classify
    print(f"\nClassifying cards using Malifaux roles...")
    cards, stats = classify_all_cards(cards, corrections)
    
    # Print stats
    print(f"\n{'='*60}")
    print("MALIFAUX ROLE CLASSIFICATION")
    print(f"{'='*60}")
    
    print(f"\nRoles: Summoner | Control | Aggro | Support | Schemer")
    
    print(f"\nTotal cards: {stats['total']}")
    print(f"Cards with roles: {stats['total'] - stats['no_roles']}")
    print(f"Cards without roles: {stats['no_roles']}")
    print(f"Cards with multiple roles: {stats['multi_role']}")
    if stats['corrections_applied']:
        print(f"Manual corrections applied: {stats['corrections_applied']}")
    
    print(f"\nRole distribution:")
    for role, count in sorted(stats['role_counts'].items(), key=lambda x: -x[1]):
        pct = count / stats['total'] * 100
        desc = ROLE_PATTERNS[role]['description'][:40]
        bar = '#' * int(pct / 2)
        print(f"  {role.upper():12} {count:4} ({pct:5.1f}%) {bar}")
        print(f"               {desc}...")
    
    # Sample cards per role
    print(f"\n{'='*60}")
    print("SAMPLE CARDS BY ROLE")
    print(f"{'='*60}")
    
    for role in ROLE_PATTERNS.keys():
        role_cards = [c for c in cards if role in c.get('roles', [])]
        if role_cards:
            role_cards.sort(key=lambda c: c.get('_role_scores', {}).get(role, 0), reverse=True)
            samples = role_cards[:3]
            examples = ROLE_PATTERNS[role].get('examples', [])
            print(f"\n{role.upper()} (canonical: {', '.join(examples)}):")
            for c in samples:
                score = c.get('_role_scores', {}).get(role, 0)
                print(f"  - {c['name']} ({c['station']}) [score: {score:.1f}]")
    
    # Cards with no roles
    no_role_cards = [c for c in cards if not c.get('roles')]
    if no_role_cards:
        print(f"\n{'='*60}")
        print(f"CARDS WITH NO ROLES ({len(no_role_cards)})")
        print(f"{'='*60}")
        
        # By station
        from collections import Counter
        stations = Counter(c.get('station') for c in no_role_cards)
        print("By station:")
        for s, count in stations.most_common():
            print(f"  {s}: {count}")
        
        # Check for unclassified leaders
        leaders = [c for c in no_role_cards if c.get('station') in ['Master', 'Henchman']]
        if leaders:
            print(f"\n[!] UNCLASSIFIED LEADERS ({len(leaders)}):")
            for c in leaders[:10]:
                print(f"  - {c['name']} ({c['station']})")
    
    # Save output
    if args.output and not args.dry_run:
        # Remove debug fields before saving
        for card in cards:
            card.pop('_role_scores', None)
        
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(cards, f, indent=2, ensure_ascii=False)
        print(f"\nSaved to: {args.output}")
    elif not args.dry_run:
        print(f"\nUse -o FILE to save output")


if __name__ == '__main__':
    main()
