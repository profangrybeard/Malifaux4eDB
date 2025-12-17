"""
Malifaux 4E Schemes and Strategies - Gaining Grounds 2025

Based on official Gaining Grounds Season Zero content.
Maps each scheme/strategy to required model capabilities for crew building.
"""

from collections import defaultdict

# =============================================================================
# STRATEGIES - Main objectives (one per game, up to 5 VP)
# =============================================================================

STRATEGIES = {
    'plant_explosives': {
        'name': 'Plant Explosives',
        'description': 'Drop bomb markers on enemy half, guard them',
        'requirements': {
            'scheme_markers': 3,
            'mobility': 2,
            'survivability': 2,
            'activation_control': 1,
        },
        'preferred_roles': ['schemer', 'support'],
        'tips': 'Want 7+ bomb interactions turn 1. Guarded bombs are key.',
    },
    'boundary_dispute': {
        'name': 'Boundary Dispute', 
        'description': 'Kick strategy markers into enemy territory',
        'requirements': {
            'survivability': 3,
            'melee': 2,
            'mobility': 1,
        },
        'preferred_roles': ['aggro', 'control'],
        'tips': 'Fightiest strategy. Push up middle and kill.',
    },
    'recover_evidence': {
        'name': 'Recover Evidence',
        'description': 'Collect markers from killed models',
        'requirements': {
            'damage': 2,
            'mobility': 2,
            'scheme_markers': 1,
            'kidnap': 1,
        },
        'preferred_roles': ['aggro', 'schemer'],
        'tips': 'Avoidant gameplay wins. Kidnap crews strong.',
    },
    'informants': {
        'name': 'Informants',
        'description': 'Control strategy markers across the board',
        'requirements': {
            'survivability': 3,
            'spread': 2,
            'activation_control': 2,
        },
        'preferred_roles': ['control', 'support'],
        'tips': 'Summoners weak (summons dont count). Turn 4 doubles.',
    },
}

# =============================================================================
# SCHEMES - Secret objectives (branching tree, up to 6 VP total)
# =============================================================================

SCHEMES = {
    'breakthrough': {
        'name': 'Breakthrough',
        'description': 'Scheme markers in enemy deployment zone',
        'requirements': {
            'scheme_markers': 3,
            'mobility': 3,
            'survivability': 1,
        },
        'preferred_roles': ['schemer'],
        'branches_to': ['assassinate', 'public_demonstration', 'frame_job'],
    },
    'harness_the_leyline': {
        'name': 'Harness the Leyline',
        'description': 'Scheme markers on centerline, 6" apart',
        'requirements': {
            'scheme_markers': 2,
            'spread': 2,
            'board_control': 1,
        },
        'preferred_roles': ['schemer', 'control'],
        'branches_to': ['assassinate', 'scout_the_rooftops', 'grave_robbing'],
    },
    'search_the_area': {
        'name': 'Search the Area',
        'description': '3 scheme markers near terrain on enemy half',
        'requirements': {
            'scheme_markers': 3,
            'mobility': 2,
            'interact': 1,
        },
        'preferred_roles': ['schemer'],
        'branches_to': ['breakthrough', 'frame_job', 'harness_the_leyline'],
    },
    'detonate_charges': {
        'name': 'Detonate Charges',
        'description': 'Scheme markers within 2" of enemies',
        'requirements': {
            'scheme_markers': 2,
            'mobility': 2,
            'survivability': 1,
        },
        'preferred_roles': ['schemer'],
        'branches_to': ['grave_robbing', 'runic_binding', 'take_the_highground'],
    },
    'runic_binding': {
        'name': 'Runic Binding',
        'description': 'Triangle of 3 markers with enemy inside',
        'requirements': {
            'scheme_markers': 3,
            'spread': 3,
            'positioning': 1,
        },
        'preferred_roles': ['schemer'],
        'branches_to': ['leave_your_mark', 'take_the_highground', 'ensnare'],
    },
    'reshape_the_land': {
        'name': 'Reshape the Land',
        'description': '4-5 friendly markers on enemy half',
        'requirements': {
            'marker_creation': 3,
            'mobility': 2,
        },
        'preferred_roles': ['schemer', 'summoner'],
        'branches_to': ['search_the_area', 'breakthrough', 'public_demonstration'],
    },
    'leave_your_mark': {
        'name': 'Leave Your Mark',
        'description': 'More scheme markers at centerpoint than enemy',
        'requirements': {
            'scheme_markers': 2,
            'board_control': 2,
            'dont_mind_me': 1,
        },
        'preferred_roles': ['schemer', 'control'],
        'branches_to': ['take_the_highground', 'reshape_the_land', 'make_it_look_like_an_accident'],
    },
    'scout_the_rooftops': {
        'name': 'Scout the Rooftops',
        'description': 'Scheme markers at elevation 2+ on different terrain',
        'requirements': {
            'mobility': 3,
            'flight': 2,
            'scheme_markers': 2,
        },
        'preferred_roles': ['schemer'],
        'branches_to': ['detonate_charges', 'grave_robbing', 'leave_your_mark'],
    },
    'take_the_highground': {
        'name': 'Take the Highground',
        'description': 'Control 2-3 height 2+ terrain pieces',
        'requirements': {
            'mobility': 2,
            'flight': 1,
            'survivability': 2,
            'spread': 2,
        },
        'preferred_roles': ['schemer', 'control'],
        'branches_to': ['make_it_look_like_an_accident', 'ensnare', 'search_the_area'],
    },
    'make_it_look_like_an_accident': {
        'name': 'Make It Look Like an Accident',
        'description': 'Enemy takes falling damage, then kill/half them',
        'requirements': {
            'push_pull': 3,
            'damage': 1,
        },
        'preferred_roles': ['control', 'aggro'],
        'branches_to': ['ensnare', 'reshape_the_land', 'breakthrough'],
    },
    'assassinate': {
        'name': 'Assassinate',
        'description': 'Reduce unique enemy to half, then kill',
        'requirements': {
            'damage': 3,
            'mobility': 2,
            'alpha_strike': 2,
        },
        'preferred_roles': ['aggro'],
        'branches_to': ['scout_the_rooftops', 'detonate_charges', 'runic_binding'],
    },
    'grave_robbing': {
        'name': 'Grave Robbing',
        'description': 'Kill near chosen marker type, collect remains',
        'requirements': {
            'damage': 2,
            'marker_interaction': 2,
            'corpse_markers': 1,
        },
        'preferred_roles': ['aggro', 'summoner'],
        'branches_to': ['runic_binding', 'leave_your_mark', 'make_it_look_like_an_accident'],
    },
    'frame_job': {
        'name': 'Frame Job',
        'description': 'Friendly model takes damage from enemy on their half',
        'requirements': {
            'survivability': 2,
            'mobility': 2,
            'scheme_markers': 1,
        },
        'preferred_roles': ['schemer'],
        'branches_to': ['public_demonstration', 'harness_the_leyline', 'scout_the_rooftops'],
    },
    'ensnare': {
        'name': 'Ensnare',
        'description': '2 scheme markers within 2" of unique enemy',
        'requirements': {
            'scheme_markers': 2,
            'engagement': 2,
            'cheap_activations': 1,
        },
        'preferred_roles': ['schemer', 'control'],
        'branches_to': ['reshape_the_land', 'search_the_area', 'frame_job'],
    },
    'public_demonstration': {
        'name': 'Public Demonstration',
        'description': '2+ friendly minions engaging unique enemy',
        'requirements': {
            'minion_heavy': 3,
            'engagement': 2,
            'survivability': 1,
        },
        'preferred_roles': ['control'],
        'branches_to': ['harness_the_leyline', 'assassinate', 'detonate_charges'],
    },
}


# =============================================================================
# CAPABILITY DETECTION
# =============================================================================

def get_model_capabilities(card: dict) -> dict:
    """Detect scheme/strategy-relevant capabilities for a model."""
    caps = defaultdict(int)
    
    parsed = card.get('parsed', {})
    roles = card.get('roles', [])
    cost = card.get('cost', 10)
    station = card.get('station', '')
    
    all_text = ''
    for ab in card.get('abilities', []):
        all_text += ' ' + (ab.get('name', '') + ' ' + (ab.get('description') or '')).lower()
    for atk in card.get('attack_actions', []) + card.get('tactical_actions', []):
        all_text += ' ' + (atk.get('description') or '').lower()
    
    chars = ' '.join(card.get('characteristics', [])).lower()
    
    # SCHEME MARKERS
    if 'scheme' in parsed.get('markers_created', []):
        caps['scheme_markers'] += 2
    if 'schemer' in roles:
        caps['scheme_markers'] += 1
    if 'interact' in all_text and ('bonus' in all_text or '0' in all_text):
        caps['scheme_markers'] += 1
        caps['interact'] += 2
    if "don't mind me" in all_text or 'dont mind me' in all_text:
        caps['dont_mind_me'] += 2
        caps['scheme_markers'] += 1
    
    # MOBILITY
    if 'incorporeal' in chars or 'incorporeal' in all_text:
        caps['mobility'] += 2
        caps['flight'] += 2
    if 'flight' in chars or 'flight' in all_text:
        caps['mobility'] += 2
        caps['flight'] += 2
    if 'leap' in all_text or 'unimpeded' in all_text:
        caps['mobility'] += 1
        caps['flight'] += 1
    if 'fast' in parsed.get('conditions_applied', []):
        caps['mobility'] += 1
    mv = card.get('mv', 0)
    if mv and mv >= 6:
        caps['mobility'] += 1
    if mv and mv >= 7:
        caps['mobility'] += 1
    
    # SURVIVABILITY
    if 'hard to kill' in all_text or 'hard to wound' in all_text:
        caps['survivability'] += 2
    if 'armor' in all_text:
        caps['survivability'] += 1
    if 'regeneration' in all_text or 'regen' in all_text:
        caps['survivability'] += 1
    if 'shielded' in parsed.get('conditions_applied', []):
        caps['survivability'] += 1
    df = card.get('df', 0)
    if df and df >= 6:
        caps['survivability'] += 1
    wounds = card.get('wounds', 0)
    if wounds and wounds >= 8:
        caps['survivability'] += 1
    if wounds and wounds >= 10:
        caps['survivability'] += 1
    
    # DAMAGE
    if 'aggro' in roles:
        caps['damage'] += 2
    for atk in card.get('attack_actions', []):
        dmg = atk.get('damage', {})
        if isinstance(dmg, dict):
            severe = dmg.get('severe', 0)
            if severe and severe >= 5:
                caps['damage'] += 1
                caps['alpha_strike'] += 1
                break
    if 'execute' in all_text or 'killed' in all_text:
        caps['damage'] += 1
    
    # ENGAGEMENT / MELEE
    melee_attacks = sum(1 for atk in card.get('attack_actions', [])
                       if atk.get('range') in [1, 2, '1', '2', '1"', '2"', 'y1', 'y2'])
    if melee_attacks > 0:
        caps['engagement'] += 1
        caps['melee'] += 1
    if melee_attacks >= 2:
        caps['engagement'] += 1
        caps['melee'] += 1
    if 'engagement' in all_text or 'cannot disengage' in all_text:
        caps['engagement'] += 1
    
    # PUSH/PULL/CONTROL
    if 'control' in roles:
        caps['board_control'] += 2
        caps['push_pull'] += 1
    if 'lure' in all_text or 'obey' in all_text:
        caps['push_pull'] += 2
        caps['kidnap'] += 2
    if 'push' in all_text or 'place' in all_text:
        caps['push_pull'] += 1
    if 'slow' in parsed.get('conditions_applied', []):
        caps['board_control'] += 1
    if 'stunned' in parsed.get('conditions_applied', []):
        caps['board_control'] += 1
    
    # MARKERS
    markers_created = parsed.get('markers_created', [])
    if len(markers_created) > 0:
        caps['marker_creation'] += min(len(markers_created), 3)
    if 'remains' in markers_created or 'corpse' in markers_created:
        caps['corpse_markers'] += 2
    if 'undead' in chars:
        caps['corpse_markers'] += 1
    
    markers_consumed = parsed.get('markers_consumed', [])
    if len(markers_consumed) > 0:
        caps['marker_interaction'] += 2
    
    # SPREAD / ACTIVATIONS
    if caps['mobility'] >= 2:
        caps['spread'] += 1
    if cost == 0:
        caps['cheap_activations'] += 3
        caps['spread'] += 1
    elif cost <= 3:
        caps['cheap_activations'] += 2
    elif cost <= 5:
        caps['cheap_activations'] += 1
        caps['spread'] += 1
    
    if 'summoner' in roles:
        caps['spread'] += 2
        caps['activation_control'] += 2
    
    # MINIONS
    if station == 'Minion':
        caps['minion_heavy'] += 2
    
    # ALPHA STRIKE
    if 'charge' in all_text and ('bonus' in all_text or '+' in all_text):
        caps['alpha_strike'] += 1
    if caps['damage'] >= 2 and caps['mobility'] >= 2:
        caps['alpha_strike'] += 1
    
    return dict(caps)


def get_pool_requirements(strategy: str = None, schemes: list = None) -> dict:
    """Aggregate requirements from strategy and schemes."""
    requirements = defaultdict(int)
    
    if strategy and strategy in STRATEGIES:
        for cap, strength in STRATEGIES[strategy].get('requirements', {}).items():
            requirements[cap] += strength
    
    if schemes:
        for scheme_id in schemes:
            if scheme_id in SCHEMES:
                for cap, strength in SCHEMES[scheme_id].get('requirements', {}).items():
                    requirements[cap] += strength
    
    return dict(requirements)


def score_model_for_pool(card: dict, pool_requirements: dict) -> tuple:
    """Score how well a model matches pool requirements."""
    if '_capabilities' in card:
        caps = card['_capabilities']
    else:
        caps = get_model_capabilities(card)
    
    score = 0
    reasons = []
    
    for req_cap, req_strength in pool_requirements.items():
        model_strength = caps.get(req_cap, 0)
        if model_strength > 0:
            contribution = min(model_strength, req_strength)
            points = contribution * 2
            score += points
            reasons.append(f"Pool: {req_cap} ({model_strength}/{req_strength}) (+{points})")
    
    return score, reasons


def recommend_scheme_path(current_scheme: str, crew_capabilities: dict) -> list:
    """Recommend best scheme path based on crew capabilities."""
    if current_scheme not in SCHEMES:
        return []
    
    branches = SCHEMES[current_scheme].get('branches_to', [])
    recommendations = []
    
    for branch in branches:
        scheme_reqs = SCHEMES[branch].get('requirements', {})
        score = 0
        reasons = []
        
        for req, strength in scheme_reqs.items():
            crew_strength = crew_capabilities.get(req, 0)
            if crew_strength >= strength:
                score += strength * 2
                reasons.append(f"Crew has {req}: {crew_strength}/{strength}")
            elif crew_strength > 0:
                score += crew_strength
                reasons.append(f"Partial {req}: {crew_strength}/{strength}")
        
        recommendations.append({
            'scheme': branch,
            'name': SCHEMES[branch]['name'],
            'score': score,
            'reasons': reasons,
        })
    
    recommendations.sort(key=lambda x: -x['score'])
    return recommendations


if __name__ == '__main__':
    print("=== STRATEGIES ===\n")
    for sid, s in sorted(STRATEGIES.items()):
        reqs = ', '.join(f"{k}:{v}" for k, v in s.get('requirements', {}).items())
        print(f"{sid}: {s['name']} [{reqs}]")
    
    print("\n=== SCHEMES ===\n")
    for sid, s in sorted(SCHEMES.items()):
        reqs = ', '.join(f"{k}:{v}" for k, v in s.get('requirements', {}).items())
        branches = ', '.join(s.get('branches_to', []))
        print(f"{sid}: {s['name']} [{reqs}] -> [{branches}]")
