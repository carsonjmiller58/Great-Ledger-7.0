import { getState, RAID_BOSS_POOL, rotateGuildRaidBossIfNeeded, huzzahEvent, leaveGuild, createGuild, joinGuild, renameGuild, openClerkSignIn, openClerkOrganizationProfile, createClerkGuildOrg, addFriend, removeFriend } from '../state.js';
import { switchScreen } from '../app.js';

export function renderGuild(container) {
  const state = getState();

  const isSignedIn = state.auth?.isSignedIn;
  const clerkUser = state.auth?.user;

  if (!state.guild) {
    container.innerHTML = `
      <div class="guild-screen parchment-card" style="text-align: center; padding: 20px;">
        <h2 style="font-family: var(--font-header); font-size: 1.5rem; color: var(--sapphire-blue); margin-bottom: 8px;">
          🏛️ Guilds & Adventurer Network
        </h2>
        <p style="font-size: 0.85rem; color: var(--ink-muted); margin-bottom: 16px;">
          ${isSignedIn ? `Welcome, <strong>${clerkUser?.name || state.profile.name}</strong>! Form an official Guild Organization or connect with fellow adventurers.` : 'Sign in with your Clerk account to link with friends, sync multiplayer organizations, and battle Raid Bosses!'}
        </p>

        ${!isSignedIn ? `
          <div style="background: rgba(217, 119, 6, 0.08); border: 1px dashed var(--amber-gold); padding: 14px; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="font-family: var(--font-header); font-size: 0.95rem; color: var(--gold-primary); margin-bottom: 6px;">🔒 Clerk Authentication Required</h3>
            <p style="font-size: 0.75rem; color: var(--ink-muted); margin-bottom: 10px;">Sign in with your Clerk account to unlock live Guild Roster sync and multiplayer Organizations.</p>
            <button class="btn-primary" id="btn-guild-clerk-signin" style="font-size: 0.8rem; padding: 8px 16px;">🔑 Sign In with Clerk</button>
          </div>
        ` : ''}

        <div style="display: flex; flex-direction: column; gap: 14px; max-width: 400px; margin: 0 auto; text-align: left;">
          <!-- 1. Connect / Find Friends -->
          <div style="background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.1); padding: 14px; border-radius: 8px;">
            <h3 style="font-family: var(--font-header); font-size: 0.95rem; color: var(--amber-gold); margin-bottom: 6px;">
              🤝 Connect with Friends
            </h3>
            <p style="font-size: 0.75rem; color: var(--ink-muted); margin-bottom: 10px;">
              Enter a friend's adventurer name or Clerk user handle to connect your journeys.
            </p>
            <div style="display: flex; gap: 6px; margin-bottom: 10px;">
              <input type="text" id="input-friend-search" placeholder="Friend's Name or Handle..." style="flex:1; padding: 7px 10px; border: 1px solid var(--amber-gold); border-radius: 4px; font-size: 0.8rem; background: rgba(255,255,255,0.7);">
              <button class="btn-primary" id="btn-add-friend-main" style="font-size: 0.78rem; padding: 7px 12px; white-space: nowrap;">➕ Connect</button>
            </div>
            
            <div id="friends-list-unauth" style="display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto;">
              ${(state.friends && state.friends.length > 0) ? state.friends.map(f => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: rgba(217, 119, 6, 0.05); border: 1px solid var(--amber-gold); border-radius: 4px; font-size: 0.78rem;">
                  <div>
                    <strong>🛡️ ${f.name}</strong>
                    <span style="font-size: 0.65rem; color: var(--ink-muted); margin-left: 4px;">• Lvl ${f.level || 1}</span>
                  </div>
                  <button class="btn-remove-friend" data-id="${f.id}" style="background:none; border:none; color:var(--ruby-crimson); cursor:pointer; font-size:0.75rem;" title="Remove Friend">✕</button>
                </div>
              `).join('') : `
                <div style="text-align: center; font-size: 0.72rem; color: var(--ink-muted); padding: 8px; font-style: italic;">
                  No connected friends yet. Add a friend above!
                </div>
              `}
            </div>
          </div>

          <!-- 2. Forge Guild Organization -->
          <div style="background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.1); padding: 14px; border-radius: 8px;">
            <h3 style="font-family: var(--font-header); font-size: 0.95rem; color: var(--sapphire-blue); margin-bottom: 6px;">
              🏛️ Forge a Guild Organization
            </h3>
            <p style="font-size: 0.75rem; color: var(--ink-muted); margin-bottom: 10px;">
              Establish your own Guild. As Guildmaster, invite your friends to conquer weekly Raid Bosses.
            </p>
            <input type="text" id="new-guild-name" placeholder="New Guild Name (e.g. Iron Vanguard)" style="width: 100%; padding: 8px 10px; margin-bottom: 10px; border: 1px solid var(--sapphire-blue); border-radius: 4px; font-size: 0.8rem; background: rgba(255,255,255,0.7);">
            <button class="btn-primary" id="btn-create-guild" style="font-size: 0.8rem; padding: 8px; width: 100%;">⚔️ Found Guild</button>
          </div>
        </div>
      </div>
    `;

    const signInBtn = container.querySelector('#btn-guild-clerk-signin');
    if (signInBtn) signInBtn.addEventListener('click', () => openClerkSignIn());

    const btnAddFriend = container.querySelector('#btn-add-friend-main');
    const inputFriend = container.querySelector('#input-friend-search');
    if (btnAddFriend && inputFriend) {
      btnAddFriend.addEventListener('click', () => {
        const val = inputFriend.value;
        if (val) {
          const res = addFriend(val);
          if (res.success) {
            renderGuild(container);
          } else {
            alert(res.message);
          }
        }
      });
      inputFriend.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnAddFriend.click();
      });
    }

    container.querySelectorAll('.btn-remove-friend').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fId = e.currentTarget.getAttribute('data-id');
        if (fId) {
          removeFriend(fId);
          renderGuild(container);
        }
      });
    });

    const createBtn = container.querySelector('#btn-create-guild');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const input = container.querySelector('#new-guild-name');
        const name = input ? input.value.trim() : "";
        if (!name) {
          alert("Please enter a name for your guild.");
          return;
        }
        createClerkGuildOrg(name);
        renderGuild(container);
      });
    }

    return;
  }

  rotateGuildRaidBossIfNeeded();
  const guild = state.guild || {};
  const bossMeta = RAID_BOSS_POOL[guild.activeBossIndex || 0] || RAID_BOSS_POOL[0];

  const currentHP = guild.bossCurrentHP !== undefined ? guild.bossCurrentHP : bossMeta.hp;
  const maxHP = guild.bossMaxHP || bossMeta.hp;
  const hpPct = Math.min(100, Math.max(0, (currentHP / maxHP) * 100));

  const userDmg = guild.userDamage || 0;
  const totalDmg = guild.totalGuildDamage || 1;
  const userRatio = Math.min(100, Math.round((userDmg / totalDmg) * 100));

  // Time remaining on boss rotation
  const now = Date.now();
  const msLeft = Math.max(0, (guild.bossEndsAt || (now + 86400000)) - now);
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hrsLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

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

  container.innerHTML = `
    <div class="guild-screen">
      <!-- Guild Banner Header -->
      <div class="parchment-card header-banner guild-banner" style="background: linear-gradient(135deg, rgba(30, 58, 138, 0.12) 0%, rgba(88, 28, 135, 0.08) 100%), var(--parchment-light); border-color: var(--sapphire-blue);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="display:flex; align-items:center; gap: 8px;">
              <h1 class="card-title" id="guild-title-display" style="color: var(--sapphire-blue); margin-bottom:0; font-size:1.25rem;">
                🏛️ ${guild.name || "The Great Ledger Vanguard"}
              </h1>
              <button id="btn-rename-guild" style="background:none; border:none; cursor:pointer; font-size:0.95rem; padding: 2px 4px; color: var(--amber-gold);" title="Customize Guild Name">✏️</button>
            </div>
            <p class="description-text" style="margin-top: 4px;">
              Unite with fellow adventurers. Complete real-world bounties to slay massive world bosses together!
            </p>
          </div>
          <div style="text-align:right;">
            <div style="font-family: var(--font-header); font-size: 0.95rem; font-weight:700; color: var(--amber-gold);">
              🏅 ${guild.badges || 0} Badges
            </div>
            <div style="font-size:0.6rem; color: var(--ink-muted); text-transform:uppercase;">Guild Level 3</div>
          </div>
        </div>
      </div>

      <!-- Guild Subtabs -->
      <div class="guild-nav-tabs" style="display: flex; gap: 4px; overflow-x: auto; margin-bottom: 12px;">
        <button class="btn-secondary guild-subtab active" data-target="guild-sec-boss" style="flex:1; font-size:0.7rem; padding:6px;">🌋 Raid Boss</button>
        <button class="btn-secondary guild-subtab" data-target="guild-sec-bulletin" style="flex:1; font-size:0.7rem; padding:6px;">📜 Bulletin</button>
        <button class="btn-secondary guild-subtab" data-target="guild-sec-roster" style="flex:1; font-size:0.7rem; padding:6px;">👥 Roster</button>
        <button class="btn-secondary guild-subtab" data-target="guild-sec-friends" style="flex:1; font-size:0.7rem; padding:6px;">🤝 Friends</button>
      </div>

      <!-- 1. GROUP RAID BOSS SECTION -->
      <div id="guild-sec-boss" class="guild-section parchment-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
          <div>
            <span style="font-size: 1.8rem; margin-right: 6px;">${bossMeta.icon}</span>
            <span style="font-family: var(--font-header); font-size: 1.1rem; font-weight: 700; color: var(--ruby-crimson);">${bossMeta.name}</span>
            <div style="font-size: 0.68rem; color: var(--ink-muted); font-style: italic;">"${bossMeta.title}"</div>
          </div>
          <span style="font-size:0.65rem; background: rgba(0,0,0,0.06); padding:4px 8px; border-radius:4px; font-weight:bold; color:var(--ink-dark);">
            ⏱️ Resets: ${daysLeft}d ${hrsLeft}h
          </span>
        </div>

        <!-- Boss HP Bar -->
        <div class="boss-hp-container" style="background: rgba(0,0,0,0.04); border: 1px solid var(--ink-charcoal); padding: 10px; border-radius: 8px; margin-bottom: 12px;">
          <div style="display:flex; justify-content:space-between; font-size: 0.72rem; font-weight: bold; margin-bottom: 4px;">
            <span>Boss Shared Health</span>
            <span style="color: var(--ruby-crimson);">${currentHP.toLocaleString()} / ${maxHP.toLocaleString()} HP</span>
          </div>
          <div style="height: 12px; background: rgba(0,0,0,0.15); border-radius: 6px; overflow: hidden;">
            <div style="width: ${hpPct}%; height: 100%; background: linear-gradient(90deg, var(--ruby-crimson), var(--amber-gold)); transition: width 0.4s ease;"></div>
          </div>
        </div>

        <!-- Vulnerability Traits Box -->
        <div class="boss-traits-box" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px;">
          <div style="background: rgba(34, 197, 94, 0.08); border: 1px solid var(--emerald-green); padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-family: var(--font-header); font-size: 0.6rem; font-weight: 700; color: var(--emerald-green); text-transform: uppercase;">⚡ WEAKNESS (+50% DMG)</div>
            <div style="font-size: 0.85rem; font-weight: bold; margin-top: 2px; color: var(--ink-dark);">
              ${skillEmojis[bossMeta.weak] || bossMeta.weak}
            </div>
          </div>

          <div style="background: rgba(220, 38, 38, 0.08); border: 1px solid var(--ruby-crimson); padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-family: var(--font-header); font-size: 0.6rem; font-weight: 700; color: var(--ruby-crimson); text-transform: uppercase;">🛡️ RESISTANCE (-10% DMG)</div>
            <div style="font-size: 0.85rem; font-weight: bold; margin-top: 2px; color: var(--ink-dark);">
              ${skillEmojis[bossMeta.resistant] || bossMeta.resistant}
            </div>
          </div>
        </div>

        <!-- Damage Contribution Stats -->
        <div style="background: rgba(0,0,0,0.02); border: 1px dashed var(--amber-gold); padding: 10px; border-radius: 6px; margin-bottom: 14px;">
          <div style="font-family: var(--font-header); font-size: 0.68rem; font-weight: 700; color: var(--amber-gold); text-transform: uppercase; margin-bottom: 4px;">
            📊 Your Contribution
          </div>
          <div style="display:flex; justify-content:space-between; font-size: 0.78rem; font-weight: bold;">
            <span>Dealt: <span style="color:var(--ruby-crimson);">${userDmg.toLocaleString()} DMG</span></span>
            <span>Share: <span style="color:var(--sapphire-blue);">${userRatio}% of Guild</span></span>
          </div>
        </div>

        <button class="btn-primary full-width-btn" id="btn-guild-attack-boss" style="font-size:0.85rem; padding: 10px;">
          📜 Complete Bounties to Attack Boss
        </button>
      </div>

      <!-- 2. GUILD BULLETIN BOARD -->
      <div id="guild-sec-bulletin" class="guild-section parchment-card hidden">
        <h3 class="card-title font-gold" style="font-size:1rem; margin-bottom:8px;">
          📜 Guild Bulletin Board
        </h3>
        <p style="font-size: 0.78rem; color: var(--ink-muted); margin-bottom: 12px;">
          Real-time stream of milestones, dungeon clears, and raid hits across your guild.
        </p>

        <div class="guild-bulletin-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto;">
          ${(guild.bulletin || []).map((b, idx) => {
            if (b.type === 'major') {
              return `
                <div style="padding: 10px; background: linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%); border: 1px solid var(--amber-gold); border-radius: 6px; margin-bottom: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <span style="font-weight: bold; color: var(--ink-dark); font-size: 0.85rem;">${b.text}</span>
                    <span style="font-size: 0.6rem; color: var(--ink-muted); white-space: nowrap; margin-left: 8px;">${formatTimeAgo(b.time)}</span>
                  </div>
                  <div style="display: flex; justify-content: flex-end;">
                    <button class="btn-secondary btn-huzzah" data-idx="${idx}" style="font-size: 0.65rem; padding: 4px 8px; border-color: var(--gold-primary); color: var(--ink-charcoal);">
                      🎉 Huzzah! ${b.huzzahs > 0 ? `<span style="background: var(--gold-primary); color: #fff; padding: 0 4px; border-radius: 4px; margin-left: 4px;">${b.huzzahs}</span>` : ''}
                    </button>
                  </div>
                </div>
              `;
            } else {
              return `
                <div style="padding: 8px 10px; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.06); border-radius: 6px; font-size: 0.78rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <span style="color: var(--ink-charcoal);">${b.text}</span>
                  <span style="font-size: 0.6rem; color: var(--ink-muted); white-space: nowrap; margin-left: 8px;">${formatTimeAgo(b.time)}</span>
                </div>
              `;
            }
          }).join('')}
        </div>
      </div>

      <!-- 3. GUILD ROSTER -->
      <div id="guild-sec-roster" class="guild-section parchment-card hidden">
        <h3 class="card-title font-gold" style="font-size:1rem; margin-bottom:8px;">
          👥 Active Guild Members (${(guild.members || []).length})
        </h3>
        <div class="roster-grid" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
          ${(guild.members || []).map(m => {
            const isUser = m.name === state.profile.name;
            const role = m.role || (isUser && guild.isLeader ? "Guildmaster" : "Member");
            const isLeaderRole = role === "Guildmaster" || role === "Guild Leader";
            const roleBg = isLeaderRole ? 'var(--emerald-green)' : role === 'Officer' ? 'var(--amber-gold)' : 'var(--sapphire-blue)';

            return `
              <div style="padding: 10px; border: 1px solid ${isUser ? 'var(--amber-gold)' : 'rgba(0,0,0,0.08)'}; border-radius: 6px; background: ${isUser ? 'rgba(217, 119, 6, 0.05)' : 'rgba(0,0,0,0.01)'}; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>${m.name}${isUser ? ' (You)' : ''}</strong>
                  <div style="font-size: 0.68rem; color: var(--ink-muted);">${m.archetype || 'Adventurer'} • Lvl ${m.level || 1}</div>
                </div>
                <span style="font-size: 0.65rem; background: ${roleBg}; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${role}</span>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="text-align: center; margin-top: 14px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button class="btn-secondary" id="btn-clerk-org-manage" style="font-size: 0.78rem; padding: 6px 12px; border-color: var(--amber-gold);">
            ⚙️ Manage Guild
          </button>
          <button class="btn-secondary" id="btn-roster-rename-guild" style="font-size: 0.78rem; padding: 6px 12px; border-color: var(--sapphire-blue);">
            ✏️ Rename Guild
          </button>
          <button class="btn-secondary" id="btn-leave-guild" style="color: var(--ruby-crimson); border-color: rgba(220, 38, 38, 0.3); font-size: 0.78rem; padding: 6px 12px;">
            🚪 Leave Guild
          </button>
        </div>
      </div>

      <!-- 4. FRIENDS & SOCIAL NETWORK -->
      <div id="guild-sec-friends" class="guild-section parchment-card hidden">
        <h3 class="card-title font-gold" style="font-size:1rem; margin-bottom:6px;">
          🤝 Connected Adventurers
        </h3>
        <p style="font-size: 0.78rem; color: var(--ink-muted); margin-bottom: 12px;">
          Search by name to find fellow adventurers, connect, and recruit them into your Guild.
        </p>

        <div style="display: flex; gap: 6px; margin-bottom: 14px;">
          <input type="text" id="input-guild-friend-search" placeholder="Friend's Name or Clerk handle..." style="flex:1; padding: 8px 10px; border: 1px solid var(--amber-gold); border-radius: 4px; font-size: 0.8rem; background: rgba(255,255,255,0.7);">
          <button class="btn-primary" id="btn-guild-add-friend" style="font-size: 0.78rem; padding: 8px 14px; white-space: nowrap;">➕ Add Friend</button>
        </div>

        <div class="friends-list-container" style="display: flex; flex-direction: column; gap: 8px;">
          ${(state.friends && state.friends.length > 0) ? state.friends.map(f => {
            const inGuild = (guild.members || []).some(m => m.name.toLowerCase() === f.name.toLowerCase());
            return `
              <div style="padding: 10px; border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; background: rgba(0,0,0,0.01); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong>🛡️ ${f.name}</strong>
                  <div style="font-size: 0.68rem; color: var(--ink-muted);">${f.archetype || 'Adventurer'} • Lvl ${f.level || 1} • <span style="color:var(--emerald-green);">● Online</span></div>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                  ${inGuild ? `
                    <span style="font-size: 0.65rem; background: rgba(16, 185, 129, 0.15); color: var(--emerald-green); padding: 3px 8px; border-radius: 4px; font-weight: bold;">In Guild</span>
                  ` : `
                    <button class="btn-secondary btn-recruit-friend" data-name="${f.name}" style="font-size: 0.65rem; padding: 4px 8px; border-color: var(--amber-gold);">
                      ⚔️ Recruit to Guild
                    </button>
                  `}
                  <button class="btn-remove-friend" data-id="${f.id}" style="background:none; border:none; color:var(--ruby-crimson); cursor:pointer; font-size:0.85rem; padding: 4px;" title="Remove Friend">✕</button>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="text-align: center; font-size: 0.8rem; color: var(--ink-muted); padding: 18px; font-style: italic; background: rgba(0,0,0,0.02); border-radius: 6px;">
              No friends connected yet. Search above to add fellow adventurers!
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  setupGuildListeners(container);
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'recently';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function setupGuildListeners(container) {
  // Subtabs
  container.querySelectorAll('.guild-subtab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.guild-subtab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      container.querySelectorAll('.guild-section').forEach(sec => {
        if (sec.id === targetId) sec.classList.remove('hidden');
        else sec.classList.add('hidden');
      });
    });
  });

  const btnAttack = container.querySelector('#btn-guild-attack-boss');
  if (btnAttack) {
    btnAttack.addEventListener('click', () => {
      switchScreen('quests');
    });
  }
  
  const btnOrgManage = container.querySelector('#btn-clerk-org-manage');
  if (btnOrgManage) {
    btnOrgManage.addEventListener('click', () => {
      openClerkOrganizationProfile();
    });
  }

  // Guild rename triggers
  function triggerGuildRename() {
    const state = getState();
    const currentName = state.guild?.name || "Guild";
    const newName = prompt("Enter a new name for your Guild:", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      const res = renameGuild(newName.trim());
      if (res.success) {
        renderGuild(container);
      } else {
        alert(res.message);
      }
    }
  }

  const btnRenameBanner = container.querySelector('#btn-rename-guild');
  if (btnRenameBanner) btnRenameBanner.addEventListener('click', triggerGuildRename);

  const btnRenameRoster = container.querySelector('#btn-roster-rename-guild');
  if (btnRenameRoster) btnRenameRoster.addEventListener('click', triggerGuildRename);

  const btnLeave = container.querySelector('#btn-leave-guild');
  if (btnLeave) {
    btnLeave.addEventListener('click', () => {
      if (confirm("Are you sure you want to leave your guild?")) {
        leaveGuild();
        renderGuild(container);
      }
    });
  }

  // Friend actions inside active guild
  const btnAddFriend = container.querySelector('#btn-guild-add-friend');
  const inputFriend = container.querySelector('#input-guild-friend-search');
  if (btnAddFriend && inputFriend) {
    btnAddFriend.addEventListener('click', () => {
      const val = inputFriend.value;
      if (val) {
        const res = addFriend(val);
        if (res.success) {
          renderGuild(container);
          // Auto switch to friends tab after render
          const fTab = container.querySelector('[data-target="guild-sec-friends"]');
          if (fTab) fTab.click();
        } else {
          alert(res.message);
        }
      }
    });
    inputFriend.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') btnAddFriend.click();
    });
  }

  // Recruit friend into guild
  container.querySelectorAll('.btn-recruit-friend').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.currentTarget.getAttribute('data-name');
      if (name) {
        const state = getState();
        if (state.guild && !state.guild.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
          state.guild.members.push({
            name: name,
            archetype: 'Adventurer',
            level: 1,
            role: 'Member'
          });
          renderGuild(container);
          const fTab = container.querySelector('[data-target="guild-sec-friends"]');
          if (fTab) fTab.click();
        }
      }
    });
  });

  // Remove friend button
  container.querySelectorAll('.btn-remove-friend').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fId = e.currentTarget.getAttribute('data-id');
      if (fId) {
        removeFriend(fId);
        renderGuild(container);
        const fTab = container.querySelector('[data-target="guild-sec-friends"]');
        if (fTab) fTab.click();
      }
    });
  });

  // Huzzah buttons
  container.querySelectorAll('.btn-huzzah').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.getAttribute('data-idx');
      if (idx !== null) {
        huzzahEvent(parseInt(idx, 10));
      }
    });
  });
}
