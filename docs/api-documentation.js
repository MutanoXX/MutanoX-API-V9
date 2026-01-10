// MutanoX API Documentation v1.0
// Apenas os 15 endpoints de usuários (NÃO os de admin)

const translations = {
    pt: {
        heroTitle: "Documentação da API",
        heroDesc: "Uma API poderosa, rápida e fácil de usar para suas necessidades de dados",
        badgeFast: "Ultra Rápida",
        badgeSecure: "Segura",
        badgeReliable: "Confiável",
        authTitle: "Autenticação",
        authDesc: "Para usar a API, você precisa de uma API Key. Se você ainda não tem, entre em contato conosco.",
        authBtn: "Conectar",
        authSuccess: "API Key salva com sucesso!",
        endpointsTitle: "Endpoints Disponíveis",
        endpointsDesc: "Selecione um endpoint abaixo para ver a documentação completa e testar",
        btnSave: "Salvar",
        btnTest: "Testar Endpoint",
        btnTesting: "Testando...",
        paramsTitle: "Parâmetros",
        responseTitle: "Resposta",
        placeholderKey: "Digite sua API Key...",
        endpoints: {
            cpf: { name: "Consultar CPF", desc: "Consulta completa de dados pessoais" },
            nome: { name: "Consultar Nome", desc: "Busca de CPF por nome completo" },
            numero: { name: "Consultar Número", desc: "Consulta de proprietário por telefone" },
            infoff: { name: "Info Free Fire", desc: "Dados de jogador por ID" },
            downloader: { name: "Downloader AIO", desc: "Download de vídeos de redes sociais" },
            github: { name: "GitHub Search", desc: "Busca de usuários no GitHub" }
        }
    },
    en: {
        heroTitle: "API Documentation",
        heroDesc: "A powerful, fast, and easy-to-use API for your data needs",
        badgeFast: "Ultra Fast",
        badgeSecure: "Secure",
        badgeReliable: "Reliable",
        authTitle: "Authentication",
        authDesc: "To use the API, you need an API Key. If you don't have one yet, please contact us.",
        authBtn: "Connect",
        authSuccess: "API Key saved successfully!",
        endpointsTitle: "Available Endpoints",
        endpointsDesc: "Select an endpoint below to see full documentation and test",
        btnSave: "Save",
        btnTest: "Test Endpoint",
        btnTesting: "Testing...",
        paramsTitle: "Parameters",
        responseTitle: "Response",
        placeholderKey: "Enter your API Key...",
        endpoints: {
            cpf: { name: "Consult CPF", desc: "Full personal data query" },
            nome: { name: "Consult Name", desc: "CPF search by full name" },
            numero: { name: "Consult Number", desc: "Owner query by phone number" },
            infoff: { name: "Free Fire Info", desc: "Player data by ID" },
            downloader: { name: "AIO Downloader", desc: "Social media video downloader" },
            github: { name: "GitHub Search", desc: "Search users on GitHub" }
        }
    }
};

let currentLang = localStorage.getItem('mutanox_lang') || 'pt';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('mutanox_lang', lang);
    const t = translations[lang];
    
    const heroTitle = document.querySelector('.hero h2');
    if (heroTitle) heroTitle.innerText = t.heroTitle;
    
    const heroDesc = document.querySelector('.hero p');
    if (heroDesc) heroDesc.innerText = t.heroDesc;
    
    const btnSave = document.getElementById('btn-save-key');
    if (btnSave) btnSave.innerText = t.btnSave;
    
    const authTitle = document.querySelector('.section:nth-of-type(1) h3');
    if (authTitle) authTitle.innerHTML = `<i class="fas fa-key"></i> ${t.authTitle}`;
    
    const authDesc = document.querySelector('.section:nth-of-type(1) p');
    if (authDesc) authDesc.innerText = t.authDesc;
    
    const authBtn = document.querySelector('.auth-form button');
    if (authBtn) authBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${t.authBtn}`;
    
    const authInput = document.getElementById('auth-api-key');
    if (authInput) authInput.placeholder = t.placeholderKey;
    
    const authStatus = document.getElementById('auth-status');
    if (authStatus) authStatus.querySelector('p').innerHTML = `<i class="fas fa-check-circle"></i> ${t.authSuccess}`;
    
    const endpointsTitle = document.querySelector('.section:nth-of-type(2) h3');
    if (endpointsTitle) endpointsTitle.innerHTML = `<i class="fas fa-plug"></i> ${t.endpointsTitle}`;
    
    const endpointsDesc = document.querySelector('.section:nth-of-type(2) p');
    if (endpointsDesc) endpointsDesc.innerText = t.endpointsDesc;
    
    const badges = document.querySelectorAll('.hero span');
    if (badges.length >= 3) {
        badges[0].innerHTML = `<i class="fas fa-bolt" style="margin-right: 8px;"></i> ${t.badgeFast}`;
        badges[1].innerHTML = `<i class="fas fa-shield-alt" style="margin-right: 8px;"></i> ${t.badgeSecure}`;
        badges[2].innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px;"></i> ${t.badgeReliable}`;
    }

    renderEndpoints();
}

// Inicializar com o idioma salvo
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
});

// Endpoints de usuários disponíveis
const userEndpoints = [
    {
        id: 'cpf',
        name: 'Consultar CPF',
        icon: 'fa-id-card',
        description: 'Consulta completa de dados pessoais',
        method: 'GET',
        url: '/api/consultas?tipo=cpf&cpf={cpf}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'cpf' },
            { name: 'cpf', type: 'string', required: true, description: 'CPF a consultar' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=cpf&cpf=12345678901&apikey=SUA_API_KEY"'
    },
    {
        id: 'nome',
        name: 'Consultar Nome',
        icon: 'fa-user',
        description: 'Busca por nome completo',
        method: 'GET',
        url: '/api/consultas?tipo=nome&q={query}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'nome' },
            { name: 'q', type: 'string', required: true, description: 'Nome completo para buscar' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=nome&q=Joao+Silva&apikey=SUA_API_KEY"'
    },
    {
        id: 'numero',
        name: 'Consultar Telefone',
        icon: 'fa-phone',
        description: 'Consulta de dados telefônicos',
        method: 'GET',
        url: '/api/consultas?tipo=numero&q={phone}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'numero' },
            { name: 'q', type: 'string', required: true, description: 'Número de telefone' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=numero&q=11999999999&apikey=SUA_API_KEY"'
    },
    {
        id: 'bypass',
        name: 'Bypass City',
        icon: 'fa-unlock-alt',
        description: 'Bypass de proteção',
        method: 'GET',
        url: '/api/consultas?tipo=bypass&url={url}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'bypass' },
            { name: 'url', type: 'string', required: true, description: 'URL para bypass' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=bypass&url=https://example.com&apikey=SUA_API_KEY"'
    },
    {
        id: 'bypasscf',
        name: 'Bypass Cloudflare',
        icon: 'fa-shield-virus',
        description: 'Bypass de proteção CF',
        method: 'GET',
        url: '/api/consultas?tipo=bypasscf&url={url}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'bypasscf' },
            { name: 'url', type: 'string', required: true, description: 'URL protegida por Cloudflare' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=bypasscf&url=https://example.com&apikey=SUA_API_KEY"'
    },
    {
        id: 'infoff',
        name: 'Free Fire Info',
        icon: 'fa-gamepad',
        description: 'Informações de conta Free Fire',
        method: 'GET',
        url: '/api/consultas?tipo=infoff&playerid={playerid}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'infoff' },
            { name: 'playerid', type: 'string', required: true, description: 'ID do jogador Free Fire' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=infoff&playerid=123456789&apikey=SUA_API_KEY"'
    },
    {
        id: 'downloader',
        name: 'AIO Downloader',
        icon: 'fa-download',
        description: 'Download de mídias de múltiplas plataformas',
        method: 'GET',
        url: '/api/consultas?tipo=downloader&url={url}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'downloader' },
            { name: 'url', type: 'string', required: true, description: 'URL do vídeo/mídia para baixar' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=downloader&url=https://tiktok.com/video&apikey=SUA_API_KEY"'
    },
    {
        id: 'github',
        name: 'GitHub Search',
        icon: 'fab fa-github',
        description: 'Busca de usuários e repositórios',
        method: 'GET',
        url: '/api/consultas?tipo=github&username={username}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'github' },
            { name: 'username', type: 'string', required: true, description: 'Nome de usuário no GitHub' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=github&username=octocat&apikey=SUA_API_KEY"'
    },
    {
        id: 'gimage',
        name: 'Google Images',
        icon: 'fab fa-google',
        description: 'Busca de imagens',
        method: 'GET',
        url: '/api/consultas?tipo=gimage&q={query}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'gimage' },
            { name: 'q', type: 'string', required: true, description: 'Termo de busca' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=gimage&q=cats&apikey=SUA_API_KEY"'
    },
    {
        id: 'pinterest',
        name: 'Pinterest Search',
        icon: 'fab fa-pinterest',
        description: 'Busca de pins e boards',
        method: 'GET',
        url: '/api/consultas?tipo=pinterest&q={query}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'pinterest' },
            { name: 'q', type: 'string', required: true, description: 'Termo de busca' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=pinterest&q=food&apikey=SUA_API_KEY"'
    },
    {
        id: 'roblox',
        name: 'Roblox Stalk',
        icon: 'fas fa-cube',
        description: 'Informações de usuários Roblox',
        method: 'GET',
        url: '/api/consultas?tipo=roblox&username={username}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'roblox' },
            { name: 'username', type: 'string', required: true, description: 'Nome de usuário Roblox' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=roblox&username=Player&apikey=SUA_API_KEY"'
    },
    {
        id: 'tiktok',
        name: 'TikTok Search',
        icon: 'fab fa-tiktok',
        description: 'Busca de perfis e vídeos TikTok',
        method: 'GET',
        url: '/api/consultas?tipo=tiktok&username={username}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'tiktok' },
            { name: 'username', type: 'string', required: true, description: 'Nome de usuário TikTok' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=tiktok&username=@tiktok&apikey=SUA_API_KEY"'
    },
    {
        id: 'yt',
        name: 'YouTube Search',
        icon: 'fab fa-youtube',
        description: 'Busca de vídeos no YouTube',
        method: 'GET',
        url: '/api/consultas?tipo=yt&q={query}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'yt' },
            { name: 'q', type: 'string', required: true, description: 'Termo de busca' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=yt&q=music&apikey=SUA_API_KEY"'
    },
    {
        id: 'video',
        name: 'Text to Video',
        icon: 'fas fa-video',
        description: 'Geração de vídeos a partir de texto',
        method: 'GET',
        url: '/api/consultas?tipo=video&prompt={prompt}&quality={quality}&ratio={ratio}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'video' },
            { name: 'prompt', type: 'string', required: true, description: 'Texto prompt para gerar vídeo' },
            { name: 'quality', type: 'string', required: false, value: '1080p', description: 'Qualidade do vídeo' },
            { name: 'ratio', type: 'string', required: false, value: '9:16', description: 'Proporção do vídeo' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=video&prompt=a+cat+dancing&quality=1080p&ratio=9:16&apikey=SUA_API_KEY"'
    },
    {
        id: 'nsfw',
        name: 'NSFW Generator',
        icon: 'fas fa-image',
        description: 'Geração de imagens NSFW',
        method: 'GET',
        url: '/api/consultas?tipo=nsfw&prompt={prompt}&apikey={apikey}',
        params: [
            { name: 'tipo', type: 'string', required: true, value: 'nsfw' },
            { name: 'prompt', type: 'string', required: true, description: 'Texto prompt para gerar imagem' },
            { name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }
        ],
        example: 'curl "http://localhost:8080/api/consultas?tipo=nsfw&prompt=a+beautiful+woman&apikey=SUA_API_KEY"'
    }
];

// Variáveis globais
let savedApiKey = localStorage.getItem('mutanox_api_key') || '';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Carregar API Key salva
    if (savedApiKey) {
        const keyInput = document.getElementById('api-key-input');
        const authInput = document.getElementById('auth-api-key');
        if (keyInput) keyInput.value = savedApiKey;
        if (authInput) authInput.value = savedApiKey;
    }

    // Aplicar idioma salvo (sem recarregar)
    applyLanguage(currentLang);

    // Renderizar endpoints
    renderEndpoints();
});

window.setLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('mutanox_lang', lang);
    applyLanguage(lang);
    renderEndpoints();
};

function applyLanguage(lang) {
    const t = translations[lang];
    if (!t) return;
    
    const heroTitle = document.querySelector('.hero h2');
    if (heroTitle) heroTitle.innerText = t.heroTitle;
    
    const heroDesc = document.querySelector('.hero p');
    if (heroDesc) heroDesc.innerText = t.heroDesc;
    
    const btnSave = document.getElementById('btn-save-key');
    if (btnSave) btnSave.innerText = t.btnSave;
    
    const authTitle = document.querySelector('.section:nth-of-type(1) h3');
    if (authTitle) authTitle.innerHTML = `<i class="fas fa-key"></i> ${t.authTitle}`;
    
    const authDesc = document.querySelector('.section:nth-of-type(1) p');
    if (authDesc) authDesc.innerText = t.authDesc;
    
    const authBtn = document.querySelector('.auth-form button');
    if (authBtn) authBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${t.authBtn}`;
    
    const authInput = document.getElementById('auth-api-key');
    if (authInput) authInput.placeholder = t.placeholderKey;
    
    const authStatus = document.getElementById('auth-status');
    if (authStatus) {
        const p = authStatus.querySelector('p');
        if (p) p.innerHTML = `<i class="fas fa-check-circle"></i> ${t.authSuccess}`;
    }
    
    const endpointsTitle = document.querySelector('.section:nth-of-type(2) h3');
    if (endpointsTitle) endpointsTitle.innerHTML = `<i class="fas fa-plug"></i> ${t.endpointsTitle}`;
    
    const endpointsDesc = document.querySelector('.section:nth-of-type(2) p');
    if (endpointsDesc) endpointsDesc.innerText = t.endpointsDesc;
    
    const badges = document.querySelectorAll('.hero span');
    if (badges.length >= 3) {
        badges[0].innerHTML = `<i class="fas fa-bolt" style="margin-right: 8px;"></i> ${t.badgeFast}`;
        badges[1].innerHTML = `<i class="fas fa-shield-alt" style="margin-right: 8px;"></i> ${t.badgeSecure}`;
        badges[2].innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px;"></i> ${t.badgeReliable}`;
    }

    // Atualizar botões de idioma
    document.querySelectorAll('.lang-selector button').forEach(btn => {
        btn.style.background = 'transparent';
    });
    const activeBtn = document.getElementById('btn-' + lang);
    if (activeBtn) activeBtn.style.background = 'var(--primary)';
}

// Salvar API Key
window.saveApiKey = function() {
    var apiKeyInput = document.getElementById('api-key-input');
    var apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        alert('Por favor, digite sua API Key!');
        return;
    }

    // Salvar no localStorage
    localStorage.setItem('mutanox_api_key', apiKey);
    savedApiKey = apiKey;

    // Atualizar input de autenticação
    document.getElementById('auth-api-key').value = apiKey;

    alert('API Key salva com sucesso!');
};

// Autenticar
window.authenticate = function() {
    var authInput = document.getElementById('auth-api-key');
    var apiKey = authInput.value.trim();

    if (!apiKey) {
        alert('Por favor, digite sua API Key!');
        return;
    }

    // Salvar no localStorage
    localStorage.setItem('mutanox_api_key', apiKey);
    savedApiKey = apiKey;

    // Mostrar status de sucesso
    var authStatus = document.getElementById('auth-status');
    authStatus.style.display = 'block';
    authStatus.innerHTML = '<p style="color: #10b981; font-weight: 700; display: flex; align-items: center; gap: 8px;"><i class="fas fa-check-circle"></i> API Key salva com sucesso!</p>';

    // Ocultar após 3 segundos
    setTimeout(function() {
        authStatus.style.display = 'none';
    }, 3000);

    // Atualizar renderização sem recarregar
    setTimeout(function() {
        renderEndpoints();
    }, 500);
};

// Renderizar endpoints
function renderEndpoints() {
    var t = translations[currentLang];
    var grid = document.getElementById('endpoints-grid');

    if (!grid) return;

    grid.innerHTML = userEndpoints.map(function(endpoint) {
        var trans = t.endpoints[endpoint.id] || { name: endpoint.name, desc: endpoint.description };
        var paramsHTML = endpoint.params.map(function(param) {
            var reqText = currentLang === 'pt' ? ' (obrigatório)' : ' (required)';
            return '<div class="param-item">' +
                '<span class="param-name">' + param.name + '</span>' +
                '<span class="param-type">' + param.type + (param.required ? reqText : '') + '</span>' +
                '</div>';
        }).join('');

        return '<div class="endpoint-card" id="endpoint-' + endpoint.id + '">' +
            '<div class="endpoint-header">' +
                '<div class="endpoint-icon">' +
                    '<i class="' + (endpoint.icon.startsWith('fa-') ? endpoint.icon : 'fas ' + endpoint.icon) + '"></i>' +
                '</div>' +
                '<div class="endpoint-title">' +
                    '<h4>' + trans.name + '</h4>' +
                    '<span>GET</span>' +
                '</div>' +
            '</div>' +
            '<p class="endpoint-description">' + trans.desc + '</p>' +
            '<span class="endpoint-method">' + endpoint.method + '</span>' +
            '<div class="endpoint-url">' + endpoint.url + '</div>' +
            '<div class="endpoint-params">' +
                '<h5>' + t.paramsTitle + '</h5>' +
                paramsHTML +
            '</div>' +
            '<div class="endpoint-test">' +
                '<h5><i class="fas fa-flask"></i> ' + t.btnTest + '</h5>' +
                '<div class="test-form" id="test-form-' + endpoint.id + '">' +
                    createTestInputs(endpoint) +
                '</div>' +
                '<button class="test-button" onclick="testEndpoint(\'' + endpoint.id + '\')">' +
                    '<i class="fas fa-play"></i> ' + (currentLang === 'pt' ? 'Executar Teste' : 'Run Test') +
                '</button>' +
                '<div class="test-result" id="test-result-' + endpoint.id + '">' +
                    '<h6><i class="fas fa-code"></i> ' + t.responseTitle + '</h6>' +
                    '<pre id="test-pre-' + endpoint.id + '"></pre>' +
                '</div>' +
            '</div>' +
            '</div>';
    }).join('');
}

// Criar inputs de teste dinamicamente
function createTestInputs(endpoint) {
    var inputs = '';

    endpoint.params.forEach(function(param) {
        if (param.name !== 'tipo' && param.name !== 'apikey') {
            var placeholder = param.description || (currentLang === 'pt' ? 'Digite ' : 'Enter ') + param.name.toLowerCase();
            inputs += '<input type="text" class="test-input" id="input-' + endpoint.id + '-' + param.name + '" placeholder="' + placeholder + '" />';
        }
    });

    return inputs;
}

// Testar endpoint
window.testEndpoint = async function(endpointId) {
    var apiKey = document.getElementById('auth-api-key').value.trim();

    if (!apiKey) {
        alert('Por favor, conecte sua API Key primeiro!');
        return;
    }

    // Encontrar endpoint
    var endpoint = userEndpoints.find(function(ep) { return ep.id === endpointId; });
    if (!endpoint) return;

    // Coletar parâmetros
    var url = '/api/consultas';
    var params = '?apikey=' + apiKey;

    var hasError = false;
    endpoint.params.forEach(function(param) {
        if (param.name === 'apikey') return;
        if (param.name === 'tipo') {
            params += '&tipo=' + encodeURIComponent(param.value || endpointId);
            return;
        }

        var inputEl = document.getElementById('input-' + endpointId + '-' + param.name);
        var inputValue = inputEl ? inputEl.value.trim() : '';
        
        if (inputValue) {
            params += '&' + param.name + '=' + encodeURIComponent(inputValue);
        } else if (param.required) {
            if (!hasError) {
                alert('Por favor, preencha o campo: ' + (param.description || param.name));
                hasError = true;
            }
        } else if (param.value) {
            params += '&' + param.name + '=' + encodeURIComponent(param.value);
        }
    });

    if (hasError) return;

    url += params;

    // Mostrar resultado
    var resultDiv = document.getElementById('test-result-' + endpointId);
    var preElement = document.getElementById('test-pre-' + endpointId);
    var testButton = document.querySelector('#endpoint-' + endpointId + ' .test-button');

    resultDiv.classList.add('active');
    preElement.innerHTML = '<span style="color: #7c3aed;">⏳</span> Executando consulta...';
    testButton.disabled = true;
    testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguardando...';

    try {
        var response = await fetch(url);
        var data = await response.json();

        // Exibir resultado
        if (typeof data === 'object' && data !== null) {
            preElement.innerHTML = '<pre style="color: #f1f5f9; white-space: pre-wrap; word-break: break-all;">' + JSON.stringify(data, null, 2) + '</pre>';
        } else {
            preElement.innerHTML = '<pre style="color: #f1f5f9;">' + data + '</pre>';
        }

        if (data.sucesso || data.success) {
            resultDiv.querySelector('h6').innerHTML = '<i class="fas fa-check-circle success-response"></i> Sucesso';
        } else {
            resultDiv.querySelector('h6').innerHTML = '<i class="fas fa-exclamation-circle error-response"></i> Erro';
        }
    } catch (error) {
        // Exibir erro
        preElement.innerHTML = '<pre style="color: #ef4444;">Erro: ' + error.message + '</pre>';
        resultDiv.querySelector('h6').innerHTML = '<i class="fas fa-times-circle error-response"></i> Erro de conexão';
    }

    testButton.disabled = false;
    testButton.innerHTML = '<i class="fas fa-play"></i> Executar Teste';
};
