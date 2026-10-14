const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
    evaluateConsecutiveDrop,
    evaluatePercentDrop,
    evaluateBelowValue,
} = require('./alertEvaluation');

// Sessões sempre em ordem DESCENDENTE (mais recente primeiro), igual ao que
// evaluateAlerts consulta no Mongo (.sort({ playFinish: -1 })).

describe('evaluateConsecutiveDrop', () => {
    test('detecta queda em todas as sessões da janela', () => {
        // mais recente -> mais antiga: 0.3, 0.4, 0.5, 0.6 (cada uma menor que a anterior)
        const sessions = [{ v: 0.3 }, { v: 0.4 }, { v: 0.5 }, { v: 0.6 }];
        assert.equal(evaluateConsecutiveDrop(sessions, 'v', 4), true);
    });

    test('não dispara se uma sessão no meio quebrar a sequência de queda', () => {
        const sessions = [{ v: 0.3 }, { v: 0.5 }, { v: 0.5 }, { v: 0.6 }];
        assert.equal(evaluateConsecutiveDrop(sessions, 'v', 4), false);
    });

    test('não dispara se não houver sessões suficientes pra janela', () => {
        const sessions = [{ v: 0.3 }, { v: 0.4 }];
        assert.equal(evaluateConsecutiveDrop(sessions, 'v', 5), false);
    });
});

describe('evaluatePercentDrop', () => {
    test('dispara quando a queda percentual atinge o limiar', () => {
        const sessions = [{ v: 50 }, { v: 100 }]; // caiu 50%
        assert.equal(evaluatePercentDrop(sessions, 'v', 50), true);
    });

    test('não dispara quando a queda fica abaixo do limiar', () => {
        const sessions = [{ v: 90 }, { v: 100 }]; // caiu só 10%
        assert.equal(evaluatePercentDrop(sessions, 'v', 50), false);
    });

    test('não dispara (não divide por zero) quando o valor anterior é 0', () => {
        const sessions = [{ v: 10 }, { v: 0 }];
        assert.equal(evaluatePercentDrop(sessions, 'v', 10), false);
    });

    test('não dispara com uma sessão só (sem anterior pra comparar)', () => {
        assert.equal(evaluatePercentDrop([{ v: 10 }], 'v', 10), false);
    });
});

describe('evaluateBelowValue', () => {
    test('dispara quando a sessão mais recente está abaixo do limiar', () => {
        assert.equal(evaluateBelowValue([{ v: 2 }, { v: 10 }], 'v', 5), true);
    });

    test('não dispara quando a sessão mais recente está no limiar ou acima', () => {
        assert.equal(evaluateBelowValue([{ v: 5 }], 'v', 5), false);
        assert.equal(evaluateBelowValue([{ v: 10 }], 'v', 5), false);
    });

    test('não dispara sem nenhuma sessão', () => {
        assert.equal(evaluateBelowValue([], 'v', 5), false);
    });
});
