/*
 * RF09/RF10/RN04 — avaliação de critérios de alerta clínico.
 *
 * Cada critério é avaliado contra a série de sessões mais recentes do paciente
 * em plataformoverviews. Métricas suportadas hoje são as que têm valor real
 * por sessão nessa collection (DJ/PJ/EB) — CGc (gameparameters) e FR/PEmax/PImax
 * (perfil estático do paciente, sem série temporal) ainda não são avaliáveis
 * como tendência e ficam fora do escopo desta função por enquanto.
 *
 * Sentido clínico: as condições falam em "deterioração", "queda" e "abaixo",
 * pensadas pra métricas em que MAIOR é MELHOR (DJ/PJ). Na EB (Escala de Borg,
 * esforço percebido) MAIOR é PIOR, então pra ela as comparações são
 * invertidas: deterioração = aumento consecutivo, "Queda percentual >" =
 * aumento percentual, e "Abaixo do valor" = ACIMA do valor (o lado
 * clinicamente ruim). O rótulo da condição foi mantido pra não mudar o
 * contrato com o front/banco — quem descreve o alerta deve usar o sentido
 * invertido para EB (ver describe_alert em report-ai/narrative.py).
 *
 * Período (RF09): só entram sessões até o fim do período do relatório
 * (playFinish <= periodEnd) — um relatório de janeiro não pode disparar
 * alerta por causa de sessões de março.
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

// Métricas em que um valor MAIOR indica PIORA (ver comentário do topo).
const LOWER_IS_BETTER = new Set(['EB']);

const isLowerBetter = (metric) => LOWER_IS_BETTER.has(metric);

// "a piorou em relação a b", no sentido clínico da métrica.
const worsened = (a, b, lowerIsBetter) => (lowerIsBetter ? a > b : a < b);

const DEFAULT_CRITERIA = [
    { metric: 'DJ', condition: 'Deterioração consecutiva', triggerValue: 5 },
];

function evaluateConsecutiveDrop(sessionsDesc, field, triggerValue, lowerIsBetter = false) {
    if (sessionsDesc.length < triggerValue) return false;
    const window = sessionsDesc.slice(0, triggerValue).slice().reverse();
    let consecutiveDrops = 0;
    for (let i = 1; i < window.length; i++) {
        if (worsened(window[i][field], window[i - 1][field], lowerIsBetter)) {
            consecutiveDrops++;
        } else {
            consecutiveDrops = 0;
        }
    }
    return consecutiveDrops >= triggerValue - 1;
}

// Variação percentual no sentido de piora entre as duas últimas sessões
// (queda pra DJ/PJ, aumento pra EB). Com valor anterior 0 o percentual é
// indefinido e o critério não dispara.
function evaluatePercentDrop(sessionsDesc, field, triggerValue, lowerIsBetter = false) {
    if (sessionsDesc.length < 2) return false;
    const [latest, previous] = sessionsDesc;
    if (previous[field] == null || previous[field] === 0 || latest[field] == null) return false;
    const worsening = lowerIsBetter
        ? latest[field] - previous[field]
        : previous[field] - latest[field];
    const pctChange = (worsening / previous[field]) * 100;
    return pctChange >= triggerValue;
}

// "Abaixo do valor": pra EB vale o lado clinicamente ruim, ou seja, ACIMA
// do valor (ver comentário do topo).
function evaluateBelowValue(sessionsDesc, field, triggerValue, lowerIsBetter = false) {
    if (!sessionsDesc.length) return false;
    const latest = sessionsDesc[0];
    if (latest[field] == null) return false;
    return lowerIsBetter ? latest[field] > triggerValue : latest[field] < triggerValue;
}

  // RF10 — detecção de anomalia via Isolation Forest (report-ai), treinado no
  // histórico do próprio paciente. `triggerValue` aqui é a "sensibilidade"
  // (0-100, equivalente ao parâmetro contamination do modelo em percentual).
  // Falha de rede/serviço indisponível ou histórico insuficiente não dispara
  // alerta (fail-safe) — nunca derruba a geração do relatório por causa disso.
  // `direction` diz ao modelo qual lado é piora (só esse lado gera alerta).
  async function evaluateAnomalyIA(sessionsDesc, field, triggerValue, context, lowerIsBetter = false) {
    const values = sessionsDesc
        .slice()
        .reverse()
        .map((s) => s[field])
        .filter((v) => v != null);

    try {
        const res = await axios.post(`${process.env.URL_API_IA}/detect-anomaly`, {
            values,
            contamination: Math.min(Math.max(triggerValue, 1), 50) / 100,
            direction: lowerIsBetter ? 'higher_is_worse' : 'lower_is_worse',
        }, { timeout: 10000 });
        return !!(res.data?.evaluated && res.data.isAnomaly);
    } catch (err) {
        // Serviço de IA fora do ar ou lento — não derruba a geração do
        // relatório (fail-safe), mas precisa ficar visível em algum lugar,
        // senão um alerta clínico deixa de disparar sem ninguém perceber.
        const log = context?.log || console.error;
        log(`[ANOMALY_IA] - ERROR: falha ao chamar ${process.env.URL_API_IA}/detect-anomaly — ${err.message}`);
        return false;
    }
  }

// Quantas sessões (mais recentes) cada condição precisa para ser avaliada.
function historyLimitFor(criterion) {
    switch (criterion.condition) {
        case 'Deterioração consecutiva':
            return criterion.triggerValue;
        case 'Abaixo do valor':
            return 1;
        case 'Anomalia (IA)':
            return ANOMALY_HISTORY_LIMIT;
        default:
            return 2;
    }
}

async function matchesCriterion(criterion, field, sessionsDesc, context) {
    const lowerIsBetter = isLowerBetter(criterion.metric);
    switch (criterion.condition) {
        case 'Deterioração consecutiva':
            return evaluateConsecutiveDrop(sessionsDesc, field, criterion.triggerValue, lowerIsBetter);
        case 'Abaixo do valor':
            return evaluateBelowValue(sessionsDesc, field, criterion.triggerValue, lowerIsBetter);
        case 'Anomalia (IA)':
            return evaluateAnomalyIA(sessionsDesc, field, criterion.triggerValue, context, lowerIsBetter);
        default:
            return evaluatePercentDrop(sessionsDesc, field, criterion.triggerValue, lowerIsBetter);
    }
}

// Avalia um critério; retorna o alerta disparado ou null.
async function evaluateCriterion(criterion, { pacientId, device, periodEnd, PlataformOverviewModel, context }) {
    const field = METRIC_FIELD_MAP[criterion.metric];
    if (!field) return null; // métrica sem série temporal avaliável (ex: FR, CGc)

    // Histórico até o fim do período do relatório (não o histórico inteiro):
    // o início do período não limita, porque a sequência de deterioração e o
    // modelo de anomalia precisam das sessões anteriores como base.
    const filter = { pacientId, gameDevice: device };
    if (periodEnd) filter.playFinish = { $lte: periodEnd };

    const sessionsDesc = await PlataformOverviewModel
        .find(filter)
        .sort({ playFinish: -1 })
        .limit(historyLimitFor(criterion));

    const matched = await matchesCriterion(criterion, field, sessionsDesc, context);
    if (!matched) return null;
    return {
        metric: criterion.metric,
        condition: criterion.condition,
        triggerValue: criterion.triggerValue,
    };
}

async function evaluateAlerts(pacientId, device, mongoose, context, periodEnd) {
    require('./AlertCriteria');
    require('./PlataformOverview');
    const AlertCriteriaModel = mongoose.model('AlertCriteria');
    const PlataformOverviewModel = mongoose.model('PlataformOverview');

    let criteria = await AlertCriteriaModel.find({ pacientId, active: true });
    if (!criteria.length) criteria = DEFAULT_CRITERIA;

    // Critérios são independentes entre si (só leem o histórico do paciente);
    // Promise.all preserva a ordem, então os alertas saem na mesma ordem dos critérios.
    const results = await Promise.all(criteria.map((criterion) =>
        evaluateCriterion(criterion, { pacientId, device, periodEnd, PlataformOverviewModel, context })
    ));
    return results.filter(Boolean);
}

module.exports = {
    evaluateAlerts,
    METRIC_FIELD_MAP,
    DEFAULT_CRITERIA,
    LOWER_IS_BETTER,
    // Exportadas só pra teste unitário (evaluateAlerts é a única usada fora deste módulo).
    evaluateConsecutiveDrop,
    evaluatePercentDrop,
    evaluateBelowValue,
};
