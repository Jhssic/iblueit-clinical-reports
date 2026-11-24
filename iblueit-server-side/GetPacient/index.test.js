jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { aggregate, createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

require('../shared/Pacient');
require('../shared/UserAccount');
const PacientModel = mongoose.model('Pacient');
const UserAccountModel = mongoose.model('UserAccount');

const PACIENT_ID = '5f1d7a2b3c4d5e6f7a8b9c0d';

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async (params = { pacientId: PACIENT_ID }) => {
    const context = createContext();
    await handler(context, createReq({ params, headers: { gametoken: 'tok' } }));
    return context;
};

describe('GetPacient', () => {
    test('responde 403 com gameToken inválido', async () => {
        UserAccountModel.findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 400 sem pacientId', async () => {
        const context = await run({});
        expect(context.res.status).toBe(400);
        expect(PacientModel.aggregate).not.toHaveBeenCalled();
    });

    test('devolve o paciente do gameToken com as sessões de jogo', async () => {
        const agg = aggregate([{ _id: PACIENT_ID, name: 'Ana', playSessions: [] }]);
        PacientModel.aggregate.mockReturnValue(agg);

        const context = await run();

        expect(mongoose.Types.ObjectId).toHaveBeenCalledWith(PACIENT_ID);
        expect(agg.match).toHaveBeenCalledWith({ _id: { objectId: PACIENT_ID }, _gameToken: 'tok' });
        expect(agg.lookup).toHaveBeenCalledWith(expect.objectContaining({ from: 'playsessions', as: 'playSessions' }));
        expect(context.res.status).toBe(200);
        expect(context.res.body.data).toEqual({ _id: PACIENT_ID, name: 'Ana', playSessions: [] });
    });

    test('responde 500 quando o aggregate falha', async () => {
        PacientModel.aggregate.mockReturnValue(aggregate(null, new Error('erro')));
        const context = await run();
        expect(context.res.status).toBe(500);
    });
});
