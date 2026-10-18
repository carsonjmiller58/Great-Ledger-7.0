/* ==========================================================================
   The Great Ledger - Logical Game Mathematics & Formulas
   ========================================================================== */

/**
 * Calculates cumulative XP required to reach a specific level.
 * Uses a classic tabletop RPG exponential XP curve.
 * @param {number} level - Target level (1 to 99)
 * @returns {number} - Total cumulative XP required
 */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  let sum = 0;
  for (let i = 1; i < level; i++) {
    sum += Math.floor(i + 300 * Math.pow(2, i / 7));
  }
  return Math.floor(sum / 4);
}

/**
 * Calculates current level based on total XP.
 * @param {number} xp - Cumulative XP
 * @returns {number} - Current level (1 to 99)
 */
export function levelForXp(xp) {
  for (let level = 1; level <= 99; level++) {
    if (xpForLevel(level) > xp) {
      return level - 1;
    }
  }
  return 99;
}

/**
 * Calculates Character Level based on a weighted skill formula.
 * Formula: maxSkill * 0.5 + sum(otherSkills) * 0.15
 */
export function calculateCharacterLevel(skillsLevels) {
  const levels = Object.values(skillsLevels);
  if (levels.length === 0) return 1;
  const maxSkill = Math.max(...levels);
  const sumOthers = levels.reduce((a, b) => a + b, 0) - maxSkill;
  return Math.max(1, Math.floor(maxSkill * 0.5 + sumOthers * 0.15));
}

export const WEAPON_PRESETS = {
  blade: { name: "Broad Sword", key: "blade", range: 1, attack: 5, damage: 2, icon: "⚔️", desc: "Melee. Flat accuracy rating." },
  axe: { name: "Battle Axe", key: "axe", range: 1, attack: 2, damage: 6, icon: "🪓", desc: "Melee. Heavy physical damage." },
  spear: { name: "Pike Spear", key: "spear", range: 2, attack: 4, damage: 3, icon: "🔱", desc: "Polearm. Balance and reach." },
  dagger: { name: "Thief Dagger", key: "dagger", range: 1, attack: 6, damage: 1, icon: "🗡️", desc: "Melee. High agility crit rate." },
  bow: { name: "Hunting Bow", key: "bow", range: 5, attack: 4, damage: 2, icon: "🏹", desc: "Ranged. High agility crit rate." },
  darts: { name: "Throwing Darts", key: "darts", range: 3, attack: 5, damage: 1, icon: "🎯", desc: "Ranged. Swift precision strikes." },
  staff: { name: "Wisdom Staff", key: "staff", range: 5, attack: 3, damage: 4, icon: "🪄", desc: "Ranged magic. Spell power scaling." },
  focus: { name: "Insight Orb", key: "focus", range: 5, attack: 2, damage: 2, icon: "🔮", desc: "Ranged magic. Crit multipliers." }
};

/**
 * Calculates current weapon rank based on cumulative Weapon XP.

 * Maximum rank is 20. Rank 1 starts at 0 XP.
 */
export function weaponRankForXp(xp) {
  if (!xp) return 1;
  let rank = 1;
  let needed = 100;
  let tempXp = xp;
  while (tempXp >= needed && rank < 20) {
    tempXp -= needed;
    rank++;
    needed = rank * 100;
  }
  return rank;
}

/**
 * Calculates current progress details (rank, current XP inside rank, and XP needed for next rank).
 */
export function getWeaponMasteryDetails(xp) {
  const rank = weaponRankForXp(xp);
  let totalXPForCurrent = 0;
  for (let r = 1; r < rank; r++) {
    totalXPForCurrent += r * 100;
  }
  const xpInCurrentRank = (xp || 0) - totalXPForCurrent;
  const xpNeededForNext = rank * 100;
  return { rank, current: xpInCurrentRank, next: xpNeededForNext };
}

/**
 * Maps any main-hand weapon name to its respective Weapon Mastery path category.
 */
export function getWeaponMasteryKey(itemName) {
  if (!itemName) return null;
  const name = itemName.toLowerCase();
  if (name === "blade" || name.includes("sword") || name.includes("scimitar") || name.includes("blade")) return "blade";
  if (name === "axe" || name.includes("axe")) return "axe";
  if (name === "spear" || name.includes("spear") || name.includes("halberd") || name.includes("pike")) return "spear";
  if (name === "dagger" || name.includes("dagger") || name.includes("knife")) return "dagger";
  if (name === "bow" || name.includes("bow") || name.includes("crossbow")) return "bow";
  if (name === "darts" || name.includes("dart") || name.includes("throwing")) return "darts";
  if (name === "staff" || name.includes("staff") || name.includes("wand") || name.includes("scepter")) return "staff";
  if (name === "focus" || name.includes("orb") || name.includes("book") || name.includes("focus")) return "focus";
  return "blade";
}


/* ==========================================================================
   Archetype Similarity Vector Resolver (7-Dimensional Cosine Similarity)
   Stats Vector Layout: [Strength, Agility, Wisdom, Intelligence, Insight, Vitality, Charisma]
   ========================================================================== */

const ARCHETYPE_SIGNATURES = {
  "Warrior":   [1.0, 0.4, 0.0, 0.0, 0.0, 0.8, 0.0], // High Str & Vit
  "Ranger":    [0.4, 1.0, 0.0, 0.0, 0.7, 0.4, 0.0], // High Agi & Ins
  "Scholar":   [0.0, 0.0, 1.0, 1.0, 0.4, 0.0, 0.0], // High Wis & Int
  "Alchemist": [0.0, 0.0, 0.3, 0.7, 1.0, 0.4, 0.0], // High Ins & Int
  "Bard":      [0.0, 0.5, 0.0, 0.0, 0.3, 0.0, 1.0], // High Cha & Agi
  "Crafter":   [0.8, 0.0, 0.0, 0.0, 0.3, 0.8, 0.4], // High Str & Vit & Insight
  "Merchant":  [0.0, 0.0, 0.7, 0.3, 0.0, 0.0, 1.0]  // High Cha & Wis
};

/**
 * Calculates the player's archetype based on cosine similarity of behavior vectors.
 * @param {number[]} stats - Array of 7 stat levels [Str, Agi, Wis, Int, Ins, Vit, Cha]
 * @returns {string} - Matching Archetype name
 */
export function calculateArchetype(stats) {
  // If no stats are leveled yet, player is a Novice
  const sum = stats.reduce((a, b) => a + b, 0);
  if (sum <= 7) return "Novice";

  let bestArchetype = "Novice";
  let maxSimilarity = -1;

  for (const [name, signature] of Object.entries(ARCHETYPE_SIGNATURES)) {
    const similarity = cosineSimilarity(stats, signature);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestArchetype = name;
    }
  }

  return bestArchetype;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* ==========================================================================
   Destiny Paths & Classes
   ========================================================================== */

export const CLASS_PATHS = [
  // TIER 1 (Roots)
  { name: "Commoner", tier: 1, parentId: null, reqs: {}, desc: "Free unlock", ability: "Jack of All Trades: Balanced baseline." },
  { name: "Wanderer", tier: 1, parentId: null, reqs: {}, desc: "Free unlock", ability: "Swift Stride: Faster exploration." },
  { name: "Street Rat", tier: 1, parentId: null, reqs: {}, desc: "Free unlock", ability: "Evasion: Chance to dodge." },
  
  // TIER 2
  { name: "Fighter", tier: 2, parentId: "Commoner", reqs: { level: 10, strength: 10, vitality: 5 }, desc: "Req: Lvl 10, Str 10, Vit 5", ability: "Cleave: Every 4th turn, next strike deals 2x damage." },
  { name: "Rogue", tier: 2, parentId: "Street Rat", reqs: { level: 10, agility: 10, insight: 5 }, desc: "Req: Lvl 10, Agi 10, Ins 5", ability: "Vanish: Every 5th turn, guarantees a 100% dodge." },
  { name: "Mage", tier: 2, parentId: "Commoner", reqs: { level: 10, intelligence: 10, wisdom: 5 }, desc: "Req: Lvl 10, Int 10, Wis 5", ability: "Fireball: Every 3rd turn, deals 1.5x dmg + Burn." },
  { name: "Ranger", tier: 2, parentId: "Wanderer", reqs: { level: 10, agility: 10, strength: 5 }, desc: "Req: Lvl 10, Agi 10, Str 5", ability: "Piercing Shot: Ignores 50% enemy armor on crits." },

  // TIER 3 - WARRIOR
  { name: "Paladin", tier: 3, parentId: "Fighter", reqs: { level: 25, strength: 20, vitality: 20 }, desc: "Req: Lvl 25, Str 20, Vit 20", ability: "Holy Aegis: Superior survivability (+4 Armor, +15 Max HP)." },
  { name: "Berserker", tier: 3, parentId: "Fighter", reqs: { level: 25, strength: 30, vitality: 10 }, desc: "Req: Lvl 25, Str 30, Vit 10", ability: "Enrage: Damage increases by 20% when under 50% HP." },
  // TIER 4 - WARRIOR
  { name: "Templar", tier: 4, parentId: "Paladin", reqs: { level: 50, strength: 40, vitality: 40 }, desc: "Req: Lvl 50, Str 40, Vit 40", ability: "Divine Shield: Negates one attack every 6 turns." },
  { name: "Warlord", tier: 4, parentId: "Berserker", reqs: { level: 50, strength: 60, vitality: 20 }, desc: "Req: Lvl 50, Str 60, Vit 20", ability: "Tactical Command: +5 Attack, +3 Damage, +2 Armor." },
  // TIER 5 - WARRIOR
  { name: "Holy Sovereign", tier: 5, parentId: "Templar", reqs: { level: 75, strength: 65, vitality: 65 }, desc: "Req: Lvl 75, Str 65, Vit 65", ability: "Aura of Light: Heals 5 HP every turn." },
  { name: "God-Warrior", tier: 5, parentId: "Warlord", reqs: { level: 75, strength: 100, vitality: 30 }, desc: "Req: Lvl 75, Str 100, Vit 30", ability: "Ascension: Massive stat boosts across all metrics." },

  // TIER 3 - ROGUE
  { name: "Assassin", tier: 3, parentId: "Rogue", reqs: { level: 25, agility: 25, insight: 15 }, desc: "Req: Lvl 25, Agi 25, Ins 15", ability: "Lethality: Critical hits deal 3x damage instead of 2x." },
  { name: "Nightstalker", tier: 3, parentId: "Rogue", reqs: { level: 25, agility: 20, insight: 20 }, desc: "Req: Lvl 25, Agi 20, Ins 20", ability: "Shadow Dance: +15% base Dodge." },
  // TIER 4 - ROGUE
  { name: "Executioner", tier: 4, parentId: "Assassin", reqs: { level: 50, agility: 50, insight: 30 }, desc: "Req: Lvl 50, Agi 50, Ins 30", ability: "Cull the Weak: Auto-kill non-bosses under 15% HP." },
  { name: "Phantom", tier: 4, parentId: "Nightstalker", reqs: { level: 50, agility: 40, insight: 40 }, desc: "Req: Lvl 50, Agi 40, Ins 40", ability: "Ghost Step: Dodging an attack restores 2 HP." },
  // TIER 5 - ROGUE
  { name: "Shadow Sovereign", tier: 5, parentId: "Executioner", reqs: { level: 75, agility: 80, insight: 50 }, desc: "Req: Lvl 75, Agi 80, Ins 50", ability: "Death Mark: Every 3rd attack is a guaranteed critical." },
  { name: "Mirage Blade", tier: 5, parentId: "Phantom", reqs: { level: 75, agility: 65, insight: 65 }, desc: "Req: Lvl 75, Agi 65, Ins 65", ability: "Illusionary Strikes: 20% chance to attack twice." },

  // TIER 3 - MAGE
  { name: "Sorcerer", tier: 3, parentId: "Mage", reqs: { level: 25, intelligence: 30, wisdom: 10 }, desc: "Req: Lvl 25, Int 30, Wis 10", ability: "Overload: +20% magic damage." },
  { name: "Illusionist", tier: 3, parentId: "Mage", reqs: { level: 25, intelligence: 20, wisdom: 20 }, desc: "Req: Lvl 25, Int 20, Wis 20", ability: "Mirror Image: Reduces enemy accuracy by 2." },
  // TIER 4 - MAGE
  { name: "Archmage", tier: 4, parentId: "Sorcerer", reqs: { level: 50, intelligence: 60, wisdom: 20 }, desc: "Req: Lvl 50, Int 60, Wis 20", ability: "Arcane Mastery: Ignore 15% of enemy defense." },
  { name: "Chronomancer", tier: 4, parentId: "Illusionist", reqs: { level: 50, intelligence: 40, wisdom: 40 }, desc: "Req: Lvl 50, Int 40, Wis 40", ability: "Time Warp: 10% chance to take an extra turn." },
  // TIER 5 - MAGE
  { name: "Astral Weaver", tier: 5, parentId: "Archmage", reqs: { level: 75, intelligence: 100, wisdom: 30 }, desc: "Req: Lvl 75, Int 100, Wis 30", ability: "Meteor Swarm: Massive damage spike every 6 turns." },
  { name: "Fate Weaver", tier: 5, parentId: "Chronomancer", reqs: { level: 75, intelligence: 65, wisdom: 65 }, desc: "Req: Lvl 75, Int 65, Wis 65", ability: "Rewrite Destiny: Fatal blows leave you at 1 HP (Once per battle)." },

  // TIER 3 - RANGER
  { name: "Hunter", tier: 3, parentId: "Ranger", reqs: { level: 25, agility: 25, strength: 15 }, desc: "Req: Lvl 25, Agi 25, Str 15", ability: "Marksmanship: +3 Attack (Accuracy)." },
  { name: "Beastmaster", tier: 3, parentId: "Ranger", reqs: { level: 25, agility: 15, strength: 25 }, desc: "Req: Lvl 25, Agi 15, Str 25", ability: "Feral Companion: A wolf attacks for 2 damage every turn." },
  // TIER 4 - RANGER
  { name: "Sniper", tier: 4, parentId: "Hunter", reqs: { level: 50, agility: 50, strength: 30 }, desc: "Req: Lvl 50, Agi 50, Str 30", ability: "Headshot: 5% chance to instantly kill non-boss enemies." },
  { name: "Pack Leader", tier: 4, parentId: "Beastmaster", reqs: { level: 50, agility: 30, strength: 50 }, desc: "Req: Lvl 50, Agi 30, Str 50", ability: "Primal Roar: Boosts companion damage to 5 per turn." },
  // TIER 5 - RANGER
  { name: "Apex Predator", tier: 5, parentId: "Sniper", reqs: { level: 75, agility: 80, strength: 50 }, desc: "Req: Lvl 75, Agi 80, Str 50", ability: "True Strike: Attacks cannot miss or be dodged." },
  { name: "Alpha", tier: 5, parentId: "Pack Leader", reqs: { level: 75, agility: 50, strength: 80 }, desc: "Req: Lvl 75, Agi 50, Str 80", ability: "Call of the Wild: Summons an entire pack (15 dmg/turn)." }
];

export function hasClassUnlocked(prog, className) {
  if (!prog || !prog.unlockedClasses) {
    // Fallback for older saves before unlockedClasses was added
    return prog?.currentClass === className;
  }
  return prog.unlockedClasses.includes(className);
}

/* ==========================================================================
   Dungeon Data Config & Encounter Registry
   ========================================================================== */

export const DUNGEONS = [
  {
    id: "woods",
    name: "Whispering Woods",
    biome: "forest",
    stepRequirement: 0,
    levelRequirement: 1,
    baseXPMultiplier: 1.0,
    baseGoldMultiplier: 1.0,
    description: "A dark canopy filled with mischievous sprites and wild woodland beats.",
    icon: "🌲",
    color: "var(--emerald-green)",
    monsters: [
      { name: "Forest Sprite", hp: 15, att: 2, def: 1, xp: 12 },
      { name: "Wild Woodwolf", hp: 20, att: 3, def: 2, xp: 20 },
      { name: "Corrupted Treant", hp: 35, att: 4, def: 3, xp: 45 }
    ],
    boss: { name: "Elder Druid Shade", hp: 60, att: 6, def: 4, xp: 150 }
  },
  {
    id: "caves",
    name: "Glimmering Caves",
    biome: "cave",
    stepRequirement: 25000,
    levelRequirement: 5,
    baseXPMultiplier: 1.25,
    baseGoldMultiplier: 1.2,
    description: "Luminous crystalline walls that echo with the pickaxes of goblin miners.",
    icon: "💎",
    color: "var(--sapphire-blue)",
    monsters: [
      { name: "Goblin Scavenger", hp: 25, att: 4, def: 2, xp: 35 },
      { name: "Cave Bat Swarm", hp: 18, att: 5, def: 1, xp: 25 },
      { name: "Crystalline Horror", hp: 45, att: 6, def: 5, xp: 75 }
    ],
    boss: { name: "Gemstone Colossus", hp: 90, att: 8, def: 8, xp: 300 }
  },
  {
    id: "ruins",
    name: "Shaded Ruins",
    biome: "ruins",
    stepRequirement: 100000,
    levelRequirement: 12,
    baseXPMultiplier: 1.6,
    baseGoldMultiplier: 1.5,
    description: "The crumbling archways of an ancient empire, now prowled by residual spirits.",
    icon: "🏛️",
    color: "var(--parchment-shadow)",
    monsters: [
      { name: "Spectral Archer", hp: 40, att: 7, def: 4, xp: 80 },
      { name: "Stone Gargoyle", hp: 55, att: 6, def: 7, xp: 110 },
      { name: "Tomb Wraith", hp: 50, att: 9, def: 3, xp: 120 }
    ],
    boss: { name: "Lich King Remnant", hp: 130, att: 11, def: 8, xp: 500 }
  },
  {
    id: "citadel",
    name: "Forgotten Citadel",
    biome: "castle",
    stepRequirement: 300000,
    levelRequirement: 25,
    baseXPMultiplier: 2.1,
    baseGoldMultiplier: 2.0,
    description: "A dark castle floating above burning chasms, guarded by elite black knights.",
    icon: "🏰",
    color: "var(--ruby-crimson)",
    monsters: [
      { name: "Citadel Guard", hp: 70, att: 11, def: 9, xp: 200 },
      { name: "Chasmic Imp", hp: 45, att: 13, def: 4, xp: 175 },
      { name: "Armored Wyvern", hp: 90, att: 12, def: 11, xp: 320 }
    ],
    boss: { name: "Dread Knight Overlord", hp: 200, att: 16, def: 13, xp: 1000 }
  },
  {
    id: "vaults",
    name: "Ancient Vaults",
    biome: "vault",
    stepRequirement: 1000000,
    levelRequirement: 40,
    baseXPMultiplier: 3.0,
    baseGoldMultiplier: 3.0,
    description: "The cosmic chamber where the origin ledger is buried, guarded by ancient chronomancers.",
    icon: "🪐",
    color: "var(--gold-primary)",
    monsters: [
      { name: "Aether Sentry", hp: 100, att: 15, def: 13, xp: 450 },
      { name: "Void Stalker", hp: 80, att: 18, def: 10, xp: 420 },
      { name: "Temporal Warden", hp: 120, att: 16, def: 15, xp: 600 }
    ],
    boss: { name: "Chronos Cosmic Dragon", hp: 350, att: 22, def: 18, xp: 2500 }
  }
];

/* ==========================================================================
   Light Automated Dice Combat & Loot Resolver
   ========================================================================== */

/**
 * Resolves one combat tick.
 * Returns combat log detailing hits, misses, damage, and active HP changes.
 */
export function rollCombatTick(player, enemy, playerRange = 1, progression = null) {
  const prog = progression || {
    currentClass: "Commoner",
    equippedCore: "Iron",
    coreRanks: { Iron: 1 },
    equippedRelic: null,
    weaponXP: { blade: 0, axe: 0, spear: 0, dagger: 0, staff: 0, focus: 0 },
    monsterCodex: {},
    materials: {}
  };

  const monsterName = enemy.name.toLowerCase();
  const isMonsterRanged = monsterName.includes("sprite") || 
                          monsterName.includes("archer") || 
                          monsterName.includes("imp") || 
                          monsterName.includes("wraith") || 
                          monsterName.includes("lich") || 
                          monsterName.includes("warden") || 
                          monsterName.includes("dragon");
  const monsterRange = isMonsterRanged ? 5 : 1;

  let logDetails = [];
  let playerHit = false;
  let playerDmg = 0;
  let enemyHit = false;
  let enemyDmg = 0;
  let enemySwung = false; // Tracks if monster attempted an attack this tick

  enemy.maxHp = enemy.maxHp || enemy.hp;

  // Initialize player shield at the start of combat if Vanguard Core is equipped
  if (player.shieldHP === undefined) {
    if (prog.equippedCore === "Vanguard") {
      const coreRank = prog.coreRanks.Vanguard || 1;
      player.shieldHP = coreRank * 5;
      logDetails.push(`🛡️ Vanguard Core activated! Gained a shield of ${player.shieldHP} HP.`);
    } else {
      player.shieldHP = 0;
    }
  }

  // Combat turn increment
  if (enemy.combatTurn === undefined) {
    enemy.combatTurn = 0;
  }
  enemy.combatTurn++;

  // Apply Burn DoT on Enemy if active
  if (enemy.burnTicks && enemy.burnTicks > 0) {
    const burnDmg = 3;
    enemy.hp = Math.max(0, enemy.hp - burnDmg);
    enemy.burnTicks--;
    logDetails.push(`🔥 The ${enemy.name} burns for ${burnDmg} damage (${enemy.burnTicks} burn turns left).`);
  }

  // 1. Player Turn (Attack or Advance)
  if (enemy.currentDistance > playerRange) {
    enemy.currentDistance = Math.max(playerRange, enemy.currentDistance - 2);
    logDetails.push(`🏃 You advance closer to the ${enemy.name} (Distance: ${enemy.currentDistance}m).`);
  } else {
    // In range!
    let activeAbilityUsed = false;
    let dmgMultiplier = 1.0;
    let bypassEnemyDefense = false;
    let forceCrit = false;

    // Class Skill Triggers (Stacking)
    if (hasClassUnlocked(prog, "Fighter") && enemy.combatTurn % 4 === 0) {
      logDetails.push(`⚔️ Ability [Cleave] triggered! Next strike deals double damage.`);
      dmgMultiplier *= 2.0;
      activeAbilityUsed = true;
    }
    if (hasClassUnlocked(prog, "Berserker") && player.currentHP < player.combatStats.maxHP * 0.5) {
      if (enemy.combatTurn === 1) logDetails.push(`😡 [Enrage] active! Damage increased by 20%.`);
      dmgMultiplier *= 1.2;
    }
    if (hasClassUnlocked(prog, "Holy Sovereign")) {
      player.currentHP = Math.min(player.combatStats.maxHP, player.currentHP + 5);
      if (enemy.combatTurn === 1) logDetails.push(`✨ [Aura of Light] heals you for 5 HP per turn.`);
    }

    if (hasClassUnlocked(prog, "Mage") && enemy.combatTurn % 3 === 0) {
      logDetails.push(`🧪 Ability [Fireball] triggered! Cast fire blast on ${enemy.name}.`);
      dmgMultiplier *= 1.5;
      enemy.burnTicks = 3;
      activeAbilityUsed = true;
    }
    if (hasClassUnlocked(prog, "Sorcerer")) {
      dmgMultiplier *= 1.2;
    }
    if (hasClassUnlocked(prog, "Astral Weaver") && enemy.combatTurn % 6 === 0) {
      logDetails.push(`☄️ Ability [Meteor Swarm] triggered! Massive damage spike.`);
      dmgMultiplier *= 3.0;
    }

    if (hasClassUnlocked(prog, "Beastmaster")) {
      const petDmg = hasClassUnlocked(prog, "Pack Leader") ? 5 : 2;
      const petName = hasClassUnlocked(prog, "Alpha") ? "Wolf Pack" : "Feral Companion";
      const actualPetDmg = hasClassUnlocked(prog, "Alpha") ? 15 : petDmg;
      enemy.hp = Math.max(0, enemy.hp - actualPetDmg);
      logDetails.push(`🐺 [${petName}] attacked ${enemy.name} for ${actualPetDmg} damage!`);
    }
    if (hasClassUnlocked(prog, "Sniper") && Math.random() < 0.05 && !enemy.isBoss) {
      logDetails.push(`🎯 Ability [Headshot] triggered! Instantly killed ${enemy.name}.`);
      enemy.hp = 0;
    }
    if (hasClassUnlocked(prog, "Apex Predator")) {
       forceCrit = true;
       bypassEnemyDefense = true;
    }

    if (hasClassUnlocked(prog, "Executioner") && enemy.hp > 0 && enemy.hp < enemy.maxHp * 0.15 && !enemy.isBoss) {
       logDetails.push(`🗡️ Ability [Cull the Weak] executed ${enemy.name}.`);
       enemy.hp = 0;
    }
    if (hasClassUnlocked(prog, "Shadow Sovereign") && enemy.combatTurn % 3 === 0) {
      logDetails.push(`💀 Ability [Death Mark] triggered! Guaranteed critical hit.`);
      forceCrit = true;
    }
    if (hasClassUnlocked(prog, "Mirage Blade") && Math.random() < 0.2) {
       logDetails.push(`⚔️ Ability [Illusionary Strikes] triggered! Double attack.`);
       dmgMultiplier *= 2.0;
    }

    if (hasClassUnlocked(prog, "Commoner") && player.currentHP < player.combatStats.maxHP * 0.3 && !player.gritActive) {
      logDetails.push(`🛡️ Ability [Grit] triggered! Gained temporary +5 armor rating.`);
      player.gritActive = true;
      player.combatStats.defense += 5;
    }

    // Weapon Affinity Effects
    const mainHandName = player.equippedMainHandName || "";
    const weaponKey = getWeaponMasteryKey(mainHandName);
    const affinity = weaponKey ? prog.weaponAffinities[weaponKey] : null;

    let critMultiplier = 2.0;
    // Insight adds up to 0.5 crit multiplier (+0.1 per 5 Insight)
    critMultiplier += Math.floor((player.skillsLevels?.insight || 0) / 5) * 0.1;

    if (hasClassUnlocked(prog, "Assassin")) critMultiplier = 3.0; // Overrides standard crits
    if (prog.currentClass === "Duel Master" || prog.currentClass === "Shadow Blade") {
      critMultiplier = Math.max(critMultiplier, 2.5);
    }
    if (affinity === "Shadow") {
      critMultiplier += 0.5; // Extra shadow crit multiplier
    }

    // Determine defense ignores
    let intArmorPen = Math.floor((player.skillsLevels?.intelligence || 0) / 4);
    let effectiveEnemyDef = Math.max(0, enemy.def - intArmorPen);
    
    if (hasClassUnlocked(prog, "Archmage")) {
      effectiveEnemyDef = Math.max(0, Math.floor(effectiveEnemyDef * 0.85)); // Ignore 15% armor
    }
    if (affinity === "Void") {
      effectiveEnemyDef = Math.max(0, Math.floor(effectiveEnemyDef * 0.7)); // Ignore 30% armor
    }

    // Roll Player Accuracy Hit
    const playerRoll = Math.floor(Math.random() * 20) + 1 + player.combatStats.attack;
    const enemyDefense = effectiveEnemyDef + 10;
    playerHit = (playerRoll >= enemyDefense) || bypassEnemyDefense;

    // Apply Frost Affinity debuff on hit
    if (playerHit && affinity === "Frost") {
      enemy.def = Math.max(0, enemy.def - 1);
      logDetails.push(`❄️ Frost affinity chilled the ${enemy.name}, reducing defense rating!`);
    }

    if (playerHit && enemy.hp > 0) {
      // Crit Chance check
      let critChance = 5 + Math.floor((player.skillsLevels?.agility || 0) / 6);
      if (weaponKey === "dagger") critChance += 10;
      if (weaponKey === "bow") critChance += 10;
      if (weaponKey === "darts") critChance += 15;
      if (hasClassUnlocked(prog, "Fighter")) critChance += 15;
      if (prog.equippedRelic === "Lucky Coin") critChance += 5;
      if (prog.equippedRelic === "Assassin's Mark") critChance += 10;

      // Codex Kills crit bonus (kills >= 10 adds 0.25% crit per monster)
      let codexBonus = 0;
      for (const [_, kCount] of Object.entries(prog.monsterCodex)) {
        if (kCount >= 10) codexBonus += 0.25;
      }
      critChance += Math.floor(codexBonus);

      const isCrit = (Math.random() * 100 < critChance) || forceCrit;

      playerDmg = Math.max(1, Math.floor(Math.random() * player.combatStats.damageRange) + 1 + Math.floor(player.combatStats.attack / 3));
      playerDmg = Math.floor(playerDmg * dmgMultiplier);

      if (isCrit) {
        playerDmg = Math.floor(playerDmg * critMultiplier);
        playerHit = "crit"; // Indicate critical hit in logs!
        if (hasClassUnlocked(prog, "Ranger")) {
           let rangerPen = Math.floor(effectiveEnemyDef * 0.5);
           playerDmg += rangerPen;
        }
      }

      if (affinity === "Storm") {
        playerDmg += 3; // Storm chain damage
      }

      enemy.hp = Math.max(0, enemy.hp - playerDmg);
    }
  }

  // 2. Monster Turn (Attack or Advance)
  if (enemy.hp > 0) {
    if (enemy.currentDistance > monsterRange) {
      enemy.currentDistance = Math.max(1, enemy.currentDistance - 2);
      logDetails.push(`👣 The ${enemy.name} stalks closer (Distance: ${enemy.currentDistance}m).`);
    } else {
      // In range!
      // Check player dodge rate
      let dodgeChance = 1 + Math.floor((player.skillsLevels?.agility || 0) / 4);
      if (hasClassUnlocked(prog, "Street Rat")) dodgeChance += 10;
      if (hasClassUnlocked(prog, "Nightstalker")) dodgeChance += 15;
      
      const coreRank = prog.coreRanks[prog.equippedCore] || 0;
      if (prog.equippedCore === "Mirage") dodgeChance += coreRank * 1.5;

      const isDodged = Math.random() * 100 < dodgeChance;

      // Special active dodge ability (Rogue Vanish every 5 turns)
      let isVanished = false;
      if (hasClassUnlocked(prog, "Rogue") && enemy.combatTurn % 5 === 0) {
        logDetails.push(`💨 Active Ability [Vanish] triggered! Gained 100% dodge.`);
        isVanished = true;
      }
      
      let negateHit = false;
      if (hasClassUnlocked(prog, "Templar") && enemy.combatTurn % 6 === 0) {
        logDetails.push(`🛡️ Ability [Divine Shield] triggered! Negated incoming attack.`);
        negateHit = true;
      }

      if (isDodged || isVanished) {
        logDetails.push(`💨 You gracefully dodged the ${enemy.name}'s attack!`);
        if (hasClassUnlocked(prog, "Phantom")) {
           player.currentHP = Math.min(player.combatStats.maxHP, player.currentHP + 2);
           logDetails.push(`👻 [Ghost Step] restored 2 HP from dodging!`);
        }
      } else if (negateHit) {
        // Attack negated
      } else {
        enemySwung = true;
        const enemyRoll = Math.floor(Math.random() * 20) + 1 + enemy.att;
        let playerDefense = player.combatStats.defense + 10;
        
        if (hasClassUnlocked(prog, "Illusionist")) {
          playerDefense += 2; // effectively reduces enemy accuracy by 2
        }

        enemyHit = enemyRoll >= playerDefense;

        if (enemyHit) {
          enemyDmg = Math.max(1, Math.floor(Math.random() * Math.max(3, enemy.att)) + 1 - Math.floor(player.combatStats.defense / 4));
          
          // Core damage reduction block
          let dmgBlock = 0;
          if (prog.equippedCore === "Iron") {
            dmgBlock = coreRank * 1;
          } else if (prog.equippedCore === "Juggernaut") {
            dmgBlock = Math.floor(coreRank * 0.5);
          }
          if (dmgBlock > 0) {
            enemyDmg = Math.max(1, enemyDmg - dmgBlock);
          }

          // Damage absorption by Shield
          if (player.shieldHP > 0) {
            const absorbed = Math.min(player.shieldHP, enemyDmg);
            player.shieldHP -= absorbed;
            enemyDmg -= absorbed;
            logDetails.push(`🛡️ Shield absorbed ${absorbed} damage (${player.shieldHP} shield HP remaining).`);
          }

          if (enemyDmg > 0) {
            if (hasClassUnlocked(prog, "Fate Weaver") && player.currentHP <= enemyDmg && !player.fateWeaverUsed) {
               logDetails.push(`⏳ [Rewrite Destiny] triggered! Fatal blow negated, left at 1 HP.`);
               player.currentHP = 1;
               player.fateWeaverUsed = true;
            } else {
               player.currentHP = Math.max(0, player.currentHP - enemyDmg);
            }
          } else {
            enemyHit = false; // Negated
          }
        }
      }
    }
  }

  return {
    playerHit,
    playerDmg,
    enemyHit,
    enemyDmg,
    enemySwung,
    enemyHP: enemy.hp,
    playerHP: player.currentHP,
    logDetails
  };
}

/**
 * Procedural Equipment Loot Generator
 * Creates custom styled SVGs and medieval stats based on dungeon rarity triggers.
 */
export function generateProceduralLoot(dungeonId) {
  const dungeon = DUNGEONS.find(d => d.id === dungeonId) || DUNGEONS[0];
  const mult = dungeon.baseGoldMultiplier;

  // Decide Rarity
  const roll = Math.random();
  let rarity = "Common";
  let rarityColor = "var(--ink-charcoal)";
  let statBonus = 1;

  if (roll > 0.98 && dungeonId !== "woods") {
    rarity = "Legendary";
    rarityColor = "var(--gold-primary)";
    statBonus = Math.floor(5 * mult);
  } else if (roll > 0.88 && dungeonId !== "woods") {
    rarity = "Epic";
    rarityColor = "var(--ruby-crimson)";
    statBonus = Math.floor(3 * mult);
  } else if (roll > 0.55) {
    rarity = "Rare";
    rarityColor = "var(--sapphire-blue)";
    statBonus = Math.floor(2 * mult);
  } else {
    rarity = "Common";
    rarityColor = "var(--ink-muted)";
    statBonus = Math.floor(1 * mult);
  }

  // Equipment Slot Choice
  const slots = ["helmet", "chestArmor", "gloves", "boots", "mainHand", "offHand"];
  const slot = slots[Math.floor(Math.random() * slots.length)];

  // Equipment Names Registry
  const names = {
    helmet: ["Iron Casque", "Knight Visor", "Great Helm", "Rogue Hood", "Wizard Cowl", "Runed Crown"],
    chestArmor: ["Chainmail Hauberk", "Steel Platebody", "Hardened Leather Coat", "Scholar Robes", "Gilded Brigandine"],
    gloves: ["Steel Gauntlets", "Leather Vambraces", "Slik Mittens", "Runed Bracers"],
    boots: ["Iron Greaves", "Sabatons", "Soft Leather Boots", "Scholar Sandals"],
    mainHand: ["Broad Sword", "Steel Scimitar", "Dagger of Swiftness", "Wisdom Staff", "Battle Axe", "Halberd", "Shortbow of Swiftness", "Runed Longbow"],
    offHand: ["Bronze Kite Shield", "Steel Round Shield", "Spell Spellbook", "Insight Orb", "Buckler"]
  };

  const baseName = names[slot][Math.floor(Math.random() * names[slot].length)];
  const itemName = `[${rarity}] ${baseName}`;

  // Stat allocation based on slot
  let stats = { attack: 0, defense: 0, speed: 0, intelligence: 0, wisdom: 0 };
  
  if (slot === "mainHand") {
    stats.attack = statBonus * 2;
    stats.speed = statBonus;
  } else if (slot === "offHand") {
    stats.defense = statBonus * 2;
    stats.wisdom = statBonus;
  } else if (slot === "chestArmor") {
    stats.defense = statBonus * 3;
  } else if (slot === "helmet") {
    stats.defense = statBonus;
    stats.intelligence = statBonus;
  } else if (slot === "gloves") {
    stats.attack = statBonus;
    stats.defense = statBonus;
  } else if (slot === "boots") {
    stats.defense = statBonus;
    stats.speed = statBonus * 2;
  }

  // Sell value
  const goldValue = Math.floor((statBonus * 12 + Math.random() * 15) * mult);

  return {
    id: `item-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    name: itemName,
    slot,
    rarity,
    rarityColor,
    stats,
    goldValue,
    icon: getItemIconSVG(slot, rarityColor)
  };
}

function getItemIconSVG(slot, color) {
  // Generates clean embedded visual inline SVG tags for slots
  const svgStart = `<svg viewBox="0 0 100 100" style="width:100%; height:100%; fill:${color}; stroke:var(--ink-charcoal); stroke-width:3px;">`;
  const svgEnd = `</svg>`;
  let paths = "";

  if (slot === "mainHand") {
    // Sword
    paths = `<path d="M70 20 L80 30 L55 55 L45 45 Z" /><path d="M40 40 L50 50 L45 55 L35 45 Z" fill="var(--ink-muted)" /><circle cx="30" cy="70" r="6" />`;
  } else if (slot === "offHand") {
    // Shield
    paths = `<path d="M30 20 H70 C70 50, 50 80, 50 80 C50 80, 30 50, 30 20 Z" />`;
  } else if (slot === "helmet") {
    // Helm
    paths = `<circle cx="50" cy="50" r="30" /><path d="M35 50 H65 V65 H35 Z" fill="rgba(0,0,0,0.3)" /><path d="M50 20 V50" stroke="var(--gold-primary)" stroke-width="4px" />`;
  } else if (slot === "chestArmor") {
    // Cuirass
    paths = `<path d="M30 20 H70 L75 55 L65 80 H35 L25 55 Z" /><circle cx="50" cy="45" r="10" fill="rgba(0,0,0,0.1)" />`;
  } else if (slot === "gloves") {
    // Gauntlets
    paths = `<path d="M35 40 H65 L60 80 H40 Z" /><circle cx="50" cy="50" r="4" />`;
  } else if (slot === "boots") {
    // Shoes
    paths = `<path d="M30 40 H55 V60 H70 V75 H30 Z" />`;
  }

  return svgStart + paths + svgEnd;
}

/**
 * Renders full layered hero avatar SVG based on cosmetics, skin tone, hair, aura, and archetype.
 */
export function getLayeredAvatarSVG(state, derived) {
  const cosmetics = (state && state.profile && state.profile.cosmetics) || { equippedHair: 'default-hair', equippedSkin: 'default-skin', equippedAura: 'none-aura' };
  const archetype = (state && state.profile && state.profile.archetype) || "Novice";
  const currentClass = (state && state.progression && state.progression.currentClass) || "Novice";
  const forgeLevel = (state && state.progression && state.progression.armorForge && state.progression.armorForge.level) || 1;
  
  // High-fidelity skin tone palettes (highlight, base, shadow)
  const skinPalettes = {
    'default-skin': { high: '#fff1f2', base: '#fecdd3', shadow: '#e11d48', dark: '#9f1239' }, // Fair porcelain
    'olive-skin':   { high: '#fed7aa', base: '#f59e0b', shadow: '#b45309', dark: '#78350f' }, // Olive / Warm Bronze
    'sunkissed-skin':{ high: '#fed7aa', base: '#d97706', shadow: '#92400e', dark: '#451a03' }, // Sun-drenched Amber
    'ebony-skin':   { high: '#78350f', base: '#451a03', shadow: '#271003', dark: '#140801' }, // Noble Obsidian
    'ethereal-skin':{ high: '#bae6fd', base: '#38bdf8', shadow: '#0284c7', dark: '#0c4a6e' }, // Astral Celestial
    'crimson-skin': { high: '#fca5a5', base: '#dc2626', shadow: '#991b1b', dark: '#450a0a' }, // Demonic Fiend
    'golden-skin':  { high: '#fef08a', base: '#eab308', shadow: '#a16207', dark: '#713f12' }  // Divine Radiance
  };
  const skin = skinPalettes[cosmetics.equippedSkin] || skinPalettes['default-skin'];

  // Armor Forge Progression Tier Themes (Tier 1 to 10)
  // 1: Rags / Padded Tunic, 2: Novice Leather, 3: Reinforced Leather, 4: Hardened Mail,
  // 5: Reinforced Plate, 6: Hardened Steel, 7: Runed Aegis, 8: Chrono Ward, 9: Sovereign Plate, 10: Celestial Bulwark
  const armorTiersVisual = [
    { name: "Rags", plateHigh: "#a8a29e", plateBase: "#78716c", plateDark: "#44403c", trim: "#57534e", gem: "#a8a29e", cape: "#57534e", helmColor: "#78716c", spikes: false, wings: false, glow: "none" },
    { name: "Novice Leather", plateHigh: "#b45309", plateBase: "#92400e", plateDark: "#451a03", trim: "#78350f", gem: "#f59e0b", cape: "#78350f", helmColor: "#92400e", spikes: false, wings: false, glow: "none" },
    { name: "Reinforced Leather", plateHigh: "#d97706", plateBase: "#b45309", plateDark: "#451a03", trim: "#f59e0b", gem: "#fbbf24", cape: "#991b1b", helmColor: "#b45309", spikes: false, wings: false, glow: "none" },
    { name: "Hardened Mail", plateHigh: "#cbd5e1", plateBase: "#64748b", plateDark: "#334155", trim: "#94a3b8", gem: "#38bdf8", cape: "#1e3a8a", helmColor: "#475569", spikes: false, wings: false, glow: "none" },
    { name: "Reinforced Plate", plateHigh: "#e2e8f0", plateBase: "#475569", plateDark: "#1e293b", trim: "#f59e0b", gem: "#eab308", cape: "#991b1b", helmColor: "#334155", spikes: true, wings: false, glow: "none" },
    { name: "Hardened Steel", plateHigh: "#f8fafc", plateBase: "#334155", plateDark: "#0f172a", trim: "#fbbf24", gem: "#f59e0b", cape: "#581c87", helmColor: "#1e293b", spikes: true, wings: false, glow: "rgba(245, 158, 11, 0.4)" },
    { name: "Runed Aegis", plateHigh: "#67e8f9", plateBase: "#0891b2", plateDark: "#164e63", trim: "#a5f3fc", gem: "#06b6d4", cape: "#1e1b4b", helmColor: "#0e7490", spikes: true, wings: false, glow: "#06b6d4" },
    { name: "Chrono Ward", plateHigh: "#e9d5ff", plateBase: "#7e22ce", plateDark: "#3b0764", trim: "#fde047", gem: "#c084fc", cape: "#4c1d95", helmColor: "#6b21a8", spikes: true, wings: true, glow: "#c084fc" },
    { name: "Sovereign Plate", plateHigh: "#fef08a", plateBase: "#d97706", plateDark: "#78350f", trim: "#ef4444", gem: "#dc2626", cape: "#7f1d1d", helmColor: "#b45309", spikes: true, wings: true, glow: "#f59e0b" },
    { name: "Celestial Bulwark", plateHigh: "#ffffff", plateBase: "#38bdf8", plateDark: "#0284c7", trim: "#fef08a", gem: "#facc15", cape: "#0284c7", helmColor: "#0284c7", spikes: true, wings: true, glow: "#38bdf8" }
  ];

  const currentTier = armorTiersVisual[Math.min(10, Math.max(1, forgeLevel)) - 1];

  // Dynamic Aura Layer
  let auraSVG = '';
  if (cosmetics.equippedAura === 'fire-aura') {
    auraSVG = `
      <defs>
        <radialGradient id="fire-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.8"/>
          <stop offset="50%" stop-color="#ef4444" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#fire-glow)" opacity="0.85">
        <animate attributeName="r" values="46;50;46" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <path d="M50 2 C52 14, 60 16, 56 26 C53 30, 48 30, 46 25 C43 18, 48 8, 50 2 Z" fill="#f59e0b" opacity="0.8">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="12s" repeatCount="indefinite"/>
      </path>
    `;
  } else if (cosmetics.equippedAura === 'holy-halo') {
    auraSVG = `
      <ellipse cx="50" cy="14" rx="24" ry="7" fill="none" stroke="#fde047" stroke-width="2.5" opacity="0.95" filter="drop-shadow(0 0 4px #facc15)"/>
      <ellipse cx="50" cy="14" rx="20" ry="5" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.9"/>
      <path d="M50 2 L50 8 M35 6 L38 11 M65 6 L62 11" stroke="#fef08a" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
    `;
  } else if (cosmetics.equippedAura === 'dragon-aura') {
    auraSVG = `
      <circle cx="50" cy="50" r="47" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="8 6" opacity="0.8">
        <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="16s" repeatCount="indefinite"/>
      </circle>
    `;
  } else if (cosmetics.equippedAura === 'storm-aura') {
    auraSVG = `
      <circle cx="50" cy="50" r="47" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="4 8" opacity="0.9">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#facc15" stroke-width="1.8" stroke-dasharray="10 6" opacity="0.8">
        <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="6s" repeatCount="indefinite"/>
      </circle>
    `;
  } else if (cosmetics.equippedAura === 'void-aura') {
    auraSVG = `
      <circle cx="50" cy="50" r="48" fill="none" stroke="#a855f7" stroke-width="3" stroke-dasharray="12 4" opacity="0.85">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="50" cy="50" r="42" fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="6 6" opacity="0.75">
        <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="10s" repeatCount="indefinite"/>
      </circle>
    `;
  } else if (cosmetics.equippedAura === 'demon-wings') {
    auraSVG = `
      <g opacity="0.95" filter="drop-shadow(0 0 4px rgba(239,68,68,0.5))">
        <!-- Left Wing -->
        <path d="M24 64 C6 44, 2 18, 18 10 C18 22, 2 34, 28 50 Z" fill="#450a0a" stroke="#ef4444" stroke-width="1.5"/>
        <path d="M18 10 C12 28, 18 42, 28 50" fill="none" stroke="#f87171" stroke-width="1"/>
        <!-- Right Wing -->
        <path d="M76 64 C94 44, 98 18, 82 10 C82 22, 98 34, 72 50 Z" fill="#450a0a" stroke="#ef4444" stroke-width="1.5"/>
        <path d="M82 10 C88 28, 82 42, 72 50" fill="none" stroke="#f87171" stroke-width="1"/>
      </g>
    `;
  } else if (cosmetics.equippedAura === 'gilded-crown') {
    auraSVG = `
      <g filter="drop-shadow(0 0 5px #fbbf24)">
        <polygon points="34,18 38,5 44,13 50,2 56,13 62,5 66,18" fill="#fbbf24" stroke="#78350f" stroke-width="1.2"/>
        <circle cx="50" cy="6" r="2" fill="#ef4444"/>
        <circle cx="38" cy="8" r="1.5" fill="#38bdf8"/>
        <circle cx="62" cy="8" r="1.5" fill="#38bdf8"/>
        <line x1="34" y1="18" x2="66" y2="18" stroke="#d97706" stroke-width="2.5"/>
      </g>
    `;
  } else if (forgeLevel >= 8) {
    // Master Forge Mythic Radiance
    auraSVG = `
      <circle cx="50" cy="50" r="47" fill="none" stroke="${currentTier.gem}" stroke-width="1.8" stroke-dasharray="5 4" opacity="0.75">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="20s" repeatCount="indefinite"/>
      </circle>
    `;
  }

  // Realistic Headwear & Hair Details that evolve with forge tier
  let headwearSVG = `
    <!-- Realistic Knight Helm with Visor Slit & Golden Crest -->
    <path d="M34 38 C34 20, 66 20, 66 38 C66 44, 63 56, 50 58 C37 56, 34 44, 34 38 Z" fill="${currentTier.helmColor}" stroke="#0f172a" stroke-width="2"/>
    <!-- Helm Highlights & Plates -->
    <path d="M38 34 C42 24, 58 24, 62 34" fill="none" stroke="${currentTier.plateHigh}" stroke-width="2"/>
    <path d="M50 18 L50 48" stroke="#1e293b" stroke-width="2.5"/>
    <path d="M50 15 L50 28" stroke="${currentTier.trim}" stroke-width="3.2" stroke-linecap="round"/>
    <!-- Glowing Visor Slit matching Forge Gem Power -->
    <path d="M38 39 Q50 42 62 39 L60 43 Q50 46 40 43 Z" fill="#0f172a"/>
    <path d="M41 41 Q50 43 59 41" stroke="${currentTier.gem}" stroke-width="1.8" stroke-linecap="round" opacity="0.95" ${currentTier.glow !== "none" ? `filter="drop-shadow(0 0 2px ${currentTier.gem})"` : ''}/>
    <!-- Lower Visor Breath Grille -->
    <circle cx="46" cy="49" r="0.9" fill="#1e293b"/>
    <circle cx="50" cy="49" r="0.9" fill="#1e293b"/>
    <circle cx="54" cy="49" r="0.9" fill="#1e293b"/>
    ${forgeLevel >= 5 ? `<polygon points="50,14 54,20 46,20" fill="${currentTier.trim}"/>` : ''}
    ${forgeLevel >= 9 ? `<polygon points="50,11 53,16 47,16" fill="${currentTier.gem}"/>` : ''}
  `;

  if (cosmetics.equippedHair === 'wizard-hood') {
    headwearSVG = `
      <path d="M26 50 C26 14, 74 14, 74 50 C74 54, 70 60, 65 62 C50 65, 35 62, 26 50 Z" fill="${currentTier.plateDark}" stroke="#0f172a" stroke-width="2"/>
      <path d="M32 46 C35 22, 65 22, 68 46" fill="none" stroke="${currentTier.trim}" stroke-width="2"/>
      <ellipse cx="50" cy="45" rx="14" ry="12" fill="#09090b"/>
      <circle cx="45" cy="44" r="1.8" fill="${currentTier.gem}" filter="drop-shadow(0 0 2px ${currentTier.gem})"/>
      <circle cx="55" cy="44" r="1.8" fill="${currentTier.gem}" filter="drop-shadow(0 0 2px ${currentTier.gem})"/>
      <polygon points="50,22 53,27 47,27" fill="${currentTier.trim}"/>
    `;
  } else if (cosmetics.equippedHair === 'viking-braid') {
    headwearSVG = `
      <path d="M32 38 C32 18, 68 18, 68 38 C68 44, 66 52, 64 58 L62 76 Q60 84 56 86 L56 76" fill="none" stroke="#b45309" stroke-width="6" stroke-linecap="round"/>
      <path d="M36 34 Q50 20 64 34" fill="none" stroke="${currentTier.trim}" stroke-width="4"/>
      <path d="M32 36 Q50 40 68 36" fill="none" stroke="${currentTier.plateDark}" stroke-width="4"/>
      <rect x="47" y="35" width="6" height="4" rx="1" fill="${currentTier.gem}"/>
      <circle cx="50" cy="47" r="14" fill="${skin.base}" stroke="#0f172a" stroke-width="2"/>
      <circle cx="45" cy="46" r="1.8" fill="#0f172a"/>
      <circle cx="55" cy="46" r="1.8" fill="#0f172a"/>
      <path d="M43 41 L47 51" stroke="#991b1b" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
      <path d="M38 52 C42 62, 58 62, 62 52 C64 65, 36 65, 38 52 Z" fill="#92400e"/>
    `;
  } else if (cosmetics.equippedHair === 'crown-laurels') {
    headwearSVG = `
      <circle cx="50" cy="46" r="15" fill="${skin.base}" stroke="#0f172a" stroke-width="2"/>
      <path d="M35 38 Q50 24 65 38" fill="none" stroke="#451a03" stroke-width="5" stroke-linecap="round"/>
      <path d="M30 36 C34 26, 44 26, 50 32 C56 26, 66 26, 70 36" fill="none" stroke="${currentTier.trim}" stroke-width="3" stroke-linecap="round"/>
      <polygon points="50,22 53,28 47,28" fill="${currentTier.gem}" filter="drop-shadow(0 0 2px ${currentTier.gem})"/>
      <circle cx="34" cy="33" r="2.5" fill="${currentTier.trim}"/>
      <circle cx="66" cy="33" r="2.5" fill="${currentTier.trim}"/>
      <circle cx="45" cy="46" r="1.8" fill="#0f172a"/>
      <circle cx="55" cy="46" r="1.8" fill="#0f172a"/>
    `;
  } else if (cosmetics.equippedHair === 'rogue-mask') {
    headwearSVG = `
      <circle cx="50" cy="46" r="15" fill="${skin.base}" stroke="#0f172a" stroke-width="2"/>
      <path d="M30 42 C30 20, 70 20, 70 42 C70 48, 66 54, 50 56 C34 54, 30 48, 30 42 Z" fill="#18181b" stroke="#09090b" stroke-width="2"/>
      <path d="M34 46 C34 56, 66 56, 66 46 L64 54 C58 58, 42 58, 36 54 Z" fill="#27272a" stroke="#09090b" stroke-width="1.5"/>
      <ellipse cx="44" cy="42" rx="3.5" ry="1.8" fill="#fef08a"/>
      <ellipse cx="56" cy="42" rx="3.5" ry="1.8" fill="#fef08a"/>
      <circle cx="44" cy="42" r="1" fill="#09090b"/>
      <circle cx="56" cy="42" r="1" fill="#09090b"/>
      <path d="M34 32 Q50 34 66 32" stroke="#71717a" stroke-width="2.5"/>
    `;
  } else if (cosmetics.equippedHair === 'braided-topknot') {
    headwearSVG = `
      <circle cx="50" cy="46" r="15" fill="${skin.base}" stroke="#0f172a" stroke-width="2"/>
      <circle cx="50" cy="22" r="7" fill="#292524" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="40" y1="20" x2="60" y2="24" stroke="#d97706" stroke-width="2.5"/>
      <path d="M34 36 C38 26, 62 26, 66 36 L68 44 C62 40, 38 40, 32 44 Z" fill="#292524"/>
      <circle cx="45" cy="45" r="1.8" fill="#0f172a"/>
      <circle cx="55" cy="45" r="1.8" fill="#0f172a"/>
    `;
  } else if (cosmetics.equippedHair === 'battle-scarred') {
    headwearSVG = `
      <circle cx="50" cy="46" r="15" fill="${skin.base}" stroke="#0f172a" stroke-width="2"/>
      <path d="M32 36 Q50 38 68 36 L67 42 Q50 44 33 42 Z" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"/>
      <path d="M68 38 L76 46 M68 40 L74 50" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="42" y1="38" x2="46" y2="52" stroke="#991b1b" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="44" cy="45" r="1.8" fill="#0f172a"/>
      <circle cx="55" cy="45" r="1.8" fill="#0f172a"/>
    `;
  } else if (cosmetics.equippedHair === 'silver-sage-hair') {
    headwearSVG = `
      <circle cx="50" cy="46" r="15" fill="${skin.base}" stroke="#0f172a" stroke-width="2"/>
      <path d="M30 42 C30 22, 70 22, 70 42 C72 58, 68 70, 66 74 C62 60, 62 46, 50 46 C38 46, 38 60, 34 74 C32 70, 28 58, 30 42 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="45" cy="45" r="1.8" fill="#0f172a"/>
      <circle cx="55" cy="45" r="1.8" fill="#0f172a"/>
      <circle cx="50" cy="34" r="2.2" fill="#38bdf8" filter="drop-shadow(0 0 3px #38bdf8)"/>
    `;
  } else if (cosmetics.equippedHair === 'midnight-locs') {
    headwearSVG = `
      <circle cx="50" cy="46" r="15" fill="${skin.base}" stroke="#0f172a" stroke-width="2"/>
      <path d="M32 38 C32 20, 68 20, 68 38" fill="#1c1917"/>
      <path d="M32 38 L28 66 M36 36 L34 68 M40 34 L38 64 M60 34 L62 64 M64 36 L66 68 M68 38 L72 66" stroke="#1c1917" stroke-width="3" stroke-linecap="round"/>
      <circle cx="29" cy="54" r="1.8" fill="#fbbf24"/>
      <circle cx="71" cy="54" r="1.8" fill="#fbbf24"/>
      <circle cx="35" cy="60" r="1.8" fill="#fbbf24"/>
      <circle cx="65" cy="60" r="1.8" fill="#fbbf24"/>
      <circle cx="45" cy="45" r="1.8" fill="#0f172a"/>
      <circle cx="55" cy="45" r="1.8" fill="#0f172a"/>
    `;
  }

  // Visual Cape & Mantle Customization
  const capeType = cosmetics.equippedCape || 'none-cape';
  let capeFill = currentTier.cape;
  let capeTrim = 'rgba(255,255,255,0.15)';
  let extraCapeVisual = '';

  if (capeType === 'wanderers-cloak') {
    capeFill = '#166534';
    capeTrim = '#86efac';
    extraCapeVisual = `<path d="M40 50 Q50 56 60 50 L58 64 Q50 68 42 64 Z" fill="#14532d" stroke="#86efac" stroke-width="0.8"/>`;
  } else if (capeType === 'royal-cape') {
    capeFill = '#581c87';
    capeTrim = '#fbbf24';
    extraCapeVisual = `
      <path d="M22 90 L82 90" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
      <circle cx="36" cy="90" r="1.5" fill="#fef08a"/>
      <circle cx="50" cy="90" r="2" fill="#ef4444"/>
      <circle cx="64" cy="90" r="1.5" fill="#fef08a"/>
    `;
  } else if (capeType === 'shadowmeld-cloak') {
    capeFill = '#18181b';
    capeTrim = '#a855f7';
    extraCapeVisual = `
      <path d="M20 92 L24 86 L28 92 L32 85 L36 92 L40 86 L44 92 L48 85 L52 92 L56 86 L60 92 L64 85 L68 92 L72 86 L76 92 L80 85 L84 92" stroke="#7e22ce" stroke-width="1.5" fill="none"/>
    `;
  } else if (capeType === 'phoenix-cape') {
    capeFill = '#ea580c';
    capeTrim = '#fef08a';
    extraCapeVisual = `
      <path d="M30 68 Q50 78 70 68" stroke="#facc15" stroke-width="2" fill="none"/>
      <path d="M36 78 Q50 88 64 78" stroke="#ef4444" stroke-width="2" fill="none"/>
    `;
  } else if (capeType === 'celestial-mantle') { // Premium
    capeFill = '#0369a1';
    capeTrim = '#38bdf8';
    extraCapeVisual = `
      <circle cx="35" cy="74" r="1.5" fill="#ffffff" opacity="0.9"/>
      <circle cx="65" cy="74" r="1.5" fill="#ffffff" opacity="0.9"/>
      <circle cx="45" cy="82" r="1.2" fill="#fde047" opacity="0.9"/>
      <circle cx="55" cy="85" r="1.2" fill="#fde047" opacity="0.9"/>
      <circle cx="30" cy="88" r="1" fill="#ffffff" opacity="0.8"/>
      <circle cx="70" cy="88" r="1" fill="#ffffff" opacity="0.8"/>
      <path d="M22 92 L82 92" stroke="#38bdf8" stroke-width="2.5" filter="drop-shadow(0 0 2px #38bdf8)"/>
    `;
  }

  const capeSVG = `
    <path d="M22 68 C22 48, 32 44, 50 44 C68 44, 78 48, 78 68 L82 92 C82 96, 18 96, 18 92 Z" fill="${capeFill}" stroke="#0f172a" stroke-width="2"/>
    <path d="M30 68 L28 92 M70 68 L72 92" stroke="${capeTrim}" stroke-width="1.5"/>
    ${extraCapeVisual}
  `;

  return `
    <defs>
      <!-- Metallic Forge Shield Gradient -->
      <radialGradient id="shield-metal" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="${currentTier.plateHigh}"/>
        <stop offset="45%" stop-color="${currentTier.plateBase}"/>
        <stop offset="100%" stop-color="${currentTier.plateDark}"/>
      </radialGradient>
      <!-- Dynamic Pauldron Gradient -->
      <linearGradient id="forge-plate-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${currentTier.plateHigh}"/>
        <stop offset="50%" stop-color="${currentTier.plateBase}"/>
        <stop offset="100%" stop-color="${currentTier.plateDark}"/>
      </linearGradient>
      <!-- Trim Gradient -->
      <linearGradient id="forge-trim-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${currentTier.plateHigh}"/>
        <stop offset="50%" stop-color="${currentTier.trim}"/>
        <stop offset="100%" stop-color="${currentTier.plateDark}"/>
      </linearGradient>
    </defs>

    <!-- 1. Outer Ornate Shield Medallion (Evolves with Forge Tier) -->
    <circle cx="50" cy="50" r="47" fill="url(#forge-trim-grad)" stroke="#0f172a" stroke-width="2"/>
    <circle cx="50" cy="50" r="43" fill="#18181b" stroke="${currentTier.trim}" stroke-width="1.8"/>
    <!-- Engraved Shield Dial Pattern -->
    <circle cx="50" cy="50" r="39" fill="url(#shield-metal)" opacity="0.3"/>
    <path d="M50 8 L50 92 M8 50 L92 50" stroke="${currentTier.trim}" stroke-width="0.8" opacity="0.35"/>

    <!-- 2. Ambient Aura Effect -->
    ${auraSVG}

    <!-- 3. Flowing Regal Cape / Mantle -->
    ${capeSVG}

    <!-- 4. Pauldrons (Left & Right Shoulder Guards) - Upgrade with Spikes and Wings at higher tiers -->
    ${currentTier.spikes ? `
      <!-- High-Tier Armor Spikes & Crest Flairs -->
      <polygon points="18,54 22,46 26,56" fill="${currentTier.trim}" stroke="#0f172a" stroke-width="1"/>
      <polygon points="82,54 78,46 74,56" fill="${currentTier.trim}" stroke="#0f172a" stroke-width="1"/>
    ` : ''}

    ${currentTier.wings ? `
      <!-- Celestial Wing Blades (Tiers 8-10) -->
      <path d="M12 50 C8 38, 22 36, 26 48 Z" fill="${currentTier.plateHigh}" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M88 50 C92 38, 78 36, 74 48 Z" fill="${currentTier.plateHigh}" stroke="#0f172a" stroke-width="1.5"/>
    ` : ''}

    <!-- Left Pauldron Tiered Plates -->
    <path d="M16 68 C16 54, 30 52, 38 60 C38 72, 22 78, 16 68 Z" fill="url(#forge-plate-grad)" stroke="#0f172a" stroke-width="2"/>
    <path d="M18 64 C22 57, 32 56, 36 62" fill="none" stroke="${currentTier.plateHigh}" stroke-width="1.2"/>
    <circle cx="27" cy="65" r="1.8" fill="${currentTier.trim}"/>

    <!-- Right Pauldron Tiered Plates -->
    <path d="M84 68 C84 54, 70 52, 62 60 C62 72, 78 78, 84 68 Z" fill="url(#forge-plate-grad)" stroke="#0f172a" stroke-width="2"/>
    <path d="M82 64 C78 57, 68 56, 64 62" fill="none" stroke="${currentTier.plateHigh}" stroke-width="1.2"/>
    <circle cx="73" cy="65" r="1.8" fill="${currentTier.trim}"/>

    <!-- 5. Steel Gorget & Ornate Breastplate -->
    <path d="M32 60 Q50 68 68 60 L66 88 Q50 94 34 88 Z" fill="url(#forge-plate-grad)" stroke="#0f172a" stroke-width="2"/>
    <!-- Forge Inlaid Core Power Gem -->
    <polygon points="50,66 54,72 50,78 46,72" fill="${currentTier.gem}" stroke="${currentTier.trim}" stroke-width="1.2" ${currentTier.glow !== "none" ? `filter="drop-shadow(0 0 3px ${currentTier.gem})"` : ''}/>
    <path d="M36 78 Q50 84 64 78" fill="none" stroke="${currentTier.plateHigh}" stroke-width="1"/>
    ${forgeLevel >= 4 ? `<path d="M42 84 Q50 88 58 84" fill="none" stroke="${currentTier.trim}" stroke-width="1.2"/>` : ''}

    <!-- 6. Hero Headwear / Helmet / Masterwork Portrait -->
    ${headwearSVG}
  `;
}

