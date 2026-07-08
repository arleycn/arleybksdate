console.log("%c 🔍 Arley's 搜索页 %c 标签 ", "color: #ffffff; background: #d2136b; border-radius: 5px; padding:5px;", "padding:5px; background:#f29bb8; color:white;");

// ================================================================
//  1. API 配置 & 用户状态
// ================================================================
const API_BASE = 'https://arleybks.arley.cn';

const DEFAULT_TABS = [
    { name: 'GitHub', url: 'https://github.com', icon: '🐙' },
    { name: 'V2EX', url: 'https://v2ex.com', icon: '💬' },
    { name: 'MDN', url: 'https://developer.mozilla.org', icon: '📘' },
    { name: 'Canva', url: 'https://canva.com', icon: '🎨' },
    { name: 'Cloudflare', url: 'https://cloudflare.com', icon: '☁️' },
    { name: 'Arley Blog', url: 'https://blog.arley.cn', icon: '📝' }
];

const SEARCH_ENGINES = [
    { name: '百度', icon: '🌐', url: 'https://www.baidu.com/s?wd=' },
    { name: 'Google', icon: '🌍', url: 'https://www.google.com/search?q=' },
    { name: 'Bing', icon: '🔵', url: 'https://www.bing.com/search?q=' },
    { name: '搜狗', icon: '🐶', url: 'https://www.sogou.com/web?query=' },
    { name: '360', icon: '🛡️', url: 'https://www.so.com/s?q=' },
    { name: 'DuckDuckGo', icon: '🦆', url: 'https://duckduckgo.com/?q=' },
    { name: 'Yandex', icon: '🌟', url: 'https://yandex.com/search/?text=' },
    { name: '头条搜索', icon: '📰', url: 'https://m.toutiao.com/search/?keyword=' }
];

// 用户状态
let currentUser = {
    isLoggedIn: false,
    username: null,
    token: null
};

let currentTabs = [];
let isNetworkError = false;

// ================================================================
//  2. 主题切换
// ================================================================

function setTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
    document.getElementById('themeSelector').value = theme;
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'auto';
    setTheme(saved);
}

// ================================================================
//  3. 时钟
// ================================================================

function updateDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    
    document.getElementById('searchDate').textContent = `${year}年${month}月${day}日`;
    document.getElementById('searchTime').textContent = `${hours}:${minutes}:${seconds}`;
    document.getElementById('searchWeekday').textContent = weekdays[now.getDay()];
}

// ================================================================
//  4. 搜索引擎
// ================================================================

function renderEngineSelect() {
    const select = document.getElementById('engineSelect');
    select.innerHTML = SEARCH_ENGINES.map((engine, i) => `
        <option value="${i}" ${i === 2 ? 'selected' : ''}>${engine.icon} ${engine.name}</option>
    `).join('');
}

function performSearch() {
    const input = document.getElementById('engineSearchInput');
    const keyword = input.value.trim();
    if (!keyword) {
        showToast('请输入关键词', true);
        return;
    }
    const index = parseInt(document.getElementById('engineSelect').value);
    const engine = SEARCH_ENGINES[index];
    window.open(engine.url + encodeURIComponent(keyword), '_blank');
}

// ================================================================
//  5. 网站图标获取工具
// ================================================================

function extractDomain(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch (e) {
        try {
            const parsed = new URL('https://' + url);
            return parsed.hostname;
        } catch (e2) {
            const match = url.match(/^(?:https?:\/\/)?([^\/?#]+)/);
            return match ? match[1] : url;
        }
    }
}

function getFaviconUrl(url) {
    const domain = extractDomain(url);
    if (!domain) return null;
    return `https://favicon.im/${domain}`;
}

// ================================================================
//  6. 🔐 用户认证管理
// ================================================================

function loadUserSession() {
    try {
        const saved = localStorage.getItem('arley_user_session');
        if (saved) {
            const session = JSON.parse(saved);
            if (session.token) {
                try {
                    const decoded = atob(session.token);
                    const parts = decoded.split(':');
                    if (parts.length === 3) {
                        const timestamp = parseInt(parts[1]);
                        const now = Date.now();
                        if (now - timestamp > 7 * 24 * 60 * 60 * 1000) {
                            localStorage.removeItem('arley_user_session');
                            return;
                        }
                    }
                } catch (e) {
                    localStorage.removeItem('arley_user_session');
                    return;
                }
                currentUser = session;
                currentUser.isLoggedIn = true;
                updateUIForLogin();
            }
        }
    } catch (e) {
        localStorage.removeItem('arley_user_session');
    }
}

function saveUserSession(username, token) {
    currentUser = {
        isLoggedIn: true,
        username: username,
        token: token
    };
    localStorage.setItem('arley_user_session', JSON.stringify(currentUser));
    updateUIForLogin();
}

function clearUserSession() {
    currentUser = {
        isLoggedIn: false,
        username: null,
        token: null
    };
    localStorage.removeItem('arley_user_session');
    updateUIForLogout();
}

function updateUIForLogin() {
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'inline-block';
    document.getElementById('userDisplay').style.display = 'inline-flex';
    document.getElementById('usernameDisplay').textContent = currentUser.username;
    document.getElementById('tabsTitle').textContent = '📌 我的标签 ✨';
    document.getElementById('tabsActions').style.display = 'flex';
}

function updateUIForLogout() {
    document.getElementById('loginBtn').style.display = 'inline-block';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('userDisplay').style.display = 'none';
    document.getElementById('usernameDisplay').textContent = '';
    document.getElementById('tabsTitle').textContent = '📌 默认标签（登录后可自定义）';
    document.getElementById('tabsActions').style.display = 'none';
}

// ================================================================
//  7. 🔐 登录 / 注册 API
// ================================================================

async function handleLogin(username, password) {
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await res.json();
        if (result.success) {
            saveUserSession(result.username, result.token);
            showToast(`✅ 欢迎回来，${result.username}`);
            await fetchTabs();
            return true;
        } else {
            showToast(result.error || '登录失败', true);
            return false;
        }
    } catch (err) {
        showToast('网络异常，请重试', true);
        return false;
    }
}

async function handleRegister(username, password) {
    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await res.json();
        if (result.success) {
            showToast('✅ 注册成功，请登录');
            closeRegisterModal();
            openLoginModal();
            return true;
        } else {
            showToast(result.error || '注册失败', true);
            return false;
        }
    } catch (err) {
        showToast('网络异常，请重试', true);
        return false;
    }
}

async function handleLogout() {
    clearUserSession();
    showToast('已退出登录');
    await fetchTabs();
}

// ================================================================
//  8. 📌 标签管理
// ================================================================

async function fetchTabs() {
    const errorBanner = document.getElementById('networkErrorBanner');
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (currentUser.isLoggedIn && currentUser.username) {
            headers['X-Username'] = currentUser.username;
        }
        
        const res = await fetch(`${API_BASE}/api/tabs`, { headers });
        const result = await res.json();
        
        if (result.success) {
            currentTabs = result.data || [];
            if (result.isLoggedIn) {
                if (!currentUser.isLoggedIn) {
                    currentUser.isLoggedIn = true;
                    currentUser.username = result.username;
                    updateUIForLogin();
                }
            }
            renderTabs();
            isNetworkError = false;
            errorBanner.classList.remove('active');
        } else {
            throw new Error(result.error || '加载失败');
        }
    } catch (err) {
        console.error('获取标签失败:', err);
        isNetworkError = true;
        errorBanner.classList.add('active');
        if (!currentUser.isLoggedIn) {
            currentTabs = [...DEFAULT_TABS];
            renderTabs();
        }
        showToast('加载标签失败，请刷新重试', true);
    }
}

async function saveTabsToServer(tabs) {
    if (!currentUser.isLoggedIn) {
        showToast('请先登录才能保存标签', true);
        return false;
    }
    
    const errorBanner = document.getElementById('networkErrorBanner');
    try {
        const res = await fetch(`${API_BASE}/api/tabs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Username': currentUser.username
            },
            body: JSON.stringify({ tabs })
        });
        const result = await res.json();
        if (result.success) {
            isNetworkError = false;
            errorBanner.classList.remove('active');
            return true;
        } else {
            if (result.error === '请先登录' || result.error === '用户不存在，请重新登录') {
                clearUserSession();
                showToast('登录已过期，请重新登录', true);
                openLoginModal();
            }
            throw new Error(result.error || '保存失败');
        }
    } catch (err) {
        console.error('保存标签失败:', err);
        isNetworkError = true;
        errorBanner.classList.add('active');
        showToast('保存失败，请检查网络', true);
        return false;
    }
}

function renderTabs() {
    const grid = document.getElementById('quickTabsGrid');
    const tabs = currentTabs || [];

    if (!tabs || tabs.length === 0) {
        grid.innerHTML = `
            <div class="quick-tabs-empty" style="grid-column:1/-1;">
                🌱 还没有标签，点击「添加」创建你的快捷方式吧
            </div>
        `;
        return;
    }

    let html = '';
    tabs.forEach((tab, index) => {
        const icon = tab.icon || '🔗';
        const name = tab.name || '未命名';
        const url = tab.url || '#';
        const isImageIcon = icon && (icon.startsWith('http') || icon.startsWith('data:'));
        html += `
            <div class="quick-tab-item" onclick="window.openTab('${escapeHtml(url)}')" title="${escapeHtml(name)}">
                <span class="quick-tab-icon">${isImageIcon ? `<img src="${escapeHtml(icon)}" alt="" loading="lazy">` : icon}</span>
                <span class="quick-tab-name">${escapeHtml(name)}</span>
                <span class="quick-tab-delete" onclick="event.stopPropagation(); window.deleteTab(${index})">✕</span>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function openTab(url) {
    if (!url || url === '#') return;
    let finalUrl = url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
    }
    window.open(finalUrl, '_blank');
}

async function deleteTab(index) {
    if (!currentUser.isLoggedIn) {
        showToast('请先登录才能删除标签', true);
        return;
    }
    if (index < 0 || index >= currentTabs.length) return;
    const name = currentTabs[index].name || '未命名';
    if (!confirm(`确定要删除「${name}」吗？`)) return;
    
    const deleted = currentTabs.splice(index, 1);
    const success = await saveTabsToServer(currentTabs);
    if (success) {
        renderTabs();
        showToast(`已删除「${name}」`);
    } else {
        currentTabs.splice(index, 0, deleted[0]);
        renderTabs();
        showToast('删除失败，请检查网络', true);
    }
}

async function resetTabs() {
    if (!currentUser.isLoggedIn) {
        showToast('请先登录才能重置标签', true);
        return;
    }
    if (!confirm('确定要重置为默认标签吗？')) return;
    currentTabs = [...DEFAULT_TABS];
    const success = await saveTabsToServer(currentTabs);
    renderTabs();
    showToast(success ? '已重置为默认标签' : '重置失败，请检查网络', !success);
}

// ================================================================
//  9. 🎨 智能图标获取
// ================================================================

function getTabIcon(name, url, userIcon) {
    if (userIcon) return userIcon;
    if (url) {
        const faviconUrl = getFaviconUrl(url);
        if (faviconUrl) return faviconUrl;
    }
    if (name) {
        const firstChar = name.charAt(0).toUpperCase();
        const emojiMap = {
            'G': '🐙', 'V': '💬', 'M': '📘', 'C': '☁️',
            'A': '📝', 'B': '🔵', 'D': '🐶', 'Y': '🌟',
            'T': '📰', 'S': '🔍', 'W': '🌐', 'N': '📺',
            'Z': '💎', 'P': '📷', 'F': '📄', 'E': '📧',
            'R': '📚', 'U': '🎓', 'I': '💡', 'O': '🎯',
            'L': '📋', 'H': '🛠️', 'J': '☕', 'K': '🔑',
            'Q': '❓', 'X': '✖️'
        };
        return emojiMap[firstChar] || '🔗';
    }
    return '🔗';
}

// ================================================================
//  10. 弹窗控制
// ================================================================

// --- 添加标签弹窗 ---
const tabModal = document.getElementById('tabModal');
const nameInput = document.getElementById('tabNameInput');
const urlInput = document.getElementById('tabUrlInput');
const iconInput = document.getElementById('tabIconInput');
const loadingEl = document.getElementById('tabModalLoading');
const previewIcon = document.getElementById('previewIcon');
const previewStatus = document.getElementById('previewStatus');

urlInput.addEventListener('input', function() {
    const url = this.value.trim();
    if (url) {
        const faviconUrl = getFaviconUrl(url);
        if (faviconUrl) {
            previewIcon.innerHTML = `<img src="${faviconUrl}" alt="favicon" onerror="this.parentElement.innerHTML='🔗'">`;
            previewStatus.textContent = '✅ 已获取网站图标';
        } else {
            previewIcon.innerHTML = '🔗';
            previewStatus.textContent = '⚠️ 无法解析网址';
        }
    } else {
        previewIcon.innerHTML = '🔗';
        previewStatus.textContent = '输入网址后自动获取';
    }
});

function openAddModal() {
    if (!currentUser.isLoggedIn) {
        showToast('请先登录才能添加标签', true);
        return;
    }
    nameInput.value = '';
    urlInput.value = '';
    iconInput.value = '';
    previewIcon.innerHTML = '🔗';
    previewStatus.textContent = '输入网址后自动获取';
    loadingEl.classList.remove('active');
    tabModal.classList.add('active');
    setTimeout(() => nameInput.focus(), 100);
}

function closeAddModal() {
    tabModal.classList.remove('active');
    loadingEl.classList.remove('active');
}

tabModal.onclick = function(e) {
    if (e.target === tabModal) closeAddModal();
};

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && tabModal.classList.contains('active')) closeAddModal();
});

async function confirmAddTab() {
    if (!currentUser.isLoggedIn) {
        showToast('请先登录才能添加标签', true);
        return;
    }
    
    const name = nameInput.value.trim();
    let url = urlInput.value.trim();
    const userIcon = iconInput.value.trim();

    if (!name) {
        showToast('请输入网站名称', true);
        nameInput.focus();
        return;
    }
    if (!url) {
        showToast('请输入网址', true);
        urlInput.focus();
        return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    const icon = getTabIcon(name, url, userIcon);
    const exists = currentTabs.some(t => t.name === name || t.url === url);
    if (exists) {
        showToast('该标签已存在', true);
        return;
    }

    loadingEl.classList.add('active');
    const confirmBtn = document.getElementById('tabModalConfirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '提交中...';

    const newTab = { name, url, icon };
    currentTabs.push(newTab);
    const success = await saveTabsToServer(currentTabs);
    
    if (success) {
        renderTabs();
        closeAddModal();
        showToast(`✅ 已添加「${name}」`);
    } else {
        currentTabs.pop();
        renderTabs();
        showToast('添加失败，请检查网络', true);
    }

    confirmBtn.disabled = false;
    confirmBtn.textContent = '添加';
    loadingEl.classList.remove('active');
}

// --- 登录弹窗 ---
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerUsername = document.getElementById('registerUsername');
const registerPassword = document.getElementById('registerPassword');

function openLoginModal() {
    loginUsername.value = '';
    loginPassword.value = '';
    document.getElementById('loginError').style.display = 'none';
    loginModal.classList.add('active');
    setTimeout(() => loginUsername.focus(), 100);
}

function closeLoginModal() {
    loginModal.classList.remove('active');
}

function openRegisterModal() {
    registerUsername.value = '';
    registerPassword.value = '';
    document.getElementById('registerError').style.display = 'none';
    registerModal.classList.add('active');
    setTimeout(() => registerUsername.focus(), 100);
}

function closeRegisterModal() {
    registerModal.classList.remove('active');
}

// ================================================================
//  11. Toast
// ================================================================

function showToast(msg, isError = false) {
    document.querySelectorAll('.toast').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' toast-error' : '');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

// ================================================================
//  12. 工具函数
// ================================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// ================================================================
//  13. 版权信息
// ================================================================

async function fetchCopyright() {
    try {
        const res = await fetch(`${API_BASE}/api/siteinfo`);
        const result = await res.json();
        const currentYear = new Date().getFullYear();
        const container = document.getElementById('copyrightContainer');
        if (result.success && result.siteInfo) {
            const info = result.siteInfo;
            const name = info.name || "Arley's | 书签导航";
            const desc = info.description || "自用书签导航站，欢迎使用";
            const year = info.copyrightYear || currentYear;
            const owner = info.copyrightOwner || '';
            const ownerUrl = info.copyrightUrl || '';
            const poweredName = info.poweredName || '';
            const poweredUrl = info.poweredUrl || '';
            const icpNumber = info.icpNumber || '';
            let html = '';
            if (owner) {
                html += `COPYRIGHT © ${year} `;
                if (ownerUrl) html += `<a href="${ownerUrl}" target="_blank" style="color: var(--btn-primary); text-decoration: none;"><strong>${owner}</strong></a> `;
                else html += `<strong>${owner}</strong> `;
            }
            if (poweredName) {
                if (html) html += `| `;
                html += `POWERED BY `;
                if (poweredUrl) html += `<a href="${poweredUrl}" target="_blank" style="color: var(--btn-primary); text-decoration: none;"><strong>${poweredName}</strong></a> `;
                else html += `<strong>${poweredName}</strong> `;
            }
            if (icpNumber) {
                if (html) html += `| `;
                html += `萌ICP备 <a href="https://icp.gov.moe/?keyword=${icpNumber}" target="_blank" rel="noopener" style="color: var(--btn-primary); text-decoration: none;"><strong>${icpNumber}</strong>号</a>`;
            }
            container.innerHTML = html || `${currentYear} ${name} · ${desc}`;
        } else {
            container.innerHTML = `${currentYear} Arley's | 书签导航 · 自用书签导航站，欢迎使用`;
        }
    } catch (err) {
        const currentYear = new Date().getFullYear();
        document.getElementById('copyrightContainer').innerHTML = `${currentYear} Arley's | 书签导航 · 自用书签导航站，欢迎使用`;
    }
}

// ================================================================
//  14. 事件绑定
// ================================================================

function initEvents() {
    // 主题切换
    document.getElementById('themeSelector').addEventListener('change', function() {
        setTheme(this.value);
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('theme') === 'auto') setTheme('auto');
    });

    // 搜索
    document.getElementById('engineSearchBtn').addEventListener('click', performSearch);
    document.getElementById('engineSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // 标签
    document.getElementById('addTabBtn').addEventListener('click', openAddModal);
    document.getElementById('resetTabsBtn').addEventListener('click', resetTabs);
    document.getElementById('tabModalCancel').addEventListener('click', closeAddModal);
    document.getElementById('tabModalConfirm').addEventListener('click', confirmAddTab);

    // 登录/注册
    document.getElementById('loginBtn').addEventListener('click', openLoginModal);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('loginCancelBtn').addEventListener('click', closeLoginModal);
    document.getElementById('registerCancelBtn').addEventListener('click', closeRegisterModal);
    document.getElementById('switchToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        closeLoginModal();
        openRegisterModal();
    });
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        closeRegisterModal();
        openLoginModal();
    });

    // 登录提交
    document.getElementById('loginConfirmBtn').addEventListener('click', async () => {
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();
        if (!username || !password) {
            document.getElementById('loginError').textContent = '请输入用户名和密码';
            document.getElementById('loginError').style.display = 'block';
            return;
        }
        document.getElementById('loginError').style.display = 'none';
        const btn = document.getElementById('loginConfirmBtn');
        btn.disabled = true;
        btn.textContent = '登录中...';
        const success = await handleLogin(username, password);
        btn.disabled = false;
        btn.textContent = '登录';
        if (success) closeLoginModal();
    });

    // 注册提交
    document.getElementById('registerConfirmBtn').addEventListener('click', async () => {
        const username = registerUsername.value.trim();
        const password = registerPassword.value.trim();
        if (!username || username.length < 2 || username.length > 20) {
            document.getElementById('registerError').textContent = '用户名需 2-20 个字符';
            document.getElementById('registerError').style.display = 'block';
            return;
        }
        if (!password || password.length < 4) {
            document.getElementById('registerError').textContent = '密码至少 4 个字符';
            document.getElementById('registerError').style.display = 'block';
            return;
        }
        document.getElementById('registerError').style.display = 'none';
        const btn = document.getElementById('registerConfirmBtn');
        btn.disabled = true;
        btn.textContent = '注册中...';
        const success = await handleRegister(username, password);
        btn.disabled = false;
        btn.textContent = '注册';
        if (success) closeRegisterModal();
    });

    // 回车键
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('loginConfirmBtn').click();
    });
    registerPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('registerConfirmBtn').click();
    });
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') urlInput.focus();
    });
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') iconInput.focus();
    });
    iconInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirmAddTab();
    });

    // 点击蒙层关闭
    loginModal.onclick = (e) => { if (e.target === loginModal) closeLoginModal(); };
    registerModal.onclick = (e) => { if (e.target === registerModal) closeRegisterModal(); };

    // 暴露全局函数给 HTML onclick 使用
    window.openTab = openTab;
    window.deleteTab = deleteTab;
    window.openAddModal = openAddModal;
    window.resetTabs = resetTabs;
}

// ================================================================
//  15. 初始化
// ================================================================

function init() {
    // 主题
    initTheme();
    
    // 时钟
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // 搜索引擎
    renderEngineSelect();
    
    // 用户会话
    loadUserSession();
    
    // 加载数据
    fetchTabs();
    fetchCopyright();
    
    // 事件绑定
    initEvents();
    
    // 搜索框自动聚焦
    document.getElementById('engineSearchInput').focus();
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}