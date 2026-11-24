jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/UserAccount');
const UserAccountModel = mongoose.model('UserAccount');

const USER_ID = '5f1d7a2b3c4d5e6f7a8b9c0d';

beforeEach(() => {
    mongoose.__resetAll();
});

const run = async (body) => {
    const context = createContext();
    await handler(context, createReq({ body }));
    return context;
};

describe('CreateGameToken', () => {
    test('responde 400 com corpo vazio', async () => {
        const context = await run(undefined);
        expect(context.res.status).toBe(400);
    });

    test('responde 400 com userId inválido', async () => {
        const context = await run({ userId: 'abc' });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('userId');
    });

    test('responde 404 quando o usuário não existe', async () => {
        UserAccountModel.findById.mockResolvedValue(null);
        const context = await run({ userId: USER_ID });
        expect(UserAccountModel.findById).toHaveBeenCalledWith(USER_ID);
        expect(context.res.status).toBe(404);
        expect(context.res.body.data).toEqual({ userId: USER_ID });
    });

    test('devolve o token existente sem gerar outro', async () => {
        const save = jest.fn();
        UserAccountModel.findById.mockResolvedValue({ gameToken: { token: 'ja-existe' }, save });
        const context = await run({ userId: USER_ID });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual({ gameToken: 'ja-existe' });
        expect(save).not.toHaveBeenCalled();
    });

    test('gera um novo token UUID com descrição e data de criação', async () => {
        const user = { gameToken: { token: '' } };
        user.save = jest.fn(() => Promise.resolve(user));
        UserAccountModel.findById.mockResolvedValue(user);

        const context = await run({ userId: USER_ID, description: 'Tablet da clínica' });

        expect(user.save).toHaveBeenCalled();
        expect(user.gameToken.token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(user.gameToken.description).toBe('Tablet da clínica');
        expect(user.gameToken.createdAt).toBeInstanceOf(Date);
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toEqual({ gameToken: user.gameToken.token });
    });

    test('responde 500 quando o banco falha', async () => {
        UserAccountModel.findById.mockRejectedValue(new Error('erro'));
        const context = await run({ userId: USER_ID });
        expect(context.res.status).toBe(500);
    });
});
