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

const run = async (body = fixtures.pacient()) => {
    const context = createContext();
    await handler(context, createReq({ body, headers: { gametoken: 'tok' } }));
    return context;
};

describe('SendPacient', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 com corpo vazio', async () => {
        const context = await run(null);
        expect(context.res.status).toBe(400);
    });

    test('responde 400 com dados de paciente inválidos', async () => {
        const context = await run({ ...fixtures.pacient(), sex: 'Outro' });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('sex');
        expect(PacientModel.instances).toHaveLength(0);
    });

    test('salva o paciente vinculado ao gameToken, com data de nascimento convertida', async () => {
        const context = await run();

        const [salvo] = PacientModel.instances;
        expect(salvo._gameToken).toBe('tok');
        expect(salvo.birthday).toEqual(new Date('2010-05-20'));
        expect(salvo.name).toBe('Paciente Teste');
        expect(PacientModel.prototype.save).toHaveBeenCalledTimes(1);
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toBe(salvo);
    });

    test('responde 500 quando salvar falha', async () => {
        PacientModel.prototype.save.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
