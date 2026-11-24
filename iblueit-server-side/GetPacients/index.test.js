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
    agg = aggregate([{ _id: 'p1', name: 'Ana' }]);
    PacientModel.aggregate.mockReturnValue(agg);
});

const run = async (query = {}) => {
    const context = createContext();
    await handler(context, createReq({ headers: { gametoken: 'tok' }, query }));
    return context;
};

// data de nascimento correspondente a "hoje - anos", à meia-noite local
const anosAtras = (anos) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setFullYear(d.getFullYear() - anos);
    return d;
};

describe('GetPacients', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
        expect(PacientModel.aggregate).not.toHaveBeenCalled();
    });

    test('lista os pacientes do gameToken, ordenados por nome decrescente, com o último relatório clínico (RF09)', async () => {
        const context = await run();

        expect(agg.append).toHaveBeenCalledWith({ $match: { _gameToken: 'tok' } });
        expect(agg.sort).toHaveBeenCalledWith({ name: -1 });
        expect(agg.lookup).toHaveBeenCalledWith(expect.objectContaining({ from: 'playsessions', as: 'playSessions' }));
        const lookupRelatorio = agg.append.mock.calls.find(([s]) => s.$lookup)[0].$lookup;
        expect(lookupRelatorio.from).toBe('clinicalreports');
        expect(lookupRelatorio.pipeline).toEqual(expect.arrayContaining([{ $limit: 1 }, { $sort: { created_at: -1 } }]));
        expect(agg.limit).not.toHaveBeenCalled();
        expect(agg.skip).not.toHaveBeenCalled();

        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual([{ _id: 'p1', name: 'Ana' }]);
        expect(context.done).toHaveBeenCalledTimes(1);
    });

    test('aplica filtros de nome, condição, sexo, ordenação e paginação', async () => {
        await run({ name: 'An', condition: 'Healthy', sex: 'Female', sort: 'asc', limit: '10', skip: '20' });

        const match = agg.append.mock.calls[0][0].$match;
        expect(match.name).toEqual({ $regex: '^An.*', $options: 'i' });
        expect(match.condition).toEqual({ $eq: 'Healthy' });
        expect(match.sex).toEqual({ $eq: 'Female' });
        expect(agg.sort).toHaveBeenCalledWith({ name: 1 });
        expect(agg.limit).toHaveBeenCalledWith(10);
        expect(agg.skip).toHaveBeenCalledWith(20);
    });

    test('filtra por idade mínima', async () => {
        await run({ fromAge: '10' });
        const match = agg.append.mock.calls[0][0].$match;
        expect(match.birthday).toEqual({ $lte: anosAtras(10) });
    });

    test('filtra por idade máxima', async () => {
        await run({ toAge: '15' });
        const match = agg.append.mock.calls[0][0].$match;
        expect(match.birthday).toEqual({ $gte: anosAtras(15) });
    });

    test('filtra por faixa de idade', async () => {
        await run({ fromAge: '10', toAge: '15' });
        const match = agg.append.mock.calls[0][0].$match;
        expect(match.birthday).toEqual({ $lte: anosAtras(10), $gte: anosAtras(15) });
    });

    test('responde 500 quando o aggregate falha', async () => {
        PacientModel.aggregate.mockReturnValue(aggregate(null, new Error('erro')));
        const context = await run();
        expect(context.res.status).toBe(500);
        expect(context.log).toHaveBeenCalledWith('[DB QUERYING] - ERROR: ', expect.any(Error));
    });
});
