#!/usr/bin/env python3
"""
Malifaux 4E Ability Parser

Extracts structured data from ability/action text for synergy detection.

Parses:
- Trigger Conditions: When/After events that trigger abilities
- Effects: What the ability does (damage, heal, conditions, markers)
- Targets: Who/what is affected (friendly, enemy, keywords)
- Costs: AP cost, card discard, other costs
- Resources: Markers created/consumed, tokens generated

Usage:
    python ability_parser.py cards_with_roles.json -o cards_parsed.json
    python ability_parser.py cards_with_roles.json --debug "Hoffman"
"""

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Any


# =============================================================================
# CONDITION TOKENS - What conditions can be applied
# =============================================================================

CONDITION_TOKENS = {
    # Negative conditions
    'burning': {'type': 'negative', 'stacks': True, 'end_phase': 'end'},
    'poison': {'type': 'negative', 'stacks': True, 'end_phase': 'end'},
    'slow': {'type': 'negative', 'stacks': False},
    'staggered': {'type': 'negative', 'stacks': False},
    'stunned': {'type': 'negative', 'stacks': False},
    'distracted': {'type': 'negative', 'stacks': True},
    'injured': {'type': 'negative', 'stacks': True},
    'adversary': {'type': 'negative', 'stacks': False},
    'paralyzed': {'type': 'negative', 'stacks': False},
    
    # Positive conditions
    'shielded': {'type': 'positive', 'stacks': True},
    'focused': {'type': 'positive', 'stacks': True},
    'fast': {'type': 'positive', 'stacks': False},
    'concealment': {'type': 'positive', 'stacks': False},
    
    # Keyword-specific
    'brilliance': {'type': 'keyword', 'keywords': ['Honeypot']},
    'blight': {'type': 'keyword', 'keywords': ['Plague']},
    'glutted': {'type': 'keyword', 'keywords': ['Gremlin']},
    'craven': {'type': 'keyword', 'keywords': ['Marshal']},
}

# =============================================================================
# MARKER TYPES
# =============================================================================

MARKER_TYPES = {
    'scheme': {'purpose': 'scoring', 'size': '30mm'},
    'strategy': {'purpose': 'scoring', 'size': '30mm'},
    'corpse': {'purpose': 'resource', 'keywords': ['Resurrectionists']},
    'scrap': {'purpose': 'resource', 'keywords': ['Construct', 'Foundry']},
    'pyre': {'purpose': 'hazard', 'keywords': ['Wildfire', 'Burning']},
    'ice pillar': {'purpose': 'terrain', 'keywords': ['December']},
    'web': {'purpose': 'hazard', 'keywords': ['Spider']},
    'rift': {'purpose': 'portal', 'keywords': ['Obliteration']},
    'shadow door': {'purpose': 'portal', 'keywords': ['Tormented']},
    'pylon': {'purpose': 'resource', 'keywords': ['Augmented']},
    'remains': {'purpose': 'resource', 'keywords': ['Marshal']},
}

# =============================================================================
# TRIGGER EVENT PATTERNS
# =============================================================================

TRIGGER_EVENTS = {
    # When events
    'activation_start': [
        r'when\s+this\s+model\s+activates',
        r'at\s+the\s+start\s+of.*activation',
    ],
    'activation_end': [
        r'when\s+this\s+model.*ends\s+its\s+activation',
        r'at\s+the\s+end\s+of.*activation',
        r'after\s+this\s+model\s+activates',
    ],
    'killed': [
        r'when\s+this\s+model\s+is\s+killed',
        r'after\s+this\s+model\s+is\s+killed',
        r'demise',
    ],
    'kills_enemy': [
        r'after\s+killing',
        r'when.*kills',
        r'after.*enemy.*killed',
    ],
    'damaged': [
        r'when\s+this\s+model\s+suffers\s+damage',
        r'after\s+this\s+model\s+is\s+damaged',
    ],
    'deals_damage': [
        r'after\s+damaging',
        r'when.*deals\s+damage',
    ],
    'targeted': [
        r'when\s+this\s+model\s+is\s+targeted',
        r'when\s+targeted',
    ],
    'resolving': [
        r'when\s+resolving',
        r'after\s+resolving',
    ],
    'enemy_activates': [
        r'when\s+an?\s+enemy.*activates',
        r'when\s+enemy\s+model\s+activates',
    ],
    'friendly_activates': [
        r'when\s+a\s+friendly.*activates',
        r'when\s+friendly\s+model\s+activates',
    ],
}

# =============================================================================
# EFFECT PATTERNS
# =============================================================================

EFFECT_PATTERNS = {
    'apply_condition': [
        (r'(?:target\s+)?gains?\s+(?:a\s+)?(\w+)\s+token', 'condition'),
        (r'give.*?(\w+)\s+token', 'condition'),
    ],
    'remove_condition': [
        (r'remove\s+(?:a\s+)?(\w+)\s+token\s+from', 'condition'),
        (r'discard\s+(?:a\s+)?(\w+)\s+token', 'condition'),
        (r'remove\s+a\s+token\s+from', 'generic'),
    ],
    'heal': [
        (r'heals?\s+(\d+)', 'value'),
        (r'heal\s+(\d+)\s+damage', 'value'),
    ],
    'damage': [
        (r'dealt?\s+(\d+)\s+(?:irreducible\s+)?damage', 'value'),
        (r'\+(\d+)\s+damage', 'bonus'),
        (r'suffer(?:s)?\s+(\d+)\s+damage', 'value'),
    ],
    'push': [
        (r'push(?:ed)?\s+(?:up\s+to\s+)?(\d+)"', 'distance'),
        (r'push.*?(\d+)\s*"', 'distance'),
    ],
    'place': [
        (r'place(?:d)?.*?within\s+(\d+)"', 'distance'),
        (r'place(?:d)?.*?(\d+)\s*"\s+away', 'distance'),
    ],
    'summon': [
        (r'summon\s+(?:a\s+)?([A-Z][a-zA-Z\s]+?)(?:\s+in|\s+within|\.|,)', 'model'),
        (r'summon\s+(?:a\s+)?(\w+)', 'model'),
    ],
    'create_marker': [
        (r'(?:make|create|drop|place)\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s+marker', 'marker_type'),
        (r'(\w+)\s+marker\s+(?:within|in)', 'marker_type'),
    ],
    'remove_marker': [
        (r'remove\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s+marker', 'marker_type'),
    ],
    'draw_card': [
        (r'draw\s+(\d+)\s+card', 'value'),
        (r'draw\s+a\s+card', 'single'),
    ],
    'discard_card': [
        (r'discard\s+(\d+)\s+card', 'value'),
        (r'discard\s+a\s+card', 'single'),
    ],
    'bury': [
        (r'bury\s+(?:the\s+)?target', 'target'),
        (r'(?:this\s+model\s+)?(?:is\s+)?buried', 'self'),
    ],
}

# =============================================================================
# TARGET PATTERNS
# =============================================================================

TARGET_PATTERNS = {
    'friendly_keyword': r'friendly\s+(\w+)\s+model',
    'friendly_any': r'friendly\s+model',
    'enemy_any': r'enemy\s+model',
    'enemy_keyword': r'enemy\s+(\w+)\s+model',
    'this_model': r'this\s+model',
    'target': r'(?:the\s+)?target',
    'within_range': r'(?:models?\s+)?within\s+(\d+)"',
    'within_aura': r'(?:models?\s+)?within\s+(\S+)\s+(\d+)"',
}


# =============================================================================
# PARSER CLASS
# =============================================================================

class AbilityParser:
    """Parse Malifaux ability/action text into structured data."""
    
    def __init__(self):
        self.stats = defaultdict(int)
    
    def parse_trigger_condition(self, text: str) -> Optional[Dict]:
        """Extract trigger condition from ability text."""
        text_lower = text.lower()
        
        for event_type, patterns in TRIGGER_EVENTS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    result = {'event': event_type}
                    
                    # Extract target filter if present
                    filter_info = {}
                    
                    # Check for friendly/enemy
                    if 'friendly' in text_lower:
                        filter_info['friendly'] = True
                    elif 'enemy' in text_lower:
                        filter_info['friendly'] = False
                    
                    # Extract keyword from various patterns
                    keyword_patterns = [
                        r'friendly\s+(\w+)\s+model',
                        r'enemy\s+(\w+)\s+model', 
                        r'(\w+)\s+models?\s+within',
                        r'with\s+the\s+(\w+)\s+keyword',
                    ]
                    
                    # Words that are NOT keywords
                    NON_KEYWORDS = {'model', 'models', 'other', 'another', 'this', 
                                   'that', 'the', 'friendly', 'enemy', 'any', 'all',
                                   'a', 'an', 'each', 'every', 'same', 'target',
                                   'within', 'nearby', 'engaged', 'unengaged'}
                    
                    for kw_pattern in keyword_patterns:
                        kw_match = re.search(kw_pattern, text_lower)
                        if kw_match:
                            kw = kw_match.group(1)
                            # Filter out non-keywords
                            if kw not in NON_KEYWORDS and len(kw) > 2:
                                filter_info['keyword'] = kw.title()
                                break
                    
                    # Check for station filters
                    for station in ['master', 'henchman', 'enforcer', 'minion', 'totem', 'peon']:
                        if station in text_lower:
                            filter_info['station'] = station.title()
                            break
                    
                    # Check for characteristic filters
                    for char in ['construct', 'living', 'undead', 'beast', 'elemental']:
                        if char in text_lower:
                            filter_info['characteristic'] = char.title()
                            break
                    
                    if filter_info:
                        result['filter'] = filter_info
                    
                    return result
        
        return None
    
    def parse_effect_target(self, text: str) -> Optional[Dict]:
        """Extract who/what is affected by an effect."""
        text_lower = text.lower()
        target = {}
        
        # "target gains/suffers/is dealt" - refers to action target
        if re.search(r'\btarget\b\s+(gains?|suffers?|is dealt|must|may|discards?)', text_lower):
            target['ref'] = 'target'
        
        # "this model" 
        elif re.search(r'\bthis\s+model\b', text_lower):
            target['ref'] = 'self'
        
        # "enemy models within X"
        enemy_aura = re.search(r'enemy\s+models?\s+within\s+[(\[]?[yxYX]?[)\]]?\s*(\d+)"?', text_lower)
        if enemy_aura:
            target['ref'] = 'enemy_aura'
            target['range'] = int(enemy_aura.group(1))
        
        # "friendly models within X"
        friendly_aura = re.search(r'friendly\s+models?\s+within\s+[(\[]?[yxYX]?[)\]]?\s*(\d+)"?', text_lower)
        if friendly_aura:
            target['ref'] = 'friendly_aura'
            target['range'] = int(friendly_aura.group(1))
        
        # "another friendly model"
        if 'another friendly' in text_lower:
            target['ref'] = 'other_friendly'
        
        # Keyword-specific targets
        kw_target = re.search(r'(friendly|enemy)\s+(\w+)\s+models?', text_lower)
        if kw_target:
            target['friendly'] = kw_target.group(1) == 'friendly'
            kw = kw_target.group(2)
            if kw not in ['model', 'models', 'other', 'another']:
                target['keyword'] = kw.title()
        
        return target if target else None

    def parse_effect_cost(self, text: str) -> Optional[Dict]:
        """Extract costs required to trigger an effect."""
        text_lower = text.lower()
        cost = {}
        
        # "discard a card to X" (voluntary cost)
        if re.search(r'discard\s+a\s+card\s+to\b', text_lower):
            cost['discard_card'] = 1
        
        # "discard X cards to"
        multi_discard = re.search(r'discard\s+(\d+)\s+cards?\s+to\b', text_lower)
        if multi_discard:
            cost['discard_card'] = int(multi_discard.group(1))
        
        # "must discard a card" or "target discards a card"
        if re.search(r'(?:must|target)\s+discards?\s+(?:a\s+)?card', text_lower):
            cost['forces_discard'] = 1
        
        # "drain a soul/soulstone to"
        if re.search(r'drain\s+(?:a\s+)?soul', text_lower):
            cost['drain_soul'] = 1
        
        # "suffer X damage to" or "deal X damage to itself"
        suffer_dmg = re.search(r'(?:suffer|deals?\s+\d+\s+damage\s+to\s+itself)', text_lower)
        if suffer_dmg:
            dmg_match = re.search(r'(\d+)\s+damage', text_lower)
            if dmg_match:
                cost['suffer_damage'] = int(dmg_match.group(1))
        
        # "remove a X token to"
        remove_token = re.search(r'remove\s+(?:a\s+)?(\w+)\s+token\s+to\b', text_lower)
        if remove_token:
            cost['remove_token'] = remove_token.group(1)
        
        # "spend a soulstone"
        if re.search(r'spend\s+(?:a\s+)?soulstone', text_lower):
            cost['spend_soulstone'] = 1
        
        return cost if cost else None

    def parse_effects(self, text: str) -> List[Dict]:
        """Extract all effects from text."""
        effects = []
        text_lower = text.lower()
        
        # Invalid condition names to filter
        INVALID_CONDITIONS = {'a', 'the', 'an', 'that', 'this', 'any', 'each', 'enemy', 'friendly', 
                              'another', 'other', 'all', 'two', 'three', 'one', 'summon', 'second',
                              'target', 'model', 'models', 'card', 'cards'}
        
        for effect_type, patterns in EFFECT_PATTERNS.items():
            for pattern, capture_name in patterns:
                matches = re.finditer(pattern, text_lower)
                for match in matches:
                    effect = {'type': effect_type}
                    
                    if match.groups():
                        value = match.group(1)
                        if capture_name == 'value' or capture_name == 'distance':
                            try:
                                effect['value'] = int(value)
                            except:
                                effect['value'] = value
                        elif capture_name == 'condition':
                            # Filter invalid conditions
                            if value in INVALID_CONDITIONS:
                                continue
                            effect['condition'] = value
                        elif capture_name == 'model':
                            effect['model'] = value.strip()
                        elif capture_name == 'marker_type':
                            # Clean up marker type
                            marker = value.strip()
                            # Filter out invalid markers
                            if marker in INVALID_CONDITIONS or marker.startswith('two ') or marker.startswith('a '):
                                marker = marker.replace('two ', '').replace('a ', '')
                            effect['marker_type'] = marker
                        elif capture_name == 'bonus':
                            effect['bonus'] = int(value)
                        elif capture_name == 'generic':
                            effect['generic'] = True
                    
                    # Check for irreducible
                    if effect_type == 'damage' and 'irreducible' in text_lower:
                        effect['irreducible'] = True
                    
                    # Add effect-specific target
                    effect_target = self.parse_effect_target(text)
                    if effect_target:
                        effect['effect_target'] = effect_target
                    
                    effects.append(effect)
                    self.stats[effect_type] += 1
        
        # Parse effect cost (applies to whole text block)
        effect_cost = self.parse_effect_cost(text)
        if effect_cost and effects:
            effects[0]['cost'] = effect_cost
        
        return effects
    
    def parse_target(self, text: str) -> Optional[Dict]:
        """Extract detailed target scope information.
        
        Returns structured target info:
        {
            "alignment": "friendly" | "enemy" | "allied" | "self",
            "keywords": ["Construct", "Gamin"],
            "station": "Minion",
            "range": 6,
            "aura": 2
        }
        """
        text_lower = text.lower()
        target = {}
        
        # Known keywords and characteristics
        GAME_KEYWORDS = {
            'construct', 'living', 'undead', 'beast', 'elemental', 'spirit',
            'nightmare', 'horror', 'academic', 'augmented', 'gamin', 'december',
            'foundry', 'guild', 'marshal', 'oni', 'pig', 'revenant', 'sister',
            'versatile', 'arcanist', 'neverborn', 'resurrectionist', 'bayou',
            'urami', 'tormented', 'woe', 'cadmus', 'chimera', 'fae', 'swampfiend',
            'wastrel', 'performer', 'showgirl', 'mercenary', 'freikorps', 'bandit'
        }
        
        STATIONS = {'master', 'henchman', 'enforcer', 'minion', 'totem', 'peon'}
        
        # Determine alignment
        if 'this model' in text_lower:
            target['alignment'] = 'self'
        elif re.search(r'\b(friendly|allied)\b', text_lower):
            target['alignment'] = 'friendly'
        elif re.search(r'\benemy\b', text_lower):
            target['alignment'] = 'enemy'
        
        # Extract keywords from patterns like "friendly Construct model"
        keywords = []
        
        # Pattern: alignment + keyword + model
        kw_patterns = [
            r'(?:friendly|allied|enemy)\s+(\w+)\s+models?',
            r'(?:another|other)\s+(?:friendly\s+)?(\w+)\s+models?',
            r'(?:a|the|an)\s+(\w+)\s+model',
            r'(\w+)\s+(?:model|models)\s+within',
            r'target\s+(?:a\s+)?(\w+)\s+model',
        ]
        
        for pattern in kw_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                kw = match.lower()
                if kw in GAME_KEYWORDS:
                    keywords.append(kw.title())
        
        if keywords:
            target['keywords'] = list(set(keywords))
        
        # Extract station
        station_patterns = [
            r'(?:friendly|allied|enemy)\s+(master|henchman|enforcer|minion|totem|peon)',
            r'(?:a|the)\s+(master|henchman|enforcer|minion|totem|peon)',
        ]
        
        for pattern in station_patterns:
            match = re.search(pattern, text_lower)
            if match:
                target['station'] = match.group(1).title()
                break
        
        # Check for range
        range_match = re.search(r'within\s+(\d+)"', text_lower)
        if range_match:
            target['range'] = int(range_match.group(1))
        
        # Check for aura symbol (often appears as special char)
        if '(y)' in text_lower or '(x)' in text_lower:
            aura_match = re.search(r'\((?:y|x)\)\s*(\d+)"', text_lower)
            if aura_match:
                target['aura'] = int(aura_match.group(1))
        
        return target if target else None
    
    def parse_cost(self, text: str, action_type: str = None) -> Optional[Dict]:
        """Extract action costs."""
        text_lower = text.lower()
        cost = {}
        
        # Check for "discard a card" cost
        if re.search(r'discard\s+(?:a\s+)?card\s+to', text_lower):
            cost['discard_card'] = 1
        
        # Check for "drain a soul" cost
        if 'drain' in text_lower and 'soul' in text_lower:
            cost['drain_soul'] = 1
        
        # Check for "once per activation/turn"
        if 'once per activation' in text_lower:
            cost['limit'] = 'activation'
        elif 'once per turn' in text_lower:
            cost['limit'] = 'turn'
        
        return cost if cost else None
    
    def _normalize_marker(self, marker: str) -> Optional[str]:
        """Normalize marker name to canonical form.
        
        'friendly scheme' -> 'scheme'
        'all enemy scheme' -> 'scheme'
        'the chosen' -> None (not a marker)
        """
        if not marker:
            return None
        
        marker = marker.lower().strip()
        
        # Strip common prefixes (loop until no more to strip)
        prefixes = ['friendly', 'enemy', 'allied', 'all', 'target', 'the', 
                    'a', 'an', 'any', 'each', 'other', 'another', 'one', 
                    'two', 'three', 'made', 'chosen', 'nearby', 'same', 
                    'new', 'additional', 'second', 'those']
        
        changed = True
        while changed:
            changed = False
            for prefix in prefixes:
                if marker.startswith(prefix + ' '):
                    marker = marker[len(prefix) + 1:].strip()
                    changed = True
                    break
        
        # Known valid markers
        VALID_MARKERS = {
            'scheme', 'corpse', 'scrap', 'remains', 'pyre', 'strategy',
            'shadow', 'shadow door', 'shadow lair', 'rift', 'web', 'tide',
            'assault', 'decoy', 'lamp', 'door', 'inferno', 'pyrotechnic',
            'pyrotechnics', 'bog', 'underbrush', 'echo', 'piano', 'pillar',
            'ice pillar', 'pylon', 'lair', 'technology', 'lost technology',
            'terrain', 'decay'
        }
        
        # Direct match
        if marker in VALID_MARKERS:
            return marker
        
        # Check if starts with valid marker (e.g., "scheme marker")
        for valid in VALID_MARKERS:
            if marker.startswith(valid):
                return valid
        
        # Not a valid marker
        return None
    
    def parse_resources(self, text: str) -> Dict:
        """Extract detailed resource generation/consumption/interaction.
        
        Returns:
        {
            "markers": [
                {"marker_type": "Scheme", "function": "generate"},
                {"marker_type": "Corpse", "function": "consume"},
                {"marker_type": "Scrap", "function": "interact"}
            ],
            "generates": [...],  # legacy format
            "consumes": [...]    # legacy format
        }
        """
        text_lower = text.lower()
        resources = {
            'generates': [], 
            'consumes': [],
            'markers': []  # New detailed format
        }
        
        # Key marker types for synergy
        KEY_MARKERS = ['scheme', 'corpse', 'scrap', 'pyre', 'remains', 'strategy', 
                       'shadow', 'shadow door', 'ice pillar', 'pylon', 'rift', 'web']
        
        # GENERATE patterns
        generate_patterns = [
            r'(?:make|create|drop|place)\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s+marker',
            r'(\w+)\s+marker\s+(?:within|in|into)',
            r'summon.*?(\w+)\s+marker',
        ]
        
        for pattern in generate_patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                raw_marker = match.group(1).strip()
                marker = self._normalize_marker(raw_marker)
                if marker:
                    if not any(m.get('marker_type', '').lower() == marker for m in resources['markers']):
                        resources['generates'].append({'type': 'marker', 'subtype': marker})
                        resources['markers'].append({'marker_type': marker.title(), 'function': 'generate'})
        
        # Specific marker types for generation
        for marker_type in KEY_MARKERS:
            if re.search(rf'(?:drop|place|make|create)\s+(?:a\s+)?{marker_type}\s+marker', text_lower):
                if not any(m.get('marker_type', '').lower() == marker_type for m in resources['markers']):
                    resources['generates'].append({'type': 'marker', 'subtype': marker_type})
                    resources['markers'].append({'marker_type': marker_type.title(), 'function': 'generate'})
        
        # CONSUME patterns (remove for benefit)
        consume_patterns = [
            r'remove\s+(?:a\s+)?(\w+(?:\s+\w+)?(?:\s+\w+)?)\s+marker',
            r'discard\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s+marker',
            r'(?:if|when).*?removes?\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s+marker',
        ]
        
        for pattern in consume_patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                raw_marker = match.group(1).strip()
                marker = self._normalize_marker(raw_marker)
                if marker:
                    if not any(m.get('marker_type', '').lower() == marker and m.get('function') == 'consume' 
                              for m in resources['markers']):
                        resources['consumes'].append({'type': 'marker', 'subtype': marker})
                        resources['markers'].append({'marker_type': marker.title(), 'function': 'consume'})
        
        # INTERACT patterns (use without removing)
        interact_patterns = [
            r'(?:within|near)\s+(?:\d+"?\s+of\s+)?(?:a\s+)?(\w+(?:\s+\w+)?)\s+marker',
            r'(?:target|touching|in\s+base\s+contact\s+with)\s+(?:a\s+)?(\w+)\s+marker',
            r'(\w+)\s+marker.*?(?:within|in\s+range)',
        ]
        
        for pattern in interact_patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                raw_marker = match.group(1).strip()
                marker = self._normalize_marker(raw_marker)
                if marker:
                    if not any(m.get('marker_type', '').lower() == marker for m in resources['markers']):
                        resources['markers'].append({'marker_type': marker.title(), 'function': 'interact'})
        
        # Token generation on others
        for cond in CONDITION_TOKENS:
            if re.search(rf'gains?\s+(?:a\s+)?{cond}\s+token', text_lower):
                resources['generates'].append({'type': 'condition', 'subtype': cond})
        
        return resources if resources['generates'] or resources['consumes'] else {}
    
    def parse_ability(self, ability: Dict) -> Dict:
        """Parse a single ability."""
        name = ability.get('name', '')
        description = ability.get('description', '') or ''
        ab_type = ability.get('type', '')
        
        parsed = {
            'name': name,
            'type': ab_type,
        }
        
        # Parse trigger condition
        trigger = self.parse_trigger_condition(description)
        if trigger:
            parsed['trigger'] = trigger
        
        # Parse effects
        effects = self.parse_effects(description)
        if effects:
            parsed['effects'] = effects
        
        # Parse target
        target = self.parse_target(description)
        if target:
            parsed['target'] = target
        
        # Parse cost/limits
        cost = self.parse_cost(description)
        if cost:
            parsed['cost'] = cost
        
        # Parse resources
        resources = self.parse_resources(description)
        if resources:
            parsed['resources'] = resources
        
        # Extract referenced keywords
        keywords = self.extract_keywords(description)
        if keywords:
            parsed['referenced_keywords'] = keywords
        
        return parsed
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract Malifaux keywords referenced in text."""
        if not text:
            return []
        
        text_lower = text.lower()
        keywords = set()
        
        # Game keywords (characteristics + faction keywords)
        GAME_KEYWORDS = {
            # Characteristics
            'construct', 'living', 'undead', 'beast', 'elemental', 'spirit',
            'nightmare', 'horror', 'tyrant', 'buried', 'ruthless', 'terrifying',
            
            # Faction/crew keywords  
            'academic', 'augmented', 'bandit', 'bayou', 'chimera', 
            'december', 'elite', 'explorer', 'fae', 'family', 'foundry', 
            'freikorps', 'gamin', 'guild', 'honeypot', 'journalist',
            'marshal', 'mercenary', 'monk', 'neverborn', 
            'oni', 'outcast', 'performer', 'pig', 'puppet', 'qi', 
            'resurrectionist', 'revenant', 'savage', 'showgirl', 
            'swampfiend', 'syndicate', 'tormented', 'transmortis', 
            'versatile', 'wastrel', 'wildfire', 'woe', 'cadmus', 'fated',
            'sister', 'urami', 'redchapel', 'crossroads', 'scarlet',
            'frontier', 'seeker', 'dua', 'forgotten', 'plague',
            'witness', 'retainer', 'cavalier', 'effigy', 'emissary',
            'arcanist', 'kin', 'soulstone', 'golem',
        }
        
        # Station names to exclude
        STATION_NAMES = {'master', 'henchman', 'enforcer', 'minion', 'totem', 'peon'}
        
        # Synergy patterns - things that indicate keyword interaction
        SYNERGY_PATTERNS = [
            # Friendly/enemy targeting
            r'(?:friendly|allied|enemy)\s+(\w+)\s+models?',
            r'(?:friendly|allied|enemy)\s+(\w+)s\b',  # "friendly elementals"
            r'other\s+(?:friendly\s+)?(\w+)\s+models?',
            r'another\s+(?:friendly\s+)?(\w+)',
            r'each\s+(?:friendly\s+)?(\w+)',
            
            # Targeting restrictions
            r'(\w+)\s+only\b',
            r'(?:a|the|an)\s+(\w+)\s+model',
            r'(\w+)\s+models?\s+within',
            
            # Summoning
            r'summon\s+(?:a\s+)?(?:\w+\s+)?(\w+)',
            
            # Keywords
            r'with\s+the\s+(\w+)\s+keyword',
            r'(\w+)\s+characteristic',
            
            # Model types with keyword
            r'(\w+)\s+(?:golem|gamin|guardian|rider|effigy|emissary)',
            r'(?:golem|gamin|guardian|rider|effigy|emissary)\s+(\w+)',
            r'(?:fire|ice|wind|metal|poison|electric)\s+(\w+)',
        ]
        
        for pattern in SYNERGY_PATTERNS:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                kw = match.strip()
                if kw in GAME_KEYWORDS and kw not in STATION_NAMES:
                    keywords.add(kw.title())
        
        # Also check for direct mentions of important keywords
        IMPORTANT_KEYWORDS = {
            'construct', 'living', 'undead', 'beast', 'elemental', 
            'spirit', 'nightmare', 'horror', 'bayou', 'gamin', 
            'academic', 'sister', 'pig', 'oni', 'chimera', 'fae',
            'revenant', 'tormented', 'urami', 'woe', 'cadmus',
            'marshal', 'freikorps', 'foundry', 'augmented', 'guild',
            'arcanist', 'neverborn', 'resurrectionist', 'outcast',
            'versatile', 'mercenary', 'effigy', 'emissary', 'golem'
        }
        for kw in IMPORTANT_KEYWORDS:
            # Check with word boundary and plurals
            if re.search(rf'\b{kw}s?\b', text_lower):
                if kw not in STATION_NAMES:
                    keywords.add(kw.title())
        
        return list(keywords)
    
    def parse_action(self, action: Dict, is_attack: bool = True) -> Dict:
        """Parse an attack or tactical action."""
        name = action.get('name', '')
        description = action.get('description', '') or ''
        
        parsed = {
            'name': name,
            'action_class': 'attack' if is_attack else 'tactical',
        }
        
        # Copy existing structured fields
        if action.get('range'):
            parsed['range'] = action['range']
        if action.get('damage'):
            parsed['damage'] = action['damage']
        if action.get('skill'):
            parsed['stat'] = action['skill']
        if action.get('resist'):
            parsed['resist'] = action['resist']
        if action.get('tn'):
            parsed['tn'] = action['tn']
        
        # Map action_type to AP cost
        action_type = action.get('action_type', '')
        if action_type:
            AP_COST_MAP = {
                'standard': 1,
                'bonus': 0,
                'free': 0,
            }
            parsed['ap_cost'] = AP_COST_MAP.get(action_type.lower(), 1)
            parsed['action_type'] = action_type
        
        # Parse effects from description
        effects = self.parse_effects(description)
        if effects:
            parsed['effects'] = effects
        
        # Parse target
        target = self.parse_target(description)
        if target:
            parsed['target'] = target
        
        # Parse cost/limits
        cost = self.parse_cost(description)
        if cost:
            parsed['cost'] = cost
        
        # Extract referenced keywords
        keywords = self.extract_keywords(description)
        if keywords:
            parsed['referenced_keywords'] = keywords
        
        # Parse triggers
        if action.get('triggers'):
            parsed_triggers = []
            
            # Get parent action difficulty for triggers
            action_tn = action.get('tn')  # For tactical actions
            action_stat = action.get('skill')  # For attack actions
            action_resist = action.get('resist')  # What stat defender uses
            
            for trig in action['triggers']:
                parsed_trig = {
                    'name': trig.get('name', ''),
                    'suit': trig.get('suit', ''),
                }
                
                # Add trigger difficulty from parent action
                if action_tn:
                    parsed_trig['min_value'] = action_tn
                elif action_stat:
                    parsed_trig['stat'] = action_stat
                    if action_resist:
                        parsed_trig['vs'] = action_resist
                
                effect_text = trig.get('effect', '') or ''
                trig_effects = self.parse_effects(effect_text)
                if trig_effects:
                    parsed_trig['effects'] = trig_effects
                
                trig_target = self.parse_target(effect_text)
                if trig_target:
                    parsed_trig['target'] = trig_target
                
                trig_resources = self.parse_resources(effect_text)
                if trig_resources:
                    parsed_trig['resources'] = trig_resources
                
                # Extract keywords from trigger text
                trig_keywords = self.extract_keywords(effect_text)
                if trig_keywords:
                    parsed_trig['referenced_keywords'] = trig_keywords
                
                parsed_triggers.append(parsed_trig)
            
            parsed['triggers'] = parsed_triggers
        
        return parsed
    
    def parse_card(self, card: Dict) -> Dict:
        """Parse all abilities and actions for a card."""
        parsed = {
            'id': card.get('id'),
            'name': card.get('name'),
            'parsed_abilities': [],
            'parsed_attacks': [],
            'parsed_tactical': [],
        }
        
        # Parse abilities
        for ab in card.get('abilities', []):
            parsed['parsed_abilities'].append(self.parse_ability(ab))
        
        # Parse attack actions
        for atk in card.get('attack_actions', []):
            parsed['parsed_attacks'].append(self.parse_action(atk, is_attack=True))
        
        # Parse tactical actions
        for tac in card.get('tactical_actions', []):
            parsed['parsed_tactical'].append(self.parse_action(tac, is_attack=False))
        
        # Aggregate card-level synergy data
        parsed['conditions_applied'] = self._aggregate_conditions(parsed, 'apply_condition')
        parsed['conditions_removed'] = self._aggregate_conditions(parsed, 'remove_condition')
        parsed['markers_created'] = self._aggregate_markers(parsed, 'generates')
        parsed['markers_consumed'] = self._aggregate_markers(parsed, 'consumes')
        parsed['marker_interactions'] = self._aggregate_marker_interactions(parsed)
        parsed['trigger_events'] = self._aggregate_triggers(parsed)
        parsed['trigger_suits_needed'] = self._aggregate_trigger_suits(parsed)
        parsed['has_bonus_actions'] = self._has_action_type(parsed, 0)
        parsed['has_free_actions'] = self._has_action_type(parsed, 0)  # bonus and free both 0 AP
        parsed['grants_bonus_action'] = self._detects_grants_bonus_action(card)
        parsed['keyword_synergies'] = self._aggregate_keyword_filters(parsed)
        parsed['effect_costs'] = self._aggregate_effect_costs(parsed)
        parsed['buffs_characteristics'] = self._extract_characteristic_synergies(card)
        parsed['benefits_from_conditions'] = self._extract_condition_benefits(card)
        
        return parsed
    
    def _detects_grants_bonus_action(self, card: Dict) -> bool:
        """Detect if card grants bonus/free actions to other models."""
        # Gather all text from card
        all_text = ''
        for ab in card.get('abilities', []):
            all_text += ' ' + (ab.get('description') or '')
        for atk in card.get('attack_actions', []):
            all_text += ' ' + (atk.get('description') or '')
            for trig in atk.get('triggers', []):
                all_text += ' ' + (trig.get('effect') or '')
        for tac in card.get('tactical_actions', []):
            all_text += ' ' + (tac.get('description') or '')
            for trig in tac.get('triggers', []):
                all_text += ' ' + (trig.get('effect') or '')
        
        all_text = all_text.lower()
        
        # Patterns for granting actions to others
        grant_patterns = [
            r'as\s+a\s+(?:bonus|free)\s+action',  # "as a bonus action"
            r'(?:target|friendly|another)\s+(?:model\s+)?(?:may\s+)?(?:immediately\s+)?take\s+(?:a\s+)?(?:bonus|free)\s+action',
            r'(?:bonus|free)\s+(?:action|ap)\s+(?:to|for)',
            r'gains?\s+(?:a\s+)?(?:bonus|free)\s+action',
            r'treated\s+as\s+a\s+(?:bonus|free)\s+action',  # "treated as a bonus action"
        ]
        
        for pattern in grant_patterns:
            if re.search(pattern, all_text):
                return True
        
        return False
        
        return parsed
    
    def _aggregate_trigger_suits(self, parsed: Dict) -> List[Dict]:
        """Aggregate suits needed for triggers with difficulty info.
        
        Returns list of:
        {
            "suit": "Tome",
            "min_value": 6,  # For tactical actions
            "stat": 6,       # For attack actions  
            "vs": "Df"       # What defender resists with
        }
        """
        suits = []
        seen = set()
        
        # Valid Malifaux suits only
        VALID_SUITS = {'tome', 'crow', 'mask', 'ram', 'masks', 'tomes', 'crows', 'rams'}
        
        for action_list in [parsed['parsed_attacks'], parsed['parsed_tactical']]:
            for action in action_list:
                for trig in action.get('triggers', []):
                    suit = trig.get('suit') or ''
                    suit = suit.lower().strip()
                    if suit in VALID_SUITS:
                        # Normalize to singular
                        suit_name = suit.rstrip('s').title()
                        
                        # Create unique key for deduplication
                        key = (suit_name, trig.get('min_value'), trig.get('stat'), trig.get('vs'))
                        if key not in seen:
                            seen.add(key)
                            entry = {'suit': suit_name}
                            if trig.get('min_value'):
                                entry['min_value'] = trig['min_value']
                            if trig.get('stat'):
                                entry['stat'] = trig['stat']
                            if trig.get('vs'):
                                entry['vs'] = trig['vs']
                            suits.append(entry)
        
        return suits
    
    def _aggregate_marker_interactions(self, parsed: Dict) -> List[Dict]:
        """Aggregate detailed marker interactions with function type."""
        interactions = []
        seen = set()
        
        for ab in parsed['parsed_abilities']:
            for marker in ab.get('resources', {}).get('markers', []):
                key = (marker.get('marker_type', ''), marker.get('function', ''))
                if key not in seen and key[0]:
                    interactions.append(marker)
                    seen.add(key)
        
        for action_list in [parsed['parsed_attacks'], parsed['parsed_tactical']]:
            for action in action_list:
                for marker in action.get('resources', {}).get('markers', []):
                    key = (marker.get('marker_type', ''), marker.get('function', ''))
                    if key not in seen and key[0]:
                        interactions.append(marker)
                        seen.add(key)
                
                for trig in action.get('triggers', []):
                    for marker in trig.get('resources', {}).get('markers', []):
                        key = (marker.get('marker_type', ''), marker.get('function', ''))
                        if key not in seen and key[0]:
                            interactions.append(marker)
                            seen.add(key)
        
        return interactions
        
        return parsed
    
    def _has_action_type(self, parsed: Dict, ap_cost: int) -> bool:
        """Check if card has actions of a given AP cost."""
        for action in parsed['parsed_tactical']:
            if action.get('ap_cost') == ap_cost:
                return True
        return False
    
    def _aggregate_keyword_filters(self, parsed: Dict) -> List[str]:
        """Aggregate keywords that this card synergizes with."""
        keywords = set()
        
        # From abilities
        for ab in parsed['parsed_abilities']:
            # From trigger filters
            trigger = ab.get('trigger', {})
            filt = trigger.get('filter', {})
            if filt.get('keyword'):
                keywords.add(filt['keyword'])
            if filt.get('characteristic'):
                keywords.add(filt['characteristic'])
            
            # From referenced keywords
            for kw in ab.get('referenced_keywords', []):
                keywords.add(kw)
        
        # From actions and triggers
        for action_list in [parsed['parsed_attacks'], parsed['parsed_tactical']]:
            for action in action_list:
                for kw in action.get('referenced_keywords', []):
                    keywords.add(kw)
                for trig in action.get('triggers', []):
                    for kw in trig.get('referenced_keywords', []):
                        keywords.add(kw)
        
        return list(keywords)
    
    def _aggregate_effect_costs(self, parsed: Dict) -> List[str]:
        """Aggregate what costs effects require."""
        costs = set()
        
        for action_list in [parsed['parsed_attacks'], parsed['parsed_tactical']]:
            for action in action_list:
                for eff in action.get('effects', []):
                    if eff.get('cost'):
                        for cost_type in eff['cost'].keys():
                            costs.add(cost_type)
                for trig in action.get('triggers', []):
                    for eff in trig.get('effects', []):
                        if eff.get('cost'):
                            for cost_type in eff['cost'].keys():
                                costs.add(cost_type)
        
        return list(costs)
    
    def _extract_characteristic_synergies(self, card: Dict) -> List[str]:
        """Extract which characteristics this card's abilities buff/interact with.
        
        This identifies cards whose abilities specifically help models with
        certain characteristics (Construct, Living, Undead, Beast, etc.)
        """
        characteristics = set()
        
        # Key characteristics that create cross-crew synergies
        CHAR_PATTERNS = {
            'Construct': [r'friendly\s+construct', r'allied\s+construct', r'construct\s+model', 
                         r'construct\s+only', r'a\s+construct', r'each\s+construct', r'other\s+construct'],
            'Living': [r'friendly\s+living', r'allied\s+living', r'living\s+model',
                      r'living\s+only', r'a\s+living', r'each\s+living', r'other\s+living'],
            'Undead': [r'friendly\s+undead', r'allied\s+undead', r'undead\s+model',
                      r'undead\s+only', r'a\s+undead', r'each\s+undead', r'other\s+undead'],
            'Beast': [r'friendly\s+beast', r'allied\s+beast', r'beast\s+model',
                     r'beast\s+only', r'a\s+beast', r'each\s+beast', r'other\s+beast'],
            'Spirit': [r'friendly\s+spirit', r'allied\s+spirit', r'spirit\s+model',
                      r'spirit\s+only', r'a\s+spirit', r'each\s+spirit', r'other\s+spirit'],
            'Elemental': [r'friendly\s+elemental', r'allied\s+elemental', r'elemental\s+model',
                         r'elemental\s+only', r'a\s+elemental', r'each\s+elemental', r'other\s+elemental'],
            'Nightmare': [r'friendly\s+nightmare', r'allied\s+nightmare', r'nightmare\s+model',
                         r'nightmare\s+only', r'a\s+nightmare', r'each\s+nightmare', r'other\s+nightmare'],
            'Horror': [r'friendly\s+horror', r'allied\s+horror', r'horror\s+model',
                      r'horror\s+only', r'a\s+horror', r'each\s+horror', r'other\s+horror'],
            'Totem': [r'friendly\s+totem', r'allied\s+totem', r'totem\s+model',
                     r'totem\s+only', r'each\s+totem', r'other\s+totem'],
        }
        
        # Gather all text from card
        all_text = ''
        for ab in card.get('abilities', []):
            all_text += ' ' + (ab.get('description') or '')
        for atk in card.get('attack_actions', []):
            all_text += ' ' + (atk.get('description') or '')
            for trig in atk.get('triggers', []):
                all_text += ' ' + (trig.get('effect') or '')
        for tac in card.get('tactical_actions', []):
            all_text += ' ' + (tac.get('description') or '')
            for trig in tac.get('triggers', []):
                all_text += ' ' + (trig.get('effect') or '')
        
        all_text = all_text.lower()
        
        # Check each characteristic
        for char, patterns in CHAR_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, all_text):
                    characteristics.add(char)
                    break
        
        return list(characteristics)
    
    def _extract_condition_benefits(self, card: Dict) -> List[str]:
        """Extract which conditions this card benefits from on enemies.
        
        Detects patterns like:
        - "if target has X token"
        - "models with X token"  
        - "for each X token on target"
        - damage/duel bonuses when target has condition
        """
        conditions = set()
        
        # Conditions to check
        KNOWN_CONDITIONS = {
            'burning', 'poison', 'slow', 'staggered', 'stunned', 'distracted',
            'injured', 'focused', 'shielded', 'fast', 'adversary',
            'blight', 'brilliance', 'glutted', 'craven', 'paralyzed'
        }
        
        # Patterns indicating BENEFIT from condition on enemy
        BENEFIT_PATTERNS = [
            # Conditional bonuses
            r'if\s+(?:the\s+)?target\s+has\s+(?:a\s+)?(\w+)\s+token',
            r'target\s+must\s+have\s+(?:a\s+)?(\w+)\s+token',
            r'for\s+each\s+(\w+)\s+token\s+on\s+(?:the\s+)?target',
            r'(?:enemy|enemies|models?)\s+with\s+(?:a\s+)?(?:friendly\s+)?(\w+)\s+token',
            r'if.*has\s+(?:a\s+)?(\w+)\s+token.*(?:deal|\+\d|damage|raise)',
            r'has\s+(?:an?\s+)?(\w+)\s+token.*?(?:raise|deal|\+)',
        ]
        
        # Gather all text from card
        all_text = ''
        for ab in card.get('abilities', []):
            all_text += ' ' + (ab.get('description') or '')
        for atk in card.get('attack_actions', []):
            all_text += ' ' + (atk.get('description') or '')
            for trig in atk.get('triggers', []):
                all_text += ' ' + (trig.get('effect') or '')
        for tac in card.get('tactical_actions', []):
            all_text += ' ' + (tac.get('description') or '')
            for trig in tac.get('triggers', []):
                all_text += ' ' + (trig.get('effect') or '')
        
        all_text = all_text.lower()
        
        # Check each pattern
        for pattern in BENEFIT_PATTERNS:
            matches = re.findall(pattern, all_text)
            for match in matches:
                if match in KNOWN_CONDITIONS:
                    conditions.add(match)
        
        return list(conditions)

    def _aggregate_conditions(self, parsed: Dict, effect_type: str) -> List[str]:
        """Aggregate all conditions of a given type."""
        conditions = set()
        
        for ab in parsed['parsed_abilities']:
            for eff in ab.get('effects', []):
                if eff.get('type') == effect_type and eff.get('condition'):
                    conditions.add(eff['condition'])
        
        for action_list in [parsed['parsed_attacks'], parsed['parsed_tactical']]:
            for action in action_list:
                for eff in action.get('effects', []):
                    if eff.get('type') == effect_type and eff.get('condition'):
                        conditions.add(eff['condition'])
                for trig in action.get('triggers', []):
                    for eff in trig.get('effects', []):
                        if eff.get('type') == effect_type and eff.get('condition'):
                            conditions.add(eff['condition'])
        
        return list(conditions)
    
    def _aggregate_markers(self, parsed: Dict, resource_type: str) -> List[str]:
        """Aggregate all markers created or consumed."""
        markers = set()
        
        # From resources
        for ab in parsed['parsed_abilities']:
            for res in ab.get('resources', {}).get(resource_type, []):
                if res.get('type') == 'marker':
                    markers.add(res.get('subtype', ''))
        
        for action_list in [parsed['parsed_attacks'], parsed['parsed_tactical']]:
            for action in action_list:
                # From resources
                for res in action.get('resources', {}).get(resource_type, []):
                    if res.get('type') == 'marker':
                        markers.add(res.get('subtype', ''))
                
                # From effects (for create_marker/remove_marker)
                effect_type = 'create_marker' if resource_type == 'generates' else 'remove_marker'
                for eff in action.get('effects', []):
                    if eff.get('type') == effect_type and eff.get('marker_type'):
                        markers.add(eff['marker_type'])
                
                # From triggers
                for trig in action.get('triggers', []):
                    for res in trig.get('resources', {}).get(resource_type, []):
                        if res.get('type') == 'marker':
                            markers.add(res.get('subtype', ''))
                    # Also check trigger effects
                    for eff in trig.get('effects', []):
                        if eff.get('type') == effect_type and eff.get('marker_type'):
                            markers.add(eff['marker_type'])
        
        # Clean markers using the normalization function
        cleaned = set()
        for m in markers:
            normalized = self._normalize_marker(m)
            if normalized:
                cleaned.add(normalized)
        
        return list(cleaned)
    
    def _aggregate_triggers(self, parsed: Dict) -> List[str]:
        """Aggregate all trigger events the card responds to."""
        events = set()
        
        for ab in parsed['parsed_abilities']:
            if ab.get('trigger', {}).get('event'):
                events.add(ab['trigger']['event'])
        
        return list(events)


# =============================================================================
# MAIN
# =============================================================================

def debug_card(cards: List[Dict], name: str):
    """Debug parsing for a specific card."""
    parser = AbilityParser()
    
    for card in cards:
        if name.lower() in card.get('name', '').lower():
            print(f"\n{'='*70}")
            print(f"PARSING: {card['name']}")
            print(f"{'='*70}")
            
            parsed = parser.parse_card(card)
            
            print(f"\n## ABILITIES")
            for ab in parsed['parsed_abilities']:
                print(f"\n  {ab['name']}:")
                for key, val in ab.items():
                    if key != 'name' and val:
                        print(f"    {key}: {val}")
            
            print(f"\n## ATTACK ACTIONS")
            for atk in parsed['parsed_attacks']:
                print(f"\n  {atk['name']}:")
                for key, val in atk.items():
                    if key not in ['name', 'triggers'] and val:
                        print(f"    {key}: {val}")
                if atk.get('triggers'):
                    print(f"    triggers:")
                    for trig in atk['triggers']:
                        print(f"      - {trig['name']}: {trig.get('effects', [])}")
            
            print(f"\n## TACTICAL ACTIONS")
            for tac in parsed['parsed_tactical']:
                print(f"\n  {tac['name']}:")
                for key, val in tac.items():
                    if key not in ['name', 'triggers'] and val:
                        print(f"    {key}: {val}")
            
            print(f"\n## AGGREGATED SYNERGY DATA")
            print(f"  conditions_applied: {parsed['conditions_applied']}")
            print(f"  conditions_removed: {parsed['conditions_removed']}")
            print(f"  markers_created: {parsed['markers_created']}")
            print(f"  markers_consumed: {parsed['markers_consumed']}")
            print(f"  trigger_events: {parsed['trigger_events']}")
            
            return
    
    print(f"Card not found: {name}")


def main():
    parser = argparse.ArgumentParser(description="Parse Malifaux ability text into structured data")
    
    parser.add_argument('input', type=Path, help='Input cards JSON')
    parser.add_argument('-o', '--output', type=Path, help='Output JSON with parsed data')
    parser.add_argument('--debug', type=str, metavar='NAME', help='Debug a specific card')
    parser.add_argument('--stats', action='store_true', help='Show parsing statistics')
    
    args = parser.parse_args()
    
    # Load cards
    print(f"Loading: {args.input}")
    with open(args.input, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    print(f"Loaded {len(cards)} cards")
    
    # Debug mode
    if args.debug:
        debug_card(cards, args.debug)
        return
    
    # Parse all cards
    print(f"\nParsing abilities and actions...")
    ability_parser = AbilityParser()
    
    for card in cards:
        parsed = ability_parser.parse_card(card)
        
        # Add parsed data to card
        card['parsed'] = {
            'conditions_applied': parsed['conditions_applied'],
            'conditions_removed': parsed['conditions_removed'],
            'markers_created': parsed['markers_created'],
            'markers_consumed': parsed['markers_consumed'],
            'marker_interactions': parsed['marker_interactions'],
            'trigger_events': parsed['trigger_events'],
            'trigger_suits_needed': parsed['trigger_suits_needed'],
            'has_bonus_actions': parsed['has_bonus_actions'],
            'grants_bonus_action': parsed['grants_bonus_action'],
            'keyword_synergies': parsed['keyword_synergies'],
            'effect_costs': parsed['effect_costs'],
            'buffs_characteristics': parsed['buffs_characteristics'],
            'benefits_from_conditions': parsed['benefits_from_conditions'],
        }
        
        # Keep detailed parsed data if needed
        card['_parsed_abilities'] = parsed['parsed_abilities']
        card['_parsed_attacks'] = parsed['parsed_attacks']
        card['_parsed_tactical'] = parsed['parsed_tactical']
    
    # Print stats
    print(f"\n{'='*60}")
    print("PARSING STATISTICS")
    print(f"{'='*60}")
    
    for effect_type, count in sorted(ability_parser.stats.items(), key=lambda x: -x[1]):
        print(f"  {effect_type}: {count}")
    
    # Aggregate stats
    cards_with_conditions = sum(1 for c in cards if c['parsed']['conditions_applied'])
    cards_with_markers = sum(1 for c in cards if c['parsed']['markers_created'])
    cards_with_triggers = sum(1 for c in cards if c['parsed']['trigger_events'])
    
    print(f"\n  Cards applying conditions: {cards_with_conditions}")
    print(f"  Cards creating markers: {cards_with_markers}")
    print(f"  Cards with trigger events: {cards_with_triggers}")
    
    # Condition distribution
    all_conditions = defaultdict(int)
    for card in cards:
        for cond in card['parsed']['conditions_applied']:
            all_conditions[cond] += 1
    
    print(f"\n  Top conditions applied:")
    for cond, count in sorted(all_conditions.items(), key=lambda x: -x[1])[:10]:
        print(f"    {cond}: {count}")
    
    # Save output
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(cards, f, indent=2, ensure_ascii=False)
        print(f"\nSaved to: {args.output}")
    else:
        print(f"\nUse -o FILE to save output")


if __name__ == '__main__':
    main()
