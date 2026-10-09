// ===== 09d_merchant.js : 마을 잡화점 상인 =====
// 마을 골드(프로필)로 산다. 물약·던전 도구는 이번 원정 가방(Game.run)에, 기본 장비는 보관함(프로필)에 들어간다.
// 가방 한도가 있어서 무엇을 챙길지 고르는 것도 준비 전략이다.

const VILLAGE_SHOP = {
  potions: [
    { key: 'potion', icon: '🧪', name: '회복약', price: 30, max: 5, desc: '아군 1명 HP 50% 회복. 전투 중에도 쓸 수 있다.' },
    { key: 'bigPotion', icon: '💖', name: '상급 회복약', price: 75, max: 2, desc: '아군 1명 HP 100% 회복 + 해로운 효과 해제. 전투 중에도 쓸 수 있다.' },
    { key: 'feather', icon: '🪶', name: '부활의 깃털', price: 160, max: 1, desc: '던전에서 쓰러진 동료 1명을 HP 40%로 일으킨다. 전투 밖에서만.' },
  ],
  tools: [
    { key: 'food', icon: '🍞', name: '식량', price: 25, max: 6, desc: '야영지에서 쉬려면 필요하다 (HP 40% 회복).' },
    { key: 'torch', icon: '🔥', name: '횃불 묶음', price: 20, max: 3, desc: '던전에서 횃불 +40. 어두우면 기습당하기 쉽다.' },
    { key: 'trapKit', icon: '🧰', name: '함정 해제 도구', price: 40, max: 3, desc: '복도 함정을 밟으면 자동으로 해제하고 부품을 챙긴다 (피해 없음 + 골드).' },
  ],
  gearPrice: { UC: 60 },
};
// 가방에 들어 있는 수
function bagCount(run, key) {
  if (key === 'potion') return run.potions;
  if (key === 'food') return run.food;
  if (key === 'torch') return run.torchPacks || 0;
  return run[key + 's'] || 0;
}
function bagAdd(run, key, n) {
  if (key === 'potion') run.potions += n;
  else if (key === 'food') run.food += n;
  else if (key === 'torch') run.torchPacks = (run.torchPacks || 0) + n;
  else run[key + 's'] = (run[key + 's'] || 0) + n;
}

function openMerchant(onClose, tab) {
  const run = Game.run, p = Game.profile;
  tab = tab || 'potions';
  const box = el('div', 'merchant-box');
  const head = el('div', 'dlg-head');
  head.appendChild(portraitCanvas('merchant', 56));
  head.appendChild(el('div', 'dlg-name', `잡화점 상인 <small>"던전 갈 채비는 여기서!"</small>`));
  head.appendChild(el('div', 'mc-gold', `● ${p.gold}`));
  box.appendChild(head);
  const tabs = el('div', 'mc-tabs');
  for (const [k, label] of [['potions', '물약'], ['tools', '던전 도구'], ['gear', '기본 장비']]) tabs.appendChild(btn(label, 'small' + (tab === k ? ' on' : ''), () => openMerchant(onClose, k), { id: 'mc-tab-' + k }));
  box.appendChild(tabs);
  const list = el('div', 'shop-list mc-list');
  if (tab === 'gear') {
    // 출전 파티 직업의 UC 무기·갑옷 (기본 라인)
    for (const id of partyIds(run)) {
      const cls = EQ.heroClass(id);
      for (const [slot, line] of [['weapon', 1], ['armor', 1], ['weapon', 4], ['armor', 4]]) {
        const base = EQ.DB.items.find((it) => it.cls === cls && it.slot === slot && it.line === line);
        const price = VILLAGE_SHOP.gearPrice.UC * (line === 4 ? 1.5 : 1);
        const skId = GEAR_SKILLS[base.id], sk = skId && SKILLS[skId];
        const row = el('div', 'shop-item');
        row.appendChild(el('div', 'si-icon', slot === 'weapon' ? '🗡' : '🛡'));
        row.appendChild(el('div', 'si-info', `<b>UC ${base.name}</b><small>${HEROES[id].name}(${HEROES[id].roleName}) ${slot === 'weapon' ? '무기 → ②' : '갑옷 → ①'} ${sk ? sk.name : ''}${line === 4 ? ' <b class="ok">새 스킬</b>' : ''}</small>`));
        const b = btn(`● ${price}`, 'buy', () => {
          if (p.gold < price) return;
          p.gold -= price;
          const it = EQ.rollItem(makeRng(hashSeed('vshop', Date.now() % 1e7, p.inv.length)), p, { base: base.id, grade: 'UC' });
          p.inv.push(it); saveProfile(); Sfx.play('coin');
          Game.toast(`${EQ.itemName(it)} 구입 → 보관함`, 1400);
          openMerchant(onClose, tab);
        }, { id: `mc-buy-${id}-${slot}${line === 4 ? '-4' : ''}`, sfx: 'coin' });
        if (p.gold < price) b.disabled = true;
        row.appendChild(b); list.appendChild(row);
      }
    }
  } else {
    VILLAGE_SHOP[tab].forEach((it) => {
      const have = bagCount(run, it.key), full = have >= it.max;
      const row = el('div', 'shop-item' + (full ? ' soldout' : ''));
      row.appendChild(el('div', 'si-icon', it.icon));
      row.appendChild(el('div', 'si-info', `<b>${it.name} <span class="mc-have">가방 ${have}/${it.max}</span></b><small>${it.desc}</small>`));
      const b = btn(full ? '가득' : `● ${it.price}`, 'buy', () => {
        if (p.gold < it.price || bagCount(run, it.key) >= it.max) return;
        p.gold -= it.price; bagAdd(run, it.key, 1); saveProfile(); Sfx.play('coin');
        openMerchant(onClose, tab);
      }, { id: 'mc-buy-' + it.key, sfx: 'coin' });
      if (full || p.gold < it.price) b.disabled = true;
      row.appendChild(b); list.appendChild(row);
    });
  }
  box.appendChild(list);
  box.appendChild(el('div', 'muted mc-note', '물약·도구는 이번 원정 가방에 들어가고, 원정이 끝나면 남은 것은 사라진다. 장비는 보관함에 남는다.'));
  const row = el('div', 'btn-row');
  row.appendChild(btn('닫기', 'primary', () => { Game.closeModal(); if (onClose) onClose(); }, { id: 'mc-close', sfx: 'back' }));
  box.appendChild(row);
  const cur = Game.modalOpen && document.querySelector('.merchant-box');
  if (cur) cur.replaceWith(box); // 구입·탭 전환은 내용만 바꾼다 (창이 깜빡이지 않게)
  else Game.modal(box, { dim: true, closeOnBg: true, onClose });
}

// 상급 회복약: 해로운 효과 해제
const HARMFUL_STATUS = ['bleed', 'burn', 'poison', 'slow', 'vuln', 'stun', 'crush', 'root'];
