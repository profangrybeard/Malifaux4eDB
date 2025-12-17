#!/usr/bin/env python3
"""
Malifaux 4E Crew Card Parser - FILENAME ONLY (No OCR)

Builds crew_cards.json from filenames and image paths only.
Zero OCR, zero text extraction, zero risk of garbage data.

The card images themselves contain all the rules - users read them visually.
This just creates the data structure needed for the app to display them.

File naming convention:
    M4E_Crew_{Keyword}_{MasterName}_{Title}_front.png
    M4E_Crew_{Keyword}_{MasterName}_{Title}_back.png

Example:
    M4E_Crew_Academic_Sandeep_Desai_Font_of_Magic_front.png
    → keyword: Academic
    → name: Sandeep Desai Font of Magic
    → faction: Arcanists (looked up from keyword)

Usage:
    python parse_crew_cards_safe.py -i ../Malifaux4eDB-images -o crew_cards.json
    python parse_crew_cards_safe.py -i ../Malifaux4eDB-images -o crew_cards.json --verbose
"""

import argparse
import json
from pathlib import Path
from datetime import datetime
from collections import Counter
from typing import Dict, List, Optional, Tuple


# =============================================================================
# KEYWORD → FACTION MAPPING
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


def normalize_keyword(keyword: str) -> str:
    """Normalize keyword for consistent matching."""
    # Handle common variations
    normalized = keyword.replace('-', ' ').replace('_', ' ')
    return normalized


def parse_crew_filename(filepath: str) -> Optional[Dict]:
    """
    Extract all metadata from a Crew card filename.
    
    Input: M4E_Crew_Academic_Sandeep_Desai_Font_of_Magic_front.png
    Output: {
        'id': 'M4E_Crew_Academic_Sandeep_Desai_Font_of_Magic',
        'keyword': 'Academic',
        'name': 'Sandeep Desai Font of Magic',
        'faction': 'Arcanists',
        ...
    }
    """
    path = Path(filepath)
    filename = path.stem  # Remove .png
    
    # Must be a front image (we'll find back separately)
    if not filename.endswith('_front'):
        return None
    
    # Remove _front suffix
    base_name = filename[:-6]  # Remove '_front'
    
    # Must start with M4E_Crew_
    if not base_name.startswith('M4E_Crew_'):
        return None
    
    # Remove prefix
    name_part = base_name[9:]  # Remove 'M4E_Crew_'
    
    # Split by underscore
    parts = name_part.split('_')
    
    if not parts:
        return None
    
    # First part is the keyword
    keyword = parts[0]
    
    # Rest is the name (Master name + title usually)
    name_parts = parts[1:] if len(parts) > 1 else [keyword]
    name = ' '.join(name_parts)
    
    # Look up faction from keyword
    faction = KEYWORD_TO_FACTION.get(keyword, 'Unknown')
    
    # If faction unknown, try folder structure
    if faction == 'Unknown':
        # Path might be: .../Arcanists/Academic/M4E_Crew_...
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


def build_image_path(front_path: Path, images_root: Path) -> str:
    """Build relative image path for the app."""
    try:
        relative = front_path.relative_to(images_root)
        return str(relative).replace('\\', '/')
    except ValueError:
        # Fallback: use parent folders
        parts = front_path.parts
        # Find faction folder and build from there
        for i, part in enumerate(parts):
            if part in ['Arcanists', 'Bayou', "Explorer's Society", 'Guild',
                        'Neverborn', 'Outcasts', 'Resurrectionists', 'Ten Thunders']:
                return '/'.join(parts[i:]).replace('\\', '/')
        # Last resort: just filename
        return front_path.name


def find_crew_cards(input_dir: str, verbose: bool = False) -> List[Dict]:
    """Find and parse all Crew card files."""
    input_path = Path(input_dir)
    
    # Find all Crew card front images
    front_files = list(input_path.rglob("M4E_Crew_*_front.png"))
    
    if verbose:
        print(f"Found {len(front_files)} Crew card front images")
    
    cards = []
    
    for front_path in front_files:
        # Parse filename
        info = parse_crew_filename(str(front_path))
        if not info:
            if verbose:
                print(f"  Skipping (couldn't parse): {front_path.name}")
            continue
        
        # Find matching back image
        back_name = front_path.name.replace('_front.png', '_back.png')
        back_path = front_path.parent / back_name
        has_back = back_path.exists()
        
        # Build image paths
        front_image = build_image_path(front_path, input_path)
        back_image = build_image_path(back_path, input_path) if has_back else None
        
        # Build card object
        card = {
            'id': info['id'],
            'name': info['name'],
            'card_type': 'Crew',
            'faction': info['faction'],
            'subfaction': info['keyword'],
            'primary_keyword': info['keyword'],
            'keywords': [info['keyword']],
            'characteristics': [],
            'front_image': front_image,
            'back_image': back_image,
            # No OCR data - users read the card image
            'raw_text': None,
            'rules_text': None,
        }
        
        cards.append(card)
        
        if verbose:
            print(f"  Parsed: {card['name']} ({card['faction']}/{card['subfaction']})")
    
    return cards


def main():
    parser = argparse.ArgumentParser(
        description='Parse Malifaux 4E Crew cards from filenames (no OCR)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python parse_crew_cards_safe.py -i ../Malifaux4eDB-images -o crew_cards.json
    python parse_crew_cards_safe.py -i ../Malifaux4eDB-images -o crew_cards.json -v
    
This creates a crew_cards.json that pairs with your existing cards.json.
No OCR is performed - metadata comes from filenames only.
        """
    )
    parser.add_argument('-i', '--input', required=True, 
                        help='Input directory (Malifaux4eDB-images root)')
    parser.add_argument('-o', '--output', default='crew_cards.json',
                        help='Output JSON file (default: crew_cards.json)')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Show detailed progress')
    
    args = parser.parse_args()
    
    print(f"Scanning {args.input} for Crew cards...")
    
    # Find and parse all Crew cards
    cards = find_crew_cards(args.input, verbose=args.verbose)
    
    if not cards:
        print("No Crew cards found!")
        print("Expected files like: M4E_Crew_Academic_Sandeep_Desai_Font_of_Magic_front.png")
        return 1
    
    # Sort by faction, then keyword, then name
    cards.sort(key=lambda c: (c['faction'], c['subfaction'], c['name']))
    
    # Write output
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
    
    print(f"\nWrote {len(cards)} Crew cards to {args.output}")
    
    # Summary by faction
    factions = Counter(c['faction'] for c in cards)
    print("\nBy Faction:")
    for faction, count in sorted(factions.items()):
        print(f"  {faction}: {count}")
    
    # Summary by keyword
    keywords = Counter(c['subfaction'] for c in cards)
    print(f"\nBy Keyword ({len(keywords)} unique):")
    for keyword, count in sorted(keywords.items())[:15]:
        print(f"  {keyword}: {count}")
    if len(keywords) > 15:
        print(f"  ... and {len(keywords) - 15} more")
    
    return 0


if __name__ == '__main__':
    exit(main())
