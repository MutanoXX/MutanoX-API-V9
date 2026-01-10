// MutanoX Free Services JS
const searchType = document.getElementById('search-type');
const searchQuery = document.getElementById('search-query');
const inputLabel = document.getElementById('label-dados');
const resultsContainer = document.getElementById('results');
const searchBtn = document.getElementById('search-btn');

const translations = {
    pt: {
        subTitle: "Consultas Gratuitas Limitadas",
        labelTipo: "Tipo de Consulta",
        labelDados: "Digite o dado para busca",
        optNome: "Nome Completo",
        optNumero: "Número/Telefone",
        btnConsultar: "Consultar Agora",
        btnConsultando: "Consultando...",
        placeholderCpf: "Ex: 000.000.000-00",
        placeholderNome: "Ex: João da Silva",
        placeholderNumero: "Ex: 11999999999",
        dadosEncontrados: "DADOS ENCONTRADOS",
        nenhumDado: "Nenhum dado encontrado.",
        erroConsulta: "Erro ao realizar consulta. Tente novamente."
    },
    en: {
        subTitle: "Limited Free Queries",
        labelTipo: "Query Type",
        labelDados: "Enter data for search",
        optNome: "Full Name",
        optNumero: "Number/Phone",
        btnConsultar: "Search Now",
        btnConsultando: "Searching...",
        placeholderCpf: "Ex: 000.000.000-00",
        placeholderNome: "Ex: John Doe",
        placeholderNumero: "Ex: 11999999999",
        dadosEncontrados: "DATA FOUND",
        nenhumDado: "No data found.",
        erroConsulta: "Error performing query. Try again."
    }
};

let currentLang = localStorage.getItem('mutanox_lang') || 'pt';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('mutanox_lang', lang);
    const t = translations[lang];
    if (document.getElementById('sub-title')) document.getElementById('sub-title').innerText = t.subTitle;
    if (document.getElementById('label-tipo')) document.getElementById('label-tipo').innerText = t.labelTipo;
    if (document.getElementById('label-dados')) document.getElementById('label-dados').innerText = t.labelDados;
    if (document.getElementById('opt-nome')) document.getElementById('opt-nome').innerText = t.optNome;
    if (document.getElementById('opt-numero')) document.getElementById('opt-numero').innerText = t.optNumero;
    if (searchBtn) searchBtn.innerText = t.btnConsultar;
    updatePlaceholder();
}

// Inicializar com o idioma salvo e detecção automática
document.addEventListener('DOMContentLoaded', () => {
    const userLang = navigator.language || navigator.userLanguage;
    if (!localStorage.getItem('mutanox_lang')) {
        currentLang = userLang.startsWith('pt') ? 'pt' : 'en';
    }
    setLanguage(currentLang);
});

let currentRating = 0;
function setRating(val) {
    currentRating = val;
    document.querySelectorAll('.feedback-star').forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'));
        star.style.color = starVal <= val ? 'var(--warning)' : 'var(--text-muted)';
    });
}

async function sendFeedback() {
    if (currentRating === 0) return alert('Por favor, selecione uma nota');
    const comment = document.getElementById('feedback-comment').value;
    const endpoint = document.getElementById('search-type').value;
    
    try {
        const res = await fetch('/api/user/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: currentRating, comment, endpoint })
        });
        if ((await res.json()).success) {
            alert('Obrigado pelo seu feedback!');
            document.getElementById('feedback-section').style.display = 'none';
        }
    } catch (e) { alert('Erro ao enviar feedback'); }
}

function updatePlaceholder() {
    const type = searchType.value;
    const t = translations[currentLang];
    
    const placeholders = {
        cpf: t.placeholderCpf,
        nome: t.placeholderNome,
        numero: t.placeholderNumero,
        bypasscf: 'Ex: https://site-com-cloudflare.com',
        infoff: 'Ex: 123456789',
        downloader: 'Ex: https://www.youtube.com/watch?v=...',
        github: 'Ex: mutanox',
        gimage: 'Ex: Cyberpunk City',
        pinterest: 'Ex: Anime Wallpaper',
        roblox: 'Ex: Builderman',
        tiktok: 'Ex: khaby.lame',
        yt: 'Ex: Lo-fi hip hop',
        video: 'Ex: A futuristic city with flying cars',
        nsfw: 'Ex: Artistic portrait (NSFW allowed)',
        bypass: 'Ex: https://linkvertise.com/...'
    };
    
    searchQuery.placeholder = placeholders[type] || 'Digite aqui...';
}

searchType.addEventListener('change', updatePlaceholder);

async function checkStatus() {
    try {
        const res = await fetch('/api/admin/stats?apikey=MutanoX3397'); // Apenas para checar se o servidor está on
        // No sistema real, o admin controla se o free está ativo
    } catch (e) {}
}

async function performSearch() {
    const type = searchType.value;
    const query = searchQuery.value;
    const btn = document.getElementById('search-btn');

    if (!query) return alert('Digite algo para buscar!');

    btn.disabled = true;
    btn.innerText = translations[currentLang].btnConsultando;
    resultsContainer.innerHTML = '<div class="card" style="text-align:center">Buscando dados na base MutanoX...</div>';
    resultsContainer.style.display = 'block';

    try {
        let url = `/api/consultas?tipo=${type}`;
        if (type === 'cpf') url += `&cpf=${encodeURIComponent(query)}`;
        else if (type === 'infoff') url += `&id=${encodeURIComponent(query)}`;
        else if (type === 'downloader' || type === 'bypasscf' || type === 'bypass') url += `&url=${encodeURIComponent(query)}`;
        else if (type === 'github' || type === 'roblox' || type === 'tiktok') url += `&username=${encodeURIComponent(query)}`;
        else if (type === 'video' || type === 'nsfw') url += `&prompt=${encodeURIComponent(query)}`;
        else url += `&q=${encodeURIComponent(query)}`;

        const res = await fetch(url);
        
        if (res.status === 429) {
            document.getElementById('queue-status').style.display = 'flex';
            setTimeout(performSearch, 3000);
            return;
        }
        
        document.getElementById('queue-status').style.display = 'none';
        const data = await res.json();

        if (data.sucesso === false) {
            resultsContainer.innerHTML = `<div class="result-card" style="border-color: var(--danger); color: var(--danger)">${data.erro || 'Erro na consulta'}</div>`;
        } else {
            const adBanner = document.getElementById('ad-banner');
            const adLink = document.getElementById('ad-link');
            if (data.ad && data.ad.text) {
                adBanner.style.display = 'block';
                adLink.innerText = data.ad.text;
                adLink.href = data.ad.link || '#';
            } else {
                adBanner.style.display = 'none';
            }
            document.getElementById('feedback-section').style.display = 'block';
            renderResults(data.dados || data.resultados || data, type);
        }
    } catch (e) {
        resultsContainer.innerHTML = '<div class="result-card" style="border-color: var(--danger)">Erro de conexão com o servidor.</div>';
    } finally {
        btn.disabled = false;
        btn.innerText = translations[currentLang].btnConsultar;
    }
}

function renderResults(data, type) {
    const t = translations[currentLang];
    let html = `<h3 style="margin-bottom: 16px; color: var(--primary); text-align: center; text-transform: uppercase; letter-spacing: 2px;">${t.dadosEncontrados}</h3>`;
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
        html += `<div class="result-card" style="text-align: center;">${t.nenhumDado}</div>`;
    } else {
        // Renderização especial para mídias
        if (type === 'gimage' || type === 'pinterest') {
            html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px;">';
            const items = Array.isArray(data) ? data : [data];
            items.forEach(item => {
                const url = typeof item === 'string' ? item : (item.url || item.link || item.image);
                if (url) html += `<div class="result-card" style="padding: 10px;"><img src="${url}" style="width: 100%; border-radius: 10px; cursor: pointer;" onclick="window.open('${url}')"></div>`;
            });
            html += '</div>';
        } else if (type === 'video' && data.url) {
            html += `<div class="result-card" style="text-align: center;">
                <video src="${data.url}" controls style="width: 100%; border-radius: 10px; margin-bottom: 15px;"></video>
                <a href="${data.url}" target="_blank" class="btn btn-primary" style="display: inline-block; width: auto;">Baixar Vídeo</a>
            </div>`;
        } else if (type === 'downloader' && (data.url || data.result)) {
            const downloadUrl = data.url || data.result;
            html += `<div class="result-card" style="text-align: center;">
                <p style="margin-bottom: 15px;">Mídia pronta para download!</p>
                <a href="${downloadUrl}" target="_blank" class="btn btn-primary" style="display: inline-block; width: auto;">Download Agora</a>
            </div>`;
        } else {
            html += '<div class="result-card">';
            html += renderRecursive(data);
            html += '</div>';
        }
    }
    
    resultsContainer.innerHTML = html;
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

function renderRecursive(obj) {
    let html = '';
    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            html += `<div style="margin-top: 15px; border-top: 2px solid var(--primary); padding-top: 10px; color: var(--secondary); font-weight: 800; font-size: 14px;">ITEM #${index + 1}</div>`;
            html += renderRecursive(item);
        });
    } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                const label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
                html += `<div style="margin-top: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; color: var(--secondary); font-weight: 700; font-size: 12px;">${label}</div>`;
                html += renderRecursive(value);
            } else {
                html += renderItem(key, value);
            }
        }
    } else {
        html += `<div class="result-item"><span class="result-value">${obj}</span></div>`;
    }
    return html;
}

function renderItem(label, value) {
    if (value === null || value === undefined || value === '' || value === 'undefined') return '';
    
    // Ignorar campos internos ou muito longos que não sejam URLs
    if (label.startsWith('_') || (typeof value === 'string' && value.length > 500 && !value.startsWith('http'))) return '';

    const cleanLabel = label.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toUpperCase();
    
    // Formatação especial para URLs
    if (typeof value === 'string' && value.startsWith('http')) {
        return `
            <div class="result-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <span class="result-label">${cleanLabel}</span>
                <a href="${value}" target="_blank" style="color: var(--primary); font-size: 12px; word-break: break-all; text-decoration: none; border-bottom: 1px dashed var(--primary);">
                    <i class="fas fa-external-link-alt"></i> Abrir Link
                </a>
            </div>
        `;
    }

    return `
        <div class="result-item">
            <span class="result-label">${cleanLabel}</span>
            <span class="result-value">${value}</span>
        </div>
    `;
}

// WebSocket para atualizações em tempo real
let socket;
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8080';
    socket = new WebSocket(`${protocol}//${host}`);
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'CONFIG_UPDATE') {
                applyRealtimeConfig(data.config);
            }
        } catch (e) {
            console.error('Error parsing WebSocket message:', e);
        }
    };
    
    socket.onclose = () => {
        setTimeout(initWebSocket, 3000);
    };
}

function applyRealtimeConfig(config) {
    if (!config) return;
    
    // Aplicar cores dinamicamente
    if (config.primaryColor) document.documentElement.style.setProperty('--primary', config.primaryColor);
    if (config.secondaryColor) document.documentElement.style.setProperty('--secondary', config.secondaryColor);
    
    // Atualizar mensagens
    const subTitle = document.getElementById('sub-title');
    if (subTitle && config.message) subTitle.innerText = config.message;
    
    // Atualizar banner de anúncios
    const adBanner = document.getElementById('ad-banner');
    const adLink = document.getElementById('ad-link');
    if (adBanner && adLink && config.adBanner) {
        adLink.innerText = config.adBanner;
        adLink.href = config.adLink || '#';
    }
    
    console.log('Configurações atualizadas em tempo real');
}

// Inicializar WebSocket
initWebSocket();
