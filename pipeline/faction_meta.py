#!/usr/bin/env python3
"""
Malifaux 4E Faction Meta Database
Extracted from Longshanks Faction Analyzer (December 2024)

Contains:
- Faction overall statistics
- Strategy performance by faction
- Scheme affinity (chosen and against)
- Deployment preferences
- Faction matchups

Usage:
    from faction_meta import FACTION_DATA, get_faction_scheme_affinity, get_best_strategy_factions
"""

from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

# ═══════════════════════════════════════════════════════════════════════════════
# FACTION DATA - Extracted from Longshanks Faction Analyzer PDFs
# ═══════════════════════════════════════════════════════════════════════════════

FACTION_DATA = {
    # ───────────────────────────────────────────────────────────────────────────
    # NEVERBORN - 52% win rate, 2554 games
    # ───────────────────────────────────────────────────────────────────────────
    "Neverborn": {
        "overall": {"win_rate": 0.52, "games": 2554},
        "deployments": {
            "corner": {"win_rate": 0.49, "games": 474},
            "flank": {"win_rate": 0.46, "games": 534},
            "wedge": {"win_rate": 0.47, "games": 535},
            "standard": {"win_rate": 0.47, "games": 615},
        },
        "strategies_m4e": {
            "boundary_dispute": {"win_rate": 0.43, "games": 260},
            "collapsing_mines": {"win_rate": 0.61, "games": 18},
            "informants": {"win_rate": 0.53, "games": 264},
            "plant_explosives": {"win_rate": 0.43, "games": 223},
            "recover_evidence": {"win_rate": 0.45, "games": 238},
        },
        "schemes_chosen": {
            "assassinate": {"win_rate": 0.51, "games": 271},
            "breakthrough": {"win_rate": 0.55, "games": 163},
            "detonate_charges": {"win_rate": 0.57, "games": 231},
            "ensnare": {"win_rate": 0.46, "games": 191},
            "frame_job": {"win_rate": 0.49, "games": 173},
            "grave_robbing": {"win_rate": 0.45, "games": 38},
            "harness_the_ley_line": {"win_rate": 0.49, "games": 169},
            "leave_your_mark": {"win_rate": 0.47, "games": 184},
            "light_the_beacons": {"win_rate": 0.66, "games": 24},
            "make_it_look_like_an_accident": {"win_rate": 0.56, "games": 154},
            "public_demonstration": {"win_rate": 0.53, "games": 80},
            "reshape_the_land": {"win_rate": 0.56, "games": 137},
            "runic_binding": {"win_rate": 0.55, "games": 193},
            "scout_the_rooftops": {"win_rate": 0.51, "games": 217},
            "search_the_area": {"win_rate": 0.58, "games": 197},
            "take_the_highground": {"win_rate": 0.58, "games": 241},
        },
        "schemes_against": {
            "assassinate": {"win_rate": 0.43, "games": 248},
            "breakthrough": {"win_rate": 0.46, "games": 198},
            "detonate_charges": {"win_rate": 0.43, "games": 229},
            "ensnare": {"win_rate": 0.51, "games": 198},
            "frame_job": {"win_rate": 0.57, "games": 197},
            "grave_robbing": {"win_rate": 0.55, "games": 53},
            "harness_the_ley_line": {"win_rate": 0.45, "games": 155},
            "leave_your_mark": {"win_rate": 0.47, "games": 184},
            "light_the_beacons": {"win_rate": 0.63, "games": 19},
            "make_it_look_like_an_accident": {"win_rate": 0.51, "games": 133},
            "public_demonstration": {"win_rate": 0.51, "games": 63},
            "reshape_the_land": {"win_rate": 0.50, "games": 141},
            "runic_binding": {"win_rate": 0.52, "games": 184},
            "scout_the_rooftops": {"win_rate": 0.52, "games": 203},
            "search_the_area": {"win_rate": 0.48, "games": 122},
            "take_the_highground": {"win_rate": 0.47, "games": 226},
        },
    },

    # ───────────────────────────────────────────────────────────────────────────
    # EXPLORERS SOCIETY - 51% win rate, 1902 games
    # ───────────────────────────────────────────────────────────────────────────
    "Explorers": {
        "overall": {"win_rate": 0.51, "games": 1902},
        "deployments": {
            "corner": {"win_rate": 0.41, "games": 360},
            "flank": {"win_rate": 0.47, "games": 409},
            "wedge": {"win_rate": 0.43, "games": 401},
            "standard": {"win_rate": 0.47, "games": 465},
        },
        "strategies_m4e": {
            "boundary_dispute": {"win_rate": 0.46, "games": 204},
            "collapsing_mines": {"win_rate": 0.31, "games": 13},
            "informants": {"win_rate": 0.43, "games": 209},
            "plant_explosives": {"win_rate": 0.51, "games": 172},
            "recover_evidence": {"win_rate": 0.47, "games": 206},
        },
        "schemes_chosen": {
            "assassinate": {"win_rate": 0.62, "games": 196},
            "breakthrough": {"win_rate": 0.59, "games": 181},
            "detonate_charges": {"win_rate": 0.55, "games": 174},
            "ensnare": {"win_rate": 0.53, "games": 173},
            "frame_job": {"win_rate": 0.41, "games": 151},
            "grave_robbing": {"win_rate": 0.64, "games": 39},
            "harness_the_ley_line": {"win_rate": 0.52, "games": 127},
            "leave_your_mark": {"win_rate": 0.58, "games": 139},
            "light_the_beacons": {"win_rate": 0.67, "games": 15},
            "make_it_look_like_an_accident": {"win_rate": 0.67, "games": 105},
            "public_demonstration": {"win_rate": 0.55, "games": 46},
            "reshape_the_land": {"win_rate": 0.51, "games": 136},
            "runic_binding": {"win_rate": 0.50, "games": 145},
            "scout_the_rooftops": {"win_rate": 0.51, "games": 179},
            "search_the_area": {"win_rate": 0.56, "games": 146},
            "take_the_highground": {"win_rate": 0.62, "games": 181},
        },
        "schemes_against": {
            "assassinate": {"win_rate": 0.49, "games": 214},
            "breakthrough": {"win_rate": 0.50, "games": 136},
            "detonate_charges": {"win_rate": 0.50, "games": 174},
            "ensnare": {"win_rate": 0.46, "games": 150},
            "frame_job": {"win_rate": 0.55, "games": 148},
            "grave_robbing": {"win_rate": 0.52, "games": 32},
            "harness_the_ley_line": {"win_rate": 0.49, "games": 138},
            "leave_your_mark": {"win_rate": 0.51, "games": 160},
            "light_the_beacons": {"win_rate": 0.17, "games": 10},
            "make_it_look_like_an_accident": {"win_rate": 0.51, "games": 116},
            "public_demonstration": {"win_rate": 0.39, "games": 56},
            "reshape_the_land": {"win_rate": 0.55, "games": 103},
            "runic_binding": {"win_rate": 0.51, "games": 131},
            "scout_the_rooftops": {"win_rate": 0.53, "games": 177},
            "search_the_area": {"win_rate": 0.45, "games": 112},
            "take_the_highground": {"win_rate": 0.48, "games": 173},
        },
    },

    # ───────────────────────────────────────────────────────────────────────────
    # TEN THUNDERS - 51% win rate, 1934 games
    # ───────────────────────────────────────────────────────────────────────────
    "Ten Thunders": {
        "overall": {"win_rate": 0.51, "games": 1934},
        "deployments": {
            "corner": {"win_rate": 0.46, "games": 371},
            "flank": {"win_rate": 0.41, "games": 400},
            "wedge": {"win_rate": 0.46, "games": 380},
            "standard": {"win_rate": 0.44, "games": 442},
        },
        "strategies_m4e": {
            "boundary_dispute": {"win_rate": 0.48, "games": 185},
            "collapsing_mines": {"win_rate": 0.27, "games": 15},
            "informants": {"win_rate": 0.35, "games": 163},
            "plant_explosives": {"win_rate": 0.43, "games": 159},
            "recover_evidence": {"win_rate": 0.44, "games": 170},
        },
        "schemes_chosen": {
            "assassinate": {"win_rate": 0.47, "games": 182},
            "breakthrough": {"win_rate": 0.52, "games": 164},
            "detonate_charges": {"win_rate": 0.51, "games": 135},
            "ensnare": {"win_rate": 0.45, "games": 90},
            "frame_job": {"win_rate": 0.41, "games": 128},
            "grave_robbing": {"win_rate": 0.42, "games": 36},
            "harness_the_ley_line": {"win_rate": 0.44, "games": 102},
            "leave_your_mark": {"win_rate": 0.51, "games": 153},
            "light_the_beacons": {"win_rate": 0.25, "games": 10},
            "make_it_look_like_an_accident": {"win_rate": 0.52, "games": 119},
            "public_demonstration": {"win_rate": 0.64, "games": 35},
            "reshape_the_land": {"win_rate": 0.55, "games": 131},
            "runic_binding": {"win_rate": 0.47, "games": 110},
            "scout_the_rooftops": {"win_rate": 0.48, "games": 167},
            "search_the_area": {"win_rate": 0.61, "games": 90},
            "take_the_highground": {"win_rate": 0.53, "games": 160},
        },
        "schemes_against": {
            "assassinate": {"win_rate": 0.43, "games": 160},
            "breakthrough": {"win_rate": 0.39, "games": 138},
            "detonate_charges": {"win_rate": 0.33, "games": 160},
            "ensnare": {"win_rate": 0.50, "games": 127},
            "frame_job": {"win_rate": 0.50, "games": 126},
            "grave_robbing": {"win_rate": 0.49, "games": 48},
            "harness_the_ley_line": {"win_rate": 0.45, "games": 122},
            "leave_your_mark": {"win_rate": 0.45, "games": 136},
            "light_the_beacons": {"win_rate": 0.35, "games": 13},
            "make_it_look_like_an_accident": {"win_rate": 0.42, "games": 116},
            "public_demonstration": {"win_rate": 0.50, "games": 45},
            "reshape_the_land": {"win_rate": 0.38, "games": 102},
            "runic_binding": {"win_rate": 0.45, "games": 119},
            "scout_the_rooftops": {"win_rate": 0.47, "games": 168},
            "search_the_area": {"win_rate": 0.42, "games": 97},
            "take_the_highground": {"win_rate": 0.42, "games": 181},
        },
    },

    # ───────────────────────────────────────────────────────────────────────────
    # BAYOU - 51% win rate, 1776 games
    # ───────────────────────────────────────────────────────────────────────────
    "Bayou": {
        "overall": {"win_rate": 0.51, "games": 1776},
        "deployments": {
            "corner": {"win_rate": 0.47, "games": 316},
            "flank": {"win_rate": 0.42, "games": 357},
            "wedge": {"win_rate": 0.43, "games": 379},
            "standard": {"win_rate": 0.43, "games": 419},
        },
        "strategies_m4e": {
            "boundary_dispute": {"win_rate": 0.47, "games": 148},
            "collapsing_mines": {"win_rate": 0.00, "games": 4},  # Very limited data
            "informants": {"win_rate": 0.41, "games": 145},
            "plant_explosives": {"win_rate": 0.46, "games": 136},
            "recover_evidence": {"win_rate": 0.37, "games": 141},
        },
        "schemes_chosen": {
            "assassinate": {"win_rate": 0.54, "games": 138},
            "breakthrough": {"win_rate": 0.53, "games": 106},
            "detonate_charges": {"win_rate": 0.62, "games": 129},
            "ensnare": {"win_rate": 0.48, "games": 107},
            "frame_job": {"win_rate": 0.52, "games": 115},
            "grave_robbing": {"win_rate": 0.45, "games": 20},
            "harness_the_ley_line": {"win_rate": 0.62, "games": 123},
            "leave_your_mark": {"win_rate": 0.48, "games": 126},
            "light_the_beacons": {"win_rate": 0.64, "games": 11},
            "make_it_look_like_an_accident": {"win_rate": 0.43, "games": 77},
            "public_demonstration": {"win_rate": 0.58, "games": 19},
            "reshape_the_land": {"win_rate": 0.52, "games": 61},
            "runic_binding": {"win_rate": 0.46, "games": 116},
            "scout_the_rooftops": {"win_rate": 0.52, "games": 112},
            "search_the_area": {"win_rate": 0.51, "games": 72},
            "take_the_highground": {"win_rate": 0.55, "games": 121},
        },
        "schemes_against": {
            "assassinate": {"win_rate": 0.50, "games": 172},
            "breakthrough": {"win_rate": 0.46, "games": 121},
            "detonate_charges": {"win_rate": 0.50, "games": 125},
            "ensnare": {"win_rate": 0.52, "games": 80},
            "frame_job": {"win_rate": 0.54, "games": 109},
            "grave_robbing": {"win_rate": 0.58, "games": 26},
            "harness_the_ley_line": {"win_rate": 0.47, "games": 104},
            "leave_your_mark": {"win_rate": 0.35, "games": 92},
            "light_the_beacons": {"win_rate": 0.46, "games": 12},
            "make_it_look_like_an_accident": {"win_rate": 0.45, "games": 75},
            "public_demonstration": {"win_rate": 0.49, "games": 34},
            "reshape_the_land": {"win_rate": 0.50, "games": 66},
            "runic_binding": {"win_rate": 0.46, "games": 98},
            "scout_the_rooftops": {"win_rate": 0.45, "games": 117},
            "search_the_area": {"win_rate": 0.44, "games": 78},
            "take_the_highground": {"win_rate": 0.48, "games": 150},
        },
    },

    # ───────────────────────────────────────────────────────────────────────────
    # ARCANISTS - 50% win rate, 1694 games
    # ───────────────────────────────────────────────────────────────────────────
    "Arcanists": {
        "overall": {"win_rate": 0.50, "games": 1694},
        "deployments": {
            "corner": {"win_rate": 0.43, "games": 315},
            "flank": {"win_rate": 0.47, "games": 342},
            "wedge": {"win_rate": 0.41, "games": 370},
            "standard": {"win_rate": 0.43, "games": 385},
        },
        "strategies_m4e": {
            "boundary_dispute": {"win_rate": 0.41, "games": 177},
            "collapsing_mines": {"win_rate": 0.40, "games": 10},
            "informants": {"win_rate": 0.44, "games": 164},
            "plant_explosives": {"win_rate": 0.46, "games": 158},
            "recover_evidence": {"win_rate": 0.42, "games": 156},
        },
        "schemes_chosen": {
            "assassinate": {"win_rate": 0.56, "games": 156},
            "breakthrough": {"win_rate": 0.63, "games": 119},
            "detonate_charges": {"win_rate": 0.60, "games": 154},
            "ensnare": {"win_rate": 0.55, "games": 122},
            "frame_job": {"win_rate": 0.54, "games": 100},
            "grave_robbing": {"win_rate": 0.56, "games": 43},
            "harness_the_ley_line": {"win_rate": 0.46, "games": 98},
            "leave_your_mark": {"win_rate": 0.64, "games": 116},
            "light_the_beacons": {"win_rate": 0.54, "games": 15},
            "make_it_look_like_an_accident": {"win_rate": 0.49, "games": 84},
            "public_demonstration": {"win_rate": 0.61, "games": 44},
            "reshape_the_land": {"win_rate": 0.50, "games": 92},
            "runic_binding": {"win_rate": 0.48, "games": 121},
            "scout_the_rooftops": {"win_rate": 0.51, "games": 120},
            "search_the_area": {"win_rate": 0.58, "games": 60},
            "take_the_highground": {"win_rate": 0.55, "games": 124},
        },
        "schemes_against": {
            "assassinate": {"win_rate": 0.45, "games": 177},
            "breakthrough": {"win_rate": 0.45, "games": 106},
            "detonate_charges": {"win_rate": 0.50, "games": 130},
            "ensnare": {"win_rate": 0.53, "games": 126},
            "frame_job": {"win_rate": 0.61, "games": 110},
            "grave_robbing": {"win_rate": 0.46, "games": 24},
            "harness_the_ley_line": {"win_rate": 0.50, "games": 104},
            "leave_your_mark": {"win_rate": 0.39, "games": 131},
            "light_the_beacons": {"win_rate": 0.63, "games": 8},
            "make_it_look_like_an_accident": {"win_rate": 0.56, "games": 68},
            "public_demonstration": {"win_rate": 0.46, "games": 45},
            "reshape_the_land": {"win_rate": 0.47, "games": 92},
            "runic_binding": {"win_rate": 0.51, "games": 96},
            "scout_the_rooftops": {"win_rate": 0.46, "games": 133},
            "search_the_area": {"win_rate": 0.46, "games": 81},
            "take_the_highground": {"win_rate": 0.46, "games": 144},
        },
    },

    # ───────────────────────────────────────────────────────────────────────────
    # GUILD - 50% win rate, 1919 games
    # ───────────────────────────────────────────────────────────────────────────
    "Guild": {
        "overall": {"win_rate": 0.50, "games": 1919},
        "deployments": {
            "corner": {"win_rate": 0.42, "games": 355},
            "flank": {"win_rate": 0.44, "games": 405},
            "wedge": {"win_rate": 0.42, "games": 468},
            "standard": {"win_rate": 0.40, "games": 456},
        },
        "strategies_m4e": {
            "boundary_dispute": {"win_rate": 0.45, "games": 210},
            "collapsing_mines": {"win_rate": 0.50, "games": 10},
            "informants": {"win_rate": 0.31, "games": 200},
            "plant_explosives": {"win_rate": 0.51, "games": 168},
            "recover_evidence": {"win_rate": 0.47, "games": 205},
        },
        "schemes_chosen": {
            "assassinate": {"win_rate": 0.50, "games": 207},
            "breakthrough": {"win_rate": 0.52, "games": 143},
            "detonate_charges": {"win_rate": 0.50, "games": 158},
            "ensnare": {"win_rate": 0.57, "games": 161},
            "frame_job": {"win_rate": 0.44, "games": 140},
            "grave_robbing": {"win_rate": 0.41, "games": 58},
            "harness_the_ley_line": {"win_rate": 0.52, "games": 124},
            "leave_your_mark": {"win_rate": 0.58, "games": 163},
            "light_the_beacons": {"win_rate": 0.75, "games": 16},
            "make_it_look_like_an_accident": {"win_rate": 0.55, "games": 124},
            "public_demonstration": {"win_rate": 0.60, "games": 46},
            "reshape_the_land": {"win_rate": 0.51, "games": 92},
            "runic_binding": {"win_rate": 0.54, "games": 134},
            "scout_the_rooftops": {"win_rate": 0.52, "games": 175},
            "search_the_area": {"win_rate": 0.55, "games": 111},
            "take_the_highground": {"win_rate": 0.56, "games": 188},
        },
        "schemes_against": {
            "assassinate": {"win_rate": 0.52, "games": 178},
            "breakthrough": {"win_rate": 0.41, "games": 154},
            "detonate_charges": {"win_rate": 0.47, "games": 173},
            "ensnare": {"win_rate": 0.50, "games": 132},
            "frame_job": {"win_rate": 0.56, "games": 146},
            "grave_robbing": {"win_rate": 0.57, "games": 44},
            "harness_the_ley_line": {"win_rate": 0.53, "games": 130},
            "leave_your_mark": {"win_rate": 0.47, "games": 168},
            "light_the_beacons": {"win_rate": 0.42, "games": 24},
            "make_it_look_like_an_accident": {"win_rate": 0.53, "games": 109},
            "public_demonstration": {"win_rate": 0.50, "games": 36},
            "reshape_the_land": {"win_rate": 0.46, "games": 105},
            "runic_binding": {"win_rate": 0.46, "games": 130},
            "scout_the_rooftops": {"win_rate": 0.50, "games": 192},
            "search_the_area": {"win_rate": 0.42, "games": 111},
            "take_the_highground": {"win_rate": 0.44, "games": 180},
        },
    },

    # ───────────────────────────────────────────────────────────────────────────
    # OUTCASTS - 48% win rate, 2193 games
    # ───────────────────────────────────────────────────────────────────────────
    "Outcasts": {
        "overall": {"win_rate": 0.48, "games": 2193},
        "deployments": {
            "corner": {"win_rate": 0.39, "games": 393},
            "flank": {"win_rate": 0.43, "games": 503},
            "wedge": {"win_rate": 0.42, "games": 458},
            "standard": {"win_rate": 0.44, "games": 507},
        },
        "strategies_m4e": {
            "boundary_dispute": {"win_rate": 0.46, "games": 229},
            "collapsing_mines": {"win_rate": 0.44, "games": 16},
            "informants": {"win_rate": 0.40, "games": 206},
            "plant_explosives": {"win_rate": 0.37, "games": 201},
            "recover_evidence": {"win_rate": 0.43, "games": 208},
        },
        "schemes_chosen": {
            "assassinate": {"win_rate": 0.54, "games": 240},
            "breakthrough": {"win_rate": 0.57, "games": 147},
            "detonate_charges": {"win_rate": 0.55, "games": 170},
            "ensnare": {"win_rate": 0.47, "games": 136},
            "frame_job": {"win_rate": 0.40, "games": 159},
            "grave_robbing": {"win_rate": 0.52, "games": 50},
            "harness_the_ley_line": {"win_rate": 0.57, "games": 136},
            "leave_your_mark": {"win_rate": 0.56, "games": 147},
            "light_the_beacons": {"win_rate": 0.41, "games": 15},
            "make_it_look_like_an_accident": {"win_rate": 0.51, "games": 96},
            "public_demonstration": {"win_rate": 0.41, "games": 50},
            "reshape_the_land": {"win_rate": 0.56, "games": 89},
            "runic_binding": {"win_rate": 0.51, "games": 157},
            "scout_the_rooftops": {"win_rate": 0.55, "games": 172},
            "search_the_area": {"win_rate": 0.64, "games": 103},
            "take_the_highground": {"win_rate": 0.50, "games": 194},
        },
        "schemes_against": {
            "assassinate": {"win_rate": 0.47, "games": 215},
            "breakthrough": {"win_rate": 0.43, "games": 155},
            "detonate_charges": {"win_rate": 0.46, "games": 169},
            "ensnare": {"win_rate": 0.47, "games": 156},
            "frame_job": {"win_rate": 0.56, "games": 143},
            "grave_robbing": {"win_rate": 0.55, "games": 55},
            "harness_the_ley_line": {"win_rate": 0.51, "games": 137},
            "leave_your_mark": {"win_rate": 0.43, "games": 177},
            "light_the_beacons": {"win_rate": 0.27, "games": 22},
            "make_it_look_like_an_accident": {"win_rate": 0.42, "games": 130},
            "public_demonstration": {"win_rate": 0.38, "games": 47},
            "reshape_the_land": {"win_rate": 0.40, "games": 125},
            "runic_binding": {"win_rate": 0.49, "games": 147},
            "scout_the_rooftops": {"win_rate": 0.50, "games": 174},
            "search_the_area": {"win_rate": 0.48, "games": 89},
            "take_the_highground": {"win_rate": 0.42, "games": 196},
        },
    },

    # ───────────────────────────────────────────────────────────────────────────
    # RESURRECTIONISTS - 47% win rate, 1921 games
    # ───────────────────────────────────────────────────────────────────────────
    "Resurrectionists": {
        "overall": {"win_rate": 0.47, "games": 1921},
        "deployments": {
            "corner": {"win_rate": 0.41, "games": 371},
            "flank": {"win_rate": 0.40, "games": 410},
            "wedge": {"win_rate": 0.41, "games": 401},
            "standard": {"win_rate": 0.41, "games": 444},
        },
        "strategies_m4e": {
            "boundary_dispute": {"win_rate": 0.31, "games": 184},
            "collapsing_mines": {"win_rate": 0.30, "games": 14},
            "informants": {"win_rate": 0.42, "games": 178},
            "plant_explosives": {"win_rate": 0.42, "games": 161},
            "recover_evidence": {"win_rate": 0.43, "games": 190},
        },
        "schemes_chosen": {
            "assassinate": {"win_rate": 0.51, "games": 196},
            "breakthrough": {"win_rate": 0.57, "games": 128},
            "detonate_charges": {"win_rate": 0.45, "games": 149},
            "ensnare": {"win_rate": 0.47, "games": 157},
            "frame_job": {"win_rate": 0.44, "games": 127},
            "grave_robbing": {"win_rate": 0.43, "games": 47},
            "harness_the_ley_line": {"win_rate": 0.46, "games": 131},
            "leave_your_mark": {"win_rate": 0.53, "games": 148},
            "light_the_beacons": {"win_rate": 0.41, "games": 18},
            "make_it_look_like_an_accident": {"win_rate": 0.49, "games": 78},
            "public_demonstration": {"win_rate": 0.46, "games": 48},
            "reshape_the_land": {"win_rate": 0.46, "games": 97},
            "runic_binding": {"win_rate": 0.46, "games": 77},
            "scout_the_rooftops": {"win_rate": 0.46, "games": 165},
            "search_the_area": {"win_rate": 0.50, "games": 105},
            "take_the_highground": {"win_rate": 0.52, "games": 168},
        },
        "schemes_against": {
            "assassinate": {"win_rate": 0.43, "games": 184},
            "breakthrough": {"win_rate": 0.43, "games": 145},
            "detonate_charges": {"win_rate": 0.35, "games": 149},
            "ensnare": {"win_rate": 0.42, "games": 126},
            "frame_job": {"win_rate": 0.46, "games": 124},
            "grave_robbing": {"win_rate": 0.42, "games": 49},
            "harness_the_ley_line": {"win_rate": 0.46, "games": 121},
            "leave_your_mark": {"win_rate": 0.38, "games": 152},
            "light_the_beacons": {"win_rate": 0.29, "games": 14},
            "make_it_look_like_an_accident": {"win_rate": 0.45, "games": 83},
            "public_demonstration": {"win_rate": 0.44, "games": 41},
            "reshape_the_land": {"win_rate": 0.40, "games": 101},
            "runic_binding": {"win_rate": 0.34, "games": 132},
            "scout_the_rooftops": {"win_rate": 0.45, "games": 148},
            "search_the_area": {"win_rate": 0.39, "games": 103},
            "take_the_highground": {"win_rate": 0.38, "games": 138},
        },
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYSIS FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_faction_scheme_affinity(faction: str, min_games: int = 50) -> Dict[str, Dict]:
    """
    Get scheme affinity for a faction.
    Returns schemes sorted by win rate delta from faction average.
    """
    if faction not in FACTION_DATA:
        return {}
    
    data = FACTION_DATA[faction]
    faction_avg = data["overall"]["win_rate"]
    schemes = data.get("schemes_chosen", {})
    
    affinity = {}
    for scheme, stats in schemes.items():
        if stats["games"] >= min_games:
            delta = stats["win_rate"] - faction_avg
            affinity[scheme] = {
                "win_rate": stats["win_rate"],
                "games": stats["games"],
                "delta": delta,
                "rating": "strong" if delta > 0.03 else "weak" if delta < -0.03 else "neutral"
            }
    
    return dict(sorted(affinity.items(), key=lambda x: -x[1]["delta"]))


def get_faction_strategy_affinity(faction: str) -> Dict[str, Dict]:
    """Get strategy affinity for a faction."""
    if faction not in FACTION_DATA:
        return {}
    
    data = FACTION_DATA[faction]
    faction_avg = data["overall"]["win_rate"]
    strategies = data.get("strategies_m4e", {})
    
    affinity = {}
    for strat, stats in strategies.items():
        if stats["games"] >= 10:  # Lower threshold for strategies
            delta = stats["win_rate"] - faction_avg
            affinity[strat] = {
                "win_rate": stats["win_rate"],
                "games": stats["games"],
                "delta": delta,
                "rating": "strong" if delta > 0.03 else "weak" if delta < -0.05 else "neutral"
            }
    
    return dict(sorted(affinity.items(), key=lambda x: -x[1]["delta"]))


def get_best_factions_for_strategy(strategy: str, min_games: int = 50) -> List[Tuple[str, float, int]]:
    """Get factions ranked by performance in a specific strategy."""
    results = []
    for faction, data in FACTION_DATA.items():
        strats = data.get("strategies_m4e", {})
        if strategy in strats and strats[strategy]["games"] >= min_games:
            results.append((faction, strats[strategy]["win_rate"], strats[strategy]["games"]))
    
    return sorted(results, key=lambda x: -x[1])


def get_best_factions_for_scheme(scheme: str, min_games: int = 50) -> List[Tuple[str, float, int]]:
    """Get factions ranked by performance choosing a specific scheme."""
    results = []
    for faction, data in FACTION_DATA.items():
        schemes = data.get("schemes_chosen", {})
        if scheme in schemes and schemes[scheme]["games"] >= min_games:
            results.append((faction, schemes[scheme]["win_rate"], schemes[scheme]["games"]))
    
    return sorted(results, key=lambda x: -x[1])


def get_scheme_difficulty_by_faction(scheme: str) -> Dict[str, Dict]:
    """Compare scheme performance across all factions."""
    result = {}
    for faction, data in FACTION_DATA.items():
        chosen = data.get("schemes_chosen", {}).get(scheme, {})
        against = data.get("schemes_against", {}).get(scheme, {})
        if chosen:
            result[faction] = {
                "score_rate": chosen.get("win_rate"),
                "score_games": chosen.get("games"),
                "deny_rate": against.get("win_rate") if against else None,
                "deny_games": against.get("games") if against else None,
            }
    return result


def print_faction_summary(faction: str):
    """Print a summary of faction performance."""
    if faction not in FACTION_DATA:
        print(f"Unknown faction: {faction}")
        return
    
    data = FACTION_DATA[faction]
    print(f"\n{'='*60}")
    print(f"{faction.upper()} SUMMARY")
    print(f"{'='*60}")
    print(f"Overall: {data['overall']['win_rate']:.0%} win rate ({data['overall']['games']} games)")
    
    print(f"\n### BEST DEPLOYMENTS ###")
    for deploy, stats in sorted(data["deployments"].items(), key=lambda x: -x[1]["win_rate"]):
        delta = stats["win_rate"] - data["overall"]["win_rate"]
        print(f"  {deploy:12s}: {stats['win_rate']:.0%} ({stats['games']} games) [{delta:+.0%}]")
    
    print(f"\n### M4E STRATEGY PERFORMANCE ###")
    for strat, stats in sorted(data["strategies_m4e"].items(), key=lambda x: -x[1]["win_rate"]):
        if stats["games"] >= 10:
            delta = stats["win_rate"] - data["overall"]["win_rate"]
            print(f"  {strat:20s}: {stats['win_rate']:.0%} ({stats['games']} games) [{delta:+.0%}]")
    
    print(f"\n### TOP 5 SCHEMES TO CHOOSE ###")
    schemes = get_faction_scheme_affinity(faction)
    for i, (scheme, info) in enumerate(list(schemes.items())[:5]):
        print(f"  {scheme:35s}: {info['win_rate']:.0%} [{info['delta']:+.0%}]")
    
    print(f"\n### BOTTOM 5 SCHEMES TO AVOID ###")
    for scheme, info in list(schemes.items())[-5:]:
        print(f"  {scheme:35s}: {info['win_rate']:.0%} [{info['delta']:+.0%}]")


def print_strategy_comparison(strategy: str):
    """Print faction comparison for a specific strategy."""
    print(f"\n{'='*60}")
    print(f"STRATEGY: {strategy.upper().replace('_', ' ')}")
    print(f"{'='*60}")
    
    rankings = get_best_factions_for_strategy(strategy)
    for faction, win_rate, games in rankings:
        faction_avg = FACTION_DATA[faction]["overall"]["win_rate"]
        delta = win_rate - faction_avg
        print(f"  {faction:20s}: {win_rate:.0%} ({games} games) [{delta:+.0%} vs faction avg]")


def print_scheme_comparison(scheme: str):
    """Print faction comparison for a specific scheme."""
    print(f"\n{'='*60}")
    print(f"SCHEME: {scheme.upper().replace('_', ' ')}")
    print(f"{'='*60}")
    
    rankings = get_best_factions_for_scheme(scheme)
    for faction, win_rate, games in rankings:
        faction_avg = FACTION_DATA[faction]["overall"]["win_rate"]
        delta = win_rate - faction_avg
        print(f"  {faction:20s}: {win_rate:.0%} ({games} games) [{delta:+.0%} vs faction avg]")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN - Demo/Test
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Demo: Print summaries
    print("\n" + "="*60)
    print("MALIFAUX 4E FACTION META DATABASE")
    print("="*60)
    print(f"Total factions: {len(FACTION_DATA)}")
    print(f"Total games analyzed: {sum(f['overall']['games'] for f in FACTION_DATA.values())}")
    
    # Overall faction rankings
    print("\n### FACTION RANKINGS (by win rate) ###")
    rankings = sorted(FACTION_DATA.items(), key=lambda x: -x[1]["overall"]["win_rate"])
    for faction, data in rankings:
        print(f"  {faction:20s}: {data['overall']['win_rate']:.0%} ({data['overall']['games']} games)")
    
    # Strategy comparison
    print_strategy_comparison("boundary_dispute")
    print_strategy_comparison("informants")
    
    # Scheme comparison
    print_scheme_comparison("assassinate")
    print_scheme_comparison("frame_job")
    
    # Full faction summary
    print_faction_summary("Neverborn")
