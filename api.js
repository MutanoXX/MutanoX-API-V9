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
const MINI_SERVICES_KEYS_FILE = pathModule.join(__dirname, 'mini_services_keys.json');
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

// Mini Services Keys Management
let miniServicesKeys = {};

function loadMiniServicesKeys() {
    if (fs.existsSync(MINI_SERVICES_KEYS_FILE)) {
        try {
            miniServicesKeys = JSON.parse(fs.readFileSync(MINI_SERVICES_KEYS_FILE, 'utf8'));
        } catch (e) {
            console.error('Erro ao carregar mini services keys:', e);
            miniServicesKeys = {};
        }
    }
}

function saveMiniServicesKeys() {
    fs.writeFileSync(MINI_SERVICES_KEYS_FILE, JSON.stringify(miniServicesKeys, null, 2));
}

function validateMiniServiceKey(serviceId, key) {
    if (!miniServicesKeys[serviceId]) return false;
    return miniServicesKeys[serviceId].apiKey === key && miniServicesKeys[serviceId].enabled;
}

function generateMiniServiceKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    for (let i = 0; i < 12; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

loadMiniServicesKeys();

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

loadEndpointsConfig();

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
    deviceHits: { desktop: 0, mobile: 0, tablet: 0 },
    endpointLatency: {},
    endpointErrors: {},
    endpointLastUsed: {},
    endpointRequestTimeline: {}
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
const CACHE_TTL = 300000; // 5 minutos (aumentado para melhor performance)
const REQUEST_TIMEOUT = 30000; // 30 segundos timeout para APIs externas

function getCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp + entry.ttl) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data, ttl = CACHE_TTL) {
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
            systemStats.endpointLatency = stats.endpointLatency || {};
            systemStats.endpointErrors = stats.endpointErrors || {};
            systemStats.endpointLastUsed = stats.endpointLastUsed || {};
            systemStats.endpointRequestTimeline = stats.endpointRequestTimeline || {};
        } catch (error) {}
    }
}
function saveStats() {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(systemStats, null, 2));
    } catch (error) {}
}
loadStats();

// ==========================================
// LOGGING SYSTEM - DETALHADO E ESTRUTURADO
// ==========================================

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
};

let currentLogLevel = LOG_LEVELS.INFO; // Nível de log padrão

function log(level, type, message, details = null) {
    if (level < currentLogLevel) return;

    const timestamp = new Date().toLocaleString('pt-BR');
    const levelStr = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'][level];
    const coloredMessage = level === LOG_LEVELS.ERROR || level === LOG_LEVELS.CRITICAL
        ? `\x1b[31m${message}\x1b[0m` // Vermelho para erros
        : message;

    liveLogs.unshift({ timestamp, type, level: levelStr, message: coloredMessage, details });
    if (liveLogs.length > 50) liveLogs.pop();

    // Logs de erro sempre vão para console.error
    if (level >= LOG_LEVELS.ERROR) {
        console.error(`[${timestamp}] [${levelStr}] [${type}] ${message}`, details || '');
    } else if (level === LOG_LEVELS.WARN) {
        console.warn(`[${timestamp}] [${levelStr}] [${type}] ${message}`, details || '');
    } else {
        console.log(`[${timestamp}] [${levelStr}] [${type}] ${message}`, details ? `(${details})` : '');
    }
}

function logDebug(type, message, details = null) {
    log(LOG_LEVELS.DEBUG, 'DEBUG', type, message, details);
}

function logInfo(type, message, details = null) {
    log(LOG_LEVELS.INFO, 'INFO', type, message, details);
}

function logWarn(type, message, details = null) {
    log(LOG_LEVELS.WARN, 'WARN', type, message, details);
}

function logError(type, message, details = null) {
    log(LOG_LEVELS.ERROR, 'ERROR', type, message, details);
}

function logCritical(type, message, details = null) {
    log(LOG_LEVELS.CRITICAL, 'CRITICAL', type, message, details);
}

// Auditoria Persistente
function auditLog(apiKey, type, action, details) {
    const logEntry = {
        id: crypto.randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        apiKey: apiKey ? (apiKey.substring(0, 8) + '...') : 'PUBLIC',
        type,
        action,
        details,
        ip: requestIP || 'N/A',
        userAgent: requestUA || 'N/A'
    };

    let logs = [];
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
        try { logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, 'utf8')); } catch (e) {}
    }
    logs.unshift(logEntry);
    if (logs.length > 1000) logs.pop();
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2));

    // Log também nos liveLogs
    logInfo('AUDIT', `${type}: ${action}`, details);
}

// ==========================================
// INPUT VALIDATION & SANITIZATION
// ==========================================

const VALIDATION_PATTERNS = {
    cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    numero: /^\d{10,11}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+/,
    cpfOnly: /^\d{11}$/,
    id: /^[a-zA-Z0-9_-]{6,32}$/
};

function validateAndSanitizeInput(type, value) {
    if (!isValidString(value)) {
        return { valid: false, error: 'Valor inválido ou vazio', sanitized: null };
    }

    let sanitized = value.trim();

    switch (type.toLowerCase()) {
        case 'cpf':
            // Remover caracteres não numéricos
            const cpfOnly = sanitized.replace(/\D/g, '');
            if (!VALIDATION_PATTERNS.cpfOnly.test(cpfOnly)) {
                return { valid: false, error: 'CPF inválido', sanitized: null };
            }
            // Formatar CPF
            sanitized = cpfOnly.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            break;

        case 'numero':
            // Remover caracteres não numéricos
            const numOnly = sanitized.replace(/\D/g, '');
            if (!VALIDATION_PATTERNS.numero.test(numOnly)) {
                return { valid: false, error: 'Número inválido', sanitized: null };
            }
            sanitized = numOnly;
            break;

        case 'nome':
            // Remover caracteres perigosos (SQL injection, XSS)
            sanitized = sanitized
                .replace(/[<>"'=;]/g, '') // Remove caracteres perigosos
                .replace(/\s+/g, ' ') // Remove espaços múltiplos
                .trim();
            // Verificar tamanho mínimo (2 caracteres)
            if (sanitized.length < 2) {
                return { valid: false, error: 'Nome deve ter pelo menos 2 caracteres', sanitized: null };
            }
            break;

        case 'email':
            if (!VALIDATION_PATTERNS.email.test(sanitized)) {
                return { valid: false, error: 'Email inválido', sanitized: null };
            }
            sanitized = sanitized.toLowerCase().trim();
            break;

        case 'url':
            if (!VALIDATION_PATTERNS.url.test(sanitized)) {
                return { valid: false, error: 'URL inválida', sanitized: null };
            }
            sanitized = sanitized.trim();
            break;

        case 'id':
            if (!VALIDATION_PATTERNS.id.test(sanitized)) {
                return { valid: false, error: 'ID inválido', sanitized: null };
            }
            sanitized = sanitized.trim();
            break;

        default:
            // Sanitização genérica
            sanitized = sanitized.replace(/[<>"'=;]/g, '').trim();
            break;
    }

    return { valid: true, sanitized, type };
}

function sanitizeInput(input) {
    // Sanitização genérica e agressiva (removendo todos os caracteres perigosos)
    if (typeof input !== 'string') return '';
    return input
        .replace(/[<>"'=;`\\]/g, '') // Remove todos os caracteres perigosos
        .replace(/\s+/g, ' ') // Remove espaços múltiplos
        .trim();
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
// RETRY SYSTEM WITH EXPONENTIAL BACKOFF
// ==========================================

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo
const RETRY_DELAY_MULTIPLIER = 2; // Dobra o delay a cada retry (1s, 2s, 4s)

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    let lastError;
    let delay = INITIAL_RETRY_DELAY;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Verificar se a resposta é OK
            if (response.ok) {
                const data = await response.json();
                return data;
            } else if (response.status === 429) {
                // Rate limiting - esperar mais tempo
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            } else {
                throw new Error(`API retornou status ${response.status}`);
            }
        } catch (error) {
            lastError = error;
            console.warn(`[Retry System] Attempt ${attempt + 1}/${retries + 1} failed:`, error.message);

            if (attempt < retries) {
                console.log(`[Retry System] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= RETRY_DELAY_MULTIPLIER;
            }
        }
    }

    // Se todas as tentativas falharam
    throw new Error(`Todas as ${retries + 1} tentativas falharam. Último erro: ${lastError.message}`);
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
const HEALTH_CHECK_TIMEOUT = 10000; // 10 segundos (aumentado de 5)
async function checkExternalHealth() {
    const targets = [
        { name: 'World Ecletix', url: 'https://anabot.my.id' },
        { name: 'AnaBot API', url: 'https://anabot.my.id' },
        { name: 'Paxsenix', url: 'https://api.paxsenix.org' }
    ];
    const results = [];
    for (const t of targets) {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);
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
// MONITORAMENTO DE SAÚDE DO SISTEMA (SYSTEM HEALTH MONITORING)
// ==========================================

const SYSTEM_HEALTH = {
    startTime: Date.now(),
    lastCheck: Date.now(),
    checks: {
        apiExternal: { status: 'UNKNOWN', latency: 0, lastError: null },
        cache: { status: 'UNKNOWN', entries: 0 },
        memory: { status: 'UNKNOWN', usage: 0 },
        database: { status: 'UNKNOWN', connected: false },
        websocket: { status: 'UNKNOWN', clients: 0 }
    }
};

// Verificar saúde do sistema a cada 60 segundos
setInterval(async () => {
    try {
        SYSTEM_HEALTH.lastCheck = Date.now();

        // 1. Verificar APIs externas
        const externalHealth = await checkExternalHealth();
        SYSTEM_HEALTH.checks.apiExternal = {
            status: externalHealth.every(t => t.status === 'ONLINE') ? 'HEALTHY' : 'DEGRADED',
            latency: externalHealth.reduce((sum, t) => sum + (t.latency > 0 ? t.latency : 0), 0) / externalHealth.length,
            details: externalHealth,
            lastError: externalHealth.find(t => t.status === 'OFFLINE')?.name || null
        };

        // 2. Verificar cache
        SYSTEM_HEALTH.checks.cache = {
            status: cache.size > 0 ? 'HEALTHY' : 'EMPTY',
            entries: cache.size
        };

        // 3. Verificar memória
        const memUsage = process.memoryUsage();
        const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        SYSTEM_HEALTH.checks.memory = {
            status: memPercent < 80 ? 'HEALTHY' : (memPercent < 90 ? 'WARNING' : 'CRITICAL'),
            usage: Math.round(memPercent),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
        };

        // 4. Verificar WebSocket
        const wsClients = wss.clients ? wss.clients.size : 0;
        SYSTEM_HEALTH.checks.websocket = {
            status: wsClients > 0 ? 'HEALTHY' : 'EMPTY',
            clients: wsClients
        };

        // 5. Verificar taxa de erro
        const totalRequests = systemStats.totalRequests || 0;
        const totalErrors = systemStats.errors || 0;
        const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0.00';
        SYSTEM_HEALTH.checks.errorRate = {
            status: errorRate < 5 ? 'HEALTHY' : (errorRate < 10 ? 'WARNING' : 'CRITICAL'),
            rate: parseFloat(errorRate),
            totalRequests,
            totalErrors
        };

        // 6. Calcular uptime
        const uptime = Date.now() - SYSTEM_HEALTH.startTime;
        const uptimeSeconds = Math.floor(uptime / 1000);
        const uptimeDays = Math.floor(uptimeSeconds / 86400);
        const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

        SYSTEM_HEALTH.uptime = {
            days: uptimeDays,
            hours: uptimeHours,
            minutes: uptimeMinutes,
            milliseconds: uptime,
            formatted: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`
        };

        // Log de saúde do sistema
        const overallHealth = Object.values(SYSTEM_HEALTH.checks)
            .filter(c => c.status !== 'HEALTHY').length === 0 ? 'HEALTHY' : 'DEGRADED';

        if (overallHealth === 'DEGRADED') {
            logWarn('SYSTEM_HEALTH', 'Sistema degradado', {
                checks: SYSTEM_HEALTH.checks,
                uptime: SYSTEM_HEALTH.uptime.formatted
            });
        } else {
            logDebug('SYSTEM_HEALTH', 'Sistema saudável', {
                checks: SYSTEM_HEALTH.checks,
                uptime: SYSTEM_HEALTH.uptime.formatted
            });
        }

        // Salvar stats de saúde do sistema
        saveStats();

    } catch (error) {
        logError('SYSTEM_HEALTH', 'Erro ao verificar saúde do sistema', error.message);
    }
}, 60000); // A cada 60 segundos

// ==========================================
// INTELLIGENT RATE LIMITING SYSTEM
// ==========================================

const RATE_LIMIT_CONFIG = {
    // Limites globais
    global: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000
    },
    // Limites por endpoint
    endpoint: {
        'cpf': { requestsPerMinute: 10, requestsPerHour: 100 },
        'nome': { requestsPerMinute: 10, requestsPerHour: 100 },
        'numero': { requestsPerMinute: 10, requestsPerHour: 100 },
        'default': { requestsPerMinute: 30, requestsPerHour: 300 }
    },
    // Limites por tipo de chave (API key vs mini service)
    keyType: {
        'admin': { requestsPerMinute: 120, requestsPerHour: 2000 }, // Admin sem limite
        'standard': { requestsPerMinute: 60, requestsPerHour: 1000 },
        'mini-service': { requestsPerMinute: 30, requestsPerHour: 300 }
    },
    // Janela de tempo em milissegundos
    windows: {
        minute: 60000,
        hour: 3600000,
        day: 86400000
    }
};

// Rastreamento de requests por IP e API key
const requestTracker = {
    byIP: new Map(), // IP -> { count, lastReset, history: [], blockedUntil }
    byKey: new Map(), // API key -> { count, lastReset, history: [], blockedUntil }
    byIPAndKey: new Map() // "IP:KEY" -> { count, lastReset, blockedUntil }
};

function checkRateLimit(ip, apiKey, endpoint) {
    const now = Date.now();

    // 1. Verificar limite por IP
    const ipLimit = requestTracker.byIP.get(ip);
    if (!ipLimit) {
        requestTracker.byIP.set(ip, {
            count: 1,
            lastReset: now,
            history: [now],
            blockedUntil: null
        });
    } else {
        // Resetar contadores se a janela passou
        if (now - ipLimit.lastReset > RATE_LIMIT_CONFIG.windows.minute) {
            ipLimit.count = 1;
            ipLimit.lastReset = now;
            ipLimit.history = [now];
        } else {
            ipLimit.count++;
            ipLimit.history.push(now);
            // Manter apenas últimos 1000 timestamps
            if (ipLimit.history.length > 1000) {
                ipLimit.history.shift();
            }
        }

        // Verificar se IP está bloqueado
        if (ipLimit.blockedUntil && now < ipLimit.blockedUntil) {
            const remaining = Math.ceil((ipLimit.blockedUntil - now) / 1000);
            return {
                allowed: false,
                error: `IP bloqueado por excesso de requests. Tente novamente em ${remaining} segundos.`,
                retryAfter: remaining,
                type: 'IP_BLOCKED'
            };
        }

        // Verificar limite por minuto
        if (ipLimit.count > RATE_LIMIT_CONFIG.global.requestsPerMinute) {
            ipLimit.blockedUntil = now + 60000; // Bloquear por 1 minuto
            requestTracker.byIP.set(ip, ipLimit);
            logWarn('RATE_LIMIT', `IP ${ip} bloqueado por excesso de requests (${ipLimit.count}/min)`);
            return {
                allowed: false,
                error: 'Muitas requisições. Por favor, espere um momento.',
                retryAfter: 60,
                type: 'IP_LIMIT_EXCEEDED'
            };
        }
    }

    // 2. Verificar limite por API key
    if (apiKey) {
        const keyLimit = requestTracker.byKey.get(apiKey);
        if (!keyLimit) {
            requestTracker.byKey.set(apiKey, {
                count: 1,
                lastReset: now,
                history: [now],
                blockedUntil: null
            });
        } else {
            // Resetar contadores se a janela passou
            if (now - keyLimit.lastReset > RATE_LIMIT_CONFIG.windows.minute) {
                keyLimit.count = 1;
                keyLimit.lastReset = now;
                keyLimit.history = [now];
            } else {
                keyLimit.count++;
                keyLimit.history.push(now);
                // Manter apenas últimos 1000 timestamps
                if (keyLimit.history.length > 1000) {
                    keyLimit.history.shift();
                }
            }

            // Verificar se chave está bloqueada
            if (keyLimit.blockedUntil && now < keyLimit.blockedUntil) {
                const remaining = Math.ceil((keyLimit.blockedUntil - now) / 1000);
                return {
                    allowed: false,
                    error: `API key bloqueada por excesso de requests. Tente novamente em ${remaining} segundos.`,
                    retryAfter: remaining,
                    type: 'KEY_BLOCKED'
                };
            }

            // Verificar tipo da chave para aplicar limites específicos
            const keyData = loadApiKeys()[apiKey];
            let limitMultiplier = 1;

            if (keyData) {
                if (keyData.role === 'admin') {
                    limitMultiplier = Infinity; // Admin sem limite
                } else if (keyData.role === 'mini-service') {
                    limitMultiplier = 0.5; // Mini services têm metade do limite
                }
            }

            const effectiveLimit = Math.round(RATE_LIMIT_CONFIG.global.requestsPerMinute * limitMultiplier);

            if (keyLimit.count > effectiveLimit) {
                keyLimit.blockedUntil = now + 60000; // Bloquear por 1 minuto
                requestTracker.byKey.set(apiKey, keyLimit);
                logWarn('RATE_LIMIT', `API key ${apiKey.substring(0,8)}... bloqueada por excesso (${keyLimit.count}/min)`);
                return {
                    allowed: false,
                    error: 'Muitas requisições. Por favor, espere um momento.',
                    retryAfter: 60,
                    type: 'KEY_LIMIT_EXCEEDED'
                };
            }
        }
    }

    // 3. Verificar limite específico por endpoint
    const endpointLimit = RATE_LIMIT_CONFIG.endpoint[endpoint] || RATE_LIMIT_CONFIG.endpoint.default;
    const combinedKey = `${ip}:${endpoint}`;
    const combinedLimit = requestTracker.byIPAndKey.get(combinedKey);

    if (!combinedLimit) {
        requestTracker.byIPAndKey.set(combinedKey, {
            count: 1,
            lastReset: now,
            blockedUntil: null
        });
    } else {
        if (now - combinedLimit.lastReset > RATE_LIMIT_CONFIG.windows.minute) {
            combinedLimit.count = 1;
            combinedLimit.lastReset = now;
        } else {
            combinedLimit.count++;

            if (combinedLimit.count > endpointLimit.requestsPerMinute) {
                combinedLimit.blockedUntil = now + 60000;
                requestTracker.byIPAndKey.set(combinedKey, combinedLimit);
                logWarn('RATE_LIMIT', `IP+Endpoint ${ip}:${endpoint} bloqueado (${combinedLimit.count}/min)`);
                return {
                    allowed: false,
                    error: `Muitas requisições para este tipo de consulta. Tente novamente em 1 minuto.`,
                    retryAfter: 60,
                    type: 'ENDPOINT_LIMIT_EXCEEDED'
                };
            }
        }
    }

    return { allowed: true };
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
// IP e User-Agent para logs de auditoria
    const requestIP = req?.socket.remoteAddress || req?.headers["x-forwarded-for"];
    const requestUA = req?.headers["user-agent"];
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
    if (path === '/dashboards/dashboard-enhanced.js' || path === '/admin/dashboard-enhanced.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'dashboards', 'dashboard-enhanced.js')).pipe(res);
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
        fs.createReadStream(pathModule.join(__dirname, 'mini-services', 'consultas-new.html')).pipe(res);
        return;
    }
    if (path === '/mini-services/consultas-new.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'mini-services', 'consultas-new.js')).pipe(res);
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
    if (path === '/api/docs/endpoints') {
        const enrichedEndpoints = [];
        for (const [id, config] of Object.entries(endpointsConfig)) {
            if (!config.active) continue;
            enrichedEndpoints.push({
                id,
                name: config.name || id,
                description: config.description || 'Sem descrição',
                method: 'GET',
                url: `/api/consultas?tipo=${id}&apikey={apikey}`,
                params: config.params || [],
                active: config.active,
                maintenance: config.maintenance
            });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, endpoints: enrichedEndpoints }));
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
            const enrichedEndpoints = {};
            for (const [id, config] of Object.entries(endpointsConfig)) {
                const hits = systemStats.endpointHits[id] || 0;
                const errors = systemStats.endpointErrors[id] || 0;
                const latencies = systemStats.endpointLatency[id] || [];
                const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
                const lastUsed = systemStats.endpointLastUsed[id] || null;
                const errorRate = hits > 0 ? ((errors / hits) * 100).toFixed(2) : 0;
                
                // Calculate requests in last hour/day
                const now = Date.now();
                const timeline = systemStats.endpointRequestTimeline[id] || [];
                const requestsLastHour = timeline.filter(ts => now - ts < 3600000).length;
                const requestsLastDay = timeline.filter(ts => now - ts < 86400000).length;
                
                enrichedEndpoints[id] = {
                    ...config,
                    stats: {
                        totalRequests: hits,
                        totalErrors: errors,
                        avgLatency,
                        lastUsed,
                        errorRate: parseFloat(errorRate),
                        requestsLastHour,
                        requestsLastDay
                    }
                };
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, endpoints: enrichedEndpoints, stats: systemStats.endpointHits }));
        } else if (path.startsWith('/api/admin/endpoints/stats/')) {
            const endpointId = path.split('/').pop();
            const timeline = systemStats.endpointRequestTimeline[endpointId] || [];
            const latencies = systemStats.endpointLatency[endpointId] || [];
            const errors = systemStats.endpointErrors[endpointId] || 0;
            const hits = systemStats.endpointHits[endpointId] || 0;
            
            // Build hourly stats for last 24 hours
            const now = Date.now();
            const hourlyStats = [];
            for (let i = 23; i >= 0; i--) {
                const hourStart = now - (i * 3600000);
                const hourEnd = hourStart + 3600000;
                const count = timeline.filter(ts => ts >= hourStart && ts < hourEnd).length;
                hourlyStats.push({
                    hour: new Date(hourStart).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    requests: count
                });
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                endpointId,
                totalRequests: hits,
                totalErrors: errors,
                avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
                lastUsed: systemStats.endpointLastUsed[endpointId] || null,
                hourlyStats,
                recentLatencies: latencies.slice(-20)
            }));
        } else if (path === '/api/admin/endpoints/test-endpoint' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { endpointId, params } = JSON.parse(body);
                    if (!endpointsConfig[endpointId]) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
                        return;
                    }
                    
                    // Create a mock request to test the endpoint
                    const testQuery = new URLSearchParams(params).toString();
                    const testUrl = `/api/consultas?tipo=${endpointId}&${testQuery}&apikey=${ADMIN_KEY}`;
                    const startTime = Date.now();
                    
                    // Simulate internal test call
                    const mockReq = { headers: { 'user-agent': 'Admin-Test' } };
                    const testResult = { logs: [], response: null, latency: 0 };
                    
                    try {
                        // Direct call to handler
                        let result;
                        const query = { ...params, tipo: endpointId };
                        
                        if (endpointsConfig[endpointId].dynamic) {
                            const epPath = pathModule.join(__dirname, 'endpoints', `${endpointId}.js`);
                            if (fs.existsSync(epPath)) {
                                const code = fs.readFileSync(epPath, 'utf8');
                                const epFn = new Function('query', 'fetch', `return (async () => { ${code} })();`);
                                result = await epFn(params, fetch);
                            }
                        }
                        
                        testResult.response = result || { message: 'Test executed - check endpoint implementation' };
                        testResult.latency = Date.now() - startTime;
                        testResult.success = true;
                    } catch (e) {
                        testResult.response = { error: e.message };
                        testResult.success = false;
                        testResult.latency = Date.now() - startTime;
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, result: testResult }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
        } else if (path === '/api/admin/miniservice/endpoints-detail') {
            const endpointDetails = [];
            for (const [id, config] of Object.entries(endpointsConfig)) {
                const hits = systemStats.endpointHits[id] || 0;
                const latencies = systemStats.endpointLatency[id] || [];
                const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
                const errors = systemStats.endpointErrors[id] || 0;
                
                let status = 'healthy';
                if (errors > hits * 0.1) status = 'error';
                else if (avgLatency > 2000) status = 'slow';
                
                endpointDetails.push({
                    id,
                    name: config.name || id,
                    hits,
                    avgLatency,
                    status,
                    lastUsed: systemStats.endpointLastUsed[id] || null,
                    errorRate: hits > 0 ? ((errors / hits) * 100).toFixed(2) : 0
                });
            }
            
            endpointDetails.sort((a, b) => b.hits - a.hits);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                endpoints: endpointDetails,
                totalUsage: systemStats.totalRequests
            }));
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
        } else if (path === '/api/admin/database/stats') {
            // Database stats
            let totalRecords = 0;
            let protectedCount = 0;
            let dbSize = 0;

            try {
                if (fs.existsSync(PROTECTED_USERS_DIR)) {
                    const files = fs.readdirSync(PROTECTED_USERS_DIR);
                    protectedCount = files.filter(f => f.endsWith('.json')).length;
                    totalRecords = protectedCount; // Simplificação
                }

                const stats = fs.statSync(PROTECTED_USERS_DIR);
                dbSize = Math.round(stats.size / 1024); // KB

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    totalRecords,
                    protectedCount,
                    size: dbSize > 1024 ? `${(dbSize/1024).toFixed(2)}MB` : `${dbSize}KB`,
                    lastUpdate: new Date().toISOString()
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        } else if (path === '/api/admin/protection/list') {
            // List protected users
            try {
                const users = [];
                if (fs.existsSync(PROTECTED_USERS_DIR)) {
                    const files = fs.readdirSync(PROTECTED_USERS_DIR);
                    files.filter(f => f.endsWith('.json')).forEach(file => {
                        try {
                            const data = JSON.parse(fs.readFileSync(pathModule.join(PROTECTED_USERS_DIR, file), 'utf8'));
                            users.push({
                                id: file.replace('.json', ''),
                                ...data
                            });
                        } catch (e) {}
                    });
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, users }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        } else if (path === '/api/admin/protection/add' && req.method === 'POST') {
            // Add protected user
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { cpf, nome, numero } = JSON.parse(body);
                    if (!cpf && !nome && !numero) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Preencha pelo menos um campo' }));
                        return;
                    }

                    const id = generateUid(12);
                    const userData = {
                        id,
                        cpf: cpf || null,
                        nome: nome || null,
                        numero: numero || null,
                        active: true,
                        createdAt: new Date().toISOString()
                    };

                    fs.writeFileSync(pathModule.join(PROTECTED_USERS_DIR, `${id}.json`), JSON.stringify(userData, null, 2));
                    auditLog(ADMIN_KEY, 'ADMIN', 'ADD_PROTECTION', `User: ${nome || cpf || numero}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
        } else if (path === '/api/admin/protection/delete') {
            // Delete protected user
            const id = query.id;
            if (id && fs.existsSync(pathModule.join(PROTECTED_USERS_DIR, `${id}.json`))) {
                fs.unlinkSync(pathModule.join(PROTECTED_USERS_DIR, `${id}.json`));
                auditLog(ADMIN_KEY, 'ADMIN', 'DELETE_PROTECTION', `ID: ${id}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Proteção não encontrada' }));
            }
        } else if (path === '/api/admin/performance/stats') {
            // Performance stats
            try {
                const cacheEntries = [];
                let cacheHits = 0;
                let cacheMisses = 0;

                for (const [key, entry] of cache.entries()) {
                    cacheEntries.push({
                        key: key.substring(0, 50),
                        size: JSON.stringify(entry.data).length,
                        ttl: entry.ttl,
                        hits: entry.hits || 0,
                        createdAt: new Date(entry.timestamp).toISOString()
                    });
                }

                const memoryUsage = process.memoryUsage();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    cache: {
                        size: cache.size,
                        entries: cacheEntries,
                        hits: cacheHits,
                        misses: cacheMisses,
                        total: cacheHits + cacheMisses
                    },
                    memory: {
                        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                        total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
                    },
                    endpointLatency: systemStats.endpointLatency
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        } else if (path === '/api/admin/miniservices/list') {
            // List mini services
            try {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    services: miniServicesKeys
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        } else if (path === '/api/admin/miniservices/update' && req.method === 'POST') {
            // Update mini service
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { id, enabled, settings } = JSON.parse(body);
                    if (miniServicesKeys[id]) {
                        if (enabled !== undefined) miniServicesKeys[id].enabled = enabled;
                        if (settings) {
                            miniServicesKeys[id].settings = { ...miniServicesKeys[id].settings, ...settings };
                            if (settings.name) miniServicesKeys[id].name = settings.name;
                        }
                        saveMiniServicesKeys();
                        auditLog(ADMIN_KEY, 'ADMIN', 'UPDATE_MINISERVICE', `Service: ${id}`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Mini service não encontrado' }));
                    }
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
        } else if (path === '/api/admin/miniservices/regenerate-key' && req.method === 'POST') {
            // Regenerate mini service key
            const id = query.id;
            if (miniServicesKeys[id]) {
                const newKey = `MS-${id.toUpperCase()}-${generateMiniServiceKey()}`;
                miniServicesKeys[id].apiKey = newKey;
                miniServicesKeys[id].stats.totalRequests = 0;
                miniServicesKeys[id].stats.dailyRequests = 0;
                saveMiniServicesKeys();
                auditLog(ADMIN_KEY, 'ADMIN', 'REGENERATE_KEY', `Service: ${id}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, newKey }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Mini service não encontrado' }));
            }
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
        // Adicionar headers CORS e tratamento de erro
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        console.log(`[API] Requisição /api/consultas recebida`);
        console.log(`[API] URL completa: ${req.url}`);
        console.log(`[API] IP: ${req?.socket.remoteAddress || req?.headers['x-forwarded-for'] || 'N/A'}`);
        console.log(`[API] User-Agent: ${req?.headers['user-agent'] || 'N/A'}`);
        console.log(`[API] Query params:`, query);

        // Verificar rate limit antes de processar
        const ip = req?.socket.remoteAddress || req?.headers['x-forwarded-for'];
        const rateLimitCheck = checkRateLimit(ip, query.apikey, query.tipo);

        if (!rateLimitCheck.allowed) {
            console.warn(`[RATE_LIMIT] Blocked request:`, rateLimitCheck);
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                sucesso: false,
                erro: rateLimitCheck.error,
                retryAfter: rateLimitCheck.retryAfter,
                type: rateLimitCheck.type,
                criador: '@MutanoX'
            }));
            return;
        }

        let apiKey = query.apikey;
        const miniServiceKey = query.mskey; // Mini service API key
        const tipo = query.tipo;

        if (!tipo) {
            console.log('[API] Erro: Tipo não especificado');
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ sucesso: false, erro: 'Tipo não especificado' }));
            return;
        }

        if (endpointsConfig[tipo] && endpointsConfig[tipo].maintenance) {
            console.log('[API] Erro: Endpoint em manutenção');
            res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ sucesso: false, erro: freeConfig.maintenanceMessage }));
            return;
        }

        // Verificar se é uma requisição de mini service
        let isMiniService = false;
        if (miniServiceKey && !apiKey) {
            console.log(`[API] Tentando autenticar mini service: ${miniServiceKey.substring(0, 8)}...`);
            // Validar a chave do mini service
            for (const [serviceId, service] of Object.entries(miniServicesKeys)) {
                if (service.apiKey === miniServiceKey && service.enabled && service.settings.allowFree) {
                    isMiniService = true;
                    apiKey = ADMIN_KEY; // Usar como admin temporariamente
                    console.log(`[API] Mini service autenticado com sucesso: ${serviceId}`);

                    // Atualizar estatísticas do mini service
                    service.stats.totalRequests = (service.stats.totalRequests || 0) + 1;
                    service.stats.dailyRequests = (service.stats.dailyRequests || 0) + 1;
                    service.stats.lastUsed = new Date().toISOString();
                    saveMiniServicesKeys();
                    break;
                }
            }
        }

        if (!isMiniService) {
            console.log(`[API] Autenticando com API key padrão: ${apiKey ? apiKey.substring(0, 8) + '...' : 'N/A'}`);
        }

        const auth = validateAndTrackKey(apiKey, false, req.headers['user-agent']);
        if (!auth.valid && !freeConfig.active && !isMiniService) {
            console.log('[API] Erro: API Key inválida');
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ sucesso: false, erro: auth.error || 'API Key inválida' }));
            return;
        }

        if (!auth.isAdmin) {
            if (tipo === 'cpf' && isProtected({ cpf: query.cpf })) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ sucesso: false, protegido: true, mensagem: freeConfig.protectionMessage }));
                return;
            }
            if (tipo === 'nome' && isProtected({ nome: query.q })) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ sucesso: false, protegido: true, mensagem: freeConfig.protectionMessage }));
                return;
            }
            if (tipo === 'numero' && isProtected({ numero: query.q })) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ sucesso: false, protegido: true, mensagem: freeConfig.protectionMessage }));
                return;
            }
        }

        if (!auth.valid && freeConfig.active) {
            // Adicionar à fila se for consulta gratuita
            requestQueue.push({ req, res, tipo, query, apiKey });
            if (requestQueue.length > 10) {
                console.log('[API] Erro: Fila cheia');
                res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ sucesso: false, erro: 'Fila cheia, tente novamente em instantes' }));
                return;
            }
            console.log(`[API] Adicionado à fila: ${requestQueue.length} itens`);
            processQueue();
            return;
        }

        console.log(`[API] Processando requisição do tipo: ${tipo}`);
        await handleApiRequest(req, res, tipo, query, apiKey);
        return;
    }

    res.writeHead(404); res.end();
});

async function handleApiRequest(req, res, tipo, query, apiKey) {
    const startTime = Date.now();
    systemStats.endpointHits[tipo] = (systemStats.endpointHits[tipo] || 0) + 1;
    systemStats.endpointLastUsed[tipo] = new Date().toISOString();
    
    // Track request timeline
    if (!systemStats.endpointRequestTimeline[tipo]) systemStats.endpointRequestTimeline[tipo] = [];
    systemStats.endpointRequestTimeline[tipo].push(Date.now());
    // Keep only last 1000 requests per endpoint to prevent memory issues
    if (systemStats.endpointRequestTimeline[tipo].length > 1000) {
        systemStats.endpointRequestTimeline[tipo] = systemStats.endpointRequestTimeline[tipo].slice(-1000);
    }
    
    saveStats();
    auditLog(apiKey, 'QUERY', tipo, `Query: ${query.q || query.cpf || query.id}`);

    // Verificar Cache
    const cacheKey = `${tipo}:${JSON.stringify(query)}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
        const latency = Date.now() - startTime;
        if (!systemStats.endpointLatency[tipo]) systemStats.endpointLatency[tipo] = [];
        systemStats.endpointLatency[tipo].push(latency);
        if (systemStats.endpointLatency[tipo].length > 100) systemStats.endpointLatency[tipo].shift();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...cachedData, cached: true }));
        return;
    }

    // Log detalhado de cada requisição

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
        
        // Track latency
        const latency = Date.now() - startTime;
        if (!systemStats.endpointLatency[tipo]) systemStats.endpointLatency[tipo] = [];
        systemStats.endpointLatency[tipo].push(latency);
        if (systemStats.endpointLatency[tipo].length > 100) systemStats.endpointLatency[tipo].shift();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    } catch (e) {
        // Log detalhado do erro para debug
        console.error(`[API ERROR] Tipo: ${tipo}, Query: ${query.q || query.cpf || query.id}, Erro:`, e.message);
        console.error('[API ERROR] Stack trace:', e.stack);

        systemStats.errors++;

        // Track endpoint-specific errors
        if (!systemStats.endpointErrors[tipo]) systemStats.endpointErrors[tipo] = 0;
        systemStats.endpointErrors[tipo]++;

        saveStats();

        // SEMPRE retornar JSON, nunca HTML
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            sucesso: false,
            erro: e.message || 'Erro interno do servidor',
            tipo: tipo,
            criador: '@MutanoX'
        }));
    }
}

const wss = new WebSocket.Server({ server });

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Broadcast stats every 5 seconds with complete data
setInterval(async () => {
    const health = await checkExternalHealth();
    const keys = loadApiKeys();
    
    // Count active keys
    const activeKeysCount = Object.values(keys).filter(k => k.active).length;
    
    // Build endpoint stats for broadcast
    const endpointStats = {};
    for (const [id, config] of Object.entries(endpointsConfig)) {
        const hits = systemStats.endpointHits[id] || 0;
        const errors = systemStats.endpointErrors[id] || 0;
        const latencies = systemStats.endpointLatency[id] || [];
        const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
        
        endpointStats[id] = {
            hits,
            errors,
            avgLatency,
            errorRate: hits > 0 ? ((errors / hits) * 100).toFixed(2) : 0,
            lastUsed: systemStats.endpointLastUsed[id] || null
        };
    }
    
    broadcast({
        type: 'STATS_UPDATE',
        totalRequests: systemStats.totalRequests,
        errors: systemStats.errors,
        uptime: Date.now() - systemStats.startTime,
        activeKeys: activeKeysCount,
        endpointHits: systemStats.endpointHits,
        endpointStats: endpointStats,
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
    logWarn('VALIDATION', 'CPF inválido ou vazio');
    return { sucesso: false, erro: 'CPF inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://anabot.my.id/api/consultar-cpf', { cpf });
    if (!apiUrl) throw new Error('URL inválida');

    logInfo('API_CALL', `Consultando CPF: ${cpf}`);
    const data = await fetchWithRetry(apiUrl);

    if (!data || !data.resultado) {
      logWarn('API_RESPONSE', 'Resposta inválida da API', data);
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseCPFData(data.resultado);
    logInfo('API_SUCCESS', `CPF consultado com sucesso`, { dadosBasicos: parsedData.dadosBasicos.nome });
    return { sucesso: true, dados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    logError('API_ERROR', `Erro ao consultar CPF: ${cpf}`, error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function consultarNome(nome) {
  if (!isValidString(nome)) {
    logWarn('VALIDATION', 'Nome inválido ou vazio');
    return { sucesso: false, erro: 'Nome inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://anabot.my.id/api/consultar-nome', { q: nome });
    if (!apiUrl) throw new Error('URL inválida');

    logInfo('API_CALL', `Consultando nome: ${nome}`);
    const data = await fetchWithRetry(apiUrl);

    if (!data || !data.resultado) {
      logWarn('API_RESPONSE', 'Resposta inválida da API', data);
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseNomeData(data.resultado);
    logInfo('API_SUCCESS', `Nome consultado com sucesso: ${parsedData.length} resultados`, { count: parsedData.length });
    return { sucesso: true, totalResultados: parsedData.length, resultados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    logError('API_ERROR', `Erro ao consultar nome: ${nome}`, error.message);
    return { sucesso: false, erro: error.message, criador: '@MutanoX' };
  }
}

async function consultarNumero(numero) {
  if (!isValidString(numero)) {
    logWarn('VALIDATION', 'Número inválido ou vazio');
    return { sucesso: false, erro: 'Número inválido ou vazio', criador: '@MutanoX' };
  }

  try {
    const apiUrl = createApiUrl('https://anabot.my.id/api/consultar-numero', { q: numero });
    if (!apiUrl) throw new Error('URL inválida');

    logInfo('API_CALL', `Consultando número: ${numero}`);
    const data = await fetchWithRetry(apiUrl);

    if (!data || !data.resultado) {
      logWarn('API_RESPONSE', 'Resposta inválida da API', data);
      return { sucesso: false, erro: 'Resposta inválida da API', resposta: data, criador: '@MutanoX' };
    }

    const parsedData = parseTelefoneData(data.resultado);
    logInfo('API_SUCCESS', `Número consultado com sucesso: ${parsedData.length} resultados`, { count: parsedData.length });
    return { sucesso: true, totalResultados: parsedData.length, resultados: parsedData, criador: '@MutanoX' };
  } catch (error) {
    logError('API_ERROR', `Erro ao consultar número: ${numero}`, error.message);
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

    const apiUrl = createApiUrl('https://anabot.my.id/api/infoff', { id });
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
    const apiUrl = createApiUrl('https://anabot.my.id/api/search/robloxStalk', { username, apikey });
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
    const apiUrl = createApiUrl('https://anabot.my.id/api/search/tiktokSearch', { username, apikey });
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
