# Malifaux 4E Crew Builder - Project Structure

## Directory Layout

```
malifaux-crew-builder/
├── build.py                      # Unified build pipeline (run this!)
├── .gitignore                    # Ignore intermediate files
├── .gitattributes                # Git LFS for PDFs
│
├── data/
│   ├── raw/                      # SOURCE DATA (tracked in git)
│   │   ├── card_pdfs/            # Wyrd card PDFs
│   │   │   ├── Arcanists/
│   │   │   ├── Bayou/
│   │   │   └── ...
│   │   └── objective_images/     # Scheme/Strategy card images
│   │       ├── M4E_Scheme_*.png
│   │       └── M4E_Strategy_*.png
│   │
│   ├── intermediate/             # BUILD ARTIFACTS (gitignored)
│   │   ├── cards_raw.json
│   │   ├── cards_tagged.json
│   │   ├── objectives_raw.json
│   │   ├── synthetic_crews.json
│   │   ├── model.pkl
│   │   ├── recommendations.json
│   │   └── .build_state.json
│   │
│   └── dist/                     # FINAL OUTPUTS (gitignored, copied to src/)
│       ├── cards.json
│       ├── objectives.json
│       └── recommendations.json
│
├── pipeline/                     # PROCESSING SCRIPTS
│   ├── parse_cards.py            # PDF → cards_raw.json
│   ├── tag_extractor.py          # cards_raw → cards_tagged.json
│   ├── parse_objective_cards.py  # images → objectives_raw.json
│   ├── crew_recommender.py       # training + recommendations
│   ├── taxonomy.json             # tag definitions
│   └── recommender_config.json   # tunable weights
│
└── src/                          # WEB APP
    ├── App.jsx
    ├── index.css
    ├── main.jsx
    └── data/                     # Auto-populated by build.py
        ├── cards.json
        ├── objectives.json
        └── recommendations.json
```

## Setup

### 1. Install Dependencies

```bash
pip install pdfplumber pytesseract pillow numpy scikit-learn
```

For OCR, also install Tesseract:
- **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki
- **Mac**: `brew install tesseract`
- **Linux**: `apt install tesseract-ocr`

### 2. Configure Git LFS for PDFs

```bash
git lfs install
git lfs track "*.pdf"
git add .gitattributes
```

### 3. Add Your Source Data

Copy your card PDFs to `data/raw/card_pdfs/` maintaining the faction structure:
```
data/raw/card_pdfs/
├── Arcanists/
│   ├── December/
│   │   ├── M4E_Stat_December_Rasputina.pdf
│   │   └── ...
│   └── ...
└── ...
```

Copy scheme/strategy images to `data/raw/objective_images/`:
```
data/raw/objective_images/
├── M4E_Scheme_Assassinate_front.png
├── M4E_Strategy_Boundary_Dispute_front.png
└── ...
```

### 4. Run the Build

```bash
python build.py
```

That's it! The pipeline will:
1. Extract cards from PDFs
2. Extract semantic tags (roles, conditions, markers)
3. OCR scheme/strategy cards
4. Train the recommender and pre-compute synergies
5. Bundle everything into `src/data/` for the web app

## Incremental Builds

The pipeline tracks file hashes. On subsequent runs, it only rebuilds what changed:

```bash
python build.py           # Only rebuild changed steps
python build.py --force   # Rebuild everything
python build.py --status  # Show what would be rebuilt
python build.py --clean   # Remove all generated files
```

### What Triggers Rebuilds

| Change | Steps Rebuilt |
|--------|---------------|
| New/changed PDF in `card_pdfs/` | cards → tags → recommender → bundle |
| New/changed image in `objective_images/` | objectives → bundle |
| Changed `taxonomy.json` | tags → recommender → bundle |
| Changed `recommender_config.json` | recommender → bundle |

## GitHub Actions (CI/CD)

Add this workflow to auto-build on push:

```yaml
# .github/workflows/build.yml
name: Build Data Pipeline

on:
  push:
    paths:
      - 'data/raw/**'
      - 'pipeline/**'
      - 'build.py'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install pdfplumber pytesseract pillow numpy scikit-learn
          sudo apt-get install -y tesseract-ocr
      
      - name: Run build pipeline
        run: python build.py
      
      - name: Commit built files
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add src/data/
          git diff --staged --quiet || git commit -m "Auto-build: update data files"
          git push
```

## Output Files

### cards.json
Complete card database with enriched tags:
```json
{
  "cards": [
    {
      "id": "M4E_Stat_December_Rasputina",
      "name": "Rasputina",
      "faction": "Arcanists",
      "roles": ["beater", "tank", "area_denial"],
      "extracted_tags": {
        "conditions_applied": ["staggered"],
        "markers_generated": ["ice_pillar"],
        "combat_tags": ["aura", "bonus_damage"]
      }
      // ... all other fields
    }
  ]
}
```

### objectives.json
Schemes and strategies with requirements analysis:
```json
{
  "schemes": {
    "assassinate": {
      "name": "Assassinate",
      "max_vp": 2,
      "requires_killing": true,
      "favors_roles": ["beater", "assassin"],
      "next_available_schemes": ["Scout the Rooftops", "Detonate Charges"]
    }
  },
  "strategies": {
    "boundary_dispute": {
      "name": "Boundary Dispute",
      "max_vp": 5,
      "uses_strategy_markers": true,
      "favors_roles": ["scheme_runner", "tank"]
    }
  }
}
```

### recommendations.json
Pre-computed synergies and objective fits:
```json
{
  "synergies": {
    "M4E_Stat_December_Rasputina": [
      {"model_id": "M4E_Stat_December_Ice_Golem", "score": 4.5, "reasons": ["shared_keyword:December"]},
      {"model_id": "M4E_Stat_December_Snow_Storm", "score": 4.2, "reasons": ["condition_synergy:staggered"]}
    ]
  },
  "objective_fits": {
    "M4E_Stat_December_Rasputina": {
      "killing": 5,
      "tanking": 4,
      "marker_interaction": 3
    }
  }
}
```

## Troubleshooting

### "parse_cards.py not found"
Make sure you've copied the pipeline scripts to the `pipeline/` directory.

### OCR produces garbled text
- Ensure Tesseract is installed and in PATH
- Check image quality (300 DPI recommended)
- Card images should be front-only, cropped to card edges

### Build always rebuilds everything
Delete `.build_state.json` and run `--clean` to reset state tracking.
