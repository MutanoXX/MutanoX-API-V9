// CONFIGURATION
const API_BASE = '';
let adminKey = localStorage.getItem('mutanox_admin_key') || '';

let refreshInterval = null;
let refreshRate = 2000;
let lastData = null;
let timelineChart = null;
let requestHistory = [];
let currentTab = 'dashboard';

// Endpoint configurations
const endpointConfigs = {
    'cpf': { name: 'Consultar CPF', icon: 'fa-id-card', color: '#10b981', description: 'Consulta completa de CPF' },
    'nome': { name: 'Consultar Nome', icon: 'fa-user', color: '#6366f1', description: 'Busca por nome completo' },
    'numero': { name: 'Consultar Telefone', icon: 'fa-phone', color: '#f59e0b', description: 'Consulta de telefone' },
    'bypasscf': { name: 'Bypass Cloudflare', icon: 'fa-shield-virus', color: '#ef4444', description: 'Bypass de proteção Cloudflare' },
    'infoff': { name: 'Free Fire Info', icon: 'fa-gamepad', color: '#8b5cf6', description: 'Consulta de conta Free Fire' },
    'downloader': { name: 'AIO Downloader', icon: 'fa-download', color: '#06b6d4', description: 'Download de mídias' },
    'clima': { name: 'Clima Tempo', icon: 'fa-cloud-sun', color: '#38bdf8', description: 'Previsão do tempo' },
    'cotacao': { name: 'Cotação Moedas', icon: 'fa-dollar-sign', color: '#22c55e', description: 'Cotação em tempo real' },
    'qrcode': { name: 'Gerador QR Code', icon: 'fa-qrcode', color: '#ffffff', description: 'Gera QR Code' },
    'shorten': { name: 'Encurtador URL', icon: 'fa-link', color: '#f472b6', description: 'Encurta links' },
    'nsfw': { name: 'NSFW Gen', icon: 'fa-image', color: '#f97316', description: 'Geração de imagens NSFW' }
};

// Proteção contra manipulação (agora após endpointConfigs ser definido)
(function() {
    // Congelar objetos sensíveis para evitar manipulação via console
    if (typeof endpointConfigs !== 'undefined') Object.freeze(endpointConfigs);

    // Bloquear redefinição de funções críticas
    const criticalFunctions = ['login', 'logout', 'addProtection', 'executeProtection'];
    criticalFunctions.forEach(fn => {
        if (window[fn]) Object.defineProperty(window, fn, { writable: false, configurable: false });
    });
})();

// Helper function to safely get element
function safeGetElement(id) {
    return document.getElementById(id);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (adminKey) {
        showDashboard();
    }
});

// Login function - Validação segura via API
window.login = async function() {
    const usernameInput = document.getElementById('admin-username');
    const passwordInput = document.getElementById('admin-password');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';

    // Validar usuário e senha
    if (!username || !password) {
        showToast('error', 'Preencha todos os campos');
        return;
    }

    try {
        // Enviar credenciais para a API validar (back-end)
        const response = await fetch('/api/admin/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Login bem-sucedido - salvar chave e mostrar dashboard
            adminKey = data.adminKey;
            localStorage.setItem('mutanox_admin_key', adminKey);
            localStorage.setItem('mutanox_admin_user', username);
            showToast('success', 'Autenticado com sucesso');
            showDashboard();
        } else {
            // Login falhou - mostrar erro
            const errorEl = document.getElementById('login-error');
            if (errorEl) errorEl.classList.remove('hidden');
            setTimeout(() => {
                if (errorEl) errorEl.classList.add('hidden');
            }, 3000);
            showToast('error', data.message || 'Credenciais inválidas');
        }
    } catch (error) {
        // Erro de conexão com o servidor
        showToast('error', 'Erro de conexão com o servidor');
    }
}

window.logout = function() {
    localStorage.removeItem('mutanox_admin_key');
    localStorage.removeItem('mutanox_admin_user');
    location.reload();
}

function showDashboard() {
    const loginOverlay = document.getElementById('login-overlay');
    const dashboardContent = document.getElementById('dashboard-content');
    
    if (loginOverlay) loginOverlay.setAttribute('style', 'display: none !important');
    if (dashboardContent) dashboardContent.classList.remove('hidden');
    
    initCharts();
    startAutoRefresh();
}

// Tab switching
window.switchTab = function(tab) {
    currentTab = tab;
    ['dashboard', 'keys', 'endpoints', 'logs', 'protection'].forEach(t => {
        const content = document.getElementById(`content-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if (content) content.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`content-${tab}`);
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeContent) activeContent.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');
    
    if (tab === 'protection') loadProtectionList();
}

// Charts
function initCharts() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Requests',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true }, x: { display: false } }
        }
    });
}

// Auto refresh
function startAutoRefresh() {
    refreshData();
    refreshInterval = setInterval(refreshData, refreshRate);
}

async function refreshData() {
    try {
        const response = await fetch(`/api/admin/stats-readonly?apikey=${adminKey}`);
        const data = await response.json();
        if (data.success) {
            updateUI(data);
        }
    } catch (e) {
        console.error('Refresh error', e);
    }
}

function updateUI(data) {
    document.getElementById('stat-total').textContent = data.totalRequests.toLocaleString();
    document.getElementById('stat-keys').textContent = Object.keys(data.keys).length;
    
    const uptimeSeconds = Math.floor(data.uptime / 1000);
    document.getElementById('stat-uptime').textContent = `${uptimeSeconds}s`;

    if (currentTab === 'keys') updateKeys(data.keys);
    if (currentTab === 'endpoints') updateEndpoints(data.endpointHits);
    if (currentTab === 'logs') updateLogs(data.logs);
    
    updateTimeline(data.totalRequests);
}

let lastTotal = 0;
function updateTimeline(total) {
    const diff = lastTotal === 0 ? 0 : total - lastTotal;
    lastTotal = total;
    const now = new Date().toLocaleTimeString();
    
    requestHistory.push({ time: now, val: diff });
    if (requestHistory.length > 20) requestHistory.shift();
    
    if (timelineChart) {
        timelineChart.data.labels = requestHistory.map(h => h.time);
        timelineChart.data.datasets[0].data = requestHistory.map(h => h.val);
        timelineChart.update('none');
    }
}

function updateKeys(keys) {
    const container = document.getElementById('keys-list');
    if (!container) return;
    container.innerHTML = Object.entries(keys).map(([key, info]) => `
        <div class="cyber-card p-4 flex justify-between items-center">
            <div>
                <p class="font-bold">${info.owner} <span class="badge badge-user">${info.role}</span></p>
                <code style="font-size: 10px; color: #10b981;">${key.substring(0, 12)}...</code>
            </div>
            <div class="flex gap-2">
                <button onclick="deleteKey('${key}')" class="tab-btn" style="color:#ef4444; padding: 5px 10px;"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function updateEndpoints(hits) {
    const container = document.getElementById('endpoints-management');
    if (!container) return;
    container.innerHTML = Object.entries(endpointConfigs).map(([id, config]) => `
        <div class="cyber-card p-4">
            <div class="flex items-center gap-3 mb-2">
                <i class="fas ${config.icon}" style="color: ${config.color}"></i>
                <span class="font-bold">${config.name}</span>
            </div>
            <p class="text-4xl font-bold">${hits[id] || 0}</p>
            <p class="text-xs text-muted">Total de acessos</p>
        </div>
    `).join('');
}

function updateLogs(logs) {
    const terminal = document.getElementById('terminal');
    if (!terminal || !logs) return;
    terminal.innerHTML = logs.map(l => `
        <div class="log-entry">
            <span class="text-muted">[${l.timestamp.split(', ')[1] || ''}]</span>
            <span class="log-${l.type.toLowerCase()}">${l.type}</span>
            <span>${l.message}</span>
        </div>
    `).join('');
}

// Protection Functions
window.addProtection = async function() {
    const nome = document.getElementById('prot-nome').value;
    const cpf = document.getElementById('prot-cpf').value;
    const numero = document.getElementById('prot-numero').value;
    const duration = document.getElementById('prot-duration').value;
    const btn = document.getElementById('btn-add-prot');

    if (!nome && !cpf && !numero) {
        showToast('error', 'Preencha um campo');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        if (nome) {
            const res = await fetch(`/api/admin/protection/search?apikey=${adminKey}&q=${encodeURIComponent(nome)}`);
            const data = await res.json();
            if (data.sucesso && data.resultados && data.resultados.length > 0) {
                showSelectionModal(data.resultados, numero, duration);
            } else {
                await executeProtection(nome, cpf, numero, duration, false);
            }
        } else {
            await executeProtection(null, cpf, numero, duration, true);
        }
    } catch (e) {
        showToast('error', 'Erro na operação');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Proteger';
    }
}

window.showSelectionModal = function(results, numero, duration) {
    const modal = document.getElementById('selection-modal');
    const container = document.getElementById('selection-results');
    modal.classList.remove('hidden');
    container.innerHTML = results.map(p => `
        <div class="cyber-card p-4 mb-2 flex justify-between items-center">
            <div>
                <p class="font-bold">${p.nome}</p>
                <p class="text-xs text-muted">CPF: ${p.cpf} | Mãe: ${p.nomeMae}</p>
            </div>
            <button onclick="executeProtection('${p.nome}', '${p.cpf}', '${numero}', '${duration}', true)" class="btn-primary" style="padding: 5px 10px;">Selecionar</button>
        </div>
    `).join('');
}

window.closeSelectionModal = () => document.getElementById('selection-modal').classList.add('hidden');

window.executeProtection = async function(nome, cpf, numero, duration, autoFetch) {
    try {
        const res = await fetch(`/api/admin/protection/add?apikey=${adminKey}&nome=${encodeURIComponent(nome || '')}&cpf=${cpf || ''}&numero=${numero || ''}&duration=${duration || ''}&autoFetch=${autoFetch}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Proteção ativada');
            closeSelectionModal();
            loadProtectionList();
        }
    } catch (e) {
        showToast('error', 'Erro ao proteger');
    }
}

window.loadProtectionList = async function() {
    const list = document.getElementById('protection-list');
    try {
        const res = await fetch(`/api/admin/protection/list?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            list.innerHTML = data.list.map(i => `
                <div class="cyber-card p-3 flex justify-between items-center">
                    <div>
                        <p class="font-bold" style="font-size:14px;">${i.nome || 'Sem Nome'}</p>
                        <p class="text-xs text-muted">${i.cpf || ''} ${i.numero || ''}</p>
                    </div>
                    <button onclick="removeProtection('${i.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
        }
    } catch (e) {}
}

window.removeProtection = async function(id) {
    if (!confirm('Remover?')) return;
    await fetch(`/api/admin/protection/remove?apikey=${adminKey}&id=${id}`, { method: 'POST' });
    loadProtectionList();
}

// Toast
function showToast(type, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'cyber-card p-3 mb-2';
    toast.style.borderLeft = `4px solid ${type === 'success' ? '#10b981' : '#ef4444'}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Key Management
window.openCreateModal = () => document.getElementById('create-modal').classList.remove('hidden');
window.closeCreateModal = () => document.getElementById('create-modal').classList.add('hidden');
window.createKey = async function() {
    const owner = document.getElementById('new-owner').value;
    const role = document.getElementById('new-role').value;
    if (!owner) return;
    await fetch(`/api/admin/keys?owner=${encodeURIComponent(owner)}&role=${role}&apikey=${adminKey}`, { method: 'POST' });
    closeCreateModal();
    refreshData();
}
window.deleteKey = async function(key) {
    if (!confirm('Excluir?')) return;
    await fetch(`/api/admin/keys?target=${key}&apikey=${adminKey}`, { method: 'DELETE' });
    refreshData();
}
window.forceRefresh = () => refreshData();
