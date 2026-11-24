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

const run = async (body = fixtures.gameParameter()) => {
    const context = createContext();
    await handler(context, createReq({ body, headers: { gametoken: 'tok' } }));
    return context;
};

describe('CreateGameParameter', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 com corpo vazio', async () => {
        const context = await run({});
        expect(context.res.status).toBe(400);
        expect(context.res.body.message).toBe('Dados vazios!');
    });

    test('responde 400 com parâmetros inválidos', async () => {
        const context = await run({ ...fixtures.gameParameter(), Loops: 'muitos' });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('Loops');
    });

    test('cria parâmetros novos quando o paciente ainda não tem', async () => {
        GameParameterModel.findOne.mockResolvedValue(null);

        const context = await run();

        expect(GameParameterModel.findOne).toHaveBeenCalledWith(
            { pacientId: fixtures.PACIENT_ID }, null, { sort: { created_at: 1 } }
        );
        const [criado] = GameParameterModel.instances;
        expect(criado).toMatchObject({ ...fixtures.gameParameter(), _gameToken: 'tok' });
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toBe(criado);
    });

    test('atualiza os parâmetros existentes do paciente', async () => {
        const existente = { pacientId: fixtures.PACIENT_ID, Loops: 1 };
        existente.save = jest.fn(() => Promise.resolve(existente));
        GameParameterModel.findOne.mockResolvedValue(existente);

        const context = await run({ ...fixtures.gameParameter(), Loops: 5 });

        expect(existente.save).toHaveBeenCalled();
        expect(existente).toMatchObject({ Loops: 5, ObjectSpeedFactor: 1.5, SizeDownThreshold: 0.2 });
        expect(GameParameterModel.instances).toHaveLength(0);
        expect(context.res.status).toBe(201);
    });

    test('responde 500 quando o banco falha', async () => {
        GameParameterModel.findOne.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
