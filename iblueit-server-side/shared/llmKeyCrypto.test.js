const llmKeyCrypto = require('./llmKeyCrypto');

describe('shared/llmKeyCrypto', () => {
    beforeEach(() => { process.env.LLM_KEY_ENCRYPTION_SECRET = 'segredo-de-teste'; });
    afterEach(() => { delete process.env.LLM_KEY_ENCRYPTION_SECRET; });

    test('criptografa e descriptografa de volta para o mesmo valor', () => {
        const encrypted = llmKeyCrypto.encrypt('gsk_minha_chave_secreta');
        expect(encrypted).not.toContain('gsk_minha_chave_secreta');
        expect(encrypted.split(':')).toHaveLength(3);
        expect(llmKeyCrypto.decrypt(encrypted)).toBe('gsk_minha_chave_secreta');
    });

    test('usa IV aleatório: a mesma chave gera valores diferentes a cada vez', () => {
        expect(llmKeyCrypto.encrypt('abc')).not.toBe(llmKeyCrypto.encrypt('abc'));
    });

    test('falha ao descriptografar com outro segredo mestre', () => {
        const encrypted = llmKeyCrypto.encrypt('gsk_minha_chave_secreta');
        process.env.LLM_KEY_ENCRYPTION_SECRET = 'outro-segredo';
        expect(() => llmKeyCrypto.decrypt(encrypted)).toThrow();
    });

    test('falha se o valor salvo foi adulterado', () => {
        const [iv, tag, data] = llmKeyCrypto.encrypt('gsk_minha_chave_secreta').split(':');
        const adulterado = Buffer.from(data, 'base64');
        adulterado[0] ^= 0xff;
        expect(() => llmKeyCrypto.decrypt([iv, tag, adulterado.toString('base64')].join(':'))).toThrow();
    });

    test('rejeita formato inválido', () => {
        expect(() => llmKeyCrypto.decrypt('sem-separadores')).toThrow('Formato de chave criptografada inválido.');
    });

    test('sem segredo mestre configurado: isConfigured falso e encrypt lança erro', () => {
        delete process.env.LLM_KEY_ENCRYPTION_SECRET;
        expect(llmKeyCrypto.isConfigured()).toBe(false);
        expect(() => llmKeyCrypto.encrypt('x')).toThrow('LLM_KEY_ENCRYPTION_SECRET não configurada.');
    });

    test('lastFour devolve só os 4 últimos caracteres', () => {
        expect(llmKeyCrypto.lastFour('gsk_abcdef1234')).toBe('1234');
    });
});
