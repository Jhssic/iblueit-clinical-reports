jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());
jest.mock('axios');

const mongoose = require('mongoose');
const axios = require('axios');
const { createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/GameParameter');
require('../shared/UserAccount');
const GameParameterModel = mongoose.model('GameParameter');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    axios.mockReset();
    authenticate(mongoose);
    process.env.URL_API_IA = 'http://ia.local';
});

// guarda o context.res de cada chamada a context.done()
const contextComHistorico = () => {
    const context = createContext();
    context.respostas = [];
    context.done.mockImplementation(() => context.respostas.push(context.res));
    return context;
};

const param = (overrides) => ({
    stageId: 1, phase: 2, level: 1, pacientId: 'viz-1', ObjectSpeedFactor: 1, HeightIncrement: 0.1, HeightUpThreshold: 0.8,
    HeightDownThreshold: 0.2, SizeIncrement: 0.1, SizeUpThreshold: 0.8, SizeDownThreshold: 0.2, Loops: 2,
    ...overrides,
});

describe('GetGameParameterNeighborInformation', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = createContext();
        await handler(context, createReq({ query: { pacientId: 'pac-1' } }));
        expect(context.res.status).toBe(403);
        expect(axios).not.toHaveBeenCalled();
    });

    test('responde 400 sem pacientId', async () => {
        const context = createContext();
        await handler(context, createReq({ query: {} }));
        expect(context.res.status).toBe(400);
    });

    test('busca os vizinhos na API de IA e devolve os parâmetros de cada um mais a média', async () => {
        axios.mockResolvedValue({
            data: { neighborsPacientReturn: [{ pacientId: 'viz-1', pacientName: 'Ana' }, { pacientId: 'viz-2', pacientName: 'Bia' }] },
        });
        GameParameterModel.find.mockResolvedValue([
            param({ pacientId: 'viz-1', stageId: 1, phase: 2, level: 5, ObjectSpeedFactor: 1, Loops: 2 }),
            param({ pacientId: 'viz-2', stageId: 3, phase: 4, level: 7, ObjectSpeedFactor: 2, Loops: 3, SizeIncrement: null }),
        ]);
        const context = contextComHistorico();

        await handler(context, createReq({ query: { pacientId: 'pac-1' } }));

        expect(axios).toHaveBeenCalledWith(expect.objectContaining({
            method: 'get', url: 'http://ia.local/neighborsByPacient', params: { pacientId: 'pac-1' },
        }));
        expect(GameParameterModel.find).toHaveBeenCalledWith({ pacientId: ['viz-1', 'viz-2'] });

        expect(context.res.status).toBe(200);
        const [ana, bia, media] = context.res.body.data;
        // level vem do próprio campo level (antes copiava phase por engano)
        expect(ana).toMatchObject({ pacientName: 'Ana', stageId: 1, phase: 2, level: 5, isAVG: false });
        expect(bia).toMatchObject({ pacientName: 'Bia', SizeIncrement: 0, isAVG: false });
        expect(media).toMatchObject({
            pacientId: null, isAVG: true, stageId: 2, phase: 3, level: 6, ObjectSpeedFactor: 1.5, Loops: 2, SizeIncrement: 0.05,
        });
        expect(context.respostas).toHaveLength(1);
    });

    test('sem vizinhos: responde 200 com lista vazia, uma única vez, sem consultar o banco', async () => {
        axios.mockResolvedValue({ data: { neighborsPacientReturn: [] } });
        const context = contextComHistorico();

        await handler(context, createReq({ query: { pacientId: 'pac-1' } }));

        expect(context.respostas).toHaveLength(1);
        expect(context.res.status).toBe(200);
        expect(context.res.body.success).toBe(true);
        expect(context.res.body.data).toEqual([]);
        expect(GameParameterModel.find).not.toHaveBeenCalled();
    });

    test('falha na API de IA: responde 502 uma única vez, sem estourar erro', async () => {
        axios.mockRejectedValue(new Error('IA fora do ar'));
        const context = contextComHistorico();

        await handler(context, createReq({ query: { pacientId: 'pac-1' } }));

        expect(context.respostas).toHaveLength(1);
        expect(context.res.status).toBe(502);
        expect(context.res.body.success).toBe(false);
        expect(GameParameterModel.find).not.toHaveBeenCalled();
    });
});
