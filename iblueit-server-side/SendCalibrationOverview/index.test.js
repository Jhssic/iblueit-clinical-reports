jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const fixtures = require('../test-utils/fixtures');
const handler = require('./index');

require('../shared/CalibrationOverview');
require('../shared/PlaySession');
require('../shared/UserAccount');
const CalibrationOverviewModel = mongoose.model('CalibrationOverview');
const PlaySessionModel = mongoose.model('PlaySession');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async (body = fixtures.calibrationOverview()) => {
    const context = createContext();
    await handler(context, createReq({ body, headers: { gametoken: 'tok' } }));
    return context;
};

describe('SendCalibrationOverview', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 com corpo vazio', async () => {
        const context = await run({});
        expect(context.res.status).toBe(400);
    });

    test('responde 400 com exercício de calibração inválido', async () => {
        const context = await run({ ...fixtures.calibrationOverview(), calibrationExercise: 'Outro' });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('calibrationExercise');
    });

    test('primeira sessão do paciente: cria a sessão 1 e salva a calibração', async () => {
        PlaySessionModel.findOne.mockResolvedValue(null);

        const context = await run();

        expect(PlaySessionModel.findOne).toHaveBeenCalledWith(
            { pacientId: fixtures.PACIENT_ID }, null, { sort: { sessionNumber: -1 } }
        );
        expect(PlaySessionModel.instances).toEqual([
            expect.objectContaining({ pacientId: fixtures.PACIENT_ID, sessionNumber: 1 }),
        ]);
        const [calibracao] = CalibrationOverviewModel.instances;
        expect(calibracao).toMatchObject({ ...fixtures.calibrationOverview(), _gameToken: 'tok' });
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toBe(calibracao);
    });

    test('sessão de outro dia: abre a próxima sessão', async () => {
        PlaySessionModel.findOne.mockResolvedValue({ sessionNumber: 4, created_at: '2020-01-01T12:00:00Z' });
        await run();
        expect(PlaySessionModel.instances).toEqual([expect.objectContaining({ sessionNumber: 5 })]);
    });

    test('sessão de hoje: reaproveita a sessão atual', async () => {
        PlaySessionModel.findOne.mockResolvedValue({ sessionNumber: 4, created_at: new Date() });
        const context = await run();
        expect(PlaySessionModel.instances).toHaveLength(0);
        expect(context.res.status).toBe(201);
    });

    test('responde 500 quando o banco falha', async () => {
        PlaySessionModel.findOne.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
