let allLinks = [];

function groupByCategory(links) {
    const grouped = {};
    links.forEach(link => {
        const category = link.category || '未分类';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(link);
    });
    return grouped;
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

function renderLinks(links) {
    const grouped = groupByCategory(links);
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    container.innerHTML = '';
    
    for (const [category, categoryLinks] of Object.entries(grouped)) {
        const catSection = document.createElement('div');
        catSection.className = 'mb-5';
        catSection.innerHTML = `
            <div class="category-header">
                <h2><i class="fas fa-folder-open"></i> ${escapeHtml(category)}</h2>
            </div>
            <div class="row g-4" id="cat-${category.replace(/\s/g, '')}"></div>
        `;
        container.appendChild(catSection);
        
        const row = catSection.querySelector('.row');
        categoryLinks.forEach(link => {
            const iconClass = link.icon || 'fas fa-link';
            const col = document.createElement('div');
            col.className = 'col-md-4 col-lg-3 col-sm-6';
            col.innerHTML = `
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <i class="${iconClass} fa-2x me-2" style="color: #ffb7b2;"></i>
                            <h5 class="card-title mb-0">${escapeHtml(link.title)}</h5>
                        </div>
                        <p class="card-text">${escapeHtml(link.description || '')}</p>
                        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="stretched-link"></a>
                    </div>
                </div>
            `;
            row.appendChild(col);
        });
    }
}

async function loadData() {
    try {
        allLinks = await fetchLinks();
        renderLinks(allLinks);
    } catch (err) {
        console.error(err);
        document.getElementById('categoriesContainer').innerHTML = '<div class="alert alert-danger">加载失败，请检查网络或Worker配置</div>';
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.innerHTML = savedTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        btn.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            btn.innerHTML = newTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadData();
});