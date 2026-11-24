jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const fixtures = require('../test-utils/fixtures');
const handler = require('./index');

require('../shared/Pacient');
require('../shared/UserAccount');
const PacientModel = mongoose.model('Pacient');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async ({ params = { pacientId: 'pac-1' }, body = fixtures.pacient() } = {}) => {
    const context = createContext();
    await handler(context, createReq({ params, body, headers: { gametoken: 'tok' } }));
    return context;
};

describe('UpdatePacient', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({ params: {} });
        expect(context.res.status).toBe(400);
        expect(PacientModel.updateOne).not.toHaveBeenCalled();
    });

    test('atualiza o paciente do gameToken com os dados enviados', async () => {
        PacientModel.updateOne.mockResolvedValue({ nModified: 1 });
        const body = { ...fixtures.pacient(), observations: 'Melhorou' };

        const context = await run({ body });

        const [filtro, update] = PacientModel.updateOne.mock.calls[0];
        expect(filtro).toEqual({ _id: 'pac-1', _gameToken: 'tok' });
        expect(update.$set).toMatchObject({
            name: 'Paciente Teste',
            observations: 'Melhorou',
            capacitiesPitaco: body.capacitiesPitaco,
            capacitiesMano: body.capacitiesMano,
            capacitiesCinta: body.capacitiesCinta,
            ethnicity: 'Parda',
        });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual({ nModified: 1 });
    });

    test('responde 500 quando o banco falha', async () => {
        PacientModel.updateOne.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
