#!/usr/bin/env python3
"""
Malifaux Tag Extraction Pipeline
Extracts semantic tags from ability/action text for ML-ready crew building.

This module takes your existing cards.json and enriches it with:
- Condition tags (applied, required, removed)
- Marker tags (generated, consumed, required)
- Movement tags
- Combat tags
- Support tags
- Control tags  
- Defensive tags
- Summon relationships
- Role classifications

Usage:
    python tag_extractor.py --input cards.json --output cards_enriched.json
    python tag_extractor.py --input cards.json --output cards_enriched.json --review-queue review.json
"""

import json
import re
import argparse
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Set, Tuple
from collections import Counter


# ═══════════════════════════════════════════════════════════════════════════════
# TAXONOMY - The controlled vocabulary for all tags
# ═══════════════════════════════════════════════════════════════════════════════

TAXONOMY = {
    "conditions": [
        "burning", "poison", "slow", "fast", "focused", "stunned", 
        "distracted", "injured", "staggered", "shielded", "concealed",
        "insight", "entranced", "adversary", "blinded", "gluted",
        "cursed", "paralyzed", "terrified"
    ],
    
    "markers": [
        "corpse", "scrap", "scheme_marker", "pyre", "ice_pillar", 
        "shadow", "web", "hazardous", "destructible", "remains",
        "strategy_marker", "lodestone", "pylon", "vent"
    ],
    
    "movement": [
        "push", "place", "leap", "flight", "unimpeded", "incorporeal",
        "butterfly_jump", "dont_mind_me", "charge", "bonus_move", "interact"
    ],
    
    "combat": [
        "blast", "shockwave", "aura", "pulse", "irreducible", 
        "bonus_damage", "direct_damage", "armor_piercing", "execute",
        "min_damage_3", "severe_damage", "weak_damage"
    ],
    
    "defense": [
        "armor", "hard_to_kill", "hard_to_wound", "incorporeal",
        "manipulative", "terrifying", "serene_countenance", "protected",
        "demise", "regeneration", "damage_reduction"
    ],
    
    "support": [
        "healing", "buff", "stat_buff", "condition_removal", 
        "card_draw", "soulstone_generation", "pass_token", "obey_friendly"
    ],
    
    "control": [
        "obey", "lure", "push_enemy", "stat_debuff", "action_denial",
        "movement_denial", "engagement", "activation_control"
    ],
    
    "roles": [
        "beater", "tank", "tarpit", "control", "support", "scheme_runner",
        "summoner", "ranged_damage", "melee_damage", "assassin", 
        "area_denial", "condition_engine", "utility", "tech_piece", "battery"
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# EXTRACTION PATTERNS - Regex patterns to find tags in text
# ═══════════════════════════════════════════════════════════════════════════════

class ExtractionPatterns:
    """
    All regex patterns for extracting semantic tags from Malifaux card text.
    
    Design principle: Each pattern should be specific enough to avoid false
    positives but flexible enough to catch natural language variations.
    """
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONDITION PATTERNS
    # ─────────────────────────────────────────────────────────────────────────
    
    # Conditions that get APPLIED to targets
    CONDITIONS_APPLIED = [
        # Standard "gains X token" patterns
        (r'gains?\s+(?:a\s+)?(\w+)\s+token', 1),
        # "Target gains Burning"
        (r'target\s+gains?\s+(?:a\s+)?(\w+)', 1),
        # "give/grant X token"  
        (r'(?:give|grant)s?\s+(?:the\s+)?(?:target\s+)?(?:a\s+)?(\w+)\s+token', 1),
        # "receives X token"
        (r'receives?\s+(?:a\s+)?(\w+)\s+token', 1),
        # "apply Burning"
        (r'apply\s+(?:a\s+)?(\w+)', 1),
        # "suffer/suffers X" (for conditions)
        (r'suffers?\s+(?:a\s+)?(\w+)\s+token', 1),
    ]
    
    # Conditions REQUIRED for effects to trigger
    CONDITIONS_REQUIRED = [
        # "if target has X"
        (r'if\s+(?:the\s+)?target\s+has\s+(?:a\s+)?(\w+)', 1),
        # "while this model has X"
        (r'while\s+(?:this\s+model\s+)?has\s+(?:a\s+)?(\w+)', 1),
        # "must have X token"
        (r'must\s+have\s+(?:a\s+)?(\w+)\s+token', 1),
        # "requires X"
        (r'requires?\s+(?:a\s+)?(\w+)\s+token', 1),
        # "enemy/friendly with X"
        (r'(?:enemy|friendly)\s+(?:model\s+)?with\s+(?:a\s+)?(\w+)', 1),
    ]
    
    # Conditions that get REMOVED
    CONDITIONS_REMOVED = [
        # "remove X token"
        (r'removes?\s+(?:a\s+)?(\w+)\s+token', 1),
        # "discard X token"
        (r'discards?\s+(?:a\s+)?(\w+)\s+token', 1),
        # "end X"
        (r'ends?\s+(?:the\s+)?(\w+)\s+(?:condition|token)', 1),
        # "lose X token"
        (r'loses?\s+(?:a\s+)?(\w+)\s+token', 1),
    ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # MARKER PATTERNS
    # ─────────────────────────────────────────────────────────────────────────
    
    # Markers that get GENERATED/PLACED
    MARKERS_GENERATED = [
        # "place/make a X marker"
        (r'(?:place|make|create|drop)\s+(?:a\s+)?(?:\d+mm\s+)?(\w+(?:\s+\w+)?)\s*marker', 1),
        # "summon X marker"
        (r'summons?\s+(?:a\s+)?(\w+)\s*marker', 1),
        # Scheme marker special case
        (r'(?:place|make)\s+(?:a\s+)?scheme\s+marker', None, 'scheme_marker'),
    ]
    
    # Markers that get CONSUMED/REMOVED
    MARKERS_CONSUMED = [
        # "remove X marker"
        (r'removes?\s+(?:a\s+)?(?:nearby\s+)?(\w+(?:\s+\w+)?)\s*marker', 1),
        # "discard X marker"
        (r'discards?\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s*marker', 1),
        # "destroy X marker"
        (r'destroys?\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s*marker', 1),
        # "target a X marker" (often means consume)
        (r'target\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s*marker', 1),
    ]
    
    # Markers REQUIRED for effects
    MARKERS_REQUIRED = [
        # "within X of a Y marker"
        (r'within\s+\d+"\s+of\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s*marker', 1),
        # "in base contact with X marker"
        (r'(?:in\s+)?base\s+contact\s+with\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s*marker', 1),
        # "if there is a X marker"
        (r'if\s+there\s+is\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s*marker', 1),
    ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # MOVEMENT PATTERNS
    # ─────────────────────────────────────────────────────────────────────────
    
    MOVEMENT = [
        # Push patterns - explicit "push" (rare in M4E)
        (r'push(?:es|ed)?\s+(?:up\s+to\s+)?(\d+)"', None, 'push'),
        (r'push(?:es|ed)?\s+(?:the\s+)?(?:target|this\s+model)', None, 'push'),
        (r'push\s+(?:it|them|this)', None, 'push'),
        # Push patterns - M4E style "move toward/away"
        (r'move[sd]?\s+(?:up\s+to\s+)?\d+"\s*(?:directly\s+)?(?:toward|away)', None, 'push'),
        (r'(?:directly\s+)?(?:toward|away\s+from)\s+(?:this\s+model|the\s+target)', None, 'push'),
        (r'in\s+a\s+straight\s+line', None, 'push'),
        # Place patterns
        (r'place(?:s|d)?\s+(?:this\s+model|target|itself)', None, 'place'),
        (r'(?:may\s+)?place\s+(?:anywhere|within)', None, 'place'),
        # Movement abilities
        (r'\bLeap\b', None, 'leap'),
        (r'\bFlight\b', None, 'flight'),
        (r'\bUnimpeded\b', None, 'unimpeded'),
        (r'\bIncorporeal\b', None, 'incorporeal'),
        (r'Butterfly\s+Jump', None, 'butterfly_jump'),
        (r"Don.?t\s+Mind\s+Me", None, 'dont_mind_me'),  # Use . to match any apostrophe type
        (r'DDOONN.?TT\s+MMIINNDD\s+MMEE', None, 'dont_mind_me'),  # OCR artifact pattern
        # Bonus movement
        (r'(?:may\s+)?move\s+(?:up\s+to\s+)?(?:its|their)?\s*(?:Mv|Speed)', None, 'bonus_move'),
        (r'take\s+(?:a\s+)?(?:free\s+)?move\s+action', None, 'bonus_move'),
        # Charge
        (r'\bCharge\b', None, 'charge'),
        # Interact abilities (important for scheme running)
        (r'\bInteract\b', None, 'interact'),
        (r'take\s+(?:a\s+)?(?:free\s+)?[Ii]nteract\s+action', None, 'interact'),
        (r'(?:may|can)\s+[Ii]nteract', None, 'interact'),
        (r'[Ii]nteract\s+(?:action|while)', None, 'interact'),
    ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # COMBAT PATTERNS  
    # ─────────────────────────────────────────────────────────────────────────
    
    COMBAT = [
        # Area effects
        (r'\bblast\b', None, 'blast'),
        (r'\bshockwave\b', None, 'shockwave'),
        (r'\baura\b', None, 'aura'),
        (r'\bpulse\b', None, 'pulse'),
        (r'within\s+p?\d+"', None, 'aura'),  # p3" pattern means aura
        # Damage modifiers
        (r'irreducible', None, 'irreducible'),
        (r'\+\d+\s*(?:to\s+)?damage', None, 'bonus_damage'),
        (r'deal\s+\+\d+\s+damage', None, 'bonus_damage'),
        (r'(?:deal|suffer)s?\s+\d+\s+damage', None, 'direct_damage'),
        # Armor interaction
        (r'ignores?\s+(?:Armor|armor)', None, 'armor_piercing'),
        (r'bypass(?:es)?\s+(?:Armor|armor)', None, 'armor_piercing'),
        (r'[Aa]rmor\s*[Pp]iercing', None, 'armor_piercing'),
        (r'AARRMMOORR\s*PPIIEERRCCIINNGG', None, 'armor_piercing'),  # OCR artifact
        (r'reduce(?:s|d)?\s+(?:target.s?\s+)?[Aa]rmor', None, 'armor_piercing'),
        # Execute effects
        (r'(?:kill|slay|execute)\s+(?:the\s+)?target', None, 'execute'),
        (r'reduce(?:s|d)?\s+(?:to|below)\s+0', None, 'execute'),
    ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # DEFENSIVE PATTERNS
    # ─────────────────────────────────────────────────────────────────────────
    
    DEFENSE = [
        # Damage reduction
        (r'[Aa]rmor\s*\+?(\d+)', None, 'armor'),
        (r'[Rr]educe\s+(?:all\s+)?damage', None, 'damage_reduction'),
        (r'damage\s+(?:is\s+)?reduced', None, 'damage_reduction'),
        # Survival abilities
        (r'[Hh]ard\s+to\s+[Kk]ill', None, 'hard_to_kill'),
        (r'[Hh]ard\s+to\s+[Ww]ound', None, 'hard_to_wound'),
        (r'[Ii]ncorporeal', None, 'incorporeal'),
        # Attack mitigation
        (r'[Mm]anipulative', None, 'manipulative'),
        (r'[Tt]errifying', None, 'terrifying'),
        (r'[Ss]erene\s+[Cc]ountenance', None, 'serene_countenance'),
        # Protection
        (r'[Pp]rotected', None, 'protected'),
        (r'takes?\s+damage\s+instead', None, 'protected'),
        # Regeneration
        (r'[Rr]egenerat', None, 'regeneration'),
        (r'heals?\s+(?:at\s+)?(?:the\s+)?(?:start|end)\s+of', None, 'regeneration'),
        # Demise
        (r'[Dd]emise', None, 'demise'),
        (r'[Ww]hen\s+(?:this\s+model\s+)?(?:is\s+)?killed', None, 'demise'),
    ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # SUPPORT PATTERNS
    # ─────────────────────────────────────────────────────────────────────────
    
    SUPPORT = [
        # Healing
        (r'heals?\s+(\d+)', None, 'healing'),
        (r'(?:target|ally)\s+heals', None, 'healing'),
        # Buffs
        (r'gains?\s+\+\d+\s*(?:to\s+)?(?:Df|Wp|Mv|Sp)', None, 'stat_buff'),
        (r'(?:give|grant)s?\s+(?:a\s+)?(?:Shielded|Fast|Focused)', None, 'buff'),
        # Resource generation
        (r'draw(?:s)?\s+(?:a\s+)?card', None, 'card_draw'),
        (r'soulstone', None, 'soulstone_generation'),
        (r'pass\s+token', None, 'pass_token'),
        # Friendly obey
        (r'(?:ally|friendly)\s+(?:model\s+)?(?:may\s+)?(?:take|declare)', None, 'obey_friendly'),
    ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONTROL PATTERNS
    # ─────────────────────────────────────────────────────────────────────────
    
    CONTROL = [
        # Obey/Lure
        (r'\b[Oo]bey\b', None, 'obey'),
        (r'\b[Ll]ure\b', None, 'lure'),
        # Enemy push
        (r'push(?:es)?\s+(?:the\s+)?(?:target|enemy)', None, 'push_enemy'),
        (r'(?:target|enemy)\s+(?:is\s+)?pushed', None, 'push_enemy'),
        # Stat debuffs
        (r'(?:enemy|target)\s+(?:suffers?|gains?|receives?)\s+-\d+', None, 'stat_debuff'),
        (r'-\d+\s*(?:to\s+)?(?:Df|Wp|Mv|Sp)', None, 'stat_debuff'),
        # Action denial
        (r'(?:cannot|can\'t|may\s+not)\s+(?:take|declare)\s+(?:actions?|attacks?)', None, 'action_denial'),
        # Movement denial
        (r'(?:cannot|can\'t|may\s+not)\s+(?:move|Push|Place)', None, 'movement_denial'),
        (r'(?:Mv|Speed)\s+(?:to|becomes?)\s+0', None, 'movement_denial'),
        # Engagement
        (r'\b[Ee]ngaged?\b', None, 'engagement'),
    ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # SUMMON PATTERNS
    # ─────────────────────────────────────────────────────────────────────────
    
    SUMMONS = [
        # Standard summon - more specific pattern
        # "Summon a/an X" where X is a proper noun (capitalized word(s))
        (r'[Ss]ummon\s+(?:a\s+|an\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:in|into|within|marker)', 1),
        # Backup pattern for "Summon X" without preposition
        (r'[Ss]ummon\s+(?:a\s+|an\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)?)', 1),
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# TAG EXTRACTOR CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class TagExtractor:
    """
    Extracts semantic tags from Malifaux card text.
    
    This is the core engine that transforms raw ability/action text into
    structured, ML-ready tags.
    """
    
    def __init__(self, taxonomy: dict = TAXONOMY):
        self.taxonomy = taxonomy
        self.valid_conditions = set(taxonomy['conditions'])
        self.valid_markers = set(taxonomy['markers'])
        
    def _normalize_tag(self, tag: str) -> str:
        """Normalize a tag to lowercase with underscores."""
        return tag.lower().strip().replace(' ', '_')
    
    def _extract_with_patterns(
        self, 
        text: str, 
        patterns: list, 
        valid_set: Optional[Set[str]] = None
    ) -> Set[str]:
        """
        Apply extraction patterns to text and return matching tags.
        
        Args:
            text: The text to search
            patterns: List of (pattern, group_index, fixed_tag) tuples
            valid_set: Optional set of valid tags to filter results
            
        Returns:
            Set of extracted tags
        """
        results = set()
        
        for pattern_tuple in patterns:
            pattern = pattern_tuple[0]
            group_idx = pattern_tuple[1] if len(pattern_tuple) > 1 else None
            fixed_tag = pattern_tuple[2] if len(pattern_tuple) > 2 else None
            
            regex = re.compile(pattern, re.IGNORECASE)
            
            for match in regex.finditer(text):
                if fixed_tag:
                    results.add(fixed_tag)
                elif group_idx is not None:
                    try:
                        extracted = self._normalize_tag(match.group(group_idx))
                        if valid_set is None or extracted in valid_set:
                            results.add(extracted)
                    except IndexError:
                        continue
                        
        return results
    
    def extract_conditions_applied(self, text: str) -> List[str]:
        """Extract conditions that are applied by this text."""
        return sorted(self._extract_with_patterns(
            text, 
            ExtractionPatterns.CONDITIONS_APPLIED,
            self.valid_conditions
        ))
    
    def extract_conditions_required(self, text: str) -> List[str]:
        """Extract conditions required for effects to trigger."""
        return sorted(self._extract_with_patterns(
            text,
            ExtractionPatterns.CONDITIONS_REQUIRED,
            self.valid_conditions
        ))
    
    def extract_conditions_removed(self, text: str) -> List[str]:
        """Extract conditions that are removed by this text."""
        return sorted(self._extract_with_patterns(
            text,
            ExtractionPatterns.CONDITIONS_REMOVED,
            self.valid_conditions
        ))
    
    def extract_markers_generated(self, text: str) -> List[str]:
        """Extract markers that are placed/created."""
        markers = self._extract_with_patterns(
            text,
            ExtractionPatterns.MARKERS_GENERATED,
            self.valid_markers
        )
        # Also check for specific marker mentions
        if re.search(r'scheme\s+marker', text, re.IGNORECASE):
            markers.add('scheme_marker')
        if re.search(r'corpse\s+marker', text, re.IGNORECASE):
            markers.add('corpse')
        if re.search(r'scrap\s+marker', text, re.IGNORECASE):
            markers.add('scrap')
        if re.search(r'pyre\s+marker', text, re.IGNORECASE):
            markers.add('pyre')
        if re.search(r'ice\s+pillar', text, re.IGNORECASE):
            markers.add('ice_pillar')
        if re.search(r'shadow\s+marker', text, re.IGNORECASE):
            markers.add('shadow')
        return sorted(markers)
    
    def extract_markers_consumed(self, text: str) -> List[str]:
        """Extract markers that are consumed/removed."""
        return sorted(self._extract_with_patterns(
            text,
            ExtractionPatterns.MARKERS_CONSUMED,
            self.valid_markers
        ))
    
    def extract_markers_required(self, text: str) -> List[str]:
        """Extract markers required for effects."""
        return sorted(self._extract_with_patterns(
            text,
            ExtractionPatterns.MARKERS_REQUIRED,
            self.valid_markers
        ))
    
    def extract_movement_tags(self, text: str) -> List[str]:
        """Extract movement-related tags."""
        return sorted(self._extract_with_patterns(
            text,
            ExtractionPatterns.MOVEMENT
        ))
    
    def extract_combat_tags(self, text: str) -> List[str]:
        """Extract combat-related tags."""
        tags = self._extract_with_patterns(
            text,
            ExtractionPatterns.COMBAT
        )
        # In M4E, 'irreducible' is functionally equivalent to 'armor_piercing'
        # Add as synonym for objective matching
        if 'irreducible' in tags:
            tags.add('armor_piercing')
        return sorted(tags)
    
    def extract_defense_tags(self, text: str) -> List[str]:
        """Extract defensive ability tags."""
        return sorted(self._extract_with_patterns(
            text,
            ExtractionPatterns.DEFENSE
        ))
    
    def extract_support_tags(self, text: str) -> List[str]:
        """Extract support/buff tags."""
        return sorted(self._extract_with_patterns(
            text,
            ExtractionPatterns.SUPPORT
        ))
    
    def extract_control_tags(self, text: str) -> List[str]:
        """Extract control/debuff tags."""
        return sorted(self._extract_with_patterns(
            text,
            ExtractionPatterns.CONTROL
        ))
    
    def extract_summons(self, text: str) -> List[str]:
        """Extract model names that can be summoned."""
        summons = set()
        
        # Clean the text first - remove newlines and extra spaces
        clean_text = re.sub(r'\s+', ' ', text)
        
        for pattern_tuple in ExtractionPatterns.SUMMONS:
            pattern = pattern_tuple[0]
            group_idx = pattern_tuple[1]
            
            for match in re.finditer(pattern, clean_text):
                try:
                    summoned = match.group(group_idx).strip()
                    # Clean up the match
                    summoned = re.sub(r'\s+', ' ', summoned)
                    
                    # Filter out common false positives
                    false_positives = [
                        'this', 'the', 'a', 'an', 'enemy', 'friendly', 'target',
                        'model', 'move', 'another', 'one', 'additional', 'trained',
                        'into', 'contact', 'base', 'within', 'range', 'marker',
                        'gift', 'eyes', 'self', 'sunless',  # Common false positives from text
                        'trained move'  # Specific false positive
                    ]
                    if summoned.lower() in false_positives:
                        continue
                    
                    # Must be at least 2 characters and look like a proper noun
                    if len(summoned) >= 3 and summoned[0].isupper():
                        # Filter out things that are clearly not model names
                        if not any(bad in summoned.lower() for bad in ['token', 'marker', 'action', 'duel']):
                            summons.add(summoned)
                except IndexError:
                    continue
                    
        return sorted(summons)
    
    def extract_all_from_card(self, card: dict) -> dict:
        """
        Extract all tags from a complete card.
        
        Args:
            card: A card dict from cards.json
            
        Returns:
            Dict with all extracted tag categories
        """
        # Collect all text from the card
        texts = []
        
        # Abilities
        for ability in card.get('abilities', []):
            texts.append(ability.get('effect', ''))
            texts.append(ability.get('name', ''))
        
        # Attack actions
        for action in card.get('attack_actions', []):
            texts.append(action.get('description', ''))
            texts.append(action.get('name', ''))
            for trigger in action.get('triggers', []):
                texts.append(trigger.get('effect', ''))
        
        # Tactical actions
        for action in card.get('tactical_actions', []):
            texts.append(action.get('description', ''))
            texts.append(action.get('name', ''))
            for trigger in action.get('triggers', []):
                texts.append(trigger.get('effect', ''))
        
        # Raw text fallback
        texts.append(card.get('raw_text', ''))
        
        combined = ' '.join(texts)
        
        # Extract all tag categories
        result = {
            'conditions_applied': self.extract_conditions_applied(combined),
            'conditions_required': self.extract_conditions_required(combined),
            'conditions_removed': self.extract_conditions_removed(combined),
            'markers_generated': self.extract_markers_generated(combined),
            'markers_consumed': self.extract_markers_consumed(combined),
            'markers_required': self.extract_markers_required(combined),
            'movement_tags': self.extract_movement_tags(combined),
            'combat_tags': self.extract_combat_tags(combined),
            'defense_tags': self.extract_defense_tags(combined),
            'support_tags': self.extract_support_tags(combined),
            'control_tags': self.extract_control_tags(combined),
            'summons': self.extract_summons(combined),
        }
        
        # Calculate extraction confidence
        total_tags = sum(len(v) for v in result.values())
        text_length = len(combined)
        
        # Heuristic: longer text with fewer tags = lower confidence
        if text_length > 500 and total_tags < 3:
            confidence = 'low'
        elif total_tags < 2:
            confidence = 'low'
        elif total_tags < 5:
            confidence = 'medium'
        else:
            confidence = 'high'
            
        result['extraction_confidence'] = confidence
        result['needs_review'] = confidence == 'low' and text_length > 200
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# ROLE INFERENCER - Predicts model roles from stats and tags
# ═══════════════════════════════════════════════════════════════════════════════

class RoleInferencer:
    """
    Infers model roles from stats, keywords, and extracted tags.
    
    This is a rule-based system that provides initial role classifications.
    These can be used as bootstrap labels for ML training.
    """
    
    def __init__(self):
        # Role indicators: tag patterns that suggest certain roles
        self.role_indicators = {
            'scheme_runner': {
                'speed_min': 6,
                'cost_max': 6,
                'tags': ['dont_mind_me', 'leap', 'place', 'unimpeded', 'butterfly_jump'],
                'keywords': [],
            },
            'beater': {
                'cost_min': 7,
                'tags': ['bonus_damage', 'severe_damage', 'armor_piercing', 'irreducible'],
                'attack_stat_min': 6,
            },
            'tank': {
                'health_min': 9,
                'tags': ['armor', 'hard_to_kill', 'damage_reduction', 'regeneration', 'protected'],
                'defense_min': 5,
            },
            'summoner': {
                'tags': [],  # Detected by summons list
                'summons_min': 1,
            },
            'support': {
                'tags': ['healing', 'buff', 'stat_buff', 'condition_removal', 'obey_friendly'],
            },
            'control': {
                'tags': ['obey', 'lure', 'stat_debuff', 'action_denial', 'movement_denial'],
            },
            'ranged_damage': {
                'has_ranged_attack': True,
                'tags': ['blast', 'shockwave'],
            },
            'area_denial': {
                'tags': ['aura', 'pulse'],
                'markers_generated_any': True,
            },
            'condition_engine': {
                'conditions_applied_min': 2,
            },
        }
    
    def infer_roles(self, card: dict, extracted_tags: dict) -> dict:
        """
        Infer roles for a card based on its stats and extracted tags.
        
        Returns dict with role names and confidence scores.
        """
        roles = {}
        
        # Get card stats
        speed = card.get('speed') or 0
        cost = card.get('cost') or 0
        health = card.get('health') or 0
        defense = card.get('defense') or 0
        
        # Get highest attack stat and check for ranged
        attack_stat = 0
        has_ranged = False
        max_range = 0
        for action in card.get('attack_actions', []):
            skill = action.get('skill')
            if skill and skill.isdigit():
                attack_stat = max(attack_stat, int(skill))
            rng = action.get('range', '')
            # Ranged = starts with a number, not 'y' (melee)
            # Format is like "8"" or "12"" or "y1"" or "y2""
            if rng:
                # Extract numeric range
                range_match = re.match(r'^(\d+)', rng)
                if range_match:
                    max_range = max(max_range, int(range_match.group(1)))
                    if not rng.startswith('y'):
                        has_ranged = True
        
        # Collect all tags
        all_tags = set()
        for key in ['movement_tags', 'combat_tags', 'defense_tags', 'support_tags', 'control_tags']:
            all_tags.update(extracted_tags.get(key, []))
        
        # ─── Scheme Runner ───
        # Stricter: needs MULTIPLE scheme runner traits, not just speed
        score = 0.0
        scheme_traits = 0
        if speed >= 6:
            scheme_traits += 1
            score += 0.15
        if speed >= 7:
            score += 0.15
        if cost is not None and cost <= 5:
            scheme_traits += 1
            score += 0.2
        if any(t in all_tags for t in ['dont_mind_me']):
            scheme_traits += 2  # Strong indicator
            score += 0.35
        if any(t in all_tags for t in ['leap', 'butterfly_jump']):
            scheme_traits += 1
            score += 0.2
        if 'place' in all_tags:
            scheme_traits += 1
            score += 0.15
        if 'unimpeded' in all_tags or 'incorporeal' in all_tags:
            scheme_traits += 1
            score += 0.15
        # Only assign if multiple traits present
        if scheme_traits >= 2 and score >= 0.4:
            roles['scheme_runner'] = min(score, 0.95)
        
        # ─── Beater ───
        score = 0.0
        if attack_stat >= 6:
            score += 0.3
        if cost >= 8:
            score += 0.2
        if any(t in all_tags for t in ['bonus_damage', 'armor_piercing', 'irreducible']):
            score += 0.3
        if health >= 8:
            score += 0.2
        if score >= 0.5:
            roles['beater'] = min(score, 0.95)
        
        # ─── Tank ───
        score = 0.0
        if health >= 10:
            score += 0.3
        if defense >= 5:
            score += 0.2
        if any(t in all_tags for t in ['armor', 'hard_to_kill', 'damage_reduction', 'regeneration']):
            score += 0.4
        if 'protected' in all_tags:
            score += 0.1
        if score >= 0.5:
            roles['tank'] = min(score, 0.95)
        
        # ─── Summoner ───
        if len(extracted_tags.get('summons', [])) > 0:
            roles['summoner'] = 0.9
        
        # ─── Support ───
        score = 0.0
        support_tags = ['healing', 'buff', 'stat_buff', 'condition_removal', 'obey_friendly']
        matching = sum(1 for t in support_tags if t in all_tags)
        if matching >= 2:
            score = 0.6 + (matching * 0.1)
        elif matching == 1:
            score = 0.4
        if score >= 0.4:
            roles['support'] = min(score, 0.95)
        
        # ─── Control ───
        score = 0.0
        control_tags = ['obey', 'lure', 'stat_debuff', 'action_denial', 'movement_denial', 'push_enemy']
        matching = sum(1 for t in control_tags if t in all_tags)
        if matching >= 2:
            score = 0.6 + (matching * 0.1)
        elif matching == 1:
            score = 0.5
        if score >= 0.4:
            roles['control'] = min(score, 0.95)
        
        # ─── Ranged Damage ───
        # Check BOTH attack actions and tactical actions for ranged capability
        # Tactical actions with range that force duels/deal damage count as ranged damage
        tactical_ranged = False
        tactical_max_range = 0
        for action in card.get('tactical_actions', []):
            rng = action.get('range', '')
            desc = (action.get('description', '') or '').lower()
            if rng and not rng.startswith('y'):
                range_match = re.match(r'^(\d+)', rng)
                if range_match:
                    parsed_range = int(range_match.group(1))
                    if parsed_range >= 6:
                        # Check if it deals damage or forces duels
                        if 'damage' in desc or 'duel' in desc:
                            tactical_ranged = True
                            tactical_max_range = max(tactical_max_range, parsed_range)
        
        # Combine attack ranged + tactical ranged
        effective_ranged = has_ranged or tactical_ranged
        effective_range = max(max_range, tactical_max_range)
        
        if effective_ranged and effective_range >= 6:
            score = 0.4
            if effective_range >= 10:
                score += 0.2
            if effective_range >= 12:
                score += 0.1
            if 'blast' in all_tags or 'shockwave' in all_tags:
                score += 0.2
            if attack_stat >= 6:
                score += 0.1
            roles['ranged_damage'] = min(score, 0.95)
        
        # ─── Area Denial ───
        score = 0.0
        if 'aura' in all_tags:
            score += 0.4
        if 'pulse' in all_tags:
            score += 0.3
        if len(extracted_tags.get('markers_generated', [])) > 0:
            score += 0.3
        if score >= 0.5:
            roles['area_denial'] = min(score, 0.95)
        
        # ─── Condition Engine ───
        conditions_applied = len(extracted_tags.get('conditions_applied', []))
        if conditions_applied >= 2:
            roles['condition_engine'] = min(0.5 + (conditions_applied * 0.15), 0.95)
        
        # ─── Melee Damage ───
        has_melee = any(
            a.get('range', '').startswith('y') 
            for a in card.get('attack_actions', [])
        )
        if has_melee and attack_stat >= 6:
            score = 0.5
            if 'charge' in all_tags:
                score += 0.2
            if 'bonus_damage' in all_tags:
                score += 0.2
            roles['melee_damage'] = min(score, 0.95)
        
        # ─── Assassin ───
        # High burst damage, single-target focus, execute effects
        # Distinct from beater: assassins are more surgical, less tanky
        score = 0.0
        if 'execute' in all_tags:
            score += 0.4
        if 'armor_piercing' in all_tags:
            score += 0.25
        if 'irreducible' in all_tags:
            score += 0.25
        if 'bonus_damage' in all_tags:
            score += 0.2
        # High attack stat is important
        if attack_stat >= 7:
            score += 0.2
        # Assassins typically have mobility to reach targets
        if any(t in all_tags for t in ['leap', 'place', 'butterfly_jump', 'unimpeded']):
            score += 0.15
        # Lower health = more assassin-like (glass cannon)
        if health and health <= 7 and score >= 0.4:
            score += 0.1
        if score >= 0.5:
            roles['assassin'] = min(score, 0.95)
        
        # ─── Tarpit ───
        # Engagement control, hard to remove, ties up enemy models
        # Distinct from tank: tarpits are about engagement, not just survival
        score = 0.0
        if 'engagement' in all_tags:
            score += 0.35
        if 'manipulative' in all_tags:
            score += 0.3
        if 'terrifying' in all_tags:
            score += 0.25
        if 'hard_to_kill' in all_tags:
            score += 0.25
        if 'hard_to_wound' in all_tags:
            score += 0.2
        # Cheap cost helps (expendable tarpits)
        if cost and cost <= 5:
            score += 0.15
        # Movement denial keeps enemies engaged
        if 'movement_denial' in all_tags:
            score += 0.2
        if score >= 0.5:
            roles['tarpit'] = min(score, 0.95)
        
        # ─── Utility ───
        # Fallback role for models that don't fit other categories well
        # Also assigned to models with diverse but shallow capabilities
        # This ensures every model has at least one role
        if not roles:
            # No other roles assigned - this is a utility piece
            roles['utility'] = 0.5
        else:
            # Check if model has diverse capabilities without excelling
            role_count = len(roles)
            max_confidence = max(roles.values()) if roles else 0
            # If many weak roles, add utility
            if role_count >= 3 and max_confidence < 0.7:
                roles['utility'] = 0.4
            # If only one weak role, also add utility
            elif role_count == 1 and max_confidence < 0.6:
                roles['utility'] = 0.4
        
        return roles


# ═══════════════════════════════════════════════════════════════════════════════
# ENRICHMENT PIPELINE
# ═══════════════════════════════════════════════════════════════════════════════

def enrich_cards(
    cards: List[dict],
    extractor: TagExtractor,
    inferencer: RoleInferencer
) -> Tuple[List[dict], List[dict]]:
    """
    Enrich all cards with extracted tags and inferred roles.
    
    Returns:
        Tuple of (enriched_cards, review_queue)
    """
    enriched = []
    review_queue = []
    
    for card in cards:
        # Skip non-stat cards
        if card.get('card_type') != 'Stat':
            enriched.append(card)
            continue
        
        # Extract tags
        extracted = extractor.extract_all_from_card(card)
        
        # Infer roles
        inferred_roles = inferencer.infer_roles(card, extracted)
        
        # Add to card
        card['extracted_tags'] = extracted
        card['inferred_roles'] = inferred_roles
        card['roles'] = list(inferred_roles.keys())
        card['role_confidence'] = inferred_roles
        
        enriched.append(card)
        
        # Add to review queue if needed
        if extracted.get('needs_review'):
            review_queue.append({
                'id': card.get('id'),
                'name': card.get('name'),
                'faction': card.get('faction'),
                'keywords': card.get('keywords'),
                'extracted_tags': extracted,
                'inferred_roles': inferred_roles,
                'reason': 'low_extraction_confidence'
            })
    
    return enriched, review_queue


# ═══════════════════════════════════════════════════════════════════════════════
# STATISTICS AND REPORTING
# ═══════════════════════════════════════════════════════════════════════════════

def generate_report(cards: List[dict]) -> str:
    """Generate a summary report of the extraction results."""
    lines = []
    lines.append("=" * 60)
    lines.append("MALIFAUX TAG EXTRACTION REPORT")
    lines.append("=" * 60)
    
    stat_cards = [c for c in cards if c.get('card_type') == 'Stat']
    lines.append(f"\nTotal stat cards processed: {len(stat_cards)}")
    
    # Extraction confidence breakdown
    confidence_counts = Counter(
        c.get('extracted_tags', {}).get('extraction_confidence', 'unknown')
        for c in stat_cards
    )
    lines.append("\nExtraction Confidence:")
    for conf, count in confidence_counts.most_common():
        lines.append(f"  {conf}: {count} ({100*count/len(stat_cards):.1f}%)")
    
    # Most common conditions
    all_conditions = []
    for card in stat_cards:
        tags = card.get('extracted_tags', {})
        all_conditions.extend(tags.get('conditions_applied', []))
    
    lines.append("\nMost Applied Conditions:")
    for cond, count in Counter(all_conditions).most_common(10):
        lines.append(f"  {cond}: {count}")
    
    # Role distribution
    all_roles = []
    for card in stat_cards:
        all_roles.extend(card.get('roles', []))
    
    lines.append("\nRole Distribution:")
    for role, count in Counter(all_roles).most_common():
        lines.append(f"  {role}: {count}")
    
    # Summoners
    summoners = [c for c in stat_cards if 'summoner' in c.get('roles', [])]
    lines.append(f"\nSummoners found: {len(summoners)}")
    for card in summoners[:10]:
        summons = card.get('extracted_tags', {}).get('summons', [])
        lines.append(f"  {card['name']}: {', '.join(summons)}")
    
    return '\n'.join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description='Extract semantic tags from Malifaux card data'
    )
    parser.add_argument(
        '--input', '-i', 
        required=True,
        help='Input cards.json file'
    )
    parser.add_argument(
        '--output', '-o',
        required=True, 
        help='Output enriched JSON file'
    )
    parser.add_argument(
        '--review-queue', '-r',
        help='Output file for cards needing manual review'
    )
    parser.add_argument(
        '--taxonomy', '-t',
        help='Custom taxonomy JSON file'
    )
    parser.add_argument(
        '--report',
        action='store_true',
        help='Print extraction report'
    )
    
    args = parser.parse_args()
    
    # Load input
    print(f"Loading cards from {args.input}...")
    with open(args.input, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    cards = data.get('cards', [])
    print(f"Loaded {len(cards)} cards")
    
    # Load custom taxonomy if provided
    taxonomy = TAXONOMY
    if args.taxonomy:
        with open(args.taxonomy, 'r') as f:
            taxonomy = json.load(f)
    
    # Create extractor and inferencer
    extractor = TagExtractor(taxonomy)
    inferencer = RoleInferencer()
    
    # Enrich cards
    print("Extracting tags and inferring roles...")
    enriched, review_queue = enrich_cards(cards, extractor, inferencer)
    
    # Update data
    data['cards'] = enriched
    data['enrichment_version'] = '1.0'
    
    # Write output
    print(f"Writing enriched data to {args.output}...")
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Write review queue if requested
    if args.review_queue and review_queue:
        print(f"Writing {len(review_queue)} cards to review queue...")
        with open(args.review_queue, 'w', encoding='utf-8') as f:
            json.dump(review_queue, f, indent=2, ensure_ascii=False)
    
    # Print report if requested
    if args.report:
        print(generate_report(enriched))
    
    print("Done!")
    print(f"  Enriched: {len([c for c in enriched if c.get('extracted_tags')])}")
    print(f"  Needs review: {len(review_queue)}")


if __name__ == '__main__':
    main()
