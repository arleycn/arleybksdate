const API_BASE = "https://arleybks.arley.cn";
let adminPass = localStorage.getItem("adminPass");

function showLoginModal() {
    let loginModal = document.getElementById('loginModal');
    if (!loginModal) {
        loginModal = document.createElement('div');
        loginModal.id = 'loginModal';
        loginModal.className = 'modal';
        loginModal.innerHTML = `
            <div class="modal-content" style="max-width: 350px;">
                <h3>🔐 管理员登录</h3>
                <input type="password" id="loginPasswordInput" placeholder="请输入管理密码" style="width:100%; padding:12px; border-radius:30px; border:1px solid #2a2a3e; background:#1a1a2e; color:#e8e8e8; margin-bottom:1rem;">
                <div id="loginErrorMsg" style="color:#e74c3c; font-size:0.75rem; margin-bottom:0.8rem; display:none;"></div>
                <div class="modal-buttons">
                    <button class="btn" id="loginCancelBtn">取消</button>
                    <button class="btn btn-primary" id="loginConfirmBtn">登录</button>
                </div>
            </div>
        `;
        document.body.appendChild(loginModal);

        document.getElementById('loginCancelBtn').onclick = () => {
            loginModal.classList.remove('active');
            window.location.href = "/";
        };
        document.getElementById('loginConfirmBtn').onclick = async () => {
            const pwd = document.getElementById('loginPasswordInput').value;
            const errorMsg = document.getElementById('loginErrorMsg');
            const loginBtn = document.getElementById('loginConfirmBtn');
            if (!pwd) { errorMsg.textContent = '请输入密码'; errorMsg.style.display = 'block'; return; }
            loginBtn.textContent = '登录中...';
            loginBtn.disabled = true;
            errorMsg.style.display = 'none';
            try {
                const res = await fetch(`${API_BASE}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
                const result = await res.json();
                if (result.success) {
                    localStorage.setItem('adminPass', pwd);
                    adminPass = pwd;
                    showToast('✅ 登录成功');
                    loginModal.classList.remove('active');
                    loadAllData();
                } else {
                    errorMsg.textContent = '密码错误，请重试';
                    errorMsg.style.display = 'block';
                    loginBtn.textContent = '登录';
                    loginBtn.disabled = false;
                    document.getElementById('loginPasswordInput').value = '';
                }
            } catch (err) {
                errorMsg.textContent = '网络错误，请重试';
                errorMsg.style.display = 'block';
                loginBtn.textContent = '登录';
                loginBtn.disabled = false;
            }
        };
        document.getElementById('loginPasswordInput').onkeypress = (e) => { if (e.key === 'Enter') document.getElementById('loginConfirmBtn').click(); };
    }
    loginModal.classList.add('active');
    setTimeout(() => { const input = document.getElementById('loginPasswordInput'); if (input) input.focus(); }, 100);
}

if (!adminPass) { showLoginModal(); }

const headers = { 'Authorization': `Bearer ${adminPass}`, 'Content-Type': 'application/json' };

function showToast(msg, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' toast-error' : '');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    modal.classList.add('active');
    const confirmOk = () => {
        modal.classList.remove('active');
        document.getElementById('confirmOk').removeEventListener('click', confirmOk);
        document.getElementById('confirmCancel').removeEventListener('click', confirmCancel);
        onConfirm();
    };
    const confirmCancel = () => {
        modal.classList.remove('active');
        document.getElementById('confirmOk').removeEventListener('click', confirmOk);
        document.getElementById('confirmCancel').removeEventListener('click', confirmCancel);
    };
    document.getElementById('confirmOk').addEventListener('click', confirmOk);
    document.getElementById('confirmCancel').addEventListener('click', confirmCancel);
}

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
});

let bookmarksData = { menu: [], bookmarks: [] };

async function loadAllData() {
    await loadBookmarks();
    await loadMessages();
    await loadQuickLinks();
    await loadSiteInfo();
    await load404Feedbacks();
}

// ========== 书签管理 ==========
async function loadBookmarks() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/bookmarks`, { headers: { 'Authorization': `Bearer ${adminPass}` } });
        if (res.status === 401) { showToast('登录已过期', true); logout(); return; }
        const result = await res.json();
        if (result.success) {
            bookmarksData = result.data;
            renderBookmarks();
            updateNewSubcategoryDatalist(document.getElementById('newCategory').value);
        }
    } catch (err) { showToast('加载失败', true); }
}

function updateNewSubcategoryDatalist(category) {
    const bookmarks = bookmarksData.bookmarks || [];
    const catData = bookmarks.find(c => c.category === category);
    const allSubcategories = [];
    if (catData && catData.subcategories) {
        catData.subcategories.forEach(sub => {
            if (sub.name) allSubcategories.push(sub.name);
        });
    }
    const datalist = document.getElementById('newSubcategoryList');
    datalist.innerHTML = allSubcategories.map(s => `<option value="${escapeHtml(s)}">`).join('');
}

async function saveBookmarksData() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/bookmarks`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ bookmarks: bookmarksData.bookmarks })
        });
        if (!res.ok) throw new Error('保存失败');
        return true;
    } catch (err) {
        showToast('保存失败', true);
        throw err;
    }
}

function renderBookmarks() {
    const container = document.getElementById('bookmarksList');
    const bookmarks = bookmarksData.bookmarks || [];

    if (!bookmarks || bookmarks.length === 0) {
        container.innerHTML = '<div class="empty">暂无书签，请添加</div>';
        return;
    }

    let html = '';
    bookmarks.forEach(cat => {
        if (cat.subcategories && cat.subcategories.length > 0) {
            cat.subcategories.forEach(sub => {
                const bookmarksList = sub.bookmarks || [];
                bookmarksList.forEach((bookmark, idx) => {
                    html += `
                        <div style="background: #1a1a2e; border-radius: 12px; padding: 0.8rem; margin-bottom: 0.8rem;">
                            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem;">
                                <div style="flex: 1;">
                                    <span style="color: #d99bb8;">📁 ${escapeHtml(cat.category)}</span> / 
                                    <span style="color: #9b59b6;">📂 ${escapeHtml(sub.name)}</span>
                                    <div><strong>${escapeHtml(bookmark.name)}</strong></div>
                                    <div style="font-size: 0.75rem; color: #888;">${escapeHtml(bookmark.url)}</div>
                                    ${bookmark.desc ? `<div style="font-size: 0.7rem; color: #666;">${escapeHtml(bookmark.desc)}</div>` : ''}
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-primary btn-sm" onclick="editBookmark('${escapeHtml(cat.category)}', '${escapeHtml(sub.name)}', ${idx})">编辑</button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteBookmark('${escapeHtml(cat.category)}', '${escapeHtml(sub.name)}', ${idx})">删除</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            });
        } else if (cat.bookmarks && cat.bookmarks.length > 0) {
            cat.bookmarks.forEach((bookmark, idx) => {
                html += `
                    <div style="background: #1a1a2e; border-radius: 12px; padding: 0.8rem; margin-bottom: 0.8rem;">
                        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem;">
                            <div style="flex: 1;">
                                <span style="color: #d99bb8;">📁 ${escapeHtml(cat.category)}</span>
                                <div><strong>${escapeHtml(bookmark.name)}</strong></div>
                                <div style="font-size: 0.75rem; color: #888;">${escapeHtml(bookmark.url)}</div>
                                ${bookmark.desc ? `<div style="font-size: 0.7rem; color: #666;">${escapeHtml(bookmark.desc)}</div>` : ''}
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-primary btn-sm" onclick="editBookmarkDirect('${escapeHtml(cat.category)}', ${idx})">编辑</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteBookmarkDirect('${escapeHtml(cat.category)}', ${idx})">删除</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
    });

    if (html === '') {
        container.innerHTML = '<div class="empty">暂无书签，请添加</div>';
    } else {
        container.innerHTML = html;
    }
}

window.deleteBookmark = async (category, subcategory, index) => {
    showConfirm('删除书签', '确定要删除这个书签吗？', async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/bookmarks/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}/${index}`, { method: 'DELETE', headers });
            if (res.ok) { showToast('✅ 书签已删除'); loadBookmarks(); }
            else { showToast('删除失败', true); }
        } catch (err) { showToast('删除失败', true); }
    });
};

window.deleteBookmarkDirect = async (category, index) => {
    showConfirm('删除书签', '确定要删除这个书签吗？', async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/bookmarks/${encodeURIComponent(category)}/${index}`, { method: 'DELETE', headers });
            if (res.ok) { showToast('✅ 书签已删除'); loadBookmarks(); }
            else { showToast('删除失败', true); }
        } catch (err) { showToast('删除失败', true); }
    });
};

document.getElementById('addBookmarkBtn').onclick = async () => {
    const category = document.getElementById('newCategory').value;
    const subcategory = document.getElementById('newSubcategory').value.trim();
    const name = document.getElementById('newName').value.trim();
    let url = document.getElementById('newUrl').value.trim();
    const desc = document.getElementById('newDesc').value.trim();

    if (!category || !name || !url) { showToast('请填写完整', true); return; }
    if (!url.startsWith('http')) url = 'https://' + url;

    const requestBody = { category, name, url, desc };
    if (subcategory) requestBody.subcategory = subcategory;

    try {
        const res = await fetch(`${API_BASE}/api/admin/bookmarks`, {
            method: 'POST', headers,
            body: JSON.stringify(requestBody)
        });
        if (res.ok) {
            showToast('✨ 添加成功');
            document.getElementById('newSubcategory').value = '';
            document.getElementById('newName').value = '';
            document.getElementById('newUrl').value = '';
            document.getElementById('newDesc').value = '';
            loadBookmarks();
        } else { showToast('添加失败', true); }
    } catch (err) { showToast('添加失败', true); }
};

// ========== 书签编辑弹窗 ==========
let currentEditData = null;
let currentEditType = null;

function showEditBookmarkModal(bookmarkData, isSubcategory) {
    currentEditData = bookmarkData;
    currentEditType = isSubcategory ? 'sub' : 'direct';

    const modal = document.getElementById('editBookmarkModal');
    document.getElementById('editName').value = bookmarkData.name || '';
    document.getElementById('editUrl').value = bookmarkData.url || '';
    document.getElementById('editDesc').value = bookmarkData.desc || '';
    document.getElementById('editCategory').value = bookmarkData.category || '';
    document.getElementById('editSubcategory').value = bookmarkData.subcategory || '';

    updateEditSubcategoryDatalist(bookmarkData.category);
    modal.classList.add('active');
}

function updateEditSubcategoryDatalist(category) {
    const bookmarks = bookmarksData.bookmarks || [];
    const catData = bookmarks.find(c => c.category === category);
    const allSubcategories = [];
    if (catData && catData.subcategories) {
        catData.subcategories.forEach(sub => { allSubcategories.push(sub.name); });
    }
    const datalist = document.getElementById('editSubcategoryList');
    datalist.innerHTML = allSubcategories.map(s => `<option value="${escapeHtml(s)}">`).join('');
}

document.getElementById('editCategory').addEventListener('change', function() {
    updateEditSubcategoryDatalist(this.value);
});

document.getElementById('closeEditModalBtn').onclick = () => {
    document.getElementById('editBookmarkModal').classList.remove('active');
    currentEditData = null;
};

document.getElementById('saveEditModalBtn').onclick = async () => {
    const newCategory = document.getElementById('editCategory').value;
    const newSubcategory = document.getElementById('editSubcategory').value.trim();
    const newName = document.getElementById('editName').value.trim();
    let newUrl = document.getElementById('editUrl').value.trim();
    const newDesc = document.getElementById('editDesc').value.trim();

    if (!newName || !newUrl) { showToast('标题和网址不能为空', true); return; }
    if (!newUrl.startsWith('http')) newUrl = 'https://' + newUrl;

    const bookmarks = bookmarksData.bookmarks || [];

    if (currentEditType === 'sub') {
        const catData = bookmarks.find(c => c.category === currentEditData.oldCategory);
        if (!catData) return;
        const subData = catData.subcategories.find(s => s.name === currentEditData.oldSubcategory);
        if (!subData) return;
        const bookmark = subData.bookmarks[currentEditData.index];
        if (!bookmark) return;

        bookmark.name = newName;
        bookmark.url = newUrl;
        bookmark.desc = newDesc;

        if (newCategory !== currentEditData.oldCategory || newSubcategory !== currentEditData.oldSubcategory) {
            subData.bookmarks.splice(currentEditData.index, 1);
            let newCatData = bookmarks.find(c => c.category === newCategory);
            if (!newCatData) { newCatData = { category: newCategory, subcategories: [] }; bookmarks.push(newCatData); }
            let newSubData = newCatData.subcategories.find(s => s.name === newSubcategory);
            if (!newSubData && newSubcategory) { newSubData = { name: newSubcategory, bookmarks: [] }; newCatData.subcategories.push(newSubData); }
            if (newSubData) {
                newSubData.bookmarks.push({ name: newName, url: newUrl, desc: newDesc });
            } else {
                if (!newCatData.bookmarks) newCatData.bookmarks = [];
                newCatData.bookmarks.push({ name: newName, url: newUrl, desc: newDesc });
            }
        }
    } else {
        const catData = bookmarks.find(c => c.category === currentEditData.oldCategory);
        if (!catData || !catData.bookmarks) return;
        const bookmark = catData.bookmarks[currentEditData.index];
        if (!bookmark) return;

        bookmark.name = newName;
        bookmark.url = newUrl;
        bookmark.desc = newDesc;

        if (newCategory !== currentEditData.oldCategory) {
            catData.bookmarks.splice(currentEditData.index, 1);
            let newCatData = bookmarks.find(c => c.category === newCategory);
            if (!newCatData) { newCatData = { category: newCategory, bookmarks: [] }; bookmarks.push(newCatData); }
            if (!newCatData.bookmarks) newCatData.bookmarks = [];
            newCatData.bookmarks.push({ name: newName, url: newUrl, desc: newDesc });
        }
    }

    try {
        await saveBookmarksData();
        await loadBookmarks();
        document.getElementById('editBookmarkModal').classList.remove('active');
        showToast('✅ 书签已更新');
        currentEditData = null;
    } catch (err) { showToast('保存失败', true); }
};

window.editBookmark = (category, subcategory, index) => {
    const bookmarks = bookmarksData.bookmarks || [];
    const catData = bookmarks.find(c => c.category === category);
    if (!catData) return;
    const subData = catData.subcategories.find(s => s.name === subcategory);
    if (!subData) return;
    const bookmark = subData.bookmarks[index];
    if (!bookmark) return;

    showEditBookmarkModal({
        oldCategory: category, oldSubcategory: subcategory, index: index,
        name: bookmark.name, url: bookmark.url, desc: bookmark.desc || '',
        category: category, subcategory: subcategory
    }, true);
};

window.editBookmarkDirect = (category, index) => {
    const bookmarks = bookmarksData.bookmarks || [];
    const catData = bookmarks.find(c => c.category === category);
    if (!catData || !catData.bookmarks) return;
    const bookmark = catData.bookmarks[index];
    if (!bookmark) return;

    showEditBookmarkModal({
        oldCategory: category, index: index,
        name: bookmark.name, url: bookmark.url, desc: bookmark.desc || '',
        category: category, subcategory: ''
    }, false);
};

// ========== 留言管理 ==========
async function loadMessages() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/messages`, { headers: { 'Authorization': `Bearer ${adminPass}` } });
        if (res.status === 401) { showToast('登录已过期', true); logout(); return; }
        const result = await res.json();
        if (result.success) renderMessages(result.messages);
    } catch (err) { showToast('加载失败', true); }
}

function renderMessages(messages) {
    const container = document.getElementById('messagesList');
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="empty">暂无留言</div>';
        return;
    }
    let html = '';
    messages.forEach(msg => {
        html += `
            <div class="message-item">
                <div class="message-header">
                    <span class="message-nickname">${escapeHtml(msg.nickname)}</span>
                    <span class="message-time">${new Date(msg.time).toLocaleString()}</span>
                    <span class="status-badge status-${msg.status === 'pending' ? 'pending' : 'approved'}">${msg.status === 'pending' ? '待审核' : '已通过'}</span>
                </div>
                <div class="message-content">${escapeHtml(msg.content)}</div>
                ${msg.recommendUrl ? `<div style="margin-top:0.3rem;">🔗 <a href="${escapeHtml(msg.recommendUrl)}" target="_blank" style="color:#9b59b6;">${escapeHtml(msg.recommendUrl)}</a></div>` : ''}
                <div class="message-actions">
                    ${msg.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="approveMessage('${msg.id}')">✅ 通过</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteMessage('${msg.id}')">🗑️ 删除</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.approveMessage = async (id) => {
    showConfirm('审核留言', '确定要通过这条留言吗？', async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/messages/${id}`, { method: 'PUT', headers, body: JSON.stringify({ action: 'approve' }) });
            if (res.ok) { showToast('✅ 留言已通过'); loadMessages(); }
            else { showToast('操作失败', true); }
        } catch (err) { showToast('操作失败', true); }
    });
};

window.deleteMessage = async (id) => {
    showConfirm('删除留言', '确定要删除这条留言吗？', async () => {
        try {
            const res = await fetch(`${API_BASE}/api/admin/messages/${id}`, { method: 'PUT', headers, body: JSON.stringify({ action: 'delete' }) });
            if (res.ok) { showToast('🗑️ 留言已删除'); loadMessages(); }
            else { showToast('操作失败', true); }
        } catch (err) { showToast('操作失败', true); }
    });
};

// ========== 快捷链接管理 ==========
let quickLinks = [];

async function loadQuickLinks() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/quicklinks`, { headers: { 'Authorization': `Bearer ${adminPass}` } });
        if (res.status === 401) { showToast('登录已过期', true); logout(); return; }
        const result = await res.json();
        if (result.success) {
            quickLinks = result.quickLinks || [];
            renderQuickLinks();
        }
    } catch (err) { showToast('加载失败', true); }
}

function renderQuickLinks() {
    const container = document.getElementById('quickLinksList');
    if (!quickLinks || quickLinks.length === 0) {
        container.innerHTML = '<div class="empty">暂无快捷链接，请添加</div>';
        return;
    }
    let html = '<table class="bookmark-table"><thead><tr><th>链接名称</th><th>链接地址</th><th>操作</th></tr></thead><tbody>';
    quickLinks.forEach((link, i) => {
        html += `
            <tr>
                <td><strong>${escapeHtml(link.name || '')}</strong></td>
                <td><a href="${escapeHtml(link.url || '#')}" target="_blank" style="color:#9b59b6;">${escapeHtml(link.url || '')}</a></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="showEditQuickLinkModal(${i})">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteQuickLink(${i})">删除</button>
                </td>
            </tr>
        `;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

window.deleteQuickLink = function(index) {
    showConfirm('删除链接', '确定要删除这个快捷链接吗？', async () => {
        quickLinks.splice(index, 1);
        await saveQuickLinks();
        renderQuickLinks();
    });
};

async function saveQuickLinks() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/quicklinks`, { method: 'PUT', headers, body: JSON.stringify({ quickLinks }) });
        if (res.ok) { showToast('💾 快捷链接已保存'); await loadQuickLinks(); }
        else { showToast('保存失败', true); }
    } catch (err) { showToast('保存失败', true); }
}

document.getElementById('addQuickLinkBtn').onclick = async () => {
    const name = document.getElementById('newQuickLinkName').value.trim();
    let url = document.getElementById('newQuickLinkUrl').value.trim();
    if (!name || !url) { showToast('请填写完整', true); return; }
    if (!url.startsWith('http') && !url.startsWith('mailto:')) url = 'https://' + url;
    quickLinks.push({ name, url, icon: "🔗" });
    await saveQuickLinks();
    document.getElementById('newQuickLinkName').value = '';
    document.getElementById('newQuickLinkUrl').value = '';
};

// 快捷链接编辑弹窗
let currentQuickLinkIndex = null;

window.showEditQuickLinkModal = (index) => {
    const link = quickLinks[index];
    if (!link) return;
    currentQuickLinkIndex = index;
    document.getElementById('editQuickLinkName').value = link.name || '';
    document.getElementById('editQuickLinkUrl').value = link.url || '';
    document.getElementById('editQuickLinkModal').classList.add('active');
};

document.getElementById('closeQuickEditModalBtn').onclick = () => {
    document.getElementById('editQuickLinkModal').classList.remove('active');
    currentQuickLinkIndex = null;
};

document.getElementById('saveQuickEditModalBtn').onclick = async () => {
    const newName = document.getElementById('editQuickLinkName').value.trim();
    let newUrl = document.getElementById('editQuickLinkUrl').value.trim();
    if (!newName || !newUrl) { showToast('名称和网址不能为空', true); return; }
    if (!newUrl.startsWith('http') && !newUrl.startsWith('mailto:')) newUrl = 'https://' + newUrl;
    quickLinks[currentQuickLinkIndex] = { name: newName, url: newUrl, icon: "🔗" };
    await saveQuickLinks();
    document.getElementById('editQuickLinkModal').classList.remove('active');
    showToast('✅ 快捷链接已更新');
    currentQuickLinkIndex = null;
};

// ========== 网站设置 ==========
async function loadSiteInfo() {
    try {
        const res = await fetch(`${API_BASE}/api/siteinfo`);
        const result = await res.json();
        if (result.success && result.siteInfo) {
            const info = result.siteInfo;
            document.getElementById('siteName').value = info.name || '';
            document.getElementById('siteDesc').value = info.description || '';
            document.getElementById('copyrightYear').value = info.copyrightYear || '2026';
            document.getElementById('copyrightOwner').value = info.copyrightOwner || 'ARLEY';
            document.getElementById('copyrightUrl').value = info.copyrightUrl || 'https://arley.cn';
            document.getElementById('poweredName').value = info.poweredName || 'ArleyBKS';
            document.getElementById('poweredUrl').value = info.poweredUrl || 'https://bm.arley.cn/';
            document.getElementById('icpNumber').value = info.icpNumber || '20222555';
        }
    } catch (err) { console.error(err); }
}

document.getElementById('saveSiteInfo').onclick = async () => {
    const name = document.getElementById('siteName').value.trim();
    const description = document.getElementById('siteDesc').value.trim();
    if (!name) { showToast('请填写网站名称', true); return; }
    try {
        const res = await fetch(`${API_BASE}/api/admin/siteinfo`, { method: 'PUT', headers, body: JSON.stringify({ name, description }) });
        if (res.ok) { showToast('💾 网站信息已保存'); }
        else { showToast('保存失败', true); }
    } catch (err) { showToast('保存失败', true); }
};

document.getElementById('saveCopyrightBtn').onclick = async () => {
    const copyrightYear = document.getElementById('copyrightYear').value.trim();
    const copyrightOwner = document.getElementById('copyrightOwner').value.trim();
    const copyrightUrl = document.getElementById('copyrightUrl').value.trim();
    const poweredName = document.getElementById('poweredName').value.trim();
    const poweredUrl = document.getElementById('poweredUrl').value.trim();
    const icpNumber = document.getElementById('icpNumber').value.trim();

    try {
        const res = await fetch(`${API_BASE}/api/admin/siteinfo`, { method: 'PUT', headers, body: JSON.stringify({ copyrightYear, copyrightOwner, copyrightUrl, poweredName, poweredUrl, icpNumber }) });
        if (res.ok) { showToast('💾 版权信息已保存'); }
        else { showToast('保存失败', true); }
    } catch (err) { showToast('保存失败', true); }
};

function logout() {
    localStorage.removeItem("adminPass");
    adminPass = null;
    showToast('已退出登录');
    showLoginModal();
}

document.getElementById('logoutBtn').onclick = () => {
    showConfirm('退出登录', '确定要退出管理后台吗？', logout);
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// 监听大分类变化，更新小分类下拉列表
const newCategorySelect = document.getElementById('newCategory');
if (newCategorySelect) {
    newCategorySelect.addEventListener('change', function() {
        updateNewSubcategoryDatalist(this.value);
    });
}

if (adminPass) { loadAllData(); }