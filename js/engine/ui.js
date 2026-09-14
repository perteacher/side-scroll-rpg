// 파티 슬롯별 스킬 단축키: 1번 QWE / 2번 ASD / 3번 ZXC
const SLOT_SKILL_KEYS = [['q', 'w', 'e'], ['a', 's', 'd'], ['z', 'x', 'c']];
const CHAT_TABS = [
  { id: 'all', label: '전체' }, { id: 'general', label: '일반' }, { id: 'squad', label: '스퀴드' },
  { id: 'party', label: '당' }, { id: 'whisper', label: '귓속말' }, { id: 'npc', label: 'NPC' },
  { id: 'custom', label: '커스텀' }, { id: 'system', label: '시스템' },
];

class UIManager {
  constructor(partyManager, zoneManager, questManager, scenarioManager) {
    this.pm = partyManager;
    this.zm = zoneManager;
    this.qm = questManager;
    this.sm = scenarioManager;
    this.onStoryTalk = null;
    this.chatLines = [];
    this.chatFilter = 'all';
    this.activeCharTab = 'equip';
    this.currentNpc = null;
    this.target = null;
    this.selectedClassId = null;
    // game.js가 채우는 콜백
    this.onSkillPress = null;
    this.onSwapRequest = null;
    this.onAutoModeChange = null;
    this.onTeleport = null;
    this.onCreateCharacter = null;
    this.onQuestAccept = null;
    this.onQuestComplete = null;
    this.onSkillUpgrade = null;
  }

  init() {
    document.querySelectorAll('[data-open]').forEach((btn) => {
      btn.addEventListener('click', () => this.openWindow(this._openTargetId(btn.dataset.open)));
    });
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeWindow(btn.dataset.close));
    });
    document.querySelectorAll('#char-info-window .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => this._switchCharTab(btn.dataset.tab));
    });
    document.querySelectorAll('#shop-window .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => { this.shopTab = btn.dataset.shoptab; this.refreshShop(); });
    });

    const chatTabsEl = document.getElementById('chat-tabs');
    CHAT_TABS.forEach((t) => {
      const b = document.createElement('button');
      b.textContent = t.label;
      b.className = t.id === 'all' ? 'active' : '';
      b.addEventListener('click', () => {
        this.chatFilter = t.id;
        chatTabsEl.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        this._renderChatLog();
      });
      chatTabsEl.appendChild(b);
    });

    document.getElementById('save-btn').addEventListener('click', () => this.onManualSave && this.onManualSave());
    document.getElementById('reset-btn').addEventListener('click', () => {
      // eslint-disable-next-line no-alert
      if (window.confirm('저장된 게임을 지우고 처음부터 시작할까요?')) {
        if (this.onResetSave) this.onResetSave();
      }
    });

    this._initChatDrag();
    this._initChatControls();
    this._initCreateScreen();
  }

  // 채팅창 최소화(─) / 닫기(✕), 상단 💬 버튼으로 다시 열기
  _initChatControls() {
    const chatWin = document.getElementById('chat-window');
    document.getElementById('chat-minimize-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      chatWin.classList.toggle('minimized');
      e.target.textContent = chatWin.classList.contains('minimized') ? '▢' : '─';
    });
    document.getElementById('chat-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      chatWin.classList.add('hidden-chat');
    });
    document.getElementById('chat-toggle-btn').addEventListener('click', () => {
      chatWin.classList.remove('hidden-chat');
    });
  }

  _openTargetId(key) {
    return {
      family: 'family-window',
      inventory: 'inventory-window', charinfo: 'char-info-window',
      barracks: 'barracks-window', quest: 'quest-window', teleport: 'teleport-window',
    }[key];
  }

  // ---------- 캐릭터 생성 ----------
  _initCreateScreen() {
    const listEl = document.getElementById('class-list');
    listEl.innerHTML = CLASS_DATA.map((c) => {
      const role = { melee: '근접', ranged: '원거리', magic: '마법' }[c.attackType];
      const stances = c.stanceIds.map((s) => STANCE_DATA[s].name).join(' / ');
      return `
        <div class="class-card" data-class="${c.id}">
          <div class="class-icon" style="background:${c.color}"></div>
          <div class="class-name">${c.name}</div>
          <div class="class-role">${role} · ${stances}</div>
          <div class="class-desc">${c.desc}</div>
          <div class="class-stats">힘${c.baseStats.str} 민${c.baseStats.agi} 체${c.baseStats.vit} 기${c.baseStats.skl} 지${c.baseStats.int} 감${c.baseStats.sen}</div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.class-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.selectedClassId = card.dataset.class;
        listEl.querySelectorAll('.class-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    const input = document.getElementById('nickname-input');
    const errEl = document.getElementById('create-error');
    this.pendingChars = [];

    const addChar = () => {
      const nickname = input.value.trim();
      if (!this.selectedClassId) { errEl.textContent = '클래스를 선택하세요.'; return; }
      if (!nickname) { errEl.textContent = '닉네임을 입력하세요.'; return; }
      if (this.pendingChars.length >= MAX_PLAYER_CHARS) { errEl.textContent = `${MAX_PLAYER_CHARS}명을 모두 만들었습니다.`; return; }
      if (this.pendingChars.some((c) => c.nickname === nickname)) { errEl.textContent = '이미 쓴 닉네임입니다.'; return; }
      errEl.textContent = '';
      this.pendingChars.push({ classId: this.selectedClassId, nickname });
      input.value = '';
      this._renderCreatedList();
    };

    document.getElementById('create-btn').addEventListener('click', addChar);
    document.getElementById('start-btn').addEventListener('click', () => {
      if (this.pendingChars.length < MAX_PLAYER_CHARS) {
        errEl.textContent = `${MAX_PLAYER_CHARS}명을 모두 만들어야 시작할 수 있습니다.`;
        return;
      }
      document.getElementById('create-screen').classList.add('hidden');
      if (this.onCreateCharacter) this.onCreateCharacter(this.pendingChars);
    });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') addChar();
    });
    this._renderCreatedList();
  }

  _renderCreatedList() {
    const el = document.getElementById('created-list');
    const startBtn = document.getElementById('start-btn');
    const left = MAX_PLAYER_CHARS - this.pendingChars.length;
    startBtn.disabled = left > 0;
    startBtn.textContent = left > 0 ? `모험 시작 (${left}명 더 필요)` : '모험 시작';
    if (this.pendingChars.length === 0) {
      el.innerHTML = `<span style="opacity:0.5;font-size:11px;">${MAX_PLAYER_CHARS}명을 모두 만들어야 시작할 수 있습니다.</span>`;
      return;
    }
    el.innerHTML = this.pendingChars.map((c, i) => {
      const def = CLASS_DATA.find((cd) => cd.id === c.classId);
      return `
        <div class="created-chip">
          <span class="chip-icon" style="background:${def.color}"></span>
          ${c.nickname} <span style="opacity:0.6">(${def.name} Lv.1)</span>
          <button data-remove="${i}">✕</button>
        </div>`;
    }).join('');
    el.querySelectorAll('button[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.pendingChars.splice(parseInt(btn.dataset.remove, 10), 1);
        this._renderCreatedList();
      });
    });
  }

  get isCreating() { return !document.getElementById('create-screen').classList.contains('hidden'); }

  // ---------- 창 ----------
  openWindow(id) {
    if (this.isCreating) return;
    if (id === 'char-info-window') this.refreshCharInfo();
    if (id === 'barracks-window') this.refreshBarracks();
    if (id === 'quest-window') this.refreshQuest();
    if (id === 'teleport-window') this.refreshTeleport();
    if (id === 'family-window') this.refreshFamily();
    if (id === 'inventory-window') this.refreshInventory();
    document.getElementById(id).classList.remove('hidden');
  }

  isWindowOpen(id) { return !document.getElementById(id).classList.contains('hidden'); }

  // 조작 캐릭터가 바뀌면 열려 있는 창들을 새 캐릭터 기준으로 다시 그린다.
  refreshOpenWindows() {
    if (this.isWindowOpen('char-info-window')) this.refreshCharInfo();
    if (this.isWindowOpen('shop-window')) this.refreshShop();
    if (this.isWindowOpen('barracks-window')) this.refreshBarracks();
    if (this.isWindowOpen('inventory-window')) this.refreshInventory();
    if (this.isWindowOpen('family-window')) this.refreshFamily();
    if (this.isWindowOpen('board-window')) this.refreshBoard();
  }

  closeWindow(id) { document.getElementById(id).classList.add('hidden'); }
  toggleWindow(id) {
    const el = document.getElementById(id);
    if (el.classList.contains('hidden')) this.openWindow(id); else this.closeWindow(id);
  }
  closeTopWindow() {
    const openWins = [...document.querySelectorAll('.game-window')].filter((w) => !w.classList.contains('hidden'));
    if (openWins.length) openWins[openWins.length - 1].classList.add('hidden');
  }

  // ---------- 하단 파티 슬롯 ----------
  rebuildPartySlots() {
    const wrap = document.getElementById('party-slots');
    wrap.innerHTML = '';
    this.pm.partyUnits.forEach((unit, slotIndex) => {
      const slot = document.createElement('div');
      slot.className = 'party-slot';
      slot.dataset.slot = slotIndex;

      const portrait = document.createElement('div');
      portrait.className = 'portrait';
      portrait.style.background = unit.color;
      portrait.textContent = unit.name[0];

      const info = document.createElement('div');
      info.className = 'slot-info';
      info.innerHTML = `
        <div class="name-lv">${unit.name} ${rankLabel(unit.level)}</div>
        <div class="bar-bg"><div class="bar-fill hp"></div><span class="bar-text hp-text"></span></div>
        <div class="bar-bg"><div class="bar-fill mp"></div><span class="bar-text mp-text"></span></div>
        <div class="bar-bg xp-bg"><div class="bar-fill xp"></div></div>
        <div class="bar-bg sxp-bg"><div class="bar-fill sxp"></div><span class="bar-text sxp-text"></span></div>
      `;

      const modes = document.createElement('div');
      modes.className = 'auto-modes';
      AUTO_MODES.forEach((mode) => {
        const b = document.createElement('button');
        b.textContent = AUTO_MODE_LABEL[mode];
        b.dataset.mode = mode;
        b.title = { off: '수동 조작만', keep: '이동하며 자동 사냥', hold: '제자리에서 사거리 내 공격' }[mode];
        b.className = unit.autoMode === mode ? 'on' : '';
        b.addEventListener('click', () => this.onAutoModeChange && this.onAutoModeChange(unit.id, mode));
        modes.appendChild(b);
      });

      const hotbar = document.createElement('div');
      hotbar.className = 'hotbar';
      const skillIds = unit.stance.skillIds;
      (SLOT_SKILL_KEYS[slotIndex] || []).forEach((key, i) => {
        const b = document.createElement('button');
        const skillId = skillIds[i];
        const skillDef = skillId ? ROLE_SKILLS_DATA[unit.attackType][skillId] : null;
        const lv = skillId ? unit.skillLevel(skillId) : 0;
        b.className = 'skill-btn' + (skillDef ? (lv > 0 ? '' : ' locked') : ' empty');
        b.innerHTML = skillDef
          ? `<span class="key-label">${key.toUpperCase()}</span>${lv > 0 ? skillDef.name.slice(0, 2) : '🔒'}${lv > 0 ? `<span class="lv-label">${lv}</span>` : ''}`
          : `<span class="key-label">${key.toUpperCase()}</span>`;
        if (skillDef) {
          b.dataset.skill = skillId;
          const mask = document.createElement('span');
          mask.className = 'cd-mask';
          b.appendChild(mask);
          const cdText = document.createElement('span');
          cdText.className = 'cd-text';
          b.appendChild(cdText);
          const tag = skillDef.type === 'aoe' ? '범위기' : '단일기';
          b.title = lv > 0
            ? `${skillDef.name} Lv.${lv} (${tag})`
            : `${skillDef.name} — 미습득 (${tag}, 요구 스탠스 Lv.${skillDef.reqLevel})`;
          b.addEventListener('click', () => this.onSkillPress && this.onSkillPress(slotIndex, i));
        }
        hotbar.appendChild(b);
      });

      slot.appendChild(portrait); slot.appendChild(info); slot.appendChild(modes); slot.appendChild(hotbar);
      wrap.appendChild(slot);
    });
    this.refreshPartyHUD();
  }

  refreshPartyHUD() {
    const slots = document.querySelectorAll('.party-slot');
    this.pm.partyUnits.forEach((unit, i) => {
      const slot = slots[i];
      if (!slot) return;
      slot.classList.toggle('active-slot', i === this.pm.activeIndex);
      slot.querySelector('.bar-fill.hp').style.width = `${clamp(unit.hp / unit.maxHp, 0, 1) * 100}%`;
      slot.querySelector('.bar-fill.mp').style.width = `${clamp(unit.mp / unit.maxMp, 0, 1) * 100}%`;
      slot.querySelector('.hp-text').textContent = `${Math.ceil(unit.hp)}/${unit.maxHp}`;
      slot.querySelector('.mp-text').textContent = `${Math.ceil(unit.mp)}/${unit.maxMp}`;
      slot.querySelector('.name-lv').textContent = `${unit.name} ${rankLabel(unit.level)}`;
      const xpFill = slot.querySelector('.bar-fill.xp');
      xpFill.style.width = `${clamp(unit.xp / xpToNextLevel(unit.level), 0, 1) * 100}%`;
      xpFill.parentElement.title = `EXP ${Math.floor(unit.xp)}/${xpToNextLevel(unit.level)}`;

      const st = unit.stanceState;
      const sxpFill = slot.querySelector('.bar-fill.sxp');
      sxpFill.style.width = `${clamp(st.xp / stanceXpToNext(st.level), 0, 1) * 100}%`;
      sxpFill.parentElement.title = `${unit.stance.name} 스탠스 Lv.${st.level} — ${Math.floor(st.xp)}/${stanceXpToNext(st.level)} (포인트 ${st.points})`;
      slot.querySelector('.sxp-text').textContent = `${unit.stance.name} Lv.${st.level}${st.points > 0 ? ` · SP${st.points}` : ''}`;
      slot.querySelectorAll('.auto-modes button').forEach((b) => {
        b.classList.toggle('on', b.dataset.mode === unit.autoMode);
      });
      slot.classList.toggle('downed', !!unit.downed);

      // 스킬 쿨다운 게이지 / MP 부족 표시
      slot.querySelectorAll('.skill-btn[data-skill]').forEach((b) => {
        const skillId = b.dataset.skill;
        const def = ROLE_SKILLS_DATA[unit.attackType][skillId];
        const remain = unit.skillCooldowns[skillId] || 0;
        const mask = b.querySelector('.cd-mask');
        const text = b.querySelector('.cd-text');
        if (!mask || !def) return;
        mask.style.height = `${clamp(remain / def.cooldownMs, 0, 1) * 100}%`;
        text.textContent = remain > 0 ? Math.ceil(remain / 1000) : '';
        b.classList.toggle('no-mp', remain <= 0 && unit.mp < def.manaCost);
      });
    });
    document.getElementById('gold-amount').textContent = this.pm.gold;
    document.getElementById('zone-label').textContent = `${this.zm.name} (권장 Lv.${this.zm.def.level})`;
  }

  // ---------- 캐릭터 정보 ----------
  _switchCharTab(tabId) {
    this.activeCharTab = tabId;
    document.querySelectorAll('#char-info-window .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('#char-info-window .tab-panel').forEach((p) => p.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  }

  refreshCharInfo() {
    const unit = this.pm.activeUnit;
    if (!unit) return;
    this._renderEquipTab(unit);
    this._renderStanceSkillTab(unit);
    this._renderEquipPresetTab(unit);
  }

  _renderEquipTab(unit) {
    const sheet = computeFullSheet(unit);
    document.getElementById('tab-equip').innerHTML = `
      <div style="margin-bottom:8px;font-size:13px;">${unit.name} <span style="opacity:0.6">(${unit.className})</span> — ${rankLabel(unit.level)}</div>
      <div class="section-title">기본 스탯</div>
      <div class="stat-grid">
        <div class="row"><span>힘</span><span>${sheet.base.str}</span></div>
        <div class="row"><span>민첩</span><span>${sheet.base.agi}</span></div>
        <div class="row"><span>체력</span><span>${sheet.base.vit}</span></div>
        <div class="row"><span>기술</span><span>${sheet.base.skl}</span></div>
        <div class="row"><span>지능</span><span>${sheet.base.int}</span></div>
        <div class="row"><span>감각</span><span>${sheet.base.sen}</span></div>
      </div>
      <div class="section-title">공격능력</div>
      <div class="stat-grid">
        <div class="row"><span>공격등급</span><span>${sheet.attack.attackGrade}</span></div>
        <div class="row"><span>공격력</span><span>${sheet.attack.attackPower}</span></div>
        <div class="row"><span>관통력</span><span>${sheet.attack.penetration}</span></div>
        <div class="row"><span>크리티컬</span><span>${sheet.attack.critChance}%</span></div>
        <div class="row"><span>크리대미지</span><span>${sheet.attack.critDamage}%</span></div>
        <div class="row"><span>명중률</span><span>${sheet.attack.accuracy}</span></div>
        <div class="row"><span>방어력무시</span><span>${sheet.attack.defenseIgnore}</span></div>
        <div class="row"><span>공격속도</span><span>${sheet.attack.attackSpeed}</span></div>
        <div class="row"><span>캐스팅속도</span><span>${sheet.attack.castSpeed}</span></div>
      </div>
      <div class="section-title">방어능력</div>
      <div class="stat-grid">
        <div class="row"><span>방어등급</span><span>${sheet.defense.defenseGrade}</span></div>
        <div class="row"><span>방어력</span><span>${sheet.defense.defense}</span></div>
        <div class="row"><span>상태이상저항</span><span>${sheet.defense.statusResist}</span></div>
        <div class="row"><span>면역도</span><span>${sheet.defense.immunity}</span></div>
      </div>
      <div class="section-title">파티 시너지</div>
      ${(this.pm.activeSynergies || []).length
        ? (this.pm.activeSynergies || []).map((s) => `<div class="syn-row"><b>${s.name}</b><span>${s.desc}</span></div>`).join('')
        : '<p style="opacity:0.6;font-size:11px;">활성화된 시너지가 없습니다. 파티 구성을 바꿔보세요.</p>'}
      <div class="section-title">장비 (${ARMOR_CLASS_LABEL[unit.armorClass]} 착용)</div>
      <div class="equip-list">
        ${EQUIP_SLOTS.map((slot) => {
          const gear = unit.equipment[slot];
          const stat = gear ? (gear.item.atk ? `공격 +${gear.atk}` : `방어 +${gear.def}`) : '';
          return `
            <div class="equip-row">
              <span class="equip-slot-name">${SLOT_LABEL[slot]}</span>
              <span class="equip-item">${gear ? gear.displayName : '<span style="opacity:0.45">비어 있음</span>'}</span>
              <span class="equip-stat">${stat}</span>
              ${gear ? `<button data-unequip="${slot}">해제</button>` : ''}
            </div>`;
        }).join('')}
      </div>
      <div class="section-title">보유 장비</div>
      ${this._ownedEquipHtml(unit)}
    `;

    const panel = document.getElementById('tab-equip');
    panel.querySelectorAll('button[data-unequip]').forEach((b) => {
      b.addEventListener('click', () => this.onUnequip && this.onUnequip(b.dataset.unequip));
    });
    panel.querySelectorAll('button[data-equip]').forEach((b) => {
      b.addEventListener('click', () => this.onEquip && this.onEquip(b.dataset.equip, b.dataset.slot || null));
    });
  }

  _ownedEquipHtml(unit) {
    const owned = this.pm.gear;
    if (owned.length === 0) return '<p style="opacity:0.6;font-size:11px;">보관 중인 장비가 없습니다.</p>';
    return owned.map((gear) => {
      const ok = unit.canEquip(gear.itemId);
      const why = gear.slot === 'weapon'
        ? `${STANCE_DATA[gear.stanceId].name} 스탠스 필요`
        : `${ARMOR_CLASS_LABEL[gear.armorClass]} 전용`;
      const buttons = !ok ? `<span class="equip-stat" style="color:#e74c3c">${why}</span>`
        : (gear.slot === 'weapon'
          ? `<button data-equip="${gear.uid}" data-slot="weapon1">주무기</button><button data-equip="${gear.uid}" data-slot="weapon2">보조</button>`
          : `<button data-equip="${gear.uid}">장착</button>`);
      return `
        <div class="equip-row">
          <span class="equip-item">${gear.displayName} <span class="tier-badge">T${gear.tier}</span></span>
          <span class="equip-stat">${gear.item.atk ? `공격 +${gear.atk}` : `방어 +${gear.def}`}</span>
          ${buttons}
        </div>`;
    }).join('');
  }

  _renderStanceSkillTab(unit) {
    const el = document.getElementById('tab-stance-skill');
    const available = unit.availableStances;
    const chips = available.map((sid) => {
      const s = STANCE_DATA[sid];
      const p = unit.stanceProgress[sid];
      return `<div class="stance-chip ${sid === unit.currentStanceId ? 'current' : ''}" data-stance="${sid}">${s.name} Lv.${p.level}${p.points > 0 ? ` (SP${p.points})` : ''}</div>`;
    }).join('');
    const lockedChips = unit.stanceIds.filter((sid) => !available.includes(sid)).map((sid) => {
      const item = ITEM_DATA[STARTER_WEAPON_BY_STANCE[sid]];
      return `<div class="stance-chip locked" title="${item ? item.name : ''} 계열 무기를 장착해야 사용">🔒 ${STANCE_DATA[sid].name}</div>`;
    }).join('');

    const st = unit.stanceState;
    const xpPct = clamp(st.xp / stanceXpToNext(st.level), 0, 1) * 100;

    const skills = unit.stance.skillIds.map((skid) => {
      const sk = ROLE_SKILLS_DATA[unit.attackType][skid];
      const lv = unit.skillLevel(skid);
      const canUp = unit.canUpgradeSkill(skid);
      const tag = sk.type === 'aoe' ? '<span class="tag aoe">범위기</span>' : '<span class="tag single">단일기</span>';
      const locked = st.level < sk.reqLevel;
      const power = lv > 0 ? `${skillDamageMult(sk, lv).toFixed(2)}x` : `${sk.dmgMult}x`;
      const btnLabel = lv === 0 ? '습득' : (lv >= MAX_SKILL_LEVEL ? 'MAX' : '레벨업');
      return `
        <div class="skill-row ${locked ? 'locked' : ''}">
          <div class="skill-main">
            <div>${tag} ${sk.name} ${lv > 0 ? `<b>Lv.${lv}</b>` : '<span style="opacity:0.6">미습득</span>'}</div>
            <div class="skill-meta">위력 ${power} · MP ${sk.manaCost} · 쿨 ${(sk.cooldownMs / 1000).toFixed(1)}s · 요구 스탠스 Lv.${sk.reqLevel}</div>
          </div>
          <button data-skill="${skid}" ${canUp ? '' : 'disabled'}>${btnLabel}</button>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="section-title">사용 가능 스탠스 — 장착 무기로 결정 (클릭 전환, 단축키 V)</div>
      <div class="stance-list">${chips}${lockedChips}</div>
      <div class="section-title">${unit.stance.name} 스탠스 Lv.${st.level} · 스킬포인트 ${st.points}</div>
      <div class="bar-bg" style="height:10px;margin-bottom:4px;"><div class="bar-fill sxp" style="width:${xpPct}%"></div></div>
      <div style="font-size:10px;opacity:0.7;margin-bottom:8px;">스탠스 EXP ${Math.floor(st.xp)} / ${stanceXpToNext(st.level)} — 사냥으로 획득, 레벨업 시 스킬포인트 +1</div>
      ${skills}
    `;

    el.querySelectorAll('.stance-chip[data-stance]').forEach((chip) => {
      chip.addEventListener('click', () => {
        unit.currentStanceIndex = unit.availableStances.indexOf(chip.dataset.stance);
        this.rebuildPartySlots();
        this.refreshCharInfo();
      });
    });
    el.querySelectorAll('button[data-skill]').forEach((btn) => {
      btn.addEventListener('click', () => this.onSkillUpgrade && this.onSkillUpgrade(btn.dataset.skill));
    });
  }

  _renderEquipPresetTab() {
    document.getElementById('tab-equip-preset').innerHTML = `
      <div class="section-title">장비교체등록 (프리셋)</div>
      <p style="opacity:0.7;">장비 아이템 시스템은 아직 범위 밖입니다. 프리셋 슬롯 UI 골격만 배치되어 있습니다.</p>
      <div class="equip-slots">${[1, 2, 3, 4].map((n) => `<div class="equip-slot" title="프리셋 ${n}">P${n}</div>`).join('')}</div>
    `;
  }

  // ---------- 텔레포트 ----------
  refreshTeleport() {
    const el = document.getElementById('teleport-list');
    const rows = ZONE_DATA
      .map((z, i) => ({ z, i }))
      .sort((a, b) => a.z.level - b.z.level || a.i - b.i)
      .map(({ z, i }) => {
        const isCurrent = i === this.zm.index;
        return `
          <div class="tp-row ${isCurrent ? 'current' : ''}">
            <span class="tp-type ${z.type}">${z.type === 'town' ? '마을' : '사냥터'}</span>
            <span class="tp-name">${z.name}</span>
            <span class="tp-lv">Lv.${z.level}+</span>
            <button data-zone="${i}" ${isCurrent ? 'disabled' : ''}>${isCurrent ? '현재' : '이동'}</button>
          </div>`;
      }).join('');
    el.innerHTML = rows;
    el.querySelectorAll('button[data-zone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.onTeleport) this.onTeleport(parseInt(btn.dataset.zone, 10));
        this.refreshTeleport();
      });
    });
  }

  // ---------- 병영 ----------
  refreshBarracks() {
    const partyEl = document.getElementById('barracks-party');
    const slots = [];
    for (let i = 0; i < MAX_PARTY; i++) {
      const u = this.pm.partyUnits[i];
      slots.push(u ? `
        <div class="b-party-member">
          <div style="width:28px;height:28px;border-radius:4px;background:${u.color};margin:0 auto 4px;"></div>
          ${u.name}<br/>${rankLabel(u.level)}
          <div style="margin-top:4px;opacity:0.6;">슬롯 ${i + 1}</div>
        </div>` : `
        <div class="b-party-member" style="opacity:0.4;">
          <div style="width:28px;height:28px;border-radius:4px;background:#333;margin:0 auto 4px;"></div>
          (비어있음)<div style="margin-top:4px;opacity:0.6;">슬롯 ${i + 1}</div>
        </div>`);
    }
    partyEl.innerHTML = slots.join('');

    this._renderBarracksCreate();

    const listEl = document.getElementById('barracks-list');
    const ids = this.pm.barracksIds;
    listEl.innerHTML = ids.length ? ids.map((id) => {
      const u = this.pm.units.get(id);
      return `
        <div class="barracks-row">
          <div style="width:20px;height:20px;border-radius:3px;background:${u.color};"></div>
          <div class="b-name">${u.name} — ${rankLabel(u.level)} (${u.attackType})</div>
          <button data-swap="${id}" data-slot="0">슬롯1</button>
          <button data-swap="${id}" data-slot="1">슬롯2</button>
          <button data-swap="${id}" data-slot="2">슬롯3</button>
        </div>`;
    }).join('') : '<p style="opacity:0.6;">대기 중인 캐릭터가 없습니다. 마을 NPC의 영입 퀘스트로 동료를 모으세요.</p>';

    listEl.querySelectorAll('button[data-swap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.onSwapRequest) this.onSwapRequest(btn.dataset.swap, parseInt(btn.dataset.slot, 10));
        this.rebuildPartySlots();
        this.refreshBarracks();
      });
    });
  }

  // 병영에서 기본 클래스 캐릭터를 직접 만들고 내보낸다(최대 3명).
  _renderBarracksCreate() {
    const el = document.getElementById('barracks-create');
    const owned = this.pm.playerCharacters;
    const full = owned.length >= MAX_PLAYER_CHARS;

    el.innerHTML = `
      <div class="section-title">기본 캐릭터 (${owned.length}/${MAX_PLAYER_CHARS})</div>
      <div class="bc-owned">
        ${owned.map((u) => `
          <div class="bc-row">
            <span style="width:14px;height:14px;border-radius:3px;background:${u.color};display:inline-block;"></span>
            <span class="bc-name">${u.name} <span style="opacity:0.6">(${u.className} ${rankLabel(u.level)})</span></span>
            <button data-dismiss="${u.id}">내보내기</button>
          </div>`).join('') || '<p style="opacity:0.6;font-size:11px;">보유한 기본 캐릭터가 없습니다.</p>'}
      </div>
      <div class="bc-form">
        <select id="bc-class" ${full ? 'disabled' : ''}>
          ${CLASS_DATA.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <input id="bc-nick" type="text" maxlength="12" placeholder="닉네임" ${full ? 'disabled' : ''} />
        <button id="bc-create" ${full ? 'disabled' : ''}>${full ? '보유 한도 초과' : '생성'}</button>
      </div>
    `;

    el.querySelectorAll('button[data-dismiss]').forEach((b) => {
      b.addEventListener('click', () => this.onDismiss && this.onDismiss(b.dataset.dismiss));
    });
    const nickInput = el.querySelector('#bc-nick');
    if (nickInput) nickInput.addEventListener('keydown', (e) => e.stopPropagation());
    const createBtn = el.querySelector('#bc-create');
    if (createBtn && !full) {
      createBtn.addEventListener('click', () => {
        const nickname = nickInput.value.trim();
        if (!nickname) return;
        if (this.onCreateInBarracks) this.onCreateInBarracks(el.querySelector('#bc-class').value, nickname);
      });
    }
  }

  // ---------- 의뢰 게시판 ----------
  openBoard() {
    this.refreshBoard();
    document.getElementById('board-window').classList.remove('hidden');
  }

  refreshBoard() {
    const gq = this.gq;
    const townId = this.zm.def.id;
    const partyLevel = Math.max(...this.pm.partyUnits.map((u) => u.level), 1);
    document.getElementById('board-title').textContent = `${this.zm.name} — 의뢰 게시판`;

    const list = gq.availableIn(townId, partyLevel);
    const locked = GENERAL_QUEST_DATA.filter((q) => q.town === townId && partyLevel < q.minLevel);

    const rows = list.map((def) => {
      const quest = gq.find(def.id);
      const cleared = gq.clearCount(def.id);
      let action; let status;
      if (!quest) {
        status = `<span class="q-meta">Lv.${def.minLevel}+ · 보상 ${def.reward.gold.toLocaleString()}G, ${def.reward.items.map((i) => `${ITEM_DATA[i.id].name} x${i.count}`).join(', ')}</span>`;
        action = `<button data-board-accept="${def.id}">수주</button>`;
      } else if (gq.isReady(quest)) {
        status = '<span class="q-done">완료 — 보상 수령 가능</span>';
        action = `<button class="primary" data-board-claim="${def.id}">보상 받기</button>`;
      } else {
        const step = gq.currentStep(quest);
        status = `<span class="q-prog">${gq.stepText(quest)}</span>`;
        action = step.type === 'deliver'
          ? `<button data-board-deliver="${def.id}">납품</button><button data-board-abandon="${def.id}">포기</button>`
          : `<button data-board-abandon="${def.id}">포기</button>`;
      }
      return `
        <div class="q-row ${quest ? 'q-active' : ''}">
          <div class="q-main">
            <div class="q-title">${def.title}${cleared > 0 ? `<span class="q-count">${cleared}회 완료</span>` : ''}</div>
            <div class="q-desc">${def.desc}</div>
            ${status}
          </div>
          <div class="q-btns">${action}</div>
        </div>`;
    }).join('');

    const lockedRows = locked.map((def) => `
      <div class="q-row locked">
        <div class="q-main">
          <div class="q-title">${def.title}</div>
          <div class="q-desc">🔒 파티 최고 레벨 ${def.minLevel} 이상 필요</div>
        </div>
      </div>`).join('');

    document.getElementById('board-body').innerHTML = `
      <div class="q-hint">수주한 의뢰는 퀘스트 창(J)에서도 진행도를 볼 수 있습니다. 동시 수주 최대 ${MAX_ACTIVE_GENERAL}개.</div>
      ${rows || '<p style="opacity:0.6;">지금 받을 수 있는 의뢰가 없습니다.</p>'}
      ${lockedRows}
    `;

    const bind = (attr, cb) => document.querySelectorAll(`[data-${attr}]`).forEach((b) => {
      b.addEventListener('click', () => cb(b.dataset[attr.replace(/-(.)/g, (m, c) => c.toUpperCase())]));
    });
    bind('board-accept', (id) => this.onBoardAccept && this.onBoardAccept(id));
    bind('board-claim', (id) => this.onBoardClaim && this.onBoardClaim(id));
    bind('board-deliver', (id) => this.onBoardDeliver && this.onBoardDeliver(id));
    bind('board-abandon', (id) => this.onBoardAbandon && this.onBoardAbandon(id));
  }

  // ---------- 가문 특성 ----------
  refreshFamily() {
    const fm = this.fm;
    const pct = clamp(fm.xp / familyXpToNext(fm.level), 0, 1) * 100;
    document.getElementById('family-header').innerHTML = `
      <div class="fam-top">
        <span class="fam-level">가문 Lv.${fm.level}<span style="opacity:0.5">/${FAMILY_MAX_LEVEL}</span></span>
        <span class="fam-points">남은 포인트 <b>${fm.freePoints}</b> / ${fm.totalPoints}</span>
        <button id="fam-reset">전체 회수</button>
      </div>
      <div class="bar-bg" style="height:9px;"><div class="bar-fill xp" style="width:${pct}%"></div></div>
      <div class="fam-hint">캐릭터가 레벨업하면 가문 경험치가 쌓이고, 가문 레벨 1당 포인트 1개를 얻습니다. 효과는 모든 캐릭터에 적용됩니다.</div>
    `;

    const tree = [1, 2, 3].map((tier) => {
      const rows = FAMILY_TRAITS.filter((t) => t.tier === tier).map((t) => {
        const pts = fm.allocations[t.id];
        const unlocked = fm.isUnlocked(t);
        const reason = fm.lockReason(t);
        return `
          <div class="fam-row ${unlocked ? '' : 'locked'}">
            <div class="fam-main">
              <div class="fam-name">${t.name} <b>${pts}/${t.max}</b></div>
              <div class="fam-eff">${pts > 0 ? familyTraitEffectText(t, pts) : `1포인트당 ${familyTraitEffectText(t, 1)}`}</div>
              ${unlocked ? '' : `<div class="fam-lock">🔒 ${reason}</div>`}
            </div>
            <div class="fam-btns">
              <button data-fam-down="${t.id}" ${pts > 0 ? '' : 'disabled'}>−</button>
              <button data-fam-up="${t.id}" ${fm.canInvest(t) ? '' : 'disabled'}>+</button>
            </div>
          </div>`;
      }).join('');
      return `<div class="section-title">${FAMILY_TIER_LABEL[tier]} <span style="opacity:0.5;font-size:10px">(투자 ${fm.pointsInTier(tier)}p)</span></div>${rows}`;
    }).join('');
    document.getElementById('family-tree').innerHTML = tree;

    document.getElementById('fam-reset').addEventListener('click', () => this.onFamilyReset && this.onFamilyReset());
    document.querySelectorAll('[data-fam-up]').forEach((b) => {
      b.addEventListener('click', () => this.onFamilyInvest && this.onFamilyInvest(b.dataset.famUp));
    });
    document.querySelectorAll('[data-fam-down]').forEach((b) => {
      b.addEventListener('click', () => this.onFamilyRefund && this.onFamilyRefund(b.dataset.famDown));
    });
  }

  // ---------- 퀘스트 ----------
  refreshQuest() {
    const el = document.getElementById('quest-content');
    const active = this.qm.active;
    const list = active.length ? active.map((q) => {
      const ready = this.qm.isReady(q);
      return `
        <div class="skill-row">
          <div class="skill-main">
            <div>${q.charName} 영입 <span style="opacity:0.6">(${Math.min(q.stepIndex + 1, q.steps.length)}/${q.steps.length}단계)</span></div>
            <div class="skill-meta" style="color:${ready ? '#2ecc71' : '#f1c40f'}">${ready ? '완료 — NPC에게 돌아가기' : this.qm.stepText(q)}</div>
          </div>
        </div>`;
    }).join('') : '<p style="opacity:0.6;">진행 중인 퀘스트가 없습니다. 마을의 NPC(노란 테두리)를 클릭해 영입 퀘스트를 받으세요.</p>';

    const ch = this.sm.chapter;
    const chapterList = SCENARIO_DATA.map((c) => {
      const state = c.chapter < ch.chapter || this.sm.finished ? '완료'
        : (c.chapter === ch.chapter ? '진행중' : '미개방');
      const color = state === '완료' ? '#2ecc71' : (state === '진행중' ? '#f1c40f' : '#777');
      return `<div class="skill-row"><span>챕터 ${c.chapter} — ${c.title}</span><span style="color:${color}">${state}</span></div>`;
    }).join('');

    el.innerHTML = `
      <div class="section-title">시나리오 — 챕터 ${ch.chapter} "${ch.title}"</div>
      <p style="color:#f1c40f;">현재 목표: ${this.sm.objectiveText()}</p>
      ${chapterList}
      <div class="section-title">진행 중인 일반 의뢰</div>
      ${this.gq.active.length
        ? this.gq.active.map((q) => {
          const def = this.gq.def(q.id);
          const ready = this.gq.isReady(q);
          return `<div class="skill-row"><span>${def.title}</span><span style="color:${ready ? '#2ecc71' : '#ccc'}">${this.gq.stepText(q)}</span></div>`;
        }).join('')
        : '<p style="opacity:0.6;">수주한 의뢰가 없습니다. 마을 게시판에서 받으세요.</p>'}
      <div class="section-title">진행 중인 영입 퀘스트</div>
      ${list}
      <div class="section-title">현황</div>
      <p>총 처치 수: ${this.qm.totalKills} · 영입 완료: ${this.qm.completed.size}명 / ${CHARACTER_DATA.length}명</p>
      <p style="opacity:0.6;font-size:11px;">완료 조건을 채운 뒤 퀘스트를 준 마을 NPC에게 돌아가 클릭하면 영입됩니다.</p>
    `;
  }

  // ---------- 인벤토리 ----------
  refreshInventory() {
    const grid = document.getElementById('inventory-grid');
    const entries = [...this.pm.items.entries()].filter(([, c]) => c > 0);
    if (entries.length === 0) {
      grid.innerHTML = '<p style="opacity:0.6;font-size:12px;">비어 있습니다. 몬스터를 잡으면 잡템이 나옵니다.</p>';
      return;
    }
    const total = entries.reduce((s, [id, c]) => s + ITEM_DATA[id].price * c, 0);
    const unit = this.pm.activeUnit;
    grid.innerHTML = `
      <div class="inv-list">
        ${entries.map(([id, c]) => {
          const it = ITEM_DATA[id];
          const useBtn = it.consumable ? `<button data-use="${id}">사용</button>` : '';
          return `<div class="inv-row"><span>${it.name}</span><span style="opacity:0.7">x${c}</span><span style="color:#f1c40f">${it.price * c}G</span>${useBtn}</div>`;
        }).join('')}
      </div>
      <div style="margin-top:8px;font-size:11px;opacity:0.75;">
        총 판매가치 ${total}G · 물약 사용 대상: <b>${unit ? unit.name : '-'}</b> (Tab으로 변경)
      </div>`;
    grid.querySelectorAll('button[data-use]').forEach((b) => {
      b.addEventListener('click', () => this.onUsePotion && this.onUsePotion(b.dataset.use));
    });
  }

  // 강화·인챈트 탭: 현재 조작 캐릭터의 장착 장비 + 보관 장비를 모두 다룬다.
  _renderEnhanceTab(body) {
    const unit = this.pm.activeUnit;
    const entries = [
      ...unit.equippedList().map(({ slot, gear }) => ({ gear, where: SLOT_LABEL[slot] })),
      ...this.pm.gear.map((gear) => ({ gear, where: '보관' })),
    ];
    if (entries.length === 0) { body.innerHTML = '<p style="opacity:0.6;">강화할 장비가 없습니다.</p>'; return; }

    body.innerHTML = entries.map(({ gear, where }) => {
      const eCost = enhanceCost(gear.item, gear.plus);
      const cCost = enchantCost(gear.item);
      const rate = Math.round(enhanceChance(gear.plus) * 100);
      const matText = (cost) => cost.materials.map((m) => {
        const have = this.pm.itemCount(m.id);
        return `<span style="color:${have >= m.count ? '#2ecc71' : '#e74c3c'}">${ITEM_DATA[m.id].name} ${have}/${m.count}</span>`;
      }).join(', ');
      const maxed = gear.plus >= MAX_ENHANCE;
      return `
        <div class="shop-row">
          <span class="shop-name">
            ${gear.displayName} <span class="tier-badge">T${gear.tier}</span> <span style="opacity:0.55">${where}</span>
            <div class="shop-meta">${gear.item.atk ? `공격 +${gear.atk}` : `방어 +${gear.def}`}${gear.critBonus ? ` · 크리 +${gear.critBonus}` : ''}${gear.hpPct ? ` · HP +${Math.round(gear.hpPct * 100)}%` : ''}</div>
            <div class="shop-meta">강화 ${maxed ? 'MAX' : `성공 ${rate}% · ${eCost.gold}G · ${matText(eCost)}`}</div>
            <div class="shop-meta">인챈트 ${cCost.gold}G · ${matText(cCost)}</div>
          </span>
          <span class="enh-btns">
            <button data-enhance="${gear.uid}" ${maxed || !this.pm.canAfford(eCost) ? 'disabled' : ''}>강화</button>
            <button data-enchant="${gear.uid}" ${this.pm.canAfford(cCost) ? '' : 'disabled'}>인챈트</button>
          </span>
        </div>`;
    }).join('');

    body.querySelectorAll('button[data-enhance]').forEach((b) => {
      b.addEventListener('click', () => this.onEnhance && this.onEnhance(b.dataset.enhance));
    });
    body.querySelectorAll('button[data-enchant]').forEach((b) => {
      b.addEventListener('click', () => this.onEnchant && this.onEnchant(b.dataset.enchant));
    });
  }

  // ---------- 상점 ----------
  openShop(npc) {
    this.shopTab = this.shopTab || 'sell';
    document.getElementById('shop-title').textContent = npc.name;
    this.refreshShop();
    document.getElementById('shop-window').classList.remove('hidden');
  }

  refreshShop() {
    document.getElementById('shop-gold').innerHTML = `보유 골드 <b style="color:#f1c40f">${this.pm.gold}G</b>`;
    document.querySelectorAll('#shop-window .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.shoptab === this.shopTab));
    const body = document.getElementById('shop-body');

    if (this.shopTab === 'sell') {
      const entries = [...this.pm.items.entries()].filter(([id, c]) => c > 0 && ITEM_DATA[id].price > 0);
      const matRows = entries.map(([id, c]) => {
        const it = ITEM_DATA[id];
        return `
          <div class="shop-row">
            <span class="shop-name">${it.name} <span style="opacity:0.6">x${c}</span></span>
            <span style="color:#f1c40f">${it.price}G</span>
            <button data-sell="${id}" data-count="1">1개</button>
            <button data-sell="${id}" data-count="${c}">전부</button>
          </div>`;
      }).join('');
      const gearRows = this.pm.gear.map((g) => `
          <div class="shop-row">
            <span class="shop-name">${g.displayName} <span class="tier-badge">T${g.tier}</span></span>
            <span style="color:#f1c40f">${g.sellPrice}G</span>
            <button data-sellgear="${g.uid}">판매</button>
          </div>`).join('');
      body.innerHTML = (matRows + gearRows) || '<p style="opacity:0.6;">팔 물건이 없습니다.</p>';
      body.querySelectorAll('button[data-sell]').forEach((b) => {
        b.addEventListener('click', () => this.onSell && this.onSell(b.dataset.sell, parseInt(b.dataset.count, 10)));
      });
      body.querySelectorAll('button[data-sellgear]').forEach((b) => {
        b.addEventListener('click', () => this.onSellGear && this.onSellGear(b.dataset.sellgear));
      });
    } else if (this.shopTab === 'enhance') {
      this._renderEnhanceTab(body);
    } else if (this.shopTab === 'buy') {
      body.innerHTML = SHOP_STOCK.map((id) => {
        const it = ITEM_DATA[id];
        const cost = it.buyPrice || it.price;
        return `
          <div class="shop-row">
            <span class="shop-name">${it.name}</span>
            <span style="color:#f1c40f">${cost}G</span>
            <button data-buy="${id}" ${this.pm.gold < cost ? 'disabled' : ''}>구매</button>
          </div>`;
      }).join('');
      body.querySelectorAll('button[data-buy]').forEach((b) => {
        b.addEventListener('click', () => this.onBuy && this.onBuy(b.dataset.buy));
      });
    } else {
      const unit = this.pm.activeUnit;
      this.craftFilter = this.craftFilter || 'weapon';
      // 장비 제작은 현재 조작 캐릭터가 장착할 수 있는 것만 보여준다(목록 폭주 방지).
      const recipes = RECIPE_DATA.filter((r) => {
        const out = ITEM_DATA[r.result];
        if (this.craftFilter === 'etc') return !r.equipment;
        if (!r.equipment) return false;
        if (this.craftFilter === 'weapon') return out.slot === 'weapon' && unit.canEquip(r.result);
        return out.slot !== 'weapon' && unit.canEquip(r.result);
      }).sort((a, b) => a.tier - b.tier);

      const filters = [['weapon', '무기'], ['armor', '방어구'], ['etc', '기타']]
        .map(([id, label]) => `<button class="craft-filter ${this.craftFilter === id ? 'on' : ''}" data-filter="${id}">${label}</button>`).join('');

      body.innerHTML = `<div class="craft-filters">${filters}<span class="craft-hint">${unit.name} 기준</span></div>` + recipes.map((r) => {
        const out = ITEM_DATA[r.result];
        const mats = r.materials.map((m) => {
          const have = this.pm.itemCount(m.id);
          const ok = have >= m.count;
          return `<span style="color:${ok ? '#2ecc71' : '#e74c3c'}">${ITEM_DATA[m.id].name} ${have}/${m.count}</span>`;
        }).join(', ');
        const power = out.atk ? `공격 +${out.atk}` : (out.def ? `방어 +${out.def}` : '');
        return `
          <div class="shop-row">
            <span class="shop-name">${out.name} ${r.equipment ? `<span class="tier-badge">T${r.tier}</span>` : ''}
              <div class="shop-meta">${power ? `${power} · ` : ''}${mats} · ${r.gold}G</div></span>
            <button data-craft="${r.id}" ${this.pm.canCraft(r) ? '' : 'disabled'}>제작</button>
          </div>`;
      }).join('') || '<p style="opacity:0.6;">해당 분류에 제작 가능한 항목이 없습니다.</p>';

      body.querySelectorAll('button[data-craft]').forEach((b) => {
        b.addEventListener('click', () => this.onCraft && this.onCraft(b.dataset.craft));
      });
      body.querySelectorAll('.craft-filter').forEach((b) => {
        b.addEventListener('click', () => { this.craftFilter = b.dataset.filter; this.refreshShop(); });
      });
    }
  }

  // ---------- NPC 영입 퀘스트 창 ----------
  showNpcDialogue(npc) {
    this.currentNpc = npc;
    const textEl = document.getElementById('npc-dialogue-text');
    const actionsEl = document.getElementById('npc-dialogue-actions');
    const def = npc.charDef;
    const role = { melee: '근접', ranged: '원거리', magic: '마법' }[def.attackType];
    const stances = def.stanceIds.map((s) => STANCE_DATA[s].name).join(' / ');
    document.getElementById('npc-dialogue-name').textContent = `${def.name} — 영입 퀘스트`;

    const already = this.pm.units.has(npc.charId);
    const quest = this.qm.find(npc.charId);
    let body = `<div style="color:${def.color};font-weight:bold;">${def.name}</div>
      <div style="font-size:11px;opacity:0.8;margin-bottom:8px;">${role} · ${stances}</div>`;
    actionsEl.innerHTML = '';

    if (already) {
      body += '이미 우리 편이다. 병영(B)에서 파티에 넣을 수 있다.';
    } else if (!quest) {
      const steps = makeRecruitSteps(npc.tier, def.name);
      body += `"함께 가려면 내 시험을 통과해야 한다. ${steps.length}단계다."
        <ol class="quest-steps">${steps.map((s) => `<li>${s.text}</li>`).join('')}</ol>`;
      const accept = document.createElement('button');
      accept.className = 'primary';
      accept.textContent = '퀘스트 수락';
      accept.addEventListener('click', () => {
        if (this.onQuestAccept) this.onQuestAccept(npc);
        this.showNpcDialogue(npc);
      });
      actionsEl.appendChild(accept);
    } else if (this.qm.isReady(quest)) {
      body += '"훌륭하군. 약속대로 너희와 함께하겠다."<br/><span style="color:#2ecc71">모든 단계 완료</span>';
      const done = document.createElement('button');
      done.className = 'primary';
      done.textContent = '영입하기';
      done.addEventListener('click', () => {
        if (this.onQuestComplete) this.onQuestComplete(npc.charId);
        this.showNpcDialogue(npc);
      });
      actionsEl.appendChild(done);
    } else {
      const step = this.qm.currentStep(quest);
      body += `"아직 남았다."
        <ol class="quest-steps">${quest.steps.map((s, i) => {
          const state = i < quest.stepIndex ? '✔' : (i === quest.stepIndex ? '▶' : '·');
          const color = i < quest.stepIndex ? '#2ecc71' : (i === quest.stepIndex ? '#f1c40f' : '#777');
          return `<li style="color:${color}">${state} ${i === quest.stepIndex ? this.qm.stepText(quest) : s.text}</li>`;
        }).join('')}</ol>`;
      if (step.type === 'deliver') {
        const deliver = document.createElement('button');
        deliver.className = 'primary';
        deliver.textContent = `${ITEM_DATA[step.itemId].name} 납품`;
        deliver.disabled = this.pm.itemCount(step.itemId) < step.count;
        deliver.addEventListener('click', () => {
          if (this.onDeliver) this.onDeliver(npc.charId);
          this.showNpcDialogue(npc);
        });
        actionsEl.appendChild(deliver);
      }
    }

    const close = document.createElement('button');
    close.textContent = '닫기';
    close.addEventListener('click', () => this.closeWindow('npc-dialogue-window'));
    actionsEl.appendChild(close);

    textEl.innerHTML = body;
    document.getElementById('npc-dialogue-window').classList.remove('hidden');
  }

  // ---------- 시나리오 NPC 대화 ----------
  showStoryDialogue(npc) {
    const textEl = document.getElementById('npc-dialogue-text');
    const actionsEl = document.getElementById('npc-dialogue-actions');
    document.getElementById('npc-dialogue-name').textContent = npc.name;
    actionsEl.innerHTML = '';

    const isTarget = this.sm.isStepNpc(npc.id);
    const ch = this.sm.chapter;
    let body = `<div style="color:#85c1e9;font-weight:bold;">챕터 ${ch.chapter} — ${ch.title}</div>`;

    if (isTarget) {
      body += `<div style="margin:8px 0;">${this.sm.step.line}</div>`;
      const proceed = document.createElement('button');
      proceed.className = 'primary';
      proceed.textContent = '알겠습니다';
      proceed.addEventListener('click', () => {
        if (this.onStoryTalk) this.onStoryTalk(npc.id);
        this.closeWindow('npc-dialogue-window');
      });
      actionsEl.appendChild(proceed);
    } else if (this.sm.finished) {
      body += '<div style="margin:8px 0;">"고생 많았네. 이 땅은 당분간 평화롭겠군."</div>';
    } else {
      body += `<div style="margin:8px 0;opacity:0.85;">"지금은 다른 일이 급하네."</div>
        <div style="font-size:11px;color:#f1c40f;">현재 목표: ${this.sm.objectiveText()}</div>`;
    }

    const close = document.createElement('button');
    close.textContent = '닫기';
    close.addEventListener('click', () => this.closeWindow('npc-dialogue-window'));
    actionsEl.appendChild(close);

    textEl.innerHTML = body;
    document.getElementById('npc-dialogue-window').classList.remove('hidden');
  }

  // ---------- 타겟 바 ----------
  setTarget(enemy) {
    this.target = enemy;
    const bar = document.getElementById('target-bar');
    if (!enemy) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    document.getElementById('target-name').textContent = enemy.name;
  }
  refreshTargetBar() {
    if (this.target) {
      if (!this.target.alive) this.setTarget(null);
      else document.getElementById('target-hp-fill').style.width = `${clamp(this.target.hp / this.target.maxHp, 0, 1) * 100}%`;
    }
    // 보스 전용 체력바: 존에 살아있는 보스가 있으면 상단에 크게 표시
    // 보스가 살아 있고 파티가 교전 범위 안에 있으면 표시
    const leader = this.pm.activeUnit;
    const boss = this.zm.enemies.find((e) => e.boss && e.alive && leader
      && Math.abs((e.x + e.width / 2) - (leader.x + leader.width / 2)) < e.aggroRange);
    const bar = document.getElementById('boss-bar');
    if (!boss) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    document.getElementById('boss-name').textContent = `${boss.name}${boss.enraged ? ' (광폭화)' : ''}`;
    document.getElementById('boss-hp-fill').style.width = `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`;
    document.getElementById('boss-hp-text').textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
    document.getElementById('boss-warn').textContent = boss.phase === 'telegraph' && boss.current ? boss.current.warn : '';
  }

  // ---------- 채팅 ----------
  logChat(text, tag = 'system') {
    this.chatLines.push({ text, tag });
    if (this.chatLines.length > 200) this.chatLines.shift();
    this._renderChatLog();
  }
  _renderChatLog() {
    const el = document.getElementById('chat-log');
    const shown = this.chatLines.filter((l) => this.chatFilter === 'all' || l.tag === this.chatFilter);
    el.innerHTML = shown.map((l) => `<div class="line tag-${l.tag}">${l.text}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  }

  _initChatDrag() {
    const chatWin = document.getElementById('chat-window');
    const handle = document.getElementById('chat-drag-handle');
    const root = document.getElementById('game-root');
    let dragging = false; let offsetX = 0; let offsetY = 0;

    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      const rect = chatWin.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      chatWin.style.left = `${rect.left - rootRect.left}px`;
      chatWin.style.top = `${rect.top - rootRect.top}px`;
      chatWin.style.bottom = 'auto';
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const rootRect = root.getBoundingClientRect();
      const left = clamp(e.clientX - rootRect.left - offsetX, 0, rootRect.width - chatWin.offsetWidth);
      const top = clamp(e.clientY - rootRect.top - offsetY, 0, rootRect.height - chatWin.offsetHeight);
      chatWin.style.left = `${left}px`;
      chatWin.style.top = `${top}px`;
    });
    window.addEventListener('mouseup', () => { dragging = false; });
  }
}
