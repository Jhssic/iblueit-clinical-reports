jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { query, createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/AlertCriteria');
require('../shared/UserAccount');
const AlertCriteriaModel = mongoose.model('AlertCriteria');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async (reqOverrides = {}) => {
    const context = createContext();
    await handler(context, createReq({ params: { pacientId: 'pac-1' }, ...reqOverrides }));
    return context;
};

describe('GetAlertCriteria', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({ params: {} });
        expect(context.res.status).toBe(400);
    });

    test('lista os critérios ativos do paciente em ordem de criação', async () => {
        const criterios = [{ metric: 'DJ' }];
        const q = query(criterios);
        AlertCriteriaModel.find.mockReturnValue(q);

        const context = await run();

        expect(AlertCriteriaModel.find).toHaveBeenCalledWith({ pacientId: 'pac-1', active: true });
        expect(q.sort).toHaveBeenCalledWith({ created_at: 1 });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toBe(criterios);
        expect(context.done).toHaveBeenCalledTimes(1);
    });

    test('responde 500 quando o banco falha', async () => {
        AlertCriteriaModel.find.mockReturnValue(query(null, new Error('erro')));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
