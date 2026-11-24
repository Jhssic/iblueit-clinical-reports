jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/AlertCriteria');
require('../shared/UserAccount');
const AlertCriteriaModel = mongoose.model('AlertCriteria');
const UserAccountModel = mongoose.model('UserAccount');

const criteria = [
    { metric: 'DJ', condition: 'Deterioração consecutiva', triggerValue: 3 },
    { metric: 'EB', condition: 'Abaixo do valor', triggerValue: 2 },
];

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose, { _id: 'admin-1', role: 'Administrator' });
});

const run = async (reqOverrides = {}) => {
    const context = createContext();
    await handler(context, createReq({ params: { pacientId: 'pac-1' }, body: { criteria }, ...reqOverrides }));
    return context;
};

describe('SaveAlertCriteria', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toBe('Chave de acesso inválida.');
    });

    test('RN01: só Administrator configura alertas (Therapist recebe 403)', async () => {
        UserAccountModel.findOne.mockResolvedValue({ _id: 't', role: 'Therapist' });
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toMatch(/configurar alertas/);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({ params: {} });
        expect(context.res.status).toBe(400);
    });

    test('responde 400 com corpo vazio', async () => {
        const context = await run({ body: {} });
        expect(context.res.status).toBe(400);
        expect(context.res.body.message).toBe('Dados vazios!');
    });

    test('responde 400 com critério inválido', async () => {
        const context = await run({ body: { criteria: [{ metric: 'XX', condition: 'Abaixo do valor', triggerValue: 1 }] } });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty(['criteria.0.metric']);
        expect(AlertCriteriaModel.deleteMany).not.toHaveBeenCalled();
    });

    test('substitui todos os critérios do paciente pela lista enviada', async () => {
        AlertCriteriaModel.deleteMany.mockResolvedValue({});
        AlertCriteriaModel.insertMany.mockImplementation((docs) => Promise.resolve(docs));

        const context = await run();

        expect(AlertCriteriaModel.deleteMany).toHaveBeenCalledWith({ pacientId: 'pac-1' });
        expect(AlertCriteriaModel.insertMany).toHaveBeenCalledWith([
            { pacientId: 'pac-1', metric: 'DJ', condition: 'Deterioração consecutiva', triggerValue: 3 },
            { pacientId: 'pac-1', metric: 'EB', condition: 'Abaixo do valor', triggerValue: 2 },
        ]);
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toHaveLength(2);
    });

    test('responde 500 quando o banco falha', async () => {
        AlertCriteriaModel.deleteMany.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
