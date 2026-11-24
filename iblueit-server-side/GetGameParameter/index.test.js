jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/GameParameter');
require('../shared/UserAccount');
const GameParameterModel = mongoose.model('GameParameter');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
    GameParameterModel.find.mockResolvedValue([{ Loops: 2 }]);
});

const run = async (query = {}) => {
    const context = createContext();
    await handler(context, createReq({ query }));
    return context;
};

describe('GetGameParameter', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('sem filtros lista tudo, mais recente primeiro', async () => {
        const context = await run();
        expect(GameParameterModel.find).toHaveBeenCalledWith({}, null, { sort: { created_at: -1 } });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual([{ Loops: 2 }]);
    });

    test('repassa todos os filtros de parâmetro, datas, paginação e ordem', async () => {
        const filtros = {
            pacientId: 'pac-1', stageId: '1', phase: '2', level: '3', ObjectSpeedFactor: '1.5',
            HeightIncrement: '0.1', HeightUpThreshold: '0.8', HeightDownThreshold: '0.2',
            SizeIncrement: '0.1', SizeUpThreshold: '0.8', SizeDownThreshold: '0.2', Loops: '2',
        };
        await run({ ...filtros, dataIni: '2024-01-01', dataFim: '2024-01-31', limit: '5', skip: '10', sort: 'asc' });
        expect(GameParameterModel.find).toHaveBeenCalledWith(
            { ...filtros, created_at: { $gte: '2024-01-01T00:00:00.000Z', $lte: '2024-01-31T23:59:59.999Z' } },
            null,
            { sort: { created_at: 1 }, limit: 5, skip: 10 }
        );
    });

    test('filtra só pela data inicial', async () => {
        await run({ dataIni: '2024-01-01' });
        expect(GameParameterModel.find.mock.calls[0][0]).toEqual({ created_at: { $gte: '2024-01-01T00:00:00.000Z' } });
    });

    test('responde 500 quando o banco falha', async () => {
        GameParameterModel.find.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
