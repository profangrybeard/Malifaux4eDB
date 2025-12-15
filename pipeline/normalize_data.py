#!/usr/bin/env python3
"""
Malifaux 4E Data Normalization Script
Fixes inconsistencies across cards.json, faction_meta.json, objectives.json, and recommendations.json

Fixes:
1. Faction name normalization ("Explorers" → "Explorer's Society")
2. card_pdfs faction bug (cards with wrong faction)
3. Scheme name truncation (aligns objectives.json to faction_meta.json names)
4. Outputs cleaned files ready for the app

Usage:
    python normalize_data.py --input-dir ./data --output-dir ./data_cleaned
"""

import json
import os
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List


# =============================================================================
# NORMALIZATION MAPPINGS
# =============================================================================

# Faction name normalization - canonical names
FACTION_NORMALIZE = {
    "Explorers": "Explorer's Society",
    "Explorer's Society": "Explorer's Society",
    "Explorer Society": "Explorer's Society",
    "Arcanists": "Arcanists",
    "Bayou": "Bayou",
    "Guild": "Guild",
    "Neverborn": "Neverborn",
    "Outcasts": "Outcasts",
    "Resurrectionists": "Resurrectionists",
    "Ten Thunders": "Ten Thunders",
}

# Cards with wrong faction - fix based on subfaction or known data
CARD_FACTION_FIXES = {
    # card_id: correct_faction
    # These will be auto-detected from subfaction if possible
}

# Scheme name normalization - map truncated names to full names
SCHEME_NORMALIZE = {
    # Truncated → Full (canonical)
    "harness": "harness_the_ley_line",
    "harness_the_ley_line": "harness_the_ley_line",
    "make_it_look_like": "make_it_look_like_an_accident",
    "make_it_look_like_an_accident": "make_it_look_like_an_accident",
    "public": "public_demonstration",
    "public_demonstration": "public_demonstration",
    "take_the": "take_the_highground",
    "take_the_highground": "take_the_highground",
    # Already correct names (pass through)
    "assassinate": "assassinate",
    "breakthrough": "breakthrough",
    "detonate_charges": "detonate_charges",
    "ensnare": "ensnare",
    "frame_job": "frame_job",
    "grave_robbing": "grave_robbing",
    "leave_your_mark": "leave_your_mark",
    "reshape_the_land": "reshape_the_land",
    "runic_binding": "runic_binding",
    "scout_the_rooftops": "scout_the_rooftops",
    "search_the_area": "search_the_area",
}

# Strategy names (already consistent, but include for completeness)
STRATEGY_NORMALIZE = {
    "boundary_dispute": "boundary_dispute",
    "informants": "informants",
    "plant_explosives": "plant_explosives",
    "recover_evidence": "recover_evidence",
}


# =============================================================================
# NORMALIZATION FUNCTIONS
# =============================================================================

def normalize_faction(faction: str) -> str:
    """Normalize a faction name to canonical form."""
    if not faction:
        return faction
    return FACTION_NORMALIZE.get(faction, faction)


def normalize_scheme(scheme: str) -> str:
    """Normalize a scheme name to canonical form."""
    if not scheme:
        return scheme
    return SCHEME_NORMALIZE.get(scheme, scheme)


def infer_faction_from_subfaction(subfaction: str) -> str:
    """Try to infer the correct faction from a subfaction/keyword name."""
    # Known subfaction → faction mappings
    subfaction_to_faction = {
        # Arcanists keywords
        "Academic": "Arcanists",
        "December": "Arcanists",
        "Foundry": "Arcanists",
        "Oxfordian": "Arcanists",
        "Performer": "Arcanists",
        "Wildfire": "Arcanists",
        "Chimera": "Arcanists",
        "M&SU": "Arcanists",
        # Bayou keywords
        "Big Hat": "Bayou",
        "Kin": "Bayou",
        "Swampfiend": "Bayou",
        "Tricksy": "Bayou",
        "Wizz-Bang": "Bayou",
        # Explorer's Society keywords
        "Seeker": "Explorer's Society",
        "Frontier": "Explorer's Society",
        "Wastrel": "Explorer's Society",
        "Explorer": "Explorer's Society",
        # Guild keywords
        "Guard": "Guild",
        "Marshal": "Guild",
        "Family": "Guild",
        "Witch Hunter": "Guild",
        "Elite": "Guild",
        "Journalist": "Guild",
        # Neverborn keywords
        "Woe": "Neverborn",
        "Nightmare": "Neverborn",
        "Mimic": "Neverborn",
        "Fae": "Neverborn",
        "Savage": "Neverborn",
        "Honeypot": "Neverborn",
        # Outcasts keywords
        "Freikorps": "Outcasts",
        "Tormented": "Outcasts",
        "Bandit": "Outcasts",
        "Mercenary": "Outcasts",
        "Amalgam": "Outcasts",
        # Resurrectionists keywords
        "Redchapel": "Resurrectionists",
        "Revenant": "Resurrectionists",
        "Transmortis": "Resurrectionists",
        "Forgotten": "Resurrectionists",
        "Urami": "Resurrectionists",
        # Ten Thunders keywords
        "Last Blossom": "Ten Thunders",
        "Monk": "Ten Thunders",
        "Qi and Gong": "Ten Thunders",
        "Ancestor": "Ten Thunders",
        "Oni": "Ten Thunders",
    }
    
    # Also check if subfaction IS a faction name
    if subfaction in FACTION_NORMALIZE:
        return normalize_faction(subfaction)
    
    return subfaction_to_faction.get(subfaction, None)


def normalize_cards(cards_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize cards.json data."""
    cards = cards_data.get('cards', cards_data) if isinstance(cards_data, dict) else cards_data
    
    fixed_count = 0
    faction_fixes = []
    
    for card in cards:
        old_faction = card.get('faction', '')
        
        # Fix card_pdfs and other wrong factions
        if old_faction == 'card_pdfs' or old_faction not in FACTION_NORMALIZE:
            # Try to infer from subfaction
            subfaction = card.get('subfaction', '')
            inferred = infer_faction_from_subfaction(subfaction)
            
            if inferred:
                card['faction'] = inferred
                faction_fixes.append({
                    'name': card.get('name'),
                    'old': old_faction,
                    'new': inferred,
                    'reason': f'inferred from subfaction "{subfaction}"'
                })
                fixed_count += 1
            elif subfaction in FACTION_NORMALIZE:
                # Subfaction IS the faction (misplaced)
                card['faction'] = normalize_faction(subfaction)
                faction_fixes.append({
                    'name': card.get('name'),
                    'old': old_faction,
                    'new': card['faction'],
                    'reason': 'subfaction was actually faction'
                })
                fixed_count += 1
        else:
            # Normalize existing faction name
            new_faction = normalize_faction(old_faction)
            if new_faction != old_faction:
                card['faction'] = new_faction
                fixed_count += 1
    
    # Rebuild output structure
    if isinstance(cards_data, dict):
        result = cards_data.copy()
        result['cards'] = cards
        result['_normalization'] = {
            'timestamp': datetime.now().isoformat(),
            'faction_fixes': faction_fixes,
            'total_fixed': fixed_count
        }
    else:
        result = cards
    
    return result, faction_fixes


def normalize_faction_meta(meta_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize faction_meta.json data."""
    result = {}
    
    # Copy metadata
    result['metadata'] = meta_data.get('metadata', {}).copy()
    result['metadata']['normalized'] = datetime.now().isoformat()
    
    # Normalize faction_rankings
    rankings = []
    for r in meta_data.get('faction_rankings', []):
        new_r = r.copy()
        new_r['faction'] = normalize_faction(r.get('faction', ''))
        rankings.append(new_r)
    result['faction_rankings'] = rankings
    
    # Normalize faction_scheme_affinity
    scheme_affinity = {}
    for faction, data in meta_data.get('faction_scheme_affinity', {}).items():
        norm_faction = normalize_faction(faction)
        scheme_affinity[norm_faction] = {
            'best': [normalize_scheme(s) for s in data.get('best', [])],
            'worst': [normalize_scheme(s) for s in data.get('worst', [])]
        }
    result['faction_scheme_affinity'] = scheme_affinity
    
    # Normalize faction_strategy_affinity
    strategy_affinity = {}
    for faction, data in meta_data.get('faction_strategy_affinity', {}).items():
        norm_faction = normalize_faction(faction)
        strategy_affinity[norm_faction] = {
            'best': data.get('best', []),
            'worst': data.get('worst', [])
        }
    result['faction_strategy_affinity'] = strategy_affinity
    
    return result


def normalize_objectives(obj_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize objectives.json data - fix truncated scheme names."""
    result = obj_data.copy()
    
    # Normalize scheme keys
    if 'schemes' in result and isinstance(result['schemes'], dict):
        new_schemes = {}
        for old_key, scheme_data in result['schemes'].items():
            new_key = normalize_scheme(old_key)
            scheme_copy = scheme_data.copy()
            # Also update the id field inside
            if 'id' in scheme_copy:
                scheme_copy['id'] = new_key
            new_schemes[new_key] = scheme_copy
        result['schemes'] = new_schemes
        result['scheme_count'] = len(new_schemes)
    
    # Add normalization metadata
    result['_normalization'] = {
        'timestamp': datetime.now().isoformat(),
        'scheme_name_mapping': {k: v for k, v in SCHEME_NORMALIZE.items() if k != v}
    }
    
    return result


def normalize_recommendations(rec_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize recommendations.json - primarily for future-proofing."""
    result = rec_data.copy()
    
    # Add normalization metadata
    result['_normalization'] = {
        'timestamp': datetime.now().isoformat(),
    }
    
    return result


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='Normalize Malifaux 4E data files')
    parser.add_argument('--input-dir', '-i', default='.', help='Input directory with JSON files')
    parser.add_argument('--output-dir', '-o', default='./normalized', help='Output directory for cleaned files')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("MALIFAUX 4E DATA NORMALIZATION")
    print("=" * 60)
    
    # Process cards.json
    cards_file = input_dir / 'cards.json'
    if cards_file.exists():
        print(f"\n[CARDS] Processing {cards_file}...")
        with open(cards_file, 'r', encoding='utf-8') as f:
            cards_data = json.load(f)
        
        normalized_cards, faction_fixes = normalize_cards(cards_data)
        
        output_file = output_dir / 'cards.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(normalized_cards, f, indent=2)
        
        print(f"   [OK] Saved to {output_file}")
        if faction_fixes:
            print(f"   [INFO] Faction fixes applied:")
            for fix in faction_fixes:
                print(f"      {fix['name']}: '{fix['old']}' → '{fix['new']}' ({fix['reason']})")
    
    # Process faction_meta.json
    meta_file = input_dir / 'faction_meta.json'
    if meta_file.exists():
        print(f"\n[META] Processing {meta_file}...")
        with open(meta_file, 'r', encoding='utf-8') as f:
            meta_data = json.load(f)
        
        normalized_meta = normalize_faction_meta(meta_data)
        
        output_file = output_dir / 'faction_meta.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(normalized_meta, f, indent=2)
        
        print(f"   [OK] Saved to {output_file}")
        print(f"   [INFO] Faction names normalized to use \"Explorer's Society\"")
    
    # Process objectives.json
    obj_file = input_dir / 'objectives.json'
    if obj_file.exists():
        print(f"\n[OBJ] Processing {obj_file}...")
        with open(obj_file, 'r', encoding='utf-8') as f:
            obj_data = json.load(f)
        
        normalized_obj = normalize_objectives(obj_data)
        
        output_file = output_dir / 'objectives.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(normalized_obj, f, indent=2)
        
        print(f"   [OK] Saved to {output_file}")
        print(f"   [INFO] Scheme names expanded:")
        for old, new in SCHEME_NORMALIZE.items():
            if old != new:
                print(f"      '{old}' → '{new}'")
    
    # Process recommendations.json
    rec_file = input_dir / 'recommendations.json'
    if rec_file.exists():
        print(f"\n[REC] Processing {rec_file}...")
        with open(rec_file, 'r', encoding='utf-8') as f:
            rec_data = json.load(f)
        
        normalized_rec = normalize_recommendations(rec_data)
        
        output_file = output_dir / 'recommendations.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(normalized_rec, f, indent=2)
        
        print(f"   [OK] Saved to {output_file}")
    
    print("\n" + "=" * 60)
    print("[OK] NORMALIZATION COMPLETE")
    print("=" * 60)
    print(f"\nNormalized files saved to: {output_dir}")


if __name__ == '__main__':
    main()
