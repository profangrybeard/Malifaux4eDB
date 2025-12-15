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
    │   ├── fix_cards.py
    │   ├── repair_all.py        (UNIFIED: cost/station/condition fixes)
    │   ├── tag_extractor.py
    │   ├── parse_objective_cards.py
    │   ├── normalize_data.py    (faction name normalization)
    │   ├── faction_meta.py      (Longshanks competitive meta)
    │   ├── crew_recommender.py
    │   ├── corrections.json     (persistent manual corrections)
    │   └── taxonomy.json
    └── src/data/                (web app data, copied from dist/)
    
    ../Malifaux4eDB-images/      (card PNG images - separate repo)

Pipeline Steps:
    1. extract_cards      - Parse card PDFs to cards_raw.json
    2. fix_cards          - Apply corrections.json to cards_fixed.json
    3. repair_all         - Fix costs, stations, conditions → cards_repaired.json
    4. extract_tags       - Extract semantic tags to cards_tagged.json
    5. extract_objectives - OCR scheme/strategy images to objectives_raw.json
    6. normalize_data     - Normalize faction/scheme names
    7. enrich_meta        - Add Longshanks competitive meta to cards_enriched.json
    8. train_recommender  - Train ML model, output recommendations.json
    9. bundle             - Copy to dist/ and src/data/
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
        if images_dir:
            self.card_images_dir = Path(images_dir)
        else:
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
        raise NotImplementedError
    
    def run(self) -> bool:
        raise NotImplementedError
    
    def get_input_hashes(self) -> Dict[str, str]:
        return {}
    
    def update_state(self):
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
        
        cmd = [
            sys.executable, str(script),
            "--input", str(self.config.card_pdfs_dir),
            "--output", str(output)
        ]
        
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


class FixCardsStep(PipelineStep):
    """Step 2: Apply persistent corrections to card data."""
    
    name = "fix_cards"
    description = "Apply persistent keyword and data corrections"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        cards_raw = self.config.intermediate_dir / "cards_raw.json"
        if cards_raw.exists():
            hashes["cards_raw.json"] = hash_file(cards_raw)
        
        corrections = self.config.pipeline_dir / "corrections.json"
        if corrections.exists():
            hashes["corrections.json"] = hash_file(corrections)
        
        script = self.config.pipeline_dir / "fix_cards.py"
        if script.exists():
            hashes["fix_cards.py"] = hash_file(script)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        output = self.config.intermediate_dir / "cards_fixed.json"
        if not output.exists():
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        script = self.config.pipeline_dir / "fix_cards.py"
        input_file = self.config.intermediate_dir / "cards_raw.json"
        output = self.config.intermediate_dir / "cards_fixed.json"
        corrections = self.config.pipeline_dir / "corrections.json"
        
        if not script.exists():
            print(f"  WARNING: {script} not found, copying cards_raw.json as-is")
            if input_file.exists():
                shutil.copy(input_file, output)
                return True
            return False
        
        if not input_file.exists():
            print(f"  ERROR: {input_file} not found (run extract_cards first)")
            return False
        
        print(f"  Running: fix_cards.py")
        cmd = [
            sys.executable, str(script),
            "--input", str(input_file),
            "--output", str(output)
        ]
        
        if corrections.exists():
            cmd.extend(["--corrections", str(corrections)])
            print(f"  Using corrections from: {corrections}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  FAILED: {result.stderr}")
            return False
        
        if result.stdout:
            for line in result.stdout.strip().split('\n')[-5:]:  # Last 5 lines
                print(f"  {line}")
        
        print(f"  Output: {output}")
        return True


class RepairAllStep(PipelineStep):
    """Step 3: UNIFIED repair - costs, stations, conditions in ONE pass."""
    
    name = "repair_all"
    description = "Repair costs, stations, conditions (unified)"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        cards_fixed = self.config.intermediate_dir / "cards_fixed.json"
        if cards_fixed.exists():
            hashes["cards_fixed.json"] = hash_file(cards_fixed)
        
        script = self.config.pipeline_dir / "repair_all.py"
        if script.exists():
            hashes["repair_all.py"] = hash_file(script)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        output = self.config.intermediate_dir / "cards_repaired.json"
        if not output.exists():
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        script = self.config.pipeline_dir / "repair_all.py"
        input_file = self.config.intermediate_dir / "cards_fixed.json"
        output = self.config.intermediate_dir / "cards_repaired.json"
        report = self.config.intermediate_dir / "repair_report.json"
        
        if not script.exists():
            print(f"  ERROR: {script} not found - this is required!")
            print(f"  Download repair_all.py and place in pipeline/")
            return False
        
        if not input_file.exists():
            print(f"  ERROR: {input_file} not found")
            return False
        
        print(f"  Running: repair_all.py")
        cmd = [
            sys.executable, str(script),
            str(input_file),
            "--output", str(output),
            "--report", str(report)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Print full output (includes station distribution and validation)
        if result.stdout:
            for line in result.stdout.strip().split('\n'):
                # Print key lines
                if any(x in line for x in ['Enforcer', 'Master', 'Henchman', 'Minion', 
                                            'STATION', 'VALIDATION', 'HEALTH', 'Grade',
                                            'fixed', 'inferred', '[OK]', '[WARNING]', '[CRITICAL]']):
                    print(f"  {line}")
        
        if result.returncode != 0:
            print(f"  FAILED: {result.stderr}")
            # This is CRITICAL - don't continue with broken data
            return False
        
        print(f"  Output: {output}")
        return True


class ExtractTagsStep(PipelineStep):
    """Step 4: Extract semantic tags from cards."""
    
    name = "extract_tags"
    description = "Extract semantic tags (roles, conditions, markers)"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        # Now uses cards_repaired.json as input (from repair_all step)
        cards_input = self.config.intermediate_dir / "cards_repaired.json"
        if cards_input.exists():
            hashes["cards_repaired.json"] = hash_file(cards_input)
        
        taxonomy = self.config.pipeline_dir / "taxonomy.json"
        if taxonomy.exists():
            hashes["taxonomy.json"] = hash_file(taxonomy)
        
        script = self.config.pipeline_dir / "tag_extractor.py"
        if script.exists():
            hashes["tag_extractor.py"] = hash_file(script)
        
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
        input_file = self.config.intermediate_dir / "cards_repaired.json"
        output = self.config.intermediate_dir / "cards_tagged.json"
        taxonomy = self.config.pipeline_dir / "taxonomy.json"
        
        if not script.exists():
            print(f"  WARNING: {script} not found, copying input as-is")
            if input_file.exists():
                shutil.copy(input_file, output)
            return True
        
        if not input_file.exists():
            print(f"  ERROR: {input_file} not found")
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
            print(f"  WARNING: tag_extractor failed, copying input as-is")
            print(f"  {result.stderr[:200] if result.stderr else ''}")
            shutil.copy(input_file, output)
        
        print(f"  Output: {output}")
        return True


class ExtractObjectivesStep(PipelineStep):
    """Step 5: OCR scheme/strategy cards."""
    
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
            print(f"  WARNING: {script} not found")
            with open(output, 'w', encoding='utf-8') as f:
                json.dump({"schemes": {}, "strategies": {}}, f)
            print(f"  Created empty objectives file")
            return True
        
        if not self.config.objective_images_dir.exists():
            print(f"  SKIP: No objective images directory")
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
            print(f"  WARNING: objectives extraction failed")
            print(f"  {result.stderr[:200] if result.stderr else ''}")
            with open(output, 'w', encoding='utf-8') as f:
                json.dump({"schemes": {}, "strategies": {}}, f)
        
        print(f"  Output: {output}")
        return True


class NormalizeDataStep(PipelineStep):
    """Step 6: Normalize faction names and scheme names."""
    
    name = "normalize_data"
    description = "Normalize faction and scheme names across all files"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        cards_tagged = self.config.intermediate_dir / "cards_tagged.json"
        if cards_tagged.exists():
            hashes["cards_tagged.json"] = hash_file(cards_tagged)
        
        objectives = self.config.intermediate_dir / "objectives_raw.json"
        if objectives.exists():
            hashes["objectives_raw.json"] = hash_file(objectives)
        
        script = self.config.pipeline_dir / "normalize_data.py"
        if script.exists():
            hashes["normalize_data.py"] = hash_file(script)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        output = self.config.intermediate_dir / "cards_normalized.json"
        if not output.exists():
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        script = self.config.pipeline_dir / "normalize_data.py"
        cards_input = self.config.intermediate_dir / "cards_tagged.json"
        obj_input = self.config.intermediate_dir / "objectives_raw.json"
        cards_output = self.config.intermediate_dir / "cards_normalized.json"
        obj_output = self.config.intermediate_dir / "objectives_normalized.json"
        
        if not script.exists():
            print(f"  WARNING: {script} not found, copying files as-is")
            if cards_input.exists():
                shutil.copy(cards_input, cards_output)
            if obj_input.exists():
                shutil.copy(obj_input, obj_output)
            return True
        
        # normalize_data.py expects cards.json and objectives.json in input dir
        # Create temp dir with expected filenames
        temp_input = self.config.intermediate_dir / "_normalize_input"
        temp_output = self.config.intermediate_dir / "_normalize_output"
        temp_input.mkdir(exist_ok=True)
        temp_output.mkdir(exist_ok=True)
        
        # Copy with expected names
        if cards_input.exists():
            shutil.copy(cards_input, temp_input / "cards.json")
        if obj_input.exists():
            shutil.copy(obj_input, temp_input / "objectives.json")
        
        print(f"  Running: normalize_data.py")
        cmd = [
            sys.executable, str(script),
            "--input-dir", str(temp_input),
            "--output-dir", str(temp_output)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  WARNING: normalize_data failed, copying as-is")
            print(f"  {result.stderr[:200] if result.stderr else ''}")
            # Cleanup and fallback
            shutil.rmtree(temp_input, ignore_errors=True)
            shutil.rmtree(temp_output, ignore_errors=True)
            if cards_input.exists():
                shutil.copy(cards_input, cards_output)
            if obj_input.exists():
                shutil.copy(obj_input, obj_output)
            return True
        
        # Move outputs to final locations
        temp_cards = temp_output / "cards.json"
        temp_obj = temp_output / "objectives.json"
        
        if temp_cards.exists():
            shutil.move(str(temp_cards), str(cards_output))
        elif cards_input.exists():
            shutil.copy(cards_input, cards_output)
        
        if temp_obj.exists():
            shutil.move(str(temp_obj), str(obj_output))
        elif obj_input.exists():
            shutil.copy(obj_input, obj_output)
        
        # Cleanup temp dirs
        shutil.rmtree(temp_input, ignore_errors=True)
        shutil.rmtree(temp_output, ignore_errors=True)
        
        print(f"  Output: cards_normalized.json, objectives_normalized.json")
        return True


class EnrichMetaStep(PipelineStep):
    """Step 7: Add Longshanks competitive meta data."""
    
    name = "enrich_meta"
    description = "Add competitive win rates from Longshanks"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        cards_normalized = self.config.intermediate_dir / "cards_normalized.json"
        if cards_normalized.exists():
            hashes["cards_normalized.json"] = hash_file(cards_normalized)
        
        objectives_normalized = self.config.intermediate_dir / "objectives_normalized.json"
        if objectives_normalized.exists():
            hashes["objectives_normalized.json"] = hash_file(objectives_normalized)
        
        faction_meta = self.config.pipeline_dir / "faction_meta.py"
        if faction_meta.exists():
            hashes["faction_meta.py"] = hash_file(faction_meta)
        
        faction_meta_json = self.config.pipeline_dir / "faction_meta.json"
        if faction_meta_json.exists():
            hashes["faction_meta.json"] = hash_file(faction_meta_json)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        outputs = [
            self.config.intermediate_dir / "cards_enriched.json",
            self.config.intermediate_dir / "objectives_enriched.json"
        ]
        
        if not all(o.exists() for o in outputs):
            return True
        
        old_hashes = self.state.file_hashes.get(self.name, {})
        new_hashes = self.get_input_hashes()
        return files_changed(old_hashes, new_hashes)
    
    def run(self) -> bool:
        # Use enrich_meta.py (CLI wrapper) not faction_meta.py (data module)
        script = self.config.pipeline_dir / "enrich_meta.py"
        cards_input = self.config.intermediate_dir / "cards_normalized.json"
        objectives_input = self.config.intermediate_dir / "objectives_normalized.json"
        cards_output = self.config.intermediate_dir / "cards_enriched.json"
        objectives_output = self.config.intermediate_dir / "objectives_enriched.json"
        
        if not script.exists():
            print(f"  WARNING: {script} not found, copying files as-is")
            if cards_input.exists():
                shutil.copy(cards_input, cards_output)
            if objectives_input.exists():
                shutil.copy(objectives_input, objectives_output)
            return True
        
        if not cards_input.exists():
            print(f"  ERROR: {cards_input} not found")
            return False
        
        print(f"  Running: enrich_meta.py")
        cmd = [
            sys.executable, str(script),
            "--cards", str(cards_input),
            "--output-cards", str(cards_output)
        ]
        
        if objectives_input.exists():
            cmd.extend([
                "--objectives", str(objectives_input),
                "--output-objectives", str(objectives_output)
            ])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  ERROR: enrich_meta.py failed")
            print(f"  {result.stderr[:500] if result.stderr else 'No error output'}")
            return False
        
        # Print stdout for visibility
        if result.stdout:
            for line in result.stdout.strip().split('\n'):
                print(f"  {line}")
        
        # Verify outputs were created
        if not cards_output.exists():
            print(f"  ERROR: {cards_output} was not created")
            return False
        
        # Copy faction_meta.json to dist if it exists
        faction_meta_json = self.config.pipeline_dir / "faction_meta.json"
        if faction_meta_json.exists():
            self.config.dist_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy(faction_meta_json, self.config.dist_dir / "faction_meta.json")
            print(f"  -> faction_meta.json copied to dist")
        
        print(f"  Output: cards_enriched.json, objectives_enriched.json")
        return True


class TrainRecommenderStep(PipelineStep):
    """Step 8: Train crew recommendation model."""
    
    name = "train_recommender"
    description = "Train crew synergy and recommendation model"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        cards_enriched = self.config.intermediate_dir / "cards_enriched.json"
        if cards_enriched.exists():
            hashes["cards_enriched.json"] = hash_file(cards_enriched)
        
        config_file = self.config.pipeline_dir / "recommender_config.json"
        if config_file.exists():
            hashes["recommender_config.json"] = hash_file(config_file)
        
        script = self.config.pipeline_dir / "crew_recommender.py"
        if script.exists():
            hashes["crew_recommender.py"] = hash_file(script)
        
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
        cards_input = self.config.intermediate_dir / "cards_enriched.json"
        output = self.config.intermediate_dir / "recommendations.json"
        config_file = self.config.pipeline_dir / "recommender_config.json"
        
        if not script.exists():
            print(f"  WARNING: {script} not found, creating empty recommendations")
            with open(output, 'w', encoding='utf-8') as f:
                json.dump({"synergies": {}, "objective_fits": {}}, f)
            return True
        
        if not cards_input.exists():
            print(f"  ERROR: {cards_input} not found")
            return False
        
        print(f"  Running: crew_recommender.py")
        cmd = [
            sys.executable, str(script),
            "--cards", str(cards_input),
            "--output", str(output)
        ]
        
        if config_file.exists():
            cmd.extend(["--config", str(config_file)])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"  WARNING: Recommender failed, creating empty file")
            print(f"  {result.stderr[:200] if result.stderr else ''}")
            with open(output, 'w', encoding='utf-8') as f:
                json.dump({"synergies": {}, "objective_fits": {}}, f)
        
        print(f"  Output: {output}")
        return True


class BundleStep(PipelineStep):
    """Step 9: Copy final outputs to dist/ and web app."""
    
    name = "bundle"
    description = "Bundle outputs for distribution"
    
    def get_input_hashes(self) -> Dict[str, str]:
        hashes = {}
        
        for filename in ["cards_enriched.json", "objectives_enriched.json", "recommendations.json"]:
            path = self.config.intermediate_dir / filename
            if path.exists():
                hashes[filename] = hash_file(path)
        
        faction_meta = self.config.dist_dir / "faction_meta.json"
        if faction_meta.exists():
            hashes["faction_meta.json"] = hash_file(faction_meta)
        
        return hashes
    
    def needs_rebuild(self) -> bool:
        outputs = [
            self.config.dist_dir / "cards.json",
            self.config.dist_dir / "objectives.json",
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
            with open(obj_dst, 'w', encoding='utf-8') as f:
                json.dump({"schemes": {}, "strategies": {}}, f)
            print(f"  -> objectives.json (empty placeholder)")
        
        # Recommendations
        rec_src = self.config.intermediate_dir / "recommendations.json"
        rec_dst = self.config.dist_dir / "recommendations.json"
        if rec_src.exists():
            shutil.copy(rec_src, rec_dst)
            print(f"  -> recommendations.json")
        else:
            with open(rec_dst, 'w', encoding='utf-8') as f:
                json.dump({"synergies": {}, "objective_fits": {}}, f)
            print(f"  -> recommendations.json (empty placeholder)")
        
        # Faction meta
        faction_meta = self.config.dist_dir / "faction_meta.json"
        if faction_meta.exists():
            print(f"  -> faction_meta.json (already present)")
        
        # Copy to web app src/data/
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
        
        # Define steps in order - SIMPLIFIED from 11 to 9 steps
        self.steps = [
            ExtractCardsStep(self.config, self.state),      # 1. PDF -> cards_raw.json
            FixCardsStep(self.config, self.state),          # 2. Apply corrections.json
            RepairAllStep(self.config, self.state),         # 3. UNIFIED: costs, stations, conditions
            ExtractTagsStep(self.config, self.state),       # 4. Extract semantic tags
            ExtractObjectivesStep(self.config, self.state), # 5. OCR objectives
            NormalizeDataStep(self.config, self.state),     # 6. Normalize names
            EnrichMetaStep(self.config, self.state),        # 7. Add meta data
            TrainRecommenderStep(self.config, self.state),  # 8. Train recommender
            BundleStep(self.config, self.state),            # 9. Bundle for dist
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
                    print(f"  [OK] Complete")
                else:
                    print(f"  [FAILED]")
                    success = False
                    break
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
                        help='Project root directory')
    parser.add_argument('--images-dir', type=Path, default=None,
                        help='Card images directory')
    
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
