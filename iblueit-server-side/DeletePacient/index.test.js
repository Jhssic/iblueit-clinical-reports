jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());

const mongoose = require('mongoose');
const { query, createContext, createReq, authenticate } = require('../test-utils/mongooseMock');
const handler = require('./index');

['Pacient', 'PlataformOverview', 'CalibrationOverview', 'MinigameOverview', 'UserAccount', 'PlaySession']
    .forEach((m) => require(`../shared/${m}`));
const M = (name) => mongoose.model(name);

const PACIENT_ID = '5f1d7a2b3c4d5e6f7a8b9c0d';

beforeEach(() => {
    mongoose.__resetAll();
    authenticate(mongoose);
});

const run = async ({ params = { pacientId: PACIENT_ID }, query: q = {} } = {}) => {
    const context = createContext();
    await handler(context, createReq({ params, query: q }));
    return context;
};

// espera a cadeia de promises "solta" (fire-and-forget) da transação terminar
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('DeletePacient', () => {
    test('responde 403 com gameToken inválido', async () => {
        M('UserAccount').findOne.mockResolvedValue(null);
        const context = await run();
        expect(context.res.status).toBe(403);
    });

    test('responde 404 com pacientId fora do formato ObjectId', async () => {
        const context = await run({ params: { pacientId: '123' } });
        expect(context.res.status).toBe(404);
        expect(M('Pacient').deleteOne).not.toHaveBeenCalled();
    });

    test('allData=0: exclui só o cadastro do paciente', async () => {
        M('Pacient').deleteOne.mockResolvedValue({ deletedCount: 1 });

        const context = await run({ query: { allData: '0' } });

        expect(M('Pacient').deleteOne).toHaveBeenCalledWith({ _id: PACIENT_ID });
        expect(M('PlataformOverview').deleteMany).not.toHaveBeenCalled();
        expect(context.res.status).toBe(200);
        expect(context.res.body.message).toBe('Exclusão realizada com sucesso.');
    });

    test('exclusão completa: apaga paciente e todos os dados vinculados numa transação', async () => {
        const session = {
            startTransaction: jest.fn(),
            commitTransaction: jest.fn().mockResolvedValue(),
            endSession: jest.fn().mockResolvedValue(),
        };
        M('Pacient').db.startSession.mockResolvedValue(session);
        const queries = {};
        [['Pacient', 'deleteOne'], ['PlataformOverview', 'deleteMany'], ['CalibrationOverview', 'deleteMany'],
            ['MinigameOverview', 'deleteMany'], ['UserAccount', 'deleteOne'], ['PlaySession', 'deleteOne']]
            .forEach(([model, method]) => {
                queries[model] = query({});
                M(model)[method].mockReturnValue(queries[model]);
            });

        const context = await run();
        await flushPromises();

        expect(context.res.status).toBe(200);
        expect(session.startTransaction).toHaveBeenCalled();
        expect(mongoose.Types.ObjectId).toHaveBeenCalledWith(PACIENT_ID);
        expect(M('Pacient').deleteOne).toHaveBeenCalledWith({ _id: { objectId: PACIENT_ID } });
        expect(M('PlataformOverview').deleteMany).toHaveBeenCalledWith({ pacientId: PACIENT_ID });
        expect(M('CalibrationOverview').deleteMany).toHaveBeenCalledWith({ pacientId: PACIENT_ID });
        expect(M('MinigameOverview').deleteMany).toHaveBeenCalledWith({ pacientId: PACIENT_ID });
        expect(M('UserAccount').deleteOne).toHaveBeenCalledWith({ pacientId: PACIENT_ID });
        expect(M('PlaySession').deleteOne).toHaveBeenCalledWith({ pacientId: PACIENT_ID });
        Object.values(queries).forEach((q) => expect(q.session).toHaveBeenCalledWith(session));
        expect(session.commitTransaction).toHaveBeenCalled();
        expect(session.endSession).toHaveBeenCalled();
    });
});
