jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());
jest.mock('nodemailer');

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { createContext, createReq } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/UserAccount');
const UserAccountModel = mongoose.model('UserAccount');

const PACIENT_ID = '5f1d7a2b3c4d5e6f7a8b9c0d';
const admin = () => ({ fullname: 'Ana Admin', username: 'ana', password: 'senha123', email: 'ana@exemplo.com', role: 'Administrator' });
const paciente = () => ({ fullname: 'Pedro', username: 'pedro', password: '1234', email: 'pedro@exemplo.com', role: 'User', pacientId: PACIENT_ID, gameToken: 'tok' });

let sendMail;
beforeEach(() => {
    mongoose.__resetAll();
    sendMail = jest.fn();
    nodemailer.createTransport.mockReturnValue({ sendMail });
});

const run = async (body) => {
    const context = createContext();
    await handler(context, createReq({ body }));
    return context;
};

describe('CreateAccount', () => {
    test('responde 400 com corpo vazio', async () => {
        const context = await run(undefined);
        expect(context.res.status).toBe(400);
        expect(context.res.body.message).toBe('Dados vazios!');
    });

    test('responde 400 com erros de validação', async () => {
        const context = await run({ username: 'x' });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('fullname');
        expect(UserAccountModel.findOne).not.toHaveBeenCalled();
    });

    test('recusa administrador com e-mail/usuário já cadastrado', async () => {
        UserAccountModel.findOne.mockResolvedValue({ _id: 'existente' });
        const context = await run(admin());
        expect(UserAccountModel.findOne).toHaveBeenCalledWith({
            $or: [{ email: 'ana@exemplo.com', role: 'Administrator' }, { username: 'ana', role: 'Administrator' }],
        });
        expect(context.res.status).toBe(409);
        expect(context.res.body.success).toBe(false);
        expect(UserAccountModel.instances).toHaveLength(0);
    });

    test('recusa usuário-paciente com nome já cadastrado no mesmo gameToken', async () => {
        UserAccountModel.findOne.mockResolvedValue({ _id: 'existente' });
        const context = await run(paciente());
        expect(UserAccountModel.findOne).toHaveBeenCalledWith({ username: 'pedro', role: 'User', 'gameToken.token': 'tok' });
        expect(context.res.status).toBe(409);
        expect(context.res.body.message).toBe('Já existe um usuário cadastrado com este nome.');
    });

    test('cria administrador com senha em hash e envia e-mail de boas-vindas', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);

        const context = await run(admin());

        const [salvo] = UserAccountModel.instances;
        expect(salvo.password).not.toBe('senha123');
        expect(bcrypt.compareSync('senha123', salvo.password)).toBe(true);
        expect(salvo.email).toBe('ana@exemplo.com');
        expect(salvo.pacientId).toBe('');
        expect(salvo.gameToken.token).toBe('');
        expect(sendMail).toHaveBeenCalledTimes(1);
        expect(sendMail.mock.calls[0][0].to).toBe('ana@exemplo.com');
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toEqual({ redirectUrl: '/login' });
    });

    test('cria usuário-paciente vinculado ao paciente e ao gameToken, sem e-mail', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);

        const context = await run(paciente());

        const [salvo] = UserAccountModel.instances;
        expect(salvo).toMatchObject({ username: 'pedro', password: '1234', email: 'pedro', pacientId: PACIENT_ID });
        expect(salvo.gameToken.token).toBe('tok');
        expect(sendMail).not.toHaveBeenCalled();
        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toBeNull();
    });

    test('responde 500 quando salvar falha', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        UserAccountModel.prototype.save.mockRejectedValue(new Error('erro'));
        const context = await run(admin());
        expect(context.res.status).toBe(500);
    });
});
