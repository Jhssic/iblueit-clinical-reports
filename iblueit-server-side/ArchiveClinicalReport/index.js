module.exports = async function (context, req) {
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

    const isVerifiedGameToken = await utils.verifyGameToken(req.headers.gametoken, mongoose);
    if (!isVerifiedGameToken) {
        context.res = { status: 403, body: utils.createResponse(false, false, "Chave de acesso inválida.", null, 1) };
        context.done();
        return;
    }

    // --- RN01: apenas Administrator/Therapist pode arquivar relatórios ---
    const requestingUser = await UserAccountModel.findOne({ "gameToken.token": req.headers.gametoken });
    if (!requestingUser || !["Administrator", "Therapist"].includes(requestingUser.role)) {
        context.res = {
            status: 403,
            body: utils.createResponse(false, false, "Apenas profissionais autenticados podem arquivar relatórios clínicos.", null, 1),
        };
        context.done();
        return;
    }

    const pacientId = req.params.pacientId;
    const reportId = req.params.reportId;
    if (!pacientId || !reportId) {
        context.res = { status: 400, body: utils.createResponse(false, true, "Parâmetros de consulta inexistentes.", null, 300) };
        context.done();
        return;
    }

    try {
        // --- RN05: histórico nunca é excluído, apenas arquivado ---
        const report = await ClinicalReportModel.findOneAndUpdate(
            { _id: reportId, pacientId },
            { archived: true },
            { new: true }
        );

        if (!report) {
            context.res = { status: 404, body: utils.createResponse(false, true, "Relatório não encontrado para este paciente.", null, null) };
            context.done();
            return;
        }

        context.log(`[AUDIT] ClinicalReport ${report._id} arquivado por usuário ${requestingUser._id} em ${new Date().toISOString()}`);

        context.res = {
            status: 200,
            body: utils.createResponse(true, true, "Relatório arquivado com sucesso.", report, null),
        };
    } catch (err) {
        context.log("[ArchiveClinicalReport] - ERROR: ", err);
        context.res = { status: 500, body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0) };
    }

    context.done();
};
