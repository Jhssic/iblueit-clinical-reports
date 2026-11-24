jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/UserAccount');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async (params = { pacientId: 'pac-1' }) => {
    const context = createContext();
    await handler(context, createReq({ params }));
    return context;
};

describe('GetPacientCalibrationStatistics', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({});
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors[0].code).toBe(300);
    });

    // Bug conhecido: o handler usa PlataformOverviewModel, que nunca é
    // declarado neste arquivo (cópia de GetPacientPlataformStatistics). Com
    // parâmetros válidos ele lança ReferenceError em vez de responder. Este
    // teste documenta o comportamento atual e deve ser ajustado quando o
    // handler for corrigido.
    test('com parâmetros válidos falha com ReferenceError (PlataformOverviewModel não definido)', async () => {
        await expect(handler(createContext(), createReq({ params: { pacientId: 'pac-1' } })))
            .rejects.toThrow(ReferenceError);
    });
});
