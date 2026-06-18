/**
 * 游戏陪玩俱乐部 - 数据层
 * v4.1 — Firebase 登录 + 云档案版本历史
 *
 * ★ 使用前请将下方 FIREBASE_CONFIG 替换为你自己的配置
 *   来源：Firebase 控制台 → 项目概览 → </> Web → 注册应用 → 复制 firebaseConfig
 * ★ 需要在 Firebase 控制台启用：Authentication（邮箱/密码）和 Realtime Database
 */

// ============================================================
//  ↓↓↓  把这里替换成你的 Firebase 配置  ↓↓↓
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
// ============================================================
//  ↑↑↑  替换区结束  ↑↑↑
// ============================================================

// Firebase SDK（CDN，通过动态加载方式）
let _db = null;           // Firebase database 实例
let _dbRef = null;        // 根节点引用
let _auth = null;         // Firebase Auth 实例
let _cloudEnabled = false; // 是否成功连接到云端
let _initPromise = null;  // 初始化 Promise
let _currentUser = null;  // 当前登录用户

// 云同步状态：'connecting' | 'online' | 'offline' | 'error' | 'no_auth'
let cloudStatus = 'connecting';

// 云档案配置
const ARCHIVE_MAX_COUNT = 100;  // 最多保留 archive 数量

// ============ 初始模拟数据 ============

const companions = [
  { id: 'PW-001', name: '金牌打手·阿杰', level: '王者', games: ['王者荣耀', '英雄联盟'], rating: 4.9, avatar: 'PW001' },
  { id: 'PW-002', name: '职业代练·小美', level: '宗师', games: ['王者荣耀', '和平精英'], rating: 4.8, avatar: 'PW002' },
  { id: 'PW-003', name: '狙击之王·老K', level: '大师', games: ['CS:GO', '瓦罗兰特'], rating: 4.7, avatar: 'PW003' },
  { id: 'PW-004', name: '全能战神·大龙', level: '王者', games: ['LOL', 'DOTA2', '王者荣耀'], rating: 4.9, avatar: 'PW004' },
];

const bosses = [
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
let orderTypes = [...defaultCategories.orderTypes];
let companionModes = [...defaultCategories.companionModes];
let pricingCategories = [...defaultCategories.pricingCategories];
let confidentialityOptions = [...defaultCategories.confidentialityOptions];
let durations = [...defaultCategories.durations];
let rechargeMethods = [...defaultCategories.rechargeMethods];
let platforms = [...defaultCategories.platforms];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateOrder(prefix, status, overrides = {}) {
  const companion = randomFrom(companions);
  const boss = randomFrom(bosses);
  const startHour = randomInt(8, 22);
  const startMin = randomInt(0, 59);
  const date = new Date(2026, 5, randomInt(10, 15));
  date.setHours(startHour, startMin, 0, 0);
  const duration = parseFloat((Math.random() * 4 + 0.5).toFixed(1));
  const amount = parseFloat((duration * randomInt(30, 200)).toFixed(2));
  const commissionRate = randomFrom([15, 20, 25, 30]);
  const companionAmount = parseFloat((amount * (1 - commissionRate / 100)).toFixed(2));

  return {
    id: `${prefix}-202606${String(randomInt(10, 15)).padStart(2, '0')}-${String(randomInt(100, 999)).padStart(3, '0')}`,
    companionId: companion.id,
    companionName: companion.name,
    bossId: boss.id,
    bossName: boss.name,
    orderType: overrides.orderType || randomFrom(orderTypes),
    confidentiality: randomFrom(confidentialityOptions),
    companionMode: overrides.companionMode || randomFrom(companionModes),
    pricingCategory: randomFrom(pricingCategories),
    duration: duration,
    orderNo: `PW${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(randomInt(100, 999)).padStart(3, '0')}`,
    commissionRate: commissionRate,
    bossSettled: status === 'completed' ? true : (status === 'unsettled_companion' ? true : false),
    status: status,
    startTime: date.toISOString().replace('T', ' ').substring(0, 19),
    amount: amount,
    companionAmount: companionAmount,
    companyAmount: parseFloat((amount * commissionRate / 100).toFixed(2)),
    createdAt: new Date(date.getTime() - randomInt(1, 30) * 60000).toISOString().replace('T', ' ').substring(0, 19),
    completedAt: status === 'completed' ? new Date(date.getTime() + duration * 3600000).toISOString().replace('T', ' ').substring(0, 19) : null,
    platform: randomFrom(platforms),
  };
}

// ============ 初始化订单数据 ============
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

// ============ 充值记录 ============
let rechargeRecords = [
  { id: 'RCH-001', bossId: 'BOSS-001', bossName: '老板·张总', amount: 2000.00, method: '微信支付', status: 'success', time: '2026-06-15 10:30:00' },
  { id: 'RCH-002', bossId: 'BOSS-002', bossName: '老板·李董', amount: 5000.00, method: '支付宝', status: 'success', time: '2026-06-15 09:15:00' },
  { id: 'RCH-003', bossId: 'BOSS-003', bossName: '老板·王少', amount: 500.00, method: '微信支付', status: 'success', time: '2026-06-14 22:45:00' },
  { id: 'RCH-004', bossId: 'BOSS-004', bossName: '老板·赵姐', amount: 3000.00, method: '银行卡', status: 'success', time: '2026-06-14 16:20:00' },
  { id: 'RCH-005', bossId: 'BOSS-001', bossName: '老板·张总', amount: 1000.00, method: '支付宝', status: 'pending', time: '2026-06-15 14:00:00' },
];

// ============ 结算历史记录 ============
let settlementHistory = [];
let nextSettlementId = 1;
let nextRechargeId = 6;
let nextOrderId = orders.length + 1;
let nextCompanionId = companions.length + 1;
let nextBossId = bosses.length + 1;

// ============================================================
//  Firebase 初始化与认证
// ============================================================

/**
 * 动态加载脚本
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * 初始化 Firebase（含 Auth）
 */
async function initFirebase() {
  if (_db) return true;

  // 检查配置是否已填写
  if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    console.warn('[Cloud] Firebase 配置未填写，使用本地存储模式');
    setCloudStatus('offline');
    return false;
  }

  try {
    setCloudStatus('connecting');

    // 动态加载 Firebase SDK（修复：原代码 URL 缺少 'i'）
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    _db = firebase.database();
    _dbRef = _db.ref('gaming_club');
    _auth = firebase.auth();

    // 监听认证状态
    _auth.onAuthStateChanged((user) => {
      _currentUser = user;
      if (user) {
        console.log('[Auth] 已登录：', user.email);
        // 登录成功后，拉取云端数据并建立监听
        pullFromCloud().then(() => {
          listenCloudChanges();
          setCloudStatus('online');
          _cloudEnabled = true;
        });
        showLoginModal(false);
        showToast(`欢迎回来，${user.email}`, 'success');
      } else {
        console.log('[Auth] 未登录');
        _cloudEnabled = false;
        setCloudStatus('no_auth');
        showLoginModal(true);
      }
      updateUserUI();
    });

    return true;
  } catch (err) {
    console.error('[Cloud] Firebase 初始化失败:', err);
    setCloudStatus('error');
    _cloudEnabled = false;
    return false;
  }
}

/**
 * 登录
 */
async function login(email, password) {
  try {
    setCloudStatus('connecting');
    await initFirebase();
    await _auth.signInWithEmailAndPassword(email, password);
    return { success: true };
  } catch (err) {
    return { success: false, error: mapAuthError(err.code) };
  }
}

/**
 * 注册新用户
 */
async function register(email, password) {
  try {
    await initFirebase();
    await _auth.createUserWithEmailAndPassword(email, password);
    return { success: true };
  } catch (err) {
    return { success: false, error: mapAuthError(err.code) };
  }
}

/**
 * 退出登录
 */
async function logout() {
  if (_auth) {
    await _auth.signOut();
    _cloudEnabled = false;
    setCloudStatus('no_auth');
  }
}

function mapAuthError(code) {
  const map = {
    'auth/invalid-email': '邮箱格式不正确',
    'auth/user-disabled': '该用户已被禁用',
    'auth/user-not-found': '用户不存在',
    'auth/wrong-password': '密码错误',
    'auth/email-already-in-use': '该邮箱已被注册',
    'auth/weak-password': '密码至少 6 位',
    'auth/network-request-failed': '网络错误，请检查连接',
  };
  return map[code] || `认证错误 (${code})`;
}

function isLoggedIn() {
  return !!_currentUser;
}

function getCurrentUser() {
  return _currentUser;
}

// ============================================================
//  云档案版本历史
// ============================================================

/**
 * 写入一条云档案（每次 saveData 时自动调用）
 * @param {string} changeSummary - 本次改动的简短描述
 */
async function pushArchive(changeSummary) {
  if (!_cloudEnabled || !_db) return;

  const timestamp = Date.now();
  const user = _currentUser;
  const archive = {
    timestamp: new Date(timestamp).toISOString(),
    userId: user ? user.uid : 'unknown',
    userEmail: user ? user.email : 'unknown',
    summary: changeSummary || '数据更新',
    data: _buildPayload(),
  };

  // 写入 archive 节点
  const archiveRef = _db.ref(`gaming_club_archives/${timestamp}`);
  await archiveRef.set(archive);

  // 清理旧档案：只保留最近 ARCHIVE_MAX_COUNT 条
  await _trimArchives();

  console.log(`[Archive] 已写入云档案 snapshot @ ${archive.timestamp}`);
}

/**
 * 清理超出数量的旧档案
 */
async function _trimArchives() {
  if (!_db) return;
  const snap = await _db.ref('gaming_club_archives').once('value');
  const data = snap.val();
  if (!data) return;

  const keys = Object.keys(data).map(Number).sort((a, b) => b - a); // 降序
  if (keys.length <= ARCHIVE_MAX_COUNT) return;

  const toDelete = keys.slice(ARCHIVE_MAX_COUNT);
  const updates = {};
  toDelete.forEach(k => { updates[`gaming_club_archives/${k}`] = null; });
  await _db.ref().update(updates);
}

/**
 * 获取所有云档案列表（降序，最新的在前）
 */
async function getArchives() {
  if (!_db) return [];
  const snap = await _db.ref('gaming_club_archives').once('value');
  const data = snap.val();
  if (!data) return [];

  return Object.entries(data)
    .map(([ts, val]) => ({ timestamp: Number(ts), ...val }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 从指定云档案恢复数据
 */
async function restoreArchive(timestamp) {
  if (!_db) return { success: false, error: '未连接云端' };

  try {
    const snap = await _db.ref(`gaming_club_archives/${timestamp}/data`).once('value');
    const data = snap.val();
    if (!data) return { success: false, error: '档案不存在' };

    // 先写一条"恢复操作"的档案，记录这次回滚
    await _db.ref(`gaming_club_archives/${Date.now()}`).set({
      timestamp: new Date().toISOString(),
      userId: _currentUser ? _currentUser.uid : 'unknown',
      userEmail: _currentUser ? _currentUser.email : 'unknown',
      summary: `⚠️ 从档案恢复数据（${new Date(timestamp).toLocaleString('zh-CN')}）`,
      data: _buildPayload(),  // 恢复前的快照
    });

    // 应用恢复的数据
    _applyCloudData(data);
    // 写回主数据节点
    await _dbRef.set(data);
    // 本地也保存
    _saveLocal();

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
//  云端数据同步（原有逻辑保留，加入 archive 写入）
// ============================================================

/**
 * 从云端拉取数据（覆盖内存数据）
 */
async function pullFromCloud() {
  if (!_cloudEnabled || !_dbRef) return;
  const snap = await _dbRef.once('value');
  const data = snap.val();
  if (data) {
    _applyCloudData(data);
    _saveLocal(); // 同步到本地缓存
    console.log('[Cloud] 数据已从云端加载');
  } else {
    // 云端为空：把本地数据上传（首次初始化）
    console.log('[Cloud] 云端无数据，上传本地数据...');
    await pushToCloud('首次初始化');
  }
}

/**
 * 将内存数据推送到云端（全量覆盖写）
 */
async function pushToCloud(changeSummary) {
  if (!_cloudEnabled || !_dbRef) return;
  const payload = _buildPayload();
  await _dbRef.set(payload);
  // 同时写入云档案
  await pushArchive(changeSummary || '数据更新');
}

/**
 * 建立实时监听（多设备同步核心）
 */
let _listenActive = false;
function listenCloudChanges() {
  if (_listenActive || !_cloudEnabled || !_dbRef) return;
  _listenActive = true;

  _dbRef.on('value', (snap) => {
    const data = snap.val();
    if (!data) return;

    // 判断是否为本设备发起的写操作（避免循环更新）
    if (_isSelfUpdate) { _isSelfUpdate = false; return; }

    _applyCloudData(data);
    _saveLocal();
    // 通知 UI 刷新
    if (typeof updateBadges === 'function') updateBadges();
    if (typeof switchTab === 'function') switchTab(window._currentTab || 'active-orders');
    showToast('☁️ 数据已从云端同步', 'info');
    console.log('[Cloud] 云端数据变更，界面已同步');
  });
}

let _isSelfUpdate = false;

/**
 * 将云端 JSON 数据应用到内存
 */
function _applyCloudData(data) {
  if (data.orders)          orders = data.orders;
  if (data.rechargeRecords) rechargeRecords = data.rechargeRecords;
  if (data.settlementHistory) settlementHistory = data.settlementHistory;
  if (data.companions) {
    companions.length = 0;
    companions.push(...data.companions);
  }
  if (data.bosses) {
    bosses.length = 0;
    bosses.push(...data.bosses);
  }
  if (data.categories) {
    const cat = data.categories;
    if (cat.orderTypes?.length)            { orderTypes.length = 0; orderTypes.push(...cat.orderTypes); }
    if (cat.companionModes?.length)        { companionModes.length = 0; companionModes.push(...cat.companionModes); }
    if (cat.pricingCategories?.length)     { pricingCategories.length = 0; pricingCategories.push(...cat.pricingCategories); }
    if (cat.confidentialityOptions?.length){ confidentialityOptions.length = 0; confidentialityOptions.push(...cat.confidentialityOptions); }
    if (cat.durations?.length)             { durations.length = 0; durations.push(...cat.durations); }
    if (cat.rechargeMethods?.length)       { rechargeMethods.length = 0; rechargeMethods.push(...cat.rechargeMethods); }
    if (cat.platforms?.length)             { platforms.length = 0; platforms.push(...cat.platforms); }
  }
  if (data.counters) {
    if (data.counters.nextRechargeId)    nextRechargeId    = data.counters.nextRechargeId;
    if (data.counters.nextOrderId)       nextOrderId       = data.counters.nextOrderId;
    if (data.counters.nextCompanionId)   nextCompanionId   = data.counters.nextCompanionId;
    if (data.counters.nextBossId)        nextBossId        = data.counters.nextBossId;
    if (data.counters.nextSettlementId)  nextSettlementId  = data.counters.nextSettlementId;
  }
}

/**
 * 构建完整的数据快照 payload
 */
function _buildPayload() {
  return {
    orders,
    rechargeRecords,
    settlementHistory,
    companions: [...companions],
    bosses: [...bosses],
    categories: { orderTypes, companionModes, pricingCategories, confidentialityOptions, durations, rechargeMethods, platforms },
    counters: { nextRechargeId, nextOrderId, nextCompanionId, nextBossId, nextSettlementId },
    _lastUpdated: new Date().toISOString(),
    _lastDevice: navigator.userAgent.slice(0, 80),
    _lastUser: _currentUser ? _currentUser.email : 'unknown',
  };
}

/**
 * 更新云同步状态指示器
 */
function setCloudStatus(status) {
  cloudStatus = status;
  const el = document.getElementById('cloudStatusDot');
  const txt = document.getElementById('cloudStatusText');
  if (!el || !txt) return;

  const map = {
    connecting: { color: '#EF9F27', text: '连接中...' },
    online:     { color: '#1D9E75', text: '云端同步' },
    offline:    { color: '#888780', text: '本地存储' },
    error:      { color: '#E24B4A', text: '同步失败' },
    no_auth:    { color: '#888780', text: '未登录' },
  };
  const cfg = map[status] || map.offline;
  el.style.background = cfg.color;
  txt.textContent = cfg.text;
}

// ============================================================
//  持久化：saveData / loadData（兼容本地 + 云端）
// ============================================================

/**
 * 保存数据
 * 优先云端，降级本地 localStorage
 * 已登录时：写入云端 + 本地缓存
 * 未登录时：只能写本地（并提示登录）
 */
function saveData(changeSummary) {
  // 本地 localStorage 作为离线缓存（总是保存）
  _saveLocal();

  // 云端保存（异步，不阻塞 UI）
  if (_cloudEnabled && isLoggedIn()) {
    _isSelfUpdate = true;
    pushToCloud(changeSummary || '数据更新').catch(err => {
      console.error('[Cloud] 保存失败:', err);
      setCloudStatus('error');
    });
  }
}

function _saveLocal() {
  try {
    localStorage.setItem('gc_orders', JSON.stringify(orders));
    localStorage.setItem('gc_recharges', JSON.stringify(rechargeRecords));
    localStorage.setItem('gc_bosses', JSON.stringify(bosses));
    localStorage.setItem('gc_companions', JSON.stringify(companions));
    localStorage.setItem('gc_categories', JSON.stringify({ orderTypes, companionModes, pricingCategories, confidentialityOptions, durations, rechargeMethods, platforms }));
    localStorage.setItem('gc_settlement_history', JSON.stringify(settlementHistory));
    localStorage.setItem('gc_nextRid', nextRechargeId);
    localStorage.setItem('gc_nextOid', nextOrderId);
    localStorage.setItem('gc_nextCid', nextCompanionId);
    localStorage.setItem('gc_nextBid', nextBossId);
    localStorage.setItem('gc_nextStlId', nextSettlementId);
  } catch (e) { /* ignore */ }
}

/**
 * 加载数据
 * 启动时先从本地 localStorage 加载（快速显示），
 * Firebase 初始化完成后再用云端数据覆盖
 */
function loadData() {
  _loadLocal();  // 先加载本地缓存（即时可用）

  // 异步初始化 Firebase（可能需要几百毫秒）
  _initPromise = initFirebase();
}

function _loadLocal() {
  try {
    const saved = localStorage.getItem('gc_orders');
    if (saved) orders = JSON.parse(saved);
    const savedR = localStorage.getItem('gc_recharges');
    if (savedR) rechargeRecords = JSON.parse(savedR);
    const savedB = localStorage.getItem('gc_bosses');
    if (savedB) { const lb = JSON.parse(savedB); lb.forEach(b => { const existing = bosses.find(x => x.id === b.id); if (existing) Object.assign(existing, b); else bosses.push(b); }); }
    const savedC = localStorage.getItem('gc_companions');
    if (savedC) { const lc = JSON.parse(savedC); lc.forEach(c => { const existing = companions.find(x => x.id === c.id); if (existing) Object.assign(existing, c); else companions.push(c); }); }
    const savedCat = localStorage.getItem('gc_categories');
    if (savedCat) {
      const cat = JSON.parse(savedCat);
      if (cat.orderTypes?.length)            { orderTypes.length = 0; orderTypes.push(...cat.orderTypes); }
      if (cat.companionModes?.length)        { companionModes.length = 0; companionModes.push(...cat.companionModes); }
      if (cat.pricingCategories?.length)     { pricingCategories.length = 0; pricingCategories.push(...cat.pricingCategories); }
      if (cat.confidentialityOptions?.length){ confidentialityOptions.length = 0; confidentialityOptions.push(...cat.confidentialityOptions); }
      if (cat.durations?.length)             { durations.length = 0; durations.push(...cat.durations); }
      if (cat.rechargeMethods?.length)       { rechargeMethods.length = 0; rechargeMethods.push(...cat.rechargeMethods); }
      if (cat.platforms?.length)             { platforms.length = 0; platforms.push(...cat.platforms); }
    }
    const savedStl = localStorage.getItem('gc_settlement_history');
    if (savedStl) settlementHistory = JSON.parse(savedStl);
    const savedN = localStorage.getItem('gc_nextRid');     if (savedN) nextRechargeId   = parseInt(savedN);
    const savedO = localStorage.getItem('gc_nextOid');     if (savedO) nextOrderId       = parseInt(savedO);
    const savedCi = localStorage.getItem('gc_nextCid');    if (savedCi) nextCompanionId  = parseInt(savedCi);
    const savedBi = localStorage.getItem('gc_nextBid');    if (savedBi) nextBossId       = parseInt(savedBi);
    const savedSi = localStorage.getItem('gc_nextStlId');  if (savedSi) nextSettlementId = parseInt(savedSi);
  } catch (e) { /* ignore */ }
}

// ============================================================
//  DataStore — 所有数据操作接口（与原版保持一致）
//  注意：未登录时所有写操作会被阻止
// ============================================================
const DataStore = {
  // ====== 认证相关 ======
  login,
  register,
  logout,
  isLoggedIn,
  getCurrentUser,
  isCloudEnabled() { return _cloudEnabled; },
  getCloudStatus() { return cloudStatus; },

  // ====== 云档案相关 ======
  getArchives,
  restoreArchive,

  // ====== 订单 CRUD ======
  addOrder(data) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return null; }
    const id = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextOrderId++).padStart(3, '0')}`;
    const duration = data.duration || '1';
    const amount = parseFloat(data.amount) || 0;
    const commissionRate = parseFloat(data.commissionRate) || 20;
    const companionAmount = parseFloat((amount * (1 - commissionRate / 100)).toFixed(2));
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const order = {
      id,
      companionId: data.companionId || '',
      companionName: companions.find(c => c.id === data.companionId)?.name || data.companionName || '',
      bossId: data.bossId || data.tempBossName || '',
      bossName: data.bossId
        ? (bosses.find(b => b.id === data.bossId)?.name || data.bossName || '')
        : (data.tempBossName || data.bossName || ''),
      isTempBoss: !data.bossId && !!data.tempBossName,
      orderType: data.orderType || '',
      confidentiality: data.confidentiality || '普通',
      companionMode: data.companionMode || '',
      pricingCategory: data.pricingCategory || '',
      duration,
      orderNo: data.orderNo || `PW${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(nextOrderId).padStart(3, '0')}`,
      commissionRate,
      bossSettled: data.status === 'completed' || data.status === 'unsettled_companion',
      status: data.status || 'active',
      startTime: data.startTime || now,
      amount,
      companionAmount,
      companyAmount: parseFloat((amount * commissionRate / 100).toFixed(2)),
      createdAt: now,
      completedAt: data.status === 'completed' ? now : null,
      platform: data.platform || '',
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
      order.bossId = data.tempBossName;
      order.bossName = data.tempBossName;
      order.isTempBoss = true;
    }

    order.amount = parseFloat(order.amount) || 0;
    order.commissionRate = parseFloat(order.commissionRate) || 20;
    order.companionAmount = parseFloat((order.amount * (1 - order.commissionRate / 100)).toFixed(2));
    order.companyAmount = parseFloat((order.amount * order.commissionRate / 100).toFixed(2));

    if (data.bossSettled !== undefined) order.bossSettled = data.bossSettled;
    if (order.status === 'completed') {
      order.bossSettled = true;
      order.completedAt = order.completedAt || new Date().toISOString().replace('T', ' ').substring(0, 19);
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

  getOrder(orderId) { return orders.find(o => o.id === orderId); },
  getOrders() { return orders; },
  getActiveOrders() { return orders.filter(o => o.status === 'active'); },
  getUnsettledCompanionOrders() { return orders.filter(o => o.status === 'unsettled_companion'); },
  getUnsettledBossOrders() { return orders.filter(o => o.status === 'unsettled_boss'); },
  getCompletedOrders() { return orders.filter(o => o.status === 'completed'); },

  settleCompanion(orderId) {
    if (!isLoggedIn()) { showToast('请先登录后再操作', 'error'); return false; }
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'unsettled_companion') {
      order.status = 'completed';
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
      order.status = 'unsettled_companion';
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
      order.status = 'unsettled_companion';
      order.completedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
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
    const totalAmount = unsettled.reduce((sum, o) => sum + o.amount, 0);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const settlementId = `STL-${String(nextSettlementId++).padStart(3, '0')}`;

    unsettled.forEach(o => { o.status = 'completed'; o.completedAt = now; });

    const record = {
      id: settlementId,
      companionId,
      companionName: companions.find(c => c.id === companionId)?.name || companionId,
      amount: parseFloat(totalCompanionAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      orderCount: unsettled.length,
      settledAt: now,
      orderIds: unsettled.map(o => o.id),
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
    const totalAmount = parseFloat(toSettle.reduce((sum, o) => sum + o.amount, 0).toFixed(2));
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const settlementId = `STL-${String(nextSettlementId++).padStart(3, '0')}`;

    toSettle.forEach(o => { o.status = 'completed'; o.completedAt = now; });

    const record = {
      id: settlementId,
      companionId,
      companionName: companions.find(c => c.id === companionId)?.name || companionId,
      amount: totalCompanionAmount,
      totalAmount,
      orderCount: toSettle.length,
      settledAt: now,
      orderIds: toSettle.map(o => o.id),
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

  getSettlementHistory() { return settlementHistory; },
  getSettlementHistoryByCompanion(companionId) {
    return settlementHistory.filter(r => r.companionId === companionId);
  },

  queryOrders(filters = {}) {
    let result = [...orders];
    if (filters.orderType) result = result.filter(o => o.orderType === filters.orderType);
    if (filters.confidentiality) result = result.filter(o => o.confidentiality === filters.confidentiality);
    if (filters.companionMode) result = result.filter(o => o.companionMode === filters.companionMode);
    if (filters.status) result = result.filter(o => o.status === filters.status);
    if (filters.pricingCategory) result = result.filter(o => o.pricingCategory === filters.pricingCategory);
    if (filters.companionId) result = result.filter(o => o.companionId === filters.companionId);
    if (filters.bossId) result = result.filter(o => o.bossId === filters.bossId);
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
      id: `RCH-${String(nextRechargeId++).padStart(3, '0')}`,
      bossId,
      bossName: bosses.find(b => b.id === bossId)?.name || bossId,
      amount: parseFloat(amount),
      method,
      status: 'success',
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    rechargeRecords.unshift(record);
    const boss = bosses.find(b => b.id === bossId);
    if (boss) boss.balance += parseFloat(amount);
    saveData(`老板充值 ${bossId} ¥${amount}`);
    return record;
  },

  getRechargeRecords() { return rechargeRecords; },
  getBosses() { return bosses; },
  getCompanions() { return companions; },
  getRechargeMethods() { return rechargeMethods; },

  getCategories() { return { orderTypes, companionModes, pricingCategories, confidentialityOptions, durations, rechargeMethods, platforms }; },
  getDefaultCategories() { return JSON.parse(JSON.stringify(defaultCategories)); },

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
    const active = orders.filter(o => o.status === 'active');
    const unsettledC = orders.filter(o => o.status === 'unsettled_companion');
    const unsettledB = orders.filter(o => o.status === 'unsettled_boss');
    const completed = orders.filter(o => o.status === 'completed');

    return {
      activeCount: active.length,
      unsettledCompanionCount: unsettledC.length,
      unsettledBossCount: unsettledB.length,
      completedCount: completed.length,
      totalActiveAmount:            active.reduce((sum, o) => sum + o.amount, 0),
      totalUnsettledCompanionAmount: unsettledC.reduce((sum, o) => sum + o.companionAmount, 0),
      totalUnsettledBossAmount:      unsettledB.reduce((sum, o) => sum + o.amount, 0),
      totalCompletedAmount:          completed.reduce((sum, o) => sum + o.amount, 0),
      totalCommission:               orders.reduce((sum, o) => sum + o.companyAmount, 0),
      totalOrders: orders.length,
    };
  },

  getSummaryByRange(range, date, customFrom, customTo) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const base = date || todayStr;
    let fromDate, toDate, fromStr, toStr;

    if (range === 'custom' && customFrom && customTo) {
      fromDate = new Date(customFrom + 'T00:00:00');
      toDate = new Date(customTo + 'T00:00:00');
      fromStr = fromDate.toISOString().slice(0, 10);
      toDate = new Date(toDate.getTime() + 86400000);
      toStr = toDate.toISOString().slice(0, 10);
    } else if (range === 'day') {
      fromDate = new Date(todayStr + 'T00:00:00');
      fromStr = todayStr;
      toDate = new Date(fromDate.getTime() + 86400000);
      toStr = todayStr;
    } else if (range === 'week') {
      toDate = new Date(new Date(todayStr + 'T00:00:00').getTime() + 86400000);
      fromDate = new Date(toDate.getTime() - 7 * 86400000);
      fromStr = fromDate.toISOString().slice(0, 10);
      toStr = toDate.toISOString().slice(0, 10);
    } else if (range === 'month') {
      toDate = new Date(new Date(todayStr + 'T00:00:00').getTime() + 86400000);
      fromDate = new Date(toDate.getTime() - 30 * 86400000);
      fromStr = fromDate.toISOString().slice(0, 10);
      toStr = toDate.toISOString().slice(0, 10);
    } else {
      fromDate = new Date(todayStr + 'T00:00:00');
      fromStr = todayStr;
      toDate = new Date(fromDate.getTime() + 86400000);
      toStr = todayStr;
    }

    const rangedOrders = orders.filter(o => {
      const d = (o.startTime || o.createdAt || '').slice(0, 10);
      return d >= fromStr && d < toStr;
    });

    return {
      range: range === 'custom' ? 'custom' : range,
      from: fromStr,
      to: range === 'custom' ? customTo : toStr,
      totalOrders: rangedOrders.length,
      totalAmount:          rangedOrders.reduce((sum, o) => sum + o.amount, 0),
      totalCommission:      rangedOrders.reduce((sum, o) => sum + o.companyAmount, 0),
      totalCompanionAmount: rangedOrders.reduce((sum, o) => sum + o.companionAmount, 0),
      orders: rangedOrders,
    };
  },

  getCompanionRanking() {
    const ranking = companions.map(c => {
      const cOrders = orders.filter(o => o.companionId === c.id);
      return {
        companionId: c.id,
        companionName: c.name,
        level: c.level || '',
        rating: c.rating || 0,
        orderCount: cOrders.length,
        totalAmount: cOrders.reduce((sum, o) => sum + o.amount, 0),
      };
    });
    ranking.sort((a, b) => b.orderCount !== a.orderCount ? b.orderCount - a.orderCount : b.totalAmount - a.totalAmount);
    return ranking;
  },

  // 手动强制从云端同步
  async forceSync() {
    if (!_cloudEnabled) {
      showToast('云端未连接，请先登录', 'error');
      return;
    }
    await pullFromCloud();
    if (typeof updateBadges === 'function') updateBadges();
    if (typeof switchTab === 'function') switchTab(window._currentTab || 'active-orders');
    showToast('✓ 已从云端拉取最新数据', 'success');
  },
};

// ============================================================
//  启动
// ============================================================
loadData();
window.addEventListener('beforeunload', () => _saveLocal());

// 导出登录相关函数到全局
window.login = login;
window.register = register;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
