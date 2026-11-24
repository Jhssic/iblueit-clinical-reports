jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/UserAccount');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
});

const run = async (params = { pacientId: 'pac-1' }) => {
    const context = createContext();
    await handler(context, createReq({ params }));
    return context;
};

describe('GetPacientAccount', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        UserAccountModel.findOne.mockResolvedValue({ _id: 'admin' });
        const context = await run({});
        expect(context.res.status).toBe(400);
    });

    test('busca a conta do paciente só com os campos necessários', async () => {
        const conta = { _id: 'u2', pacientId: 'pac-1', username: 'pedro' };
        UserAccountModel.findOne
            .mockResolvedValueOnce({ _id: 'admin' }) // verifyGameToken
            .mockResolvedValueOnce(conta);

        const context = await run();

        expect(UserAccountModel.findOne).toHaveBeenLastCalledWith({ pacientId: 'pac-1' }, '_id pacientId username password');
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toBe(conta);
    });

    test('responde 500 quando o banco falha', async () => {
        UserAccountModel.findOne
            .mockResolvedValueOnce({ _id: 'admin' })
            .mockRejectedValueOnce(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
