// Chave de API de IA própria do fisioterapeuta logado (rota account/llmkey).
//   GET    → { configured, last4, updatedAt } — nunca devolve a chave em si
//   PUT    → { apiKey } salva (criptografada) ou substitui a chave
//   DELETE → remove a chave; relatórios voltam a usar a chave padrão do servidor
//
// A chave é sempre do próprio usuário dono do gameToken — não há como ler ou
// alterar a chave de outro profissional por esta rota.

const keyStatus = (llmApiKey) => ({
    configured: Boolean(llmApiKey?.encrypted),
    last4: llmApiKey?.encrypted ? llmApiKey.last4 : null,
    updatedAt: llmApiKey?.encrypted ? llmApiKey.updatedAt : null,
});

module.exports = async function manageLlmApiKey(context, req) {
    const mongoose = require('mongoose');
    const DATABASE = process.env.MongoDbAtlas;
    if (mongoose.connection.readyState === 0) {
        mongoose.connect(DATABASE);
    }
    mongoose.Promise = global.Promise;

    require('../shared/UserAccount');
    const UserAccountModel = mongoose.model('UserAccount');

    const utils = require('../shared/utils');
    const validations = require('../shared/Validators');
    const llmKeyCrypto = require('../shared/llmKeyCrypto');

    const requestingUser = await utils.requireClinicalStaff(
        context, req, mongoose,
        "Apenas profissionais autenticados podem configurar a chave de IA."
    );
    if (!requestingUser) return;

    const method = String(req.method || 'GET').toUpperCase();

    try {
        if (method === 'GET') {
            context.res = {
                status: 200,
                body: utils.createResponse(true, true, "Consulta realizada com sucesso.", keyStatus(requestingUser.llmApiKey), null),
            };
            context.done();
            return;
        }

        if (method === 'DELETE') {
            await UserAccountModel.updateOne({ _id: requestingUser._id }, { $unset: { llmApiKey: "" } });
            context.log(`[AUDIT] Chave de IA removida pelo usuário ${requestingUser._id} em ${new Date().toISOString()}`);
            context.res = {
                status: 200,
                body: utils.createResponse(true, true, "Chave de IA removida. Os relatórios voltam a usar a configuração padrão do servidor.", keyStatus(null), null),
            };
            context.done();
            return;
        }

        // PUT
        const body = req.body || {};
        const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : body.apiKey;
        const validationResult = validations.saveLlmApiKeyValidator({ apiKey });
        if (validationResult.errorCount !== 0) {
            let response = utils.createResponse(false, true, "Chave de IA inválida.", null, 2);
            response.errors = validationResult.errors.errors;
            context.res = { status: 400, body: response };
            context.done();
            return;
        }

        if (!llmKeyCrypto.isConfigured()) {
            context.log("[ManageLlmApiKey] - LLM_KEY_ENCRYPTION_SECRET não configurada; não é possível salvar a chave.");
            context.res = {
                status: 503,
                body: utils.createResponse(false, true, "O servidor não está configurado para guardar chaves de IA. Contate o administrador.", null, null),
            };
            context.done();
            return;
        }

        const llmApiKey = {
            encrypted: llmKeyCrypto.encrypt(apiKey),
            last4: llmKeyCrypto.lastFour(apiKey),
            updatedAt: new Date(),
        };
        await UserAccountModel.updateOne({ _id: requestingUser._id }, { $set: { llmApiKey } });
        context.log(`[AUDIT] Chave de IA configurada pelo usuário ${requestingUser._id} em ${llmApiKey.updatedAt.toISOString()}`);

        context.res = {
            status: 200,
            body: utils.createResponse(true, true, "Chave de IA salva com sucesso.", keyStatus(llmApiKey), null),
        };
    } catch (err) {
        context.log("[ManageLlmApiKey] - ERROR: ", err.message);
        context.res = { status: 500, body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0) };
    }

    context.done();
};
