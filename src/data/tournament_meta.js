// ===========================================================================
// TOURNAMENT META DATA - Longshanks Statistics
// Last Updated: December 2024
// Update Frequency: Quarterly
// Source: https://malifaux.longshanks.org/statistics/
// ===========================================================================

export const META_VERSION = {
  last_updated: "2024-12-12",
  total_games: 16455,
  source: "Longshanks M4E Tournament Data",
  notes: "Data covers M4E GG0 season tournaments. All 8 factions verified."
}

// ===========================================================================
// STRATEGY PERFORMANCE BY FACTION
// Data extracted from Longshanks Faction Analyzer - M4E strategies only
// ===========================================================================
export const STRATEGY_META = {
  boundary_dispute: {
    name: "Boundary Dispute",
    total_games: 1597,
    factions: {
      "Ten Thunders": { win_rate: 0.48, games: 185, rank: 1 },
      "Bayou": { win_rate: 0.47, games: 148, rank: 2 },
      "Arcanists": { win_rate: 0.47, games: 177, rank: 3 },
      "Explorers Society": { win_rate: 0.46, games: 204, rank: 4 },
      "Outcasts": { win_rate: 0.46, games: 229, rank: 5 },
      "Guild": { win_rate: 0.45, games: 210, rank: 6 },
      "Neverborn": { win_rate: 0.43, games: 260, rank: 7 },
      "Resurrectionists": { win_rate: 0.37, games: 184, rank: 8 },
    }
  },
  plant_explosives: {
    name: "Plant Explosives",
    total_games: 1378,
    factions: {
      "Explorers Society": { win_rate: 0.51, games: 172, rank: 1 },
      "Guild": { win_rate: 0.51, games: 168, rank: 2 },
      "Bayou": { win_rate: 0.46, games: 136, rank: 3 },
      "Arcanists": { win_rate: 0.46, games: 158, rank: 4 },
      "Neverborn": { win_rate: 0.43, games: 223, rank: 5 },
      "Ten Thunders": { win_rate: 0.43, games: 159, rank: 6 },
      "Resurrectionists": { win_rate: 0.42, games: 161, rank: 7 },
      "Outcasts": { win_rate: 0.37, games: 201, rank: 8 },
    }
  },
  recover_evidence: {
    name: "Recover Evidence",
    total_games: 1514,
    factions: {
      "Explorers Society": { win_rate: 0.47, games: 206, rank: 1 },
      "Guild": { win_rate: 0.47, games: 205, rank: 2 },
      "Neverborn": { win_rate: 0.45, games: 238, rank: 3 },
      "Ten Thunders": { win_rate: 0.44, games: 170, rank: 4 },
      "Outcasts": { win_rate: 0.43, games: 208, rank: 5 },
      "Resurrectionists": { win_rate: 0.43, games: 190, rank: 6 },
      "Arcanists": { win_rate: 0.42, games: 156, rank: 7 },
      "Bayou": { win_rate: 0.37, games: 141, rank: 8 },
    }
  },
  informants: {
    name: "Informants",
    total_games: 1529,
    factions: {
      "Neverborn": { win_rate: 0.53, games: 264, rank: 1 },
      "Bayou": { win_rate: 0.47, games: 145, rank: 2 },
      "Arcanists": { win_rate: 0.44, games: 164, rank: 3 },
      "Outcasts": { win_rate: 0.43, games: 206, rank: 4 },
      "Explorers Society": { win_rate: 0.43, games: 209, rank: 5 },
      "Resurrectionists": { win_rate: 0.42, games: 178, rank: 6 },
      "Guild": { win_rate: 0.37, games: 200, rank: 7 },
      "Ten Thunders": { win_rate: 0.35, games: 163, rank: 8 },
    }
  },
  collapsing_mines: {
    name: "Collapsing Mines",
    total_games: 100,
    factions: {
      "Neverborn": { win_rate: 0.61, games: 18, rank: 1 },
      "Guild": { win_rate: 0.50, games: 10, rank: 2 },
      "Outcasts": { win_rate: 0.44, games: 16, rank: 3 },
      "Arcanists": { win_rate: 0.40, games: 10, rank: 4 },
      "Resurrectionists": { win_rate: 0.39, games: 14, rank: 5 },
      "Explorers Society": { win_rate: 0.31, games: 13, rank: 6 },
      "Ten Thunders": { win_rate: 0.27, games: 15, rank: 7 },
      "Bayou": { win_rate: 0.00, games: 4, rank: 8 },
    }
  },
}

// ===========================================================================
// SCHEME PERFORMANCE BY FACTION
// Structure mirrors STRATEGY_META for consistency
// ===========================================================================
export const SCHEME_META = {
  // TODO: Populate from Longshanks scheme statistics
}

// ===========================================================================
// MASTER COMPETITIVE TIERS
// Tier: S (60%+), A (55-59%), B (50-54%), C (45-49%), D (<45%)
// Data from Longshanks Faction Analyzer "YOUR MASTERS" sections
// ===========================================================================
export const MASTER_META = {
  // ─── Arcanists ─── (Overall: 50%, 1694 games)
  "Kaeris, Reborn": { win_rate: 0.66, games: 31, tier: "S" },
  "Colette Du Bois, Star Of The Show": { win_rate: 0.61, games: 171, tier: "S" },
  "Mei Feng, Sentinel Of Steel": { win_rate: 0.57, games: 166, tier: "A" },
  "Charles Hoffman, Steel Sculptor": { win_rate: 0.56, games: 118, tier: "A" },
  "Rasputina, Abominable": { win_rate: 0.53, games: 153, tier: "B" },
  "Sandeep Desai, Font Of Magic": { win_rate: 0.49, games: 117, tier: "C" },
  "Marcus, Alpha": { win_rate: 0.47, games: 91, tier: "C" },
  "Toni Ironsides, Troubleshooter": { win_rate: 0.46, games: 28, tier: "C" },
  "Kaeris, Iron Threaded": { win_rate: 0.45, games: 31, tier: "C" },
  "Colette Du Bois, Smuggler": { win_rate: 0.45, games: 174, tier: "C" },
  "Rasputina, Winter's Teeth": { win_rate: 0.44, games: 87, tier: "D" },
  "Sandeep Desai, The Quiet Flame": { win_rate: 0.43, games: 61, tier: "D" },
  "Mei Feng, Foreman": { win_rate: 0.42, games: 19, tier: "D" },
  "Marcus, Monstermaker": { win_rate: 0.38, games: 43, tier: "D" },
  "Charles Hoffman, Inventor": { win_rate: 0.38, games: 68, tier: "D" },
  "Toni Ironsides, Union President": { win_rate: 0.34, games: 28, tier: "D" },

  // ─── Guild ─── (Overall: 50%, 1919 games)
  "Dashel Barker, Butcher": { win_rate: 0.62, games: 102, tier: "S" },
  "Lady Justice, Death Touched": { win_rate: 0.57, games: 230, tier: "A" },
  "Perdita Ortega, La Diabla": { win_rate: 0.57, games: 70, tier: "A" },
  "Cornelius Basse, Lone Verdict": { win_rate: 0.56, games: 17, tier: "A" },
  "Sonnia Criid, Unrelenting": { win_rate: 0.56, games: 100, tier: "A" },
  "Nellie Cochrane, The Tattler": { win_rate: 0.55, games: 54, tier: "A" },
  "Lady Justice, Arbiter Of The Undead": { win_rate: 0.55, games: 198, tier: "A" },
  "Perdita Ortega, Neverborn Hunter": { win_rate: 0.54, games: 184, tier: "B" },
  "Dashel Barker, The Old Guard": { win_rate: 0.52, games: 121, tier: "B" },
  "Lucius Mattheson, Dishonorable": { win_rate: 0.49, games: 31, tier: "C" },
  "Nellie Cochrane, Voice Of Disorder": { win_rate: 0.47, games: 59, tier: "C" },
  "Sonnia Criid, Unmasked": { win_rate: 0.45, games: 80, tier: "C" },
  "Lucius Mattheson, In Plain Sight": { win_rate: 0.45, games: 62, tier: "C" },
  "Cornelius Basse, Badlands Sheriff": { win_rate: 0.42, games: 109, tier: "D" },

  // ─── Outcasts ─── (Overall: 48%, 2195 games)
  "Tara, Timeless": { win_rate: 0.65, games: 46, tier: "S" },
  "Jack Daw, Spirit Of Betrayal": { win_rate: 0.61, games: 33, tier: "S" },
  "Parker Barrows, Most Wanted": { win_rate: 0.59, games: 124, tier: "A" },
  "Viktoria Chambers, Twin Blades": { win_rate: 0.58, games: 165, tier: "A" },
  "Von Schill, Iron Heart": { win_rate: 0.56, games: 59, tier: "A" },
  "Viktoria Chambers, Ashes And Blood": { win_rate: 0.53, games: 225, tier: "B" },
  "Von Schill, The Veteran": { win_rate: 0.51, games: 108, tier: "B" },
  "Tara, Voidcaller": { win_rate: 0.48, games: 82, tier: "C" },
  "Hamelin, The Piper": { win_rate: 0.47, games: 73, tier: "C" },
  "Jack Daw, Ensouled": { win_rate: 0.47, games: 145, tier: "C" },
  "Hamelin, Plaguebringer": { win_rate: 0.47, games: 274, tier: "C" },
  "Rusty Alyce, Trigger Happy": { win_rate: 0.45, games: 66, tier: "C" },
  "Rusty Alyce, Rider Remade": { win_rate: 0.45, games: 32, tier: "C" },
  "Parker Barrows, Dead Man Walking": { win_rate: 0.45, games: 50, tier: "C" },
  "Clockwork Queen, Matriarch Of The Machine": { win_rate: 0.45, games: 97, tier: "C" },
  "Clockwork Queen, The Paradox": { win_rate: 0.45, games: 31, tier: "C" },
  "Leveticus, Pariah": { win_rate: 0.39, games: 183, tier: "D" },
  "Leveticus, Sanction": { win_rate: 0.39, games: 123, tier: "D" },
  "Zipp, Dread Pirate": { win_rate: 0.36, games: 56, tier: "D" },

  // ─── Resurrectionists ─── (Overall: 47%, 1921 games)
  "Reva Cortinas, Death Shepherd": { win_rate: 0.59, games: 81, tier: "A" },
  "Seamus, aka Sebastian Baker": { win_rate: 0.57, games: 23, tier: "A" },
  "Molly Squidpiddge, Harbinger Of Havoc": { win_rate: 0.53, games: 134, tier: "B" },
  "Kirai Ankoku, Lady Of Vengeance": { win_rate: 0.51, games: 44, tier: "B" },
  "Prof. Von Schtook, Stargazer": { win_rate: 0.51, games: 47, tier: "B" },
  "Dr. McMourning, Insanitary": { win_rate: 0.50, games: 59, tier: "B" },
  "Seamus, The Last Breath": { win_rate: 0.49, games: 95, tier: "C" },
  "Yan Lo, The Spirit Walker": { win_rate: 0.48, games: 285, tier: "C" },
  "Reva Cortinas, Luminary": { win_rate: 0.47, games: 129, tier: "C" },
  "Dr. McMourning, Malpractitioner": { win_rate: 0.46, games: 195, tier: "C" },
  "Molly Squidpiddge, Chaotic Conductor": { win_rate: 0.45, games: 107, tier: "C" },
  "Prof. Von Schtook, Admissions Executive": { win_rate: 0.43, games: 95, tier: "D" },
  "Yan Lo, Pathseeker": { win_rate: 0.42, games: 102, tier: "D" },
  "Kirai Ankoku, Envoy Of The Court": { win_rate: 0.40, games: 99, tier: "D" },
  "Kastore, Fervent": { win_rate: 0.40, games: 78, tier: "D" },
  "Kastore, Awakened": { win_rate: 0.38, games: 26, tier: "D" },

  // ─── Explorers Society ─── (Overall: 51%, 1902 games)
  "Maxine Agassiz, Monomaniacal": { win_rate: 0.70, games: 105, tier: "S" },
  "Cornelius Basse, Lone Verdict": { win_rate: 0.63, games: 12, tier: "S" },
  "Lucas McCabe, Tomb Delver": { win_rate: 0.62, games: 204, tier: "S" },
  "Maxine Agassiz, The Renowned": { win_rate: 0.61, games: 96, tier: "S" },
  "English Ivan, Double Agent": { win_rate: 0.58, games: 116, tier: "A" },
  "Jedza, Everlasting": { win_rate: 0.55, games: 49, tier: "A" },
  "Jedza, The Wanderer": { win_rate: 0.52, games: 154, tier: "B" },
  "Anya Lycarayen, Rail Magnate": { win_rate: 0.52, games: 120, tier: "B" },
  "Lord Cooper, Manhunter": { win_rate: 0.49, games: 53, tier: "C" },
  "English Ivan, Obscura": { win_rate: 0.48, games: 128, tier: "C" },
  "Lord Cooper, Huntmaster": { win_rate: 0.48, games: 102, tier: "C" },
  "Anya Lycarayen, The Resolute": { win_rate: 0.47, games: 159, tier: "C" },
  "Damian Ravencroft, Aspirant": { win_rate: 0.45, games: 72, tier: "C" },
  "Cornelius Basse, Badlands Sheriff": { win_rate: 0.44, games: 122, tier: "D" },
  "Damian Ravencroft, Unbound": { win_rate: 0.41, games: 79, tier: "D" },
  "Tiri, The Nomad": { win_rate: 0.41, games: 99, tier: "D" },
  "Tiri, The Architect": { win_rate: 0.40, games: 21, tier: "D" },

  // ─── Ten Thunders ─── (Overall: 51%, 1934 games)
  "Youko Hamasaki, Unseen": { win_rate: 0.61, games: 74, tier: "S" },
  "Linh Ly, Storyteller": { win_rate: 0.59, games: 16, tier: "A" },
  "Misaki Katanaka, Fractured": { win_rate: 0.59, games: 241, tier: "A" },
  "Shenlong, Dragon's Breath": { win_rate: 0.59, games: 105, tier: "A" },
  "Youko Hamasaki, Silk Of The Lotus": { win_rate: 0.58, games: 91, tier: "A" },
  "Asami Tanaka, Shintaku": { win_rate: 0.57, games: 83, tier: "A" },
  "Jakob Lynch, Wildcard": { win_rate: 0.54, games: 90, tier: "B" },
  "Asami Tanaka, Oni Mother": { win_rate: 0.54, games: 45, tier: "B" },
  "Yan Lo, The Spirit Walker": { win_rate: 0.53, games: 68, tier: "B" },
  "Shenlong, The Teacher": { win_rate: 0.51, games: 132, tier: "B" },
  "Misaki Katanaka, Oyabun": { win_rate: 0.45, games: 148, tier: "C" },
  "Linh Ly, Bibliothecary": { win_rate: 0.43, games: 81, tier: "D" },
  "Jakob Lynch, Dark Bet": { win_rate: 0.43, games: 65, tier: "D" },
  "Yan Lo, Pathseeker": { win_rate: 0.42, games: 224, tier: "D" },
  "Lucas McCabe, Relic Hunter": { win_rate: 0.38, games: 13, tier: "D" },
  "Mei Feng, Foreman": { win_rate: 0.38, games: 58, tier: "D" },

  // ─── Bayou ─── (Overall: 51%, 1776 games)
  "Wong, The Wonderful": { win_rate: 0.64, games: 48, tier: "S" },
  "The Clampetts, Ballyhoo Bucket": { win_rate: 0.63, games: 15, tier: "S" },
  "The Brewmaster, Proof Prophet": { win_rate: 0.63, games: 124, tier: "S" },
  "Som'er Teeth Jones, Bayou Boss": { win_rate: 0.59, games: 108, tier: "A" },
  "Mah Tucket, Mecha Meemaw": { win_rate: 0.58, games: 100, tier: "A" },
  "Zoraida, Bog Witch": { win_rate: 0.57, games: 200, tier: "A" },
  "Ulix Turner, Hogfather": { win_rate: 0.57, games: 47, tier: "A" },
  "Ophelia LaCroix, Overloaded": { win_rate: 0.55, games: 44, tier: "A" },
  "Wong, Enchanter": { win_rate: 0.53, games: 97, tier: "B" },
  "Zoraida, Swamp Hag": { win_rate: 0.53, games: 51, tier: "B" },
  "Som'er Teeth Jones, Loot Monger": { win_rate: 0.48, games: 103, tier: "C" },
  "Ulix Turner, Porkbelly Protector": { win_rate: 0.46, games: 69, tier: "C" },
  "The Brewmaster, Moonshiner": { win_rate: 0.45, games: 179, tier: "C" },
  "Captain Zipp, Cloudchaser": { win_rate: 0.44, games: 32, tier: "D" },
  "Mah Tucket, Metal Magpie": { win_rate: 0.41, games: 72, tier: "D" },
  "Ophelia LaCroix, Red Cage Raider": { win_rate: 0.41, games: 101, tier: "D" },
  "The Clampetts, Fisherfolk": { win_rate: 0.40, games: 67, tier: "D" },
  "Captain Zipp, Dread Pirate": { win_rate: 0.38, games: 98, tier: "D" },

  // ─── Neverborn ─── (Overall: 52%, 2554 games)
  "Pandora, Tyrant Torn": { win_rate: 0.64, games: 158, tier: "S" },
  "The Dreamer, Insomniac": { win_rate: 0.64, games: 221, tier: "S" },
  "Silken King, Long Live": { win_rate: 0.63, games: 19, tier: "S" },
  "Silken King, Colossus": { win_rate: 0.60, games: 43, tier: "S" },
  "Nekima, Broodmother": { win_rate: 0.59, games: 195, tier: "A" },
  "Lucius Mattheson, Dishonorable": { win_rate: 0.58, games: 119, tier: "A" },
  "Pandora, Despair's Desire": { win_rate: 0.56, games: 110, tier: "A" },
  "Marcus, Alpha": { win_rate: 0.56, games: 54, tier: "A" },
  "Euripides, Hierophant": { win_rate: 0.55, games: 167, tier: "A" },
  "Lucius Mattheson, In Plain Sight": { win_rate: 0.54, games: 47, tier: "B" },
  "Kastore, Fervent": { win_rate: 0.52, games: 169, tier: "B" },
  "Nekima, Nephilim Queen": { win_rate: 0.48, games: 137, tier: "C" },
  "Titania, Withered Rose": { win_rate: 0.47, games: 101, tier: "C" },
  "Euripides, Old One Eye": { win_rate: 0.45, games: 157, tier: "C" },
  "Marcus, Monstermaker": { win_rate: 0.45, games: 56, tier: "C" },
  "The Dreamer, Fast Asleep": { win_rate: 0.44, games: 208, tier: "D" },
  "Titania, Autumn Queen": { win_rate: 0.42, games: 114, tier: "D" },
  "Zoraida, Bog Witch": { win_rate: 0.41, games: 33, tier: "D" },
  "Zoraida, Swamp Hag": { win_rate: 0.40, games: 86, tier: "D" },
  "Kastore, Awakened": { win_rate: 0.37, games: 58, tier: "D" },
  "Wrath": { win_rate: 0.30, games: 30, tier: "D" },
}

// ===========================================================================
// MASTER-STRATEGY PERFORMANCE
// TODO: Populate from deeper Longshanks analysis
// ===========================================================================
export const MASTER_STRATEGY_META = {
  // Structure: "master_display_name": { strategy_key: { win_rate, games } }
}

// ===========================================================================
// FACTION OVERALL STATISTICS
// ===========================================================================
export const FACTION_META = {
  "Arcanists": {
    overall: { win_rate: 0.50, games: 1694 },
    strategies_m4e: {
      boundary_dispute: { win_rate: 0.47, games: 177 },
      collapsing_mines: { win_rate: 0.40, games: 10 },
      informants: { win_rate: 0.44, games: 164 },
      plant_explosives: { win_rate: 0.46, games: 158 },
      recover_evidence: { win_rate: 0.42, games: 156 },
    },
    schemes_chosen: {
      assassinate: { win_rate: 0.56, games: 156 },
      breakthrough: { win_rate: 0.63, games: 119 },
      detonate_charges: { win_rate: 0.60, games: 154 },
      ensnare: { win_rate: 0.55, games: 122 },
      frame_job: { win_rate: 0.50, games: 108 },
      harness_the_ley_line: { win_rate: 0.46, games: 98 },
      leave_your_mark: { win_rate: 0.64, games: 115 },
      make_it_look_like_an_accident: { win_rate: 0.49, games: 84 },
      public_demonstration: { win_rate: 0.61, games: 44 },
      reshape_the_land: { win_rate: 0.50, games: 93 },
      runic_binding: { win_rate: 0.46, games: 96 },
      scout_the_rooftops: { win_rate: 0.51, games: 133 },
      search_the_area: { win_rate: 0.46, games: 81 },
      take_the_highground: { win_rate: 0.46, games: 144 },
    }
  },
  "Guild": {
    overall: { win_rate: 0.50, games: 1919 },
    strategies_m4e: {
      boundary_dispute: { win_rate: 0.45, games: 210 },
      collapsing_mines: { win_rate: 0.50, games: 10 },
      informants: { win_rate: 0.37, games: 200 },
      plant_explosives: { win_rate: 0.51, games: 168 },
      recover_evidence: { win_rate: 0.47, games: 205 },
    },
    schemes_chosen: {
      assassinate: { win_rate: 0.50, games: 207 },
      breakthrough: { win_rate: 0.52, games: 143 },
      detonate_charges: { win_rate: 0.56, games: 158 },
      ensnare: { win_rate: 0.57, games: 161 },
      frame_job: { win_rate: 0.44, games: 140 },
      harness_the_ley_line: { win_rate: 0.52, games: 124 },
      leave_your_mark: { win_rate: 0.58, games: 163 },
      light_the_beacons: { win_rate: 0.76, games: 16 },
      make_it_look_like_an_accident: { win_rate: 0.55, games: 124 },
      public_demonstration: { win_rate: 0.60, games: 46 },
      reshape_the_land: { win_rate: 0.46, games: 92 },
      runic_binding: { win_rate: 0.54, games: 134 },
      scout_the_rooftops: { win_rate: 0.50, games: 152 },
      search_the_area: { win_rate: 0.42, games: 111 },
      take_the_highground: { win_rate: 0.44, games: 180 },
    }
  },
  "Outcasts": {
    overall: { win_rate: 0.48, games: 2195 },
    strategies_m4e: {
      boundary_dispute: { win_rate: 0.46, games: 229 },
      collapsing_mines: { win_rate: 0.44, games: 16 },
      informants: { win_rate: 0.43, games: 206 },
      plant_explosives: { win_rate: 0.37, games: 201 },
      recover_evidence: { win_rate: 0.43, games: 208 },
    },
    schemes_chosen: {
      assassinate: { win_rate: 0.54, games: 240 },
      breakthrough: { win_rate: 0.57, games: 147 },
      detonate_charges: { win_rate: 0.55, games: 170 },
      ensnare: { win_rate: 0.47, games: 136 },
      frame_job: { win_rate: 0.40, games: 159 },
      harness_the_ley_line: { win_rate: 0.57, games: 136 },
      leave_your_mark: { win_rate: 0.56, games: 147 },
      light_the_beacons: { win_rate: 0.41, games: 51 },
      make_it_look_like_an_accident: { win_rate: 0.51, games: 96 },
      public_demonstration: { win_rate: 0.41, games: 50 },
      reshape_the_land: { win_rate: 0.56, games: 89 },
      runic_binding: { win_rate: 0.51, games: 157 },
      scout_the_rooftops: { win_rate: 0.55, games: 172 },
      search_the_area: { win_rate: 0.44, games: 103 },
      take_the_highground: { win_rate: 0.50, games: 194 },
    }
  },
  "Resurrectionists": {
    overall: { win_rate: 0.47, games: 1921 },
    strategies_m4e: {
      boundary_dispute: { win_rate: 0.37, games: 184 },
      collapsing_mines: { win_rate: 0.39, games: 14 },
      informants: { win_rate: 0.42, games: 178 },
      plant_explosives: { win_rate: 0.42, games: 161 },
      recover_evidence: { win_rate: 0.43, games: 190 },
    },
    schemes_chosen: {
      assassinate: { win_rate: 0.51, games: 196 },
      breakthrough: { win_rate: 0.57, games: 128 },
      detonate_charges: { win_rate: 0.45, games: 149 },
      ensnare: { win_rate: 0.47, games: 137 },
      frame_job: { win_rate: 0.44, games: 127 },
      harness_the_ley_line: { win_rate: 0.46, games: 131 },
      leave_your_mark: { win_rate: 0.53, games: 148 },
      light_the_beacons: { win_rate: 0.41, games: 18 },
      make_it_look_like_an_accident: { win_rate: 0.49, games: 78 },
      public_demonstration: { win_rate: 0.46, games: 48 },
      reshape_the_land: { win_rate: 0.46, games: 97 },
      runic_binding: { win_rate: 0.46, games: 77 },
      scout_the_rooftops: { win_rate: 0.46, games: 165 },
      search_the_area: { win_rate: 0.50, games: 105 },
      take_the_highground: { win_rate: 0.52, games: 168 },
    }
  },
  "Explorers Society": {
    overall: { win_rate: 0.51, games: 1902 },
    strategies_m4e: {
      boundary_dispute: { win_rate: 0.46, games: 204 },
      collapsing_mines: { win_rate: 0.31, games: 13 },
      informants: { win_rate: 0.43, games: 209 },
      plant_explosives: { win_rate: 0.51, games: 172 },
      recover_evidence: { win_rate: 0.47, games: 206 },
    },
    schemes_chosen: {
      assassinate: { win_rate: 0.62, games: 166 },
      breakthrough: { win_rate: 0.50, games: 181 },
      detonate_charges: { win_rate: 0.55, games: 174 },
      ensnare: { win_rate: 0.53, games: 173 },
      frame_job: { win_rate: 0.43, games: 151 },
      harness_the_ley_line: { win_rate: 0.52, games: 127 },
      leave_your_mark: { win_rate: 0.58, games: 139 },
      light_the_beacons: { win_rate: 0.62, games: 37 },
      make_it_look_like_an_accident: { win_rate: 0.57, games: 105 },
      public_demonstration: { win_rate: 0.55, games: 46 },
      reshape_the_land: { win_rate: 0.55, games: 136 },
      runic_binding: { win_rate: 0.58, games: 145 },
      scout_the_rooftops: { win_rate: 0.53, games: 178 },
      search_the_area: { win_rate: 0.56, games: 146 },
      take_the_highground: { win_rate: 0.62, games: 181 },
    }
  },
  "Ten Thunders": {
    overall: { win_rate: 0.51, games: 1934 },
    strategies_m4e: {
      boundary_dispute: { win_rate: 0.48, games: 185 },
      collapsing_mines: { win_rate: 0.27, games: 15 },
      informants: { win_rate: 0.35, games: 163 },
      plant_explosives: { win_rate: 0.43, games: 159 },
      recover_evidence: { win_rate: 0.44, games: 170 },
    },
    schemes_chosen: {
      assassinate: { win_rate: 0.47, games: 182 },
      breakthrough: { win_rate: 0.52, games: 164 },
      detonate_charges: { win_rate: 0.51, games: 135 },
      ensnare: { win_rate: 0.45, games: 90 },
      frame_job: { win_rate: 0.41, games: 126 },
      harness_the_ley_line: { win_rate: 0.44, games: 102 },
      leave_your_mark: { win_rate: 0.51, games: 153 },
      light_the_beacons: { win_rate: 0.25, games: 10 },
      make_it_look_like_an_accident: { win_rate: 0.42, games: 116 },
      public_demonstration: { win_rate: 0.64, games: 35 },
      reshape_the_land: { win_rate: 0.38, games: 102 },
      runic_binding: { win_rate: 0.47, games: 110 },
      scout_the_rooftops: { win_rate: 0.47, games: 168 },
      search_the_area: { win_rate: 0.61, games: 97 },
      take_the_highground: { win_rate: 0.42, games: 181 },
    }
  },
  "Bayou": {
    overall: { win_rate: 0.51, games: 1776 },
    strategies_m4e: {
      boundary_dispute: { win_rate: 0.47, games: 148 },
      collapsing_mines: { win_rate: 0.00, games: 4 },
      informants: { win_rate: 0.47, games: 145 },
      plant_explosives: { win_rate: 0.46, games: 136 },
      recover_evidence: { win_rate: 0.37, games: 141 },
    },
    schemes_chosen: {
      assassinate: { win_rate: 0.54, games: 138 },
      breakthrough: { win_rate: 0.53, games: 106 },
      detonate_charges: { win_rate: 0.62, games: 129 },
      ensnare: { win_rate: 0.48, games: 107 },
      frame_job: { win_rate: 0.52, games: 109 },
      harness_the_ley_line: { win_rate: 0.62, games: 123 },
      leave_your_mark: { win_rate: 0.48, games: 126 },
      light_the_beacons: { win_rate: 0.46, games: 11 },
      make_it_look_like_an_accident: { win_rate: 0.45, games: 77 },
      public_demonstration: { win_rate: 0.58, games: 19 },
      reshape_the_land: { win_rate: 0.52, games: 66 },
      runic_binding: { win_rate: 0.45, games: 98 },
      scout_the_rooftops: { win_rate: 0.52, games: 117 },
      search_the_area: { win_rate: 0.44, games: 78 },
      take_the_highground: { win_rate: 0.55, games: 150 },
    }
  },
  "Neverborn": {
    overall: { win_rate: 0.52, games: 2554 },
    strategies_m4e: {
      boundary_dispute: { win_rate: 0.43, games: 260 },
      collapsing_mines: { win_rate: 0.61, games: 18 },
      informants: { win_rate: 0.53, games: 264 },
      plant_explosives: { win_rate: 0.43, games: 223 },
      recover_evidence: { win_rate: 0.45, games: 238 },
    },
    schemes_chosen: {
      assassinate: { win_rate: 0.51, games: 271 },
      breakthrough: { win_rate: 0.55, games: 163 },
      detonate_charges: { win_rate: 0.57, games: 231 },
      ensnare: { win_rate: 0.46, games: 191 },
      frame_job: { win_rate: 0.49, games: 173 },
      harness_the_ley_line: { win_rate: 0.49, games: 169 },
      leave_your_mark: { win_rate: 0.47, games: 184 },
      light_the_beacons: { win_rate: 0.66, games: 24 },
      make_it_look_like_an_accident: { win_rate: 0.56, games: 154 },
      public_demonstration: { win_rate: 0.53, games: 80 },
      reshape_the_land: { win_rate: 0.56, games: 137 },
      runic_binding: { win_rate: 0.55, games: 193 },
      scout_the_rooftops: { win_rate: 0.51, games: 217 },
      search_the_area: { win_rate: 0.58, games: 197 },
      take_the_highground: { win_rate: 0.58, games: 241 },
    }
  },
}

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

export const getMasterMeta = (displayName) => {
  if (!displayName) return null
  if (MASTER_META[displayName]) return MASTER_META[displayName]
  
  const withoutThe = displayName.replace(/^The /, '')
  if (MASTER_META[withoutThe]) return MASTER_META[withoutThe]
  
  const normalize = (s) => s.toLowerCase().replace(/[^a-z]/g, '')
  const normalizedTarget = normalize(displayName)
  
  for (const [key, value] of Object.entries(MASTER_META)) {
    if (normalize(key) === normalizedTarget) return value
  }
  
  for (const [key, value] of Object.entries(MASTER_META)) {
    const keyParts = key.toLowerCase().split(',').map(s => s.trim())
    const targetParts = displayName.toLowerCase().split(',').map(s => s.trim())
    
    if (keyParts.length >= 2 && targetParts.length >= 2) {
      const baseMatch = keyParts[0].includes(targetParts[0]) || targetParts[0].includes(keyParts[0])
      const variantMatch = keyParts[1].includes(targetParts[1]) || targetParts[1].includes(keyParts[1])
      if (baseMatch && variantMatch) return value
    }
  }
  
  return null
}

export const getTierColor = (tier) => {
  switch(tier) {
    case 'S': return '#FFD700'
    case 'A': return '#90EE90'
    case 'B': return '#87CEEB'
    case 'C': return '#DDA0DD'
    case 'D': return '#CD5C5C'
    default: return '#888888'
  }
}

export const getMasterStrategyMeta = (masterDisplayName, strategyKey) => {
  if (!masterDisplayName || !strategyKey) return null
  return MASTER_STRATEGY_META[masterDisplayName]?.[strategyKey] || null
}

export const getFactionStrategyMeta = (faction, strategyKey) => {
  if (!faction || !strategyKey) return null
  return STRATEGY_META[strategyKey]?.factions?.[faction] || null
}

export const getStrategyRankings = (strategyKey) => {
  const strategyData = STRATEGY_META[strategyKey]
  if (!strategyData) return []
  
  return Object.entries(strategyData.factions)
    .map(([faction, data]) => ({ faction, ...data }))
    .sort((a, b) => a.rank - b.rank)
}
