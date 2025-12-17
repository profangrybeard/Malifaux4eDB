#!/usr/bin/env python3
"""
Malifaux 4E Meta Enrichment Script

Adds Longshanks competitive meta data to cards and objectives.
This is a CLI wrapper that imports faction_meta.py data and applies it.

Usage:
    python enrich_meta.py --cards INPUT --output-cards OUTPUT [--objectives OBJ_IN --output-objectives OBJ_OUT]
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

# Add script's directory to path so we can import faction_meta
script_dir = Path(__file__).parent.resolve()
if str(script_dir) not in sys.path:
    sys.path.insert(0, str(script_dir))

# Try to import faction_meta data
try:
    from faction_meta import FACTION_DATA
except ImportError:
    # Fallback: define minimal data if faction_meta.py not available
    print("WARNING: faction_meta.py not found, using empty data")
    FACTION_DATA = {}


def normalize_faction_name(name: str) -> str:
    """Normalize faction name for lookup in FACTION_DATA."""
    if not name:
        return ""
    
    # Common normalizations
    mappings = {
        "Explorer's Society": "Explorers",
        "Explorers Society": "Explorers",
        "Explorer Society": "Explorers",
    }
    
    return mappings.get(name, name)


def normalize_scheme_name(name: str) -> str:
    """Normalize scheme name for lookup."""
    if not name:
        return ""
    return name.lower().replace(" ", "_").replace("'", "").replace("-", "_")


def normalize_strategy_name(name: str) -> str:
    """Normalize strategy name for lookup."""
    if not name:
        return ""
    return name.lower().replace(" ", "_").replace("'", "").replace("-", "_")


def enrich_card(card: dict) -> dict:
    """Add faction meta data to a card."""
    faction = card.get("faction", "")
    normalized_faction = normalize_faction_name(faction)
    
    if normalized_faction not in FACTION_DATA:
        return card
    
    faction_data = FACTION_DATA[normalized_faction]
    
    # Add faction-level meta
    card["faction_meta"] = {
        "overall_win_rate": faction_data["overall"]["win_rate"],
        "total_games": faction_data["overall"]["games"]
    }
    
    return card


def enrich_objective(objective: dict, obj_type: str) -> dict:
    """Add meta win rates to a scheme or strategy."""
    name = objective.get("name", "")
    
    if obj_type == "scheme":
        normalized_name = normalize_scheme_name(name)
        data_key = "schemes_chosen"
    else:  # strategy
        normalized_name = normalize_strategy_name(name)
        data_key = "strategies_m4e"
    
    # Collect win rates across all factions
    faction_rates = {}
    total_games = 0
    weighted_sum = 0
    
    for faction, data in FACTION_DATA.items():
        obj_data = data.get(data_key, {}).get(normalized_name)
        if obj_data:
            win_rate = obj_data["win_rate"]
            games = obj_data["games"]
            faction_rates[faction] = {
                "win_rate": win_rate,
                "games": games
            }
            total_games += games
            weighted_sum += win_rate * games
    
    if faction_rates:
        objective["meta"] = {
            "by_faction": faction_rates,
            "total_games": total_games,
            "average_win_rate": weighted_sum / total_games if total_games > 0 else 0.5
        }
    
    return objective


def enrich_cards(cards_data: dict) -> dict:
    """Enrich all cards with faction meta."""
    # Handle both list and {cards: [...]} formats
    if isinstance(cards_data, list):
        cards = cards_data
        wrapper = None
    else:
        cards = cards_data.get("cards", [])
        wrapper = cards_data
    
    enriched_cards = []
    for card in cards:
        enriched_cards.append(enrich_card(card))
    
    if wrapper:
        wrapper["cards"] = enriched_cards
        wrapper["enrichment_version"] = "meta_v1"
        wrapper["enriched_at"] = datetime.now().isoformat()
        return wrapper
    else:
        return enriched_cards


def enrich_objectives(obj_data: dict) -> dict:
    """Enrich all objectives with meta data."""
    result = dict(obj_data)
    
    # Enrich schemes
    if "schemes" in result:
        if isinstance(result["schemes"], dict):
            for scheme_id, scheme in result["schemes"].items():
                result["schemes"][scheme_id] = enrich_objective(scheme, "scheme")
        elif isinstance(result["schemes"], list):
            result["schemes"] = [enrich_objective(s, "scheme") for s in result["schemes"]]
    
    # Enrich strategies
    if "strategies" in result:
        if isinstance(result["strategies"], dict):
            for strat_id, strat in result["strategies"].items():
                result["strategies"][strat_id] = enrich_objective(strat, "strategy")
        elif isinstance(result["strategies"], list):
            result["strategies"] = [enrich_objective(s, "strategy") for s in result["strategies"]]
    
    result["enriched_at"] = datetime.now().isoformat()
    return result


def main():
    parser = argparse.ArgumentParser(description="Enrich Malifaux data with competitive meta")
    parser.add_argument("--cards", type=Path, required=True, help="Input cards JSON")
    parser.add_argument("--output-cards", type=Path, required=True, help="Output enriched cards JSON")
    parser.add_argument("--objectives", type=Path, help="Input objectives JSON")
    parser.add_argument("--output-objectives", type=Path, help="Output enriched objectives JSON")
    
    args = parser.parse_args()
    
    # Check faction data availability
    if not FACTION_DATA:
        print("WARNING: No faction meta data available")
    else:
        print(f"Loaded meta for {len(FACTION_DATA)} factions")
    
    # Load and enrich cards
    if not args.cards.exists():
        print(f"ERROR: Cards file not found: {args.cards}")
        return 1
    
    print(f"Loading {args.cards}...")
    with open(args.cards, 'r', encoding='utf-8') as f:
        cards_data = json.load(f)
    
    enriched_cards = enrich_cards(cards_data)
    
    # Count enriched
    cards_list = enriched_cards.get("cards", enriched_cards) if isinstance(enriched_cards, dict) else enriched_cards
    enriched_count = sum(1 for c in cards_list if c.get("faction_meta"))
    print(f"Enriched {enriched_count} cards with faction meta")
    
    print(f"Saving {args.output_cards}...")
    with open(args.output_cards, 'w', encoding='utf-8') as f:
        json.dump(enriched_cards, f, indent=2, ensure_ascii=False)
    
    # Load and enrich objectives if provided
    if args.objectives and args.output_objectives:
        if args.objectives.exists():
            print(f"Loading {args.objectives}...")
            with open(args.objectives, 'r', encoding='utf-8') as f:
                obj_data = json.load(f)
            
            enriched_obj = enrich_objectives(obj_data)
            
            # Count enriched
            schemes_with_meta = sum(1 for s in (enriched_obj.get("schemes", {}).values() 
                                                 if isinstance(enriched_obj.get("schemes"), dict) 
                                                 else enriched_obj.get("schemes", [])) 
                                    if isinstance(s, dict) and s.get("meta"))
            print(f"Enriched {schemes_with_meta} schemes with meta data")
            
            print(f"Saving {args.output_objectives}...")
            with open(args.output_objectives, 'w', encoding='utf-8') as f:
                json.dump(enriched_obj, f, indent=2, ensure_ascii=False)
        else:
            print(f"WARNING: Objectives file not found: {args.objectives}")
    
    print("[OK] Enrichment complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
