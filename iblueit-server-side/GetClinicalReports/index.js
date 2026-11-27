const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const BRASILIA_OFFSET = '-03:00';
const brasiliaDayStart = (day) => new Date(`${day}T00:00:00.000${BRASILIA_OFFSET}`);
const brasiliaDayEnd = (day) => new Date(`${day}T23:59:59.999${BRASILIA_OFFSET}`);

module.exports = async function getClinicalReports(context, req) {
    const mongoose = require('mongoose');
    const DATABASE = process.env.MongoDbAtlas;
    if (mongoose.connection.readyState === 0) {
        mongoose.connect(DATABASE);
    }
    mongoose.Promise = global.Promise;

    require('../shared/UserAccount');
    require('../shared/ClinicalReport');
    const UserAccountModel = mongoose.model('UserAccount');
    const ClinicalReportModel = mongoose.model('ClinicalReport');

    const utils = require('../shared/utils');
    const { withPatientStatus } = require('../shared/patientStatus');

    const isVerifiedGameToken = await utils.verifyGameToken(req.headers.gametoken, mongoose);
    if (!isVerifiedGameToken) {
        context.res = { status: 403, body: utils.createResponse(false, false, "Chave de acesso inválida.", null, 1) };
        context.done();
        return;
    }

    // --- RN01: apenas Administrator/Therapist pode consultar o histórico clínico ---
    const requestingUser = await UserAccountModel.findOne({ "gameToken.token": req.headers.gametoken });
    if (!requestingUser || !["Administrator", "Therapist"].includes(requestingUser.role)) {
        context.res = {
            status: 403,
            body: utils.createResponse(false, false, "Apenas profissionais autenticados podem consultar relatórios clínicos.", null, 1),
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

    // dataIni/dataFim chegam do front como "YYYY-MM-DD" (input date) e são
    // tratadas como dias do calendário de Brasília. Antes a string era
    // montada sem fuso ("YYYY-MM-DD 00:00:00:000") e o resultado dependia do
    // fuso do servidor (UTC na Azure = 21h do dia anterior em Brasília).
    // Offset fixo -03:00: o Brasil não tem horário de verão desde 2019.
    const { dataIni, dataFim } = req.query;
    const hasInvalidDate = [dataIni, dataFim].some((d) => d && !DATE_ONLY.test(d));
    if (hasInvalidDate) {
        context.res = { status: 400, body: utils.createResponse(false, true, "Datas devem estar no formato AAAA-MM-DD.", null, 2) };
        context.done();
        return;
    }

    const filter = { pacientId, archived: req.query.archived === 'true' };
    if (dataIni) {
        filter.created_at = { $gte: brasiliaDayStart(dataIni) };
        if (dataFim) {
            filter.created_at.$lte = brasiliaDayEnd(dataFim);
        }
    }

    try {
        // RF11: histórico completo, mais recente primeiro
        const reports = (await ClinicalReportModel.find(filter).sort({ created_at: -1 })).map(withPatientStatus);
        context.res = {
            status: 200,
            body: utils.createResponse(true, true, "Consulta realizada com sucesso.", reports, null),
        };
    } catch (err) {
        context.log("[GetClinicalReports] - ERROR: ", err);
        context.res = { status: 500, body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0) };
    }

    context.done();
};
