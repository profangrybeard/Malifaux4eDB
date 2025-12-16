#!/usr/bin/env python3
"""
Malifaux Card Extraction using Claude Vision API (v3 - Path-Aware)
===================================================================
Extracts card data from front+back images, using folder structure for
faction/keyword metadata and validation.

Expected folder structure:
  {root}/
    {Faction}/
      {Keyword}/
        M4E_{CardType}_{Keyword}_{CardName}_front.png
        M4E_{CardType}_{Keyword}_{CardName}_back.png

Example:
  images/Arcanists/Academic/M4E_Stat_Academic_Banasuva_front.png

Usage:
    export ANTHROPIC_API_KEY='your-key'
    python extract_cards_vision_v3.py -i ./Malifaux4eDB-images -o cards.json
"""

import anthropic
import base64
import json
import os
import sys
import time
import re
from pathlib import Path
from typing import Optional, Tuple, List, Dict, NamedTuple
from dataclasses import dataclass, field
import argparse

# Card types we care about
VALID_CARD_TYPES = {'Stat', 'Crew', 'Upgrade'}

# Known factions for validation
KNOWN_FACTIONS = {
    'Arcanists', 'Bayou', "Explorer's Society", 'Guild', 
    'Neverborn', 'Outcasts', 'Resurrectionists', 'Ten Thunders'
}

@dataclass
class CardPair:
    """Represents a front+back card image pair with path metadata."""
    # From path/filename
    faction: str
    keyword: str
    card_type: str
    card_name: str
    
    # File paths
    front_path: Path
    back_path: Optional[Path] = None
    
    # Unique identifier
    @property
    def id(self) -> str:
        return f"{self.faction}_{self.keyword}_{self.card_name}".replace(' ', '_')

def parse_card_path(file_path: Path, root_dir: Path) -> Optional[CardPair]:
    """
    Parse a card image path to extract metadata.
    
    Expected: {root}/{Faction}/{Keyword}/M4E_{Type}_{Keyword}_{Name}_{side}.png
    """
    try:
        # Get relative path from root
        rel_path = file_path.relative_to(root_dir)
        parts = rel_path.parts
        
        if len(parts) < 3:
            return None
        
        faction = parts[0]
        keyword = parts[1]
        filename = parts[-1]
        
        # Skip non-image files
        if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            return None
        
        # Parse filename: M4E_{Type}_{Keyword}_{Name}_{side}.png
        # Remove extension
        name_part = file_path.stem
        
        # Check for front/back
        is_front = name_part.lower().endswith('_front')
        is_back = name_part.lower().endswith('_back')
        
        if not (is_front or is_back):
            return None
        
        # Remove _front or _back suffix
        name_part = re.sub(r'_(front|back)$', '', name_part, flags=re.IGNORECASE)
        
        # Parse: M4E_{Type}_{Keyword}_{Name}
        match = re.match(r'^M4E_(\w+)_([^_]+(?:_[^_]+)?)_(.+)$', name_part)
        if not match:
            # Try simpler pattern
            match = re.match(r'^M4E_(\w+)_(\w+)_(.+)$', name_part)
        
        if not match:
            return None
        
        card_type = match.group(1)
        file_keyword = match.group(2)
        card_name = match.group(3).replace('_', ' ')
        
        # Validate card type
        if card_type not in VALID_CARD_TYPES:
            return None
        
        return CardPair(
            faction=faction,
            keyword=keyword,  # Use folder keyword (more reliable)
            card_type=card_type,
            card_name=card_name,
            front_path=file_path if is_front else None,
            back_path=file_path if is_back else None
        )
        
    except Exception as e:
        print(f"  Warning: Could not parse {file_path}: {e}")
        return None

def find_card_pairs(root_dir: str, card_type_filter: Optional[str] = None) -> List[CardPair]:
    """Find and match front/back card pairs from folder structure."""
    root = Path(root_dir)
    
    # Dictionary to collect pairs by ID
    pairs_dict: Dict[str, CardPair] = {}
    
    # Walk through all files
    for file_path in root.rglob('*'):
        if not file_path.is_file():
            continue
        
        parsed = parse_card_path(file_path, root)
        if not parsed:
            continue
        
        # Filter by card type if specified
        if card_type_filter and parsed.card_type != card_type_filter:
            continue
        
        # Merge with existing or create new
        pair_id = parsed.id
        if pair_id in pairs_dict:
            # Update existing pair with this side
            existing = pairs_dict[pair_id]
            if parsed.front_path:
                existing.front_path = parsed.front_path
            if parsed.back_path:
                existing.back_path = parsed.back_path
        else:
            pairs_dict[pair_id] = parsed
    
    # Filter to only pairs with at least a front
    valid_pairs = [p for p in pairs_dict.values() if p.front_path is not None]
    
    return sorted(valid_pairs, key=lambda x: (x.faction, x.keyword, x.card_name))

def encode_image(image_path: str) -> Tuple[str, str]:
    """Read and base64 encode an image file."""
    suffix = Path(image_path).suffix.lower()
    media_type = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
    }.get(suffix, 'image/png')
    
    with open(image_path, 'rb') as f:
        data = base64.standard_b64encode(f.read()).decode('utf-8')
    
    return data, media_type

# Extraction prompt with validation hints
EXTRACTION_PROMPT_TEMPLATE = """You are looking at the FRONT and BACK of a Malifaux game card.

**EXPECTED VALUES (from file path - use for validation):**
- Faction: {faction}
- Keyword: {keyword}
- Card Name: {card_name}
- Card Type: {card_type}

FRONT IMAGE shows:
- Card name, Cost (top right, "-" for totems)
- Defense/DF, Speed/SP, Willpower/WP, Size/SZ
- Health track (count numbered circles)
- Characteristics (curved text)
- Keyword (after bullet point)
- Abilities

BACK IMAGE shows:
- Attack Actions (Rg, Skl, Rst, TN, Dmg)
- Tactical Actions  
- Triggers (with suit symbols)
- Base size (bottom)

Extract into this JSON (return ONLY valid JSON, no markdown):

{{
  "name": "{card_name}",
  "faction": "{faction}",
  "keywords": ["{keyword}"],
  "card_type": "{card_type}",
  "cost": null,
  "defense": 5,
  "speed": 6,
  "willpower": 5,
  "size": 2,
  "health": 9,
  "base_size": "30mm|40mm|50mm",
  "characteristics": ["Totem", "Unique", "Living"],
  "abilities": [
    {{
      "name": "Ability Name",
      "type": "passive|defensive|demise",
      "description": "Exact ability text"
    }}
  ],
  "attack_actions": [
    {{
      "name": "Attack Name",
      "type": "melee|ranged|spell",
      "range": "2\\"",
      "skill": 6,
      "resist": "Df|Wp|Mv",
      "tn": null,
      "damage": "2/3/4",
      "description": "Effect text",
      "triggers": [
        {{
          "suit": "Crow|Ram|Mask|Tome",
          "name": "Trigger Name", 
          "effect": "Effect text"
        }}
      ]
    }}
  ],
  "tactical_actions": [
    {{
      "name": "Action Name",
      "action_type": "bonus|free|standard",
      "range": "aura 3\\"",
      "tn": 5,
      "description": "Action text",
      "triggers": []
    }}
  ],
  "hireable": true
}}

RULES:
- Use the EXPECTED VALUES above as defaults, but override if card shows different
- Stats are NUMBERS only
- Cost "-" = null (totems)
- Suits: ♣=Crow, ♦=Ram, ♠=Mask, ♥=Tome  
- "B" in damage = Blast
- hireable: false for Totems/Masters
- Copy ability text exactly as shown
"""

def extract_card_pair(
    client: anthropic.Anthropic, 
    pair: CardPair, 
    model: str = "claude-sonnet-4-20250514"
) -> dict:
    """Extract card data from front+back image pair."""
    
    content = []
    
    # Add front image
    if pair.front_path:
        front_data, front_type = encode_image(str(pair.front_path))
        content.append({"type": "text", "text": "FRONT OF CARD:"})
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": front_type, "data": front_data}
        })
    
    # Add back image
    if pair.back_path:
        back_data, back_type = encode_image(str(pair.back_path))
        content.append({"type": "text", "text": "BACK OF CARD:"})
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": back_type, "data": back_data}
        })
    else:
        content.append({"type": "text", "text": "(No back image - extract from front only)"})
    
    # Add extraction prompt with expected values
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(
        faction=pair.faction,
        keyword=pair.keyword,
        card_name=pair.card_name,
        card_type=pair.card_type
    )
    content.append({"type": "text", "text": prompt})
    
    message = client.messages.create(
        model=model,
        max_tokens=4096,
        messages=[{"role": "user", "content": content}]
    )
    
    response_text = message.content[0].text.strip()
    
    # Strip markdown code blocks
    if response_text.startswith('```'):
        lines = response_text.split('\n')
        response_text = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
    
    try:
        card_data = json.loads(response_text)
        
        # Add source metadata
        card_data['_source'] = {
            'front': pair.front_path.name if pair.front_path else None,
            'back': pair.back_path.name if pair.back_path else None,
            'path_faction': pair.faction,
            'path_keyword': pair.keyword,
            'path_card_type': pair.card_type
        }
        card_data['_extraction_model'] = model
        
        # Validation flags
        card_data['_validation'] = {
            'faction_match': card_data.get('faction') == pair.faction,
            'keyword_match': pair.keyword in card_data.get('keywords', []),
            'name_match': card_data.get('name', '').lower() == pair.card_name.lower()
        }
        
        return card_data
        
    except json.JSONDecodeError as e:
        return {
            '_error': f'JSON parse error: {e}',
            '_raw_response': response_text[:1000],
            '_source': {
                'front': pair.front_path.name if pair.front_path else None,
                'back': pair.back_path.name if pair.back_path else None,
            }
        }

def process_batch(
    input_dir: str, 
    output_file: str, 
    model: str, 
    card_type: Optional[str] = None,
    limit: Optional[int] = None, 
    resume: bool = True
):
    """Process all card pairs."""
    
    client = anthropic.Anthropic()
    
    # Find all card pairs
    pairs = find_card_pairs(input_dir, card_type_filter=card_type)
    
    if limit:
        pairs = pairs[:limit]
    
    # Summary
    print(f"{'='*60}")
    print(f"Malifaux Card Extraction v3 - Path Aware")
    print(f"{'='*60}")
    print(f"Input directory: {input_dir}")
    print(f"Found {len(pairs)} card pairs")
    
    # Breakdown by faction
    by_faction = {}
    for p in pairs:
        by_faction[p.faction] = by_faction.get(p.faction, 0) + 1
    print(f"\nBy faction:")
    for faction, count in sorted(by_faction.items()):
        print(f"  {faction}: {count}")
    
    # Breakdown by type
    by_type = {}
    for p in pairs:
        by_type[p.card_type] = by_type.get(p.card_type, 0) + 1
    print(f"\nBy card type:")
    for ctype, count in sorted(by_type.items()):
        print(f"  {ctype}: {count}")
    
    complete = sum(1 for p in pairs if p.back_path)
    print(f"\nComplete pairs (front+back): {complete}")
    print(f"Front only: {len(pairs) - complete}")
    print(f"{'='*60}\n")
    
    # Load existing results if resuming
    existing_results = {}
    if resume and os.path.exists(output_file):
        with open(output_file, 'r') as f:
            data = json.load(f)
            for c in data:
                src = c.get('_source', {})
                if src.get('front'):
                    existing_results[src['front']] = c
        print(f"Loaded {len(existing_results)} existing results\n")
    
    results = list(existing_results.values())
    errors = []
    
    for i, pair in enumerate(pairs):
        front_name = pair.front_path.name if pair.front_path else 'unknown'
        
        # Skip if already processed
        if front_name in existing_results:
            print(f"[{i+1}/{len(pairs)}] Skipping {pair.card_name} (cached)")
            continue
        
        back_status = "✓" if pair.back_path else "front-only"
        print(f"[{i+1}/{len(pairs)}] {pair.faction}/{pair.keyword}/{pair.card_name} ({back_status})")
        
        try:
            card_data = extract_card_pair(client, pair, model)
            
            if '_error' in card_data:
                print(f"  ⚠ Error: {card_data['_error'][:50]}...")
                errors.append(card_data)
            else:
                # Show validation status
                val = card_data.get('_validation', {})
                issues = [k for k, v in val.items() if not v]
                if issues:
                    print(f"  ⚠ Validation: {', '.join(issues)}")
                else:
                    print(f"  ✓ OK: Df:{card_data.get('defense')} Sp:{card_data.get('speed')} HP:{card_data.get('health')}")
            
            results.append(card_data)
            
            # Save progress every 10 cards
            if (i + 1) % 10 == 0:
                with open(output_file, 'w') as f:
                    json.dump(results, f, indent=2)
                print(f"  [Progress saved: {len(results)} cards]\n")
            
            time.sleep(0.5)
            
        except anthropic.RateLimitError:
            print("  ⚠ Rate limited, waiting 60s...")
            time.sleep(60)
            try:
                card_data = extract_card_pair(client, pair, model)
                results.append(card_data)
            except Exception as e:
                errors.append({'_error': str(e), '_source': {'front': front_name}})
            
        except Exception as e:
            print(f"  ✗ Error: {e}")
            errors.append({'_error': str(e), '_source': {'front': front_name}})
    
    # Final save
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"COMPLETE")
    print(f"{'='*60}")
    print(f"Total processed: {len(results)}")
    print(f"Errors: {len(errors)}")
    print(f"Output: {output_file}")
    
    # Validation summary
    valid_results = [r for r in results if '_validation' in r]
    if valid_results:
        faction_match = sum(1 for r in valid_results if r['_validation'].get('faction_match'))
        keyword_match = sum(1 for r in valid_results if r['_validation'].get('keyword_match'))
        name_match = sum(1 for r in valid_results if r['_validation'].get('name_match'))
        print(f"\nValidation:")
        print(f"  Faction match: {faction_match}/{len(valid_results)}")
        print(f"  Keyword match: {keyword_match}/{len(valid_results)}")
        print(f"  Name match: {name_match}/{len(valid_results)}")
    
    if errors:
        error_file = output_file.replace('.json', '_errors.json')
        with open(error_file, 'w') as f:
            json.dump(errors, f, indent=2)
        print(f"Errors saved: {error_file}")

def main():
    parser = argparse.ArgumentParser(
        description='Extract Malifaux cards using Claude Vision (v3 - Path Aware)'
    )
    parser.add_argument('--input-dir', '-i', default='./Malifaux4eDB-images',
                        help='Root directory of card images')
    parser.add_argument('--output', '-o', default='cards_extracted.json',
                        help='Output JSON file')
    parser.add_argument('--model', '-m', default='claude-sonnet-4-20250514',
                        choices=['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-3-5-20241022'],
                        help='Claude model')
    parser.add_argument('--card-type', '-t', choices=['Stat', 'Crew', 'Upgrade'],
                        help='Filter by card type')
    parser.add_argument('--limit', '-l', type=int,
                        help='Limit cards to process')
    parser.add_argument('--no-resume', action='store_true',
                        help='Start fresh')
    parser.add_argument('--list', action='store_true',
                        help='List detected pairs and exit')
    parser.add_argument('--faction', '-f',
                        help='Filter by faction name')
    
    args = parser.parse_args()
    
    if args.list:
        pairs = find_card_pairs(args.input_dir, args.card_type)
        if args.faction:
            pairs = [p for p in pairs if p.faction.lower() == args.faction.lower()]
        
        print(f"Found {len(pairs)} card pairs:\n")
        current_faction = None
        current_keyword = None
        for p in pairs:
            if p.faction != current_faction:
                current_faction = p.faction
                print(f"\n=== {current_faction} ===")
                current_keyword = None
            if p.keyword != current_keyword:
                current_keyword = p.keyword
                print(f"  [{current_keyword}]")
            back = "✓" if p.back_path else "✗"
            print(f"    {p.card_name} ({p.card_type}) [back:{back}]")
        return
    
    if not os.environ.get('ANTHROPIC_API_KEY'):
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)
    
    if not os.path.isdir(args.input_dir):
        print(f"Error: '{args.input_dir}' not found")
        sys.exit(1)
    
    process_batch(
        input_dir=args.input_dir,
        output_file=args.output,
        model=args.model,
        card_type=args.card_type,
        limit=args.limit,
        resume=not args.no_resume
    )

if __name__ == '__main__':
    main()
