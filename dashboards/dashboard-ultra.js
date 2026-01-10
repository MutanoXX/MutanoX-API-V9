// MutanoX Dashboard Ultra Premium V5.0 - Extremamente Melhorado
const API_BASE = '';
let adminKey = localStorage.getItem('mutanox_admin_key') || '';
let refreshInterval = null;
let mainChart = null;
let pieChart = null;
let barChart = null;

// Apenas os 15 endpoints ativos especificados pelo usuário
const activeEndpoints = {
    'cpf': { name: 'Consultar CPF', icon: 'fa-id-card', color: '#7c3aed', desc: 'Consulta completa de dados pessoais' },
    'nome': { name: 'Consultar Nome', icon: 'fa-user', color: '#a78bfa', desc: 'Busca por nome completo' },
    'numero': { name: 'Consultar Telefone', icon: 'fa-phone', color: '#f472b6', desc: 'Consulta de dados telefônicos' },
    'bypass': { name: 'Bypass City', icon: 'fa-unlock-alt', color: '#10b981', desc: 'Bypass de proteção' },
    'bypasscf': { name: 'Bypass Cloudflare', icon: 'fa-shield-virus', color: '#ef4444', desc: 'Bypass de proteção CF' },
    'infoff': { name: 'Free Fire Info', icon: 'fa-gamepad', color: '#f59e0b', desc: 'Informações de conta Free Fire' },
    'downloader': { name: 'AIO Downloader', icon: 'fa-download', color: '#06b6d4', desc: 'Download de mídias' },
    'github': { name: 'GitHub Search', icon: 'fab fa-github', color: '#24292f', desc: 'Busca de usuários' },
    'gimage': { name: 'Google Images', icon: 'fab fa-google', color: '#ea4335', desc: 'Busca de imagens' },
    'pinterest': { name: 'Pinterest Search', icon: 'fab fa-pinterest', color: '#bd081c', desc: 'Busca de pins' },
    'roblox': { name: 'Roblox Stalk', icon: 'fas fa-cube', color: '#ff3d00', desc: 'Info de usuários' },
    'tiktok': { name: 'TikTok Search', icon: 'fab fa-tiktok', color: '#00f2ea', desc: 'Busca de perfis' },
    'yt': { name: 'YouTube Search', icon: 'fab fa-youtube', color: '#ff0000', desc: 'Busca de vídeos' },
    'video': { name: 'Text to Video', icon: 'fas fa-video', color: '#8b5cf6', desc: 'Geração de vídeos' },
    'nsfw': { name: 'NSFW Generator', icon: 'fas fa-image', color: '#f97316', desc: 'Geração de imagens' }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (adminKey) {
        showDashboard();
        initCharts();
        startAutoRefresh();
    }
});

// Login
window.login = async function() {
    var username = document.getElementById('admin-username').value.trim();
    var password = document.getElementById('admin-password').value.trim();

    if (!username || !password) {
        showToast('error', 'Preencha todos os campos');
        return;
    }

    try {
        var response = await fetch('/api/admin/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });

        var data = await response.json();

        if (response.ok && data.success) {
            adminKey = data.adminKey;
            localStorage.setItem('mutanox_admin_key', adminKey);
            showToast('success', 'Autenticado com sucesso');
            showDashboard();
            initCharts();
            startAutoRefresh();
        } else {
            var errorEl = document.getElementById('login-error');
            errorEl.classList.remove('hidden');
            setTimeout(function() { errorEl.classList.add('hidden'); }, 3000);
            showToast('error', data.message || 'Credenciais inválidas');
        }
    } catch (error) {
        showToast('error', 'Erro de conexão');
    }
};

window.logout = function() {
    localStorage.removeItem('mutanox_admin_key');
    location.reload();
};

// Show Dashboard
function showDashboard() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
}

// Section Navigation
window.showSection = function(sectionId) {
    document.querySelectorAll('.content-section').forEach(function(section) {
        section.classList.remove('active');
    });

    var section = document.getElementById('section-' + sectionId);
    if (section) {
        section.classList.add('active');
    }

    document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });

    var clickedBtn = event.target;
    while (clickedBtn && !clickedBtn.classList.contains('nav-btn')) {
        clickedBtn = clickedBtn.parentElement;
    }
    if (clickedBtn && clickedBtn.classList.contains('nav-btn')) {
        clickedBtn.classList.add('active');
    }

    if (sectionId === 'keys') loadKeys();
    if (sectionId === 'endpoints') loadEndpoints();
    if (sectionId === 'logs') loadLogs();
    if (sectionId === 'protection') loadProtectionList();
};

// Initialize Charts
function initCharts() {
    initMainChart();
    initPieChart();
    initBarChart();
}

function initMainChart() {
    var ctx = document.getElementById('mainChart');
    if (!ctx) return;

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Requests',
                data: [],
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: '#7c3aed',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(124, 58, 237, 0.1)' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

function initPieChart() {
    var ctx = document.getElementById('pieChart');
    if (!ctx) return;

    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#7c3aed', '#a78bfa', '#f472b6', '#10b981', '#ec4899'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#64748b', padding: 24, font: { size: 14 } } }
            },
            cutout: '60%'
        }
    });
}

function initBarChart() {
    var ctx = document.getElementById('barChart');
    if (!ctx) return;

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Acessos',
                data: [],
                backgroundColor: ['rgba(124, 58, 237, 0.8)', 'rgba(167, 139, 250, 0.8)', 'rgba(244, 114, 182, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(236, 72, 153, 0.8)'],
                borderRadius: 12,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(124, 58, 237, 0.1)' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            }
        }
    });
}

// Auto Refresh
function startAutoRefresh() {
    refreshData();
    refreshInterval = setInterval(refreshData, 3000);
}

async function refreshData() {
    try {
        var response = await fetch('/api/admin/stats-readonly?apikey=' + adminKey);
        var data = await response.json();

        if (data.success) {
            updateDashboard(data);
            updateCharts(data);
        }
    } catch (e) {
        console.error('Error refreshing data:', e);
    }
}

function updateDashboard(data) {
    document.getElementById('stat-total').textContent = data.totalRequests.toLocaleString();
    document.getElementById('stat-keys').textContent = Object.keys(data.keys).length;

    // Atualizar contador de endpoints (apenas ativos)
    var totalActiveEndpoints = Object.keys(activeEndpoints).length;
    var endpointEl = document.getElementById('stat-endpoints');
    if (endpointEl) {
        endpointEl.textContent = totalActiveEndpoints;
    }
    var endpointElPage = document.getElementById('stat-endpoints-page');
    if (endpointElPage) {
        endpointElPage.textContent = totalActiveEndpoints;
    }

    // Melhor cálculo do uptime com horas, minutos e segundos
    var uptimeMs = data.uptime;
    var uptimeSeconds = Math.floor(uptimeMs / 1000);
    var hours = Math.floor(uptimeSeconds / 3600);
    var minutes = Math.floor((uptimeSeconds % 3600) / 60);
    var seconds = Math.floor(uptimeSeconds % 60);

    // Formato: "Xh Ym Zs"
    document.getElementById('stat-uptime').textContent = hours + 'h ' + minutes + 'm ' + seconds + 's';
}

function updateCharts(data) {
    // Atualizar main chart
    if (mainChart) {
        var now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        mainChart.data.labels.push(now);
        mainChart.data.datasets[0].data.push(data.totalRequests);

        if (mainChart.data.labels.length > 20) {
            mainChart.data.labels.shift();
            mainChart.data.datasets[0].data.shift();
        }

        mainChart.update('none');
    }

    // Atualizar pie chart
    if (pieChart && data.endpointHits) {
        // Filtrar apenas endpoints ativos
        var activeEndpointNames = Object.keys(activeEndpoints);
        var activeEndpointValues = activeEndpointNames.filter(function(key) {
            return data.endpointHits[key];
        }).map(function(key) {
            return data.endpointHits[key];
        });

        pieChart.data.labels = activeEndpointNames.filter(function(key) {
            return data.endpointHits[key];
        }).map(function(key) { return activeEndpoints[key].name; });
        pieChart.data.datasets[0].data = activeEndpointValues;
        pieChart.update('none');
    }

    // Atualizar bar chart
    if (barChart && data.endpointHits) {
        // Filtrar apenas endpoints ativos e ordenar
        var sortedEndpoints = Object.entries(data.endpointHits)
            .filter(function(entry) { return activeEndpoints[entry[0]]; }) // Apenas ativos
            .sort(function(a, b) { return b[1] - a[1]; })
            .slice(0, 5);

        barChart.data.labels = sortedEndpoints.map(function(entry) { return activeEndpoints[entry[0]].name; });
        barChart.data.datasets[0].data = sortedEndpoints.map(function(entry) { return entry[1]; });
        barChart.update('none');
    }
}

// Keys Management
window.openCreateKeyModal = async function() {
    var owner = prompt('Nome do dono da chave:');
    var role = prompt('Função (user/admin):', 'user');

    if (owner) {
        try {
            var response = await fetch('/api/admin/keys?owner=' + encodeURIComponent(owner) + '&role=' + role + '&apikey=' + adminKey, { method: 'POST' });
            var data = await response.json();

            if (data.success) {
                showToast('success', 'Chave criada com sucesso');
                loadKeys();
            } else {
                showToast('error', data.error || 'Erro ao criar chave');
            }
        } catch (e) {
            showToast('error', 'Erro de conexão');
        }
    }
};

window.deleteKey = async function(key) {
    if (!confirm('Tem certeza que deseja excluir esta chave?')) return;

    try {
        var response = await fetch('/api/admin/keys?target=' + key + '&apikey=' + adminKey, { method: 'DELETE' });
        var data = await response.json();

        if (data.success) {
            showToast('success', 'Chave excluída com sucesso');
            loadKeys();
        } else {
            showToast('error', data.error || 'Erro ao excluir chave');
        }
    } catch (e) {
        showToast('error', 'Erro de conexão');
    }
};

async function loadKeys() {
    try {
        var response = await fetch('/api/admin/stats-readonly?apikey=' + adminKey);
        var data = await response.json();

        if (data.success) {
            var tbody = document.getElementById('keys-table-body');
            tbody.innerHTML = Object.entries(data.keys).map(function(entry) {
                var key = entry[0];
                var info = entry[1];
                var badgeClass = info.role === 'admin' ? 'badge-admin' : 'badge-user';
                var statusClass = info.active ? 'badge-active' : 'badge-inactive';
                var statusText = info.active ? 'Ativa' : 'Inativa';

                return '<tr>' +
                    '<td><code style="background: rgba(124, 58, 237, 0.15); padding: 8px 16px; border-radius: 10px; color: #7c3aed; font-family: Inter, sans-serif; font-weight: 600;">' + key.substring(0, 20) + '...</code></td>' +
                    '<td><strong>' + info.owner + '</strong></td>' +
                    '<td><span class="badge ' + badgeClass + '">' + info.role + '</span></td>' +
                    '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
                    '<td>' + (info.usageCount || 0) + '</td>' +
                    '<td>' +
                        '<button onclick="deleteKey(\'' + key + '\')" class="btn btn-danger btn-sm">' +
                            '<i class="fas fa-trash"></i>' +
                        '</button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        }
    } catch (e) {
        console.error('Error loading keys:', e);
    }
}

// Endpoints Management - APENAS 15 ATIVOS
async function loadEndpoints() {
    try {
        var response = await fetch('/api/admin/endpoints?apikey=' + adminKey);
        var data = await response.json();

        if (data.success && data.endpoints) {
            var grid = document.getElementById('endpoints-grid');

            // Limpar o grid antes de preencher
            if (grid) {
                grid.innerHTML = '';

                // Apenas os 15 endpoints ativos
                Object.entries(activeEndpoints).forEach(function(entry) {
                    var key = entry[0];
                    var endpointInfo = entry[1];

                    // Encontrar hits do sistema
                    var endpointData = data.endpoints.find(function(e) { return e.id === key; });
                    var hits = endpointData ? endpointData.hits : 0;

                    var card = document.createElement('div');
                    card.className = 'card endpoint-card';
                    card.innerHTML = '' +
                        '<div class="endpoint-top">' +
                            '<div class="endpoint-icon">' +
                                '<i class="fas ' + endpointInfo.icon + '"></i>' +
                            '</div>' +
                            '<div class="endpoint-name">' + endpointInfo.name + '</div>' +
                        '</div>' +
                        '<div class="endpoint-stats">' +
                            '<div class="endpoint-hits">' +
                                '<div class="value">' + hits + '</div>' +
                                '<div class="label">Acessos</div>' +
                            '</div>' +
                            '<div class="endpoint-status">' +
                                '<div class="status-dot"></div>' +
                                '<span class="status-label">Ativo</span>' +
                            '</div>' +
                        '</div>' +
                        '';
                    grid.appendChild(card);
                });
            }
        }
    } catch (e) {
        console.error('Error loading endpoints:', e);
        showToast('error', 'Erro ao carregar endpoints');
    }
}

// Logs
async function loadLogs() {
    try {
        var response = await fetch('/api/admin/stats-readonly?apikey=' + adminKey);
        var data = await response.json();

        if (data.success) {
            var terminal = document.getElementById('terminal');
            terminal.innerHTML = (data.logs || []).map(function(log) {
                return '<div class="log-entry">' +
                    '<span class="log-time">[' + new Date().toLocaleTimeString('pt-BR') + ']</span>' +
                    '<span class="log-type-' + log.type.toLowerCase() + '">' + log.type.toUpperCase() + '</span>' +
                    '<span class="log-message">' + log.message + '</span>' +
                    '</div>';
            }).join('');
        }
    } catch (e) {
        console.error('Error loading logs:', e);
    }
}

window.refreshLogs = function() {
    loadLogs();
    showToast('success', 'Logs atualizados');
};

// Protection
window.addProtection = async function() {
    var nome = document.getElementById('prot-nome').value.trim();
    var cpf = document.getElementById('prot-cpf').value.trim();
    var numero = document.getElementById('prot-numero').value.trim();
    var duration = document.getElementById('prot-duration').value.trim();
    var permanent = document.getElementById('prot-permanent').checked;

    if (!nome && !cpf && !numero) {
        showToast('error', 'Preencha pelo menos um campo');
        return;
    }

    // Se duração for 0, assume permanente
    if (duration === '0' || duration === 0) {
        permanent = true;
        duration = '';
    }

    try {
        var url = '/api/admin/protection/add?apikey=' + adminKey;
        if (nome) url += '&nome=' + encodeURIComponent(nome);
        if (cpf) url += '&cpf=' + cpf;
        if (numero) url += '&numero=' + numero;
        if (duration && !permanent) url += '&duration=' + duration;
        if (permanent) url += '&permanent=true';

        var response = await fetch(url, { method: 'POST' });
        var data = await response.json();

        if (data.success) {
            var message = permanent ? 'Proteção PERMANENTE adicionada!' : 'Proteção temporária adicionada!';
            showToast('success', message);
            clearProtectionForm();
            loadProtectionList();
        } else {
            showToast('error', data.error || 'Erro ao adicionar proteção');
        }
    } catch (e) {
        console.error('Erro ao adicionar proteção:', e);
        showToast('error', 'Erro de conexão');
    }
};

window.clearProtectionForm = function() {
    document.getElementById('prot-nome').value = '';
    document.getElementById('prot-cpf').value = '';
    document.getElementById('prot-numero').value = '';
    document.getElementById('prot-duration').value = '';
    document.getElementById('prot-permanent').checked = false;
};

window.removeProtection = async function(id) {
    if (!confirm('Remover esta proteção? Esta ação não pode ser desfeita!')) return;

    try {
        var response = await fetch('/api/admin/protection/remove?apikey=' + adminKey + '&id=' + id, { method: 'POST' });
        var data = await response.json();

        if (data.success) {
            showToast('success', 'Proteção removida com sucesso');
            loadProtectionList();
        } else {
            showToast('error', data.error || 'Erro ao remover proteção');
        }
    } catch (e) {
        console.error('Erro ao remover proteção:', e);
        showToast('error', 'Erro de conexão');
    }
};

async function loadProtectionList() {
    try {
        var response = await fetch('/api/admin/protection/list?apikey=' + adminKey);
        var data = await response.json();

        if (data.success) {
            var list = document.getElementById('protection-list-items');
            list.innerHTML = (data.list || []).map(function(item) {
                var isPermanent = item.permanent;
                var permanentBadge = isPermanent ?
                    '<span class="badge badge-permanent">PERMANENTE</span>' : '';

                var expiresAtDisplay = isPermanent ?
                    'Proteção Eterna' :
                    (item.expiresAt ? 'Expira em ' + new Date(item.expiresAt).toLocaleString('pt-BR') : 'N/A');

                return '<div class="protection-item">' +
                    '<div class="protection-info">' +
                        '<div class="protection-name">' + (item.nome || 'Sem Nome') + ' ' + permanentBadge + '</div>' +
                        '<div class="protection-details">' +
                            (item.cpf ? 'CPF: ' + item.cpf : '') +
                            (item.numero ? ' | Telefone: ' + item.numero : '') +
                        '</div>' +
                        '<div class="protection-status">' + expiresAtDisplay + '</div>' +
                    '</div>' +
                    '<div class="protection-actions">' +
                        '<button onclick="removeProtection(\'' + item.id + '\')" class="btn btn-danger btn-sm">' +
                            '<i class="fas fa-trash"></i>' +
                        '</button>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }
    } catch (e) {
        console.error('Error loading protection list:', e);
    }
}

// Toast
function showToast(type, message) {
    var container = document.getElementById('toast-container');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<i class="fas fa-' + (type === 'success' ? 'check-circle' : 'exclamation-circle') + '"></i><span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(function() { toast.remove(); }, 3000);
}
