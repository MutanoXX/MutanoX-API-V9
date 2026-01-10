const fs = require('fs');
const path = require('path');

console.log('--- INICIANDO AUDITORIA FINAL MUTANOX V9 ---');

const filesToCheck = [
    'api.js',
    'dashboards/dashboard-new.html',
    'dashboards/dashboard-new.js',
    'mini-services/dashboard_users.html',
    'mini-services/dashboard_users.js',
    'mini-services/consultas.html',
    'mini-services/consultas.js',
    'api_keys.json',
    'endpoints_config.json'
];

let errors = 0;

filesToCheck.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        console.log(`[OK] Arquivo encontrado: ${file}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.length === 0) {
            console.error(`[ERRO] Arquivo vazio: ${file}`);
            errors++;
        }
    } else {
        console.error(`[ERRO] Arquivo não encontrado: ${file}`);
        errors++;
    }
});

// Verificar se as rotas críticas existem no api.js
const apiContent = fs.readFileSync(path.join(__dirname, 'api.js'), 'utf8');
const criticalRoutes = [
    '/api/admin/keys/list',
    '/api/user/stats',
    '/api/user/webhooks',
    '/api/user/audit',
    '/api/user/feedback',
    '/api/consultas'
];

criticalRoutes.forEach(route => {
    if (apiContent.includes(route)) {
        console.log(`[OK] Rota crítica encontrada: ${route}`);
    } else {
        console.error(`[ERRO] Rota crítica ausente: ${route}`);
        errors++;
    }
});

if (errors === 0) {
    console.log('\n--- AUDITORIA CONCLUÍDA COM SUCESSO! NENHUM ERRO ENCONTRADO ---');
} else {
    console.error(`\n--- AUDITORIA CONCLUÍDA COM ${errors} ERROS ---`);
}
