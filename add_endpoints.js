const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'endpoints_config.json');

const endpointsConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

// Adicionar qrcode e shorten
endpointsConfig.qrcode = { name: 'Gerador QR Code', description: 'Gera QR Code', maintenance: false };
endpointsConfig.shorten = { name: 'Encurtador URL', description: 'Encurta links', maintenance: false };

fs.writeFileSync(CONFIG_FILE, JSON.stringify(endpointsConfig, null, 2));

console.log('Endpoints adicionados: qrcode, shorten');
console.log('Total de endpoints:', Object.keys(endpointsConfig).length);
