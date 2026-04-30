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

function truncateUrl(url, maxLen = 50) {
    if (!url) return '';
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen - 3) + '...';
}

// 获取分类图标（根据分类名称或menu配置）
function getCategoryIcon(categoryName, menuList) {
    const menuItem = menuList.find(m => m.name === categoryName);
    if (menuItem && menuItem.icon) {
        return menuItem.icon;
    }
    // 默认图标
    const iconMap = {
        '热搜新闻': '🔥',
        '常用站点': '⭐',
        '字母站': '💎',
        '实用工具': '👍',
        '素材资源': '📷',
        '开发生产': '📄',
        '学无止境': '🎓',
        '系统相关': '💻',
        '在线追剧': '📺',
        '搜索引擎': '🔍'
    };
    return iconMap[categoryName] || '📌';
}

// ========== 渲染主页面 ==========
function renderPage() {
    const container = document.getElementById('bookmarksContainer');
    if (!container) return;
    
    if (!fullData.bookmarks || fullData.bookmarks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📭</span>
                <p>还没有书签~ 添加一些喜欢的网站吧 💗</p>
            </div>
        `;
        return;
    }
    
    // 渲染所有分类
    let html = '';
    
    fullData.bookmarks.forEach((categoryData, catIndex) => {
        const categoryName = categoryData.category;
        const bookmarks = categoryData.bookmarks || [];
        const icon = getCategoryIcon(categoryName, fullData.menu);
        
        if (bookmarks.length === 0) return;
        
        html += `
            <div class="category-section" data-category="${escapeHtml(categoryName)}">
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
            html += `
                <div class="bookmark-card" data-category="${escapeHtml(categoryName)}" data-index="${idx}">
                    <div class="bookmark-info">
                        <div class="bookmark-title">
                            <span class="bookmark-icon">🔗</span>
                            ${escapeHtml(bookmark.name)}
                        </div>
                        <div class="bookmark-url" title="${escapeHtml(bookmark.url)}">
                            ${escapeHtml(truncateUrl(bookmark.url))}
                        </div>
                        ${bookmark.desc ? `<div class="bookmark-desc">💬 ${escapeHtml(bookmark.desc)}</div>` : ''}
                    </div>
                    <div class="bookmark-actions">
                        <button class="icon-btn visit-btn" data-url="${escapeAttr(bookmark.url)}">
                            🔗 访问
                        </button>
                        <button class="icon-btn delete-btn" data-category="${escapeHtml(categoryName)}" data-index="${idx}">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
    
    // 绑定事件
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
    
    if (confirm(`确定要删除这个书签吗？`)) {
        await deleteBookmark(category, index);
    }
}

// ========== API 请求 ==========
async function fetchBookmarks() {
    try {
        const container = document.getElementById('bookmarksContainer');
        if (container) container.innerHTML = '<div class="loading">🍥 加载书签中</div>';
        
        const response = await fetch(API.getAll);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success && result.data) {
            fullData = result.data;
            if (!fullData.menu) fullData.menu = [];
            if (!fullData.bookmarks) fullData.bookmarks = [];
        } else if (result.success && result.bookmarks) {
            // 兼容旧格式
            fullData = {
                menu: result.menu || [],
                bookmarks: result.bookmarks || []
            };
        }
        
        renderPage();
        
        // 更新统计
        updateStats();
    } catch (err) {
        console.error('Fetch error:', err);
        showMessage('加载书签失败，请检查网络连接', true);
        document.getElementById('bookmarksContainer').innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <p>无法连接到粉色云端<br>请检查网络后刷新重试</p>
                <button class="btn" onclick="location.reload()" style="margin-top: 1rem;">🔄 刷新重试</button>
            </div>
        `;
    }
}

async function addBookmark(category, name, url, desc = '') {
    if (!category || !category.trim()) {
        showMessage('请选择或输入分类', true);
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

// ========== 搜索功能 ==========
function searchBookmarks(keyword) {
    if (!keyword.trim()) {
        renderPage();
        return;
    }
    
    const lowerKeyword = keyword.toLowerCase();
    const container = document.getElementById('bookmarksContainer');
    
    let html = '';
    let hasResults = false;
    
    fullData.bookmarks.forEach(categoryData => {
        const categoryName = categoryData.category;
        const matchedBookmarks = (categoryData.bookmarks || []).filter(bookmark =>
            bookmark.name.toLowerCase().includes(lowerKeyword) ||
            (bookmark.desc && bookmark.desc.toLowerCase().includes(lowerKeyword)) ||
            bookmark.url.toLowerCase().includes(lowerKeyword)
        );
        
        if (matchedBookmarks.length > 0) {
            hasResults = true;
            const icon = getCategoryIcon(categoryName, fullData.menu);
            
            html += `
                <div class="category-section">
                    <div class="category-header">
                        <div class="category-title">
                            <span class="category-icon">${icon}</span>
                            <h2>${escapeHtml(categoryName)}</h2>
                            <span class="bookmark-count">${matchedBookmarks.length}</span>
                        </div>
                    </div>
                    <div class="bookmarks-grid">
            `;
            
            matchedBookmarks.forEach((bookmark, idx) => {
                html += `
                    <div class="bookmark-card search-result">
                        <div class="bookmark-info">
                            <div class="bookmark-title">
                                <span class="bookmark-icon">🔗</span>
                                ${escapeHtml(bookmark.name)}
                            </div>
                            <div class="bookmark-url" title="${escapeHtml(bookmark.url)}">
                                ${escapeHtml(truncateUrl(bookmark.url))}
                            </div>
                            ${bookmark.desc ? `<div class="bookmark-desc">💬 ${escapeHtml(bookmark.desc)}</div>` : ''}
                        </div>
                        <div class="bookmark-actions">
                            <button class="icon-btn visit-btn" data-url="${escapeAttr(bookmark.url)}">🔗 访问</button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
    });
    
    if (!hasResults) {
        container.innerHTML = `
            <div class="empty-state">
                <span>🔍</span>
                <p>没有找到与 "${escapeHtml(keyword)}" 相关的书签</p>
            </div>
        `;
    } else {
        container.innerHTML = html;
        // 重新绑定访问按钮
        document.querySelectorAll('.visit-btn').forEach(btn => {
            btn.removeEventListener('click', handleVisit);
            btn.addEventListener('click', handleVisit);
        });
    }
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
    
    // 搜索功能
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
    
    // 回车添加
    const inputs = [titleInput, urlInput];
    inputs.forEach(inp => {
        if (inp) {
            inp.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && addBtn) addBtn.click();
            });
        }
    });
}

// 初始化分类下拉框
function initCategorySelect() {
    const categoryInput = document.getElementById('categoryInput');
    if (!categoryInput) return;
    
    // 从已有的分类中获取列表
    const categories = fullData.bookmarks.map(cat => cat.category);
    const uniqueCategories = [...new Set(categories)];
    
    if (uniqueCategories.length > 0) {
        // 可以添加 datalist 建议
        const datalist = document.createElement('datalist');
        datalist.id = 'categoryList';
        uniqueCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            datalist.appendChild(option);
        });
        document.body.appendChild(datalist);
        categoryInput.setAttribute('list', 'categoryList');
    }
}

async function init() {
    await fetchBookmarks();
    initEventListeners();
    initCategorySelect();
}

document.addEventListener('DOMContentLoaded', init);