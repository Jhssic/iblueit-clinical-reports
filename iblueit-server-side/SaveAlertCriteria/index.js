module.exports = async function saveAlertCriteria(context, req) {
    const mongoose = require('mongoose');
    const DATABASE = process.env.MongoDbAtlas;
    if (mongoose.connection.readyState === 0) {
        mongoose.connect(DATABASE);
    }
    mongoose.Promise = global.Promise;

    require('../shared/AlertCriteria');
    const AlertCriteriaModel = mongoose.model('AlertCriteria');

    const utils = require('../shared/utils');
    const validations = require('../shared/Validators');

    // RN01: Administrator ou Therapist — o fisioterapeuta é quem configura os
    // alertas do paciente (persona do README), não só o administrador.
    const requestingUser = await utils.requireClinicalStaff(
        context, req, mongoose, "Apenas profissionais autenticados podem configurar alertas."
    );
    if (!requestingUser) return;

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

    let validationResult = validations.saveAlertCriteriaValidator(body);
    if (validationResult.errorCount !== 0) {
        let response = utils.createResponse(false, true, "Erros de validação encontrados!", null, 2);
        response.errors = validationResult.errors.errors;
        context.res = { status: 400, body: response };
        context.done();
        return;
    }

    try {
        // Substitui todos os critérios do paciente pela lista enviada.
        // Insere os novos ANTES de apagar os antigos (pelos _id lidos antes):
        // apagando primeiro, uma falha no insert deixava o paciente sem
        // nenhum critério configurado. Se o delete falhar depois do insert,
        // sobram duplicados que o próximo salvamento limpa — melhor que perder dados.
        const previous = await AlertCriteriaModel.find({ pacientId }, '_id');
        const previousIds = (previous || []).map((c) => c._id);

        const created = await AlertCriteriaModel.insertMany(
            body.criteria.map((c) => ({
                pacientId,
                metric: c.metric,
                condition: c.condition,
                triggerValue: c.triggerValue,
            }))
        );

        if (previousIds.length) {
            await AlertCriteriaModel.deleteMany({ _id: { $in: previousIds } });
        }

        context.res = {
            status: 201,
            body: utils.createResponse(true, true, "Configuração de alertas salva com sucesso.", created, null),
        };
    } catch (err) {
        context.log("[SaveAlertCriteria] - ERROR: ", err);
        context.res = { status: 500, body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0) };
    }

    context.done();
};
