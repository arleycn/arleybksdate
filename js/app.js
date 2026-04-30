/**
 * 粉贝书签 - 前端交互逻辑
 * 支持添加、删除、访问书签，与 Cloudflare Worker 后端通信
 */

// ========== 配置 ==========
// 请替换为您的 Worker 域名
const API_BASE = "https://arleybksdate.arley.workers.dev";

const API = {
    getAll: `${API_BASE}/api/bookmarks`,
    add: `${API_BASE}/api/bookmarks`,
    delete: (id) => `${API_BASE}/api/bookmarks/${id}`,
    health: `${API_BASE}/api/health`
};

// 全局状态
let bookmarksList = [];

// ========== 工具函数 ==========

/**
 * 显示提示消息
 * @param {string} msg - 提示内容
 * @param {boolean} isError - 是否为错误消息
 */
function showMessage(msg, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) {
        toast.classList.add('toast-error');
    }
    toast.textContent = msg;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2300);
}

/**
 * 转义 HTML 特殊字符
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 转义属性值
 * @param {string} str - 需要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeAttr(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 截断过长的 URL
 * @param {string} url - 原始 URL
 * @param {number} maxLen - 最大长度
 * @returns {string} 截断后的 URL
 */
function truncateUrl(url, maxLen = 45) {
    if (!url) return '';
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen - 3) + '...';
}

/**
 * 验证并格式化 URL
 * @param {string} url - 原始 URL
 * @returns {string} 格式化后的 URL
 */
function formatUrl(url) {
    let trimmedUrl = url.trim();
    if (!trimmedUrl) return '';
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        trimmedUrl = 'https://' + trimmedUrl;
    }
    return trimmedUrl;
}

// ========== 渲染函数 ==========

/**
 * 渲染书签列表
 * @param {Array} bookmarks - 书签数组
 */
function renderBookmarks(bookmarks) {
    const container = document.getElementById('bookmarksContainer');
    if (!container) return;
    
    if (!bookmarks || bookmarks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span>📭</span>
                <p>还没有书签~ 添加一些喜欢的网站吧 💗</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = bookmarks.map(bookmark => `
        <div class="bookmark-card" data-id="${escapeAttr(bookmark.id)}">
            <div class="bookmark-info">
                <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
                <div class="bookmark-url" title="${escapeAttr(bookmark.url)}">${escapeHtml(truncateUrl(bookmark.url))}</div>
            </div>
            <div class="bookmark-actions">
                <button class="icon-btn visit-btn" data-url="${escapeAttr(bookmark.url)}">
                    🔗 访问
                </button>
                <button class="icon-btn delete-btn" data-id="${escapeAttr(bookmark.id)}">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `).join('');
    
    // 绑定访问事件
    bindVisitEvents();
    
    // 绑定删除事件
    bindDeleteEvents();
}

/**
 * 绑定访问按钮事件
 */
function bindVisitEvents() {
    document.querySelectorAll('.visit-btn').forEach(btn => {
        btn.removeEventListener('click', handleVisit);
        btn.addEventListener('click', handleVisit);
    });
}

/**
 * 处理访问点击
 * @param {Event} e - 事件对象
 */
function handleVisit(e) {
    e.stopPropagation();
    const url = e.currentTarget.getAttribute('data-url');
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        window.open(url, '_blank', 'noopener noreferrer');
    } else {
        showMessage('链接格式不正确，无法访问', true);
    }
}

/**
 * 绑定删除按钮事件
 */
function bindDeleteEvents() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.removeEventListener('click', handleDelete);
        btn.addEventListener('click', handleDelete);
    });
}

/**
 * 处理删除点击
 * @param {Event} e - 事件对象
 */
async function handleDelete(e) {
    e.stopPropagation();
    const id = e.currentTarget.getAttribute('data-id');
    if (id && confirm('确定要删除这个书签吗？')) {
        await deleteBookmarkById(id);
    }
}

// ========== API 请求函数 ==========

/**
 * 获取所有书签
 */
async function fetchBookmarks() {
    try {
        const container = document.getElementById('bookmarksContainer');
        if (container) {
            container.innerHTML = '<div class="loading">🍥 加载书签中</div>';
        }
        
        const response = await fetch(API.getAll, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        bookmarksList = data.bookmarks || [];
        renderBookmarks(bookmarksList);
    } catch (err) {
        console.error('Fetch error:', err);
        showMessage('加载书签失败，请检查网络连接', true);
        
        const container = document.getElementById('bookmarksContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>⚠️</span>
                    <p>无法连接到粉色云端<br>请检查网络后刷新重试</p>
                    <button class="btn" onclick="location.reload()" style="margin-top: 1rem;">🔄 刷新重试</button>
                </div>
            `;
        }
    }
}

/**
 * 添加新书签
 * @param {string} title - 书签标题
 * @param {string} url - 书签网址
 * @returns {Promise<boolean>} 是否添加成功
 */
async function addBookmark(title, url) {
    if (!title || !title.trim()) {
        showMessage('请填写书签标题~', true);
        return false;
    }
    
    if (!url || !url.trim()) {
        showMessage('网址不能留空~', true);
        return false;
    }
    
    const formattedUrl = formatUrl(url);
    
    try {
        const response = await fetch(API.add, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title.trim(),
                url: formattedUrl
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
        console.error('Add bookmark error:', err);
        showMessage('添加失败: ' + err.message, true);
        return false;
    }
}

/**
 * 删除书签
 * @param {string} id - 书签 ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteBookmarkById(id) {
    if (!id) return false;
    
    try {
        const response = await fetch(API.delete(id), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showMessage('🗑️ 已移除书签');
            await fetchBookmarks();
            return true;
        } else {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || '删除失败');
        }
    } catch (err) {
        console.error('Delete bookmark error:', err);
        showMessage('删除出错，请稍后重试', true);
        return false;
    }
}

/**
 * 检查后端健康状态
 */
async function checkHealth() {
    try {
        const response = await fetch(API.health);
        if (response.ok) {
            const data = await response.json();
            console.log('后端状态:', data);
            return true;
        }
    } catch (err) {
        console.warn('健康检查失败:', err);
    }
    return false;
}

// ========== 初始化 ==========

/**
 * 初始化页面事件监听
 */
function initEventListeners() {
    const addBtn = document.getElementById('addBtn');
    const titleInput = document.getElementById('titleInput');
    const urlInput = document.getElementById('urlInput');
    
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const title = titleInput.value;
            const url = urlInput.value;
            
            const success = await addBookmark(title, url);
            if (success) {
                titleInput.value = '';
                urlInput.value = '';
            }
        });
    }
    
    // 回车键添加
    if (titleInput) {
        titleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && addBtn) {
                e.preventDefault();
                addBtn.click();
            }
        });
    }
    
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && addBtn) {
                e.preventDefault();
                addBtn.click();
            }
        });
    }
}

/**
 * 应用启动
 */
async function init() {
    // 可选：检查后端健康状态
    await checkHealth();
    
    // 加载书签
    await fetchBookmarks();
    
    // 绑定事件
    initEventListeners();
}

// 当 DOM 加载完成后启动应用
document.addEventListener('DOMContentLoaded', init);