/*
 * RF09/RF10/RN04 — avaliação de critérios de alerta clínico.
 *
 * Cada critério é avaliado contra a série de sessões mais recentes do paciente
 * em plataformoverviews. Métricas suportadas hoje são as que têm valor real
 * por sessão nessa collection (DJ/PJ/EB) — CGc (gameparameters) e FR/PEmax/PImax
 * (perfil estático do paciente, sem série temporal) ainda não são avaliáveis
 * como tendência e ficam fora do escopo desta função por enquanto.
 */

const axios = require('axios');

// RF10 — quantas sessões buscar pro histórico treinar o modelo de anomalia
// (Isolation Forest, em report-ai). Mais sessões = modelo mais confiável;
// anomaly_detection.py recusa a avaliação se vierem menos que MIN_SESSIONS.
const ANOMALY_HISTORY_LIMIT = 30;

const METRIC_FIELD_MAP = {
    DJ: 'scoreRatio',
    PJ: 'score',
    EB: 'BorgScale',
};

const DEFAULT_CRITERIA = [
    { metric: 'DJ', condition: 'Deterioração consecutiva', triggerValue: 5 },
];

function evaluateConsecutiveDrop(sessionsDesc, field, triggerValue) {
    if (sessionsDesc.length < triggerValue) return false;
    const window = sessionsDesc.slice(0, triggerValue).slice().reverse();
    let consecutiveDrops = 0;
    for (let i = 1; i < window.length; i++) {
        if (window[i][field] < window[i - 1][field]) {
            consecutiveDrops++;
        } else {
            consecutiveDrops = 0;
        }
    }
    return consecutiveDrops >= triggerValue - 1;
}

function evaluatePercentDrop(sessionsDesc, field, triggerValue) {
    if (sessionsDesc.length < 2) return false;
    const [latest, previous] = sessionsDesc;
    if (previous[field] == null || previous[field] === 0 || latest[field] == null) return false;
    const pctChange = ((previous[field] - latest[field]) / previous[field]) * 100;
    return pctChange >= triggerValue;
}

  function evaluateBelowValue(sessionsDesc, field, triggerValue) {
    if (!sessionsDesc.length) return false;
    const latest = sessionsDesc[0];
    if (latest[field] == null) return false;
    return latest[field] < triggerValue;
  }

  // RF10 — detecção de anomalia via Isolation Forest (report-ai), treinado no
  // histórico do próprio paciente. `triggerValue` aqui é a "sensibilidade"
  // (0-100, equivalente ao parâmetro contamination do modelo em percentual).
  // Falha de rede/serviço indisponível ou histórico insuficiente não dispara
  // alerta (fail-safe) — nunca derruba a geração do relatório por causa disso.
  async function evaluateAnomalyIA(sessionsDesc, field, triggerValue, context) {
    const values = sessionsDesc
        .slice()
        .reverse()
        .map((s) => s[field])
        .filter((v) => v != null);

    try {
        const res = await axios.post(`${process.env.URL_API_IA}/detect-anomaly`, {
            values,
            contamination: Math.min(Math.max(triggerValue, 1), 50) / 100,
        }, { timeout: 10000 });
        return !!(res.data && res.data.evaluated && res.data.isAnomaly);
    } catch (err) {
        // Serviço de IA fora do ar ou lento — não derruba a geração do
        // relatório (fail-safe), mas precisa ficar visível em algum lugar,
        // senão um alerta clínico deixa de disparar sem ninguém perceber.
        const log = (context && context.log) || console.error;
        log(`[ANOMALY_IA] - ERROR: falha ao chamar ${process.env.URL_API_IA}/detect-anomaly — ${err.message}`);
        return false;
    }
  }

  async function evaluateAlerts(pacientId, device, mongoose, context) {
    require('./AlertCriteria');
    require('./PlataformOverview');
    const AlertCriteriaModel = mongoose.model('AlertCriteria');
    const PlataformOverviewModel = mongoose.model('PlataformOverview');

    let criteria = await AlertCriteriaModel.find({ pacientId, active: true });
    if (!criteria.length) criteria = DEFAULT_CRITERIA;

    const triggered = [];

    for (const criterion of criteria) {
        const field = METRIC_FIELD_MAP[criterion.metric];
        if (!field) continue; // métrica sem série temporal avaliável (ex: FR, CGc)

        const limit = criterion.condition === 'Deterioração consecutiva'
            ? criterion.triggerValue
            : criterion.condition === 'Abaixo do valor'
                ? 1
                : criterion.condition === 'Anomalia (IA)'
                    ? ANOMALY_HISTORY_LIMIT
                    : 2;

        const sessionsDesc = await PlataformOverviewModel
            .find({ pacientId, gameDevice: device })
            .sort({ playFinish: -1 })
            .limit(limit);

        let matched;
        if (criterion.condition === 'Deterioração consecutiva') {
            matched = evaluateConsecutiveDrop(sessionsDesc, field, criterion.triggerValue);
        } else if (criterion.condition === 'Abaixo do valor') {
            matched = evaluateBelowValue(sessionsDesc, field, criterion.triggerValue);
        } else if (criterion.condition === 'Anomalia (IA)') {
            matched = await evaluateAnomalyIA(sessionsDesc, field, criterion.triggerValue, context);
        } else {
            matched = evaluatePercentDrop(sessionsDesc, field, criterion.triggerValue);
        }

        if (matched) {
            triggered.push({
                metric: criterion.metric,
                condition: criterion.condition,
                triggerValue: criterion.triggerValue,
            });
        }
    }

    return triggered;
}

module.exports = {
    evaluateAlerts,
    METRIC_FIELD_MAP,
    DEFAULT_CRITERIA,
    // Exportadas só pra teste unitário (evaluateAlerts é a única usada fora deste módulo).
    evaluateConsecutiveDrop,
    evaluatePercentDrop,
    evaluateBelowValue,
};
