jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/PlataformOverview');
require('../shared/UserAccount');
const PlataformOverviewModel = mongoose.model('PlataformOverview');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
    PlataformOverviewModel.find.mockResolvedValue([{ score: 10 }]);
});

const run = async (query = {}) => {
    const context = createContext();
    await handler(context, createReq({ query }));
    return context;
};

describe('GetPlataformOverview', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('sem filtros lista tudo e devolve os dados com status 200', async () => {
        const context = await run();
        expect(PlataformOverviewModel.find).toHaveBeenCalledWith({}, null, { sort: { created_at: -1 } });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual([{ score: 10 }]);
    });

    test('aplica filtros, intervalo de datas, paginação e ordem crescente', async () => {
        await run({
            plataformOverviewId: 'p1', phase: '1', level: '2', gameDevice: 'Pitaco',
            dataIni: '2024-01-01', dataFim: '2024-01-31', limit: '5', skip: '10', sort: 'asc',
        });
        expect(PlataformOverviewModel.find).toHaveBeenCalledWith(
            {
                _id: 'p1', phase: '1', level: '2', gameDevice: 'Pitaco',
                created_at: { $gte: '2024-01-01T00:00:00.000Z', $lte: '2024-01-31T23:59:59.999Z' },
            },
            null,
            { sort: { created_at: 1 }, limit: 5, skip: 10 }
        );
    });

    test('filtra só pela data inicial', async () => {
        await run({ dataIni: '2024-01-01' });
        expect(PlataformOverviewModel.find.mock.calls[0][0]).toEqual({ created_at: { $gte: '2024-01-01T00:00:00.000Z' } });
    });

    test('responde 500 quando o banco falha', async () => {
        PlataformOverviewModel.find.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
