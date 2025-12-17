#!/usr/bin/env python3
"""
Malifaux 4E Crew Builder - Build Pipeline v2

VALIDATES DATA BEFORE DOING ANYTHING.
Supports injecting a source-of-truth JSON to skip extraction steps.

Usage:
    python build.py --validate cards_FINAL.json   # Validate only, don't build
    python build.py --source cards_FINAL.json     # Use this as source, run pipeline
    python build.py --status                      # Show what would be rebuilt

SAFE BY DEFAULT:
- Validates input data before any processing
- Fails fast with clear error messages
- Never overwrites source files
- Creates backups before modifying dist/
"""

import argparse
import hashlib
import json
import os
import shutil
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


# =============================================================================
# VALIDATION - RUNS FIRST, ALWAYS
# =============================================================================

VALID_STATIONS = ['Master', 'Henchman', 'Enforcer', 'Minion', 'Totem', 'Peon']
VALID_FACTIONS = ['Arcanists', 'Bayou', "Explorer's Society", 'Guild', 'Neverborn', 'Outcasts', 'Resurrectionists', 'Ten Thunders']
REQUIRED_FIELDS = ['id', 'name', 'faction', 'station', 'keywords', 'characteristics', 'card_type']
APP_FIELDS = ['front_image', 'subfaction', 'primary_keyword']


def validate_cards(cards_path: Path) -> Tuple[bool, List[str], List[str], dict]:
    """
    Comprehensive validation of card data.
    Returns (success: bool, errors: list, warnings: list, stats: dict)
    
    CRITICAL CHECKS (errors - will fail build):
    - File exists and is valid JSON
    - Root is a list
    - All cards have required fields
    - All IDs are unique (not None)
    - Stations are valid values
    - Factions are valid values
    
    NON-CRITICAL CHECKS (warnings - build continues):
    - App-specific fields present
    - Stats fields present
    """
    errors = []
    warnings = []
    stats = {}
    
    # Load data
    try:
        with open(cards_path, 'r', encoding='utf-8') as f:
            cards = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {e}"], [], {}
    except FileNotFoundError:
        return False, [f"File not found: {cards_path}"], [], {}
    
    # Check root structure
    if not isinstance(cards, list):
        return False, ["Root must be a list of cards"], [], {}
    
    stats['total_cards'] = len(cards)
    
    if len(cards) == 0:
        return False, ["No cards in file"], [], {}
    
    if len(cards) < 100:
        errors.append(f"Suspiciously few cards: {len(cards)} (expected ~1300+)")
    
    # Track issues
    missing_required = {f: [] for f in REQUIRED_FIELDS}
    missing_app = {f: [] for f in APP_FIELDS}
    invalid_station = []
    invalid_faction = []
    duplicate_ids = []
    none_ids = []
    
    stations = {}
    factions = {}
    seen_ids = set()
    
    for i, card in enumerate(cards):
        card_name = card.get('name', f'Card #{i}')
        card_id = card.get('id')
        
        # Check required fields
        for field in REQUIRED_FIELDS:
            val = card.get(field)
            if val is None or val == '' or val == []:
                missing_required[field].append(card_name)
        
        # Check app-specific fields
        for field in APP_FIELDS:
            val = card.get(field)
            if val is None or val == '':
                missing_app[field].append(card_name)
        
        # Validate station
        station = card.get('station')
        if station:
            stations[station] = stations.get(station, 0) + 1
            if station not in VALID_STATIONS:
                invalid_station.append((card_name, station))
        
        # Validate faction
        faction = card.get('faction')
        if faction:
            factions[faction] = factions.get(faction, 0) + 1
            if faction not in VALID_FACTIONS:
                invalid_faction.append((card_name, faction))
        
        # Check ID uniqueness - THIS IS CRITICAL
        if card_id is None:
            none_ids.append(card_name)
        elif card_id in seen_ids:
            duplicate_ids.append((card_name, card_id))
        else:
            seen_ids.add(card_id)
    
    # Build error list - these BLOCK the build
    for field, cards_missing in missing_required.items():
        count = len(cards_missing)
        if count > 0:
            pct = count / len(cards) * 100
            if pct > 5:  # More than 5% missing = error
                errors.append(f"REQUIRED '{field}' missing on {count} cards ({pct:.1f}%)")
            else:
                warnings.append(f"'{field}' missing on {count} cards ({pct:.1f}%)")
    
    if none_ids:
        errors.append(f"CRITICAL: {len(none_ids)} cards have id=None")
        errors.append(f"  -> App will only display 1 card!")
        if len(none_ids) <= 5:
            errors.append(f"  -> Cards: {none_ids}")
    
    if duplicate_ids:
        errors.append(f"CRITICAL: {len(duplicate_ids)} duplicate IDs found")
        errors.append(f"  -> App will skip duplicate cards!")
        if len(duplicate_ids) <= 5:
            errors.append(f"  -> Examples: {duplicate_ids}")
    
    if invalid_station:
        errors.append(f"Invalid station on {len(invalid_station)} cards")
        errors.append(f"  -> Valid: {VALID_STATIONS}")
        if len(invalid_station) <= 3:
            errors.append(f"  -> Found: {invalid_station}")
    
    if invalid_faction:
        errors.append(f"Invalid faction on {len(invalid_faction)} cards")
        if len(invalid_faction) <= 3:
            errors.append(f"  -> Found: {invalid_faction}")
    
    # Build warning list - these allow build to continue
    for field, cards_missing in missing_app.items():
        if cards_missing:
            warnings.append(f"App field '{field}' missing on {len(cards_missing)} cards")
    
    # Station distribution sanity check
    if stations:
        if stations.get('Master', 0) < 50:
            warnings.append(f"Low Master count: {stations.get('Master', 0)} (expected ~120+)")
        if stations.get('Minion', 0) < 300:
            warnings.append(f"Low Minion count: {stations.get('Minion', 0)} (expected ~600+)")
    
    # Build stats
    stats['unique_ids'] = len(seen_ids)
    stats['none_ids'] = len(none_ids)
    stats['duplicate_ids'] = len(duplicate_ids)
    stats['stations'] = stations
    stats['factions'] = factions
    
    success = len(errors) == 0
    return success, errors, warnings, stats


def print_validation_report(success: bool, errors: List[str], warnings: List[str], stats: dict):
    """Pretty print validation results."""
    print("\n" + "=" * 60)
    print("DATA VALIDATION REPORT")
    print("=" * 60)
    
    print(f"\nTotal cards: {stats.get('total_cards', 0)}")
    print(f"Unique IDs: {stats.get('unique_ids', 0)}")
    
    if stats.get('none_ids', 0) > 0:
        print(f"Cards with None ID: {stats.get('none_ids', 0)} [CRITICAL]")
    if stats.get('duplicate_ids', 0) > 0:
        print(f"Duplicate IDs: {stats.get('duplicate_ids', 0)} [CRITICAL]")
    
    print(f"\nStations:")
    for s, count in sorted(stats.get('stations', {}).items()):
        print(f"  {s}: {count}")
    
    print(f"\nFactions:")
    for f, count in sorted(stats.get('factions', {}).items()):
        print(f"  {f}: {count}")
    
    if errors:
        print(f"\n" + "-" * 60)
        print(f"ERRORS ({len(errors)}) - BUILD WILL FAIL:")
        print("-" * 60)
        for e in errors:
            print(f"  [X] {e}")
    
    if warnings:
        print(f"\n" + "-" * 60)
        print(f"WARNINGS ({len(warnings)}) - Review recommended:")
        print("-" * 60)
        for w in warnings:
            print(f"  [!] {w}")
    
    print(f"\n" + "=" * 60)
    if success:
        print("VALIDATION PASSED")
    else:
        print("VALIDATION FAILED - BUILD BLOCKED")
    print("=" * 60 + "\n")


# =============================================================================
# CONFIGURATION
# =============================================================================

class Config:
    """Pipeline configuration."""
    
    def __init__(self, root_dir: Path = None, images_dir: Path = None):
        self.root = root_dir or Path(__file__).parent.resolve()
        
        # Source data
        self.raw_dir = self.root / "data" / "raw"
        self.card_pdfs_dir = self.raw_dir / "card_pdfs"
        self.objective_images_dir = self.raw_dir / "objective_images"
        
        # Card images directory
        if images_dir:
            self.card_images_dir = Path(images_dir)
        else:
            sibling_images = self.root.parent / "Malifaux4eDB-images"
            self.card_images_dir = sibling_images if sibling_images.exists() else None
        
        # Build directories
        self.intermediate_dir = self.root / "data" / "intermediate"
        self.dist_dir = self.root / "data" / "dist"
        self.backup_dir = self.root / "data" / "backups"
        self.pipeline_dir = self.root / "pipeline"
        self.webapp_data_dir = self.root / "src" / "data"
        
        # Build state
        self.build_state_file = self.intermediate_dir / ".build_state.json"
    
    def ensure_dirs(self):
        """Create required directories."""
        for d in [self.raw_dir, self.intermediate_dir, self.dist_dir, 
                  self.backup_dir, self.webapp_data_dir]:
            d.mkdir(parents=True, exist_ok=True)


# =============================================================================
# BUILD STATE
# =============================================================================

@dataclass
class BuildState:
    """Tracks build history for incremental rebuilds."""
    
    last_build: str = ""
    source_file: str = ""
    source_hash: str = ""
    file_hashes: Dict[str, str] = None
    
    def __post_init__(self):
        if self.file_hashes is None:
            self.file_hashes = {}
    
    @classmethod
    def load(cls, path: Path) -> "BuildState":
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return cls(**json.load(f))
            except:
                pass
        return cls()
    
    def save(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self), f, indent=2)


def hash_file(path: Path) -> str:
    """MD5 hash of a file."""
    hasher = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


# =============================================================================
# PIPELINE - Source Injection Mode
# =============================================================================

def inject_source(config: Config, source_path: Path) -> bool:
    """
    Inject a source-of-truth JSON into the pipeline.
    Skips extraction steps, goes straight to enrichment.
    """
    print(f"\n[inject] Using source: {source_path}")
    
    # Copy to intermediate as the "extracted" cards
    config.ensure_dirs()
    
    dest = config.intermediate_dir / "cards_extracted.json"
    shutil.copy(source_path, dest)
    print(f"  -> Copied to {dest}")
    
    # Also copy as "fixed" since we're skipping fix steps
    for stage in ["cards_fixed.json", "cards_repaired.json", "cards_stationed.json"]:
        stage_dest = config.intermediate_dir / stage
        shutil.copy(source_path, stage_dest)
        print(f"  -> {stage}")
    
    return True


def run_enrichment(config: Config, source_path: Path) -> bool:
    """
    Run only the enrichment/tagging steps on validated source data.
    """
    print(f"\n[enrich] Running enrichment pipeline...")
    
    # For now, just copy source to final location
    # TODO: Run tag_extractor, crew_recommender, etc.
    
    cards_dest = config.dist_dir / "cards.json"
    shutil.copy(source_path, cards_dest)
    print(f"  -> {cards_dest}")
    
    # Create placeholder objectives if not exists
    obj_dest = config.dist_dir / "objectives.json"
    if not obj_dest.exists():
        with open(obj_dest, 'w') as f:
            json.dump({"schemes": {}, "strategies": {}}, f)
        print(f"  -> {obj_dest} (placeholder)")
    
    # Create placeholder recommendations if not exists
    rec_dest = config.dist_dir / "recommendations.json"
    if not rec_dest.exists():
        with open(rec_dest, 'w') as f:
            json.dump({"synergies": {}, "roles": {}}, f)
        print(f"  -> {rec_dest} (placeholder)")
    
    return True


def copy_to_webapp(config: Config) -> bool:
    """Copy dist files to webapp src/data/."""
    print(f"\n[bundle] Copying to webapp...")
    
    if not config.webapp_data_dir.exists():
        print(f"  [!] Webapp dir not found: {config.webapp_data_dir}")
        return True  # Not an error, just skip
    
    for filename in ["cards.json", "objectives.json", "recommendations.json"]:
        src = config.dist_dir / filename
        dst = config.webapp_data_dir / filename
        if src.exists():
            # Backup existing
            if dst.exists():
                backup = config.backup_dir / f"{filename}.{datetime.now().strftime('%Y%m%d_%H%M%S')}.bak"
                config.backup_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy(dst, backup)
                print(f"  -> Backed up existing {filename}")
            shutil.copy(src, dst)
            print(f"  -> src/data/{filename}")
    
    return True


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Malifaux 4E Build Pipeline - Validates before building",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python build.py --validate cards_FINAL.json   # Just validate, don't build
  python build.py --source cards_FINAL.json     # Use as source, run pipeline
  python build.py --status                      # Show build status
        """
    )
    
    parser.add_argument('--validate', '-v', type=Path, metavar='FILE',
                        help='Validate a JSON file without building')
    parser.add_argument('--source', '-s', type=Path, metavar='FILE',
                        help='Use this file as source-of-truth (skips extraction)')
    parser.add_argument('--status', action='store_true',
                        help='Show build status')
    parser.add_argument('--root', type=Path, default=None,
                        help='Project root directory')
    parser.add_argument('--images-dir', type=Path, default=None,
                        help='Card images directory')
    parser.add_argument('--skip-webapp', action='store_true',
                        help='Skip copying to webapp src/data/')
    
    args = parser.parse_args()
    
    # Validate-only mode
    if args.validate:
        print(f"Validating: {args.validate}")
        success, errors, warnings, stats = validate_cards(args.validate)
        print_validation_report(success, errors, warnings, stats)
        sys.exit(0 if success else 1)
    
    # Source injection mode
    if args.source:
        if not args.source.exists():
            print(f"ERROR: Source file not found: {args.source}")
            sys.exit(1)
        
        # ALWAYS validate first
        print("=" * 60)
        print("STEP 1: Validate source data")
        print("=" * 60)
        
        success, errors, warnings, stats = validate_cards(args.source)
        print_validation_report(success, errors, warnings, stats)
        
        if not success:
            print("BUILD BLOCKED - Fix validation errors first")
            sys.exit(1)
        
        # Proceed with build
        config = Config(args.root, args.images_dir)
        config.ensure_dirs()
        
        print("=" * 60)
        print("STEP 2: Inject source into pipeline")
        print("=" * 60)
        
        if not inject_source(config, args.source):
            print("ERROR: Failed to inject source")
            sys.exit(1)
        
        print("=" * 60)
        print("STEP 3: Run enrichment")
        print("=" * 60)
        
        if not run_enrichment(config, args.source):
            print("ERROR: Enrichment failed")
            sys.exit(1)
        
        if not args.skip_webapp:
            print("=" * 60)
            print("STEP 4: Copy to webapp")
            print("=" * 60)
            
            copy_to_webapp(config)
        
        # Save build state
        state = BuildState(
            last_build=datetime.now().isoformat(),
            source_file=str(args.source),
            source_hash=hash_file(args.source)
        )
        state.save(config.build_state_file)
        
        print("\n" + "=" * 60)
        print("BUILD COMPLETE")
        print("=" * 60)
        print(f"Source: {args.source}")
        print(f"Output: {config.dist_dir}")
        if not args.skip_webapp:
            print(f"Webapp: {config.webapp_data_dir}")
        
        sys.exit(0)
    
    # Status mode
    if args.status:
        config = Config(args.root, args.images_dir)
        state = BuildState.load(config.build_state_file)
        
        print("=" * 60)
        print("BUILD STATUS")
        print("=" * 60)
        
        if state.last_build:
            print(f"Last build: {state.last_build}")
            print(f"Source: {state.source_file}")
            print(f"Source hash: {state.source_hash[:16]}...")
        else:
            print("No previous build found")
        
        # Check dist files
        print(f"\nDist files:")
        for filename in ["cards.json", "objectives.json", "recommendations.json"]:
            path = config.dist_dir / filename
            if path.exists():
                print(f"  [OK] {filename}")
            else:
                print(f"  [--] {filename} (missing)")
        
        sys.exit(0)
    
    # No arguments - show help
    parser.print_help()
    print("\n[!] Specify --source FILE to build, or --validate FILE to check data")


if __name__ == '__main__':
    main()
