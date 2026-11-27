// Criptografia da chave de API de IA (LLM) de cada fisioterapeuta.
//
// A chave é guardada no UserAccount criptografada com AES-256-GCM, nunca em
// texto puro. A chave mestra vem da variável de ambiente
// LLM_KEY_ENCRYPTION_SECRET (um segredo aleatório longo, configurado só no
// servidor) — sem ela não dá pra salvar nem ler chave de usuário nenhuma.
//
// GCM é autenticado: se o valor salvo for adulterado (ou a chave mestra
// mudar), o decrypt falha em vez de devolver lixo.

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // tamanho recomendado de IV para GCM

function getMasterKey() {
    const secret = process.env.LLM_KEY_ENCRYPTION_SECRET;
    if (!secret) {
        throw new Error('LLM_KEY_ENCRYPTION_SECRET não configurada.');
    }
    // Normaliza o segredo (qualquer tamanho) para os 32 bytes do AES-256.
    return crypto.createHash('sha256').update(secret).digest();
}

const isConfigured = () => Boolean(process.env.LLM_KEY_ENCRYPTION_SECRET);

// Formato salvo: "<iv>:<authTag>:<ciphertext>", cada parte em base64.
const encrypt = (plainText) => {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, encrypted].map((part) => part.toString('base64')).join(':');
};

const decrypt = (payload) => {
    const parts = String(payload).split(':');
    if (parts.length !== 3) {
        throw new Error('Formato de chave criptografada inválido.');
    }
    const [iv, authTag, encrypted] = parts.map((part) => Buffer.from(part, 'base64'));
    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

// Últimos 4 caracteres — único pedaço da chave que volta para o front,
// só para o fisioterapeuta reconhecer qual chave está configurada.
const lastFour = (plainText) => String(plainText).slice(-4);

module.exports = { isConfigured, encrypt, decrypt, lastFour };
