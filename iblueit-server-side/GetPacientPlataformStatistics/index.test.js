jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { aggregate, createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/PlataformOverview');
require('../shared/UserAccount');
const PlataformOverviewModel = mongoose.model('PlataformOverview');
const UserAccountModel = mongoose.model('UserAccount');

let agg;
beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
    agg = aggregate([{ deviceName: 'Pitaco', maxExpFlow: 30 }]);
    PlataformOverviewModel.aggregate.mockReturnValue(agg);
});

const run = async (query = {}, params = { pacientId: 'pac-1' }) => {
    const context = createContext();
    await handler(context, createReq({ query, params }));
    return context;
};

describe('GetPacientPlataformStatistics', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({}, {});
        expect(context.res.status).toBe(400);
        expect(PlataformOverviewModel.aggregate).not.toHaveBeenCalled();
    });

    test('sem filtros: estatísticas de todas as sessões do paciente, sem filtrar dispositivo', async () => {
        const context = await run();

        expect(agg.append).toHaveBeenCalledWith({ $match: { pacientId: 'pac-1' } });
        expect(agg.sort).not.toHaveBeenCalled();
        expect(agg.match).not.toHaveBeenCalled();
        expect(agg.lookup).toHaveBeenCalledWith(expect.objectContaining({ from: 'flowdatadevices', as: 'flowData' }));
        expect(agg.limit).not.toHaveBeenCalled();
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual([{ deviceName: 'Pitaco', maxExpFlow: 30 }]);
    });

    test('aplica filtros de fase, nível, dispositivo, datas, ordem e paginação', async () => {
        await run({
            phase: '1', level: '2', devices: 'Pitaco', dataIni: '2024-01-01', dataFim: '2024-01-31',
            sort: 'asc', limit: '10', skip: '5',
        });

        expect(agg.append).toHaveBeenCalledWith({
            $match: {
                pacientId: 'pac-1', phase: '1', level: '2',
                created_at: { $gte: new Date('2024-01-01 00:00:00:000'), $lte: new Date('2024-01-31 23:59:59:999') },
            },
        });
        expect(agg.sort).toHaveBeenCalledWith({ created_at: 1 });
        expect(agg.match).toHaveBeenCalledWith({ 'newRoot.flowDataDevices.deviceName': 'Pitaco' });
        expect(agg.limit).toHaveBeenCalledWith('10');
        expect(agg.skip).toHaveBeenCalledWith('5');
    });

    test('filtra só pela data inicial', async () => {
        await run({ dataIni: '2024-01-01' });
        expect(agg.append.mock.calls[0][0].$match.created_at).toEqual({ $gte: new Date('2024-01-01 00:00:00:000') });
    });

    test('responde 500 quando o aggregate falha', async () => {
        PlataformOverviewModel.aggregate.mockReturnValue(aggregate(null, new Error('erro')));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
