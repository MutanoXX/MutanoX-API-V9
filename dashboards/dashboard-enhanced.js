// MutanoX Dashboard Enhanced JS - V10
// Funcionalidades adicionais para o dashboard admin

// ==========================================
// FUNÇÕES DE MODAL
// ==========================================

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado para a área de transferência!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        showToast('Erro ao copiar', 'error');
    });
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
        z-index: 10000;
    `;

    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

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
                document.getElementById('db-size').innerText = data.size || '0KB';
            }
            if (document.getElementById('db-protected')) {
                document.getElementById('db-protected').innerText = data.protectedCount || 0;
            }
            if (document.getElementById('db-last-update')) {
                const lastUpdate = data.lastUpdate ? new Date(data.lastUpdate).toLocaleString('pt-BR') : '-';
                document.getElementById('db-last-update').innerText = lastUpdate;
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
                if (data.users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 20px;">Nenhum usuário protegido encontrado</td></tr>';
                } else {
                    tbody.innerHTML = data.users.map(user => `
                        <tr>
                            <td style="font-family: monospace; font-size: 11px;">${user.id.substring(0, 8)}...</td>
                            <td>${user.cpf || '-'}</td>
                            <td>${user.nome || '-'}</td>
                            <td>${user.numero || '-'}</td>
                            <td><span class="badge ${user.active ? 'badge-success' : 'badge-danger'}">${user.active ? 'ATIVO' : 'INATIVO'}</span></td>
                            <td style="font-size: 11px;">${user.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : '-'}</td>
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn btn-sm" onclick="editProtectedUser('${user.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);" onclick="deleteProtectedUser('${user.id}')" title="Excluir"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (e) {
        console.error('Erro ao carregar usuários protegidos:', e);
        if (document.querySelector('#protected-users-table tbody')) {
            document.querySelector('#protected-users-table tbody').innerHTML =
                '<tr><td colspan="7" style="text-align:center; color: var(--danger);">Erro ao carregar dados</td></tr>';
        }
    }
}

function openAddProtectedModal() {
    // Limpar campos
    document.getElementById('add-protected-cpf').value = '';
    document.getElementById('add-protected-nome').value = '';
    document.getElementById('add-protected-numero').value = '';
    openModal('add-protected-modal');
}

async function addProtectedUser() {
    const cpf = document.getElementById('add-protected-cpf')?.value.trim();
    const nome = document.getElementById('add-protected-nome')?.value.trim();
    const numero = document.getElementById('add-protected-numero')?.value.trim();

    if (!cpf && !nome && !numero) {
        showToast('Preencha pelo menos um campo', 'error');
        return;
    }

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
            loadDatabaseStats();
            closeModal('add-protected-modal');
        } else {
            showToast(data.error || 'Erro ao adicionar usuário protegido', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
        console.error(e);
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
            loadDatabaseStats();
        } else {
            showToast(data.error || 'Erro ao remover proteção', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

function editProtectedUser(id) {
    // TODO: Implementar edição de usuário protegido
    showToast('Funcionalidade de edição em desenvolvimento', 'warning');
}

async function exportProtectedUsers() {
    try {
        const res = await fetch(`/api/admin/protection/list?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            const csv = [
                ['ID', 'CPF', 'Nome', 'Número', 'Status', 'Criado em'].join(','),
                ...data.users.map(u => [
                    u.id, u.cpf || '', u.nome || '', u.numero || '',
                    u.active ? 'ATIVO' : 'INATIVO',
                    u.createdAt || ''
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `usuarios_protegidos_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Arquivo CSV exportado com sucesso!', 'success');
        }
    } catch (e) {
        showToast('Erro ao exportar CSV', 'error');
    }
}

async function clearExpiredProtections() {
    if (!confirm('Tem certeza que deseja limpar todas as proteções expiradas?')) return;

    showToast('Funcionalidade em desenvolvimento', 'warning');
}

async function backupDatabase() {
    showToast('Gerando backup...', 'success');
    // TODO: Implementar backup completo
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
                    const total = (data.cache.hits || 0) + (data.cache.misses || 0);
                    const rate = total > 0 ? ((data.cache.hits / total) * 100).toFixed(2) : 0;
                    cacheHitRate.innerText = `${rate}%`;
                }
            }

            // Atualizar uso de memória
            if (data.memory) {
                const memUsed = document.getElementById('memory-used');
                const memTotal = document.getElementById('memory-total');
                if (memUsed) memUsed.innerText = `${data.memory.used || 0}MB`;
                if (memTotal) memTotal.innerText = `${data.memory.total || 0}MB`;
            }

            // Atualizar tabela de cache
            if (data.cache.entries && data.cache.entries.length > 0) {
                const tbody = document.querySelector('#cache-table tbody');
                if (tbody) {
                    tbody.innerHTML = data.cache.entries.slice(0, 20).map(entry => `
                        <tr>
                            <td style="font-family: monospace; font-size: 10px;">${entry.key}</td>
                            <td>${entry.size || 0} bytes</td>
                            <td>${entry.ttl || 0}s</td>
                            <td>${entry.hits || 0}</td>
                            <td style="font-size: 11px;">${entry.createdAt ? new Date(entry.createdAt).toLocaleString('pt-BR') : '-'}</td>
                            <td>
                                <button class="btn btn-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);" onclick="clearCacheEntry('${entry.key}')"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            } else if (document.querySelector('#cache-table tbody')) {
                document.querySelector('#cache-table tbody').innerHTML =
                    '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">Nenhuma entrada no cache</td></tr>';
            }
        }
    } catch (e) {
        console.error('Erro ao carregar estatísticas de performance:', e);
        if (document.querySelector('#cache-table tbody')) {
            document.querySelector('#cache-table tbody').innerHTML =
                '<tr><td colspan="6" style="text-align:center; color: var(--danger);">Erro ao carregar dados de cache</td></tr>';
        }
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
    const endpoint = document.getElementById('cache-endpoint-name')?.value.trim();
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

async function clearCacheEntry(key) {
    // Simplificação: limpar todo o cache do endpoint correspondente
    const endpoint = key.split(':')[0] || '';
    if (endpoint) {
        await clearEndpointCacheWithName(endpoint);
    }
}

async function clearEndpointCacheWithName(endpoint) {
    try {
        const res = await fetch(`/api/admin/cache/clear?apikey=${adminKey}&endpoint=${endpoint}`);
        const data = await res.json();
        if (data.success) {
            showToast(`Entrada do cache limpa!`, 'success');
            loadPerformanceStats();
        }
    } catch (e) {
        console.error('Erro ao limpar entrada do cache:', e);
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
        if (document.getElementById('miniservices-container')) {
            document.getElementById('miniservices-container').innerHTML =
                '<div style="text-align:center; color: var(--danger); padding: 20px;">Erro ao carregar mini services</div>';
        }
    }
}

function renderMiniServices() {
    const container = document.getElementById('miniservices-container');
    if (!container) return;

    const servicesArray = Object.entries(miniServicesData);
    if (servicesArray.length === 0) {
        container.innerHTML = '<div style="text-align:center; color: var(--text-muted); padding: 40px;">Nenhum mini service cadastrado</div>';
        return;
    }

    container.innerHTML = servicesArray.map(([id, service]) => `
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
            <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 15px; gap: 10px;">
                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 10px; color: var(--text-muted);">TOTAL REQUESTS</div>
                    <div style="font-weight: 800; color: var(--primary);">${service.stats?.totalRequests || 0}</div>
                </div>
                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 10px; color: var(--text-muted);">DAILY REQUESTS</div>
                    <div style="font-weight: 800; color: var(--secondary);">${service.stats?.dailyRequests || 0}</div>
                </div>
                <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 10px; color: var(--text-muted);">ERROR RATE</div>
                    <div style="font-weight: 800; color: ${service.stats?.errorRate > 10 ? 'var(--danger)' : 'var(--success)'};">${service.stats?.errorRate || 0}%</div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;">
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
            <div style="padding: 12px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
                <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 8px;">API KEY (NÃO COMPARTILHE)</div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                    <code style="font-family: monospace; font-size: 11px; color: var(--primary); word-break: break-all; flex: 1;">${service.apiKey}</code>
                    <i class="fas fa-copy" style="cursor: pointer; color: var(--text-muted); flex-shrink: 0;" onclick="copyToClipboard('${service.apiKey}')"></i>
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
            updateMiniServiceStats();
        } else {
            showToast(data.error || 'Erro ao atualizar mini service', 'error');
            service.enabled = !service.enabled; // Reverter
            renderMiniServices();
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
        service.enabled = !service.enabled; // Reverter
        renderMiniServices();
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
            miniServicesData[id].stats.totalRequests = 0;
            miniServicesData[id].stats.dailyRequests = 0;
            showToast('Nova API key gerada com sucesso!', 'success');
            renderMiniServices();
            updateMiniServiceStats();
        } else {
            showToast(data.error || 'Erro ao gerar nova API key', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

function openMiniServiceSettings(id) {
    const service = miniServicesData[id];
    if (!service) return;

    // Preencher modal de configurações
    document.getElementById('ms-settings-id').value = id;
    document.getElementById('ms-settings-name').value = service.name;
    document.getElementById('ms-settings-rateLimit').value = service.settings?.rateLimit || 10;
    document.getElementById('ms-settings-allowFree').checked = service.settings?.allowFree || false;

    openModal('ms-settings-modal');
}

async function saveMiniServiceSettings() {
    const id = document.getElementById('ms-settings-id').value;
    const name = document.getElementById('ms-settings-name').value.trim();
    const rateLimit = parseInt(document.getElementById('ms-settings-rateLimit').value);
    const allowFree = document.getElementById('ms-settings-allowFree').checked;

    if (!name) {
        showToast('Nome é obrigatório', 'error');
        return;
    }

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
            showToast(data.error || 'Erro ao salvar configurações', 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

function viewMiniServiceLogs(id) {
    // TODO: Implementar visualização de logs do mini service
    showToast('Logs do mini service em desenvolvimento', 'warning');
}

function openAddMiniServiceModal() {
    // TODO: Implementar adição de novo mini service
    showToast('Funcionalidade de adicionar mini service em desenvolvimento', 'warning');
}

function updateMiniServiceStats() {
    // Atualizar estatísticas globais de mini services
    const totalRequests = Object.values(miniServicesData).reduce((sum, s) => sum + (s.stats?.totalRequests || 0), 0);
    const totalDaily = Object.values(miniServicesData).reduce((sum, s) => sum + (s.stats?.dailyRequests || 0), 0);
    const enabledCount = Object.values(miniServicesData).filter(s => s.enabled).length;
    const totalServices = Object.keys(miniServicesData).length;
    const errorRateAvg = totalServices > 0
        ? (Object.values(miniServicesData).reduce((sum, s) => sum + (s.stats?.errorRate || 0), 0) / totalServices).toFixed(2)
        : 0;

    if (document.getElementById('ms-total-requests')) {
        document.getElementById('ms-total-requests').innerText = totalRequests;
    }
    if (document.getElementById('ms-daily-requests')) {
        document.getElementById('ms-daily-requests').innerText = totalDaily;
    }
    if (document.getElementById('ms-enabled')) {
        document.getElementById('ms-enabled').innerText = `${enabledCount}/${totalServices}`;
    }
    if (document.getElementById('ms-error-rate')) {
        document.getElementById('ms-error-rate').innerText = `${errorRateAvg}%`;
    }
}

// ==========================================
// AUDITORIA
// ==========================================

async function loadAudit() {
    try {
        const res = await fetch(`/api/admin/audit?apikey=${adminKey}`);
        const data = await res.json();
        if (data.success) {
            const tbody = document.querySelector('#audit-table tbody');
            if (tbody) {
                if (data.logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 20px;">Nenhum log encontrado</td></tr>';
                } else {
                    tbody.innerHTML = data.logs.slice(0, 50).map(log => `
                        <tr>
                            <td style="font-size: 11px;">${log.timestamp || ''}</td>
                            <td><span class="badge">${log.type || '-'}</span></td>
                            <td style="font-family: monospace; font-size: 11px;">${log.apiKey || '-'}</td>
                            <td>${log.action || '-'}</td>
                            <td style="font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.details || '-'}</td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (e) {
        console.error('Erro ao carregar logs de auditoria:', e);
        if (document.querySelector('#audit-table tbody')) {
            document.querySelector('#audit-table tbody').innerHTML =
                '<tr><td colspan="6" style="text-align:center; color: var(--danger);">Erro ao carregar logs</td></tr>';
        }
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados das seções melhoradas quando elas forem abertas
    const originalShowSection = window.showSection;
    if (originalShowSection) {
        window.showSection = function(sectionId) {
            originalShowSection(sectionId);

            if (sectionId === 'database') {
                loadDatabaseStats();
                loadProtectedUsers();
            } else if (sectionId === 'performance') {
                loadPerformanceStats();
            } else if (sectionId === 'miniservice') {
                loadMiniServices();
            } else if (sectionId === 'audit') {
                loadAudit();
            }
        };
    }
});
