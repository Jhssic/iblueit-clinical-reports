jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const fixtures = require('../test-utils/fixtures');
const handler = require('./index');

require('../shared/MinigameOverview');
require('../shared/FlowDataDevice');
require('../shared/PlaySession');
require('../shared/UserAccount');
const MinigameOverviewModel = mongoose.model('MinigameOverview');
const FlowDataDeviceModel = mongoose.model('FlowDataDevice');
const PlaySessionModel = mongoose.model('PlaySession');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async (body = fixtures.minigameOverview()) => {
    const context = createContext();
    await handler(context, createReq({ body, headers: { gametoken: 'tok' } }));
    return context;
};

describe('SendMinigameOverview', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 com corpo vazio', async () => {
        const context = await run({});
        expect(context.res.status).toBe(400);
    });

    test('responde 400 com minigame inválido', async () => {
        const context = await run({ ...fixtures.minigameOverview(), respiratoryExercise: 'Outro' });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('respiratoryExercise');
    });

    test('salva os dados de fluxo de cada rodada e vincula os ids nas rodadas do minigame', async () => {
        PlaySessionModel.findOne.mockResolvedValue(null);

        const context = await run();

        expect(FlowDataDeviceModel.instances).toHaveLength(3);
        FlowDataDeviceModel.instances.forEach((f) => expect(f._gameToken).toBe('tok'));
        expect(PlaySessionModel.instances).toEqual([expect.objectContaining({ sessionNumber: 1 })]);

        const [minigame] = MinigameOverviewModel.instances;
        expect(minigame.devices).toEqual(['Pitaco']);
        expect(minigame.flowDataRounds.map((r) => r.flowDataDevicesId))
            .toEqual(FlowDataDeviceModel.instances.map((f) => f._id));
        minigame.flowDataRounds.forEach((r) => expect(r).not.toHaveProperty('flowDataDevices'));
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toBe(minigame);
    });

    test('sessão de outro dia abre a próxima sessão; sessão de hoje é reaproveitada', async () => {
        PlaySessionModel.findOne.mockResolvedValueOnce({ sessionNumber: 7, created_at: '2020-01-01T12:00:00Z' });
        await run();
        expect(PlaySessionModel.instances).toEqual([expect.objectContaining({ sessionNumber: 8 })]);

        PlaySessionModel.instances.length = 0;
        PlaySessionModel.findOne.mockResolvedValueOnce({ sessionNumber: 7, created_at: new Date() });
        await run();
        expect(PlaySessionModel.instances).toHaveLength(0);
    });

    test('responde 500 quando salvar falha', async () => {
        FlowDataDeviceModel.prototype.save.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
