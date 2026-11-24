jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());
jest.mock('nodemailer');

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { createContext } = require('../test-utils/mongooseMock');
const utils = require('./utils');

require('./UserAccount');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
});

describe('createResponse', () => {
    test('monta a resposta padrão sem erros quando não há código de erro', () => {
        expect(utils.createResponse(true, true, 'ok', { a: 1 }, null)).toEqual({
            success: true,
            authorized: true,
            message: 'ok',
            data: { a: 1 },
            errors: null,
        });
    });

    test('inclui código e mensagem do erro conhecido', () => {
        const res = utils.createResponse(false, false, 'falhou', null, 300);
        expect(res.errors).toEqual([
            { code: 300, message: 'O ID do registro é necessário para realizar esta consulta/atualização.' },
        ]);
    });

    test('código de erro 0 (erro interno) também é tratado como erro', () => {
        const res = utils.createResponse(false, true, 'erro', null, 0);
        expect(res.errors[0].code).toBe(0);
        expect(res.errors[0].message).toMatch(/Erro interno/);
    });
});

describe('verifyGameToken', () => {
    test('retorna true quando existe usuário com o gameToken', async () => {
        UserAccountModel.findOne.mockResolvedValue({ _id: 'u1' });
        await expect(utils.verifyGameToken('abc', mongoose)).resolves.toBe(true);
        expect(UserAccountModel.findOne).toHaveBeenCalledWith({ 'gameToken.token': 'abc' });
    });

    test('retorna false quando nenhum usuário tem o gameToken', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        await expect(utils.verifyGameToken('xyz', mongoose)).resolves.toBe(false);
    });
});

describe('requireClinicalStaff', () => {
    test('responde 403 quando o gameToken é inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = createContext();

        const user = await utils.requireClinicalStaff(context, { headers: { gametoken: 't' } }, mongoose, 'sem permissão');

        expect(user).toBeNull();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toBe('Chave de acesso inválida.');
        expect(context.done).toHaveBeenCalledTimes(1);
    });

    test('responde 403 com a mensagem informada quando o papel não é clínico', async () => {
        UserAccountModel.findOne.mockResolvedValue({ _id: 'u1', role: 'User' });
        const context = createContext();

        const user = await utils.requireClinicalStaff(context, { headers: { gametoken: 't' } }, mongoose, 'sem permissão');

        expect(user).toBeNull();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toBe('sem permissão');
    });

    test.each(['Administrator', 'Therapist'])('devolve o usuário quando o papel é %s', async (role) => {
        const staff = { _id: 'u1', role };
        UserAccountModel.findOne.mockResolvedValue(staff);
        const context = createContext();

        const user = await utils.requireClinicalStaff(context, { headers: { gametoken: 't' } }, mongoose, 'x');

        expect(user).toBe(staff);
        expect(context.res).toBeUndefined();
        expect(context.done).not.toHaveBeenCalled();
    });
});

describe('validateHeaders', () => {
    test('responde 400 quando falta o header gametoken', async () => {
        const context = createContext();
        await utils.validateHeaders({}, context);
        expect(context.res).toEqual({ status: 400, body: { message: 'Valor inválido!', header: 'GameToken' } });
        expect(context.done).toHaveBeenCalled();
    });

    test('não mexe na resposta quando o header está presente', async () => {
        const context = createContext();
        await utils.validateHeaders({ gametoken: 'abc' }, context);
        expect(context.res).toBeUndefined();
        expect(context.done).not.toHaveBeenCalled();
    });
});

describe('sendWelcomeEmail', () => {
    test('envia o e-mail de boas-vindas pelo SMTP configurado no ambiente', () => {
        const sendMail = jest.fn();
        nodemailer.createTransport.mockReturnValue({ sendMail });
        process.env.SMTP_Server_Hostname = 'smtp.local';
        process.env.SMTP_FromEmail = 'noreply@iblueit.local';

        utils.sendWelcomeEmail('Maria', 'maria', 'segredo', 'maria@exemplo.com');

        expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.local', port: 587 }));
        const mail = sendMail.mock.calls[0][0];
        expect(mail.to).toBe('maria@exemplo.com');
        expect(mail.from).toBe('noreply@iblueit.local');
        expect(mail.html).toContain('Maria');
        expect(mail.html).toContain('maria');
    });
});
