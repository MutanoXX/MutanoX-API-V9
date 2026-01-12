// MutanoX Consultas - Versão Moderna
// API Key do Mini Service
let miniServiceApiKey = null;

// Traduções
const translations = {
    pt: {
        pageTitle: "Consultas Inteligentes",
        pageSubtitle: "Busque CPFs, nomes ou números na nossa base de dados",
        typeLabel: "Tipo de Consulta",
        inputLabel: "Dados para Consulta",
        btnText: "Consultar Agora",
        btnSearching: "Consultando...",
        resultsTitle: "Histórico de Consultas",
        clearHistory: "Limpar Histórico",
        emptyState: "Nenhuma consulta realizada ainda",
        emptyHint: "Faça sua primeira consulta acima!",
        placeholders: {
            cpf: "000.000.000-00",
            nome: "João da Silva",
            numero: "11999999999"
        },
        copySuccess: "Copiado para a área de transferência!",
        deleteConfirm: "Deseja excluir esta consulta do histórico?",
        loading: "Carregando dados...",
        noResults: "Nenhum dado encontrado",
        errorOccurred: "Erro ao realizar consulta",
        copying: "Copiando..."
    },
    en: {
        pageTitle: "Smart Queries",
        pageSubtitle: "Search for CPFs, names or phone numbers in our database",
        typeLabel: "Query Type",
        inputLabel: "Data to Search",
        btnText: "Search Now",
        btnSearching: "Searching...",
        resultsTitle: "Query History",
        clearHistory: "Clear History",
        emptyState: "No queries performed yet",
        emptyHint: "Make your first query above!",
        placeholders: {
            cpf: "000.000.000-00",
            nome: "John Doe",
            numero: "11999999999"
        },
        copySuccess: "Copied to clipboard!",
        deleteConfirm: "Delete this query from history?",
        loading: "Loading data...",
        noResults: "No data found",
        errorOccurred: "Error performing query",
        copying: "Copying..."
    }
};

let currentLang = localStorage.getItem('mutanox_lang') || 'pt';

// Histórico de consultas
let queryHistory = JSON.parse(localStorage.getItem('mutanox_query_history') || '[]');

// Elementos DOM
const searchType = document.getElementById('search-type');
const searchQuery = document.getElementById('search-query');
const searchBtn = document.getElementById('search-btn');
const btnText = document.getElementById('btn-text');
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');
const emptyState = document.getElementById('empty-state');
const queueStatus = document.getElementById('queue-status');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Consultas Modernas iniciadas');

    // Pequeno delay para garantir que o DOM esteja completamente carregado
    setTimeout(() => {
        loadLanguage();
        loadMiniServiceKey();
        renderHistory();
    }, 100);
});

// Carregar API Key do Mini Service
async function loadMiniServiceKey() {
    try {
        // Tentar usar uma key embutida por enquanto o servidor não responde
        const res = await fetch('/api/admin/miniservice/list?apikey=MutanoX3397');
        const data = await res.json();

        if (data.success && data.services && data.services.consultas) {
            miniServiceApiKey = data.services.consultas.apiKey;
            console.log('API Key do mini service carregada:', miniServiceApiKey.substring(0, 8) + '...');
        } else {
            // Usar key padrão como fallback
            miniServiceApiKey = 'MS-CONSULTAS-A1B2C3D4E5F6';
            console.log('Usando API key padrão (fallback)');
        }
    } catch (e) {
        console.error('Erro ao carregar API key:', e);
        // Fallback para key padrão
        miniServiceApiKey = 'MS-CONSULTAS-A1B2C3D4E5F6';
    }
}

// Gerenciamento de Idioma
function loadLanguage() {
    currentLang = localStorage.getItem('mutanox_lang') || 'pt';

    // Detectar idioma do navegador se não houver preferência
    if (!localStorage.getItem('mutanox_lang')) {
        const userLang = navigator.language || navigator.userLanguage;
        currentLang = userLang.startsWith('pt') ? 'pt' : 'en';
        localStorage.setItem('mutanox_lang', currentLang);
    }

    applyLanguage(currentLang);
}

function applyLanguage(lang) {
    const t = translations[lang];

    // Verificar se elementos existem antes de manipulá-los
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const typeLabel = document.getElementById('type-label');
    const inputLabel = document.getElementById('input-label');
    const btnTextEl = document.getElementById('btn-text');
    const resultsTitleText = document.getElementById('results-title-text');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const emptyStatePara1 = emptyState.querySelector('p:first-child');
    const emptyStatePara2 = emptyState.querySelectorAll('p')[1];

    if (pageTitle) pageTitle.textContent = t.pageTitle;
    if (pageSubtitle) pageSubtitle.textContent = t.pageSubtitle;
    if (typeLabel) typeLabel.textContent = t.typeLabel;
    if (inputLabel) inputLabel.textContent = t.inputLabel;
    if (btnTextEl) btnTextEl.textContent = t.btnText;
    if (resultsTitleText) resultsTitleText.textContent = t.resultsTitle;
    if (clearHistoryBtn) clearHistoryBtn.innerHTML = `<i class="fas fa-trash-alt"></i> ${t.clearHistory}`;
    if (emptyStatePara1) emptyStatePara1.textContent = t.emptyState;
    if (emptyStatePara2) emptyStatePara2.textContent = t.emptyHint;

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.innerHTML = `<i class="fas fa-globe"></i> ${lang.toUpperCase()}`;

    updatePlaceholder();
}

function toggleLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    localStorage.setItem('mutanox_lang', currentLang);
    applyLanguage(currentLang);
}

function updatePlaceholder() {
    const type = searchType.value;
    const t = translations[currentLang];

    const placeholders = {
        cpf: t.placeholders.cpf,
        nome: t.placeholders.nome,
        numero: t.placeholders.numero
    };

    searchQuery.placeholder = placeholders[type] || '';
}

searchType.addEventListener('change', updatePlaceholder);

// Realizar Consulta
async function performSearch() {
    const type = searchType.value;
    const query = searchQuery.value.trim();

    if (!query) {
        showToast(translations[currentLang].errorOccurred, 'error');
        searchQuery.focus();
        return;
    }

    // Mostrar estado de loading
    setLoading(true);
    resultsSection.style.display = 'none';
    emptyState.style.display = 'none';
    queueStatus.style.display = 'none';

    try {
        let requestUrl = `/api/consultas?tipo=${type}&mskey=${encodeURIComponent(miniServiceApiKey)}`;

        if (type === 'cpf') {
            requestUrl += `&cpf=${encodeURIComponent(query)}`;
        } else {
            requestUrl += `&q=${encodeURIComponent(query)}`;
        }

        console.log('Fazendo requisição para:', requestUrl);

        const res = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Status da resposta:', res.status);

        if (res.status === 429) {
            queueStatus.style.display = 'flex';
            setTimeout(performSearch, 3000);
            setLoading(false);
            return;
        }

        // Verificar se a resposta é HTML (erro de servidor)
        const contentType = res.headers.get('content-type');
        const responseText = await res.text();

        console.log('Content-Type:', contentType);
        console.log('Resposta recebida (primeiros 200 chars):', responseText.substring(0, 200));

        // Verificar se é HTML
        if (contentType && contentType.includes('text/html')) {
            throw new Error('O servidor retornou uma página HTML em vez de dados JSON. Verifique os logs do servidor.');
        }

        // Verificar se parece HTML
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            throw new Error('Resposta inválida do servidor (HTML recebido em vez de JSON).');
        }

        // Tentar fazer parse como JSON
        const data = JSON.parse(responseText);
        setLoading(false);

        if (data.sucesso === false) {
            const errorMsg = data.erro || data.mensagem || translations[currentLang].errorOccurred;
            console.error('Erro na consulta:', errorMsg);
            showToast(errorMsg, 'error');
        } else {
            showToast('Consulta realizada com sucesso!', 'success');

            // Adicionar ao histórico
            const historyItem = {
                id: Date.now(),
                type,
                query,
                result: data.dados || data.resultados || data,
                timestamp: new Date().toISOString()
            };

            queryHistory.unshift(historyItem);

            // Limitar histórico a 20 itens
            if (queryHistory.length > 20) {
                queryHistory = queryHistory.slice(0, 20);
            }

            saveHistory();
            renderHistory();
        }
    } catch (e) {
        console.error('Erro na consulta:', e);
        console.error('Detalhes do erro:', {
            message: e.message,
            stack: e.stack
        });

        setLoading(false);

        // Mensagens específicas para diferentes tipos de erro
        if (e.message.includes('HTML')) {
            showToast('Erro no servidor. Tente novamente em alguns instantes.', 'error');
        } else if (e.name === 'SyntaxError' && e.message.includes('JSON')) {
            showToast('Erro ao processar resposta do servidor. Tente novamente.', 'error');
        } else if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
            showToast('Erro de conexão. Verifique sua internet.', 'error');
        } else {
            showToast(translations[currentLang].errorOccurred, 'error');
        }
    }
}

// Estado de Loading
function setLoading(loading) {
    if (loading) {
        searchBtn.disabled = true;
        btnText.textContent = translations[currentLang].btnSearching;
        searchBtn.innerHTML = `
            <div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px; margin: 0;"></div>
            <span>${translations[currentLang].btnSearching}</span>
        `;
    } else {
        searchBtn.disabled = false;
        searchBtn.innerHTML = `<i class="fas fa-search btn-icon"></i> <span>${translations[currentLang].btnText}</span>`;
    }
}

// Gerenciar Histórico
function saveHistory() {
    localStorage.setItem('mutanox_query_history', JSON.stringify(queryHistory));
}

function renderHistory() {
    if (queryHistory.length === 0) {
        emptyState.style.display = 'block';
        resultsSection.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    resultsSection.style.display = 'block';

    resultsGrid.innerHTML = queryHistory.map(item => {
        const t = translations[currentLang];
        const typeLabels = { cpf: 'CPF', nome: 'Nome', numero: 'Telefone' };
        const typeLabel = typeLabels[item.type] || item.type.toUpperCase();
        const resultData = formatResultData(item.result);

        return `
            <div class="result-card">
                <div class="result-header">
                    <div class="result-type">
                        <i class="fas fa-${item.type === 'cpf' ? 'id-card' : item.type === 'nome' ? 'user' : 'phone'}"></i>
                        <span>${typeLabel}</span>
                    </div>
                    <div class="result-actions">
                        <button class="copy-btn" onclick="copyResult(${item.id})" title="Copiar resultado">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteResult(${item.id})" title="Excluir do histórico">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="result-content">
                    ${resultData}
                </div>
                <div class="result-timestamp">
                    <i class="fas fa-clock"></i> ${formatTimestamp(item.timestamp)}
                </div>
            </div>
        `;
    }).join('');
}

function formatResultData(data) {
    if (!data) return '<p class="no-results">Nenhum dado encontrado</p>';

    if (typeof data === 'string') {
        return `<p>${escapeHtml(data)}</p>`;
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            return '<p class="no-results">Nenhum dado encontrado</p>';
        }
        return data.map((item, index) => `
            <div style="padding: 0.5rem 0; border-top: 1px solid var(--border);">
                <strong>Item #${index + 1}</strong>
                ${formatObjectData(item)}
            </div>
        `).join('');
    }

    return formatObjectData(data);
}

function formatObjectData(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return `<p>${escapeHtml(String(obj))}</p>`;
    }

    return Object.entries(obj).map(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
        const displayValue = formatValue(value);

        return `
            <div class="result-item">
                <span class="result-label">${label}:</span>
                <span class="result-value">${displayValue}</span>
            </div>
        `;
    }).join('');
}

function formatValue(value) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    if (typeof value === 'string') {
        if (value.startsWith('http')) {
            return `<a href="${value}" target="_blank" style="color: var(--primary-light);">${escapeHtml(value)}</a>`;
        }
        return escapeHtml(value);
    }

    if (typeof value === 'object') {
        return '[Objeto Complexo]';
    }

    return String(value);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;

    // Se for menos de 1 minuto, mostrar "agora mesmo"
    if (diffMs < 60000) {
        return 'Agora mesmo';
    }

    // Se for menos de 1 hora, mostrar minutos
    if (diffMs < 3600000) {
        const minutes = Math.floor(diffMs / 60000);
        return `Há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }

    // Se for menos de 24 horas, mostrar horas
    if (diffMs < 86400000) {
        const hours = Math.floor(diffMs / 3600000);
        return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
    }

    // Caso contrário, mostrar data completa
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Copiar Resultado
async function copyResult(id) {
    const item = queryHistory.find(h => h.id === id);
    if (!item) return;

    try {
        const text = JSON.stringify(item.result, null, 2);
        await navigator.clipboard.writeText(text);
        showToast(translations[currentLang].copySuccess, 'success');
    } catch (e) {
        console.error('Erro ao copiar:', e);
        showToast('Erro ao copiar', 'error');
    }
}

// Excluir Resultado
function deleteResult(id) {
    if (!confirm(translations[currentLang].deleteConfirm)) return;

    queryHistory = queryHistory.filter(h => h.id !== id);
    saveHistory();
    renderHistory();

    if (queryHistory.length === 0) {
        emptyState.style.display = 'block';
        resultsSection.style.display = 'none';
    }

    showToast('Item removido do histórico', 'success');
}

// Limpar Histórico
function clearHistory() {
    if (!confirm('Tem certeza que deseja limpar todo o histórico de consultas?')) return;

    queryHistory = [];
    saveHistory();
    renderHistory();

    emptyState.style.display = 'block';
    resultsSection.style.display = 'none';

    showToast('Histórico limpo com sucesso!', 'success');
}

// Sistema de Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Remover após 4 segundos
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Enter key para buscar
searchQuery.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});
