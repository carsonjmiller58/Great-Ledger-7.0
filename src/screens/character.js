/* ==========================================================================
   Character Sheet (Hero Stats, Class Destiny & Chronicle) - The Great Ledger
   ========================================================================== */

import { getState, getDerivedStats, changeClass, buyMomentumRecovery, updateHeroName, resetSave, unlockClass } from '../state.js';
import { xpForLevel, DUNGEONS, WEAPON_PRESETS, CLASS_PATHS, getLayeredAvatarSVG } from '../formulas.js';

let collapseClassEvolutions = false;
let collapseSkillMasteries = false;
let collapseCodex = true;
let explorePathsMode = false;

export function resetCharacterState() {
  explorePathsMode = false;
}

export function renderCharacter(container) {
  const state = getState();
  const derived = getDerivedStats();
  const prog = state.progression || {
    currentClass: "Commoner",
    unlockedClasses: ["Commoner", "Wanderer", "Street Rat"],
    equippedWeapon: "blade",
    monsterCodex: {},
    materials: { essence: 0, coreFragments: 0, relicShards: 0 }
  };

  const activeWeaponKey = prog.equippedWeapon || "blade";
  const activeWeapon = WEAPON_PRESETS[activeWeaponKey] || WEAPON_PRESETS.blade;

  // Render main Chronicle layout
  container.innerHTML = `
    <div class="character-screen chronicle-layout">
      
      <!-- 1. HEADER BANNER -->
      <div class="parchment-card chronicle-header">
        <h1 class="chronicle-title font-gold">THE CHRONICLE OF ${state.profile.name.toUpperCase()}</h1>
        <div class="chronicle-subtitle">Level ${state.profile.totalLevel} ${prog.currentClass}</div>
        
        <div class="avatar-shield-container" style="background:radial-gradient(circle, rgba(254,240,138,0.2) 0%, rgba(0,0,0,0) 70%); border-radius:50%; margin:15px auto; width:120px; height:120px; display:flex; align-items:center; justify-content:center;">
          <svg viewBox="0 0 100 100" style="width:100px; height:100px; overflow:visible;">
            ${getLayeredAvatarSVG(state, derived)}
          </svg>
        </div>
        
        <!-- Recovery of Momentum -->
        <div class="momentum-recovery-row">
          <span class="momentum-status">🔥 <strong>Flame Consistency:</strong> ${state.profile.momentum}%</span>
          <button class="btn-secondary btn-buyback" id="btn-buyback-momentum">
            🪙 Ignite (${Math.floor(40 + (state.profile.momentum * 1.5))}g)
          </button>
        </div>
      </div>

      <!-- 2. COMBAT ATTRIBUTES -->
      <div class="parchment-card section-card">
        <h3 class="card-title">⚔️ Combat Attributes</h3>
        <div class="stats-grid">
          <div class="stat-badge">
            <span class="stat-badge-icon">❤️</span>
            <div class="stat-badge-info">
              <span class="stat-badge-val">${derived.combatStats.maxHP}</span>
              <span class="stat-badge-label">Max Health</span>
            </div>
          </div>
          <div class="stat-badge">
            <span class="stat-badge-icon">🗡️</span>
            <div class="stat-badge-info">
              <span class="stat-badge-val">${derived.combatStats.attack}</span>
              <span class="stat-badge-label">Attack Rating</span>
            </div>
          </div>
          <div class="stat-badge">
            <span class="stat-badge-icon">🛡️</span>
            <div class="stat-badge-info">
              <span class="stat-badge-val">${derived.combatStats.defense}</span>
              <span class="stat-badge-label">Defense Rating</span>
            </div>
          </div>
          <div class="stat-badge">
            <span class="stat-badge-icon">🪓</span>
            <div class="stat-badge-info">
              <span class="stat-badge-val">1 - ${derived.combatStats.damageRange}</span>
              <span class="stat-badge-label">Damage Range</span>
            </div>
          </div>
          <div class="stat-badge full-width-badge">
            <span class="stat-badge-icon">${activeWeapon.icon}</span>
            <div class="stat-badge-info" style="align-items: center;">
              <span class="stat-badge-val" style="font-size: 0.82rem;">${activeWeapon.name} (${activeWeapon.range}m range)</span>
              <span class="stat-badge-label">Equipped weapon type</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. CURRENT CLASS & EVOLUTIONS -->
      <div class="parchment-card section-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h3 class="card-title" style="margin-bottom:0;">🛡️ Class Evolutions</h3>
          <div style="display:flex; gap:6px;">
            ${!collapseClassEvolutions ? `
              <button class="btn-secondary" id="btn-toggle-explore-paths" style="padding: 4px 8px; font-size: 0.7rem; border-color: var(--amber-gold);">
                ${explorePathsMode ? '👁️ Normal View' : '🔍 Explore Paths'}
              </button>
            ` : ''}
            <button class="btn-secondary" id="btn-toggle-classes" style="padding: 4px 8px; font-size: 0.7rem;">
              ${collapseClassEvolutions ? '🔽 Expand' : '🔼 Collapse'}
            </button>
          </div>
        </div>
        <div class="current-class-lore">
          <span class="lore-label">Current Path:</span>
          <span class="lore-class font-gold">${prog.currentClass.toUpperCase()}</span>
          ${!collapseClassEvolutions ? `<p class="lore-quote">"${getClassLoreQuote(prog.currentClass)}"</p>` : ''}
        </div>

        ${!collapseClassEvolutions ? `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; margin-bottom:6px;">
          <h4 class="sub-section-title" style="margin:0;">🔮 Destiny Tree</h4>
          <span style="font-size:0.65rem; color:var(--ink-muted);">${explorePathsMode ? 'Showing All Tiers (Preview Mode)' : 'Showing Current & Direct Next Tiers'}</span>
        </div>
        <div class="destiny-tree">
          ${renderDestinyPaths(state, derived, prog)}
        </div>
        ` : ''}
      </div>

      <!-- 4. SKILL MASTERIES -->
      <div class="parchment-card section-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h3 class="card-title" style="margin-bottom:0;">📖 Skill Masteries</h3>
          <button class="btn-secondary" id="btn-toggle-skills" style="padding: 4px 8px; font-size: 0.7rem;">
            ${collapseSkillMasteries ? '🔽 Expand' : '🔼 Collapse'}
          </button>
        </div>
        ${!collapseSkillMasteries ? `
        <div class="skills-stack">
          ${renderSkillsList(state.skills, derived.skillsLevels)}
        </div>
        ` : ''}
      </div>

      <!-- 5. MONSTER CODEX -->
      <div class="parchment-card section-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h3 class="card-title" style="margin-bottom:0;">📖 Monster Codex</h3>
          <div style="display:flex; gap:6px;">
            <button class="btn-secondary" id="btn-char-codex-bonuses" style="padding: 4px 8px; font-size: 0.7rem; border-color: var(--amber-gold);">
              🎯 Kill Bonuses ℹ️
            </button>
            <button class="btn-secondary" id="btn-toggle-codex" style="padding: 4px 8px; font-size: 0.7rem;">
              ${collapseCodex ? '🔽 Expand' : '🔼 Collapse'}
            </button>
          </div>
        </div>
        ${!collapseCodex ? `
        <div class="codex-monsters-list">
          ${renderCodexList(prog.monsterCodex || {})}
        </div>
        ` : ''}
      </div>

      <!-- 6. CHRONICLE HISTORY & SETTINGS -->
      <div class="parchment-card section-card">
        <h3 class="card-title">⚙️ Hero Settings</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 6px;">
            <input type="text" id="input-hero-name" class="parchment-input" style="flex:1; font-size:0.85rem;" value="${state.profile.name}" placeholder="Rename Hero...">
            <button class="btn-primary" id="btn-save-hero-name" style="font-size:0.75rem; padding:4px 10px;">Save</button>
          </div>
          <button class="btn-secondary" id="btn-reset-save" style="font-size:0.7rem; color:var(--ruby-crimson); margin-top:4px;">⚠️ Reset Game Database</button>
        </div>
      </div>

      <!-- Codex Kill Bonuses Modal -->
      <div id="char-codex-modal" class="modal-overlay hidden">
        <div class="parchment-card modal-content" style="max-width: 460px; text-align: left; padding: 20px;">
          <h2 class="card-title" style="margin-bottom: 10px;">🎯 Monster Codex Kill Bonuses</h2>
          
          <div style="font-size: 0.82rem; color: var(--ink-dark); line-height: 1.5; display: flex; flex-direction: column; gap: 10px;">
            <p style="margin: 0;">
              Every beast defeated during Focus Expeditions is cataloged in your <strong>Monster Codex</strong>. Defeating species repeatedly grants permanent passive stat buffs!
            </p>

            <div style="padding: 12px; background: rgba(217, 119, 6, 0.08); border: 1px solid var(--amber-gold); border-radius: 6px;">
              <div style="font-family: var(--font-header); font-size: 0.88rem; font-weight: 700; color: var(--gold-amber); margin-bottom: 6px;">
                💀 10+ Monster Kills Milestone
              </div>
              <ul style="margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px;">
                <li><strong>+1 Permanent Defense:</strong> Protects your hero across all dungeon expeditions.</li>
                <li><strong>+2 Permanent Attack Damage:</strong> Boosts your combat damage range.</li>
                <li><strong>+0.25% Critical Strike Chance:</strong> Every unique monster species slain 10 times unlocks +0.25% permanent Crit Chance across all dungeon & raid boss combat!</li>
              </ul>
            </div>
          </div>

          <div class="modal-actions" style="margin-top: 16px;">
            <button class="btn-primary" id="btn-close-char-codex-modal" style="width: 100%;">Close Guide</button>
          </div>
        </div>
      </div>
    </div>
  `;

  setupEventListeners(container);
}

function getClassLoreQuote(className) {
  const quotes = {
    Commoner: "Every legendary saga begins in humble dirt.",
    Wanderer: "The road teaches what libraries cannot.",
    Fighter: "Steel answers steel, without hesitation.",
    Paladin: "A shield for the weak, a blade for the unholy.",
    Berserker: "Fury is an unstoppable tide.",
    Rogue: "Shadows are merely unmapped paths.",
    Assassin: "One strike ends a hundred wars.",
    Mage: "Reality bends to those who grasp the arcane threads.",
    Archmage: "The stars align to grant ultimate command.",
    Ranger: "The wild whispers secrets to the patient mark."
  };
  return quotes[className] || "A hero forging their own destiny.";
}

function shouldConfirmClassSwitch(currentClassName, targetClassName) {
  const currentClassObj = CLASS_PATHS.find(c => c.name === currentClassName);
  const targetClassObj = CLASS_PATHS.find(c => c.name === targetClassName);

  if (!currentClassObj || !targetClassObj) return false;

  const currentTier = currentClassObj.tier || 1;
  const targetTier = targetClassObj.tier || 1;

  // Triggers warning if switching from higher or equal class (currentTier >= targetTier)
  return currentTier >= targetTier;
}

function promptClassSwitchWarning(currentClassName, targetClassName) {
  const currentClassObj = CLASS_PATHS.find(c => c.name === currentClassName);
  const targetClassObj = CLASS_PATHS.find(c => c.name === targetClassName);

  const currentTier = currentClassObj?.tier || 1;
  const targetTier = targetClassObj?.tier || 1;

  const msg = `⚠️ CLASS SWITCH WARNING\n\n` +
    `You are switching from ${currentClassName} (Tier ${currentTier}) to ${targetClassName} (Tier ${targetTier}).\n\n` +
    `Switching from a higher or equal class tier will change or remove your active class abilities, passives, and skill bonuses.\n\n` +
    `Are you sure you want to proceed?`;

  return confirm(msg);
}

function renderDestinyPaths(state, derived, prog) {
  const unlocked = prog.unlockedClasses || ["Commoner", "Wanderer", "Street Rat"];
  const currentClass = prog.currentClass || "Commoner";
  const materials = prog.materials || {};

  function renderNode(cls) {
    const isUnlocked = unlocked.includes(cls.name);
    const isCurrent = currentClass === cls.name;
    const isParentUnlocked = cls.parentId === null || unlocked.includes(cls.parentId);

    // Normal mode filter: Only show unlocked classes or direct next tier options (where parent is unlocked)
    if (!explorePathsMode && !isUnlocked && !isParentUnlocked) {
      return '';
    }

    const reqs = cls.reqs || {};
    const reqLevel = reqs.level || 1;
    const meetsLevel = (state.profile.totalLevel || 1) >= reqLevel;

    const reqStats = Object.entries(reqs).filter(([k]) => k !== 'level');
    const meetsStats = reqStats.every(([s, val]) => (derived.skillsLevels[s] || 1) >= val);
    const requirementsMet = meetsLevel && meetsStats;

    let buttonHtml = '';
    if (isCurrent) {
      buttonHtml = `<button class="btn-secondary" disabled style="font-size:0.65rem; padding:2px 6px;">Active Class</button>`;
    } else if (isUnlocked) {
      const tomeKey = `tomeOfRebirth${cls.tier || 1}`;
      const hasTome = (materials[tomeKey] || 0) > 0;
      buttonHtml = `<button class="btn-primary btn-switch-class" data-class="${cls.name}" ${hasTome ? '' : 'disabled'} style="font-size:0.65rem; padding:2px 6px;">${hasTome ? '⚡ Set Active' : `🔒 Need T${cls.tier} Tome`}</button>`;
    } else if (!isParentUnlocked) {
      buttonHtml = `<span style="font-size:0.6rem; color:var(--ink-muted); font-weight:bold;">🔒 Req ${cls.parentId}</span>`;
    } else if (requirementsMet) {
      buttonHtml = `<button class="btn-primary btn-unlock-class" data-class="${cls.name}" style="font-size:0.65rem; padding:2px 6px; background:var(--emerald-green) !important;">Unlock Class</button>`;
    } else {
      const reqList = [`Lvl ${reqLevel}`].concat(reqStats.map(([s, v]) => `${s.slice(0, 3).toUpperCase()} ${v}`));
      buttonHtml = `<span style="font-size:0.6rem; color:var(--ruby-crimson); font-weight:bold;">Req: ${reqList.join(', ')}</span>`;
    }

    const children = CLASS_PATHS.filter(c => c.parentId === cls.name);
    const childrenHtml = children.map(child => renderNode(child)).join('');

    return `
      <div class="destiny-node ${isCurrent ? 'active-node' : isUnlocked ? 'unlocked-node' : isParentUnlocked ? 'available-node' : 'locked-node'}" style="margin-bottom:8px; padding:8px; border:1px solid ${isCurrent ? 'var(--gold-amber)' : 'rgba(0,0,0,0.1)'}; border-radius:6px; background:${isCurrent ? 'rgba(217,119,6,0.06)' : isUnlocked ? 'rgba(16,185,129,0.04)' : 'rgba(0,0,0,0.01)'}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="font-size:0.82rem;">${cls.name}</strong>
            <span style="font-size:0.62rem; color:var(--ink-muted); margin-left:6px;">Tier ${cls.tier}</span>
          </div>
          ${buttonHtml}
        </div>
        <div style="font-size:0.65rem; color:var(--emerald-green); margin-top:2px;">Passive: ${cls.ability || 'Stat Affinity'}</div>
        ${childrenHtml ? `
          <div style="margin-left: 12px; margin-top: 6px; border-left: 2px dashed rgba(0,0,0,0.15); padding-left: 8px;">
            ${childrenHtml}
          </div>
        ` : ''}
      </div>
    `;
  }

  const roots = CLASS_PATHS.filter(c => c.parentId === null);
  return roots.map(root => renderNode(root)).join('');
}

function renderSkillsList(skills, levels) {
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

  return Object.entries(skills).map(([skill, xp]) => {
    const lvl = levels[skill] || 1;
    const currentXp = xp || 0;
    const nextLvlXp = xpForLevel(lvl + 1);

    return `
      <div class="skill-row" style="margin-bottom: 6px; padding: 6px 8px; background: rgba(0,0,0,0.02); border-radius: 6px;">
        <div style="display:flex; justify-content:space-between; font-size: 0.78rem; font-weight: bold; margin-bottom: 2px;">
          <span>${skillEmojis[skill] || skill}</span>
          <span style="color: var(--amber-gold);">Level ${lvl}</span>
        </div>
        <div style="font-size: 0.62rem; color: var(--ink-muted); text-align: right;">${currentXp.toLocaleString()} / ${nextLvlXp.toLocaleString()} XP</div>
      </div>
    `;
  }).join('');
}

function renderCodexList(codex) {
  const entries = Object.entries(codex);
  if (entries.length === 0) {
    return `<div style="font-size: 0.75rem; color: var(--ink-muted); text-align:center; padding: 10px;">🔍 No defeated monsters cataloged yet. Complete focus journeys to record monsters.</div>`;
  }
  return entries.map(([name, kills]) => `
    <div style="font-size:0.75rem; display:flex; justify-content:space-between; padding:4px 8px; border-bottom:1px dashed rgba(0,0,0,0.1);">
      <span>💀 <strong>${name}</strong></span>
      <span>${kills} slain</span>
    </div>
  `).join('');
}

function setupEventListeners(container) {
  // Ignite momentum
  const btnBuyback = container.querySelector('#btn-buyback-momentum');
  if (btnBuyback) {
    btnBuyback.addEventListener('click', () => {
      const state = getState();
      if (state.profile.momentum >= 100) {
        alert("🔥 The Consistency Flame already burns at its absolute zenith! Your momentum cannot be fanned any further.");
        return;
      }
      const success = buyMomentumRecovery();
      if (success) {
        renderCharacter(container);
      }
    });
  }

  // Toggle class tree collapse
  const btnToggleClasses = container.querySelector('#btn-toggle-classes');
  if (btnToggleClasses) {
    btnToggleClasses.addEventListener('click', () => {
      collapseClassEvolutions = !collapseClassEvolutions;
      renderCharacter(container);
    });
  }

  // Toggle explore paths mode
  const btnToggleExplore = container.querySelector('#btn-toggle-explore-paths');
  if (btnToggleExplore) {
    btnToggleExplore.addEventListener('click', () => {
      explorePathsMode = !explorePathsMode;
      renderCharacter(container);
    });
  }

  // Toggle skill masteries collapse
  const btnToggleSkills = container.querySelector('#btn-toggle-skills');
  if (btnToggleSkills) {
    btnToggleSkills.addEventListener('click', () => {
      collapseSkillMasteries = !collapseSkillMasteries;
      renderCharacter(container);
    });
  }

  // Toggle codex collapse
  const btnToggleCodex = container.querySelector('#btn-toggle-codex');
  if (btnToggleCodex) {
    btnToggleCodex.addEventListener('click', () => {
      collapseCodex = !collapseCodex;
      renderCharacter(container);
    });
  }

  // Codex Kill Bonuses modal
  const charCodexModal = container.querySelector('#char-codex-modal');
  const btnCharCodex = container.querySelector('#btn-char-codex-bonuses');
  const btnCloseCharCodex = container.querySelector('#btn-close-char-codex-modal');
  if (btnCharCodex && charCodexModal) {
    btnCharCodex.addEventListener('click', () => charCodexModal.classList.remove('hidden'));
    if (btnCloseCharCodex) btnCloseCharCodex.addEventListener('click', () => charCodexModal.classList.add('hidden'));
  }

  // Switch class
  container.querySelectorAll('.btn-switch-class').forEach(btn => {
    btn.addEventListener('click', () => {
      const className = btn.getAttribute('data-class');
      const state = getState();
      const currentClass = state.progression?.currentClass || "Commoner";

      if (shouldConfirmClassSwitch(currentClass, className)) {
        if (!promptClassSwitchWarning(currentClass, className)) {
          return;
        }
      }

      changeClass(className, false);
      renderCharacter(container);
    });
  });

  // Unlock class
  container.querySelectorAll('.btn-unlock-class').forEach(btn => {
    btn.addEventListener('click', () => {
      const className = btn.getAttribute('data-class');
      const state = getState();
      const currentClass = state.progression?.currentClass || "Commoner";

      if (shouldConfirmClassSwitch(currentClass, className)) {
        if (!promptClassSwitchWarning(currentClass, className)) {
          return;
        }
      }

      unlockClass(className);
      renderCharacter(container);
    });
  });

  // Save hero name
  const btnSaveName = container.querySelector('#btn-save-hero-name');
  if (btnSaveName) {
    btnSaveName.addEventListener('click', () => {
      const input = container.querySelector('#input-hero-name');
      if (input && input.value.trim()) {
        updateHeroName(input.value.trim());
        renderCharacter(container);
      }
    });
  }

  // Reset save
  const btnReset = container.querySelector('#btn-reset-save');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm("⚠️ Are you sure you want to reset your character and ledger database? This action cannot be undone!")) {
        resetSave();
      }
    });
  }
}
