/**
 * 粉贝书签 - 适配您的数据结构
 */

// ========== 配置 ==========
const API_BASE = "https://arleybksdate.arley.workers.dev";

const API = {
    getAll: `${API_BASE}/api/bookmarks`,
    add: `${API_BASE}/api/bookmarks`,
    delete: (category, index) => `${API_BASE}/api/bookmarks/${encodeURIComponent(category)}/${index}`,
    health: `${API_BASE}/api/health`
};

// 全局数据
let fullData = {
    menu: [],
    bookmarks: []
};
let currentSearchKeyword = '';
let currentCategory = '';

// ========== 工具函数 ==========
function showMessage(msg, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) toast.classList.add('toast-error');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2300);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncateUrl(url, maxLen = 50) {
    if (!url) return '';
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen - 3) + '...';
}

// 获取分类图标
function getCategoryIcon(categoryName, menuList) {
    const menuItem = menuList?.find(m => m.name === categoryName);
    if (menuItem && menuItem.icon) {
        const iconMap = {
            'linecons-fire': '🔥',
            'linecons-star': '⭐',
            'linecons-diamond': '💎',
            'linecons-thumbs-up': '👍',
            'linecons-photo': '📷',
            'linecons-doc': '📄',
            'linecons-graduation-cap': '🎓',
            'linecons-desktop': '💻',
            'linecons-tv': '📺',
            'linecons-search': '🔍',
            'linecons-tag': '📌'
        };
        return iconMap[menuItem.icon] || '📌';
    }
    return '📌';
}

// 高亮搜索关键词
function highlightText(text, keyword) {
    if (!keyword || !text) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedKeyword = escapeHtml(keyword);
    const regex = new RegExp(`(${escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<mark>$1</mark>');
}

// ========== 渲染函数 ==========
function renderCategoryNav() {
    const navContainer = document.getElementById('categoryNav');
    if (!navContainer) return;
    
    const categories = fullData.bookmarks
        .filter(cat => cat.bookmarks?.length > 0)
        .map(cat => cat.category);
    
    if (categories.length <= 1) {
        navContainer.style.display = 'none';
        return;
    }
    
    navContainer.style.display = 'flex';
    navContainer.innerHTML = `
        <span class="category-nav-item ${!currentCategory ? 'active' : ''}" data-category="">全部</span>
        ${categories.map(cat => `
            <span class="category-nav-item ${currentCategory === cat ? 'active' : ''}" data-category="${escapeAttr(cat)}">${escapeHtml(cat)}</span>
        `).join('')}
    `;
    
    // 绑定点击事件
    navContainer.querySelectorAll('.category-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            currentCategory = item.getAttribute('data-category');
            renderCategoryNav();
            renderPage();
        });
    });
}

function renderPage() {
    const container = document.getElementById('bookmarksContainer');
    if (!container) return;
    
    // 过滤数据
    let categoriesToShow = fullData.bookmarks.filter(cat => cat.bookmarks?.length > 0);
    
    // 分类筛选
    if (currentCategory) {
        categoriesToShow = categoriesToShow.filter(cat => cat.category === currentCategory);
    }
    
    if (categoriesToShow.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📭</span>
                <p>暂无书签~ 添加一些喜欢的网站吧 💗</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    categoriesToShow.forEach(categoryData => {
        const categoryName = categoryData.category;
        let bookmarks = categoryData.bookmarks || [];
        const icon = getCategoryIcon(categoryName, fullData.menu);
        
        // 搜索过滤
        if (currentSearchKeyword) {
            bookmarks = bookmarks.filter(bookmark =>
                bookmark.name.toLowerCase().includes(currentSearchKeyword.toLowerCase()) ||
                (bookmark.desc && bookmark.desc.toLowerCase().includes(currentSearchKeyword.toLowerCase())) ||
                bookmark.url.toLowerCase().includes(currentSearchKeyword.toLowerCase())
            );
        }
        
        if (bookmarks.length === 0) return;
        
        html += `
            <div class="category-section" data-category="${escapeAttr(categoryName)}">
                <div class="category-header">
                    <div class="category-title">
                        <span class="category-icon">${icon}</span>
                        <h2>${escapeHtml(categoryName)}</h2>
                        <span class="bookmark-count">${bookmarks.length}</span>
                    </div>
                </div>
                <div class="bookmarks-grid">
        `;
        
        bookmarks.forEach((bookmark, idx) => {
            const originalIndex = categoryData.bookmarks.findIndex(b => b.name === bookmark.name && b.url === bookmark.url);
            html += `
                <div class="bookmark-card">
                    <div class="bookmark-info">
                        <div class="bookmark-title">
                            <span class="bookmark-icon">🔗</span>
                            ${currentSearchKeyword ? highlightText(bookmark.name, currentSearchKeyword) : escapeHtml(bookmark.name)}
                        </div>
                        <div class="bookmark-url" title="${escapeAttr(bookmark.url)}">
                            ${currentSearchKeyword ? highlightText(truncateUrl(bookmark.url), currentSearchKeyword) : escapeHtml(truncateUrl(bookmark.url))}
                        </div>
                        ${bookmark.desc ? `<div class="bookmark-desc">💬 ${currentSearchKeyword ? highlightText(bookmark.desc, currentSearchKeyword) : escapeHtml(bookmark.desc)}</div>` : ''}
                    </div>
                    <div class="bookmark-actions">
                        <button class="icon-btn visit-btn" data-url="${escapeAttr(bookmark.url)}">
                            🔗 访问
                        </button>
                        <button class="icon-btn delete-btn" data-category="${escapeAttr(categoryName)}" data-index="${originalIndex}">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    
    if (html === '') {
        container.innerHTML = `
            <div class="empty-state">
                <span>🔍</span>
                <p>没有找到与 "${escapeHtml(currentSearchKeyword)}" 相关的书签</p>
            </div>
        `;
    } else {
        container.innerHTML = html;
    }
    
    bindAllEvents();
}

function bindAllEvents() {
    // 访问按钮
    document.querySelectorAll('.visit-btn').forEach(btn => {
        btn.removeEventListener('click', handleVisit);
        btn.addEventListener('click', handleVisit);
    });
    
    // 删除按钮
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.removeEventListener('click', handleDelete);
        btn.addEventListener('click', handleDelete);
    });
}

function handleVisit(e) {
    e.stopPropagation();
    const url = e.currentTarget.getAttribute('data-url');
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        window.open(url, '_blank', 'noopener noreferrer');
    } else if (url) {
        window.open('https://' + url, '_blank', 'noopener noreferrer');
    } else {
        showMessage('链接格式不正确', true);
    }
}

async function handleDelete(e) {
    e.stopPropagation();
    const category = e.currentTarget.getAttribute('data-category');
    const index = e.currentTarget.getAttribute('data-index');
    
    if (confirm('确定要删除这个书签吗？')) {
        await deleteBookmark(category, parseInt(index));
    }
}

// ========== API 请求 ==========
async function fetchBookmarks() {
    try {
        const container = document.getElementById('bookmarksContainer');
        if (container) container.innerHTML = '<div class="loading">🍥 加载书签中</div>';
        
        const response = await fetch(API.getAll);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            fullData = result.data;
        } else {
            fullData = { menu: [], bookmarks: [] };
        }
        
        if (!fullData.menu) fullData.menu = [];
        if (!fullData.bookmarks) fullData.bookmarks = [];
        
        renderCategoryNav();
        renderPage();
        updateStats();
        updateCategoryDatalist();
        
    } catch (err) {
        console.error('Fetch error:', err);
        showMessage('加载书签失败，请检查网络连接', true);
        
        document.getElementById('bookmarksContainer').innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <p>无法连接到粉色云端</p>
                <button class="btn" onclick="location.reload()" style="margin-top: 1rem;">🔄 刷新重试</button>
            </div>
        `;
    }
}

async function addBookmark(category, name, url, desc = '') {
    if (!category || !category.trim()) {
        showMessage('请填写分类', true);
        return false;
    }
    if (!name || !name.trim()) {
        showMessage('请填写书签标题~', true);
        return false;
    }
    if (!url || !url.trim()) {
        showMessage('网址不能留空~', true);
        return false;
    }
    
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
    }
    
    try {
        const response = await fetch(API.add, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: category.trim(),
                name: name.trim(),
                url: finalUrl,
                desc: desc.trim() || ''
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showMessage('✨ 书签已存入粉色小窝');
            await fetchBookmarks();
            return true;
        } else {
            throw new Error(result.error || '添加失败');
        }
    } catch (err) {
        console.error(err);
        showMessage('添加失败: ' + err.message, true);
        return false;
    }
}

async function deleteBookmark(category, index) {
    try {
        const response = await fetch(API.delete(category, index), {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('🗑️ 已移除书签');
            await fetchBookmarks();
            return true;
        } else {
            const errData = await response.json();
            throw new Error(errData.error || '删除失败');
        }
    } catch (err) {
        console.error(err);
        showMessage('删除出错，请稍后重试', true);
        return false;
    }
}

function updateStats() {
    const totalBookmarks = fullData.bookmarks.reduce((sum, cat) => sum + (cat.bookmarks?.length || 0), 0);
    const totalCategories = fullData.bookmarks.filter(cat => cat.bookmarks?.length > 0).length;
    
    const statsEl = document.getElementById('statsInfo');
    if (statsEl) {
        statsEl.innerHTML = `${totalCategories} 个分类 · ${totalBookmarks} 个书签`;
    }
}

function updateCategoryDatalist() {
    const categories = fullData.bookmarks.map(cat => cat.category);
    const datalist = document.getElementById('categoryList');
    if (datalist) {
        datalist.innerHTML = categories.map(cat => `<option value="${escapeAttr(cat)}">`).join('');
    }
}

// ========== 搜索功能 ==========
function searchBookmarks(keyword) {
    currentSearchKeyword = keyword.trim();
    currentCategory = '';
    
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
        clearBtn.style.display = currentSearchKeyword ? 'inline-block' : 'none';
    }
    
    renderCategoryNav();
    renderPage();
}

function clearSearch() {
    currentSearchKeyword = '';
    currentCategory = '';
    
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    
    renderCategoryNav();
    renderPage();
}

// ========== 可折叠面板 ==========
function initCollapsiblePanel() {
    const panel = document.querySelector('.add-panel');
    const header = document.getElementById('addPanelHeader');
    
    if (!panel || !header) return;
    
    header.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
    });
}

// ========== 初始化 ==========
function initEventListeners() {
    const addBtn = document.getElementById('addBtn');
    const titleInput = document.getElementById('titleInput');
    const urlInput = document.getElementById('urlInput');
    const categoryInput = document.getElementById('categoryInput');
    const descInput = document.getElementById('descInput');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const category = categoryInput ? categoryInput.value : '常用站点';
            const name = titleInput.value;
            const url = urlInput.value;
            const desc = descInput ? descInput.value : '';
            
            const success = await addBookmark(category, name, url, desc);
            if (success) {
                if (titleInput) titleInput.value = '';
                if (urlInput) urlInput.value = '';
                if (descInput) descInput.value = '';
            }
        });
    }
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            searchBookmarks(searchInput.value);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBookmarks(searchInput.value);
            }
        });
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    // 回车添加
    [titleInput, urlInput, categoryInput, descInput].forEach(inp => {
        if (inp) {
            inp.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && addBtn) addBtn.click();
            });
        }
    });
}

async function init() {
    initCollapsiblePanel();
    await fetchBookmarks();
    initEventListeners();
}

document.addEventListener('DOMContentLoaded', init);