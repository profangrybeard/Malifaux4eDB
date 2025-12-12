#!/usr/bin/env python3
"""
Malifaux 4E Objective Card OCR Parser
Extracts structured data from Scheme and Strategy card images.

Handles both card types with automatic detection based on card footer.

Usage:
    python parse_objective_cards.py --input /path/to/card/images --output objectives.json
    python parse_objective_cards.py --single /path/to/card.png
"""

import json
import re
import argparse
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Union
import pytesseract
from PIL import Image


# ═══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ObjectiveCard:
    """
    Unified structure for both Scheme and Strategy cards.
    """
    id: str
    name: str
    card_type: str  # "scheme" or "strategy"
    max_vp: int = 2
    
    # Common sections
    setup_text: str = ""
    rules_text: str = ""           # Strategies have RULES section
    scoring_text: str = ""
    additional_vp_text: str = ""
    
    # Scheme-specific
    reveal_condition: str = ""
    next_available_schemes: List[str] = field(default_factory=list)
    
    # Strategy-specific
    uses_strategy_markers: bool = False
    marker_count: int = 0
    
    # Derived analysis tags
    requires_killing: bool = False
    requires_scheme_markers: bool = False
    requires_strategy_markers: bool = False
    requires_terrain: bool = False
    requires_positioning: bool = False
    requires_interact: bool = False
    target_type: Optional[str] = None
    
    # Crew recommendation tags
    favors_roles: List[str] = field(default_factory=list)
    favors_abilities: List[str] = field(default_factory=list)
    
    # Source tracking
    source_file: str = ""
    raw_text: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# UNIFIED CARD PARSER
# ═══════════════════════════════════════════════════════════════════════════════

class ObjectiveCardParser:
    """
    Parses Malifaux 4E objective cards (schemes and strategies) from images.
    
    Scheme Card Structure:
        - Name, Scored VP boxes
        - Setup text (italic)
        - REVEAL section
        - SCORING section  
        - ADDITIONAL VP section
        - NEXT AVAILABLE SCHEMES section
        - Footer: "Scheme"
    
    Strategy Card Structure:
        - Name, Scored VP boxes (usually 5)
        - SETUP section
        - RULES section
        - SCORING section
        - ADDITIONAL VP section
        - Footer: "Strategy"
    """
    
    # All possible section headers
    SECTION_MARKERS = [
        'SETUP',
        'REVEAL',
        'RULES',
        'SCORING',
        'ADDITIONAL VP',
        'NEXT AVAILABLE SCHEMES',
    ]
    
    def __init__(self):
        self.vp_pattern = re.compile(r'SCORED\s*VP[:\s]*([□LJ\[\]O0\s]+)', re.IGNORECASE)
    
    def parse_image(self, image_path: str) -> ObjectiveCard:
        """Parse an objective card image (scheme or strategy)."""
        img = Image.open(image_path)
        raw_text = pytesseract.image_to_string(img)
        
        # Detect card type from footer
        card_type = self._detect_card_type(raw_text)
        
        # Parse based on type
        card = self._parse_text(raw_text, card_type)
        card.source_file = str(image_path)
        card.raw_text = raw_text
        card.id = self._name_to_id(card.name)
        
        # Analyze requirements
        self._analyze_requirements(card)
        
        # Generate crew recommendations
        self._generate_recommendations(card)
        
        return card
    
    def _detect_card_type(self, text: str) -> str:
        """Detect if this is a scheme or strategy card."""
        text_lower = text.lower()
        
        # Check the footer - last line should be card type
        lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
        if lines:
            last_line = lines[-1].lower()
            if 'strategy' in last_line:
                return 'strategy'
            if 'scheme' in last_line:
                return 'scheme'
        
        # Fallback: check for type-specific sections
        if 'NEXT AVAILABLE SCHEMES' in text.upper():
            return 'scheme'
        if 'RULES' in text.upper() and 'SETUP' in text.upper():
            return 'strategy'
        
        # Default to scheme
        return 'scheme'
    
    def _parse_text(self, text: str, card_type: str) -> ObjectiveCard:
        """Parse OCR text into structured card data."""
        card = ObjectiveCard(id="", name="", card_type=card_type)
        
        lines = text.strip().split('\n')
        lines = [l.strip() for l in lines if l.strip()]
        
        # Find the card name (first substantial all-caps line)
        for line in lines:
            clean_line = line.upper().strip()
            # Skip section headers and card type
            if any(marker in clean_line for marker in self.SECTION_MARKERS):
                continue
            if clean_line in ['SCHEME', 'STRATEGY']:
                continue
            if 'SCORED' in clean_line:
                continue
            # Look for all-caps name (at least 4 chars)
            if line.isupper() and len(line) >= 4:
                card.name = line.title()
                break
        
        # Count VP boxes
        vp_match = self.vp_pattern.search(text)
        if vp_match:
            boxes = vp_match.group(1)
            # Count box-like characters
            box_count = len(re.findall(r'[□\[\]LJO]', boxes))
            if box_count > 0 and box_count <= 6:
                card.max_vp = box_count
            else:
                # Default based on card type
                card.max_vp = 5 if card_type == 'strategy' else 2
        else:
            card.max_vp = 5 if card_type == 'strategy' else 2
        
        # Split into sections
        sections = self._split_sections(text)
        
        # Extract sections based on card type
        if card_type == 'scheme':
            self._extract_scheme_sections(card, sections, text)
        else:
            self._extract_strategy_sections(card, sections)
        
        return card
    
    def _split_sections(self, text: str) -> Dict[str, str]:
        """Split text into sections based on headers."""
        sections = {}
        text_upper = text.upper()
        
        # Find positions of all section markers
        positions = []
        for marker in self.SECTION_MARKERS:
            pos = text_upper.find(marker)
            if pos != -1:
                positions.append((pos, marker))
        
        positions.sort(key=lambda x: x[0])
        
        # Extract each section's content
        for i, (pos, marker) in enumerate(positions):
            # Content starts after the marker line
            content_start = text.find('\n', pos)
            if content_start == -1:
                content_start = pos + len(marker)
            
            # Content ends at next section or end of text
            if i + 1 < len(positions):
                content_end = positions[i + 1][0]
            else:
                # Find "Scheme" or "Strategy" footer - look for standalone word at end
                # Split into lines and find last non-empty line that's just the type
                lines = text.split('\n')
                content_end = len(text)
                for line_idx in range(len(lines) - 1, -1, -1):
                    line = lines[line_idx].strip().lower()
                    if line in ['scheme', 'strategy']:
                        # Calculate position of this line
                        cumulative = 0
                        for j in range(line_idx):
                            cumulative += len(lines[j]) + 1  # +1 for newline
                        content_end = cumulative
                        break
            
            content = text[content_start:content_end].strip()
            # Clean up any trailing section headers that got included
            for m in self.SECTION_MARKERS:
                if content.upper().endswith(m):
                    content = content[:-len(m)].strip()
            
            sections[marker] = content
        
        return sections
    
    def _extract_scheme_sections(self, card: ObjectiveCard, sections: Dict[str, str], 
                                  full_text: str):
        """Extract scheme-specific sections."""
        # Setup text is before first section header
        text_upper = full_text.upper()
        first_section_pos = len(full_text)
        for marker in self.SECTION_MARKERS:
            pos = text_upper.find(marker)
            if pos != -1 and pos < first_section_pos:
                first_section_pos = pos
        
        # Find where scored VP line ends
        vp_match = self.vp_pattern.search(full_text)
        if vp_match:
            setup_start = vp_match.end()
            # Find the newline after VP
            newline_pos = full_text.find('\n', setup_start)
            if newline_pos != -1:
                setup_start = newline_pos
        else:
            # Find after name
            setup_start = 0
            for line in full_text.split('\n'):
                if line.strip().isupper() and len(line.strip()) >= 4:
                    setup_start = full_text.find(line) + len(line)
                    break
        
        if setup_start < first_section_pos:
            card.setup_text = full_text[setup_start:first_section_pos].strip()
        
        # Extract named sections
        if 'REVEAL' in sections:
            card.reveal_condition = sections['REVEAL']
        
        if 'SCORING' in sections:
            card.scoring_text = sections['SCORING']
        
        if 'ADDITIONAL VP' in sections:
            card.additional_vp_text = sections['ADDITIONAL VP']
        
        if 'NEXT AVAILABLE SCHEMES' in sections:
            next_text = sections['NEXT AVAILABLE SCHEMES']
            # Each line is a scheme name
            card.next_available_schemes = [
                line.strip() for line in next_text.split('\n')
                if line.strip() and line.strip().lower() not in ['scheme', 'strategy']
            ]
    
    def _extract_strategy_sections(self, card: ObjectiveCard, sections: Dict[str, str]):
        """Extract strategy-specific sections."""
        if 'SETUP' in sections:
            card.setup_text = sections['SETUP']
            
            # Check for strategy markers
            setup_lower = card.setup_text.lower()
            if 'strategy marker' in setup_lower:
                card.uses_strategy_markers = True
                # Try to find marker count
                count_match = re.search(r'(\w+)\s+strategy\s+marker', setup_lower)
                if count_match:
                    word = count_match.group(1)
                    word_to_num = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5}
                    if word in word_to_num:
                        card.marker_count = word_to_num[word]
                    elif word.isdigit():
                        card.marker_count = int(word)
        
        if 'RULES' in sections:
            card.rules_text = sections['RULES']
        
        if 'SCORING' in sections:
            card.scoring_text = sections['SCORING']
        
        if 'ADDITIONAL VP' in sections:
            card.additional_vp_text = sections['ADDITIONAL VP']
    
    def _name_to_id(self, name: str) -> str:
        """Convert card name to snake_case ID."""
        id_str = re.sub(r'[^a-zA-Z0-9\s]', '', name.lower())
        return re.sub(r'\s+', '_', id_str.strip())
    
    def _analyze_requirements(self, card: ObjectiveCard):
        """Analyze card text to determine gameplay requirements."""
        all_text = ' '.join([
            card.setup_text,
            card.reveal_condition,
            card.rules_text,
            card.scoring_text,
            card.additional_vp_text,
        ]).lower()
        
        # Killing requirements
        kill_words = ['kill', 'killed', 'slay', 'destroy', 'below half', 'dies']
        card.requires_killing = any(w in all_text for w in kill_words)
        
        # Scheme marker requirements
        card.requires_scheme_markers = 'scheme marker' in all_text
        
        # Strategy marker requirements
        card.requires_strategy_markers = 'strategy marker' in all_text
        
        # Terrain requirements
        terrain_words = ['terrain', 'height', 'rooftop', 'elevation', 'ht 2', 'ht 3']
        card.requires_terrain = any(w in all_text for w in terrain_words)
        
        # Positioning requirements
        position_words = ['deployment', 'centerline', 'center line', 'enemy half', 
                         'table half', 'table edge', 'within']
        card.requires_positioning = any(w in all_text for w in position_words)
        
        # Interact requirements
        card.requires_interact = 'interact' in all_text
        
        # Target type
        if 'unique' in all_text:
            card.target_type = 'unique'
        elif 'minion' in all_text:
            card.target_type = 'minion'
        elif 'master' in all_text:
            card.target_type = 'master'
        elif 'peon' in all_text:
            card.target_type = 'peon'
    
    def _generate_recommendations(self, card: ObjectiveCard):
        """Generate crew recommendation tags based on requirements."""
        roles = set()
        abilities = set()
        
        if card.requires_killing:
            roles.update(['beater', 'assassin', 'ranged_damage', 'melee_damage'])
            abilities.update(['bonus_damage', 'armor_piercing', 'irreducible'])
        
        if card.requires_scheme_markers:
            roles.add('scheme_runner')
            abilities.update(['dont_mind_me', 'place', 'leap'])
        
        if card.requires_strategy_markers:
            roles.update(['scheme_runner', 'utility'])
            abilities.add('interact')
        
        if card.requires_terrain:
            roles.add('scheme_runner')
            abilities.update(['flight', 'leap', 'unimpeded'])
        
        if card.requires_positioning:
            roles.update(['scheme_runner', 'tank'])
            abilities.update(['place', 'push', 'incorporeal'])
        
        if card.requires_interact:
            roles.add('scheme_runner')
            abilities.add('dont_mind_me')
        
        # Strategy-specific: marker control often needs tanky models
        if card.card_type == 'strategy' and card.uses_strategy_markers:
            roles.update(['tank', 'tarpit'])
        
        card.favors_roles = sorted(list(roles))
        card.favors_abilities = sorted(list(abilities))


# ═══════════════════════════════════════════════════════════════════════════════
# BATCH PROCESSOR
# ═══════════════════════════════════════════════════════════════════════════════

class ObjectiveCardBatchProcessor:
    """Process directories of objective card images."""
    
    def __init__(self):
        self.parser = ObjectiveCardParser()
    
    def process_directory(self, input_dir: str, recursive: bool = True) -> List[ObjectiveCard]:
        """Process all card images in a directory (and subdirectories if recursive)."""
        input_path = Path(input_dir)
        results = []
        
        # Find all image files (recursive with ** or flat)
        patterns = ['*.png', '*.jpg', '*.jpeg', '*.PNG', '*.JPG', '*.JPEG']
        image_files = []
        for pattern in patterns:
            if recursive:
                image_files.extend(input_path.rglob(pattern))  # recursive
            else:
                image_files.extend(input_path.glob(pattern))   # flat
        
        # Filter to only front images (skip backs)
        image_files = [f for f in image_files if '_back' not in f.name.lower()]
        
        print(f"Found {len(image_files)} card images in {input_dir}")
        
        for img_path in sorted(image_files):
            print(f"  Parsing: {img_path.name}", end=" ... ")
            try:
                card = self.parser.parse_image(str(img_path))
                results.append(card)
                print(f"OK {card.card_type}: {card.name}")
            except Exception as e:
                print(f"FAIL ERROR: {e}")
        
        return results
    
    def process_multiple_directories(self, dirs: List[str]) -> List[ObjectiveCard]:
        """Process multiple directories."""
        all_cards = []
        for d in dirs:
            if Path(d).exists():
                cards = self.process_directory(d)
                all_cards.extend(cards)
        return all_cards
    
    def export_json(self, cards: List[ObjectiveCard], output_path: str):
        """Export parsed cards to JSON."""
        # Separate schemes and strategies
        schemes = {c.id: asdict(c) for c in cards if c.card_type == 'scheme'}
        strategies = {c.id: asdict(c) for c in cards if c.card_type == 'strategy'}
        
        data = {
            'version': '1.0.0',
            'source': 'ocr_extracted',
            'scheme_count': len(schemes),
            'strategy_count': len(strategies),
            'schemes': schemes,
            'strategies': strategies,
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\nExported {len(schemes)} schemes and {len(strategies)} strategies to {output_path}")
    
    def print_summary(self, cards: List[ObjectiveCard]):
        """Print a summary of parsed cards."""
        schemes = [c for c in cards if c.card_type == 'scheme']
        strategies = [c for c in cards if c.card_type == 'strategy']
        
        print("\n" + "=" * 60)
        print("PARSING SUMMARY")
        print("=" * 60)
        
        print(f"\nSchemes ({len(schemes)}):")
        for s in schemes:
            branches = ', '.join(s.next_available_schemes) if s.next_available_schemes else 'N/A'
            print(f"  • {s.name} (-> {branches})")
        
        print(f"\nStrategies ({len(strategies)}):")
        for s in strategies:
            markers = f" [{s.marker_count} markers]" if s.uses_strategy_markers else ""
            print(f"  • {s.name} (max {s.max_vp} VP){markers}")


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def print_card_details(card: ObjectiveCard):
    """Pretty print card details."""
    print("\n" + "=" * 60)
    print(f"{card.card_type.upper()}: {card.name}")
    print("=" * 60)
    
    print(f"ID: {card.id}")
    print(f"Max VP: {card.max_vp}")
    
    if card.setup_text:
        setup_preview = card.setup_text[:150] + "..." if len(card.setup_text) > 150 else card.setup_text
        print(f"\nSetup: {setup_preview}")
    
    if card.card_type == 'scheme':
        if card.reveal_condition:
            print(f"\nReveal: {card.reveal_condition}")
        if card.next_available_schemes:
            print(f"\nNext Schemes: {card.next_available_schemes}")
    else:
        if card.rules_text:
            rules_preview = card.rules_text[:150] + "..." if len(card.rules_text) > 150 else card.rules_text
            print(f"\nRules: {rules_preview}")
        if card.uses_strategy_markers:
            print(f"\nStrategy Markers: {card.marker_count}")
    
    if card.scoring_text:
        print(f"\nScoring: {card.scoring_text[:200]}...")
    
    if card.additional_vp_text:
        print(f"\nAdditional VP: {card.additional_vp_text}")
    
    print("\n--- Analysis ---")
    print(f"Requires Killing: {card.requires_killing}")
    print(f"Requires Scheme Markers: {card.requires_scheme_markers}")
    print(f"Requires Strategy Markers: {card.requires_strategy_markers}")
    print(f"Requires Terrain: {card.requires_terrain}")
    print(f"Requires Positioning: {card.requires_positioning}")
    print(f"Target Type: {card.target_type or 'any'}")
    
    print("\n--- Crew Recommendations ---")
    print(f"Favored Roles: {', '.join(card.favors_roles) or 'none'}")
    print(f"Favored Abilities: {', '.join(card.favors_abilities) or 'none'}")


def main():
    parser = argparse.ArgumentParser(
        description='Malifaux 4E Objective Card OCR Parser',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Parse a single card
  python parse_objective_cards.py --single card.png
  
  # Parse all cards in a directory
  python parse_objective_cards.py --input ./cards --output objectives.json
  
  # Parse schemes and strategies from separate directories
  python parse_objective_cards.py --input "./Scheme Cards" --input "./Strategy Cards" -o all.json
        """
    )
    
    parser.add_argument('--single', '-s', help='Parse a single card image')
    parser.add_argument('--input', '-i', action='append', help='Input directory (can specify multiple)')
    parser.add_argument('--output', '-o', default='objectives.json', help='Output JSON file')
    parser.add_argument('--no-recursive', action='store_true', help='Do not scan subdirectories')
    parser.add_argument('--summary', action='store_true', help='Print summary after parsing')
    
    args = parser.parse_args()
    
    processor = ObjectiveCardBatchProcessor()
    cards = []
    
    if args.single:
        print(f"Parsing: {args.single}")
        card = processor.parser.parse_image(args.single)
        cards.append(card)
        print_card_details(card)
    
    if args.input:
        for input_dir in args.input:
            if Path(input_dir).exists():
                dir_cards = processor.process_directory(input_dir, recursive=not args.no_recursive)
                cards.extend(dir_cards)
            else:
                print(f"Warning: Directory not found: {input_dir}")
    
    if cards:
        processor.export_json(cards, args.output)
        
        if args.summary or args.single:
            processor.print_summary(cards)
    
    if not args.single and not args.input:
        parser.print_help()


if __name__ == '__main__':
    main()
