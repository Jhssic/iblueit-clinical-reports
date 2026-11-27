jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());
jest.mock('axios');

const mongoose = require('mongoose');
const axios = require('axios');
const { query, createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const clinicalMetrics = require('../shared/clinicalMetrics');
const alertEvaluation = require('../shared/alertEvaluation');
const handler = require('./index');

const PACIENT_ID = '5f1d7a2b3c4d5e6f7a8b9c0d';
const body = () => ({ device: 'Pitaco', period: { start: '2024-02-01', end: '2024-03-01', label: 'Fevereiro' } });

const metricasCompletas = {
    sessionCount: 4,
    metrics: { DJ: 0.7, PJ: 80, CGc: null, FR: 12, PEmax: 60, PImax: 40, TEmax: 5, TImax: 3, SpO2min: null, FLi: -10, FLe: 30, EB: 3 },
    metricSources: { DJ: 'plataformoverviews' },
};

const respostaIA = {
    resumoSessao: 'Resumo', evolucao: 'Evolução', avisoRevisao: 'Revisar',
    dadosBrutos: [], generatedBy: 'ia', coerenciaVerificada: true, avisosCoerencia: [],
};

let models;
beforeAll(() => {
    // carrega os schemas uma vez pra ter acesso aos models falsos
    ['UserAccount', 'Pacient', 'ClinicalReport', 'AlertRecord'].forEach((m) => require(`../shared/${m}`));
    models = {
        UserAccount: mongoose.model('UserAccount'),
        Pacient: mongoose.model('Pacient'),
        ClinicalReport: mongoose.model('ClinicalReport'),
        AlertRecord: mongoose.model('AlertRecord'),
    };
});

beforeEach(() => {
    jest.restoreAllMocks();
    mongoose.__resetAll();
    axios.post.mockReset();
    process.env.URL_API_IA = 'http://ia.local';
    authenticate(mongoose, { _id: 'terapeuta-1', role: 'Therapist' });
    models.Pacient.findById.mockResolvedValue({ _id: PACIENT_ID, condition: 'Healthy', sex: 'Female', weight: 40, height: 150, name: 'Nome Real' });
});

const run = async (reqOverrides = {}) => {
    const context = createContext();
    await handler(context, createReq({ params: { pacientId: PACIENT_ID }, body: body(), ...reqOverrides }));
    return context;
};

describe('GenerateClinicalReport', () => {
    test('conecta no banco só quando ainda não há conexão aberta', async () => {
        mongoose.connection.readyState = 1;
        models.UserAccount.findOne.mockResolvedValue(null);
        await run();
        expect(mongoose.connect).not.toHaveBeenCalled();
    });

    test('responde 403 com gameToken inválido', async () => {
        models.UserAccount.findOne.mockResolvedValue(null);
        const context = await run();
        expect(mongoose.connect).toHaveBeenCalled();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toBe('Chave de acesso inválida.');
        expect(context.done).toHaveBeenCalledTimes(1);
    });

    test('responde 403 quando o usuário não é Administrator/Therapist (RN01)', async () => {
        models.UserAccount.findOne.mockResolvedValue({ _id: 'u', role: 'User' });
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(context.res.body.message).toMatch(/Apenas profissionais/);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({ params: {} });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors[0].code).toBe(300);
    });

    test('responde 400 com corpo vazio', async () => {
        const context = await run({ body: undefined });
        expect(context.res.status).toBe(400);
        expect(context.res.body.message).toBe('Dados vazios!');
    });

    test('responde 400 com os erros de validação do corpo', async () => {
        const context = await run({ body: { device: 'Outro' } });
        expect(context.res.status).toBe(400);
        expect(context.res.body.errors).toHaveProperty('device');
    });

    test('responde 404 quando o paciente não existe', async () => {
        models.Pacient.findById.mockResolvedValue(null);
        const context = await run();
        expect(models.Pacient.findById).toHaveBeenCalledWith(PACIENT_ID);
        expect(context.res.status).toBe(404);
    });

    test('FA01: sem sessões no período informa dados insuficientes e não chama a IA', async () => {
        jest.spyOn(clinicalMetrics, 'extractMetricsForPeriod').mockResolvedValue({ sessionCount: 0, metrics: {} });
        const context = await run();
        expect(context.res.status).toBe(200);
        expect(context.res.body.success).toBe(false);
        expect(context.res.body.data).toEqual({ sufficientData: false, missing: ['nenhuma sessão registrada no período selecionado'] });
        expect(axios.post).not.toHaveBeenCalled();
    });

    test('FA01: lista as métricas obrigatórias ausentes', async () => {
        jest.spyOn(clinicalMetrics, 'extractMetricsForPeriod').mockResolvedValue({
            sessionCount: 2, metrics: { ...metricasCompletas.metrics, FR: null },
        });
        const context = await run();
        expect(context.res.body.data.missing).toEqual(['FR']);
        expect(context.res.body.message).toContain('FR');
    });

    test('primeiro relatório: envia contexto anonimizado pra IA, salva o relatório e os alertas disparados', async () => {
        const extract = jest.spyOn(clinicalMetrics, 'extractMetricsForPeriod').mockResolvedValue(metricasCompletas);
        const alerta = { metric: 'DJ', condition: 'Abaixo do valor', triggerValue: 1 };
        const evaluate = jest.spyOn(alertEvaluation, 'evaluateAlerts').mockResolvedValue([alerta]);
        models.ClinicalReport.countDocuments.mockResolvedValue(0);
        axios.post.mockResolvedValue({ data: respostaIA });

        const context = await run();

        expect(extract).toHaveBeenCalledTimes(1);
        expect(extract.mock.calls[0][0]).toMatchObject({ pacientId: PACIENT_ID, device: 'Pitaco' });
        expect(models.ClinicalReport.countDocuments).toHaveBeenCalledWith({ pacientId: PACIENT_ID, archived: false });
        expect(models.ClinicalReport.findOne).not.toHaveBeenCalled();

        const [url, payload, options] = axios.post.mock.calls[0];
        expect(url).toBe('http://ia.local/generate-report');
        expect(options).toEqual({ timeout: 60000 });
        expect(payload.isFirstReport).toBe(true);
        expect(payload.previousMetrics).toBeNull();
        expect(payload.initialMetrics).toBeNull();
        expect(payload.missingOptionalFields).toEqual(['CGc', 'SpO2min']);
        // RNF03: nada de nome nem id real do paciente
        expect(payload.patientContext).toEqual({ sessionCode: 'PAC-9C0D', condition: 'Healthy', sex: 'Female', weight: 40, height: 150 });
        expect(JSON.stringify(payload)).not.toContain('Nome Real');
        expect(JSON.stringify(payload)).not.toContain(PACIENT_ID);

        expect(evaluate).toHaveBeenCalledWith(PACIENT_ID, 'Pitaco', mongoose, context);

        const [relatorio] = models.ClinicalReport.instances;
        expect(relatorio).toMatchObject({
            pacientId: PACIENT_ID,
            device: 'Pitaco',
            isFirstReport: true,
            initialMetrics: metricasCompletas.metrics,
            resumoSessao: 'Resumo',
            alerts: [alerta],
            generatedByUserId: 'terapeuta-1',
        });
        expect(relatorio.period.label).toBe('Fevereiro');

        const [registroAlerta] = models.AlertRecord.instances;
        expect(registroAlerta).toMatchObject({ pacientId: PACIENT_ID, clinicalReportId: relatorio._id, metric: 'DJ' });

        expect(context.res.status).toBe(201);
        expect(context.res.body.data).toBe(relatorio);
        expect(context.done).toHaveBeenCalledTimes(1);
    });

    test('relatório subsequente: compara com o período anterior e com a avaliação inicial', async () => {
        const anteriores = { sessionCount: 3, metrics: { DJ: 0.5 } };
        const extract = jest.spyOn(clinicalMetrics, 'extractMetricsForPeriod')
            .mockResolvedValueOnce(metricasCompletas)
            .mockResolvedValueOnce(anteriores);
        jest.spyOn(alertEvaluation, 'evaluateAlerts').mockResolvedValue([]);
        models.ClinicalReport.countDocuments.mockResolvedValue(2);
        const primeiroQuery = query({ currentMetrics: { DJ: 0.1 } });
        models.ClinicalReport.findOne.mockReturnValue(primeiroQuery);
        axios.post.mockResolvedValue({ data: respostaIA });

        const context = await run();

        // período anterior com a mesma duração, terminando no início do atual
        const prev = extract.mock.calls[1][0];
        expect(prev.end).toEqual(new Date('2024-02-01'));
        expect(prev.start.getTime()).toBe(new Date('2024-02-01').getTime() - (new Date('2024-03-01') - new Date('2024-02-01')));

        expect(models.ClinicalReport.findOne).toHaveBeenCalledWith({ pacientId: PACIENT_ID, device: 'Pitaco', archived: false });
        expect(primeiroQuery.sort).toHaveBeenCalledWith({ created_at: 1 });

        const payload = axios.post.mock.calls[0][1];
        expect(payload.isFirstReport).toBe(false);
        expect(payload.previousMetrics).toEqual({ DJ: 0.5 });
        expect(payload.initialMetrics).toEqual({ DJ: 0.1 });

        expect(models.ClinicalReport.instances[0].initialMetrics).toEqual({ DJ: 0.1 });
        expect(models.AlertRecord.instances).toHaveLength(0);
        expect(context.res.status).toBe(201);
    });

    test('relatório subsequente sem relatório inicial encontrado usa initialMetrics nulo', async () => {
        jest.spyOn(clinicalMetrics, 'extractMetricsForPeriod').mockResolvedValue(metricasCompletas);
        jest.spyOn(alertEvaluation, 'evaluateAlerts').mockResolvedValue([]);
        models.ClinicalReport.countDocuments.mockResolvedValue(1);
        models.ClinicalReport.findOne.mockReturnValue(query(null));
        axios.post.mockResolvedValue({ data: respostaIA });

        const context = await run();

        expect(axios.post.mock.calls[0][1].initialMetrics).toBeNull();
        expect(context.res.status).toBe(201);
    });

    test('FA03: tenta a IA de novo após falha e segue quando a segunda tentativa responde', async () => {
        jest.spyOn(clinicalMetrics, 'extractMetricsForPeriod').mockResolvedValue(metricasCompletas);
        jest.spyOn(alertEvaluation, 'evaluateAlerts').mockResolvedValue([]);
        models.ClinicalReport.countDocuments.mockResolvedValue(0);
        axios.post.mockRejectedValueOnce(new Error('cold start')).mockResolvedValueOnce({ data: respostaIA });

        const context = await run();

        expect(axios.post).toHaveBeenCalledTimes(2);
        expect(context.log).toHaveBeenCalledWith(expect.stringContaining('tentativa 1/3'), 'cold start');
        expect(context.res.status).toBe(201);
    });

    test('FA03: responde 503 depois de 3 falhas da IA e não salva nada', async () => {
        jest.spyOn(clinicalMetrics, 'extractMetricsForPeriod').mockResolvedValue(metricasCompletas);
        const evaluate = jest.spyOn(alertEvaluation, 'evaluateAlerts');
        models.ClinicalReport.countDocuments.mockResolvedValue(0);
        axios.post.mockRejectedValue(new Error('indisponível'));

        const context = await run();

        expect(axios.post).toHaveBeenCalledTimes(3);
        expect(context.res.status).toBe(503);
        expect(evaluate).not.toHaveBeenCalled();
        expect(models.ClinicalReport.instances).toHaveLength(0);
        expect(context.done).toHaveBeenCalledTimes(1);
    });

    describe('chave de IA própria do fisioterapeuta', () => {
        const llmKeyCrypto = require('../shared/llmKeyCrypto');

        beforeEach(() => {
            process.env.LLM_KEY_ENCRYPTION_SECRET = 'segredo-de-teste';
            jest.spyOn(clinicalMetrics, 'extractMetricsForPeriod').mockResolvedValue(metricasCompletas);
            jest.spyOn(alertEvaluation, 'evaluateAlerts').mockResolvedValue([]);
            models.ClinicalReport.countDocuments.mockResolvedValue(0);
            axios.post.mockResolvedValue({ data: respostaIA });
        });

        afterEach(() => { delete process.env.LLM_KEY_ENCRYPTION_SECRET; });

        test('envia a chave descriptografada no header X-LLM-Api-Key, nunca no corpo', async () => {
            authenticate(mongoose, {
                _id: 'terapeuta-1', role: 'Therapist',
                llmApiKey: { encrypted: llmKeyCrypto.encrypt('gsk_chave_do_fisio_123456'), last4: '3456' },
            });

            const context = await run();

            const [, payload, options] = axios.post.mock.calls[0];
            expect(options).toEqual({ timeout: 60000, headers: { 'X-LLM-Api-Key': 'gsk_chave_do_fisio_123456' } });
            expect(JSON.stringify(payload)).not.toContain('gsk_chave_do_fisio_123456');
            expect(context.log).toHaveBeenCalledWith(expect.stringContaining('chave de IA: própria do profissional'));
            expect(context.res.status).toBe(201);
        });

        test('sem chave configurada não envia header e registra uso da chave padrão', async () => {
            const context = await run();

            expect(axios.post.mock.calls[0][2]).toEqual({ timeout: 60000 });
            expect(context.log).toHaveBeenCalledWith(expect.stringContaining('chave de IA: padrão do servidor'));
        });

        test('chave ilegível (segredo trocado) não impede o relatório: segue sem ela', async () => {
            const encrypted = llmKeyCrypto.encrypt('gsk_chave_do_fisio_123456');
            process.env.LLM_KEY_ENCRYPTION_SECRET = 'outro-segredo';
            authenticate(mongoose, { _id: 'terapeuta-1', role: 'Therapist', llmApiKey: { encrypted } });

            const context = await run();

            expect(axios.post.mock.calls[0][2]).toEqual({ timeout: 60000 });
            expect(context.log).toHaveBeenCalledWith(expect.stringContaining('Não foi possível ler a chave de IA'));
            expect(context.res.status).toBe(201);
        });
    });

    test('responde 500 quando o banco falha', async () => {
        models.Pacient.findById.mockRejectedValue(new Error('mongo caiu'));
        const context = await run();
        expect(context.res.status).toBe(500);
        expect(context.res.body.errors[0].code).toBe(0);
    });
});
