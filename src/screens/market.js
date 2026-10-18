/* ==========================================================================
   Market Screen (Guild Bazaar, Forges & Wardrobe) - The Great Ledger
   ========================================================================== */

import { getState, getDerivedStats, investEssence, craftRelic, equipRelic, switchWeapon, buyCosmetic, equipCosmetic } from '../state.js';
import { ARMOR_TIERS, getArmorForgeUpgradeCost } from '../state.js';
import { WEAPON_PRESETS, weaponRankForXp, getLayeredAvatarSVG } from '../formulas.js';

let activeMarketSubtab = 'section-forge'; // Remember subtab across re-renders

export function renderMarket(container) {
  const state = getState();
  const derived = getDerivedStats();
  const prog = state.progression || {};
  const materials = prog.materials || { essence: 0, coreFragments: 0, relicShards: 0 };
  const forge = prog.armorForge || { level: 1, essenceInvested: 0 };
  const forgeCost = getArmorForgeUpgradeCost(forge.level);
  const cosmetics = state.profile.cosmetics || { equippedHair: 'default-hair', equippedSkin: 'default-skin', equippedAura: 'none-aura' };

  const activeWeaponKey = prog.equippedWeapon || "blade";
  const activeWeapon = WEAPON_PRESETS[activeWeaponKey] || WEAPON_PRESETS.blade;

  container.innerHTML = `
    <div class="market-screen">
      <!-- Grand Bazaar Red Curtain Header Banner -->
      <div class="parchment-card header-banner market-banner" style="background: linear-gradient(135deg, rgba(127, 29, 29, 0.12) 0%, rgba(180, 83, 9, 0.06) 100%), var(--parchment-light); border-color: var(--ruby-crimson);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h1 class="card-title" style="color: var(--ruby-crimson); margin-bottom:4px; font-size:1.25rem;">
              🎪 Guild Grand Bazaar
            </h1>
            <p class="description-text">
              Forge mythical armor, unlock weapon masteries, craft ancient relics, and tailor your hero's attire.
            </p>
          </div>
          <div style="font-size: 2.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🏬</div>
        </div>

        <!-- Clerk Supporter Pass Treasury Banner -->
        <div style="margin-top: 8px; padding: 8px 10px; background: #fbf6ec; border: 1px dashed var(--amber-gold); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="font-size: 0.72rem; color: var(--ink-dark);">
            💎 <strong>Clerk Guild Supporter Pass:</strong> Unlock +20% Raid Boss Damage & Exclusive Supporter Gold Packs.
          </div>
          <button class="btn-primary" id="btn-market-supporter-pass" style="font-size: 0.65rem; padding: 4px 10px; white-space: nowrap;">💎 Get Pass</button>
        </div>
      </div>

      <!-- Materials Vault Bar -->
      <div class="parchment-card" style="padding: 10px 14px; background: var(--parchment-light); border: 1px dashed var(--amber-gold); margin-bottom: 12px;">
        <div style="font-family: var(--font-header); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--amber-gold); margin-bottom: 6px;">
          📦 Crafting Vault Materials
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center;">
          <div class="spoil-item" style="font-size: 0.72rem; background: var(--parchment-bg);">✨ <strong>${materials.essence || 0}</strong> Essence</div>
          <div class="spoil-item" style="font-size: 0.72rem; background: var(--parchment-bg);">⚙️ <strong>${materials.coreFragments || 0}</strong> Frags</div>
          <div class="spoil-item" style="font-size: 0.72rem; background: var(--parchment-bg);">🧩 <strong>${materials.relicShards || 0}</strong> Shards</div>
        </div>
      </div>

      <!-- Section Tabs Navigation -->
      <div class="market-nav-tabs" style="display: flex; gap: 4px; overflow-x: auto; margin-bottom: 12px;">
        <button class="btn-secondary market-subtab ${activeMarketSubtab === 'section-forge' ? 'active' : ''}" data-target="section-forge" style="flex:1; font-size:0.7rem; padding:6px;">🛡️ Forge</button>
        <button class="btn-secondary market-subtab ${activeMarketSubtab === 'section-weapons' ? 'active' : ''}" data-target="section-weapons" style="flex:1; font-size:0.7rem; padding:6px;">⚔️ Weapons</button>
        <button class="btn-secondary market-subtab ${activeMarketSubtab === 'section-relics' ? 'active' : ''}" data-target="section-relics" style="flex:1; font-size:0.7rem; padding:6px;">💍 Relics</button>
        <button class="btn-secondary market-subtab ${activeMarketSubtab === 'section-wardrobe' ? 'active' : ''}" data-target="section-wardrobe" style="flex:1; font-size:0.7rem; padding:6px;">🎭 Wardrobe</button>
      </div>

      <!-- 1. ARMOR FORGE SECTION -->
      <div id="section-forge" class="market-section parchment-card ${activeMarketSubtab === 'section-forge' ? '' : 'hidden'}">
        <h3 class="card-title font-gold" style="font-size:1rem; margin-bottom:8px;">
          🛡️ Armor Forge (Tier ${forge.level}/10)
        </h3>
        <p style="font-size: 0.78rem; color: var(--ink-muted); margin-bottom: 12px;">
          Invest Essence gathered from dungeons and daily tasks to elevate your armor tier. Every upgrade grants +15 Defense.
        </p>

        <div class="forge-status-box" style="background: var(--parchment-bg); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 12px; margin-bottom: 14px;">
          <!-- Live Armor Showcase in Forge -->
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
            <div style="width: 58px; height: 58px; border-radius: 50%; border: 2px solid var(--amber-gold); background: radial-gradient(circle, #27272a 0%, #09090b 100%); overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              <svg viewBox="0 0 100 100" style="width:58px; height:58px; overflow:visible;">
                ${getLayeredAvatarSVG(state, derived)}
              </svg>
            </div>
            <div style="flex:1;">
              <div style="font-family: var(--font-header); font-weight:700; font-size:0.9rem; color: var(--ink-dark);">
                ${ARMOR_TIERS[forge.level - 1] || "Plate"}
              </div>
              <div style="font-size:0.75rem; color: var(--emerald-green); font-weight:bold;">
                +${(forge.level - 1) * 15} Defense Rating
              </div>
              <div style="font-size:0.65rem; color: var(--ink-muted); margin-top:2px;">
                Visuals upgrade automatically across all portrait frames!
              </div>
            </div>
          </div>

          ${forge.level < 10 ? `
          <div class="forge-progress-bar-track" style="height: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; overflow:hidden; margin-bottom: 6px;">
            <div class="forge-progress-bar-fill" style="width: ${Math.min(100, (forge.essenceInvested / forgeCost) * 100)}%; height:100%; background: linear-gradient(90deg, var(--gold-primary), var(--emerald-green));"></div>
          </div>
          <div style="font-size: 0.68rem; color: var(--ink-muted); display:flex; justify-content:space-between;">
            <span>Invested: ${forge.essenceInvested}/${forgeCost} Essence</span>
            <span>Next Level: +15 Armor</span>
          </div>
          ` : `
          <div style="font-size:0.8rem; color: var(--gold-amber); font-weight:bold; text-align:center;">
            🏆 Maximum Armor Tier Mastered!
          </div>
          `}
        </div>

        ${forge.level < 10 ? `
        <div style="display: flex; gap: 8px;">
          <button class="btn-primary" id="btn-forge-invest-10" style="flex:1; font-size:0.75rem;">✨ Invest 10 Essence</button>
          <button class="btn-primary" id="btn-forge-invest-max" style="flex:1; font-size:0.75rem; background: var(--gold-primary) !important; color: var(--ink-charcoal) !important; font-weight:700; border: 1px solid var(--ink-charcoal);">⚡ Fill Tier</button>
        </div>
        ` : ''}
      </div>

      <!-- 2. WEAPON MASTERIES SECTION -->
      <div id="section-weapons" class="market-section parchment-card ${activeMarketSubtab === 'section-weapons' ? '' : 'hidden'}">
        <h3 class="card-title font-gold" style="font-size:1rem; margin-bottom:8px;">
          ⚔️ Armory & Weapon Masteries
        </h3>
        <p style="font-size: 0.78rem; color: var(--ink-muted); margin-bottom: 12px;">
          Wielding weapons in focus expeditions trains their mastery ranks, boosting base accuracy and damage.
        </p>
        
        <div class="weapon-grid" style="display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(WEAPON_PRESETS).map(([wKey, preset]) => {
            const wXp = (prog.weaponXP && prog.weaponXP[wKey]) || 0;
            const wRank = weaponRankForXp(wXp);
            const isEquipped = prog.equippedWeapon === wKey;

            return `
              <div class="weapon-card ${isEquipped ? 'equipped-weapon' : ''}" style="border: 1px solid ${isEquipped ? 'var(--gold-amber)' : 'rgba(0,0,0,0.1)'}; padding: 10px; border-radius: 8px; background: ${isEquipped ? '#fbf6ec' : 'var(--parchment-bg)'};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <span style="font-size:1.2rem; margin-right:6px;">${preset.icon}</span>
                    <strong style="font-size:0.88rem;">${preset.name}</strong>
                    <span style="font-size:0.68rem; padding:2px 6px; border-radius:4px; margin-left:6px; background:var(--ink-charcoal); color:#fff; font-weight:700;">Rank ${wRank}</span>
                  </div>
                  <button class="btn-secondary btn-equip-weapon" data-key="${wKey}" ${isEquipped ? 'disabled' : ''} style="font-size:0.7rem; padding:4px 10px;">
                    ${isEquipped ? '✅ Equipped' : 'Equip'}
                  </button>
                </div>
                <div style="font-size:0.68rem; color:var(--ink-muted); margin-top:4px;">${preset.desc}</div>
                <div style="font-size:0.64rem; color:var(--emerald-green); font-weight:bold; margin-top:2px;">
                  Stats: +${preset.attack + Math.floor(wRank * 0.4)} Accuracy | +${preset.damage} Base Damage
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 3. RELIC FORGE SECTION -->
      <div id="section-relics" class="market-section parchment-card ${activeMarketSubtab === 'section-relics' ? '' : 'hidden'}">
        <h3 class="card-title font-gold" style="font-size:1rem; margin-bottom:8px;">
          💍 Relic Forge & Artifacts
        </h3>
        <p style="font-size: 0.78rem; color: var(--ink-muted); margin-bottom: 12px;">
          Combine Essence and Relic Shards to forge permanent passive Relics for your hero.
        </p>

        <div class="relics-list" style="display: flex; flex-direction: column; gap: 8px;">
          ${renderRelicCraftingCards(prog, materials)}
        </div>
      </div>

      <!-- 4. COSMETIC WARDROBE SECTION -->
      <div id="section-wardrobe" class="market-section parchment-card ${activeMarketSubtab === 'section-wardrobe' ? '' : 'hidden'}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom:8px;">
          <div>
            <h3 class="card-title font-gold" style="font-size:1rem; margin-bottom:2px;">
              🎭 Cosmetic Wardrobe & Attire
            </h3>
            <p style="font-size: 0.78rem; color: var(--ink-muted);">
              Unlock and equip hairstyles, skin tones, and magical auras with Gold.
            </p>
          </div>
          <div style="font-size: 0.9rem; font-weight: bold; color: var(--gold-primary); background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px;">
            💰 ${state.profile.gold} Gold
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${renderCosmeticPanel('hair', '💇 Hairstyles & Headwear', [
            { id: 'default-hair', name: 'Default Short', icon: '👤', cost: 0 },
            { id: 'viking-braid', name: 'Viking Braid', icon: '🪓', cost: 200 },
            { id: 'wizard-hood', name: 'Wizard Hood', icon: '🧙', cost: 300 },
            { id: 'rogue-mask', name: 'Rogue Mask', icon: '🥷', cost: 300 },
            { id: 'crown-laurels', name: 'Laurels', icon: '👑', cost: 500 },
            { id: 'braided-topknot', name: 'Topknot', icon: '⚔️', lockReason: 'Req: Level 10' },
            { id: 'battle-scarred', name: 'Battle Scarred', icon: '🩸', lockReason: 'Req: Level 20' },
            { id: 'silver-sage-hair', name: 'Silver Sage', icon: '✨', lockReason: 'Req: Level 35' },
            { id: 'midnight-locs', name: 'Midnight Locs', icon: '📜', lockReason: 'Req: 100 Bounties' }
          ], cosmetics)}

          ${renderCosmeticPanel('skin', '🎨 Skin & Tone', [
            { id: 'default-skin', name: 'Fair Parchment', icon: '📜', cost: 0 },
            { id: 'olive-skin', name: 'Warm Olive', icon: '🫒', cost: 100 },
            { id: 'sunkissed-skin', name: 'Sun-kissed', icon: '☀️', cost: 100 },
            { id: 'ebony-skin', name: 'Deep Ebony', icon: '🌑', cost: 100 },
            { id: 'ethereal-skin', name: 'Ethereal Blue', icon: '🌌', cost: 1000 },
            { id: 'crimson-skin', name: 'Demonic Crimson', icon: '👹', lockReason: 'Req: 25 Monsters Slain' },
            { id: 'golden-skin', name: 'Divine Gold', icon: '🌟', lockReason: 'Req: Level 30' }
          ], cosmetics)}

          ${renderCosmeticPanel('cape', '🧥 Cloaks & Capes', [
            { id: 'none-cape', name: 'Basic Mantle', icon: '🛡️', cost: 0 },
            { id: 'wanderers-cloak', name: "Wanderer's Cloak", icon: '🍃', lockReason: 'Req: Level 5' },
            { id: 'royal-cape', name: 'Royal Velvet Cape', icon: '👑', lockReason: 'Req: Level 25' },
            { id: 'shadowmeld-cloak', name: 'Shadow Cloak', icon: '🥷', lockReason: 'Req: 50 Monsters Slain' },
            { id: 'phoenix-cape', name: 'Phoenix Plume', icon: '🔥', lockReason: 'Req: 10 Expeditions' }
          ], cosmetics)}

          ${renderCosmeticPanel('aura', '✨ Aura Crests', [
            { id: 'none-aura', name: 'None', icon: '⚪', cost: 0 },
            { id: 'fire-aura', name: 'Flame Aura', icon: '🔥', cost: 800 },
            { id: 'holy-halo', name: 'Holy Halo', icon: '✨', cost: 1200 },
            { id: 'dragon-aura', name: 'Dragon Crest', icon: '🐉', cost: 2000 },
            { id: 'storm-aura', name: 'Storm Spark', icon: '⚡', lockReason: 'Req: Level 15' },
            { id: 'void-aura', name: 'Cosmic Void', icon: '🔮', lockReason: 'Req: Defeat Dungeon Boss' }
          ], cosmetics)}

          ${renderCosmeticPanel('premium', '💎 Clerk Guild Treasury (Epic Attire)', [
            { id: 'gilded-crown', name: 'Gilded Crown', icon: '👑', isPremium: true, price: '$2.99 USD', cat: 'aura' },
            { id: 'demon-wings', name: 'Demon Wings', icon: '🦇', isPremium: true, price: '$4.99 USD', cat: 'aura' },
            { id: 'celestial-mantle', name: 'Celestial Mantle', icon: '🌌', isPremium: true, price: '$9.99 USD', cat: 'cape' }
          ], cosmetics)}
        </div>
      </div>

      <!-- Live Hero Appearance Preview Card -->
      <div class="parchment-card" style="margin-top: 14px; text-align: center; border: 2px solid var(--amber-gold); background: linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(217, 119, 6, 0.05) 100%), var(--parchment-light);">
        <h4 style="font-family: var(--font-header); font-size: 0.75rem; color: var(--amber-gold); text-transform: uppercase; margin-bottom: 6px;">
          🎭 Hero Appearance & Gear Preview
        </h4>
        
        <div style="width: 100px; height: 100px; margin: 8px auto; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(254,240,138,0.2) 0%, transparent 70%); border-radius: 50%;">
          <svg viewBox="0 0 100 100" style="width:85px; height:85px; overflow:visible;">
            ${getLayeredAvatarSVG(state, derived)}
          </svg>
        </div>

        <div style="font-size: 0.78rem; font-weight: bold; color: var(--ink-dark);">
          ${state.profile.name} • Level ${state.profile.totalLevel} ${prog.currentClass}
        </div>
        <div style="font-size: 0.65rem; color: var(--ink-muted); margin-top: 2px;">
          Armor Tier: <strong>${ARMOR_TIERS[forge.level - 1] || "Plate"}</strong> (+${(forge.level - 1) * 15} Def) | Weapon: <strong>${activeWeapon.name}</strong>
        </div>
      </div>
    </div>
  `;

  setupMarketListeners(container);
}

function renderCosmeticPanel(category, title, items, cosmeticsState) {
  return `
    <div class="parchment-card" style="padding: 10px;">
      <h4 style="font-family: var(--font-header); font-size: 0.72rem; color: var(--amber-gold); margin-bottom: 6px; text-transform: uppercase;">${title}</h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
        ${items.map(item => {
          const isUnlocked = cosmeticsState.unlockedItems.includes(item.id);
          const isEquipped = cosmeticsState.equippedHair === item.id || 
                             cosmeticsState.equippedSkin === item.id || 
                             cosmeticsState.equippedAura === item.id || 
                             cosmeticsState.equippedCape === item.id;
          const targetCat = item.cat || category;
          
          if (isUnlocked) {
            return `<button class="btn-secondary btn-equip-cosmetic ${isEquipped ? 'active' : ''}" data-cat="${targetCat}" data-id="${item.id}" style="font-size:0.68rem; padding:6px;">${isEquipped ? '✓ ' : ''}${item.icon} ${item.name}</button>`;
          } else if (item.isPremium) {
            return `<button class="btn-primary btn-premium-cosmetic" data-id="${item.id}" data-price="${item.price}" style="font-size:0.68rem; padding:6px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:#fff; border:1px solid #c084fc;">💎 ${item.icon} ${item.name} (${item.price})</button>`;
          } else if (item.lockReason) {
            return `<button class="btn-secondary" disabled style="font-size:0.65rem; padding:6px; opacity:0.65; cursor:not-allowed;" title="${item.lockReason}">🔒 ${item.icon} ${item.name}<div style="font-size:0.55rem; color:var(--ruby-crimson);">${item.lockReason}</div></button>`;
          } else {
            return `<button class="btn-primary btn-buy-cosmetic" data-id="${item.id}" data-cost="${item.cost}" style="font-size:0.68rem; padding:6px; background:var(--gold-primary); color:var(--ink-charcoal);">${item.icon} ${item.name} (${item.cost}g)</button>`;
          }
        }).join('')}
      </div>
    </div>
  `;
}

function renderRelicCraftingCards(prog, materials) {
  const relics = [
    { id: "Iron Ring", name: "Iron Ring", desc: "+2 Defense rating.", ess: 150, shards: 5, icon: "💍" },
    { id: "Wolf Fang", name: "Wolf Fang", desc: "+2 Accuracy, +1 Damage.", ess: 250, shards: 8, icon: "🐺" },
    { id: "Crown of Momentum", name: "Crown of Momentum", desc: "+3 Accuracy, +1 Armor.", ess: 400, shards: 12, icon: "👑" },
    { id: "Boots of Haste", name: "Boots of Haste", desc: "+4 Accuracy, +15 Max HP.", ess: 450, shards: 15, icon: "🥾" },
    { id: "Heart of the Titan", name: "Heart of the Titan", desc: "+20 Max HP.", ess: 600, shards: 20, icon: "❤️" },
    { id: "Worldbreaker", name: "Worldbreaker", desc: "+8 Accuracy, +4 Damage, +2 Armor.", ess: 1200, shards: 40, icon: "⚔️" },
    { id: "Amulet of the Ancients", name: "Amulet of the Ancients", desc: "+10 Defense rating, +50 Max HP.", ess: 1500, shards: 50, icon: "📿" },
    { id: "Void Mantle", name: "Void Mantle", desc: "+15 Armor, -2 Accuracy.", ess: 2000, shards: 60, icon: "🌌" }
  ];

  const unlocked = prog.unlockedRelics || [];
  const activeRelic = prog.equippedRelic;

  return relics.map(r => {
    const isUnlocked = unlocked.includes(r.id);
    const isEquipped = activeRelic === r.id;
    const canCraft = (materials.essence || 0) >= r.ess && (materials.relicShards || 0) >= r.shards;

    return `
      <div class="relic-card" style="border: 1px solid ${isEquipped ? 'var(--gold-amber)' : 'rgba(0,0,0,0.1)'}; padding: 10px; border-radius: 8px; background: var(--parchment-light);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-size:1.1rem; margin-right:6px;">${r.icon}</span>
            <strong style="font-size:0.85rem;">${r.name}</strong>
          </div>
          ${isUnlocked ? `
            <button class="btn-secondary btn-equip-relic" data-id="${r.id}" ${isEquipped ? 'disabled' : ''} style="font-size:0.7rem; padding:4px 10px;">
              ${isEquipped ? '✅ Active' : 'Equip'}
            </button>
          ` : canCraft ? `
            <button class="btn-primary btn-craft-relic" data-id="${r.id}" data-ess="${r.ess}" data-shards="${r.shards}" style="font-size:0.7rem; padding:4px 10px;">
              🔨 Craft (${r.ess}e / ${r.shards}s)
            </button>
          ` : `
            <button class="btn-secondary" disabled style="font-size:0.68rem; padding:4px 10px; opacity:0.55; cursor:not-allowed; background:rgba(0,0,0,0.05); color:var(--ink-muted);">
              🔒 Need ${r.ess}e / ${r.shards}s
            </button>
          `}
        </div>
        <div style="font-size:0.68rem; color:var(--ink-muted); margin-top:4px;">${r.desc}</div>
      </div>
    `;
  }).join('');
}

function setupMarketListeners(container) {
  // Clerk Supporter Pass trigger
  const btnPass = container.querySelector('#btn-market-supporter-pass');
  if (btnPass) {
    btnPass.addEventListener('click', () => {
      import('../state.js').then(mod => {
        if (mod.getState().auth?.isSignedIn) {
          mod.openClerkOrganizationProfile();
        } else {
          mod.openClerkSignIn();
        }
      });
    });
  }

  // Subtab switching
  container.querySelectorAll('.market-subtab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeMarketSubtab = tab.getAttribute('data-target');
      container.querySelectorAll('.market-subtab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      container.querySelectorAll('.market-section').forEach(sec => {
        if (sec.id === activeMarketSubtab) sec.classList.remove('hidden');
        else sec.classList.add('hidden');
      });
    });
  });

  // Forge Invest 10
  const btnInvest10 = container.querySelector('#btn-forge-invest-10');
  if (btnInvest10) {
    btnInvest10.addEventListener('click', () => {
      const res = investEssence(10);
      if (res && res.success) {
        renderMarket(container);
      } else {
        alert("Not enough Essence in the Crafting Vault!");
      }
    });
  }

  // Forge Fill Tier
  const btnInvestMax = container.querySelector('#btn-forge-invest-max');
  if (btnInvestMax) {
    btnInvestMax.addEventListener('click', () => {
      const state = getState();
      const forge = state.progression.armorForge;
      const cost = getArmorForgeUpgradeCost(forge.level);
      const needed = cost - forge.essenceInvested;
      const res = investEssence(needed);
      if (res && res.success) {
        renderMarket(container);
      } else {
        alert("Not enough Essence to complete this Armor Tier!");
      }
    });
  }

  // Weapon equip
  container.querySelectorAll('.btn-equip-weapon').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      switchWeapon(key);
      renderMarket(container);
    });
  });

  // Craft Relic
  container.querySelectorAll('.btn-craft-relic').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const ess = parseInt(btn.getAttribute('data-ess'), 10);
      const shards = parseInt(btn.getAttribute('data-shards'), 10);
      const success = craftRelic(id, ess, shards);
      if (success) {
        equipRelic(id);
        renderMarket(container);
      }
    });
  });

  // Equip Relic
  container.querySelectorAll('.btn-equip-relic').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      equipRelic(id);
      renderMarket(container);
    });
  });

  // Equip Cosmetic
  container.querySelectorAll('.btn-equip-cosmetic').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      const id = btn.getAttribute('data-id');
      equipCosmetic(cat, id);
      renderMarket(container);
    });
  });

  // Buy Cosmetic
  container.querySelectorAll('.btn-buy-cosmetic').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const cost = parseInt(btn.getAttribute('data-cost'), 10);
      const res = buyCosmetic(id, cost, false);
      if (res && res.success) {
        renderMarket(container);
      } else {
        alert(res.message || "Failed to purchase.");
      }
    });
  });

  // Premium Real-Money Cosmetic
  container.querySelectorAll('.btn-premium-cosmetic').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const price = btn.getAttribute('data-price');
      alert(`💎 Clerk Guild Store\n\nItem: ${id.replace('-', ' ').toUpperCase()}\nPrice: ${price}\n\n✨ Coming Soon! Clerk checkout integration for real-money Guild Supporter items is arriving soon.`);
    });
  });
}
