/**
 * API Única - @MutanoX (ULTRA DARK INTEGRATED VERSION - V9 ULTIMATE)
 * Consolidated endpoint for all queries and content generation
 * 
 * Port: 8080
 * Author: @MutanoX
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');
const pathModule = require('path');
const WebSocket = require('ws');

// ==========================================
// CONFIGURATIONS & AUTH SYSTEM
// ==========================================

const PORT = 8080;
const API_KEYS_FILE = pathModule.join(__dirname, 'api_keys.json');
const STATS_FILE = pathModule.join(__dirname, 'api_stats.json');
const ENDPOINTS_FILE = pathModule.join(__dirname, 'endpoints_config.json');
const MINI_SERVICES_CONFIG = pathModule.join(__dirname, 'mini_services_config.json');
const AUDIT_LOGS_FILE = pathModule.join(__dirname, 'audit_logs.json');
const ADMIN_KEY = 'MutanoX3397';
const DASHBOARD_PATH = pathModule.join(__dirname, 'dashboards', 'dashboard-new.html');
const PROTECTED_USERS_DIR = pathModule.join(__dirname, 'Users-protegidos');

if (!fs.existsSync(PROTECTED_USERS_DIR)) {
    fs.mkdirSync(PROTECTED_USERS_DIR);
}

// Configuração Mini-Services e Customização
const loginAttempts = new Map();

let freeConfig = {
    active: false,
    message: "Sistema de Consultas Gratuitas",
    protectionMessage: "esta pessoa está protegida pelo sistema, quer proteção? adquira proteção por 5R$ e tenha proteção eterna.",
    maintenanceMessage: "Este endpoint está em manutenção temporária",
    expiresAt: null,
    usageCount: 0,
    adBanner: "Anuncie aqui! @MutanoX",
    adLink: "https://t.me/MutanoX",
    primaryColor: "#00f2ff",
    secondaryColor: "#7000ff",
    showStatsWidget: true,
    layoutType: "modern"
};

// Fila de Processamento para Mini Service
const requestQueue = [];
let isProcessingQueue = false;

async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    isProcessingQueue = true;
    
    while (requestQueue.length > 0) {
        const { req, res, tipo, query, apiKey } = requestQueue.shift();
        try {
            await handleApiRequest(req, res, tipo, query, apiKey);
        } catch (e) {
            res.writeHead(500); res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
        // Delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    isProcessingQueue = false;
}

function loadFreeConfig() {
    if (fs.existsSync(MINI_SERVICES_CONFIG)) {
        try {
            freeConfig = { ...freeConfig, ...JSON.parse(fs.readFileSync(MINI_SERVICES_CONFIG, 'utf8')) };
        } catch (e) {}
    }
}
function saveFreeConfig() { fs.writeFileSync(MINI_SERVICES_CONFIG, JSON.stringify(freeConfig, null, 2)); }
loadFreeConfig();

function isProtected(data) {
    if (!data) return false;
    if (!fs.existsSync(PROTECTED_USERS_DIR)) return false;
    const files = fs.readdirSync(PROTECTED_USERS_DIR);
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const protectedData = JSON.parse(fs.readFileSync(pathModule.join(PROTECTED_USERS_DIR, file), 'utf8'));
                if (protectedData.active === false) continue;
                
                if (protectedData.expiresAt && new Date() > new Date(protectedData.expiresAt)) {
                    protectedData.active = false;
                    fs.writeFileSync(pathModule.join(PROTECTED_USERS_DIR, file), JSON.stringify(protectedData, null, 2));
                    continue;
                }

                if (data.cpf && protectedData.cpf === data.cpf) return true;
                if (data.nome && protectedData.nome && data.nome.toLowerCase().includes(protectedData.nome.toLowerCase())) return true;
                if (data.numero && protectedData.numero === data.numero) return true;
            } catch (e) {}
        }
    }
    return false;
}

// Configuração de Endpoints
let endpointsConfig = {};
const DEFAULT_ENDPOINTS_LIST = ['cpf', 'nome', 'numero', 'bypass', 'bypasscf', 'infoff', 'downloader', 'github', 'gimage', 'pinterest', 'roblox', 'tiktok', 'yt', 'video', 'nsfw'];

function loadEndpointsConfig() {
    if (fs.existsSync(ENDPOINTS_FILE)) {
        endpointsConfig = JSON.parse(fs.readFileSync(ENDPOINTS_FILE, 'utf8'));
    } else {
        DEFAULT_ENDPOINTS_LIST.forEach(e => { endpointsConfig[e] = { maintenance: false, active: true, latency: 0, rateLimit: 60 }; });
        saveEndpointsConfig();
    }
}

function saveEndpointsConfig() {
    fs.writeFileSync(ENDPOINTS_FILE, JSON.stringify(endpointsConfig, null, 2));
}

function updateAutoDocs() {
    const docsPath = pathModule.join(__dirname, 'docs', 'api-documentation.js');
    let docsContent = `// MutanoX Auto-Generated Documentation\nconst API_DOCS = {\n    version: "10.0",\n    lastUpdate: "${new Date().toISOString()}",\n    endpoints: {\n`;
    
    Object.entries(endpointsConfig).forEach(([id, config]) => {
        docsContent += `        "${id}": {\n            name: "${config.name || id}",\n            active: ${config.active},\n            maintenance: ${config.maintenance},\n            params: ${JSON.stringify(config.params || [])},\n            dynamic: ${!!config.dynamic}\n        },\n`;
    });
    
    docsContent += `    }\n};\n\nif (typeof module !== 'undefined') module.exports = API_DOCS;`;
    
    if (!fs.existsSync(pathModule.join(__dirname, 'docs'))) fs.mkdirSync(pathModule.join(__dirname, 'docs'));
    fs.writeFileSync(docsPath, docsContent);
}

// Telemetria e Logs
let liveLogs = [];
let systemStats = {
    startTime: Date.now(),
    totalRequests: 0,
    endpointHits: {},
    errors: 0,
    deviceHits: { desktop: 0, mobile: 0, tablet: 0 }
};

// --- FIREWALL & WAF ---
const wafConfig = {
    blacklist: new Set(),
    rateLimit: 60,
    antiDdos: true,
    geoBlocking: [], // Países bloqueados (ex: ['CN', 'RU'])
    requestHistory: new Map() // IP -> { count, lastRequest }
};

function wafMiddleware(req, res) {
    const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'];
    
    if (wafConfig.blacklist.has(ip)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'IP Blacklisted by MutanoX WAF' }));
        return false;
    }

    if (wafConfig.antiDdos) {
        const now = Date.now();
        const stats = wafConfig.requestHistory.get(ip) || { count: 0, lastRequest: now };
        
        if (now - stats.lastRequest < 1000) { // Janela de 1 segundo
            stats.count++;
        } else {
            stats.count = 1;
            stats.lastRequest = now;
        }

        if (stats.count > 15) { // Mais de 15 req/seg = Suspeito
            wafConfig.blacklist.add(ip);
            auditLog(null, 'SECURITY', 'IP_AUTO_BANNED', `IP ${ip} blocked for DDoS pattern`);
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'DDoS Protection Triggered' }));
            return false;
        }
        wafConfig.requestHistory.set(ip, stats);
    }
    return true;
}

// --- CACHE SYSTEM ---
const cache = new Map(); // endpoint -> { data, timestamp, ttl }

function getCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp + entry.ttl) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data, ttl = 60000) {
    cache.set(key, { data, timestamp: Date.now(), ttl });
}

function clearCache(endpoint = null) {
    if (endpoint) {
        cache.delete(endpoint);
        auditLog(null, 'SYSTEM', 'CACHE_CLEARED', `Cache for ${endpoint} cleared`);
    } else {
        cache.clear();
        auditLog(null, 'SYSTEM', 'CACHE_CLEARED_ALL', 'All cache cleared');
    }
}

function loadStats() {
    if (fs.existsSync(STATS_FILE)) {
        try {
            const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
            systemStats.startTime = stats.startTime || Date.now();
            systemStats.totalRequests = stats.totalRequests || 0;
            systemStats.endpointHits = stats.endpointHits || {};
            systemStats.errors = stats.errors || 0;
            systemStats.deviceHits = stats.deviceHits || { desktop: 0, mobile: 0, tablet: 0 };
        } catch (error) {}
    }
}
function saveStats() {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(systemStats, null, 2));
    } catch (error) {}
}
loadStats();

// Auditoria Persistente
function auditLog(apiKey, type, action, details) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        apiKey: apiKey ? (apiKey.substring(0, 8) + '...') : 'PUBLIC',
        type,
        action,
        details
    };
    
    let logs = [];
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
        try { logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8')); } catch (e) {}
    }
    logs.unshift(logEntry);
    if (logs.length > 1000) logs.pop();
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2));
    // Também adicionar aos liveLogs para o dashboard admin
    const timestamp = new Date().toLocaleString('pt-BR');
    liveLogs.unshift({ timestamp, type, message: action, details });
    if (liveLogs.length > 50) liveLogs.pop();
}

function log(type, message, details = null) {
    const timestamp = new Date().toLocaleString('pt-BR');
    liveLogs.unshift({ timestamp, type, message, details });
    if (liveLogs.length > 50) liveLogs.pop();
    console.log(`[${timestamp}] [${type}] ${message} ${details ? '(' + details + ')' : ''}`);
}

function generateUid(length = 16) { return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length); }

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/['";\-=\/*<>]/g, '').trim();
}

function validateApiKeyFormat(key) {
    if (typeof key !== 'string') return false;
    return /^MUTANOX-[A-F0-9]+$/.test(key) || key === ADMIN_KEY;
}

function loadApiKeys() {
    if (!fs.existsSync(API_KEYS_FILE)) {
        const initial = { [ADMIN_KEY]: { owner: "Admin", role: "admin", active: true, usageCount: 0, dailyUsage: 0, dailyLimit: 0, lastUsed: null, lastReset: new Date().toDateString(), createdAt: new Date().toISOString() } };
        fs.writeFileSync(API_KEYS_FILE, JSON.stringify(initial, null, 2));
        return initial;
    }
    const keys = JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8'));
    
    // Reset diário de cotas
    const today = new Date().toDateString();
    let changed = false;
    for (const k in keys) {
        if (keys[k].lastReset !== today) {
            keys[k].dailyUsage = 0;
            keys[k].lastReset = today;
            changed = true;
        }
    }
    if (changed) fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
    
    return keys;
}
function saveApiKeys(keys) { fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2)); }

async function triggerWebhook(apiKey, type, data) {
    const keys = loadApiKeys();
    const keyData = keys[apiKey];
    if (keyData && keyData.webhookUrl) {
        try {
            const res = await fetch(keyData.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, apiKey, timestamp: new Date().toISOString(), ...data })
            });
        } catch (e) { console.error(`Webhook Error for ${apiKey}:`, e.message); }
    }
}

function validateAndTrackKey(key, skipIncrement = false, userAgent = '') {
    if (!validateApiKeyFormat(key)) return { valid: false, error: 'Invalid key format' };
    
    const keys = loadApiKeys();
    const keyData = keys[key];
    
    if (!keyData) return { valid: false };
    if (keyData.active === false) return { valid: false, error: 'Key inactive' };

    if (keyData.expiresAt && new Date() > new Date(keyData.expiresAt)) {
        keyData.active = false;
        saveApiKeys(keys);
        return { valid: false, error: 'Key expired' };
    }

    // Verificar Cota Diária
    if (keyData.dailyLimit > 0 && keyData.dailyUsage >= keyData.dailyLimit) {
        triggerWebhook(key, 'LIMIT_REACHED', { usage: keyData.dailyUsage, limit: keyData.dailyLimit });
        return { valid: false, error: 'Daily limit reached' };
    }
    if (keyData.dailyLimit > 0 && keyData.dailyUsage >= keyData.dailyLimit * 0.9) {
        triggerWebhook(key, 'LIMIT_WARNING', { usage: keyData.dailyUsage, limit: keyData.dailyLimit });
    }

    if (!skipIncrement) {
        keyData.usageCount = (keyData.usageCount || 0) + 1;
        keyData.dailyUsage = (keyData.dailyUsage || 0) + 1;
        keyData.lastUsed = new Date().toISOString();
        saveApiKeys(keys);
        systemStats.totalRequests++;
        
        // Track device
        const ua = userAgent ? userAgent.toLowerCase() : '';
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) systemStats.deviceHits.mobile++;
        else if (ua.includes('tablet') || ua.includes('ipad')) systemStats.deviceHits.tablet++;
        else systemStats.deviceHits.desktop++;
        
        saveStats();
    }
    
    return { valid: true, isAdmin: keyData.role === 'admin', owner: keyData.owner };
}

// ==========================================
// API ENDPOINTS CONFIG
// ==========================================

const DEFAULT_VIDEO_API_KEY = 'MutanoXX';
const DEFAULT_IMAGE_API_KEY = 'MutanoXX';
const DEFAULT_BYPASSCF_API_KEY = 'MutanoXX';
const DEFAULT_API_KEY = 'MutanoXX';

function isValidString(str) { return typeof str === 'string' && str.trim().length > 0; }
function createApiUrl(baseUrl, params) {
  try {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) url.searchParams.append(key, String(value));
    }
    return url.toString();
  } catch (error) { return null; }
}

// Parsers (Preservados)
function parseCPFData(text) {
  if (!isValidString(text)) {
    console.warn('[parseCPFData] Texto inválido recebido');
    return { erro: 'Resposta inválida da API', textoRecebido: text };
  }
  const data = {
    dadosBasicos: {},
    dadosEconomicos: {},
    enderecos: [],
    tituloEleitor: {},
    dadosFiscais: {},
    beneficiosSociais: [],
    pessoaExpostaPoliticamente: {},
    servidorPublico: {},
    perfilConsumo: {},
    vacinas: [],
    informacoesImportantes: {}
  };
  const nomeMatch = text.match(/• Nome: (.+)/);
  if (nomeMatch) data.dadosBasicos.nome = nomeMatch[1].trim();
  const cpfMatch = text.match(/• CPF: (\d+)/);
  if (cpfMatch) data.dadosBasicos.cpf = cpfMatch[1];
  const cnsMatch = text.match(/• CNS: (\d+)/);
  if (cnsMatch) data.dadosBasicos.cns = cnsMatch[1];
  const dataNascimentoMatch = text.match(/• Data de Nascimento: (.+)/);
  if (dataNascimentoMatch) data.dadosBasicos.dataNascimento = dataNascimentoMatch[1].trim();
  const sexoMatch = text.match(/• Sexo: (.+)/);
  if (sexoMatch) data.dadosBasicos.sexo = sexoMatch[1].trim();
  const nomeMaeMatch = text.match(/• Nome da Mãe: (.+)/);
  if (nomeMaeMatch) data.dadosBasicos.nomeMae = nomeMaeMatch[1].trim();
  const nomePaiMatch = text.match(/• Nome do Pai: (.+)/);
  if (nomePaiMatch) data.dadosBasicos.nomePai = nomePaiMatch[1].trim();
  const situacaoCadastralMatch = text.match(/• Situação Cadastral: (.+)/);
  if (situacaoCadastralMatch) data.dadosBasicos.situacaoCadastral = situacaoCadastralMatch[1].trim();
  const dataSituacaoMatch = text.match(/• Data da Situação: (.+)/);
  if (dataSituacaoMatch) data.dadosBasicos.dataSituacao = dataSituacaoMatch[1].trim();
  const addressBlocks = text.split('🏠 ENDEREÇO');
  for (let i = 1; i < addressBlocks.length; i++) {
    const endereco = {};
    const logradouroMatch = addressBlocks[i].match(/• Logradouro:\s*(.+)/);
    if (logradouroMatch) endereco.logradouro = logradouroMatch[1].trim();
    const bairroMatch = addressBlocks[i].match(/• Bairro:\s*(.+)/);
    if (bairroMatch) endereco.bairro = bairroMatch[1].trim();
    const cidadeMatch = addressBlocks[i].match(/• Cidade\/UF:\s*(.+)/);
    if (cidadeMatch) endereco.cidadeUF = cidadeMatch[1].trim();
    const cepMatch = addressBlocks[i].match(/• CEP:\s*(\d+)/);
    if (cepMatch) endereco.cep = cepMatch[1];
    if (Object.keys(endereco).length > 0) data.enderecos.push(endereco);
  }
  return data;
}

function parseNomeData(text) {
  if (!isValidString(text)) return [];
  const results = [];
  const pessoaBlocks = text.split('👤 RESULTADO');
  for (let i = 1; i < pessoaBlocks.length; i++) {
    const pessoa = {};
    const cpfMatch = pessoaBlocks[i].match(/• CPF: (\d+)/);
    if (cpfMatch) pessoa.cpf = cpfMatch[1];
    const nomeMatch = pessoaBlocks[i].match(/• Nome: (.+)/);
    if (nomeMatch) pessoa.nome = nomeMatch[1].trim();
    const dataNascimentoMatch = pessoaBlocks[i].match(/• Data de Nascimento: (.+)/);
    if (dataNascimentoMatch) pessoa.dataNascimento = dataNascimentoMatch[1].trim();
    results.push(pessoa);
  }
  return results;
}

function parseTelefoneData(text) {
  if (!isValidString(text)) return [];
  const results = [];
  const pessoaBlocks = text.split('👤 PESSOA');
  for (let i = 1; i < pessoaBlocks.length; i++) {
    const pessoa = {};
    const cpfCnpjMatch = pessoaBlocks[i].match(/• CPF\/CNPJ: (.+)/);
    if (cpfCnpjMatch) pessoa.cpfCnpj = cpfCnpjMatch[1].trim();
    const nomeMatch = pessoaBlocks[i].match(/• Nome: (.+)/);
    if (nomeMatch) pessoa.nome = nomeMatch[1].trim();
    results.push(pessoa);
  }
  return results;
}

// Handlers


// Monitor de Saúde
async function checkExternalHealth() {
    const targets = [
        { name: 'World Ecletix', url: 'https://world-ecletix.onrender.com' },
        { name: 'AnaBot API', url: 'https://anabot.my.id' },
        { name: 'Paxsenix', url: 'https://api.paxsenix.org' }
    ];
    const results = [];
    for (const t of targets) {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(t.url, { method: 'GET', signal: controller.signal });
            clearTimeout(timeoutId);
            results.push({ name: t.name, status: 'ONLINE', latency: Date.now() - start });
        } catch (e) {
            results.push({ name: t.name, status: 'OFFLINE', latency: -1 });
        }
    }
    return results;
}

// ==========================================
// SERVER LOGIC
// ==========================================

const server = http.createServer(async (req, res) => {
    // Aplicar WAF
    if (!wafMiddleware(req, res)) return;

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const path = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Static Routes with Correct Content-Type
    if (path === '/admin' || path === '/admin/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(DASHBOARD_PATH).pipe(res);
        return;
    }
    if (path === '/admin/dashboard-new.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'dashboards', 'dashboard-new.js')).pipe(res);
        return;
    }
    if (path === '/api/dashboard_users' || path === '/user-dashboard') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'mini-services', 'dashboard_users.html')).pipe(res);
        return;
    }
    if (path === '/mini-services/dashboard_users.js' || path === '/api/dashboard_users.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'mini-services', 'dashboard_users.js')).pipe(res);
        return;
    }
    if (path === '/consultas') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'mini-services', 'consultas.html')).pipe(res);
        return;
    }
    if (path === '/mini-services/consultas.js' || path === '/consultas/consultas.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'mini-services', 'consultas.js')).pipe(res);
        return;
    }
    if (path === '/docs') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'docs', 'index.html')).pipe(res);
        return;
    }
    if (path === '/docs/api-documentation.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'docs', 'api-documentation.js')).pipe(res);
        return;
    }

    // Admin API
    if (path.startsWith('/api/admin/')) {
        const apiKey = query.apikey;
        
        if (path === '/api/admin/validate' && req.method === 'POST') {
            const ip = req.socket.remoteAddress;
            const attempts = loginAttempts.get(ip) || 0;
            if (attempts > 5) {
                res.writeHead(429, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Muitas tentativas. Tente novamente mais tarde.' }));
                return;
            }

            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { username, password } = JSON.parse(body);
                    if (username === 'admin' && password === ADMIN_KEY) {
                        loginAttempts.delete(ip);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, adminKey: ADMIN_KEY }));
                    } else { 
                        loginAttempts.set(ip, attempts + 1);
                        setTimeout(() => loginAttempts.delete(ip), 15 * 60 * 1000); // Reset após 15 min
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false })); 
                    }
                } catch (e) { res.writeHead(400); res.end(); }
            });
            return;
        }

        if (apiKey !== ADMIN_KEY) { 
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' })); 
            return; 
        }

        if (path === '/api/admin/stats') {
            const keys = loadApiKeys();
            const health = await checkExternalHealth();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                totalRequests: systemStats.totalRequests,
                errors: systemStats.errors,
                uptime: Date.now() - systemStats.startTime,
                keys: keys,
                endpointHits: systemStats.endpointHits,
                deviceHits: systemStats.deviceHits,
                logs: liveLogs,
                health: health,
                config: freeConfig
            }));
        } else if (path === '/api/admin/keys/list') {
            const keys = loadApiKeys();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, keys }));
        } else if (path === '/api/admin/audit') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            if (fs.existsSync(AUDIT_LOGS_FILE)) {
                fs.createReadStream(AUDIT_LOGS_FILE).pipe(res);
            } else { res.end(JSON.stringify([])); }
        } else if (path === '/api/admin/keys/update' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { target, owner, role, active, dailyLimit } = JSON.parse(body);
                const keys = loadApiKeys();
                if (keys[target]) {
                    if (owner !== undefined) keys[target].owner = owner;
                    if (role !== undefined) keys[target].role = role;
                    if (active !== undefined) keys[target].active = active;
                    if (dailyLimit !== undefined) keys[target].dailyLimit = parseInt(dailyLimit);
                    saveApiKeys(keys);
                    auditLog(ADMIN_KEY, 'ADMIN', 'UPDATE_KEY', `Key: ${target}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else { res.writeHead(404); res.end(); }
            });
        } else if (path === '/api/admin/keys/delete' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { target } = JSON.parse(body);
                const keys = loadApiKeys();
                if (keys[target]) {
                    delete keys[target];
                    saveApiKeys(keys);
                    auditLog(ADMIN_KEY, 'ADMIN', 'DELETE_KEY', `Key: ${target}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else { res.writeHead(404); res.end(); }
            });
        } else if (path === '/api/admin/keys/create' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { owner, role, dailyLimit } = JSON.parse(body);
                const keys = loadApiKeys();
                const newKey = 'MUTANOX-' + generateUid(24).toUpperCase();
                keys[newKey] = {
                    owner: owner || 'Novo Usuário',
                    role: role || 'user',
                    active: true,
                    usageCount: 0,
                    dailyUsage: 0,
                    dailyLimit: parseInt(dailyLimit) || 0,
                    lastUsed: null,
                    lastReset: new Date().toDateString(),
                    createdAt: new Date().toISOString()
                };
                saveApiKeys(keys);
                auditLog(ADMIN_KEY, 'ADMIN', 'CREATE_KEY', `Key: ${newKey}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, key: newKey }));
            });
        } else if (path === '/api/admin/endpoints/list') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, endpoints: endpointsConfig, stats: systemStats.endpointHits }));
        } else if (path === '/api/admin/endpoints/update' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { id, maintenance, active, name } = JSON.parse(body);
                if (endpointsConfig[id]) {
                    if (maintenance !== undefined) endpointsConfig[id].maintenance = maintenance;
                    if (active !== undefined) endpointsConfig[id].active = active;
                    if (name !== undefined) endpointsConfig[id].name = name;
                    saveEndpointsConfig();
                    auditLog(ADMIN_KEY, 'ADMIN', 'UPDATE_ENDPOINT', `Endpoint: ${id}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else { res.writeHead(404); res.end(); }
            });
        } else if (path === '/api/admin/miniservice/stats') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                config: freeConfig,
                usageHistory: systemStats.miniServiceHistory || []
            }));
        } else if (path === '/api/admin/miniservice/update' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    freeConfig = { ...freeConfig, ...data };
                    saveFreeConfig();
                    
                    // Notificar todos os clientes via WebSocket sobre a mudança de configuração
                    broadcast({
                        type: 'CONFIG_UPDATE',
                        config: freeConfig
                    });
                    
                    auditLog(ADMIN_KEY, 'ADMIN', 'UPDATE_MINISERVICE', 'Mini Service configuration updated');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    res.writeHead(400); res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
        } else if (path === '/api/admin/docs/read') {
            const docsPath = pathModule.join(__dirname, 'docs', 'api-documentation.js');
            if (fs.existsSync(docsPath)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, content: fs.readFileSync(docsPath, 'utf8') }));
            } else { res.writeHead(404); res.end(); }
        } else if (path === '/api/admin/docs/update' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { content } = JSON.parse(body);
                const docsPath = pathModule.join(__dirname, 'docs', 'api-documentation.js');
                fs.writeFileSync(docsPath, content);
                auditLog(ADMIN_KEY, 'ADMIN', 'UPDATE_DOCS', 'API Documentation updated');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            });
        } else if (path === '/api/admin/free/update' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const data = JSON.parse(body);
                freeConfig = { ...freeConfig, ...data };
                saveFreeConfig();
                auditLog(ADMIN_KEY, 'ADMIN', 'UPDATE_CONFIG', 'Global config updated');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            });
        } else if (path === '/api/admin/protection/bulk' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { list } = JSON.parse(body);
                    list.forEach(item => {
                        const id = generateUid(12);
                        fs.writeFileSync(pathModule.join(PROTECTED_USERS_DIR, `${id}.json`), JSON.stringify({
                            id, ...item, active: true, createdAt: new Date().toISOString()
                        }, null, 2));
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, count: list.length }));
                } catch (e) { res.writeHead(400); res.end(); }
            });
        } else if (path === '/api/admin/waf/update' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data.blacklist) wafConfig.blacklist = new Set(data.blacklist);
                    if (data.rateLimit) wafConfig.rateLimit = data.rateLimit;
                    wafConfig.antiDdos = !!data.antiDdos;
                    auditLog(ADMIN_KEY, 'ADMIN', 'WAF_UPDATE', 'WAF rules updated');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) { res.writeHead(400); res.end(); }
            });
        } else if (path === '/api/admin/cache/clear') {
            clearCache(query.endpoint);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else if (path === '/api/admin/endpoint/add' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { name, code, params } = JSON.parse(body);
                    if (!name || !code) throw new Error('Missing name or code');
                    
                    const epPath = pathModule.join(__dirname, 'endpoints', `${name}.js`);
                    if (!fs.existsSync(pathModule.join(__dirname, 'endpoints'))) fs.mkdirSync(pathModule.join(__dirname, 'endpoints'));
                    fs.writeFileSync(epPath, code);
                    
                    endpointsConfig[name] = { 
                        active: true, 
                        maintenance: false, 
                        latency: 0, 
                        rateLimit: 60,
                        params: params || [],
                        dynamic: true 
                    };
                    saveEndpointsConfig();
                    
                    // Atualizar documentação automaticamente
                    updateAutoDocs();
                    
                    auditLog(ADMIN_KEY, 'ADMIN', 'ENDPOINT_ADDED', `New endpoint ${name} deployed`);
                    broadcast({ type: 'ENDPOINTS_UPDATE', endpoints: endpointsConfig });
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) { res.writeHead(400); res.end(JSON.stringify({ success: false, error: e.message })); }
            });
        } else if (path === '/api/admin/endpoint/read') {
            const name = query.name;
            const epPath = pathModule.join(__dirname, 'endpoints', `${name}.js`);
            if (fs.existsSync(epPath)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, code: fs.readFileSync(epPath, 'utf8') }));
            } else { res.writeHead(404); res.end(); }
        } else if (path === '/api/admin/endpoint/update' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { name, code } = JSON.parse(body);
                    const epPath = pathModule.join(__dirname, 'endpoints', `${name}.js`);
                    fs.writeFileSync(epPath, code);
                    auditLog(ADMIN_KEY, 'ADMIN', 'ENDPOINT_UPDATED', `Endpoint ${name} code updated`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) { res.writeHead(400); res.end(); }
            });
        } else if (path === '/api/admin/endpoint/test' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { code, params } = JSON.parse(body);
                    // Simulação de teste
                    const result = { status: 'success', message: 'Endpoint test simulation successful', data: { received: params } };
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, result }));
                } catch (e) { res.writeHead(200); res.end(JSON.stringify({ success: false, error: e.message })); }
            });
        }
        return;
    }

    // User API
    if (path === '/api/user/stats') {
        const apiKey = query.apikey;
        const auth = validateAndTrackKey(apiKey, true);
        
        if (!auth.valid) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'API Key invalida' }));
            return;
        }
        
        const keys = loadApiKeys();
        const keyData = keys[apiKey];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            owner: keyData.owner,
            role: keyData.role,
            active: keyData.active,
            usageCount: keyData.usageCount || 0,
            dailyUsage: keyData.dailyUsage || 0,
            dailyLimit: keyData.dailyLimit || 0,
            createdAt: keyData.createdAt,
            lastUsed: keyData.lastUsed,
            expiresAt: keyData.expiresAt,
            endpointHits: systemStats.endpointHits
        }));
        return;
    }
    
    if (path === '/api/user/webhooks' && req.method === 'POST') {
        const apiKey = query.apikey;
        const auth = validateAndTrackKey(apiKey, true);
        if (!auth.valid) { res.writeHead(401); res.end(); return; }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { webhookUrl } = JSON.parse(body);
            const keys = loadApiKeys();
            keys[apiKey].webhookUrl = webhookUrl;
            saveApiKeys(keys);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    if (path === '/api/user/audit') {
        const apiKey = query.apikey;
        const auth = validateAndTrackKey(apiKey, true);
        if (!auth.valid) { res.writeHead(401); res.end(); return; }
        
        let logs = [];
        if (fs.existsSync(AUDIT_LOGS_FILE)) {
            try { logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8')); } catch (e) {}
        }
        const userLogs = logs.filter(l => l.apiKey && apiKey.startsWith(l.apiKey.replace('...', ''))).slice(0, 100);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(userLogs));
        return;
    }

    if (path === '/api/user/feedback' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { rating, comment, endpoint } = JSON.parse(body);
                auditLog('SYSTEM', 'FEEDBACK', sanitizeInput(endpoint), `Rating: ${rating}, Comment: ${sanitizeInput(comment)}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400); res.end();
            }
        });
        return;
    }

    if (path === '/api/user/support' && req.method === 'POST') {
        const apiKey = query.apikey;
        const auth = validateAndTrackKey(apiKey, true);
        
        if (!auth.valid) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false }));
            return;
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { subject, message } = JSON.parse(body);
            auditLog(apiKey, 'USER', 'SUPPORT_REQUEST', `${subject}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }
    
    // Public API
    if (path === '/api/consultas') {
        const apiKey = query.apikey;
        const tipo = query.tipo;

        if (!tipo) { 
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sucesso: false, erro: 'Tipo não especificado' })); 
            return; 
        }

        if (endpointsConfig[tipo] && endpointsConfig[tipo].maintenance) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sucesso: false, erro: freeConfig.maintenanceMessage }));
            return;
        }

        const auth = validateAndTrackKey(apiKey, false, req.headers['user-agent']);
        if (!auth.valid && !freeConfig.active) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sucesso: false, erro: auth.error || 'API Key inválida' }));
            return;
        }

        if (!auth.isAdmin) {
            if (tipo === 'cpf' && isProtected({ cpf: query.cpf })) { 
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ sucesso: false, protegido: true, mensagem: freeConfig.protectionMessage })); 
                return; 
            }
            if (tipo === 'nome' && isProtected({ nome: query.q })) { 
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ sucesso: false, protegido: true, mensagem: freeConfig.protectionMessage })); 
                return; 
            }
            if (tipo === 'numero' && isProtected({ numero: query.q })) { 
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ sucesso: false, protegido: true, mensagem: freeConfig.protectionMessage })); 
                return; 
            }
        }

        if (!auth.valid && freeConfig.active) {
            // Adicionar à fila se for consulta gratuita
            requestQueue.push({ req, res, tipo, query, apiKey });
            if (requestQueue.length > 10) {
                res.writeHead(429, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ sucesso: false, erro: 'Fila cheia, tente novamente em instantes' }));
                return;
            }
            processQueue();
            return;
        }

        await handleApiRequest(req, res, tipo, query, apiKey);
        return;
    }

    res.writeHead(404); res.end();
});

async function handleApiRequest(req, res, tipo, query, apiKey) {
    systemStats.endpointHits[tipo] = (systemStats.endpointHits[tipo] || 0) + 1;
    saveStats();
    auditLog(apiKey, 'QUERY', tipo, `Query: ${query.q || query.cpf || query.id}`);

    // Verificar Cache
    const cacheKey = `${tipo}:${JSON.stringify(query)}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...cachedData, cached: true }));
        return;
    }

    let result;
    try {
        // Verificar se é um endpoint dinâmico
        if (endpointsConfig[tipo] && endpointsConfig[tipo].dynamic) {
            const epPath = pathModule.join(__dirname, 'endpoints', `${tipo}.js`);
            if (fs.existsSync(epPath)) {
                const code = fs.readFileSync(epPath, 'utf8');
                // Execução segura simulada
                const epFn = new Function('query', 'fetch', `return (async () => { ${code} })();`);
                const data = await epFn(query, fetch);
                result = { sucesso: true, ...data, criador: '@MutanoX' };
            } else {
                result = { sucesso: false, erro: 'Arquivo do endpoint não encontrado' };
            }
        } else {
            switch (tipo.toLowerCase()) {
                case 'cpf': result = await consultarCPF(query.cpf); break;
                case 'nome': result = await consultarNome(query.q); break;
                case 'numero': result = await consultarNumero(query.q); break;
                case 'bypasscf': result = await bypassCloudflare(query.url, query.siteKey || '0x4AAAAAAAdJZmNxW54o-Gvd', query.type || 'turnstile-min', query.proxy || '', query.apikey || ADMIN_KEY); break;
                case 'infoff': result = await consultarInfoFF(query.id); break;
                case 'downloader': result = await allInOneDownloader(query.url, query.apikey || ADMIN_KEY); break;
                case 'github': result = await githubSearch(query.username, query.apikey || ADMIN_KEY); break;
                case 'gimage': result = await googleImage(query.q || query.query, query.apikey || ADMIN_KEY); break;
                case 'pinterest': result = await pinterest(query.q || query.query, query.apikey || ADMIN_KEY); break;
                case 'roblox': result = await robloxStalk(query.username, query.apikey || ADMIN_KEY); break;
                case 'tiktok': result = await tiktokSearch(query.username, query.apikey || ADMIN_KEY); break;
                case 'yt': result = await youtubeSearch(query.q || query.query, query.apikey || ADMIN_KEY); break;
                case 'video': result = await textToVideo(query.prompt, query.quality || '1080p', query.ratio || '9:16', query.apikey || ADMIN_KEY); break;
                case 'nsfw': result = await nsfwImageGen(query.prompt, query.negative || 'blurry,low quality', query.apikey || ADMIN_KEY); break;
                case 'bypass': result = await bypassCity(query.url); break;
                default: result = { sucesso: false, erro: 'Tipo desconhecido' };
            }
        }
        
        // Adicionar publicidade se for consulta gratuita
        if (!apiKey || apiKey === 'PUBLIC') {
            result.ad = {
                text: freeConfig.adBanner,
                link: freeConfig.adLink
            };
        }

        if (result.sucesso) setCache(cacheKey, result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    } catch (e) {
        systemStats.errors++; saveStats();
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: false, erro: e.message }));
    }
}

const wss = new WebSocket.Server({ server });

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            // Se o cliente tiver uma API Key associada (enviada no protocolo ou mensagem inicial), 
            // poderíamos filtrar dados, mas por enquanto enviamos o estado global de stats
            client.send(message);
        }
    });
}

// Atualização periódica de estatísticas para todos os clientes conectados
setInterval(() => {
    broadcast({
        type: 'STATS_UPDATE',
        totalRequests: systemStats.totalRequests,
        errors: systemStats.errors,
        uptime: Date.now() - systemStats.startTime,
        endpointHits: systemStats.endpointHits,
        health: systemStats.health || [],
        keys: loadApiKeys() // Opcional: apenas para admin, mas simplificando para o teste
    });
}, 5000);

// Monitoramento de Latência Real-time (Usando a função já declarada acima)

// Broadcast stats every 5 seconds
setInterval(async () => {
    const health = await checkExternalHealth();
    const keys = loadApiKeys();
    broadcast({
        type: 'STATS_UPDATE',
        totalRequests: systemStats.totalRequests,
        errors: systemStats.errors,
        uptime: Date.now() - systemStats.startTime,
        endpointHits: systemStats.endpointHits,
        deviceHits: systemStats.deviceHits,
        health: health,
        keys: keys
    });
}, 5000);

const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => { 
    console.log(`MUTANOX V10.2 PREMIUM RUNNING ON http://${HOST}:${PORT}`); 
    console.log(`Subdomain: mutano-x.discloud.app`);
});
async function consultarCPF(cpf) {
  if (!isValidString(cpf)) {
    return { sucesso: false, erro: 'CPF inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://world-ecletix.onrender.com/api/consultarcpf', { cpf });
    if (!apiUrl) throw new Error('URL inválida');

    console.log('[consultarCPF] Consultando CPF:', cpf);
    const response = await fetch(apiUrl);
    
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    if (!data || !data.resultado) {
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseCPFData(data.resultado);
    return { sucesso: true, dados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    console.error('[consultarCPF] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function consultarNome(nome) {
  if (!isValidString(nome)) {
    return { sucesso: false, erro: 'Nome inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://world-ecletix.onrender.com/api/nome-completo', { q: nome });
    if (!apiUrl) throw new Error('URL inválida');

    console.log('[consultarNome] Consultando nome:', nome);
    const response = await fetch(apiUrl);
    
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    if (!data || !data.resultado) {
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseNomeData(data.resultado);
    return { sucesso: true, totalResultados: parsedData.length, resultados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    console.error('[consultarNome] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function consultarNumero(numero) {
  if (!isValidString(numero)) {
    return { sucesso: false, erro: 'Número inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://world-ecletix.onrender.com/api/numero', { q: numero });
    if (!apiUrl) throw new Error('URL inválida');

    console.log('[consultarNumero] Consultando número:', numero);
    const response = await fetch(apiUrl);
    
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    if (!data || !data.resultado) {
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseTelefoneData(data.resultado);
    return { sucesso: true, totalResultados: parsedData.length, resultados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    console.error('[consultarNumero] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function bypassCloudflare(urlParam, siteKey = '0x4AAAAAAAdJZmNxW54o-Gvd', type = 'turnstile-min', proxy = '', apikey) {
  if (!isValidString(urlParam) || !isValidUrl(urlParam)) {
    return { sucesso: false, erro: 'URL inválida ou vazia', criador: '@MutanoX' };
  }

  if (!BYPASS_TYPES.includes(type)) {
    return { sucesso: false, erro: `Tipo inválido. Disponíveis: ${BYPASS_TYPES.join(', ')}`, tiposDisponiveis: BYPASS_TYPES, criador: '@MutanoX' };
  }

  try {
    console.log('[bypassCloudflare] Iniciando bypass:', { url: urlParam, type, siteKey });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const apiUrl = createApiUrl('https://anabot.my.id/api/tools/bypass', { url: urlParam, siteKey, type, proxy, apikey });
    if (!apiUrl) throw new Error('URL inválida');

    const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, data: data.data || null, url: urlParam, type, siteKey, criador: '@MutanoX' };
  } catch (error) {
    console.error('[bypassCloudflare] Erro:', error.message);
    let msg = 'Erro ao realizar bypass de Cloudflare';
    if (error.name === 'AbortError') msg = 'Tempo limite excedido (2 minutos)';
    return { sucesso: false, erro: msg, tiposDisponiveis: BYPASS_TYPES, criador: '@MutanoX' };
  }
}

async function textToVideo(prompt, quality = '1080p', ratio = '9:16', apikey) {
  if (!isValidString(prompt)) {
    return { success: false, erro: 'Prompt inválido ou vazio', criador: '@MutanoX' };
  }

  if (!isValidString(apikey)) apikey = DEFAULT_VIDEO_API_KEY;

  try {
    console.log('[textToVideo] Iniciando geração de vídeo:', { prompt, quality, ratio });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const apiUrl = createApiUrl('https://anabot.my.id/api/ai/text2video', { prompt, quality, ratio, apikey });
    if (!apiUrl) throw new Error('URL inválida');

    const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    return { success: data.success, video_url: data.data?.result || null, prompt, quality, ratio, criador: '@MutanoX' };
  } catch (error) {
    console.error('[textToVideo] Erro:', error.message);
    let msg = 'Erro ao gerar vídeo';
    if (error.name === 'AbortError') msg = 'Tempo limite excedido (5 minutos)';
    return { success: false, erro: msg, criador: '@MutanoX' };
  }
}

async function nsfwImageGen(prompt, negative = 'blurry,low quality', apikey) {
  if (!isValidString(prompt)) {
    return { success: false, erro: 'Prompt inválido ou vazio', criador: '@MutanoX' };
  }

  if (!isValidString(apikey)) apikey = DEFAULT_IMAGE_API_KEY;

  try {
    console.log('[nsfwImageGen] Iniciando geração de imagem NSFW:', { prompt, negative });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    const apiUrl = createApiUrl('https://anabot.my.id/api/ai/dalle3', { prompt, negative, apikey });
    if (!apiUrl) throw new Error('URL inválida');

    const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    return { success: data.success, image_url: data.data?.result || null, prompt, negative, criador: '@MutanoX' };
  } catch (error) {
    console.error('[nsfwImageGen] Erro:', error.message);
    let msg = 'Erro ao gerar imagem NSFW';
    if (error.name === 'AbortError') msg = 'Tempo limite excedido (3 minutos)';
    return { success: false, erro: msg, criador: '@MutanoX' };
  }
}

async function consultarInfoFF(id) {
  if (!isValidString(id)) {
    return { sucesso: false, erro: 'ID inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    console.log('[consultarInfoFF] Consultando ID:', id);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const apiUrl = createApiUrl('https://world-ecletix.onrender.com/api/infoff', { id });
    if (!apiUrl) throw new Error('URL inválida');

    const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    return { sucesso: true, id, dados: data, criador: '@MutanoX' };
  } catch (error) {
    console.error('[consultarInfoFF] Erro:', error.message);
    let msg = 'Erro ao consultar informações da conta Free Fire';
    if (error.name === 'AbortError') msg = 'Tempo limite excedido (1 minuto)';
    return { sucesso: false, erro: msg, criador: '@MutanoX' };
  }
}

async function allInOneDownloader(urlParam, apikey) {
  if (!isValidString(urlParam) || !isValidUrl(urlParam)) {
    return { sucesso: false, erro: 'URL inválida ou vazia', criador: '@MutanoX' };
  }

  if (!isValidString(apikey)) apikey = DEFAULT_API_KEY;

  try {
    console.log('[allInOneDownloader] Iniciando download:', urlParam);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const apiUrl = createApiUrl('https://anabot.my.id/api/download/aio', { url: urlParam, apikey });
    if (!apiUrl) throw new Error('URL inválida');

    const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, dados: data, criador: '@MutanoX' };
  } catch (error) {
    console.error('[allInOneDownloader] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function githubSearch(username, apikey) {
  if (!isValidString(username)) {
    return { sucesso: false, erro: 'Username inválido ou vazio', criador: '@MutanoX' };
  }

  if (!isValidString(apikey)) apikey = DEFAULT_API_KEY;

  try {
    console.log('[githubSearch] Buscando usuário:', username);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const apiUrl = createApiUrl('https://anabot.my.id/api/search/githubSearch', { username, apikey });
    if (!apiUrl) throw new Error('URL inválida');

    const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, dados: data, username, criador: '@MutanoX' };
  } catch (error) {
    console.error('[githubSearch] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function googleImage(query, apikey) {
  if (!isValidString(query)) {
    return { sucesso: false, erro: 'Query inválida ou vazia', criador: '@MutanoX' };
  }

  if (!isValidString(apikey)) apikey = DEFAULT_API_KEY;

  try {
    console.log('[googleImage] Buscando imagens:', query);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const apiUrl = createApiUrl('https://anabot.my.id/api/search/gimage', { query, apikey });
    if (!apiUrl) throw new Error('URL inválida');

    const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, dados: data, query, criador: '@MutanoX' };
  } catch (error) {
    console.error('[googleImage] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function pinterest(query, apikey) {
  if (!isValidString(query)) {
    return { sucesso: false, erro: 'Query inválida ou vazia', criador: '@MutanoX' };
  }

  if (!isValidString(apikey)) apikey = DEFAULT_API_KEY;

  try {
    console.log('[pinterest] Buscando imagens:', query);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const apiUrl = createApiUrl('https://anabot.my.id/api/search/pinterest', { query, apikey });
    if (!apiUrl) throw new Error('URL inválida');

    const response = await fetch(apiUrl, { method: 'GET', signal: controller.signal });

    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API retornou status ${response.status}`);

    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, dados: data, query, criador: '@MutanoX' };
  } catch (error) {
    console.error('[pinterest] Erro:', error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function robloxStalk(username, apikey) {
  if (!isValidString(username)) {
    return { sucesso: false, erro: 'Username inválido ou vazio', criador: '@MutanoX' };
  }
  if (!isValidString(apikey)) apikey = DEFAULT_API_KEY;
  try {
    const apiUrl = createApiUrl('https://anabot.my.id/api/stalk/roblox', { username, apikey });
    const response = await fetch(apiUrl);
    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, dados: data, username, criador: '@MutanoX' };
  } catch (error) {
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function tiktokSearch(username, apikey) {
  if (!isValidString(username)) {
    return { sucesso: false, erro: 'Username inválido ou vazio', criador: '@MutanoX' };
  }
  if (!isValidString(apikey)) apikey = DEFAULT_API_KEY;
  try {
    const apiUrl = createApiUrl('https://anabot.my.id/api/search/tiktok', { username, apikey });
    const response = await fetch(apiUrl);
    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, dados: data, username, criador: '@MutanoX' };
  } catch (error) {
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function youtubeSearch(query, apikey) {
  if (!isValidString(query)) {
    return { sucesso: false, erro: 'Query inválida ou vazia', criador: '@MutanoX' };
  }
  if (!isValidString(apikey)) apikey = DEFAULT_API_KEY;
  try {
    const apiUrl = createApiUrl('https://anabot.my.id/api/search/youtube', { query, apikey });
    const response = await fetch(apiUrl);
    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, dados: data, query, criador: '@MutanoX' };
  } catch (error) {
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function bypassCity(urlParam) {
  if (!isValidString(urlParam)) {
    return { sucesso: false, erro: 'URL inválida ou vazia', criador: '@MutanoX' };
  }
  try {
    const apiUrl = createApiUrl('https://anabot.my.id/api/tools/bypasscity', { url: urlParam });
    const response = await fetch(apiUrl);
    const data = await response.json();
    return { sucesso: data.success !== undefined ? data.success : true, dados: data, url: urlParam, criador: '@MutanoX' };
  } catch (error) {
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}



function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

const BYPASS_TYPES = ['turnstile-min', 'hcaptcha', 'recaptcha'];
