import { getState, getDerivedStats, updateActiveExpedition, completeExpedition, terminateExpeditionGracefully, startExpedition, addSteps, saveState, incrementCodexKill } from '../state.js';
import { rollCombatTick, DUNGEONS, getWeaponMasteryKey, WEAPON_PRESETS } from '../formulas.js';
import { getLayeredAvatarSVG } from '../formulas.js';

let timerInterval = null;
let encounterInterval = null;
let battleTickInterval = null;
let targetTime = 0; // Total Focus Goal (ms)
let timeRemaining = 0;
let timeElapsed = 0;
let currentMonster = null;
let lastVisibilityChange = 0;
let isIndefiniteMode = false;
let isBattleActive = false;

export function renderExpedition(container) {
  const state = getState();
  const derived = getDerivedStats();

  // If Campfire Rest Mode is active, render rest view
  if (state.expedition && state.expedition.restActive) {
    renderCampfireRestScreen(container);
    return;
  }

  // If expedition is NOT active, show the countdown setup screen
  if (!state.expedition.active) {
    const selectedDungeonId = state.profile.selectedDungeonId || 'woods';
    const dungeon = DUNGEONS.find(d => d.id === selectedDungeonId) || DUNGEONS[0];

    const vp = document.getElementById('app-viewport');
    if (vp && dungeon) {
      vp.setAttribute('data-biome', dungeon.biome);
    }

    // Reset setup variables safely
    cleanupTimers();
    currentMonster = null;
    lastVisibilityChange = 0;

    container.innerHTML = `
      <div class="expedition-screen setup-view">
        <div class="parchment-card header-banner" style="border-color: ${dungeon.color}; display: flex; flex-direction: column; gap: 4px;">
          <h1 class="card-title" style="margin-bottom:4px; font-size:1.1rem; color: ${dungeon.color}">${dungeon.icon} Deep Focus Journey</h1>
          <p class="description-text">
            Prepare your mind. Selected Destination: <strong style="color: ${dungeon.color}">${dungeon.name}</strong> (${dungeon.biome}).
          </p>
          
          <div style="display: flex; gap: 8px; margin-top: 6px;">
            <button class="btn-secondary" id="btn-open-scholars-guide" style="flex: 1; font-size: 0.72rem; padding: 8px 6px; border: 1px dashed var(--amber-gold); display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(217, 119, 6, 0.06);">
              📜 Scholar's Guide ℹ️
            </button>
            <button class="btn-secondary" id="btn-open-codex-bonuses" style="flex: 1; font-size: 0.72rem; padding: 8px 6px; border: 1px dashed var(--amber-gold); display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(217, 119, 6, 0.06);">
              🎯 Codex Kill Bonuses ℹ️
            </button>
          </div>

          <div class="selected-dungeon-card" style="border: 1px dashed rgba(44,37,30,0.15); border-radius: 8px; padding: 10px; margin-top: 6px; background-color: rgba(0,0,0,0.01); text-align: left;">
            <div style="font-family: var(--font-header); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: ${dungeon.color};">${dungeon.icon} ${dungeon.name}</div>
            <div style="font-size: 0.72rem; color: var(--ink-muted); margin-top: 2px; line-height: 1.3;">${dungeon.description}</div>
            <div style="font-size: 0.6rem; color: var(--ruby-crimson); font-weight: 700; margin-top: 4px;">Recommended Level: ${dungeon.levelRequirement}</div>
          </div>

          <button class="btn-secondary full-width-btn" id="btn-switch-destination" style="margin-top: 8px;">🗺️ Switch Destination</button>
        </div>

        <div class="parchment-card focus-timer-box" style="padding: 16px;">
          <div class="clock-display" style="margin: 10px auto;">
            <svg class="radial-ring" viewBox="0 0 100 100">
              <circle class="ring-track" cx="50" cy="50" r="45"></circle>
              <circle id="ring-fill" class="ring-fill" cx="50" cy="50" r="45" style="stroke:${dungeon.color}"></circle>
            </svg>
            <div class="clock-labels">
              <span id="timer-countdown">00:10</span>
              <span id="timer-goal-label">10s Goal</span>
            </div>
          </div>

          <div class="duration-selectors" id="timer-presets" style="margin-bottom: 12px;">
            <button class="btn-secondary btn-preset active" data-sec="600">⏱️ 10 Mins</button>
            <button class="btn-secondary btn-preset" data-sec="1500">⏱️ 25 Mins</button>
            <button class="btn-secondary btn-preset" data-sec="3000">⏱️ 50 Mins</button>
            <button class="btn-secondary btn-preset" id="btn-timer-indefinite" data-sec="-1">♾️ Indefinite</button>
            <button class="btn-secondary" id="btn-timer-custom-toggle">⏱️ Custom</button>
          </div>

          <div id="custom-time-input-box" class="custom-time-box hidden" style="margin-bottom: 12px;">
            <label class="custom-label">Custom Focus Minutes:</label>
            <div class="custom-input-row">
              <input type="number" id="custom-minutes-input" min="1" max="180" value="15" />
              <button class="btn-secondary" id="btn-timer-custom-set">Set</button>
            </div>
          </div>

          <button class="btn-primary full-width-btn" id="btn-focus-start" style="font-size: 0.95rem; padding: 12px; margin-top: 4px;">⚔️ Ignite Focus Session</button>
        </div>
      </div>

      <!-- Log Steps Button outside the timer box -->
      <div style="margin-top: 10px;">
        <button class="btn-secondary full-width-btn" id="btn-log-steps">👣 Log Steps</button>
      </div>

      <!-- Steps Modal -->
      <div id="steps-modal-overlay" class="modal-overlay hidden">
        <div class="parchment-card modal-content" style="width: 300px; padding: 24px; text-align: center;">
          <h2 class="card-title" style="justify-content:center; border:none; margin-bottom:12px;">👣 Log Steps</h2>
          <p style="font-size:0.8rem; color: var(--ink-muted); margin-bottom:16px;">How many steps did you walk today? This unlocks new destinations.</p>
          <input type="number" id="steps-input" class="parchment-input" style="width:100%; text-align:center; font-size:1.2rem; margin-bottom:16px;" placeholder="e.g. 8000" min="1" max="100000">
          <div style="display:flex; gap:10px;">
            <button class="btn-secondary" id="btn-steps-cancel" style="flex:1;">Cancel</button>
            <button class="btn-primary" id="btn-steps-confirm" style="flex:1;">Record</button>
          </div>
        </div>
      </div>

      <!-- Destination selector overlay -->
      <div id="destination-selector-overlay" class="modal-overlay hidden">
        <div class="parchment-card modal-content" style="max-height: 80vh; overflow-y: auto; width: 90%; max-width: 400px; padding: 16px;">
          <h2 class="card-title" style="margin-bottom: 10px;">🗺️ Choose Destination</h2>
          <div class="dungeon-list-box" style="display: flex; flex-direction: column; gap: 8px;">
            ${renderDungeonsSelectorList(state.profile.steps, state.profile.totalLevel)}
          </div>
          <button class="btn-secondary full-width-btn" id="btn-close-destination" style="margin-top: 12px;">Cancel</button>
        </div>
      </div>

      <!-- Scholar's Guide Modal -->
      <div id="scholars-guide-modal" class="modal-overlay hidden">
        <div class="parchment-card modal-content" style="max-width: 460px; text-align: left; padding: 20px;">
          <h2 class="card-title" style="margin-bottom: 10px;">📜 Scholar's Guide to Focus Expeditions</h2>
          
          <div style="font-size: 0.82rem; color: var(--ink-dark); line-height: 1.5; display: flex; flex-direction: column; gap: 10px;">
            <p style="margin: 0;">
              <strong>🧠 Real-World Focus Fuels Your Hero:</strong>
              Start a real-time Pomodoro focus session (10m, 25m, 50m, or Indefinite) while working, studying, coding, or reading in real life.
            </p>
            
            <div style="padding: 10px; background: rgba(0,0,0,0.03); border-left: 3px solid var(--amber-gold); border-radius: 4px;">
              <strong style="color: var(--amber-gold);">⚔️ Automatic Dungeon Delving:</strong>
              As the focus timer ticks down, your hero automatically delves into <strong>${dungeon.name}</strong>, battling biome beasts and advancing through dungeon stages!
            </div>

            <div style="padding: 10px; background: rgba(0,0,0,0.03); border-left: 3px solid var(--sapphire-blue); border-radius: 4px;">
              <strong style="color: var(--sapphire-blue);">🎁 Yields & Rewards:</strong>
              • <strong>Weapon XP:</strong> Level up your equipped weapon rank.<br>
              • <strong>Essence & Fragments:</strong> Collect progression materials for Armor Forge upgrades & Relic Crafting.<br>
              • <strong>Gold Coins & Codex Cataloging:</strong> Earn gold and catalog slain monsters into your Codex.
            </div>
          </div>

          <div class="modal-actions" style="margin-top: 16px;">
            <button class="btn-primary" id="btn-close-scholars-guide" style="width: 100%;">Understood, Scholar!</button>
          </div>
        </div>
      </div>

      <!-- Codex Kill Bonuses Modal -->
      <div id="codex-bonuses-modal" class="modal-overlay hidden">
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

            <div style="font-size: 0.78rem; color: var(--ink-muted); text-align: center; margin-top: 2px;">
              💡 <em>View your cataloged kills anytime in the Hero Character sheet under the 📖 Monster Codex section.</em>
            </div>
          </div>

          <div class="modal-actions" style="margin-top: 16px;">
            <button class="btn-primary" id="btn-close-codex-bonuses" style="width: 100%;">Close Guide</button>
          </div>
        </div>
      </div>
    `;

    // CSS moved to styles.css
    setupSetupViewListeners(container, selectedDungeonId);
    return;
  }

  // ACTIVE EXPEDITION RUNNING VIEW
  if (container.querySelector('.expedition-screen.strike-parent')) {
    return;
  }

  const dungeon = DUNGEONS.find(d => d.id === state.expedition.dungeonId) || DUNGEONS[0];

  const vp = document.getElementById('app-viewport');
  if (vp && dungeon) {
    vp.setAttribute('data-biome', dungeon.biome);
  }

  container.innerHTML = `
    <div class="expedition-screen strike-parent" style="border-color:${dungeon.color}">
      
      <!-- Stage Progression Header -->
      <div class="stage-tracker">
        <span class="stage-dot active" data-index="0">Entrance</span>
        <span class="stage-connector"></span>
        <span class="stage-dot" data-index="1">Lower Halls</span>
        <span class="stage-connector"></span>
        <span class="stage-dot" data-index="2">Caverns</span>
        <span class="stage-connector"></span>
        <span class="stage-dot" data-index="3">Boss Chamber</span>
      </div>

      <!-- Battle Arena: Hero | Timer | Monster -->
      <div class="parchment-card" style="padding: 10px 8px 6px; margin-bottom: 6px;">
        <div class="dungeon-title-bar" style="color:${dungeon.color}; margin-bottom: 6px;">
          <span>${dungeon.icon} Deep Focus: ${dungeon.name}</span>
        </div>

        <!-- Arena Row -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">

          <!-- Hero Avatar (left) -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 0 0 auto;">
            <div style="font-size: 0.6rem; font-weight: bold; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.5px;">${state.profile.name}</div>
            <div style="width: 64px; height: 64px; background: radial-gradient(circle, rgba(254,240,138,0.15) 0%, transparent 70%); border-radius: 50%; display:flex; align-items:center; justify-content:center;">
              <svg viewBox="0 0 100 100" style="width:60px; height:60px; overflow:visible;">
                ${getLayeredAvatarSVG(state, derived)}
              </svg>
            </div>
            <!-- Hero HP Bar -->
            <div style="width: 64px;">
              <div style="height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow:hidden;">
                <div id="hud-hero-hp" class="hp-fill fill-green" style="width:100%; height:100%; border-radius:3px; transition: width 0.3s;"></div>
              </div>
              <div id="hud-hero-hp-txt" style="font-size: 0.55rem; text-align:center; color:var(--ink-muted); margin-top:1px;">HP: ${derived.currentHP}/${derived.combatStats.maxHP}</div>
            </div>
          </div>

          <!-- Timer (center) -->
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; position: relative;">
            <!-- Soft Anti-Distraction Warning (Torch Flickering) Banner -->
            <div id="torch-warning-banner" class="hidden" style="position: absolute; top: -28px; background: rgba(220, 38, 38, 0.9); color: #fff; font-size: 0.62rem; font-weight: bold; padding: 3px 8px; border-radius: 12px; z-index: 20; animation: pulse-flame 1s infinite alternate; white-space: nowrap;">
              ⚠️ Torch Flickering! Return in <span id="torch-warning-secs">10</span>s
            </div>

            <div class="clock-display" style="margin: 0 auto; width: 110px; height: 110px;">
              <svg class="radial-ring" viewBox="0 0 100 100">
                <circle class="ring-track" cx="50" cy="50" r="45"></circle>
                <circle id="ring-fill" class="ring-fill" cx="50" cy="50" r="45" style="stroke:${dungeon.color}"></circle>
              </svg>
              <div class="clock-labels">
                <span id="timer-countdown">00:00</span>
                <span id="timer-goal-label">Focusing...</span>
              </div>
            </div>

            <!-- Focus Milestone Spoils Badges -->
            <div id="focus-milestone-bar" style="display: flex; gap: 4px; margin-top: 2px;">
              <span id="ms-badge-10" title="10 Min Bronze Spoils" style="font-size: 0.58rem; padding: 1px 5px; border-radius: 4px; border: 1px dashed rgba(44,37,30,0.3); opacity: 0.4;">🥉 10m</span>
              <span id="ms-badge-25" title="25 Min Silver Spoils" style="font-size: 0.58rem; padding: 1px 5px; border-radius: 4px; border: 1px dashed rgba(44,37,30,0.3); opacity: 0.4;">🥈 25m</span>
              <span id="ms-badge-50" title="50 Min Gold Spoils" style="font-size: 0.58rem; padding: 1px 5px; border-radius: 4px; border: 1px dashed rgba(44,37,30,0.3); opacity: 0.4;">🥇 50m</span>
            </div>

            <div class="timer-controls" style="margin-top: 4px;">
              <button class="btn-primary hidden" id="btn-summon-boss" style="font-size:0.7rem; padding: 5px 10px;">👑 Summon Boss!</button>
              <button class="btn-secondary btn-flee" id="btn-focus-abandon" style="font-size:0.7rem; padding: 5px 10px;">🏳️ Retreat</button>
            </div>
          </div>

          <!-- Enemy Avatar (right) -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 0 0 auto;">
            <div id="enemy-name-label" style="font-size: 0.6rem; font-weight: bold; color: var(--ruby-crimson); text-transform: uppercase; letter-spacing: 0.5px;">Awaiting...</div>
            <div id="enemy-avatar-wrap" style="width: 64px; height: 64px; background: radial-gradient(circle, rgba(220,38,38,0.1) 0%, transparent 70%); border-radius: 50%; display:flex; align-items:center; justify-content:center;">
              <svg id="enemy-svg" viewBox="0 0 100 100" style="width:60px; height:60px; overflow:visible;">
                ${getIdleEnemySVG(dungeon.id)}
              </svg>
            </div>
            <!-- Enemy HP Bar -->
            <div style="width: 64px;">
              <div style="height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow:hidden;">
                <div id="hud-enemy-hp" class="hp-fill fill-red" style="width:0%; height:100%; border-radius:3px; transition: width 0.3s;"></div>
              </div>
              <div id="hud-enemy-hp-txt" style="font-size: 0.55rem; text-align:center; color:var(--ink-muted); margin-top:1px;">Scouting...</div>
            </div>
          </div>

        </div>
      </div>

      <!-- Real-time scrolling medieval logs -->
      <div class="combat-scroll-box parchment-card">
        <h4 class="card-title">📖 Active Combat Logs</h4>
        <div class="log-viewport scroll-container" id="log-viewport-box"></div>
      </div>

    </div>
  `;

  // CSS moved to styles.css

  // Elements
  const logBox = container.querySelector('#log-viewport-box');
  const timerCount = container.querySelector('#timer-countdown');
  const ringFill = container.querySelector('#ring-fill');
  const btnAbandon = container.querySelector('#btn-focus-abandon');
  const battleHud = container.querySelector('#battle-hud');

  // Load starting logs
  renderLogs(state.expedition.logs, logBox);

  // Set initial countdown ring offset
  setRadialProgress(1);

  // Bind Retreat abandon button
  btnAbandon.addEventListener('click', () => {
    let modal = container.querySelector('#retreat-modal-overlay');
    const isIndefinite = targetTime === Infinity;
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'retreat-modal-overlay';
      modal.className = 'modal-overlay hidden';
      modal.style.cssText = 'position: fixed; z-index: 200; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
      
      const titleText = isIndefinite ? "Conclude Expedition?" : "Retreat?";
      const descText = isIndefinite ? 
        "Are you ready to safely conclude your indefinite journey? You will keep 100% of the spoils you have collected so far." :
        "Are you sure you want to retreat to safety? You will drop most unbanked materials and suffer a momentum penalty.";
      const btnColor = isIndefinite ? "var(--emerald-green)" : "var(--ruby-crimson)";
      const btnText = isIndefinite ? "Conclude Safely" : "Retreat";

      modal.innerHTML = `
        <div class="parchment-card" style="width: 320px; padding: 24px; text-align: center;">
          <h2 style="color: ${btnColor}; margin-top: 0; font-family: var(--font-header);">${titleText}</h2>
          <p style="margin-bottom: 24px; font-size: 0.9rem; color: var(--ink-base);">${descText}</p>
          <div style="display: flex; gap: 12px;">
            <button id="btn-retreat-cancel" class="btn-secondary" style="flex: 1;">Cancel</button>
            <button id="btn-retreat-confirm" class="btn-primary" style="flex: 1; background: ${btnColor};">${btnText}</button>
          </div>
        </div>
      `;
      container.appendChild(modal);
      
      modal.querySelector('#btn-retreat-cancel').addEventListener('click', () => {
        modal.classList.add('hidden');
      });
      
      modal.querySelector('#btn-retreat-confirm').addEventListener('click', () => {
        modal.classList.add('hidden');
        cleanupTimers();
        if (isIndefinite) {
          import('../state.js').then(mod => {
            mod.completeExpedition();
            renderExpeditionReport(container, dungeon, true);
          });
        } else {
          import('../state.js').then(mod => {
            mod.terminateExpeditionGracefully("Retreated from dungeon.");
            import('../app.js').then(appMod => appMod.switchScreen('quests'));
          });
        }
      });
    }
    modal.classList.remove('hidden');
  });

  // Start active clocks
  startVisualTimers(container, dungeon, logBox, derived);
  setupVisibilityDetector();
}

function renderDungeonsSelectorList(steps, level) {
  return DUNGEONS.map(dungeon => {
    const isStepUnlocked = steps >= dungeon.stepRequirement;
    const isLevelUnlocked = level >= dungeon.levelRequirement;
    const isUnlocked = isStepUnlocked && isLevelUnlocked;

    if (!isUnlocked) {
      return `
        <div class="dungeon-select-row locked" style="opacity: 0.65; border: 1px dashed rgba(44,37,30,0.3); padding: 8px 10px; border-radius: 8px; background-color: rgba(0,0,0,0.02); text-align: left;">
          <strong style="font-size: 0.72rem; color: var(--ruby-crimson);">🔒 Locked: ${dungeon.name}</strong>
          <div style="font-size: 0.58rem; color: var(--ink-muted); margin-top: 2px;">
            👣 Steps: ${steps.toLocaleString()} / ${dungeon.stepRequirement.toLocaleString()} | 🛡️ Lvl: ${level}/${dungeon.levelRequirement}
          </div>
        </div>
      `;
    }

    return `
      <div class="dungeon-select-row unlocked" data-id="${dungeon.id}" data-biome="${dungeon.biome}" style="border: 1px solid ${dungeon.color}; padding: 8px 10px; border-radius: 8px; cursor: pointer; background-color: rgba(0,0,0,0.01); text-align: left; transition: transform 0.1s ease;">
        <div style="font-family: var(--font-header); font-size: 0.76rem; font-weight: 700; color: ${dungeon.color};">${dungeon.icon} ${dungeon.name}</div>
        <div style="font-size: 0.65rem; color: var(--ink-muted); margin-top: 1px; line-height: 1.25;">${dungeon.description}</div>
        <div style="font-size: 0.58rem; color: var(--emerald-green); font-weight: 700; margin-top: 4px;">Rec. Lvl: ${dungeon.levelRequirement} | XP: ${dungeon.baseXPMultiplier.toFixed(2)}x, Gold: ${dungeon.baseGoldMultiplier.toFixed(2)}x</div>
      </div>
    `;
  }).join('');
}

function setupSetupViewListeners(container, selectedDungeonId) {
  const modal = container.querySelector('#destination-selector-overlay');
  const btnOpen = container.querySelector('#btn-switch-destination');
  const btnClose = container.querySelector('#btn-close-destination');
  const timerCount = container.querySelector('#timer-countdown');
  const ringFill = container.querySelector('#ring-fill');
  const btnStart = container.querySelector('#btn-focus-start');
  const presets = container.querySelector('#timer-presets');

  let selectedSeconds = 600;
  isIndefiniteMode = false;

  btnOpen.addEventListener('click', () => modal.classList.remove('hidden'));
  btnClose.addEventListener('click', () => modal.classList.add('hidden'));

  // Scholar's Guide Modal listener
  const scholarsModal = container.querySelector('#scholars-guide-modal');
  const btnOpenScholars = container.querySelector('#btn-open-scholars-guide');
  const btnCloseScholars = container.querySelector('#btn-close-scholars-guide');
  if (btnOpenScholars && scholarsModal) {
    btnOpenScholars.addEventListener('click', () => scholarsModal.classList.remove('hidden'));
    if (btnCloseScholars) btnCloseScholars.addEventListener('click', () => scholarsModal.classList.add('hidden'));
  }

  // Codex Kill Bonuses Modal listener
  const codexModal = container.querySelector('#codex-bonuses-modal');
  const btnOpenCodex = container.querySelector('#btn-open-codex-bonuses');
  const btnCloseCodex = container.querySelector('#btn-close-codex-bonuses');
  if (btnOpenCodex && codexModal) {
    btnOpenCodex.addEventListener('click', () => codexModal.classList.remove('hidden'));
    if (btnCloseCodex) btnCloseCodex.addEventListener('click', () => codexModal.classList.add('hidden'));
  }

  // Log Steps modal
  const stepsOverlay = container.querySelector('#steps-modal-overlay');
  const btnLogSteps = container.querySelector('#btn-log-steps');
  if (btnLogSteps && stepsOverlay) {
    btnLogSteps.addEventListener('click', () => stepsOverlay.classList.remove('hidden'));
    container.querySelector('#btn-steps-cancel').addEventListener('click', () => stepsOverlay.classList.add('hidden'));
    container.querySelector('#btn-steps-confirm').addEventListener('click', () => {
      const val = parseInt(container.querySelector('#steps-input').value, 10);
      if (val > 0) {
        addSteps(val);
        stepsOverlay.classList.add('hidden');
        container.querySelector('#steps-input').value = '';
        // Show brief success toast
        const toast = document.createElement('div');
        toast.textContent = `\ud83d\udc63 +${val.toLocaleString()} steps logged!`;
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--emerald-green);color:#fff;padding:8px 18px;border-radius:20px;font-size:0.85rem;font-weight:700;z-index:500;animation:zoom-in 0.2s ease;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
      }
    });
  }

  // Switch destination selections
  const vp = document.getElementById('app-viewport');
  const activeDungeon = DUNGEONS.find(d => d.id === selectedDungeonId) || DUNGEONS[0];

  container.querySelectorAll('.dungeon-select-row.unlocked').forEach(row => {
    const rowBiome = row.getAttribute('data-biome');

    row.addEventListener('mouseenter', () => {
      if (vp && rowBiome) vp.setAttribute('data-biome', rowBiome);
    });
    row.addEventListener('mouseleave', () => {
      if (vp && activeDungeon) vp.setAttribute('data-biome', activeDungeon.biome);
    });

    row.addEventListener('click', () => {
      const dungeonId = row.getAttribute('data-id');
      import('../state.js').then(mod => {
        const state = mod.getState();
        state.profile.selectedDungeonId = dungeonId;
        mod.saveState();
        modal.classList.add('hidden');
        renderExpedition(container);
      });
    });
  });

  // Presets listeners
  presets.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      presets.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
      const customToggle = container.querySelector('#btn-timer-custom-toggle');
      if (customToggle) customToggle.classList.remove('active');
      btn.classList.add('active');
      
      container.querySelector('#custom-time-input-box').classList.add('hidden');
      selectedSeconds = parseInt(btn.getAttribute('data-sec'));
      
      if (selectedSeconds === -1) {
        isIndefiniteMode = true;
        timerCount.textContent = "00:00";
        container.querySelector('#timer-goal-label').textContent = "Indefinite Focus";
      } else {
        isIndefiniteMode = false;
        const m = Math.floor(selectedSeconds / 60);
        const s = selectedSeconds % 60;
        timerCount.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        container.querySelector('#timer-goal-label').textContent = `${m > 0 ? m + ' Mins' : selectedSeconds + 's'} Goal`;
      }
    });
  });

  // Custom Toggle handlers
  const btnCustomToggle = container.querySelector('#btn-timer-custom-toggle');
  const customInputBox = container.querySelector('#custom-time-input-box');
  const customInput = container.querySelector('#custom-minutes-input');
  const btnCustomSet = container.querySelector('#btn-timer-custom-set');

  btnCustomToggle.addEventListener('click', () => {
    presets.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    btnCustomToggle.classList.add('active');
    customInputBox.classList.remove('hidden');
    
    isIndefiniteMode = false;
    const mins = parseInt(customInput.value) || 15;
    selectedSeconds = mins * 60;
    timerCount.textContent = `${mins.toString().padStart(2,'0')}:00`;
    container.querySelector('#timer-goal-label').textContent = `${mins} Mins Goal`;
  });

  btnCustomSet.addEventListener('click', () => {
    const mins = parseInt(customInput.value) || 15;
    selectedSeconds = mins * 60;
    isIndefiniteMode = false;
    timerCount.textContent = `${mins.toString().padStart(2,'0')}:00`;
    container.querySelector('#timer-goal-label').textContent = `${mins} Mins Goal`;
  });

  // Start Focus Session
  btnStart.addEventListener('click', () => {
    import('../state.js').then(mod => {
      // Start state expedition
      mod.startExpedition(selectedDungeonId);
      
      if (isIndefiniteMode) {
        targetTime = Infinity;
        timeRemaining = 0;
      } else {
        targetTime = selectedSeconds * 1000;
        timeRemaining = targetTime;
      }
      timeElapsed = 0;
      lastVisibilityChange = Date.now();
      
      // Re-render view to the active combat layout
      renderExpedition(container);
    });
  });
}

function startVisualTimers(container, dungeon, logBox, derived) {
  const timerCount = container.querySelector('#timer-countdown');
  const ringFill = container.querySelector('#ring-fill');
  
  const isDemo = targetTime === 10000;
  const tickDuration = 1000;
  
  // Wisdom speeds up encounter rate: base 45s, reduced by 1s per Wisdom level (min 15s)
  const wisdomLvl = derived.skillsLevels?.wisdom || 1;
  const combatIntervalSec = Math.max(15, 45 - wisdomLvl);

  appendLog(`🔥 Focus ignited! You prepare to cross the thresholds...`, logBox);

  // Anchor to absolute system time to survive sleep/backgrounding
  const startedAt = getState().expedition.startedAt || Date.now();
  let lastWeaponXpElapsed = 0;
  let lastSavePointElapsed = 0;

  function updateTimerUI() {
    const activeExp = getState().expedition;
    if (!activeExp.active) return;
    
    // Simulate background/offline combat catch-up before updating timers
    const died = simulateOfflineCombat(container, dungeon, logBox, derived);
    if (died) return;

    timeElapsed = Date.now() - startedAt;

    // Award weapon XP every 5 seconds reliably based on absolute elapsed time
    if (timeElapsed - lastWeaponXpElapsed >= 5000) {
      const numAwards = Math.floor((timeElapsed - lastWeaponXpElapsed) / 5000);
      lastWeaponXpElapsed += numAwards * 5000;
      
      const activeWeaponKey = getState().progression.equippedWeapon || "blade";
      if (activeWeaponKey) {
        import('../state.js').then(mod => {
          const res = mod.incrementWeaponMasteryXP(activeWeaponKey, 5 * numAwards);
          if (res && res.leveledUp) {
            appendLog(`🎉 Weapon Mastery Leveled Up! Your ${activeWeaponKey.toUpperCase()} mastery is now Rank ${res.newRank}!`, logBox);
          }
        });
      }
    }

    // Check Milestone Spoils awards (10m = 600s, 25m = 1500s, 50m = 3000s)
    const elapsedMinutes = Math.floor(timeElapsed / 60000);
    const stateExp = getState().expedition;
    const claimedMs = stateExp.claimedMilestones || [];

    if (elapsedMinutes >= 10 && !claimedMs.includes(10)) {
      claimedMs.push(10);
      updateActiveExpedition(exp => {
        exp.claimedMilestones = claimedMs;
        exp.rewardsGained.gold += 50;
        exp.rewardsGained.essence = (exp.rewardsGained.essence || 0) + 5;
      });
      appendLog(`🥉 <strong>10 Min Focus Milestone Reached!</strong> Unlocked Bronze Spoils (+50g, +5 Essence)!`, logBox);
      const b10 = container.querySelector('#ms-badge-10');
      if (b10) { b10.style.opacity = '1'; b10.style.borderColor = 'var(--gold-primary)'; b10.style.fontWeight = 'bold'; }
    }

    if (elapsedMinutes >= 25 && !claimedMs.includes(25)) {
      claimedMs.push(25);
      updateActiveExpedition(exp => {
        exp.claimedMilestones = claimedMs;
        exp.rewardsGained.gold += 120;
        exp.rewardsGained.relicShards = (exp.rewardsGained.relicShards || 0) + 2;
      });
      appendLog(`🥈 <strong>25 Min Focus Milestone Reached!</strong> Unlocked Silver Spoils (+120g, +2 Relic Shards)!`, logBox);
      const b25 = container.querySelector('#ms-badge-25');
      if (b25) { b25.style.opacity = '1'; b25.style.borderColor = 'var(--gold-primary)'; b25.style.fontWeight = 'bold'; }
    }

    if (elapsedMinutes >= 50 && !claimedMs.includes(50)) {
      claimedMs.push(50);
      updateActiveExpedition(exp => {
        exp.claimedMilestones = claimedMs;
        exp.rewardsGained.gold += 300;
        exp.rewardsGained.coreFragments = (exp.rewardsGained.coreFragments || 0) + 5;
      });
      appendLog(`🥇 <strong>50 Min Focus Hero Milestone Reached!</strong> Unlocked Gold Spoils (+300g, +5 Core Fragments)!`, logBox);
      const b50 = container.querySelector('#ms-badge-50');
      if (b50) { b50.style.opacity = '1'; b50.style.borderColor = 'var(--gold-primary)'; b50.style.fontWeight = 'bold'; }
    }

    if (isIndefiniteMode) {
      // Create a save point every 5 minutes (300,000 ms)
      if (timeElapsed - lastSavePointElapsed >= 300000) {
        const numSaves = Math.floor((timeElapsed - lastSavePointElapsed) / 300000);
        lastSavePointElapsed += numSaves * 300000;
        
        import('../state.js').then(mod => {
          mod.bankExpeditionSpoils();
          appendLog(`💾 <strong>Save Point Reached!</strong> All spoils collected so far are 100% secured in your ledger.`, logBox);
        });
      }

      // stopwatch counts up
      const elapsedSec = Math.floor(timeElapsed / 1000);
      const m = Math.floor(elapsedSec / 60);
      const s = elapsedSec % 60;
      timerCount.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      
      const pulsePct = 1 - ((timeElapsed % 4000) / 4000);
      setRadialProgress(pulsePct, ringFill);
      
      const stageIdx = Math.min(3, Math.floor(timeElapsed / (30 * 1000)));
      updateActiveExpedition((exp) => {
        exp.stageIndex = stageIdx;
      });
      updateStageDots(container, stageIdx);
      
      const minThreshold = 900000; // 15 minutes to summon boss in indefinite mode
      if (timeElapsed >= minThreshold) {
        const btnSummon = container.querySelector('#btn-summon-boss');
        if (btnSummon && btnSummon.disabled) {
          btnSummon.disabled = false;
          btnSummon.classList.remove('hidden');
          btnSummon.textContent = "👑 Summon Boss!";
        }
      }
      
    } else {
      timeRemaining = Math.max(0, targetTime - timeElapsed);

      const remSec = Math.floor(timeRemaining / 1000);
      const m = Math.floor(remSec / 60);
      const s = remSec % 60;
      timerCount.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      
      const pct = timeRemaining / targetTime;
      setRadialProgress(pct, ringFill);

      const stageIdx = Math.min(3, Math.floor((timeElapsed / targetTime) * 4));
      updateActiveExpedition((exp) => {
        exp.stageIndex = stageIdx;
      });
      updateStageDots(container, stageIdx);

      if (timeRemaining <= 0) {
        cleanupTimers();
        appendLog(`🏆 Focus Goal Completed! The Boss Chamber opens!`, logBox);
        triggerCombatEncounter(container, dungeon, true, logBox, derived);
      }
    }
  }

  // Export for visibility handler to force immediate updates
  window._updateExpeditionTimerUI = updateTimerUI;
  
  // Initial draw and loop
  updateTimerUI();
  timerInterval = setInterval(updateTimerUI, tickDuration);

  // Periodic Combat Roll scheduler — only spawn a new enemy if no battle is active
  encounterInterval = setInterval(() => {
    if ((isIndefiniteMode || timeRemaining > 0) && !isBattleActive) {
      triggerCombatEncounter(container, dungeon, false, logBox, derived);
    }
  }, combatIntervalSec * 1000);
}

function triggerCombatEncounter(container, dungeon, isBoss, logBox, derived) {
  const state = getState();
  if (state.expedition.active) {
    state.expedition.lastCombatSimulatedAt = Date.now();
    saveState();
  }

  const monsterData = isBoss ? dungeon.boss : dungeon.monsters[Math.floor(Math.random() * dungeon.monsters.length)];
  currentMonster = { ...monsterData, currentDistance: 5, maxHp: monsterData.hp }; // Start at distance of 5 steps!

  appendLog(`⚠️ ${isBoss ? '👑 BOSS ENCOUNTER:' : '👾 ENEMY DETECTED:'} A wild ${currentMonster.name} jumps from the shadows! (Distance: 5m)`, logBox);

  // Weapon range summary log
  const activeWeaponKey = getState().progression.equippedWeapon || "blade";
  const preset = WEAPON_PRESETS[activeWeaponKey] || WEAPON_PRESETS.blade;
  appendLog(`🛡️ Equipped Weapon Range: ${preset.range}m (${preset.name}).`, logBox);
  
  updateBattleHUD(container, currentMonster, derived);

  // Clear any previous lingering battle tick before starting a fresh one
  if (battleTickInterval) {
    clearInterval(battleTickInterval);
    battleTickInterval = null;
  }
  isBattleActive = true;

  // Set up battle strike tick loops
  battleTickInterval = setInterval(() => {
    if (!getState().expedition.active) {
      clearInterval(battleTickInterval);
      battleTickInterval = null;
      isBattleActive = false;
      return;
    }

    const playerRange = preset.range;

    // Inject equipped weapon name temporarily for calculations
    derived.equippedMainHandName = preset.name;
    const tick = rollCombatTick(derived, currentMonster, playerRange, getState().progression);

    // Print step advance movements
    if (tick.logDetails && tick.logDetails.length > 0) {
      tick.logDetails.forEach(line => appendLog(line, logBox));
    }

    if (tick.playerHit === "crit") {
      appendLog(`✨🗡️ <strong>CRITICAL STRIKE!</strong> You strike ${currentMonster.name} dealing ${tick.playerDmg} damage!`, logBox);
    } else if (tick.playerHit) {
      appendLog(`🗡️ You strike ${currentMonster.name} dealing ${tick.playerDmg} dmg!`, logBox);
    } else if (currentMonster.currentDistance <= preset.range && !tick.playerHit) {
      appendLog(`💨 You swing but the ${currentMonster.name} dodges!`, logBox);
    }

    if (tick.enemyHit) {
      appendLog(`💥 The ${currentMonster.name} counter-attacks, dealing ${tick.enemyDmg} damage to your health!`, logBox);
    } else if (tick.enemySwung) {
      appendLog(`🛡️ You blocked the ${currentMonster.name}'s attack!`, logBox);
    }

    updateBattleHUD(container, currentMonster, derived);

    // Check Death outcomes
    if (currentMonster.hp <= 0) {
      clearInterval(battleTickInterval);
      battleTickInterval = null;
      isBattleActive = false;
      const goldGained = Math.floor(currentMonster.xp * 0.4 * dungeon.baseGoldMultiplier);
      const xpGained = Math.floor(currentMonster.xp * dungeon.baseXPMultiplier);

      appendLog(`💀 Defeated the ${currentMonster.name}! You earn +${goldGained} Gold and +${xpGained} Combat XP!`, logBox);
      
      // Log defeated monster to the Monster Codex
      import('../state.js').then(mod => {
        mod.incrementCodexKill(currentMonster.name);
      });
      
      updateActiveExpedition(exp => {
        exp.rewardsGained.gold += goldGained;
        exp.rewardsGained.xp += xpGained;
        exp.logs.push(`💀 Defeated ${currentMonster.name}`);
      });

      // Material loot drop check
      if (isBoss || Math.random() > 0.5) {
        const roll = Math.random();
        let matName = "Essence";
        let matAmt = Math.floor(Math.random() * 5) + 3; // 3-7
        let matField = "essence";
        let emoji = "✨";

        if (isBoss) {
          matName = "Relic Shard";
          matAmt = Math.floor(Math.random() * 2) + 1; // 1-2
          matField = "relicShards";
          emoji = "🧩";
          
          // Roll for Tome of Rebirth corresponding to the dungeon (30% chance)
          if (Math.random() < 0.3) {
            let tomeKey = "";
            let tomeName = "";
            if (dungeon.id === "woods") { tomeKey = "tomeOfRebirth1"; tomeName = "Tome of Rebirth I"; }
            else if (dungeon.id === "caves") { tomeKey = "tomeOfRebirth2"; tomeName = "Tome of Rebirth II"; }
            else if (dungeon.id === "ruins") { tomeKey = "tomeOfRebirth3"; tomeName = "Tome of Rebirth III"; }
            else if (dungeon.id === "citadel") { tomeKey = "tomeOfRebirth4"; tomeName = "Tome of Rebirth IV"; }
            else if (dungeon.id === "vaults") { tomeKey = "tomeOfRebirth5"; tomeName = "Tome of Rebirth V"; }

            if (tomeKey) {
              appendLog(`📖 Rare loot discovered! Obtained: <strong>+1 ${tomeName}</strong>!`, logBox);
              updateActiveExpedition(exp => {
                exp.rewardsGained[tomeKey] = (exp.rewardsGained[tomeKey] || 0) + 1;
              });
            }
          }
        } else if (roll > 0.85) {
          matName = "Relic Shard";
          matAmt = 1;
          matField = "relicShards";
          emoji = "🧩";
        } else if (roll > 0.50) {
          matName = "Core Fragment";
          matAmt = Math.floor(Math.random() * 2) + 1; // 1-2
          matField = "coreFragments";
          emoji = "⚙️";
        }

        appendLog(`${emoji} loot discovered! Obtained: <strong>+${matAmt} ${matName}</strong>!`, logBox);
        updateActiveExpedition(exp => {
          exp.rewardsGained[matField] = (exp.rewardsGained[matField] || 0) + matAmt;
        });
      }

      if (isBoss) {
        appendLog(`🎉 VICTORY! Dungeon cleared successfully. compiling report...`, logBox);
        setTimeout(() => {
          cleanupTimers();
          renderExpeditionReport(container, dungeon, true);
        }, 2500);
      }
      
    } else if (derived.currentHP <= 0) {
      clearInterval(battleTickInterval);
      battleTickInterval = null;
      isBattleActive = false;
      cleanupTimers();
      appendLog(`💔 Hero incapacitated! You are dragged back to safety by local trackers. Gold earned slashed!`, logBox);
      
      setTimeout(() => {
        renderExpeditionReport(container, dungeon, false);
      }, 2500);
    }

  }, 1200);
}

function updateBattleHUD(container, monster, derived) {
  const heroHP = container.querySelector('#hud-hero-hp');
  const enemyHP = container.querySelector('#hud-enemy-hp');
  const heroHPTxt = container.querySelector('#hud-hero-hp-txt');
  const enemyHPTxt = container.querySelector('#hud-enemy-hp-txt');

  if (heroHP && derived) {
    const heroPct = Math.max(0, Math.floor((derived.currentHP / derived.combatStats.maxHP) * 100));
    heroHP.style.width = `${heroPct}%`;
    if (heroHPTxt) heroHPTxt.textContent = `HP: ${derived.currentHP}/${derived.combatStats.maxHP}`;
  }

  if (monster) {
    // Update enemy name label
    const nameLabel = container.querySelector('#enemy-name-label');
    if (nameLabel) nameLabel.textContent = monster.name;

    // Swap monster SVG sprite
    const enemySvg = container.querySelector('#enemy-svg');
    if (enemySvg) enemySvg.innerHTML = getMonsterSVG(monster.name);

    // Update HP bar
    if (enemyHP) {
      const maxHp = monster.maxHp || monster.hp;
      const monsterPct = Math.max(0, Math.floor((monster.hp / maxHp) * 100));
      enemyHP.style.width = `${monsterPct}%`;
      if (enemyHPTxt) enemyHPTxt.textContent = `HP: ${monster.hp}/${maxHp}`;
    }
  }
}

let torchWarningTimer = null;
let torchWarningSecsLeft = 10;
let screenWakeLock = null;

async function requestScreenWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      screenWakeLock = await navigator.wakeLock.request('screen');
      console.log('🛡️ Screen Wake Lock activated: Keeping phone display awake during Focus Expedition.');
      screenWakeLock.addEventListener('release', () => {
        screenWakeLock = null;
      });
    }
  } catch (err) {
    console.warn('Screen Wake Lock not available:', err);
  }
}

function releaseScreenWakeLock() {
  if (screenWakeLock !== null) {
    screenWakeLock.release().catch(() => {});
    screenWakeLock = null;
  }
}

function setupVisibilityDetector() {
  requestScreenWakeLock();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function handleVisibilityChange() {
  const state = getState();
  if (!state.expedition.active) return;

  const warnBanner = document.getElementById('torch-warning-banner');
  const warnSecs = document.getElementById('torch-warning-secs');

  if (document.hidden) {
    // Left app window! Start 10s flickering torch countdown
    torchWarningSecsLeft = 10;
    if (warnBanner) warnBanner.classList.remove('hidden');
    if (warnSecs) warnSecs.textContent = torchWarningSecsLeft;

    if (torchWarningTimer) clearInterval(torchWarningTimer);
    torchWarningTimer = setInterval(() => {
      torchWarningSecsLeft--;
      if (warnSecs) warnSecs.textContent = torchWarningSecsLeft;

      if (torchWarningSecsLeft <= 0) {
        clearInterval(torchWarningTimer);
        torchWarningTimer = null;
        if (warnBanner) warnBanner.classList.add('hidden');
        
        // Torch extinguished! Trigger graceful retreat penalty
        import('../state.js').then(mod => {
          mod.terminateExpeditionGracefully("🔥 Torch extinguished! Left focus session for too long.");
          cleanupTimers();
          import('../app.js').then(appMod => appMod.switchScreen('quests'));
        });
      }
    }, 1000);
  } else {
    // Returned to app window! Cancel warning timer and clear banner
    if (torchWarningTimer) {
      clearInterval(torchWarningTimer);
      torchWarningTimer = null;
    }
    if (warnBanner) warnBanner.classList.add('hidden');

    if (!screenWakeLock) {
      requestScreenWakeLock();
    }

    if (window._updateExpeditionTimerUI) {
      window._updateExpeditionTimerUI();
    }
  }
}

function cleanupTimers() {
  releaseScreenWakeLock();
  if (timerInterval) clearInterval(timerInterval);
  if (encounterInterval) clearInterval(encounterInterval);
  if (battleTickInterval) clearInterval(battleTickInterval);
  battleTickInterval = null;
  isBattleActive = false;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}

function renderLogs(logs, box) {
  box.innerHTML = [...logs].reverse().map(l => `<div class="log-line">${l}</div>`).join('');
  box.scrollTop = 0;
}

function appendLog(text, box) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = text;
  box.prepend(line);
  box.scrollTop = 0;

  updateActiveExpedition(exp => {
    exp.logs.push(text);
  });
}

function setRadialProgress(pct, fillEl) {
  const el = fillEl || document.getElementById('ring-fill');
  if (!el) return;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (pct * circumference);
  
  el.style.strokeDasharray = `${circumference} ${circumference}`;
  el.style.strokeDashoffset = strokeOffset;
}

function updateStageDots(container, index) {
  container.querySelectorAll('.stage-dot').forEach((dot, idx) => {
    if (idx <= index) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function renderExpeditionReport(container, dungeon, success) {
  const state = getState();
  const kills = getDefeatedEnemiesList(state.expedition.logs);
  
  const banked = state.expedition.bankedRewards || { gold: 0, xp: 0, essence: 0, coreFragments: 0, relicShards: 0 };
  const unbanked = state.expedition.rewardsGained || { gold: 0, xp: 0, essence: 0, coreFragments: 0, relicShards: 0 };

  const goldVal = success ? (unbanked.gold + banked.gold) : Math.floor(unbanked.gold * 0.35) + banked.gold;
  const xpVal = success ? (unbanked.xp + banked.xp) : Math.floor(unbanked.xp * 0.15) + banked.xp;
  const essenceVal = success ? (unbanked.essence || 0) + banked.essence : Math.floor((unbanked.essence || 0) * 0.35) + banked.essence;
  const coreVal = success ? (unbanked.coreFragments || 0) + banked.coreFragments : Math.floor((unbanked.coreFragments || 0) * 0.35) + banked.coreFragments;
  const relicVal = success ? (unbanked.relicShards || 0) + banked.relicShards : Math.floor((unbanked.relicShards || 0) * 0.35) + banked.relicShards;

  container.innerHTML = `
    <div class="report-card-overlay parchment-theme">
      <div class="parchment-card report-card">
        <h2 class="card-title" style="color: ${success ? 'var(--emerald-green)' : 'var(--ruby-crimson)'}; font-family: var(--font-header);">
          ${success ? '🏆 Expedition Concluded!' : '💔 Dungeon Retreat...'}
        </h2>
        
        <div class="report-scroll">
          <div class="report-meta">
            <strong>Realm Visited:</strong> ${dungeon.icon} ${dungeon.name} <br>
            <strong>Outcome:</strong> ${success ? 'Dungeon Cleared / Safely Concluded' : 'Incapacitated (Rescued)'}
          </div>
          
          <div class="report-section">
            <h4>👾 Defeated Enemies</h4>
            <div class="report-kills-list">
              ${kills.map(k => `<div>${k}</div>`).join('')}
            </div>
          </div>

          <div class="report-section">
            <h4>🪙 Spoils of Adventure</h4>
            <div class="spoils-grid" style="grid-template-columns: repeat(2, 1fr);">
              <div class="spoil-item">✨ <strong>+${xpVal}</strong> Combat XP</div>
              <div class="spoil-item">🪙 <strong>+${goldVal}</strong> Gold Coins</div>
            </div>
          </div>

          <div class="report-section">
            <h4>✨ Upgrade Materials Recovered</h4>
            <div class="spoils-grid" style="grid-template-columns: repeat(3, 1fr); gap: 6px;">
              <div class="spoil-item" style="font-size: 0.65rem;">✨ <strong>+${essenceVal}</strong> Essence</div>
              <div class="spoil-item" style="font-size: 0.65rem;">⚙️ <strong>+${coreVal}</strong> Fragments</div>
              <div class="spoil-item" style="font-size: 0.65rem;">🧩 <strong>+${relicVal}</strong> Shards</div>
            </div>
          </div>
          
          ${(() => {
            const tomesFound = [];
            for (let i = 1; i <= 5; i++) {
              const key = `tomeOfRebirth${i}`;
              const tVal = (unbanked[key] || 0) + (banked[key] || 0);
              if (tVal > 0) {
                const roman = i === 1 ? "I" : i === 2 ? "II" : i === 3 ? "III" : i === 4 ? "IV" : "V";
                tomesFound.push(`📖 Tome of Rebirth ${roman} x${tVal}`);
              }
            }
            if (tomesFound.length === 0) return '';
            return `
              <div class="report-section">
                <h4>📖 Tomes of Rebirth Recovered</h4>
                <div class="spoils-grid" style="grid-template-columns: 1fr; gap: 4px;">
                  ${tomesFound.map(t => `<div class="spoil-item" style="font-size: 0.7rem;">${t}</div>`).join('')}
                </div>
              </div>
            `;
          })()}
        </div>

        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="btn-secondary" id="btn-start-campfire-rest" style="flex:1; border-color:var(--amber-gold); color:var(--gold-primary); font-weight:bold;">🏕️ 5m Campfire Rest (+15% XP Buff)</button>
          <button class="btn-primary" id="btn-claim-report" style="flex:1;">Seal Report & Continue</button>
        </div>
      </div>
    </div>
  `;

  const btnClaim = container.querySelector('#btn-claim-report');
  btnClaim.addEventListener('click', () => {
    if (success) {
      completeExpedition();
      import('../app.js').then(mod => mod.switchScreen('character'));
    } else {
      terminateExpeditionGracefully("Died in dungeon.");
      import('../app.js').then(mod => mod.switchScreen('quests'));
    }
  });

  const btnCampfire = container.querySelector('#btn-start-campfire-rest');
  if (btnCampfire) {
    btnCampfire.addEventListener('click', () => {
      if (success) {
        completeExpedition();
      } else {
        terminateExpeditionGracefully("Died in dungeon.");
      }
      import('../state.js').then(mod => {
        mod.startCampfireRest(300000); // 5 minutes (300,000 ms)
        renderCampfireRestScreen(container);
      });
    });
  }
}

function getDefeatedEnemiesList(logs) {
  const counts = {};
  logs.forEach(line => {
    if (line.includes("💀 Defeated the ") || line.includes("💀 Defeated ")) {
      const parts = line.split("💀 Defeated the ");
      const name = parts[1] ? parts[1].split("!")[0] : line.split("💀 Defeated ")[1].split("!")[0];
      const cleanName = name.trim();
      counts[cleanName] = (counts[cleanName] || 0) + 1;
    }
  });
  
  const list = Object.entries(counts).map(([name, qty]) => `💀 ${qty}x ${name}`);
  if (list.length === 0) list.push("💀 No monsters encountered");
  return list;
}

function getIdleEnemySVG(dungeonId) {
  if (dungeonId === 'woods') return getMistSVG('#22c55e');
  if (dungeonId === 'mines') return getMistSVG('#94a3b8');
  if (dungeonId === 'ruins') return getMistSVG('#a78bfa');
  if (dungeonId === 'citadel') return getMistSVG('#f97316');
  if (dungeonId === 'vaults') return getMistSVG('#facc15');
  return getMistSVG('#9ca3af');
}

function getMistSVG(color) {
  return `
    <g opacity="0.45">
      <ellipse cx="50" cy="70" rx="35" ry="12" fill="${color}" />
      <ellipse cx="40" cy="58" rx="18" ry="10" fill="${color}" />
      <ellipse cx="60" cy="55" rx="15" ry="9" fill="${color}" />
      <ellipse cx="50" cy="45" rx="12" ry="8" fill="${color}" />
      <text x="50" y="38" text-anchor="middle" font-size="18" fill="${color}" opacity="0.8" font-weight="bold">?</text>
    </g>
  `;
}

function getMonsterSVG(monsterName) {
  const name = (monsterName || '').toLowerCase();

  if (name.includes('wolf') || name.includes('bear') || name.includes('boar') || name.includes('beast')) {
    return `
      <ellipse cx="50" cy="62" rx="26" ry="14" fill="#78350f" stroke="#292524" stroke-width="2"/>
      <circle cx="72" cy="54" r="12" fill="#78350f" stroke="#292524" stroke-width="2"/>
      <polygon points="66,44 70,36 76,44" fill="#78350f" stroke="#292524" stroke-width="1.5"/>
      <polygon points="74,43 78,35 82,43" fill="#78350f" stroke="#292524" stroke-width="1.5"/>
      <circle cx="70" cy="52" r="2" fill="#fef08a"/>
      <circle cx="77" cy="52" r="2" fill="#fef08a"/>
      <path d="M67 59 L70 63 L73 59" fill="none" stroke="#f8fafc" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="30" y="72" width="7" height="14" rx="3" fill="#451a03"/>
      <rect x="42" y="72" width="7" height="14" rx="3" fill="#451a03"/>
      <rect x="55" y="72" width="7" height="14" rx="3" fill="#451a03"/>
      <rect x="66" y="72" width="7" height="14" rx="3" fill="#451a03"/>
      <path d="M24 60 Q15 45 22 36" fill="none" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
    `;
  }

  if (name.includes('goblin') || name.includes('imp') || name.includes('sprite') || name.includes('kobold')) {
    return `
      <ellipse cx="50" cy="66" rx="18" ry="20" fill="#4ade80" stroke="#14532d" stroke-width="2"/>
      <circle cx="50" cy="38" r="16" fill="#4ade80" stroke="#14532d" stroke-width="2"/>
      <path d="M34 34 Q24 28 30 40" fill="#4ade80" stroke="#14532d" stroke-width="1.5"/>
      <path d="M66 34 Q76 28 70 40" fill="#4ade80" stroke="#14532d" stroke-width="1.5"/>
      <ellipse cx="44" cy="36" rx="4" ry="3" fill="#facc15"/>
      <ellipse cx="56" cy="36" rx="4" ry="3" fill="#facc15"/>
      <circle cx="44" cy="36" r="2" fill="#000"/>
      <circle cx="56" cy="36" r="2" fill="#000"/>
      <path d="M40 31 L48 34" stroke="#14532d" stroke-width="2" stroke-linecap="round"/>
      <path d="M60 31 L52 34" stroke="#14532d" stroke-width="2" stroke-linecap="round"/>
      <path d="M45 44 Q50 48 55 44" fill="none" stroke="#14532d" stroke-width="1.5"/>
      <line x1="65" y1="55" x2="80" y2="40" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
      <circle cx="81" cy="38" r="6" fill="#78350f" stroke="#292524" stroke-width="2"/>
    `;
  }

  if (name.includes('skeleton') || name.includes('zombie') || name.includes('wraith') || name.includes('lich') || name.includes('shade') || name.includes('ghost')) {
    return `
      <rect x="38" y="52" width="24" height="28" rx="4" fill="none" stroke="#e2e8f0" stroke-width="2.5"/>
      <line x1="38" y1="58" x2="62" y2="58" stroke="#e2e8f0" stroke-width="1.5"/>
      <line x1="38" y1="65" x2="62" y2="65" stroke="#e2e8f0" stroke-width="1.5"/>
      <line x1="38" y1="72" x2="62" y2="72" stroke="#e2e8f0" stroke-width="1.5"/>
      <line x1="50" y1="52" x2="50" y2="80" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="50" cy="36" r="16" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
      <ellipse cx="44" cy="34" rx="4" ry="5" fill="#1e293b"/>
      <ellipse cx="56" cy="34" rx="4" ry="5" fill="#1e293b"/>
      <ellipse cx="48" cy="41" rx="1.5" ry="2" fill="#94a3b8"/>
      <ellipse cx="52" cy="41" rx="1.5" ry="2" fill="#94a3b8"/>
      <path d="M43 46 H57" stroke="#94a3b8" stroke-width="1"/>
      <line x1="46" y1="44" x2="46" y2="48" stroke="#94a3b8" stroke-width="1"/>
      <line x1="50" y1="44" x2="50" y2="48" stroke="#94a3b8" stroke-width="1"/>
      <line x1="54" y1="44" x2="54" y2="48" stroke="#94a3b8" stroke-width="1"/>
      <line x1="38" y1="55" x2="22" y2="72" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
      <line x1="62" y1="55" x2="78" y2="72" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
      <line x1="44" y1="80" x2="38" y2="96" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
      <line x1="56" y1="80" x2="62" y2="96" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round"/>
    `;
  }

  if (name.includes('knight') || name.includes('warden') || name.includes('sentinel') || name.includes('champion') || name.includes('guard') || name.includes('soldier')) {
    return `
      <path d="M34 50 H66 L70 80 H30 Z" fill="#475569" stroke="#1e293b" stroke-width="2.5"/>
      <path d="M42 58 L50 68 L58 58 V74 H42 Z" fill="#f97316" stroke="#c2410c" stroke-width="1.5"/>
      <ellipse cx="32" cy="52" rx="8" ry="6" fill="#64748b" stroke="#1e293b" stroke-width="2"/>
      <ellipse cx="68" cy="52" rx="8" ry="6" fill="#64748b" stroke="#1e293b" stroke-width="2"/>
      <path d="M34 36 C34 20 66 20 66 36 L68 50 H32 Z" fill="#475569" stroke="#1e293b" stroke-width="2.5"/>
      <rect x="38" y="36" width="24" height="6" rx="2" fill="#0f172a"/>
      <ellipse cx="44" cy="39" rx="3" ry="2" fill="#f97316"/>
      <ellipse cx="56" cy="39" rx="3" ry="2" fill="#f97316"/>
      <rect x="72" y="40" width="5" height="35" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <rect x="68" y="52" width="13" height="4" rx="1" fill="#f97316"/>
    `;
  }

  if (name.includes('spider') || name.includes('scorpion') || name.includes('beetle') || name.includes('insect')) {
    return `
      <ellipse cx="50" cy="62" rx="16" ry="12" fill="#1e1b4b" stroke="#312e81" stroke-width="2"/>
      <circle cx="50" cy="44" r="12" fill="#1e1b4b" stroke="#312e81" stroke-width="2"/>
      <circle cx="44" cy="41" r="2.5" fill="#f87171"/>
      <circle cx="50" cy="40" r="2.5" fill="#f87171"/>
      <circle cx="56" cy="41" r="2.5" fill="#f87171"/>
      <circle cx="47" cy="46" r="2" fill="#fca5a5"/>
      <circle cx="53" cy="46" r="2" fill="#fca5a5"/>
      <path d="M46 52 L44 58" stroke="#818cf8" stroke-width="2" stroke-linecap="round"/>
      <path d="M54 52 L56 58" stroke="#818cf8" stroke-width="2" stroke-linecap="round"/>
      <path d="M34 56 Q22 48 16 38" fill="none" stroke="#312e81" stroke-width="3" stroke-linecap="round"/>
      <path d="M34 62 Q20 58 14 52" fill="none" stroke="#312e81" stroke-width="3" stroke-linecap="round"/>
      <path d="M34 68 Q20 70 16 78" fill="none" stroke="#312e81" stroke-width="3" stroke-linecap="round"/>
      <path d="M66 56 Q78 48 84 38" fill="none" stroke="#312e81" stroke-width="3" stroke-linecap="round"/>
      <path d="M66 62 Q80 58 86 52" fill="none" stroke="#312e81" stroke-width="3" stroke-linecap="round"/>
      <path d="M66 68 Q80 70 84 78" fill="none" stroke="#312e81" stroke-width="3" stroke-linecap="round"/>
    `;
  }

  if (name.includes('dragon') || name.includes('drake') || name.includes('wyvern')) {
    return `
      <ellipse cx="48" cy="66" rx="22" ry="16" fill="#991b1b" stroke="#7f1d1d" stroke-width="2"/>
      <ellipse cx="72" cy="48" rx="18" ry="14" fill="#991b1b" stroke="#7f1d1d" stroke-width="2"/>
      <path d="M84 46 L96 52 L84 58" fill="#991b1b" stroke="#7f1d1d" stroke-width="1.5"/>
      <ellipse cx="88" cy="50" rx="4" ry="3" fill="#fb923c" opacity="0.9"/>
      <ellipse cx="74" cy="44" rx="4" ry="5" fill="#fef08a"/>
      <circle cx="74" cy="44" r="2" fill="#000"/>
      <path d="M68 36 L64 22 L72 34" fill="#facc15" stroke="#a16207" stroke-width="1"/>
      <path d="M30 58 C14 38 10 20 22 14 C28 28 32 46 36 54 Z" fill="#7f1d1d" stroke="#991b1b" stroke-width="1.5"/>
      <path d="M26 66 Q10 72 6 86" fill="none" stroke="#991b1b" stroke-width="6" stroke-linecap="round"/>
      <path d="M40 80 L36 90 M48 82 L46 92 M58 80 L60 90" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
    `;
  }

  if (name.includes('troll') || name.includes('ogre') || name.includes('giant') || name.includes('golem')) {
    return `
      <path d="M28 52 H72 L76 88 H24 Z" fill="#65a30d" stroke="#3f6212" stroke-width="2.5"/>
      <ellipse cx="50" cy="32" rx="22" ry="18" fill="#65a30d" stroke="#3f6212" stroke-width="2.5"/>
      <ellipse cx="28" cy="32" rx="7" ry="5" fill="#4d7c0f" stroke="#3f6212" stroke-width="1.5"/>
      <ellipse cx="72" cy="32" rx="7" ry="5" fill="#4d7c0f" stroke="#3f6212" stroke-width="1.5"/>
      <circle cx="43" cy="28" r="4" fill="#fef08a"/>
      <circle cx="57" cy="28" r="4" fill="#fef08a"/>
      <circle cx="43" cy="29" r="2" fill="#000"/>
      <circle cx="57" cy="29" r="2" fill="#000"/>
      <ellipse cx="50" cy="36" rx="6" ry="4" fill="#4d7c0f"/>
      <path d="M42 42 Q50 48 58 42" fill="none" stroke="#3f6212" stroke-width="2"/>
      <line x1="46" y1="42" x2="44" y2="48" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="54" y1="42" x2="56" y2="48" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M28 56 L10 74" stroke="#65a30d" stroke-width="12" stroke-linecap="round"/>
      <path d="M72 56 L90 74" stroke="#65a30d" stroke-width="12" stroke-linecap="round"/>
    `;
  }

  // Default: shadow creature with glowing purple eyes
  return `
    <ellipse cx="50" cy="70" rx="28" ry="18" fill="#1e1b4b" opacity="0.7"/>
    <ellipse cx="50" cy="52" rx="22" ry="26" fill="#312e81"/>
    <ellipse cx="43" cy="46" rx="5" ry="6" fill="#a78bfa"/>
    <ellipse cx="57" cy="46" rx="5" ry="6" fill="#a78bfa"/>
    <ellipse cx="43" cy="46" rx="3" ry="4" fill="#ede9fe"/>
    <ellipse cx="57" cy="46" rx="3" ry="4" fill="#ede9fe"/>
    <path d="M28 60 Q16 52 18 40" fill="none" stroke="#312e81" stroke-width="4" stroke-linecap="round"/>
    <path d="M72 60 Q84 52 82 40" fill="none" stroke="#312e81" stroke-width="4" stroke-linecap="round"/>
    <path d="M38 76 Q30 88 34 96" fill="none" stroke="#312e81" stroke-width="4" stroke-linecap="round"/>
    <path d="M62 76 Q70 88 66 96" fill="none" stroke="#312e81" stroke-width="4" stroke-linecap="round"/>
  `;
}

function simulateOfflineCombat(container, dungeon, logBox, derived) {
  const state = getState();
  if (!state.expedition.active) return false;

  const now = Date.now();
  const lastSim = state.expedition.lastCombatSimulatedAt || state.expedition.startedAt || now;
  const elapsedMs = now - lastSim;

  if (elapsedMs < 45000) return false;

  const encountersToRun = Math.min(100, Math.floor(elapsedMs / 45000)); // Cap at 100 to prevent freezes on extreme AFK
  let playerDied = false;

  appendLog(`⏳ <em>Fast-forwarding ${encountersToRun} background encounters...</em>`, logBox);

  // Active weapon key & preset
  const activeWeaponKey = state.progression.equippedWeapon || "blade";
  const preset = WEAPON_PRESETS[activeWeaponKey] || WEAPON_PRESETS.blade;

  for (let i = 0; i < encountersToRun; i++) {
    const monsterData = dungeon.monsters[Math.floor(Math.random() * dungeon.monsters.length)];
    let monster = { ...monsterData, currentDistance: 5, maxHp: monsterData.hp };

    let turn = 0;
    // Inject weapon name temporarily for rollCombatTick
    derived.equippedMainHandName = preset.name;

    while (monster.hp > 0 && derived.currentHP > 0 && turn < 100) {
      turn++;
      rollCombatTick(derived, monster, preset.range, state.progression);
    }

    if (derived.currentHP <= 0) {
      playerDied = true;
      
      const timeOfDefeat = lastSim + (i * 45000) + 15000;
      state.expedition.lastCombatSimulatedAt = timeOfDefeat;
      
      appendLog(`💔 <strong>[Offline Combat]</strong> Defeated by ${monster.name} on encounter #${i + 1}!`, logBox);
      
      terminateExpeditionGracefully(`Incapacitated by ${monster.name} during background focus.`);
      cleanupTimers();
      renderExpeditionReport(container, dungeon, false);
      break;
    } else {
      const goldGained = Math.floor(monster.xp * 0.4 * dungeon.baseGoldMultiplier);
      const xpGained = Math.floor(monster.xp * dungeon.baseXPMultiplier);

      state.expedition.rewardsGained.gold += goldGained;
      state.expedition.rewardsGained.xp += xpGained;
      state.expedition.logs.push(`💀 Defeated ${monster.name}`);

      // Material loot drop check
      let lootMsg = '';
      if (Math.random() > 0.5) {
        const roll = Math.random();
        let matName = "Essence";
        let matAmt = Math.floor(Math.random() * 5) + 3; // 3-7
        let matField = "essence";
        let emoji = "✨";

        if (roll > 0.85) {
          matName = "Relic Shard";
          matAmt = 1;
          matField = "relicShards";
          emoji = "🧩";
        } else if (roll > 0.50) {
          matName = "Core Fragment";
          matAmt = Math.floor(Math.random() * 2) + 1;
          matField = "coreFragments";
          emoji = "⚙️";
        }
        state.expedition.rewardsGained[matField] = (state.expedition.rewardsGained[matField] || 0) + matAmt;
        lootMsg = `, loot: ${emoji} +${matAmt} ${matName}`;
      }

      appendLog(`💀 <strong>[Offline Combat]</strong> Defeated ${monster.name}! (+${goldGained} Gold, +${xpGained} XP${lootMsg})`, logBox);

      incrementCodexKill(monster.name);
    }
  }

  if (!playerDied) {
    state.expedition.lastCombatSimulatedAt = lastSim + (encountersToRun * 45000);
    saveState();
  }

  updateBattleHUD(container, null, derived);
  return playerDied;
}

function renderCampfireRestScreen(container) {
  cleanupTimers();

  const state = getState();
  const restTimeMs = state.expedition.restTimeRemaining || 300000; // 5 mins
  let remainingSec = Math.floor(restTimeMs / 1000);

  container.innerHTML = `
    <div class="expedition-screen setup-view" style="text-align: center; padding: 20px;">
      <div class="parchment-card" style="padding: 24px; border: 2px dashed var(--amber-gold); background: rgba(254, 240, 138, 0.05);">
        <div style="font-size: 3.5rem; margin-bottom: 8px; animation: pulse-flame 1.5s infinite alternate;">🏕️🔥</div>
        <h2 class="card-title font-gold" style="justify-content:center; border:none; margin-bottom:6px; font-size:1.3rem;">Campfire Sanctuary Rest</h2>
        
        <p style="font-size: 0.8rem; color: var(--ink-muted); margin-bottom: 16px; line-height: 1.4;">
          Rest your mind, stretch, or hydrate. Your Hero rests by the warm embers, fully restoring HP and gaining a <strong>+15% XP Buff</strong> on your next focus session!
        </p>

        <div style="font-size: 2.2rem; font-weight: 900; font-family: var(--font-header); color: var(--gold-primary); margin-bottom: 14px;" id="rest-timer-display">
          ${Math.floor(remainingSec / 60).toString().padStart(2, '0')}:${(remainingSec % 60).toString().padStart(2, '0')}
        </div>

        <div style="background: rgba(59, 96, 67, 0.08); border: 1px solid var(--emerald-green); border-radius: 8px; padding: 10px; font-size: 0.76rem; color: var(--emerald-green); font-weight: bold; margin-bottom: 18px;">
          ✨ Rest Buff Ready: +15% Combat XP on Next Focus Expedition!
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" id="btn-finish-rest-early" style="flex:1;">⚡ Finish Rest Now</button>
        </div>
      </div>
    </div>
  `;

  const timerEl = container.querySelector('#rest-timer-display');

  const restInterval = setInterval(() => {
    remainingSec--;
    if (timerEl) {
      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    if (remainingSec <= 0) {
      clearInterval(restInterval);
      import('../state.js').then(mod => {
        mod.finishCampfireRest();
        renderExpedition(container);
      });
    }
  }, 1000);

  const btnEarly = container.querySelector('#btn-finish-rest-early');
  if (btnEarly) {
    btnEarly.addEventListener('click', () => {
      clearInterval(restInterval);
      import('../state.js').then(mod => {
        mod.finishCampfireRest();
        renderExpedition(container);
      });
    });
  }
}
