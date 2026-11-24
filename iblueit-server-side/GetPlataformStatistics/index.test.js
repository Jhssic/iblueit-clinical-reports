jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { aggregate, createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/Pacient');
require('../shared/PlataformOverview');
require('../shared/UserAccount');
const PacientModel = mongoose.model('Pacient');
const PlataformOverviewModel = mongoose.model('PlataformOverview');
const UserAccountModel = mongoose.model('UserAccount');

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async (query = {}) => {
    const context = createContext();
    await handler(context, createReq({ query }));
    return context;
};

const lookupDe = (agg, from) => agg.lookup.mock.calls.map(([l]) => l).find((l) => l.from === from);

describe('GetPlataformStatistics', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(PacientModel.aggregate).not.toHaveBeenCalled();
    });

    test('sem filtros: usa Pitaco, todas as sessões, e anexa as informações da plataforma de cada paciente', async () => {
        const agg = aggregate([{ pacientId: 'p1' }, { pacientId: 'p2' }]);
        PacientModel.aggregate.mockReturnValue(agg);
        PlataformOverviewModel.find.mockResolvedValue([
            { pacientId: 'p1', maxScore: 10 }, { pacientId: 'p1', maxScore: 20 }, { pacientId: 'p2', maxScore: 5 },
        ]);

        const context = await run();

        expect(agg.append).toHaveBeenCalledWith({ $match: {} });
        expect(agg.match).toHaveBeenCalledWith({ 'newRoot.flowDataDevices.deviceName': 'Pitaco' });
        const sessoes = lookupDe(agg, 'playsessions');
        expect(sessoes.pipeline[0].$match.$expr.$and[1]).toEqual({ $lte: ['$sessionNumber', Number.MAX_SAFE_INTEGER] });
        expect(lookupDe(agg, 'plataformoverviews')).toBeDefined();
        expect(lookupDe(agg, 'flowdatadevices')).toBeDefined();

        expect(PlataformOverviewModel.find).toHaveBeenCalledWith(
            { pacientId: { $in: ['p1', 'p2'] } },
            { pacientId: 1, maxScore: 1, scoreRatio: 1, phase: 1, level: 1 }
        );
        expect(context.res.status).toBe(200);
        const [p1, p2] = context.res.body.data;
        expect(p1.plataformInfo).toHaveLength(2);
        expect(p2.plataformInfo).toEqual([{ pacientId: 'p2', maxScore: 5 }]);
    });

    test('aplica filtros de paciente, data de nascimento, sessões e dispositivo', async () => {
        const agg = aggregate([]);
        PacientModel.aggregate.mockReturnValue(agg);
        PlataformOverviewModel.find.mockResolvedValue([]);

        await run({
            condition: 'Obstructive', sex: 'Male', fromBirthday: '2000-01-01', toBirthday: '2010-12-31',
            maxSessions: '5', phase: '1', level: '2', devices: 'Cinta',
        });

        expect(agg.append).toHaveBeenCalledWith({
            $match: {
                condition: 'Obstructive',
                sex: 'Male',
                birthday: {
                    $gte: new Date('2000-01-01 00:00:00:000'),
                    $lte: new Date('2010-12-31 23:59:59:999'),
                },
            },
        });
        expect(lookupDe(agg, 'playsessions').pipeline[0].$match.$expr.$and[1]).toEqual({ $lte: ['$sessionNumber', '5'] });
        expect(agg.match).toHaveBeenCalledWith({ 'newRoot.flowDataDevices.deviceName': 'Cinta' });
    });

    test('filtra só pela data de nascimento inicial', async () => {
        const agg = aggregate([]);
        PacientModel.aggregate.mockReturnValue(agg);
        PlataformOverviewModel.find.mockResolvedValue([]);
        await run({ fromBirthday: '2000-01-01' });
        expect(agg.append.mock.calls[0][0].$match.birthday).toEqual({ $gte: new Date('2000-01-01 00:00:00:000') });
    });

    test('responde 500 quando o aggregate falha', async () => {
        PacientModel.aggregate.mockReturnValue(aggregate(null, new Error('erro')));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
