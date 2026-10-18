/* ==========================================================================
   Quests View (Bounty Board / Recurrence Habit System) - The Great Ledger
   ========================================================================== */

import {
  getState,
  completeQuest,
  getMomentumMultiplier,
  createCustomQuest,
  generate3QuestCandidates,
  commitQuest,
  deleteQuest,
  undoQuestCompletion,
  payToRefocusSkill,
  forceRespawnQuest,
  checkQuestRecurrences
} from '../state.js';
import { xpForLevel, levelForXp } from '../formulas.js';

const undoHistory = new Map();
let activeCandidates = null;
let selectedSkillFilter = 'any';
let activeQuestSubtab = 'tab-active'; // 'tab-active' | 'tab-upcoming' | 'tab-history'

export function renderQuests(container) {
  // Ensure any recurrences that reached their time are respawned
  checkQuestRecurrences();

  const state = getState();
  const mult = parseFloat(getMomentumMultiplier());
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Active: ready to complete or in current undo window
  const activeQuests = (state.quests || []).filter(q => {
    if (undoHistory.has(q.id)) return true;
    return !q.nextAvailableAt || now >= q.nextAvailableAt;
  });

  // Upcoming: completed recurring bounties scheduled to return within 7 days
  const upcomingQuests = (state.quests || []).filter(q => {
    return q.nextAvailableAt && (q.nextAvailableAt > now) && ((q.nextAvailableAt - now) <= sevenDaysMs);
  }).sort((a, b) => a.nextAvailableAt - b.nextAvailableAt);

  // History:
  const historyEntries = state.profile.bountyHistory || [];
  const totalCompletedCount = state.profile.totalQuestsCompleted || historyEntries.length || (state.profile.weeklyStats?.questsCompleted || 0);

  // Screen layout HTML
  container.innerHTML = `
    <div class="quests-screen">
      <div class="parchment-card header-banner">
        <h1 class="card-title">📜 Guild Bounty Board</h1>
        <p class="description-text">
          Real-world discipline fuels your hero. Complete active bounties, manage recurring contracts, and inspect your legendary history.
        </p>
      </div>

      <!-- 3-Subtab Recurrence Navigation -->
      <div class="quest-nav-tabs" style="display: flex; gap: 6px; margin-bottom: 14px;">
        <button class="btn-secondary quest-subtab ${activeQuestSubtab === 'tab-history' ? 'active' : ''}" data-tab="tab-history" style="flex:1; font-size:0.75rem; padding:8px 4px; display:flex; align-items:center; justify-content:center; gap:5px;">
          📜 History <span class="badge" style="background:var(--sapphire-blue); color:white; border-radius:10px; padding:1px 6px; font-size:0.65rem;">${totalCompletedCount}</span>
        </button>
        <button class="btn-secondary quest-subtab ${activeQuestSubtab === 'tab-active' ? 'active' : ''}" data-tab="tab-active" style="flex:1; font-size:0.75rem; padding:8px 4px; display:flex; align-items:center; justify-content:center; gap:5px;">
          ⚔️ Active Quests <span class="badge" style="background:var(--ruby-crimson); color:white; border-radius:10px; padding:1px 6px; font-size:0.65rem;">${activeQuests.length}</span>
        </button>
        <button class="btn-secondary quest-subtab ${activeQuestSubtab === 'tab-upcoming' ? 'active' : ''}" data-tab="tab-upcoming" style="flex:1; font-size:0.75rem; padding:8px 4px; display:flex; align-items:center; justify-content:center; gap:5px;">
          ⏳ Upcoming (7d) <span class="badge" style="background:var(--amber-gold); color:var(--ink-charcoal); border-radius:10px; padding:1px 6px; font-size:0.65rem;">${upcomingQuests.length}</span>
        </button>
      </div>

      <!-- TAB 1: HISTORY (LEFT) -->
      <div id="view-tab-history" class="quest-tab-view ${activeQuestSubtab === 'tab-history' ? '' : 'hidden'}">
        <div class="quest-list" id="history-quest-list"></div>
        
        <!-- Total Completed Bounties Summary Banner at bottom -->
        <div class="parchment-card" style="margin-top: 16px; background: linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(30, 58, 138, 0.1) 100%), var(--parchment-light); border: 2px solid var(--amber-gold); text-align: center; padding: 18px; border-radius: 8px;">
          <div style="font-size: 2rem; margin-bottom: 2px;">🏆</div>
          <div style="font-family: var(--font-header); font-size: 0.95rem; font-weight: 700; color: var(--gold-amber); text-transform: uppercase; letter-spacing: 1px;">
            Total Completed Bounties
          </div>
          <div style="font-size: 2.2rem; font-weight: 900; color: var(--ink-dark); margin: 6px 0; font-family: var(--font-header);">
            ${totalCompletedCount} <span style="font-size: 1rem; font-weight: 600; color: var(--ink-muted);">Seals Completed</span>
          </div>
          <p style="font-size: 0.78rem; color: var(--ink-muted); margin: 0;">
            Every completed contract is permanently recorded in your hero's chronicle.
          </p>
        </div>
      </div>

      <!-- TAB 2: ACTIVE QUESTS (MIDDLE) -->
      <div id="view-tab-active" class="quest-tab-view ${activeQuestSubtab === 'tab-active' ? '' : 'hidden'}">
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button class="btn-primary full-width-btn" id="btn-open-quest-modal">
            ➕ Post New Custom Bounty
          </button>
          <button class="btn-primary full-width-btn" id="btn-generate-random-quest" style="background: var(--sapphire-blue);">
            🎲 Generate Random Quest
          </button>
        </div>
        <div class="quest-list" id="active-quest-list"></div>
      </div>

      <!-- TAB 3: UPCOMING RECURRENCE (RIGHT) -->
      <div id="view-tab-upcoming" class="quest-tab-view ${activeQuestSubtab === 'tab-upcoming' ? '' : 'hidden'}">
        <div style="margin-bottom: 10px; font-size: 0.78rem; color: var(--ink-muted); text-align: center;">
          Completed recurring bounties returning to the board within 7 days. You can force-respawn any bounty immediately.
        </div>
        <div class="quest-list" id="upcoming-quest-list"></div>
      </div>
    </div>

    <!-- Modal Scaffolding for Quest Creation -->
    <div id="quest-create-modal" class="modal-overlay hidden">
      <div class="parchment-card modal-content" style="max-width: 480px;">
        <h2 class="card-title">🖋️ Write Scroll of Bounty</h2>
        
        <div class="form-group">
          <label>Bounty Description</label>
          <input type="text" id="modal-quest-text" placeholder="e.g. Read 3 chapters of spellbook..." />
        </div>

        <div class="form-group">
          <label style="display:flex; justify-content:space-between; align-items:center;">
            <span>Recurrence Cadence (Days until respawn)</span>
            <span style="font-size:0.7rem; color:var(--ink-muted);">0 = One-Time Bounty</span>
          </label>
          
          <!-- Preset Buttons -->
          <div class="recurrence-presets" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px;">
            <button type="button" class="btn-secondary preset-cadence active" data-days="1" style="font-size:0.72rem; padding:6px;">1 Day (Daily)</button>
            <button type="button" class="btn-secondary preset-cadence" data-days="3" style="font-size:0.72rem; padding:6px;">3 Days</button>
            <button type="button" class="btn-secondary preset-cadence" data-days="7" style="font-size:0.72rem; padding:6px;">7 Days (Weekly)</button>
            <button type="button" class="btn-secondary preset-cadence" data-days="14" style="font-size:0.72rem; padding:6px;">14 Days</button>
            <button type="button" class="btn-secondary preset-cadence" data-days="30" style="font-size:0.72rem; padding:6px;">30 Days</button>
            <button type="button" class="btn-secondary preset-cadence" data-days="0" style="font-size:0.72rem; padding:6px;">One-Time (0d)</button>
          </div>

          <!-- Numeric Input -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="number" id="modal-quest-recurrence" min="0" max="365" value="1" style="flex: 1;" placeholder="Enter days..." />
            <span style="font-size: 0.8rem; color: var(--ink-muted); white-space: nowrap;">days until board respawn</span>
          </div>
        </div>

        <div class="form-group">
          <label>Mapped Attribute</label>
          <select id="modal-quest-skill">
            <option value="strength">Strength (Weightlifting / Heavy labor)</option>
            <option value="agility">Agility (Running / Gym / Cardio)</option>
            <option value="wisdom">Wisdom (Reading / Learning / Philosophy)</option>
            <option value="intelligence">Intelligence (Studying / Finance / Code / Mathematics)</option>
            <option value="insight">Insight (Meditation / Journaling / Self-Care)</option>
            <option value="vitality">Vitality (Healthy Sleep / Core recovery)</option>
            <option value="charisma">Charisma (Socializing / Leadership / Speech)</option>
            <option value="cleaning">Cleaning (🧹 Clean / Wash / Organize Sanctuary)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Personal Difficulty Tier</label>
          <select id="modal-quest-difficulty">
            <option value="F">F Tier (Effortless - 0.5x Rewards)</option>
            <option value="D">D Tier (Easy - 0.75x Rewards)</option>
            <option value="C" selected>C Tier (Moderate - 1.0x Rewards)</option>
            <option value="B">B Tier (Challenging - 1.5x Rewards)</option>
            <option value="A">A Tier (Hard - 2.0x Rewards)</option>
            <option value="S">S Tier (Heroic - 3.0x Rewards)</option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" id="modal-btn-cancel">Tear Up</button>
          <button class="btn-primary" id="modal-btn-submit">Seal with Wax</button>
        </div>
      </div>
    </div>

    <!-- Modal Scaffolding for Reflection / Mindset Entry -->
    <div id="quest-reflection-modal" class="modal-overlay hidden">
      <div class="parchment-card modal-content" style="max-width: 420px; padding:20px; text-align:center;">
        <h2 class="card-title" style="justify-content:center; border:none; margin-bottom:8px; font-size:1.15rem;">🧠 Daily Mindset Reflection</h2>
        <p style="font-size:0.8rem; color:var(--ink-muted); margin-bottom:12px;" id="reflection-prompt-text">Reflect on your growth...</p>
        
        <textarea id="reflection-input" class="parchment-input" rows="3" style="width:100%; font-size:0.85rem; padding:8px; margin-bottom:14px; resize:none;" placeholder="Write a short reflection to enter into your Chronicle..."></textarea>
        
        <div class="modal-actions" style="display:flex; gap:8px;">
          <button class="btn-secondary" id="reflection-btn-cancel" style="flex:1;">Skip Note</button>
          <button class="btn-primary" id="reflection-btn-submit" style="flex:1.5;">✍️ Record in Chronicle</button>
        </div>
      </div>
    </div>

    <!-- Modal Scaffolding for Random Quest Proposal -->
    <div id="quest-candidate-modal" class="modal-overlay hidden">
      <div class="parchment-card modal-content" style="max-width: 480px;">
        <h2 class="card-title">🎲 Draw Guild Bounties</h2>
        <p class="description-text" style="margin-bottom: 10px; font-size: 0.82rem;">A messenger from the Guild offers 3 contract choices:</p>
        
        <!-- Skill Refocus Selector -->
        <div style="display:flex; gap:6px; align-items:center; margin-bottom:10px;">
          <select id="candidate-skill-filter" style="flex:1; padding:5px; border-radius:4px; border:1px solid var(--amber-gold); font-size:0.78rem;">
            <option value="any">🎲 Any / Random Discipline</option>
            <option value="strength">⚔️ Strength (Fitness & Power)</option>
            <option value="agility">🏃 Agility (Cardio & Speed)</option>
            <option value="wisdom">📖 Wisdom (Reading & Knowledge)</option>
            <option value="intelligence">🧪 Intelligence (Logic & Code)</option>
            <option value="insight">👁️ Insight (Mindfulness & Focus)</option>
            <option value="vitality">💤 Vitality (Health & Sleep)</option>
            <option value="charisma">🍻 Charisma (Social & Leadership)</option>
            <option value="cleaning">🧹 Cleaning (Sanctuary Care)</option>
          </select>
          <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
            <button class="btn-secondary" id="btn-refocus-skill" style="font-size:0.7rem; padding:6px 10px; border-color:var(--amber-gold); white-space:nowrap;">
              🪙 Refocus (20g)
            </button>
            <span id="candidate-gold-display" style="font-size:0.6rem; color:var(--ink-muted);">🪙 ${state.profile.gold} Gold</span>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 10px; text-align: left;">
          <label style="font-size: 0.75rem; font-weight: bold; color: var(--ink-dark);">Personal Difficulty Tier:</label>
          <select id="candidate-quest-difficulty" style="width: 100%; padding: 4px 6px; border-radius: 4px; border: 1px solid var(--amber-gold); font-size: 0.78rem;">
            <option value="F">F Tier (Effortless - 0.5x Rewards)</option>
            <option value="D">D Tier (Easy - 0.75x Rewards)</option>
            <option value="C" selected>C Tier (Moderate - 1.0x Rewards)</option>
            <option value="B">B Tier (Challenging - 1.5x Rewards)</option>
            <option value="A">A Tier (Hard - 2.0x Rewards)</option>
            <option value="S">S Tier (Heroic - 3.0x Rewards)</option>
          </select>
        </div>

        <!-- 3 Candidate Options Container -->
        <div id="candidate-options-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px; max-height:300px; overflow-y:auto;">
          <!-- Dynamically populated 3 candidate cards -->
        </div>

        <div class="modal-actions" style="display: flex; flex-direction: column; gap: 6px;">
          <button class="btn-secondary" id="candidate-btn-reject" style="width: 100%; color: var(--ruby-crimson); font-size:0.75rem; padding:6px;">🔥 Decline All (Close)</button>
        </div>
      </div>
    </div>
  `;

  // Populate Lists for the 3 tabs
  const activeList = container.querySelector('#active-quest-list');
  const upcomingList = container.querySelector('#upcoming-quest-list');
  const historyList = container.querySelector('#history-quest-list');

  // Sort active quests so completed ones in undo window are at the bottom
  activeQuests.sort((a, b) => {
    const aComp = a.completedCount > 0 ? 1 : 0;
    const bComp = b.completedCount > 0 ? 1 : 0;
    return aComp - bComp;
  });

  if (activeList) populateActiveQuests(activeQuests, activeList, mult);
  if (upcomingList) populateUpcomingQuests(upcomingQuests, upcomingList, mult);
  if (historyList) populateHistoryQuests(historyEntries, historyList);

  // Setup Event Listeners
  setupEventListeners(container);
}

const SKILL_EMOJIS = {
  strength: '⚔️',
  agility: '🏃',
  wisdom: '📖',
  intelligence: '🧪',
  insight: '👁️',
  vitality: '💤',
  charisma: '🍻',
  cleaning: '🧹'
};

function populateActiveQuests(quests, listContainer, mult) {
  if (quests.length === 0) {
    listContainer.innerHTML = `<div class="empty-quest-msg" style="text-align:center; padding:24px 16px;">No active seals on this board.<br><small style="color:var(--ink-muted); margin-top:4px; display:inline-block;">Post a new bounty above or check the Upcoming tab!</small></div>`;
    return;
  }

  const state = getState();

  listContainer.innerHTML = quests.map(quest => {
    const xpReward = Math.floor(quest.baseXP * mult);
    const goldReward = Math.floor(quest.baseGold * mult);
    const emoji = SKILL_EMOJIS[quest.mappedSkill] || '🛡️';
    
    const isCompleted = quest.completedCount > 0;
    const cardClass = isCompleted ? 'quest-card quest-completed-today' : 'quest-card';
    const btnAttr = isCompleted ? 'disabled' : '';
    const btnLabel = isCompleted ? '✅ Done' : 'Complete';
    
    const cadenceLabel = quest.recurrenceDays === 0
      ? 'One-Time'
      : (quest.recurrenceDays === 1 ? 'Daily' : `${quest.recurrenceDays}d Cadence`);

    let streakHtml = '';
    if (quest.currentStreak > 1) {
      streakHtml = `<span class="streak-badge">🔥 ${quest.currentStreak}-day streak</span>`;
    }
    
    const currentXp = state.skills[quest.mappedSkill] || 0;
    const currentLevel = levelForXp(currentXp);
    const xpForCurrent = xpForLevel(currentLevel);
    const xpForNext = xpForLevel(currentLevel + 1);
    const progressTotal = xpForNext - xpForCurrent;
    const progressCurrent = currentXp - xpForCurrent;
    const pct = Math.min(100, Math.max(0, (progressCurrent / progressTotal) * 100));
    
    const xpBarHtml = `
      <div class="quest-xp-bar-row">
        <div class="quest-xp-bar-track">
          <div class="quest-xp-bar-fill" style="width: ${pct}%"></div>
        </div>
        <span class="quest-xp-bar-label">${currentXp}/${xpForNext}</span>
      </div>
    `;

    return `
      <div class="parchment-card ${cardClass}" data-id="${quest.id}">
        <div class="quest-card-top" style="display:flex; justify-content:space-between; gap:12px; align-items:stretch;">
          <div class="quest-card-left" style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div class="skill-indicator" title="Skill Mapped">
                <span class="emoji-icon">${emoji}</span>
                <span class="skill-name">${quest.mappedSkill}</span>
                ${quest.difficultyTier ? `<span class="difficulty-badge tier-${quest.difficultyTier}" style="font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:6px; background:rgba(0,0,0,0.06); color:var(--ink-dark);">${quest.difficultyTier} Tier</span>` : ''}
                <span class="cadence-badge" style="font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:4px; background:rgba(217,119,6,0.12); color:var(--amber-gold);">🔁 ${cadenceLabel}</span>
              </div>
              <button class="btn-delete-quest" title="Delete Quest" style="background:none; border:none; cursor:pointer; font-size:1.2rem; opacity:0.6; padding:0; line-height:1;">🗑️</button>
            </div>
            <div class="quest-text" style="margin-top:6px; font-size:0.95rem;">${quest.text}</div>
            <div class="quest-meta-row" style="margin-top:6px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <div class="quest-stats">Completed: <strong>${quest.completedCount}</strong></div>
              ${streakHtml}
            </div>
            ${xpBarHtml}
          </div>
          <div class="quest-card-right" style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; min-width:120px; justify-content:center;">
            ${isCompleted && undoHistory.has(quest.id) ? `
            <button class="btn-quest-undo" title="Undo Completion" style="background:var(--ruby-crimson); color:var(--ink-light); border:2px solid #7f1d1d; border-radius:6px; cursor:pointer; font-weight:bold; font-family:var(--font-header); font-size: 0.9rem; padding:8px 12px; width:100%; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
              ↩️ Undo
            </button>
            ` : `
            <div class="quest-reward-box" style="text-align:left; font-size:0.72rem; color:var(--ink-muted); background:rgba(0,0,0,0.02); border:1px dashed var(--amber-gold); padding:6px 10px; border-radius:6px; width:100%;">
              <div style="font-family:var(--font-header); font-weight:700; font-size:0.58rem; text-transform:uppercase; color:var(--amber-gold); margin-bottom:4px; letter-spacing:0.5px;">Bounty Rewards</div>
              <div style="display:flex; align-items:center; gap:4px; margin-bottom:2px;">• <span style="color:var(--sapphire-blue); font-weight:700;">+${xpReward} XP</span></div>
              <div style="display:flex; align-items:center; gap:4px;">• <span style="color:var(--emerald-green); font-weight:700;">+${goldReward}g</span></div>
            </div>
            <button class="btn-quest-complete btn-primary" title="Claim Rewards" ${btnAttr} style="font-size:0.75rem; padding:6px 12px; font-weight:bold; width:100%; border-radius:4px;">
              ${btnLabel}
            </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function populateUpcomingQuests(quests, listContainer, mult) {
  if (quests.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-quest-msg" style="text-align:center; padding:28px 16px;">
        ⏳ No completed bounties scheduled to recur within the next 7 days.
        <br><small style="color:var(--ink-muted); margin-top:6px; display:inline-block;">When you complete recurring bounties, they show up here with a countdown timer until their next respawn.</small>
      </div>
    `;
    return;
  }

  const now = Date.now();

  listContainer.innerHTML = quests.map(quest => {
    const diffMs = Math.max(0, quest.nextAvailableAt - now);
    const days = Math.floor(diffMs / (24 * 3600 * 1000));
    const hours = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    const countdownStr = days > 0
      ? `${days}d ${hours}h`
      : (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);

    const xpReward = Math.floor(quest.baseXP * mult);
    const goldReward = Math.floor(quest.baseGold * mult);
    const emoji = SKILL_EMOJIS[quest.mappedSkill] || '🛡️';

    return `
      <div class="parchment-card quest-card" data-id="${quest.id}" style="border-left: 4px solid var(--amber-gold);">
        <div class="quest-card-top" style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <div class="quest-card-left" style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div class="skill-indicator">
                <span class="emoji-icon">${emoji}</span>
                <span class="skill-name">${quest.mappedSkill}</span>
                ${quest.difficultyTier ? `<span class="difficulty-badge tier-${quest.difficultyTier}" style="font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:6px; background:rgba(0,0,0,0.06); color:var(--ink-dark);">${quest.difficultyTier} Tier</span>` : ''}
                <span style="font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:4px; margin-left:4px; background:rgba(217,119,6,0.12); color:var(--amber-gold);">🔁 Every ${quest.recurrenceDays}d</span>
              </div>
              <span class="countdown-badge" style="background:rgba(217,119,6,0.15); color:var(--gold-amber); border:1px solid var(--amber-gold); padding:2px 8px; border-radius:12px; font-size:0.68rem; font-weight:700;">
                ⏳ Returns in ${countdownStr}
              </span>
            </div>
            <div class="quest-text" style="margin-top:6px; font-size:0.95rem;">${quest.text}</div>
            <div style="font-size:0.75rem; color:var(--ink-muted); margin-top:4px;">
              Yields: <strong style="color:var(--sapphire-blue);">+${xpReward} XP</strong> | <strong style="color:var(--emerald-green);">+${goldReward} Gold</strong>
            </div>
          </div>
          <div class="quest-card-right" style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; min-width:130px; justify-content:center;">
            <button class="btn-primary btn-force-respawn" data-id="${quest.id}" title="Reset timer and place bounty immediately back on the active board" style="font-size:0.72rem; padding:8px 10px; font-weight:bold; background:linear-gradient(135deg, #d97706, #b45309); width:100%; border-radius:4px; display:flex; align-items:center; justify-content:center; gap:4px;">
              ⚡ Respawn Now
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function populateHistoryQuests(historyEntries, listContainer) {
  if (historyEntries.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-quest-msg" style="text-align:center; padding:28px 16px;">
        📜 No completed bounties recorded in the Great Ledger yet.
        <br><small style="color:var(--ink-muted); margin-top:6px; display:inline-block;">Complete bounties from the Active board to chronicle your accomplishments here!</small>
      </div>
    `;
    return;
  }

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = historyEntries.filter(h => (now - h.completedAt) <= sevenDaysMs);
  const previousWeeks = historyEntries.filter(h => (now - h.completedAt) > sevenDaysMs);

  function renderGroup(title, entries) {
    if (entries.length === 0) return '';
    return `
      <div class="quest-section-header" style="margin: 14px 0 8px 0; font-size: 0.85rem;">
        ${title} (${entries.length})
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${entries.map(h => {
          const emoji = SKILL_EMOJIS[h.skill] || '🛡️';
          const dateStr = new Date(h.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = new Date(h.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const cadenceStr = h.recurrenceDays === 0 ? 'One-time' : `${h.recurrenceDays}d Cadence`;
          return `
            <div class="parchment-card" style="padding: 10px 14px; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.08); border-radius: 6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span>${emoji}</span>
                  <strong style="text-transform:uppercase; font-size:0.75rem; color:var(--ink-dark);">${h.skill}</strong>
                  ${h.difficultyTier ? `<span style="font-size:0.6rem; padding:1px 4px; border-radius:3px; background:rgba(0,0,0,0.06); font-weight:bold;">${h.difficultyTier} Tier</span>` : ''}
                  <span style="font-size:0.6rem; color:var(--ink-muted); background:rgba(217,119,6,0.08); padding:1px 5px; border-radius:3px;">${cadenceStr}</span>
                </div>
                <div style="font-size:0.7rem; color:var(--ink-muted);">
                  ${dateStr} • ${timeStr}
                </div>
              </div>
              <div style="font-size:0.88rem; color:var(--ink-dark); margin:4px 0 6px 0; font-style:italic;">
                "${h.text}"
              </div>
              <div style="font-size:0.72rem; display:flex; gap:10px; color:var(--ink-muted);">
                <span>Earned: <strong style="color:var(--sapphire-blue);">+${h.xpReward} XP</strong></span>
                <span>•</span>
                <span><strong style="color:var(--emerald-green);">+${h.goldReward} Gold</strong></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  listContainer.innerHTML = `
    ${renderGroup('🛡️ Completed This Week', thisWeek)}
    ${renderGroup('📜 Previous Weeks', previousWeeks)}
  `;
}

function setupEventListeners(container) {
  // Quest completion click handler
  container.querySelectorAll('.btn-quest-complete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.quest-card');
      const questId = card.getAttribute('data-id');
      
      // Check if this is a reflection / mindset quest (Wisdom or Insight)
      const state = getState();
      const quest = state.quests.find(q => q.id === questId);
      
      const isReflection = quest && (quest.mappedSkill === 'wisdom' || quest.mappedSkill === 'insight') && quest.completedCount === 0;

      if (isReflection) {
        const refModal = container.querySelector('#quest-reflection-modal');
        const refPrompt = container.querySelector('#reflection-prompt-text');
        const refInput = container.querySelector('#reflection-input');
        const refSubmit = container.querySelector('#reflection-btn-submit');
        const refCancel = container.querySelector('#reflection-btn-cancel');

        if (refModal && refPrompt && refInput) {
          refPrompt.textContent = `"${quest.text}"`;
          refInput.value = '';
          refModal.classList.remove('hidden');

          const handleReflectionFinish = (textToLog) => {
            refModal.classList.add('hidden');
            if (textToLog) {
              import('../state.js').then(mod => {
                mod.addChronicleEvent(`🧠 Mindset Reflection [${quest.mappedSkill.toUpperCase()}]: "${textToLog}"`);
              });
            }
            // Perform completion
            const reward = completeQuest(questId);
            if (reward) {
              const rect = btn.getBoundingClientRect();
              spawnSplat(rect.left + rect.width/2, rect.top, `+${reward.xpReward} XP`, 'splat-xp');
              spawnSplat(rect.left + rect.width/2, rect.top - 20, `+${reward.goldReward} Gold`, 'splat-gold');
              setTimeout(() => {
                undoHistory.delete(questId);
                renderQuests(container);
              }, 450);
            }
          };

          const onSub = () => {
            refSubmit.removeEventListener('click', onSub);
            refCancel.removeEventListener('click', onCan);
            handleReflectionFinish(refInput.value.trim());
          };
          const onCan = () => {
            refSubmit.removeEventListener('click', onSub);
            refCancel.removeEventListener('click', onCan);
            handleReflectionFinish('');
          };

          refSubmit.addEventListener('click', onSub);
          refCancel.addEventListener('click', onCan);
          return;
        }
      }

      // Perform complete
      const reward = completeQuest(questId);
      if (reward) {
        undoHistory.set(questId, reward);
        
        const rect = btn.getBoundingClientRect();
        spawnSplat(rect.left + rect.width/2, rect.top, `+${reward.xpReward} XP`, 'splat-xp');
        spawnSplat(rect.left + rect.width/2, rect.top - 20, `+${reward.goldReward} Gold`, 'splat-gold');

        if (reward.bossDamage) {
          const bd = reward.bossDamage;
          let splatMsg = `⚔️ +${bd.damage} Raid DMG`;
          let splatColor = 'splat-gold';
          if (bd.isWeak) {
            splatMsg = `💥 +${bd.damage} DMG (WEAKNESS!)`;
            splatColor = 'splat-xp';
          } else if (bd.isResistant) {
            splatMsg = `🛡️ +${bd.damage} DMG (RESISTANT)`;
          }
          setTimeout(() => {
            spawnSplat(rect.left + rect.width/2, rect.top - 40, splatMsg, splatColor);
          }, 250);
        }

        if (reward.isOneTime) {
          // ONE-TIME BOUNTY COMPLETED: Wait 5s for potential undo, then burn
          card.classList.add('quest-checked');
          card.innerHTML += `<div style="color:var(--ruby-crimson); font-size:0.8rem; text-align:center; margin-top:4px;">Will burn in 5s...</div>`;
          
          setTimeout(() => {
            if (!undoHistory.has(questId)) return; // Undone!
            
            undoHistory.delete(questId);
            const currentCard = container.querySelector(`.quest-card[data-id="${questId}"]`);
            if (currentCard) {
              currentCard.classList.add('quest-burn-out');
              triggerFireParticles(currentCard);
            }
            
            setTimeout(() => {
              import('../state.js').then(mod => {
                mod.deleteQuest(questId);
                renderQuests(container);
              });
            }, 750);
          }, 5000);
          
          // Render quests quickly to show Undo button during the 5s window
          setTimeout(() => renderQuests(container), 350);
        } else {
          // Repeating recurring habit: standard parchment checkmark
          card.classList.add('quest-checked');
          setTimeout(() => {
            undoHistory.delete(questId);
            renderQuests(container);
          }, 450);
        }
      }
    });
  });

  // Quest undo click handler
  container.querySelectorAll('.btn-quest-undo').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.quest-card');
      const questId = card.getAttribute('data-id');
      const reward = undoHistory.get(questId);
      
      if (reward) {
        undoHistory.delete(questId);
        undoQuestCompletion(questId, reward);
        renderQuests(container);
      }
    });
  });

  // Quest deletion click handler
  container.querySelectorAll('.btn-delete-quest').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.quest-card');
      const questId = card.getAttribute('data-id');
      
      if (confirm("Are you sure you want to tear up this bounty?")) {
        deleteQuest(questId);
        renderQuests(container);
      }
    });
  });

  // Modal display listeners
  const modal = container.querySelector('#quest-create-modal');
  const btnOpen = container.querySelector('#btn-open-quest-modal');
  const btnCancel = container.querySelector('#modal-btn-cancel');
  const btnSubmit = container.querySelector('#modal-btn-submit');
  const btnGenerateRandom = container.querySelector('#btn-generate-random-quest');

  // Candidate Quest Modal elements
  const candidateModal = container.querySelector('#quest-candidate-modal');
  const candidateOptionsList = container.querySelector('#candidate-options-list');
  const candidateDifficulty = container.querySelector('#candidate-quest-difficulty');
  const candidateSkillFilter = container.querySelector('#candidate-skill-filter');
  const btnRefocusSkill = container.querySelector('#btn-refocus-skill');
  const btnCandidateReject = container.querySelector('#candidate-btn-reject');

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

  const difficultyMults = { F: 0.5, D: 0.75, C: 1.0, B: 1.5, A: 2.0, S: 3.0 };

  function renderCandidateOptions() {
    if (!activeCandidates || activeCandidates.length === 0 || !candidateOptionsList) return;
    const tier = candidateDifficulty ? candidateDifficulty.value : "C";
    const tierMult = difficultyMults[tier] || 1.0;
    const mult = parseFloat(getMomentumMultiplier());

    if (candidateSkillFilter) {
      candidateSkillFilter.value = selectedSkillFilter;
    }

    candidateOptionsList.innerHTML = activeCandidates.map((c, idx) => {
      const finalXP = Math.round(c.baseXP * tierMult * mult);
      const finalGold = Math.round(c.baseGold * tierMult * mult);
      return `
        <div class="parchment-card" style="padding: 10px; background: rgba(0,0,0,0.03); border: 1px solid var(--amber-gold); border-radius: 6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight: bold; font-size: 0.78rem; color: var(--gold-amber); text-transform: uppercase;">
              ${skillEmojis[c.mappedSkill] || c.mappedSkill.toUpperCase()}
            </span>
            <span style="font-size:0.68rem; color:var(--ink-muted);">
              Yield: <strong style="color:var(--sapphire-blue);">+${finalXP} XP</strong> | <strong style="color:var(--emerald-green);">+${finalGold} Gold</strong>
            </span>
          </div>
          <div style="font-size: 0.88rem; margin: 6px 0; font-style: italic; color: var(--ink-dark); line-height: 1.3;">
            "${c.text}"
          </div>
          <button class="btn-primary btn-accept-option" data-idx="${idx}" style="width:100%; font-size:0.75rem; padding:5px;">
            📜 Seal Bounty Contract #${idx + 1}
          </button>
        </div>
      `;
    }).join('');

    candidateOptionsList.querySelectorAll('.btn-accept-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const chosen = activeCandidates[idx];
        if (chosen) {
          const t = candidateDifficulty ? candidateDifficulty.value : "C";
          const tMult = difficultyMults[t] || 1.0;
          chosen.baseXP = Math.round(chosen.baseXP * tMult);
          chosen.baseGold = Math.round(chosen.baseGold * tMult);
          chosen.difficultyTier = t;

          commitQuest(chosen);
          activeCandidates = null;
          candidateModal.classList.add('hidden');
          renderQuests(container);
        }
      });
    });

    candidateModal.classList.remove('hidden');
  }

  // Check if candidate modal is active across re-renders
  if (activeCandidates && candidateModal) {
    renderCandidateOptions();
  }

  btnOpen.addEventListener('click', () => modal.classList.remove('hidden'));
  btnCancel.addEventListener('click', () => modal.classList.add('hidden'));
  
  if (btnGenerateRandom) {
    btnGenerateRandom.addEventListener('click', () => {
      selectedSkillFilter = 'any';
      activeCandidates = generate3QuestCandidates('any');
      renderCandidateOptions();
    });
  }

  if (candidateSkillFilter) {
    candidateSkillFilter.addEventListener('change', () => {
      selectedSkillFilter = candidateSkillFilter.value;
    });
  }

  if (btnRefocusSkill) {
    btnRefocusSkill.addEventListener('click', () => {
      const res = payToRefocusSkill(selectedSkillFilter, 20);
      if (!res.success) {
        alert(res.message);
        return;
      }
      activeCandidates = generate3QuestCandidates(selectedSkillFilter);
      renderQuests(container);
    });
  }

  if (candidateDifficulty) {
    candidateDifficulty.addEventListener('change', () => {
      if (activeCandidates) {
        renderCandidateOptions();
      }
    });
  }

  if (btnCandidateReject) {
    btnCandidateReject.addEventListener('click', () => {
      activeCandidates = null;
      candidateModal.classList.add('hidden');
    });
  }

  // 3-Subtab navigation click handler
  container.querySelectorAll('.quest-subtab').forEach(tabBtn => {
    tabBtn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-tab');
      if (targetTab) {
        activeQuestSubtab = targetTab;
        renderQuests(container);
      }
    });
  });

  // Force Respawn click handler for upcoming bounties
  container.querySelectorAll('.btn-force-respawn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const questId = e.currentTarget.getAttribute('data-id');
      if (questId) {
        forceRespawnQuest(questId);
        renderQuests(container);
      }
    });
  });

  // Recurrence preset buttons & input handler in Quest Creation Modal
  const inputRecurrence = container.querySelector('#modal-quest-recurrence');
  const presetButtons = container.querySelectorAll('.preset-cadence');
  presetButtons.forEach(pBtn => {
    pBtn.addEventListener('click', () => {
      presetButtons.forEach(b => b.classList.remove('active'));
      pBtn.classList.add('active');
      if (inputRecurrence) {
        inputRecurrence.value = pBtn.getAttribute('data-days');
      }
    });
  });

  if (inputRecurrence) {
    inputRecurrence.addEventListener('input', () => {
      const val = inputRecurrence.value.trim();
      presetButtons.forEach(b => {
        if (b.getAttribute('data-days') === val) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    });
  }

  btnSubmit.addEventListener('click', () => {
    const text = container.querySelector('#modal-quest-text').value.trim();
    const recurrenceVal = inputRecurrence ? parseInt(inputRecurrence.value, 10) : 1;
    const recurrenceDays = isNaN(recurrenceVal) ? 1 : Math.max(0, recurrenceVal);
    const skill = container.querySelector('#modal-quest-skill').value;
    const difficulty = container.querySelector('#modal-quest-difficulty').value;

    if (!text) {
      alert("Guild laws require a description for your bounty!");
      return;
    }

    createCustomQuest(text, recurrenceDays, skill, difficulty);
    modal.classList.add('hidden');
    activeQuestSubtab = 'tab-active';
    renderQuests(container);
  });
}

function spawnSplat(x, y, text, splatClass) {
  const el = document.createElement('span');
  el.className = `splat-text ${splatClass}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y + window.scrollY}px`;
  
  document.body.appendChild(el);
  
  // Cleanup
  setTimeout(() => {
    el.remove();
  }, 800);
}

function triggerFireParticles(cardElement) {
  const rect = cardElement.getBoundingClientRect();
  const numParticles = 30;
  for (let i = 0; i < numParticles; i++) {
    const p = document.createElement('div');
    p.className = 'fire-particle';
    
    const size = Math.random() * 8 + 4;
    const colors = ['#ff4500', '#ff8c00', '#ffd700', '#ff3300'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.backgroundColor = color;
    p.style.borderRadius = '50%';
    p.style.position = 'fixed';
    p.style.zIndex = '300';
    p.style.pointerEvents = 'none';
    p.style.boxShadow = `0 0 8px ${color}`;
    
    // Initial position scattered within the card
    const startX = rect.left + Math.random() * rect.width;
    const startY = rect.top + Math.random() * rect.height;
    p.style.left = `${startX}px`;
    p.style.top = `${startY}px`;
    
    // Random angle upwards (between -180 and 0 degrees)
    const angle = Math.random() * Math.PI - Math.PI; 
    const speed = Math.random() * 120 + 60; // px/s
    const lifetime = Math.random() * 0.4 + 0.45; // 0.45s to 0.85s
    
    document.body.appendChild(p);
    
    const targetX = startX + Math.cos(angle) * (speed * lifetime);
    const targetY = startY + Math.sin(angle) * (speed * lifetime) - 50;
    
    p.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 0.9 },
      { transform: `translate(${targetX - startX}px, ${targetY - startY}px) scale(0)`, opacity: 0 }
    ], {
      duration: lifetime * 1000,
      easing: 'ease-out',
      fill: 'forwards'
    });
    
    setTimeout(() => p.remove(), lifetime * 1000);
  }
}

