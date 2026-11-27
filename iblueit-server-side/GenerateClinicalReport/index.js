const IA_MAX_ATTEMPTS = 3;

// Período anterior, de mesma duração do atual, terminando onde o atual começa.
// O fim é EXCLUSIVO (endExclusive): o atual usa $gte start, então com $lte
// aqui uma sessão exatamente em `start` seria contada nos dois períodos.
async function extractPreviousPeriodMetrics(clinicalMetrics, mongoose, { pacientId, device, start, end }) {
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start);
    const prevStart = new Date(start.getTime() - durationMs);
    return clinicalMetrics.extractMetricsForPeriod(
        { pacientId, device, start: prevStart, end: prevEnd, endExclusive: true }, mongoose
    );
}

// Métricas da avaliação inicial: primeiro relatório ativo do paciente no mesmo dispositivo.
async function findInitialMetrics(ClinicalReportModel, pacientId, device) {
    const firstReport = await ClinicalReportModel.findOne({ pacientId, device, archived: false }).sort({ created_at: 1 });
    return firstReport ? firstReport.currentMetrics : null;
}

// Métricas de comparação do relatório. No primeiro relatório (RN06) não há
// período anterior e a própria medição atual é a avaliação inicial.
// Evolução (feedback do piloto com o professor): compara sempre com a
// avaliação inicial do paciente (primeiro relatório, mesmo dispositivo),
// não com o período anterior — "Avaliação inicial" fica fixa como marco
// de referência durante o acompanhamento inteiro.
async function loadComparisonMetrics(clinicalMetrics, mongoose, ClinicalReportModel, { pacientId, device, start, end, isFirstReport, currentMetrics }) {
    if (isFirstReport) {
        return { previousMetrics: null, initialMetrics: currentMetrics };
    }
    const previous = await extractPreviousPeriodMetrics(clinicalMetrics, mongoose, { pacientId, device, start, end });
    const initialMetrics = await findInitialMetrics(ClinicalReportModel, pacientId, device);
    return { previousMetrics: previous.metrics, initialMetrics };
}

// --- RF05 / FA03: chamada à API de IA (URL_API_IA) ---
// O Container App do report-ai escala pra 0 réplicas quando ocioso, e o
// ingress da Azure corta a requisição em ~30s se o container ainda não
// acordou — o container continua inicializando em segundo plano, então
// uma segunda tentativa logo em seguida normalmente já encontra ele pronto.
// As tentativas são sequenciais por definição (retry), por isso o await no loop.
// Retorna { ok: true, data } no sucesso, ou { ok: false } se todas as tentativas falharem.
// `llmApiKey` (opcional) é a chave própria do fisioterapeuta: vai no header
// X-LLM-Api-Key (não no corpo, pra não aparecer em log de payload). Sem ela,
// o report-ai usa a GROQ_API_KEY do servidor ou, na falta, o template.
async function requestReportFromAI(axios, iaPayload, context, llmApiKey) {
    const options = { timeout: 60000 };
    if (llmApiKey) {
        options.headers = { 'X-LLM-Api-Key': llmApiKey };
    }
    for (let attempt = 1; attempt <= IA_MAX_ATTEMPTS; attempt++) {
        try {
            const apiRes = await axios.post(`${process.env.URL_API_IA}/generate-report`, iaPayload, options);
            return { ok: true, data: apiRes.data };
        } catch (iaErr) {
            context.log(`[URL_API_IA] - ERROR (tentativa ${attempt}/${IA_MAX_ATTEMPTS}): `, iaErr.message);
        }
    }
    return { ok: false };
}

// Chave de IA própria do fisioterapeuta (ver ManageLlmApiKey), já
// descriptografada. Se não houver chave, ou se ela não puder ser lida
// (segredo do servidor ausente/trocado), segue sem ela — o relatório
// continua sendo gerado com a configuração padrão do servidor.
function resolveUserLlmKey(llmKeyCrypto, requestingUser, context) {
    const encrypted = requestingUser.llmApiKey?.encrypted;
    if (!encrypted) return null;
    try {
        return llmKeyCrypto.decrypt(encrypted);
    } catch (err) {
        context.log(`[GenerateClinicalReport] - Não foi possível ler a chave de IA do usuário ${requestingUser._id}: ${err.message}`);
        return null;
    }
}

module.exports = async function generateClinicalReport(context, req) {
    const mongoose = require('mongoose');
    const axios = require('axios');
    const DATABASE = process.env.MongoDbAtlas;
    if (mongoose.connection.readyState === 0) {
        mongoose.connect(DATABASE);
    }
    mongoose.Promise = global.Promise;

    require('../shared/UserAccount');
    require('../shared/Pacient');
    require('../shared/PlataformOverview');
    require('../shared/FlowDataDevice');
    require('../shared/ClinicalReport');
    require('../shared/AlertRecord');

    const UserAccountModel = mongoose.model('UserAccount');
    const PacientModel = mongoose.model('Pacient');
    const ClinicalReportModel = mongoose.model('ClinicalReport');
    const AlertRecordModel = mongoose.model('AlertRecord');

    const utils = require('../shared/utils');
    const validations = require('../shared/Validators');
    const clinicalMetrics = require('../shared/clinicalMetrics');
    const { evaluateAlerts } = require('../shared/alertEvaluation');
    const llmKeyCrypto = require('../shared/llmKeyCrypto');
    const { computePatientStatus } = require('../shared/patientStatus');

    // --- Autenticação (gameToken) ---
    const isVerifiedGameToken = await utils.verifyGameToken(req.headers.gametoken, mongoose);
    if (!isVerifiedGameToken) {
        context.res = { status: 403, body: utils.createResponse(false, false, "Chave de acesso inválida.", null, 1) };
        context.done();
        return;
    }

    // --- RN01: apenas Administrator/Therapist pode gerar relatório ---
    const requestingUser = await UserAccountModel.findOne({ "gameToken.token": req.headers.gametoken });
    if (!requestingUser || !["Administrator", "Therapist"].includes(requestingUser.role)) {
        context.res = {
            status: 403,
            body: utils.createResponse(false, false, "Apenas profissionais autenticados podem gerar relatórios clínicos.", null, 1),
        };
        context.done();
        return;
    }

    const pacientId = req.params.pacientId;
    if (!pacientId) {
        context.res = { status: 400, body: utils.createResponse(false, true, "Parâmetros de consulta inexistentes.", null, 300) };
        context.done();
        return;
    }

    const body = req.body || {};
    if (Object.entries(body).length === 0) {
        context.res = { status: 400, body: utils.createResponse(false, true, "Dados vazios!", null, 2) };
        context.done();
        return;
    }

    let validationResult = validations.generateClinicalReportValidator(body);
    if (validationResult.errorCount !== 0) {
        let response = utils.createResponse(false, true, "Erros de validação encontrados!", null, 2);
        response.errors = validationResult.errors.errors;
        context.res = { status: 400, body: response };
        context.done();
        return;
    }

    const device = body.device;
    const period = body.period; // { start, end, label }

    const start = new Date(period.start);
    const end = new Date(period.end);

    try {
        const pacient = await PacientModel.findById(pacientId);
        if (!pacient) {
            context.res = { status: 404, body: utils.createResponse(false, true, "Paciente não encontrado.", null, null) };
            context.done();
            return;
        }

        // --- RF02: consulta as collections do período atual ---
        const current = await clinicalMetrics.extractMetricsForPeriod({ pacientId, device, start, end }, mongoose);

        // --- RF03 / FA01: valida dados mínimos antes de acionar a IA ---
        // 422 (Unprocessable Entity): a requisição é válida, mas os dados do
        // período não permitem gerar o relatório — a IA não é chamada.
        if (!clinicalMetrics.hasMinimumData(current)) {
            const missing = current.sessionCount === 0
                ? ["nenhuma sessão registrada no período selecionado"]
                : clinicalMetrics.missingFields(current);
            context.res = {
                status: 422,
                body: utils.createResponse(
                    false,
                    true,
                    "Dados insuficientes para gerar o relatório neste período. Campos/coleções ausentes: " + missing.join(", ") + ".",
                    { sufficientData: false, missing },
                    null
                ),
            };
            context.done();
            return;
        }

        // --- RN06: primeiro relatório do paciente NESTE dispositivo? ---
        // Conta por dispositivo, igual a findInitialMetrics: com a contagem
        // geral, o primeiro relatório do Manovacuômetro de um paciente que já
        // tinha relatório do Pitaco não virava avaliação inicial e ficava sem
        // base de comparação nenhuma.
        const priorReportsCount = await ClinicalReportModel.countDocuments({ pacientId, device, archived: false });
        const isFirstReport = priorReportsCount === 0;

        // --- período anterior (mesma duração) e avaliação inicial, para contexto do resumo ---
        const { previousMetrics, initialMetrics } = await loadComparisonMetrics(
            clinicalMetrics, mongoose, ClinicalReportModel,
            { pacientId, device, start, end, isFirstReport, currentMetrics: current.metrics }
        );

        // --- RNF03: contexto anonimizado (sem nome, sem CPF, sem patientId real) ---
        const sessionCode = "PAC-" + String(pacient._id).slice(-4).toUpperCase();
        const patientContext = {
            sessionCode,
            condition: pacient.condition,
            sex: pacient.sex,
            weight: pacient.weight,
            height: pacient.height,
        };

        // --- FA02: campos opcionais que não puderam ser consultados no período ---
        const missingOptionalFields = clinicalMetrics.missingOptionalFields(current);

        // --- RF09/RF10/RN04: avalia critérios configurados (ou o padrão, se nenhum existir) ---
        // Antes da IA, pra que os alertas entrem no texto narrativo; só com
        // sessões até o fim do período do relatório (ver alertEvaluation.js).
        const alertsTriggered = await evaluateAlerts(pacientId, device, mongoose, context, end);

        const iaPayload = {
            device,
            period: { start: period.start, end: period.end },
            sessionCount: current.sessionCount,
            isFirstReport,
            currentMetrics: current.metrics,
            previousMetrics,
            initialMetrics: isFirstReport ? null : initialMetrics,
            metricSources: current.metricSources,
            missingOptionalFields,
            patientContext,
            alerts: alertsTriggered,
        };

        // --- RF05 / FA03: chamada à API de IA (ver requestReportFromAI) ---
        const userLlmKey = resolveUserLlmKey(llmKeyCrypto, requestingUser, context);
        const iaResult = await requestReportFromAI(axios, iaPayload, context, userLlmKey);
        if (!iaResult.ok) {
            context.res = {
                status: 503,
                body: utils.createResponse(false, true, "O serviço de geração de relatório está indisponível. Tente novamente.", null, null),
            };
            context.done();
            return;
        }
        const iaResponse = iaResult.data;
        const status = computePatientStatus({ alerts: alertsTriggered, currentMetrics: current.metrics, previousMetrics });
      
        const savedReport = await new ClinicalReportModel({
            pacientId,
            device,
            period: { start, end, label: period.label },
            sessionCount: current.sessionCount,
            isFirstReport,
            currentMetrics: current.metrics,
            previousMetrics,
            initialMetrics,
            resumoSessao: iaResponse.resumoSessao,
            evolucao: iaResponse.evolucao,
            avisoRevisao: iaResponse.avisoRevisao,
            dadosBrutos: iaResponse.dadosBrutos,
            generatedBy: iaResponse.generatedBy,
            coerenciaVerificada: iaResponse.coerenciaVerificada,
            avisosCoerencia: iaResponse.avisosCoerencia,
            missingOptionalFields,
            alerts: alertsTriggered,
            status,
            generatedByUserId: String(requestingUser._id),
        }).save();

        // --- RF12: log de auditoria ---
        context.log(`[AUDIT] ClinicalReport ${savedReport._id} gerado para paciente ${pacientId} por usuário ${requestingUser._id} em ${new Date().toISOString()} (chave de IA: ${userLlmKey ? 'própria do profissional' : 'padrão do servidor'})`);

        // Os registros de alerta são independentes entre si (cada um só
        // referencia o relatório já salvo), então podem ser gravados em paralelo.
        await Promise.all(alertsTriggered.map((alert) => new AlertRecordModel({
            pacientId,
            clinicalReportId: savedReport._id,
            metric: alert.metric,
            condition: alert.condition,
            triggerValue: alert.triggerValue,
        }).save()));

        context.res = {
            status: 201,
            body: utils.createResponse(true, true, "Relatório clínico gerado com sucesso.", savedReport, null),
        };
    } catch (err) {
        context.log("[GenerateClinicalReport] - ERROR: ", err);
        context.res = { status: 500, body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0) };
    }

    context.done();
};
