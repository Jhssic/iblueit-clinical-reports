jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/FlowDataDevice');
require('../shared/UserAccount');
const FlowDataDeviceModel = mongoose.model('FlowDataDevice');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async (params = { flowDataDeviceId: 'f1' }) => {
    const context = createContext();
    await handler(context, createReq({ params }));
    return context;
};

describe('GetFlowDataDevice', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem flowDataDeviceId', async () => {
        const context = await run({});
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors[0].code).toBe(300);
    });

    test('busca os dados de fluxo pelo id', async () => {
        const dados = [{ _id: 'f1', flowDataDevices: [] }];
        FlowDataDeviceModel.find.mockResolvedValue(dados);
        const context = await run();
        expect(FlowDataDeviceModel.find).toHaveBeenCalledWith({ _id: 'f1' });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toBe(dados);
    });

    test('responde 500 quando o banco falha', async () => {
        FlowDataDeviceModel.find.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
