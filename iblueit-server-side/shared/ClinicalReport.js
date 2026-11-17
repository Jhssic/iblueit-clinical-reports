const mongoose = require('mongoose');

const ClinicalReportSchema = mongoose.Schema({
    pacientId: { type: String },
    device: { type: String },
    period: {
        start: { type: Date },
        end: { type: Date },
        label: { type: String },
    },
    sessionCount: { type: Number },
    isFirstReport: { type: Boolean },
    currentMetrics: { type: mongoose.Schema.Types.Mixed },
    previousMetrics: { type: mongoose.Schema.Types.Mixed },
    // Métricas da primeira avaliação do paciente (mesmo dispositivo) — base fixa
    // de comparação da seção "Evolução", pedido no piloto com o professor: em
    // vez de comparar com o período imediatamente anterior, compara com a
    // avaliação inicial.
    initialMetrics: { type: mongoose.Schema.Types.Mixed },
    resumoSessao: { type: String },
    evolucao: { type: String },
    avisoRevisao: { type: String },
    dadosBrutos: [{
        metrica: { type: String },
        sigla: { type: String },
        valor: { type: mongoose.Schema.Types.Mixed },
        unidade: { type: String },
        sourceCollection: { type: String },
    }],
    generatedBy: { type: String },
    coerenciaVerificada: { type: Boolean, default: true },
    avisosCoerencia: [{
        metrica: { type: String },
        esperado: { type: String },
        trechoSuspeito: { type: String },
    }],
    missingOptionalFields: [{ type: String }],
    alerts: [{
        metric: { type: String },
        condition: { type: String },
        triggerValue: { type: Number },
    }],
    archived: { type: Boolean, default: false },
    generatedByUserId: { type: String },
},
    { timestamps: { createdAt: 'created_at' } }
);

module.exports = mongoose.model('ClinicalReport', ClinicalReportSchema);
