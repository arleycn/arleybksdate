// ========== 全局加载动画控制 ==========
const globalLoader = document.getElementById('globalLoader');

function hideGlobalLoader() {
    if (globalLoader) {
        globalLoader.classList.add('fade-out');
        setTimeout(() => {
            if (globalLoader) {
                globalLoader.style.display = 'none';
            }
        }, 500);
    }
}

// window.addEventListener('load', function() {
//     setTimeout(hideGlobalLoader, 300);
// });

setTimeout(function() {
    if (globalLoader && globalLoader.style.display !== 'none') {
        hideGlobalLoader();
    }
}, 5000);

const API_BASE = "https://arleybks.arley.cn";
let fullData = { menu: [], bookmarks: [] };
let currentCategory = "";
let searchKeyword = "";

function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
        document.body.classList.add("dark");
        document.getElementById("themeToggle").textContent = "☀️ 白天";
    }
}

document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    document.getElementById("themeToggle").textContent = isDark ? "☀️ 白天" : "🌙 夜间";
});

// 增强返回顶部动画
function checkScrollAndAnimate() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    
    if (window.scrollY > 300) {
        if (btn.style.display !== 'flex') {
            btn.style.display = 'flex';
            btn.style.animation = 'none';
            btn.offsetHeight;
            btn.style.animation = 'fadeInUp 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards';
        }
    } else {
        if (btn.style.display === 'flex') {
            btn.style.animation = 'fadeOutDown 0.25s ease forwards';
            setTimeout(() => {
                if (window.scrollY <= 300) btn.style.display = 'none';
            }, 250);
        }
    }
}

window.addEventListener('scroll', checkScrollAndAnimate);
window.addEventListener('load', checkScrollAndAnimate);
window.addEventListener('touchend', checkScrollAndAnimate);

document.getElementById("backToTop").onclick = function() {
    const btn = this;
    btn.style.transform = 'scale(0.92)';
    setTimeout(() => {
        btn.style.transform = '';
    }, 150);
    
    const startY = window.scrollY;
    const duration = 500;
    const startTime = performance.now();
    
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    function scrollAnimation(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeInOutCubic(progress);
        window.scrollTo(0, startY * (1 - easeProgress));
        
        if (progress < 1) {
            requestAnimationFrame(scrollAnimation);
        }
    }
    
    requestAnimationFrame(scrollAnimation);
};
document.getElementById('oldVersionBtn').onclick = () => {
    window.open('/oldbookmarks/', '_blank');
};

function showMessage(msg, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:${isError ? '#c0392b' : '#27ae60'};color:white;padding:8px 18px;border-radius:40px;font-size:0.8rem;z-index:1000;animation:fadeOut 2.5s forwards;`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function highlightText(text, keyword) {
    if (!keyword || !text) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const escapedKeyword = escapeHtml(keyword);
    const regex = new RegExp(`(${escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<mark>$1</mark>');
}

const iconMap = {
    '热搜新闻': '🔥', '常用站点': '⭐', '字母站': '💎', '实用工具': '👍',
    '素材资源': '📷', '开发生产': '📄', '学无止境': '🎓', '系统相关': '💻',
    '在线追剧': '📺', '搜索引擎': '🔍'
};
function getIcon(cat) { return iconMap[cat] || '📌'; }

async function fetchBookmarks() {
    try {
        const res = await fetch(`${API_BASE}/api/bookmarks`);
        const result = await res.json();
        if (result.success && result.data) {
            fullData = result.data;
        }
        if (!fullData.menu) fullData.menu = [];
        if (!fullData.bookmarks) fullData.bookmarks = [];
        renderCategoryNav();
        renderBookmarks();
        updateStats();
        // 数据加载完成，隐藏加载动画
        hideGlobalLoader();
    } catch (err) {
        console.error(err);
        document.getElementById('bookmarksContainer').innerHTML = '<div class="empty-state"><span>⚠️</span><p>连接失败</p><button class="btn" onclick="location.reload()" style="margin-top:0.8rem;">刷新</button></div>';
        // 出错时也隐藏加载动画
        hideGlobalLoader();
    }
}

function renderCategoryNav() {
    const nav = document.getElementById('categoryNav');
    const categories = fullData.menu || [];
    if (categories.length <= 1) {
        if (nav.parentElement) nav.parentElement.style.display = 'none';
        return;
    }
    if (nav.parentElement) nav.parentElement.style.display = 'block';
    let html = `<span class="category-chip ${!currentCategory ? 'active' : ''}" data-cat="">✨ 全部</span>`;
    categories.forEach(cat => {
        html += `<span class="category-chip ${currentCategory === cat.name ? 'active' : ''}" data-cat="${escapeHtml(cat.name)}">${getIcon(cat.name)} ${escapeHtml(cat.name)}</span>`;
    });
    nav.innerHTML = html;
    nav.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            currentCategory = chip.dataset.cat;
            renderCategoryNav();
            renderBookmarks();
        });
    });
}

function renderBookmarks() {
    const container = document.getElementById('bookmarksContainer');
    let categories = fullData.bookmarks || [];

    if (currentCategory) {
        categories = categories.filter(c => c.category === currentCategory);
    }

    if (searchKeyword) {
        categories = categories.map(cat => {
            if (cat.subcategories && cat.subcategories.length > 0) {
                return {
                    ...cat,
                    subcategories: cat.subcategories.map(sub => ({
                        ...sub,
                        bookmarks: (sub.bookmarks || []).filter(b =>
                            b.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                            (b.desc && b.desc.toLowerCase().includes(searchKeyword.toLowerCase())) ||
                            b.url.toLowerCase().includes(searchKeyword.toLowerCase())
                        )
                    })).filter(sub => sub.bookmarks.length > 0)
                };
            } else if (cat.bookmarks && cat.bookmarks.length > 0) {
                return {
                    ...cat,
                    bookmarks: cat.bookmarks.filter(b =>
                        b.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                        (b.desc && b.desc.toLowerCase().includes(searchKeyword.toLowerCase())) ||
                        b.url.toLowerCase().includes(searchKeyword.toLowerCase())
                    )
                };
            }
            return cat;
        }).filter(cat => {
            if (cat.subcategories && cat.subcategories.length > 0) return true;
            if (cat.bookmarks && cat.bookmarks.length > 0) return true;
            return false;
        });
    }

    if (!categories || categories.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>📭</span><p>${searchKeyword ? `没有找到"${escapeHtml(searchKeyword)}"` : '暂无书签'}</p></div>`;
        return;
    }

    let html = '';
    categories.forEach(cat => {
        html += `<div class="category-section"><div class="category-header"><div class="category-title"><span class="category-icon">${getIcon(cat.category)}</span><h2>${escapeHtml(cat.category)}</h2></div></div>`;

        if (cat.subcategories && cat.subcategories.length > 0) {
            cat.subcategories.forEach(sub => {
                const bookmarks = sub.bookmarks || [];
                if (bookmarks.length === 0) return;

                html += `<div class="subcategory-section"><div class="subcategory-header"><span class="subcategory-title">📂 ${escapeHtml(sub.name)}</span><span class="subcategory-count">${bookmarks.length}</span></div><div class="bookmarks-grid">`;

                bookmarks.forEach(bookmark => {
                    const displayName = searchKeyword ? highlightText(bookmark.name, searchKeyword) : escapeHtml(bookmark.name);
                    const displayUrl = searchKeyword ? highlightText(bookmark.url.length > 50 ? bookmark.url.substring(0, 50) + '...' : bookmark.url, searchKeyword) : escapeHtml(bookmark.url.length > 50 ? bookmark.url.substring(0, 50) + '...' : bookmark.url);
                    html += `<div class="bookmark-card"><div class="bookmark-info"><div class="bookmark-title">🔗 ${displayName}</div><div class="bookmark-url" title="${escapeHtml(bookmark.url)}">${displayUrl}</div>${bookmark.desc ? `<div class="bookmark-desc">💬 ${searchKeyword ? highlightText(bookmark.desc, searchKeyword) : escapeHtml(bookmark.desc)}</div>` : ''}</div><div class="bookmark-actions"><button class="icon-btn visit-btn" data-url="${escapeHtml(bookmark.url)}">访问</button></div></div>`;
                });

                html += `</div></div>`;
            });
        } else if (cat.bookmarks && cat.bookmarks.length > 0) {
            html += `<div class="bookmarks-grid">`;
            cat.bookmarks.forEach(bookmark => {
                const displayName = searchKeyword ? highlightText(bookmark.name, searchKeyword) : escapeHtml(bookmark.name);
                const displayUrl = searchKeyword ? highlightText(bookmark.url.length > 50 ? bookmark.url.substring(0, 50) + '...' : bookmark.url, searchKeyword) : escapeHtml(bookmark.url.length > 50 ? bookmark.url.substring(0, 50) + '...' : bookmark.url);
                html += `<div class="bookmark-card"><div class="bookmark-info"><div class="bookmark-title">🔗 ${displayName}</div><div class="bookmark-url" title="${escapeHtml(bookmark.url)}">${displayUrl}</div>${bookmark.desc ? `<div class="bookmark-desc">💬 ${searchKeyword ? highlightText(bookmark.desc, searchKeyword) : escapeHtml(bookmark.desc)}</div>` : ''}</div><div class="bookmark-actions"><button class="icon-btn visit-btn" data-url="${escapeHtml(bookmark.url)}">访问</button></div></div>`;
            });
            html += `</div>`;
        }

        html += `</div>`;
    });

    container.innerHTML = html;

    const cards = document.querySelectorAll('.bookmark-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.03}s`;
    });

    document.querySelectorAll('.visit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let url = btn.dataset.url;
            if (!url.startsWith('http')) url = 'https://' + url;
            window.open(url, '_blank');
        });
    });
}

async function fetchMessages() {
    try {
        const res = await fetch(`${API_BASE}/api/messages`);
        const result = await res.json();
        if (result.success) renderMessages(result.messages);
    } catch (err) {
        document.getElementById('messagesContainer').innerHTML = '<div class="empty-state">加载失败</div>';
    }
}

function renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="empty-state">✨ 暂无推荐，快来留言吧~</div>';
        return;
    }
    let html = '';
    messages.forEach(msg => {
        html += `<div class="message-card"><div class="message-header"><span class="message-nickname">${escapeHtml(msg.nickname)}</span><span class="message-time">${new Date(msg.time).toLocaleDateString()}</span></div><div class="message-content">${escapeHtml(msg.content)}</div>`;
        if (msg.recommendUrl) html += `<div class="message-url">🔗 <a href="${escapeHtml(msg.recommendUrl)}" target="_blank">${escapeHtml(msg.recommendUrl.length > 40 ? msg.recommendUrl.substring(0, 40) + '...' : msg.recommendUrl)}</a></div>`;
        html += `</div>`;
    });
    container.innerHTML = html;
}

async function submitMessage(nickname, content, url) {
    if (!nickname || !content) { showMessage('请填写昵称和留言内容', true); return false; }
    try {
        const res = await fetch(`${API_BASE}/api/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, content, recommendUrl: url || '' })
        });
        const result = await res.json();
        if (result.success) {
            showMessage('💌 留言成功！等待审核');
            return true;
        } else {
            showMessage(result.error || '提交失败', true);
            return false;
        }
    } catch (err) {
        showMessage('提交失败', true);
        return false;
    }
}

async function fetchSiteInfo() {
    try {
        const res = await fetch(`${API_BASE}/api/siteinfo`);
        const result = await res.json();
        const currentYear = new Date().getFullYear();
        const siteNameEl = document.getElementById('siteNameDisplay');
        const siteDescEl = document.getElementById('siteDescDisplay');
        const copyrightContainer = document.getElementById('copyrightContainer');

        if (result.success && result.siteInfo) {
            const info = result.siteInfo;
            const siteName = info.name || "Arley's | 书签导航";
            const siteDesc = info.description || "自用书签导航站，欢迎使用";
            if (siteNameEl) siteNameEl.innerHTML = `🌸 ${siteName}`;
            if (siteDescEl) siteDescEl.innerHTML = siteDesc;

            if (copyrightContainer) {
                const hasCopyright = info.copyrightYear || info.copyrightOwner || info.poweredName || info.icpNumber;
                if (hasCopyright) {
                    const year = info.copyrightYear || currentYear;
                    const owner = info.copyrightOwner || '';
                    const ownerUrl = info.copyrightUrl || '';
                    const poweredName = info.poweredName || '';
                    const poweredUrl = info.poweredUrl || '';
                    const icpNumber = info.icpNumber || '';
                    let copyrightHtml = '';

                    if (owner) {
                        copyrightHtml += `COPYRIGHT © ${year} `;
                        if (ownerUrl) copyrightHtml += `<a href="${ownerUrl}" target="_blank" style="color: var(--btn-primary); text-decoration: none;"><strong>${owner}</strong></a> `;
                        else copyrightHtml += `<strong>${owner}</strong> `;
                    }
                    if (poweredName) {
                        if (copyrightHtml) copyrightHtml += `| `;
                        copyrightHtml += `POWERED BY `;
                        if (poweredUrl) copyrightHtml += `<a href="${poweredUrl}" target="_blank" style="color: var(--btn-primary); text-decoration: none;"><strong>${poweredName}</strong></a> `;
                        else copyrightHtml += `<strong>${poweredName}</strong> `;
                    }
                    if (icpNumber) {
                        if (copyrightHtml) copyrightHtml += `| `;
                        copyrightHtml += `萌ICP备 <a href="https://icp.gov.moe/?keyword=${icpNumber}" target="_blank" rel="noopener" style="color: var(--btn-primary); text-decoration: none;"><strong>${icpNumber}</strong>号</a>`;
                    }
                    copyrightContainer.innerHTML = copyrightHtml || `${currentYear} ${siteName} · ${siteDesc}`;
                } else {
                    copyrightContainer.innerHTML = `${currentYear} ${siteName} · ${siteDesc}`;
                }
            }
        } else {
            const defaultName = "Arley's | 书签导航";
            const defaultDesc = "自用书签导航站，欢迎使用";
            if (siteNameEl) siteNameEl.innerHTML = `🌸 ${defaultName}`;
            if (siteDescEl) siteDescEl.innerHTML = defaultDesc;
            if (copyrightContainer) copyrightContainer.innerHTML = `${currentYear} ${defaultName} · ${defaultDesc}`;
        }
    } catch (err) {
        const currentYear = new Date().getFullYear();
        const defaultName = "Arley's | 书签导航";
        const defaultDesc = "自用书签导航站，欢迎使用";
        const siteNameEl = document.getElementById('siteNameDisplay');
        const siteDescEl = document.getElementById('siteDescDisplay');
        const copyrightContainer = document.getElementById('copyrightContainer');
        if (siteNameEl) siteNameEl.innerHTML = `🌸 ${defaultName}`;
        if (siteDescEl) siteDescEl.innerHTML = defaultDesc;
        if (copyrightContainer) copyrightContainer.innerHTML = `${currentYear} ${defaultName} · ${defaultDesc}`;
    }
}

async function loadQuickLinks() {
    const container = document.getElementById('quickItemsContainer');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/api/quicklinks`);
        const result = await res.json();
        if (result.success && result.quickLinks && result.quickLinks.length > 0) {
            let html = '';
            result.quickLinks.forEach(link => {
                const icon = link.icon || '🔗';
                html += `<a href="${escapeHtml(link.url)}" target="_blank" class="quick-item">${icon} ${escapeHtml(link.name)}</a>`;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '';
        }
    } catch (err) {
        console.error('加载快捷链接失败', err);
        container.innerHTML = '';
    }
}

function updateStats() {
    let total = 0;
    let catCount = 0;
    const bookmarks = fullData.bookmarks || [];
    bookmarks.forEach(cat => {
        if (cat.subcategories && cat.subcategories.length > 0) {
            cat.subcategories.forEach(sub => {
                total += (sub.bookmarks || []).length;
            });
            catCount++;
        } else if (cat.bookmarks && cat.bookmarks.length > 0) {
            total += cat.bookmarks.length;
            catCount++;
        }
    });
    document.getElementById('statsInfo').innerHTML = `${catCount} 个分类 · ${total} 个书签`;
}

function searchBookmarks() {
    searchKeyword = document.getElementById('searchInput').value.trim();
    currentCategory = '';
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.style.display = searchKeyword ? 'inline-block' : 'none';
    renderCategoryNav();
    renderBookmarks();
}

function clearSearch() {
    searchKeyword = '';
    currentCategory = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    renderCategoryNav();
    renderBookmarks();
}

// 留言弹窗
const modal = document.getElementById('messageModal');
const msgNickname = document.getElementById('msgNickname');
const msgContent = document.getElementById('msgContent');
const msgUrl = document.getElementById('msgUrl');

document.getElementById('messageBtn').onclick = () => {
    msgNickname.value = '';
    msgContent.value = '';
    msgUrl.value = '';
    modal.classList.add('active');
};
document.getElementById('modalClose').onclick = () => modal.classList.remove('active');
modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
document.getElementById('modalSubmit').onclick = async () => {
    const nickname = msgNickname.value.trim();
    const content = msgContent.value.trim();
    const url = msgUrl.value.trim();
    if (!nickname || !content) { showMessage('请填写完整', true); return; }
    const success = await submitMessage(nickname, content, url);
    if (success) {
        modal.classList.remove('active');
        fetchMessages();
    }
};

// 打赏弹窗
const rewardModal = document.getElementById('rewardModal');
document.getElementById('rewardBtn').onclick = () => { rewardModal.classList.add('active'); };
document.getElementById('closeRewardBtn').onclick = () => { rewardModal.classList.remove('active'); };
rewardModal.onclick = (e) => { if (e.target === rewardModal) rewardModal.classList.remove('active'); };

document.getElementById('adminBtn').onclick = () => { window.open('admin.html', '_blank'); };
document.getElementById('searchBtn').onclick = searchBookmarks;
document.getElementById('searchInput').onkeypress = (e) => { if (e.key === 'Enter') searchBookmarks(); };
document.getElementById('clearSearchBtn').onclick = clearSearch;
console.log(" %c Bookmarks By Arley %c https://arley.cn/ ", "color: #ffffff; background: #d2136b; border-radius: 5px; padding:5px;", "padding:5px;"),
// 初始化
initTheme();
fetchBookmarks();
fetchMessages();
fetchSiteInfo();
loadQuickLinks();