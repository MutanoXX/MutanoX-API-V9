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

const DEFAULT_MINI_SERVICES_CONFIG = {
    services: {
        consultas: {
            active: true,
            name: 'Consultas Gratuitas',
            description: 'Busque por nome, telefone ou CPF',
            types: ['nome', 'numero', 'cpf'],
            theme: { primaryColor: '#00f2ff', secondaryColor: '#7000ff' },
            welcomeMessage: 'Sistema de Consultas Gratuitas',
            enabledFeatures: ['search', 'analytics'],
            analyticsData: { totalAccess: 0, uniqueUsers: 0, averageTime: 0, lastUpdate: null }
        },
        dashboard_users: {
            active: true,
            name: 'Portal do Desenvolvedor',
            description: 'Gerencie suas API Keys e estatísticas',
            theme: { primaryColor: '#00f2ff', secondaryColor: '#7000ff' },
            welcomeMessage: 'Bem-vindo ao Portal do Desenvolvedor',
            enabledFeatures: ['stats', 'playground', 'webhooks', 'audit'],
            analyticsData: { totalAccess: 0, uniqueUsers: 0, averageTime: 0, lastUpdate: null }
        },
        docs: {
            active: true,
            name: 'Documentação Interativa',
            description: 'Documentação completa dos endpoints',
            theme: { primaryColor: '#00f2ff', secondaryColor: '#7000ff' },
            welcomeMessage: 'Explore nossa documentação',
            enabledFeatures: ['testing', 'examples'],
            analyticsData: { totalAccess: 0, uniqueUsers: 0, averageTime: 0, lastUpdate: null }
        }
    },
    global: {
        protectionMessage: 'esta pessoa está protegida pelo sistema, quer proteção? adquira proteção por 5R$ e tenha proteção eterna.',
        maintenanceMessage: 'Este endpoint está em manutenção temporária',
        adBanner: 'Anuncie aqui! @MutanoX',
        adLink: 'https://t.me/MutanoX',
        primaryColor: '#00f2ff',
        secondaryColor: '#7000ff',
        showStatsWidget: true,
        layoutType: 'modern'
    }
};

let miniServicesConfig = JSON.parse(JSON.stringify(DEFAULT_MINI_SERVICES_CONFIG));

// Legacy view (compatibilidade com o dashboard antigo)
let freeConfig = {};

function refreshFreeConfigView() {
    const service = (miniServicesConfig.services && miniServicesConfig.services.consultas) ? miniServicesConfig.services.consultas : {};
    const global = miniServicesConfig.global || {};

    freeConfig = {
        ...global,
        ...service,
        active: !!service.active,
        message: service.welcomeMessage || 'Sistema de Consultas Gratuitas',
        protectionMessage: global.protectionMessage,
        maintenanceMessage: global.maintenanceMessage,
        adBanner: global.adBanner,
        adLink: global.adLink,
        primaryColor: (service.theme && service.theme.primaryColor) || global.primaryColor,
        secondaryColor: (service.theme && service.theme.secondaryColor) || global.secondaryColor,
        showStatsWidget: global.showStatsWidget,
        layoutType: global.layoutType
    };
}

function loadMiniServicesConfig() {
    if (fs.existsSync(MINI_SERVICES_CONFIG)) {
        try {
            const raw = JSON.parse(fs.readFileSync(MINI_SERVICES_CONFIG, 'utf8'));
            // Aceita tanto o formato novo (services/global) quanto legado
            if (raw && raw.services && raw.global) {
                miniServicesConfig = { ...DEFAULT_MINI_SERVICES_CONFIG, ...raw, services: { ...DEFAULT_MINI_SERVICES_CONFIG.services, ...raw.services }, global: { ...DEFAULT_MINI_SERVICES_CONFIG.global, ...raw.global } };
            } else {
                // Formato antigo: tudo no root
                miniServicesConfig = JSON.parse(JSON.stringify(DEFAULT_MINI_SERVICES_CONFIG));
                miniServicesConfig.services.consultas.active = !!raw.active;
                miniServicesConfig.services.consultas.welcomeMessage = raw.message || miniServicesConfig.services.consultas.welcomeMessage;
                miniServicesConfig.global.protectionMessage = raw.protectionMessage || miniServicesConfig.global.protectionMessage;
                miniServicesConfig.global.maintenanceMessage = raw.maintenanceMessage || miniServicesConfig.global.maintenanceMessage;
                miniServicesConfig.global.adBanner = raw.adBanner || miniServicesConfig.global.adBanner;
                miniServicesConfig.global.adLink = raw.adLink || miniServicesConfig.global.adLink;
                miniServicesConfig.global.primaryColor = raw.primaryColor || miniServicesConfig.global.primaryColor;
                miniServicesConfig.global.secondaryColor = raw.secondaryColor || miniServicesConfig.global.secondaryColor;
                miniServicesConfig.global.showStatsWidget = raw.showStatsWidget !== false;
                miniServicesConfig.global.layoutType = raw.layoutType || miniServicesConfig.global.layoutType;
            }
        } catch (e) {}
    }

    refreshFreeConfigView();
}

function saveMiniServicesConfig() {
    fs.writeFileSync(MINI_SERVICES_CONFIG, JSON.stringify(miniServicesConfig, null, 2));
    refreshFreeConfigView();
}

loadMiniServicesConfig();

function getMiniServiceConfig(serviceId) {
    return (miniServicesConfig.services && miniServicesConfig.services[serviceId]) ? miniServicesConfig.services[serviceId] : null;
}

// Fila de Processamento (mantida por compatibilidade)
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
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sucesso: false, erro: e.message }));
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    isProcessingQueue = false;
}

// Mini-service sessions (tokens) - não expõem API keys no frontend
const MINI_SERVICE_SESSION_TTL_MS = 1000 * 60 * 30; // 30min
const miniServiceSessions = new Map(); // token -> { serviceId, createdAt, expiresAt, ip, ua }

function createMiniServiceSession(serviceId, req) {
    const token = 'MS_' + crypto.randomBytes(24).toString('hex').toUpperCase();
    const now = Date.now();
    const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '0.0.0.0';
    const ua = req.headers['user-agent'] || '';

    miniServiceSessions.set(token, {
        serviceId,
        createdAt: now,
        expiresAt: now + MINI_SERVICE_SESSION_TTL_MS,
        ip,
        ua
    });

    return token;
}

function getBearerToken(req) {
    const h = req.headers['authorization'] || req.headers['Authorization'];
    if (!h || typeof h !== 'string') return null;
    const m = h.match(/^Bearer\s+(.+)$/i);
    return m ? m[1].trim() : null;
}

function validateMiniServiceSession(token, expectedServiceId, req) {
    if (!token) return { valid: false, error: 'Missing session token' };
    const session = miniServiceSessions.get(token);
    if (!session) return { valid: false, error: 'Invalid session' };
    if (Date.now() > session.expiresAt) {
        miniServiceSessions.delete(token);
        return { valid: false, error: 'Session expired' };
    }
    if (expectedServiceId && session.serviceId !== expectedServiceId) return { valid: false, error: 'Session service mismatch' };

    const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '0.0.0.0';
    if (session.ip && session.ip !== ip) return { valid: false, error: 'Session IP mismatch' };

    return { valid: true, session };
}

setInterval(() => {
    const now = Date.now();
    for (const [token, s] of miniServiceSessions.entries()) {
        if (now > s.expiresAt) miniServiceSessions.delete(token);
    }
}, 60 * 1000);

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
    endpointRequestTimeline: {},

    // Cache monitoring
    cacheStats: {
        hits: 0,
        misses: 0,
        sets: 0,
        evictions: 0,
        clears: 0,
        lastClear: null
    },

    // Mini-services monitoring
    miniServiceStats: {},
    miniServiceUsers: {},

    // Histórico (últimas 24h)
    requestHistory: []
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
const cache = new Map(); // cacheKey -> { data, timestamp, ttl }

let statsSaveTimer = null;
function scheduleSaveStats() {
    if (statsSaveTimer) return;
    statsSaveTimer = setTimeout(() => {
        statsSaveTimer = null;
        saveStats();
    }, 750);
}

function getCache(key) {
    const entry = cache.get(key);
    if (!entry) {
        systemStats.cacheStats.misses++;
        scheduleSaveStats();
        return null;
    }

    if (Date.now() > entry.timestamp + entry.ttl) {
        cache.delete(key);
        systemStats.cacheStats.misses++;
        systemStats.cacheStats.evictions++;
        scheduleSaveStats();
        return null;
    }

    systemStats.cacheStats.hits++;
    scheduleSaveStats();
    return entry.data;
}

function setCache(key, data, ttl = 60000) {
    cache.set(key, { data, timestamp: Date.now(), ttl });
    systemStats.cacheStats.sets++;
    scheduleSaveStats();
}

function clearCache(endpoint = null) {
    if (endpoint) {
        cache.delete(endpoint);
        systemStats.cacheStats.clears++;
        systemStats.cacheStats.lastClear = new Date().toISOString();
        auditLog(null, 'SYSTEM', 'CACHE_CLEARED', `Cache for ${endpoint} cleared`);
    } else {
        cache.clear();
        systemStats.cacheStats.clears++;
        systemStats.cacheStats.lastClear = new Date().toISOString();
        auditLog(null, 'SYSTEM', 'CACHE_CLEARED_ALL', 'All cache cleared');
    }
    scheduleSaveStats();
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

            systemStats.cacheStats = { ...systemStats.cacheStats, ...(stats.cacheStats || {}) };
            systemStats.miniServiceStats = stats.miniServiceStats || {};
            systemStats.miniServiceUsers = stats.miniServiceUsers || {};
            systemStats.requestHistory = stats.requestHistory || [];
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
    if (key === ADMIN_KEY) return true;

    // Keys geradas pelo painel (antigas e novas)
    if (/^MUTANOX-[A-F0-9]+$/i.test(key)) return true;

    // Mini-service keys
    if (/^MINI_[A-Z0-9]+_[A-F0-9]+$/.test(key)) return true;

    // Compatibilidade: chaves customizadas presentes no arquivo (ex: test-key, UserKey123)
    return /^[A-Za-z0-9][A-Za-z0-9_-]{4,128}$/.test(key);
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

function ensureMiniServiceKeys() {
    const keys = loadApiKeys();
    const serviceIds = Object.keys((miniServicesConfig && miniServicesConfig.services) ? miniServicesConfig.services : {});
    let changed = false;

    for (const serviceId of serviceIds) {
        const exists = Object.entries(keys).some(([k, v]) => v && v.miniServiceKey === true && v.miniServiceId === serviceId && v.active !== false);
        if (exists) continue;

        const newKey = `MINI_${serviceId.toUpperCase()}_${generateUid(24).toUpperCase()}`;
        keys[newKey] = {
            owner: `MiniService:${serviceId}`,
            role: 'mini_service',
            active: true,
            usageCount: 0,
            dailyUsage: 0,
            dailyLimit: 0,
            lastUsed: null,
            lastReset: new Date().toDateString(),
            createdAt: new Date().toISOString(),
            miniServiceKey: true,
            miniServiceId: serviceId
        };
        changed = true;
    }

    if (changed) saveApiKeys(keys);
}

ensureMiniServiceKeys();

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
    }

    return {
        valid: true,
        isAdmin: keyData.role === 'admin',
        owner: keyData.owner,
        role: keyData.role,
        miniServiceId: keyData.miniServiceId
    };
}

function trackRequestEvent({ endpointId, miniServiceId, userAgent = '', ip = '', statusCode = 200, latency = 0 }) {
    if (!endpointId) endpointId = 'unknown';

    systemStats.totalRequests++;
    if (statusCode >= 500) systemStats.errors++;

    systemStats.endpointHits[endpointId] = (systemStats.endpointHits[endpointId] || 0) + 1;
    systemStats.endpointLastUsed[endpointId] = new Date().toISOString();

    if (!systemStats.endpointRequestTimeline[endpointId]) systemStats.endpointRequestTimeline[endpointId] = [];
    systemStats.endpointRequestTimeline[endpointId].push(Date.now());
    if (systemStats.endpointRequestTimeline[endpointId].length > 2000) {
        systemStats.endpointRequestTimeline[endpointId] = systemStats.endpointRequestTimeline[endpointId].slice(-2000);
    }

    if (!systemStats.endpointLatency[endpointId]) systemStats.endpointLatency[endpointId] = [];
    systemStats.endpointLatency[endpointId].push(latency);
    if (systemStats.endpointLatency[endpointId].length > 200) systemStats.endpointLatency[endpointId].shift();

    if (statusCode >= 500) {
        if (!systemStats.endpointErrors[endpointId]) systemStats.endpointErrors[endpointId] = 0;
        systemStats.endpointErrors[endpointId]++;
    }

    const ua = (userAgent || '').toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) systemStats.deviceHits.mobile++;
    else if (ua.includes('tablet') || ua.includes('ipad')) systemStats.deviceHits.tablet++;
    else systemStats.deviceHits.desktop++;

    if (miniServiceId) {
        if (!systemStats.miniServiceStats[miniServiceId]) {
            systemStats.miniServiceStats[miniServiceId] = { requests: 0, errors: 0, totalLatency: 0, avgLatency: 0, uniqueUsers: 0, lastUsed: null };
        }
        const ms = systemStats.miniServiceStats[miniServiceId];
        ms.requests++;
        if (statusCode >= 500) ms.errors++;
        ms.totalLatency += latency;
        ms.avgLatency = ms.requests > 0 ? Math.round(ms.totalLatency / ms.requests) : 0;
        ms.lastUsed = new Date().toISOString();

        if (!systemStats.miniServiceUsers[miniServiceId]) systemStats.miniServiceUsers[miniServiceId] = [];
        if (ip && !systemStats.miniServiceUsers[miniServiceId].includes(ip)) {
            systemStats.miniServiceUsers[miniServiceId].push(ip);
            if (systemStats.miniServiceUsers[miniServiceId].length > 2000) {
                systemStats.miniServiceUsers[miniServiceId] = systemStats.miniServiceUsers[miniServiceId].slice(-2000);
            }
        }
        ms.uniqueUsers = systemStats.miniServiceUsers[miniServiceId].length;

        const cfg = getMiniServiceConfig(miniServiceId);
        if (cfg && cfg.analyticsData) {
            cfg.analyticsData.totalAccess = ms.requests;
            cfg.analyticsData.uniqueUsers = ms.uniqueUsers;
            cfg.analyticsData.averageTime = ms.avgLatency;
            cfg.analyticsData.lastUpdate = ms.lastUsed;
        }
    }

    const now = Date.now();
    systemStats.requestHistory.push({ ts: now, endpointId, miniServiceId: miniServiceId || null, latency, statusCode });
    // keep last 24h and prevent unbounded growth
    systemStats.requestHistory = systemStats.requestHistory.filter(e => now - e.ts < 24 * 60 * 60 * 1000).slice(-5000);

    scheduleSaveStats();
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

    const requestStart = Date.now();
    const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const path = parsedUrl.pathname;
    const query = Object.fromEntries(parsedUrl.searchParams);

    req._tracking = { endpointId: null, miniServiceId: null };

    // Pre-derivação (pode ser sobrescrita pela rota)
    if (path === '/api/consultas') {
        req._tracking.endpointId = query.tipo || 'consultas';
    } else if (path.startsWith('/api/admin/')) {
        req._tracking.endpointId = `admin:${path.replace('/api/admin/', '').split('/')[0] || 'root'}`;
    } else if (path.startsWith('/api/user/')) {
        req._tracking.endpointId = `user:${path.replace('/api/user/', '').split('/')[0] || 'root'}`;
    } else if (path.startsWith('/api/mini-service/')) {
        req._tracking.endpointId = `mini-service:${path.replace('/api/mini-service/', '')}`;
    } else if (path.startsWith('/api/docs/')) {
        req._tracking.endpointId = `docs-api:${path.replace('/api/docs/', '')}`;
    } else if (path.startsWith('/api/')) {
        req._tracking.endpointId = `api:${path.replace('/api/', '')}`;
    } else {
        req._tracking.endpointId = `page:${path}`;
    }

    if (path === '/consultas' || path.startsWith('/consultas/') || path.includes('consultas.js')) req._tracking.miniServiceId = 'consultas';
    if (path === '/docs' || path.startsWith('/docs/')) req._tracking.miniServiceId = 'docs';
    if (path === '/api/dashboard_users' || path === '/user-dashboard' || path.includes('dashboard_users.js')) req._tracking.miniServiceId = 'dashboard_users';

    res.on('finish', () => {
        try {
            trackRequestEvent({
                endpointId: req._tracking.endpointId,
                miniServiceId: req._tracking.miniServiceId,
                userAgent,
                ip,
                statusCode: res.statusCode,
                latency: Date.now() - requestStart
            });
        } catch (e) {}
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
        const cfg = getMiniServiceConfig('dashboard_users');
        if (cfg && cfg.active === false) {
            res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<h1 style="font-family: Inter, Arial; padding: 40px;">Mini-service em manutenção</h1><p style="font-family: Inter, Arial; padding: 0 40px;">${freeConfig.maintenanceMessage}</p>`);
            return;
        }

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
        const cfg = getMiniServiceConfig('consultas');
        if (cfg && cfg.active === false) {
            res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<h1 style="font-family: Inter, Arial; padding: 40px;">Mini-service em manutenção</h1><p style="font-family: Inter, Arial; padding: 0 40px;">${freeConfig.maintenanceMessage}</p>`);
            return;
        }

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
        const cfg = getMiniServiceConfig('docs');
        if (cfg && cfg.active === false) {
            res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<h1 style="font-family: Inter, Arial; padding: 40px;">Mini-service em manutenção</h1><p style="font-family: Inter, Arial; padding: 0 40px;">${freeConfig.maintenanceMessage}</p>`);
            return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'docs', 'index.html')).pipe(res);
        return;
    }
    if (path === '/docs/api-documentation.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        fs.createReadStream(pathModule.join(__dirname, 'docs', 'api-documentation.js')).pipe(res);
        return;
    }

    // Mini-service auth (sessions)
    if (path === '/api/mini-service/auth' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { serviceId } = JSON.parse(body || '{}');
                const cfg = getMiniServiceConfig(serviceId);
                if (!cfg) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Mini-service not found' }));
                    return;
                }
                if (cfg.active === false) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: freeConfig.maintenanceMessage }));
                    return;
                }

                const token = createMiniServiceSession(serviceId, req);
                // Tag request as coming from this mini-service
                req._tracking.miniServiceId = serviceId;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    sessionId: token,
                    expiresIn: MINI_SERVICE_SESSION_TTL_MS,
                    service: {
                        id: serviceId,
                        name: cfg.name,
                        description: cfg.description,
                        theme: cfg.theme || { primaryColor: freeConfig.primaryColor, secondaryColor: freeConfig.secondaryColor },
                        enabledFeatures: cfg.enabledFeatures || []
                    }
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid body' }));
            }
        });
        return;
    }

    if (path === '/api/mini-service/validate-session') {
        const token = getBearerToken(req);
        const validation = validateMiniServiceSession(token, null, req);
        res.writeHead(validation.valid ? 200 : 401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: validation.valid,
            valid: validation.valid,
            serviceId: validation.valid ? validation.session.serviceId : null,
            expiresAt: validation.valid ? validation.session.expiresAt : null,
            error: validation.valid ? null : validation.error
        }));
        return;
    }

    // Docs helper (public): lista todos os endpoints disponíveis
    if (path === '/api/docs/endpoints') {
        const baseEndpoints = Object.entries(endpointsConfig).map(([id, cfg]) => ({
            id,
            name: cfg.name || id,
            active: cfg.active !== false,
            maintenance: !!cfg.maintenance,
            dynamic: !!cfg.dynamic,
            params: cfg.params || []
        }));

        const staticEndpoints = [
            { id: 'admin.stats', method: 'GET', url: '/api/admin/stats?apikey={ADMIN_KEY}', auth: 'admin' },
            { id: 'admin.stats.detailed', method: 'GET', url: '/api/admin/stats/detailed?apikey={ADMIN_KEY}', auth: 'admin' },
            { id: 'admin.cache.stats', method: 'GET', url: '/api/admin/cache/stats?apikey={ADMIN_KEY}', auth: 'admin' },
            { id: 'admin.mini-services.list', method: 'GET', url: '/api/admin/mini-services/list?apikey={ADMIN_KEY}', auth: 'admin' },
            { id: 'user.stats', method: 'GET', url: '/api/user/stats?apikey={API_KEY}', auth: 'user' },
            { id: 'mini-service.auth', method: 'POST', url: '/api/mini-service/auth', auth: 'public' },
            { id: 'mini-service.validate-session', method: 'GET', url: '/api/mini-service/validate-session', auth: 'mini-service-session' }
        ];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            generatedAt: new Date().toISOString(),
            endpoints: baseEndpoints,
            static: staticEndpoints,
            miniServices: miniServicesConfig.services
        }));
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
            const activeKeys = Object.values(keys).filter(k => k && k.active !== false).length;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                totalRequests: systemStats.totalRequests,
                errors: systemStats.errors,
                uptime: Date.now() - systemStats.startTime,
                activeKeys,
                keys,
                endpointHits: systemStats.endpointHits,
                deviceHits: systemStats.deviceHits,
                cacheStats: { ...systemStats.cacheStats, size: cache.size },
                miniServiceStats: systemStats.miniServiceStats,
                miniServicesConfig,
                logs: liveLogs,
                health,
                config: freeConfig
            }));
        } else if (path === '/api/admin/stats/detailed') {
            const keys = loadApiKeys();
            const health = await checkExternalHealth();
            const activeKeys = Object.values(keys).filter(k => k && k.active !== false).length;

            const endpointStats = {};
            const allEndpointIds = new Set([...Object.keys(endpointsConfig), ...Object.keys(systemStats.endpointHits)]);
            for (const endpointId of allEndpointIds) {
                const hits = systemStats.endpointHits[endpointId] || 0;
                const errors = systemStats.endpointErrors[endpointId] || 0;
                const latencies = systemStats.endpointLatency[endpointId] || [];
                const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
                const lastUsed = systemStats.endpointLastUsed[endpointId] || null;
                const errorRate = hits > 0 ? parseFloat(((errors / hits) * 100).toFixed(2)) : 0;

                const timeline = systemStats.endpointRequestTimeline[endpointId] || [];
                const now = Date.now();
                const requestsLastHour = timeline.filter(ts => now - ts < 3600000).length;
                const requestsLastDay = timeline.filter(ts => now - ts < 86400000).length;

                endpointStats[endpointId] = { hits, errors, avgLatency, lastUsed, errorRate, requestsLastHour, requestsLastDay };
            }

            const now = Date.now();
            const hourly = [];
            for (let i = 23; i >= 0; i--) {
                const hourStart = now - (i * 3600000);
                const hourEnd = hourStart + 3600000;
                const slice = (systemStats.requestHistory || []).filter(e => e.ts >= hourStart && e.ts < hourEnd);
                hourly.push({
                    hour: new Date(hourStart).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    requests: slice.length,
                    errors: slice.filter(e => e.statusCode >= 500).length,
                    avgLatency: slice.length > 0 ? Math.round(slice.reduce((a, b) => a + b.latency, 0) / slice.length) : 0
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                totals: {
                    totalRequests: systemStats.totalRequests,
                    totalErrors: systemStats.errors,
                    uptime: Date.now() - systemStats.startTime,
                    activeKeys
                },
                endpoints: endpointStats,
                miniServices: {
                    config: miniServicesConfig.services,
                    stats: systemStats.miniServiceStats,
                    users: systemStats.miniServiceUsers
                },
                cache: { ...systemStats.cacheStats, size: cache.size },
                history: { hourly },
                keysCount: Object.keys(keys).length,
                health
            }));
        } else if (path === '/api/admin/cache/stats') {
            const items = [];
            for (const [key, entry] of cache.entries()) {
                const ageMs = Date.now() - entry.timestamp;
                const ttlMs = entry.ttl;
                const expiresInMs = Math.max(0, (entry.timestamp + entry.ttl) - Date.now());
                let sizeBytes = 0;
                try { sizeBytes = Buffer.byteLength(JSON.stringify(entry.data || {}), 'utf8'); } catch (e) {}
                items.push({ key, ageMs, ttlMs, expiresInMs, sizeBytes, cachedAt: new Date(entry.timestamp).toISOString() });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                stats: { ...systemStats.cacheStats, size: cache.size },
                items: items.sort((a, b) => b.cachedAt.localeCompare(a.cachedAt)).slice(0, 200)
            }));
        } else if (path === '/api/admin/mini-services/list') {
            const keys = loadApiKeys();
            const services = [];

            for (const [serviceId, cfg] of Object.entries(miniServicesConfig.services || {})) {
                const stats = systemStats.miniServiceStats[serviceId] || { requests: 0, errors: 0, avgLatency: 0, uniqueUsers: 0, lastUsed: null };
                const serviceKey = Object.entries(keys).find(([k, v]) => v && v.miniServiceKey === true && v.miniServiceId === serviceId && v.active !== false);
                const maskedKey = serviceKey ? `••••••••${serviceKey[0].slice(-4)}` : null;

                services.push({
                    id: serviceId,
                    name: cfg.name,
                    description: cfg.description,
                    active: cfg.active !== false,
                    theme: cfg.theme,
                    enabledFeatures: cfg.enabledFeatures || [],
                    welcomeMessage: cfg.welcomeMessage,
                    keyMasked: maskedKey,
                    stats
                });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, services }));
        } else if (path === '/api/admin/mini-services/update-config' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { serviceId, patch } = JSON.parse(body || '{}');
                    if (!serviceId || !miniServicesConfig.services[serviceId]) throw new Error('Invalid serviceId');

                    miniServicesConfig.services[serviceId] = { ...miniServicesConfig.services[serviceId], ...(patch || {}) };
                    saveMiniServicesConfig();
                    ensureMiniServiceKeys();

                    auditLog(ADMIN_KEY, 'ADMIN', 'MINISERVICE_UPDATE_CONFIG', `Service: ${serviceId}`);
                    broadcast({ type: 'MINISERVICES_UPDATE', services: miniServicesConfig.services });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            });
        } else if (path.startsWith('/api/admin/mini-services/') && path.endsWith('/stats')) {
            const parts = path.split('/');
            const serviceId = parts[4];
            const cfg = getMiniServiceConfig(serviceId);
            if (!cfg) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Not found' }));
                return;
            }
            const stats = systemStats.miniServiceStats[serviceId] || { requests: 0, errors: 0, avgLatency: 0, uniqueUsers: 0, lastUsed: null };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, serviceId, config: cfg, stats }));
        } else if (path.startsWith('/api/admin/mini-services/') && path.endsWith('/generate-key') && req.method === 'POST') {
            const parts = path.split('/');
            const serviceId = parts[4];
            if (!miniServicesConfig.services[serviceId]) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Not found' }));
                return;
            }
            const keys = loadApiKeys();
            for (const k of Object.keys(keys)) {
                if (keys[k] && keys[k].miniServiceKey === true && keys[k].miniServiceId === serviceId) {
                    keys[k].active = false;
                }
            }
            const newKey = `MINI_${serviceId.toUpperCase()}_${generateUid(24).toUpperCase()}`;
            keys[newKey] = {
                owner: `MiniService:${serviceId}`,
                role: 'mini_service',
                active: true,
                usageCount: 0,
                dailyUsage: 0,
                dailyLimit: 0,
                lastUsed: null,
                lastReset: new Date().toDateString(),
                createdAt: new Date().toISOString(),
                miniServiceKey: true,
                miniServiceId: serviceId
            };
            saveApiKeys(keys);

            auditLog(ADMIN_KEY, 'ADMIN', 'MINISERVICE_GENERATE_KEY', `Service: ${serviceId}`);
            broadcast({ type: 'MINISERVICE_KEY_ROTATED', serviceId });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, keyMasked: `••••••••${newKey.slice(-4)}` }));
        } else if (path === '/api/admin/docs/endpoints') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, endpointsConfig, miniServicesConfig: miniServicesConfig.services }));
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
                miniServicesConfig,
                usageHistory: systemStats.miniServiceHistory || []
            }));
        } else if (path === '/api/admin/miniservice/update' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const patch = JSON.parse(body || '{}');

                    // Patch global
                    const g = miniServicesConfig.global;
                    if (patch.protectionMessage !== undefined) g.protectionMessage = patch.protectionMessage;
                    if (patch.maintenanceMessage !== undefined) g.maintenanceMessage = patch.maintenanceMessage;
                    if (patch.adBanner !== undefined) g.adBanner = patch.adBanner;
                    if (patch.adLink !== undefined) g.adLink = patch.adLink;
                    if (patch.primaryColor !== undefined) g.primaryColor = patch.primaryColor;
                    if (patch.secondaryColor !== undefined) g.secondaryColor = patch.secondaryColor;
                    if (patch.showStatsWidget !== undefined) g.showStatsWidget = patch.showStatsWidget;
                    if (patch.layoutType !== undefined) g.layoutType = patch.layoutType;

                    // Patch consultas service
                    const svc = miniServicesConfig.services.consultas;
                    if (patch.active !== undefined) svc.active = !!patch.active;
                    if (patch.message !== undefined) svc.welcomeMessage = patch.message;
                    if (patch.welcomeMessage !== undefined) svc.welcomeMessage = patch.welcomeMessage;
                    if (patch.theme && typeof patch.theme === 'object') svc.theme = { ...(svc.theme || {}), ...patch.theme };

                    saveMiniServicesConfig();
                    ensureMiniServiceKeys();

                    broadcast({ type: 'CONFIG_UPDATE', config: freeConfig, miniServicesConfig: miniServicesConfig.services });
                    auditLog(ADMIN_KEY, 'ADMIN', 'UPDATE_MINISERVICE', 'Mini Service configuration updated');

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
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
                try {
                    const patch = JSON.parse(body || '{}');

                    // Patch global
                    const g = miniServicesConfig.global;
                    if (patch.protectionMessage !== undefined) g.protectionMessage = patch.protectionMessage;
                    if (patch.maintenanceMessage !== undefined) g.maintenanceMessage = patch.maintenanceMessage;
                    if (patch.adBanner !== undefined) g.adBanner = patch.adBanner;
                    if (patch.adLink !== undefined) g.adLink = patch.adLink;
                    if (patch.primaryColor !== undefined) g.primaryColor = patch.primaryColor;
                    if (patch.secondaryColor !== undefined) g.secondaryColor = patch.secondaryColor;
                    if (patch.showStatsWidget !== undefined) g.showStatsWidget = patch.showStatsWidget;
                    if (patch.layoutType !== undefined) g.layoutType = patch.layoutType;

                    // consultas service
                    const svc = miniServicesConfig.services.consultas;
                    if (patch.active !== undefined) svc.active = !!patch.active;
                    if (patch.message !== undefined) svc.welcomeMessage = patch.message;

                    saveMiniServicesConfig();
                    ensureMiniServiceKeys();

                    auditLog(ADMIN_KEY, 'ADMIN', 'UPDATE_CONFIG', 'Global config updated');
                    broadcast({ type: 'CONFIG_UPDATE', config: freeConfig, miniServicesConfig: miniServicesConfig.services });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
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
        let apiKey = query.apikey;
        const tipo = query.tipo;

        if (!tipo) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sucesso: false, erro: 'Tipo não especificado' }));
            return;
        }

        // Atualiza tracking com o tipo real
        req._tracking.endpointId = tipo;

        const endpointCfg = endpointsConfig[tipo];
        if (endpointCfg && endpointCfg.maintenance) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sucesso: false, erro: freeConfig.maintenanceMessage }));
            return;
        }

        let auth = null;
        let isMiniServiceRequest = false;

        // Auth via sessão do mini-service (sem expor API key)
        if (!apiKey) {
            const token = getBearerToken(req);
            const validation = validateMiniServiceSession(token, 'consultas', req);
            if (validation.valid) {
                const cfg = getMiniServiceConfig('consultas');
                if (cfg && cfg.active === false) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ sucesso: false, erro: freeConfig.maintenanceMessage }));
                    return;
                }

                req._tracking.miniServiceId = 'consultas';
                isMiniServiceRequest = true;

                // Usa a mini-service key no servidor (não exposta no frontend)
                const keys = loadApiKeys();
                const found = Object.entries(keys).find(([k, v]) => v && v.miniServiceKey === true && v.miniServiceId === 'consultas' && v.active !== false);
                if (found) {
                    apiKey = found[0];
                } else {
                    ensureMiniServiceKeys();
                    const keys2 = loadApiKeys();
                    const found2 = Object.entries(keys2).find(([k, v]) => v && v.miniServiceKey === true && v.miniServiceId === 'consultas' && v.active !== false);
                    apiKey = found2 ? found2[0] : null;
                }

                auth = apiKey ? validateAndTrackKey(apiKey, false) : { valid: true, isAdmin: false, role: 'mini_service' };
            }
        }

        // Auth por API key (compatível com clientes antigos)
        if (!auth) {
            auth = validateAndTrackKey(apiKey, false);
        }

        if (!auth.valid) {
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

        await handleApiRequest(req, res, tipo, query, apiKey, { isMiniServiceRequest });
        return;
    }

    res.writeHead(404); res.end();
});

async function handleApiRequest(req, res, tipo, query, apiKey, options = {}) {
    const isMiniServiceRequest = !!options.isMiniServiceRequest || (typeof apiKey === 'string' && apiKey.startsWith('MINI_'));

    auditLog(apiKey, 'QUERY', tipo, `Query: ${query.q || query.cpf || query.id}`);

    // Cache
    const cacheKey = `${tipo}:${JSON.stringify(query)}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...cachedData, cached: true }));
        return;
    }

    try {
        let result;

        if (endpointsConfig[tipo] && endpointsConfig[tipo].dynamic) {
            const epPath = pathModule.join(__dirname, 'endpoints', `${tipo}.js`);
            if (!fs.existsSync(epPath)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ sucesso: false, erro: 'Arquivo do endpoint não encontrado' }));
                return;
            }

            const code = fs.readFileSync(epPath, 'utf8');
            const epFn = new Function('query', 'fetch', `return (async () => { ${code} })();`);
            const data = await epFn(query, fetch);
            result = { sucesso: true, ...data, criador: '@MutanoX' };
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
                default:
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ sucesso: false, erro: 'Tipo desconhecido' }));
                    return;
            }
        }

        if (result && result.sucesso && isMiniServiceRequest) {
            result.ad = { text: freeConfig.adBanner, link: freeConfig.adLink };
        }

        if (result && result.sucesso) setCache(cacheKey, result);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: false, erro: e.message }));
    }
}

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.auth = { role: 'public', apiKey: null };

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg && msg.type === 'AUTH' && typeof msg.apiKey === 'string') {
                const apiKey = msg.apiKey.trim();
                if (apiKey === ADMIN_KEY) {
                    ws.auth = { role: 'admin', apiKey };
                    ws.send(JSON.stringify({ type: 'AUTH_OK', role: 'admin' }));
                    return;
                }

                const auth = validateAndTrackKey(apiKey, true);
                if (auth.valid) {
                    ws.auth = { role: 'user', apiKey };
                    ws.send(JSON.stringify({ type: 'AUTH_OK', role: 'user' }));
                } else {
                    ws.send(JSON.stringify({ type: 'AUTH_FAIL' }));
                }
            }
        } catch (e) {}
    });
});

function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
    });
}

function buildEndpointStatsSnapshot() {
    const endpointStats = {};
    const allIds = new Set([...Object.keys(endpointsConfig), ...Object.keys(systemStats.endpointHits)]);

    for (const id of allIds) {
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

    return endpointStats;
}

async function broadcastStatsUpdate() {
    const health = await checkExternalHealth();
    const keys = loadApiKeys();

    const common = {
        type: 'STATS_UPDATE',
        totalRequests: systemStats.totalRequests,
        errors: systemStats.errors,
        uptime: Date.now() - systemStats.startTime,
        endpointHits: systemStats.endpointHits,
        endpointStats: buildEndpointStatsSnapshot(),
        deviceHits: systemStats.deviceHits,
        cacheStats: { ...systemStats.cacheStats, size: cache.size },
        miniServiceStats: systemStats.miniServiceStats,
        health
    };

    wss.clients.forEach(client => {
        if (client.readyState !== WebSocket.OPEN) return;

        if (client.auth && client.auth.role === 'admin') {
            client.send(JSON.stringify({
                ...common,
                keys,
                logs: liveLogs,
                miniServicesConfig: miniServicesConfig.services
            }));
            return;
        }

        if (client.auth && client.auth.role === 'user' && client.auth.apiKey) {
            const k = client.auth.apiKey;
            client.send(JSON.stringify({
                ...common,
                keys: keys[k] ? { [k]: keys[k] } : {}
            }));
            return;
        }

        client.send(JSON.stringify(common));
    });
}

setInterval(() => {
    broadcastStatsUpdate().catch(() => {});
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
