#!/usr/bin/env python3
"""
Malifaux 4E Card Data Fixer
Applies persistent corrections to parsed card data.

This script runs AFTER parse_cards.py to apply manual corrections that should
survive rebuilds. Corrections are stored in a JSON file that is tracked in git.

FIXES APPLIED:
1. Deduplication by ID (keeps best version - valid faction over invalid)
2. Keyword renames (global)
3. Keyword additions (per card)
4. Keyword removals (per card)
5. Card field overrides (per card)
6. Missing card additions

Usage:
    python fix_cards.py --input cards_raw.json --output cards_fixed.json
    python fix_cards.py --input cards_raw.json --output cards_fixed.json --corrections corrections.json
    python fix_cards.py --generate-corrections cards_raw.json  # Generate template corrections file
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional


# Valid faction names - used for deduplication scoring
VALID_FACTIONS = {
    'Arcanists', 'Bayou', "Explorer's Society", 'Guild', 
    'Neverborn', 'Outcasts', 'Resurrectionists', 'Ten Thunders'
}


class CardFixer:
    """Applies corrections to parsed card data."""
    
    def __init__(self, corrections_file: Optional[str] = None, verbose: bool = False):
        self.verbose = verbose
        self.corrections = {
            "keyword_additions": {},
            "keyword_removals": {},
            "keyword_renames": {},
            "missing_cards": [],
            "card_overrides": {}
        }
        self.stats = {
            "duplicates_removed": 0,
            "keywords_added": 0,
            "keywords_removed": 0,
            "keywords_renamed": 0,
            "cards_added": 0,
            "cards_overridden": 0
        }
        
        if corrections_file and Path(corrections_file).exists():
            self.load_corrections(corrections_file)
    
    def log(self, msg: str):
        if self.verbose:
            print(msg)
    
    def load_corrections(self, filepath: str):
        """Load corrections from JSON file."""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.corrections.update(data)
        print(f"Loaded corrections from {filepath}")
        print(f"  - Keyword additions: {len(self.corrections['keyword_additions'])} cards")
        print(f"  - Keyword removals: {len(self.corrections['keyword_removals'])} cards")
        print(f"  - Keyword renames: {len(self.corrections['keyword_renames'])} mappings")
        print(f"  - Missing cards to add: {len(self.corrections['missing_cards'])}")
        print(f"  - Card overrides: {len(self.corrections['card_overrides'])} cards")
    
    def normalize_id(self, text: str) -> str:
        """Normalize a string for matching (lowercase, spaces to hyphens)."""
        return text.lower().replace(' ', '-').replace('_', '-')
    
    def find_card(self, cards: List[Dict], identifier: str) -> Optional[Dict]:
        """Find a card by ID or name."""
        norm_id = self.normalize_id(identifier)
        
        for card in cards:
            # Match by ID
            if self.normalize_id(card.get('id', '')) == norm_id:
                return card
            # Match by name
            if self.normalize_id(card.get('name', '')) == norm_id:
                return card
        
        return None
    
    def score_card_quality(self, card: Dict) -> int:
        """
        Score a card's data quality for deduplication.
        Higher score = better quality = keep this one.
        """
        score = 0
        
        # Valid faction is critical (+100)
        if card.get('faction') in VALID_FACTIONS:
            score += 100
        
        # Has cost (+10)
        if card.get('cost') is not None:
            score += 10
        
        # Has keywords (+5 per keyword)
        score += len(card.get('keywords', [])) * 5
        
        # Has characteristics (+5)
        if card.get('characteristics'):
            score += 5
        
        # Has abilities (+2 per ability)
        score += len(card.get('abilities', [])) * 2
        
        # Has health (+3)
        if card.get('health') is not None:
            score += 3
        
        return score
    
    def deduplicate_cards(self, cards: List[Dict]) -> List[Dict]:
        """
        Remove duplicate cards by ID, keeping the highest quality version.
        
        This fixes issues where the same card is parsed multiple times with
        different (sometimes wrong) data.
        """
        seen_ids = {}  # id -> (index, score)
        duplicates = []
        
        for i, card in enumerate(cards):
            card_id = card.get('id', '')
            if not card_id:
                continue
            
            score = self.score_card_quality(card)
            
            if card_id in seen_ids:
                existing_idx, existing_score = seen_ids[card_id]
                existing_card = cards[existing_idx]
                
                if score > existing_score:
                    # New one is better, mark old for removal
                    duplicates.append(existing_idx)
                    seen_ids[card_id] = (i, score)
                    self.log(f"  Duplicate: {card.get('name')} - keeping better version "
                             f"(faction: {card.get('faction')} vs {existing_card.get('faction')})")
                else:
                    # Existing one is better, mark new for removal
                    duplicates.append(i)
                    self.log(f"  Duplicate: {card.get('name')} - keeping existing version "
                             f"(faction: {existing_card.get('faction')} vs {card.get('faction')})")
                
                self.stats['duplicates_removed'] += 1
            else:
                seen_ids[card_id] = (i, score)
        
        # Remove duplicates (in reverse order to preserve indices)
        result = [card for i, card in enumerate(cards) if i not in duplicates]
        
        return result
    
    def apply_keyword_renames(self, cards: List[Dict]) -> List[Dict]:
        """Apply global keyword renames to all cards."""
        renames = self.corrections.get('keyword_renames', {})
        if not renames:
            return cards
        
        for card in cards:
            keywords = card.get('keywords', [])
            new_keywords = []
            for kw in keywords:
                if kw in renames:
                    new_keywords.append(renames[kw])
                    self.stats['keywords_renamed'] += 1
                    self.log(f"  Renamed keyword '{kw}' -> '{renames[kw]}' on {card.get('name')}")
                else:
                    new_keywords.append(kw)
            card['keywords'] = new_keywords
        
        return cards
    
    def apply_keyword_additions(self, cards: List[Dict]) -> List[Dict]:
        """Add missing keywords to specific cards."""
        additions = self.corrections.get('keyword_additions', {})
        
        for identifier, keywords_to_add in additions.items():
            card = self.find_card(cards, identifier)
            if card:
                existing = set(card.get('keywords', []))
                for kw in keywords_to_add:
                    if kw not in existing:
                        card['keywords'].append(kw)
                        self.stats['keywords_added'] += 1
                        self.log(f"  Added keyword '{kw}' to {card.get('name')}")
            else:
                self.log(f"  WARNING: Card not found for keyword addition: {identifier}")
        
        return cards
    
    def apply_keyword_removals(self, cards: List[Dict]) -> List[Dict]:
        """Remove incorrect keywords from specific cards."""
        removals = self.corrections.get('keyword_removals', {})
        
        for identifier, keywords_to_remove in removals.items():
            card = self.find_card(cards, identifier)
            if card:
                for kw in keywords_to_remove:
                    if kw in card.get('keywords', []):
                        card['keywords'].remove(kw)
                        self.stats['keywords_removed'] += 1
                        self.log(f"  Removed keyword '{kw}' from {card.get('name')}")
            else:
                self.log(f"  WARNING: Card not found for keyword removal: {identifier}")
        
        return cards
    
    def apply_card_overrides(self, cards: List[Dict]) -> List[Dict]:
        """Apply field overrides to specific cards."""
        overrides = self.corrections.get('card_overrides', {})
        
        for identifier, fields in overrides.items():
            card = self.find_card(cards, identifier)
            if card:
                for field, value in fields.items():
                    old_value = card.get(field)
                    card[field] = value
                    self.stats['cards_overridden'] += 1
                    self.log(f"  Override {card.get('name')}.{field}: {old_value} -> {value}")
            else:
                self.log(f"  WARNING: Card not found for override: {identifier}")
        
        return cards
    
    def add_missing_cards(self, cards: List[Dict]) -> List[Dict]:
        """Add manually-defined cards that are missing from parsing."""
        missing = self.corrections.get('missing_cards', [])
        
        for card_data in missing:
            # Check if card already exists
            existing = self.find_card(cards, card_data.get('id', card_data.get('name', '')))
            if not existing:
                cards.append(card_data)
                self.stats['cards_added'] += 1
                self.log(f"  Added missing card: {card_data.get('name')}")
            else:
                self.log(f"  Skipping duplicate: {card_data.get('name')} already exists")
        
        return cards
    
    def fix_cards(self, cards_data: Dict) -> Dict:
        """Apply all corrections to card data."""
        cards = cards_data.get('cards', [])
        
        print(f"\nProcessing {len(cards)} cards...")
        
        # FIRST: Deduplicate by ID (keeps best version)
        cards = self.deduplicate_cards(cards)
        print(f"  After deduplication: {len(cards)} cards")
        
        # Then apply corrections in order
        cards = self.apply_keyword_renames(cards)
        cards = self.apply_keyword_additions(cards)
        cards = self.apply_keyword_removals(cards)
        cards = self.apply_card_overrides(cards)
        cards = self.add_missing_cards(cards)
        
        # Re-sort by faction, subfaction, name
        cards.sort(key=lambda c: (c.get('faction', ''), c.get('subfaction', ''), c.get('name', '')))
        
        cards_data['cards'] = cards
        cards_data['total_cards'] = len(cards)
        
        # Print summary
        print(f"\nCorrections applied:")
        print(f"  Duplicates removed: {self.stats['duplicates_removed']}")
        print(f"  Keywords renamed: {self.stats['keywords_renamed']}")
        print(f"  Keywords added: {self.stats['keywords_added']}")
        print(f"  Keywords removed: {self.stats['keywords_removed']}")
        print(f"  Cards overridden: {self.stats['cards_overridden']}")
        print(f"  Missing cards added: {self.stats['cards_added']}")
        
        return cards_data
    
    def generate_corrections_template(self, cards_data: Dict, output_file: str):
        """Generate a template corrections file with all card IDs."""
        cards = cards_data.get('cards', [])
        
        # Build template with placeholders
        template = {
            "_comment": "Malifaux 4E Card Corrections - Edit this file to fix parsing issues",
            "keyword_renames": {
                "_example_Witch Hunter": "Witch-Hunter",
                "_example_Big Hat": "Big-Hat"
            },
            "keyword_additions": {
                "_example_card-name": ["Missing-Keyword"]
            },
            "keyword_removals": {
                "_example_card-name": ["Wrong-Keyword"]
            },
            "card_overrides": {
                "_example_card-name": {
                    "cost": 5,
                    "health": 8
                }
            },
            "missing_cards": [
                {
                    "_comment": "Template for manually adding missing cards",
                    "id": "manual-example",
                    "name": "Example Card",
                    "faction": "Faction",
                    "subfaction": "Keyword",
                    "card_type": "Stat",
                    "keywords": ["Keyword"],
                    "characteristics": ["Minion"],
                    "cost": 5
                }
            ],
            "_all_card_ids": [card.get('id', card.get('name', '')) for card in cards]
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(template, f, indent=2, ensure_ascii=False)
        
        print(f"Generated corrections template: {output_file}")
        print(f"  Contains {len(cards)} card IDs for reference")


def main():
    parser = argparse.ArgumentParser(
        description='Apply corrections to Malifaux card data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python fix_cards.py --input cards_raw.json --output cards_fixed.json
  python fix_cards.py -i cards_raw.json -o cards_fixed.json -c corrections.json
  python fix_cards.py --generate-corrections cards_raw.json
        """
    )
    
    parser.add_argument('--input', '-i', help='Input JSON file (cards_raw.json)')
    parser.add_argument('--output', '-o', help='Output JSON file (cards_fixed.json)')
    parser.add_argument('--corrections', '-c', help='Corrections JSON file')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--generate-corrections', metavar='INPUT', 
                        help='Generate template corrections file from input')
    
    args = parser.parse_args()
    
    # Generate template mode
    if args.generate_corrections:
        with open(args.generate_corrections, 'r', encoding='utf-8') as f:
            cards_data = json.load(f)
        
        fixer = CardFixer()
        output = Path(args.generate_corrections).stem + '_corrections_template.json'
        fixer.generate_corrections_template(cards_data, output)
        return
    
    # Normal fix mode
    if not args.input or not args.output:
        parser.error("--input and --output are required")
    
    # Load input
    with open(args.input, 'r', encoding='utf-8') as f:
        cards_data = json.load(f)
    
    print(f"Loaded {cards_data.get('total_cards', len(cards_data.get('cards', [])))} cards from {args.input}")
    
    # Apply corrections
    fixer = CardFixer(corrections_file=args.corrections, verbose=args.verbose)
    fixed_data = fixer.fix_cards(cards_data)
    
    # Save output
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(fixed_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nWrote {fixed_data['total_cards']} cards to {args.output}")


if __name__ == '__main__':
    main()
