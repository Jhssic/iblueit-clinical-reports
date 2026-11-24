jest.mock('mongoose', () => require('../test-utils/mongooseMock').createMongooseMock());
jest.mock('axios');

const mongoose = require('mongoose');
const axios = require('axios');
const { query } = require('../test-utils/mongooseMock');

const {
    evaluateAlerts,
    evaluateConsecutiveDrop,
    evaluatePercentDrop,
    evaluateBelowValue,
    DEFAULT_CRITERIA,
} = require('./alertEvaluation');

require('./AlertCriteria');
require('./PlataformOverview');
const AlertCriteriaModel = mongoose.model('AlertCriteria');
const PlataformOverviewModel = mongoose.model('PlataformOverview');

beforeEach(() => {
    mongoose.__resetAll();
    axios.post.mockReset();
    process.env.URL_API_IA = 'http://ia.local';
});

// Sessões sempre em ordem DESCENDENTE (mais recente primeiro), igual ao que
// evaluateAlerts consulta no Mongo (.sort({ playFinish: -1 })).

describe('evaluateConsecutiveDrop', () => {
    test('detecta queda em todas as sessões da janela', () => {
        // mais recente -> mais antiga: 0.3, 0.4, 0.5, 0.6 (cada uma menor que a anterior)
        const sessions = [{ v: 0.3 }, { v: 0.4 }, { v: 0.5 }, { v: 0.6 }];
        expect(evaluateConsecutiveDrop(sessions, 'v', 4)).toBe(true);
    });

    test('não dispara se uma sessão no meio quebrar a sequência de queda', () => {
        const sessions = [{ v: 0.3 }, { v: 0.5 }, { v: 0.5 }, { v: 0.6 }];
        expect(evaluateConsecutiveDrop(sessions, 'v', 4)).toBe(false);
    });

    test('não dispara se não houver sessões suficientes pra janela', () => {
        const sessions = [{ v: 0.3 }, { v: 0.4 }];
        expect(evaluateConsecutiveDrop(sessions, 'v', 5)).toBe(false);
    });
});

describe('evaluatePercentDrop', () => {
    test('dispara quando a queda percentual atinge o limiar', () => {
        const sessions = [{ v: 50 }, { v: 100 }]; // caiu 50%
        expect(evaluatePercentDrop(sessions, 'v', 50)).toBe(true);
    });

    test('não dispara quando a queda fica abaixo do limiar', () => {
        const sessions = [{ v: 90 }, { v: 100 }]; // caiu só 10%
        expect(evaluatePercentDrop(sessions, 'v', 50)).toBe(false);
    });

    test('não dispara (não divide por zero) quando o valor anterior é 0', () => {
        const sessions = [{ v: 10 }, { v: 0 }];
        expect(evaluatePercentDrop(sessions, 'v', 10)).toBe(false);
    });

    test('não dispara com uma sessão só (sem anterior pra comparar)', () => {
        expect(evaluatePercentDrop([{ v: 10 }], 'v', 10)).toBe(false);
    });

    test('não dispara quando falta o valor na sessão mais recente', () => {
        expect(evaluatePercentDrop([{ v: null }, { v: 100 }], 'v', 10)).toBe(false);
    });
});

describe('evaluateBelowValue', () => {
    test('dispara quando a sessão mais recente está abaixo do limiar', () => {
        expect(evaluateBelowValue([{ v: 2 }, { v: 10 }], 'v', 5)).toBe(true);
    });

    test('não dispara quando a sessão mais recente está no limiar ou acima', () => {
        expect(evaluateBelowValue([{ v: 5 }], 'v', 5)).toBe(false);
        expect(evaluateBelowValue([{ v: 10 }], 'v', 5)).toBe(false);
    });

    test('não dispara sem nenhuma sessão', () => {
        expect(evaluateBelowValue([], 'v', 5)).toBe(false);
    });

    test('não dispara quando a sessão mais recente não tem o valor', () => {
        expect(evaluateBelowValue([{ outro: 1 }], 'v', 5)).toBe(false);
    });
});

describe('evaluateAlerts', () => {
    test('usa o critério padrão (DJ, 5 quedas consecutivas) quando o paciente não tem critérios', async () => {
        AlertCriteriaModel.find.mockResolvedValue([]);
        const sessions = [0.1, 0.2, 0.3, 0.4, 0.5].map((scoreRatio) => ({ scoreRatio }));
        const q = query(sessions);
        PlataformOverviewModel.find.mockReturnValue(q);

        const triggered = await evaluateAlerts('pac-1', 'Pitaco', mongoose);

        expect(AlertCriteriaModel.find).toHaveBeenCalledWith({ pacientId: 'pac-1', active: true });
        expect(PlataformOverviewModel.find).toHaveBeenCalledWith({ pacientId: 'pac-1', gameDevice: 'Pitaco' });
        expect(q.sort).toHaveBeenCalledWith({ playFinish: -1 });
        expect(q.limit).toHaveBeenCalledWith(DEFAULT_CRITERIA[0].triggerValue);
        expect(triggered).toEqual([{ metric: 'DJ', condition: 'Deterioração consecutiva', triggerValue: 5 }]);
    });

    test('avalia cada tipo de condição com o limite de sessões certo e ignora métricas sem série temporal', async () => {
        AlertCriteriaModel.find.mockResolvedValue([
            { metric: 'PJ', condition: 'Queda percentual >', triggerValue: 20 },
            { metric: 'EB', condition: 'Abaixo do valor', triggerValue: 3 },
            { metric: 'FR', condition: 'Abaixo do valor', triggerValue: 10 },
        ]);
        const qPercent = query([{ score: 50 }, { score: 100 }]);
        const qBelow = query([{ BorgScale: 5 }]);
        PlataformOverviewModel.find.mockReturnValueOnce(qPercent).mockReturnValueOnce(qBelow);

        const triggered = await evaluateAlerts('pac-1', 'Pitaco', mongoose);

        expect(qPercent.limit).toHaveBeenCalledWith(2);
        expect(qBelow.limit).toHaveBeenCalledWith(1);
        // FR não tem campo mapeado — não consulta sessões pra ele
        expect(PlataformOverviewModel.find).toHaveBeenCalledTimes(2);
        expect(triggered).toEqual([{ metric: 'PJ', condition: 'Queda percentual >', triggerValue: 20 }]);
    });

    test('Anomalia (IA): envia o histórico em ordem cronológica pro report-ai e dispara quando há anomalia', async () => {
        AlertCriteriaModel.find.mockResolvedValue([
            { metric: 'DJ', condition: 'Anomalia (IA)', triggerValue: 10 },
        ]);
        const q = query([{ scoreRatio: 0.1 }, { scoreRatio: null }, { scoreRatio: 0.9 }]);
        PlataformOverviewModel.find.mockReturnValue(q);
        axios.post.mockResolvedValue({ data: { evaluated: true, isAnomaly: true } });

        const triggered = await evaluateAlerts('pac-1', 'Pitaco', mongoose, { log: jest.fn() });

        expect(q.limit).toHaveBeenCalledWith(30);
        expect(axios.post).toHaveBeenCalledWith(
            'http://ia.local/detect-anomaly',
            { values: [0.9, 0.1], contamination: 0.1 },
            { timeout: 10000 }
        );
        expect(triggered).toHaveLength(1);
        expect(triggered[0].condition).toBe('Anomalia (IA)');
    });

    test('Anomalia (IA): limita a sensibilidade entre 1% e 50% e não dispara se o modelo não avaliou', async () => {
        AlertCriteriaModel.find.mockResolvedValue([
            { metric: 'PJ', condition: 'Anomalia (IA)', triggerValue: 90 },
        ]);
        PlataformOverviewModel.find.mockReturnValue(query([{ score: 1 }]));
        axios.post.mockResolvedValue({ data: { evaluated: false, isAnomaly: true } });

        const triggered = await evaluateAlerts('pac-1', 'Pitaco', mongoose);

        expect(axios.post.mock.calls[0][1].contamination).toBe(0.5);
        expect(triggered).toEqual([]);
    });

    test('Anomalia (IA): falha do serviço não dispara alerta (fail-safe) e é registrada no log do contexto', async () => {
        AlertCriteriaModel.find.mockResolvedValue([
            { metric: 'EB', condition: 'Anomalia (IA)', triggerValue: 0 },
        ]);
        PlataformOverviewModel.find.mockReturnValue(query([{ BorgScale: 4 }]));
        axios.post.mockRejectedValue(new Error('timeout'));
        const context = { log: jest.fn() };

        const triggered = await evaluateAlerts('pac-1', 'Pitaco', mongoose, context);

        expect(axios.post.mock.calls[0][1].contamination).toBe(0.01);
        expect(triggered).toEqual([]);
        expect(context.log).toHaveBeenCalledWith(expect.stringContaining('[ANOMALY_IA] - ERROR'));
        expect(context.log.mock.calls[0][0]).toContain('timeout');
    });

    test('Anomalia (IA): sem contexto, a falha vai pro console.error', async () => {
        AlertCriteriaModel.find.mockResolvedValue([
            { metric: 'DJ', condition: 'Anomalia (IA)', triggerValue: 5 },
        ]);
        PlataformOverviewModel.find.mockReturnValue(query([]));
        axios.post.mockRejectedValue(new Error('fora do ar'));
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const triggered = await evaluateAlerts('pac-1', 'Pitaco', mongoose);

        expect(triggered).toEqual([]);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining('fora do ar'));
        spy.mockRestore();
    });
});
