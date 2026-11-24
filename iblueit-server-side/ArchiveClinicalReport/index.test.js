jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/ClinicalReport');
require('../shared/UserAccount');
const ClinicalReportModel = mongoose.model('ClinicalReport');
const UserAccountModel = mongoose.model('UserAccount');

const params = { pacientId: 'pac-1', reportId: 'rel-1' };

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose, { _id: 'admin-1', role: 'Administrator' });
});

const run = async (reqOverrides = {}) => {
    const context = createContext();
    await handler(context, createReq({ params, ...reqOverrides }));
    return context;
};

describe('ArchiveClinicalReport', () => {
    test('responde 403 com gameToken inválido e não arquiva nada', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(ClinicalReportModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    test('responde 403 pra usuário sem papel clínico (RN01)', async () => {
        UserAccountModel.findOne.mockResolvedValue({ _id: 'u', role: 'User' });
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toMatch(/arquivar/);
    });

    test('responde 400 quando falta o reportId', async () => {
        const context = await run({ params: { pacientId: 'pac-1' } });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors[0].code).toBe(300);
    });

    test('responde 404 quando o relatório não pertence ao paciente', async () => {
        ClinicalReportModel.findOneAndUpdate.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(404);
    });

    test('RN05: arquiva (não exclui) o relatório e registra auditoria', async () => {
        const arquivado = { _id: 'rel-1', archived: true };
        ClinicalReportModel.findOneAndUpdate.mockResolvedValue(arquivado);

        const context = await run();

        expect(ClinicalReportModel.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'rel-1', pacientId: 'pac-1' }, { archived: true }, { new: true }
        );
        expect(ClinicalReportModel.deleteOne).not.toHaveBeenCalled();
        expect(context.log).toHaveBeenCalledWith(expect.stringMatching(/\[AUDIT\] ClinicalReport rel-1 arquivado por usuário admin-1/));
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toBe(arquivado);
        expect(context.done).toHaveBeenCalledTimes(1);
    });

    test('responde 500 quando o banco falha', async () => {
        ClinicalReportModel.findOneAndUpdate.mockRejectedValue(new Error('erro'));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
