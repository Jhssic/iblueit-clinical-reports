jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createContext, createReq } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/UserAccount');
const UserAccountModel = mongoose.model('UserAccount');

const hashAdmin = bcrypt.hashSync('senha-certa', 4);

beforeEach(() => {
    mongoose.__resetAll();
});

const run = async (body) => {
    const context = createContext();
    await handler(context, createReq({ body }));
    return context;
};

describe('LoginAccount', () => {
    test('responde 400 com corpo vazio', async () => {
        const context = await run({});
        expect(context.res.status).toBe(400);
    });

    test('responde 400 sem senha', async () => {
        const context = await run({ username: 'ana' });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('password');
    });

    test('responde 404 quando o usuário não existe', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run({ username: 'ninguem', password: 'x' });
        expect(UserAccountModel.findOne).toHaveBeenCalledWith({ username: 'ninguem' });
        expect(context.res.status).toBe(404);
    });

    test('administrador: responde 401 com senha que não confere com o hash', async () => {
        UserAccountModel.findOne.mockResolvedValue({ role: 'Administrator', password: hashAdmin });
        const context = await run({ username: 'ana', password: 'errada' });
        expect(context.res.status).toBe(401);
    });

    test('administrador: autentica com a senha certa e devolve dados da sessão (expira em 2h)', async () => {
        UserAccountModel.findOne.mockResolvedValue({
            _id: 'u1', fullname: 'Ana', role: 'Administrator', password: hashAdmin, gameToken: { token: 'tok' }, pacientId: '',
        });

        const context = await run({ username: 'ana', password: 'senha-certa' });

        expect(context.res.status).toBe(200);
        const data = context.res.body.data;
        expect(data).toMatchObject({ redirectUrl: '/', fullname: 'Ana', gameToken: 'tok', userId: 'u1', role: 'Administrator' });
        expect(data.authExpirationTime - data.authTime).toBe(2 * 60 * 60 * 1000);
    });

    test('usuário-paciente: compara a senha em texto e recusa senha errada', async () => {
        UserAccountModel.findOne.mockResolvedValue({ role: 'User', password: '1234' });
        const context = await run({ username: 'pedro', password: '9999' });
        expect(context.res.status).toBe(401);
    });

    test('usuário-paciente: autentica com a senha certa', async () => {
        UserAccountModel.findOne.mockResolvedValue({
            _id: 'u2', role: 'User', password: '1234', gameToken: { token: 'tok' }, pacientId: 'pac-1',
        });
        const context = await run({ username: 'pedro', password: '1234' });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data.pacientId).toBe('pac-1');
    });

    test('responde 500 quando o banco falha', async () => {
        UserAccountModel.findOne.mockRejectedValue(new Error('erro'));
        const context = await run({ username: 'ana', password: 'x' });
        expect(context.res.status).toBe(500);
    });
});
