/**
 * 游戏陪玩俱乐部 · 应用主逻辑
 * 负责 UI 渲染、页面切换、交互处理
 */

let currentTab = 'active-orders';
// 汇总报表 → 订单查询联动：待应用的筛选条件
let pendingQueryFilters = null;

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
  updateLiveTime();
  setInterval(updateLiveTime, 1000);
  updateBadges();
  switchTab('active-orders');  // 默认显示订单明细
  setInterval(updateBadges, 5000);
  // 将 currentTab 挂载到 window，供云同步实时监听回调使用
  window._currentTab = 'active-orders';
});

function updateLiveTime() {
  const now = new Date();
  const el = document.getElementById('liveTime');
  if (el) {
    el.textContent = now.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  }
}

function updateBadges() {
  const stats = DataStore.getStats();
  const updateBadge = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  updateBadge('badgeActive', stats.activeCount);
  updateBadge('badgeUnsettledC', stats.unsettledCompanionCount);
  updateBadge('badgeUnsettledB', stats.unsettledBossCount);
}

function refreshData() {
  if (DataStore.isCloudEnabled()) {
    // 云端模式：强制从云端拉取
    DataStore.forceSync();
  } else {
    // 离线模式：从本地 localStorage 加载
    loadData();
    updateBadges();
    switchTab(currentTab);
    showToast('数据已刷新（本地模式）', 'info');
  }
}

// ============ 导航切换 ============
function switchTab(tab) {
  currentTab = tab;
  window._currentTab = tab;  // 供云同步回调使用
  // 清除顶部 nav-item 的 active
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });
  // 清除所有子项的 active
  document.querySelectorAll('.nav-sub-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });
  const main = document.getElementById('mainContent');

  switch (tab) {
    case 'dashboard': renderDashboard(main); break;
    case 'active-orders': renderActiveOrders(main); break;
    case 'unsettled-companion': renderUnsettledCompanion(main); break;
    case 'unsettled-boss': renderUnsettledBoss(main); break;
    case 'order-query': renderOrderQuery(main); break;
    case 'recharge': renderRecharge(main); break;
    case 'manage-companions': renderCompanionManager(main); break;
    case 'manage-bosses': renderBossManager(main); break;
    case 'manage-categories': renderCategoryManager(main); break;
    case 'archive-history': renderArchiveHistory(main); break;
  }
}

// ============ 分组折叠 ============
function toggleNavGroup(headerBtn) {
  const group = headerBtn.parentElement;
  group.classList.toggle('collapsed');
}

// ============ 侧边栏搜索 ============
function sidebarQuickSearch(keyword) {
  if (!keyword || keyword.trim() === '') {
    // 恢复所有可见
    document.querySelectorAll('.nav-group, .nav-group-items, .nav-group-header, .nav-sub-item, .nav-item').forEach(el => {
      el.style.display = '';
    });
    return;
  }
  const kw = keyword.toLowerCase().trim();
  // 搜索匹配
  let hasMatch = false;
  document.querySelectorAll('.nav-group').forEach(group => {
    const headerSpan = group.querySelector('.nav-group-header span:last-child');
    const groupName = headerSpan ? headerSpan.textContent.toLowerCase() : '';
    let groupHasMatch = groupName.includes(kw);

    group.querySelectorAll('.nav-sub-item').forEach(sub => {
      const label = sub.querySelector('span:not(.nav-badge)');
      const text = label ? label.textContent.toLowerCase() : '';
      if (text.includes(kw)) { sub.style.display = ''; groupHasMatch = true; hasMatch = true; }
      else { sub.style.display = 'none'; }
    });

    if (groupHasMatch) {
      group.style.display = '';
      group.classList.remove('collapsed');
    } else {
      group.style.display = 'none';
    }
  });
  // 顶部 nav-item
  document.querySelectorAll('.nav-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(kw) ? '' : 'none';
  });
}

// ============ 仪表盘 ============
function renderDashboard(container) {
  const stats = DataStore.getStats();
  const ranking = DataStore.getCompanionRanking();

  container.innerHTML = `
    <div class="page-header">
      <h2>📊 运营仪表盘</h2>
      <p>实时监控俱乐部运营数据</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card active-card clickable-card" onclick="switchTab('active-orders')">
        <div class="stat-label">进行中订单</div>
        <div class="stat-value active">${stats.activeCount}</div>
        <div class="stat-sub">流水 ¥${stats.totalActiveAmount.toLocaleString()}</div>
      </div>
      <div class="stat-card companion-card clickable-card" onclick="switchTab('unsettled-companion')">
        <div class="stat-label">陪玩待结算</div>
        <div class="stat-value warning">${stats.unsettledCompanionCount}</div>
        <div class="stat-sub">待付 ¥${stats.totalUnsettledCompanionAmount.toLocaleString()}</div>
      </div>
      <div class="stat-card boss-card clickable-card" onclick="switchTab('unsettled-boss')">
        <div class="stat-label">老板未结算</div>
        <div class="stat-value danger">${stats.unsettledBossCount}</div>
        <div class="stat-sub">待收 ¥${stats.totalUnsettledBossAmount.toLocaleString()}</div>
      </div>
      <div class="stat-card success-card clickable-card" onclick="switchTab('order-query')">
        <div class="stat-label">平台抽成</div>
        <div class="stat-value success">¥${stats.totalCommission.toLocaleString()}</div>
        <div class="stat-sub">已完成 ${stats.completedCount} 单</div>
      </div>
    </div>

    <!-- 操作按钮栏 -->
    <div class="dashboard-actions">
      <button class="btn btn-primary" onclick="openSummaryModal()" style="padding:10px 24px;font-size:14px">
        📊 查看汇总报表
      </button>
    </div>

    <!-- 陪玩/打手接单排行榜 -->
    <div class="recent-section">
      <h3 class="section-title">🏆 陪玩接单排行榜</h3>
      ${renderRankingTable(ranking)}
    </div>

    <div class="recent-section">
      <h3 class="section-title">进行中的陪玩订单</h3>
      ${renderQuickTable(DataStore.getActiveOrders(), false)}
    </div>

    <div class="recent-section">
      <h3 class="section-title">最新充值记录</h3>
      ${renderRechargeTable(DataStore.getRechargeRecords().slice(0, 5))}
    </div>
  `;
}

// ============ 排行榜表格 ============
function renderRankingTable(ranking) {
  if (ranking.length === 0) return renderEmpty('暂无陪玩数据');
  const medalIcons = ['🥇', '🥈', '🥉'];
  return `
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:60px;text-align:center">排名</th>
              <th>陪玩</th>
              <th>等级</th>
              <th>评分</th>
              <th style="text-align:right">接单量</th>
              <th style="text-align:right">总金额 (¥)</th>
            </tr>
          </thead>
          <tbody>
            ${ranking.map((r, i) => `
              <tr style="${i < 3 ? 'background:rgba(168,85,247,0.06)' : ''}">
                <td style="text-align:center;font-size:18px">${i < 3 ? medalIcons[i] : (i + 1)}</td>
                <td style="font-weight:600">${r.companionName}</td>
                <td><span class="badge badge-primary" style="font-size:11px">${r.level}</span></td>
                <td style="color:var(--warning)">★ ${r.rating}</td>
                <td style="text-align:right;font-weight:700;color:var(--accent-light)">${r.orderCount} 单</td>
                <td style="text-align:right;font-weight:700;color:var(--success)">¥${r.totalAmount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============ 汇总报表弹窗 ============
function openSummaryModal() {
  refreshSummaryModal(null);
}

// 刷新汇总弹窗内容（支持自定义日期）
// sectionKey: 'day' | 'week' | 'month' | null（全部刷新）
// customFrom, customTo: 自定义日期范围
function refreshSummaryModal(sectionKey, customFrom, customTo) {
  const daySummary = DataStore.getSummaryByRange('day');
  const weekSummary = DataStore.getSummaryByRange('week');
  const monthSummary = DataStore.getSummaryByRange('month');

  // 自定义覆盖
  if (sectionKey === 'day' && customFrom) {
    Object.assign(daySummary, DataStore.getSummaryByRange('custom', null, customFrom, customTo));
  }
  if (sectionKey === 'week' && customFrom) {
    Object.assign(weekSummary, DataStore.getSummaryByRange('custom', null, customFrom, customTo));
  }
  if (sectionKey === 'month' && customFrom) {
    Object.assign(monthSummary, DataStore.getSummaryByRange('custom', null, customFrom, customTo));
  }

  const getDisplayRange = (data) => {
    if (data.from === data.to) return data.from;
    return `${data.from} ～ ${data.to}`;
  };

  const buildSummarySection = (key, label, data) => {
    const ds = getDisplayRange(data);
    const isCustom = data.range === 'custom';
    return `
    <div class="summary-block" id="summary-block-${key}">
      <div class="summary-period" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <span>${label}</span>
          <span style="font-size:12px;color:var(--text-muted);font-weight:400;margin-left:12px">${isCustom ? '(自定义)' : ds}</span>
        </div>
        <button class="btn btn-sm" onclick="drillDownToOrders('${key}')" style="padding:4px 14px;font-size:12px;white-space:nowrap">
          🔍 查看明细
        </button>
      </div>
      <div class="summary-cards">
        <div class="summary-item">
          <div class="summary-item-label">接单量</div>
          <div class="summary-item-value" id="sum-${key}-orders">${data.totalOrders} <span style="font-size:14px;color:var(--text-muted)">单</span></div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">总金额</div>
          <div class="summary-item-value" id="sum-${key}-amount" style="color:var(--accent-light)">¥${data.totalAmount.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">公司抽成</div>
          <div class="summary-item-value" id="sum-${key}-comm" style="color:var(--info)">¥${data.totalCommission.toLocaleString()}</div>
        </div>
        <div class="summary-item">
          <div class="summary-item-label">陪玩应得</div>
          <div class="summary-item-value" id="sum-${key}-comp" style="color:var(--success)">¥${data.totalCompanionAmount.toLocaleString()}</div>
        </div>
      </div>
      <div class="summary-date-row">
        <span style="font-size:12px;color:var(--text-muted)" id="sum-${key}-range-text">📅 ${ds}</span>
        <button class="btn btn-sm" onclick="toggleCustomDate('${key}')" style="padding:4px 12px;font-size:12px">
          📅 自定义日期
        </button>
      </div>
      <div class="summary-custom-row" id="custom-row-${key}" style="display:none">
        <input type="date" id="custom-from-${key}" class="summary-date-input" value="${data.from}">
        <span style="color:var(--text-muted);margin:0 4px">～</span>
        <input type="date" id="custom-to-${key}" class="summary-date-input" value="${data.to}">
        <button class="btn btn-primary btn-sm" onclick="applyCustomDate('${key}')" style="padding:4px 14px;font-size:12px">应用</button>
        <button class="btn btn-sm" onclick="resetCustomDate('${key}')" style="padding:4px 10px;font-size:12px;margin-left:4px">恢复默认</button>
      </div>
    </div>`;
  };

  const existingModal = document.querySelector('.modal-overlay');
  if (existingModal) {
    // 只更新内容
    const modalBody = existingModal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="summary-modal-content">
          ${buildSummarySection('day', '📅 今日', daySummary)}
          ${buildSummarySection('week', '📆 近一周', weekSummary)}
          ${buildSummarySection('month', '📆 近一月', monthSummary)}
        </div>`;
    }
    return;
  }

  showModal({
    title: '📊 流水汇总报表',
    width: '760px',
    content: `
      <div class="summary-modal-content">
        ${buildSummarySection('day', '📅 今日', daySummary)}
        ${buildSummarySection('week', '📆 近一周', weekSummary)}
        ${buildSummarySection('month', '📆 近一月', monthSummary)}
      </div>
    `,
    confirmText: '关闭',
    showCancel: false,
  });
}

// ============ 汇总报表 → 订单查询联动 ============
// 从汇总报表下钻到订单查询，自动填入对应日期范围
function drillDownToOrders(key) {
  let from, to;
  // 优先使用自定义日期（如果已展开且已填写）
  const customRow = document.getElementById('custom-row-' + key);
  const customFromEl = document.getElementById('custom-from-' + key);
  const customToEl = document.getElementById('custom-to-' + key);
  if (customRow && customRow.style.display !== 'none' && customFromEl?.value && customToEl?.value) {
    from = customFromEl.value;
    to = customToEl.value;
  } else {
    const rangeMap = { day: 'day', week: 'week', month: 'month' };
    const data = DataStore.getSummaryByRange(rangeMap[key]);
    from = data.from;
    to = data.to;
  }
  pendingQueryFilters = { dateFrom: from, dateTo: to };
  closeModal();
  switchTab('order-query');
}

// 切换自定义日期输入行
function toggleCustomDate(key) {
  const row = document.getElementById('custom-row-' + key);
  if (row) {
    row.style.display = row.style.display === 'none' ? 'flex' : 'none';
  }
}

// 应用自定义日期
function applyCustomDate(key) {
  const from = document.getElementById('custom-from-' + key)?.value;
  const to = document.getElementById('custom-to-' + key)?.value;
  if (!from || !to) return alert('请选择起止日期');

  if (from > to) return alert('起始日期不能晚于结束日期');

  const data = DataStore.getSummaryByRange('custom', null, from, to);

  // 更新该区块的数据
  const ordersEl = document.getElementById('sum-' + key + '-orders');
  const amountEl = document.getElementById('sum-' + key + '-amount');
  const commEl = document.getElementById('sum-' + key + '-comm');
  const compEl = document.getElementById('sum-' + key + '-comp');
  const rangeEl = document.getElementById('sum-' + key + '-range-text');
  const periodEl = document.querySelector('#summary-block-' + key + ' .summary-period span:last-child');

  if (ordersEl) ordersEl.innerHTML = data.totalOrders + ' <span style="font-size:14px;color:var(--text-muted)">单</span>';
  if (amountEl) amountEl.textContent = '¥' + data.totalAmount.toLocaleString();
  if (commEl) commEl.textContent = '¥' + data.totalCommission.toLocaleString();
  if (compEl) compEl.textContent = '¥' + data.totalCompanionAmount.toLocaleString();
  if (rangeEl) rangeEl.textContent = '📅 ' + (data.from === data.to ? data.from : data.from + ' ～ ' + data.to);
  if (periodEl) periodEl.textContent = '(自定义)';

  // 收起日期行
  const row = document.getElementById('custom-row-' + key);
  if (row) row.style.display = 'none';
}

// 恢复默认日期
function resetCustomDate(key) {
  const rangeMap = { day: 'day', week: 'week', month: 'month' };
  const data = DataStore.getSummaryByRange(rangeMap[key]);

  const ordersEl = document.getElementById('sum-' + key + '-orders');
  const amountEl = document.getElementById('sum-' + key + '-amount');
  const commEl = document.getElementById('sum-' + key + '-comm');
  const compEl = document.getElementById('sum-' + key + '-comp');
  const rangeEl = document.getElementById('sum-' + key + '-range-text');
  const periodEl = document.querySelector('#summary-block-' + key + ' .summary-period span:last-child');

  if (ordersEl) ordersEl.innerHTML = data.totalOrders + ' <span style="font-size:14px;color:var(--text-muted)">单</span>';
  if (amountEl) amountEl.textContent = '¥' + data.totalAmount.toLocaleString();
  if (commEl) commEl.textContent = '¥' + data.totalCommission.toLocaleString();
  if (compEl) compEl.textContent = '¥' + data.totalCompanionAmount.toLocaleString();
  if (rangeEl) rangeEl.textContent = '📅 ' + (data.from === data.to ? data.from : data.from + ' ～ ' + data.to);
  if (periodEl) periodEl.textContent = data.from === data.to ? data.from : data.from + ' ～ ' + data.to;

  // 收起日期行
  const row = document.getElementById('custom-row-' + key);
  if (row) row.style.display = 'none';
}

// ============ 正在陪玩 ============
function renderActiveOrders(container) {
  const orders = DataStore.getActiveOrders();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h2>⚡ 正在陪玩</h2>
          <p>当前 ${orders.length} 个订单进行中</p>
        </div>
        <button class="btn btn-primary" onclick="openNewOrderModal()">+ 新建订单</button>
      </div>
    </div>
    ${orders.length === 0
      ? renderEmpty('暂无进行中的陪玩订单')
      : renderOrderTable(orders, 'active')
    }
  `;

}

// ============ 陪玩明细 ============
function renderUnsettledCompanion(container) {
  const allCompanions = DataStore.getCompanions();

  // 汇总所有陪玩的总待结算
  const allUnsettled = DataStore.getUnsettledCompanionOrders();
  const totalPendingAmount = allUnsettled.reduce((sum, o) => sum + o.companionAmount, 0);
  const totalPendingGross = allUnsettled.reduce((sum, o) => sum + o.amount, 0);

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h2>💰 陪玩明细</h2>
          <p>所有陪玩的订单明细、结算记录和统计数据 — 共 ${allCompanions.length} 个打手</p>
        </div>
        <div style="text-align:right">
          <div style="font-size:14px;color:var(--text-secondary)">待结算总额（抽成后）</div>
          <div style="font-size:24px;font-weight:700;color:var(--success)">¥${totalPendingAmount.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--text-muted)">订单总额 ¥${totalPendingGross.toLocaleString()} · ${allUnsettled.length} 笔待结算</div>
        </div>
      </div>
    </div>

    ${allCompanions.length === 0 ? renderEmpty('暂无陪玩数据，请先添加打手') : allCompanions.map(comp => {
      // 该打手所有非活跃订单（已完成 + 陪玩未结算）
      const allFinished = DataStore.getCompanionOrders(comp.id);
      const pendingOrders = allFinished.filter(o => o.status === 'unsettled_companion');
      const completedOrders = allFinished.filter(o => o.status === 'completed');
      const pendingAmount = pendingOrders.reduce((sum, o) => sum + o.companionAmount, 0);
      const pendingGross = pendingOrders.reduce((sum, o) => sum + o.amount, 0);

      const totalOrders = allFinished.length;
      const completedCount = completedOrders.length;
      const pendingCount = pendingOrders.length;

      // 结算历史
      const settleHistory = DataStore.getSettlementHistoryByCompanion(comp.id);
      const totalSettled = settleHistory.reduce((sum, r) => sum + r.amount, 0);

      const confLabels = {
        '普通': '<span class="badge-confidentiality badge-conf-normal">普通</span>',
        '机密': '<span class="badge-confidentiality badge-conf-secret">机密</span>',
        '绝密': '<span class="badge-confidentiality badge-conf-topsecret">绝密</span>',
      };

      return `
        <div class="companion-settle-card">
          <!-- 打手信息头 -->
          <div class="cs-card-header">
            <div class="cs-comp-info">
              <div class="cs-comp-avatar">${(comp.name || '?')[0]}</div>
              <div>
                <div class="cs-comp-name">${comp.name} <span class="cs-comp-level">${comp.level || ''}</span> <span class="cs-comp-rating">★ ${comp.rating}</span></div>
                <div class="cs-comp-stats">
                  <span>📋 历史接单 <strong>${totalOrders}</strong> 单</span>
                  <span>✅ 已完成 <strong>${completedCount}</strong> 单</span>
                  <span>⏳ 待结算 <strong>${pendingCount}</strong> 单</span>
                  ${totalSettled > 0 ? `<span>💵 已结算 <strong>¥${totalSettled.toLocaleString()}</strong></span>` : ''}
                </div>
              </div>
            </div>
            <div class="cs-pending-amounts">
              <div class="cs-amount-item">
                <span class="cs-amount-label">待结算（抽成后）</span>
                <span class="cs-amount-val ${pendingAmount > 0 ? 'success' : ''}">¥${pendingAmount.toLocaleString()}</span>
              </div>
              <div class="cs-amount-item">
                <span class="cs-amount-label">订单总金额</span>
                <span class="cs-amount-val">¥${pendingGross.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- 待结算订单 -->
          ${pendingCount > 0 ? `
          <div style="padding:0 20px 16px">
            <h4 style="margin:0 0 12px;font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:8px">
              ⏳ 待结算订单 (${pendingCount})
            </h4>
            <div class="table-container" style="margin-bottom:16px">
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style="width:36px;text-align:center"><input type="checkbox" id="select-all-${comp.id}" onchange="toggleSelectAllCompanion('${comp.id}', this.checked)" title="全选/取消"></th>
                      <th>订单ID</th><th>订单类型</th><th>保密</th><th>模式</th><th>单位</th>
                      <th>老板</th><th>平台</th>
                      <th>金额</th><th>抽成</th><th style="color:var(--success)">打手应得</th><th>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pendingOrders.map(o => `
                      <tr>
                        <td style="text-align:center"><input type="checkbox" class="settle-check-${comp.id}" data-order-id="${o.id}" data-companion-amount="${o.companionAmount}" data-amount="${o.amount}" onchange="updateSettleSummary('${comp.id}')"></td>
                        <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent-light)">${o.id}</td>
                        <td>${o.orderType}</td>
                        <td>${confLabels[o.confidentiality] || o.confidentiality}</td>
                        <td>${o.companionMode}</td>
                        <td style="color:var(--accent-light);font-weight:500">${o.duration || '-'}</td>
                        <td>${o.bossName}${o.isTempBoss ? ' <span style="font-size:10px;color:var(--warning)">[临时]</span>' : ''}${(() => { const b = (!o.isTempBoss && o.bossId) ? DataStore.getBosses().find(x => x.id === o.bossId) : null; return b ? ` <span style="font-size:10px;color:var(--success);font-weight:600">(¥${b.balance?.toLocaleString?.()||b.balance||0})</span>` : ''; })()}</td>
                        <td style="font-size:12px">${o.platform || '-'}</td>
                        <td style="font-weight:600">¥${o.amount.toLocaleString()}</td>
                        <td>${o.commissionRate}%</td>
                        <td style="font-weight:700;color:var(--success)">¥${o.companionAmount.toLocaleString()}</td>
                        <td style="font-size:11px;color:var(--text-muted)">${(o.completedAt || o.startTime || '').substring(0, 10)}</td>
                      </tr>
                    `).join('')}
                    <tr style="background:rgba(52,211,153,0.06)">
                      <td></td>
                      <td colspan="7" style="text-align:right;font-weight:600;padding:10px 12px">待结算合计</td>
                      <td style="font-weight:700">¥${pendingGross.toLocaleString()}</td>
                      <td></td>
                      <td style="font-weight:700;color:var(--success);font-size:15px">¥${pendingAmount.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          ` : (totalOrders > 0 ? `
          <div style="padding:0 20px 16px">
            <p style="color:var(--text-muted);font-size:13px;padding:12px 0;text-align:center;border:1px dashed var(--border-subtle);border-radius:8px">✅ 该打手暂无待结算订单，所有订单已结算完毕</p>
          </div>
          ` : `
          <div style="padding:0 20px 16px">
            <p style="color:var(--text-muted);font-size:13px;padding:12px 0;text-align:center;border:1px dashed var(--border-subtle);border-radius:8px">📭 该打手暂无订单记录</p>
          </div>
          `)}

          <!-- 历史已完成订单（折叠） -->
          ${completedCount > 0 ? `
          <div style="padding:0 20px 16px">
            <details style="cursor:pointer">
              <summary style="font-size:13px;color:var(--text-secondary);padding:8px 0;user-select:none">
                ✅ 历史已完成订单 (${completedCount} 单)
              </summary>
              <div class="table-container" style="margin-top:8px">
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>订单ID</th><th>订单类型</th><th>模式</th><th>单位</th><th>老板</th><th>平台</th><th>金额</th><th>打手应得</th><th>完成时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${completedOrders.map(o => `
                        <tr>
                          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted)">${o.id}</td>
                          <td>${o.orderType}</td>
                          <td>${o.companionMode}</td>
                          <td style="color:var(--text-muted)">${o.duration || '-'}</td>
                          <td>${o.bossName}</td>
                          <td style="font-size:12px">${o.platform || '-'}</td>
                          <td>¥${o.amount.toLocaleString()}</td>
                          <td style="color:var(--success)">¥${o.companionAmount.toLocaleString()}</td>
                          <td style="font-size:11px;color:var(--text-muted)">${(o.completedAt || '').substring(0, 10)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>
          ` : ''}

          <!-- 结算历史 -->
          ${settleHistory.length > 0 ? `
          <div style="padding:0 20px 16px">
            <details style="cursor:pointer">
              <summary style="font-size:13px;color:var(--text-secondary);padding:8px 0;user-select:none">
                📜 历史结算记录 (${settleHistory.length} 次)
                <span style="font-weight:400;font-size:12px;color:var(--text-muted);margin-left:8px">— 累计已结算 ¥${totalSettled.toLocaleString()}</span>
              </summary>
              <div class="table-container" style="margin-top:8px">
                <div class="table-wrapper">
                  <table>
                    <thead>
                      <tr><th>结算编号</th><th>结算时间</th><th>结算单数</th><th>结算金额</th><th>订单总金额</th></tr>
                    </thead>
                    <tbody>
                      ${settleHistory.map(r => `
                        <tr>
                          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent-light)">${r.id}</td>
                          <td style="font-size:12px">${r.settledAt}</td>
                          <td style="font-weight:600">${r.orderCount} 单</td>
                          <td style="font-weight:700;color:var(--success)">¥${r.amount.toLocaleString()}</td>
                          <td style="color:var(--text-secondary)">¥${r.totalAmount.toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>
          ` : ''}

          <!-- 结算按钮 —— 只有有未结算订单时才显示 -->
          ${pendingCount > 0 ? `
          <div class="cs-settle-bar" id="settle-bar-${comp.id}">
            <div class="cs-settle-info">
              <span>本次结算金额（抽成后）：</span>
              <strong id="settle-amount-${comp.id}" style="color:var(--success);font-size:20px">¥${pendingAmount.toLocaleString()}</strong>
              <span id="settle-count-${comp.id}" style="color:var(--text-muted);font-size:12px">（${pendingCount} 笔订单）</span>
            </div>
            <button class="btn btn-success btn-lg" onclick="settleCompanionSelected('${comp.id}')" style="padding:12px 32px;font-size:15px">
              💰 结算给 ${comp.name}
            </button>
          </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  `;
}

// ============ 老板未结算 ============
function renderUnsettledBoss(container) {
  const orders = DataStore.getUnsettledBossOrders();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h2>📋 老板未结算单</h2>
          <p>陪玩已完成，等待老板结单（${orders.length} 笔）</p>
        </div>
        <button class="btn btn-primary" onclick="openNewOrderModal()">+ 新建订单</button>
      </div>
    </div>
    ${orders.length === 0
      ? renderEmpty('暂无老板未结算订单')
      : renderOrderTable(orders, 'unsettled_boss')
    }
  `;
}

// ============ 订单查询 ============
function renderOrderQuery(container) {
  const stats = DataStore.getStats();
  const allOrders = DataStore.getOrders();

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div>
          <h2>🔍 订单查询</h2>
          <p>共 ${stats.totalOrders} 个订单 · 使用下方筛选条件搜索</p>
        </div>
        <button class="btn btn-primary" onclick="openNewOrderModal()">+ 新建订单</button>
      </div>
    </div>

    <div class="filter-bar" id="queryFilters">
      <div class="form-group">
        <label class="form-label">关键词搜索</label>
        <input type="text" class="form-input search-input" id="fKeyword" placeholder="订单号 / 陪玩 / 老板名称..." oninput="applyQueryFilters()">
      </div>
      <div class="form-group">
        <label class="form-label">订单类型</label>
        <select class="form-select" id="fOrderType" onchange="applyQueryFilters()">
          <option value="">全部类型</option>
          ${orderTypes.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">保密级别</label>
        <select class="form-select" id="fConfidentiality" onchange="applyQueryFilters()">
          <option value="">全部级别</option>
          ${confidentialityOptions.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">陪玩模式</label>
        <select class="form-select" id="fCompanionMode" onchange="applyQueryFilters()">
          <option value="">全部模式</option>
          ${companionModes.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">订单状态</label>
        <select class="form-select" id="fStatus" onchange="applyQueryFilters()">
          <option value="">全部状态</option>
          <option value="active">进行中</option>
          <option value="unsettled_companion">陪玩未结算</option>
          <option value="unsettled_boss">老板未结算</option>
          <option value="completed">已完成</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">计价类目</label>
        <select class="form-select" id="fPricing" onchange="applyQueryFilters()">
          <option value="">全部类目</option>
          ${pricingCategories.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">开始日期</label>
        <input type="date" class="form-input" id="fDateFrom" onchange="applyQueryFilters()" style="min-width:140px">
      </div>
      <div class="form-group">
        <label class="form-label">结束日期</label>
        <input type="date" class="form-input" id="fDateTo" onchange="applyQueryFilters()" style="min-width:140px">
      </div>
      <div class="form-group" style="align-self:flex-end">
        <button class="btn btn-primary" onclick="applyQueryFilters()">查询</button>
        <button class="btn" onclick="resetQueryFilters()">重置</button>
      </div>
    </div>

    <div id="queryResults">
      ${renderOrderTable(allOrders, 'query')}
    </div>
  `;

  // 如果有待应用的筛选条件（从汇总报表联动过来），自动填入并触发筛选
  if (pendingQueryFilters) {
    const f = pendingQueryFilters;
    if (f.dateFrom) {
      const el = document.getElementById('fDateFrom');
      if (el) el.value = f.dateFrom;
    }
    if (f.dateTo) {
      const el = document.getElementById('fDateTo');
      if (el) el.value = f.dateTo;
    }
    if (f.status) {
      const el = document.getElementById('fStatus');
      if (el) el.value = f.status;
    }
    pendingQueryFilters = null;
    applyQueryFilters();
  }
}

function applyQueryFilters() {
  const filters = {
    keyword: document.getElementById('fKeyword')?.value || '',
    orderType: document.getElementById('fOrderType')?.value || '',
    confidentiality: document.getElementById('fConfidentiality')?.value || '',
    companionMode: document.getElementById('fCompanionMode')?.value || '',
    status: document.getElementById('fStatus')?.value || '',
    pricingCategory: document.getElementById('fPricing')?.value || '',
    dateFrom: document.getElementById('fDateFrom')?.value || '',
    dateTo: document.getElementById('fDateTo')?.value || '',
  };

  const results = DataStore.queryOrders(filters);
  const resultEl = document.getElementById('queryResults');
  resultEl.innerHTML = results.length === 0
    ? renderEmpty('未找到匹配的订单')
    : renderOrderTable(results, 'query');
}

function resetQueryFilters() {
  ['fKeyword', 'fOrderType', 'fConfidentiality', 'fCompanionMode', 'fStatus', 'fPricing', 'fDateFrom', 'fDateTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = ''; }
  });
  applyQueryFilters();
}

// ============ 充值系统 ============
function renderRecharge(container) {
  const bosses = DataStore.getBosses();
  const records = DataStore.getRechargeRecords();

  container.innerHTML = `
    <div class="page-header">
      <h2>💳 充值系统</h2>
      <p>为老板账户充值</p>
    </div>

    <div class="recharge-panel">
      <h3>新建充值</h3>
      <div class="recharge-form">
        <div class="form-group">
          <label class="form-label">选择老板</label>
          <select class="form-select" id="rBoss">
            ${bosses.map(b => `<option value="${b.id}">${b.name} (余额: ¥${b.balance.toLocaleString()})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">充值方式</label>
          <select class="form-select" id="rMethod">
            ${rechargeMethods.map(m => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full-width">
          <label class="form-label">充值金额 (¥)</label>
          <input type="number" class="form-input" id="rAmount" placeholder="请输入充值金额" min="1" step="0.01" value="500">
          <div class="recharge-quick-amounts">
            <button type="button" onclick="setRechargeAmount(100)">¥100</button>
            <button type="button" onclick="setRechargeAmount(500)">¥500</button>
            <button type="button" onclick="setRechargeAmount(1000)">¥1,000</button>
            <button type="button" onclick="setRechargeAmount(2000)">¥2,000</button>
            <button type="button" onclick="setRechargeAmount(5000)">¥5,000</button>
            <button type="button" onclick="setRechargeAmount(10000)">¥10,000</button>
          </div>
        </div>
        <div class="form-group full-width">
          <button class="btn btn-primary" onclick="doRecharge()" style="padding:12px 32px; font-size:15px;">
            💰 确认充值
          </button>
        </div>
      </div>
    </div>

    <div class="recent-section">
      <h3 class="section-title">充值记录</h3>
      ${renderRechargeTable(records)}
    </div>
  `;
}

function setRechargeAmount(amount) {
  document.getElementById('rAmount').value = amount;
}

function doRecharge() {
  const bossId = document.getElementById('rBoss').value;
  const amount = parseFloat(document.getElementById('rAmount').value);
  const method = document.getElementById('rMethod').value;

  if (!amount || amount <= 0) {
    showToast('请输入有效的充值金额', 'error');
    return;
  }
  if (amount > 100000) {
    showToast('单笔充值上限 ¥100,000', 'error');
    return;
  }

  DataStore.recharge(bossId, amount, method);
  saveData();

  // 更新选中老板余额显示
  const boss = DataStore.getBosses().find(b => b.id === bossId);
  const selectEl = document.getElementById('rBoss');
  const selectedOption = selectEl.options[selectEl.selectedIndex];
  selectedOption.text = `${boss.name} (余额: ¥${boss.balance.toLocaleString()})`;

  document.getElementById('rAmount').value = '500';
  showToast(`充值成功！¥${amount.toLocaleString()} 已到账`, 'success');
  updateBadges();

  // 刷新充值记录表格
  const recordsContainer = document.querySelector('.recent-section:last-child');
  if (recordsContainer) {
    const records = DataStore.getRechargeRecords();
    recordsContainer.innerHTML = `<h3 class="section-title">充值记录</h3>${renderRechargeTable(records)}`;
  }
}

// ============ 订单操作 ============
function completeActiveOrder(orderId) {
  showConfirm({
    title: '确认结单',
    message: '确认该订单已结单？结单后订单将进入陪玩待结算状态。',
    onConfirm: () => {
      if (DataStore.completeOrder(orderId)) {
        saveData();
        updateBadges();
        switchTab(currentTab);
        showToast('订单已结单，等待结算给陪玩', 'success');
      }
    }
  });
}

function settleBossOrder(orderId) {
  showConfirm({
    title: '确认老板结单',
    message: '确认该老板已完成结单？结单后订单将进入陪玩待结算状态。',
    onConfirm: () => {
      if (DataStore.settleBoss(orderId)) {
        saveData();
        updateBadges();
        switchTab(currentTab);
        showToast('老板已结单，等待公司结算给陪玩', 'success');
      }
    }
  });
}

function settleCompanionOrder(orderId) {
  showConfirm({
    title: '确认结算给陪玩',
    message: '确认将该订单结算给陪玩？结算后订单将标记为已完成。',
    onConfirm: () => {
      if (DataStore.settleCompanion(orderId)) {
        saveData();
        updateBadges();
        switchTab(currentTab);
        showToast('已结算给陪玩，订单已完成', 'success');
      }
    }
  });
}

function settleCompanionAll(companionId) {
  const unsettled = DataStore.getCompanionUnsettledOrders(companionId);
  if (unsettled.length === 0) {
    showToast('该打手没有待结算订单', 'info');
    return;
  }
  const totalAmount = unsettled.reduce((sum, o) => sum + o.companionAmount, 0);
  const comp = DataStore.getCompanions().find(c => c.id === companionId);
  showConfirm({
    title: '💰 确认结算',
    message: `确认结算给「${comp?.name || companionId}」？\n\n待结算 ${unsettled.length} 笔订单，合计 ¥${totalAmount.toLocaleString()}（已扣除公司抽成）。\n\n结算后该打手待结算金额将清零，所有订单标记为已完成。`,
    onConfirm: () => {
      const record = DataStore.settleOrdersByCompanion(companionId);
      if (record) {
        saveData();
        updateBadges();
        switchTab('unsettled-companion');
        showToast(`已结算 ¥${record.amount.toLocaleString()} 给 ${record.companionName}`, 'success');
      }
    }
  });
}

// ============ 陪玩明细 — 部分结算功能 ============

// 全选 / 取消全选
function toggleSelectAllCompanion(companionId, checked) {
  const checkboxes = document.querySelectorAll('.settle-check-' + companionId);
  checkboxes.forEach(cb => { cb.checked = checked; });
  updateSettleSummary(companionId);
}

// 更新结算摘要（选中订单的金额和数量）
function updateSettleSummary(companionId) {
  const checkboxes = document.querySelectorAll('.settle-check-' + companionId);
  let selectedAmount = 0;
  let selectedGross = 0;
  let selectedCount = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selectedAmount += parseFloat(cb.dataset.companionAmount || 0);
      selectedGross += parseFloat(cb.dataset.amount || 0);
      selectedCount++;
    }
  });

  // 更新全选复选框状态
  const allCb = document.getElementById('select-all-' + companionId);
  if (allCb) {
    const totalCbs = checkboxes.length;
    if (selectedCount === 0) allCb.indeterminate = false;
    else if (selectedCount === totalCbs) allCb.indeterminate = false;
    else allCb.indeterminate = true;
    allCb.checked = (selectedCount === totalCbs && totalCbs > 0);
  }

  // 更新结算栏
  const amountEl = document.getElementById('settle-amount-' + companionId);
  const countEl = document.getElementById('settle-count-' + companionId);
  if (amountEl) amountEl.textContent = '¥' + selectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (countEl) countEl.textContent = '（' + selectedCount + ' 笔订单 · 总额 ¥' + selectedGross.toLocaleString() + '）';

  // 更新结算按钮状态
  const settleBar = document.getElementById('settle-bar-' + companionId);
  if (settleBar) {
    const btn = settleBar.querySelector('button');
    if (btn) {
      btn.disabled = selectedCount === 0;
      btn.style.opacity = selectedCount === 0 ? '0.5' : '1';
    }
  }
}

// 结算选中订单
function settleCompanionSelected(companionId) {
  const checkboxes = document.querySelectorAll('.settle-check-' + companionId);
  const selectedIds = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selectedIds.push(cb.dataset.orderId);
  });

  // 如果没选中任何订单，默认结算全部
  if (selectedIds.length === 0) {
    settleCompanionAll(companionId);
    return;
  }

  const comp = DataStore.getCompanions().find(c => c.id === companionId);
  const unsettled = DataStore.getCompanionUnsettledOrders(companionId);
  const selectedOrders = unsettled.filter(o => selectedIds.includes(o.id));
  const totalAmount = selectedOrders.reduce((sum, o) => sum + o.companionAmount, 0);
  const remainingCount = unsettled.length - selectedOrders.length;

  showConfirm({
    title: '💰 部分结算',
    message: `确认结算「${comp?.name || companionId}」的 ${selectedOrders.length} 笔订单？\n\n结算金额（抽成后）：¥${totalAmount.toLocaleString()}\n\n${remainingCount > 0 ? '剩余 ' + remainingCount + ' 笔订单将继续保留在待结算列表。' : '所有待结算订单将全部结清。'}`,
    onConfirm: () => {
      const record = DataStore.settleOrdersByIds(companionId, selectedIds);
      if (record) {
        saveData();
        updateBadges();
        switchTab('unsettled-companion');
        showToast(`已结算 ¥${record.amount.toLocaleString()}（${record.orderCount} 笔）给 ${record.companionName}`, 'success');
      }
    }
  });
}

// ============ 新建 / 编辑 订单 ============
function openNewOrderModal() {
  const companions = DataStore.getCompanions();
  const bosses = DataStore.getBosses();
  showModal({
    title: '📝 新建订单',
    content: buildOrderForm({}, companions, bosses, true),
    width: '680px',
    onConfirm: () => {
      const data = collectOrderForm();
      if (!data.orderType || !data.companionMode) {
        showToast('请填写订单类型和陪玩模式', 'error');
        return false;
      }
      DataStore.addOrder(data);
      saveData();
      updateBadges();
      switchTab(currentTab);
      showToast('订单创建成功！', 'success');
    },
    confirmText: '创建订单',
  });
}

function openEditOrderModal(orderId) {
  const order = DataStore.getOrder(orderId);
  if (!order) return;
  const companions = DataStore.getCompanions();
  const bosses = DataStore.getBosses();
  showModal({
    title: '✏️ 编辑订单',
    content: buildOrderForm(order, companions, bosses, false),
    width: '680px',
    onConfirm: () => {
      const data = collectOrderForm();
      DataStore.updateOrder(orderId, data);
      saveData();
      updateBadges();
      switchTab(currentTab);
      showToast('订单已更新！', 'success');
    },
    confirmText: '保存修改',
  });
}

function buildOrderForm(order, companions, bosses, isNew) {
  const cOptions = companions.map(c => `<option value="${c.id}" ${order.companionId === c.id ? 'selected' : ''}>${c.name} (${c.id})</option>`).join('');
  const bOptions = bosses.map(b => `<option value="${b.id}" ${order.bossId === b.id ? 'selected' : ''}>${b.name} (${b.id})</option>`).join('');
  const isTempBoss = order.isTempBoss || (!order.bossId && order.bossName && !bosses.find(b => b.id === order.bossId));
  const tempBossVal = isTempBoss ? (order.bossName || order.bossId || '') : '';

  return `
    <div class="order-form-grid">
      <div class="form-group">
        <label class="form-label">陪玩选择</label>
        <select class="form-select" id="efCompanionId" onchange="onOrderFormCompanionChange()">${cOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">本店VIP</label>
        <select class="form-select" id="efBossId" onchange="onOrderFormBossChange()">
          <option value="">-- 选择VIP老板 --</option>
          ${bOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">临时老板ID</label>
        <input type="text" class="form-input" id="efTempBossName" value="${tempBossVal}" placeholder="输入临时老板名称（非VIP）" oninput="onTempBossInput()">
      </div>
      <div class="form-group">
        <label class="form-label">订单类型</label>
        <select class="form-select" id="efOrderType">${orderTypes.map(t => `<option value="${t}" ${order.orderType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">保密级别</label>
        <select class="form-select" id="efConfidentiality">${confidentialityOptions.map(c => `<option value="${c}" ${order.confidentiality === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">陪玩模式</label>
        <select class="form-select" id="efCompanionMode">${companionModes.map(m => `<option value="${m}" ${order.companionMode === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">接单平台</label>
        <input type="text" class="form-input" id="efPlatform" value="${order.platform || ''}" list="platformList" placeholder="如：微信、代练通...">
        <datalist id="platformList">${platforms.map(p => `<option value="${p}">`).join('')}</datalist>
      </div>
      <div class="form-group">
        <label class="form-label">计价类目</label>
        <select class="form-select" id="efPricingCategory">${pricingCategories.map(p => `<option value="${p}" ${order.pricingCategory === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">单位</label>
        <input type="text" class="form-input" id="efDuration" value="${order.duration || ''}" placeholder="如：1h、800w、5把...">
      </div>
      <div class="form-group">
        <label class="form-label">订单金额 (¥)</label>
        <input type="number" class="form-input" id="efAmount" value="${order.amount || ''}" step="0.01" min="0" oninput="onOrderFormAmountChange()">
      </div>
      <div class="form-group">
        <label class="form-label">公司抽成比例 (%)</label>
        <input type="number" class="form-input" id="efCommissionRate" value="${order.commissionRate || 20}" step="1" min="0" max="100" oninput="onOrderFormAmountChange()">
      </div>
      <div class="form-group">
        <label class="form-label">订单状态</label>
        <select class="form-select" id="efStatus" onchange="onOrderFormStatusChange()">
          <option value="active" ${order.status === 'active' ? 'selected' : ''}>进行中</option>
          <option value="unsettled_boss" ${order.status === 'unsettled_boss' ? 'selected' : ''}>老板未结算</option>
          <option value="unsettled_companion" ${order.status === 'unsettled_companion' ? 'selected' : ''}>陪玩未结算</option>
          <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>已完成</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">陪玩单号</label>
        <input type="text" class="form-input" id="efOrderNo" value="${order.orderNo || ''}" placeholder="自动生成或手动输入">
      </div>
      <div class="form-group">
        <label class="form-label">开始时间</label>
        <input type="datetime-local" class="form-input" id="efStartTime" value="${(order.startTime || '').replace(' ', 'T').substring(0, 16)}">
      </div>
      <div class="form-group full-width amount-preview" id="amountPreview">
        <div><span>陪玩应得：</span><strong id="previewCompanion" style="color:var(--success)">¥${order.companionAmount?.toLocaleString() || '0'}</strong></div>
        <div><span>公司抽成：</span><strong id="previewCompany" style="color:var(--info)">¥${order.companyAmount?.toLocaleString() || '0'}</strong></div>
      </div>
    </div>
  `;
}

function onOrderFormCompanionChange() {
  const sel = document.getElementById('efCompanionId');
  if (!sel) return;
  const c = DataStore.getCompanions().find(x => x.id === sel.value);
  if (c) {
    const efOrderType = document.getElementById('efOrderType');
    if (efOrderType && c.games && c.games.length > 0 && !efOrderType.value) efOrderType.value = c.games[0];
  }
}

function onOrderFormBossChange() {
  // 选了本店VIP → 清空临时老板ID
  const bossSelect = document.getElementById('efBossId');
  const tempInput = document.getElementById('efTempBossName');
  if (bossSelect && bossSelect.value && tempInput) {
    tempInput.value = '';
  }
}

function onTempBossInput() {
  // 输入了临时老板ID → 清空本店VIP选择
  const bossSelect = document.getElementById('efBossId');
  const tempInput = document.getElementById('efTempBossName');
  if (tempInput && tempInput.value.trim() && bossSelect) {
    bossSelect.value = '';
  }
}

function onOrderFormStatusChange() {
  const status = document.getElementById('efStatus')?.value;
  const settledEl = document.getElementById('efBossSettled');
  if (!settledEl) return;
  if (status === 'completed' || status === 'unsettled_companion') {
    settledEl.checked = true;
  }
}

function onOrderFormAmountChange() {
  const amount = parseFloat(document.getElementById('efAmount')?.value) || 0;
  const rate = parseFloat(document.getElementById('efCommissionRate')?.value) || 0;
  const companionAmount = parseFloat((amount * (1 - rate / 100)).toFixed(2));
  const companyAmount = parseFloat((amount * rate / 100).toFixed(2));
  const pc = document.getElementById('previewCompanion');
  const pcomp = document.getElementById('previewCompany');
  if (pc) pc.textContent = '¥' + companionAmount.toLocaleString();
  if (pcomp) pcomp.textContent = '¥' + companyAmount.toLocaleString();
}

function collectOrderForm() {
  const bossId = document.getElementById('efBossId')?.value || '';
  const tempBossName = document.getElementById('efTempBossName')?.value?.trim() || '';

  return {
    companionId: document.getElementById('efCompanionId')?.value || '',
    bossId: tempBossName ? '' : bossId,
    bossName: tempBossName ? '' : (DataStore.getBosses().find(b => b.id === bossId)?.name || ''),
    tempBossName: tempBossName,
    orderType: document.getElementById('efOrderType')?.value || '',
    confidentiality: document.getElementById('efConfidentiality')?.value || '普通',
    companionMode: document.getElementById('efCompanionMode')?.value || '',
    platform: document.getElementById('efPlatform')?.value?.trim() || '',
    pricingCategory: document.getElementById('efPricingCategory')?.value || '',
    duration: document.getElementById('efDuration')?.value || '1',
    amount: document.getElementById('efAmount')?.value || '0',
    commissionRate: document.getElementById('efCommissionRate')?.value || '20',
    status: document.getElementById('efStatus')?.value || 'active',
    orderNo: document.getElementById('efOrderNo')?.value || '',
    startTime: document.getElementById('efStartTime')?.value?.replace('T', ' ') + ':00' || '',
  };
}

function deleteOrder(orderId) {
  const order = DataStore.getOrder(orderId);
  showConfirm({
    title: '⚠️ 删除订单',
    message: `确认删除订单 ${order.id}（${order.orderType} - ${order.companionName}）？此操作不可撤销。`,
    onConfirm: () => {
      if (DataStore.deleteOrder(orderId)) {
        saveData();
        updateBadges();
        switchTab(currentTab);
        showToast('订单已删除', 'info');
      }
    }
  });
}

// ============ 通用弹窗 ============
function showModal({ title, content, width, onConfirm, confirmText, showCancel }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:${width || '520px'}">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">${content}</div>
      <div class="modal-actions">
        ${showCancel !== false ? '<button class="btn" id="modalCancelBtn">取消</button>' : ''}
        <button class="btn btn-primary" id="modalConfirmBtn">${confirmText || '确认'}</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);

  document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('modalConfirmBtn').addEventListener('click', () => {
    if (onConfirm) {
      const result = onConfirm();
      if (result === false) return; // 阻止关闭
    }
    closeModal();
  });
}

function viewOrderDetail(orderId) {
  const order = DataStore.getOrders().find(o => o.id === orderId);
  if (!order) return;

  const statusLabels = {
    'active': '<span class="badge badge-active">进行中</span>',
    'unsettled_companion': '<span class="badge badge-unsettled">陪玩未结算</span>',
    'unsettled_boss': '<span class="badge badge-danger">老板未结算</span>',
    'completed': '<span class="badge badge-settled">已完成</span>',
  };

  const confLabels = {
    '普通': '<span class="badge-confidentiality badge-conf-normal">普通</span>',
    '机密': '<span class="badge-confidentiality badge-conf-secret">机密</span>',
    '绝密': '<span class="badge-confidentiality badge-conf-topsecret">绝密</span>',
  };

  const settlementBtns = [];
  if (order.status === 'unsettled_boss') settlementBtns.push(`<button class="btn btn-primary" onclick="settleBossOrder('${order.id}');closeModal()">老板结单</button>`);
  if (order.status === 'unsettled_companion') settlementBtns.push(`<button class="btn btn-success" onclick="settleCompanionOrder('${order.id}');closeModal()">结算给陪玩</button>`);
  settlementBtns.push(`<button class="btn btn-edit" onclick="openEditOrderModal('${order.id}');closeModal()">编辑订单</button>`);

  const bossObj = (!order.isTempBoss && order.bossId) ? DataStore.getBosses().find(b => b.id === order.bossId) : null;
  const bossBalanceDisplay = bossObj ? `¥${bossObj.balance?.toLocaleString?.()||bossObj.balance||0}` : '非VIP老板';
  const bossRemark = bossObj?.remark || '';

  const content = `
    <p style="margin-bottom:16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--accent-light)">${order.id} ${statusLabels[order.status] || ''}</p>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">陪玩ID</span><span class="detail-value">${order.companionId}</span></div>
      <div class="detail-item"><span class="detail-label">陪玩名称</span><span class="detail-value">${order.companionName}</span></div>
      <div class="detail-item"><span class="detail-label">老板ID</span><span class="detail-value">${order.bossId}${bossObj ? ` <span style="color:var(--success);font-weight:600">(${bossBalanceDisplay})</span>` : ''}</span></div>
      <div class="detail-item"><span class="detail-label">老板名称</span><span class="detail-value">${order.bossName}${order.isTempBoss ? ' <span style="font-size:11px;color:var(--warning)">[临时]</span>' : ''}</span></div>
      ${bossRemark ? `<div class="detail-item"><span class="detail-label">老板备注</span><span class="detail-value" style="color:var(--text-secondary)">${bossRemark}</span></div>` : ''}
      <div class="detail-item"><span class="detail-label">订单类型</span><span class="detail-value">${order.orderType}</span></div>
      <div class="detail-item"><span class="detail-label">保密级别</span><span class="detail-value">${confLabels[order.confidentiality] || order.confidentiality}</span></div>
      <div class="detail-item"><span class="detail-label">陪玩模式</span><span class="detail-value">${order.companionMode}</span></div>
      <div class="detail-item"><span class="detail-label">平台</span><span class="detail-value">${order.platform || '-'}</span></div>
      <div class="detail-item"><span class="detail-label">计价类目</span><span class="detail-value">${order.pricingCategory}</span></div>
      <div class="detail-item"><span class="detail-label">单位</span><span class="detail-value">${order.duration}</span></div>
      <div class="detail-item"><span class="detail-label">陪玩单号</span><span class="detail-value" style="font-family:'JetBrains Mono',monospace">${order.orderNo}</span></div>
      <div class="detail-item"><span class="detail-label">公司抽成比例</span><span class="detail-value">${order.commissionRate}%</span></div>
      <div class="detail-item"><span class="detail-label">老板是否结单</span><span class="detail-value">${order.bossSettled ? '✅ 已结' : '❌ 未结'}</span></div>
      <div class="detail-item"><span class="detail-label">订单金额</span><span class="detail-value" style="color:var(--accent-light);font-size:16px">¥${order.amount.toLocaleString()}</span></div>
      <div class="detail-item"><span class="detail-label">陪玩应得</span><span class="detail-value" style="color:var(--success)">¥${order.companionAmount.toLocaleString()}</span></div>
      <div class="detail-item"><span class="detail-label">公司抽成</span><span class="detail-value" style="color:var(--info)">¥${order.companyAmount.toLocaleString()}</span></div>
      <div class="detail-item"><span class="detail-label">开始时间</span><span class="detail-value" style="font-family:'JetBrains Mono',monospace;font-size:12px">${order.startTime}</span></div>
      ${order.completedAt ? `<div class="detail-item"><span class="detail-label">完成时间</span><span class="detail-value" style="font-family:'JetBrains Mono',monospace;font-size:12px">${order.completedAt}</span></div>` : ''}
    </div>
  `;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:600px">
      <div class="modal-header">
        <h3>📋 订单详情</h3>
        <button class="modal-close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">${content}</div>
      <div class="modal-actions">
        ${settlementBtns.join('')}
        <button class="btn" onclick="closeModal()">关闭</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();
}

function showConfirm({ title, message, onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close-btn" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-secondary);font-size:14px;line-height:1.6">${message}</p>
      </div>
      <div class="modal-actions">
        <button class="btn" id="cancelBtn">取消</button>
        <button class="btn btn-primary" id="confirmBtn">确认</button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);

  document.getElementById('confirmBtn').addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
}

// ============ 渲染辅助 ============
function renderOrderTable(orders, context) {
  const statusLabels = {
    'active': '<span class="badge badge-active">进行中</span>',
    'unsettled_companion': '<span class="badge badge-unsettled">陪玩未结算</span>',
    'unsettled_boss': '<span class="badge badge-danger">老板未结算</span>',
    'completed': '<span class="badge badge-settled">已完成</span>',
  };

  const confLabels = {
    '普通': '<span class="badge-confidentiality badge-conf-normal">普通</span>',
    '机密': '<span class="badge-confidentiality badge-conf-secret">机密</span>',
    '绝密': '<span class="badge-confidentiality badge-conf-topsecret">绝密</span>',
  };

  return `
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>订单ID</th>
              <th>陪玩</th>
              <th>老板</th>
              <th>订单类型</th>
              <th>保密级别</th>
              <th>陪玩模式</th>
              <th>平台</th>
              <th>计价</th>
              <th>单位</th>
              <th>金额</th>
              <th>抽成</th>
              <th>老板结单</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => {
              // 本店VIP老板显示余额
              const bossObj = (!o.isTempBoss && o.bossId) ? DataStore.getBosses().find(b => b.id === o.bossId) : null;
              const bossBalanceHtml = bossObj ? ` <span style="font-size:10px;color:var(--success);font-weight:600">(¥${bossObj.balance?.toLocaleString?.()||bossObj.balance||0})</span>` : '';
              return `
              <tr>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-light)">${o.id}</td>
                <td>${o.companionName}</td>
                <td>${o.bossName}${o.isTempBoss ? ' <span style="font-size:10px;color:var(--warning)">临</span>' : ''}${bossBalanceHtml}</td>
                <td>${o.orderType}</td>
                <td>${confLabels[o.confidentiality] || o.confidentiality}</td>
                <td>${o.companionMode}</td>
                <td style="font-size:12px">${o.platform || '-'}</td>
                <td>${o.pricingCategory}</td>
                <td>${o.duration || '-'}</td>
                <td style="font-weight:700;color:var(--accent-light)">¥${o.amount.toLocaleString()}</td>
                <td>${o.commissionRate}%</td>
                <td>${o.bossSettled ? '✅ 已结' : '❌ 未结'}</td>
                <td>${statusLabels[o.status] || o.status}</td>
                <td>
                  <button class="btn btn-xs" onclick="viewOrderDetail('${o.id}')" title="查看详情">详情</button>
                  <button class="btn btn-xs btn-edit" onclick="openEditOrderModal('${o.id}')" title="编辑订单" style="margin-left:4px">编辑</button>
                  ${o.status === 'active' ? `<button class="btn btn-xs btn-success" onclick="completeActiveOrder('${o.id}')" style="margin-left:4px">结单</button>` : ''}
                  ${o.status === 'unsettled_boss' ? `<button class="btn btn-xs btn-primary" onclick="settleBossOrder('${o.id}')" style="margin-left:4px">结单</button>` : ''}
                  ${o.status === 'unsettled_companion' ? `<button class="btn btn-xs btn-success" onclick="settleCompanionOrder('${o.id}')" style="margin-left:4px">结算</button>` : ''}
                  <button class="btn btn-xs btn-delete" onclick="deleteOrder('${o.id}')" title="删除订单" style="margin-left:4px">删除</button>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderQuickTable(orders, withActions) {
  const confLabels = {
    '普通': '<span class="badge-confidentiality badge-conf-normal">普通</span>',
    '机密': '<span class="badge-confidentiality badge-conf-secret">机密</span>',
    '绝密': '<span class="badge-confidentiality badge-conf-topsecret">绝密</span>',
  };

  return `
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>订单ID</th>
              <th>陪玩</th>
              <th>老板</th>
              <th>类型</th>
              <th>保密</th>
              <th>模式</th>
              <th>平台</th>
              <th>金额</th>
              <th>抽成</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => {
              const bObj = (!o.isTempBoss && o.bossId) ? DataStore.getBosses().find(x => x.id === o.bossId) : null;
              const balHtml = bObj ? ` <span style="font-size:10px;color:var(--success);font-weight:600">(¥${bObj.balance?.toLocaleString?.()||bObj.balance||0})</span>` : '';
              return `
              <tr>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-light)">${o.id}</td>
                <td>${o.companionName}</td>
                <td>${o.bossName}${o.isTempBoss ? ' <span style="font-size:10px;color:var(--warning)">临</span>' : ''}${balHtml}</td>
                <td>${o.orderType}</td>
                <td>${confLabels[o.confidentiality] || o.confidentiality}</td>
                <td>${o.companionMode}</td>
                <td style="font-size:12px">${o.platform || '-'}</td>
                <td style="font-weight:700;color:var(--accent-light)">¥${o.amount.toLocaleString()}</td>
                <td>${o.commissionRate}%</td>
                <td><button class="btn btn-xs" onclick="viewOrderDetail('${o.id}')">详情</button><button class="btn btn-xs btn-edit" onclick="openEditOrderModal('${o.id}')" style="margin-left:4px">编辑</button></td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRechargeTable(records) {
  if (records.length === 0) return renderEmpty('暂无充值记录');

  return `
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>充值编号</th>
              <th>老板</th>
              <th>金额</th>
              <th>方式</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${r.id}</td>
                <td>${r.bossName}</td>
                <td style="font-weight:700;color:var(--success)">¥${r.amount.toLocaleString()}</td>
                <td>${r.method}</td>
                <td>${r.status === 'success' ? '<span class="badge badge-settled">已到账</span>' : '<span class="badge badge-pending">处理中</span>'}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">${r.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderEmpty(message) {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="64" height="64">
        <rect x="2" y="3" width="20" height="18" rx="2"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="16" x2="12" y2="16"/>
      </svg>
      <h3>${message}</h3>
      <p>数据将在此处显示</p>
    </div>
  `;
}

// ============ 陪玩/打手管理 ============
function renderCompanionManager(container) {
  const companions = DataStore.getCompanions();
  const cat = DataStore.getCategories();
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div><h2>👤 陪玩/打手管理</h2><p>管理所有陪玩打手信息（${companions.length} 人）</p></div>
        <button class="btn btn-primary" onclick="openCompanionForm()">+ 添加打手</button>
      </div>
    </div>
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>ID</th><th>名称</th><th>等级</th><th>擅长游戏</th><th>评分</th><th>操作</th></tr></thead>
          <tbody>
            ${companions.map(c => `
              <tr>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-light)">${c.id}</td>
                <td><span class="editable-text" id="cname-${c.id}" onclick="inlineEditText('cname-${c.id}','companion','${c.id}','name')">${c.name}</span></td>
                <td><span class="editable-text" id="clevel-${c.id}" onclick="inlineEditText('clevel-${c.id}','companion','${c.id}','level')">${c.level}</span></td>
                <td><div class="tag-list" id="cgames-${c.id}">${(c.games||[]).map((g,i) => `<span class="tag-item">${g}<button class="tag-remove" onclick="removeCompanionGame('${c.id}',${i})">&times;</button></span>`).join('')}<button class="tag-add-btn" onclick="addCompanionGame('${c.id}')">+ 添加</button></div></td>
                <td><span class="editable-text" id="crating-${c.id}" onclick="inlineEditText('crating-${c.id}','companion','${c.id}','rating')">${c.rating}</span></td>
                <td><button class="btn btn-xs btn-edit" onclick="openCompanionForm('${c.id}')">编辑</button><button class="btn btn-xs btn-delete" onclick="deleteCompanionItem('${c.id}')" style="margin-left:4px">删除</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openCompanionForm(companionId) {
  const c = companionId ? DataStore.getCompanions().find(x => x.id === companionId) : null;
  const isNew = !c;
  const cat = DataStore.getCategories();
  showModal({
    title: isNew ? '👤 添加打手' : '✏️ 编辑打手',
    width: '560px',
    content: `
      <div class="order-form-grid">
        <div class="form-group"><label class="form-label">名称</label><input type="text" class="form-input" id="cfName" value="${c?.name||''}" placeholder="如：金牌打手·阿杰"></div>
        <div class="form-group"><label class="form-label">等级</label><input type="text" class="form-input" id="cfLevel" value="${c?.level||''}" placeholder="如：王者"></div>
        <div class="form-group"><label class="form-label">评分</label><input type="number" class="form-input" id="cfRating" value="${c?.rating||5.0}" step="0.1" min="0" max="5"></div>
        <div class="form-group full-width">
          <label class="form-label">擅长游戏（勾选）</label>
          <div class="checkbox-group">${cat.orderTypes.map(g => {
            const checked = c?.games?.includes(g) ? 'checked' : '';
            return `<label class="checkbox-label"><input type="checkbox" value="${g}" ${checked} class="cfGame"> ${g}</label>`;
          }).join('')}</div>
        </div>
      </div>
    `,
    confirmText: isNew ? '添加' : '保存',
    onConfirm: () => {
      const name = document.getElementById('cfName')?.value?.trim();
      const level = document.getElementById('cfLevel')?.value?.trim();
      const rating = parseFloat(document.getElementById('cfRating')?.value) || 5.0;
      const games = [...document.querySelectorAll('.cfGame:checked')].map(cb => cb.value);
      if (!name) { showToast('请输入名称', 'error'); return false; }
      if (isNew) {
        DataStore.addCompanion({ name, level, games, rating });
      } else {
        DataStore.updateCompanion(companionId, { name, level, games, rating });
      }
      saveData(); updateBadges(); switchTab('manage-companions');
      showToast(isNew ? '打手已添加' : '打手已更新', 'success');
    }
  });
}

function deleteCompanionItem(id) {
  const c = DataStore.getCompanions().find(x => x.id === id);
  showConfirm({ title: '⚠️ 删除打手', message: `确认删除 ${c?.name||id}？`, onConfirm: () => { DataStore.deleteCompanion(id); saveData(); switchTab('manage-companions'); showToast('打手已删除', 'info'); } });
}

function addCompanionGame(cid) {
  const c = DataStore.getCompanions().find(x => x.id === cid);
  const cat = DataStore.getCategories();
  const available = cat.orderTypes.filter(g => !c.games.includes(g));
  if (available.length === 0) { showToast('没有更多游戏可选', 'info'); return; }
  showModal({ title: '选择游戏', width: '400px', content: `<select class="form-select" id="cgSelect">${available.map(g => `<option>${g}</option>`).join('')}</select>`, confirmText: '添加', onConfirm: () => { const g = document.getElementById('cgSelect')?.value; if(g) { c.games.push(g); DataStore.updateCompanion(cid, c); saveData(); switchTab('manage-companions'); } } });
}

function removeCompanionGame(cid, idx) {
  const c = DataStore.getCompanions().find(x => x.id === cid);
  c.games.splice(idx, 1);
  DataStore.updateCompanion(cid, c);
  saveData();
  switchTab('manage-companions');
}

// ============ 老板管理 ============
function renderBossManager(container) {
  const bosses = DataStore.getBosses();
  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div><h2>👔 老板管理</h2><p>管理所有老板账户（${bosses.length} 人） · 结单自动扣除余额</p></div>
        <button class="btn btn-primary" onclick="openBossForm()">+ 添加老板</button>
      </div>
    </div>
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>ID</th><th>名称</th><th>VIP等级</th><th>余额</th><th>备注</th><th>操作</th></tr></thead>
          <tbody>
            ${bosses.map(b => `
              <tr>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-light)">${b.id}</td>
                <td><span class="editable-text" id="bname-${b.id}" onclick="inlineEditText('bname-${b.id}','boss','${b.id}','name')">${b.name}</span></td>
                <td><span class="editable-text" id="blevel-${b.id}" onclick="inlineEditText('blevel-${b.id}','boss','${b.id}','level')">${b.level||'VIP1'}</span></td>
                <td style="font-weight:700;color:var(--success)">¥<span class="editable-text" id="bbalance-${b.id}" onclick="inlineEditText('bbalance-${b.id}','boss','${b.id}','balance','number')">${b.balance?.toLocaleString?.()||b.balance||0}</span></td>
                <td><span class="editable-text" id="bremark-${b.id}" onclick="inlineEditText('bremark-${b.id}','boss','${b.id}','remark')" style="color:var(--text-secondary);font-size:13px">${b.remark || '<span style="color:var(--text-muted)">点击添加备注</span>'}</span></td>
                <td><button class="btn btn-xs btn-edit" onclick="openBossForm('${b.id}')">编辑</button><button class="btn btn-xs btn-delete" onclick="deleteBossItem('${b.id}')" style="margin-left:4px">删除</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openBossForm(bossId) {
  const b = bossId ? DataStore.getBosses().find(x => x.id === bossId) : null;
  const isNew = !b;
  showModal({
    title: isNew ? '👔 添加老板' : '✏️ 编辑老板',
    width: '480px',
    content: `
      <div class="order-form-grid">
        <div class="form-group"><label class="form-label">名称</label><input type="text" class="form-input" id="bfName" value="${b?.name||''}" placeholder="如：老板·张总"></div>
        <div class="form-group"><label class="form-label">VIP等级</label><input type="text" class="form-input" id="bfLevel" value="${b?.level||''}" placeholder="如：VIP3"></div>
        <div class="form-group"><label class="form-label">余额 (¥)</label><input type="number" class="form-input" id="bfBalance" value="${b?.balance||0}" step="0.01" min="0"></div>
        <div class="form-group full-width"><label class="form-label">备注</label><input type="text" class="form-input" id="bfRemark" value="${b?.remark||''}" placeholder="自定义备注信息（选填）"></div>
      </div>
    `,
    confirmText: isNew ? '添加' : '保存',
    onConfirm: () => {
      const name = document.getElementById('bfName')?.value?.trim();
      const level = document.getElementById('bfLevel')?.value?.trim();
      const balance = parseFloat(document.getElementById('bfBalance')?.value) || 0;
      const remark = document.getElementById('bfRemark')?.value?.trim() || '';
      if (!name) { showToast('请输入名称', 'error'); return false; }
      if (isNew) { DataStore.addBoss({ name, level, balance, remark }); }
      else { DataStore.updateBoss(bossId, { name, level, balance, remark }); }
      saveData(); switchTab('manage-bosses'); showToast(isNew?'老板已添加':'老板已更新', 'success');
    }
  });
}

function deleteBossItem(id) {
  const b = DataStore.getBosses().find(x => x.id === id);
  showConfirm({ title: '⚠️ 删除老板', message: `确认删除 ${b?.name||id}？关联订单不受影响。`, onConfirm: () => { DataStore.deleteBoss(id); saveData(); switchTab('manage-bosses'); showToast('老板已删除','info'); } });
}

// ============ 内联编辑 ============
function inlineEditText(elId, entityType, entityId, field, inputType) {
  const el = document.getElementById(elId);
  if (!el || el.querySelector('input')) return;
  const oldVal = el.textContent.trim();
  const type = inputType || 'text';
  el.innerHTML = `<input type="${type}" value="${oldVal}" class="inline-input" id="inline-${elId}" onblur="commitInlineEdit('${elId}','${entityType}','${entityId}','${field}','${oldVal}')" onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){this.value='${oldVal.replace(/'/g,"\\'")}';this.blur();}" autofocus>`;
  const input = document.getElementById(`inline-${elId}`);
  if (input) { input.focus(); input.select(); }
}

function commitInlineEdit(elId, entityType, entityId, field, oldVal) {
  const input = document.getElementById(`inline-${elId}`);
  const newVal = input ? input.value.trim() : oldVal;
  if (!newVal || newVal === oldVal) { document.getElementById(elId).textContent = oldVal; return; }
  if (entityType === 'companion') {
    const data = {}; data[field] = (field === 'rating') ? parseFloat(newVal) : newVal;
    DataStore.updateCompanion(entityId, data);
    saveData();
    switchTab('manage-companions');
  } else if (entityType === 'boss') {
    const data = {}; data[field] = (field === 'balance') ? parseFloat(newVal) : newVal;
    DataStore.updateBoss(entityId, data);
    saveData();
    switchTab('manage-bosses');
  }
}

// ============ 类目管理 ============
function renderCategoryManager(container) {
  const cat = DataStore.getCategories();
  const catDefs = [
    { key: 'orderTypes', label: '订单类型（游戏）', icon: '🎮', desc: '用于订单类型和陪玩擅长游戏', color: '#a78bfa' },
    { key: 'confidentialityOptions', label: '保密级别', icon: '🔒', desc: '普通 / 机密 / 绝密', color: '#f472b6' },
    { key: 'companionModes', label: '陪玩模式', icon: '🎯', desc: '排位上分、陪练指导等', color: '#60a5fa' },
    { key: 'pricingCategories', label: '计价类目', icon: '💰', desc: '按时/按局/包段/包天', color: '#fbbf24' },

    { key: 'rechargeMethods', label: '充值方式', icon: '💳', desc: '微信/支付宝/银行卡/现金', color: '#fb923c' },
    { key: 'platforms', label: '接单平台', icon: '📱', desc: '微信/QQ/代练通/代练妈妈/淘宝等', color: '#06b6d4' },
  ];

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header-row">
        <div><h2>⚙️ 类目管理</h2><p>管理系统中所有下拉选项和分类</p></div>
        <button class="btn" onclick="resetAllCategories()">🔄 恢复默认</button>
      </div>
    </div>
    <div class="category-panels">
      ${catDefs.map(def => {
        const items = cat[def.key] || [];
        return `
          <div class="category-panel" style="border-left:3px solid ${def.color}">
            <div class="category-header">
              <div>
                <span class="category-icon">${def.icon}</span><strong>${def.label}</strong>
                <span class="category-hint">${def.desc}</span>
              </div>
              <div class="category-actions">
                <button class="btn btn-xs" onclick="resetSingleCategory('${def.key}')">重置</button>
              </div>
            </div>
            <div class="tag-list editable-tags" id="tags-${def.key}">
              ${items.map((v, i) => `<span class="tag-item tag-editable">
                <span class="tag-text" id="tagtxt-${def.key}-${i}" onclick="startEditTag('${def.key}',${i},'${v.replace(/'/g,"\\'")}')">${v}</span>
                <button class="tag-remove" onclick="removeCategoryItem('${def.key}','${v.replace(/'/g,"\\'")}')" title="删除">&times;</button>
              </span>`).join('')}
              <button class="tag-add-btn" onclick="addCategoryItemPrompt('${def.key}')">+ 添加项</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function startEditTag(catKey, idx, oldVal) {
  const el = document.getElementById(`tagtxt-${catKey}-${idx}`);
  if (!el || el.querySelector('input')) return;
  el.innerHTML = `<input type="text" value="${oldVal}" class="inline-input tag-inline-input" onblur="commitEditTag('${catKey}',${idx},'${oldVal.replace(/'/g,"\\'")}',this.value)" onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){this.value='${oldVal.replace(/'/g,"\\'")}';this.blur();}" autofocus>`;
  const inp = el.querySelector('input');
  if (inp) { inp.focus(); inp.select(); }
}

function commitEditTag(catKey, idx, oldVal, newVal) {
  newVal = newVal.trim();
  if (!newVal || newVal === oldVal) { switchTab('manage-categories'); return; }
  DataStore.updateCategoryItem(catKey, oldVal, newVal);
  saveData();
  switchTab('manage-categories');
  showToast('已更新为 "' + newVal + '"', 'success');
}

function addCategoryItemPrompt(catKey) {
  const catDefs = { orderTypes:'订单类型', confidentialityOptions:'保密级别', companionModes:'陪玩模式', pricingCategories:'计价类目', rechargeMethods:'充值方式', platforms:'接单平台' };
  showModal({
    title: '➕ 添加' + (catDefs[catKey]||'项'),
    width: '400px',
    content: `<div class="form-group"><label class="form-label">新名称</label><input type="text" class="form-input" id="newCatVal" placeholder="输入新项名称" autofocus></div>`,
    confirmText: '添加',
    onConfirm: () => {
      const val = document.getElementById('newCatVal')?.value?.trim();
      if (!val) { showToast('请输入名称', 'error'); return false; }
      if (!DataStore.addCategoryItem(catKey, val)) { showToast('该项已存在', 'error'); return false; }
      saveData(); switchTab('manage-categories'); showToast('已添加: ' + val, 'success');
    }
  });
}

function removeCategoryItem(catKey, value) {
  showConfirm({ title: '⚠️ 删除项', message: `确认删除 "${value}"？不会影响已有订单。`, onConfirm: () => { DataStore.deleteCategoryItem(catKey, value); saveData(); switchTab('manage-categories'); showToast('已删除: ' + value, 'info'); } });
}

function resetSingleCategory(catKey) {
  showConfirm({ title: '🔄 重置', message: '确认重置为默认值？自定义项将丢失。', onConfirm: () => { DataStore.resetCategory(catKey); saveData(); switchTab('manage-categories'); showToast('已重置', 'success'); } });
}

function resetAllCategories() {
  showConfirm({ title: '🔄 全部重置', message: '确认将所有类目恢复为默认值？', onConfirm: () => {
    ['orderTypes','companionModes','pricingCategories','confidentialityOptions','rechargeMethods','platforms'].forEach(k => DataStore.resetCategory(k));
    saveData(); switchTab('manage-categories'); showToast('所有类目已恢复默认', 'success');
  }});
}

// ============ Toast 提示 ============
function showToast(message, type) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============ 云档案历史 ============
let _archivesCache = [];

async function renderArchiveHistory(container) {
  container.innerHTML = `
    <div class="page-header">
      <h3>☁️ 云档案历史</h3>
      <p>每次数据改动都会自动生成一份云档案，可随时回溯恢复</p>
    </div>
    <div class="archive-toolbar" style="display:flex;gap:12px;align-items:center;margin-bottom:20px;">
      <button class="btn-primary" onclick="refreshArchives()" style="padding:8px 18px;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;">
        🔄 刷新档案列表
      </button>
      <span class="archive-count" id="archiveCount" style="font-size:12px;color:var(--text-muted);"></span>
    </div>
    <div class="archive-list" id="archiveList">
      <div class="loading-placeholder" style="text-align:center;padding:60px 0;color:var(--text-muted);">
        正在加载云档案...
      </div>
    </div>
  `;

  await refreshArchives();
}

async function refreshArchives() {
  const listEl = document.getElementById('archiveList');
  const countEl = document.getElementById('archiveCount');
  if (!listEl) return;

  if (!DataStore.isLoggedIn()) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-text">请先登录后查看云档案</div></div>`;
    return;
  }

  listEl.innerHTML = `<div class="loading-placeholder" style="text-align:center;padding:60px 0;color:var(--text-muted);">正在从云端加载档案...</div>`;

  try {
    _archivesCache = await DataStore.getArchives();
    if (countEl) countEl.textContent = `共 ${_archivesCache.length} 条档案${_archivesCache.length >= 100 ? '（已达上限，自动清理旧档案）' : ''}`;

    if (_archivesCache.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-text">暂无云档案</div>
          <div class="empty-hint">登录后进行的任何数据改动都会自动生成云档案</div>
        </div>`;
      return;
    }

    listEl.innerHTML = _archivesCache.map((arch, idx) => {
      const d = new Date(arch.timestamp);
      const dateStr = d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const summary = arch.summary || '数据更新';
      const userEmail = arch.userEmail || '未知用户';
      const data = arch.data || {};
      const orderCount = (data.orders || []).length;
      const companionCount = (data.companions || []).length;
      const bossCount = (data.bosses || []).length;

      return `
        <div class="archive-item">
          <div class="archive-time">
            <span class="date">${dateStr}</span>
            <span class="time">${timeStr}</span>
          </div>
          <div class="archive-info">
            <span class="summary">${summary}</span>
            <span class="user">操作人：${userEmail} · 订单 ${orderCount} 条 · 陪玩 ${companionCount} 人 · 老板 ${bossCount} 人</span>
          </div>
          <div class="archive-actions">
            <button class="btn-view-archive" onclick="viewArchiveDetail(${arch.timestamp})">查看</button>
            <button class="btn-restore-archive" onclick="confirmRestoreArchive(${arch.timestamp}, '${dateStr} ${timeStr}')">回滚到此处</button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">加载失败：${err.message}</div></div>`;
  }
}

function viewArchiveDetail(timestamp) {
  const arch = _archivesCache.find(a => a.timestamp === timestamp);
  if (!arch) { showToast('档案不存在', 'error'); return; }

  const data = arch.data || {};
  const orders = data.orders || [];
  const companions = data.companions || [];
  const bosses = data.bosses || [];
  const d = new Date(arch.timestamp);
  const timeStr = d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  // 创建遮罩和弹窗
  let overlay = document.getElementById('archiveDetailOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'archiveDetailOverlay';
    overlay.className = 'archive-detail-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="archive-detail-modal">
      <div class="archive-detail-header">
        <h3>📄 档案详情</h3>
        <button class="archive-detail-close" onclick="closeArchiveDetail()">✕</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">
        ${timeStr} · ${arch.userEmail || '未知用户'} · ${arch.summary || '数据更新'}
      </div>
      <div class="archive-detail-stats">
        <div class="archive-stat-card"><div class="val">${orders.length}</div><div class="lbl">订单总数</div></div>
        <div class="archive-stat-card"><div class="val">${companions.length}</div><div class="lbl">陪玩人数</div></div>
        <div class="archive-stat-card"><div class="val">${bosses.length}</div><div class="lbl">老板人数</div></div>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;">订单列表（前 50 条）</div>
      <div class="archive-orders-preview">
        ${orders.slice(0, 50).map(o => {
          const statusMap = { 'active': '进行中', 'unsettled_companion': '待结算陪玩', 'unsettled_boss': '待结算老板', 'completed': '已完成' };
          const statusClass = { 'active': 'ostatus-active', 'unsettled_companion': 'ostatus-unsettled-c', 'unsettled_boss': 'ostatus-unsettled-b', 'completed': 'ostatus-completed' }[o.status] || '';
          return `
          <div class="archive-order-row">
            <span class="oid">${o.id}</span>
            <span class="oname">${o.companionName} → ${o.bossName}</span>
            <span class="oamount">¥${o.amount.toFixed(2)}</span>
            <span class="ostatus ${statusClass}">${statusMap[o.status] || o.status}</span>
          </div>`;
        }).join('')}
        ${orders.length > 50 ? `<div style="text-align:center;padding:10px;font-size:12px;color:var(--text-muted);">...还有 ${orders.length - 50} 条订单未显示</div>` : ''}
      </div>
    </div>`;
  overlay.classList.add('active');
}

function closeArchiveDetail() {
  const overlay = document.getElementById('archiveDetailOverlay');
  if (overlay) overlay.classList.remove('active');
}

async function confirmRestoreArchive(timestamp, label) {
  showConfirm({
    title: '⚠️ 确认回滚',
    message: `确认回滚到 <b>${label}</b> 的数据状态？<br><br>回滚前系统会自动生成一条档案保存当前状态，之后数据将恢复到选定时间点的状态。<br><br>此操作不可撤销，请确认。`,
    onConfirm: async () => {
      const result = await DataStore.restoreArchive(timestamp);
      if (result.success) {
        showToast('✓ 已回滚到选定档案', 'success');
        updateBadges();
        closeArchiveDetail();
        await refreshArchives();
      } else {
        showToast('回滚失败：' + result.error, 'error');
      }
    }
  });
}
