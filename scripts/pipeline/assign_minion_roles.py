#!/usr/bin/env python3
"""
Assign roles to Minions (5+ SS) and Enforcers based on capabilities and abilities.

Role definitions:
- aggro: High damage output, melee focused, engagers
- schemer: Scheme marker interaction, mobility, Don't Mind Me
- summoner: Creates models/markers, corpse marker interaction
- control: Board control, push/pull, conditions
- support: Healing, buffing, condition removal

For cheap minions (<5 SS): simplified to cheap_activation + optional schemer
"""

import json
import sys
from pathlib import Path


def assign_role(card: dict) -> list[str]:
    """Assign roles based on capabilities and card text analysis."""
    
    caps = card.get('capabilities', {})
    synergy = card.get('synergy_data', {})
    abilities = card.get('abilities', [])
    attacks = card.get('attack_actions', [])
    tacticals = card.get('tactical_actions', [])
    characteristics = card.get('characteristics', [])
    
    # Flatten all text for keyword searching
    all_text = ' '.join([
        ' '.join(a.get('description', '') or '' for a in abilities),
        ' '.join(a.get('description', '') or '' for a in attacks),
        ' '.join(a.get('description', '') or '' for a in tacticals),
    ]).lower()
    
    roles = []
    scores = {
        'aggro': 0,
        'schemer': 0,
        'summoner': 0,
        'control': 0,
        'support': 0
    }
    
    # === AGGRO signals ===
    if caps.get('damage', 0) >= 2:
        scores['aggro'] += 3
    if caps.get('damage', 0) >= 3:
        scores['aggro'] += 2
    if caps.get('melee', 0) >= 2:
        scores['aggro'] += 2
    if caps.get('engagement', 0) >= 2:
        scores['aggro'] += 2
    if 'ruthless' in all_text or 'execute' in all_text:
        scores['aggro'] += 2
    if 'irreducible' in all_text:
        scores['aggro'] += 1
    # Check for high damage attacks
    for a in attacks:
        dmg = a.get('damage')
        if dmg and str(dmg).isdigit() and int(dmg) >= 3:
            scores['aggro'] += 2
            break
        scores['aggro'] += 2
    
    # === SCHEMER signals ===
    if caps.get('scheme_markers', 0) >= 3:
        scores['schemer'] += 3
    if caps.get('dont_mind_me', 0) >= 1:
        scores['schemer'] += 4
    if caps.get('interact', 0) >= 2:
        scores['schemer'] += 3
    if caps.get('mobility', 0) >= 2:
        scores['schemer'] += 2
    if caps.get('flight', 0) >= 2:
        scores['schemer'] += 1
    if 'scheme marker' in all_text:
        scores['schemer'] += 1
    if 'unimpeded' in all_text or 'leap' in all_text:
        scores['schemer'] += 1
    if 'don\'t mind me' in all_text:
        scores['schemer'] += 3
        
    # === SUMMONER signals ===
    if caps.get('corpse_markers', 0) >= 2:
        scores['summoner'] += 2
    if caps.get('marker_creation', 0) >= 2:
        scores['summoner'] += 2
    if 'summon' in all_text:
        scores['summoner'] += 4
    if 'create' in all_text and 'marker' in all_text:
        scores['summoner'] += 2
    if synergy.get('markers_created'):
        scores['summoner'] += len(synergy['markers_created'])
        
    # === CONTROL signals ===
    if caps.get('board_control', 0) >= 2:
        scores['control'] += 3
    if caps.get('push_pull', 0) >= 2:
        scores['control'] += 2
    if caps.get('activation_control', 0) >= 2:
        scores['control'] += 2
    conditions_applied = synergy.get('conditions_applied', [])
    control_conditions = ['slow', 'staggered', 'stunned', 'distracted', 'adversary']
    if any(c in conditions_applied for c in control_conditions):
        scores['control'] += 2
    if 'obey' in all_text or 'lure' in all_text:
        scores['control'] += 3
    if 'bury' in all_text or 'unbury' in all_text:
        scores['control'] += 2
        
    # === SUPPORT signals ===
    if caps.get('survivability', 0) >= 2:
        scores['support'] += 1
    if 'heal' in all_text:
        scores['support'] += 3
    if 'friendly' in all_text and ('bonus' in all_text or 'focus' in all_text):
        scores['support'] += 2
    if synergy.get('conditions_removed'):
        scores['support'] += 2
    if synergy.get('grants_bonus_action'):
        scores['support'] += 2
    if 'shielded' in all_text or 'armor' in all_text:
        scores['support'] += 1
    if 'aura' in all_text and 'friendly' in all_text:
        scores['support'] += 2
    
    # Assign roles based on scores (threshold of 3)
    threshold = 3
    for role, score in scores.items():
        if score >= threshold:
            roles.append(role)
    
    # If no roles assigned, pick the highest score if it's at least 2
    if not roles:
        best_role = max(scores, key=scores.get)
        if scores[best_role] >= 2:
            roles.append(best_role)
    
    # Fallback: if still nothing, use aggro for high damage, schemer for mobile
    if not roles:
        if caps.get('damage', 0) >= 1:
            roles.append('aggro')
        elif caps.get('mobility', 0) >= 1 or caps.get('scheme_markers', 0) >= 2:
            roles.append('schemer')
        else:
            roles.append('aggro')  # Default fallback
    
    return roles


def assign_cheap_minion_role(card: dict) -> list[str]:
    """Simplified roles for cheap minions (<5 SS)."""
    
    caps = card.get('capabilities', {})
    synergy = card.get('synergy_data', {})
    abilities = card.get('abilities', [])
    attacks = card.get('attack_actions', [])
    tacticals = card.get('tactical_actions', [])
    
    # Flatten text for keyword search
    all_text = ' '.join([
        ' '.join(a.get('description', '') or '' for a in abilities),
        ' '.join(a.get('description', '') or '' for a in attacks),
        ' '.join(a.get('description', '') or '' for a in tacticals),
    ]).lower()
    
    roles = []
    
    # Check if it's a schemer
    if (caps.get('scheme_markers', 0) >= 3 or 
        caps.get('dont_mind_me', 0) >= 1 or
        caps.get('mobility', 0) >= 2 or
        'don\'t mind me' in all_text or
        'unimpeded' in all_text):
        roles.append('schemer')
    
    # Check if it does damage / applies offensive conditions
    conditions_applied = synergy.get('conditions_applied', [])
    offensive_conditions = ['burning', 'poison', 'injured', 'bleed']
    if caps.get('damage', 0) >= 1 or any(c in conditions_applied for c in offensive_conditions):
        roles.append('aggro')
    
    # Check for summoner traits (creates corpse markers, etc)
    if caps.get('corpse_markers', 0) >= 1 or 'corpse' in all_text:
        roles.append('summoner')
    
    # Check for support (healing, shielded, etc)
    if 'heal' in all_text or 'shielded' in all_text:
        roles.append('support')
    
    # Fallback - most cheap models are just activations, pick based on what they do
    if not roles:
        if caps.get('damage', 0) >= 1:
            roles.append('aggro')
        else:
            roles.append('schemer')  # Default - cheap models run schemes
    
    return roles


def main():
    input_file = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/uploads/cards.json'
    output_file = sys.argv[2] if len(sys.argv) > 2 else '/mnt/user-data/outputs/cards_with_roles.json'
    
    print(f"Loading cards from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    print(f"Total cards: {len(cards)}")
    
    # Stats tracking
    stats = {
        'minions_5plus_updated': 0,
        'minions_cheap_updated': 0,
        'enforcers_updated': 0,
        'already_had_roles': 0,
        'skipped': 0
    }
    
    role_counts = {'aggro': 0, 'schemer': 0, 'summoner': 0, 'control': 0, 'support': 0}
    
    for card in cards:
        station = card.get('station', '')
        cost = card.get('cost', 0) or 0
        existing_roles = card.get('roles', [])
        
        # Skip if already has roles
        if existing_roles:
            stats['already_had_roles'] += 1
            continue
        
        # Skip Totems, Peons, Masters
        if station in ['Totem', 'Peon', 'Master']:
            stats['skipped'] += 1
            continue
        
        # Process Enforcers
        if station == 'Enforcer':
            roles = assign_role(card)
            card['roles'] = roles
            stats['enforcers_updated'] += 1
            for r in roles:
                role_counts[r] += 1
            continue
        
        # Process Minions
        if station == 'Minion':
            if cost >= 5:
                roles = assign_role(card)
                card['roles'] = roles
                stats['minions_5plus_updated'] += 1
            else:
                roles = assign_cheap_minion_role(card)
                card['roles'] = roles
                stats['minions_cheap_updated'] += 1
            
            for r in roles:
                role_counts[r] += 1
            continue
        
        # Skip Henchmen (they should already have roles)
        stats['skipped'] += 1
    
    print("\n=== Assignment Stats ===")
    print(f"Minions 5+ SS updated: {stats['minions_5plus_updated']}")
    print(f"Minions <5 SS updated: {stats['minions_cheap_updated']}")
    print(f"Enforcers updated: {stats['enforcers_updated']}")
    print(f"Already had roles: {stats['already_had_roles']}")
    print(f"Skipped (Totem/Peon/Master): {stats['skipped']}")
    
    print("\n=== New Role Distribution ===")
    for role, count in sorted(role_counts.items(), key=lambda x: -x[1]):
        print(f"  {role}: {count}")
    
    # Save output
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2)
    
    print(f"\nSaved to {output_file}")
    
    # Verify
    with_roles_now = sum(1 for c in cards if c.get('roles'))
    print(f"Cards with roles now: {with_roles_now} / {len(cards)}")


if __name__ == '__main__':
    main()
