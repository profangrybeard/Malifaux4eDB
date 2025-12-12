#!/usr/bin/env python3
"""
Malifaux Collaborative Filtering Engine
Learns crew synergies from tournament data and suggests model additions.

This system supports:
1. Learning from real tournament crew lists
2. Rule-based fallback when data is sparse
3. Designer-tunable weights for synergy scoring
4. Integration with your enriched card data

Usage:
    # Train from crew data
    python crew_recommender.py train --crews crews.json --cards cards_enriched.json --output model.pkl
    
    # Get recommendations
    python crew_recommender.py recommend --model model.pkl --crew "Rasputina,Wendigo,Ice Dancer"
    
    # Generate synthetic training data from rules
    python crew_recommender.py bootstrap --cards cards_enriched.json --output synthetic_crews.json

Dependencies:
    pip install numpy pandas scikit-learn
"""

import json
import pickle
import argparse
import warnings
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass, field, asdict
from collections import defaultdict, Counter
import random

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION - Designer-tunable weights
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_CONFIG = {
    "version": "1.0.0",
    
    # ─────────────────────────────────────────────────────────────────────────
    # SYNERGY WEIGHTS - How much to boost co-occurrence scores
    # ─────────────────────────────────────────────────────────────────────────
    "synergy_weights": {
        # Keyword relationships
        "same_keyword": 2.0,           # Models sharing a keyword
        "master_keyword_match": 2.5,   # Model matches master's keyword
        "versatile_in_keyword": 1.2,   # Versatile model in keyword crew
        "out_of_keyword_penalty": 0.6, # Model from different keyword
        
        # Condition synergies
        "condition_producer_consumer": 1.8,  # One applies, one benefits
        "shared_condition_focus": 1.5,       # Both work with same condition
        
        # Marker synergies
        "marker_producer_consumer": 2.0,     # One makes, one uses
        "marker_shared_generation": 1.3,     # Both generate same marker
        
        # Role balance
        "role_diversity_bonus": 1.2,         # Crew has varied roles
        "role_redundancy_penalty": 0.8,      # Too many of same role
        
        # Station considerations
        "henchman_bonus": 1.1,               # Henchmen are valuable
        "cheap_minion_value": 1.0,           # Cost-efficient minions
        "elite_model_value": 1.1,            # Higher cost = more impactful
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # ROLE TARGETS - Ideal crew composition
    # ─────────────────────────────────────────────────────────────────────────
    "role_targets": {
        "scheme_runner": {
            "min": 1, "ideal": 2, "max": 3,
            "weight": 1.0,
            "description": "Need mobility for schemes"
        },
        "beater": {
            "min": 1, "ideal": 2, "max": 3,
            "weight": 1.0,
            "description": "Need damage dealing"
        },
        "tank": {
            "min": 0, "ideal": 1, "max": 2,
            "weight": 0.8,
            "description": "Survivability anchor"
        },
        "support": {
            "min": 0, "ideal": 1, "max": 2,
            "weight": 0.9,
            "description": "Crew enhancement"
        },
        "control": {
            "min": 0, "ideal": 1, "max": 2,
            "weight": 0.7,
            "description": "Enemy manipulation"
        },
        "summoner": {
            "min": 0, "ideal": 1, "max": 1,
            "weight": 0.5,
            "description": "Usually the master"
        },
        "ranged_damage": {
            "min": 0, "ideal": 1, "max": 2,
            "weight": 0.8,
            "description": "Threat projection"
        },
        "condition_engine": {
            "min": 0, "ideal": 1, "max": 2,
            "weight": 0.7,
            "description": "Condition synergy"
        },
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # CREW CONSTRAINTS
    # ─────────────────────────────────────────────────────────────────────────
    "crew_constraints": {
        "target_soulstones": 50,
        "min_soulstones": 45,
        "max_soulstones": 50,
        "soulstone_cache_min": 3,
        "soulstone_cache_max": 7,
        "min_models": 5,
        "max_models": 10,
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # LEARNING PARAMETERS
    # ─────────────────────────────────────────────────────────────────────────
    "learning": {
        "min_cooccurrence": 2,           # Min times seen together to count
        "smoothing_factor": 0.1,         # Laplace smoothing for sparse data
        "recency_weight": 1.2,           # Boost recent tournament data
        "win_rate_factor": 1.5,          # Boost models from winning crews
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # FACTION THEMES - Flavor guidance
    # ─────────────────────────────────────────────────────────────────────────
    "faction_themes": {
        "Arcanists": {
            "preferred_conditions": ["burning", "focused"],
            "preferred_markers": ["pyre", "ice_pillar", "scrap"],
            "style": "magic_and_constructs"
        },
        "Bayou": {
            "preferred_conditions": ["poison", "injured"],
            "preferred_markers": ["scheme_marker"],
            "style": "chaotic_numbers"
        },
        "Guild": {
            "preferred_conditions": ["slow", "stunned", "burning"],
            "preferred_markers": ["scheme_marker"],
            "style": "control_and_armor"
        },
        "Neverborn": {
            "preferred_conditions": ["stunned", "distracted", "slow"],
            "preferred_markers": ["shadow"],
            "style": "movement_and_wp"
        },
        "Outcasts": {
            "preferred_conditions": ["burning", "injured"],
            "preferred_markers": ["scrap", "scheme_marker"],
            "style": "flexible_mercenary"
        },
        "Resurrectionists": {
            "preferred_conditions": ["poison", "injured", "slow"],
            "preferred_markers": ["corpse"],
            "style": "undead_recursion"
        },
        "Ten Thunders": {
            "preferred_conditions": ["focused", "fast", "distracted"],
            "preferred_markers": ["shadow", "scheme_marker"],
            "style": "versatile_synergy"
        },
        "Explorer Society": {
            "preferred_conditions": ["shielded", "focused"],
            "preferred_markers": ["lodestone", "scheme_marker"],
            "style": "artifacts_terrain"
        },
    }
}


def load_config(config_path: Optional[str] = None) -> dict:
    """Load configuration, falling back to defaults."""
    config = DEFAULT_CONFIG.copy()
    if config_path and Path(config_path).exists():
        with open(config_path, encoding='utf-8') as f:
            user_config = json.load(f)
            # Deep merge user config into defaults
            for key, value in user_config.items():
                if isinstance(value, dict) and key in config:
                    config[key].update(value)
                else:
                    config[key] = value
    return config


def save_default_config(path: str):
    """Save default config as a starting point for customization."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(DEFAULT_CONFIG, f, indent=2)
    print(f"Saved default config to {path}")


# ═══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Crew:
    """Represents a tournament crew list."""
    leader: str                          # Master/Leader name
    faction: str                         # Faction
    models: List[str]                    # All model names in crew
    total_cost: int = 50                 # Soulstone cost
    tournament: str = ""                 # Source tournament
    player: str = ""                     # Player name
    result: str = ""                     # Win/Loss/Draw
    date: str = ""                       # Date played
    
    def __post_init__(self):
        # Normalize model names
        self.models = [m.strip() for m in self.models]
        self.leader = self.leader.strip()


@dataclass  
class ModelProfile:
    """Extracted profile for a model from cards_enriched.json."""
    id: str
    name: str
    faction: str
    keywords: List[str]
    cost: Optional[int]
    station: str  # Master, Henchman, Enforcer, Minion, Totem
    roles: List[str]
    role_confidence: Dict[str, float]
    conditions_applied: List[str]
    conditions_required: List[str]
    markers_generated: List[str]
    markers_consumed: List[str]
    summons: List[str]
    versatile: bool = False
    characteristics: List[str] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# CARD DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

class CardDatabase:
    """
    Manages the enriched card data for lookups.
    """
    
    def __init__(self, cards_path: str):
        self.cards_path = cards_path
        self.models: Dict[str, ModelProfile] = {}
        self.name_to_id: Dict[str, str] = {}
        self.faction_models: Dict[str, List[str]] = defaultdict(list)
        self.keyword_models: Dict[str, List[str]] = defaultdict(list)
        
        self._load_cards()
    
    def _load_cards(self):
        """Load and index card data."""
        with open(self.cards_path, encoding='utf-8') as f:
            data = json.load(f)
        
        for card in data.get('cards', []):
            if card.get('card_type') != 'Stat':
                continue
                
            # Determine station from characteristics
            chars = card.get('characteristics', [])
            if 'Master' in chars:
                station = 'Master'
            elif 'Henchman' in chars:
                station = 'Henchman'
            elif 'Enforcer' in chars:
                station = 'Enforcer'
            elif 'Totem' in chars:
                station = 'Totem'
            elif 'Minion' in chars:
                station = 'Minion'
            else:
                station = 'Unknown'
            
            tags = card.get('extracted_tags', {})
            
            profile = ModelProfile(
                id=card.get('id', ''),
                name=card.get('name', ''),
                faction=card.get('faction', ''),
                keywords=card.get('keywords', []),
                cost=card.get('cost'),
                station=station,
                roles=card.get('roles', []),
                role_confidence=card.get('role_confidence', {}),
                conditions_applied=tags.get('conditions_applied', []),
                conditions_required=tags.get('conditions_required', []),
                markers_generated=tags.get('markers_generated', []),
                markers_consumed=tags.get('markers_consumed', []),
                summons=tags.get('summons', []),
                versatile='Versatile' in card.get('keywords', []),
                characteristics=chars,
            )
            
            self.models[profile.id] = profile
            self.name_to_id[profile.name.lower()] = profile.id
            self.faction_models[profile.faction].append(profile.id)
            
            for kw in profile.keywords:
                self.keyword_models[kw].append(profile.id)
    
    def get_by_name(self, name: str) -> Optional[ModelProfile]:
        """Look up model by name (case-insensitive)."""
        model_id = self.name_to_id.get(name.lower())
        if model_id:
            return self.models.get(model_id)
        # Fuzzy fallback - partial match
        name_lower = name.lower()
        for stored_name, model_id in self.name_to_id.items():
            if name_lower in stored_name or stored_name in name_lower:
                return self.models.get(model_id)
        return None
    
    def get_by_id(self, model_id: str) -> Optional[ModelProfile]:
        """Look up model by ID."""
        return self.models.get(model_id)
    
    def get_faction_models(self, faction: str) -> List[ModelProfile]:
        """Get all models in a faction."""
        return [self.models[mid] for mid in self.faction_models.get(faction, [])]
    
    def get_keyword_models(self, keyword: str) -> List[ModelProfile]:
        """Get all models with a keyword."""
        return [self.models[mid] for mid in self.keyword_models.get(keyword, [])]


# ═══════════════════════════════════════════════════════════════════════════════
# CO-OCCURRENCE MATRIX
# ═══════════════════════════════════════════════════════════════════════════════

class CooccurrenceMatrix:
    """
    Tracks how often models appear together in crews.
    This is the core of collaborative filtering.
    """
    
    def __init__(self, card_db: CardDatabase, config: dict):
        self.card_db = card_db
        self.config = config
        
        # Model ID to matrix index mapping
        self.model_ids = list(card_db.models.keys())
        self.id_to_idx = {mid: i for i, mid in enumerate(self.model_ids)}
        self.n_models = len(self.model_ids)
        
        # Co-occurrence counts
        self.cooccurrence = np.zeros((self.n_models, self.n_models), dtype=np.float32)
        
        # Model appearance counts (for normalization)
        self.appearance_counts = np.zeros(self.n_models, dtype=np.float32)
        
        # Crew count for statistics
        self.n_crews = 0
    
    def add_crew(self, crew: Crew, weight: float = 1.0):
        """Add a crew to the co-occurrence matrix."""
        # Resolve model names to IDs
        model_ids = []
        for model_name in crew.models:
            profile = self.card_db.get_by_name(model_name)
            if profile:
                model_ids.append(profile.id)
        
        # Also add the leader
        leader_profile = self.card_db.get_by_name(crew.leader)
        if leader_profile:
            model_ids.append(leader_profile.id)
        
        # Update co-occurrence for all pairs
        for i, mid1 in enumerate(model_ids):
            idx1 = self.id_to_idx.get(mid1)
            if idx1 is None:
                continue
                
            self.appearance_counts[idx1] += weight
            
            for mid2 in model_ids[i+1:]:
                idx2 = self.id_to_idx.get(mid2)
                if idx2 is None:
                    continue
                    
                # Symmetric update
                self.cooccurrence[idx1, idx2] += weight
                self.cooccurrence[idx2, idx1] += weight
        
        self.n_crews += 1
    
    def get_cooccurrence(self, model_id1: str, model_id2: str) -> float:
        """Get raw co-occurrence count between two models."""
        idx1 = self.id_to_idx.get(model_id1)
        idx2 = self.id_to_idx.get(model_id2)
        if idx1 is None or idx2 is None:
            return 0.0
        return self.cooccurrence[idx1, idx2]
    
    def get_pmi(self, model_id1: str, model_id2: str) -> float:
        """
        Get Pointwise Mutual Information between two models.
        PMI = log(P(a,b) / (P(a) * P(b)))
        High PMI = models appear together more than expected by chance.
        """
        idx1 = self.id_to_idx.get(model_id1)
        idx2 = self.id_to_idx.get(model_id2)
        if idx1 is None or idx2 is None:
            return 0.0
        
        cooc = self.cooccurrence[idx1, idx2]
        count1 = self.appearance_counts[idx1]
        count2 = self.appearance_counts[idx2]
        
        if cooc == 0 or count1 == 0 or count2 == 0 or self.n_crews == 0:
            return 0.0
        
        # P(a,b), P(a), P(b)
        p_ab = cooc / self.n_crews
        p_a = count1 / self.n_crews
        p_b = count2 / self.n_crews
        
        # PMI with smoothing
        smoothing = self.config['learning']['smoothing_factor']
        pmi = np.log((p_ab + smoothing) / ((p_a * p_b) + smoothing))
        
        return float(pmi)
    
    def compute_similarity_matrix(self) -> np.ndarray:
        """
        Compute model-model similarity from co-occurrence.
        Uses normalized PMI + cosine similarity of co-occurrence vectors.
        """
        # Normalize rows to get probability-like vectors
        row_sums = self.cooccurrence.sum(axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1  # Avoid division by zero
        normalized = self.cooccurrence / row_sums
        
        # Cosine similarity
        similarity = cosine_similarity(normalized)
        
        return similarity


# ═══════════════════════════════════════════════════════════════════════════════
# RULE-BASED SYNERGY SCORER
# ═══════════════════════════════════════════════════════════════════════════════

class RuleBasedScorer:
    """
    Scores model synergies based on explicit rules.
    Used as fallback when collaborative data is sparse.
    """
    
    def __init__(self, card_db: CardDatabase, config: dict):
        self.card_db = card_db
        self.config = config
        self.weights = config['synergy_weights']
    
    def score_pair(self, model1: ModelProfile, model2: ModelProfile, 
                   leader_keywords: Set[str] = None) -> Tuple[float, List[str]]:
        """
        Score synergy between two models.
        Returns (score, [reasons]).
        """
        score = 1.0
        reasons = []
        
        leader_keywords = leader_keywords or set()
        
        # ─── Keyword Synergy ───
        shared_keywords = set(model1.keywords) & set(model2.keywords)
        # Exclude generic keywords
        shared_keywords -= {'Versatile', 'Living', 'Undead', 'Construct', 'Beast'}
        
        if shared_keywords:
            score *= self.weights['same_keyword']
            reasons.append(f"shared_keyword:{list(shared_keywords)[0]}")
        
        # Leader keyword match
        if leader_keywords:
            m1_matches = set(model1.keywords) & leader_keywords
            m2_matches = set(model2.keywords) & leader_keywords
            if m1_matches and m2_matches:
                score *= self.weights['master_keyword_match']
                reasons.append("both_match_leader_keyword")
        
        # ─── Condition Synergy ───
        # Model 1 produces what Model 2 needs
        m1_produces = set(model1.conditions_applied)
        m2_needs = set(model2.conditions_required)
        if m1_produces & m2_needs:
            score *= self.weights['condition_producer_consumer']
            reasons.append(f"condition_synergy:{list(m1_produces & m2_needs)[0]}")
        
        # Model 2 produces what Model 1 needs
        m2_produces = set(model2.conditions_applied)
        m1_needs = set(model1.conditions_required)
        if m2_produces & m1_needs:
            score *= self.weights['condition_producer_consumer']
            reasons.append(f"condition_synergy:{list(m2_produces & m1_needs)[0]}")
        
        # Shared condition focus (both apply same condition)
        shared_conditions = m1_produces & m2_produces
        if shared_conditions:
            score *= self.weights['shared_condition_focus']
            reasons.append(f"shared_condition:{list(shared_conditions)[0]}")
        
        # ─── Marker Synergy ───
        m1_generates = set(model1.markers_generated)
        m2_consumes = set(model2.markers_consumed)
        if m1_generates & m2_consumes:
            score *= self.weights['marker_producer_consumer']
            reasons.append(f"marker_synergy:{list(m1_generates & m2_consumes)[0]}")
        
        m2_generates = set(model2.markers_generated)
        m1_consumes = set(model1.markers_consumed)
        if m2_generates & m1_consumes:
            score *= self.weights['marker_producer_consumer']
            reasons.append(f"marker_synergy:{list(m2_generates & m1_consumes)[0]}")
        
        # ─── Role Diversity ───
        m1_roles = set(model1.roles)
        m2_roles = set(model2.roles)
        if not (m1_roles & m2_roles):
            # Different roles = good diversity
            score *= self.weights['role_diversity_bonus']
            reasons.append("role_diversity")
        elif len(m1_roles & m2_roles) > 1:
            # Too much overlap
            score *= self.weights['role_redundancy_penalty']
            reasons.append("role_overlap")
        
        return score, reasons
    
    def score_addition(self, candidate: ModelProfile, current_crew: List[ModelProfile],
                       leader: ModelProfile = None) -> Tuple[float, List[str]]:
        """
        Score how well a candidate fits the current crew.
        """
        if not current_crew:
            return 1.0, ["empty_crew"]
        
        leader_keywords = set(leader.keywords) if leader else set()
        
        # Average synergy with existing crew
        total_score = 0.0
        all_reasons = []
        
        for existing in current_crew:
            pair_score, reasons = self.score_pair(candidate, existing, leader_keywords)
            total_score += pair_score
            all_reasons.extend(reasons)
        
        avg_score = total_score / len(current_crew)
        
        # Role balance scoring
        current_roles = Counter()
        for model in current_crew:
            for role in model.roles:
                current_roles[role] += 1
        
        role_bonus = 0.0
        for role, target in self.config['role_targets'].items():
            current_count = current_roles.get(role, 0)
            if role in candidate.roles:
                if current_count < target['min']:
                    # Filling a gap
                    role_bonus += target['weight'] * 0.3
                    all_reasons.append(f"fills_{role}_gap")
                elif current_count < target['ideal']:
                    role_bonus += target['weight'] * 0.1
                elif current_count >= target['max']:
                    # Already have enough
                    role_bonus -= target['weight'] * 0.2
                    all_reasons.append(f"excess_{role}")
        
        final_score = avg_score + role_bonus
        
        return final_score, list(set(all_reasons))


# ═══════════════════════════════════════════════════════════════════════════════
# CREW RECOMMENDER
# ═══════════════════════════════════════════════════════════════════════════════

class CrewRecommender:
    """
    Main recommendation engine combining collaborative filtering and rules.
    """
    
    def __init__(self, card_db: CardDatabase, config: dict):
        self.card_db = card_db
        self.config = config
        self.cooccurrence = CooccurrenceMatrix(card_db, config)
        self.rule_scorer = RuleBasedScorer(card_db, config)
        
        # Blend weights
        self.collaborative_weight = 0.7
        self.rule_weight = 0.3
    
    def train(self, crews: List[Crew]):
        """Train on tournament crew data."""
        print(f"Training on {len(crews)} crews...")
        
        for crew in crews:
            # Weight by result if available
            weight = 1.0
            if crew.result:
                if 'win' in crew.result.lower() or crew.result == 'W':
                    weight = self.config['learning']['win_rate_factor']
                elif 'loss' in crew.result.lower() or crew.result == 'L':
                    weight = 0.8
            
            self.cooccurrence.add_crew(crew, weight)
        
        print(f"Co-occurrence matrix built: {self.cooccurrence.n_models} models")
        print(f"Total crews processed: {self.cooccurrence.n_crews}")
    
    def recommend(self, current_models: List[str], faction: str = None,
                  leader: str = None, n_recommendations: int = 10) -> List[dict]:
        """
        Recommend models to add to a crew.
        
        Args:
            current_models: Names of models already in crew
            faction: Faction to filter by
            leader: Leader/Master name
            n_recommendations: How many to return
            
        Returns:
            List of {model, score, reasons} dicts
        """
        # Resolve current models to profiles
        current_profiles = []
        current_ids = set()
        for name in current_models:
            profile = self.card_db.get_by_name(name)
            if profile:
                current_profiles.append(profile)
                current_ids.add(profile.id)
        
        # Resolve leader
        leader_profile = None
        if leader:
            leader_profile = self.card_db.get_by_name(leader)
        elif current_profiles:
            # Assume first model is leader if not specified
            for p in current_profiles:
                if p.station == 'Master':
                    leader_profile = p
                    break
        
        # Get candidate models
        if faction:
            candidates = self.card_db.get_faction_models(faction)
        elif leader_profile:
            candidates = self.card_db.get_faction_models(leader_profile.faction)
        else:
            candidates = list(self.card_db.models.values())
        
        # Filter out already-selected models
        candidates = [c for c in candidates if c.id not in current_ids]
        
        # Score each candidate
        scored = []
        for candidate in candidates:
            # Collaborative score (from co-occurrence)
            collab_score = self._collaborative_score(candidate, current_ids)
            
            # Rule-based score
            rule_score, reasons = self.rule_scorer.score_addition(
                candidate, current_profiles, leader_profile
            )
            
            # Blend scores
            final_score = (
                self.collaborative_weight * collab_score +
                self.rule_weight * rule_score
            )
            
            scored.append({
                'model': candidate.name,
                'model_id': candidate.id,
                'score': final_score,
                'collaborative_score': collab_score,
                'rule_score': rule_score,
                'reasons': reasons,
                'cost': candidate.cost,
                'roles': candidate.roles,
                'keywords': candidate.keywords,
            })
        
        # Sort by score descending
        scored.sort(key=lambda x: x['score'], reverse=True)
        
        return scored[:n_recommendations]
    
    def _collaborative_score(self, candidate: ModelProfile, current_ids: Set[str]) -> float:
        """Compute collaborative filtering score for a candidate."""
        if not current_ids or self.cooccurrence.n_crews == 0:
            return 1.0  # Neutral if no data
        
        # Average PMI with current crew
        total_pmi = 0.0
        for mid in current_ids:
            pmi = self.cooccurrence.get_pmi(candidate.id, mid)
            total_pmi += pmi
        
        avg_pmi = total_pmi / len(current_ids)
        
        # Convert PMI to a 0-2 scale score (1 = neutral)
        # PMI typically ranges from -5 to +5
        score = 1.0 + (avg_pmi / 5.0)
        score = max(0.1, min(2.0, score))  # Clamp
        
        return score
    
    def save(self, path: str):
        """Save trained model to disk."""
        state = {
            'cooccurrence': self.cooccurrence.cooccurrence,
            'appearance_counts': self.cooccurrence.appearance_counts,
            'n_crews': self.cooccurrence.n_crews,
            'model_ids': self.cooccurrence.model_ids,
            'config': self.config,
        }
        with open(path, 'wb') as f:
            pickle.dump(state, f)
        print(f"Model saved to {path}")
    
    def load(self, path: str):
        """Load trained model from disk."""
        with open(path, 'rb') as f:
            state = pickle.load(f)
        
        self.cooccurrence.cooccurrence = state['cooccurrence']
        self.cooccurrence.appearance_counts = state['appearance_counts']
        self.cooccurrence.n_crews = state['n_crews']
        self.config = state['config']
        print(f"Model loaded from {path} ({state['n_crews']} crews)")


# ═══════════════════════════════════════════════════════════════════════════════
# SYNTHETIC DATA GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

class SyntheticCrewGenerator:
    """
    Generates synthetic crew data based on rules when tournament data is scarce.
    """
    
    def __init__(self, card_db: CardDatabase, config: dict):
        self.card_db = card_db
        self.config = config
    
    def generate(self, n_crews: int = 500) -> List[Crew]:
        """Generate synthetic crews based on hiring rules."""
        crews = []
        
        # Get all masters
        masters = [m for m in self.card_db.models.values() if m.station == 'Master']
        
        for _ in range(n_crews):
            # Pick a random master
            master = random.choice(masters)
            
            # Build a crew around this master
            crew = self._build_crew_for_master(master)
            if crew:
                crews.append(crew)
        
        return crews
    
    def _build_crew_for_master(self, master: ModelProfile) -> Optional[Crew]:
        """Build a synthetic crew for a master."""
        models = [master.name]
        total_cost = 0  # Master is free
        remaining_ss = self.config['crew_constraints']['target_soulstones']
        
        # Get master's primary keyword (first non-generic keyword)
        primary_keyword = None
        for kw in master.keywords:
            if kw not in ['Versatile', 'Living', 'Undead', 'Construct', 'Beast', 'Spirit']:
                primary_keyword = kw
                break
        
        # Get available models
        available = []
        for model in self.card_db.models.values():
            if model.station == 'Master':
                continue
            if model.cost is None:
                continue
            if model.faction != master.faction and not model.versatile:
                continue
            available.append(model)
        
        # Prioritize keyword models
        keyword_models = [m for m in available if primary_keyword and primary_keyword in m.keywords]
        versatile_models = [m for m in available if m.versatile]
        other_faction = [m for m in available if m not in keyword_models and m not in versatile_models]
        
        # Build crew with preference order: keyword > versatile > faction
        priorities = [
            (keyword_models, 0),      # In-keyword: no extra cost
            (versatile_models, 0),    # Versatile: no extra cost
            (other_faction, 1),       # Out-of-keyword: +1 cost
        ]
        
        # Ensure role coverage
        needed_roles = {'scheme_runner', 'beater'}
        
        for model_pool, cost_modifier in priorities:
            random.shuffle(model_pool)
            for model in model_pool:
                effective_cost = (model.cost or 0) + cost_modifier
                
                if effective_cost > remaining_ss:
                    continue
                
                # Check if we need this role
                model_roles = set(model.roles)
                fills_need = bool(model_roles & needed_roles)
                
                # Add model
                models.append(model.name)
                remaining_ss -= effective_cost
                total_cost += effective_cost
                
                # Update needed roles
                needed_roles -= model_roles
                
                # Stop if crew is big enough
                if len(models) >= 7 or remaining_ss < 3:
                    break
            
            if len(models) >= 7 or remaining_ss < 3:
                break
        
        if len(models) < 4:
            return None  # Crew too small
        
        return Crew(
            leader=master.name,
            faction=master.faction,
            models=models,
            total_cost=total_cost,
            tournament="synthetic",
        )


# ═══════════════════════════════════════════════════════════════════════════════
# LONGSHANKS SCRAPER (stub for future implementation)
# ═══════════════════════════════════════════════════════════════════════════════

class LongshanksScraper:
    """
    Scrapes crew lists from Longshanks.
    
    Note: This is a stub. Full implementation would need to:
    1. Handle authentication if required
    2. Navigate event pages
    3. Parse crew list format
    4. Respect rate limits
    """
    
    def __init__(self, cache_dir: str = "./longshanks_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.base_url = "https://malifaux.longshanks.org"
    
    def scrape_event(self, event_id: int) -> List[Crew]:
        """Scrape crews from a single event."""
        # TODO: Implement actual scraping
        # This would fetch /event/{event_id}/ and parse crew lists
        raise NotImplementedError(
            "Longshanks scraping not yet implemented. "
            "For now, manually export crew data or use synthetic generation."
        )
    
    def scrape_recent_events(self, n_events: int = 50) -> List[Crew]:
        """Scrape crews from recent events."""
        # TODO: Implement
        raise NotImplementedError("Not yet implemented")


# ═══════════════════════════════════════════════════════════════════════════════
# CREW DATA PARSER
# ═══════════════════════════════════════════════════════════════════════════════

def parse_crew_file(path: str) -> List[Crew]:
    """
    Parse crew data from various formats.
    
    Supported formats:
    - JSON array of crew objects
    - JSONL (one crew per line)
    - CSV with columns: leader, faction, model1, model2, ...
    """
    path = Path(path)
    
    if path.suffix == '.json':
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        
        crews = []
        for item in data:
            crews.append(Crew(
                leader=item.get('leader', ''),
                faction=item.get('faction', ''),
                models=item.get('models', []),
                total_cost=item.get('total_cost', 50),
                tournament=item.get('tournament', ''),
                player=item.get('player', ''),
                result=item.get('result', ''),
            ))
        return crews
    
    elif path.suffix == '.jsonl':
        crews = []
        with open(path, encoding='utf-8') as f:
            for line in f:
                item = json.loads(line)
                crews.append(Crew(
                    leader=item.get('leader', ''),
                    faction=item.get('faction', ''),
                    models=item.get('models', []),
                ))
        return crews
    
    elif path.suffix == '.csv':
        df = pd.read_csv(path)
        crews = []
        for _, row in df.iterrows():
            models = [row[col] for col in df.columns if col.startswith('model') and pd.notna(row[col])]
            crews.append(Crew(
                leader=row.get('leader', ''),
                faction=row.get('faction', ''),
                models=models,
            ))
        return crews
    
    else:
        raise ValueError(f"Unsupported file format: {path.suffix}")


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='Malifaux Crew Recommender')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Train command
    train_parser = subparsers.add_parser('train', help='Train on crew data')
    train_parser.add_argument('--crews', required=True, help='Crew data file (JSON/JSONL/CSV)')
    train_parser.add_argument('--cards', required=True, help='Enriched cards JSON')
    train_parser.add_argument('--config', help='Config JSON file')
    train_parser.add_argument('--output', default='model.pkl', help='Output model file')
    
    # Recommend command
    rec_parser = subparsers.add_parser('recommend', help='Get recommendations')
    rec_parser.add_argument('--model', required=True, help='Trained model file')
    rec_parser.add_argument('--cards', required=True, help='Enriched cards JSON')
    rec_parser.add_argument('--crew', required=True, help='Current crew (comma-separated names)')
    rec_parser.add_argument('--faction', help='Faction filter')
    rec_parser.add_argument('--leader', help='Leader/Master name')
    rec_parser.add_argument('--n', type=int, default=10, help='Number of recommendations')
    
    # Bootstrap command
    bootstrap_parser = subparsers.add_parser('bootstrap', help='Generate synthetic training data')
    bootstrap_parser.add_argument('--cards', required=True, help='Enriched cards JSON')
    bootstrap_parser.add_argument('--output', default='synthetic_crews.json', help='Output file')
    bootstrap_parser.add_argument('--n', type=int, default=500, help='Number of crews to generate')
    bootstrap_parser.add_argument('--config', help='Config JSON file')
    
    # Config command
    config_parser = subparsers.add_parser('config', help='Generate default config file')
    config_parser.add_argument('--output', default='recommender_config.json', help='Output file')
    
    args = parser.parse_args()
    
    if args.command == 'train':
        config = load_config(args.config)
        card_db = CardDatabase(args.cards)
        crews = parse_crew_file(args.crews)
        
        recommender = CrewRecommender(card_db, config)
        recommender.train(crews)
        recommender.save(args.output)
    
    elif args.command == 'recommend':
        config = load_config()
        card_db = CardDatabase(args.cards)
        
        recommender = CrewRecommender(card_db, config)
        recommender.load(args.model)
        
        # Handle spaces after commas in crew list
        current_models = [m.strip() for m in args.crew.split(',') if m.strip()]
        recommendations = recommender.recommend(
            current_models,
            faction=args.faction,
            leader=args.leader,
            n_recommendations=args.n
        )
        
        print(f"\nRecommendations for crew: {current_models}\n")
        print("-" * 60)
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec['model']} (Cost: {rec['cost']})")
            print(f"   Score: {rec['score']:.3f} (collab: {rec['collaborative_score']:.3f}, rules: {rec['rule_score']:.3f})")
            print(f"   Roles: {', '.join(rec['roles'])}")
            print(f"   Keywords: {', '.join(rec['keywords'][:3])}")
            if rec['reasons']:
                print(f"   Reasons: {', '.join(rec['reasons'][:3])}")
            print()
    
    elif args.command == 'bootstrap':
        config = load_config(args.config)
        card_db = CardDatabase(args.cards)
        
        generator = SyntheticCrewGenerator(card_db, config)
        crews = generator.generate(args.n)
        
        # Save as JSON
        crew_data = [asdict(c) for c in crews]
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(crew_data, f, indent=2)
        
        print(f"Generated {len(crews)} synthetic crews to {args.output}")
        
        # Summary
        factions = Counter(c.faction for c in crews)
        print("\nBy faction:")
        for faction, count in factions.most_common():
            print(f"  {faction}: {count}")
    
    elif args.command == 'config':
        save_default_config(args.output)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
