jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const fixtures = require('../test-utils/fixtures');
const handler = require('./index');

require('../shared/PlataformOverview');
require('../shared/FlowDataDevice');
require('../shared/PlaySession');
require('../shared/UserAccount');
const PlataformOverviewModel = mongoose.model('PlataformOverview');
const FlowDataDeviceModel = mongoose.model('FlowDataDevice');
const PlaySessionModel = mongoose.model('PlaySession');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async (body = fixtures.plataformOverview()) => {
    const context = createContext();
    await handler(context, createReq({ body, headers: { gametoken: 'tok' } }));
    return context;
};

describe('SendPlataformOverview', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 com corpo vazio', async () => {
        const context = await run(null);
        expect(context.res.status).toBe(400);
    });

    test('responde 400 com sessão inválida', async () => {
        const body = fixtures.plataformOverview();
        delete body.BorgScale;
        const context = await run(body);
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('BorgScale');
    });

    test('salva os dados de fluxo, calcula máximo/mínimo/média por dispositivo e salva a sessão', async () => {
        PlaySessionModel.findOne.mockResolvedValue(null);
        const body = fixtures.plataformOverview();
        const flowDataDevices = body.flowDataDevices;

        const context = await run(body);

        expect(PlaySessionModel.instances).toEqual([expect.objectContaining({ sessionNumber: 1 })]);
        const [fluxo] = FlowDataDeviceModel.instances;
        expect(fluxo).toMatchObject({ _gameToken: 'tok', flowDataDevices });

        const [sessao] = PlataformOverviewModel.instances;
        expect(sessao.flowDataDevicesId).toBe(fluxo._id);
        expect(sessao.devices).toEqual(['Pitaco']);
        expect(sessao.flowDataDevicesValues).toEqual([
            { deviceName: 'Pitaco', maxFlowValue: 25, minFlowValue: -5, meanFlowValue: 10 },
        ]);
        expect(sessao).not.toHaveProperty('flowDataDevices');
        expect(sessao._gameToken).toBe('tok');
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toBe(sessao);
    });

    test('sessão de outro dia abre a próxima sessão; sessão de hoje é reaproveitada', async () => {
        PlaySessionModel.findOne.mockResolvedValueOnce({ sessionNumber: 2, created_at: '2020-01-01T12:00:00Z' });
        await run();
        expect(PlaySessionModel.instances).toEqual([expect.objectContaining({ sessionNumber: 3 })]);

        PlaySessionModel.instances.length = 0;
        PlaySessionModel.findOne.mockResolvedValueOnce({ sessionNumber: 2, created_at: new Date() });
        await run();
        expect(PlaySessionModel.instances).toHaveLength(0);
    });

    test('responde 500 quando salvar falha', async () => {
        PlaySessionModel.findOne.mockResolvedValue(null);
        FlowDataDeviceModel.prototype.save.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
        expect(PlataformOverviewModel.instances).toHaveLength(0);
    });
});
