#!/usr/bin/env python3
"""
Keyword Extraction Repair Script v2
Fixes missing keywords in cards.json using improved OCR pattern matching.

Changes in v2:
- Added DUA keyword (Desert Unification Assembly)
- Added truncated patterns for Kin, Swampfiend, Apex
- Improved coverage from 74% to 93.5%
"""

import json
import re
import sys
from collections import Counter

KEYWORD_PATTERNS = {
    # ARCANISTS
    'Academic': ['AAccaaddeemmiicc'],
    'December': ['DDeecceemmbbeerr'],
    'Foundry': ['FFoouunnddrryy'],
    'M&SU': ['MM&&SSUU', 'MM&&SS', 'MM &&SS'],
    'Oxfordian': ['OOxxffoorrdd'],
    'Performer': ['PPeerrffoorrmmeerr'],
    'Showgirl': ['SShhoowwggiirrll'],
    'Star Theater': ['SSttaarr TThheeaatt', 'SSttaarrTThheeaatt'],
    'Wildfire': ['WWiillddffiirree', 'WWiillddff'],
    'Witness': ['WWiittnneessss'],
    
    # BAYOU
    'Angler': ['AAnngglleerr', 'AAnnggll'],
    'Bayou': ['BBaayyoouu'],
    'Big-Hat': ['BBiigg--HHaatt', 'BBiiggHHaatt', 'BBiigg HHaatt'],
    'Kin': ['KKiinn', 'KKii'],
    'Sooey': ['SSooooeeyy'],
    'Swampfiend': ['SSwwaammppffiieenndd', 'SSwwaammpp', 'SSwwaa'],
    'Tricksy': ['TTrriicckkssyy'],
    'Wizz-Bang': ['WWiizzzz--BBaanngg', 'WWiizzzzBBaanngg'],
    
    # EXPLORER'S SOCIETY
    'Apex': ['AAppeexx', 'AAppee', 'AAppe'],
    'Boundary': ['BBoouunnddaarryy'],
    'Cadmus': ['CCaaddmmuuss'],
    'Descendant': ['DDeesscceennddaanntt'],
    'DUA': ['DDUUAA'],
    'EVS': ['EEVVSS'],
    'Explorer': ['EExxpplloorreerr'],
    'Seeker': ['SSeeeekkeerr'],
    'Wastrel': ['WWaassttrreell'],
    
    # GUILD
    'Augmented': ['AAuuggmmeenntteedd', 'AAuuggmmeenntt'],
    'Elite': ['EElliittee'],
    'Executioner': ['EExxeeccuuttiioonn'],
    'Family': ['FFaammiillyy'],
    'Guard': ['GGuuaarrdd'],
    'Journalist': ['JJoouurrnnaalliisstt'],
    'Marshal': ['MMaarrsshhaall'],
    'Witch-Hunter': ['WWiittcchh--HHuunntt', 'WWiittcchhHHuunntt'],
    
    # NEVERBORN
    'Cavalier': ['CCaavvaalliieerr'],
    'Chimera': ['CChhiimmeerraa'],
    'Fae': ['FFaaee'],
    'Mimic': ['MMiimmiicc'],
    'Nephilim': ['NNeepphhiilliimm'],
    'Nightmare': ['NNiigghhttmmaarree'],
    'Woe': ['WWooee'],
    
    # OUTCASTS
    'Amalgam': ['AAmmaallggaamm'],
    'Bandit': ['BBaannddiitt'],
    'Banished': ['BBaanniisshheedd'],
    'Crossroads': ['CCrroossssrrooaadd'],
    'Freikorps': ['FFrreeiikkoorrppss'],
    'Infamous': ['IInnffaammoouuss'],
    'Mercenary': ['MMeerrcceennaarryy'],
    'Obliteration': ['OObblliitteerraatt'],
    'Pioneer': ['PPiioonneeeerr'],
    'Plague': ['PPllaagguuee'],
    'Tormented': ['TToorrmmeen'],
    
    # RESURRECTIONISTS
    'Ancestor': ['AAnncceessttoorr'],
    'Brood': ['BBrroooodd'],
    'Bygone': ['BByyggoonn'],
    'Forgotten': ['FFoorrggoott'],
    'Redchapel': ['RReeddcchhaappeell'],
    'Revenant': ['RReevveennaanntt'],
    'Returned': ['RReettuurrnneedd'],
    'Transmortis': ['TTrraannssmmoorrtt'],
    'Urami': ['UUrraamm'],
    
    # TEN THUNDERS
    'Honeypot': ['HHoonneeyyppoott'],
    'Last Blossom': ['LLaassttBBlloossss', 'LLaasstt BBlloossss'],
    'Monk': ['MMoonnkk'],
    'Oni': ['OOnnii'],
    'Qi and Gong': ['QQiiaannddGGoonngg', 'QQii aanndd GGoonngg', 'QQiiaanndd'],
    'Retainer': ['RReettaaiinneerr'],
    'Syndicate': ['SSyynnddiiccaattee', 'SSyynnddiiccaatt'],
    'Tri-Chi': ['TTrrii--CChhii', 'TTrriiCChhii', 'TTrrii CChhii'],
    
    # UNIVERSAL
    'Versatile': ['VVeerrssaattiillee'],
    'Savage': ['SSaavvaaggee'],
    'Frontier': ['FFrroonnttiieerr'],
    'Rare': ['RRaarree'],
    
    # Special types
    'Effigy': ['EEffffiigg'],
    'Emissary': ['EEmmiissssaarr'],
    'Golem': ['GGoolleemm'],
    'Gamin': ['GGaammiinn'],
}


def extract_keywords(raw_text):
    if not raw_text:
        return []
    
    keywords_found = []
    ability_start = re.search(r'\n[A-Z][a-z]+.*?:', raw_text)
    keyword_section = raw_text[:ability_start.start()] if ability_start else raw_text
    raw_joined = keyword_section.replace('\n', '').replace(' ', '')
    raw_joined_lower = raw_joined.lower()
    
    for keyword, patterns in KEYWORD_PATTERNS.items():
        for pattern in patterns:
            if pattern.lower() in raw_joined_lower:
                if keyword not in keywords_found:
                    keywords_found.append(keyword)
                break
    
    return keywords_found


def repair_keywords(input_path, output_path):
    with open(input_path, 'r') as f:
        data = json.load(f)
    
    cards = data.get('cards', data) if isinstance(data, dict) else data
    
    stats = {
        'stat_cards': 0,
        'had_keywords': 0,
        'repaired': 0,
        'still_missing': 0,
        'by_keyword': Counter(),
    }
    
    for card in cards:
        if card.get('card_type') != 'Stat':
            continue
        
        stats['stat_cards'] += 1
        old_keywords = card.get('keywords', [])
        
        if old_keywords:
            stats['had_keywords'] += 1
            continue
        
        new_keywords = extract_keywords(card.get('raw_text', ''))
        
        if new_keywords:
            card['keywords'] = new_keywords
            stats['repaired'] += 1
            for kw in new_keywords:
                stats['by_keyword'][kw] += 1
        else:
            stats['still_missing'] += 1
    
    # Save
    output_data = data if isinstance(data, dict) else {'cards': cards}
    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    return stats


if __name__ == '__main__':
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'cards.json'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'cards_repaired.json'
    
    print(f"Repairing keywords: {input_file} -> {output_file}")
    print("=" * 60)
    
    stats = repair_keywords(input_file, output_file)
    
    print(f"\nStat cards: {stats['stat_cards']}")
    print(f"Already had keywords: {stats['had_keywords']}")
    print(f"Repaired: {stats['repaired']}")
    print(f"Still missing: {stats['still_missing']}")
    
    coverage_before = 100 * stats['had_keywords'] / stats['stat_cards']
    coverage_after = 100 * (stats['had_keywords'] + stats['repaired']) / stats['stat_cards']
    print(f"\nCoverage: {coverage_before:.1f}% -> {coverage_after:.1f}%")
    
    print(f"\nRepairs by keyword:")
    for kw, count in stats['by_keyword'].most_common(20):
        print(f"  {kw}: {count}")
    
    print(f"\nOutput saved to: {output_file}")
