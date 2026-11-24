jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/MinigameOverview');
require('../shared/UserAccount');
const MinigameOverviewModel = mongoose.model('MinigameOverview');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
    MinigameOverviewModel.find.mockResolvedValue([{ minigameName: 'CakeGame' }]);
});

const run = async (query = {}, params = { pacientId: 'pac-1' }) => {
    const context = createContext();
    await handler(context, createReq({ query, params }));
    return context;
};

describe('GetPacientMinigameOverview', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({}, {});
        expect(context.res.status).toBe(400);
        expect(MinigameOverviewModel.find).not.toHaveBeenCalled();
    });

    test('lista os minigames do paciente', async () => {
        const context = await run();
        expect(MinigameOverviewModel.find).toHaveBeenCalledWith({ pacientId: 'pac-1' }, null, { sort: { created_at: -1 } });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual([{ minigameName: 'CakeGame' }]);
    });

    test('aplica filtros (dispositivos separados por vírgula), datas, paginação e ordem', async () => {
        await run({
            minigameName: 'WaterGame', devices: 'Pitaco,Cinta',
            dataIni: '2024-01-01', dataFim: '2024-01-31', limit: '5', skip: '10', sort: 'asc',
        });
        expect(MinigameOverviewModel.find).toHaveBeenCalledWith(
            {
                pacientId: 'pac-1', minigameName: 'WaterGame', devices: ['Pitaco', 'Cinta'],
                created_at: { $gte: '2024-01-01T00:00:00.000Z', $lte: '2024-01-31T23:59:59.999Z' },
            },
            null,
            { sort: { created_at: 1 }, limit: 5, skip: 10 }
        );
    });

    test('filtra só pela data inicial', async () => {
        await run({ dataIni: '2024-01-01' });
        expect(MinigameOverviewModel.find.mock.calls[0][0].created_at).toEqual({ $gte: '2024-01-01T00:00:00.000Z' });
    });

    test('responde 500 quando o banco falha', async () => {
        MinigameOverviewModel.find.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
