// API 配置 - 请修改为你的 Worker 域名
const WORKER_URL = 'https://bookmarksdate.arley.workers.dev'; // 修改这里！
const API_BASE = WORKER_URL + '/api';

async function apiRequest(url, method, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${API_BASE}${url}`, options);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
    }
    return response.json();
}

async function fetchLinks() {
    return apiRequest('/links', 'GET');
}

async function createLink(linkData) {
    return apiRequest('/links', 'POST', linkData);
}

async function updateLink(id, linkData) {
    return apiRequest(`/links/${id}`, 'PUT', linkData);
}

async function deleteLink(id) {
    return apiRequest(`/links/${id}`, 'DELETE');
}