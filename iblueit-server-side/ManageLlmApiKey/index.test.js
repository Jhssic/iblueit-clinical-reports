jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const llmKeyCrypto = require('../shared/llmKeyCrypto');
const handler = require('./index');

require('../shared/UserAccount');
const UserAccountModel = mongoose.model('UserAccount');

const CHAVE = 'gsk_chave_valida_do_fisio_9876';

beforeEach(() => {
    mongoose.__resetAll();
    process.env.LLM_KEY_ENCRYPTION_SECRET = 'segredo-de-teste';
    authenticate(mongoose, { _id: 'terapeuta-1', role: 'Therapist' });
    UserAccountModel.updateOne.mockResolvedValue({});
});

afterEach(() => { delete process.env.LLM_KEY_ENCRYPTION_SECRET; });

const run = async (method, reqOverrides = {}) => {
    const context = createContext();
    const req = createReq(reqOverrides);
    req.method = method;
    await handler(context, req);
    return context;
};

describe('ManageLlmApiKey', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run('GET');
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toBe('Chave de acesso inválida.');
    });

    test('RN01: paciente não pode configurar chave de IA', async () => {
        UserAccountModel.findOne.mockResolvedValue({ _id: 'p', role: 'Pacient' });
        const context = await run('PUT', { body: { apiKey: CHAVE } });
        expect(context.res.status).toBe(403);
        expect(UserAccountModel.updateOne).not.toHaveBeenCalled();
    });

    describe('GET', () => {
        test('sem chave configurada', async () => {
            const context = await run('GET');
            expect(context.res.status).toBe(200);
            expect(context.res.body.data).toEqual({ configured: false, last4: null, updatedAt: null });
        });

        test('com chave configurada devolve só os 4 últimos caracteres, nunca a chave', async () => {
            const updatedAt = new Date('2026-11-01');
            const encrypted = llmKeyCrypto.encrypt(CHAVE);
            authenticate(mongoose, { _id: 'terapeuta-1', role: 'Therapist', llmApiKey: { encrypted, last4: '9876', updatedAt } });

            const context = await run('GET');

            expect(context.res.body.data).toEqual({ configured: true, last4: '9876', updatedAt });
            expect(JSON.stringify(context.res.body)).not.toContain(encrypted);
            expect(JSON.stringify(context.res.body)).not.toContain(CHAVE);
        });
    });

    describe('PUT', () => {
        test('salva a chave criptografada no próprio usuário', async () => {
            const context = await run('PUT', { body: { apiKey: `  ${CHAVE}  ` } });

            expect(UserAccountModel.updateOne).toHaveBeenCalledTimes(1);
            const [filtro, update] = UserAccountModel.updateOne.mock.calls[0];
            expect(filtro).toEqual({ _id: 'terapeuta-1' });
            const salvo = update.$set.llmApiKey;
            expect(salvo.encrypted).not.toContain(CHAVE);
            expect(llmKeyCrypto.decrypt(salvo.encrypted)).toBe(CHAVE);
            expect(salvo.last4).toBe('9876');
            expect(salvo.updatedAt).toBeInstanceOf(Date);

            expect(context.res.status).toBe(200);
            expect(context.res.body.data).toEqual({ configured: true, last4: '9876', updatedAt: salvo.updatedAt });
            expect(JSON.stringify(context.res.body)).not.toContain(CHAVE);
        });

        test.each([
            ['vazia', {}],
            ['curta demais', { apiKey: 'curta' }],
            ['com espaço no meio', { apiKey: 'gsk_chave com espaco_123456' }],
            ['que não é texto', { apiKey: 12345678901234567890 }],
        ])('responde 400 com chave %s', async (_, body) => {
            const context = await run('PUT', { body });
            expect(context.res.status).toBe(400);
            expect(context.res.body.message).toBe('Chave de IA inválida.');
            expect(UserAccountModel.updateOne).not.toHaveBeenCalled();
        });

        test('responde 503 se o servidor não tem o segredo de criptografia', async () => {
            delete process.env.LLM_KEY_ENCRYPTION_SECRET;
            const context = await run('PUT', { body: { apiKey: CHAVE } });
            expect(context.res.status).toBe(503);
            expect(UserAccountModel.updateOne).not.toHaveBeenCalled();
        });

        test('responde 500 quando o banco falha', async () => {
            UserAccountModel.updateOne.mockRejectedValue(new Error('mongo caiu'));
            const context = await run('PUT', { body: { apiKey: CHAVE } });
            expect(context.res.status).toBe(500);
            expect(context.done).toHaveBeenCalledTimes(1);
        });
    });

    describe('DELETE', () => {
        test('remove a chave do próprio usuário', async () => {
            const context = await run('DELETE');
            expect(UserAccountModel.updateOne).toHaveBeenCalledWith({ _id: 'terapeuta-1' }, { $unset: { llmApiKey: '' } });
            expect(context.res.status).toBe(200);
            expect(context.res.body.data).toEqual({ configured: false, last4: null, updatedAt: null });
        });
    });
});
