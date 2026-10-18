import { levelForXp, calculateArchetype, xpForLevel, weaponRankForXp, getWeaponMasteryKey, calculateCharacterLevel, WEAPON_PRESETS, CLASS_PATHS, hasClassUnlocked, DUNGEONS } from './formulas.js';

export const RAID_BOSS_POOL = [
  { id: "boss-1", name: "Ignis Goliath", title: "Flame-Forged Behemoth", icon: "🌋", weak: "strength", resistant: "intelligence", hp: 50000 },
  { id: "boss-2", name: "Gale Phantom", title: "Tempest Specter", icon: "🌪️", weak: "agility", resistant: "vitality", hp: 45000 },
  { id: "boss-3", name: "Archon Sage", title: "Curse of Ignorance", icon: "🔮", weak: "wisdom", resistant: "charisma", hp: 48000 },
  { id: "boss-4", name: "Void Automaton", title: "Construct of Ruin", icon: "⚙️", weak: "intelligence", resistant: "strength", hp: 52000 },
  { id: "boss-5", name: "Shadow Mindweaver", title: "Weaver of Nightmares", icon: "👁️", weak: "insight", resistant: "agility", hp: 46000 },
  { id: "boss-6", name: "Behemoth Titan", title: "Unstoppable Mountain", icon: "🦣", weak: "vitality", resistant: "insight", hp: 60000 },
  { id: "boss-7", name: "Discord Sovereign", title: "Harbinger of Isolation", icon: "👑", weak: "charisma", resistant: "wisdom", hp: 48000 },
  { id: "boss-8", name: "Mire Abomination", title: "Sludge of Chaos", icon: "🧌", weak: "cleaning", resistant: "strength", hp: 44000 }
];

export const ARMOR_TIERS = [
  "Rags",
  "Novice Leather",
  "Reinforced Leather",
  "Hardened Mail",
  "Reinforced Plate",
  "Hardened Steel",
  "Runed Aegis",
  "Chrono Ward",
  "Sovereign Plate",
  "Celestial Bulwark"
];

export function getArmorForgeUpgradeCost(level) {
  const costs = [0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 4000];
  if (level >= 10) return Infinity;
  return costs[level] || 5000;
}

// Global game save key
const SAVE_KEY = 'the_great_ledger_epic_save';

// Global state structure
let state = {
  profile: {
    name: 'Hero Knight',
    archetype: 'Novice',
    totalLevel: 1, // Will represent Character Level
    gold: 250,
    steps: 0,
    selectedDungeonId: 'woods',
    momentum: 50, // 0 to 100
    lastUpdate: Date.now(),
    setupComplete: false,
    lastResetDate: null,
    lastWeeklyResetDate: null,
    weeklyStats: { questsCompleted: 0, skillsLeveled: [], streaksMaintained: 0 },
    totalQuestsCompleted: 0,
    totalExpeditionsCompleted: 0,
    bountyHistory: [],
    lastWeekSummary: null,
    hasPendingWeeklySummary: false,
    chronicleLog: [
      { text: "📜 Joined the guild and signed the Great Ledger.", time: Date.now() }
    ],
    cosmetics: {
      equippedHair: 'default-hair',
      equippedSkin: 'default-skin',
      equippedAura: 'none-aura',
      equippedCape: 'none-cape',
      unlockedItems: ['default-hair', 'default-skin', 'none-aura', 'none-cape']
    }
  },
  skills: {
    strength: 0,
    agility: 0,
    wisdom: 0,
    intelligence: 0,
    insight: 0,
    vitality: 0,
    charisma: 0,
    cleaning: 0
  },
  inventory: { // Kept for stub compatibility
    equipped: {
      helmet: null,
      chestArmor: null,
      gloves: null,
      boots: null,
      mainHand: null,
      offHand: null
    },
    backpack: []
  },
  quests: [
    {
      id: 'quest-1',
      text: 'Push the Iron: Weightlifting Practice',
      type: 'daily',
      mappedSkill: 'strength',
      completedCount: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      baseXP: 30,
      baseGold: 15
    },
    {
      id: 'quest-2',
      text: 'Pound the Pavement: Afternoon Run',
      type: 'daily',
      mappedSkill: 'agility',
      completedCount: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      baseXP: 30,
      baseGold: 15
    },
    {
      id: 'quest-3',
      text: 'Lore & Tomes: 30 Mins Reading',
      type: 'daily',
      mappedSkill: 'wisdom',
      completedCount: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      baseXP: 45,
      baseGold: 20
    },
    {
      id: 'quest-4',
      text: 'Alchemical Formulae: Deep Study Session',
      type: 'daily',
      mappedSkill: 'intelligence',
      completedCount: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      baseXP: 45,
      baseGold: 20
    },
    {
      id: 'quest-5',
      text: 'Scroll of Self-Truth: Journaling Entry',
      type: 'daily',
      mappedSkill: 'insight',
      completedCount: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      baseXP: 30,
      baseGold: 12
    },
    {
      id: 'quest-6',
      text: 'Sanctuary Rest: 8 Hours Cozy Sleep',
      type: 'daily',
      mappedSkill: 'vitality',
      completedCount: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      baseXP: 40,
      baseGold: 10
    },
    {
      id: 'quest-7',
      text: 'Tavern Whispers: Healthy Socializing',
      type: 'weekly',
      mappedSkill: 'charisma',
      completedCount: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      baseXP: 100,
      baseGold: 60
    },
    {
      id: 'quest-8',
      text: 'Purge the Grime: Clean & Organize Sanctuary',
      type: 'daily',
      mappedSkill: 'cleaning',
      completedCount: 0,
      currentStreak: 0,
      lastCompletedDate: null,
      baseXP: 35,
      baseGold: 15
    }
  ],
  expedition: {
    active: false,
    dungeonId: null,
    startedAt: null,
    totalDuration: 0, // milliseconds
    stageIndex: 0,
    logs: [],
    rewardsGained: { gold: 0, xp: 0, essence: 0, coreFragments: 0, relicShards: 0 },
    restActive: false,
    restTimeRemaining: 0,
    restBonusActive: false,
    claimedMilestones: []
  },
  progression: {
    currentClass: "Commoner",
    unlockedClasses: ["Commoner", "Wanderer", "Street Rat"],
    equippedWeapon: "blade",
    armorForge: {
      level: 1,
      essenceInvested: 0
    },
    equippedCore: "Iron", // kept for backward compatibility
    coreRanks: {
      Iron: 1, Leather: 1, Scholar: 1, Warrior: 1,
      Vanguard: 0, Mirage: 0, Executioner: 0, Oracle: 0,
      Juggernaut: 0, Phantom: 0, Tempest: 0, Predator: 0,
      Titan: 0, Void: 0, Phoenix: 0, Chrono: 0,
      Ascendant: 0, Sovereign: 0, Fate: 0
    },
    equippedRelic: null,
    unlockedRelics: [], // List of relics crafted
    weaponXP: {
      blade: 0, axe: 0, spear: 0, dagger: 0, bow: 0, darts: 0, staff: 0, focus: 0
    },
    weaponAffinities: {
      blade: null, axe: null, spear: null, dagger: null, bow: null, darts: null, staff: null, focus: null
    },
    monsterCodex: {}, // monsterName: killCount
    materials: {
      essence: 20,          // start with some for demo/fresh players
      weaponEssence: 5,
      coreFragments: 3,
      relicShards: 0,
      tomeOfRebirth1: 0,
      tomeOfRebirth2: 0,
      tomeOfRebirth3: 0,
      tomeOfRebirth4: 0,
      tomeOfRebirth5: 0
    }
  },
  friends: [], // array of { id, name, archetype, level, status }
  guild: null, // No default dummy guild; created or joined via Clerk/Organizations
  auth: {
    isSignedIn: false,
    user: null,
    org: null,
    members: []
  }
};

// Listeners queue for reactivity
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  saveState();
  listeners.forEach(fn => fn());
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7) + "-" + d.getUTCFullYear();
}

/* ==========================================================================
   State Initialization & Auto-Saves
   ========================================================================== */

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
      state.profile = { ...state.profile, ...parsed.profile };
      state.skills = { ...state.skills, ...parsed.skills };
      state.inventory = { ...state.inventory, ...parsed.inventory };
      state.quests = parsed.quests || state.quests;
      state.expedition = { ...state.expedition, ...parsed.expedition };
      if (state.expedition.active && !state.expedition.lastCombatSimulatedAt) {
        state.expedition.lastCombatSimulatedAt = state.expedition.startedAt || Date.now();
      }
      
      // Ensure chronicle exists
      state.profile.chronicleLog = state.profile.chronicleLog || [
        { text: "📜 Joined the guild and signed the Great Ledger.", time: Date.now() }
      ];
      
      if (!state.profile.selectedDungeonId) state.profile.selectedDungeonId = 'woods';

      // Ensure cosmetics structure exists
      state.profile.cosmetics = state.profile.cosmetics || {
        equippedHair: 'default-hair',
        equippedSkin: 'default-skin',
        equippedAura: 'none-aura',
        unlockedItems: ['default-hair', 'default-skin', 'none-aura']
      };
      
      // Ensure guild structure exists
      if (!state.guild) {
        state.guild = {
          name: "The Great Ledger Vanguard",
          badges: 150,
          activeBossIndex: Math.floor(Math.random() * RAID_BOSS_POOL.length),
          bossCurrentHP: 38400,
          bossMaxHP: 50000,
          bossEndsAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
          userDamage: 4200,
          totalGuildDamage: 11600,
          bulletin: [
            { text: "🛡️ Aethelgard evolved into a Paladin!", time: Date.now() - 3600000 },
            { text: "🏹 Lyra defeated the Boss in Whispering Woods!", time: Date.now() - 7200000 }
          ],
          members: [
            { name: "Aethelgard", archetype: "Paladin", level: 24 },
            { name: "Lyra the Swift", archetype: "Sniper", level: 21 },
            { name: "Valerius", archetype: "Archmage", level: 28 }
          ]
        };
      }
      
      // Deep merge progression to prevent breaking older save versions
      if (parsed.progression) {
        state.progression = {
          ...state.progression,
          ...parsed.progression,
          armorForge: parsed.progression.armorForge || { level: 1, essenceInvested: 0 },
          equippedWeapon: parsed.progression.equippedWeapon || "blade",
          unlockedClasses: parsed.progression.unlockedClasses || ["Commoner", "Wanderer", "Street Rat"],
          coreRanks: { ...state.progression.coreRanks, ...parsed.progression.coreRanks },
          weaponXP: { ...state.progression.weaponXP, ...parsed.progression.weaponXP },
          weaponAffinities: { ...state.progression.weaponAffinities, ...parsed.progression.weaponAffinities },
          monsterCodex: { ...state.progression.monsterCodex, ...parsed.progression.monsterCodex },
          materials: {
            tomeOfRebirth1: 0, tomeOfRebirth2: 0, tomeOfRebirth3: 0, tomeOfRebirth4: 0, tomeOfRebirth5: 0,
            ...state.progression.materials,
            ...parsed.progression.materials
          }
        };
      }
      
      // Daily Log-in Date check
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (state.profile.lastLoginDate !== todayStr) {
        state.profile.lastLoginDate = todayStr;
        state.profile.hasPendingLoginBonus = true; // Claim tribute on boot!
      }
      
      // Existing saves always skip onboarding — they already have name/class chosen
      state.profile.setupComplete = true;
      if (!state.profile.weeklyStats) state.profile.weeklyStats = { questsCompleted: 0, skillsLeveled: [], streaksMaintained: 0 };
      if (!state.profile.bountyHistory) state.profile.bountyHistory = [];
      if (state.profile.totalQuestsCompleted === undefined) {
        state.profile.totalQuestsCompleted = state.profile.bountyHistory.length || state.profile.weeklyStats.questsCompleted || 0;
      }

      // Ensure all quests have recurrence attributes and auto-respawn if recurrence has passed
      const nowMs = Date.now();
      state.quests.forEach(q => {
        if (q.recurrenceDays === undefined) {
          q.recurrenceDays = q.isOneTime ? 0 : (q.type === 'weekly' ? 7 : 1);
        }
        if (q.nextAvailableAt === undefined) {
          q.nextAvailableAt = null;
        }
        if (q.nextAvailableAt && nowMs >= q.nextAvailableAt) {
          q.nextAvailableAt = null;
          q.completedCount = 0;
        }
      });
      
      const isoWeekStr = getISOWeek(now);
      
      // Daily Reset Check
      if (state.profile.lastResetDate !== todayStr) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
        
        state.quests.forEach(q => {
          if (q.currentStreak === undefined) q.currentStreak = 0;
          if (q.type === 'daily') {
            q.completedCount = 0;
            if (q.lastCompletedDate !== todayStr && q.lastCompletedDate !== yesterdayStr) {
              q.currentStreak = 0; // Streak broken
            }
          }
        });
        state.profile.lastResetDate = todayStr;
      }
      
      // Weekly Reset Check
      if (state.profile.lastWeeklyResetDate !== isoWeekStr) {
        if (state.profile.lastWeeklyResetDate !== null && state.profile.lastWeeklyResetDate !== undefined) {
          state.profile.lastWeekSummary = { ...state.profile.weeklyStats };
          state.profile.hasPendingWeeklySummary = true;
        }
        state.profile.weeklyStats = { questsCompleted: 0, skillsLeveled: [], streaksMaintained: 0 };
        state.profile.lastWeeklyResetDate = isoWeekStr;
        
        state.quests.forEach(q => {
          if (q.type === 'weekly') {
            q.completedCount = 0;
          }
        });
      }

      
      recalculateDerivedStats();
    } else {
      const now = new Date();
      state.profile.lastLoginDate = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      state.profile.hasPendingLoginBonus = true; // New profile also gets a starter bonus chest!
      recalculateDerivedStats();
      saveState();
    }
  } catch (e) {
    console.error("Failed to load local state database, building fresh start...", e);
  }
}

export function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state database...", e);
  }
}

export function getState() {
  return state;
}

/* ==========================================================================
   Dynamic Stat Derivations & Vectors
   ========================================================================== */

let derivedStats = {
  combatStats: {
    attack: 0,
    defense: 0,
    damageRange: 5,
    maxHP: 20
  },
  currentHP: 20,
  skillsLevels: {}
};

export function getDerivedStats() {
  return derivedStats;
}

function recalculateDerivedStats() {
  // 1. Calculate Individual Skills Levels
  const skillLevels = {};
  for (const [skill, xp] of Object.entries(state.skills)) {
    skillLevels[skill] = levelForXp(xp);
  }
  derivedStats.skillsLevels = skillLevels;
  state.profile.totalLevel = calculateCharacterLevel(skillLevels); // Character Level!

  // 2. Resolve Archetype
  const statsArray = [
    skillLevels.strength,
    skillLevels.agility,
    skillLevels.wisdom,
    skillLevels.intelligence,
    skillLevels.insight,
    skillLevels.vitality,
    skillLevels.charisma,
    skillLevels.cleaning
  ];
  state.profile.archetype = calculateArchetype(statsArray);

  // 3. Derived Combat Values based on Level
  const overallLvl = state.profile.totalLevel; 
  
  const strengthLvl = skillLevels.strength;
  const vitalityLvl = skillLevels.vitality;

  // 4. Incorporate Armor Forge level, Relics, and Weapon Masteries
  const prog = state.progression || {
    currentClass: "Commoner",
    unlockedClasses: ["Commoner", "Wanderer", "Street Rat"],
    equippedWeapon: "blade",
    armorForge: { level: 1, essenceInvested: 0 },
    equippedRelic: null,
    weaponXP: { blade: 0, axe: 0, spear: 0, dagger: 0, bow: 0, darts: 0, staff: 0, focus: 0 },
    monsterCodex: {}
  };

  // Class passives — Stacks from ALL unlocked classes
  let classAtt = 0;
  let classDef = 0;
  let classHp = 0;
  let classDmg = 0;

  const unlocked = prog.unlockedClasses || [prog.currentClass || "Commoner"];

  if (unlocked.includes("Fighter"))       { classAtt += 2; classDmg += 1; }
  if (unlocked.includes("Paladin"))       { classDef += 4; classHp += 15; }
  if (unlocked.includes("Berserker"))     { classDmg += 2; }
  if (unlocked.includes("Templar"))       { classDef += 5; classHp += 20; }
  if (unlocked.includes("Warlord"))       { classAtt += 5; classDmg += 3; classDef += 2; }
  if (unlocked.includes("Holy Sovereign")){ classHp += 30; classDef += 3; }
  if (unlocked.includes("God-Warrior"))   { classAtt += 10; classDmg += 6; classDef += 5; classHp += 40; }
  if (unlocked.includes("Rogue"))         { classAtt += 1; }
  if (unlocked.includes("Assassin"))      { classDmg += 2; }
  if (unlocked.includes("Nightstalker"))  { classDef += 2; }
  if (unlocked.includes("Mage"))          { classDmg += 3; }
  if (unlocked.includes("Sorcerer"))      { classDmg += 2; }
  if (unlocked.includes("Illusionist"))   { classDef += 2; }
  if (unlocked.includes("Archmage"))      { classDmg += 4; classAtt += 2; }
  if (unlocked.includes("Chronomancer"))  { classAtt += 2; }
  if (unlocked.includes("Ranger"))        { classAtt += 2; }
  if (unlocked.includes("Hunter"))        { classAtt += 3; }
  if (unlocked.includes("Beastmaster"))   { classHp += 10; }
  if (unlocked.includes("Sniper"))        { classAtt += 4; }
  if (unlocked.includes("Pack Leader"))   { classHp += 15; }

  // Weapon Synergy: bonus when current class fits the equipped weapon
  const equippedWeapon = prog.equippedWeapon || "blade";
  if (unlocked.includes("Fighter") || unlocked.includes("Paladin") || unlocked.includes("Berserker") || unlocked.includes("Templar") || unlocked.includes("Warlord") || unlocked.includes("Holy Sovereign") || unlocked.includes("God-Warrior")) {
    if (equippedWeapon === "blade" || equippedWeapon === "axe" || equippedWeapon === "spear") { classAtt += 1; classDmg += 1; }
  }
  if (unlocked.includes("Rogue") || unlocked.includes("Assassin") || unlocked.includes("Nightstalker") || unlocked.includes("Executioner") || unlocked.includes("Phantom")) {
    if (equippedWeapon === "dagger" || equippedWeapon === "darts") { classAtt += 1; classDmg += 1; }
  }
  if (unlocked.includes("Mage") || unlocked.includes("Sorcerer") || unlocked.includes("Illusionist") || unlocked.includes("Archmage") || unlocked.includes("Chronomancer")) {
    if (equippedWeapon === "staff" || equippedWeapon === "focus") { classDmg += 2; }
  }
  if (unlocked.includes("Ranger") || unlocked.includes("Hunter") || unlocked.includes("Beastmaster") || unlocked.includes("Sniper") || unlocked.includes("Pack Leader")) {
    if (equippedWeapon === "bow" || equippedWeapon === "darts") { classAtt += 1; classDmg += 1; }
  }

  // Armor Forge flat defense calculation: each level provides +15 armor (base 0 for Level 1)
  const forgeLvl = prog.armorForge?.level || 1;
  const forgeDef = (forgeLvl - 1) * 15;

  // Relic stats
  let relicAtt = 0;
  let relicDef = 0;
  let relicHp = 0;
  let relicDmg = 0;
  if (prog.equippedRelic === "Iron Ring") { relicDef += 2; }
  else if (prog.equippedRelic === "Wolf Fang") { relicAtt += 2; relicDmg += 1; }
  else if (prog.equippedRelic === "Crown of Momentum") { relicAtt += 3; relicDef += 1; }
  else if (prog.equippedRelic === "Heart of the Titan") { relicHp += 20; }
  else if (prog.equippedRelic === "Worldbreaker") { relicAtt += 8; relicDmg += 4; relicDef += 2; }
  else if (prog.equippedRelic === "Assassin's Mark") { relicAtt += 3; relicDmg += 2; }
  else if (prog.equippedRelic === "Boots of Haste") { relicAtt += 4; relicHp += 15; }
  else if (prog.equippedRelic === "Amulet of the Ancients") { relicDef += 10; relicHp += 50; }
  else if (prog.equippedRelic === "Void Mantle") { relicDef += 15; relicAtt -= 2; }
  // Codex passive stats
  let codexDef = 0;
  let codexDmg = 0;
  for (const [mName, kills] of Object.entries(prog.monsterCodex)) {
    if (kills >= 100) {
      codexDef += 1;
    }
    if (kills >= 1000) {
      codexDmg += 2;
    }
  }

  // Weapon mastery stats
  let weaponAtt = 0;
  let weaponDmg = 0;
  const activeWeaponKey = prog.equippedWeapon || "blade";
  const weaponPreset = WEAPON_PRESETS[activeWeaponKey];
  
  if (activeWeaponKey) {
    const wXp = prog.weaponXP[activeWeaponKey] || 0;
    const wRank = weaponRankForXp(wXp);
    // Accuracy
    weaponAtt += Math.floor(wRank * 0.4);
    // Damage thresholds
    if (wRank >= 20) weaponDmg += 5;
    else if (wRank >= 15) weaponDmg += 3;
    else if (wRank >= 10) weaponDmg += 2;
    else if (wRank >= 5) weaponDmg += 1;

    // Add Preset Weapon base stats
    if (weaponPreset) {
      weaponAtt += weaponPreset.attack;
      weaponDmg += weaponPreset.damage;
    }
  }

  derivedStats.combatStats.attack = overallLvl + Math.floor(strengthLvl / 3) + classAtt + relicAtt + weaponAtt;
  derivedStats.combatStats.defense = overallLvl + Math.floor(vitalityLvl / 4) + classDef + forgeDef + relicDef + codexDef;
  derivedStats.combatStats.damageRange = 6 + Math.floor(strengthLvl / 2) + classDmg + relicDmg + codexDmg + weaponDmg;
  derivedStats.combatStats.maxHP = 25 + (overallLvl * 3) + (vitalityLvl * 4) + classHp + relicHp;

  // Auto-heal to max if not in active combat
  if (!state.expedition.active) {
    derivedStats.currentHP = derivedStats.combatStats.maxHP;
  } else {
    derivedStats.currentHP = Math.min(derivedStats.currentHP, derivedStats.combatStats.maxHP);
  }

  // Auto-grant milestone cosmetics
  checkMilestoneCosmeticUnlocks();
}

/* ==========================================================================
   Momentum System
   ========================================================================== */

/**
 * Returns the XP/Gold multiplier based on current momentum (0-100).
 * 0% momentum = 0.5x, 50% = 1.0x, 100% = 2.0x
 */
export function getMomentumMultiplier() {
  const m = state.profile.momentum || 0;
  return (0.5 + (m / 100) * 1.5).toFixed(1);
}

/**
 * Changes momentum by a delta (clamped 0–100).
 */
function changeMomentum(delta) {
  state.profile.momentum = Math.max(0, Math.min(100, state.profile.momentum + delta));
}

/* ==========================================================================
   State Mutation Action Creators
   ========================================================================== */

/**
 * Momentum Decay & Consistency Updates
 */
/**
 * Helper to log character events to the chronicle history
 */
export function addChronicleEvent(text) {
  if (!state.profile.chronicleLog) {
    state.profile.chronicleLog = [];
  }
  state.profile.chronicleLog.unshift({ text, time: Date.now() });
  if (state.profile.chronicleLog.length > 50) {
    state.profile.chronicleLog.pop();
  }
}

/**
 * Checks all quests and respawns any whose recurrence period has arrived
 */
export function checkQuestRecurrences() {
  if (!state.quests) return;
  const now = Date.now();
  let changed = false;
  state.quests.forEach(q => {
    if (q.recurrenceDays === undefined) {
      q.recurrenceDays = q.isOneTime ? 0 : (q.type === 'weekly' ? 7 : 1);
    }
    if (q.nextAvailableAt && now >= q.nextAvailableAt) {
      q.nextAvailableAt = null;
      q.completedCount = 0;
      changed = true;
    }
  });
  if (changed) {
    saveState();
  }
}

/**
 * Instantly respawns an upcoming recurring quest back to the active board
 */
export function forceRespawnQuest(questId) {
  const quest = state.quests.find(q => q.id === questId);
  if (!quest) return;
  quest.nextAvailableAt = null;
  quest.completedCount = 0;
  addChronicleEvent(`⚡ Force-respawned bounty: "${quest.text}"`);
  saveState();
  notify();
}

/**
 * Completes a habit quest, updates XP, stats, momentum, and spawns splats.
 */
export function completeQuest(questId) {
  const quest = state.quests.find(q => q.id === questId);
  if (!quest) return null;

  quest.completedCount++;
  
  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  
  if (quest.recurrenceDays === undefined) {
    quest.recurrenceDays = quest.isOneTime ? 0 : (quest.type === 'weekly' ? 7 : 1);
  }

  // Calculate next recurrence availability
  if (quest.recurrenceDays > 0) {
    quest.nextAvailableAt = nowMs + (quest.recurrenceDays * 24 * 60 * 60 * 1000);
  } else {
    quest.nextAvailableAt = null;
  }
  quest.lastCompletedAt = nowMs;

  if (quest.recurrenceDays === 1 || quest.type === 'daily') {
    if (quest.lastCompletedDate === yesterdayStr) {
      quest.currentStreak++;
      if (state.profile.weeklyStats) state.profile.weeklyStats.streaksMaintained++;
    } else if (quest.lastCompletedDate !== todayStr) {
      quest.currentStreak = 1;
    }
    quest.lastCompletedDate = todayStr;
  } else {
    quest.lastCompletedDate = todayStr;
    quest.currentStreak = (quest.currentStreak || 0) + 1;
  }
  
  if (state.profile.weeklyStats) {
    state.profile.weeklyStats.questsCompleted++;
  }
  state.profile.totalQuestsCompleted = (state.profile.totalQuestsCompleted || 0) + 1;

  // Record pre-levels to compare
  const oldLvlSum = state.profile.totalLevel;
  const oldSkillsLevels = { ...derivedStats.skillsLevels };
  const oldCombatStats = { ...derivedStats.combatStats };

  // Multipliers based on momentum
  const mult = parseFloat(getMomentumMultiplier());
  const xpReward = Math.floor(quest.baseXP * mult);
  const goldReward = Math.floor(quest.baseGold * mult);

  // Apply rewards
  state.skills[quest.mappedSkill] += xpReward;
  state.profile.gold += goldReward;

  // Record to persistent bounty history
  if (!state.profile.bountyHistory) state.profile.bountyHistory = [];
  state.profile.bountyHistory.unshift({
    id: `bh-${nowMs}-${Math.random().toString(36).substring(2, 6)}`,
    questId: quest.id,
    text: quest.text,
    skill: quest.mappedSkill,
    completedAt: nowMs,
    xpReward,
    goldReward,
    difficultyTier: quest.difficultyTier || 'C',
    recurrenceDays: quest.recurrenceDays
  });

  // Progression materials drops
  let essenceReward = 0;
  let fragReward = 0;
  let shardReward = 0;

  if (state.progression) {
    if (quest.type === 'daily') {
      essenceReward = Math.floor(Math.random() * 3) + 1; // 1-3
      fragReward = 1;
    } else {
      // Weekly or one-time
      essenceReward = Math.floor(Math.random() * 6) + 5; // 5-10
      fragReward = Math.floor(Math.random() * 3) + 2; // 2-4
      if (quest.isOneTime) {
        shardReward = 1;
      }
    }

    state.progression.materials.essence += essenceReward;
    state.progression.materials.coreFragments += fragReward;
    state.progression.materials.relicShards += shardReward;
  }

  // Boost flame consistency meter
  changeMomentum(8);

  const eventMsg = `Completed Bounty: ${quest.text} (+${xpReward} XP to ${quest.mappedSkill.toUpperCase()}, +${goldReward} Gold)`;
  addChronicleEvent(eventMsg);

  // Raid Boss Damage Processing
  let bossDamageInfo = null;
  if (state.guild) {
    rotateGuildRaidBossIfNeeded();
    const bossMeta = RAID_BOSS_POOL[state.guild.activeBossIndex || 0];
    if (bossMeta && state.guild.bossCurrentHP > 0) {
      let damageMult = 1.0;
      let typeLabel = "normal";

      if (quest.mappedSkill === bossMeta.weak) {
        damageMult = 1.5;
        typeLabel = "weakness";
      } else if (quest.mappedSkill === bossMeta.resistant) {
        damageMult = 0.9;
        typeLabel = "resistant";
      }

      const dmgDealt = Math.round(xpReward * damageMult);
      state.guild.bossCurrentHP = Math.max(0, state.guild.bossCurrentHP - dmgDealt);
      state.guild.userDamage = (state.guild.userDamage || 0) + dmgDealt;
      state.guild.totalGuildDamage = (state.guild.totalGuildDamage || 0) + dmgDealt;

      // Tag as major if it's a weakness exploit hit, minor otherwise
      const hitType = typeLabel === 'weakness' ? 'minor' : 'minor';
      let bulletinMsg = `⚔️ ${state.profile.name} dealt +${dmgDealt.toLocaleString()} dmg to ${bossMeta.name}!`;
      if (typeLabel === 'weakness') bulletinMsg = `💥 ${state.profile.name} hit ${bossMeta.name}'s weakness! +${dmgDealt.toLocaleString()} dmg!`;
      addGuildBulletinEvent(bulletinMsg, 'minor');

      bossDamageInfo = {
        damage: dmgDealt,
        type: typeLabel,
        bossName: bossMeta.name,
        isWeak: typeLabel === "weakness",
        isResistant: typeLabel === "resistant"
      };
    }
  }

  // Check for level ups!
  checkForLevelUps(oldLvlSum, oldSkillsLevels, oldCombatStats);

  notify();

  return { xpReward, goldReward, skill: quest.mappedSkill, isOneTime: quest.isOneTime, essenceReward, fragReward, shardReward, bossDamage: bossDamageInfo };
}

/**
 * Undoes a habit quest completion (e.g. accidental click)
 */
export function undoQuestCompletion(questId, reward) {
  const quest = state.quests.find(q => q.id === questId);
  if (!quest) return;

  quest.completedCount = Math.max(0, quest.completedCount - 1);
  quest.lastCompletedDate = null;
  quest.lastCompletedAt = null;
  quest.nextAvailableAt = null;
  quest.currentStreak = Math.max(0, quest.currentStreak - 1);

  if (state.profile.bountyHistory && state.profile.bountyHistory.length > 0) {
    const idx = state.profile.bountyHistory.findIndex(h => h.questId === questId);
    if (idx !== -1) {
      state.profile.bountyHistory.splice(idx, 1);
    }
  }
  state.profile.totalQuestsCompleted = Math.max(0, (state.profile.totalQuestsCompleted || 0) - 1);

  state.skills[reward.skill] = Math.max(0, state.skills[reward.skill] - reward.xpReward);
  state.profile.gold = Math.max(0, state.profile.gold - reward.goldReward);
  
  if (state.progression && reward) {
    state.progression.materials.essence = Math.max(0, state.progression.materials.essence - (reward.essenceReward || 0));
    state.progression.materials.coreFragments = Math.max(0, state.progression.materials.coreFragments - (reward.fragReward || 0));
    state.progression.materials.relicShards = Math.max(0, state.progression.materials.relicShards - (reward.shardReward || 0));
  }
  
  changeMomentum(-8);
  addChronicleEvent(`⏪ Undid Bounty: ${quest.text}`);
  
  recalculateDerivedStats();
  notify();
}

/**
 * Custom Habit / Quest Creation with Recurrence
 */
export function createCustomQuest(text, recurrenceOrType, skill, difficultyTier = "C") {
  const multipliers = { F: 0.5, D: 0.75, C: 1.0, B: 1.5, A: 2.0, S: 3.0 };
  const mult = multipliers[difficultyTier] || 1.0;

  let recurrenceDays = 1;
  if (typeof recurrenceOrType === 'number') {
    recurrenceDays = Math.max(0, Math.floor(recurrenceOrType));
  } else if (recurrenceOrType === 'daily') {
    recurrenceDays = 1;
  } else if (recurrenceOrType === 'weekly') {
    recurrenceDays = 7;
  } else if (recurrenceOrType === 'onetime') {
    recurrenceDays = 0;
  } else {
    const parsed = parseInt(recurrenceOrType, 10);
    recurrenceDays = isNaN(parsed) ? 1 : Math.max(0, parsed);
  }

  const isOneTime = recurrenceDays === 0;
  const type = recurrenceDays === 1 ? 'daily' : 'weekly';

  let rawXP = 35;
  let rawGold = 15;
  if (isOneTime) {
    rawXP = 150;
    rawGold = 75;
  } else if (recurrenceDays >= 14) {
    rawXP = 160;
    rawGold = 80;
  } else if (recurrenceDays >= 7) {
    rawXP = 90;
    rawGold = 45;
  } else if (recurrenceDays >= 3) {
    rawXP = 60;
    rawGold = 30;
  } else {
    rawXP = 35;
    rawGold = 15;
  }

  const newQuest = {
    id: `quest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    text,
    type,
    mappedSkill: skill,
    completedCount: 0,
    currentStreak: 0,
    lastCompletedDate: null,
    lastCompletedAt: null,
    nextAvailableAt: null,
    recurrenceDays,
    baseXP: Math.round(rawXP * mult),
    baseGold: Math.round(rawGold * mult),
    isOneTime,
    difficultyTier
  };
  state.quests.push(newQuest);
  const cadenceLabel = isOneTime ? 'One-Time' : (recurrenceDays === 1 ? 'Daily' : `${recurrenceDays}d Cadence`);
  addChronicleEvent(`🖋️ Posted custom bounty [${difficultyTier} Tier / ${cadenceLabel}]: "${text}"`);
  saveState();
  notify();
}

/* ==========================================================================
   Finch-Style Micro Task Library (48-hour anti-repetition)
   ========================================================================== */

const MICRO_TASKS = {
  strength: [
    "Do 10 push-ups right now",
    "Complete a 5-minute plank challenge",
    "Do 20 squats before your next meal",
    "Carry groceries or heavy bags without help",
    "Do 15 lunges on each leg",
    "Complete a 10-minute upper body stretch",
    "Do 3 sets of 10 dumbbell curls",
    "Hold a wall sit for 60 seconds",
    "Do 20 jumping jacks to wake your body up",
    "Complete a set of pull-ups or inverted rows",
    "Do 30 calf raises while waiting for something",
    "Finish a 15-minute bodyweight workout",
    "Do 10 tricep dips on a chair",
    "Complete a 5-minute core circuit",
    "Hold a high plank for 90 seconds",
    "Do 25 glute bridges",
    "Carry something heavy from one room to another 5 times",
    "Complete a set of diamond push-ups",
    "Do 15 pike push-ups",
    "Hold a low squat for 45 seconds"
  ],
  agility: [
    "Walk around the block once",
    "Take the stairs instead of the elevator today",
    "Do a 10-minute walk during your lunch break",
    "Stretch your legs for 5 minutes",
    "Do 3 sets of high knees for 30 seconds each",
    "Go for a 20-minute jog or run",
    "Do 5 minutes of jump rope (real or imaginary)",
    "Complete 10 burpees",
    "Walk to a destination you'd normally drive to",
    "Do lateral shuffles for 30 seconds",
    "Complete a 15-minute yoga or mobility flow",
    "Do 20 speed skaters (lateral hops)",
    "Walk 1,000 steps around your home or office",
    "Do 30 seconds of mountain climbers",
    "Ride a bike or do a cycling workout",
    "Do 10 box step-ups on a sturdy surface",
    "Complete a 5-minute dynamic warm-up routine",
    "Dance to 2 songs",
    "Do 3 rounds of: 10 squats, 10 push-ups, 10 sit-ups",
    "Take a walk outside for fresh air"
  ],
  wisdom: [
    "Read 10 pages of a book",
    "Listen to an educational podcast episode",
    "Watch a documentary for 20 minutes",
    "Write a summary of something you learned today",
    "Read one long-form article about a topic you care about",
    "Review your notes or highlights from recent reading",
    "Learn 5 new vocabulary words and use them in a sentence",
    "Read a chapter of a non-fiction book",
    "Spend 15 minutes studying a topic you've been curious about",
    "Listen to a TED Talk",
    "Re-read something meaningful from your past notes",
    "Discuss an interesting idea with someone you respect",
    "Read about a historical event you don't know much about",
    "Complete an online lesson or course module",
    "Write down 3 things you want to learn this week",
    "Research a skill you want to develop",
    "Read about a person who inspires you",
    "Spend 20 minutes on a language learning app",
    "Read a philosophy or self-improvement excerpt",
    "Summarize today's top news in your own words"
  ],
  intelligence: [
    "Work on a coding or programming challenge for 20 minutes",
    "Do mental math exercises for 5 minutes",
    "Read an article about an unfamiliar technical topic",
    "Solve a logic puzzle, Sudoku, or crossword",
    "Review a chapter of a textbook or tutorial",
    "Learn a new keyboard shortcut and use it",
    "Write a short script to automate a small task",
    "Organize your digital files or downloads folder",
    "Review your monthly budget for 5 minutes",
    "Research one financial topic for 10 minutes",
    "Watch an educational video on history or science",
    "Practice a new language for 15 minutes",
    "Write down 3 actionable ways to save money this month",
    "Play a strategy game (like Chess) for 20 minutes",
    "Review a contract, document, or receipt carefully",
    "Spend 15 minutes learning about investing basics",
    "Research a skill that could increase your income",
    "Analyze a dataset or spreadsheet for 10 minutes",
    "Fix a bug or refactor a small piece of code",
    "Learn how a household appliance or tool works"
  ],
  insight: [
    "Write down 3 things you are grateful for",
    "Meditate for 5 minutes",
    "Spend 10 minutes journaling about your day",
    "Write about one thing that's been on your mind",
    "Take 5 deep, slow breaths right now",
    "Spend 5 minutes sitting quietly without your phone",
    "Write down your top priority for tomorrow",
    "Reflect on one thing you did well today",
    "Write about a challenge you are currently facing",
    "Do a 5-minute body scan meditation",
    "Spend 10 minutes in nature or by a window",
    "Write a letter to your future self",
    "List 3 people you appreciate and why",
    "Practice mindful eating during one meal",
    "Put your phone away for 30 minutes",
    "Write about a goal and one small step toward it",
    "Reflect on how you handled stress this week",
    "Spend 15 minutes on a creative hobby",
    "Write down something you want to let go of",
    "Read or listen to something calming before bed"
  ],
  vitality: [
    "Drink a full glass of water right now",
    "Go to bed 30 minutes earlier tonight",
    "Eat a piece of fruit today",
    "Avoid screens for 30 minutes before bed",
    "Cook a home-cooked meal instead of ordering out",
    "Take a 10-minute power nap if tired",
    "Drink 8 glasses of water throughout the day",
    "Eat a vegetable with every meal today",
    "Spend 10 minutes outside in sunlight",
    "Replace one sugary drink with water today",
    "Get at least 7 hours of sleep tonight",
    "Take your vitamins or supplements",
    "Avoid caffeine after 2pm today",
    "Prepare a healthy snack for tomorrow",
    "Do a 5-minute breathing exercise",
    "Log your meals or water intake today",
    "Eat breakfast before starting your day",
    "Take a warm bath or shower to wind down",
    "Reduce your screen time by 1 hour today",
    "Check in with your body — how are you feeling physically?"
  ],
  charisma: [
    "Text or call a friend you haven't spoken to in a while",
    "Give a genuine compliment to someone today",
    "Introduce yourself to someone new",
    "Write a thank-you message to someone who helped you",
    "Make eye contact and smile at 3 strangers today",
    "Spend quality time with a family member",
    "Share something you've been working on with someone",
    "Ask a thoughtful question during a conversation",
    "Attend a social event or community gathering",
    "Start a conversation with a colleague or classmate",
    "Write a positive review for a local business you like",
    "Tell someone about a book, show, or podcast you love",
    "Offer to help someone without being asked",
    "Listen fully to someone without interrupting",
    "Follow up on a previous conversation you had",
    "Plan a hangout or catch-up with a friend",
    "Share a useful resource or article with your network",
    "Send a genuine encouraging message to someone struggling",
    "Spend 15 minutes in a hobby that involves others",
    "Reconnect with someone you've lost touch with"
  ],
  cleaning: [
    "Make your bed right now",
    "Wipe down your desk or workspace",
    "Do the dishes (or run the dishwasher)",
    "Take out the trash",
    "Sweep or vacuum one room",
    "Wipe down the kitchen counter",
    "Clean your bathroom sink and mirror",
    "Do one load of laundry",
    "Fold and put away clean clothes",
    "Organize one drawer or shelf",
    "Clear clutter from a surface in your home",
    "Mop or spot-clean the floor",
    "Clean your phone screen and desk accessories",
    "Empty and organize your bag or backpack",
    "Clean the inside of your microwave",
    "Wipe down door handles and light switches",
    "Declutter 5 items (donate, trash, or relocate)",
    "Organize your closet for 10 minutes",
    "Clean under your bed",
    "Water your plants or tidy your outdoor space"
  ]
};

/**
 * Picks a task from the library that hasn't been used in the past 48 hours.
 */
function pickMicroTask(skill) {
  const tasks = MICRO_TASKS[skill] || MICRO_TASKS.insight;
  const recentTasks = state.profile.recentGeneratedTasks || {};
  const now = Date.now();
  const fortyEightHours = 48 * 60 * 60 * 1000;

  // Filter out tasks used within 48 hours
  const available = tasks.filter(t => {
    const lastUsed = recentTasks[t];
    return !lastUsed || (now - lastUsed) > fortyEightHours;
  });

  // Fallback to any task if all have been used recently
  const pool = available.length > 0 ? available : tasks;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  // Mark as used
  if (!state.profile.recentGeneratedTasks) state.profile.recentGeneratedTasks = {};
  state.profile.recentGeneratedTasks[chosen] = now;

  return chosen;
}

/**
 * Generates a candidate random quest (not yet committed to the ledger)
 */
export function generateQuestCandidate(forcedSkill = null) {
  const skills = Object.keys(MICRO_TASKS);
  const targetSkill = forcedSkill && forcedSkill !== 'any'
    ? forcedSkill
    : skills[Math.floor(Math.random() * skills.length)];
  const taskText = pickMicroTask(targetSkill);
  
  return {
    id: `quest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    text: taskText,
    type: 'weekly',
    mappedSkill: targetSkill,
    completedCount: 0,
    currentStreak: 0,
    lastCompletedDate: null,
    baseXP: 300,
    baseGold: 100,
    isOneTime: true,
    recurrenceDays: 0,
    nextAvailableAt: null,
    lastCompletedAt: null,
    difficultyTier: 'C'
  };
}

export function generate3QuestCandidates(forcedSkill = null) {
  const candidates = [];
  for (let i = 0; i < 3; i++) {
    candidates.push(generateQuestCandidate(forcedSkill));
  }
  return candidates;
}

export function payToRefocusSkill(targetSkill, cost = 20) {
  if (state.profile.gold < cost) {
    return { success: false, message: `⚠️ You need ${cost} Gold to refocus contract skills!` };
  }
  state.profile.gold -= cost;
  const skillLabel = (!targetSkill || targetSkill === 'any') ? 'Random Disciplines' : targetSkill.toUpperCase();
  addChronicleEvent(`🎲 Refocused Guild Contracts: Spent ${cost} Gold to focus on ${skillLabel}!`);
  saveState();
  notify();
  return { success: true };
}

/**
 * Commits a candidate quest to the active quest list
 */
export function commitQuest(quest) {
  state.quests.push(quest);
  addChronicleEvent(`🎲 Bounty Accepted: "${quest.text}"`);
  notify();
}

export function addSteps(count) {
  if (!count || isNaN(count) || count <= 0) return;
  const prevSteps = state.profile.steps || 0;
  const newSteps = prevSteps + Math.floor(count);
  
  const level = state.profile.totalLevel || 1;
  const newlyUnlocked = [];
  
  DUNGEONS.forEach(d => {
    const wasStepLocked = prevSteps < d.stepRequirement;
    const isStepUnlocked = newSteps >= d.stepRequirement;
    const isLevelUnlocked = level >= d.levelRequirement;
    
    if (wasStepLocked && isStepUnlocked && isLevelUnlocked) {
      newlyUnlocked.push(d.name);
    }
  });

  state.profile.steps = newSteps;
  addChronicleEvent(`👣 Logged ${Math.floor(count).toLocaleString()} steps. Total: ${state.profile.steps.toLocaleString()}`);

  if (newlyUnlocked.length > 0) {
    state.profile.newDungeonsUnlocked = state.profile.newDungeonsUnlocked || [];
    state.profile.newDungeonsUnlocked.push(...newlyUnlocked);
  }

  notify();
}

/**
 * Equipment Inventories Management (Stubs for compatibility)
 */
export function equipItem(itemId) {
  recalculateDerivedStats();
  notify();
}

export function unequipItem(slot) {
  recalculateDerivedStats();
  notify();
}

export function sellItem(itemId) {
  notify();
}

export function buyMomentumRecovery() {
  const m = state.profile.momentum;
  if (m >= 100) return false;

  const cost = Math.floor(40 + (m * 1.5));
  if (state.profile.gold < cost) return false;

  state.profile.gold -= cost;
  state.profile.momentum = Math.min(100, state.profile.momentum + 35);
  
  addChronicleEvent(`🔥 Recovered consistency flame (spent ${cost} Gold)`);
  notify();
  return true;
}

/* ==========================================================================
   Expeditions Logic Syncs
   ========================================================================== */

export function startExpedition(dungeonId) {
  state.profile.selectedDungeonId = dungeonId;
  const hasRestBuff = state.expedition?.restBonusActive || false;
  state.expedition = {
    active: true,
    dungeonId,
    startedAt: Date.now(),
    lastCombatSimulatedAt: Date.now(),
    totalDuration: 0,
    stageIndex: 0,
    logs: [hasRestBuff ? `🔥 Campfire Rest Buff Active (+15% XP)! Embarked into the depths...` : `🌲 Embarked into the depths! Let your focus guide your blades...`],
    rewardsGained: { gold: 0, xp: 0, essence: 0, coreFragments: 0, relicShards: 0 },
    bankedRewards: { gold: 0, xp: 0, essence: 0, coreFragments: 0, relicShards: 0 },
    restActive: false,
    restTimeRemaining: 0,
    restBonusActive: false, // consumed on start
    claimedMilestones: []
  };
  addChronicleEvent(`🗺️ Embarked on dungeon expedition into ${dungeonId.toUpperCase()}!${hasRestBuff ? ' (Campfire Rest Buff: +15% XP)' : ''}`);
  recalculateDerivedStats();
  notify();
}

export function startCampfireRest(durationMs = 300000) {
  state.expedition.restActive = true;
  state.expedition.restTimeRemaining = durationMs;
  addChronicleEvent(`🏕️ Started Campfire Sanctuary Rest (5 minutes to recharge & buff next run).`);
  saveState();
  notify();
}

export function finishCampfireRest() {
  state.expedition.restActive = false;
  state.expedition.restTimeRemaining = 0;
  state.expedition.restBonusActive = true;
  addChronicleEvent(`🔥 Campfire Rest Complete! Gained +15% XP Campfire Rest Buff on your next focus expedition!`);
  saveState();
  notify();
}

export function completeExpedition() {
  if (!state.expedition.active) return;

  // Capture pre-levels
  const oldLvlSum = state.profile.totalLevel;
  const oldSkillsLevels = { ...derivedStats.skillsLevels };
  const oldCombatStats = { ...derivedStats.combatStats };

  // Apply final rewards gathered
  let xp = state.expedition.rewardsGained.xp;
  if (state.expedition.restBonusActive) {
    xp = Math.floor(xp * 1.15); // +15% Campfire Rest Buff!
  }

  state.profile.gold += state.expedition.rewardsGained.gold;
  state.skills.strength += Math.floor(xp * 0.5);
  state.skills.vitality += Math.floor(xp * 0.3);
  state.skills.agility += Math.floor(xp * 0.2);

  // Add materials rewards
  state.progression.materials.essence += state.expedition.rewardsGained.essence || 0;
  state.progression.materials.coreFragments += state.expedition.rewardsGained.coreFragments || 0;
  state.progression.materials.relicShards += state.expedition.rewardsGained.relicShards || 0;
  state.progression.materials.tomeOfRebirth1 += state.expedition.rewardsGained.tomeOfRebirth1 || 0;
  state.progression.materials.tomeOfRebirth2 += state.expedition.rewardsGained.tomeOfRebirth2 || 0;
  state.progression.materials.tomeOfRebirth3 += state.expedition.rewardsGained.tomeOfRebirth3 || 0;
  state.progression.materials.tomeOfRebirth4 += state.expedition.rewardsGained.tomeOfRebirth4 || 0;
  state.progression.materials.tomeOfRebirth5 += state.expedition.rewardsGained.tomeOfRebirth5 || 0;

  // Combine with banked for final report
  state.expedition.rewardsGained.gold += state.expedition.bankedRewards?.gold || 0;
  state.expedition.rewardsGained.xp += state.expedition.bankedRewards?.xp || 0;
  state.expedition.rewardsGained.essence = (state.expedition.rewardsGained.essence || 0) + (state.expedition.bankedRewards?.essence || 0);
  state.expedition.rewardsGained.coreFragments = (state.expedition.rewardsGained.coreFragments || 0) + (state.expedition.bankedRewards?.coreFragments || 0);
  state.expedition.rewardsGained.relicShards = (state.expedition.rewardsGained.relicShards || 0) + (state.expedition.bankedRewards?.relicShards || 0);

  addChronicleEvent(`🏆 Expedition Cleared: +${state.expedition.rewardsGained.xp} total combat XP, +${state.expedition.rewardsGained.gold} Gold, +${state.expedition.rewardsGained.essence || 0} Essence!`);

  // Increment total expeditions completed
  state.profile.totalExpeditionsCompleted = (state.profile.totalExpeditionsCompleted || 0) + 1;

  // Close active combat but check if user triggers rest mode
  state.expedition.active = false;

  checkForLevelUps(oldLvlSum, oldSkillsLevels, oldCombatStats);
  notify();
}

export function terminateExpeditionGracefully(message) {
  if (!state.expedition.active) return;
  
  // Interrupted! Preserve 35% of UNBANKED gold/xp/materials rewards
  const gGain = Math.floor(state.expedition.rewardsGained.gold * 0.35);
  const xpGain = Math.floor(state.expedition.rewardsGained.xp * 0.15);
  const essGain = Math.floor((state.expedition.rewardsGained.essence || 0) * 0.35);
  const fragGain = Math.floor((state.expedition.rewardsGained.coreFragments || 0) * 0.35);
  const relicGain = Math.floor((state.expedition.rewardsGained.relicShards || 0) * 0.35);
  
  state.profile.gold += gGain;
  state.skills.strength += xpGain;
  state.progression.materials.essence += essGain;
  state.progression.materials.coreFragments += fragGain;
  state.progression.materials.relicShards += relicGain;
  // Retain 100% of rare Tomes of Rebirth on retreat
  state.progression.materials.tomeOfRebirth1 += state.expedition.rewardsGained.tomeOfRebirth1 || 0;
  state.progression.materials.tomeOfRebirth2 += state.expedition.rewardsGained.tomeOfRebirth2 || 0;
  state.progression.materials.tomeOfRebirth3 += state.expedition.rewardsGained.tomeOfRebirth3 || 0;
  state.progression.materials.tomeOfRebirth4 += state.expedition.rewardsGained.tomeOfRebirth4 || 0;
  state.progression.materials.tomeOfRebirth5 += state.expedition.rewardsGained.tomeOfRebirth5 || 0;

  // Combine penalized + banked so the report shows exactly what the user walked away with
  const banked = state.expedition.bankedRewards || { gold: 0, xp: 0, essence: 0, coreFragments: 0, relicShards: 0 };
  state.expedition.rewardsGained.gold = gGain + banked.gold;
  state.expedition.rewardsGained.xp = xpGain + banked.xp;
  state.expedition.rewardsGained.essence = essGain + banked.essence;
  state.expedition.rewardsGained.coreFragments = fragGain + banked.coreFragments;
  state.expedition.rewardsGained.relicShards = relicGain + banked.relicShards;
  state.expedition.rewardsGained.tomeOfRebirth1 = (state.expedition.rewardsGained.tomeOfRebirth1 || 0) + (banked.tomeOfRebirth1 || 0);
  state.expedition.rewardsGained.tomeOfRebirth2 = (state.expedition.rewardsGained.tomeOfRebirth2 || 0) + (banked.tomeOfRebirth2 || 0);
  state.expedition.rewardsGained.tomeOfRebirth3 = (state.expedition.rewardsGained.tomeOfRebirth3 || 0) + (banked.tomeOfRebirth3 || 0);
  state.expedition.rewardsGained.tomeOfRebirth4 = (state.expedition.rewardsGained.tomeOfRebirth4 || 0) + (banked.tomeOfRebirth4 || 0);
  state.expedition.rewardsGained.tomeOfRebirth5 = (state.expedition.rewardsGained.tomeOfRebirth5 || 0) + (banked.tomeOfRebirth5 || 0);

  addChronicleEvent(`💔 Expedition Aborted: Walked away with ${state.expedition.rewardsGained.gold} total Gold and ${state.expedition.rewardsGained.xp} XP.`);

  state.expedition.active = false;
  state.expedition.dungeonId = null;

  // Mute consistency due to distraction
  changeMomentum(-10);

  recalculateDerivedStats();
  notify();
}

export function updateActiveExpedition(updateFn) {
  if (!state.expedition.active) return;
  updateFn(state.expedition, derivedStats);
  notify();
}

export function bankExpeditionSpoils() {
  if (!state.expedition.active) return;
  const rewards = state.expedition.rewardsGained;
  
  state.profile.gold += rewards.gold;
  const xp = rewards.xp;
  state.skills.strength += Math.floor(xp * 0.5);
  state.skills.vitality += Math.floor(xp * 0.3);
  state.skills.agility += Math.floor(xp * 0.2);

  state.progression.materials.essence += rewards.essence || 0;
  state.progression.materials.coreFragments += rewards.coreFragments || 0;
  state.progression.materials.relicShards += rewards.relicShards || 0;
  state.progression.materials.tomeOfRebirth1 += rewards.tomeOfRebirth1 || 0;
  state.progression.materials.tomeOfRebirth2 += rewards.tomeOfRebirth2 || 0;
  state.progression.materials.tomeOfRebirth3 += rewards.tomeOfRebirth3 || 0;
  state.progression.materials.tomeOfRebirth4 += rewards.tomeOfRebirth4 || 0;
  state.progression.materials.tomeOfRebirth5 += rewards.tomeOfRebirth5 || 0;

  state.expedition.bankedRewards.gold += rewards.gold;
  state.expedition.bankedRewards.xp += rewards.xp;
  state.expedition.bankedRewards.essence += rewards.essence || 0;
  state.expedition.bankedRewards.coreFragments += rewards.coreFragments || 0;
  state.expedition.bankedRewards.relicShards += rewards.relicShards || 0;
  state.expedition.bankedRewards.tomeOfRebirth1 += rewards.tomeOfRebirth1 || 0;
  state.expedition.bankedRewards.tomeOfRebirth2 += rewards.tomeOfRebirth2 || 0;
  state.expedition.bankedRewards.tomeOfRebirth3 += rewards.tomeOfRebirth3 || 0;
  state.expedition.bankedRewards.tomeOfRebirth4 += rewards.tomeOfRebirth4 || 0;
  state.expedition.bankedRewards.tomeOfRebirth5 += rewards.tomeOfRebirth5 || 0;

  state.expedition.rewardsGained = { gold: 0, xp: 0, essence: 0, coreFragments: 0, relicShards: 0, tomeOfRebirth1: 0, tomeOfRebirth2: 0, tomeOfRebirth3: 0, tomeOfRebirth4: 0, tomeOfRebirth5: 0 };
}

export function deleteQuest(questId) {
  const quest = state.quests.find(q => q.id === questId);
  if (quest) {
    addChronicleEvent(`🗑️ Removed bounty: "${quest.text}"`);
  }
  state.quests = state.quests.filter(q => q.id !== questId);
  notify();
}

export function claimPendingLoginBonus(dungeonId = "woods") {
  if (!state.profile.hasPendingLoginBonus) return null;

  // Grant Gold & Materials only (no items!)
  state.profile.gold += 150;
  state.progression.materials.essence += 30;
  state.progression.materials.relicShards += 3;

  // Set flag false
  state.profile.hasPendingLoginBonus = false;
  
  addChronicleEvent(`🎁 Claimed Guild Daily Tribute: +150 Gold, +30 Essence, +3 Relic Shards!`);
  notify();
  return { gold: 150, essence: 30, relicShards: 3 };
}

export function clearPendingLevelUp() {
  state.profile.pendingLevelUp = null;
  notify();
}

export function claimWeeklySummary() {
  const summary = state.profile.lastWeekSummary;
  state.profile.hasPendingWeeklySummary = false;
  state.profile.lastWeekSummary = null;
  notify();
  return summary;
}

export function updateHeroName(name) {
  if (name && name.trim()) {
    state.profile.name = name.trim();
    addChronicleEvent(`📝 Hero renamed to ${state.profile.name}.`);
    notify();
  }
}

export function resetSave() {
  localStorage.removeItem(SAVE_KEY);
  window.location.reload();
}

function checkForLevelUps(oldLvlSum, oldSkillsLevels, oldCombatStats) {
  recalculateDerivedStats();
  
  const skillEmojis = {
    strength: '⚔️ Strength',
    agility: '🏃 Agility',
    wisdom: '📖 Wisdom',
    intelligence: '🧪 Intelligence',
    insight: '👁️ Insight',
    vitality: '💤 Vitality',
    charisma: '🍻 Charisma',
    cleaning: '🧹 Cleaning'
  };

  const newLevels = derivedStats.skillsLevels;
  const newCombat = derivedStats.combatStats;

  const accumulatedStats = [];
  let mainTitle = '';
  let mainIcon = '🌟';

  // 1. Check if individual skills leveled up
  for (const [skill, oldLvl] of Object.entries(oldSkillsLevels)) {
    const newLvl = newLevels[skill];
    if (newLvl > oldLvl) {
      const diff = newLvl - oldLvl;
      accumulatedStats.push(`🌟 ${skillEmojis[skill]} increased by ${diff} (Lvl ${newLvl})`);
      
      const levelUpText = `🌟 Level Up! ${skillEmojis[skill]} reached Level ${newLvl}!`;
      addChronicleEvent(levelUpText);
      
      if (state.profile.weeklyStats && !state.profile.weeklyStats.skillsLeveled.includes(skill)) {
        state.profile.weeklyStats.skillsLeveled.push(skill);
      }

      if (!mainTitle) {
        mainTitle = `Your ${skillEmojis[skill]} reached Level ${newLvl}!`;
        mainIcon = skill === 'strength' ? '⚔️' : skill === 'cleaning' ? '🧹' : skill === 'wisdom' ? '📖' : '✨';
      }
    }
  }

  // 2. Check if total Level (Character Level) leveled up
  if (state.profile.totalLevel > oldLvlSum) {
    const totalDiff = state.profile.totalLevel - oldLvlSum;
    accumulatedStats.push(`🏆 Total Character Level increased by ${totalDiff} (Lvl ${state.profile.totalLevel})`);
    
    const charLvlUpText = `🏆 Character Level increased to ${state.profile.totalLevel}!`;
    addChronicleEvent(charLvlUpText);
    addGuildBulletinEvent(`🏆 ${state.profile.name} reached Level ${state.profile.totalLevel}!`, 'major');

    mainTitle = `Congratulations! Character Level increased to ${state.profile.totalLevel}!`;
    mainIcon = '🏆';
  }

  if (accumulatedStats.length > 0) {
    const dmgDiff = newCombat.damageRange - oldCombatStats.damageRange;
    if (dmgDiff > 0) {
      accumulatedStats.push(`🪓 Damage increased by ${dmgDiff}`);
    }
    
    const attDiff = newCombat.attack - oldCombatStats.attack;
    if (attDiff > 0) {
      accumulatedStats.push(`🗡️ Accuracy increased by ${attDiff}`);
    }
    
    const defDiff = newCombat.defense - oldCombatStats.defense;
    if (defDiff > 0) {
      accumulatedStats.push(`🛡️ Armor increased by ${defDiff}`);
    }
    
    const hpDiff = newCombat.maxHP - oldCombatStats.maxHP;
    if (hpDiff > 0) {
      accumulatedStats.push(`❤️ Maximum Health increased by ${hpDiff}`);
    }

    state.profile.pendingLevelUp = {
      title: mainTitle,
      icon: mainIcon,
      statsList: accumulatedStats
    };
  }
}

/* ==========================================================================
   RPG Progression Action Creators
   ========================================================================== */

export function changeClass(className, isInitialSetup = false) {
  if (!state.progression) return false;

  const classObj = CLASS_PATHS.find(c => c.name === className);
  if (!classObj) return false;

  const tier = classObj.tier;
  const tomeKey = `tomeOfRebirth${tier}`;

  if (!isInitialSetup) {
    const count = state.progression.materials[tomeKey] || 0;
    if (count <= 0) return false; // Fail swap if they do not own the Tome
    state.progression.materials[tomeKey]--;
  }

  state.progression.currentClass = className;
  
  const tomeName = tier === 1 ? "Tome of Rebirth I" :
                   tier === 2 ? "Tome of Rebirth II" :
                   tier === 3 ? "Tome of Rebirth III" :
                   tier === 4 ? "Tome of Rebirth IV" : "Tome of Rebirth V";

  if (!isInitialSetup) {
    addChronicleEvent(`⚔️ Class Swap: Consumed 1 ${tomeName} to switch to ${className}!`);
    state.profile.pendingClassAdvancement = {
      className: className,
      tier: classObj.tier,
      ability: classObj.ability
    };
  } else {
    addChronicleEvent(`⚔️ Class Evolution: Evolved into a ${className}!`);
  }

  recalculateDerivedStats();
  notify();
  return true;
}

export function clearPendingClassAdvancement() {
  state.profile.pendingClassAdvancement = null;
  notify();
}

export function unlockClass(className) {
  if (!state.progression) return false;

  const classObj = CLASS_PATHS.find(c => c.name === className);
  if (!classObj) return false;

  // Check Parent Class requirement - must have unlocked parent tier first!
  if (classObj.parentId && !state.progression.unlockedClasses.includes(classObj.parentId)) {
    return false;
  }

  // Check Level & Skill Requirements
  const derived = getDerivedStats();
  const reqs = classObj.reqs || {};
  const meetsLevel = (state.profile.totalLevel || 1) >= (reqs.level || 1);
  const meetsStats = Object.entries(reqs).every(([stat, val]) => {
    if (stat === 'level') return true;
    return (derived.skillsLevels[stat] || 1) >= val;
  });

  if (!meetsLevel || !meetsStats) return false;

  if (!state.progression.unlockedClasses.includes(className)) {
    state.progression.unlockedClasses.push(className);
    state.progression.currentClass = className;

    addChronicleEvent(`🔮 Class Advancement: Unlocked and ascended to ${className}!`);
    addGuildBulletinEvent(`🔮 ${state.profile.name} ascended to Class Tier ${classObj.tier}: ${className}!`, 'major');

    state.profile.pendingClassAdvancement = {
      className: className,
      tier: classObj.tier,
      ability: classObj.ability
    };

    recalculateDerivedStats();
    saveState();
    notify();
    return true;
  }
  return false;
}

export function switchWeapon(weaponKey) {
  if (!state.progression) return;
  state.progression.equippedWeapon = weaponKey;
  const name = WEAPON_PRESETS[weaponKey]?.name || "Fists";
  addChronicleEvent(`⚔️ Equipped Weapon: Swapped active weapon to ${name}!`);
  recalculateDerivedStats();
  notify();
}

export function investEssence(amount) {
  if (!state.progression.armorForge) {
    state.progression.armorForge = { level: 1, essenceInvested: 0 };
  }
  const level = state.progression.armorForge.level;
  if (level >= 10) return false;

  const cost = getArmorForgeUpgradeCost(level);
  const maxCanInvest = cost - state.progression.armorForge.essenceInvested;
  const toInvest = Math.min(amount, maxCanInvest, state.progression.materials.essence);

  if (toInvest <= 0) return false;

  state.progression.materials.essence -= toInvest;
  state.progression.armorForge.essenceInvested += toInvest;

  let message = `Invested ${toInvest} Essence into the Armor Forge.`;

  if (state.progression.armorForge.essenceInvested >= cost) {
    state.progression.armorForge.level++;
    state.progression.armorForge.essenceInvested = 0;
    const newTier = ARMOR_TIERS[state.progression.armorForge.level - 1] || "Plate";
    message += ` 🛡️ Upgraded to ${newTier}!`;
    addChronicleEvent(`🛡️ Armor Forge Upgraded: Reached Level ${state.progression.armorForge.level} (${newTier})!`);
  }

  recalculateDerivedStats();
  notify();
  return { success: true, message };
}

export function upgradeCore(coreName) {
  // kept as stub for core compatibility
  return false;
}

export function equipCore(coreName) {
  // kept as stub
}

export function craftRelic(relicId, costEssence, costShards) {
  if (!state.progression) return false;
  if (state.progression.unlockedRelics.includes(relicId)) return false;

  if (state.progression.materials.essence >= costEssence &&
      state.progression.materials.relicShards >= costShards) {
    state.progression.materials.essence -= costEssence;
    state.progression.materials.relicShards -= costShards;
    state.progression.unlockedRelics.push(relicId);
    addChronicleEvent(`💍 Crafted Relic: Forged ${relicId}!`);
    notify();
    return true;
  }
  return false;
}

export function equipRelic(relicId) {
  if (!state.progression) return;
  state.progression.equippedRelic = relicId;
  addChronicleEvent(`💍 Equipped Relic: Active relic is now ${relicId}.`);
  recalculateDerivedStats();
  notify();
}

export function incrementCodexKill(monsterName) {
  if (!state.progression) return;
  if (!state.progression.monsterCodex[monsterName]) {
    state.progression.monsterCodex[monsterName] = 0;
  }
  state.progression.monsterCodex[monsterName]++;
  
  const kills = state.progression.monsterCodex[monsterName];
  if (kills === 10 || kills === 100 || kills === 1000) {
    addChronicleEvent(`👾 Codex Milestone: Defeated ${monsterName} ${kills} times! Buff unlocked!`);
  }
  
  recalculateDerivedStats();
  notify();
}

export function incrementWeaponMasteryXP(weaponKey, xpAmount) {
  if (!state.progression) return;
  if (state.progression.weaponXP[weaponKey] === undefined) {
    state.progression.weaponXP[weaponKey] = 0;
  }
  const oldXp = state.progression.weaponXP[weaponKey];
  const oldRank = weaponRankForXp(oldXp);
  
  state.progression.weaponXP[weaponKey] += xpAmount;
  
  const newRank = weaponRankForXp(state.progression.weaponXP[weaponKey]);
  const leveledUp = newRank > oldRank;
  
  if (leveledUp) {
    addChronicleEvent(`🎉 Weapon Mastery: ${weaponKey.toUpperCase()} reached Rank ${newRank}!`);
  }
  
  recalculateDerivedStats();
  notify();
  
  return { leveledUp, newRank };
}

/* ==========================================================================
   Cosmetic Wardrobe & Shop Management
   ========================================================================== */

export function checkMilestoneCosmeticUnlocks() {
  if (!state.profile.cosmetics) {
    state.profile.cosmetics = {
      equippedHair: 'default-hair',
      equippedSkin: 'default-skin',
      equippedAura: 'none-aura',
      equippedCape: 'none-cape',
      unlockedItems: ['default-hair', 'default-skin', 'none-aura', 'none-cape']
    };
  }
  
  if (!state.profile.cosmetics.equippedCape) {
    state.profile.cosmetics.equippedCape = 'none-cape';
  }
  if (!state.profile.cosmetics.unlockedItems.includes('none-cape')) {
    state.profile.cosmetics.unlockedItems.push('none-cape');
  }

  const unlocked = state.profile.cosmetics.unlockedItems;
  const derived = getDerivedStats();
  const skillLevels = derived.skillsLevels || {};
  const totalLvl = state.profile.totalLevel || 1;
  const steps = state.profile.steps || 0;

  // Achievement metrics
  const totalBounties = (state.profile.bountyHistory?.length || 0) + (state.profile.totalQuestsCompleted || 0);
  const codex = state.progression?.monsterCodex || {};
  const totalKills = Object.values(codex).reduce((acc, v) => acc + (v || 0), 0);
  const bossNames = ['Elder Druid Shade', 'Gemstone Colossus', 'Lich King Remnant', 'Dread Knight Overlord', 'Chronos Cosmic Dragon'];
  const hasBossKill = bossNames.some(b => (codex[b] || 0) > 0);
  const totalExpeditions = state.profile.totalExpeditionsCompleted || 0;

  const milestones = [
    // Skill masteries
    { id: 'viking-helm', met: (skillLevels.strength || 1) >= 15 },
    { id: 'ninja-garb', met: (skillLevels.agility || 1) >= 15 },
    { id: 'steampunk-coat', met: (skillLevels.intelligence || 1) >= 15 },
    { id: 'holy-halo', met: (skillLevels.wisdom || 1) >= 15 },
    { id: 'champions-laurels', met: totalLvl >= 30 },
    { id: 'celestial-wings', met: totalLvl >= 50 },
    { id: 'dragon-slayer', met: steps >= 1000000 },

    // Level progression unlocks
    { id: 'wanderers-cloak', met: totalLvl >= 5 },
    { id: 'braided-topknot', met: totalLvl >= 10 },
    { id: 'storm-aura', met: totalLvl >= 15 },
    { id: 'battle-scarred', met: totalLvl >= 20 },
    { id: 'royal-cape', met: totalLvl >= 25 },
    { id: 'golden-skin', met: totalLvl >= 30 },
    { id: 'silver-sage-hair', met: totalLvl >= 35 },

    // Achievement milestones
    { id: 'crimson-skin', met: totalKills >= 25 },
    { id: 'shadowmeld-cloak', met: totalKills >= 50 },
    { id: 'void-aura', met: hasBossKill },
    { id: 'phoenix-cape', met: totalExpeditions >= 10 },
    { id: 'midnight-locs', met: totalBounties >= 100 }
  ];

  let unlockedNew = false;
  milestones.forEach(m => {
    if (m.met && !unlocked.includes(m.id)) {
      unlocked.push(m.id);
      unlockedNew = true;
      addChronicleEvent(`🎁 Milestone Cosmetic Unlocked: "${m.id.replace('-', ' ').toUpperCase()}"!`);
    }
  });

  if (unlockedNew) {
    saveState();
  }
}

export function buyCosmetic(itemId, cost, isPremium) {
  if (!state.profile.cosmetics) return { success: false, message: "Cosmetics not initialized." };
  const unlocked = state.profile.cosmetics.unlockedItems;
  if (unlocked.includes(itemId)) return { success: false, message: "Already unlocked!" };

  if (isPremium) {
    unlocked.push(itemId);
    addChronicleEvent(`💎 Premium Cosmetic Unlocked: "${itemId.replace('-', ' ').toUpperCase()}" purchased!`);
    notify();
    return { success: true, message: "Premium skin unlocked successfully! Thank you for supporting the Guild!" };
  } else {
    if (state.profile.gold < cost) {
      return { success: false, message: "⚠️ Insufficient Gold coins!" };
    }
    state.profile.gold -= cost;
    unlocked.push(itemId);
    addChronicleEvent(`🛍️ Wardrobe Purchased: "${itemId.replace('-', ' ').toUpperCase()}" for ${cost} Gold.`);
    notify();
    return { success: true, message: "Purchased successfully!" };
  }
}

export function equipCosmetic(category, itemId) {
  if (!state.profile.cosmetics) return;
  
  if (category === 'hair') {
    state.profile.cosmetics.equippedHair = itemId;
  } else if (category === 'skin') {
    state.profile.cosmetics.equippedSkin = itemId;
  } else if (category === 'aura') {
    state.profile.cosmetics.equippedAura = itemId;
  } else if (category === 'cape') {
    state.profile.cosmetics.equippedCape = itemId;
  }
  
  addChronicleEvent(`🎭 Wardrobe Equipped: ${itemId.replace('-', ' ').toUpperCase()}.`);
  notify();
}

/* ==========================================================================
   Guild & Co-op Raid Helpers
   ========================================================================== */

export function addGuildBulletinEvent(text, type = 'minor') {
  if (!state.guild) return;
  if (!state.guild.bulletin) state.guild.bulletin = [];
  state.guild.bulletin.unshift({ text, time: Date.now(), type, huzzahs: 0 });
  if (state.guild.bulletin.length > 50) {
    state.guild.bulletin.pop();
  }
}

export function huzzahEvent(idx) {
  if (!state.guild || !state.guild.bulletin) return;
  const entry = state.guild.bulletin[idx];
  if (entry) {
    entry.huzzahs = (entry.huzzahs || 0) + 1;
    notify();
  }
}

export function rotateGuildRaidBossIfNeeded() {
  if (!state.guild) return;
  const now = Date.now();
  if (now >= (state.guild.bossEndsAt || 0) || state.guild.bossCurrentHP <= 0) {
    // Pick new random boss from RAID_BOSS_POOL different from active
    let nextIdx = Math.floor(Math.random() * RAID_BOSS_POOL.length);
    if (nextIdx === state.guild.activeBossIndex) {
      nextIdx = (nextIdx + 1) % RAID_BOSS_POOL.length;
    }
    const newBoss = RAID_BOSS_POOL[nextIdx];
    
    // Reward player if boss was cleared or timer ended
    if (state.guild.userDamage > 0) {
      const contribRatio = Math.min(1, state.guild.userDamage / state.guild.totalGuildDamage || 0.1);
      const earnedBadges = Math.max(10, Math.floor(100 * contribRatio));
      const earnedGold = Math.floor(300 * contribRatio);
      
      state.guild.badges = (state.guild.badges || 0) + earnedBadges;
      state.profile.gold += earnedGold;
      
      addChronicleEvent(`🏆 Guild Raid Concluded! Earned +${earnedBadges} Guild Badges & +${earnedGold} Gold based on damage contribution!`);
      addGuildBulletinEvent(`🏆 Raid concluded! ${state.profile.name} earned +${earnedBadges} Badges & +${earnedGold} Gold!`, 'major');
    }

    state.guild.activeBossIndex = nextIdx;
    state.guild.bossMaxHP = newBoss.hp;
    state.guild.bossCurrentHP = newBoss.hp;
    state.guild.userDamage = 0;
    state.guild.totalGuildDamage = Math.floor(newBoss.hp * 0.15); // baseline simulated team damage start
    state.guild.bossEndsAt = now + (7 * 24 * 60 * 60 * 1000);

    addGuildBulletinEvent(`🌋 New Raid Boss Discovered: ${newBoss.name} (${newBoss.title})! Vulnerable to ${newBoss.weak.toUpperCase()}!`, 'major');
  }
}

export function leaveGuild() {
  if (state.guild) {
    state.guild = null;
    saveState();
    notify();
  }
}

export function createGuild(name) {
  state.guild = {
    name: name || "New Vanguard",
    isLeader: true,
    badges: 0,
    activeBossIndex: 0,
    bossCurrentHP: RAID_BOSS_POOL[0].hp,
    bossMaxHP: RAID_BOSS_POOL[0].hp,
    bossEndsAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
    userDamage: 0,
    totalGuildDamage: 0,
    bulletin: [
      { text: `🏛️ Welcome to ${name || "New Vanguard"}! Founded by ${state.profile.name}.`, time: Date.now(), type: 'major', huzzahs: 0 }
    ],
    members: [
      { name: state.profile.name, archetype: state.progression.currentClass || "Commoner", level: state.profile.totalLevel || 1, role: "Guildmaster" }
    ]
  };
  saveState();
  notify();
}

export function renameGuild(newName) {
  if (!state.guild) return { success: false, message: "No active guild." };
  const trimmed = (newName || "").trim();
  if (!trimmed) return { success: false, message: "Guild name cannot be empty." };
  
  const oldName = state.guild.name;
  state.guild.name = trimmed;
  addChronicleEvent(`🏛️ Guild renamed from "${oldName}" to "${trimmed}"!`);
  addGuildBulletinEvent(`🏛️ Guild name officially updated to "${trimmed}" by ${state.profile.name}!`, 'major');
  
  // If connected to Clerk organization, sync name
  if (isClerkReady() && clerkInstance?.organization && typeof clerkInstance.organization.update === 'function') {
    clerkInstance.organization.update({ name: trimmed }).catch(err => {
      console.warn("Clerk organization name sync:", err);
    });
  }

  saveState();
  notify();
  return { success: true, message: `Guild name updated to "${trimmed}"!` };
}

export function joinGuild(name) {
  const activeBossIndex = 0;
  const boss = RAID_BOSS_POOL[activeBossIndex];

  state.guild = {
    name: name,
    isLeader: false,
    badges: 0,
    activeBossIndex: activeBossIndex,
    bossCurrentHP: boss.hp,
    bossMaxHP: boss.hp,
    bossEndsAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
    userDamage: 0,
    totalGuildDamage: 0,
    bulletin: [
      { text: `👋 ${state.profile.name} has joined ${name}!`, time: Date.now(), type: 'major', huzzahs: 0 }
    ],
    members: [
      { name: state.profile.name, archetype: state.progression.currentClass || "Wanderer", level: state.profile.totalLevel || 1, role: "Member" }
    ]
  };
  saveState();
  notify();
}

/* ==========================================================================
   Friend & Party System (Connect to Friends)
   ========================================================================== */

export function addFriend(friendName) {
  if (!friendName || typeof friendName !== 'string') return { success: false, message: 'Invalid name.' };
  const trimmed = friendName.trim();
  if (!trimmed) return { success: false, message: 'Please enter a valid adventurer or Clerk name.' };
  if (trimmed.toLowerCase() === state.profile.name.toLowerCase()) {
    return { success: false, message: "You cannot add yourself as a friend!" };
  }

  state.friends = state.friends || [];
  const exists = state.friends.some(f => f.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    return { success: false, message: `${trimmed} is already in your friends list!` };
  }

  const newFriend = {
    id: 'fr_' + Date.now(),
    name: trimmed,
    archetype: 'Adventurer',
    level: 1,
    status: 'online',
    addedAt: Date.now()
  };

  state.friends.push(newFriend);

  // If user is in a guild, invite to guild roster if not present
  if (state.guild && !state.guild.members.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
    state.guild.members.push({
      name: trimmed,
      archetype: 'Adventurer',
      level: 1,
      role: 'Member'
    });
    addGuildBulletinEvent(`🤝 ${trimmed} was invited to the guild by ${state.profile.name}!`, 'major');
  }

  addChronicleEvent(`🤝 Added ${trimmed} to your Adventurer Friends!`);
  saveState();
  notify();
  return { success: true, message: `🤝 Added ${trimmed} to friends!` };
}

export function removeFriend(friendId) {
  state.friends = (state.friends || []).filter(f => f.id !== friendId);
  saveState();
  notify();
}

/* ==========================================================================
   Clerk Authentication & Organization Sync
   ========================================================================== */

let clerkInstance = null;

function isClerkReady() {
  return !!(clerkInstance && clerkInstance.loaded);
}

/**
 * Initializes Clerk using the vanilla JS CDN pattern:
 * 1. Wait for the <script> to load (window.Clerk becomes available)
 * 2. Instantiate with publishable key: new Clerk(key)
 * 3. Call await clerk.load() to fully initialize with UI components
 */
export async function initClerkAuth() {
  if (clerkInstance && clerkInstance.loaded) return clerkInstance;

  const PUBLISHABLE_KEY = "pk_test_c29jaWFsLWFhcmR2YXJrLTI4NzguY2xlcmsuYWNjb3VudHMuZGV2JA";

  try {
    // Step 1: Wait for the Clerk browser script to define window.Clerk
    let attempts = 0;
    while (!window.Clerk && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (!window.Clerk) {
      console.warn("Clerk JS SDK script did not load. Running in demo mode.");
      return null;
    }

    // Step 2: Instantiate the Clerk class (CDN exposes the class as window.Clerk)
    // If it's already an instance (loaded), skip
    if (typeof window.Clerk === 'function') {
      clerkInstance = new window.Clerk(PUBLISHABLE_KEY);
    } else {
      // window.Clerk is the global instance (some versions expose it directly)
      clerkInstance = window.Clerk;
    }

    // Step 3: Load Clerk (this fetches env config and sets up UI components)
    if (!clerkInstance.loaded) {
      await clerkInstance.load();
    }

    // Expose on window so other parts of the app can access it
    window.Clerk = clerkInstance;

    syncClerkAuthState();

    // Listen to session/org changes
    if (typeof clerkInstance.addListener === 'function') {
      clerkInstance.addListener(() => {
        syncClerkAuthState();
      });
    }

    return clerkInstance;
  } catch (err) {
    console.error("Clerk init failed:", err);
    return null;
  }
}

export function syncClerkAuthState() {
  if (!isClerkReady()) return;

  const clerk = clerkInstance;
  const isSignedIn = !!clerk.user;

  state.auth.isSignedIn = isSignedIn;

  if (isSignedIn && clerk.user) {
    const user = clerk.user;
    state.auth.user = {
      id: user.id,
      name: user.fullName || user.firstName || 'Guild Adventurer',
      email: user.primaryEmailAddress?.emailAddress || '',
      imageUrl: user.imageUrl
    };

    // Auto-sync hero name if default
    if (state.profile.name === 'Hero Knight' || state.profile.name === 'Hero') {
      state.profile.name = state.auth.user.name;
    }

    // Sync organization / guild
    if (clerk.organization) {
      const org = clerk.organization;
      state.auth.org = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        imageUrl: org.imageUrl
      };

      // Sync org name to state.guild
      if (!state.guild || state.guild.name !== org.name) {
        state.guild = state.guild || {};
        state.guild.name = org.name;
        state.guild.isLeader = (org.membership?.role === 'org:admin' || org.membership?.role === 'admin');
      }
    }
  } else {
    state.auth.user = null;
    state.auth.org = null;
  }

  saveState();
  notify();
}

export function openClerkSignIn() {
  const afterUrl = window.location.origin + window.location.pathname;

  function doSignIn() {
    if (!clerkInstance) return;

    // Option A: If mountSignIn is available, mount directly inside the parchment modal overlay
    const modalOverlay = document.getElementById('clerk-auth-modal-overlay');
    const mountEl = document.getElementById('clerk-signin-mount');

    if (modalOverlay && mountEl && typeof clerkInstance.mountSignIn === 'function') {
      modalOverlay.classList.remove('hidden');
      if (!mountEl.dataset.mounted) {
        mountEl.innerHTML = '';
        try {
          clerkInstance.mountSignIn(mountEl, {
            afterSignInUrl: afterUrl,
            afterSignUpUrl: afterUrl
          });
          mountEl.dataset.mounted = "true";
          return;
        } catch (mountErr) {
          console.warn("mountSignIn failed, falling back to URL redirect:", mountErr);
          modalOverlay.classList.add('hidden');
        }
      } else {
        return;
      }
    }

    // Option B: Hosted sign-in URL navigation via Clerk API
    try {
      if (typeof clerkInstance.buildSignInUrl === 'function') {
        const signInUrl = clerkInstance.buildSignInUrl({ redirectUrl: afterUrl });
        if (signInUrl) {
          window.location.href = signInUrl;
          return;
        }
      }
    } catch (e) {
      console.warn("buildSignInUrl failed:", e);
    }

    // Option C: redirectToSignIn
    try {
      if (typeof clerkInstance.redirectToSignIn === 'function') {
        clerkInstance.redirectToSignIn({ redirectUrl: afterUrl });
        return;
      }
    } catch (e2) {
      console.warn("redirectToSignIn failed:", e2);
    }

    // Option D: Direct fallback to Clerk accounts.dev sign-in page
    const directUrl = `https://social-aardvark-2878.accounts.dev/sign-in?redirect_url=${encodeURIComponent(afterUrl)}`;
    window.location.href = directUrl;
  }

  if (isClerkReady()) {
    doSignIn();
  } else {
    initClerkAuth().then(() => {
      if (clerkInstance) {
        doSignIn();
      } else {
        // Direct navigation fallback if SDK didn't load from CDN
        const directUrl = `https://social-aardvark-2878.accounts.dev/sign-in?redirect_url=${encodeURIComponent(afterUrl)}`;
        window.location.href = directUrl;
      }
    });
  }
}

export function openClerkUserProfile() {
  if (isClerkReady()) {
    const afterUrl = window.location.origin + window.location.pathname;
    try {
      if (typeof clerkInstance.openUserProfile === 'function') {
        clerkInstance.openUserProfile();
        return;
      }
    } catch (e) {
      console.warn("openUserProfile failed:", e);
    }
    if (typeof clerkInstance.redirectToUserProfile === 'function') {
      clerkInstance.redirectToUserProfile();
    } else {
      window.location.href = `https://social-aardvark-2878.accounts.dev/user?redirect_url=${encodeURIComponent(afterUrl)}`;
    }
  }
}

export function openClerkOrganizationProfile() {
  if (isClerkReady()) {
    try {
      if (typeof clerkInstance.openOrganizationProfile === 'function') {
        clerkInstance.openOrganizationProfile();
        return;
      }
    } catch (e) {
      console.warn("openOrganizationProfile failed:", e);
    }
    if (typeof clerkInstance.redirectToOrganizationProfile === 'function') {
      clerkInstance.redirectToOrganizationProfile();
    } else {
      alert("🏛️ Please visit your Clerk dashboard to manage organizations.");
    }
  } else {
    alert("🏛️ Please sign in first to manage your Guild Organization.");
  }
}

export function createClerkGuildOrg(orgName) {
  if (isClerkReady() && clerkInstance.user && typeof clerkInstance.createOrganization === 'function') {
    clerkInstance.createOrganization({ name: orgName }).then(org => {
      createGuild(org.name);
      syncClerkAuthState();
    }).catch(err => {
      alert(`⚠️ Could not create Guild Org: ${err.message}`);
    });
  } else {
    createGuild(orgName);
  }
}
