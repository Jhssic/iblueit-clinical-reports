module.exports = async function getGameParameterNeighborInformation(context, req) {
    const axios = require('axios');
    const mongoose = require('mongoose');
    const DATABASE = process.env.MongoDbAtlas;
    const URL_API_IA = process.env.URL_API_IA;
    mongoose.connect(DATABASE);
    mongoose.Promise = global.Promise;

    //GameParameterModel Schema
    require('../shared/GameParameter');
    const GameParameterModel = mongoose.model('GameParameter');

    const utils = require('../shared/utils');

    await utils.validateHeaders(req.headers, context);

    const isVerifiedGameToken = await utils.verifyGameToken(req.headers.gametoken, mongoose);

    if (!isVerifiedGameToken) {
        context.res = {
            status: 403,
            body: utils.createResponse(false,
                false,
                "Chave de acesso inválida.",
                null,
                1)
        }
        context.done();
        return;
    }

    const pacientId = req.query.pacientId
    if (pacientId === undefined || pacientId == null) {
        context.res = {
            status: 400,
            body: utils.createResponse(false, false, "Parâmetros de consulta inexistentes.", null, 300)
        }
        context.done();
    } else {
        const config = {
            method: 'get',
            url: URL_API_IA + '/neighborsByPacient',
            headers: { 'Content-Type': 'application/json' },
            params: {
                pacientId: pacientId
            }
        };
        // Antes, a resposta de erro/vazio era enviada dentro do .then/.catch e o
        // handler continuava executando: com falha na IA estourava TypeError
        // (lista indefinida) e, sem vizinhos, sobrescrevia a resposta com uma
        // "média" de zero itens (NaN). Agora cada caso retorna na hora.
        let neighborsPacientReturn;
        try {
            const response = await axios(config);
            neighborsPacientReturn = response.data.neighborsPacientReturn || [];
        } catch (error) {
            context.log("[GetGameParameterNeighborInformation] - ERROR: ", error.message);
            // 502 (Bad Gateway): a falha foi no serviço externo (URL_API_IA),
            // não na requisição do cliente.
            context.res = {
                status: 502,
                body: utils.createResponse(false, true, "Não foi possível consultar os pacientes semelhantes. Tente novamente.", null, null)
            }
            context.done();
            return;
        }
        if (neighborsPacientReturn.length === 0) {
            context.res = {
                status: 200,
                body: utils.createResponse(true, true, "Nenhum paciente semelhante encontrado.", [], null)
            }
            context.done();
            return;
        }
        const neighborsPacientIds = neighborsPacientReturn.map((neighborsPacient) => neighborsPacient.pacientId)
        const arrayConfigurations = []
        const GameParameters = await GameParameterModel.find({ "pacientId": neighborsPacientIds });
        const GameParametersLength = GameParameters.length;
        GameParameters.forEach(function (GameParameter) {
            arrayConfigurations.push({
                "stageId": getFloat(GameParameter.stageId),
                "phase": getFloat(GameParameter.phase),
                "level": getFloat(GameParameter.level),
                "pacientId": GameParameter.pacientId,
                "pacientName": neighborsPacientReturn.find(neighborsPacient => neighborsPacient.pacientId === GameParameter.pacientId).pacientName,
                "ObjectSpeedFactor": getFloat(GameParameter.ObjectSpeedFactor),
                "HeightIncrement": getFloat(GameParameter.HeightIncrement),
                "HeightUpThreshold": getFloat(GameParameter.HeightUpThreshold),
                "HeightDownThreshold": getFloat(GameParameter.HeightDownThreshold),
                "SizeIncrement": getFloat(GameParameter.SizeIncrement),
                "SizeUpThreshold": getFloat(GameParameter.SizeUpThreshold),
                "SizeDownThreshold": getFloat(GameParameter.SizeDownThreshold),
                "Loops": getFloat(GameParameter.Loops),
                "isAVG": false
            })
        })
        arrayConfigurations.push({
            "stageId": Number.parseInt((arrayConfigurations.reduce((sum, configuration) => sum + configuration["stageId"], 0)) / GameParametersLength, 10),
            "phase": Number.parseInt((arrayConfigurations.reduce((sum, configuration) => sum + configuration["phase"], 0)) / GameParametersLength, 10),
            "level": Number.parseInt((arrayConfigurations.reduce((sum, configuration) => sum + configuration["level"], 0)) / GameParametersLength, 10),
            "pacientId": null,
            "pacientName": null,
            "ObjectSpeedFactor": (arrayConfigurations.reduce((sum, configuration) => sum + configuration["ObjectSpeedFactor"], 0)) / GameParametersLength,
            "Loops": Number.parseInt((arrayConfigurations.reduce((sum, configuration) => sum + configuration["Loops"], 0)) / GameParametersLength, 10),
            "HeightIncrement": (arrayConfigurations.reduce((sum, configuration) => sum + configuration["HeightIncrement"], 0)) / GameParametersLength,
            "HeightUpThreshold": (arrayConfigurations.reduce((sum, configuration) => sum + configuration["HeightUpThreshold"], 0)) / GameParametersLength,
            "HeightDownThreshold": (arrayConfigurations.reduce((sum, configuration) => sum + configuration["HeightDownThreshold"], 0)) / GameParametersLength,
            "SizeIncrement": (arrayConfigurations.reduce((sum, configuration) => sum + configuration["SizeIncrement"], 0)) / GameParametersLength,
            "SizeUpThreshold": (arrayConfigurations.reduce((sum, configuration) => sum + configuration["SizeUpThreshold"], 0)) / GameParametersLength,
            "SizeDownThreshold": (arrayConfigurations.reduce((sum, configuration) => sum + configuration["SizeDownThreshold"], 0)) / GameParametersLength,
            "isAVG": true
        })
        context.res = {
            status: 200,
            body: utils.createResponse(true, true, "Consulta realizada com sucesso.", arrayConfigurations, null)
        }
        context.done();
    }
};

function getFloat(value) {
    return value && Number.parseFloat(value.toString()) ? Number.parseFloat(value.toString()) : 0;
}