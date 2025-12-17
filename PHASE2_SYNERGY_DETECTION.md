# Phase 2: Synergy Detection System

## Goal
Given a Master or starting model, recommend models that synergize well based on parsed ability data.

---

## Parsed Data Available (v2)

```json
{
  "parsed": {
    "conditions_applied": ["burning", "slow"],
    "benefits_from_conditions": ["burning"],
    "markers_created": ["scheme", "pyre"],
    "markers_consumed": ["corpse"],
    "marker_interactions": [
      {"marker_type": "Scheme", "function": "generate"},
      {"marker_type": "Corpse", "function": "consume"}
    ],
    "trigger_events": ["killed", "activation_start"],
    "trigger_suits_needed": ["Tome", "Crow"],
    "buffs_characteristics": ["Construct"],
    "keyword_synergies": ["Gamin", "Academic"],
    "effect_costs": ["discard_card"],
    "has_bonus_actions": true
  }
}
```

### Coverage Summary
| Field | Cards | Notes |
|-------|-------|-------|
| conditions_applied | 941 (70.6%) | Who creates conditions |
| benefits_from_conditions | 182 (13.7%) | Who exploits conditions |
| markers_created | 639 (47.9%) | Marker generators |
| markers_consumed | 152 (11.4%) | Marker consumers |
| marker_interactions | 511 (38.3%) | Detailed generate/consume/interact |
| trigger_suits_needed | 968 (72.6%) | Suits for triggers |
| buffs_characteristics | 39 (2.9%) | Characteristic buffers |
| keyword_synergies | 102 (7.7%) | Keyword references |

---

## Synergy Types (Priority Order)

### 1. KEYWORD HIRING (Foundation)
**Data:** `card.keywords`, `card.primary_keyword`
**Logic:** Cards share a keyword → can be hired without tax

```
Master: Hoffman (Augmented)
  → All Augmented models (free hiring)
  → Versatile models (1 SS tax)
  → Out-of-keyword (2 SS tax)
```

**Output:** `hiring_pool` with cost modifier

---

### 2. CHARACTERISTIC BUFFS (High Confidence)
**Data:** `parsed.buffs_characteristics` → `card.characteristics`
**Logic:** Card A buffs Constructs → pairs with all Construct models

```
Howard Langston: buffs_characteristics: ['Construct']
  → Synergizes with: Peacekeeper, Watcher, Guardian (all Constructs)
  
Synergy Score: +3 per characteristic match
```

**Algorithm:**
```python
for card in hiring_pool:
    for char in card.characteristics:
        if char in master_crew_buffs_characteristics:
            synergy_score += 3
```

---

### 3. MARKER ECONOMY (High Confidence)
**Data:** `parsed.markers_created` → `parsed.markers_consumed`
**Logic:** Card A creates Corpse markers → Card B consumes Corpse markers

```
Reva: markers_created: ['corpse']
  → Synergizes with: Shieldbearer (consumes corpse), Vincent (consumes corpse)

Colette: markers_created: ['scheme']
  → Synergizes with: Mannequin (interacts with scheme markers)
```

**Marker Synergy Matrix:**
| Creates | Consumes | Synergy |
|---------|----------|---------|
| corpse | corpse | +4 (Resurrectionist core) |
| scrap | scrap | +4 (Foundry core) |
| scheme | scheme | +2 (universal) |
| pyre | pyre | +3 (Wildfire) |

**Algorithm:**
```python
crew_creates = set()
for card in current_crew:
    crew_creates.update(card.parsed.markers_created)

for candidate in hiring_pool:
    for marker in candidate.parsed.markers_consumed:
        if marker in crew_creates:
            synergy_score += MARKER_WEIGHTS.get(marker, 2)
```

---

### 4. CONDITION CHAINS (Medium Confidence)
**Data:** `parsed.conditions_applied` + text search for condition beneficiaries
**Logic:** Card A applies Burning → Card B benefits from Burning on enemies

**Known Condition Synergies:**
| Condition | Appliers | Beneficiaries (need to detect) |
|-----------|----------|-------------------------------|
| Burning | Kaeris, Fire Golem | Cards with "target has Burning" |
| Poison | McMourning, Nurses | Cards with "Poison +X damage" |
| Stunned | Hoffman, Dashel | Control synergy (activation denial) |
| Distracted | Pandora | Cards exploiting negative WP |

**Gap:** We detect appliers but not beneficiaries. 

**v1 Approach:** 
- Manual mapping of common condition synergies
- Score: +2 per matching condition in known synergy pairs

**v2 Approach:** (future)
- Parse "if target has X" patterns
- Build automatic beneficiary detection

---

### 5. TRIGGER EVENT CHAINS (Medium Confidence)
**Data:** `parsed.trigger_events`
**Logic:** "after_killing" crew benefits from models that die easily or provide death benefits

```
trigger_events: ['kills_enemy'] 
  → Pairs with: Models that enable kills (debuffers, damage buffs)

trigger_events: ['killed'] (Demise abilities)
  → Pairs with: Summoners who can resummon, crews that benefit from deaths
```

**Synergy Pairs:**
| Event A | Event B | Synergy |
|---------|---------|---------|
| kills_enemy | - | Pairs with damage buffs |
| killed (demise) | summoner role | Resummon potential |
| activation_start | support role | Aura/buff synergy |

---

### 6. ROLE BALANCE (Crew Composition)
**Data:** `card.roles`
**Logic:** Crews need balance of roles

**Target Composition:**
| Role | Target % | Min | Max |
|------|----------|-----|-----|
| Aggro | 30-40% | 2 | 4 |
| Schemer | 20-30% | 1 | 3 |
| Support | 10-20% | 1 | 2 |
| Control | 10-20% | 0 | 2 |
| Summoner | 0-10% | 0 | 1 |

**Algorithm:**
```python
current_roles = count_roles(current_crew)
for candidate in hiring_pool:
    if crew_needs_role(candidate.roles, current_roles):
        synergy_score += 2
```

---

### 7. TRIGGER SUIT SYNERGY (New)
**Data:** `parsed.trigger_suits_needed`
**Logic:** Card A needs Masks for triggers → Card B provides free Masks

```
Hoffman needs: ['Tome', 'Crow', 'Mask']
  → Synergizes with: Cards that can cheat suits or provide suit tokens
  
Pandora needs: ['Crow']
  → Heavy Crow dependency → prioritize Crow-generating models
```

**Suit Distribution:**
- Tome: 702 cards need
- Crow: 690 cards need  
- Mask: 570 cards need
- Ram: 359 cards need

**Synergy Score:**
- If crew has suit generation matching needed suits: +2
- If Master has heavy single-suit dependency: prioritize that suit

---

## Synergy Score Formula

```python
def calculate_synergy(candidate, crew, master):
    score = 0
    
    # 1. Keyword (base)
    if shares_keyword(candidate, master):
        score += 5
    elif 'Versatile' in candidate.keywords:
        score += 3
    
    # 2. Characteristic buffs
    for char in candidate.characteristics:
        if char in crew.buffs_characteristics:
            score += 3
    
    # 3. Marker economy
    for marker in candidate.parsed.markers_consumed:
        if marker in crew.markers_created:
            score += MARKER_WEIGHTS[marker]
    for marker in candidate.parsed.markers_created:
        if marker in crew.markers_consumed:
            score += MARKER_WEIGHTS[marker]
    
    # 4. Condition chains (v1: manual mapping)
    for condition in candidate.benefits_from_conditions:  # Need to add
        if condition in crew.conditions_applied:
            score += 2
    
    # 5. Role balance
    if fills_needed_role(candidate, crew):
        score += 2
    
    # 6. Station efficiency
    score += station_efficiency(candidate, remaining_soulstones)
    
    return score
```

---

## Output Format

```json
{
  "master": "Charles Hoffman Inventor",
  "keyword": "Augmented",
  "crew_synergies": {
    "buffs_characteristics": ["Construct"],
    "markers_created": ["pylon"],
    "conditions_applied": ["stunned", "staggered"]
  },
  "recommendations": [
    {
      "name": "Peacekeeper",
      "synergy_score": 12,
      "reasons": [
        "Keyword: Augmented (+5)",
        "Characteristic: Construct buffed by crew (+3)",
        "Role: Aggro fills crew need (+2)",
        "Efficient beater for cost (+2)"
      ],
      "hiring_cost": 10,
      "effective_cost": 10
    },
    {
      "name": "Howard Langston",
      "synergy_score": 11,
      "reasons": [
        "Keyword: Augmented (+5)",
        "Buffs Constructs - synergy with crew (+3)",
        "Role: Aggro fills crew need (+2)"
      ]
    }
  ]
}
```

---

## Implementation Plan

### Step 1: Core Engine (Today)
```
synergy_engine.py
├── load_cards()
├── calculate_keyword_synergy()
├── calculate_characteristic_synergy()
├── calculate_marker_synergy()
├── calculate_role_balance()
└── recommend_for_master(master_name) → ranked list
```

### Step 2: Condition Synergies (Manual Mapping)
```
condition_synergies.json
{
  "burning": {
    "appliers": ["kaeris", "fire_golem", ...],
    "beneficiaries": ["eternal_flame", ...]  // Manual for v1
  }
}
```

### Step 3: API/CLI
```bash
python synergy_engine.py --master "Hoffman" --pool 50
python synergy_engine.py --master "Hoffman" --scheme "turf_war"
```

### Step 4: Web Integration
- React component for crew builder
- Real-time synergy scoring as models added

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Top 5 recommendations include "obvious" picks | 80%+ |
| Synergy scores correlate with tournament crews | Validate against meta |
| Sub-100ms recommendation time | Performance |

---

## Known Limitations (v1)

1. **Condition beneficiaries** - Manual mapping only
2. **Positioning/auras** - Not considered
3. **Strategy/Scheme matching** - Not in v1
4. **Upgrade synergies** - Upgrades not in dataset
5. **Meta considerations** - No matchup data

---

## Files to Create

| File | Purpose |
|------|---------|
| `synergy_engine.py` | Core recommendation engine |
| `synergy_weights.json` | Tunable synergy weights |
| `condition_synergies.json` | Manual condition mappings |
| `test_synergy.py` | Validation against known good crews |

---

## Ready to Build?

Start with `synergy_engine.py` implementing:
1. Keyword synergy (trivial)
2. Characteristic synergy (we have data)
3. Marker synergy (we have data)
4. Role balance (we have data)

Then validate against known crews (Hoffman + Constructs, Reva + Corpse users, etc.)
