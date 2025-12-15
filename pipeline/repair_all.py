#!/usr/bin/env python3
"""
Malifaux 4E Data Repair - UNIFIED SCRIPT

Replaces: repair_pipeline.py + fix_stations.py

Does ALL data repairs in a single pass with validation.
No subprocess chains, no silent failures.

Usage:
    python repair_all.py INPUT_FILE --output OUTPUT_FILE [--report REPORT_FILE]

Fixes Applied (in order):
    1. Cost extraction repair (OCR double-digit fix)
    2. Action name cleaning (remove suit-prefix artifacts)
    3. Station inference (Enforcer/Henchman/Minion from cost + characteristics)
    4. Hireable flag setting
    5. Validation - FAILS if Enforcer count is 0

NOTE: Condition extraction is handled by tag_extractor.py (runs after this)
"""

import json
import re
import argparse
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple, Set
from collections import defaultdict


# =============================================================================
# CONFIGURATION
# =============================================================================

VALID_STATIONS = {'Master', 'Henchman', 'Enforcer', 'Minion', 'Totem', 'Peon'}

# Creature type keywords - NOT stations
CREATURE_TYPES = {'Living', 'Undead', 'Construct', 'Beast', 'Spirit', 'Nightmare', 
                  'Tyrant', 'Elemental', 'Fae', 'Kin', 'Doll', 'Rider', 'Rare'}

# Known Masters (for null-cost identification)
KNOWN_MASTERS = {
    'Sandeep Desai', 'Rasputina', 'Toni Ironsides', 'Kaeris', 'Colette Du Bois',
    'Marcus', 'Mei Feng', 'Ramos', 'Hoffman', 'Somer Teeth Jones', 
    'Ophelia LaCroix', 'Mah Tucket', 'Zipp', 'Brewmaster', 'Ulix Turner', 'Wong', 
    'Zoraida', 'Perdita Ortega', 'Lady Justice', 'Sonnia Criid', 'Dashel Barker',
    'Lucius Mattheson', 'Nellie Cochrane', 'Basse', 'Charles Hoffman', 'Lilith', 
    'Pandora', 'Dreamer', 'Titania', 'Nekima', 'Euripides', 'Barbaros', 'Leveticus', 
    'Hamelin', 'Jack Daw', 'Parker Barrows', 'Tara', 'Von Schill', 'Viktorias', 
    'Misaki', 'Viktoria Chambers', 'Nicodem', 'Seamus', 'McMourning', 
    'Molly Squidpiddge', 'Reva', 'Kirai', 'Yan Lo', 'Asami', 'Douglas McMourning',
    'Shenlong', 'Lynch', 'McCabe', 'Youko', 'Jakob Lynch', 'Lucas McCabe',
    'Youko Hamasaki', 'Asami Tanaka', 'Lord Cooper', 'Jedza', 'Maxine Agassiz', 
    'Nexus', 'Anya Lycarayen', 'English Ivan', 'Cornelius Basse', 'Maxine',
    'Ivan', 'Cooper', 'Jedza', 'Anya', 'Nexus', 'Ironsides', 'Colette',
    'Dashel', 'Lucius', 'Nellie', 'Sonnia', 'Perdita', 'Justice',
}

# Known Totems (for null-cost identification)
TOTEM_PATTERNS = ['totem', 'essence', 'whisper', 'student of', 'the scribe', 
                  'copycat', 'malifaux child', 'cache', 'primordial magic']

# Malifaux conditions (M4E)
CONDITIONS = [
    'adversary', 'burning', 'distracted', 'fast', 'focused', 'injured',
    'slow', 'staggered', 'stunned', 'poison', 'shielded', 'concealment',
    'cover', 'prone', 'buried', 'engaged', 'activated', 'paralyzed',
    'defensive', 'frightened', 'hidden', 'hazardous', 'concealed', 'blinded',
]

# =============================================================================
# REPAIR FUNCTIONS
# =============================================================================

def undouble_ocr_number(s: str) -> Optional[int]:
    """Convert doubled OCR text to integer (e.g., '55' -> 5, '1100' -> 10)."""
    s = str(s).strip()
    if not s or not s.isdigit():
        return None
    
    if len(s) == 2 and s[0] == s[1]:
        return int(s[0])
    elif len(s) == 4 and s[0:2] == s[2:4]:
        return int(s[0:2])
    elif len(s) == 1:
        return int(s)
    elif len(s) == 2:
        return int(s)
    
    return None


def repair_cost(card: Dict) -> Tuple[Optional[int], str]:
    """
    Extract cost from raw_text line 0.
    Returns (cost, repair_note).
    """
    raw = card.get('raw_text', '')
    if not raw:
        return card.get('cost'), 'no_raw_text'
    
    lines = raw.split('\n')
    if not lines:
        return card.get('cost'), 'no_lines'
    
    line0 = lines[0].strip()
    
    # Masters and Totems have no cost (shown as --)
    if line0 == '--' or line0.startswith('--'):
        return None, 'master_or_totem'
    
    # Try to parse doubled number
    if re.match(r'^\d{1,4}$', line0):
        cost = undouble_ocr_number(line0)
        if cost is not None and 1 <= cost <= 15:
            old_cost = card.get('cost')
            if old_cost != cost:
                return cost, f'repaired_{old_cost}_to_{cost}'
            return cost, 'already_correct'
    
    return card.get('cost'), 'unparseable'


def clean_action_name(name: str) -> str:
    """Remove suit-prefix OCR artifacts from action names."""
    if not name:
        return name
    
    # Pattern: single letter (suit) + space + actual name
    # e.g., "F Attack" -> "Attack", "T Bonus" -> "Bonus"
    if len(name) > 2 and name[0].lower() in 'fstrcmb' and name[1] == ' ':
        return name[2:].strip()
    
    return name


def repair_action_names(card: Dict) -> int:
    """Clean all action names in a card. Returns count of repairs."""
    repairs = 0
    
    for action in card.get('actions', []):
        old_name = action.get('name', '')
        new_name = clean_action_name(old_name)
        if old_name != new_name:
            action['name'] = new_name
            repairs += 1
    
    for ability in card.get('abilities', []):
        old_name = ability.get('name', '')
        new_name = clean_action_name(old_name)
        if old_name != new_name:
            ability['name'] = new_name
            repairs += 1
    
    return repairs


def has_station(card: Dict) -> bool:
    """Check if card already has a valid station."""
    chars = card.get('characteristics', [])
    return any(c in VALID_STATIONS for c in chars)


def get_existing_station(card: Dict) -> Optional[str]:
    """Get existing station if any.
    
    Uses priority order: Master > Henchman > Enforcer > Totem > Minion > Peon
    This ensures dual-station cards (e.g., Minion+Totem) are counted as their
    "higher" station (Totem) for reporting purposes.
    """
    chars = card.get('characteristics', [])
    # Priority order: Totem before Minion so Minion+Totem → Totem
    for station in ['Master', 'Henchman', 'Enforcer', 'Totem', 'Minion', 'Peon']:
        if station in chars:
            return station
    return None


def extract_station_from_text(raw_text: str) -> Optional[str]:
    """Try to find station directly in raw card text header area."""
    if not raw_text:
        return None
    
    # Check first 500 chars (station is in header area)
    header = raw_text[:500].lower()
    
    # Look for station keywords with word boundaries
    for station in ['henchman', 'enforcer', 'minion', 'master', 'totem', 'peon']:
        # Match whole word only
        if re.search(rf'\b{station}\b', header):
            return station.capitalize()
    
    return None


def is_known_master(name: str) -> bool:
    """Check if name matches a known master."""
    if not name:
        return False
    
    # Check full name
    base_name = name.split(',')[0].strip()
    if base_name in KNOWN_MASTERS:
        return True
    
    # Check if any known master name is contained
    name_lower = name.lower()
    for master in KNOWN_MASTERS:
        if master.lower() in name_lower:
            return True
    
    return False


def is_totem_name(name: str) -> bool:
    """Check if name suggests this is a totem."""
    if not name:
        return False
    
    name_lower = name.lower()
    return any(pattern in name_lower for pattern in TOTEM_PATTERNS)


def infer_station(card: Dict) -> Tuple[Optional[str], str]:
    """
    Infer station from cost, characteristics, and soulstone_cache.
    Returns (station, inference_reason).
    
    Rules:
    - null cost + known master name = Master
    - null cost + totem pattern = Totem
    - null cost + Unique = Master (default)
    - null cost + not Unique = Totem
    - cost 1-2 + not Unique = Peon
    - cost 3+ + not Unique = Minion
    - Unique + soulstone_cache=True = Henchman (KEY: can use soulstones)
    - Unique + no soulstone_cache + cost 6+ = Enforcer
    - Unique + cost 3-5 = cheap Enforcer
    
    KEY INSIGHT: Henchmen have soulstone_cache=True because they can use
    soulstones in the game. Enforcers cannot. This is more reliable than
    using cost thresholds (old buggy logic used cost >= 9 = Henchman).
    """
    cost = card.get('cost')
    chars = card.get('characteristics', [])
    name = card.get('name', '')
    raw_text = card.get('raw_text', '')
    is_unique = 'Unique' in chars
    
    # Already has station? Keep it.
    existing = get_existing_station(card)
    if existing:
        return existing, 'already_present'
    
    # Try text extraction first (most reliable)
    text_station = extract_station_from_text(raw_text)
    if text_station:
        return text_station, 'from_raw_text'
    
    # --- NULL COST = Master or Totem ---
    if cost is None:
        # Known master?
        if is_known_master(name):
            return 'Master', 'null_cost_known_master'
        
        # Totem name pattern?
        if is_totem_name(name):
            return 'Totem', 'null_cost_totem_pattern'
        
        # Check raw text for Master/Totem keywords
        if raw_text:
            header_lower = raw_text[:300].lower()
            if 'master' in header_lower:
                return 'Master', 'null_cost_master_in_text'
            if 'totem' in header_lower:
                return 'Totem', 'null_cost_totem_in_text'
        
        # Default: Unique null-cost = Master, non-Unique = Totem
        if is_unique:
            return 'Master', 'null_cost_unique_default'
        else:
            return 'Totem', 'null_cost_not_unique'
    
    # --- HAS COST ---
    
    # Peons: 2ss or less, not unique
    if cost <= 2 and not is_unique:
        return 'Peon', f'cost_{cost}_not_unique_peon'
    
    # Non-unique with cost = Minion
    if not is_unique:
        return 'Minion', f'cost_{cost}_not_unique_minion'
    
    # --- UNIQUE WITH COST = Henchman or Enforcer ---
    
    # KEY FIX: Use soulstone_cache to identify Henchmen
    # Henchmen can use soulstones (soulstone_cache=True), Enforcers cannot
    # This is MORE RELIABLE than cost-based inference
    has_soulstone = card.get('soulstone_cache', False)
    
    if has_soulstone:
        return 'Henchman', f'cost_{cost}_unique_soulstone_henchman'
    
    # No soulstone cache + Unique = Enforcer (all cost levels 6-11ss)
    if cost >= 6:
        return 'Enforcer', f'cost_{cost}_unique_no_ss_enforcer'
    
    # 3-5ss unique without soulstone = cheap Enforcer
    return 'Enforcer', f'cost_{cost}_unique_cheap_enforcer'


def extract_conditions(card: Dict) -> Tuple[List[str], List[str]]:
    """
    Extract conditions from card text.
    Returns (conditions_applied, conditions_required).
    """
    applied = set()
    required = set()
    
    # Gather all text from card
    texts = []
    texts.append(card.get('raw_text', ''))
    
    for action in card.get('actions', []):
        texts.append(action.get('name', ''))
        texts.append(action.get('text', ''))
        texts.append(action.get('effect', ''))
    
    for ability in card.get('abilities', []):
        texts.append(ability.get('name', ''))
        texts.append(ability.get('text', ''))
    
    full_text = ' '.join(str(t) for t in texts if t).lower()
    
    # Apply patterns
    apply_patterns = [
        r'gains?\s+{cond}',
        r'give[s]?\s+.*?{cond}',
        r'applies?\s+{cond}',
        r'suffer[s]?\s+{cond}',
        r'receives?\s+{cond}',
        r'{cond}\s*\+\s*\d',  # "Burning +1"
        r'{cond}\s+\+\d',     # "Burning +1" 
        r'{cond}\s+condition',
        r'becomes?\s+{cond}',
        r'target\s+.*?{cond}',
    ]
    
    require_patterns = [
        r'remove[s]?\s+{cond}',
        r'end[s]?\s+{cond}',
        r'has\s+{cond}',
        r'if\s+.*?{cond}',
        r'enemy\s+.*?{cond}',
        r'benefits?\s+from\s+{cond}',
        r'while\s+.*?{cond}',
    ]
    
    for cond in CONDITIONS:
        # Skip if condition not mentioned at all
        if cond not in full_text:
            continue
        
        # Check apply patterns
        for pattern in apply_patterns:
            regex = pattern.format(cond=re.escape(cond))
            if re.search(regex, full_text):
                applied.add(cond)
                break
        
        # Check require patterns  
        for pattern in require_patterns:
            regex = pattern.format(cond=re.escape(cond))
            if re.search(regex, full_text):
                required.add(cond)
                break
    
    return sorted(applied), sorted(required)


def set_hireable_flag(card: Dict) -> bool:
    """Set hireable flag based on station. Returns the flag value."""
    chars = card.get('characteristics', [])
    
    # Masters and Totems are not hireable (no cost)
    if 'Master' in chars or 'Totem' in chars:
        return False
    
    # Everything else with a cost is hireable
    return card.get('cost') is not None


# =============================================================================
# MAIN REPAIR PIPELINE
# =============================================================================

def repair_all_cards(cards_data: Any) -> Tuple[Any, Dict]:
    """
    Apply ALL repairs to cards data.
    Returns (repaired_data, statistics).
    """
    
    # Handle both list and dict formats
    if isinstance(cards_data, dict):
        cards = cards_data.get('cards', [])
        is_dict_format = True
    else:
        cards = cards_data
        is_dict_format = False
    
    stats = {
        'timestamp': datetime.now().isoformat(),
        'total_cards': len(cards),
        'stat_cards': 0,
        'repairs': {
            'costs_fixed': 0,
            'action_names_cleaned': 0,
            'stations_inferred': 0,
            'stations_from_text': 0,
        },
        'station_distribution': defaultdict(int),
        'station_inference_reasons': defaultdict(int),
        'cost_distribution': defaultdict(int),
        'validation': {
            'missing_station': [],
            'missing_cost_hireable': [],
            'enforcer_count': 0,
            'henchman_count': 0,
            'master_count': 0,
            'minion_count': 0,
        }
    }
    
    for card in cards:
        if card.get('card_type') != 'Stat':
            continue
        
        stats['stat_cards'] += 1
        card_name = card.get('name', 'Unknown')
        
        # ----- REPAIR 1: Cost -----
        old_cost = card.get('cost')
        new_cost, cost_note = repair_cost(card)
        if new_cost != old_cost and new_cost is not None:
            card['cost'] = new_cost
            stats['repairs']['costs_fixed'] += 1
        
        # Track cost distribution
        if card.get('cost') is not None:
            stats['cost_distribution'][card['cost']] += 1
        
        # ----- REPAIR 2: Action Names -----
        action_repairs = repair_action_names(card)
        stats['repairs']['action_names_cleaned'] += action_repairs
        
        # ----- REPAIR 2.5: Fix Henchman → Enforcer (soulstone_cache check) -----
        # Many cards are wrongly tagged as Henchman when they should be Enforcer.
        # True Henchmen can use soulstones (soulstone_cache=True), Enforcers cannot.
        chars = card.get('characteristics', [])
        if 'Henchman' in chars and not card.get('soulstone_cache', False):
            chars.remove('Henchman')
            chars.append('Enforcer')
            card['characteristics'] = chars
            stats['repairs']['henchman_to_enforcer'] = stats['repairs'].get('henchman_to_enforcer', 0) + 1
        
        # ----- REPAIR 3: Station Inference -----
        station, station_reason = infer_station(card)
        
        if station:
            chars = card.get('characteristics', [])
            if station not in chars:
                if 'characteristics' not in card:
                    card['characteristics'] = []
                card['characteristics'].append(station)
                
                if 'from_text' in station_reason or 'from_raw_text' in station_reason:
                    stats['repairs']['stations_from_text'] += 1
                else:
                    stats['repairs']['stations_inferred'] += 1
            
            stats['station_inference_reasons'][station_reason] += 1
        
        # Track station distribution (after inference)
        final_station = get_existing_station(card)
        if final_station:
            stats['station_distribution'][final_station] += 1
            
            # Validation counts
            if final_station == 'Enforcer':
                stats['validation']['enforcer_count'] += 1
            elif final_station == 'Henchman':
                stats['validation']['henchman_count'] += 1
            elif final_station == 'Master':
                stats['validation']['master_count'] += 1
            elif final_station == 'Minion':
                stats['validation']['minion_count'] += 1
        else:
            stats['validation']['missing_station'].append(card_name)
        
        # ----- REPAIR 4: Hireable Flag -----
        card['hireable'] = set_hireable_flag(card)
        
        # ----- VALIDATION -----
        if card['hireable'] and card.get('cost') is None:
            stats['validation']['missing_cost_hireable'].append(card_name)
    
    # Convert defaultdicts
    stats['station_distribution'] = dict(stats['station_distribution'])
    stats['station_inference_reasons'] = dict(stats['station_inference_reasons'])
    stats['cost_distribution'] = dict(stats['cost_distribution'])
    
    # Build output
    if is_dict_format:
        result = cards_data.copy()
        result['cards'] = cards
        result['_repair_stats'] = {
            'timestamp': stats['timestamp'],
            'repairs_applied': stats['repairs'],
            'station_distribution': stats['station_distribution'],
        }
    else:
        result = cards
    
    return result, stats


# =============================================================================
# REPORTING
# =============================================================================

def print_report(stats: Dict):
    """Print human-readable repair report."""
    
    print("\n" + "=" * 70)
    print("MALIFAUX 4E DATA REPAIR REPORT")
    print("=" * 70)
    print(f"Timestamp: {stats['timestamp']}")
    print(f"Total Cards: {stats['total_cards']}")
    print(f"Stat Cards:  {stats['stat_cards']}")
    
    print("\n" + "-" * 70)
    print("REPAIRS APPLIED")
    print("-" * 70)
    r = stats['repairs']
    print(f"  Costs fixed:              {r['costs_fixed']}")
    print(f"  Action names cleaned:     {r['action_names_cleaned']}")
    print(f"  Stations inferred:        {r['stations_inferred']}")
    print(f"  Stations from text:       {r['stations_from_text']}")
    print("  (Condition extraction handled by tag_extractor.py)")
    
    print("\n" + "-" * 70)
    print("STATION DISTRIBUTION")
    print("-" * 70)
    total = stats['stat_cards'] or 1
    for station in ['Master', 'Henchman', 'Enforcer', 'Minion', 'Totem', 'Peon']:
        count = stats['station_distribution'].get(station, 0)
        pct = count / total * 100
        bar = '=' * int(pct / 2)
        print(f"  {station:12} {count:4} ({pct:5.1f}%) {bar}")
    
    missing = len(stats['validation']['missing_station'])
    if missing:
        print(f"  {'MISSING':12} {missing:4} [!]")
    
    print("\n" + "-" * 70)
    print("VALIDATION CHECKS")
    print("-" * 70)
    
    v = stats['validation']
    
    # Enforcer check (CRITICAL)
    enforcer_count = v['enforcer_count']
    print(f"  Enforcers:  {enforcer_count}")
    if enforcer_count == 0:
        print("  [CRITICAL] No Enforcers found! Station inference FAILED.")
    elif enforcer_count < 100:
        print(f"  [WARNING] Low Enforcer count (expected 200+)")
    else:
        print(f"  [OK] Enforcer count looks good")
    
    # Other station checks
    print(f"  Masters:    {v['master_count']}")
    print(f"  Henchmen:   {v['henchman_count']}")
    print(f"  Minions:    {v['minion_count']}")
    
    # Missing stations
    if missing:
        print(f"\n  [WARNING] {missing} cards still missing station:")
        for name in stats['validation']['missing_station'][:5]:
            print(f"    - {name}")
        if missing > 5:
            print(f"    ... and {missing - 5} more")
    
    # Missing costs
    missing_cost = stats['validation']['missing_cost_hireable']
    if missing_cost:
        print(f"\n  [WARNING] {len(missing_cost)} hireable cards missing cost:")
        for name in missing_cost[:5]:
            print(f"    - {name}")
        if len(missing_cost) > 5:
            print(f"    ... and {len(missing_cost) - 5} more")
    
    # Health score (conditions handled by tag_extractor.py, not scored here)
    station_pct = (stats['stat_cards'] - missing) / total * 100 if total > 0 else 0
    enforcer_health = min(100, enforcer_count / 2)  # Expect ~200 enforcers
    
    # Station health = 60%, Enforcer health = 40% (conditions are in tag_extractor)
    health = (station_pct * 0.6 + enforcer_health * 0.4)
    
    print("\n" + "-" * 70)
    print("HEALTH SCORE (Station Focus)")
    print("-" * 70)
    print(f"  Overall:     {health:.1f}%")
    print(f"  Stations:    {station_pct:.1f}%")
    print(f"  Enforcers:   {enforcer_health:.1f}%")
    print("  (Conditions scored by tag_extractor.py)")
    
    grade = 'A+' if health >= 95 else 'A' if health >= 90 else 'B+' if health >= 85 else \
            'B' if health >= 80 else 'C+' if health >= 75 else 'C' if health >= 70 else \
            'D' if health >= 60 else 'F'
    print(f"  Grade:       {grade}")
    
    print("\n" + "=" * 70)
    
    return health, grade


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Malifaux 4E Data Repair - All fixes in one pass'
    )
    parser.add_argument('input', help='Input cards.json file')
    parser.add_argument('--output', '-o', required=True, help='Output cards.json file')
    parser.add_argument('--report', '-r', help='Save detailed report to JSON file')
    parser.add_argument('--quiet', '-q', action='store_true', help='Suppress output')
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    output_path = Path(args.output)
    
    if not input_path.exists():
        print(f"[ERROR] Input file not found: {input_path}")
        return 1
    
    print(f"Loading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        cards_data = json.load(f)
    
    print("Applying repairs...")
    result, stats = repair_all_cards(cards_data)
    
    if not args.quiet:
        health, grade = print_report(stats)
    else:
        health = 0
        grade = '?'
    
    # Save output
    print(f"\nSaving to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"[OK] Saved {output_path}")
    
    # Save report if requested
    if args.report:
        report_path = Path(args.report)
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        print(f"[OK] Report saved to {report_path}")
    
    # CRITICAL VALIDATION: Fail if no Enforcers
    if stats['validation']['enforcer_count'] == 0:
        print("\n[CRITICAL ERROR] Zero Enforcers detected!")
        print("Station inference failed. Output may be unusable.")
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
