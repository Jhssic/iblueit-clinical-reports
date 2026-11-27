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

export const fetchClinicalReportsHistory = async (patientId, { dataIni, dataFim, archived } = {}) => {
  const params = new URLSearchParams();
  if (dataIni) params.set("dataIni", dataIni);
  if (dataFim) params.set("dataFim", dataFim);
  if (archived) params.set("archived", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await axios.get(`${BaseUrl()}/pacients/${patientId}/clinicalreport${query}`, {
    headers: headers(),
  });
  return response.data.data || [];
};

// ─── RN05 — Arquivar relatório (nunca excluir, só arquivar) ──────────────────────────────

export const archiveClinicalReport = async (patientId, reportId) => {
  const response = await axios.patch(
    `${BaseUrl()}/pacients/${patientId}/clinicalreport/${reportId}/archive`,
    {},
    { headers: headers() }
  );
  return response.data;
};

// LGPD Art. 18 — exclusão definitiva (só permitida sobre um relatório já arquivado).
export const deleteClinicalReport = async (patientId, reportId) => {
  const response = await axios.delete(
    `${BaseUrl()}/pacients/${patientId}/clinicalreport/${reportId}`,
    { headers: headers() }
  );
  return response.data;
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

// Rótulo com ano (DD/MM/YYYY) — sem o ano, relatórios de anos diferentes ficam
// indistinguíveis no histórico/PDF.
const PERIOD_LABEL_FORMAT = "DD/MM/YYYY";
const formatPeriodLabel = (start, end) =>
  start.format(PERIOD_LABEL_FORMAT) + " – " + end.format(PERIOD_LABEL_FORMAT);

// Intervalo de um preset: exatamente N dias contando hoje (hoje + N-1 dias
// anteriores), do início do primeiro dia ao fim de hoje. Usado tanto na
// geração do relatório quanto no filtro de período dos gráficos, para que
// "Última semana" signifique a mesma coisa nos dois lugares.
export const getPresetRange = (presetKey, now = moment()) => {
  const preset = PERIOD_PRESETS.find((p) => p.key === presetKey) || PERIOD_PRESETS[0];
  return {
    start: moment(now).subtract(preset.days - 1, "days").startOf("day"),
    end: moment(now).endOf("day"),
  };
};

// Período personalizado só é válido com as duas datas e início <= fim.
export const isValidCustomPeriod = (customStart, customEnd) =>
  Boolean(customStart && customEnd) && !moment(customStart).isAfter(moment(customEnd), "day");

export const buildPeriodFromPreset = (presetKey, customStart, customEnd) => {
  if (presetKey === "personalizado") {
    const start = moment(customStart).startOf("day");
    const end = moment(customEnd).endOf("day");
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label: formatPeriodLabel(start, end),
    };
  }
  const { start, end } = getPresetRange(presetKey);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: formatPeriodLabel(start, end),
  };
};

// ─── RF07 — Dados para os gráficos longitudinais (DJ, CGc, FR) ──────────────────────────
// DJ vem de plataformoverviews.scoreRatio, CGc de gameparameters.ObjectSpeedFactor —
// ambos marcados como "CONFIRMAR" em shared/clinicalMetrics.js no backend, mesma ressalva
// vale aqui. FR não tem série temporal por sessão no modelo atual (é um valor de
// calibração fixo do paciente) — é exibido como referência, não como linha por sessão.

// O endpoint de estatísticas lê o filtro de dispositivo do parâmetro `devices`
// (nome exato do dispositivo); `gameDevice` era ignorado e sempre vinha Pitaco.
export const fetchPlataformSeries = async (patientId, device) => {
  const response = await axios.get(
    `${BaseUrl()}/pacients/${patientId}/plataforms/statistics?sort=asc&devices=${encodeURIComponent(device)}`,
    { headers: headers() }
  );
  return (response.data.data || []).map((s) => ({
    date: moment(s.playFinish).format("DD/MM"),
    timestamp: new Date(s.playFinish).getTime(),
    DJ: s.scoreRatio != null ? Number.parseFloat(s.scoreRatio) : null, // ver ressalva acima — mesmo campo usado em shared/clinicalMetrics.js
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
