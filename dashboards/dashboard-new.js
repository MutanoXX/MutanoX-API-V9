// MutanoX Dashboard JS V9 Ultimate
let adminKey = localStorage.getItem('mutanox_admin_key');
let charts = {};
let socket;

function filterTable(tableId, query) {
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName('tr');
    const q = query.toLowerCase();
    
    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].textContent.toLowerCase();
        rows[i].style.display = text.includes(q) ? '' : 'none';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        padding: 15px 25px;
        border-radius: 12px;
        background: ${type === 'success' ? 'rgba(0, 255, 157, 0.9)' : 'rgba(255, 77, 77, 0.9)'};
        color: #000;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease forwards;
        min-width: 250px;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Adicionar animações ao CSS via JS
const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    if (!adminKey) {
        document.getElementById('login-modal').style.display = 'flex';
        return;
    }
    initCharts();
    initWebSocket();
    applySavedTheme();
    updateServerTime();
    setInterval(updateServerTime, 1000);
});

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Se estiver rodando localmente sem host definido, usa localhost:8080
    const host = window.location.host || 'localhost:8080';
    socket = new WebSocket(`${protocol}//${host}`);

    socket.onopen = () => {
        console.log('WebSocket connected');
        showNotification('Conectado ao servidor em tempo real', 'success');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'STATS_UPDATE') {
                updateStats(data);
                updateCharts(data);
                updateHealth(data.health);
                
                // Se estiver na seção de keys, atualiza a tabela se houver mudanças
                if (document.getElementById('section-keys').classList.contains('active')) {
                    updateKeysTable(data.keys);
                }
            }
        } catch (e) {
            console.error('Error parsing WebSocket message:', e);
        }
    };

    socket.onclose = () => {
        console.log('WebSocket closed. Reconnecting...');
        setTimeout(initWebSocket, 3000);
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function updateKeysTable(keys) {
    if (!keys) return;
    const tbody = document.querySelector('#keys-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = Object.entries(keys).map(([key, info]) => `
        <tr>
            <td style="font-family: monospace; font-size: 11px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span title="${key}">${key.substring(0,12)}...</span>
                    <i class="fas fa-copy" style="cursor: pointer; color: var(--primary);" onclick="copyToClipboard('${key}')"></i>
                </div>
            </td>
            <td>${info.owner}</td>
            <td>${info.dailyUsage} / ${info.dailyLimit || '∞'}</td>
            <td>${info.usageCount}</td>
            <td><span class="badge ${info.active ? 'badge-success' : 'badge-danger'}">${info.active ? 'ATIVA' : 'INATIVA'}</span></td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm" onclick="openEditKey('${key}', '${info.owner}', ${info.dailyLimit}, ${info.active})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);" onclick="deleteKey('${key}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');
    
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    
    localStorage.setItem('mutanox_theme', isLight ? 'light' : 'dark');
    icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    text.innerText = isLight ? 'Modo Escuro' : 'Modo Claro';
}

function applySavedTheme() {
    const saved = localStorage.getItem('mutanox_theme');
    if (saved === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-icon').className = 'fas fa-sun';
        document.getElementById('theme-text').innerText = 'Modo Escuro';
    }
}

function updateServerTime() {
    const el = document.getElementById('server-time');
    if (el) el.innerText = new Date().toLocaleString('pt-BR');
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const target = document.getElementById(`section-${sectionId}`);
    if (target) target.classList.add('active');
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(sectionId)) {
            item.classList.add('active');
        }
    });

    if (sectionId === 'keys') loadKeys();
    if (sectionId === 'audit') loadAuditLogs();
    if (sectionId === 'health') refreshHealth();
    if (sectionId === 'endpoints') loadEndpoints();
    if (sectionId === 'miniservice') loadMiniService();
    if (sectionId === 'docs-manager') loadDocsManager();
    if (sectionId === 'custom') loadCustomization();
    if (sectionId === 'security') loadSecurityConfig();
}

async function loadSecurityConfig() {
    try {
        const res = await fetch(`/api/admin/stats?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            // Preencher campos de segurança se existirem no retorno
        }
    } catch (e) {}
}

function initCharts() {
    const mainEl = document.querySelector("#mainChart");
    const deviceEl = document.querySelector("#deviceChart");
    const msEl = document.querySelector("#msChart");

    if (mainEl) {
        charts.main = new ApexCharts(mainEl, {
            series: [{ name: 'Requisições', data: [] }],
            chart: { height: 350, type: 'area', animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } }, toolbar: { show: false }, background: 'transparent' },
            colors: ['#00f2ff'],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 3 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0, stops: [0, 90, 100] } },
            xaxis: { type: 'datetime', labels: { style: { colors: '#a0a0a0' } } },
            yaxis: { labels: { style: { colors: '#a0a0a0' } } },
            grid: { borderColor: 'rgba(255,255,255,0.05)' },
            theme: { mode: 'dark' }
        });
        charts.main.render();
    }

    if (deviceEl) {
        charts.device = new ApexCharts(deviceEl, {
            series: [0, 0, 0],
            chart: { height: 300, type: 'donut' },
            labels: ['Desktop', 'Mobile', 'Tablet'],
            colors: ['#7000ff', '#00f2ff', '#ff00c8'],
            legend: { position: 'bottom', labels: { colors: '#a0a0a0' } },
            plotOptions: { pie: { donut: { size: '70%', background: 'transparent' } } },
            stroke: { show: false },
            theme: { mode: 'dark' }
        });
        charts.device.render();
    }

    if (msEl) {
        charts.ms = new ApexCharts(msEl, {
            series: [{ name: 'Uso', data: [] }],
            chart: { height: 300, type: 'bar', background: 'transparent' },
            colors: ['#00f2ff'],
            xaxis: { categories: [], labels: { style: { colors: '#a0a0a0' } } },
            yaxis: { labels: { style: { colors: '#a0a0a0' } } },
            theme: { mode: 'dark' }
        });
        charts.ms.render();
    }
}

// Polling removido em favor do WebSocket

function updateStats(data) {
    document.getElementById('stat-total').innerText = data.totalRequests.toLocaleString();
    document.getElementById('stat-errors').innerText = data.errors;
    document.getElementById('stat-keys').innerText = Object.keys(data.keys).length;
    const uptime = Math.floor(data.uptime / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    document.getElementById('stat-uptime').innerText = `${h}h ${m}m`;
}

function updateCharts(data) {
    const now = new Date().getTime();
    if (charts.main) {
        const seriesData = [...charts.main.w.config.series[0].data];
        seriesData.push({ x: now, y: data.totalRequests || 0 });
        if (seriesData.length > 30) seriesData.shift();
        charts.main.updateSeries([{ data: seriesData }], true);
    }
    if (charts.device && data.deviceHits) {
        charts.device.updateSeries([data.deviceHits.desktop || 0, data.deviceHits.mobile || 0, data.deviceHits.tablet || 0], true);
    }
    if (charts.ms && data.usageHistory) {
        const counts = data.usageHistory.map(h => h.count);
        const dates = data.usageHistory.map(h => h.date);
        charts.ms.updateSeries([{ name: 'Uso', data: counts }], true);
        charts.ms.updateOptions({ xaxis: { categories: dates } }, false, true);
    }
}

function updateHealth(health) {
    const container = document.getElementById('health-container');
    if (!container || !health) return;
    container.innerHTML = health.map(h => `
        <div class="health-item">
            <div style="color: var(--text-muted); font-size: 12px;">${h.name}</div>
            <div class="health-status" style="color: ${h.status === 'ONLINE' ? 'var(--success)' : 'var(--danger)'}">${h.status}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">Latência: ${h.latency}ms</div>
        </div>
    `).join('');
}

async function loadKeys() {
    try {
        const res = await fetch(`/api/admin/stats?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            const tbody = document.querySelector('#keys-table tbody');
            tbody.innerHTML = Object.entries(data.keys).map(([key, info]) => `
                <tr>
                    <td style="font-family: monospace; font-size: 11px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span title="${key}">${key.substring(0,12)}...</span>
                            <i class="fas fa-copy" style="cursor: pointer; color: var(--primary);" onclick="copyToClipboard('${key}')"></i>
                        </div>
                    </td>
                    <td>${info.owner}</td>
                    <td>${info.dailyUsage} / ${info.dailyLimit || '∞'}</td>
                    <td>${info.usageCount}</td>
                    <td><span class="badge ${info.active ? 'badge-success' : 'badge-danger'}">${info.active ? 'ATIVA' : 'INATIVA'}</span></td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm" onclick="openEditKey('${key}', '${info.owner}', ${info.dailyLimit}, ${info.active})"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);" onclick="deleteKey('${key}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {}
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copiado para a área de transferência!');
    });
}

async function deleteKey(key) {
    if (!confirm('Tem certeza que deseja excluir esta API Key?')) return;
    try {
        const res = await fetch('/api/admin/keys/delete?apikey=' + adminKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: key })
        });
        const data = await res.json();
        if (data.success) {
            loadApiKeys();
            showNotification('API Key excluída com sucesso!', 'success');
        }
    } catch (e) { showNotification('Erro ao excluir API Key', 'error'); }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 15px 25px; border-radius: 8px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'}; color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 9999; animation: slideIn 0.3s ease;
    `;
    notification.innerText = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function openAddKeyModal() {
    document.getElementById('add-key-modal').style.display = 'flex';
}

async function saveNewKey() {
    const owner = document.getElementById('add-key-owner').value;
    const dailyLimit = document.getElementById('add-key-limit').value;
    const role = document.getElementById('add-key-role').value;

    try {
        const res = await fetch('/api/admin/keys/create?apikey=' + adminKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, dailyLimit, role })
        });
        const data = await res.json();
        if (data.success) {
            alert('Chave criada: ' + data.key);
            closeModal('add-key-modal');
            loadKeys();
        }
    } catch (e) { alert('Erro ao criar'); }
}

function openEditKey(key, owner, limit, active) {
    document.getElementById('edit-key-id').value = key;
    document.getElementById('edit-key-owner').value = owner;
    document.getElementById('edit-key-limit').value = limit;
    document.getElementById('edit-key-status').value = active.toString();
    document.getElementById('edit-key-modal').style.display = 'flex';
}

async function saveKeyEdit() {
    const target = document.getElementById('edit-key-id').value;
    const owner = document.getElementById('edit-key-owner').value;
    const dailyLimit = document.getElementById('edit-key-limit').value;
    const active = document.getElementById('edit-key-status').value === 'true';

    try {
        const res = await fetch('/api/admin/keys/update?apikey=' + adminKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, owner, dailyLimit, active })
        });
        if ((await res.json()).success) {
            closeModal('edit-key-modal');
            loadKeys();
        }
    } catch (e) { alert('Erro ao salvar'); }
}

async function loadAuditLogs() {
    try {
        const res = await fetch(`/api/admin/audit?apikey=${adminKey}`);
        const logs = await res.json();
        const tbody = document.querySelector('#audit-table tbody');
        if (!tbody) return;
        tbody.innerHTML = logs.slice(0, 100).map(log => `
            <tr>
                <td style="font-size: 11px; color: var(--text-muted);">${new Date(log.timestamp).toLocaleString()}</td>
                <td style="font-family: monospace;">${log.apiKey}</td>
                <td><span class="badge ${log.type === 'ADMIN' ? 'badge-warning' : 'badge-success'}">${log.type}</span></td>
                <td>${log.action}</td>
                <td style="font-size: 12px; color: var(--text-muted);">${log.details}</td>
            </tr>
        `).join('');
    } catch (e) { console.error('Erro ao carregar logs:', e); }
}

async function addSingleProtection() {
    const nome = document.getElementById('single-prot-nome').value;
    const cpf = document.getElementById('single-prot-cpf').value;
    const numero = document.getElementById('single-prot-phone').value;
    const expiresAt = document.getElementById('single-prot-expiry').value;

    if (!nome || !cpf) return alert('Nome e CPF são obrigatórios');

    try {
        const res = await fetch('/api/admin/protection/bulk?apikey=' + adminKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ list: [{ nome, cpf, numero, expiresAt }] })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Usuário ${nome} protegido com sucesso!`);
            document.getElementById('single-prot-nome').value = '';
            document.getElementById('single-prot-cpf').value = '';
            document.getElementById('single-prot-phone').value = '';
            document.getElementById('single-prot-expiry').value = '';
        }
    } catch (e) { alert('Erro ao adicionar proteção'); }
}

async function processBulkProtection() {
    const input = document.getElementById('bulk-protection-input').value;
    if (!input) return alert('Insira os dados para proteção');
    
    const lines = input.split('\n').filter(l => l.trim());
    const list = lines.map(line => {
        const parts = line.split(',');
        return {
            nome: parts[0]?.trim(),
            cpf: parts[1]?.trim(),
            numero: parts[2]?.trim(),
            expiresAt: parts[3]?.trim() || null
        };
    });

    try {
        const res = await fetch('/api/admin/protection/bulk?apikey=' + adminKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ list })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`${data.count} usuários protegidos com sucesso!`);
            document.getElementById('bulk-protection-input').value = '';
        }
    } catch (e) { alert('Erro no processamento em massa'); }
}

async function exportAudit(format) {
    try {
        const res = await fetch(`/api/admin/audit?apikey=${adminKey}`);
        const logs = await res.json();
        
        let content, mimeType, filename;
        
        if (format === 'json') {
            content = JSON.stringify(logs, null, 2);
            mimeType = 'application/json';
            filename = 'audit_logs.json';
        } else {
            const headers = ['Timestamp', 'API Key', 'Type', 'Action', 'Details'];
            const rows = logs.map(l => [l.timestamp, l.apiKey, l.type, l.action, l.details].join(','));
            content = [headers.join(','), ...rows].join('\n');
            mimeType = 'text/csv';
            filename = 'audit_logs.csv';
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    } catch (e) { alert('Erro ao exportar logs'); }
}

async function blockIP() {
    const ip = prompt('Digite o IP para bloquear:');
    if (!ip) return;
    try {
        const res = await fetch(`/api/admin/security/block?apikey=${adminKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip })
        });
        const data = await res.json();
        if (data.success) showToast(`IP ${ip} bloqueado com sucesso!`);
    } catch (e) { alert('Erro ao bloquear IP'); }
}

async function backupDatabase() {
    try {
        const res = await fetch(`/api/admin/database/backup?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mutanox_backup_${Date.now()}.json`;
            a.click();
            showToast('Backup realizado e download iniciado!');
        }
    } catch (e) { alert('Erro ao realizar backup'); }
}

async function clearLogs() {
    if (!confirm('Tem certeza que deseja limpar todos os logs de auditoria?')) return;
    try {
        const res = await fetch(`/api/admin/audit/clear?apikey=${adminKey}`, { method: 'POST' });
        if ((await res.json()).success) {
            showToast('Logs limpos com sucesso!');
            loadAuditLogs();
        }
    } catch (e) { alert('Erro ao limpar logs'); }
}

async function loadEndpoints() {
    try {
        const res = await fetch(`/api/admin/endpoints/list?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            const tbody = document.querySelector('#endpoints-table tbody');
            tbody.innerHTML = Object.entries(data.endpoints).map(([id, config]) => `
                <tr>
                    <td>${config.name || id}</td>
                    <td><strong>${id}</strong> ${config.dynamic ? '<i class="fas fa-code" title="Dinâmico" style="color: var(--primary); font-size: 10px;"></i>' : ''}</td>
                    <td>${data.stats[id] || 0}</td>
                    <td><span class="badge ${config.active ? 'badge-success' : 'badge-danger'}">${config.active ? 'ATIVO' : 'INATIVO'}</span></td>
                    <td><span class="badge ${config.maintenance ? 'badge-warning' : 'badge-success'}">${config.maintenance ? 'MANUTENÇÃO' : 'NORMAL'}</span></td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm" onclick="toggleEndpoint('${id}', 'active', ${!config.active})">${config.active ? 'Desativar' : 'Ativar'}</button>
                            <button class="btn btn-sm" onclick="toggleEndpoint('${id}', 'maintenance', ${!config.maintenance})">${config.maintenance ? 'Finalizar Manut.' : 'Manutenção'}</button>
                            ${config.dynamic ? `<button class="btn btn-sm" style="background: var(--secondary);" onclick="openEndpointEditor('${id}')"><i class="fas fa-edit"></i></button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {}
}

async function openEndpointEditor(name) {
    try {
        const res = await fetch(`/api/admin/endpoint/read?apikey=${adminKey}&name=${name}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('new-ep-name').value = name;
            document.getElementById('new-ep-code').value = data.code;
            showSection('add-endpoint');
            showNotification(`Editando endpoint: ${name}`, 'info');
        }
    } catch (e) { showNotification('Erro ao carregar código', 'error'); }
}

async function toggleEndpoint(id, field, value) {
    try {
        const res = await fetch('/api/admin/endpoints/update?apikey=' + adminKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, [field]: value })
        });
        if ((await res.json()).success) loadEndpoints();
    } catch (e) { alert('Erro ao atualizar endpoint'); }
}

async function loadMiniService() {
    try {
        const res = await fetch(`/api/admin/stats?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('ms-status').innerText = data.config.active ? 'Ativo' : 'Inativo';
            document.getElementById('ms-usage').innerText = data.config.usageCount || 0;
            document.getElementById('btn-toggle-ms').innerText = data.config.active ? 'Desativar Sistema' : 'Ativar Sistema';
            
            if (charts.ms) {
                const categories = Object.keys(data.endpointHits);
                const values = Object.values(data.endpointHits);
                charts.ms.updateOptions({ xaxis: { categories: categories } });
                charts.ms.updateSeries([{ data: values }]);
            }
        }
    } catch (e) {}
}

async function toggleMiniService() {
    try {
        const res = await fetch(`/api/admin/stats?apikey=${adminKey}`);
        const current = await res.json();
        const newState = !current.config.active;
        
        const updateRes = await fetch('/api/admin/free/update?apikey=' + adminKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: newState })
        });
        if ((await updateRes.json()).success) loadMiniService();
    } catch (e) { alert('Erro ao alternar Mini Service'); }
}

async function loadDocsManager() {
    try {
        const res = await fetch(`/api/admin/docs/read?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('docs-content').value = data.content;
        }
    } catch (e) { console.error('Error loading docs:', e); }
}

async function refreshAutoDocs() {
    try {
        const res = await fetch(`/api/admin/docs/read?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('docs-content').value = data.content;
            showNotification('Documentação sincronizada!', 'success');
        }
    } catch (e) { showNotification('Erro ao sincronizar documentação', 'error'); }
}

function showSection(section) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    if (section === 'docs-manager') refreshAutoDocs();
    if (section === 'keys') loadKeys();
    if (section === 'endpoints') loadEndpoints();
    if (section === 'audit') loadAudit();
}

function updateStats() {
    fetch(`/api/admin/stats?apikey=${adminKey}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('custom-protection-msg').value = data.config.protectionMessage;
                document.getElementById('custom-maintenance-msg').value = data.config.maintenanceMessage;
                document.getElementById('custom-free-msg').value = data.config.message;
                document.getElementById('custom-ad-text').value = data.config.adBanner || '';
                document.getElementById('custom-ad-link').value = data.config.adLink || '';
                document.getElementById('custom-primary-color').value = data.config.primaryColor || '#00f2ff';
                document.getElementById('custom-secondary-color').value = data.config.secondaryColor || '#7000ff';
                document.getElementById('custom-layout-type').value = data.config.layoutType || 'modern';
                document.getElementById('custom-show-stats').checked = data.config.showStatsWidget !== false;
                
                // Adicionar listeners para salvar automaticamente ao mudar (tempo real)
                const fields = ['custom-protection-msg', 'custom-maintenance-msg', 'custom-free-msg', 'custom-ad-text', 'custom-ad-link', 'custom-primary-color', 'custom-secondary-color', 'custom-layout-type', 'custom-show-stats'];
                fields.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.onchange = () => saveCustomization(true);
                    }
                });
            }
        });
}

async function saveCustomization(isSilent = false) {
    const protectionMessage = document.getElementById('custom-protection-msg').value;
    const maintenanceMessage = document.getElementById('custom-maintenance-msg').value;
    const message = document.getElementById('custom-free-msg').value;
    const adBanner = document.getElementById('custom-ad-text').value;
    const adLink = document.getElementById('custom-ad-link').value;
    const primaryColor = document.getElementById('custom-primary-color').value;
    const secondaryColor = document.getElementById('custom-secondary-color').value;
    const layoutType = document.getElementById('custom-layout-type').value;
    const showStatsWidget = document.getElementById('custom-show-stats').checked;

    try {
        const res = await fetch('/api/admin/miniservice/update?apikey=' + adminKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ protectionMessage, maintenanceMessage, message, adBanner, adLink, primaryColor, secondaryColor, layoutType, showStatsWidget })
        });
        if ((await res.json()).success && !isSilent) {
            showNotification('Configurações aplicadas em tempo real!', 'success');
        }
    } catch (e) { 
        if (!isSilent) showNotification('Erro ao salvar', 'error'); 
    }
}

async function saveSecurity() {
    const blacklist = document.getElementById('security-blacklist').value.split('\n').filter(ip => ip.trim());
    const rateLimit = document.getElementById('security-rate-limit').value;
    const antiDdos = document.getElementById('security-anti-ddos').checked;

    try {
        const res = await fetch(`/api/admin/waf/update?apikey=${adminKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blacklist, rateLimit, antiDdos })
        });
        if ((await res.json()).success) showNotification('Regras de segurança aplicadas!', 'success');
    } catch (e) { showNotification('Erro ao aplicar regras', 'error'); }
}

async function clearSystemCache() {
    try {
        const res = await fetch(`/api/admin/cache/clear?apikey=${adminKey}`);
        if ((await res.json()).success) showNotification('Todo o cache foi limpo!', 'success');
    } catch (e) { showNotification('Erro ao limpar cache', 'error'); }
}

async function clearEndpointCache() {
    const endpoint = document.getElementById('cache-endpoint-name').value;
    if (!endpoint) return showNotification('Informe o nome do endpoint', 'warning');
    try {
        const res = await fetch(`/api/admin/cache/clear?apikey=${adminKey}&endpoint=${endpoint}`);
        if ((await res.json()).success) showNotification(`Cache de ${endpoint} limpo!`, 'success');
    } catch (e) { showNotification('Erro ao limpar cache', 'error'); }
}

function openTestModal() {
    const name = document.getElementById('new-ep-name').value;
    const code = document.getElementById('new-ep-code').value;
    const paramsStr = document.getElementById('new-ep-params').value;
    
    if (!name || !code) return showNotification('Preencha nome e código', 'warning');
    
    const params = paramsStr.split(',').map(p => p.trim()).filter(p => p);
    const container = document.getElementById('test-params-container');
    container.innerHTML = '<h4>Parâmetros do Teste</h4>';
    
    params.forEach(p => {
        container.innerHTML += `
            <div class="form-group">
                <label class="input-label">${p}</label>
                <input type="text" class="form-input test-param-input" data-param="${p}" placeholder="Valor para ${p}">
            </div>
        `;
    });
    
    document.getElementById('test-result-display').innerText = 'Aguardando execução...';
    document.getElementById('btn-deploy-ep').style.display = 'none';
    document.getElementById('test-ep-modal').style.display = 'flex';
}

async function runEndpointTest() {
    const code = document.getElementById('new-ep-code').value;
    const paramInputs = document.querySelectorAll('.test-param-input');
    const params = {};
    paramInputs.forEach(input => {
        params[input.getAttribute('data-param')] = input.value;
    });
    
    document.getElementById('test-result-display').innerText = 'Executando...';
    
    try {
        const res = await fetch(`/api/admin/endpoint/test?apikey=${adminKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, params })
        });
        const data = await res.json();
        document.getElementById('test-result-display').innerText = JSON.stringify(data.result || data.error, null, 2);
        
        if (data.success) {
            document.getElementById('btn-deploy-ep').style.display = 'block';
            showNotification('Teste concluído com sucesso!', 'success');
        } else {
            showNotification('Erro no teste: ' + data.error, 'error');
        }
    } catch (e) {
        document.getElementById('test-result-display').innerText = 'Erro na requisição: ' + e.message;
    }
}

async function deployEndpoint() {
    const name = document.getElementById('new-ep-name').value;
    const code = document.getElementById('new-ep-code').value;
    const params = document.getElementById('new-ep-params').value.split(',').map(p => p.trim()).filter(p => p);
    
    try {
        const res = await fetch(`/api/admin/endpoint/add?apikey=${adminKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, code, params })
        });
        if ((await res.json()).success) {
            showNotification('Endpoint adicionado e em produção!', 'success');
            closeModal('test-ep-modal');
            // Limpar campos
            document.getElementById('new-ep-name').value = '';
            document.getElementById('new-ep-code').value = '';
            document.getElementById('new-ep-params').value = '';
        }
    } catch (e) { showNotification('Erro ao fazer deploy', 'error'); }
}

function updateLivePreview() {
    const primary = document.getElementById('custom-primary-color').value;
    const secondary = document.getElementById('custom-secondary-color').value;
    const radius = document.getElementById('custom-border-radius').value;
    const layout = document.getElementById('custom-layout-type').value;
    
    const preview = document.getElementById('theme-preview');
    const previewHeader = document.getElementById('preview-header');
    const previewBtn = preview.querySelector('.btn-primary');
    
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--secondary', secondary);
    
    previewHeader.style.background = primary;
    previewBtn.style.background = primary;
    previewBtn.style.borderRadius = radius + 'px';
    preview.style.borderRadius = radius + 'px';
    
    if (layout === 'glass') {
        preview.style.background = 'rgba(255, 255, 255, 0.1)';
        preview.style.backdropFilter = 'blur(10px)';
    } else {
        preview.style.background = '#0a0a0a';
        preview.style.backdropFilter = 'none';
    }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

async function attemptLogin() {
    const username = document.getElementById('login-user').value;
    const password = document.getElementById('login-pass').value;
    try {
        const res = await fetch('/api/admin/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('mutanox_admin_key', data.adminKey);
            location.reload();
        } else { alert('Credenciais Inválidas!'); }
    } catch (e) { alert('Erro ao conectar'); }
}

function logout() {
    localStorage.removeItem('mutanox_admin_key');
    location.reload();
}
