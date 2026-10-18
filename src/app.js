/* ==========================================================================
   The Great Ledger - Main System Controller & Tab Swapper
   ========================================================================== */

import { loadState, getState, subscribe, getMomentumMultiplier, claimPendingLoginBonus, clearPendingLevelUp, clearPendingClassAdvancement, initClerkAuth, openClerkSignIn, openClerkUserProfile } from './state.js';
import { getLayeredAvatarSVG } from './formulas.js';
import { renderQuests } from './screens/quests.js';
import { renderCharacter, resetCharacterState } from './screens/character.js';
import { renderExpedition } from './screens/expeditions.js';
import { renderMarket } from './screens/market.js';
import { renderGuild } from './screens/guild.js';

// Global Viewport Elements
const viewport = document.getElementById('app-viewport');
const nav = document.getElementById('bottom-navigation');

let currentScreen = 'quests'; // 'quests', 'world', 'character'

/**
 * Core Dynamic Tab Navigation Handler
 */
export function switchScreen(screenName) {
  const state = getState();
  
  if (screenName !== 'character') {
    resetCharacterState();
  }

  // Discipline Guard: Lock screen if a Focus timer is underway!
  if (state.expedition.active) {
    currentScreen = 'world'; // Locked onto the Focus screen
    updateNavSelection('world');
    renderActiveView();
    return;
  }

  currentScreen = screenName;
  updateNavSelection(screenName);
  renderActiveView();
}

function updateNavSelection(screenName) {
  nav.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.getAttribute('data-screen') === screenName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

function renderActiveView() {
  const state = getState();
  
  // Clear any residual timer ticks if switching screens safely
  viewport.innerHTML = "";

  try {
    if (state.expedition.active) {
      viewport.setAttribute('data-screen', 'world');
      renderExpedition(viewport);
      return;
    }

    viewport.setAttribute('data-screen', currentScreen);

    switch (currentScreen) {
      case 'quests':
        renderQuests(viewport);
        break;
      case 'world':
        renderExpedition(viewport);
        break;
      case 'market':
        renderMarket(viewport);
        break;
      case 'character':
        renderCharacter(viewport);
        break;
      case 'guild':
        renderGuild(viewport);
        break;
      default:
        renderQuests(viewport);
    }
  } catch(e) {
    viewport.innerHTML = `<div style="padding:20px; color:red; font-size:0.75rem; word-break:break-all;"><strong>JS ERROR:</strong><br>${e.message}<br><pre>${e.stack}</pre></div>`;
    console.error('renderActiveView failed:', e);
  }
}


/* ==========================================================================
   Reactivity & Status Updates
   ========================================================================== */

function syncStatusHeader() {
  const state = getState();
  
  // Basic attributes
  document.getElementById('header-char-name').textContent = state.profile.name;
  document.getElementById('header-archetype').textContent = `${state.profile.archetype}`;
  document.getElementById('header-gold').textContent = state.profile.gold.toLocaleString();
  document.getElementById('header-steps').textContent = state.profile.steps.toLocaleString();
  document.getElementById('header-total-level').textContent = state.profile.totalLevel;

  // Momentum meter variables
  const flameFill = document.getElementById('flame-meter-fill');
  const flameMult = document.getElementById('flame-multiplier');
  
  flameFill.style.width = `${state.profile.momentum}%`;
  flameMult.textContent = `${getMomentumMultiplier()}x`;

  // Dynamic navigation locking
  const bottomNav = document.getElementById('bottom-navigation');
  if (bottomNav) {
    if (state.expedition.active) {
      bottomNav.classList.add('nav-locked');
    } else {
      bottomNav.classList.remove('nav-locked');
    }
  }

  // Dynamic Avatar
  const avatarSVG = document.getElementById('header-avatar');
  if (avatarSVG) {
    avatarSVG.innerHTML = getLayeredAvatarSVG(state, null);
  }

  // Clerk Auth Status Controls
  const btnSignIn = document.getElementById('btn-clerk-sign-in');
  const userBtnMount = document.getElementById('clerk-user-button-mount');

  // Get the initialized Clerk instance (set on window by state.js after clerk.load())
  const clerkInst = window.Clerk && window.Clerk.loaded ? window.Clerk : null;

  if (state.auth && state.auth.isSignedIn && state.auth.user) {
    if (btnSignIn) btnSignIn.classList.add('hidden');
    if (userBtnMount) {
      userBtnMount.classList.remove('hidden');
      if (clerkInst && typeof clerkInst.mountUserButton === 'function' && !userBtnMount.dataset.mounted) {
        try {
          clerkInst.mountUserButton(userBtnMount);
          userBtnMount.dataset.mounted = "true";
        } catch (e) {
          userBtnMount.innerHTML = `
            <button id="btn-demo-profile" style="background:none; border:none; cursor:pointer; font-size:1.1rem;" title="${state.auth.user.name}">
              <img src="${state.auth.user.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>👤</text></svg>'}" style="width:24px; height:24px; border-radius:50%; border:1px solid var(--amber-gold);" />
            </button>
          `;
        }
      } else if (!clerkInst) {
        // Clerk not yet loaded — show avatar fallback
        userBtnMount.innerHTML = `
          <button id="btn-demo-profile" style="background:none; border:none; cursor:pointer; font-size:1.1rem;" title="${state.auth.user.name}">
            <img src="${state.auth.user.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>👤</text></svg>'}" style="width:24px; height:24px; border-radius:50%; border:1px solid var(--amber-gold);" />
          </button>
        `;
      }
    }
  } else {
    if (btnSignIn) btnSignIn.classList.remove('hidden');
    if (userBtnMount) userBtnMount.classList.add('hidden');
  }
}


/* ==========================================================================
   Initialization
   ========================================================================== */

function init() {
  try {
    // Load local state
    loadState();

    // Initialize Clerk Authentication
    initClerkAuth();

    // Also listen for Clerk auto-load completion (fired by the SDK after data-clerk-publishable-key script loads)
    window.addEventListener('__clerk_loaded', () => {
      initClerkAuth();
    }, { once: true });

    // Bind Sign In button
    const btnSignIn = document.getElementById('btn-clerk-sign-in');
    if (btnSignIn) {
      btnSignIn.addEventListener('click', () => {
        openClerkSignIn();
      });
    }

    // Bind Clerk In-App Modal Close Button
    const btnCloseClerkModal = document.getElementById('btn-close-clerk-auth-modal');
    const clerkModalOverlay = document.getElementById('clerk-auth-modal-overlay');
    if (btnCloseClerkModal && clerkModalOverlay) {
      btnCloseClerkModal.addEventListener('click', () => {
        clerkModalOverlay.classList.add('hidden');
      });
    }

    // Navigation tab clicks
    nav.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const screen = tab.getAttribute('data-screen');
        switchScreen(screen);
      });
    });

    // Touch Swipe Gesture Handler for Mobile Navigation
    let touchStartX = 0;
    let touchStartY = 0;

    if (viewport) {
      viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      viewport.addEventListener('touchend', (e) => {
        const state = getState();
        if (state.expedition.active) return;

        if (e.changedTouches.length === 1) {
          const touchEndX = e.changedTouches[0].clientX;
          const touchEndY = e.changedTouches[0].clientY;

          const deltaX = touchEndX - touchStartX;
          const deltaY = touchEndY - touchStartY;

          if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
            const screens = ['quests', 'world', 'market', 'character', 'guild'];
            const currentIdx = screens.indexOf(currentScreen);
            if (currentIdx !== -1) {
              if (deltaX < 0 && currentIdx < screens.length - 1) {
                switchScreen(screens[currentIdx + 1]);
              } else if (deltaX > 0 && currentIdx > 0) {
                switchScreen(screens[currentIdx - 1]);
              }
            }
          }
        }
      }, { passive: true });
    }

    // Global Steps modal listeners
    const stepsModal = document.getElementById('global-steps-modal-overlay');
    const stepCounter = document.querySelector('.step-counter');
    const cancelBtn = document.getElementById('global-btn-steps-cancel');
    const confirmBtn = document.getElementById('global-btn-steps-confirm');
    const stepsInput = document.getElementById('global-steps-input');

    if (stepCounter && stepsModal) {
      stepCounter.addEventListener('click', () => {
        stepsModal.classList.remove('hidden');
        if (stepsInput) {
          stepsInput.value = '';
          stepsInput.focus();
        }
      });
    }

    if (cancelBtn && stepsModal) {
      cancelBtn.addEventListener('click', () => {
        stepsModal.classList.add('hidden');
        if (stepsInput) stepsInput.value = '';
      });
    }

    if (confirmBtn && stepsModal) {
      confirmBtn.addEventListener('click', () => {
        const val = parseInt(stepsInput.value, 10);
        if (val > 0) {
          import('./state.js').then(mod => {
            mod.addSteps(val);
            stepsModal.classList.add('hidden');
            stepsInput.value = '';
            
            // Show brief success toast
            const toast = document.createElement('div');
            toast.textContent = `👣 +${val.toLocaleString()} steps logged!`;
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--emerald-green);color:#fff;padding:8px 18px;border-radius:20px;font-size:0.85rem;font-weight:700;z-index:500;animation:zoom-in 0.2s ease;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2200);
            
            // Re-render active view
            renderActiveView();
          });
        }
      });
    }

    // Subscribe state reactivity
    subscribe(() => {
      syncStatusHeader();
      checkForModalsAndOverlays();
    });

    // Initial Sync and draw
    syncStatusHeader();
    renderActiveView();
    checkForModalsAndOverlays();
  } catch(e) {
    viewport.innerHTML = `<div style="padding:20px; color:red; font-size:0.75rem; word-break:break-all;"><strong>INIT ERROR:</strong><br>${e.message}<br><pre>${e.stack}</pre></div>`;
    console.error('init failed:', e);
  }
}

// Start app
window.addEventListener('DOMContentLoaded', init);

/* ==========================================================================
   Overlay Modals System (Login Bonus & Level Up Notifications)
   ========================================================================== */

function checkForModalsAndOverlays() {
  const state = getState();

  // 1. Onboarding
  if (!state.profile.setupComplete) {
    renderOnboardingModal();
    return;
  }

  // 2. Pending login reward chest
  if (state.profile.hasPendingLoginBonus) {
    renderDailyLoginModal();
    return;
  }

  // 3. Weekly summary
  if (state.profile.hasPendingWeeklySummary) {
    renderWeeklySummaryModal();
    return;
  }

  // 4. Pending level-up congrats panel
  if (state.profile.pendingLevelUp) {
    renderLevelUpModal(state.profile.pendingLevelUp);
    return;
  }

  // 5. Pending Class Advancement
  if (state.profile.pendingClassAdvancement) {
    renderClassAdvancementModal(state.profile.pendingClassAdvancement);
    return;
  }

  // 6. New Realms Discovered Discovery Modal
  if (state.profile.newDungeonsUnlocked && state.profile.newDungeonsUnlocked.length > 0) {
    const dungeonName = state.profile.newDungeonsUnlocked[0];
    renderDungeonUnlockedModal(dungeonName);
    return;
  }
}



function renderClassAdvancementModal(advancementData) {
  if (document.getElementById('class-advancement-modal-overlay')) return;

  const gameContainer = document.getElementById('game-container');
  const overlay = document.createElement('div');
  overlay.id = 'class-advancement-modal-overlay';
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="parchment-card modal-content" style="width: 340px; text-align: center;">
      <div style="font-size: 3.5rem; margin-bottom: 10px;">🌟</div>
      <h2 class="card-title font-gold" style="justify-content:center; border:none; margin-bottom: 10px; font-size: 1.4rem;">
        Evolution Complete!
      </h2>
      <p style="margin-bottom: 20px; font-size: 1.1rem;">
        You have advanced to Tier ${advancementData.tier}: <strong style="color: var(--sapphire-blue);">${advancementData.className}</strong>
      </p>
      
      <div style="background: rgba(44,37,30,0.05); border: 1px solid var(--amber-gold); border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <div style="font-weight: bold; margin-bottom: 5px;">New Combat Ability Unlocked:</div>
        <div style="color: var(--ruby-crimson); font-size: 0.95rem;">${advancementData.ability}</div>
      </div>
      
      <button class="btn-primary full-width-btn" id="btn-close-advancement">Accept Destiny</button>
    </div>
  `;

  gameContainer.appendChild(overlay);
  triggerFireParticles(overlay.querySelector('.modal-content'));

  overlay.querySelector('#btn-close-advancement').addEventListener('click', () => {
    overlay.remove();
    import('./state.js').then(mod => {
      mod.clearPendingClassAdvancement();
      checkForModalsAndOverlays();
    });
  });
}

function triggerFireParticles(containerElement) {
  const rect = containerElement.getBoundingClientRect();
  const numParticles = 25;
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
    
    // Position near bottom of container
    const startX = rect.left + Math.random() * rect.width;
    const startY = rect.bottom - (Math.random() * 20);
    p.style.left = `${startX}px`;
    p.style.top = `${startY}px`;
    
    const angle = Math.random() * Math.PI - Math.PI; 
    const speed = Math.random() * 100 + 50;
    const lifetime = Math.random() * 0.4 + 0.5;
    
    document.body.appendChild(p);
    
    const targetX = startX + Math.cos(angle) * (speed * lifetime);
    const targetY = startY + Math.sin(angle) * (speed * lifetime) - 100;
    
    p.animate([
      { transform: `translate(0px, 0px) scale(1)`, opacity: 1 },
      { transform: `translate(${targetX - startX}px, ${targetY - startY}px) scale(0)`, opacity: 0 }
    ], {
      duration: lifetime * 1000,
      easing: 'ease-out',
      fill: 'forwards'
    });
    
    setTimeout(() => { p.remove(); }, lifetime * 1000);
  }
}

function renderOnboardingModal() {
  if (document.getElementById('onboarding-modal-overlay')) return;

  const GOAL_PRESETS = {
    fitness: {
      label: '💪 Getting Fit',
      desc: 'Build strength, move more, and feel better.',
      quests: [
        { text: 'Morning Movement: 10-minute stretch or walk', skill: 'agility', type: 'daily', xp: 30, gold: 15 },
        { text: 'Iron Work: Complete a workout session', skill: 'strength', type: 'daily', xp: 35, gold: 15 },
        { text: 'Hydration Quest: Drink 8 glasses of water', skill: 'vitality', type: 'daily', xp: 20, gold: 10 },
        { text: 'Weekly Endurance: Go for a 30-minute run or bike ride', skill: 'agility', type: 'weekly', xp: 120, gold: 60 },
      ]
    },
    mindset: {
      label: '🧘 Mental Clarity',
      desc: 'Build focus, calm your mind, and grow your wisdom.',
      quests: [
        { text: 'Morning Pages: 10-minute journal entry', skill: 'insight', type: 'daily', xp: 30, gold: 12 },
        { text: 'Lore & Tomes: Read for 20 minutes', skill: 'wisdom', type: 'daily', xp: 35, gold: 15 },
        { text: 'Inner Sanctum: Meditate for 5 minutes', skill: 'insight', type: 'daily', xp: 20, gold: 10 },
        { text: 'Weekly Chronicle: Reflect on your progress this week', skill: 'wisdom', type: 'weekly', xp: 110, gold: 55 },
      ]
    },
    wealth: {
      label: '💰 Wealth & Career',
      desc: 'Level up your finances, career, and skills.',
      quests: [
        { text: 'Ledger Check: Review your budget for 5 minutes', skill: 'intelligence', type: 'daily', xp: 30, gold: 15 },
        { text: 'Skill Grind: Work on a career or coding skill', skill: 'intelligence', type: 'daily', xp: 40, gold: 20 },
        { text: 'Networking Potion: Reach out to one professional contact', skill: 'charisma', type: 'daily', xp: 25, gold: 12 },
        { text: 'Weekly Audit: Review finances and set a savings goal', skill: 'intelligence', type: 'weekly', xp: 130, gold: 65 },
      ]
    },
    order: {
      label: '🏡 Order & Cleanliness',
      desc: 'Build a sanctuary: clean, organized, and peaceful.',
      quests: [
        { text: 'Morning Ritual: Make your bed', skill: 'cleaning', type: 'daily', xp: 20, gold: 10 },
        { text: 'Tidying Sweep: Clean one surface or room', skill: 'cleaning', type: 'daily', xp: 30, gold: 15 },
        { text: 'Rest Preparation: Wind-down routine before sleep', skill: 'vitality', type: 'daily', xp: 25, gold: 10 },
        { text: 'Weekly Purge: Deep clean one area of your home', skill: 'cleaning', type: 'weekly', xp: 120, gold: 60 },
      ]
    }
  };

  const gameContainer = document.getElementById('game-container');
  const overlay = document.createElement('div');
  overlay.id = 'onboarding-modal-overlay';
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="parchment-card modal-content" style="width: 350px; padding: 22px; max-height: 90vh; overflow-y: auto;">

      <!-- Slide 1: Welcome & Core Philosophy -->
      <div id="ob-step-1">
        <div style="font-size:3rem; text-align:center; margin-bottom:6px; animation: pulse-flame 1.5s infinite alternate;">📜</div>
        <h2 class="card-title font-gold" style="justify-content:center; border:none; margin-bottom:8px; text-align:center; font-size:1.2rem;">Welcome to The Great Ledger</h2>
        
        <p style="font-size: 0.82rem; text-align: center; color: var(--ink-charcoal); line-height: 1.5; margin-bottom: 14px;">
          Transform your real-life productivity into an epic fantasy RPG!
        </p>

        <div style="background: rgba(0,0,0,0.03); border: 1px dashed var(--amber-gold); border-radius: 8px; padding: 10px; margin-bottom: 18px; font-size: 0.76rem; line-height: 1.5; text-align: left; display: flex; flex-direction: column; gap: 8px;">
          <div><strong>⚔️ Daily Quests & Habits:</strong> Complete real-life tasks to gain XP, Gold, and unlock new abilities.</div>
          <div><strong>🗺️ Exploration & Steps:</strong> Track your real-world movement to journey into deeper dungeons.</div>
          <div><strong>🛡️ OSRS-Style Scaling:</strong> Experience satisfying long-term progression and tier class evolutions!</div>
        </div>

        <button class="btn-primary full-width-btn" id="ob-next-1">Next: The Focus System →</button>
      </div>

      <!-- Slide 2: The Focus Expeditions Explanation -->
      <div id="ob-step-2" class="hidden">
        <div style="font-size:3rem; text-align:center; margin-bottom:6px;">⏳⚔️</div>
        <h2 class="card-title font-gold" style="justify-content:center; border:none; margin-bottom:6px; text-align:center; font-size:1.2rem;">The Focus Expeditions</h2>
        
        <p style="font-size: 0.8rem; text-align: center; color: var(--ink-muted); margin-bottom: 12px; line-height: 1.4;">
          The <strong>Focus Tab</strong> links your real-life work sessions directly to Dungeon Conquests.
        </p>

        <div style="background: rgba(59, 96, 67, 0.05); border: 1px solid var(--emerald-green); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 0.76rem; line-height: 1.5; text-align: left; display: flex; flex-direction: column; gap: 8px;">
          <div>🎯 <strong>Set a Pomodoro Goal:</strong> Pick a focus duration (10m, 25m, or custom).</div>
          <div>🐉 <strong>Real-Time Dungeon Delve:</strong> While you stay off your phone and focus, your hero explores the dungeon and slays monsters automatically.</div>
          <div>🗡️ <strong>Mastery & Loot:</strong> Gain Weapon XP, Essence, and Monster Codex entries for every finished session!</div>
          <div style="color: var(--ruby-crimson); font-weight: bold; margin-top: 2px;">⚠️ Mindful Warning: Abandoning a session early triggers a dungeon retreat penalty!</div>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" id="ob-back-2" style="flex:1;">← Back</button>
          <button class="btn-primary" id="ob-next-2" style="flex:1;">Create Hero →</button>
        </div>
      </div>

      <!-- Slide 3: Hero Origin & Primary Quest Goal -->
      <div id="ob-step-3" class="hidden">
        <div style="font-size:2.5rem; text-align:center; margin-bottom:6px;">🛡️</div>
        <h2 class="card-title font-gold" style="justify-content:center; border:none; margin-bottom:6px; text-align:center; font-size:1.2rem;">Create Your Hero</h2>
        
        <div style="margin-bottom: 12px;">
          <label style="font-size: 0.72rem; font-weight: bold; color: var(--ink-dark); display:block; text-align:left; margin-bottom:4px;">Hero's Name:</label>
          <input type="text" id="ob-name-input" class="parchment-input" style="width: 100%; text-align: center; font-size: 1rem; padding: 6px;" placeholder="Hero Knight" value="Hero Knight">
        </div>

        <div style="margin-bottom: 12px;">
          <label style="font-size: 0.72rem; font-weight: bold; color: var(--ink-dark); display:block; text-align:left; margin-bottom:4px;">Primary Focus Realm:</label>
          <div style="display: flex; flex-direction: column; gap: 6px;" id="ob-goal-choices">
            ${Object.entries(GOAL_PRESETS).map(([key, g], idx) => `
              <label class="ob-goal-card" style="display:flex; align-items:center; gap:8px; padding:8px 10px; border:${idx === 0 ? '2px solid var(--gold-primary)' : '1px solid rgba(44,37,30,0.15)'}; border-radius:6px; cursor:pointer;">
                <input type="radio" name="ob-goal" value="${key}" ${idx === 0 ? 'checked' : ''} style="display:none;">
                <div style="text-align:left;">
                  <div style="font-weight:700; font-size:0.82rem;">${g.label}</div>
                  <div style="font-size:0.65rem; color: var(--ink-muted);">${g.desc}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="font-size: 0.72rem; font-weight: bold; color: var(--ink-dark); display:block; text-align:left; margin-bottom:4px;">Starting Origin Class:</label>
          <div style="display: flex; gap: 6px;">
            <label style="flex:1; padding:6px; border:1px solid rgba(44,37,30,0.15); border-radius:6px; cursor:pointer; font-size:0.7rem; text-align:center;">
              <input type="radio" name="ob-class" value="Commoner" checked style="margin-right:2px;"> <strong>Commoner</strong>
            </label>
            <label style="flex:1; padding:6px; border:1px solid rgba(44,37,30,0.15); border-radius:6px; cursor:pointer; font-size:0.7rem; text-align:center;">
              <input type="radio" name="ob-class" value="Wanderer" style="margin-right:2px;"> <strong>Wanderer</strong>
            </label>
            <label style="flex:1; padding:6px; border:1px solid rgba(44,37,30,0.15); border-radius:6px; cursor:pointer; font-size:0.7rem; text-align:center;">
              <input type="radio" name="ob-class" value="Street Rat" style="margin-right:2px;"> <strong>Street Rat</strong>
            </label>
          </div>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" id="ob-back-3" style="flex:1;">← Back</button>
          <button class="btn-primary" id="ob-finish" style="flex:1.5;">✍️ Begin Adventure</button>
        </div>
      </div>
    </div>
  `;

  gameContainer.appendChild(overlay);

  // --- Step navigation logic ---
  const steps = [1, 2, 3].map(i => overlay.querySelector(`#ob-step-${i}`));

  function goTo(n) {
    steps.forEach((s, i) => {
      if (s) s.classList.toggle('hidden', i !== n - 1);
    });
  }

  // Highlight selected goal card
  overlay.querySelectorAll('.ob-goal-card').forEach(card => {
    card.addEventListener('click', () => {
      card.querySelector('input[type=radio]').checked = true;
      overlay.querySelectorAll('.ob-goal-card').forEach(c => c.style.borderColor = 'rgba(44,37,30,0.15)');
      card.style.borderColor = 'var(--gold-primary)';
    });
  });

  overlay.querySelector('#ob-next-1').addEventListener('click', () => goTo(2));
  overlay.querySelector('#ob-back-2').addEventListener('click', () => goTo(1));
  overlay.querySelector('#ob-next-2').addEventListener('click', () => goTo(3));
  overlay.querySelector('#ob-back-3').addEventListener('click', () => goTo(2));

  overlay.querySelector('#ob-finish').addEventListener('click', () => {
    const name = overlay.querySelector('#ob-name-input').value.trim() || 'Hero Knight';
    const selGoal = overlay.querySelector('input[name="ob-goal"]:checked');
    const chosenGoal = selGoal ? selGoal.value : 'fitness';
    const goalData = GOAL_PRESETS[chosenGoal];
    const selClass = overlay.querySelector('input[name="ob-class"]:checked');
    const cls = selClass ? selClass.value : 'Commoner';

    import('./state.js').then(mod => {
      mod.updateHeroName(name);
      mod.changeClass(cls, true);

      const state = mod.getState();
      // Replace default starter quests with goal-specific ones
      state.quests = goalData.quests.map((q, i) => ({
        id: `quest-start-${i}`,
        text: q.text,
        type: q.type,
        mappedSkill: q.skill,
        completedCount: 0,
        currentStreak: 0,
        lastCompletedDate: null,
        baseXP: q.xp,
        baseGold: q.gold,
        isOneTime: false
      }));

      state.profile.setupComplete = true;
      mod.saveState();
      overlay.remove();
      checkForModalsAndOverlays();
    });
  });
}

function renderWeeklySummaryModal() {
  if (document.getElementById('weekly-summary-modal-overlay')) return;
  const gameContainer = document.getElementById('game-container');
  
  import('./state.js').then(mod => {
    const summary = mod.claimWeeklySummary();
    if (!summary) return;

    const overlay = document.createElement('div');
    overlay.id = 'weekly-summary-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="parchment-card modal-content" style="width: 320px; padding: 24px; text-align: center;">
        <h2 class="card-title font-gold" style="justify-content:center; border:none; margin-bottom:10px; font-family: var(--font-header);">📜 Weekly Chronicle</h2>
        <p style="font-size: 0.8rem; margin-bottom: 20px;">The Guild has reviewed your ledger from the past week. Here are your accomplishments:</p>
        
        <div style="display: flex; flex-direction: column; gap: 10px; text-align: left; margin-bottom: 20px;">
          <div style="padding: 10px; background: rgba(0,0,0,0.03); border: 1px dashed rgba(44,37,30,0.15); border-radius: 6px;">
            <div style="font-size: 0.75rem; font-weight: bold; color: var(--emerald-green);">✅ Quests Completed</div>
            <div style="font-size: 1.1rem;">${summary.questsCompleted}</div>
          </div>
          <div style="padding: 10px; background: rgba(0,0,0,0.03); border: 1px dashed rgba(44,37,30,0.15); border-radius: 6px;">
            <div style="font-size: 0.75rem; font-weight: bold; color: var(--gold-primary);">🔥 Streaks Maintained</div>
            <div style="font-size: 1.1rem;">${summary.streaksMaintained} days</div>
          </div>
          <div style="padding: 10px; background: rgba(0,0,0,0.03); border: 1px dashed rgba(44,37,30,0.15); border-radius: 6px;">
            <div style="font-size: 0.75rem; font-weight: bold; color: var(--ruby-crimson);">🌟 Skills Leveled</div>
            <div style="font-size: 0.9rem;">${summary.skillsLeveled.length > 0 ? summary.skillsLeveled.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : 'None'}</div>
          </div>
        </div>

        <button class="btn-primary full-width-btn" id="btn-close-weekly-summary">Onward to Next Week</button>
      </div>
    `;

    gameContainer.appendChild(overlay);

    overlay.querySelector('#btn-close-weekly-summary').addEventListener('click', () => {
      overlay.remove();
      checkForModalsAndOverlays();
    });
  });
}

function renderDailyLoginModal() {
  if (document.getElementById('daily-login-bonus-modal')) return;

  const gameContainer = document.getElementById('game-container');
  const overlay = document.createElement('div');
  overlay.id = 'daily-login-bonus-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="parchment-card modal-content login-bonus-card">
      <h2 class="card-title font-gold" style="justify-content:center; border:none; margin-bottom:4px;">🎁 Guild Daily Tribute</h2>
      <p class="login-bonus-desc" style="font-size: 0.76rem; text-align: center;">
        For your dedication and consistency, the local trackers have recovered a tribute chest for your guild pouch!
      </p>

      <div class="chest-visual-container">
        <svg id="svg-chest" viewBox="0 0 100 100" class="chest-svg">
          <path d="M25 45 H75 V80 H25 Z" fill="var(--parchment-dark)" stroke="var(--ink-charcoal)" stroke-width="4px" />
          <path d="M20 45 Q50 15 80 45 Z" fill="var(--gold-primary)" stroke="var(--ink-charcoal)" stroke-width="4px" />
          <rect x="45" y="40" width="10" height="15" fill="var(--ink-charcoal)" rx="2" />
          <circle cx="50" cy="48" r="3" fill="var(--parchment-light)" />
        </svg>
      </div>

      <button class="btn-primary full-width-btn" id="btn-claim-daily-tribute">⚒️ Open Tribute Box</button>
    </div>
  `;

  gameContainer.appendChild(overlay);

  const btnClaim = overlay.querySelector('#btn-claim-daily-tribute');
  btnClaim.addEventListener('click', () => {
    const rewards = claimPendingLoginBonus();
    if (rewards) {
      // Render recap spoilers card inside
      overlay.querySelector('.login-bonus-card').innerHTML = `
        <h2 class="card-title" style="color:var(--emerald-green); justify-content:center; border:none; margin-bottom:4px;">✨ Spoils Claimed!</h2>
        <p class="login-bonus-desc" style="text-align:center; font-size: 0.76rem;">
          The tribute box was opened! The guild has awarded you with consistency materials:
        </p>

        <div class="spoils-recap-box">
          <div class="spoil-badge">🪙 +${rewards.gold} Gold Coins</div>
          <div class="spoil-badge">✨ +${rewards.essence} Upgrade Essence</div>
          <div class="spoil-badge">🧩 +${rewards.relicShards} Relic Shards</div>
        </div>

        <button class="btn-primary full-width-btn" id="btn-login-bonus-close">⚔️ Claim & Enter Town</button>
      `;

      overlay.querySelector('#btn-login-bonus-close').addEventListener('click', () => {
        overlay.remove();
        checkForModalsAndOverlays(); // Show level-up if one queued
      });
    }
  });
}

function renderLevelUpModal(details) {
  if (document.getElementById('level-up-overlay-modal')) return;

  const gameContainer = document.getElementById('game-container');
  const overlay = document.createElement('div');
  overlay.id = 'level-up-overlay-modal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="parchment-card modal-content level-up-card-banner">
      <div class="level-up-header">
        <span class="level-up-crest">${details.icon}</span>
        <h1 class="font-gold" style="font-family: var(--font-header); font-size: 1.25rem; margin-top:4px;">Level Up!</h1>
      </div>

      <div class="level-up-title-text">${details.title}</div>

      <div class="report-section" style="border-top: 1px dashed rgba(44,37,30,0.15); padding-top: 10px; margin-top: 10px;">
        <h4 style="font-family: var(--font-header); font-size:0.7rem; color: var(--ink-muted); text-transform:uppercase; margin-bottom: 6px; text-align:left;">Character Improvements</h4>
        <div class="level-up-stats-list">
          ${details.statsList.map(stat => `<div class="level-up-stat-line">${stat}</div>`).join('')}
        </div>
      </div>

      <button class="btn-primary full-width-btn" id="btn-close-levelup-banner" style="margin-top: 16px;">⚔️ Close & Continue</button>
    </div>
  `;

  gameContainer.appendChild(overlay);

  const btnClose = overlay.querySelector('#btn-close-levelup-banner');
  btnClose.addEventListener('click', () => {
    overlay.remove();
    import('./state.js').then(mod => {
      mod.clearPendingLevelUp();
      checkForModalsAndOverlays();
    });
  });
}

function renderDungeonUnlockedModal(dungeonName) {
  if (document.getElementById('dungeon-unlocked-modal-overlay')) return;

  const gameContainer = document.getElementById('game-container');
  const overlay = document.createElement('div');
  overlay.id = 'dungeon-unlocked-modal-overlay';
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="parchment-card modal-content" style="width: 320px; text-align: center; border: 2px solid var(--amber-gold);">
      <div style="font-size: 3rem; margin-bottom: 8px;">🗺️</div>
      <h2 class="card-title font-gold" style="justify-content:center; border:none; margin-bottom: 8px; font-size: 1.3rem;">
        Realm Discovered!
      </h2>
      <p style="margin-bottom: 16px; font-size: 0.95rem; line-height: 1.4;">
        Your consistent strides have opened a path to:<br>
        <strong style="color: var(--emerald-green); font-size: 1.1rem;">${dungeonName}</strong>
      </p>
      <button class="btn-primary full-width-btn" id="btn-close-dungeon-unlock">Chart Course</button>
    </div>
  `;

  gameContainer.appendChild(overlay);

  overlay.querySelector('#btn-close-dungeon-unlock').addEventListener('click', () => {
    overlay.remove();
    import('./state.js').then(mod => {
      const state = mod.getState();
      if (state.profile.newDungeonsUnlocked) {
        state.profile.newDungeonsUnlocked.shift();
      }
      mod.saveState();
      checkForModalsAndOverlays();
    });
  });
}

/* Helper simulation tool for automated playthroughs */
window.simulatePlaythrough = function(count = 25) {
  import('./state.js').then(stateMod => {
    console.log(`🚀 Starting simulated playthrough of ${count} quest cycles...`);
    const startTime = performance.now();
    const skills = ['strength', 'vitality', 'agility', 'wisdom', 'intelligence', 'insight', 'charisma', 'cleaning'];
    const tiers = ['C', 'B', 'A', 'S'];

    let completed = 0;
    let levelUpsCount = 0;
    let initialLevel = stateMod.getState().profile.totalLevel;

    for (let i = 0; i < count; i++) {
      const randomSkill = skills[i % skills.length];
      const randomTier = tiers[i % tiers.length];
      
      stateMod.createCustomQuest(`Simulated Bounty #${i + 1}`, 'daily', randomSkill, randomTier);
      
      const st = stateMod.getState();
      const lastQuest = st.quests[st.quests.length - 1];
      if (lastQuest) {
        stateMod.completeQuest(lastQuest.id);
        completed++;
      }
    }

    // Add steps simulation
    stateMod.addSteps(15000);

    const endTime = performance.now();
    const finalState = stateMod.getState();
    const durationMs = (endTime - startTime).toFixed(2);

    console.log(`✅ Simulation Completed!`);
    console.log(`- Quests Processed: ${completed}`);
    console.log(`- Starting Level: ${initialLevel} ➔ Final Level: ${finalState.profile.totalLevel}`);
    console.log(`- Final Gold: ${finalState.profile.gold.toLocaleString()}`);
    console.log(`- Final Steps: ${finalState.profile.steps.toLocaleString()}`);
    console.log(`- Total Execution Time: ${durationMs} ms (${(durationMs / count).toFixed(2)} ms/quest)`);
  });
};
