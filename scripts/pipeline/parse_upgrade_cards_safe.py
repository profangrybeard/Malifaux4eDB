#!/usr/bin/env python3
"""
Malifaux 4E Upgrade Card Parser - FILENAME ONLY (No OCR)

Builds upgrade_cards.json from filenames and image paths only.
Zero OCR, zero text extraction, zero risk of garbage data.

File naming convention:
    M4E_Upgrade_{Keyword}_{UpgradeName}_front.png
    M4E_Upgrade_{Keyword}_{UpgradeName}_back.png

Usage:
    python parse_upgrade_cards_safe.py -i ../Malifaux4eDB-images -o upgrade_cards.json
    python parse_upgrade_cards_safe.py -i ../Malifaux4eDB-images -o upgrade_cards.json --verbose
"""

import argparse
import json
from pathlib import Path
from datetime import datetime
from collections import Counter
from typing import Dict, List, Optional


# =============================================================================
# KEYWORD → FACTION MAPPING (same as Crew parser)
# =============================================================================
KEYWORD_TO_FACTION = {
    # Arcanists
    'Academic': 'Arcanists',
    'December': 'Arcanists',
    'Foundry': 'Arcanists',
    'Performer': 'Arcanists',
    'Wildfire': 'Arcanists',
    'Witness': 'Arcanists',
    'M&SU': 'Arcanists',
    'Oxfordian': 'Arcanists',
    
    # Bayou
    'Big-Hat': 'Bayou',
    'BigHat': 'Bayou',
    'Infamous': 'Bayou',
    'Kin': 'Bayou',
    'Luck': 'Bayou',
    'Pig': 'Bayou',
    'Tri-Chi': 'Bayou',
    'TriChi': 'Bayou',
    'Wizz-Bang': 'Bayou',
    'WizzBang': 'Bayou',
    'Swampfiend': 'Bayou',
    
    # Explorer's Society
    'Seeker': "Explorer's Society",
    'Wastrel': "Explorer's Society",
    'Cavalier': "Explorer's Society",
    'Dredge': "Explorer's Society",
    'Forgotten': "Explorer's Society",
    'Syndicate': "Explorer's Society",
    'EVS': "Explorer's Society",
    
    # Guild
    'Augmented': 'Guild',
    'Elite': 'Guild',
    'Family': 'Guild',
    'Guard': 'Guild',
    'Journalist': 'Guild',
    'Marshal': 'Guild',
    'Witch-Hunter': 'Guild',
    'WitchHunter': 'Guild',
    
    # Neverborn
    'Nephilim': 'Neverborn',
    'Nightmare': 'Neverborn',
    'Woe': 'Neverborn',
    'Mimic': 'Neverborn',
    'Savage': 'Neverborn',
    'Fae': 'Neverborn',
    'Hex': 'Neverborn',
    
    # Outcasts
    'Bandit': 'Outcasts',
    'Mercenary': 'Outcasts',
    'Freikorps': 'Outcasts',
    'Obliteration': 'Outcasts',
    'Tormented': 'Outcasts',
    'Plague': 'Outcasts',
    'Wasteland': 'Outcasts',
    
    # Resurrectionists
    'Ancestor': 'Resurrectionists',
    'Redchapel': 'Resurrectionists',
    'Revenant': 'Resurrectionists',
    'Transmortis': 'Resurrectionists',
    'Urami': 'Resurrectionists',
    'Experimental': 'Resurrectionists',
    'Zombie': 'Resurrectionists',
    
    # Ten Thunders
    'Last-Blossom': 'Ten Thunders',
    'LastBlossom': 'Ten Thunders',
    'Honeypot': 'Ten Thunders',
    'Qi-and-Gong': 'Ten Thunders',
    'QiandGong': 'Ten Thunders',
    'Retainer': 'Ten Thunders',
    'Monk': 'Ten Thunders',
    'Oni': 'Ten Thunders',
}


def parse_upgrade_filename(filepath: str) -> Optional[Dict]:
    """Extract metadata from an Upgrade card filename."""
    path = Path(filepath)
    filename = path.stem
    
    if not filename.endswith('_front'):
        return None
    
    base_name = filename[:-6]  # Remove '_front'
    
    if not base_name.startswith('M4E_Upgrade_'):
        return None
    
    name_part = base_name[12:]  # Remove 'M4E_Upgrade_'
    parts = name_part.split('_')
    
    if not parts:
        return None
    
    keyword = parts[0]
    name_parts = parts[1:] if len(parts) > 1 else [keyword]
    name = ' '.join(name_parts)
    
    faction = KEYWORD_TO_FACTION.get(keyword, 'Unknown')
    
    # Try folder structure if unknown
    if faction == 'Unknown':
        path_parts = path.parts
        for part in path_parts:
            if part in ['Arcanists', 'Bayou', "Explorer's Society", 'Guild',
                        'Neverborn', 'Outcasts', 'Resurrectionists', 'Ten Thunders']:
                faction = part
                break
    
    return {
        'id': base_name,
        'keyword': keyword,
        'name': name,
        'faction': faction,
    }


def build_image_path(file_path: Path, images_root: Path) -> str:
    """Build relative image path for the app."""
    try:
        relative = file_path.relative_to(images_root)
        return str(relative).replace('\\', '/')
    except ValueError:
        parts = file_path.parts
        for i, part in enumerate(parts):
            if part in ['Arcanists', 'Bayou', "Explorer's Society", 'Guild',
                        'Neverborn', 'Outcasts', 'Resurrectionists', 'Ten Thunders']:
                return '/'.join(parts[i:]).replace('\\', '/')
        return file_path.name


def find_upgrade_cards(input_dir: str, verbose: bool = False) -> List[Dict]:
    """Find and parse all Upgrade card files."""
    input_path = Path(input_dir)
    
    front_files = list(input_path.rglob("M4E_Upgrade_*_front.png"))
    
    if verbose:
        print(f"Found {len(front_files)} Upgrade card front images")
    
    cards = []
    
    for front_path in front_files:
        info = parse_upgrade_filename(str(front_path))
        if not info:
            if verbose:
                print(f"  Skipping (couldn't parse): {front_path.name}")
            continue
        
        back_name = front_path.name.replace('_front.png', '_back.png')
        back_path = front_path.parent / back_name
        has_back = back_path.exists()
        
        front_image = build_image_path(front_path, input_path)
        back_image = build_image_path(back_path, input_path) if has_back else None
        
        card = {
            'id': info['id'],
            'name': info['name'],
            'card_type': 'Upgrade',
            'faction': info['faction'],
            'subfaction': info['keyword'],
            'primary_keyword': info['keyword'],
            'keywords': [info['keyword']],
            'characteristics': ['Upgrade'],
            'front_image': front_image,
            'back_image': back_image,
            'raw_text': None,
            'rules_text': None,
        }
        
        cards.append(card)
        
        if verbose:
            print(f"  Parsed: {card['name']} ({card['faction']}/{card['subfaction']})")
    
    return cards


def main():
    parser = argparse.ArgumentParser(
        description='Parse Malifaux 4E Upgrade cards from filenames (no OCR)'
    )
    parser.add_argument('-i', '--input', required=True,
                        help='Input directory (Malifaux4eDB-images root)')
    parser.add_argument('-o', '--output', default='upgrade_cards.json',
                        help='Output JSON file (default: upgrade_cards.json)')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Show detailed progress')
    
    args = parser.parse_args()
    
    print(f"Scanning {args.input} for Upgrade cards...")
    
    cards = find_upgrade_cards(args.input, verbose=args.verbose)
    
    if not cards:
        print("No Upgrade cards found!")
        print("Expected files like: M4E_Upgrade_Academic_SomeUpgrade_front.png")
        return 1
    
    cards.sort(key=lambda c: (c['faction'], c['subfaction'], c['name']))
    
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    output_data = {
        'version': '1.0',
        'generated': datetime.now().isoformat(),
        'source': 'filename_extraction',
        'ocr_used': False,
        'total_cards': len(cards),
        'cards': cards
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nWrote {len(cards)} Upgrade cards to {args.output}")
    
    # Summary
    factions = Counter(c['faction'] for c in cards)
    print("\nBy Faction:")
    for faction, count in sorted(factions.items()):
        print(f"  {faction}: {count}")
    
    return 0


if __name__ == '__main__':
    exit(main())
