jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { aggregate, createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/Pacient');
require('../shared/UserAccount');
const PacientModel = mongoose.model('Pacient');
const UserAccountModel = mongoose.model('UserAccount');

let agg;
beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
    agg = aggregate([{ pacientId: 'p1', maxFlows: [] }]);
    PacientModel.aggregate.mockReturnValue(agg);
});

const run = async (query = {}) => {
    const context = createContext();
    await handler(context, createReq({ query }));
    return context;
};

const lookupDe = (from) => agg.lookup.mock.calls.map(([l]) => l).find((l) => l.from === from);
// condição "$eq minigameName" dentro do lookup de minigameoverviews
const minigameFiltrado = () => lookupDe('minigameoverviews').pipeline[1].$match.$expr.$and[1].$eq[1];
// operador do fluxo agregado por sessão
const operadorFluxo = () => agg.group.mock.calls[0][0].maxFlow;

describe('GetMinigamesStatistics', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('padrão: WaterGame com Pitaco usa o menor fluxo (inspiratório) por sessão', async () => {
        const context = await run();

        expect(agg.append).toHaveBeenCalledWith({ $match: {} });
        expect(minigameFiltrado()).toBe('WaterGame');
        expect(agg.match).toHaveBeenCalledWith({ devices: { $in: ['Pitaco'] } });
        expect(operadorFluxo()).toEqual({ $min: '$flow' });
        expect(lookupDe('playsessions').pipeline[0].$match.$expr.$and[1]).toEqual({ $lte: ['$sessionNumber', Number.MAX_SAFE_INTEGER] });
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual([{ pacientId: 'p1', maxFlows: [] }]);
    });

    test('CakeGame usa o maior fluxo (expiratório) e aplica os filtros informados', async () => {
        await run({
            minigameName: 'CakeGame', devices: 'Cinta', condition: 'Restrictive', sex: 'Female',
            fromBirthday: '2000-01-01', toBirthday: '2005-01-01', maxSessions: '3',
        });

        expect(minigameFiltrado()).toBe('CakeGame');
        expect(operadorFluxo()).toEqual({ $max: '$flow' });
        expect(agg.match).toHaveBeenCalledWith({ devices: { $in: ['Cinta'] } });
        expect(agg.append).toHaveBeenCalledWith({
            $match: {
                condition: 'Restrictive',
                sex: 'Female',
                birthday: { $gte: new Date('2000-01-01 00:00:00:000'), $lte: new Date('2005-01-01 23:59:59:999') },
            },
        });
        expect(lookupDe('playsessions').pipeline[0].$match.$expr.$and[1]).toEqual({ $lte: ['$sessionNumber', '3'] });
    });

    test('filtra só pela data de nascimento inicial', async () => {
        await run({ fromBirthday: '2000-01-01' });
        expect(agg.append.mock.calls[0][0].$match.birthday).toEqual({ $gte: new Date('2000-01-01 00:00:00:000') });
    });

    test('responde 500 quando o aggregate falha', async () => {
        PacientModel.aggregate.mockReturnValue(aggregate(null, new Error('erro')));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
