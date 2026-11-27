jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/ClinicalReport');
require('../shared/AlertRecord');
require('../shared/UserAccount');
const ClinicalReportModel = mongoose.model('ClinicalReport');
const AlertRecordModel = mongoose.model('AlertRecord');
const UserAccountModel = mongoose.model('UserAccount');

const params = { pacientId: 'pac-1', reportId: 'rel-1' };

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose, { _id: 'terapeuta-1', role: 'Therapist' });
});

const run = async (reqOverrides = {}) => {
    const context = createContext();
    await handler(context, createReq({ params, ...reqOverrides }));
    return context;
};

describe('DeleteClinicalReport', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(ClinicalReportModel.findOne).not.toHaveBeenCalled();
    });

    test('responde 400 quando falta o pacientId', async () => {
        const context = await run({ params: { reportId: 'rel-1' } });
        expect(context.res.status).toBe(400);
    });

    test('responde 404 quando o relatório não existe pra este paciente', async () => {
        ClinicalReportModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(ClinicalReportModel.findOne).toHaveBeenCalledWith({ _id: 'rel-1', pacientId: 'pac-1' });
        expect(context.res.status).toBe(404);
    });

    test('LGPD: recusa excluir relatório que ainda não foi arquivado', async () => {
        ClinicalReportModel.findOne.mockResolvedValue({ _id: 'rel-1', archived: false });
        const context = await run();
        expect(context.res.status).toBe(409);
        expect(context.res.body.message).toMatch(/Arquive o relatório/);
        expect(ClinicalReportModel.deleteOne).not.toHaveBeenCalled();
        expect(AlertRecordModel.deleteMany).not.toHaveBeenCalled();
    });

    test('exclui definitivamente relatório arquivado e seus alertas, com auditoria antes da exclusão', async () => {
        ClinicalReportModel.findOne.mockResolvedValue({ _id: 'rel-1', archived: true });
        ClinicalReportModel.deleteOne.mockImplementation(() => {
            // o log de auditoria tem que existir antes da exclusão
            expect(context.log).toHaveBeenCalledWith(expect.stringContaining('[AUDIT] ClinicalReport rel-1'));
            return Promise.resolve({ deletedCount: 1 });
        });
        AlertRecordModel.deleteMany.mockResolvedValue({ deletedCount: 2 });
        const context = createContext();

        await handler(context, createReq({ params }));

        expect(AlertRecordModel.deleteMany).toHaveBeenCalledWith({ clinicalReportId: 'rel-1' });
        expect(ClinicalReportModel.deleteOne).toHaveBeenCalledWith({ _id: 'rel-1' });
        expect(context.res.status).toBe(200);
        expect(context.res.body.message).toBe('Relatório excluído definitivamente.');
        expect(context.done).toHaveBeenCalledTimes(1);
    });

    test('responde 500 quando a exclusão falha', async () => {
        ClinicalReportModel.findOne.mockResolvedValue({ _id: 'rel-1', archived: true });
        AlertRecordModel.deleteMany.mockRejectedValue(new Error('falhou'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
