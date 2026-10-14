module.exports = async function (context, req) {
    const mongoose = require('mongoose');
    const DATABASE = process.env.MongoDbAtlas;
    if (mongoose.connection.readyState === 0) {
        mongoose.connect(DATABASE);
    }
    mongoose.Promise = global.Promise;

    require('../shared/UserAccount');
    require('../shared/ClinicalReport');
    require('../shared/AlertRecord');
    const UserAccountModel = mongoose.model('UserAccount');
    const ClinicalReportModel = mongoose.model('ClinicalReport');
    const AlertRecordModel = mongoose.model('AlertRecord');

    const utils = require('../shared/utils');

    const isVerifiedGameToken = await utils.verifyGameToken(req.headers.gametoken, mongoose);
    if (!isVerifiedGameToken) {
        context.res = { status: 403, body: utils.createResponse(false, false, "Chave de acesso inválida.", null, 1) };
        context.done();
        return;
    }

    // --- RN01: apenas Administrator/Therapist pode excluir definitivamente ---
    const requestingUser = await UserAccountModel.findOne({ "gameToken.token": req.headers.gametoken });
    if (!requestingUser || !["Administrator", "Therapist"].includes(requestingUser.role)) {
        context.res = {
            status: 403,
            body: utils.createResponse(false, false, "Apenas profissionais autenticados podem excluir relatórios clínicos.", null, 1),
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
        const report = await ClinicalReportModel.findOne({ _id: reportId, pacientId });
        if (!report) {
            context.res = { status: 404, body: utils.createResponse(false, true, "Relatório não encontrado para este paciente.", null, null) };
            context.done();
            return;
        }

        // --- LGPD Art. 18: exclusão definitiva só é permitida sobre um
        // relatório já arquivado (RN05) — garante que a exclusão de verdade
        // é uma ação deliberada em duas etapas, não um clique só na lista ativa.
        if (!report.archived) {
            context.res = {
                status: 400,
                body: utils.createResponse(false, true, "Arquive o relatório antes de excluí-lo definitivamente.", null, null),
            };
            context.done();
            return;
        }

        // Log de auditoria ANTES da exclusão — depois de excluído não há
        // mais como consultar o documento pra registrar o que foi removido.
        context.log(`[AUDIT] ClinicalReport ${report._id} (paciente ${pacientId}) excluído definitivamente por usuário ${requestingUser._id} em ${new Date().toISOString()}`);

        await AlertRecordModel.deleteMany({ clinicalReportId: report._id });
        await ClinicalReportModel.deleteOne({ _id: report._id });

        context.res = {
            status: 200,
            body: utils.createResponse(true, true, "Relatório excluído definitivamente.", null, null),
        };
    } catch (err) {
        context.log("[DeleteClinicalReport] - ERROR: ", err);
        context.res = { status: 500, body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0) };
    }

    context.done();
};
