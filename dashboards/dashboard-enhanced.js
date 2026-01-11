// MutanoX Dashboard Enhanced JS - V10
// Funcionalidades adicionais para o dashboard admin

// ==========================================
// GERENCIAR BASE - Funcionalidades Reais
// ==========================================

async function loadDatabaseStats() {
    try {
        const res = await fetch(`/api/admin/database/stats?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            // Atualizar estatísticas reais
            if (document.getElementById('db-total-records')) {
                document.getElementById('db-total-records').innerText = data.totalRecords || 0;
            }
            if (document.getElementById('db-size')) {
                document.getElementById('db-size').innerText = data.size || '0MB';
            }
            if (document.getElementById('db-protected')) {
                document.getElementById('db-protected').innerText = data.protectedCount || 0;
            }
        }
    } catch (e) {
        console.error('Erro ao carregar estatísticas do banco:', e);
    }
}

async function loadProtectedUsers() {
    try {
        const res = await fetch(`/api/admin/protection/list?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            const tbody = document.querySelector('#protected-users-table tbody');
            if (tbody) {
                tbody.innerHTML = data.users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.cpf || '-'}</td>
                        <td>${user.nome || '-'}</td>
                        <td>${user.numero || '-'}</td>
                        <td><span class="badge ${user.active ? 'badge-success' : 'badge-danger'}">${user.active ? 'ATIVO' : 'INATIVO'}</span></td>
                        <td>${user.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '-'}</td>
                        <td>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-sm" onclick="editProtectedUser('${user.id}')"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);" onclick="deleteProtectedUser('${user.id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Erro ao carregar usuários protegidos:', e);
    }
}

async function addProtectedUser() {
    const cpf = document.getElementById('add-protected-cpf')?.value;
    const nome = document.getElementById('add-protected-nome')?.value;
    const numero = document.getElementById('add-protected-numero')?.value;

    try {
        const res = await fetch(`/api/admin/protection/add?apikey=${adminKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf, nome, numero })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Usuário protegido adicionado com sucesso!', 'success');
            loadProtectedUsers();
            closeModal('add-protected-modal');
        } else {
            showToast('Erro ao adicionar usuário protegido', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

async function deleteProtectedUser(id) {
    if (!confirm('Tem certeza que deseja remover esta proteção?')) return;

    try {
        const res = await fetch(`/api/admin/protection/delete?apikey=${adminKey}&id=${id}`);
        const data = await res.json();
        if (data.success) {
            showToast('Proteção removida com sucesso!', 'success');
            loadProtectedUsers();
        } else {
            showToast('Erro ao remover proteção', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

// ==========================================
// PERFORMANCE & CACHE - Funcionalidades Avançadas
// ==========================================

async function loadPerformanceStats() {
    try {
        const res = await fetch(`/api/admin/performance/stats?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            // Atualizar métricas de cache
            if (data.cache) {
                const cacheSize = document.getElementById('cache-size');
                const cacheHits = document.getElementById('cache-hits');
                const cacheMisses = document.getElementById('cache-misses');
                const cacheHitRate = document.getElementById('cache-hit-rate');

                if (cacheSize) cacheSize.innerText = `${data.cache.size || 0} entradas`;
                if (cacheHits) cacheHits.innerText = data.cache.hits || 0;
                if (cacheMisses) cacheMisses.innerText = data.cache.misses || 0;
                if (cacheHitRate) {
                    const rate = data.cache.hits && data.cache.total ? ((data.cache.hits / data.cache.total) * 100).toFixed(2) : 0;
                    cacheHitRate.innerText = `${rate}%`;
                }
            }

            // Atualizar latência média por endpoint
            if (data.endpointLatency && typeof updateLatencyChart === 'function') {
                updateLatencyChart(data.endpointLatency);
            }

            // Atualizar uso de memória
            if (data.memory) {
                const memUsed = document.getElementById('memory-used');
                const memTotal = document.getElementById('memory-total');
                if (memUsed) memUsed.innerText = `${data.memory.used || 0}MB`;
                if (memTotal) memTotal.innerText = `${data.memory.total || 0}MB`;
            }
        }
    } catch (e) {
        console.error('Erro ao carregar estatísticas de performance:', e);
    }
}

async function clearSystemCache() {
    if (!confirm('Tem certeza que deseja limpar todo o cache?')) return;

    try {
        const res = await fetch(`/api/admin/cache/clear?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            showToast('Cache limpo com sucesso!', 'success');
            loadPerformanceStats();
        } else {
            showToast('Erro ao limpar cache', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

async function clearEndpointCache() {
    const endpoint = document.getElementById('cache-endpoint-name')?.value;
    if (!endpoint) {
        showToast('Digite o nome do endpoint', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/admin/cache/clear?apikey=${adminKey}&endpoint=${endpoint}`);
        const data = await res.json();
        if (data.success) {
            showToast(`Cache do endpoint ${endpoint} limpo com sucesso!`, 'success');
            document.getElementById('cache-endpoint-name').value = '';
            loadPerformanceStats();
        } else {
            showToast('Erro ao limpar cache do endpoint', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

async function loadCacheEntries() {
    try {
        const res = await fetch(`/api/admin/cache/entries?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            const tbody = document.querySelector('#cache-table tbody');
            if (tbody) {
                tbody.innerHTML = data.entries.map(entry => `
                    <tr>
                        <td style="font-family: monospace; font-size: 11px;">${entry.key.substring(0, 40)}...</td>
                        <td>${entry.size || 0} bytes</td>
                        <td>${entry.ttl || 0}s</td>
                        <td>${entry.hits || 0}</td>
                        <td>${entry.createdAt ? new Date(entry.createdAt).toLocaleString('pt-BR') : '-'}</td>
                        <td>
                            <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);" onclick="clearCacheEntry('${entry.key}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (e) {
        console.error('Erro ao carregar entradas do cache:', e);
    }
}

// ==========================================
// MINI SERVICE - Sistema Avançado
// ==========================================

let miniServicesData = {};

async function loadMiniServices() {
    try {
        const res = await fetch(`/api/admin/miniservices/list?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            miniServicesData = data.services || {};
            renderMiniServices();
            updateMiniServiceStats();
        }
    } catch (e) {
        console.error('Erro ao carregar mini services:', e);
    }
}

function renderMiniServices() {
    const container = document.getElementById('miniservices-container');
    if (!container) return;

    container.innerHTML = Object.entries(miniServicesData).map(([id, service]) => `
        <div class="card" style="margin-bottom: 15px; border-left: 4px solid ${service.enabled ? 'var(--success)' : 'var(--danger)'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div>
                    <h3 style="color: var(--primary); font-weight: 700; margin-bottom: 5px;">${service.name}</h3>
                    <p style="color: var(--text-muted); font-size: 12px;">${service.path}</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <span class="badge ${service.enabled ? 'badge-success' : 'badge-danger'}">${service.enabled ? 'ATIVO' : 'INATIVO'}</span>
                </div>
            </div>
            <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 15px;">
                <div>
                    <div style="font-size: 10px; color: var(--text-muted);">TOTAL REQUESTS</div>
                    <div style="font-weight: 800; color: var(--primary);">${service.stats?.totalRequests || 0}</div>
                </div>
                <div>
                    <div style="font-size: 10px; color: var(--text-muted);">DAILY REQUESTS</div>
                    <div style="font-weight: 800; color: var(--secondary);">${service.stats?.dailyRequests || 0}</div>
                </div>
                <div>
                    <div style="font-size: 10px; color: var(--text-muted);">ERROR RATE</div>
                    <div style="font-weight: 800; color: ${service.stats?.errorRate > 10 ? 'var(--danger)' : 'var(--success)'};">${service.stats?.errorRate || 0}%</div>
                </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-sm" onclick="toggleMiniService('${id}')">
                    <i class="fas fa-${service.enabled ? 'pause' : 'play'}"></i>
                    ${service.enabled ? 'Pausar' : 'Ativar'}
                </button>
                <button class="btn btn-sm" onclick="openMiniServiceSettings('${id}')">
                    <i class="fas fa-cog"></i> Configurar
                </button>
                <button class="btn btn-sm" onclick="viewMiniServiceLogs('${id}')">
                    <i class="fas fa-file-alt"></i> Logs
                </button>
                <button class="btn btn-sm" onclick="regenerateMiniServiceKey('${id}')" style="background: rgba(112, 0, 255, 0.1); color: var(--secondary);">
                    <i class="fas fa-key"></i> Regenerar API Key
                </button>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
                <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 5px;">API KEY (NÃO COMPARTILHE)</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <code style="font-family: monospace; font-size: 12px; color: var(--primary);">${service.apiKey}</code>
                    <i class="fas fa-copy" style="cursor: pointer; color: var(--text-muted);" onclick="copyToClipboard('${service.apiKey}')"></i>
                </div>
            </div>
        </div>
    `).join('');
}

async function toggleMiniService(id) {
    const service = miniServicesData[id];
    if (!service) return;

    service.enabled = !service.enabled;

    try {
        const res = await fetch(`/api/admin/miniservices/update?apikey=${adminKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, enabled: service.enabled })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Mini service ${service.enabled ? 'ativado' : 'desativado'} com sucesso!`, 'success');
            renderMiniServices();
        } else {
            showToast('Erro ao atualizar mini service', 'error');
            service.enabled = !service.enabled; // Reverter
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
        service.enabled = !service.enabled; // Reverter
    }
}

async function regenerateMiniServiceKey(id) {
    if (!confirm('Tem certeza que deseja regenerar a API key deste mini service? A key antiga será invalidada.')) return;

    try {
        const res = await fetch(`/api/admin/miniservices/regenerate-key?apikey=${adminKey}&id=${id}`, {
            method: 'POST'
        });
        const data = await res.json();
        if (data.success) {
            miniServicesData[id].apiKey = data.newKey;
            showToast('Nova API key gerada com sucesso!', 'success');
            renderMiniServices();
        } else {
            showToast('Erro ao gerar nova API key', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

async function openMiniServiceSettings(id) {
    const service = miniServicesData[id];
    if (!service) return;

    // Preencher modal de configurações
    document.getElementById('ms-settings-id').value = id;
    document.getElementById('ms-settings-name').value = service.name;
    document.getElementById('ms-settings-rateLimit').value = service.settings?.rateLimit || 10;
    document.getElementById('ms-settings-allowFree').checked = service.settings?.allowFree || false;

    document.getElementById('ms-settings-modal').style.display = 'flex';
}

async function saveMiniServiceSettings() {
    const id = document.getElementById('ms-settings-id').value;
    const name = document.getElementById('ms-settings-name').value;
    const rateLimit = parseInt(document.getElementById('ms-settings-rateLimit').value);
    const allowFree = document.getElementById('ms-settings-allowFree').checked;

    try {
        const res = await fetch(`/api/admin/miniservices/update?apikey=${adminKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, settings: { name, rateLimit, allowFree } })
        });
        const data = await res.json();
        if (data.success) {
            miniServicesData[id].name = name;
            miniServicesData[id].settings.rateLimit = rateLimit;
            miniServicesData[id].settings.allowFree = allowFree;
            showToast('Configurações salvas com sucesso!', 'success');
            renderMiniServices();
            closeModal('ms-settings-modal');
        } else {
            showToast('Erro ao salvar configurações', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

function updateMiniServiceStats() {
    // Atualizar estatísticas globais de mini services
    const totalRequests = Object.values(miniServicesData).reduce((sum, s) => sum + (s.stats?.totalRequests || 0), 0);
    const totalDaily = Object.values(miniServicesData).reduce((sum, s) => sum + (s.stats?.dailyRequests || 0), 0);
    const enabledCount = Object.values(miniServicesData).filter(s => s.enabled).length;

    if (document.getElementById('ms-total-requests')) {
        document.getElementById('ms-total-requests').innerText = totalRequests;
    }
    if (document.getElementById('ms-daily-requests')) {
        document.getElementById('ms-daily-requests').innerText = totalDaily;
    }
    if (document.getElementById('ms-enabled')) {
        document.getElementById('ms-enabled').innerText = `${enabledCount}/${Object.keys(miniServicesData).length}`;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados das seções melhoradas quando elas forem abertas
    const originalShowSection = window.showSection;
    window.showSection = function(sectionId) {
        originalShowSection(sectionId);

        if (sectionId === 'database') {
            loadDatabaseStats();
            loadProtectedUsers();
        } else if (sectionId === 'performance') {
            loadPerformanceStats();
            loadCacheEntries();
        } else if (sectionId === 'miniservice') {
            loadMiniServices();
        }
    };
});
