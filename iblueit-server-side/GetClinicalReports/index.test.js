jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { query, createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/ClinicalReport');
require('../shared/UserAccount');
const ClinicalReportModel = mongoose.model('ClinicalReport');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose, { _id: 'admin-1', role: 'Administrator' });
});

const run = async (reqOverrides = {}) => {
    const context = createContext();
    await handler(context, createReq({ params: { pacientId: 'pac-1' }, ...reqOverrides }));
    return context;
};

describe('GetClinicalReports', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toBe('Chave de acesso inválida.');
    });

    test('responde 403 pra usuário sem papel clínico (RN01)', async () => {
        UserAccountModel.findOne.mockResolvedValueOnce({ _id: 'u' }).mockResolvedValueOnce({ _id: 'u', role: 'User' });
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toMatch(/consultar relatórios/);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({ params: {} });
        expect(context.res.status).toBe(400);
    });

    test('RF11: lista os relatórios ativos do paciente, mais recente primeiro', async () => {
        const relatorios = [{ _id: 'r2' }, { _id: 'r1' }];
        const q = query(relatorios);
        ClinicalReportModel.find.mockReturnValue(q);

        const context = await run();

        expect(ClinicalReportModel.find).toHaveBeenCalledWith({ pacientId: 'pac-1', archived: false });
        expect(q.sort).toHaveBeenCalledWith({ created_at: -1 });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual([
            { _id: 'r2', status: 'estavel' },
            { _id: 'r1', status: 'estavel' },
        ]);
    });

    test('RF09: devolve o status salvo e calcula o dos relatórios antigos sem status', async () => {
        const salvo = { _id: 'r3', status: 'atencao', alerts: [{ metric: 'DJ' }] };
        const antigo = { _id: 'r2', alerts: [{ metric: 'DJ' }] };
        const documento = { toObject: () => ({ _id: 'r1', alerts: [] }) };
        ClinicalReportModel.find.mockReturnValue(query([salvo, antigo, documento]));

        const context = await run();

        expect(context.res.body.data.map((r) => r.status)).toEqual(['atencao', 'critico', 'estavel']);
    });

    test('filtra arquivados e por intervalo de datas', async () => {
        ClinicalReportModel.find.mockReturnValue(query([]));

        await run({ query: { archived: 'true', dataIni: '2024-01-01', dataFim: '2024-01-31' } });

        const filtro = ClinicalReportModel.find.mock.calls[0][0];
        expect(filtro.archived).toBe(true);
        expect(filtro.created_at.$gte).toEqual(new Date('2024-01-01 00:00:00:000'));
        expect(filtro.created_at.$lte).toEqual(new Date('2024-01-31 23:59:59:999'));
    });

    test('filtra só pela data inicial quando não há data final', async () => {
        ClinicalReportModel.find.mockReturnValue(query([]));
        await run({ query: { dataIni: '2024-01-01' } });
        const filtro = ClinicalReportModel.find.mock.calls[0][0];
        expect(filtro.created_at).toEqual({ $gte: new Date('2024-01-01 00:00:00:000') });
    });

    test('responde 500 quando o banco falha', async () => {
        ClinicalReportModel.find.mockReturnValue(query(null, new Error('erro')));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
