#!/usr/bin/env python3
"""
Malifaux 4E Crew Builder - Unified Build Pipeline

Single command to process all data from raw sources to web-ready outputs.
Tracks file hashes to only rebuild what's changed.

Usage:
    python build.py                    # Build everything that needs updating
    python build.py --force            # Rebuild everything from scratch
    python build.py --clean            # Remove all generated files
    python build.py --status           # Show what would be rebuilt
    python build.py --images-dir PATH  # Specify card images directory

Directory Structure:
    project_root/
    ├── build.py                 (this file)
    ├── data/
    │   ├── raw/
    │   │   ├── card_pdfs/       (source PDFs from Wyrd)
    │   │   └── objective_images/ (scheme/strategy card images)
    │   ├── intermediate/        (build artifacts, gitignored)
    │   └── dist/                (final outputs for web app)
    ├── pipeline/                (processing scripts)
    │   ├── parse_cards.py
    │   ├── tag_extractor.py
    │   ├── parse_objective_cards.py
    │   ├── faction_meta.py      (Longshanks competitive meta)
    │   ├── crew_recommender.py
    │   └── taxonomy.json
    └── src/data/                (web app data, copied from dist/)
    
    ../Malifaux4eDB-images/      (card PNG images - separate repo)
        ├── Arcanists/Academic/*.png
        ├── Guild/...
        └── ...

Pipeline Steps:
    1. extract_cards     - Parse card PDFs to cards_raw.json
    2. extract_tags      - Extract semantic tags to cards_tagged.json
    3. extract_objectives- OCR scheme/strategy images to objectives_raw.json
    4. enrich_meta       - Add Longshanks competitive meta to cards_enriched.json
    5. train_recommender - Train ML model, output recommendations.json
    6. bundle            - Copy to dist/ and src/data/

Rebuild triggers:
    - Any PDF added/changed in card_pdfs/ → rebuild cards
    - Any image added/changed in objective_images/ → rebuild objectives
    - taxonomy.json changed → rebuild tags
    - faction_meta.py changed → rebuild enrichment
    - recommender_config.json changed → rebuild recommendations
    - Pipeline scripts changed → rebuild affected steps
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

class Config:
    """Pipeline configuration - edit paths here if needed."""
    
    def __init__(self, root_dir: Path = None, images_dir: Path = None):
        self.root = root_dir or Path(__file__).parent.resolve()
        
        # Source data (raw inputs - tracked in git with LFS for PDFs)
        self.raw_dir = self.root / "data" / "raw"
        self.card_pdfs_dir = self.raw_dir / "card_pdfs"
        self.objective_images_dir = self.raw_dir / "objective_images"
        
        # Card images directory (separate repo - for health extraction)
        # Default: sibling directory named Malifaux4eDB-images
        if images_dir:
            self.card_images_dir = Path(images_dir)
        else:
            # Try common locations
            sibling_images = self.root.parent / "Malifaux4eDB-images"
            if sibling_images.exists():
                self.card_images_dir = sibling_images
            else:
                self.card_images_dir = None
        
        # Intermediate build artifacts (gitignored)
        self.intermediate_dir = self.root / "data" / "intermediate"
        
        # Final distribution (copied to web app)
        self.dist_dir = self.root / "data" / "dist"
        
        # Pipeline scripts
        self.pipeline_dir = self.root / "pipeline"
        
        # Web app data directory
        self.webapp_data_dir = self.root / "src" / "data"
        
        # Build state tracking
        self.build_state_file = self.intermediate_dir / ".build_state.json"
    
    def ensure_dirs(self):
        """Create all required directories."""
        for d in [self.raw_dir, self.card_pdfs_dir, self.objective_images_dir,
                  self.intermediate_dir, self.dist_dir, self.pipeline_dir,
                  self.webapp_data_dir]:
            d.mkdir(parents=True, exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════════
# BUILD STATE TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class BuildState:
    """Tracks what was built and when, for incremental rebuilds."""
    
    last_build: str = ""
    file_hashes: Dict[str, str] = None
    step_outputs: Dict[str, List[str]] = None
    
    def __post_init__(self):
        if self.file_hashes is None:
            self.file_hashes = {}
        if self.step_outputs is None:
            self.step_outputs = {}
    
    @classmethod
    def load(cls, path: Path) -> "BuildState":
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return cls(**data)
        return cls()
    
    def save(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self), f, indent=2)


def hash_file(path: Path) -> str:
    """Compute MD5 hash of a file."""
    hasher = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


def hash_directory(directory: Path, extensions: Set[str] = None) -> Dict[str, str]:
    """Hash all files in a directory (optionally filtered by extension)."""
    hashes = {}
    if not directory.exists():
        return hashes
    
    for path in sorted(directory.rglob('*')):
        if path.is_file():
            if extensions is None or path.suffix.lower() in extensions:
                rel_path = str(path.relative_to(directory))
                hashes[rel_path] = hash_file(path)
    
    return hashes


def files_changed(old_hashes: Dict[str, str], new_hashes: Dict[str, str]) -> bool:
    """Check if any files changed between two hash sets."""
    return old_hashes != new_hashes


# ═══════════════════════════════════════════════════════════════════════════════
# PIPELINE STEPS
# ═══════════════════════════════════════════════════════════════════════════════

class PipelineStep:
    """Base class for pipeline steps."""
    
    name: str = "base"
    description: str = "Base step"
    
    def __init__(self, config: Config, state: BuildState):
        self.config = config
        self.state = state
    
    def needs_rebuild(self) -> bool:
        """Check if this step needs to run."""
        raise NotImplementedError
    
    def run(self) -> bool:
        """Execute the step. Returns True on success."""
        raise NotImplementedError
    
    def get_input_hashes(self) -> Dict[str, str]:
        """Get hashes of input files for this step."""
        return {}
    
    def update_state(self):
        """Update build state after successful run."""
        self.state.file_hashes[self.name] = self.get_input_hashes()


class ExtractCardsStep(PipelineStep):
    """Step 1: Extract card data from PDFs."""
    
    name = "extract_cards"
    description = "Extract card data from PDFs"
    
    def get_input_hashes(self) -> Dict[str, str]:
        return hash_directory(self.config.card_pdfs_dir, {'.pdf'})
    
    def needs_rebuild(self) -> bool:
        output = self.config.intermediate_dir / "cards_raw.json"
        if not output.exists():
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        script = self.config.pipeline_dir / "parse_cards.py"
        output = self.config.intermediate_dir / "cards_raw.json"
        
        if not script.exists():
            print(f"  ERROR: {script} not found")
            return False
        
        print(f"  Running: parse_cards.py")
        
        # Build command with optional images directory
        cmd = [
            sys.executable, str(script),
            "--input", str(self.config.card_pdfs_dir),
            "--output", str(output)
        ]
        
        # Add images directory if configured (for health extraction)
        if self.config.card_images_dir and self.config.card_images_dir.exists():
            cmd.extend(["--images-dir", str(self.config.card_images_dir)])
            print(f"  Using images from: {self.config.card_images_dir}")
        else:
            print(f"  WARNING: No card images directory - health extraction may fail")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  FAILED: {result.stderr}")
            return False
        
        print(f"  Output: {output}")
        return True


class ExtractTagsStep(PipelineStep):
    """Step 2: Extract semantic tags from cards."""
    
    name = "extract_tags"
    description = "Extract semantic tags (roles, conditions, markers)"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        # Input: cards_raw.json
        cards_raw = self.config.intermediate_dir / "cards_raw.json"
        if cards_raw.exists():
            hashes["cards_raw.json"] = hash_file(cards_raw)
        
        # Input: taxonomy.json
        taxonomy = self.config.pipeline_dir / "taxonomy.json"
        if taxonomy.exists():
            hashes["taxonomy.json"] = hash_file(taxonomy)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        output = self.config.intermediate_dir / "cards_tagged.json"
        if not output.exists():
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        script = self.config.pipeline_dir / "tag_extractor.py"
        input_file = self.config.intermediate_dir / "cards_raw.json"
        output = self.config.intermediate_dir / "cards_tagged.json"
        taxonomy = self.config.pipeline_dir / "taxonomy.json"
        
        if not script.exists():
            print(f"  ERROR: {script} not found")
            return False
        
        if not input_file.exists():
            print(f"  ERROR: {input_file} not found (run extract_cards first)")
            return False
        
        print(f"  Running: tag_extractor.py")
        cmd = [
            sys.executable, str(script),
            "--input", str(input_file),
            "--output", str(output)
        ]
        if taxonomy.exists():
            cmd.extend(["--taxonomy", str(taxonomy)])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  FAILED: {result.stderr}")
            return False
        
        print(f"  Output: {output}")
        return True


class ExtractObjectivesStep(PipelineStep):
    """Step 3: OCR scheme/strategy cards."""
    
    name = "extract_objectives"
    description = "OCR scheme and strategy card images"
    
    def get_input_hashes(self) -> Dict[str, str]:
        return hash_directory(self.config.objective_images_dir, {'.png', '.jpg', '.jpeg'})
    
    def needs_rebuild(self) -> bool:
        output = self.config.intermediate_dir / "objectives_raw.json"
        if not output.exists():
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        script = self.config.pipeline_dir / "parse_objective_cards.py"
        output = self.config.intermediate_dir / "objectives_raw.json"
        
        if not script.exists():
            print(f"  ERROR: {script} not found")
            return False
        
        if not self.config.objective_images_dir.exists():
            print(f"  SKIP: No objective images directory")
            # Create empty objectives file
            with open(output, 'w', encoding='utf-8') as f:
                json.dump({"schemes": {}, "strategies": {}}, f)
            return True
        
        print(f"  Running: parse_objective_cards.py")
        result = subprocess.run([
            sys.executable, str(script),
            "--input", str(self.config.objective_images_dir),
            "--output", str(output)
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  FAILED: {result.stderr}")
            return False
        
        print(f"  Output: {output}")
        return True


class EnrichMetaStep(PipelineStep):
    """Step 4: Enrich cards/objectives with competitive meta from Longshanks."""
    
    name = "enrich_meta"
    description = "Add competitive meta (faction affinity, scheme difficulty)"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        # Input: cards_tagged.json
        cards = self.config.intermediate_dir / "cards_tagged.json"
        if cards.exists():
            hashes["cards_tagged.json"] = hash_file(cards)
        
        # Input: objectives_raw.json
        objectives = self.config.intermediate_dir / "objectives_raw.json"
        if objectives.exists():
            hashes["objectives_raw.json"] = hash_file(objectives)
        
        # Input: faction_meta.py (the meta database)
        meta_script = self.config.pipeline_dir / "faction_meta.py"
        if meta_script.exists():
            hashes["faction_meta.py"] = hash_file(meta_script)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        output_cards = self.config.intermediate_dir / "cards_enriched.json"
        output_objectives = self.config.intermediate_dir / "objectives_enriched.json"
        
        if not output_cards.exists() or not output_objectives.exists():
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        cards_input = self.config.intermediate_dir / "cards_tagged.json"
        objectives_input = self.config.intermediate_dir / "objectives_raw.json"
        cards_output = self.config.intermediate_dir / "cards_enriched.json"
        objectives_output = self.config.intermediate_dir / "objectives_enriched.json"
        faction_meta_json = self.config.dist_dir / "faction_meta.json"
        
        # Try to import faction_meta module
        meta_script = self.config.pipeline_dir / "faction_meta.py"
        faction_data = None
        
        if meta_script.exists():
            try:
                sys.path.insert(0, str(self.config.pipeline_dir))
                from faction_meta import FACTION_DATA
                faction_data = FACTION_DATA
                print(f"  Loaded faction meta for {len(faction_data)} factions")
            except ImportError as e:
                print(f"  WARNING: Could not import faction_meta: {e}")
        else:
            print(f"  WARNING: faction_meta.py not found in {self.config.pipeline_dir}")
        
        # Load cards
        if cards_input.exists():
            with open(cards_input, 'r', encoding='utf-8') as f:
                cards_data = json.load(f)
            print(f"  Enriching cards with faction meta...")
            cards_data = self._enrich_cards(cards_data, faction_data)
            with open(cards_output, 'w', encoding='utf-8') as f:
                json.dump(cards_data, f, indent=2, ensure_ascii=False)
            print(f"  -> {cards_output}")
        else:
            print(f"  SKIP: No cards_tagged.json to enrich")
            # Copy through if exists from previous step
            if cards_input.exists():
                shutil.copy(cards_input, cards_output)
        
        # Load objectives
        if objectives_input.exists():
            with open(objectives_input, 'r', encoding='utf-8') as f:
                objectives_data = json.load(f)
            print(f"  Enriching objectives with difficulty ratings...")
            objectives_data = self._enrich_objectives(objectives_data, faction_data)
            with open(objectives_output, 'w', encoding='utf-8') as f:
                json.dump(objectives_data, f, indent=2, ensure_ascii=False)
            print(f"  -> {objectives_output}")
        else:
            print(f"  SKIP: No objectives_raw.json to enrich")
            # Create empty placeholder
            with open(objectives_output, 'w', encoding='utf-8') as f:
                json.dump({"schemes": {}, "strategies": {}}, f)
        
        # Also export faction_meta.json to dist
        if faction_data:
            self._export_faction_meta_json(faction_data, faction_meta_json)
            print(f"  -> {faction_meta_json}")
        
        return True
    
    def _enrich_cards(self, cards_data: dict, faction_data: dict) -> dict:
        """Add faction-specific scheme/strategy affinity to master cards."""
        if not faction_data:
            return cards_data
        
        cards = cards_data.get('cards', cards_data)
        if isinstance(cards, dict):
            card_list = list(cards.values())
        else:
            card_list = cards
        
        enriched_count = 0
        for card in card_list:
            faction = card.get('faction')
            if not faction or faction not in faction_data:
                continue
            
            # Only enrich master cards (or all stat cards?)
            characteristics = card.get('characteristics', [])
            if 'Master' not in characteristics:
                continue
            
            faction_info = faction_data[faction]
            
            # Add faction win rate context
            card['faction_meta'] = {
                'faction_win_rate': faction_info['overall']['win_rate'],
                'faction_games': faction_info['overall']['games'],
            }
            
            # Add best/worst schemes for this faction
            schemes_chosen = faction_info.get('schemes_chosen', {})
            faction_avg = faction_info['overall']['win_rate']
            
            best_schemes = []
            worst_schemes = []
            for scheme, stats in schemes_chosen.items():
                if stats['games'] >= 50:
                    delta = stats['win_rate'] - faction_avg
                    entry = {'scheme': scheme, 'win_rate': stats['win_rate'], 'delta': round(delta, 3)}
                    if delta > 0.03:
                        best_schemes.append(entry)
                    elif delta < -0.03:
                        worst_schemes.append(entry)
            
            best_schemes.sort(key=lambda x: -x['delta'])
            worst_schemes.sort(key=lambda x: x['delta'])
            
            card['faction_meta']['best_schemes'] = [s['scheme'] for s in best_schemes[:5]]
            card['faction_meta']['worst_schemes'] = [s['scheme'] for s in worst_schemes[:5]]
            
            # Add best/worst strategies for this faction
            strategies = faction_info.get('strategies_m4e', {})
            best_strats = []
            worst_strats = []
            for strat, stats in strategies.items():
                if stats['games'] >= 20:
                    delta = stats['win_rate'] - faction_avg
                    if delta > 0.02:
                        best_strats.append(strat)
                    elif delta < -0.05:
                        worst_strats.append(strat)
            
            card['faction_meta']['best_strategies'] = best_strats
            card['faction_meta']['worst_strategies'] = worst_strats
            
            enriched_count += 1
        
        print(f"    Enriched {enriched_count} master cards with faction meta")
        return cards_data
    
    def _enrich_objectives(self, objectives_data: dict, faction_data: dict) -> dict:
        """Add difficulty ratings to schemes based on cross-faction performance."""
        if not faction_data:
            return objectives_data
        
        schemes = objectives_data.get('schemes', {})
        
        for scheme_key, scheme_data in schemes.items():
            # Compute average win rate across all factions
            total_wr = 0
            total_games = 0
            faction_performance = {}
            
            for faction, fdata in faction_data.items():
                chosen = fdata.get('schemes_chosen', {})
                # Try to match scheme key
                matched = None
                for sk in chosen:
                    if sk == scheme_key or sk.replace('_', '') == scheme_key.replace('_', ''):
                        matched = sk
                        break
                
                if matched:
                    stats = chosen[matched]
                    total_wr += stats['win_rate'] * stats['games']
                    total_games += stats['games']
                    faction_performance[faction] = {
                        'win_rate': stats['win_rate'],
                        'games': stats['games']
                    }
            
            if total_games > 0:
                avg_wr = total_wr / total_games
                
                # Classify difficulty
                if avg_wr >= 0.55:
                    difficulty = 'easy'
                elif avg_wr >= 0.50:
                    difficulty = 'medium'
                else:
                    difficulty = 'hard'
                
                scheme_data['meta'] = {
                    'average_win_rate': round(avg_wr, 3),
                    'total_games': total_games,
                    'difficulty': difficulty,
                    'faction_performance': faction_performance
                }
        
        return objectives_data
    
    def _export_faction_meta_json(self, faction_data: dict, output_path: Path):
        """Export faction meta as compact JSON for web app."""
        export = {
            'metadata': {
                'source': 'Longshanks Faction Analyzer',
                'extracted': datetime.now().strftime('%Y-%m-%d'),
                'total_games': sum(f['overall']['games'] for f in faction_data.values())
            },
            'faction_rankings': sorted([
                {'faction': f, 'win_rate': d['overall']['win_rate'], 'games': d['overall']['games']}
                for f, d in faction_data.items()
            ], key=lambda x: -x['win_rate']),
            'faction_scheme_affinity': {},
            'faction_strategy_affinity': {}
        }
        
        for faction, data in faction_data.items():
            faction_avg = data['overall']['win_rate']
            
            # Scheme affinity
            schemes = data.get('schemes_chosen', {})
            best = [s for s, v in schemes.items() if v['games'] >= 50 and v['win_rate'] - faction_avg > 0.03]
            worst = [s for s, v in schemes.items() if v['games'] >= 50 and v['win_rate'] - faction_avg < -0.03]
            export['faction_scheme_affinity'][faction] = {'best': best, 'worst': worst}
            
            # Strategy affinity
            strats = data.get('strategies_m4e', {})
            best_s = [s for s, v in strats.items() if v['games'] >= 20 and v['win_rate'] - faction_avg > 0.02]
            worst_s = [s for s, v in strats.items() if v['games'] >= 20 and v['win_rate'] - faction_avg < -0.05]
            export['faction_strategy_affinity'][faction] = {'best': best_s, 'worst': worst_s}
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export, f, indent=2, ensure_ascii=False)


class TrainRecommenderStep(PipelineStep):
    """Step 5: Train crew recommender and pre-compute recommendations."""
    
    name = "train_recommender"
    description = "Train recommender and pre-compute synergies"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        # Input: cards_enriched.json (from meta enrichment step)
        cards = self.config.intermediate_dir / "cards_enriched.json"
        if cards.exists():
            hashes["cards_enriched.json"] = hash_file(cards)
        
        # Input: recommender_config.json
        config_file = self.config.pipeline_dir / "recommender_config.json"
        if config_file.exists():
            hashes["recommender_config.json"] = hash_file(config_file)
        
        # Input: tournament data (if exists)
        tournament_dir = self.config.raw_dir / "tournament_crews"
        if tournament_dir.exists():
            for f in tournament_dir.glob("*.json"):
                hashes[f"tournament/{f.name}"] = hash_file(f)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        output = self.config.intermediate_dir / "recommendations.json"
        if not output.exists():
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        script = self.config.pipeline_dir / "crew_recommender.py"
        cards_file = self.config.intermediate_dir / "cards_enriched.json"
        output_model = self.config.intermediate_dir / "model.pkl"
        output_recs = self.config.intermediate_dir / "recommendations.json"
        
        if not script.exists():
            print(f"  ERROR: {script} not found")
            return False
        
        if not cards_file.exists():
            print(f"  ERROR: {cards_file} not found (run enrich_meta first)")
            return False
        
        # Step 4a: Generate synthetic crews (or use tournament data)
        print(f"  Generating training data...")
        synthetic_crews = self.config.intermediate_dir / "synthetic_crews.json"
        
        result = subprocess.run([
            sys.executable, str(script),
            "bootstrap",
            "--cards", str(cards_file),
            "--output", str(synthetic_crews),
            "--n", "500"
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  WARNING: Bootstrap failed: {result.stderr}")
        
        # Step 4b: Train model
        print(f"  Training recommender model...")
        result = subprocess.run([
            sys.executable, str(script),
            "train",
            "--crews", str(synthetic_crews),
            "--cards", str(cards_file),
            "--output", str(output_model)
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  WARNING: Training failed: {result.stderr}")
        
        # Step 4c: Pre-compute recommendations
        print(f"  Pre-computing recommendations...")
        success = self._precompute_recommendations(cards_file, output_model, output_recs)
        
        if not success:
            # Create empty recommendations as fallback
            print(f"  Creating fallback empty recommendations...")
            with open(output_recs, 'w', encoding='utf-8') as f:
                json.dump({
                    "version": "1.0.0",
                    "generated": datetime.now().isoformat(),
                    "synergies": {},
                    "objective_fits": {}
                }, f, indent=2)
        
        print(f"  Output: {output_recs}")
        return True
    
    def _precompute_recommendations(self, cards_file: Path, model_file: Path, 
                                     output_file: Path) -> bool:
        """Pre-compute all synergy scores as static JSON."""
        try:
            # Import here to avoid dependency issues if not installed
            sys.path.insert(0, str(self.config.pipeline_dir))
            
            with open(cards_file, 'r', encoding='utf-8') as f:
                cards_data = json.load(f)
            
            cards = cards_data.get('cards', cards_data)
            if isinstance(cards, dict):
                cards = list(cards.values())
            
            # Get all models (Stat cards)
            models = [c for c in cards if c.get('card_type') == 'Stat']
            
            # Pre-compute: For each model, what are its top synergies?
            synergies = {}
            objective_fits = {}
            
            for model in models:
                model_id = model.get('id')
                if not model_id:
                    continue
                
                # Compute synergy scores based on tags
                model_synergies = self._compute_synergies(model, models)
                if model_synergies:
                    synergies[model_id] = model_synergies[:20]  # Top 20
                
                # Compute objective fit scores
                model_fits = self._compute_objective_fits(model)
                if model_fits:
                    objective_fits[model_id] = model_fits
            
            # Write output
            output = {
                "version": "1.0.0",
                "generated": datetime.now().isoformat(),
                "model_count": len(models),
                "synergies": synergies,
                "objective_fits": objective_fits
            }
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"  ERROR computing recommendations: {e}")
            return False
    
    def _compute_synergies(self, model: dict, all_models: list) -> list:
        """Compute synergy scores between model and all other models."""
        synergies = []
        model_tags = model.get('extracted_tags', {})
        model_keywords = set(model.get('keywords', []))
        model_faction = model.get('faction')
        
        conditions_applied = set(model_tags.get('conditions_applied', []))
        conditions_required = set(model_tags.get('conditions_required', []))
        markers_generated = set(model_tags.get('markers_generated', []))
        markers_consumed = set(model_tags.get('markers_consumed', []))
        
        for other in all_models:
            if other.get('id') == model.get('id'):
                continue
            
            # Must be same faction or versatile
            other_faction = other.get('faction')
            if other_faction != model_faction and other_faction != 'Versatile':
                continue
            
            score = 0.0
            reasons = []
            
            other_tags = other.get('extracted_tags', {})
            other_keywords = set(other.get('keywords', []))
            
            # Keyword synergy
            shared_keywords = model_keywords & other_keywords
            if shared_keywords:
                score += len(shared_keywords) * 2.0
                reasons.append(f"shared_keyword:{list(shared_keywords)[0]}")
            
            # Condition synergy: one applies, other triggers
            other_conditions_applied = set(other_tags.get('conditions_applied', []))
            other_conditions_required = set(other_tags.get('conditions_required', []))
            
            condition_synergy = (conditions_applied & other_conditions_required) | \
                               (conditions_required & other_conditions_applied)
            if condition_synergy:
                score += len(condition_synergy) * 1.8
                reasons.append(f"condition_synergy:{list(condition_synergy)[0]}")
            
            # Marker synergy: one generates, other consumes
            other_markers_generated = set(other_tags.get('markers_generated', []))
            other_markers_consumed = set(other_tags.get('markers_consumed', []))
            
            marker_synergy = (markers_generated & other_markers_consumed) | \
                            (markers_consumed & other_markers_generated)
            if marker_synergy:
                score += len(marker_synergy) * 2.0
                reasons.append(f"marker_synergy:{list(marker_synergy)[0]}")
            
            if score > 0:
                synergies.append({
                    "model_id": other.get('id'),
                    "name": other.get('name'),
                    "score": round(score, 2),
                    "reasons": reasons
                })
        
        # Sort by score descending
        synergies.sort(key=lambda x: x['score'], reverse=True)
        return synergies
    
    def _compute_objective_fits(self, model: dict) -> dict:
        """Compute how well a model fits various objective requirements."""
        fits = {}
        roles = set(model.get('roles', []))
        tags = model.get('extracted_tags', {})
        
        movement = set(tags.get('movement_tags', []))
        combat = set(tags.get('combat_tags', []))
        defense = set(tags.get('defense_tags', []))
        
        # Scheme runner fit
        scheme_score = 0
        if 'scheme_runner' in roles:
            scheme_score += 3
        if movement & {'leap', 'flight', 'place', 'unimpeded'}:
            scheme_score += 2
        if 'dont_mind_me' in str(tags):
            scheme_score += 2
        if scheme_score > 0:
            fits['scheme_running'] = scheme_score
        
        # Killing fit
        kill_score = 0
        if roles & {'beater', 'assassin', 'melee_damage', 'ranged_damage'}:
            kill_score += 3
        if combat & {'irreducible', 'bonus_damage', 'armor_piercing'}:
            kill_score += 2
        if kill_score > 0:
            fits['killing'] = kill_score
        
        # Tanking fit
        tank_score = 0
        if roles & {'tank', 'tarpit'}:
            tank_score += 3
        if defense & {'armor', 'hard_to_kill', 'incorporeal', 'shielded'}:
            tank_score += 2
        health = model.get('health', 0)
        if health and health >= 10:
            tank_score += 1
        if tank_score > 0:
            fits['tanking'] = tank_score
        
        # Marker interaction fit
        marker_score = 0
        markers_gen = tags.get('markers_generated', [])
        markers_con = tags.get('markers_consumed', [])
        if markers_gen:
            marker_score += len(markers_gen)
        if markers_con:
            marker_score += len(markers_con)
        if marker_score > 0:
            fits['marker_interaction'] = marker_score
        
        return fits


class BundleStep(PipelineStep):
    """Step 6: Bundle everything for web app."""
    
    name = "bundle"
    description = "Bundle final outputs for web app"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        for filename in ["cards_enriched.json", "objectives_enriched.json", "recommendations.json"]:
            path = self.config.intermediate_dir / filename
            if path.exists():
                hashes[filename] = hash_file(path)
        
        # Also check faction_meta.json in dist
        faction_meta = self.config.dist_dir / "faction_meta.json"
        if faction_meta.exists():
            hashes["faction_meta.json"] = hash_file(faction_meta)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        # Check if any output is missing
        outputs = [
            self.config.dist_dir / "cards.json",
            self.config.dist_dir / "objectives.json",
            self.config.dist_dir / "recommendations.json",
            self.config.dist_dir / "faction_meta.json"
        ]
        
        if not all(o.exists() for o in outputs):
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        print(f"  Bundling outputs...")
        
        # Cards: copy enriched version
        cards_src = self.config.intermediate_dir / "cards_enriched.json"
        cards_dst = self.config.dist_dir / "cards.json"
        if cards_src.exists():
            shutil.copy(cards_src, cards_dst)
            print(f"  -> cards.json")
        
        # Objectives: copy enriched version
        obj_src = self.config.intermediate_dir / "objectives_enriched.json"
        obj_dst = self.config.dist_dir / "objectives.json"
        if obj_src.exists():
            shutil.copy(obj_src, obj_dst)
            print(f"  -> objectives.json")
        else:
            # Create empty objectives file so web app doesn't crash
            with open(obj_dst, 'w', encoding='utf-8') as f:
                json.dump({"schemes": {}, "strategies": {}}, f)
            print(f"  -> objectives.json (empty placeholder)")
        
        # Recommendations: copy pre-computed (or create empty)
        rec_src = self.config.intermediate_dir / "recommendations.json"
        rec_dst = self.config.dist_dir / "recommendations.json"
        if rec_src.exists():
            shutil.copy(rec_src, rec_dst)
            print(f"  -> recommendations.json")
        else:
            # Create empty recommendations file
            with open(rec_dst, 'w', encoding='utf-8') as f:
                json.dump({"synergies": {}, "objective_fits": {}}, f)
            print(f"  -> recommendations.json (empty placeholder)")
        
        # Faction meta: already in dist from EnrichMetaStep, just confirm
        faction_meta = self.config.dist_dir / "faction_meta.json"
        if faction_meta.exists():
            print(f"  -> faction_meta.json (already present)")
        
        # Also copy to web app src/data/ if it exists
        if self.config.webapp_data_dir.exists():
            print(f"  Copying to web app...")
            for filename in ["cards.json", "objectives.json", "recommendations.json", "faction_meta.json"]:
                src = self.config.dist_dir / filename
                dst = self.config.webapp_data_dir / filename
                if src.exists():
                    shutil.copy(src, dst)
                    print(f"  -> src/data/{filename}")
        
        return True


# ═══════════════════════════════════════════════════════════════════════════════
# PIPELINE RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

class Pipeline:
    """Orchestrates the build pipeline."""
    
    def __init__(self, config: Config = None):
        self.config = config or Config()
        self.config.ensure_dirs()
        self.state = BuildState.load(self.config.build_state_file)
        
        # Define steps in order
        self.steps = [
            ExtractCardsStep(self.config, self.state),
            ExtractTagsStep(self.config, self.state),
            ExtractObjectivesStep(self.config, self.state),
            EnrichMetaStep(self.config, self.state),
            TrainRecommenderStep(self.config, self.state),
            BundleStep(self.config, self.state),
        ]
    
    def run(self, force: bool = False) -> bool:
        """Run all pipeline steps that need updating."""
        print("=" * 60)
        print("Malifaux 4E Build Pipeline")
        print("=" * 60)
        
        success = True
        any_ran = False
        
        for step in self.steps:
            needs_run = force or step.needs_rebuild()
            
            if needs_run:
                print(f"\n[{step.name}] {step.description}")
                any_ran = True
                
                if step.run():
                    step.update_state()
                    print(f"  ✓ Complete")
                else:
                    print(f"  ✗ Failed")
                    success = False
                    break  # Stop on failure
            else:
                print(f"\n[{step.name}] Up to date, skipping")
        
        if success and any_ran:
            self.state.last_build = datetime.now().isoformat()
            self.state.save(self.config.build_state_file)
            print(f"\n" + "=" * 60)
            print("Build complete!")
            print(f"Outputs in: {self.config.dist_dir}")
            print("=" * 60)
        elif not any_ran:
            print(f"\n" + "=" * 60)
            print("Everything up to date, nothing to build")
            print("=" * 60)
        
        return success
    
    def status(self):
        """Show what would be rebuilt."""
        print("=" * 60)
        print("Build Status")
        print("=" * 60)
        
        for step in self.steps:
            needs = step.needs_rebuild()
            status = "NEEDS REBUILD" if needs else "up to date"
            print(f"  [{step.name}] {status}")
        
        if self.state.last_build:
            print(f"\nLast build: {self.state.last_build}")
    
    def clean(self):
        """Remove all generated files."""
        print("Cleaning build artifacts...")
        
        if self.config.intermediate_dir.exists():
            shutil.rmtree(self.config.intermediate_dir)
            print(f"  Removed: {self.config.intermediate_dir}")
        
        if self.config.dist_dir.exists():
            shutil.rmtree(self.config.dist_dir)
            print(f"  Removed: {self.config.dist_dir}")
        
        self.config.ensure_dirs()
        print("Clean complete")


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Malifaux 4E Crew Builder - Build Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python build.py              # Build everything that needs updating
  python build.py --force      # Rebuild everything from scratch
  python build.py --status     # Show what would be rebuilt
  python build.py --clean      # Remove all generated files
        """
    )
    
    parser.add_argument('--force', '-f', action='store_true',
                        help='Force rebuild of all steps')
    parser.add_argument('--status', '-s', action='store_true',
                        help='Show build status without running')
    parser.add_argument('--clean', '-c', action='store_true',
                        help='Remove all generated files')
    parser.add_argument('--root', type=Path, default=None,
                        help='Project root directory (default: directory containing build.py)')
    parser.add_argument('--images-dir', type=Path, default=None,
                        help='Card images directory (for health extraction, default: ../Malifaux4eDB-images)')
    
    args = parser.parse_args()
    
    config = Config(args.root, images_dir=args.images_dir)
    pipeline = Pipeline(config)
    
    if args.clean:
        pipeline.clean()
    elif args.status:
        pipeline.status()
    else:
        success = pipeline.run(force=args.force)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
