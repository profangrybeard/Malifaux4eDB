# Malifaux 4E Card Data Quality Audit
## Generated: December 14, 2025

---

## Executive Summary

**Total Stat Cards:** 1,335

| Status | Issue | Count | Impact |
|--------|-------|-------|--------|
| 🔴 CRITICAL | Hireable models missing COST | 154 unique (284 total) | Crew building broken |
| 🔴 CRITICAL | True duplicate entries (same ID) | 105 extra records | Data bloat, inconsistency |
| 🟡 WARNING | Cards missing CHARACTERISTICS | 285 | Station detection fails |
| 🟡 WARNING | Soulstone Cache detection | 47% accuracy | SS pool calculation wrong |
| 🟢 OK | All cards have doubled-letter OCR artifacts | 100% | Visual only, parsing works |

---

## Field-by-Field Analysis

### ✅ EXCELLENT (99%+ coverage)
| Field | Coverage | Notes |
|-------|----------|-------|
| name | 100% | ✓ All cards named |
| faction | 100% | ✓ All factions assigned |
| primary_keyword | 100% | ✓ Keyword synergies work |
| defense | 100% | ✓ Core stat complete |
| willpower | 99.7% | ✓ Core stat complete |
| size | 99.2% | ✓ Core stat complete |
| health | 99.8% | ✓ Core stat complete |
| base_size | 100% | ✓ All bases known |
| roles | 100% | ✓ ML-derived roles complete |

### ⚠️ NEEDS ATTENTION (80-98%)
| Field | Coverage | Issue |
|-------|----------|-------|
| speed | 98.6% | 19 cards missing |
| keywords | 95.9% | 55 cards missing keyword arrays |
| abilities | 92.5% | 100 cards have empty abilities |

### 🔴 CRITICAL GAPS (<80%)
| Field | Coverage | Issue |
|-------|----------|-------|
| characteristics | 78.7% | 285 cards missing Master/Minion/etc. |
| cost | 69.0% | 414 cards missing, 154 SHOULD have cost |
| soulstone_cache | 47.3% | Detection failing |

---

## Root Cause Analysis

### 1. COST Extraction Failures

**The Problem:**
The OCR reads card text with doubled letters (e.g., "CCOOSSTT" instead of "COST"). The cost value IS captured in raw_text but parsing fails for ~30% of cards.

**Evidence:**
```
Working:   "88 | RRUUNN RRAAJJPPUU CCOOSSTT" → cost=8 ✓
Failing:   "66 | LL EE | MMEENNTTAALL BBOO | XX EE | CCOOSSTT" → cost=None ✗
```

**Pattern:** When card name is long or OCR line breaks differently, the cost regex fails to match.

**Fix Approach:**
- Option A: Improve regex to handle variable layouts
- Option B: Extract cost from characteristics string (e.g., "Minion(4)" → cost=4)
- Option C: Manual override JSON for problem cards

### 2. Duplicate Entries

**The Problem:**
103 card IDs appear multiple times, creating 105 extra records.

**Impact:**
- Gallery shows duplicates (we filter these now)
- Data inconsistency if duplicates have different values
- Wasted memory/processing

**Fix:** Deduplicate at data pipeline level, not UI level.

### 3. Characteristics Missing

**The Problem:**
285 cards lack the characteristics array (Master, Henchman, Enforcer, Minion, Totem, Peon).

**Impact:**
- Cannot determine card station
- Crew validation breaks (OOK limits, leader detection)
- Synergy detection incomplete

**Evidence:** Cards like "Elemental Boxer" have `characteristics: []` but raw_text shows "Minion(X)" pattern.

### 4. Soulstone Cache Detection

**Current State:** 47.3% detection rate

**The Problem:**
We're looking for a soulstone icon in the card image, but:
- Icon detection is fragile
- Some cards have the cache but we miss it
- No fallback to text parsing

---

## Cards Missing Cost (By Faction)

### Arcanists (23 unique)
- Arcane Fate, Bellaventine Thorpe, Blessed Of, Carlos Vasquez, Cassandra Felton
- Coryphee Duet, December Acolyte, Dorian Crowe, Elemental Boxer, Four Winds Golem
- *...and 13 more*

### Bayou (15 unique)
- ALPHONSE LeBLANC, Bayou Smuggler, Fingers Leong, Habber-Dasher, Hog Whisperer
- Iiss, Lucky Fate, Mah Tucket, Mechanized, Rooster Rider
- *...and 5 more*

### Explorer's Society (20 unique)
- Ancient Construct, Anya Lycarayen, Austera And, Bellhop Porter, Berserker Husk
- *...and 15 more*

### Guild (25 unique)
- Abuela Ortega, Brutal Fate, Charles Hoffman, Director, Domador
- *...and 20 more*

### Neverborn (17 unique)
- Bandersnatch, Black Blood, Carnivorous, Coronator, Corrupted Hound
- *...and 12 more*

### Outcasts (23 unique)
- Abomination, Ashes And Dust, Clockwork Queen, Desolation Engine, Desperate Mercenary
- *...and 18 more*

### Resurrectionists (19 unique)
- Anna Lovelace, Carrion Fate, Corpse Curator, Crossbow, Flesh Construct
- *...and 14 more*

### Ten Thunders (12 unique)
- Calligrapher, Charm Warder, Gwyneth Maddox, Kabuki Warrior, Katanaka
- *...and 7 more*

---

## Synergy System Data Dependencies

### Currently Working ✅
| Dependency | Status | Notes |
|------------|--------|-------|
| Keyword matching | ✓ | primary_keyword 100% populated |
| Role-based synergy | ✓ | roles 100% populated |
| Ability name matching | ✓ | 2,121 abilities with names |
| Ability effect text | ✓ | Effect text present for parsing |

### Partially Working ⚠️
| Dependency | Status | Issue |
|------------|--------|-------|
| Characteristic synergy | Partial | 21% missing characteristics |
| Resource flow detection | Partial | Depends on ability text parsing |

### Not Working ❌
| Dependency | Status | Blocker |
|------------|--------|---------|
| Crew card rule integration | ❌ | Crew cards have empty abilities arrays |

---

## Recommended Fixes (Priority Order)

### Priority 1: Cost Data
1. **Immediate:** Create `cost_overrides.json` with manual corrections
2. **Short-term:** Fix regex to extract from "Minion(X)" pattern in characteristics
3. **Long-term:** Improve OCR parsing pipeline

### Priority 2: Characteristics Data
1. Parse characteristics from raw_text patterns like "Minion(4), Construct, Undead"
2. These are clearly visible in raw_text but not extracted

### Priority 3: Deduplicate
1. Add deduplication step in data pipeline (by ID or front_image)
2. Keep only first occurrence, log duplicates

### Priority 4: Soulstone Cache
1. Parse from raw_text for "STN:" or soulstone patterns
2. Cross-reference with known Masters/Henchmen (they always have cache)

---

## UI Debug Indicators (Suggested)

Add visual "data quality" badges in development mode:

| Badge | Meaning |
|-------|---------|
| `⚠️ NO COST` | Card should have cost but doesn't |
| `⚠️ NO CHAR` | Missing characteristics |
| `❓ SS?` | Soulstone cache uncertain |

This helps identify problem cards during testing.

---

## Next Steps

1. **Decision:** Fix data at source (pipeline) vs. runtime overrides vs. manual JSON?
2. **Quick Win:** Create override JSON for the 154 cards missing cost
3. **Validate:** After fixes, re-run this audit to confirm improvements
