// MutanoX API Documentation v1.0
// Simplified with only 3 main endpoints

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
            numero: { name: "Consultar Número", desc: "Consulta de proprietário por telefone" }
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
            numero: { name: "Consult Number", desc: "Owner query by phone number" }
        }
    }
};

let currentLang = localStorage.getItem('mutanox_lang') || 'pt';
let savedApiKey = localStorage.getItem('mutanox_api_key') || '';

// Carregar API Key salva
document.addEventListener('DOMContentLoaded', async () => {
    if (savedApiKey) {
        const authInput = document.getElementById('auth-api-key');
        if (authInput) authInput.value = savedApiKey;
    }

    setLanguage(currentLang);
    await loadEndpointsFromServer();
    renderEndpoints();
});

// Mudar idioma
window.setLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('mutanox_lang', lang);

    // Atualizar botões de idioma
    document.getElementById('btn-pt').style.background = lang === 'pt' ? 'var(--primary)' : 'transparent';
    document.getElementById('btn-en').style.background = lang === 'en' ? 'var(--primary)' : 'transparent';

    const t = translations[lang];

    const heroTitle = document.querySelector('.hero h2');
    if (heroTitle) heroTitle.innerText = t.heroTitle;

    const heroDesc = document.querySelector('.hero p');
    if (heroDesc) heroDesc.innerText = t.heroDesc;

    const btnSave = document.getElementById('btn-save-key');
    if (btnSave) btnSave.innerText = t.btnSave;

    const authTitle = document.querySelector('.section:nth-of-type(1) h3');
    if (authTitle) authTitle.innerHTML = '<i class="fas fa-key"></i> ' + t.authTitle;

    const authDesc = document.querySelector('.section:nth-of-type(1) p');
    if (authDesc) authDesc.innerText = t.authDesc;

    const authBtn = document.querySelector('.auth-form button');
    if (authBtn) authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ' + t.authBtn;

    const authInput = document.getElementById('auth-api-key');
    if (authInput) authInput.placeholder = t.placeholderKey;

    const authStatus = document.getElementById('auth-status');
    if (authStatus) authStatus.querySelector('p').innerHTML = '<i class="fas fa-check-circle"></i> ' + t.authSuccess;

    const endpointsTitle = document.querySelector('.section:nth-of-type(2) h3');
    if (endpointsTitle) endpointsTitle.innerHTML = '<i class="fas fa-plug"></i> ' + t.endpointsTitle;

    const endpointsDesc = document.querySelector('.section:nth-of-type(2) p');
    if (endpointsDesc) endpointsDesc.innerText = t.endpointsDesc;

    const badges = document.querySelectorAll('.hero span');
    if (badges.length >= 3) {
        badges[0].innerHTML = '<i class="fas fa-bolt" style="margin-right: 8px;"></i> ' + t.badgeFast;
        badges[1].innerHTML = '<i class="fas fa-shield-alt" style="margin-right: 8px;"></i> ' + t.badgeSecure;
        badges[2].innerHTML = '<i class="fas fa-check-circle" style="margin-right: 8px;"></i> ' + t.badgeReliable;
    }

    // Re-renderizar endpoints
    renderEndpoints();

    const activeBtn = document.getElementById('btn-' + lang);
    if (activeBtn) activeBtn.style.background = 'var(--primary)';
};

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

// Endpoints (carregados dinamicamente do servidor)
let userEndpoints = [];

async function loadEndpointsFromServer() {
    try {
        const res = await fetch('/api/docs/endpoints');
        const data = await res.json();
        if (!data || !data.success) return;

        const commonParams = {
            cpf: ['cpf'],
            nome: ['q'],
            numero: ['q'],
            bypass: ['url'],
            bypasscf: ['url', 'siteKey', 'type', 'proxy'],
            infoff: ['id'],
            downloader: ['url'],
            github: ['username'],
            gimage: ['q'],
            pinterest: ['q'],
            roblox: ['username'],
            tiktok: ['username'],
            yt: ['q'],
            video: ['prompt', 'quality', 'ratio'],
            nsfw: ['prompt', 'negative']
        };

        userEndpoints = (data.endpoints || []).map(function(ep) {
            var id = ep.id;
            var params = ep.params && ep.params.length ? ep.params : (commonParams[id] || ['q']);

            // Normalizar params (string[])
            params = params.map(function(p) { return typeof p === 'string' ? p : (p && p.name ? p.name : 'q'); });

            var paramObjs = [{ name: 'tipo', type: 'string', required: true, value: id }]
                .concat(params.map(function(p) {
                    return { name: p, type: 'string', required: true, description: 'Parâmetro: ' + p };
                }))
                .concat([{ name: 'apikey', type: 'string', required: true, description: 'Sua API Key' }]);

            var icon = 'fa-plug';
            if (id === 'cpf') icon = 'fa-id-card';
            if (id === 'nome') icon = 'fa-user';
            if (id === 'numero') icon = 'fa-phone';
            if (id === 'video') icon = 'fa-film';
            if (id === 'nsfw') icon = 'fa-image';

            return {
                id: id,
                name: ep.name || id,
                icon: icon,
                description: ep.description || (ep.dynamic ? 'Endpoint dinâmico' : 'Endpoint da API'),
                method: 'GET',
                url: '/api/consultas?tipo=' + id + '&...&apikey={apikey}',
                params: paramObjs,
                example: 'curl "http://localhost:8080/api/consultas?tipo=' + id + '&apikey=SUA_API_KEY"'
            };
        });

        // Incluir endpoints estáticos (admin/user) no final
        (data.static || []).forEach(function(ep) {
            userEndpoints.push({
                id: ep.id,
                name: ep.id,
                icon: 'fa-lock',
                description: 'Endpoint do sistema (' + (ep.auth || 'public') + ')',
                method: ep.method,
                url: ep.url,
                params: [{ name: 'apikey', type: 'string', required: ep.auth !== 'public', description: 'Chave de autenticação' }],
                example: 'curl "http://localhost:8080' + ep.url.replace('{ADMIN_KEY}', 'SUA_ADMIN_KEY') + '"'
            });
        });
    } catch (e) {
        // fallback: mantém lista vazia
    }
}

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

    resultDiv.style.display = 'block';
    preElement.innerHTML = '<span style="color: #7c3aed;">⏳</span> Executando consulta...';
    testButton.disabled = true;
    testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguardando...';

    var startTime = Date.now();

    try {
        var response = await fetch(url);
        var latency = Date.now() - startTime;
        var data = await response.json();

        // Exibir resultado
        if (typeof data === 'object' && data !== null) {
            preElement.innerHTML = '<pre style="color: #f1f5f9; white-space: pre-wrap; word-break: break-all;">' +
                '<span style="color: #6b7280;">// Tempo de resposta: ' + latency + 'ms\n// Status HTTP: ' + response.status + '\n</span>' +
                JSON.stringify(data, null, 2) +
                '</pre>';
        } else {
            preElement.innerHTML = '<pre style="color: #f1f5f9;">' + data + '</pre>';
        }

        if (data.sucesso || data.success) {
            resultDiv.querySelector('h6').innerHTML = '<i class="fas fa-check-circle success-response"></i> Sucesso (' + latency + 'ms)';
            resultDiv.querySelector('h6').style.color = '#10b981';
        } else {
            resultDiv.querySelector('h6').innerHTML = '<i class="fas fa-exclamation-circle error-response"></i> Erro';
            resultDiv.querySelector('h6').style.color = '#ef4444';
        }
    } catch (error) {
        // Exibir erro
        preElement.innerHTML = '<pre style="color: #ef4444;">Erro de conexão: ' + error.message + '</pre>';
        resultDiv.querySelector('h6').innerHTML = '<i class="fas fa-times-circle error-response"></i> Erro de conexão';
        resultDiv.querySelector('h6').style.color = '#ef4444';
    }

    testButton.disabled = false;
    testButton.innerHTML = '<i class="fas fa-play"></i> Executar Teste';
};

// Add styles for success/error responses
var style = document.createElement('style');
style.innerHTML = `
    .success-response { color: #10b981 !important; }
    .error-response { color: #ef4444 !important; }
`;
document.head.appendChild(style);
