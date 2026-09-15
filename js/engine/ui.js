// 파티 슬롯별 스킬 단축키: 1번 QWE / 2번 ASD / 3번 ZXC
const SLOT_SKILL_KEYS = [['q', 'w', 'e'], ['a', 's', 'd'], ['z', 'x', 'c']];
// 설정 창의 조작 안내. 하단 힌트바에 다 욱여넣지 않고 여기로 모았다.
const WINDOW_TOP = 62; // 상단 바(56px) 아래에서 창이 시작한다

const KEY_GUIDE = [
  ['← →', '이동'],
  ['↑', '점프 / 포탈 진입'],
  ['공중에서 ↑', '플래시 점프'],
  ['로프 앞 ↑ · ↓', '로프 오르내리기 (←→ 뛰어내리기)'],
  ['↓', '아래층으로 내려가기'],
  ['Space', '기본 공격'],
  ['Q W E', '1번 캐릭터 스킬'],
  ['A S D', '2번 캐릭터 스킬'],
  ['Z X C', '3번 캐릭터 스킬'],
  ['R', '조작 캐릭터의 전용기'],
  ['1 2 3', '무기 세트 교체'],
  ['V', '스탠스 전환'],
  ['Tab', '리더 전환'],
  ['I', '인벤토리'],
  ['Alt + E', '캐릭터 정보'],
  ['J', '퀘스트'],
  ['B', '병영'],
  ['T', '텔레포트'],
  ['F', '가문 특성'],
  ['G', '심연의 탑'],
  ['K', '컬렉션 (몬스터·링크)'],
  ['O', '설정'],
  ['Esc', '창 닫기'],
  ['마우스', 'NPC·게시판·몹 클릭'],
];

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
    this.onSignaturePress = null;
    this.onStarforce = null;
    this.onCube = null;
    this.starProtect = false;
    this.starcatch = null;
    this.enhanceResult = null;
    this._monsterIcons = new Map();
    this.onTowerEnter = null;
    this.onTowerLeave = null;
    this.onPresetSwap = null;
    this.onPresetAssign = null;
    this.onPresetRemove = null;
    this.presetEditSet = 0;
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
    document.querySelectorAll('#collection-window .tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => { this.collectionTab = btn.dataset.coltab; this.refreshCollection(); });
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

    this._initSoundButton();
    document.getElementById('save-btn').addEventListener('click', () => this.onManualSave && this.onManualSave());
    document.getElementById('reset-btn').addEventListener('click', () => {
      // eslint-disable-next-line no-alert
      if (window.confirm('저장된 게임을 지우고 처음부터 시작할까요?')) {
        if (this.onResetSave) this.onResetSave();
      }
    });

    this._initWindowManager();
    this._initChatControls();
    this._initCreateScreen();
  }

  // 음량 버튼: 100% → 50% → 음소거 순환. 설정은 브라우저에 남는다.
  _initSoundButton() {
    const btn = document.getElementById('sound-btn');
    const label = () => {
      btn.textContent = SOUND.icon;
      btn.title = `소리 ${Math.round(SOUND.volume * 100)}% (눌러서 전환)`;
    };
    label();
    btn.addEventListener('click', () => {
      SOUND.unlock();
      const v = SOUND.cycleVolume();
      label();
      this.logChat(`소리 ${Math.round(v * 100)}%`, 'system');
    });
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
      family: 'family-window', tower: 'tower-window', settings: 'settings-window', collection: 'collection-window',
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
      const upper = tierStancesFor(c.stanceIds).map((t) => STANCE_DATA[t.stanceId].name).join(' → ');
      return `
        <div class="class-card" data-class="${c.id}">
          <div class="class-icon" style="background:${c.color}"></div>
          <div class="class-name">${c.name}</div>
          <div class="class-role">${role} · ${stances}</div>
          <div class="class-desc">${c.desc}</div>
          <div class="class-upper">승급 스탠스: ${upper}</div>
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
  // ---------- 창 배치 ----------
  // 창이 전부 화면 한가운데 겹쳐 뜨던 것을 고친다.
  // 열 때 비어 있는 자리를 찾아 놓고, 사용자가 끌어다 놓으면 그 자리를 기억한다.
  _initWindowManager() {
    this._zTop = 10;
    document.querySelectorAll('.game-window').forEach((el) => {
      const handle = el.querySelector('.window-title-bar');
      if (handle) this._makeDraggable(el, handle);
      el.addEventListener('pointerdown', () => this._bringToFront(el));
    });
    const chat = document.getElementById('chat-window');
    this._makeDraggable(chat, document.getElementById('chat-drag-handle'));
    chat.addEventListener('pointerdown', () => this._bringToFront(chat));
    // 채팅창은 열려 있는 채로 시작하므로 기억해둔 자리를 여기서 되돌린다.
    const savedChat = (SettingsManager.values.windowPos || {})['chat-window'];
    if (savedChat) this._setWindowPos(chat, savedChat.x, savedChat.y);
  }

  _bringToFront(el) {
    this._zTop += 1;
    el.style.zIndex = this._zTop;
  }

  _setWindowPos(el, x, y) {
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.transform = 'none';
  }

  _makeDraggable(el, handle) {
    if (!el || !handle) return;
    handle.style.cursor = 'move';
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.tagName === 'BUTTON') return; // 닫기·최소화 버튼은 그대로 동작해야 한다
      const root = document.getElementById('game-root').getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const offX = e.clientX - box.left;
      const offY = e.clientY - box.top;
      const move = (ev) => {
        // 제목 표시줄이 화면 밖으로 나가면 다시 못 잡으므로 경계를 물린다.
        const x = clamp(ev.clientX - root.left - offX, 0, root.width - box.width);
        const y = clamp(ev.clientY - root.top - offY, 0, root.height - 28);
        this._setWindowPos(el, x, y);
        el.dataset.userPos = '1';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        this._saveWindowPos(el);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      e.preventDefault();
    });
  }

  _saveWindowPos(el) {
    const root = document.getElementById('game-root').getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const all = { ...(SettingsManager.values.windowPos || {}) };
    all[el.id] = { x: Math.round(box.left - root.left), y: Math.round(box.top - root.top) };
    SettingsManager.set('windowPos', all);
  }

  // 이미 열려 있는 창과 겹치지 않는 첫 자리를 고른다. 좌/우 두 자리가 기본이고,
  // 셋 이상이면 제목 표시줄이 보이도록 계단식으로 비껴 놓는다.
  _placeWindow(el) {
    const saved = (SettingsManager.values.windowPos || {})[el.id];
    const root = document.getElementById('game-root').getBoundingClientRect();
    const box = el.getBoundingClientRect();
    if (saved) {
      this._setWindowPos(el, clamp(saved.x, 0, root.width - box.width), clamp(saved.y, 0, root.height - 28));
      return;
    }
    const others = [...document.querySelectorAll('.game-window')]
      .filter((w) => w !== el && !w.classList.contains('hidden'))
      .map((w) => w.getBoundingClientRect());
    const overlaps = (x, y) => others.some((o) => !(
      root.left + x + box.width <= o.left || root.left + x >= o.right
      || root.top + y + box.height <= o.top || root.top + y >= o.bottom));

    const top = WINDOW_TOP;
    const free = [[10, top], [root.width - box.width - 10, top]].find(([x, y]) => !overlaps(x, y));
    if (free) {
      this._setWindowPos(el, free[0], free[1]);
      return;
    }
    // 화면이 960x540이라 이 크기의 창은 둘까지만 안 겹친다.
    // 셋째부터는 제목 표시줄이 가려지지 않게 열려 있는 수만큼 계단식으로 비껴 놓는다.
    const step = Math.max(0, others.length - 1);
    this._setWindowPos(el,
      clamp(30 + step * 28, 0, root.width - box.width),
      clamp(top + 30 + step * 26, 0, root.height - 28));
  }

  // 설정에서 "창 위치 초기화"를 누르면 기억해둔 자리를 지우고 다시 자동 배치한다.
  resetWindowLayout() {
    SettingsManager.set('windowPos', {});
    document.querySelectorAll('.game-window').forEach((el) => {
      delete el.dataset.userPos;
      if (!el.classList.contains('hidden')) this._placeWindow(el);
    });
  }

  openWindow(id) {
    if (this.isCreating) return;
    if (SOUND) SOUND.ui();
    if (id === 'char-info-window') this.refreshCharInfo();
    if (id === 'barracks-window') this.refreshBarracks();
    if (id === 'quest-window') this.refreshQuest();
    if (id === 'teleport-window') this.refreshTeleport();
    if (id === 'family-window') this.refreshFamily();
    if (id === 'tower-window') this.refreshTower();
    if (id === 'settings-window') this.refreshSettings();
    if (id === 'collection-window') this.refreshCollection();
    if (id === 'inventory-window') this.refreshInventory();
    const el = document.getElementById(id);
    el.classList.remove('hidden');
    // 숨김을 푼 뒤에야 크기를 잴 수 있어서 여기서 자리를 잡는다.
    this._placeWindow(el);
    this._bringToFront(el);
  }

  isWindowOpen(id) { return !document.getElementById(id).classList.contains('hidden'); }

  // 조작 캐릭터가 바뀌면 열려 있는 창들을 새 캐릭터 기준으로 다시 그린다.
  refreshOpenWindows() {
    if (this.isWindowOpen('char-info-window')) this.refreshCharInfo();
    if (this.isWindowOpen('shop-window')) this.refreshShop();
    if (this.isWindowOpen('barracks-window')) this.refreshBarracks();
    if (this.isWindowOpen('inventory-window')) this.refreshInventory();
    if (this.isWindowOpen('family-window')) this.refreshFamily();
    if (this.isWindowOpen('tower-window')) this.refreshTower();
    if (this.isWindowOpen('settings-window')) this.refreshSettings();
    if (this.isWindowOpen('collection-window')) this.refreshCollection();
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
        <div class="name-lv">${unit.name} ${rankLabel(unit.level)}<span class="wset-tag" title="무기 세트 (1/2/3 키로 교체)">세트${unit.activeSet + 1}</span></div>
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

      // 전용기 버튼. 키보드 R은 조작 캐릭터에게만 먹지만, 클릭은 어느 슬롯이든 쓸 수 있다.
      if (unit.signature) {
        const sb = document.createElement('button');
        const open = unit.signatureUnlocked;
        sb.className = 'skill-btn sig-btn' + (open ? '' : ' locked');
        sb.innerHTML = `<span class="key-label">R</span>${open ? unit.signature.name.slice(0, 2) : '🔒'}`;
        sb.dataset.sig = '1';
        const mask = document.createElement('span');
        mask.className = 'cd-mask';
        sb.appendChild(mask);
        const cdText = document.createElement('span');
        cdText.className = 'cd-text';
        sb.appendChild(cdText);
        sb.title = open
          ? `전용기 ${unit.signature.name} — ${signatureText(unit.signature)}`
          : `전용기 ${unit.signature.name} — Lv.${SIGNATURE_REQ_LEVEL}에 개방`;
        sb.addEventListener('click', () => this.onSignaturePress && this.onSignaturePress(slotIndex));
        hotbar.appendChild(sb);
      }

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
      // 세트 표시가 매 프레임 지워지지 않도록 마크업째로 다시 쓴다.
      slot.querySelector('.name-lv').innerHTML = `${unit.name} ${rankLabel(unit.level)}`
        + `<span class="wset-tag" title="무기 세트 (1/2/3 키로 교체)">세트${unit.activeSet + 1}</span>`;
      const xpFill = slot.querySelector('.bar-fill.xp');
      xpFill.style.width = `${clamp(unit.xp / xpToNextLevel(unit.level), 0, 1) * 100}%`;
      xpFill.parentElement.title = `EXP ${Math.floor(unit.xp)}/${xpToNextLevel(unit.level)}`;

      const st = unit.stanceState;
      const sxpFill = slot.querySelector('.bar-fill.sxp');
      const sid = unit.currentStanceId;
      const stMax = st.level >= stanceMaxLevel(sid);
      sxpFill.style.width = `${stMax ? 100 : clamp(st.xp / stanceXpToNext(st.level, sid), 0, 1) * 100}%`;
      sxpFill.parentElement.title = `${unit.stance.name} 스탠스 Lv.${st.level}${stMax ? ' (MAX)' : ` — ${Math.floor(st.xp)}/${stanceXpToNext(st.level, sid)}`} (포인트 ${st.points})`;
      slot.querySelector('.sxp-text').textContent = `${unit.stance.name} Lv.${st.level}${stMax ? ' MAX' : ''}${st.points > 0 ? ` · SP${st.points}` : ''}`;
      slot.querySelectorAll('.auto-modes button').forEach((b) => {
        b.classList.toggle('on', b.dataset.mode === unit.autoMode);
      });
      slot.classList.toggle('downed', !!unit.downed);

      // 전용기 쿨다운
      const sigBtn = slot.querySelector('.skill-btn[data-sig]');
      if (sigBtn && unit.signature) {
        const remain = unit.sigCooldown || 0;
        sigBtn.querySelector('.cd-mask').style.height = `${clamp(remain / unit.signature.cooldownMs, 0, 1) * 100}%`;
        sigBtn.querySelector('.cd-text').textContent = remain > 0 ? Math.ceil(remain / 1000) : '';
        sigBtn.classList.toggle('no-mp', remain <= 0 && unit.mp < unit.signature.manaCost);
      }

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
    this.refreshTracker(this._hudDt || 16);
    document.getElementById('gold-amount').textContent = this.pm.gold;
    document.getElementById('zone-label').textContent = this.tower && this.tower.active
      ? `${this.zm.name} ${this.tower.floor}층 (최고 ${this.tower.bestFloor}층)`
      : `${this.zm.name} (권장 Lv.${this.zm.def.level})`;
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
      <div class="section-title">고유 특성 · 전용기</div>
      ${this._identityHtml(unit)}
      <div class="section-title">파티 시너지</div>
      ${(this.pm.activeSynergies || []).length
        ? (this.pm.activeSynergies || []).map((s) => `<div class="syn-row"><b>${s.name}</b><span>${s.desc}</span></div>`).join('')
        : '<p style="opacity:0.6;font-size:11px;">활성화된 시너지가 없습니다. 파티 구성을 바꿔보세요.</p>'}
      <div class="section-title">장비 (${ARMOR_CLASS_LABEL[unit.armorClass]} 착용) — 무기는 세트 ${unit.activeSet + 1} 사용 중</div>
      <div class="equip-list">
        ${EQUIP_SLOTS.map((slot) => {
          const gear = unit.equipment[slot];
          const stat = gear ? (gear.item.atk ? `공격 +${gear.atk}` : `방어 +${gear.def}`) : '';
          return `
            <div class="equip-row">
              <span class="equip-slot-name">${SLOT_LABEL[slot]}</span>
              <span class="equip-item">${gear ? `${itemIconHtml(gear.itemId)}${gear.displayName}` : '<span style="opacity:0.45">비어 있음</span>'}</span>
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

  // 캐릭터마다 다른 패시브와 전용기. 영입 선택이 전투에 어떻게 드러나는지 보여준다.
  _identityHtml(unit) {
    const rows = [];
    if (unit.trait) {
      rows.push(`<div class="syn-row"><b>패시브 · ${unit.trait.name}</b><span>${unit.trait.desc}</span></div>`);
    }
    if (unit.signature) {
      const sig = unit.signature;
      const open = unit.signatureUnlocked;
      const state = open ? 'R키 / 자동전투 사용' : `Lv.${SIGNATURE_REQ_LEVEL}에 개방 (현재 Lv.${unit.level})`;
      rows.push(`
        <div class="syn-row ${open ? '' : 'locked'}">
          <b>전용기 · ${sig.name} <span class="tag ${sig.kind === 'aoe' ? 'aoe' : 'single'}">${SIGNATURE_KIND_LABEL[sig.kind]}</span></b>
          <span>${signatureText(sig)} · MP ${sig.manaCost} · 쿨 ${(sig.cooldownMs / 1000).toFixed(0)}초 — ${state}</span>
        </div>`);
    }
    const buffs = (unit.buffs || []).map((b) => `<div class="syn-row"><b>강화 · ${b.name}</b><span>남은 ${(b.remain / 1000).toFixed(1)}초</span></div>`);
    if (rows.length === 0) return '<p style="opacity:0.6;font-size:11px;">고유 특성이 없는 캐릭터입니다.</p>';
    return rows.concat(buffs).join('');
  }

  // 지금 낀 것과 비교해 얼마나 오르내리는지. 무기는 현재 세트의 주무기가 기준이다.
  _gearDeltaHtml(unit, gear) {
    const slot = gear.slot === 'weapon' ? 'weapon1' : gear.slot;
    const stat = gear.item.atk ? 'atk' : 'def';
    const current = unit.equipment[slot];
    if (!current) return `<span class="cmp up">▲ +${gear[stat]} (빈 칸)</span>`;
    const d = gear[stat] - current[stat];
    if (d === 0) return '<span class="cmp same">＝ 동일</span>';
    return `<span class="cmp ${d > 0 ? 'up' : 'down'}">${d > 0 ? `▲ +${d}` : `▼ ${d}`}</span>`;
  }

  _ownedEquipHtml(unit, opts = {}) {
    const owned = this.pm.gear;
    if (owned.length === 0) return '<p style="opacity:0.6;font-size:11px;">보관 중인 장비가 없습니다.</p>';
    return owned.map((gear) => {
      const ok = unit.canEquip(gear.itemId);
      const why = gear.slot === 'weapon'
        ? `${STANCE_DATA[gear.stanceId].name} 스탠스 필요`
        : `${ARMOR_CLASS_LABEL[gear.armorClass]} 전용`;
      const equipBtns = !ok ? `<span class="equip-stat" style="color:#e74c3c">${why}</span>`
        : (gear.slot === 'weapon'
          ? `<button data-equip="${gear.uid}" data-slot="weapon1">주무기</button><button data-equip="${gear.uid}" data-slot="weapon2">보조</button>`
          : `<button data-equip="${gear.uid}">장착</button>`);
      const sellBtn = opts.sell ? `<button data-sellgear="${gear.uid}" title="${gear.sellPrice}G에 판매">판매</button>` : '';
      return `
        <div class="equip-row">
          <span class="equip-item" style="color:${TIER_COLOR[gear.tier]}">${itemIconHtml(gear.itemId)}${gear.displayName} <span class="tier-badge">T${gear.tier}</span></span>
          <span class="equip-stat">${gear.item.atk ? `공격 +${gear.atk}` : `방어 +${gear.def}`}</span>
          ${ok ? this._gearDeltaHtml(unit, gear) : ''}
          ${equipBtns}${sellBtn}
        </div>`;
    }).join('');
  }

  _renderStanceSkillTab(unit) {
    const el = document.getElementById('tab-stance-skill');
    const available = unit.availableStances;
    const unlocked = unit.unlockedStanceIds;
    const gradeBadge = (sid) => {
      const g = STANCE_DATA[sid].grade;
      return g === 'advanced' || g === 'master' ? `<span class="grade-badge ${g}">${STANCE_GRADE[g].label}</span>` : '';
    };

    const chips = available.map((sid) => {
      const s = STANCE_DATA[sid];
      const p = unit.stanceProgress[sid];
      const max = p.level >= stanceMaxLevel(sid) ? ' MAX' : '';
      return `<div class="stance-chip ${sid === unit.currentStanceId ? 'current' : ''}" data-stance="${sid}">${gradeBadge(sid)}${s.name} Lv.${p.level}${max}${p.points > 0 ? ` (SP${p.points})` : ''}</div>`;
    }).join('');
    const needWeapon = unlocked.filter((sid) => !available.includes(sid)).map((sid) => {
      const s = STANCE_DATA[sid];
      return `<div class="stance-chip locked" title="${weaponNoun(s.weapon)} 계열 무기를 장착해야 사용">${gradeBadge(sid)}🔒 ${s.name} <span class="lock-why">${weaponNoun(s.weapon)} 필요</span></div>`;
    }).join('');
    const needTier = unit.tierStances.filter((t) => !unlocked.includes(t.stanceId)).map((t) => {
      const s = STANCE_DATA[t.stanceId];
      const tier = LEVEL_TIERS.find((x) => x.id === t.tier);
      return `<div class="stance-chip locked" title="${tier.name} 달성(내부 Lv.${tier.start}) 시 해금">${gradeBadge(t.stanceId)}🔒 ${s.name} <span class="lock-why">${tier.name}</span></div>`;
    }).join('');

    const sid = unit.currentStanceId;
    const st = unit.stanceState;
    const maxLv = stanceMaxLevel(sid);
    const isMax = st.level >= maxLv;
    const need = stanceXpToNext(st.level, sid);
    const xpPct = isMax ? 100 : clamp(st.xp / need, 0, 1) * 100;
    const totalBonus = statBonusText(unit.stanceGrowthBonus()) || '아직 없음 — 스탠스 레벨을 올리면 스탯이 오릅니다';
    const perLevel = statBonusText(stanceGrowthPerLevel(sid), 1) || '없음';

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
      <div class="section-title">스탠스 — 장착 무기 계열로 결정 (클릭 전환, 단축키 V)</div>
      <div class="stance-list">${chips}${needWeapon}${needTier}</div>
      <p class="hint-text">일반 단계는 기본 스탠스 2개, 베테랑·익스퍼트·마스터에 도달할 때마다 같은 무기로 쓰는 상위 스탠스를 하나씩 배웁니다.</p>
      <div class="section-title">스탠스 성장 보너스 (모든 스탠스 레벨 합산)</div>
      <div class="growth-box">${totalBonus}</div>
      <div class="section-title">${gradeBadge(sid)}${unit.stance.name} 스탠스 Lv.${st.level} / ${maxLv} · 스킬포인트 ${st.points}</div>
      <div class="bar-bg" style="height:10px;margin-bottom:4px;"><div class="bar-fill sxp" style="width:${xpPct}%"></div></div>
      <div style="font-size:10px;opacity:0.7;margin-bottom:8px;">
        ${isMax ? '최고 레벨 달성' : `스탠스 EXP ${Math.floor(st.xp).toLocaleString()} / ${need.toLocaleString()}`} — 레벨업마다 스킬포인트 +1, ${perLevel}
      </div>
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

  // 장비교체등록: 무기 조합 3벌을 등록해두고 전투 중 1/2/3 키로 통째로 갈아낀다.
  // 세트마다 무기가 다르면 스탠스·사거리·스킬셋이 전부 바뀌므로, 교체 자체가 전투 운영이 된다.
  _renderEquipPresetTab(unit) {
    const el = document.getElementById('tab-equip-preset');
    const editIndex = clamp(this.presetEditSet || 0, 0, WEAPON_SET_COUNT - 1);
    this.presetEditSet = editIndex;
    const cdSec = (unit.setSwapCooldown || 0) / 1000;

    const sets = unit.weaponSets.map((pair, i) => {
      const stances = unit.setStances(i).map((sid) => STANCE_DATA[sid].name).join(' · ');
      const atk = pair.filter(Boolean).reduce((sum, g) => sum + g.atk, 0);
      const isActive = i === unit.activeSet;
      const rows = [0, 1].map((j) => {
        const gear = pair[j];
        return `
          <div class="wset-slot">
            <span class="wset-slot-name">${j === 0 ? '주무기' : '보조무기'}</span>
            <span class="wset-item">${gear ? `${itemIconHtml(gear.itemId, 20)}${gear.displayName}` : '<span style="opacity:0.4">비어 있음</span>'}</span>
            ${gear ? `<button data-wset-clear="${i}:${j}">빼기</button>` : ''}
          </div>`;
      }).join('');
      const swapBtn = isActive
        ? '<span class="wset-badge on">사용 중</span>'
        : `<button data-wset-swap="${i}" ${cdSec > 0 ? 'disabled' : ''}>${cdSec > 0 ? `${cdSec.toFixed(1)}s` : `전환 (${i + 1})`}</button>`;
      return `
        <div class="wset ${isActive ? 'active' : ''} ${i === editIndex ? 'editing' : ''}" data-wset-edit="${i}">
          <div class="wset-head">
            <b>세트 ${i + 1}</b>
            <span class="wset-stance">${stances}</span>
            <span class="wset-atk">공격 +${atk}</span>
            ${swapBtn}
          </div>
          ${rows}
        </div>`;
    }).join('');

    const weapons = this.pm.gear.filter((g) => g.slot === 'weapon');
    const ownedRows = weapons.length === 0
      ? '<p style="opacity:0.6;font-size:11px;">보관 중인 무기가 없습니다. 사냥·제작으로 무기를 모으면 세트를 꾸릴 수 있습니다.</p>'
      : weapons.map((gear) => {
        const ok = unit.canEquip(gear.itemId);
        const buttons = ok
          ? `<button data-wset-assign="${gear.uid}" data-slotidx="0">주무기로</button>
             <button data-wset-assign="${gear.uid}" data-slotidx="1">보조로</button>`
          : `<span class="equip-stat" style="color:#e74c3c">${STANCE_DATA[gear.stanceId].name} 스탠스 필요</span>`;
        return `
          <div class="equip-row">
            <span class="equip-item" style="color:${TIER_COLOR[gear.tier]}">${itemIconHtml(gear.itemId)}${gear.displayName} <span class="tier-badge">T${gear.tier}</span></span>
            <span class="equip-stat">공격 +${gear.atk}</span>
            ${buttons}
          </div>`;
      }).join('');

    el.innerHTML = `
      <div class="section-title">무기 세트 — 1 / 2 / 3 키로 교체 (재사용 대기 ${(WEAPON_SWAP_COOLDOWN_MS / 1000).toFixed(1)}초)</div>
      <p class="hint-text">세트마다 무기가 다르면 스탠스가 통째로 바뀝니다. 근접 세트로 붙었다가 쿨이 돌면 원거리 세트로 빠지는 식으로 씁니다.</p>
      <div class="wset-list">${sets}</div>
      <div class="section-title">세트 ${editIndex + 1}에 등록할 무기 (편집할 세트를 클릭해 고르세요)</div>
      ${ownedRows}
    `;

    el.querySelectorAll('[data-wset-edit]').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        this.presetEditSet = parseInt(row.dataset.wsetEdit, 10);
        this.refreshCharInfo();
      });
    });
    el.querySelectorAll('button[data-wset-swap]').forEach((b) => {
      b.addEventListener('click', () => this.onPresetSwap && this.onPresetSwap(parseInt(b.dataset.wsetSwap, 10)));
    });
    el.querySelectorAll('button[data-wset-clear]').forEach((b) => {
      const [i, j] = b.dataset.wsetClear.split(':').map(Number);
      b.addEventListener('click', () => this.onPresetRemove && this.onPresetRemove(i, j));
    });
    el.querySelectorAll('button[data-wset-assign]').forEach((b) => {
      b.addEventListener('click', () => this.onPresetAssign
        && this.onPresetAssign(b.dataset.wsetAssign, this.presetEditSet, parseInt(b.dataset.slotidx, 10)));
    });
  }

  // ---------- 심연의 탑 ----------
  refreshTower() {
    const t = this.tower;
    const party = this.pm.partyUnits;
    const ready = t.canEnter(party);
    const topLevel = party.reduce((m, u) => Math.max(m, u.level), 0);

    const checkpointBtns = t.checkpoints.map((f) => `
      <button data-tower-floor="${f}" ${ready ? '' : 'disabled'}>${f}층부터</button>`).join('');

    const nextBoss = t.active
      ? t.floor + ((TOWER_BOSS_EVERY - (t.floor % TOWER_BOSS_EVERY)) % TOWER_BOSS_EVERY || TOWER_BOSS_EVERY)
      : TOWER_BOSS_EVERY;

    document.getElementById('tower-body').innerHTML = `
      <p class="hint-text">사냥터를 다 돌았다면 여기가 다음 목표입니다. 층의 적을 전부 쓰러뜨리면 위층이 열리고,
      ${TOWER_BOSS_EVERY}층마다 보스가 지키고 있습니다. 전멸하면 밀려나지만 최고 기록과 보상은 남습니다.</p>
      <div class="tower-stat">
        <div><span>최고 기록</span><b>${t.bestFloor}층</b></div>
        <div><span>현재 상태</span><b>${t.active ? `${t.floor}층 도전 중` : '대기'}</b></div>
        <div><span>다음 보스</span><b>${nextBoss}층</b></div>
      </div>
      ${t.active ? `
        <div class="section-title">진행 중</div>
        <div class="tower-row">남은 적 ${this.zm.enemies.filter((e) => e.alive).length}마리</div>
        <button id="tower-leave-btn">도전 종료하고 내려가기</button>
      ` : ''}
      <div class="section-title">도전 시작 — ${TOWER_CHECKPOINT}층 단위로 기록이 남습니다</div>
      ${ready ? '' : `<p class="hint-text" style="color:#e74c3c;">Lv.${TOWER_ENTRY_LEVEL} 이상 캐릭터가 필요합니다. (현재 최고 Lv.${topLevel})</p>`}
      <div class="tower-floors">${checkpointBtns}</div>
    `;

    const body = document.getElementById('tower-body');
    body.querySelectorAll('button[data-tower-floor]').forEach((b) => {
      b.addEventListener('click', () => this.onTowerEnter && this.onTowerEnter(parseInt(b.dataset.towerFloor, 10)));
    });
    const leave = document.getElementById('tower-leave-btn');
    if (leave) leave.addEventListener('click', () => this.onTowerLeave && this.onTowerLeave());
  }

  // 화면 우측 목표 표시.
  // 매 프레임 문자열을 새로 만들 이유가 없어서 250ms마다만 검사하고, 내용이 바뀔 때만 DOM을 쓴다.
  refreshTracker(dt = 16) {
    this._trackerTimer = (this._trackerTimer || 0) - dt;
    if (this._trackerTimer > 0) return;
    this._trackerTimer = 250;
    const el = document.getElementById('quest-tracker');
    if (!SettingsManager.values.showTracker) { el.classList.add('hidden'); return; }
    const lines = [];

    if (this.tower && this.tower.active) {
      const left = this.zm.enemies.filter((e) => e.alive).length;
      lines.push({ tag: '탑', text: `${this.tower.floor}층 — 남은 적 ${left}` });
    }
    if (this.sm && !this.sm.finished) {
      lines.push({ tag: '시나리오', text: this.sm.objectiveText() });
    }
    const recruit = this.qm.active[0];
    if (recruit) {
      lines.push({ tag: '영입', text: `${recruit.charName} — ${this.qm.stepText(recruit)}` });
    }
    this.gq.active.slice(0, 2).forEach((q) => {
      const def = this.gq.def(q.id);
      if (def) lines.push({ tag: '의뢰', text: `${def.title} — ${this.gq.stepText(q)}` });
    });

    const key = lines.map((l) => l.tag + l.text).join('|');
    if (key === this._trackerKey) { el.classList.remove('hidden'); return; }
    this._trackerKey = key;
    el.classList.toggle('hidden', lines.length === 0);
    el.innerHTML = lines.map((l) => `<div class="tr-row"><span class="tr-tag ${l.tag}">${l.tag}</span>${l.text}</div>`).join('');
  }

  // ---------- 설정 ----------
  refreshSettings() {
    const v = SettingsManager.values;
    const s = this.stats;
    const pct = (x) => Math.round(x * 100);
    document.getElementById('settings-body').innerHTML = `
      <div class="section-title">소리</div>
      <div class="set-row">
        <label>전체 음량</label>
        <input type="range" id="set-volume" min="0" max="100" step="5" value="${pct(SOUND.volume)}">
        <span id="set-volume-val">${pct(SOUND.volume)}%</span>
      </div>

      <div class="section-title">자동 물약</div>
      <div class="set-row">
        <label>자동 사용</label>
        <input type="checkbox" id="set-autopotion" ${v.autoPotion ? 'checked' : ''}>
        <span style="opacity:0.6;font-size:11px;">인벤토리의 물약을 자동으로 씁니다</span>
      </div>
      <div class="set-row">
        <label>HP 기준</label>
        <input type="range" id="set-hp" min="10" max="90" step="5" value="${pct(v.hpThreshold)}" ${v.autoPotion ? '' : 'disabled'}>
        <span id="set-hp-val">${pct(v.hpThreshold)}% 이하</span>
      </div>
      <div class="set-row">
        <label>MP 기준</label>
        <input type="range" id="set-mp" min="0" max="90" step="5" value="${pct(v.mpThreshold)}" ${v.autoPotion ? '' : 'disabled'}>
        <span id="set-mp-val">${pct(v.mpThreshold)}% 이하</span>
      </div>

      <div class="section-title">화면</div>
      <div class="set-row">
        <label>목표 표시</label>
        <input type="checkbox" id="set-tracker" ${v.showTracker ? 'checked' : ''}>
        <span style="opacity:0.6;font-size:11px;">우측에 현재 퀘스트 목표를 띄웁니다</span>
      </div>
      <div class="set-row">
        <label>데미지 숫자</label>
        <input type="checkbox" id="set-damage" ${v.showDamage ? 'checked' : ''}>
        <span style="opacity:0.6;font-size:11px;">끄면 전투 화면이 한결 깔끔해집니다</span>
      </div>

      <div class="section-title">플레이 기록</div>
      <div class="stat-grid">
        <div class="row"><span>플레이 시간</span><span>${s.playTimeText}</span></div>
        <div class="row"><span>총 처치</span><span>${s.kills.toLocaleString()}</span></div>
        <div class="row"><span>보스 처치</span><span>${s.bossKills.toLocaleString()}</span></div>
        <div class="row"><span>누적 획득 골드</span><span>${s.goldEarned.toLocaleString()}G</span></div>
        <div class="row"><span>전투 불능</span><span>${s.deaths}회</span></div>
        <div class="row"><span>방문한 지역</span><span>${s.zonesVisited.size} / ${ZONE_DATA.length}</span></div>
        <div class="row"><span>심연의 탑 최고</span><span>${this.tower.bestFloor}층</span></div>
      </div>

      <div class="section-title">조작</div>
      <div class="key-grid">
        ${KEY_GUIDE.map((k) => `<div class="row"><span>${k[0]}</span><span>${k[1]}</span></div>`).join('')}
      </div>

      <div style="display:flex;gap:6px;margin-top:10px;">
        <button id="set-window-reset">창 위치 초기화</button>
        <button id="set-reset">설정 기본값으로</button>
      </div>
    `;

    const body = document.getElementById('settings-body');
    const bind = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    bind('set-volume', 'input', (e) => {
      SOUND.unlock();
      SOUND.setVolume(e.target.value / 100);
      document.getElementById('set-volume-val').textContent = `${e.target.value}%`;
      const btn = document.getElementById('sound-btn');
      btn.textContent = SOUND.icon;
    });
    bind('set-autopotion', 'change', (e) => { SettingsManager.set('autoPotion', e.target.checked); this.refreshSettings(); });
    bind('set-hp', 'input', (e) => {
      SettingsManager.set('hpThreshold', e.target.value / 100);
      document.getElementById('set-hp-val').textContent = `${e.target.value}% 이하`;
    });
    bind('set-mp', 'input', (e) => {
      SettingsManager.set('mpThreshold', e.target.value / 100);
      document.getElementById('set-mp-val').textContent = `${e.target.value}% 이하`;
    });
    bind('set-tracker', 'change', (e) => {
      SettingsManager.set('showTracker', e.target.checked);
      this._trackerKey = null;
      this.refreshTracker();
    });
    bind('set-damage', 'change', (e) => SettingsManager.set('showDamage', e.target.checked));
    bind('set-window-reset', 'click', () => { this.resetWindowLayout(); this.logChat('창 위치를 초기화했습니다.', 'system'); });
    bind('set-reset', 'click', () => {
      SettingsManager.reset();
      this._trackerKey = null;
      this.resetWindowLayout();
      this.refreshSettings();
      this.refreshTracker();
    });
    body.scrollTop = 0;
  }

  // ---------- 텔레포트 ----------
  refreshTeleport() {
    const el = document.getElementById('teleport-list');
    const rows = ZONE_DATA
      .map((z, i) => ({ z, i }))
      .filter(({ z }) => z.type !== 'tower') // 탑은 전용 창(G)으로만 들어간다
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
        status = `<span class="q-meta">Lv.${def.minLevel}+ · 보상 ${def.reward.gold.toLocaleString()}G, ${def.reward.items.map((i) => `${itemIconHtml(i.id, 16)}${ITEM_DATA[i.id].name} x${i.count}`).join(', ')}</span>`;
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
    const unit = this.pm.activeUnit;
    const entries = [...this.pm.items.entries()].filter(([, c]) => c > 0);
    const total = entries.reduce((s, [id, c]) => s + ITEM_DATA[id].price * c, 0);

    const itemsHtml = entries.length === 0
      ? '<p style="opacity:0.6;font-size:11px;">잡템·소모품이 없습니다. 몬스터를 잡으면 나옵니다.</p>'
      : `<div class="inv-list">${entries.map(([id, c]) => {
          const it = ITEM_DATA[id];
          const useBtn = it.consumable ? `<button data-use="${id}">사용</button>` : '';
          return `<div class="inv-row"><span class="inv-name" style="color:${TIER_COLOR[it.tier] || '#ecf0f1'}">${itemIconHtml(id)}${it.name}</span>`
            + `<span style="opacity:0.7">x${c}</span><span style="color:#f1c40f">${it.price * c}G</span>${useBtn}</div>`;
        }).join('')}</div>`;

    grid.innerHTML = `
      <div class="section-title">장비 보관함 (${this.pm.gear.length})</div>
      ${this._ownedEquipHtml(unit, { sell: true })}
      <div class="section-title">잡템 · 소모품</div>
      ${itemsHtml}
      <div style="margin-top:8px;font-size:11px;opacity:0.75;">
        잡템 판매가치 ${total}G · 소모품 사용 대상: <b>${unit ? unit.name : '-'}</b> (Tab으로 변경)
      </div>`;

    grid.querySelectorAll('button[data-use]').forEach((b) => {
      b.addEventListener('click', () => this.onUsePotion && this.onUsePotion(b.dataset.use));
    });
    grid.querySelectorAll('button[data-equip]').forEach((b) => {
      b.addEventListener('click', () => this.onEquip && this.onEquip(b.dataset.equip, b.dataset.slot || null));
    });
    grid.querySelectorAll('button[data-sellgear]').forEach((b) => {
      b.addEventListener('click', () => this.onSellGear && this.onSellGear(b.dataset.sellgear));
    });
  }

  // 스타포스·잠재능력 탭(메이플스토리식). 위에서 장비를 고르고 아래에서 강화한다.
  _renderEnhanceTab(body) {
    const unit = this.pm.activeUnit;
    const entries = [
      ...unit.equippedList().map(({ slot, gear }) => ({ gear, where: SLOT_LABEL[slot] })),
      ...this.pm.gear.map((gear) => ({ gear, where: '보관' })),
    ];
    if (entries.length === 0) { body.innerHTML = '<p style="opacity:0.6;">강화할 장비가 없습니다.</p>'; return; }
    if (!entries.some((e) => e.gear.uid === this.enhanceSel)) this.enhanceSel = entries[0].gear.uid;
    const gear = entries.find((e) => e.gear.uid === this.enhanceSel).gear;

    const picker = entries.map(({ gear: g, where }) => {
      const grade = g.potential ? POTENTIAL_GRADES[g.potential.grade] : null;
      return `<button class="enh-pick ${g.uid === gear.uid ? 'on' : ''}" data-enh-sel="${g.uid}" title="${g.displayName} (${where})"
        style="${grade ? `border-color:${grade.color}` : ''}">${itemIconHtml(g.itemId, 32)}
        <span class="enh-pick-star">${g.star ? `★${g.star}` : ''}</span><span class="enh-pick-where">${where}</span></button>`;
    }).join('');

    const stars = Array.from({ length: gear.maxStar }, (_, i) => `<span class="${i < gear.star ? 'on' : ''}">★</span>`).join('');
    const stat = gear.item.atk ? `공격 +${gear.atk}` : `방어 +${gear.def}`;
    const matText = (cost) => cost.materials.map((m) => {
      const have = this.pm.itemCount(m.id);
      return `<span style="color:${have >= m.count ? '#2ecc71' : '#e74c3c'}">${itemIconHtml(m.id, 16)}${ITEM_DATA[m.id].name} ${have}/${m.count}</span>`;
    }).join(' ');

    // ----- 스타포스 -----
    let sfHtml;
    if (gear.star >= gear.maxStar) {
      sfHtml = `<div class="sf-max">최대 ★${gear.maxStar} 달성 — T${gear.tier} 장비의 상한입니다.</div>`;
    } else {
      const protectable = canProtectStar(gear.star);
      const protect = protectable && this.starProtect;
      const cost = starforceCost(gear.item, gear.star, protect);
      const chanceTime = gear.failStreak >= 2;
      const s = starforceSuccessRate(gear.star);
      const d = protect ? 0 : starforceDestroyRate(gear.star);
      const running = this.starcatch && this.starcatch.uid === gear.uid;
      sfHtml = `
        <div class="sf-rates">${chanceTime
          ? '<b style="color:#f7dc6f">찬스 타임! 이번 강화는 100% 성공합니다</b>'
          : `성공 <b style="color:#2ecc71">${(s * 100).toFixed(1)}%</b> · 파괴 <b style="color:${d ? '#e74c3c' : '#7f8c8d'}">${(d * 100).toFixed(1)}%</b> · 실패 시 ${starDropsOnFail(gear.star) ? '<b style="color:#e67e22">하락</b>' : '유지'}`}</div>
        <div class="shop-meta">★${gear.star} → ★${gear.star + 1} · 비용 ${cost.gold.toLocaleString()}G ${matText(cost)}</div>
        <label class="sf-protect ${protectable ? '' : 'disabled'}"><input type="checkbox" id="sf-protect" ${protect ? 'checked' : ''} ${protectable ? '' : 'disabled'}> 파괴 방지 (12~16성, 비용 2배)</label>
        <div class="starcatch ${running ? 'on' : ''}"><div class="sc-zone"></div><div class="sc-star" id="sc-star" style="left:${running ? this.starcatch.pos * 100 : 50}%">★</div></div>
        <div class="sf-btns">
          ${running ? '<button id="sf-stop" class="primary">STOP!</button>'
            : `<button id="sf-start" ${this.pm.canAfford(cost) ? '' : 'disabled'}>강화하기</button>`}
          <span class="hint-text" style="margin:0">움직이는 별을 가운데서 멈추면 성공률 ×1.05</span>
        </div>`;
    }

    // ----- 잠재능력 -----
    const pot = gear.potential;
    const grade = pot ? POTENTIAL_GRADES[pot.grade] : null;
    const lines = pot
      ? pot.lines.map((l) => `<div class="pot-line" style="color:${POTENTIAL_GRADES[l.grade || pot.grade].color}">${potentialLineText(l)}</div>`).join('')
      : '<div class="pot-line" style="opacity:0.55">잠재능력이 없습니다. 큐브를 쓰면 레어 등급이 열립니다.</div>';
    const cubeBtns = Object.entries(CUBES).map(([id, c]) => {
      const have = this.pm.itemCount(id);
      const blocked = pot && pot.grade > c.maxGrade;
      return `<button data-cube="${id}" ${have > 0 && !blocked ? '' : 'disabled'} title="최대 ${POTENTIAL_GRADES[c.maxGrade].name}까지">${itemIconHtml(id, 16)}${c.name} (${have})</button>`;
    }).join('');

    const result = this.enhanceResult
      ? `<div class="enh-result" style="color:${this.enhanceResult.color}">${this.enhanceResult.text}</div>` : '';

    body.innerHTML = `
      <div class="enh-picker">${picker}</div>
      <div class="enh-detail">
        <div class="enh-head">${itemIconHtml(gear.itemId, 40)}
          <div>
            <div style="color:${TIER_COLOR[gear.tier]};font-weight:bold">${gear.displayName} <span class="tier-badge">T${gear.tier}</span></div>
            <div class="enh-stars">${stars}</div>
            <div class="shop-meta">${stat} (스타포스 +${Math.round((starforceStatMult(gear.star) - 1) * 100)}%)</div>
          </div>
        </div>
        ${result}
        <div class="section-title">스타포스</div>
        ${sfHtml}
        <div class="section-title">잠재능력 ${grade ? `<span class="pot-grade" style="color:${grade.color};border-color:${grade.color}">${grade.name}</span>` : ''}</div>
        <div class="pot-box" style="${grade ? `border-color:${grade.color}` : ''}">${lines}</div>
        <div class="cube-btns">${cubeBtns}</div>
      </div>`;

    body.querySelectorAll('[data-enh-sel]').forEach((b) => {
      b.addEventListener('click', () => {
        this._cancelStarcatch();
        this.enhanceSel = Number(b.dataset.enhSel);
        this.enhanceResult = null;
        this.refreshShop();
      });
    });
    const protectBox = body.querySelector('#sf-protect');
    if (protectBox) protectBox.addEventListener('change', () => { this.starProtect = protectBox.checked; this.refreshShop(); });
    const start = body.querySelector('#sf-start');
    if (start) start.addEventListener('click', () => this._startStarcatch(gear.uid));
    const stop = body.querySelector('#sf-stop');
    if (stop) stop.addEventListener('click', () => this._stopStarcatch());
    body.querySelectorAll('[data-cube]').forEach((b) => {
      b.addEventListener('click', () => {
        const r = this.onCube ? this.onCube(gear.uid, b.dataset.cube) : null;
        if (r && r.ok) {
          const name = POTENTIAL_GRADES[r.grade].name;
          this.enhanceResult = r.gradeUp
            ? { color: POTENTIAL_GRADES[r.grade].color, text: `등급 상승! → ${name}` }
            : { color: '#d6eaf8', text: r.before === 0 ? `${name} 잠재능력이 열렸습니다` : `옵션을 새로 굴렸습니다 (${name})` };
        }
        this.refreshShop();
      });
    });
  }

  // 스타캐치: 막대 위를 오가는 별을 멈춘다. 가운데 구간이면 성공률이 오른다.
  _startStarcatch(uid) {
    if (this.starcatch) return;
    this.enhanceResult = null;
    this.starcatch = { uid, t0: performance.now(), pos: 0.5, raf: 0 };
    this.refreshShop();
    const step = (now) => {
      if (!this.starcatch) return;
      this.starcatch.pos = (Math.sin((now - this.starcatch.t0) / 1000 * 5.2) + 1) / 2;
      const el = document.getElementById('sc-star');
      if (el) el.style.left = `${this.starcatch.pos * 100}%`;
      this.starcatch.raf = requestAnimationFrame(step);
    };
    this.starcatch.raf = requestAnimationFrame(step);
  }

  _cancelStarcatch() {
    if (!this.starcatch) return;
    cancelAnimationFrame(this.starcatch.raf);
    this.starcatch = null;
  }

  _stopStarcatch() {
    const sc = this.starcatch;
    if (!sc) return null;
    this._cancelStarcatch();
    const caught = Math.abs(sc.pos - 0.5) < 0.12;
    const r = this.onStarforce ? this.onStarforce(sc.uid, { catchStar: caught, protect: this.starProtect }) : null;
    if (r && r.ok) {
      const texts = {
        success: ['#2ecc71', `성공! ★${r.from} → ★${r.to}`],
        keep: ['#bdc3c7', `실패 — ★${r.to} 유지`],
        drop: ['#e67e22', `실패 — ★${r.from} → ★${r.to} 하락`],
        destroy: ['#e74c3c', `★${r.from} 장비가 파괴되었습니다…`],
      };
      const [color, text] = texts[r.result];
      this.enhanceResult = { color, text: `${caught ? '스타캐치 성공 · ' : ''}${text}` };
    }
    this.refreshShop();
    return r;
  }

  // ---------- 컬렉션 ----------
  _monsterIcon(entry) {
    let url = this._monsterIcons.get(entry.name);
    if (!url) {
      url = monsterSprite({ name: entry.name, race: entry.race }, 'a').toDataURL();
      this._monsterIcons.set(entry.name, url);
    }
    return url;
  }

  refreshCollection() {
    const col = this.collection;
    const tab = this.collectionTab || 'monster';
    document.querySelectorAll('#collection-window .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.coltab === tab));
    const body = document.getElementById('collection-body');

    if (tab === 'monster') {
      const reg = col.registeredCount;
      const flat = statBonusText(ACCOUNT_FLAT_STATS) || '아직 없음';
      const milestones = COLLECTION_MILESTONES.map((m) => {
        const target = col.milestoneTarget(m);
        const done = reg >= target;
        return `<div class="ms-row ${done ? 'done' : ''}"><span>${done ? '✓' : '○'} ${target}종 등록</span><span>${bonusText(m.bonus)}</span></div>`;
      }).join('');
      const cards = col.entries.map((e) => {
        const kills = col.kills[e.name] || 0;
        const stage = col.stageOf(e);
        const th = col.thresholds(e);
        const next = th[stage];
        const pips = th.map((_, i) => `<i class="${i < stage ? 'on' : ''}"></i>`).join('');
        return `<div class="col-card ${kills === 0 ? 'unknown' : ''} ${e.boss ? 'boss' : ''}" title="${e.zone} · Lv.${e.level} · 단계마다 ${STAT_LABEL[COLLECTION_RACE_STAT[e.race] || 'str']} +1">
          <img src="${this._monsterIcon(e)}" width="32" height="48" alt="">
          <div class="col-name">${kills === 0 ? '???' : e.name}</div>
          <div class="col-pips">${pips}</div>
          <div class="col-kills">${next ? `${kills.toLocaleString()} / ${next.toLocaleString()}` : '정복 완료'}</div>
        </div>`;
      }).join('');
      body.innerHTML = `
        <p class="hint-text">같은 몬스터를 잡을수록 등록 → 숙련 → 정복으로 오르고, 단계마다 모든 캐릭터의 스탯이 +1 오릅니다(종족별: 인간형 힘 · 짐승 민첩 · 언데드 체력 · 마족 지능 · 무생물 기술).</p>
        <div class="tower-stat">
          <div><span>등록</span><b>${reg} / ${col.entries.length}</b></div>
          <div><span>계정 스탯</span><b style="font-size:11px">${flat}</b></div>
        </div>
        <div class="section-title">마일스톤</div>
        ${milestones}
        <div class="section-title">몬스터</div>
        <div class="col-grid">${cards}</div>`;
      return;
    }

    const links = this.pm.linkSkills();
    const total = bonusText(this.pm.linkBonus()) || '아직 없음';
    const rows = [...this.pm.units.values()].sort((a, b) => b.level - a.level).map((u) => {
      const entry = SIGNATURE_DATA[u.defId];
      const trait = entry ? TRAIT_DATA[entry.traitId] : null;
      const lv = linkLevelOf(u.level);
      const applied = links.some((l) => l.unit === u);
      const next = LINK_LEVELS[lv];
      const effect = !trait ? '' : lv
        ? `${bonusText(linkBonusOf(entry.traitId, lv))}${applied ? '' : ' <span style="opacity:.55">(같은 특성의 더 높은 링크가 적용 중)</span>'}`
        : `Lv.${LINK_LEVELS[0].level}에 개방`;
      return `<div class="link-row ${applied ? 'on' : ''}">
        <div class="link-name">${u.name} <span style="opacity:.6">${rankLabel(u.level)}</span></div>
        <div class="link-lv">${lv ? `링크 Lv.${lv}` : '미개방'}</div>
        <div class="link-eff"><b>${trait ? trait.name : '-'}</b> ${effect}${next && lv ? ` <span style="opacity:.5">· 다음 Lv.${next.level}</span>` : ''}</div>
      </div>`;
    }).join('');
    body.innerHTML = `
      <p class="hint-text">보유 캐릭터(병영 포함)가 Lv.${LINK_LEVELS.map((l) => l.level).join(' / ')}에 오르면 그 캐릭터의 고유 특성이 ${LINK_LEVELS.map((l) => `${l.rate * 100}%`).join(' / ')} 세기로 파티 전체에 적용됩니다. 같은 특성은 가장 높은 링크 하나만 적용됩니다.</p>
      <div class="section-title">적용 중인 링크 효과 (${links.length}종)</div>
      <div class="growth-box">${total}</div>
      <div class="section-title">보유 캐릭터</div>
      ${rows}`;
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
            <span class="shop-name">${itemIconHtml(id)}${it.name} <span style="opacity:0.6">x${c}</span></span>
            <span style="color:#f1c40f">${it.price}G</span>
            <button data-sell="${id}" data-count="1">1개</button>
            <button data-sell="${id}" data-count="${c}">전부</button>
          </div>`;
      }).join('');
      const gearRows = this.pm.gear.map((g) => `
          <div class="shop-row">
            <span class="shop-name" style="color:${TIER_COLOR[g.tier]}">${itemIconHtml(g.itemId)}${g.displayName} <span class="tier-badge">T${g.tier}</span></span>
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
            <span class="shop-name">${itemIconHtml(id)}${it.name}</span>
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
          return `<span style="color:${ok ? '#2ecc71' : '#e74c3c'}">${itemIconHtml(m.id, 16)}${ITEM_DATA[m.id].name} ${have}/${m.count}</span>`;
        }).join(', ');
        const power = out.atk ? `공격 +${out.atk}` : (out.def ? `방어 +${out.def}` : '');
        return `
          <div class="shop-row">
            <span class="shop-name">${itemIconHtml(r.result)}${out.name} ${r.equipment ? `<span class="tier-badge">T${r.tier}</span>` : ''}
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
    const upper = tierStancesFor(def.stanceIds)
      .map((t) => `${LEVEL_TIERS.find((x) => x.id === t.tier).name} ${STANCE_DATA[t.stanceId].name}`).join(' · ');
    const stances = `${def.stanceIds.map((s) => STANCE_DATA[s].name).join(' / ')}<br><span style="opacity:0.75">승급 스탠스: ${upper}</span>`;
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

    const isTarget = this.sm.isStepNpc(npc.id) || this.sm.isDeliverNpc(npc.id);
    const ch = this.sm.chapter;
    let body = `<div style="color:#85c1e9;font-weight:bold;">챕터 ${ch.chapter} — ${ch.title}</div>`;

    if (isTarget) {
      const step = this.sm.step;
      const deliver = step.type === 'deliver';
      const have = deliver && this.pm.itemCount(step.itemId) >= step.count;
      body += `<div style="margin:8px 0;">${step.line || step.text}</div>`;
      if (deliver) {
        body += `<div style="font-size:11px;color:${have ? '#2ecc71' : '#e74c3c'}">`
          + `${ITEM_DATA[step.itemId].name} ${this.pm.itemCount(step.itemId)}/${step.count}</div>`;
      }
      const proceed = document.createElement('button');
      proceed.className = 'primary';
      proceed.textContent = deliver ? '납품하기' : '알겠습니다';
      if (deliver && !have) proceed.disabled = true;
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

}
