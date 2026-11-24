jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/CalibrationOverview');
require('../shared/UserAccount');
const CalibrationOverviewModel = mongoose.model('CalibrationOverview');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
    CalibrationOverviewModel.find.mockResolvedValue([{ calibrationValue: 10 }]);
});

const run = async (query = {}, params = { pacientId: 'pac-1' }, headers = { gametoken: 'tok' }) => {
    const context = createContext();
    await handler(context, createReq({ query, params, headers }));
    return context;
};

describe('GetPacientCalibrationOverview', () => {
    test('sem header gametoken: validateHeaders grava 400, mas o fluxo segue e termina em 403', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run({}, { pacientId: 'pac-1' }, {});
        // validateHeaders grava 400 e o fluxo segue até a checagem do token (403)
        expect(context.done).toHaveBeenCalledTimes(2);
        expect(context.res.status).toBe(403);
    });

    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({}, {});
        expect(context.res.status).toBe(400);
    });

    test('lista as calibrações do paciente', async () => {
        const context = await run();
        expect(CalibrationOverviewModel.find).toHaveBeenCalledWith({ pacientId: 'pac-1' }, null, { sort: { created_at: -1 } });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual([{ calibrationValue: 10 }]);
    });

    test('aplica filtros, intervalo de datas, paginação e ordem crescente', async () => {
        await run({
            gameDevice: 'Pitaco', calibrationExercise: 'InspiratoryPeak',
            dataIni: '2024-01-01', dataFim: '2024-01-31', limit: '5', skip: '10', sort: 'asc',
        });
        expect(CalibrationOverviewModel.find).toHaveBeenCalledWith(
            {
                pacientId: 'pac-1', gameDevice: 'Pitaco', calibrationExercise: 'InspiratoryPeak',
                created_at: { $gte: '2024-01-01T00:00:00.000Z', $lte: '2024-01-31T23:59:59.999Z' },
            },
            null,
            { sort: { created_at: 1 }, limit: 5, skip: 10 }
        );
    });

    test('filtra só pela data inicial', async () => {
        await run({ dataIni: '2024-01-01' });
        expect(CalibrationOverviewModel.find.mock.calls[0][0].created_at).toEqual({ $gte: '2024-01-01T00:00:00.000Z' });
    });

    test('responde 500 quando o banco falha', async () => {
        CalibrationOverviewModel.find.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
