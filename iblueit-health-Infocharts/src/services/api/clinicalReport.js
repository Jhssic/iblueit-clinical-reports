import axios from "axios";
import moment from "moment";

import { BaseUrl } from "../../providers/_config";
import { getTokenParameters } from "../../providers/sessionStorage";

const headers = () => ({ gametoken: getTokenParameters("gameToken") });

// ─── RF02 / RF05 — Geração de relatório clínico (Azure Function GenerateClinicalReport) ──

export const generateClinicalReport = async (patientId, { device, period }) => {
  const response = await axios.post(
    `${BaseUrl()}/pacients/${patientId}/clinicalreport/generate`,
    { device, period },
    { headers: headers() }
  );
  return response.data; // { success, message, data }
};

// ─── RF11 — Histórico de relatórios (Azure Function GetClinicalReports) ──────────────────

export const fetchClinicalReportsHistory = async (patientId, { dataIni, dataFim } = {}) => {
  const params = new URLSearchParams();
  if (dataIni) params.set("dataIni", dataIni);
  if (dataFim) params.set("dataFim", dataFim);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await axios.get(`${BaseUrl()}/pacients/${patientId}/clinicalreport${query}`, {
    headers: headers(),
  });
  return response.data.data || [];
};

// ─── Perfil do paciente (usado como referência de FR na aba Gráficos) ───────────────────

export const fetchPacientProfile = async (patientId) => {
  const response = await axios.get(`${BaseUrl()}/pacients/${patientId}`, { headers: headers() });
  return response.data.data;
};

// ─── Períodos de referência pré-definidos (Tela 5 — Gerar relatório) ─────────────────────

export const PERIOD_PRESETS = [
  { key: "semana", label: "Última semana", days: 7 },
  { key: "2semanas", label: "Últimas 2 semanas", days: 14 },
  { key: "mes", label: "Último mês", days: 30 },
];

export const buildPeriodFromPreset = (presetKey, customStart, customEnd) => {
  if (presetKey === "personalizado") {
    return {
      start: moment(customStart).startOf("day").toISOString(),
      end: moment(customEnd).endOf("day").toISOString(),
      label: moment(customStart).format("DD/MM") + " – " + moment(customEnd).format("DD/MM"),
    };
  }
  const preset = PERIOD_PRESETS.find((p) => p.key === presetKey);
  const end = moment().endOf("day");
  const start = moment().subtract(preset.days, "days").startOf("day");
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: start.format("DD/MM") + " – " + end.format("DD/MM"),
  };
};

// ─── RF07 — Dados para os gráficos longitudinais (DJ, CGc, FR) ──────────────────────────
// DJ vem de plataformoverviews.scoreRatio, CGc de gameparameters.ObjectSpeedFactor —
// ambos marcados como "CONFIRMAR" em shared/clinicalMetrics.js no backend, mesma ressalva
// vale aqui. FR não tem série temporal por sessão no modelo atual (é um valor de
// calibração fixo do paciente) — é exibido como referência, não como linha por sessão.

export const fetchPlataformSeries = async (patientId, device) => {
  const response = await axios.get(
    `${BaseUrl()}/pacients/${patientId}/plataforms/statistics?sort=asc&gameDevice=${device}`,
    { headers: headers() }
  );
  return (response.data.data || []).map((s) => ({
    date: moment(s.playFinish).format("DD/MM"),
    timestamp: new Date(s.playFinish).getTime(),
    DJ: s.scoreRatio != null ? parseFloat(s.scoreRatio) : null, // ver ressalva acima — mesmo campo usado em shared/clinicalMetrics.js
  }));
};

export const fetchGameParameterSeries = async (patientId) => {
  const response = await axios.get(`${BaseUrl()}/gameparameter?pacientId=${patientId}`, {
    headers: headers(),
  });
  return (response.data.data || [])
    .map((g) => ({
      date: moment(g.created_at).format("DD/MM"),
      timestamp: new Date(g.created_at).getTime(),
      CGc: g.ObjectSpeedFactor,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
};

// ─── RF10 — Configuração de critérios de alerta por paciente ─────────────────────────────

export const fetchAlertCriteria = async (patientId) => {
  const response = await axios.get(`${BaseUrl()}/pacients/${patientId}/alertcriteria`, {
    headers: headers(),
  });
  return response.data.data || [];
};

export const saveAlertCriteria = async (patientId, criteria) => {
  const response = await axios.post(
    `${BaseUrl()}/pacients/${patientId}/alertcriteria`,
    { criteria: criteria.map((c) => ({ metric: c.metric, condition: c.condition, triggerValue: c.triggerValue })) },
    { headers: headers() }
  );
  return response.data;
};
