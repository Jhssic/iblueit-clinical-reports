/*
 * RF09 — status clínico do paciente a partir de um relatório clínico.
 *
 * É regra de negócio, por isso fica no back-end: o status é calculado na
 * geração do relatório (e salvo nele) e devolvido pelas rotas de leitura.
 * O front só traduz o código do status em rótulo e cor.
 *
 * - critico: algum critério de alerta configurado foi atingido (RF09/RN04).
 * - atencao: nenhum alerta disparou, mas o DJ caiu ATTENTION_DJ_DROP_PCT % ou
 *   mais em relação ao período anterior — aviso antecipado antes de virar alerta.
 * - estavel: sem alerta e sem queda relevante (ou primeiro relatório, sem
 *   período anterior para comparar).
 */

const PATIENT_STATUS = Object.freeze({
    CRITICO: 'critico',
    ATENCAO: 'atencao',
    ESTAVEL: 'estavel',
});

const ATTENTION_DJ_DROP_PCT = 10;

function computePatientStatus(report) {
    if (!report) return null;
    if (report.alerts && report.alerts.length > 0) return PATIENT_STATUS.CRITICO;

    const dj = report.currentMetrics?.DJ;
    const prevDj = report.previousMetrics?.DJ;
    if (dj != null && prevDj != null && prevDj !== 0) {
        // Arredonda pra 2 casas: em ponto flutuante, 0,50 -> 0,45 dá -9,999...%
        // e uma queda de exatamente 10% deixaria de contar.
        const pctChange = Math.round(((dj - prevDj) / prevDj) * 10000) / 100;
        if (pctChange <= -ATTENTION_DJ_DROP_PCT) return PATIENT_STATUS.ATENCAO;
    }
    return PATIENT_STATUS.ESTAVEL;
}

// Relatórios gerados antes do campo `status` existir não o têm salvo: nesses,
// o status é calculado na leitura com a mesma regra.
function withPatientStatus(report) {
    if (!report) return report;
    const plain = typeof report.toObject === 'function' ? report.toObject() : { ...report };
    plain.status = plain.status || computePatientStatus(plain);
    return plain;
}

module.exports = {
    PATIENT_STATUS,
    ATTENTION_DJ_DROP_PCT,
    computePatientStatus,
    withPatientStatus,
};
