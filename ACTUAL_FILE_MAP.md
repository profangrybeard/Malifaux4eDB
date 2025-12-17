# Malifaux 4E DB - ACTUAL File Structure Map

## YOUR CURRENT REPO STRUCTURE

```
Malifaux4e-DB/
├── .git/
├── .github/
├── data/                       ← Root level data (probably old?)
├── dist/
├── node_modules/
│
├── scripts/
│   ├── corrections/            ← Empty
│   ├── src/
│   │   └── data/               ← Empty  
│   └── pipeline/
│       ├── __pycache__/
│       ├── ability_parser.py       ✓ 58,250 bytes
│       ├── corrections.json
│       ├── corrections_roles.json
│       ├── crew_recommender.py
│       ├── enrich_meta.py
│       ├── extract_cards_vision.py
│       ├── faction_meta.json
│       ├── faction_meta.py
│       ├── fix_cards.py
│       ├── normalize_data.py
│       ├── parse_cards.py
│       ├── parse_objective_cards.py
│       ├── recommender_config.json
│       ├── repair_all.py
│       ├── repair_keywords.py
│       ├── role_classifier_v2.py
│       ├── tag_extractor.py
│       └── taxonomy.json
│
├── src/
│   ├── components/
│   │   ├── MetaRecommendations.jsx   ✓ 12,295 bytes
│   │   └── SchemeMetaBadge.jsx       ✓ 5,472 bytes
│   │
│   ├── data/
│   │   ├── cards.json                ✓ 3,973,222 bytes (~3.9 MB)
│   │   ├── faction_meta.json
│   │   ├── normalize_data.py         ← WRONG PLACE (should be in scripts)
│   │   ├── objectives.json           ✓
│   │   └── recommendations.json
│   │
│   ├── hooks/
│   │   ├── useFactionMeta.js         ✓ 14,919 bytes
│   │   └── useFactionMeta.jsx        ✓ 15,704 bytes  ← DUPLICATE!
│   │
│   ├── synergy/
│   │   ├── engine.py                 ✓ 22,211 bytes
│   │   └── schemes.py                ✓ 16,212 bytes
│   │
│   ├── utils/
│   │   └── synergyHelpers.ts         ✓ 11,767 bytes
│   │
│   ├── App.jsx                       ✓ 206,094 bytes
│   ├── DATA_QUALITY_AUDIT.md
│   ├── index.css                     ✓ 126,390 bytes
│   ├── main.jsx                      ✓ 231 bytes
│   └── meta_data.json
│
├── tools/
│   └── build.py
│
├── .gitattributes
├── .gitignore
├── build.py                          ← DUPLICATE of tools/build.py?
├── DATA_QUALITY_AUDIT.md             ← DUPLICATE
├── favicon.ico
├── favicon.png
├── index.css                         ← DUPLICATE of src/index.css
├── index.html
├── package.json
├── package-lock.json
├── PHASE2_SYNERGY_DETECTION.md
├── README.md
└── requirements.txt
```

---

## PROBLEMS I SEE

### 1. Duplicate useFactionMeta files
```
src/hooks/useFactionMeta.js    ← 14,919 bytes
src/hooks/useFactionMeta.jsx   ← 15,704 bytes
```
**Fix:** Delete one. Keep `.jsx` since that's what SchemeMetaBadge imports.

### 2. Python files in wrong places
```
src/data/normalize_data.py     ← Should be in scripts/pipeline/
src/synergy/engine.py          ← Python in React src folder
src/synergy/schemes.py         ← Python in React src folder
```
**Fix:** Move Python files to `scripts/pipeline/`

### 3. Duplicate files at root
```
./build.py                     ← Same as tools/build.py?
./index.css                    ← Same as src/index.css?
./DATA_QUALITY_AUDIT.md        ← Same as src/DATA_QUALITY_AUDIT.md?
```
**Fix:** Delete root duplicates, keep the ones in proper folders

### 4. synergyHelpers.ts in utils
This is fine IF your app imports it. Check if App.jsx uses it.

---

## WHAT App.jsx EXPECTS

Based on your uploads, App.jsx imports:
```javascript
import cardData from './data/cards.json'           ✓ EXISTS at src/data/cards.json
import objectivesData from './data/objectives.json' ✓ EXISTS at src/data/objectives.json
```

App.jsx has FACTION_META embedded inline - doesn't import it.

---

## WHAT SchemeMetaBadge.jsx EXPECTS

```javascript
import { useFactionMeta } from './useFactionMeta';
```

This path is RELATIVE to SchemeMetaBadge's location (`src/components/`).
So it looks for: `src/components/useFactionMeta.jsx` ← DOESN'T EXIST!

**The hook is at:** `src/hooks/useFactionMeta.jsx`

**Fix Option A:** Change SchemeMetaBadge import to:
```javascript
import { useFactionMeta } from '../hooks/useFactionMeta';
```

**Fix Option B:** Copy useFactionMeta.jsx to src/components/

---

## RECOMMENDED CLEANUP

### Delete these duplicates:
- `./build.py` (keep `tools/build.py`)
- `./index.css` (keep `src/index.css`)  
- `./DATA_QUALITY_AUDIT.md` (keep `src/DATA_QUALITY_AUDIT.md`)
- `src/hooks/useFactionMeta.js` (keep `.jsx` version)

### Move Python out of src/:
```bash
mv src/synergy/engine.py scripts/pipeline/synergy_engine.py
mv src/synergy/schemes.py scripts/pipeline/schemes.py
mv src/data/normalize_data.py scripts/pipeline/
rmdir src/synergy
```

### Fix SchemeMetaBadge import:
Change line 2 of `src/components/SchemeMetaBadge.jsx`:
```javascript
// FROM:
import { useFactionMeta } from './useFactionMeta';
// TO:
import { useFactionMeta } from '../hooks/useFactionMeta';
```

---

## CLEAN STRUCTURE (TARGET STATE)

```
Malifaux4e-DB/
├── scripts/
│   └── pipeline/
│       ├── ability_parser.py
│       ├── synergy_engine.py      ← moved from src/synergy/
│       ├── schemes.py             ← moved from src/synergy/
│       ├── role_classifier_v2.py
│       ├── normalize_data.py
│       └── ... (other pipeline scripts)
│
├── src/
│   ├── components/
│   │   ├── MetaRecommendations.jsx
│   │   └── SchemeMetaBadge.jsx    ← FIX IMPORT PATH
│   ├── data/
│   │   ├── cards.json
│   │   └── objectives.json
│   ├── hooks/
│   │   └── useFactionMeta.jsx     ← KEEP THIS ONE
│   ├── utils/
│   │   └── synergyHelpers.ts      ← Optional, only if used
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── tools/
│   └── build.py
│
├── index.html
├── package.json
└── package-lock.json
```
