let currentEditId = null;
let adminPassword = localStorage.getItem('admin_password') || '';
const WORKER_URL = 'https://bookmarksdate.arley.workers.dev'; // 修改这里！

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
        alert('密码已过期或错误，请重新登录');
        const loggedIn = await verifyAndLogin();
        if (loggedIn) return authApiRequest(url, method, body);
        throw new Error('未授权');
    }
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
    }
    return response.json();
}

// 验证密码并登录
async function verifyAndLogin() {
    if (adminPassword) {
        try {
            const res = await fetch(`${WORKER_URL}/api/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword })
            });
            if (res.ok) return true;
            else adminPassword = '';
        } catch (e) {
            adminPassword = '';
        }
    }
    
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
            alert('密码错误，请重试');
            return verifyAndLogin();
        }
    } catch (err) {
        alert('网络错误，请重试');
        return verifyAndLogin();
    }
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
    const links = await authApiRequest('/api/links', 'GET');
    const tbody = document.getElementById('linksTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    links.forEach(link => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(link.id)}</td>
            <td>${escapeHtml(link.title)}</td>
            <td><a href="${escapeHtml(link.url)}" target="_blank">${link.url.substring(0, 40)}</a></td>
            <td>${escapeHtml(link.category || '-')}</td>
            <td>
                <button class="btn btn-sm btn-warning edit-btn" data-id="${link.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${link.id}"><i class="fas fa-trash"></i></button>
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
            if (confirm('确定删除吗？')) {
                await authApiRequest(`/api/links/${id}`, 'DELETE');
                await loadLinksTable();
            }
        });
    });
}

async function editBookmark(id) {
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
        title: document.getElementById('title').value,
        url: document.getElementById('url').value,
        category: document.getElementById('category').value,
        icon: document.getElementById('icon').value,
        description: document.getElementById('description').value,
    };
    if (!linkData.title || !linkData.url) {
        alert('标题和URL不能为空');
        return;
    }
    if (id) {
        await authApiRequest(`/api/links/${id}`, 'PUT', linkData);
    } else {
        await authApiRequest('/api/links', 'POST', linkData);
    }
    bootstrap.Modal.getInstance(document.getElementById('bookmarkModal')).hide();
    resetForm();
    await loadLinksTable();
});

document.getElementById('addBtn')?.addEventListener('click', () => {
    resetForm();
});

document.addEventListener('DOMContentLoaded', async () => {
    const isLoggedIn = await verifyAndLogin();
    if (isLoggedIn) {
        await loadLinksTable();
    } else {
        window.location.href = '/';
    }
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
});