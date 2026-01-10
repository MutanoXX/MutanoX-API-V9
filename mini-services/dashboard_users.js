// MutanoX User Dashboard JS
let userApiKey = localStorage.getItem('mutanox_user_key');
let userData = null;
let socket;
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    
    if (!userApiKey) {
        document.getElementById('login-overlay').style.display = 'flex';
        return;
    }
    
    loadUserData();
    initWebSocket();
    initCharts();
});

function logout() {
    localStorage.removeItem('mutanox_user_key');
    location.reload();
}

async function attemptLogin() {
    const key = document.getElementById('login-key').value;
    if (!key) return alert('Insira sua API Key');
    
    try {
        const res = await fetch(`/api/user/stats?apikey=${key}`);
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('mutanox_user_key', key);
            userApiKey = key;
            location.reload();
        } else {
            alert('API Key inválida ou expirada');
        }
    } catch (e) { alert('Erro ao validar chave'); }
}

async function loadUserData() {
    try {
        const res = await fetch(`/api/user/stats?apikey=${sanitizeInput(userApiKey)}`);
        if (res.status === 401) {
            localStorage.removeItem('mutanox_user_key');
            location.reload();
            return;
        }
        
        const data = await res.json();
        if (data.success) {
            userData = data;
            updateDashboard();
            updateAlerts();
            updateCharts();
        }
    } catch (e) {
        console.error('Error loading user data:', e);
    }
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/[^a-zA-Z0-9\-]/g, '');
}

function updateDashboard() {
    if (!userData) return;
    
    document.getElementById('total-requests').innerText = userData.usageCount.toLocaleString();
    document.getElementById('daily-usage').innerText = userData.dailyUsage;
    
    const limitText = userData.dailyLimit > 0 ? `Limite: ${userData.dailyLimit}` : 'Limite: ∞';
    const usagePercent = userData.dailyLimit > 0 ? (userData.dailyUsage / userData.dailyLimit) * 100 : 0;
    
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) progressFill.style.width = `${Math.min(usagePercent, 100)}%`;

    document.getElementById('key-status').innerText = userData.active ? 'Ativa' : 'Inativa';
    document.getElementById('key-status').style.color = userData.active ? 'var(--success)' : 'var(--danger)';
    
    document.getElementById('key-role').innerText = userData.role.toUpperCase();
    document.getElementById('owner-name').innerText = userData.owner || 'Usuário';
    document.getElementById('welcome-msg').innerText = `Olá, ${userData.owner.split(' ')[0]}`;
    
    document.getElementById('created-date').innerText = new Date(userData.createdAt).toLocaleDateString('pt-BR');
    document.getElementById('last-used').innerText = userData.lastUsed ? new Date(userData.lastUsed).toLocaleTimeString('pt-BR') : 'Nunca';
    
    if (userData.expiresAt) {
        const expiry = new Date(userData.expiresAt);
        const now = new Date();
        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        document.getElementById('expiry-date').innerText = daysLeft > 0 ? `Expira em ${daysLeft} dias` : 'Expirada';
    }
}

function showUserSection(section) {
    const sections = ['overview', 'playground', 'webhooks', 'audit'];
    sections.forEach(s => {
        document.getElementById(`user-section-${s}`).style.display = s === section ? 'block' : 'none';
    });
    
    if (section === 'audit') loadUserAudit();
}

async function loadUserAudit() {
    const tbody = document.getElementById('user-audit-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Carregando logs...</td></tr>';
    
    try {
        const res = await fetch(`/api/user/audit?apikey=${userApiKey}`);
        const logs = await res.json();
        
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhuma atividade registrada</td></tr>';
            return;
        }
        
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                <td><code style="color: var(--primary);">${log.endpoint || log.action}</code></td>
                <td><span class="badge ${log.success !== false ? 'badge-success' : 'badge-danger'}">${log.success !== false ? 'Sucesso' : 'Erro'}</span></td>
                <td>${log.ip || '---'}</td>
            </tr>
        `).join('');
    } catch (e) { 
        console.error('Erro ao carregar logs:', e);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--danger);">Erro ao carregar histórico</td></tr>';
    }
}

async function testApi() {
    const endpoint = document.getElementById('pg-endpoint').value;
    const query = document.getElementById('pg-query').value;
    const resultEl = document.getElementById('pg-result');
    
    if (!query) return alert('Digite um parâmetro para teste');
    
    resultEl.style.display = 'block';
    resultEl.innerText = 'Executando requisição...';
    
    try {
        let url = `/api/consultas?tipo=${endpoint}&apikey=${userApiKey}`;
        if (endpoint === 'cpf') {
            url += `&cpf=${query}`;
        } else if (endpoint === 'infoff') {
            url += `&id=${query}`;
        } else if (endpoint === 'downloader' || endpoint === 'bypasscf' || endpoint === 'bypass') {
            url += `&url=${query}`;
        } else if (endpoint === 'github' || endpoint === 'roblox' || endpoint === 'tiktok') {
            url += `&username=${query}`;
        } else if (endpoint === 'video' || endpoint === 'nsfw') {
            url += `&prompt=${query}`;
        } else {
            url += `&q=${query}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        resultEl.innerText = JSON.stringify(data, null, 2);
    } catch (e) {
        resultEl.innerText = 'Erro na requisição: ' + e.message;
    }
}

async function saveWebhook() {
    const webhookUrl = document.getElementById('user-webhook-url').value;
    if (webhookUrl && !webhookUrl.startsWith('http')) return alert('URL inválida! Deve começar com http:// ou https://');
    
    try {
        const res = await fetch(`/api/user/webhooks?apikey=${userApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webhookUrl })
        });
        const data = await res.json();
        if (data.success) {
            alert('Webhook salvo com sucesso!');
            userData.webhookUrl = webhookUrl;
        }
    } catch (e) { alert('Erro ao salvar webhook'); }
}

function updateAlerts() {
    const container = document.getElementById('alerts-container');
    container.innerHTML = '';
    
    if (!userData.active) {
        container.innerHTML += `\n            <div class="alert alert-danger">\n                <i class="fas fa-exclamation-circle"></i>\n                <span>Sua API Key está inativa. Entre em contato com o suporte para reativá-la.</span>\n            </div>\n        `;\n    }\n    \n    if (userData.dailyLimit > 0 && userData.dailyUsage >= userData.dailyLimit * 0.8) {\n        container.innerHTML += `\n            <div class="alert alert-warning">\n                <i class="fas fa-exclamation-triangle"></i>\n                <span>Você está próximo do limite diário de requisições (${userData.dailyUsage}/${userData.dailyLimit}).</span>\n            </div>\n        `;\n    }\n    \n    if (userData.expiresAt) {\n        const expiry = new Date(userData.expiresAt);\n        const now = new Date();\n        const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));\n        \n        if (daysLeft <= 7) {\n            container.innerHTML += `\n                <div class="alert alert-warning">\n                    <i class="fas fa-calendar-times"></i>\n                    <span>Sua API Key expira em ${daysLeft} dias. Solicite renovação ao suporte.</span>\n                </div>\n            `;\n        }\n    }\n}\n\nfunction initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8080';
    socket = new WebSocket(`${protocol}//${host}`);
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'STATS_UPDATE') {
                // Atualizar dados do usuário se a chave estiver presente
                if (data.keys && data.keys[userApiKey]) {
                    const keyInfo = data.keys[userApiKey];
                    userData = { 
                        ...userData, 
                        usageCount: keyInfo.usageCount,
                        dailyUsage: keyInfo.dailyUsage,
                        dailyLimit: keyInfo.dailyLimit,
                        active: keyInfo.active,
                        lastUsed: keyInfo.lastUsed
                    };
                    updateDashboard();
                    updateAlerts();
                }
                
                // Atualizar gráficos em tempo real
                if (charts.usage) {
                    const now = new Date().getTime();
                    const seriesData = [...charts.usage.w.config.series[0].data];
                    seriesData.push({ x: now, y: userData ? userData.dailyUsage : 0 });
                    if (seriesData.length > 30) seriesData.shift();
                    charts.usage.updateSeries([{ data: seriesData }], true);
                }
                
                // Atualizar tabela de endpoints se houver dados globais ou específicos
                if (data.endpointHits) {
                    userData.endpointHits = data.endpointHits; // Simplificando para mostrar hits globais no dashboard do usuário por enquanto
                    updateEndpointTable();
                }
            }
        } catch (e) {
            console.error('Error parsing WebSocket message:', e);
        }
    };
    
    socket.onclose = () => {
        setTimeout(initWebSocket, 3000);
    };
}\n\nfunction initCharts() {
    const usageEl = document.querySelector('#usageChart');
    if (usageEl) {
        charts.usage = new ApexCharts(usageEl, {
            series: [{ name: 'Requisições', data: [] }],
            chart: { height: 300, type: 'area', background: 'transparent', toolbar: { show: false } },
            colors: ['#00f2ff'],
            stroke: { curve: 'smooth', width: 3 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0 } },
            xaxis: { type: 'datetime', labels: { style: { colors: '#a0a0a0' } } },
            yaxis: { labels: { style: { colors: '#a0a0a0' } } },
            theme: { mode: 'dark' }
        });
        charts.usage.render();
    }
    
    updateEndpointTable();
}

function updateCharts() {
    if (charts.usage && userData && userData.usageHistory) {
        const seriesData = userData.usageHistory.map(h => ({
            x: new Date(h.date).getTime(),
            y: h.count
        }));
        charts.usage.updateSeries([{ data: seriesData }], true);
    }
}\n}\n\nfunction updateEndpointTable() {\n    const tbody = document.getElementById('endpoints-table');\n    tbody.innerHTML = '';\n    \n    if (!userData || !userData.endpointHits) {\n        tbody.innerHTML = '<tr><td colspan=\"3\" style=\"text-align: center; color: var(--text-muted);\">Nenhum endpoint utilizado</td></tr>';\n        return;\n    }\n    \n    const total = Object.values(userData.endpointHits).reduce((a, b) => a + b, 0);\n    \n    Object.entries(userData.endpointHits).forEach(([endpoint, count]) => {\n        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;\n        tbody.innerHTML += `\n            <tr>\n                <td><strong>${endpoint}</strong></td>\n                <td>${count}</td>\n                <td>\n                    <div class=\"progress-bar\">\n                        <div class=\"progress-fill\" style=\"width: ${percentage}%;\"></div>\n                    </div>\n                    ${percentage}%\n                </td>\n            </tr>\n        `;\n    });\n}\n\nfunction toggleTheme() {\n    document.body.classList.toggle('light-mode');\n    const isLight = document.body.classList.contains('light-mode');\n    localStorage.setItem('mutanox_user_theme', isLight ? 'light' : 'dark');\n    document.getElementById('theme-icon').className = isLight ? 'fas fa-sun' : 'fas fa-moon';\n}\n\nfunction applySavedTheme() {\n    const saved = localStorage.getItem('mutanox_user_theme');\n    if (saved === 'light') {\n        document.body.classList.add('light-mode');\n        document.getElementById('theme-icon').className = 'fas fa-sun';\n    }\n}\n\nfunction copyApiKey() {\n    const key = document.getElementById('api-key-display').value;\n    navigator.clipboard.writeText(key).then(() => {\n        alert('API Key copiada para a área de transferência!');\n    });\n}\n\nfunction requestSupport() {\n    document.getElementById('support-modal').style.display = 'flex';\n}\n\nasync function sendSupport() {\n    const subject = document.getElementById('support-subject').value;\n    const message = document.getElementById('support-message').value;\n    \n    if (!subject || !message) {\n        alert('Preencha todos os campos');\n        return;\n    }\n    \n    try {\n        const res = await fetch(`/api/user/support?apikey=${sanitizeInput(userApiKey)}`, {\n            method: 'POST',\n            headers: { 'Content-Type': 'application/json' },\n            body: JSON.stringify({ subject, message })\n        });\n        \n        if ((await res.json()).success) {\n            alert('Solicitação enviada com sucesso!');\n            closeModal('support-modal');\n        }\n    } catch (e) {\n        alert('Erro ao enviar solicitação');\n    }\n}\n\nfunction closeModal(id) {\n    const modal = document.getElementById(id);\n    if (modal) modal.style.display = 'none';\n}\n
