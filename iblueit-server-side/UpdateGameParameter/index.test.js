jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const fixtures = require('../test-utils/fixtures');
const handler = require('./index');

require('../shared/GameParameter');
require('../shared/UserAccount');
const GameParameterModel = mongoose.model('GameParameter');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async ({ params = { pacientId: 'pac-1' }, body = fixtures.gameParameter() } = {}) => {
    const context = createContext();
    await handler(context, createReq({ params, body, headers: { gametoken: 'tok' } }));
    return context;
};

describe('UpdateGameParameter', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({ params: {} });
        expect(context.res.status).toBe(400);
    });

    test('atualiza os parâmetros do paciente no gameToken', async () => {
        GameParameterModel.updateOne.mockResolvedValue({ nModified: 1 });
        const body = fixtures.gameParameter();

        const context = await run({ body });

        const [filtro, update] = GameParameterModel.updateOne.mock.calls[0];
        expect(filtro).toEqual({ pacientId: 'pac-1', _gameToken: 'tok' });
        expect(update.$set).toEqual(fixtures.gameParameter());
        expect(context.res.status).toBe(200);
    });

    test('responde 500 quando o banco falha', async () => {
        GameParameterModel.updateOne.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
