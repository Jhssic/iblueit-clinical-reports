module.exports = async function getGameParameter(context, req) {
    const mongoose = require('mongoose');
    const DATABASE = process.env.MongoDbAtlas;
    mongoose.connect(DATABASE);
    mongoose.Promise = global.Promise;

    //GameParameterModel Schema
    require('../shared/GameParameter');
    const GameParameterModel = mongoose.model('GameParameter');

    const utils = require('../shared/utils');

    const isVerifiedGameToken = await utils.verifyGameToken(req.headers.gametoken, mongoose);

    if (!isVerifiedGameToken) {
        context.res = {
            status: 403,
            body: utils.createResponse(false, false, "Chave de acesso inválida.", null, 1)
        }
        context.done();
        return;
    }

    const findObj = buildFindFilter(req.query);
    const findOptionsObj = buildFindOptions(req.query);

    try {
        const GameParameterModels = await GameParameterModel.find(findObj, null, findOptionsObj);
        context.log("[DB QUERYING] - GameParameterModel Get");
        context.res = {
            status: 200,
            body: utils.createResponse(true, true, "Consulta realizada com sucesso.", GameParameterModels, null)
        }
    } catch (err) {
        context.log("[DB QUERYING] - ERROR: ", err);
        context.res = {
            status: 500,
            body: utils.createResponse(false, true, "Ocorreu um erro interno ao realizar a operação.", null, 0)
        }
    }

    context.done();
};

// Campos de GameParameter que podem ser filtrados diretamente pela query string.
const EXACT_MATCH_FIELDS = [
    "pacientId", "stageId", "phase", "level", "ObjectSpeedFactor",
    "HeightIncrement", "HeightUpThreshold", "HeightDownThreshold",
    "SizeIncrement", "SizeUpThreshold", "SizeDownThreshold", "Loops",
];

function buildFindFilter(query) {
    const findObj = {};
    for (const field of EXACT_MATCH_FIELDS) {
        if (query[field]) {
            findObj[field] = query[field];
        }
    }
    if (query.dataIni) {
        findObj.created_at = {
            $gte: new Date(query.dataIni).toISOString("yyyy-MM-ddThh:mm:ss.msZ")
        };
    }
    if (query.dataIni && query.dataFim) {
        findObj.created_at = {
            $gte: new Date(`${query.dataIni} 00:00:00:000 UTC`).toISOString("yyyy-MM-ddThh:mm:ss.msZ"),
            $lte: new Date(`${query.dataFim} 23:59:59:999 UTC`).toISOString("yyyy-MM-ddThh:mm:ss.msZ")
        };
    }
    return findObj;
}

function buildFindOptions(query) {
    const findOptionsObj = { sort: { created_at: -1 } };
    if (query.limit) {
        findOptionsObj.limit = Number.parseInt(query.limit, 10);
    }
    if (query.skip) {
        findOptionsObj.skip = Number.parseInt(query.skip, 10);
    }
    if (query.sort == "asc") {
        findOptionsObj.sort = { created_at: 1 };
    }
    return findOptionsObj;
}
