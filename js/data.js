/**
 * 游戏陪玩俱乐部 - 数据层
 * v4.2.0 — 本地 + 云存档（Firebase Realtime Database）
 *
 * ★ 登录账号：yxdj001 ~ yxdj005，密码与账号相同
 * ★ 云存档：通过 Firebase Realtime Database 实现多设备同步
 * ★ 使用方法：填写下方 FIREBASE_CONFIG，然后在主页点"上传到云"即可
 */

// ============================================================
//  ★★★  Firebase 云存档配置（请填写你自己的配置）★★★
//  1. 打开 https://console.firebase.google.com
//  2. 创建项目 → 左侧"实时数据库"→ 创建数据库（位置选 asia-southeast1）
//  3. 数据库规则设置为公开读写（仅内部使用）：
//     { "rules": { ".read": true, ".write": true } }
//  4. 项目设置 → 常规 → 向下滚动 → "您的应用"→ 点击 "</>" 图标
//  5. 复制配置对象，粘贴到下方
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:      "AIzaSyBaU7x4QlHy1M_2TjVIo15mv6-5ivJoXF0",
  authDomain:  "gaming-club-5cfff.firebaseapp.com",
  databaseURL: "https://gaming-club-5cfff-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:   "gaming-club-5cfff",
  storageBucket: "gaming-club-5cfff.firebasestorage.app",
  messagingSenderId: "679563197432",
  appId:       "1:679563197432:web:b1bc604ad0252684f4340d"
};

// 云存档是否启用（填写完上方配置后改为 true）
const CLOUD_ENABLED = true;

// ============================================================
//  Firebase 初始化（仅云存档启用时加载）
// ============================================================
let _firebaseReady = false;
let _database = null;

function initFirebase() {
  if (!CLOUD_ENABLED) return false;
  if (_firebaseReady) return true;
  if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    console.warn('[Cloud] Firebase 配置未填写，云存档功能不可用');
    return false;
  }
  try {
    // 动态加载 Firebase SDK（CDN）
    if (typeof firebase === 'undefined') {
      console.warn('[Cloud] Firebase SDK 未加载，将在页面中自动加载');
      // 标记需要加载，由 index.html 负责加载 SDK
      window.__NEED_FIREBASE_SDK = true;
      return false;
    }
    if (!firebase.apps?.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    _database = firebase.database();
    _firebaseReady = true;
    console.log('[Cloud] Firebase 初始化成功');
    return true;
  } catch (e) {
    console.error('[Cloud] Firebase 初始化失败', e);
    return false;
  }
}

// ============================================================
//  登录状态校验（sessionStorage）
// ============================================================
function isLoggedIn() {
  return sessionStorage.getItem('isLoggedIn') === 'true';
}

function getAdminAccount() {
  return sessionStorage.getItem('adminAccount') || '';
}

// ============================================================
//  初始模拟数据
// ============================================================

let companions = [
  { id: 'PW-001', name: '金牌打手·阿杰', level: '王者', games: ['王者荣耀', '英雄联盟'], rating: 4.9, avatar: 'PW001' },
  { id: 'PW-002', name: '职业代练·小美', level: '宗师', games: ['王者荣耀', '和平精英'], rating: 4.8, avatar: 'PW002' },
  { id: 'PW-003', name: '狙击之王·老K', level: '大师', games: ['CS:GO', '瓦罗兰特'], rating: 4.7, avatar: 'PW003' },
  { id: 'PW-004', name: '全能战神·大龙', level: '王者', games: ['LOL', 'DOTA2', '王者荣耀'], rating: 4.9, avatar: 'PW004' },
];

let bosses = [
  { id: 'BOSS-001', name: '老板·张总', level: 'VIP3', balance: 5000.00 },
  { id: 'BOSS-002', name: '老板·李董', level: 'VIP5', balance: 12000.00 },
  { id: 'BOSS-003', name: '老板·王少', level: 'VIP2', balance: 800.00 },
  { id: 'BOSS-004', name: '老板·赵姐', level: 'VIP4', balance: 3000.00 },
];

const defaultCategories = {
  orderTypes:        ['王者荣耀', '英雄联盟', 'CS:GO', '和平精英', '瓦罗兰特', 'DOTA2', '原神', '崩铁'],
  companionModes:    ['排位上分', '陪练指导', '代练通关', '组队开黑', '1v1教学', '赛事代打'],
  pricingCategories: ['按时计费', '按局计费', '包段计费', '包天计费'],
  confidentialityOptions: ['普通', '机密', '绝密'],
  durations:         ['0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '8', '10', '12'],
  rechargeMethods:   ['微信支付', '支付宝', '银行卡', '现金'],
  platforms:         ['微信', 'QQ', '代练通', '代练妈妈', '淘宝', '闲鱼', '拼多多', '抖音', '快手'],
};

// 可变的分类数据（持久化）
let orderTypes           = [...defaultCategories.orderTypes];
let companionModes      = [...defaultCategories.companionModes];
let pricingCategories   = [...defaultCategories.pricingCategories];
let confidentialityOptions = [...defaultCategories.confidentialityOptions];
let durations           = [...defaultCategories.durations];
let rechargeMethods     = [...defaultCategories.rechargeMethods];
let platforms           = [...defaultCategories.platforms];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateOrder(prefix, status, overrides = {}) {
  const companion = randomFrom(companions);
  const boss      = randomFrom(bosses);
  const startHour = randomInt(8, 22);
  const startMin  = randomInt(0, 59);
  const date      = new Date(2026, 5, randomInt(10, 15));
  date.setHours(startHour, startMin, 0, 0);
  const duration       = parseFloat((Math.random() * 4 + 0.5).toFixed(1));
  const amount         = parseFloat((duration * randomInt(30, 200)).toFixed(2));
  const commissionRate = randomFrom([15, 20, 25, 30]);
  const companionAmount = parseFloat((amount * (1 - commissionRate / 100)).toFixed(2));

  return {
    id: `${prefix}-202606${String(randomInt(10, 15)).padStart(2, '0')}-${String(randomInt(100, 999)).padStart(3, '0')}`,
    companionId:       companion.id,
    companionName:     companion.name,
    bossId:           boss.id,
    bossName:         boss.name,
    orderType:        overrides.orderType || randomFrom(orderTypes),
    confidentiality:  randomFrom(confidentialityOptions),
    companionMode:    overrides.companionMode || randomFrom(companionModes),
    pricingCategory:  randomFrom(pricingCategories),
    duration:         duration,
    orderNo:          `PW${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(randomInt(100, 999)).padStart(3, '0')}`,
    commissionRate:   commissionRate,
    bossSettled:     status === 'completed' ? true : (status === 'unsettled_companion' ? true : false),
    status:           status,
    startTime:        date.toISOString().replace('T', ' ').substring(0, 19),
    amount:           amount,
    companionAmount:  companionAmount,
    companyAmount:    parseFloat((amount * commissionRate / 100).toFixed(2)),
    createdAt:        new Date(date.getTime() - randomInt(1, 30) * 60000).toISOString().replace('T', ' ').substring(0, 19),
    completedAt:      status === 'completed' ? new Date(date.getTime() + duration * 3600000).toISOString().replace('T', ' ').substring(0, 19) : null,
    platform:         randomFrom(platforms),
  };
}

// ============================================================
//  初始化订单数据
// ============================================================
let orders = [
  generateOrder('ORD', 'active', { orderType: '王者荣耀', companionMode: '排位上分', confidentiality: '绝密' }),
  generateOrder('ORD', 'active', { orderType: 'CS:GO', companionMode: '1v1教学', confidentiality: '机密' }),
  generateOrder('ORD', 'active', { orderType: '英雄联盟', companionMode: '组队开黑', confidentiality: '普通' }),
  generateOrder('ORD', 'active', { orderType: '和平精英', companionMode: '代练通关', confidentiality: '机密' }),
  generateOrder('ORD', 'active', { orderType: '瓦罗兰特', companionMode: '陪练指导', confidentiality: '绝密' }),
  generateOrder('ORD', 'unsettled_companion'),
  generateOrder('ORD', 'unsettled_companion'),
  generateOrder('ORD', 'unsettled_companion'),
  generateOrder('ORD', 'unsettled_companion'),
  generateOrder('ORD', 'unsettled_boss'),
  generateOrder('ORD', 'unsettled_boss'),
  generateOrder('ORD', 'unsettled_boss'),
  generateOrder('ORD', 'completed'),
  generateOrder('ORD', 'completed'),
  generateOrder('ORD', 'completed'),
];

// ============================================================
//  充值记录
// ============================================================
let rechargeRecords = [
  { id: 'RCH-001', bossId: 'BOSS-001', bossName: '老板·张总', amount: 2000.00, method: '微信支付', status: 'success', time: '2026-06-15 10:30:00' },
  { id: 'RCH-002', bossId: 'BOSS-002', bossName: '老板·李董', amount: 5000.00, method: '支付宝',   status: 'success', time: '2026-06-15 09:15:00' },
  { id: 'RCH-003', bossId: 'BOSS-003', bossName: '老板·王少', amount: 500.00,  method: '微信支付', status: 'success', time: '2026-06-14 22:45:00' },
  { id: 'RCH-004', bossId: 'BOSS-004', bossName: '老板·赵姐', amount: 3000.00, method: '银行卡',   status: 'success', time: '2026-06-14 16:20:00' },
  { id: 'RCH-005', bossId: 'BOSS-001', bossName: '老板·张总', amount: 1000.00, method: '支付宝',   status: 'pending', time: '2026-06-15 14:00:00' },
];

// ============================================================
//  结算历史记录
// ============================================================
let settlementHistory = [];
let nextSettlementId  = 1;
let nextRechargeId    = 6;
let nextOrderId       = orders.length + 1;
let nextCompanionId   = companions.length + 1;
let nextBossId       = bosses.length + 1;

// ============================================================
//  持久化：saveData / loadData（localStorage + 云存档）
// ============================================================

function saveData(changeSummary) {
  if (!isLoggedIn()) {
    showToast('请先登录后再操作', 'error');
    return;
  }
  _saveLocal();
  if (changeSummary) console.log('[Save]', changeSummary);
  
  // 自动上传到云存档
  if (CLOUD_ENABLED && !window.__DISABLE_AUTO_UPLOAD) {
    uploadToCloud().then(ok => {
      if (ok) {
        console.log('[Auto Upload] 数据已自动上传到云存档');
      }
    });
  }
}

function _saveLocal() {
  try {
    localStorage.setItem('gc_orders',       JSON.stringify(orders));
    localStorage.setItem('gc_recharges',    JSON.stringify(rechargeRecords));
    localStorage.setItem('gc_bosses',       JSON.stringify(bosses));
    localStorage.setItem('gc_companions',   JSON.stringify(companions));
    localStorage.setItem('gc_categories',   JSON.stringify({ orderTypes, companionModes, pricingCategories, confidentialityOptions, durations, rechargeMethods, platforms }));
    localStorage.setItem('gc_settlement_history', JSON.stringify(settlementHistory));
    localStorage.setItem('gc_nextRid',      nextRechargeId);
    localStorage.setItem('gc_nextOid',      nextOrderId);
    localStorage.setItem('gc_nextCid',       nextCompanionId);
    localStorage.setItem('gc_nextBid',       nextBossId);
    localStorage.setItem('gc_nextStlId',     nextSettlementId);
  } catch (e) { /* ignore */ }
}

function loadData() {
  _loadLocal();
}

function _loadLocal() {
  try {
    const saved    = localStorage.getItem('gc_orders');
    if (saved) orders = JSON.parse(saved);

    const savedR   = localStorage.getItem('gc_recharges');
    if (savedR) rechargeRecords = JSON.parse(savedR);

    const savedB   = localStorage.getItem('gc_bosses');
    if (savedB) {
      const lb = JSON.parse(savedB);
      lb.forEach(b => {
        const existing = bosses.find(x => x.id === b.id);
        if (existing) Object.assign(existing, b);
        else bosses.push(b);
      });
    }

    const savedC   = localStorage.getItem('gc_companions');
    if (savedC) {
      const lc = JSON.parse(savedC);
      lc.forEach(c => {
        const existing = companions.find(x => x.id === c.id);
        if (existing) Object.assign(existing, c);
        else companions.push(c);
      });
    }

    const savedCat = localStorage.getItem('gc_categories');
    if (savedCat) {
      const cat = JSON.parse(savedCat);
      if (cat.orderTypes?.length)           { orderTypes.length = 0;           orderTypes.push(...cat.orderTypes); }
      if (cat.companionModes?.length)       { companionModes.length = 0;       companionModes.push(...cat.companionModes); }
      if (cat.pricingCategories?.length)     { pricingCategories.length = 0;     pricingCategories.push(...cat.pricingCategories); }
      if (cat.confidentialityOptions?.length){ confidentialityOptions.length = 0; confidentialityOptions.push(...cat.confidentialityOptions); }
      if (cat.durations?.length)             { durations.length = 0;             durations.push(...cat.durations); }
      if (cat.rechargeMethods?.length)       { rechargeMethods.length = 0;       rechargeMethods.push(...cat.rechargeMethods); }
      if (cat.platforms?.length)             { platforms.length = 0;             platforms.push(...cat.platforms); }
    }

    const savedStl = localStorage.getItem('gc_settlement_history');
    if (savedStl) settlementHistory = JSON.parse(savedStl);

    const savedN   = localStorage.getItem('gc_nextRid');    if (savedN) nextRechargeId    = parseInt(savedN);
    const savedO   = localStorage.getItem('gc_nextOid');    if (savedO) nextOrderId       = parseInt(savedO);
    const savedCi  = localStorage.getItem('gc_nextCid');   if (savedCi) nextCompanionId  = parseInt(savedCi);
    const savedBi  = localStorage.getItem('gc_nextBid');    if (savedBi) nextBossId       = parseInt(savedBi);
    const savedSi  = localStorage.getItem('gc_nextStlId'); if (savedSi) nextSettlementId = parseInt(savedSi);
  } catch (e) { /* ignore */ }
}

// ============================================================
//  ★★★ 云存档：上传 / 下载 ★★★
// ============================================================

/**
 * 上传当前本地数据到云端
 * 返回 Promise<boolean>
 */
function uploadToCloud() {
  return new Promise((resolve) => {
    if (!CLOUD_ENABLED) {
      showToast('请先在 js/data.js 中填写 Firebase 配置并启用云存档', 'error');
      resolve(false);
      return;
    }
    if (!isLoggedIn()) {
      showToast('请先登录', 'error');
      resolve(false);
      return;
    }

    const ok = initFirebase();
    if (!ok && !_firebaseReady) {
      showToast('Firebase SDK 未加载，请在 index.html 中引入 Firebase SDK', 'error');
      resolve(false);
      return;
    }

    // 组装要上传的数据包
    const payload = {
      orders,
      rechargeRecords,
      bosses,
      companions,
      categories: { orderTypes, companionModes, pricingCategories, confidentialityOptions, durations, rechargeMethods, platforms },
      settlementHistory,
      nextRechargeId,
      nextOrderId,
      nextCompanionId,
      nextBossId,
      nextSettlementId,
      lastUpdatedBy: getAdminAccount(),
      lastUpdatedAt:  new Date().toISOString(),
    };

    const db = _database || firebase.database();
    db.ref('gaming_club_data').set(payload, (error) => {
      if (error) {
        console.error('[Cloud] 上传失败', error);
        showToast('上传失败：' + error.message, 'error');
        resolve(false);
      } else {
        console.log('[Cloud] 上传成功');
        showToast('数据已上传到云存档 ✓', 'success');
        resolve(true);
      }
    });
  });
}

/**
 * 从云端下载数据并覆盖本地
 * 返回 Promise<boolean>
 */
function downloadFromCloud() {
  return new Promise((resolve) => {
    if (!CLOUD_ENABLED) {
      showToast('请先在 js/data.js 中填写 Firebase 配置并启用云存档', 'error');
      resolve(false);
      return;
    }
    if (!isLoggedIn()) {
      showToast('请先登录', 'error');
      resolve(false);
      return;
    }

    const ok = initFirebase();
    if (!ok && !_firebaseReady) {
      showToast('Firebase SDK 未加载，请在 index.html 中引入 Firebase SDK', 'error');
      resolve(false);
      return;
    }

    const db = _database || firebase.database();
    db.ref('gaming_club_data').once('value', (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        showToast('云端暂无数据，请先上传', 'warn');
        resolve(false);
        return;
      }

      try {
        if (data.orders)           orders = data.orders;
        if (data.rechargeRecords)   rechargeRecords = data.rechargeRecords;
        if (data.bosses)           bosses = data.bosses;
        if (data.companions)       companions = data.companions;
        if (data.settlementHistory) settlementHistory = data.settlementHistory;
        if (data.nextRechargeId)    nextRechargeId = data.nextRechargeId;
        if (data.nextOrderId)       nextOrderId = data.nextOrderId;
        if (data.nextCompanionId)   nextCompanionId = data.nextCompanionId;
        if (data.nextBossId)        nextBossId = data.nextBossId;
        if (data.nextSettlementId)  nextSettlementId = data.nextSettlementId;

        if (data.categories) {
          const cat = data.categories;
          if (cat.orderTypes)           { orderTypes.length = 0;           orderTypes.push(...cat.orderTypes); }
          if (cat.companionModes)       { companionModes.length = 0;       companionModes.push(...cat.companionModes); }
          if (cat.pricingCategories)     { pricingCategories.length = 0;     pricingCategories.push(...cat.pricingCategories); }
          if (cat.confidentialityOptions){ confidentialityOptions.length = 0; confidentialityOptions.push(...cat.confidentialityOptions); }
          if (cat.durations)             { durations.length = 0;             durations.push(...cat.durations); }
          if (cat.rechargeMethods)       { rechargeMethods.length = 0;       rechargeMethods.push(...cat.rechargeMethods); }
          if (cat.platforms)             { platforms.length = 0;             platforms.push(...cat.platforms); }
        }

        _saveLocal(); // 同步到 localStorage
        console.log('[Cloud] 下载成功，来自：', data.lastUpdatedBy, data.lastUpdatedAt);
        showToast('已从云存档下载数据 ✓', 'success');
        resolve(true);
      } catch (e) {
        console.error('[Cloud] 下载数据处理失败', e);
        showToast('下载数据处理失败：' + e.message, 'error');
        resolve(false);
      }
    }, (error) => {
      console.error('[Cloud] 下载失败', error);
      showToast('下载失败：' + error.message, 'error');
      resolve(false);
    });
  });
}

/**
 * 获取云端最后更新信息
 * 返回 Promise<{lastUpdatedBy, lastUpdatedAt} | null>
 */
function getCloudUpdateInfo() {
  return new Promise((resolve) => {
    if (!CLOUD_ENABLED || !_firebaseReady) { resolve(null); return; }
    const db = _database || firebase.database();
    db.ref('gaming_club_data').once('value', (snapshot) => {
      const data = snapshot.val();
      if (data && data.lastUpdatedBy) {
        resolve({ lastUpdatedBy: data.lastUpdatedBy, lastUpdatedAt: data.lastUpdatedAt });
      } else {
        resolve(null);
      }
    }, () => resolve(null));
  });
}

// ============================================================
//  DataStore — 所有数据操作接口
//  未登录时所有写操作会被阻止
// ============================================================
const DataStore = {
  // ====== 认证相关 ======
  isLoggedIn()      { return isLoggedIn(); },
  getAdminAccount() { return getAdminAccount(); },

  // ====== 云存档 ======
  async uploadToCloud()   { return await uploadToCloud(); },
  async downloadFromCloud() { return await downloadFromCloud(); },
  isCloudEnabled()        { return CLOUD_ENABLED && _firebaseReady; },

  // ====== 订单 CRUD ======
  addOrder(data) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const id = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextOrderId++).padStart(3, '0')}`;
    const duration = data.duration || '1';
    const amount   = parseFloat(data.amount) || 0;
    const commissionRate = parseFloat(data.commissionRate) || 20;
    const companionAmount = parseFloat((amount * (1 - commissionRate / 100)).toFixed(2));
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const order = {
      id,
      companionId:       data.companionId || '',
      companionName:     companions.find(c => c.id === data.companionId)?.name || data.companionName || '',
      bossId:             data.bossId || data.tempBossName || '',
      bossName:           data.bossId
        ? (bosses.find(b => b.id === data.bossId)?.name || data.bossName || '')
        : (data.tempBossName || data.bossName || ''),
      isTempBoss:         !data.bossId && !!data.tempBossName,
      orderType:          data.orderType || '',
      confidentiality:    data.confidentiality || '普通',
      companionMode:      data.companionMode || '',
      pricingCategory:    data.pricingCategory || '',
      duration,
      orderNo:            data.orderNo || `PW${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(nextOrderId).padStart(3, '0')}`,
      commissionRate,
      bossSettled:       data.status === 'completed' || data.status === 'unsettled_companion',
      status:             data.status || 'active',
      startTime:          data.startTime || now,
      amount,
      companionAmount,
      companyAmount:      parseFloat((amount * commissionRate / 100).toFixed(2)),
      createdAt:          now,
      completedAt:        data.status === 'completed' ? now : null,
      platform:           data.platform || '',
    };
    orders.unshift(order);
    saveData(`新增订单 ${id}`);
    return order;
  },

  updateOrder(orderId, data) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const fields = ['companionId','companionName','bossId','bossName','orderType','confidentiality',
      'companionMode','pricingCategory','duration','orderNo','commissionRate','status','startTime','amount','orderNo','platform'];
    fields.forEach(f => { if (data[f] !== undefined) order[f] = data[f]; });

    if (data.companionId) order.companionName = companions.find(c => c.id === data.companionId)?.name || order.companionName;
    if (data.bossId) {
      order.bossName = bosses.find(b => b.id === data.bossId)?.name || order.bossName;
      order.isTempBoss = false;
    }
    if (data.tempBossName) {
      order.bossId     = data.tempBossName;
      order.bossName   = data.tempBossName;
      order.isTempBoss = true;
    }

    order.amount           = parseFloat(order.amount) || 0;
    order.commissionRate  = parseFloat(order.commissionRate) || 20;
    order.companionAmount = parseFloat((order.amount * (1 - order.commissionRate / 100)).toFixed(2));
    order.companyAmount   = parseFloat((order.amount * order.commissionRate / 100).toFixed(2));

    if (data.bossSettled !== undefined) order.bossSettled = data.bossSettled;
    if (order.status === 'completed') {
      order.bossSettled = true;
      order.completedAt  = order.completedAt || new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    saveData(`修改订单 ${orderId}`);
    return order;
  },

  deleteOrder(orderId) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return false;
    orders.splice(idx, 1);
    saveData(`删除订单 ${orderId}`);
    return true;
  },

  getOrder(orderId)                            { return orders.find(o => o.id === orderId); },
  getOrders()                                  { return orders; },
  getActiveOrders()                             { return orders.filter(o => o.status === 'active'); },
  getUnsettledCompanionOrders()                 { return orders.filter(o => o.status === 'unsettled_companion'); },
  getUnsettledBossOrders()                     { return orders.filter(o => o.status === 'unsettled_boss'); },
  getCompletedOrders()                          { return orders.filter(o => o.status === 'completed'); },

  settleCompanion(orderId) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'unsettled_companion') {
      order.status     = 'completed';
      order.completedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      saveData(`结算陪玩订单 ${orderId}`);
      return true;
    }
    return false;
  },

  settleBoss(orderId) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'unsettled_boss') {
      order.bossSettled = true;
      order.status       = 'unsettled_companion';
      saveData(`结算老板订单 ${orderId}`);
      return true;
    }
    return false;
  },

  completeOrder(orderId) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'active') {
      order.bossSettled = true;
      order.status       = 'unsettled_companion';
      order.completedAt  = new Date().toISOString().replace('T', ' ').substring(0, 19);
      saveData(`完成订单 ${orderId}`);
      return true;
    }
    return false;
  },

  settleOrdersByCompanion(companionId) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const unsettled = orders.filter(o => o.companionId === companionId && o.status === 'unsettled_companion');
    if (unsettled.length === 0) return null;

    const totalCompanionAmount = unsettled.reduce((sum, o) => sum + o.companionAmount, 0);
    const totalAmount         = unsettled.reduce((sum, o) => sum + o.amount, 0);
    const now                 = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const settlementId       = `STL-${String(nextSettlementId++).padStart(3, '0')}`;

    unsettled.forEach(o => { o.status = 'completed'; o.completedAt = now; });

    const record = {
      id:               settlementId,
      companionId:      companionId,
      companionName:    companions.find(c => c.id === companionId)?.name || companionId,
      amount:           parseFloat(totalCompanionAmount.toFixed(2)),
      totalAmount:      parseFloat(totalAmount.toFixed(2)),
      orderCount:       unsettled.length,
      settledAt:        now,
      orderIds:         unsettled.map(o => o.id),
    };
    settlementHistory.unshift(record);
    saveData(`批量结算陪玩 ${companionId}`);
    return record;
  },

  settleOrdersByIds(companionId, orderIds) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const toSettle = orders.filter(o => o.companionId === companionId && o.status === 'unsettled_companion' && orderIds.includes(o.id));
    if (toSettle.length === 0) return null;

    const totalCompanionAmount = parseFloat(toSettle.reduce((sum, o) => sum + o.companionAmount, 0).toFixed(2));
    const totalAmount         = parseFloat(toSettle.reduce((sum, o) => sum + o.amount, 0).toFixed(2));
    const now                 = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const settlementId       = `STL-${String(nextSettlementId++).padStart(3, '0')}`;

    toSettle.forEach(o => { o.status = 'completed'; o.completedAt = now; });

    const record = {
      id:               settlementId,
      companionId:      companionId,
      companionName:    companions.find(c => c.id === companionId)?.name || companionId,
      amount:           totalCompanionAmount,
      totalAmount,
      orderCount:       toSettle.length,
      settledAt:        now,
      orderIds:         toSettle.map(o => o.id),
    };
    settlementHistory.unshift(record);
    saveData(`选择结算陪玩 ${companionId}`);
    return record;
  },

  getCompanionOrders(companionId) {
    return orders.filter(o => o.companionId === companionId && (o.status === 'completed' || o.status === 'unsettled_companion'));
  },

  getCompanionUnsettledOrders(companionId) {
    return orders.filter(o => o.companionId === companionId && o.status === 'unsettled_companion');
  },

  getSettlementHistory()                        { return settlementHistory; },
  getSettlementHistoryByCompanion(companionId)  { return settlementHistory.filter(r => r.companionId === companionId); },

  queryOrders(filters = {}) {
    let result = [...orders];
    if (filters.orderType)       result = result.filter(o => o.orderType       === filters.orderType);
    if (filters.confidentiality) result = result.filter(o => o.confidentiality === filters.confidentiality);
    if (filters.companionMode)   result = result.filter(o => o.companionMode   === filters.companionMode);
    if (filters.status)           result = result.filter(o => o.status           === filters.status);
    if (filters.pricingCategory) result = result.filter(o => o.pricingCategory === filters.pricingCategory);
    if (filters.companionId)     result = result.filter(o => o.companionId     === filters.companionId);
    if (filters.bossId)          result = result.filter(o => o.bossId          === filters.bossId);
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      result = result.filter(o =>
        o.id.toLowerCase().includes(kw) ||
        o.orderNo.toLowerCase().includes(kw) ||
        o.companionName.toLowerCase().includes(kw) ||
        o.bossName.toLowerCase().includes(kw)
      );
    }
    if (filters.dateFrom) result = result.filter(o => o.startTime >= filters.dateFrom);
    if (filters.dateTo)   result = result.filter(o => o.startTime <= filters.dateTo + ' 23:59:59');
    return result;
  },

  recharge(bossId, amount, method) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const record = {
      id:          `RCH-${String(nextRechargeId++).padStart(3, '0')}`,
      bossId,
      bossName:    bosses.find(b => b.id === bossId)?.name || bossId,
      amount:      parseFloat(amount),
      method,
      status:      'success',
      time:        new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    rechargeRecords.unshift(record);
    const boss = bosses.find(b => b.id === bossId);
    if (boss) boss.balance += parseFloat(amount);
    saveData(`老板充值 ${bossId} ¥${amount}`);
    return record;
  },

  getRechargeRecords()              { return rechargeRecords; },
  getBosses()                      { return bosses; },
  getCompanions()                   { return companions; },
  getRechargeMethods()              { return rechargeMethods; },

  getCategories()                   { return { orderTypes, companionModes, pricingCategories, confidentialityOptions, durations, rechargeMethods, platforms }; },
  getDefaultCategories()             { return JSON.parse(JSON.stringify(defaultCategories)); },

  addCategoryItem(categoryKey, value) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const arr = DataStore._getCatArr(categoryKey);
    if (!arr || !value || arr.includes(value)) return false;
    arr.push(value); saveData(`添加类目 ${value}`); return true;
  },

  updateCategoryItem(categoryKey, oldVal, newVal) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const arr = DataStore._getCatArr(categoryKey);
    if (!arr || !newVal) return false;
    const idx = arr.indexOf(oldVal);
    if (idx === -1) return false;
    const fieldMap = { orderTypes:'orderType', companionModes:'companionMode', pricingCategories:'pricingCategory', confidentialityOptions:'confidentiality' };
    const field = fieldMap[categoryKey];
    if (field) orders.forEach(o => { if (o[field] === oldVal) o[field] = newVal; });
    if (categoryKey === 'orderTypes') companions.forEach(c => { if (c.games) { const gi = c.games.indexOf(oldVal); if (gi !== -1) c.games[gi] = newVal; } });
    arr[idx] = newVal; saveData(`修改类目 ${oldVal} → ${newVal}`); return true;
  },

  deleteCategoryItem(categoryKey, value) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const arr = DataStore._getCatArr(categoryKey);
    if (!arr) return false;
    const idx = arr.indexOf(value);
    if (idx === -1) return false;
    arr.splice(idx, 1); saveData(`删除类目 ${value}`); return true;
  },

  resetCategory(categoryKey) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const def = defaultCategories[categoryKey];
    if (!def) return false;
    const arr = DataStore._getCatArr(categoryKey);
    if (!arr) return false;
    arr.length = 0; arr.push(...def); saveData(`重置类目 ${categoryKey}`); return true;
  },

  _getCatArr(key) {
    const map = { orderTypes, companionModes, pricingCategories, confidentialityOptions, durations, rechargeMethods, platforms };
    return map[key] || null;
  },

  addCompanion(data) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const c = { id: `PW-${String(nextCompanionId++).padStart(3, '0')}`, ...data, rating: data.rating || 5.0 };
    companions.push(c);
    saveData(`新增陪玩 ${c.name}`);
    return c;
  },

  updateCompanion(id, data) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const c = companions.find(x => x.id === id);
    if (!c) return null;
    Object.assign(c, data);
    orders.forEach(o => { if (o.companionId === id) o.companionName = c.name; });
    saveData(`修改陪玩 ${id}`);
    return c;
  },

  deleteCompanion(id) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const idx = companions.findIndex(x => x.id === id);
    if (idx === -1) return false;
    companions.splice(idx, 1);
    saveData(`删除陪玩 ${id}`);
    return true;
  },

  addBoss(data) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const b = { id: `BOSS-${String(nextBossId++).padStart(3, '0')}`, ...data, balance: parseFloat(data.balance) || 0 };
    bosses.push(b);
    saveData(`新增老板 ${b.name}`);
    return b;
  },

  updateBoss(id, data) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const b = bosses.find(x => x.id === id);
    if (!b) return null;
    Object.assign(b, data);
    orders.forEach(o => { if (o.bossId === id) o.bossName = b.name; });
    saveData(`修改老板 ${id}`);
    return b;
  },

  deleteBoss(id) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const idx = bosses.findIndex(x => x.id === id);
    if (idx === -1) return false;
    bosses.splice(idx, 1);
    saveData(`删除老板 ${id}`);
    return true;
  },

  getStats() {
    const active     = orders.filter(o => o.status === 'active');
    const unsettledC = orders.filter(o => o.status === 'unsettled_companion');
    const unsettledB = orders.filter(o => o.status === 'unsettled_boss');
    const completed  = orders.filter(o => o.status === 'completed');

    return {
      activeCount:                active.length,
      unsettledCompanionCount:    unsettledC.length,
      unsettledBossCount:         unsettledB.length,
      completedCount:             completed.length,
      totalActiveAmount:           active.reduce((sum, o) => sum + o.amount, 0),
      totalUnsettledCompanionAmount: unsettledC.reduce((sum, o) => sum + o.companionAmount, 0),
      totalUnsettledBossAmount:   unsettledB.reduce((sum, o) => sum + o.amount, 0),
      totalCompletedAmount:        completed.reduce((sum, o) => sum + o.amount, 0),
      totalCommission:             orders.reduce((sum, o) => sum + o.companyAmount, 0),
      totalOrders:                 orders.length,
    };
  },

  getSummaryByRange(range, date, customFrom, customTo) {
    const today     = new Date();
    const todayStr  = today.toISOString().slice(0, 10);
    const base      = date || todayStr;
    let fromDate, toDate, fromStr, toStr;

    if (range === 'custom' && customFrom && customTo) {
      fromDate  = new Date(customFrom + 'T00:00:00');
      toDate    = new Date(customTo   + 'T00:00:00');
      fromStr   = fromDate.toISOString().slice(0, 10);
      toDate    = new Date(toDate.getTime() + 86400000);
      toStr     = toDate.toISOString().slice(0, 10);
    } else if (range === 'day') {
      fromDate  = new Date(todayStr + 'T00:00:00');
      fromStr   = todayStr;
      toDate    = new Date(fromDate.getTime() + 86400000);
      toStr     = todayStr;
    } else if (range === 'week') {
      toDate    = new Date(new Date(todayStr + 'T00:00:00').getTime() + 86400000);
      fromDate  = new Date(toDate.getTime() - 7 * 86400000);
      fromStr   = fromDate.toISOString().slice(0, 10);
      toStr     = toDate.toISOString().slice(0, 10);
    } else if (range === 'month') {
      toDate    = new Date(new Date(todayStr + 'T00:00:00').getTime() + 86400000);
      fromDate  = new Date(toDate.getTime() - 30 * 86400000);
      fromStr   = fromDate.toISOString().slice(0, 10);
      toStr     = toDate.toISOString().slice(0, 10);
    } else {
      fromDate  = new Date(todayStr + 'T00:00:00');
      fromStr   = todayStr;
      toDate    = new Date(fromDate.getTime() + 86400000);
      toStr     = todayStr;
    }

    const rangedOrders = orders.filter(o => {
      const d = (o.startTime || o.createdAt || '').slice(0, 10);
      return d >= fromStr && d < toStr;
    });

    return {
      range:       range === 'custom' ? 'custom' : range,
      from:        fromStr,
      to:          range === 'custom' ? customTo : toStr,
      totalOrders:  rangedOrders.length,
      totalAmount:           rangedOrders.reduce((sum, o) => sum + o.amount, 0),
      totalCommission:       rangedOrders.reduce((sum, o) => sum + o.companyAmount, 0),
      totalCompanionAmount:  rangedOrders.reduce((sum, o) => sum + o.companionAmount, 0),
      orders: rangedOrders,
    };
  },

  getCompanionRanking() {
    const ranking = companions.map(c => {
      const cOrders = orders.filter(o => o.companionId === c.id);
      return {
        companionId:   c.id,
        companionName:  c.name,
        level:          c.level || '',
        rating:         c.rating || 0,
        orderCount:     cOrders.length,
        totalAmount:    cOrders.reduce((sum, o) => sum + o.amount, 0),
      };
    });
    ranking.sort((a, b) => b.orderCount !== a.orderCount ? b.orderCount - a.orderCount : b.totalAmount - a.totalAmount);
    return ranking;
  },
};

// ============================================================
//  启动
// ============================================================
loadData();
window.addEventListener('beforeunload', () => _saveLocal());

// 导出到全局
window.DataStore  = DataStore;
window.isLoggedIn = isLoggedIn;
