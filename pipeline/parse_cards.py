#!/usr/bin/env python3
"""
Malifaux 4E Card Parser
Extracts structured data from M4E stat card PDFs.

Usage:
    python parse_cards.py --input /path/to/pdfs --output ../src/data/cards.json
    python parse_cards.py --input /path/to/pdfs --output cards.json --overrides health_overrides.json

File naming convention expected:
    M4E_Stat_{Faction}_{Subfaction}_{CardName}.pdf
    M4E_Stat_{Faction}_{Subfaction}_{CardName}_front.png
    M4E_Stat_{Faction}_{Subfaction}_{CardName}_back.png

Health Overrides:
    Create a JSON file with card IDs or image base names as keys and health values:
    {
        "M4E_Stat_Academic_Some_Model": 8,
        "arcanists-keyword-card-name": 7
    }
"""

import os
import re
import json
import argparse
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field, asdict

# Try to import pdfplumber, provide helpful error if missing
try:
    import pdfplumber
except ImportError:
    print("Error: pdfplumber not installed. Run: pip install pdfplumber")
    exit(1)

# Try to import image processing libraries for health pip extraction
try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    print("Warning: OpenCV/numpy not installed. Health extraction from images will be disabled.")
    print("Run: pip install opencv-python-headless numpy")
    HAS_CV2 = False


@dataclass
class Action:
    """Represents an Attack or Tactical action on a card."""
    name: str
    action_type: str  # "attack" or "tactical"
    range: Optional[str] = None
    skill: Optional[str] = None
    resist: Optional[str] = None
    tn: Optional[str] = None
    damage: Optional[str] = None
    description: str = ""
    triggers: list = field(default_factory=list)


@dataclass 
class Trigger:
    """Represents a trigger on an action."""
    name: str
    suit: str  # ram, crow, mask, tome
    effect: str


@dataclass
class Ability:
    """Represents a passive ability on the front of a card."""
    name: str
    effect: str


@dataclass
class Card:
    """Complete Malifaux card data structure."""
    # Identity
    id: str  # Unique identifier (filename-based)
    name: str
    
    # Faction info (from folder structure)
    faction: str = ""  # Parent folder: Arcanists, Resurrectionists, etc.
    subfaction: str = ""  # Subfolder: Academic, Wildfire, Tormented, etc.
    
    # Card type (from filename)
    card_type: str = "Stat"  # Stat, Crew, or Upgrade
    
    # Keyword info (from filename - these are the crew/hiring keywords)
    primary_keyword: str = ""  # Main keyword like Wildfire, Tormented, Urami (same as subfaction usually)
    secondary_keyword: str = ""  # Secondary like Academic
    variant: Optional[str] = None  # A, B, C for alternate sculpts/cards
    
    # Stats
    cost: Optional[int] = None
    defense: Optional[int] = None
    speed: Optional[int] = None
    willpower: Optional[int] = None
    size: Optional[int] = None
    health: Optional[int] = None  # Max health from health track
    soulstone_cache: bool = False  # True if model can use soulstones (Masters/Henchmen)
    base_size: Optional[str] = None  # e.g., "30mm", "40mm", "50mm"
    station: Optional[int] = None  # STN value for summoning
    
    # Keywords (all keywords from the card)
    keywords: list = field(default_factory=list)
    characteristics: list = field(default_factory=list)  # Unique, Totem, Minion, Henchman, etc.
    minion_limit: Optional[int] = None  # The (X) in Minion(X)
    
    # Abilities and Actions
    abilities: list = field(default_factory=list)
    attack_actions: list = field(default_factory=list)
    tactical_actions: list = field(default_factory=list)
    
    # File references (relative paths for web)
    pdf_path: str = ""
    front_image: str = ""
    back_image: str = ""
    
    # Raw text for full-text search
    raw_text: str = ""


class MalifauxCardParser:
    """Parser for Malifaux 4E stat card PDFs."""
    
    # Suit symbol mappings (these appear as special characters in PDFs)
    SUIT_SYMBOLS = {
        'r': 'ram',
        't': 'tome', 
        'c': 'crow',
        'm': 'mask',
        's': 'any',  # Sometimes used for "any suit"
        'f': 'focus',  # Focus/concentrate
    }
    
    # Common keywords in Malifaux
    COMMON_KEYWORDS = [
        'Versatile', 'Unique', 'Totem', 'Enforcer', 'Minion', 'Henchman', 'Master',
        'Beast', 'Construct', 'Undead', 'Living', 'Spirit', 'Nightmare', 'Tyrant',
        'Elite', 'Mercenary', 'Rare', 'Elemental', 'Golem', 'Gamin', 'Effigy',
        'Academic', 'Journalist', 'Guard', 'Retainer', 'Revenant', 'Qi and Gong',
        'Ancestor', 'Last Blossom', 'Oni', 'Urami', 'Savage', 'Swampfiend',
    ]
    
    def __init__(self, verbose: bool = False, overrides_file: str = None, images_dir: str = None):
        self.verbose = verbose
        self.health_overrides = {}
        self.overrides_applied = 0
        self.images_dir = Path(images_dir) if images_dir else None
        
        if self.images_dir:
            print(f"Using images directory: {self.images_dir}")
        
        # Load health overrides if file specified
        if overrides_file and os.path.exists(overrides_file):
            try:
                with open(overrides_file, 'r') as f:
                    self.health_overrides = json.load(f)
                print(f"Loaded {len(self.health_overrides)} health overrides from {overrides_file}")
            except Exception as e:
                print(f"Warning: Could not load health overrides: {e}")
    
    def log(self, msg: str):
        """Print message if verbose mode is enabled."""
        if self.verbose:
            print(msg)
    
    def parse_filename(self, filepath: str) -> dict:
        """
        Extract primary keyword and card name from filename.
        Expected formats:
            M4E_Stat_{PrimaryKeyword}_{CardName}.pdf
            M4E_Stat_{PrimaryKeyword}_{CardName}_A.pdf (variant)
            M4E_Stat_{PrimaryKeyword}_{SecondaryKeyword}_{CardName}.pdf
            M4E_Stat_{PrimaryKeyword}_{SecondaryKeyword}_{CardName}_A.pdf
        
        The actual card name comes from the PDF itself (more reliable).
        Here we extract the keywords from the filename.
        """
        filename = Path(filepath).stem
        original_filename = filename
        
        # Remove M4E_Stat_ prefix
        if filename.startswith('M4E_Stat_'):
            filename = filename[9:]
        
        # Check for variant suffix (_A, _B, _C, etc.)
        variant = None
        variant_match = re.match(r'^(.+)_([A-Z])$', filename)
        if variant_match:
            filename = variant_match.group(1)
            variant = variant_match.group(2)
        
        # Split by underscore
        parts = filename.split('_')
        
        # First part is always the primary keyword (faction-like)
        # Could be: Wildfire, Tormented, Urami, Forgotten, Guild, etc.
        primary_keyword = parts[0] if parts else "Unknown"
        
        # Remaining parts form either:
        # - Just the card name: [Fire, Golem] -> "Fire Golem"
        # - Secondary keyword + name: [Academic, Fire, Golem] -> secondary="Academic", name="Fire Golem"
        # We can't reliably distinguish without the PDF, so we'll store everything
        # and let the PDF name be authoritative
        
        secondary_keyword = ""
        name_parts = parts[1:] if len(parts) > 1 else []
        
        # Common secondary keywords that appear in filenames
        known_secondary = ['Academic', 'Guard', 'Retainer', 'Journalist', 'Performer',
                          'December', 'Foundry', 'Oxfordian', 'Witness', 'Wastrel']
        
        if name_parts and name_parts[0] in known_secondary:
            secondary_keyword = name_parts[0]
            name_parts = name_parts[1:]
        
        # Join remaining parts as the card name (fallback)
        name = ' '.join(name_parts) if name_parts else primary_keyword
        
        return {
            'primary_keyword': primary_keyword,
            'secondary_keyword': secondary_keyword,
            'name': name,
            'variant': variant,
            'id': original_filename,
            # Keep faction/subfaction for backwards compatibility
            'faction': primary_keyword,
            'subfaction': secondary_keyword,
        }
    
    def clean_doubled_text(self, text: str) -> str:
        """
        Fix doubled text that appears in some PDFs due to layering.
        e.g., "FFIIRRSS GGOOLLEEMM" -> "FIRE GOLEM"
        """
        # This handles the specific doubling pattern seen in the PDFs
        result = []
        i = 0
        while i < len(text):
            if i + 1 < len(text) and text[i] == text[i + 1]:
                result.append(text[i])
                i += 2
            else:
                result.append(text[i])
                i += 1
        return ''.join(result)
    
    def extract_stats_from_page1(self, text: str) -> dict:
        """Extract stats from front of card (page 1)."""
        stats = {
            'cost': None,
            'defense': None,
            'speed': None,
            'willpower': None,
            'size': None,
        }
        
        # The PDF has doubled text like "1100" for "10" and "55 77" for "5 7"
        # Look for the raw doubled patterns first
        
        # Cost appears as doubled digits followed by COST (e.g., "1100" = 10, "88" = 8)
        cost_match = re.search(r'(\d{2,4})\s*\n.*?CCOOSSTT|(\d{2,4})\s*CCOOSSTT', text)
        if cost_match:
            doubled = cost_match.group(1) or cost_match.group(2)
            # Undouble: "1100" -> "10", "88" -> "8"
            stats['cost'] = int(self.clean_doubled_text(doubled))
        else:
            # Fallback to cleaned text
            cleaned = self.clean_doubled_text(text)
            cost_match2 = re.search(r'(\d+)\s*COST|COST\s*(\d+)', cleaned, re.IGNORECASE)
            if cost_match2:
                stats['cost'] = int(cost_match2.group(1) or cost_match2.group(2))
        
        # Stats appear as "55 77" on one line then "DDFF SSPP" on next
        # Pattern: two doubled numbers, then DF SP labels
        stat_block = re.search(r'(\d{1,2})\s+(\d{1,2})\s*\n\s*DDFF\s+SSPP', text)
        if stat_block:
            stats['defense'] = int(self.clean_doubled_text(stat_block.group(1)))
            stats['speed'] = int(self.clean_doubled_text(stat_block.group(2)))
        
        # WP and SZ similar pattern
        wp_sz_block = re.search(r'(\d{1,2})\s+(\d{1,2})\s*\n\s*WWPP\s+SSZZ', text)
        if wp_sz_block:
            stats['willpower'] = int(self.clean_doubled_text(wp_sz_block.group(1)))
            stats['size'] = int(self.clean_doubled_text(wp_sz_block.group(2)))
        
        # Fallback: look in cleaned text
        if stats['defense'] is None:
            cleaned = self.clean_doubled_text(text)
            df_match = re.search(r'(\d+)\s*DF', cleaned, re.IGNORECASE)
            if df_match:
                stats['defense'] = int(df_match.group(1))
        
        if stats['speed'] is None:
            cleaned = self.clean_doubled_text(text)
            sp_match = re.search(r'(\d+)\s*SP', cleaned, re.IGNORECASE)
            if sp_match:
                stats['speed'] = int(sp_match.group(1))
                
        if stats['willpower'] is None:
            cleaned = self.clean_doubled_text(text)
            wp_match = re.search(r'(\d+)\s*WP', cleaned, re.IGNORECASE)
            if wp_match:
                stats['willpower'] = int(wp_match.group(1))
                
        if stats['size'] is None:
            cleaned = self.clean_doubled_text(text)
            sz_match = re.search(r'(\d+)\s*SZ', cleaned, re.IGNORECASE)
            if sz_match:
                stats['size'] = int(sz_match.group(1))
        
        return stats
    
    def extract_card_name_from_pdf(self, text: str, is_back: bool = False) -> Optional[str]:
        """
        Extract the card name from the PDF text.
        Page 2 (back) usually has cleaner text without doubling.
        The name should be:
        - On one of the first few lines
        - All caps or title case
        - 1-4 words typically
        - No colons, no long sentences
        """
        lines = text.split('\n')
        
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            # Skip empty lines
            if not line or len(line) < 2:
                continue
            # Skip stat/action header lines - use word boundaries or exact matches
            if 'Attack Actions' in line or 'Tactical Actions' in line:
                continue
            if line.startswith('Rg ') or ' Rg ' in line:
                continue
            # Skip lines that ARE stat labels (but not names that contain stat letters)
            if line in ['DF', 'SP', 'WP', 'SZ', 'COST', 'DF SP', 'WP SZ']:
                continue
            # Skip lines with colons (abilities)
            if ':' in line:
                continue
            # Skip number-only lines
            if re.match(r'^[\d\s]+$', line):
                continue
            # Skip lines that are too long to be a name (likely ability text)
            if len(line) > 40:
                continue
            # Name should be mostly capital letters or title case, 1-5 words
            # Allow quotes for names like "What Did He Throw!?"
            words = line.split()
            if 1 <= len(words) <= 5:
                # Check if it looks like a card name
                if re.match(r'^[A-Z][A-Za-z\s\'"!?,\-]+$', line):
                    name = line.strip()
                    # Convert to title case if all caps
                    if name.isupper():
                        name = name.title()
                    return name
        return None
    
    def extract_station(self, text: str) -> Optional[int]:
        """Extract STN (station) value from card."""
        cleaned = self.clean_doubled_text(text)
        match = re.search(r'STN:\s*(\d+)', cleaned)
        if match:
            return int(match.group(1))
        return None
    
    def extract_keywords(self, text: str) -> tuple:
        """Extract keywords, characteristics, and minion limit from card text."""
        keywords = []
        characteristics = []
        minion_limit = None
        
        # First try on cleaned text
        cleaned = self.clean_doubled_text(text)
        
        # Try to isolate the keyword section (before ability text with colons)
        # Keywords appear after stats, before abilities
        # Split at first ability (line starting with a capital letter followed by colon)
        keyword_section = cleaned
        ability_start = re.search(r'\n[A-Z][a-z]+.*?:', cleaned)
        if ability_start:
            keyword_section = cleaned[:ability_start.start()]
        
        # Also keep raw text keyword section for doubled patterns
        raw_keyword_section = text
        raw_ability_start = re.search(r'\n[A-Z][a-z]+.*?:', text)
        if raw_ability_start:
            raw_keyword_section = text[:raw_ability_start.start()]
        
        # Full text for fallback (but avoid ability descriptions)
        full_text = keyword_section + " " + raw_keyword_section.replace('\n', ' ')
        
        # Look for Minion(X) pattern
        minion_match = re.search(r'Minion\s*\((\d+)\)', full_text, re.IGNORECASE)
        if minion_match:
            minion_limit = int(minion_match.group(1))
            characteristics.append('Minion')
        # Also check for doubled pattern: "MMiinniioonn ((33))" or split across lines
        minion_doubled = re.search(r'[Mm][Mm]iinniioonn\s*\(\((\d)\d\)\)', raw_keyword_section)
        if minion_doubled:
            minion_limit = int(minion_doubled.group(1))
            if 'Minion' not in characteristics:
                characteristics.append('Minion')
        # Check for split doubled pattern (iinniioonn on one line, ((3)) on another)
        if re.search(r'iinniioonn', raw_keyword_section, re.IGNORECASE):
            if 'Minion' not in characteristics:
                characteristics.append('Minion')
            # Look for the limit on nearby lines
            limit_match = re.search(r'\(\((\d)\d\)\)', raw_keyword_section)
            if limit_match and minion_limit is None:
                minion_limit = int(limit_match.group(1))
        
        # Other characteristics - check only in keyword section
        # Join the section removing newlines to catch split words
        keyword_section_joined = keyword_section.replace('\n', ' ')
        raw_section_joined = raw_keyword_section.replace('\n', '')
        
        for char in ['Henchman', 'Enforcer', 'Master', 'Totem', 'Unique']:
            # Check in joined keyword section
            if re.search(rf'\b{char}\b', keyword_section_joined, re.IGNORECASE):
                if char not in characteristics:
                    characteristics.append(char)
            # Check doubled version in raw joined text
            doubled = ''.join(c+c for c in char)
            if doubled.lower() in raw_section_joined.lower():
                if char not in characteristics:
                    characteristics.append(char)
        
        # Comprehensive keyword list - all M4E keywords
        keyword_list = [
            # Universal keywords
            'Versatile', 
            # Type keywords
            'Elemental', 'Golem', 'Gamin', 'Undead', 'Spirit', 'Beast', 'Construct',
            'Living', 'Nightmare', 'Tyrant', 'Effigy', 'Emissary',
            # Hiring keywords (crew keywords)
            'Academic', 'Amalgam', 'Ancestor', 'Augmented', 'Bandit',
            'Big Hat', 'Boundary', 'Cavalier', 'Chimera', 'Crossroads', 
            'December', 'Descendant', 'Elite', 'Executioner', 'Explorer',
            'Fae', 'Family', 'Forgotten', 'Foundry', 'Frontier',
            'Freikorps', 'Guard', 'Guild', 'Honeypot', 'Journalist', 'Kin',
            'Last Blossom', 'Marshal', 'Mercenary', 
            'Mimic', 'Monk', 'Neverborn', 'Oni', 'Outcast',
            'Oxfordian', 'Performer', 'Pioneer', 'Qi and Gong', 'Rare', 
            'Redchapel', 'Resurrectionist', 'Retainer', 'Revenant', 
            'Savage', 'Seeker', 'Showgirl', 'Soulstone', 'Star Theater', 
            'Swampfiend', 'Ten Thunders', 'Tormented', 'Transmortis', 'Tricksy',
            'Urami', 'Wastrel', 'Watcher', 'Wildfire', 'Witch Hunter', 'Witness',
            'Wizz-Bang', 'Woe',
            # Note: 'Fate' and 'Fated' removed - too likely to false positive with "cheat fate"
        ]
        
        for kw in keyword_list:
            # Check in keyword section only
            if re.search(rf'\b{re.escape(kw)}\b', keyword_section, re.IGNORECASE):
                if kw not in keywords and kw not in characteristics:
                    keywords.append(kw)
            else:
                # Check for doubled version in raw keyword section
                doubled = ''.join(c+c for c in kw)
                doubled_lower = doubled.lower()
                raw_lower = raw_keyword_section.lower()
                
                # Check if full or partial doubled appears in text
                # OR if text contains start of doubled (for truncated patterns)
                if doubled_lower in raw_lower:
                    if kw not in keywords and kw not in characteristics:
                        keywords.append(kw)
                else:
                    # Check for partial matches (text might have truncated doubled version)
                    # Take first 8-16 chars of doubled and check both directions
                    for length in [16, 14, 12, 10, 8]:
                        partial = doubled_lower[:min(length, len(doubled_lower))]
                        if len(partial) >= 8:
                            if partial in raw_lower or raw_lower.replace('\n', '').replace(' ', '') in doubled_lower:
                                if kw not in keywords and kw not in characteristics:
                                    keywords.append(kw)
                                break
        
        return keywords, characteristics, minion_limit
    
    def extract_abilities(self, text: str) -> list:
        """Extract passive abilities from front of card."""
        abilities = []
        
        # Clean doubled text
        text = self.clean_doubled_text(text)
        
        # Abilities follow pattern: "Name: Description text."
        # They appear after the stats and keywords
        ability_pattern = re.findall(
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*:\s*([^:]+?)(?=\n[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:|$)',
            text, re.DOTALL
        )
        
        for name, effect in ability_pattern:
            # Skip if this looks like a stat or action header
            if name.upper() in ['DF', 'SP', 'WP', 'SZ', 'COST', 'RG', 'SKL', 'RST', 'TN', 'DMG']:
                continue
            abilities.append(Ability(name=name.strip(), effect=effect.strip()))
        
        return abilities
    
    def extract_actions(self, text: str) -> tuple:
        """Extract attack and tactical actions from back of card (page 2)."""
        attack_actions = []
        tactical_actions = []
        
        lines = text.split('\n')
        current_section = None
        current_action = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Detect section headers
            if 'Attack Actions' in line:
                current_section = 'attack'
                continue
            elif 'Tactical Actions' in line:
                current_section = 'tactical'
                continue
            
            # Skip header row
            if re.match(r'^Rg\s+Skl\s+Rst\s+TN\s+Dmg', line):
                continue
            
            # Detect action line (name followed by stats)
            # Pattern: ActionName [range] [skill] [resist] [tn] [damage]
            action_match = re.match(
                r'^([A-Za-z][\w\s\']+?)\s+([\d"y\-]+|\-)\s+(\d+|\-)\s+(\w+|\-)\s+([\d\-]+|\-)\s+([\d/\-]+|\-)?\s*$',
                line
            )
            
            if action_match and current_section:
                # Save previous action if exists
                if current_action:
                    if current_action.action_type == 'attack':
                        attack_actions.append(current_action)
                    else:
                        tactical_actions.append(current_action)
                
                name, rg, skl, rst, tn, dmg = action_match.groups()
                current_action = Action(
                    name=name.strip(),
                    action_type=current_section,
                    range=rg if rg != '-' else None,
                    skill=skl if skl != '-' else None,
                    resist=rst if rst != '-' else None,
                    tn=tn if tn != '-' else None,
                    damage=dmg if dmg and dmg != '-' else None,
                )
                continue
            
            # Detect trigger line (starts with suit symbol)
            trigger_match = re.match(r'^([rtcmsf])\s+(.+?):\s*(.+)$', line)
            if trigger_match and current_action:
                suit_char, trigger_name, trigger_effect = trigger_match.groups()
                suit = self.SUIT_SYMBOLS.get(suit_char, suit_char)
                current_action.triggers.append(Trigger(
                    name=trigger_name.strip(),
                    suit=suit,
                    effect=trigger_effect.strip()
                ))
                continue
            
            # Otherwise, append to current action description
            if current_action:
                if current_action.description:
                    current_action.description += ' ' + line
                else:
                    current_action.description = line
        
        # Don't forget the last action
        if current_action:
            if current_action.action_type == 'attack':
                attack_actions.append(current_action)
            else:
                tactical_actions.append(current_action)
        
        return attack_actions, tactical_actions
    
    def extract_base_size(self, text: str) -> Optional[str]:
        """Extract base size from card (usually at bottom of back)."""
        match = re.search(r'(\d+)\s*mm', text, re.IGNORECASE)
        if match:
            return f"{match.group(1)}mm"
        return None
    
    def extract_health_from_image(self, image_path: str) -> Optional[int]:
        """
        Extract health pip count from the bottom of a card front image.
        
        Uses HoughCircles detection to find the circular health pips at the
        bottom of the card. The soulstone indicator (leftmost circle) is
        filtered out based on its x position.
        
        Args:
            image_path: Path to the card front PNG image
        
        Returns:
            Health value (int) or None if extraction failed
        """
        if not HAS_CV2:
            self.log("OpenCV not available, skipping image-based health extraction")
            return None
        
        if not os.path.exists(image_path):
            self.log(f"Health image not found: {image_path}")
            return None
        
        try:
            # Load image with OpenCV
            img = cv2.imread(image_path)
            if img is None:
                self.log(f"Failed to load image: {image_path}")
                return None
            
            height, width = img.shape[:2]
            
            # Crop to bottom 12% of card (where health pips are)
            bottom_start = int(height * 0.88)
            bottom_region = img[bottom_start:height, :]
            region_height = bottom_region.shape[0]
            
            # Convert to grayscale and blur for better circle detection
            gray = cv2.cvtColor(bottom_region, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Use HoughCircles for robust circle detection
            # This works better than contour detection for tightly-packed pips
            circles = cv2.HoughCircles(
                blurred,
                cv2.HOUGH_GRADIENT,
                dp=1,
                minDist=35,      # Min distance between circle centers
                param1=50,       # Canny high threshold
                param2=30,       # Accumulator threshold
                minRadius=15,    # Min radius for health pips
                maxRadius=25     # Max radius for health pips
            )
            
            if circles is None:
                return None
            
            circles = np.uint16(np.around(circles))
            sorted_circles = sorted(circles[0], key=lambda c: c[0])
            
            # Filter to pip y-range (middle of cropped region, where pips are)
            pip_circles = [c for c in sorted_circles 
                         if region_height * 0.5 < c[1] < region_height * 0.9]
            
            # Filter out soulstone diamond (leftmost circle, typically x < 75)
            pip_circles = [c for c in pip_circles if c[0] > 75]
            
            # Filter out any circles in the right frame edge
            pip_circles = [c for c in pip_circles if c[0] < width - 50]
            
            health = len(pip_circles)
            
            # Sanity check: health should be between 1 and 20
            if 1 <= health <= 20:
                return health
            
            return None
            
        except Exception as e:
            self.log(f"Error extracting health from image: {e}")
            return None
    
    def extract_soulstone_cache_from_image(self, image_path: str) -> bool:
        """
        Detect if the card has a soulstone cache indicator.
        
        The soulstone cache is indicated by a diamond/circle at the leftmost
        position of the health track (x < 75). Masters and Henchmen have this.
        
        Args:
            image_path: Path to the card front PNG image
        
        Returns:
            True if soulstone cache detected, False otherwise
        """
        if not HAS_CV2:
            return False
        
        if not os.path.exists(image_path):
            return False
        
        try:
            # Load image with OpenCV
            img = cv2.imread(image_path)
            if img is None:
                return False
            
            height, width = img.shape[:2]
            
            # Crop to bottom 12% of card (where health pips are)
            bottom_start = int(height * 0.88)
            bottom_region = img[bottom_start:height, :]
            region_height = bottom_region.shape[0]
            
            # Convert to grayscale and blur for better circle detection
            gray = cv2.cvtColor(bottom_region, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Use HoughCircles to find circles
            circles = cv2.HoughCircles(
                blurred,
                cv2.HOUGH_GRADIENT,
                dp=1,
                minDist=35,
                param1=50,
                param2=30,
                minRadius=15,
                maxRadius=25
            )
            
            if circles is None:
                return False
            
            circles = np.uint16(np.around(circles))
            
            # Check for a circle in the leftmost position (x < 75)
            # This is where the soulstone cache indicator appears
            for circle in circles[0]:
                x, y = circle[0], circle[1]
                # Check if in the soulstone position (leftmost) and correct y-range
                if x < 75 and region_height * 0.3 < y < region_height * 0.95:
                    return True
            
            return False
            
        except Exception as e:
            self.log(f"Error detecting soulstone cache: {e}")
            return False
    
    def extract_health(self, text: str) -> Optional[int]:
        """
        Extract max health from health track in PDF text.
        This is a fallback - image-based extraction is preferred.
        Health track shows numbers 1-N at bottom of front card.
        """
        # Look for sequence of numbers that represents health track
        # Usually appears as "1 2 3 4 5 6 7 8 9 10 11 12 13" or similar
        health_match = re.search(r'(\d+)\s*$', text)
        if health_match:
            # This might just be the last number, let's look for the full track
            track_match = re.findall(r'\b(\d{1,2})\b', text[-100:])  # Look at end of text
            if track_match:
                try:
                    return max(int(n) for n in track_match if int(n) <= 20)
                except ValueError:
                    pass
        return None
    
    def parse_pdf(self, pdf_path: str) -> Optional[Card]:
        """Parse a single PDF and return a Card object."""
        self.log(f"Parsing: {pdf_path}")
        
        try:
            # Extract filename info
            file_info = self.parse_filename(pdf_path)
            
            # Extract faction and subfaction from folder structure
            # Expected: .../images/{Faction}/{Subfaction}/filename.pdf
            path_parts = Path(pdf_path).parts
            faction = ""
            subfaction = ""
            
            # Find "images" folder and extract faction/subfaction from path after it
            try:
                images_idx = [p.lower() for p in path_parts].index('images')
                if images_idx + 1 < len(path_parts):
                    faction = path_parts[images_idx + 1]
                if images_idx + 2 < len(path_parts) - 1:  # -1 because last part is filename
                    subfaction = path_parts[images_idx + 2]
            except ValueError:
                # "images" not in path, try to use last two directories
                if len(path_parts) >= 3:
                    faction = path_parts[-3]  # grandparent folder
                    subfaction = path_parts[-2]  # parent folder
            
            # Extract card type from filename (M4E_Stat_..., M4E_Crew_..., M4E_Upgrade_...)
            filename = Path(pdf_path).stem
            card_type = "Stat"  # default
            if "_Stat_" in filename:
                card_type = "Stat"
            elif "_Crew_" in filename:
                card_type = "Crew"
            elif "_Upgrade_" in filename:
                card_type = "Upgrade"
            
            # Read PDF
            with pdfplumber.open(pdf_path) as pdf:
                if len(pdf.pages) < 2:
                    self.log(f"  Warning: PDF has only {len(pdf.pages)} page(s)")
                
                # Page 1: Front of card (stats, abilities)
                page1_text = pdf.pages[0].extract_text() if len(pdf.pages) > 0 else ""
                
                # Page 2: Back of card (actions)
                page2_text = pdf.pages[1].extract_text() if len(pdf.pages) > 1 else ""
            
            # Get card name from PDF (more reliable than filename)
            # Try page 2 first (back has cleaner text without doubling)
            pdf_name = self.extract_card_name_from_pdf(page2_text, is_back=True)
            if not pdf_name:
                # Fall back to page 1
                pdf_name = self.extract_card_name_from_pdf(page1_text, is_back=False)
            
            # Use PDF name if found, otherwise fall back to filename parsing
            if pdf_name:
                card_name = pdf_name
            else:
                card_name = file_info['name']
            
            # Extract all data
            stats = self.extract_stats_from_page1(page1_text)
            keywords, characteristics, minion_limit = self.extract_keywords(page1_text)
            abilities = self.extract_abilities(page1_text)
            attack_actions, tactical_actions = self.extract_actions(page2_text)
            base_size = self.extract_base_size(page2_text)
            station = self.extract_station(page1_text)
            
            # Build relative paths for images
            # Handle variant suffix in image filename
            base_name = Path(pdf_path).stem
            # Remove _A, _B suffix for image matching if it's a variant
            if file_info.get('variant'):
                # Images might be named with _A or without - try to be flexible
                image_base = base_name  # Keep as-is for now
            else:
                image_base = base_name
            
            # Build front image path for health extraction
            front_image_rel = f"{faction}/{subfaction}/{image_base}_front.png" if subfaction else f"{faction}/{image_base}_front.png"
            
            # Extract health from image (primary method)
            # Try images_dir first (separate images repo), fallback to same dir as PDF
            front_image_path = None
            if self.images_dir:
                # Use the images directory with faction/subfaction structure
                front_image_path = self.images_dir / front_image_rel
                if not front_image_path.exists():
                    self.log(f"  Image not found at {front_image_path}")
                    front_image_path = None
            
            # Fallback: check same directory as PDF
            if front_image_path is None:
                pdf_dir = Path(pdf_path).parent
                front_image_path = pdf_dir / f"{image_base}_front.png"
                if not front_image_path.exists():
                    front_image_path = None
            
            health = None
            soulstone_cache = False
            if front_image_path and front_image_path.exists():
                health = self.extract_health_from_image(str(front_image_path))
                if health:
                    self.log(f"  Health from image: {health}")
                
                # Also check for soulstone cache indicator
                soulstone_cache = self.extract_soulstone_cache_from_image(str(front_image_path))
                if soulstone_cache:
                    self.log(f"  Soulstone cache detected")
            else:
                self.log(f"  No front image found for health extraction")
            
            # Fallback to PDF text extraction (rarely works)
            if health is None:
                health = self.extract_health(page1_text)
                if health:
                    self.log(f"  Health from PDF text: {health}")
            
            # Check for health override (uses card ID or filename stem)
            card_id = file_info['id']
            if card_id in self.health_overrides:
                old_health = health
                health = self.health_overrides[card_id]
                self.overrides_applied += 1
                self.log(f"  Health override: {old_health} -> {health}")
            elif image_base in self.health_overrides:
                old_health = health
                health = self.health_overrides[image_base]
                self.overrides_applied += 1
                self.log(f"  Health override: {old_health} -> {health}")
            
            # Construct card
            card = Card(
                id=file_info['id'],
                name=card_name,
                faction=faction,
                subfaction=subfaction,
                card_type=card_type,
                primary_keyword=file_info['primary_keyword'],
                secondary_keyword=file_info['secondary_keyword'],
                variant=file_info.get('variant'),
                cost=stats['cost'],
                defense=stats['defense'],
                speed=stats['speed'],
                willpower=stats['willpower'],
                size=stats['size'],
                health=health,
                soulstone_cache=soulstone_cache,
                base_size=base_size,
                station=station,
                keywords=keywords,
                characteristics=characteristics,
                minion_limit=minion_limit,
                abilities=[asdict(a) for a in abilities],
                attack_actions=[asdict(a) for a in attack_actions],
                tactical_actions=[asdict(a) for a in tactical_actions],
                pdf_path=str(Path(pdf_path).name),
                front_image=front_image_rel,
                back_image=f"{faction}/{subfaction}/{image_base}_back.png" if subfaction else f"{faction}/{image_base}_back.png",
                raw_text=page1_text + "\n" + page2_text,
            )
            
            self.log(f"  Parsed: {card.name} (Faction: {card.faction}/{card.subfaction}, Type: {card.card_type})")
            self.log(f"  Stats: Cost={card.cost}, Df={card.defense}, Sp={card.speed}, Wp={card.willpower}, Sz={card.size}, HP={card.health}, SS={card.soulstone_cache}")
            self.log(f"  Keywords: {card.keywords}, Chars: {card.characteristics}")
            if card.minion_limit:
                self.log(f"  Minion limit: {card.minion_limit}")
            if card.station:
                self.log(f"  Station: {card.station}")
            self.log(f"  Abilities: {len(card.abilities)}, Attacks: {len(card.attack_actions)}, Tacticals: {len(card.tactical_actions)}")
            
            return card
            
        except Exception as e:
            print(f"Error parsing {pdf_path}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def parse_directory(self, input_dir: str, output_file: str):
        """Parse all PDFs in a directory and output JSON."""
        input_path = Path(input_dir)
        cards = []
        
        # Find all PDFs
        pdf_files = list(input_path.rglob("*.pdf"))
        print(f"Found {len(pdf_files)} PDF files")
        
        for pdf_file in pdf_files:
            card = self.parse_pdf(str(pdf_file))
            if card:
                cards.append(asdict(card))
        
        # Sort by faction, then subfaction, then name
        cards.sort(key=lambda c: (c['faction'], c['subfaction'], c['name']))
        
        # Output JSON
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                'version': '1.0',
                'generated': str(Path(output_file).stat().st_mtime if output_path.exists() else ''),
                'total_cards': len(cards),
                'cards': cards
            }, f, indent=2, ensure_ascii=False)
        
        print(f"Wrote {len(cards)} cards to {output_file}")
        
        # Health extraction summary
        stat_cards = [c for c in cards if c.get('card_type') == 'Stat']
        health_count = sum(1 for c in stat_cards if c.get('health') is not None)
        print(f"\nHealth extraction: {health_count}/{len(stat_cards)} model cards")
        if self.overrides_applied > 0:
            print(f"Health overrides applied: {self.overrides_applied}")
        
        # Generate summary
        factions = {}
        for card in cards:
            faction = card['faction']
            if faction not in factions:
                factions[faction] = {'count': 0, 'subfactions': set()}
            factions[faction]['count'] += 1
            if card['subfaction']:
                factions[faction]['subfactions'].add(card['subfaction'])
        
        print("\nSummary by faction:")
        for faction, info in sorted(factions.items()):
            subfactions = ', '.join(sorted(info['subfactions'])) if info['subfactions'] else 'none'
            print(f"  {faction}: {info['count']} cards, subfactions: {subfactions}")


def main():
    parser = argparse.ArgumentParser(description='Parse Malifaux 4E stat card PDFs')
    parser.add_argument('--input', '-i', help='Input directory containing PDFs')
    parser.add_argument('--output', '-o', default='cards.json', help='Output JSON file')
    parser.add_argument('--images-dir', help='Directory containing card PNG images (if separate from PDFs)')
    parser.add_argument('--overrides', help='JSON file with health value overrides')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--single', '-s', help='Parse a single PDF file (for testing)')
    
    args = parser.parse_args()
    
    parser_instance = MalifauxCardParser(
        verbose=args.verbose, 
        overrides_file=args.overrides,
        images_dir=args.images_dir
    )
    
    if args.single:
        card = parser_instance.parse_pdf(args.single)
        if card:
            print(json.dumps(asdict(card), indent=2))
    else:
        if not args.input:
            parser.error("--input is required when not using --single")
        parser_instance.parse_directory(args.input, args.output)


if __name__ == '__main__':
    main()
