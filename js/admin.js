let currentEditId = null;
let adminPassword = localStorage.getItem('admin_password') || '';

// ========== 重要：修改为你的 Worker 域名 ==========
const WORKER_URL = 'https://bookmarksdate.arley.workers.dev';  // 改成你的！

// 显示加载状态
function showLoading() {
    const tbody = document.getElementById('linksTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">正在验证...</td></tr>';
    }
}

// 显示未授权提示
function showUnauthorized(message) {
    const container = document.querySelector('.container.my-4');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger text-center p-5">
                <i class="fas fa-lock fa-3x mb-3"></i>
                <h4>访问被拒绝</h4>
                <p>${message || '您没有权限访问管理后台'}</p>
                <a href="/" class="btn btn-primary mt-3">返回首页</a>
            </div>
        `;
        const table = document.querySelector('.table-responsive');
        const addBtn = document.getElementById('addBtn');
        if (table) table.style.display = 'none';
        if (addBtn) addBtn.style.display = 'none';
    }
}

// 带密码的 API 请求封装
async function authApiRequest(url, method, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminPassword}`
        },
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${WORKER_URL}${url}`, options);
    if (response.status === 401) {
        localStorage.removeItem('admin_password');
        adminPassword = '';
        throw new Error('UNAUTHORIZED');
    }
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
    }
    return response.json();
}

// 验证密码并登录
async function verifyAndLogin() {
    // 先尝试用已存储的密码验证
    if (adminPassword) {
        try {
            const res = await fetch(`${WORKER_URL}/api/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });
            if (res.ok) {
                return true;
            } else {
                adminPassword = '';
                localStorage.removeItem('admin_password');
            }
        } catch (e) {
            adminPassword = '';
            localStorage.removeItem('admin_password');
        }
    }
    
    // 没有有效密码，弹出输入框
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        let pwd = prompt('请输入管理密码：');
        if (pwd === null) {
            window.location.href = '/';
            return false;
        }
        
        try {
            const res = await fetch(`${WORKER_URL}/api/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd })
            });
            
            if (res.ok) {
                adminPassword = pwd;
                localStorage.setItem('admin_password', pwd);
                return true;
            } else {
                attempts++;
                const remaining = maxAttempts - attempts;
                if (remaining > 0) {
                    alert(`密码错误！还剩 ${remaining} 次尝试机会`);
                } else {
                    alert('密码错误次数过多！');
                }
            }
        } catch (err) {
            attempts++;
            alert(`网络错误，请重试 (${attempts}/${maxAttempts})`);
        }
    }
    
    alert('验证失败，返回首页');
    window.location.href = '/';
    return false;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function loadLinksTable() {
    try {
        const links = await authApiRequest('/api/links', 'GET');
        const tbody = document.getElementById('linksTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (links.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">暂无书签，点击右上角新增</td></tr>';
            return;
        }
        
        links.forEach(link => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(link.id)}</td>
                <td>${escapeHtml(link.title)}</td>
                <td><a href="${escapeHtml(link.url)}" target="_blank" style="max-width: 200px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(link.url.substring(0, 40))}</a></td>
                <td>${escapeHtml(link.category || '-')}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-btn" data-id="${link.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${link.id}" style="margin-left: 5px;"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                await editBookmark(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('确定删除这个书签吗？')) {
                    try {
                        await authApiRequest(`/api/links/${id}`, 'DELETE');
                        await loadLinksTable();
                    } catch (err) {
                        if (err.message === 'UNAUTHORIZED') {
                            const relogin = await verifyAndLogin();
                            if (relogin) await loadLinksTable();
                        } else {
                            alert('删除失败：' + err.message);
                        }
                    }
                }
            });
        });
    } catch (err) {
        if (err.message === 'UNAUTHORIZED') {
            const relogin = await verifyAndLogin();
            if (relogin) {
                await loadLinksTable();
            } else {
                showUnauthorized('登录已过期，请重新登录');
            }
        } else {
            console.error(err);
            showUnauthorized('加载失败：' + err.message);
        }
    }
}

async function editBookmark(id) {
    try {
        const links = await authApiRequest('/api/links', 'GET');
        const link = links.find(l => l.id === id);
        if (!link) return;
        
        document.getElementById('editId').value = link.id;
        document.getElementById('title').value = link.title;
        document.getElementById('url').value = link.url;
        document.getElementById('category').value = link.category || '';
        document.getElementById('icon').value = link.icon || '';
        document.getElementById('description').value = link.description || '';
        currentEditId = id;
        
        const modal = new bootstrap.Modal(document.getElementById('bookmarkModal'));
        modal.show();
    } catch (err) {
        if (err.message === 'UNAUTHORIZED') {
            const relogin = await verifyAndLogin();
            if (relogin) await editBookmark(id);
        } else {
            alert('加载失败：' + err.message);
        }
    }
}

function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('title').value = '';
    document.getElementById('url').value = '';
    document.getElementById('category').value = '';
    document.getElementById('icon').value = '';
    document.getElementById('description').value = '';
    currentEditId = null;
}

document.getElementById('saveBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editId').value;
    const linkData = {
        title: document.getElementById('title').value.trim(),
        url: document.getElementById('url').value.trim(),
        category: document.getElementById('category').value.trim(),
        icon: document.getElementById('icon').value.trim(),
        description: document.getElementById('description').value.trim(),
    };
    
    if (!linkData.title || !linkData.url) {
        alert('标题和URL不能为空');
        return;
    }
    
    try {
        if (id) {
            await authApiRequest(`/api/links/${id}`, 'PUT', linkData);
        } else {
            await authApiRequest('/api/links', 'POST', linkData);
        }
        bootstrap.Modal.getInstance(document.getElementById('bookmarkModal')).hide();
        resetForm();
        await loadLinksTable();
    } catch (err) {
        if (err.message === 'UNAUTHORIZED') {
            const relogin = await verifyAndLogin();
            if (relogin) {
                if (id) {
                    await authApiRequest(`/api/links/${id}`, 'PUT', linkData);
                } else {
                    await authApiRequest('/api/links', 'POST', linkData);
                }
                bootstrap.Modal.getInstance(document.getElementById('bookmarkModal')).hide();
                resetForm();
                await loadLinksTable();
            }
        } else {
            alert('保存失败：' + err.message);
        }
    }
});

document.getElementById('addBtn')?.addEventListener('click', () => {
    resetForm();
});

document.addEventListener('DOMContentLoaded', async () => {
    showLoading();
    const isLoggedIn = await verifyAndLogin();
    if (isLoggedIn) {
        await loadLinksTable();
    } else {
        showUnauthorized('需要密码才能访问管理后台');
    }
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
});