# Malifaux 4E Card Data Quality Audit
## Generated: December 14, 2025

---

## Executive Summary

### BEFORE FIXES
| Metric | Rate | Status |
|--------|------|--------|
| Cost extraction | 69.0% | ❌ Below target |
| Characteristics | 78.7% | ❌ Below target |
| Soulstone Cache | 47.3% | ❌ Inverted logic! |

### AFTER FIXES (pipeline_fixes.py)
| Metric | Rate | Status |
|--------|------|--------|
| Cost extraction | **90.6%** | ✅ TARGET MET |
| Characteristics | **98.3%** | ✅ TARGET MET |
| Soulstone Cache | **~100%** | ✅ Fixed logic |

---

## Root Causes & Fixes

### 1. COST Extraction

**Problem:** Two different OCR layouts weren't both handled.

**Layout A (majority):**
```
Line 0: "88"                    ← COST here
Line 1: "CARD NAME CCOOSSTT"
Line 2: "55 66"                 ← DF SP stats
```

**Layout B (minority):**
```
Line 0: "22"                    ← OCR artifact, NOT cost
Line 1: "CCOOSSTT"
Line 2: "44 77"                 ← COST is first number (44=4)
```

**Fix:** Check if line 1 contains CCOOSSTT. If yes → Layout A, cost on line 0. If no → Layout B, cost after CCOOSSTT.

### 2. CHARACTERISTICS Extraction

**Problem:** Text split across lines with OCR doubling wasn't matched.

**Example:** "Minion" appeared as:
```
'MM UU'
'iinn iioonn'
```
When compressed: `mmuuiinniioonn` ≠ expected `mmiinniioonn`

**Fix:** 
- Compress text (remove spaces/newlines) before matching
- Use flexible regex: `mm.{0,4}iinn.{0,4}iioonn`
- Restrict search to keyword section (after SSZZ, before abilities)

### 3. SOULSTONE Cache

**Problem:** Logic was INVERTED.

**Old (wrong):**
```python
is_peon = any(c in ('Minion', 'Enforcer', 'Totem') for c in characteristics)
soulstone_cache = not is_peon  # WRONG: 632 cards had SS cache
```

**New (correct):**
```python
soulstone_cache = 'Master' in characteristics or 'Henchman' in characteristics
# Only 132-147 cards should have SS cache
```

---

## Integration Instructions

The fixes are in `pipeline_fixes.py`. To integrate into `parse_cards.py`:

### 1. Cost (in `extract_stats_from_page1`):
```python
# Replace the cost extraction block with:
from pipeline_fixes import extract_cost_improved
stats['cost'] = extract_cost_improved(text)
```

### 2. Characteristics (in `extract_keywords`):
```python
# Add as fallback at end of method:
from pipeline_fixes import extract_characteristics_improved
if not characteristics:
    characteristics, minion_limit = extract_characteristics_improved(text)
```

### 3. Soulstone Cache (in `parse_pdf`):
```python
# Replace the soulstone_cache logic with:
from pipeline_fixes import derive_soulstone_cache
soulstone_cache = derive_soulstone_cache(characteristics)
```

---

## Remaining Data Issues

After these fixes, remaining gaps are likely:

| Issue | Estimated Count | Cause |
|-------|-----------------|-------|
| Cost still missing | ~100 cards | Severely garbled OCR |
| Characteristics missing | ~23 cards | No recognizable patterns |
| True duplicates | 105 records | Data pipeline duplication |

**Recommendation:** After hitting 90%+ with pipeline fixes, use manual overrides JSON for the remaining edge cases.

---

## Files

- `pipeline_fixes.py` - New extraction functions
- `DATA_QUALITY_AUDIT.md` - This file
- `App.jsx` - Debug badges added for data quality issues
- `index.css` - Debug badge styling
