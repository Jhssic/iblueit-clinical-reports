/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import LinearProgress from "@mui/material/LinearProgress";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HistoryIcon from "@mui/icons-material/History";
import BarChartIcon from "@mui/icons-material/BarChart";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import PersonIcon from "@mui/icons-material/Person";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useMyContext } from "../../providers/MyContext";
import { getTokenParameters } from "../../providers/sessionStorage";
import {
  generateClinicalReport,
  fetchClinicalReportsHistory,
  fetchPlataformSeries,
  fetchGameParameterSeries,
  fetchPacientProfile,
  buildPeriodFromPreset,
  getPresetRange,
  isValidCustomPeriod,
  PERIOD_PRESETS,
  fetchAlertCriteria,
  saveAlertCriteria,
  archiveClinicalReport,
  deleteClinicalReport,
} from "../../services/api/clinicalReport";
import { fetchAll as fetchAllPatients } from "../../services/api/patient";
import { translateSex, translateCondition, translateRole } from "../../utils/patientLabels";

// ─── Estilos reutilizáveis ────────────────────────────────────────────────────

const BTN = {
  backgroundColor: "#1e2b48",
  color: "#fff",
  textTransform: "none",
  "&:hover": { backgroundColor: "#1e2b48", opacity: 0.7 },
};

const BLOCK = {
  backgroundColor: "white",
  borderRadius: 2,
  p: 3,
  mb: 2.5,
  boxShadow: 2,
};

const DEVICE_OPTIONS = ["Pitaco", "Manovacuômetro", "Cinta"];

// Pacient.capacities<Sufixo> usa nomes curtos que não são iguais ao valor de
// "device" enviado pela API (ver Validators.js) — Manovacuômetro -> Mano.
const DEVICE_CAPACITIES_SUFFIX = {
  Pitaco: "Pitaco",
  Manovacuômetro: "Mano",
  Cinta: "Cinta",
};

// Só métricas com série temporal real por sessão (plataformoverviews) são avaliáveis
// como tendência hoje — CGc/FR/PEmax/PImax ficam fora até terem essa granularidade.
const ALERT_METRIC_OPTIONS = [
  { code: "DJ", label: "DJ — Desempenho do Jogador" },
  { code: "PJ", label: "PJ — Pontos da Jogada" },
  { code: "EB", label: "EB — Escala de Borg" },
];
const METRIC_LABELS = ALERT_METRIC_OPTIONS.reduce((acc, m) => ({ ...acc, [m.code]: m.label }), {});
const CONDITION_OPTIONS = ["Deterioração consecutiva", "Queda percentual >", "Abaixo do valor", "Anomalia (IA)"];

// As 7 variáveis principais do relatório (cards + seção Evolução) — pedido no
// piloto com o professor: antes só DJ/PJ/CGc apareciam nos cards.
const MAIN_METRIC_CARDS = [
  { key: "DJ", label: "Desempenho (DJ)" },
  { key: "PJ", label: "Pontos da Jogada (PJ)" },
  { key: "CGc", label: "Carga Corrente (CGc)" },
  { key: "FR", label: "Frequência Respiratória (FR)" },
  { key: "PEmax", label: "Pressão Expiratória Máxima (PEmax)" },
  { key: "PImax", label: "Pressão Inspiratória Máxima (PImax)" },
  { key: "EB", label: "Escala de Borg (EB)" },
];

// EB (Escala de Borg) é sempre um inteiro de 0-10 — exibir com casas decimais
// não faz sentido clínico (pedido no piloto com o professor).
const formatMetricValue = (key, value) => {
  if (value == null) return "—";
  return key === "EB" ? String(Math.round(Number(value))) : Number(value).toFixed(2);
};

// FA02 — métricas que o ecossistema I Blue It simplesmente não tem como medir
// hoje (ex: SpO2min precisa de um oxímetro, que não existe integrado). Uma
// métrica nessa lista nunca vai aparecer, não importa o período escolhido —
// diferente de algo como CGc, que só falta porque não houve sessão daquele
// tipo no período selecionado (e pode aparecer trocando o período).
const METRICS_SEM_FONTE_NO_ECOSSISTEMA = new Set(["SpO2min"]);

const describeMissingFields = (missingFields) => {
  if (!missingFields?.length) return [];
  const semFonte = missingFields.filter((f) => METRICS_SEM_FONTE_NO_ECOSSISTEMA.has(f));
  const semDadoNoPeriodo = missingFields.filter((f) => !METRICS_SEM_FONTE_NO_ECOSSISTEMA.has(f));
  const linhas = [];
  if (semDadoNoPeriodo.length) {
    linhas.push(`Sem dado no período selecionado: ${semDadoNoPeriodo.join(", ")} — tente um período diferente.`);
  }
  if (semFonte.length) {
    linhas.push(`Sem fonte de dado no sistema atual: ${semFonte.join(", ")} — nenhum período mostrará esse valor.`);
  }
  return linhas;
};

// EB (Escala de Borg): valor maior = mais esforço = piora. O back-end avalia
// as condições de EB pelo lado clinicamente ruim (aumento em vez de queda,
// acima em vez de abaixo — ver shared/alertEvaluation.js), então o texto
// precisa acompanhar.
const LOWER_IS_BETTER_METRICS = new Set(["EB"]);

const describeAlert = (a) => {
  const label = METRIC_LABELS[a.metric] || a.metric;
  const inverted = LOWER_IS_BETTER_METRICS.has(a.metric);
  if (a.condition === "Queda percentual >") {
    return inverted
      ? `${label}: aumento percentual maior que ${a.triggerValue}% entre as duas últimas sessões.`
      : `${label}: queda percentual maior que ${a.triggerValue}% entre as duas últimas sessões.`;
  }
  if (a.condition === "Abaixo do valor") {
    return inverted
      ? `${label}: acima de ${a.triggerValue} na última sessão.`
      : `${label}: abaixo de ${a.triggerValue} na última sessão.`;
  }
  if (a.condition === "Anomalia (IA)") {
    return `${label}: sessão identificada como anômala pelo modelo de IA (sensibilidade ${a.triggerValue}%).`;
  }
  return inverted
    ? `${label}: piora consecutiva (aumento) em ${a.triggerValue} sessões.`
    : `${label}: deterioração consecutiva em ${a.triggerValue} sessões.`;
};

// ─── Indicador rápido de status do paciente (Estável/Atenção/Crítico) ────────
// Crítico: algum critério de alerta configurado foi atingido (RF09/RN04).
// Atenção: sem alerta formal disparado, mas o DJ já caiu mais de 10% em
// relação ao período anterior — um aviso antecipado antes de virar alerta.
// Estável: sem alerta e sem queda relevante (ou é a primeira sessão, sem
// período anterior pra comparar).
const PATIENT_STATUS = {
  critico: { label: "Crítico", color: "#c62828", bg: "#fdecea", border: "#c62828" },
  atencao: { label: "Atenção", color: "#e65100", bg: "#fff3e0", border: "#e65100" },
  estavel: { label: "Estável", color: "#2e7d32", bg: "#e8f5e9", border: "#2e7d32" },
};

const getPatientStatus = (report) => {
  if (!report) return null;
  if (report.alerts && report.alerts.length > 0) return PATIENT_STATUS.critico;

  const dj = report.currentMetrics?.DJ;
  const prevDj = report.previousMetrics?.DJ;
  if (dj != null && prevDj != null && prevDj !== 0) {
    const pctChange = ((dj - prevDj) / prevDj) * 100;
    if (pctChange <= -10) return PATIENT_STATUS.atencao;
  }
  return PATIENT_STATUS.estavel;
};

// ─── RF08 — montagem do PDF nativo do relatório clínico ──────────────────────
// Layout próprio (texto real, não captura de tela): título, dados do paciente,
// alertas, resumo/análise, dados brutos em tabela — com paginação automática.

// A fonte padrão do jsPDF (Helvetica/WinAnsi) só cobre ASCII + Latin-1 (acentos
// do português entram aí) mais um punhado de símbolos tipográficos comuns.
// O LLM às vezes usa espaços especiais, caracteres invisíveis (zero-width),
// subscrito/sobrescrito etc. — qualquer um desses fora do suportado faz a
// largura do glyph ser mal calculada e estica/corrompe a linha inteira no PDF.
const PDF_CHAR_REPLACEMENTS = {
  "‘": "'", "’": "'", "“": '"', "”": '"',
  "–": "-", "—": "-", "…": "...", "•": "-",
  " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
  " ": " ", " ": " ", " ": " ", " ": " ", " ": " ",
  " ": " ", " ": " ", " ": " ", " ": " ", "　": " ",
  "​": "", "‌": "", "‍": "", "﻿": "",
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
};
const sanitizeForPdf = (text) => {
  if (!text) return text;
  let out = "";
  for (const ch of text) {
    if (PDF_CHAR_REPLACEMENTS[ch] !== undefined) {
      out += PDF_CHAR_REPLACEMENTS[ch];
    } else if (ch.codePointAt(0) <= 0xff) {
      out += ch; // ASCII + Latin-1 — coberto pela fonte padrão do jsPDF
    } else {
      out += " "; // qualquer outro caractere não suportado vira espaço
    }
  }
  return out.replace(/ {2,}/g, " ");
};

const PDF_MARGIN = 40;
const PDF_COLORS = {
  navy: [30, 43, 72],
  gray: [117, 117, 117],
  orange: [230, 81, 0],
  orangeBg: [255, 243, 224],
  red: [198, 40, 40],
  redBg: [253, 236, 234],
};

const pdfEnsureSpace = (doc, y, needed, pageHeight) => {
  if (y + needed > pageHeight - PDF_MARGIN) {
    doc.addPage();
    return PDF_MARGIN;
  }
  return y;
};

const pdfAddParagraph = (doc, text, y, pageWidth, pageHeight, { fontSize = 11, lineHeight = 15, color = [60, 60, 60] } = {}) => {
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const maxWidth = pageWidth - PDF_MARGIN * 2;
  const lines = doc.splitTextToSize(sanitizeForPdf(text) || "—", maxWidth);
  let cursor = y;
  lines.forEach((line) => {
    cursor = pdfEnsureSpace(doc, cursor, lineHeight, pageHeight);
    doc.text(line, PDF_MARGIN, cursor);
    cursor += lineHeight;
  });
  return cursor;
};

const pdfAddSectionTitle = (doc, text, y, pageHeight) => {
  let cursor = pdfEnsureSpace(doc, y, 22, pageHeight);
  doc.setFont(undefined, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(text, PDF_MARGIN, cursor);
  doc.setFont(undefined, "normal");
  return cursor + 18;
};

const pdfAddNoteBox = (doc, { title, lines, bg, border, text }, y, pageWidth, pageHeight) => {
  const maxWidth = pageWidth - PDF_MARGIN * 2 - 20;
  doc.setFontSize(10);
  const wrappedLines = lines.flatMap((l) => doc.splitTextToSize(sanitizeForPdf(l), maxWidth));
  const boxHeight = 24 + wrappedLines.length * 13;
  let cursor = pdfEnsureSpace(doc, y, boxHeight + 10, pageHeight);

  doc.setFillColor(...bg);
  doc.setDrawColor(...border);
  doc.rect(PDF_MARGIN, cursor, pageWidth - PDF_MARGIN * 2, boxHeight, "FD");

  doc.setFont(undefined, "bold");
  doc.setTextColor(...border);
  doc.text(title, PDF_MARGIN + 10, cursor + 16);
  doc.setFont(undefined, "normal");
  doc.setTextColor(...text);
  let lineY = cursor + 32;
  wrappedLines.forEach((l) => {
    doc.text(l, PDF_MARGIN + 10, lineY);
    lineY += 13;
  });

  return cursor + boxHeight + 16;
};

const describeGeneratedBy = (report) =>
  report.generatedBy === "llm" ? "texto via LLM" : "texto via template";

const PDF_STATUS_COLORS = {
  "Crítico": [198, 40, 40],
  "Atenção": [230, 81, 0],
  "Estável": [46, 125, 50],
};

// Status rápido do paciente (Estável/Atenção/Crítico), alinhado à direita
const pdfAddStatusBadge = (doc, report, y, pageWidth) => {
  const patientStatus = getPatientStatus(report);
  if (!patientStatus) return;
  const statusRgb = PDF_STATUS_COLORS[patientStatus.label] || [117, 117, 117];
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  const statusTextWidth = doc.getTextWidth(patientStatus.label) + 16;
  const statusX = pageWidth - PDF_MARGIN - statusTextWidth;
  doc.setFillColor(...statusRgb);
  doc.roundedRect(statusX, y - 14, statusTextWidth, 20, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(patientStatus.label, statusX + 8, y);
  doc.setFont(undefined, "normal");
};

// Cabeçalho: título, status, período/sessões/dispositivo e data de geração
const pdfAddHeader = (doc, report, pageWidth) => {
  let y = PDF_MARGIN;
  doc.setFont(undefined, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text("Relatório Clínico — I Blue It", PDF_MARGIN, y);

  pdfAddStatusBadge(doc, report, y, pageWidth);

  y += 22;

  doc.setFont(undefined, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.gray);
  doc.text(`${report.period.label} · ${report.sessionCount} sessão(ões) · ${report.device}`, PDF_MARGIN, y);
  y += 16;
  doc.setFontSize(9);
  doc.text(
    `Gerado em ${new Date(report.created_at).toLocaleString("pt-BR")} · ${describeGeneratedBy(report)}`,
    PDF_MARGIN,
    y
  );
  return y + 4;
};

const calculateAge = (birthday) => {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatOptionalMeasure = (value, unit) => (value ? `${value} ${unit}` : "—");

const pdfAddLabel = (doc, label, y) => {
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.setFont(undefined, "bold");
  doc.text(label, PDF_MARGIN, y);
  doc.setFont(undefined, "normal");
  doc.setTextColor(60, 60, 60);
};

// Dados do paciente e do profissional responsável
const pdfAddPeopleInfo = (doc, { patientName, pacientProfile, professionalName, professionalRole }, y, pageWidth) => {
  let cursor = y;
  const age = calculateAge(pacientProfile?.birthday);

  doc.setDrawColor(224, 224, 224);
  doc.line(PDF_MARGIN, cursor, pageWidth - PDF_MARGIN, cursor);
  cursor += 16;

  pdfAddLabel(doc, "Paciente:", cursor);
  const patientLine = [
    patientName || "—",
    age == null ? null : `${age} anos`,
    translateSex(pacientProfile?.sex),
    translateCondition(pacientProfile?.condition),
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(patientLine, PDF_MARGIN + 85, cursor);
  cursor += 14;

  if (pacientProfile?.weight || pacientProfile?.height) {
    doc.setTextColor(...PDF_COLORS.gray);
    doc.setFontSize(9);
    doc.text(
      `Peso/Altura: ${formatOptionalMeasure(pacientProfile.weight, "kg")} / ${formatOptionalMeasure(pacientProfile.height, "cm")}`,
      PDF_MARGIN + 85,
      cursor
    );
    cursor += 14;
  }

  pdfAddLabel(doc, "Profissional:", cursor);
  doc.text([professionalName, professionalRole].filter(Boolean).join(" · ") || "—", PDF_MARGIN + 85, cursor);
  return cursor + 20;
};

// Alerta ativo e possível inconsistência (verificação de coerência)
const pdfAddWarnings = (doc, report, y, pageWidth, pageHeight) => {
  let cursor = y;
  if (report.alerts.length > 0) {
    cursor = pdfAddNoteBox(
      doc,
      {
        title: "Alerta ativo",
        lines: report.alerts.map(describeAlert),
        bg: PDF_COLORS.orangeBg,
        border: PDF_COLORS.orange,
        text: [191, 54, 12],
      },
      cursor,
      pageWidth,
      pageHeight
    );
  }

  if (report.coerenciaVerificada === false) {
    cursor = pdfAddNoteBox(
      doc,
      {
        title: "Possível inconsistência no texto gerado",
        lines: [
          "O texto menciona uma tendência que não bate com o valor real da métrica. Revise com atenção.",
          ...(report.avisosCoerencia || []).map(
            (a) => `${a.metrica} — esperado: ${a.esperado} · trecho: "${a.trechoSuspeito}"`
          ),
        ],
        bg: PDF_COLORS.redBg,
        border: PDF_COLORS.red,
        text: [142, 28, 28],
      },
      cursor,
      pageWidth,
      pageHeight
    );
  }
  return cursor;
};

// Métricas principais — as 7 variáveis dos cards (feedback do piloto com o professor)
const pdfAddMainMetrics = (doc, report, y, pageHeight) => {
  const cursor = pdfEnsureSpace(doc, y, 20, pageHeight);
  doc.setFont(undefined, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.navy);
  const metricasLinha = MAIN_METRIC_CARDS.map(
    (card) => `${card.key}: ${formatMetricValue(card.key, report.currentMetrics[card.key])}`
  ).join("    ");
  doc.text(metricasLinha, PDF_MARGIN, cursor);
  doc.setFont(undefined, "normal");
  return cursor + 24;
};

const pdfAddTextSection = (doc, title, text, y, pageWidth, pageHeight) => {
  const cursor = pdfAddSectionTitle(doc, title, y, pageHeight);
  return pdfAddParagraph(doc, text, cursor, pageWidth, pageHeight) + 10;
};

// Evolução (avaliação inicial x estado atual)
const pdfAddEvolution = (doc, report, y, pageWidth, pageHeight) => {
  if (!report.evolucao) return y;
  const cursor = pdfAddTextSection(doc, "Evolução", report.evolucao, y, pageWidth, pageHeight);
  if (!report.initialMetrics) return cursor;

  autoTable(doc, {
    startY: cursor,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    head: [["Variável", "Avaliação inicial", "Estado atual"]],
    body: MAIN_METRIC_CARDS.filter(
      (card) => report.initialMetrics[card.key] != null || report.currentMetrics[card.key] != null
    ).map((card) => [
      card.label,
      formatMetricValue(card.key, report.initialMetrics[card.key]),
      formatMetricValue(card.key, report.currentMetrics[card.key]),
    ]),
    headStyles: { fillColor: PDF_COLORS.navy },
    styles: { fontSize: 9 },
  });
  return doc.lastAutoTable.finalY + 16;
};

const PDF_FOOTNOTE_STYLE = { fontSize: 9, lineHeight: 12, color: PDF_COLORS.gray };

// FA02 — campos opcionais não consultados
const pdfAddMissingFields = (doc, report, y, pageWidth, pageHeight) => {
  if (!report.missingOptionalFields?.length) return y;
  let cursor = y;
  for (const linha of describeMissingFields(report.missingOptionalFields)) {
    cursor = pdfAddParagraph(doc, linha, cursor, pageWidth, pageHeight, PDF_FOOTNOTE_STYLE);
  }
  return cursor + 10;
};

const formatRawValue = (valor) => (typeof valor === "number" ? valor.toFixed(2) : valor);

// Dados brutos consolidados
const pdfAddRawData = (doc, report, y, pageHeight) => {
  const cursor = pdfAddSectionTitle(doc, "Dados brutos consolidados", y, pageHeight);
  autoTable(doc, {
    startY: cursor,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    head: [["Métrica", "Sigla", "Valor", "Unidade", "Collection"]],
    body: report.dadosBrutos.map((row) => [
      row.metrica,
      row.sigla,
      formatRawValue(row.valor),
      row.unidade,
      row.sourceCollection,
    ]),
    headStyles: { fillColor: PDF_COLORS.navy },
    styles: { fontSize: 9 },
  });
};

const buildClinicalReportPdf = (report, peopleInfo) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = pdfAddHeader(doc, report, pageWidth);
  y = pdfAddPeopleInfo(doc, peopleInfo, y, pageWidth);
  y = pdfAddWarnings(doc, report, y, pageWidth, pageHeight);
  y = pdfAddMainMetrics(doc, report, y, pageHeight);
  y = pdfAddTextSection(doc, "Objetivos do Tratamento", "• Treinamento Muscular Inspiratório (TMI)", y, pageWidth, pageHeight);
  y = pdfAddTextSection(doc, "Resumo da sessão", report.resumoSessao, y, pageWidth, pageHeight);
  y = pdfAddEvolution(doc, report, y, pageWidth, pageHeight);
  y = pdfAddMissingFields(doc, report, y, pageWidth, pageHeight);

  // Aviso de revisão
  y = pdfAddParagraph(doc, report.avisoRevisao, y, pageWidth, pageHeight, PDF_FOOTNOTE_STYLE);
  y += 16;

  pdfAddRawData(doc, report, y, pageHeight);
  return doc;
};

const alertsTabLabel = (report) => {
  const count = report?.alerts.length;
  return count ? `Alertas (${count})` : "Alertas";
};

const formatRespiratoryRate = (profile, device) => {
  const capacities = profile?.["capacities" + DEVICE_CAPACITIES_SUFFIX[device]];
  return capacities ? capacities.respiratoryRate + " rpm" : "—";
};

// Critérios de alerta não têm id próprio enquanto são editados na tela; um
// identificador local (`uid`) mantém a key estável ao editar/remover itens e
// é descartado antes de enviar à API.
const DEFAULT_CRITERION = { metric: "DJ", condition: "Deterioração consecutiva", triggerValue: 5 };

// Valor inicial do gatilho ao escolher uma condição — trocar a condição não
// pode herdar o número da anterior (ex.: "Queda percentual > 30" virar
// "Deterioração consecutiva" com 30 sessões, fora das opções do Select).
const DEFAULT_TRIGGER_BY_CONDITION = {
  "Deterioração consecutiva": DEFAULT_CRITERION.triggerValue,
  "Queda percentual >": 20,
  "Abaixo do valor": 0,
  "Anomalia (IA)": 10,
};

// Mesmas regras validadas pelo backend (SaveAlertCriteria) — retorna a
// mensagem de erro ou null quando o critério é válido.
const validateCriterion = ({ condition, triggerValue }, idx) => {
  const value = Number(triggerValue);
  const prefix = `Critério ${idx + 1}: `;
  if (triggerValue === "" || triggerValue == null || Number.isNaN(value)) {
    return prefix + "informe um valor numérico para o gatilho.";
  }
  if (condition === "Deterioração consecutiva" && (!Number.isInteger(value) || value < 2)) {
    return prefix + "deterioração consecutiva exige um número inteiro de sessões (mínimo 2).";
  }
  if ((condition === "Queda percentual >" || condition === "Anomalia (IA)") && (value < 1 || value > 100)) {
    return prefix + "o percentual deve estar entre 1 e 100.";
  }
  return null;
};
let criterionSequence = 0;
const createCriterion = ({ metric, condition, triggerValue }) => {
  criterionSequence += 1;
  return { uid: `criterio-${criterionSequence}`, metric, condition, triggerValue };
};
const toCriterionPayload = ({ metric, condition, triggerValue }) => ({ metric, condition, triggerValue });

const CriterionTriggerField = ({ criterion, onChange }) => {
  if (criterion.condition === "Deterioração consecutiva") {
    const labelId = `${criterion.uid}-gatilho-label`;
    return (
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id={labelId}>Disparar após</InputLabel>
        <Select labelId={labelId} id={`${criterion.uid}-gatilho`} sx={{ color: "#11192A" }} value={criterion.triggerValue} label="Disparar após" onChange={(e) => onChange(e.target.value)}>
          {[2, 3, 4, 5, 6].map((n) => (<MenuItem key={n} value={n}>{n} sessões</MenuItem>))}
        </Select>
      </FormControl>
    );
  }
  if (criterion.condition === "Abaixo do valor") {
    return (
      <TextField
        size="small"
        type="number"
        label="Valor limite"
        sx={{ minWidth: 160, "& input": { color: "#11192A" } }}
        value={criterion.triggerValue}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  if (criterion.condition === "Anomalia (IA)") {
    return (
      <TextField
        size="small"
        type="number"
        label="Sensibilidade (%)"
        helperText="% esperado de sessões anômalas no histórico"
        sx={{ minWidth: 220, "& input": { color: "#11192A" } }}
        value={criterion.triggerValue}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  return (
    <TextField
      size="small"
      type="number"
      label="Queda mínima (%)"
      sx={{ minWidth: 160, "& input": { color: "#11192A" } }}
      value={criterion.triggerValue}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const PATIENTS_TAB = 5;
const LOAD_ERROR_MESSAGE = "Não foi possível carregar os dados do paciente. Verifique a conexão e tente novamente.";
const PATIENTS_ERROR_MESSAGE = "Não foi possível carregar a lista de pacientes.";

const firstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

// Sessão (timestamp) que recebe o ponto vermelho no gráfico de DJ para cada
// relatório com alerta. O alerta salvo (`report.alerts`) não diz quais sessões
// o dispararam — o backend avalia as sessões mais recentes até o fim do
// período do relatório. Por isso marcamos só a ÚLTIMA sessão do período (a
// sessão em que o alerta passou a valer), e só no dispositivo do relatório,
// comparando por timestamp completo (com ano) em vez de "DD/MM".
const findAlertSessionTimestamps = (reportsWithAlerts, series, device) => {
  const marked = new Set();
  reportsWithAlerts.forEach((r) => {
    if (!r?.alerts?.length || !r.period?.start || !r.period?.end) return;
    if (r.device && r.device !== device) return;
    const startTime = new Date(r.period.start).getTime();
    const endTime = new Date(r.period.end).getTime();
    const inPeriod = series.filter((s) => s.timestamp >= startTime && s.timestamp <= endTime);
    if (inPeriod.length) {
      marked.add(Math.max(...inPeriod.map((s) => s.timestamp)));
    }
  });
  return marked;
};

const ClinicalReport = () => {
  const context = useMyContext();

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // `currentReport` é o relatório mais recente do paciente (sem filtro de
  // data) ou o que o usuário abriu pelo Histórico. `reports` é só a lista
  // filtrada da aba Histórico — o filtro não pode esconder o relatório atual.
  const [currentReport, setCurrentReport] = useState(null);
  const [reports, setReports] = useState([]);

  const [historyFilter, setHistoryFilter] = useState({ dataIni: firstDayOfMonth(), dataFim: "" });
  const [showArchived, setShowArchived] = useState(false);

  const [device, setDevice] = useState("Pitaco");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [djSeries, setDjSeries] = useState([]);
  const [cgcSeries, setCgcSeries] = useState([]);
  const [pacientProfile, setPacientProfile] = useState(null);
  const [graphPeriod, setGraphPeriod] = useState("todas");

  // Aba "Gerar relatório"
  const [periodPreset, setPeriodPreset] = useState("semana");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  // Aba "Alertas" (RF10)
  const [criteria, setCriteria] = useState(() => [createCriterion(DEFAULT_CRITERION)]);
  const [savingCriteria, setSavingCriteria] = useState(false);

  // Aba "Pacientes" (RF09 — indicador de alerta por paciente)
  const [patients, setPatients] = useState([]);
  const [patientsError, setPatientsError] = useState(null);

  // Lista separada da ativa (`reports`/`currentReport`) — arquivados nunca
  // devem aparecer como "relatório atual" nem entrar no PDF/alertas da tela.
  const [archivedReports, setArchivedReports] = useState([]);

  // Trocar de paciente rápido dispara várias cargas em paralelo; uma resposta
  // do paciente anterior que chegue depois não pode sobrescrever o atual (nem
  // misturar nome de um com dados de outro no PDF). Toda carga guarda o id
  // pedido e descarta o resultado se o paciente selecionado já mudou.
  const patientIdRef = useRef(context.patientId);
  patientIdRef.current = context.patientId;
  const isStale = (requestedId) => patientIdRef.current !== requestedId;
  const loadSeq = useRef(0);
  const chartsSeq = useRef(0);

  // ── Carrega dados do backend ───────────────────────────────────────────────

  const loadCurrentReport = async () => {
    const pid = context.patientId;
    if (!pid) return;
    const data = await fetchClinicalReportsHistory(pid, {});
    if (isStale(pid)) return;
    setCurrentReport(data[0] ?? null);
  };

  const loadHistory = async () => {
    const pid = context.patientId;
    if (!pid) return;
    const data = await fetchClinicalReportsHistory(pid, historyFilter);
    if (isStale(pid)) return;
    setReports(data);
  };

  const loadArchivedReports = async () => {
    const pid = context.patientId;
    if (!pid) return;
    const data = await fetchClinicalReportsHistory(pid, { archived: true });
    if (isStale(pid)) return;
    setArchivedReports(data);
  };

  const loadCharts = async () => {
    const pid = context.patientId;
    if (!pid) return;
    // Também protege contra trocas rápidas de dispositivo.
    chartsSeq.current += 1;
    const seq = chartsSeq.current;
    const [dj, cgc, profile] = await Promise.all([
      fetchPlataformSeries(pid, device),
      fetchGameParameterSeries(pid),
      fetchPacientProfile(pid),
    ]);
    if (isStale(pid) || seq !== chartsSeq.current) return;
    setDjSeries(dj);
    setCgcSeries(cgc);
    setPacientProfile(profile);
  };

  const loadCriteria = async () => {
    const pid = context.patientId;
    if (!pid) return;
    const data = await fetchAlertCriteria(pid);
    if (isStale(pid)) return;
    // Paciente sem critérios salvos volta ao padrão (RN04) — nunca herda os
    // critérios do paciente anterior.
    setCriteria(data.length ? data.map(createCriterion) : [createCriterion(DEFAULT_CRITERION)]);
  };

  const reportLoadError = (err) => {
    console.error(err);
    setLoadError(LOAD_ERROR_MESSAGE);
    context.addNotification("error", LOAD_ERROR_MESSAGE);
  };

  const loadPatients = async () => {
    try {
      const result = await fetchAllPatients(context);
      setPatients(result);
      setPatientsError(null);
    } catch (err) {
      console.error(err);
      setPatientsError(PATIENTS_ERROR_MESSAGE);
      context.addNotification("error", PATIENTS_ERROR_MESSAGE);
    }
  };

  const handleSelectPatient = (patient) => {
    context.setPatientId(patient.id);
    context.setPatientName(patient.name);
    context.setPatientBirthDate(patient.birthDate);
    setTab(0);
  };

  const handlePatientRowKeyDown = (event, patient) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelectPatient(patient);
    }
  };

  // Recarrega relatório atual + histórico (após gerar ou para "Tentar novamente").
  const reloadReports = async () => {
    try {
      await Promise.all([loadCurrentReport(), loadHistory()]);
      setLoadError(null);
    } catch (err) {
      reportLoadError(err);
    }
  };

  const handleFilterHistory = async () => {
    try {
      await loadHistory();
      setLoadError(null);
    } catch (err) {
      reportLoadError(err);
    }
  };

  // RN05 — arquiva um relatório do histórico (nunca exclui).
  const handleArchiveReport = async (reportId) => {
    try {
      await archiveClinicalReport(context.patientId, reportId);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      context.addNotification("success", "Relatório arquivado.");
    } catch (err) {
      console.error(err);
      context.addNotification("error", "Não foi possível arquivar o relatório. Tente novamente.");
      return;
    }
    // Atualizações secundárias: falha aqui é erro de carga, não de arquivamento.
    void loadPatients();
    const refreshes = [];
    if (showArchived) refreshes.push(loadArchivedReports());
    if (currentReport?._id === reportId) refreshes.push(loadCurrentReport());
    try {
      await Promise.all(refreshes);
    } catch (err) {
      reportLoadError(err);
    }
  };

  // LGPD Art. 18 — exclusão definitiva, só disponível sobre um relatório já
  // arquivado. Ação irreversível: confirma explicitamente antes de chamar a API.
  const handleDeleteReport = async (reportId) => {
    const confirmado = window.confirm(
      "Excluir este relatório definitivamente? Essa ação não pode ser desfeita."
    );
    if (!confirmado) return;

    try {
      await deleteClinicalReport(context.patientId, reportId);
      setArchivedReports((prev) => prev.filter((r) => r._id !== reportId));
      context.addNotification("success", "Relatório excluído definitivamente.");
    } catch (err) {
      console.error(err);
      context.addNotification("error", "Não foi possível excluir o relatório. Tente novamente.");
    }
  };

  // RF08 — monta um PDF nativo (texto real, não captura de tela) do relatório atual.
  const handleExportPdf = async () => {
    if (!currentReport || exportingPdf) return;
    setExportingPdf(true);
    try {
      const doc = buildClinicalReportPdf(currentReport, {
        patientName: context.patientName,
        pacientProfile,
        professionalName: getTokenParameters("fullname"),
        professionalRole: translateRole(getTokenParameters("role")),
      });
      const sessionLabel = (currentReport.period?.label || "relatorio").replace(/[^\w-]+/g, "_");
      doc.save(`relatorio-clinico-${sessionLabel}.pdf`);
    } catch (err) {
      console.error(err);
      context.addNotification("error", "Não foi possível exportar o PDF. Tente novamente.");
    } finally {
      setExportingPdf(false);
    }
  };

  const loadAll = async () => {
    if (!context.patientId) {
      // Sem paciente: invalida qualquer carga em andamento do anterior.
      loadSeq.current += 1;
      setLoading(false);
      return;
    }
    loadSeq.current += 1;
    const seq = loadSeq.current;
    setLoading(true);
    setLoadError(null);
    // allSettled: o que carregou com sucesso aparece mesmo se outra parte falhar.
    const results = await Promise.allSettled([loadCurrentReport(), loadHistory(), loadCharts(), loadCriteria()]);
    if (seq !== loadSeq.current) return; // outra carga (outro paciente) já começou
    const failure = results.find((r) => r.status === "rejected");
    if (failure) reportLoadError(failure.reason);
    setLoading(false);
  };

  // Ao trocar de paciente, limpa tudo do anterior antes de carregar o novo.
  const resetPatientData = () => {
    setCurrentReport(null);
    setReports([]);
    setArchivedReports([]);
    setDjSeries([]);
    setCgcSeries([]);
    setPacientProfile(null);
    setCriteria([createCriterion(DEFAULT_CRITERION)]);
    setGenerateError(null);
    setLoadError(null);
  };

  useEffect(() => {
    resetPatientData();
    loadAll().catch((error) => console.error(error));
  }, [context.patientId]);

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    if (context.patientId) loadCharts().catch(reportLoadError);
  }, [device]);

  useEffect(() => {
    if (showArchived) loadArchivedReports().catch(reportLoadError);
  }, [showArchived, context.patientId]);

  // ── Ação: gerar relatório (RF05) ───────────────────────────────────────────

  const handleGenerate = async () => {
    if (periodPreset === "personalizado") {
      if (!customStart || !customEnd) {
        context.addNotification("error", "Selecione a data inicial e final.");
        return;
      }
      if (!isValidCustomPeriod(customStart, customEnd)) {
        context.addNotification("error", "A data inicial deve ser anterior ou igual à data final.");
        return;
      }
    }

    const pid = context.patientId;
    setGenerating(true);
    setGenerateError(null);
    let result;
    try {
      const period = buildPeriodFromPreset(periodPreset, customStart, customEnd);
      result = await generateClinicalReport(pid, { device, period });
    } catch (err) {
      // FA01 (422 — dados insuficientes no período) e FA03 (503 — falha na API de IA):
      // mostra a mensagem do back e mantém período/dispositivo selecionados para nova tentativa.
      const message =
        err.response?.data?.message || "Não foi possível gerar o relatório agora. Tente novamente.";
      setGenerateError(message);
      setGenerating(false);
      return;
    }

    // Geração concluída — sucesso é definitivo. Se recarregar o histórico
    // falhar depois, isso é erro de carga (com "Tentar novamente"), nunca
    // "não foi possível gerar" (o usuário tentaria de novo e duplicaria).
    setGenerating(false);
    context.addNotification("success", "Relatório clínico gerado com sucesso.");
    if (isStale(pid)) return;
    if (result?.data?._id) setCurrentReport(result.data);
    setTab(0);
    void loadPatients();
    await reloadReports();
  };

  const updateCriteria = (idx, field, value) => {
    setCriteria(
      criteria.map((c, i) => {
        if (i !== idx) return c;
        if (field === "condition" && value !== c.condition) {
          return { ...c, condition: value, triggerValue: DEFAULT_TRIGGER_BY_CONDITION[value] };
        }
        return { ...c, [field]: value };
      })
    );
  };

  const handleSaveCriteria = async () => {
    const invalid = criteria.map(validateCriterion).find(Boolean);
    if (invalid) {
      context.addNotification("error", invalid);
      return;
    }
    setSavingCriteria(true);
    try {
      await saveAlertCriteria(context.patientId, criteria.map(toCriterionPayload));
      context.addNotification("success", "Configuração de alertas salva com sucesso.");
    } catch (err) {
      console.error(err);
      context.addNotification("error", "Não foi possível salvar a configuração de alertas.");
    } finally {
      setSavingCriteria(false);
    }
  };

  // ── RF07: filtro de período e marcação de sessões com alerta nos gráficos ──

  const GRAPH_PERIOD_OPTIONS = [{ key: "todas", label: "Todo o período" }, ...PERIOD_PRESETS];

  // Mesmo intervalo dos presets da geração (N dias contando hoje).
  const filterByGraphPeriod = (series) => {
    if (graphPeriod === "todas") return series;
    if (!PERIOD_PRESETS.some((p) => p.key === graphPeriod)) return series;
    const { start, end } = getPresetRange(graphPeriod);
    const startTime = start.valueOf();
    const endTime = end.valueOf();
    return series.filter((s) => s.timestamp >= startTime && s.timestamp <= endTime);
  };

  const filteredDjSeries = filterByGraphPeriod(djSeries);
  const filteredCgcSeries = filterByGraphPeriod(cgcSeries);

  const reportsForAlertDots = [currentReport, ...reports.filter((r) => r._id !== currentReport?._id)];
  const alertTimestamps = findAlertSessionTimestamps(reportsForAlertDots, djSeries, device);

  const djDot = (props) => {
    const { cx, cy, payload } = props;
    const isAlert = alertTimestamps.has(payload.timestamp);
    return <circle key={`dj-dot-${payload.timestamp}`} cx={cx} cy={cy} r={isAlert ? 5 : 3} fill={isAlert ? "#d32f2f" : "#1e2b48"} />;
  };

  const retryLoadButton = (
    <Button size="small" variant="outlined" sx={{ color: "#c62828", borderColor: "#c62828", textTransform: "none" }} onClick={() => loadAll().catch((error) => console.error(error))}>
      Tentar novamente
    </Button>
  );

  const patientsTabContent = (
    <Box>
      <Typography sx={{ fontSize: 15, fontWeight: "bold", color: "#11192A", mb: 0.5 }}>
        Lista de pacientes
      </Typography>
      <Typography sx={{ fontSize: 13, color: "#9e9e9e", mb: 3 }}>
        Clique em um paciente para abrir o relatório clínico correspondente.
      </Typography>

      {patientsError && (
        <Paper role="alert" sx={{ backgroundColor: "#ffebee", border: "1px solid #c62828", borderRadius: 2, p: 2, mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Typography sx={{ color: "#c62828", fontSize: 13 }}>{patientsError}</Typography>
          <Button size="small" variant="outlined" sx={{ color: "#c62828", borderColor: "#c62828", textTransform: "none" }} onClick={() => void loadPatients()}>
            Tentar novamente
          </Button>
        </Paper>
      )}

      {!patients.length && !patientsError && (
        <Typography sx={{ color: "#9e9e9e", fontSize: 13 }}>Nenhum paciente cadastrado.</Typography>
      )}
      {patients.length > 0 && (
        <TableContainer component={Paper} sx={{ backgroundColor: "white", boxShadow: 2, borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f7ff" }}>
                <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Condição</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  selected={p.id === context.patientId}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir relatório clínico de ${p.name}` + (getPatientStatus(p.latestReport) ? ` (status: ${getPatientStatus(p.latestReport).label})` : "")}
                  sx={{ cursor: "pointer", "&:focus-visible": { outline: "2px solid #1e2b48", outlineOffset: -2 } }}
                  onClick={() => handleSelectPatient(p)}
                  onKeyDown={(e) => handlePatientRowKeyDown(e, p)}
                >
                  <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{p.name}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{translateCondition(p.condition) || "—"}</TableCell>
                  <TableCell>
                    {(() => {
                      const status = getPatientStatus(p.latestReport);
                      return status ? (
                        <Chip
                          size="small"
                          label={status.label}
                          sx={{ backgroundColor: status.bg, color: status.color, fontWeight: "bold", border: `1px solid ${status.border}`, fontSize: 11 }}
                        />
                      ) : (
                        <Chip size="small" label="Sem dados" sx={{ backgroundColor: "#f5f5f5", color: "#9e9e9e", fontSize: 11 }} />
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // ── Estados de loading / sem dados ────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ marginTop: 1 }}>
        <Typography variant="h2" sx={{ fontSize: 20, fontWeight: "bold", color: "#11192A", mb: 3 }}>
          Relatório Clínico
        </Typography>
        <LinearProgress sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "#1e2b48" } }} />
        <Typography sx={{ mt: 2, color: "#9e9e9e", fontSize: 13 }}>
          Carregando dados do paciente...
        </Typography>
      </Box>
    );
  }

  // ── Render principal ───────────────────────────────────────────────────────

  return (
    <Box sx={{ marginTop: 1 }}>

      {/* Breadcrumb (RF06) */}
      <Typography sx={{ fontSize: 12, color: "#758BB7", mb: 0.5 }}>
        {/* Ação do próprio router/estado (sem recarregar a página nem perder o
            paciente selecionado): leva à aba Pacientes desta tela. */}
        <Box
          component="button"
          type="button"
          onClick={() => setTab(PATIENTS_TAB)}
          sx={{ background: "none", border: "none", p: 0, cursor: "pointer", font: "inherit", color: "#758BB7", "&:hover": { textDecoration: "underline" } }}
        >
          ← Pacientes
        </Box>
        {context.patientName ? " › " + context.patientName + " › Relatório Clínico" : ""}
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h2" sx={{ fontSize: 20, fontWeight: "bold", letterSpacing: "1px", color: "#11192A" }}>
          Relatório Clínico
        </Typography>
        {currentReport && (
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            sx={BTN}
            disabled={exportingPdf}
            onClick={handleExportPdf}
          >
            {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
          </Button>
        )}
      </Box>

      {!context.patientId && (
        <>
          <Typography sx={{ color: "#9e9e9e", fontSize: 14, mb: 3 }}>
            Selecione um paciente na barra lateral.
          </Typography>
          {patientsTabContent}
        </>
      )}

      {context.patientId && (
        <>
          {/* Barra de abas */}
          <Paper sx={{ backgroundColor: "white", borderRadius: 2, mb: 3, boxShadow: 1 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": { color: "#9e9e9e", textTransform: "none", fontSize: 13, minHeight: 48 },
                "& .Mui-selected": { color: "#1e2b48", fontWeight: "bold" },
                "& .MuiTabs-indicator": { backgroundColor: "#1e2b48" },
              }}
            >
              <Tab icon={<AssessmentIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Relatório atual" />
              <Tab icon={<HistoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Histórico" />
              <Tab icon={<BarChartIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Gráficos" />
              <Tab
                icon={<NotificationsIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label={alertsTabLabel(currentReport)}
              />
              <Tab icon={<PlayCircleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Gerar relatório" />
              <Tab icon={<PersonIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Pacientes" />
            </Tabs>
          </Paper>

          {/* Falha ao carregar não pode parecer "sem relatório" */}
          {loadError && (
            <Paper role="alert" sx={{ backgroundColor: "#ffebee", border: "1px solid #c62828", borderRadius: 2, p: 2, mb: 2.5, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <WarningAmberIcon sx={{ color: "#c62828" }} />
              <Typography sx={{ color: "#c62828", fontSize: 13, flex: 1 }}>{loadError}</Typography>
              {retryLoadButton}
            </Paper>
          )}

          {/* ═══ ABA 0 — Relatório atual ═══ */}
          {tab === 0 && !currentReport && !loadError && (
            <Box sx={{ textAlign: "center", mt: 6 }}>
              <AssessmentIcon sx={{ fontSize: 60, color: "#ccc" }} />
              <Typography sx={{ mt: 2, color: "#9e9e9e", fontSize: 14 }}>
                Nenhum relatório gerado ainda para este paciente.
              </Typography>
              <Button sx={{ ...BTN, mt: 2 }} variant="contained" onClick={() => setTab(4)}>
                Gerar primeiro relatório
              </Button>
            </Box>
          )}

          {tab === 0 && currentReport && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5, flexWrap: "wrap" }}>
                <Typography sx={{ fontSize: 15, fontWeight: "bold", color: "#11192A" }}>
                  {currentReport.period.label} · {currentReport.sessionCount} sessão(ões) · {currentReport.device}
                </Typography>
                {(() => {
                  const status = getPatientStatus(currentReport);
                  return status ? (
                    <Chip
                      size="small"
                      label={status.label}
                      sx={{ backgroundColor: status.bg, color: status.color, fontWeight: "bold", border: `1px solid ${status.border}` }}
                    />
                  ) : null;
                })()}
              </Box>
              <Typography sx={{ fontSize: 12, color: "#9e9e9e", mb: 2 }}>
                Gerado em {new Date(currentReport.created_at).toLocaleString("pt-BR")} ·{" "}
                {describeGeneratedBy(currentReport)}
              </Typography>

              {currentReport.alerts.length > 0 && (
                <Paper sx={{ backgroundColor: "#fff3e0", border: "1px solid #e65100", borderRadius: 2, p: 2.5, mb: 2.5, display: "flex", alignItems: "flex-start" }}>
                  <WarningAmberIcon sx={{ color: "#e65100", mr: 1.5, mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ color: "#e65100", fontWeight: "bold", fontSize: 14 }}>Alerta ativo</Typography>
                    {currentReport.alerts.map((a) => (
                      <Typography key={`${a.metric}-${a.condition}-${a.triggerValue}`} sx={{ color: "#bf360c", fontSize: 13, mt: 0.3 }}>
                        {describeAlert(a)}
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              )}

              {currentReport.coerenciaVerificada === false && (
                <Paper sx={{ backgroundColor: "#fdecea", border: "1px solid #c62828", borderRadius: 2, p: 2.5, mb: 2.5, display: "flex", alignItems: "flex-start" }}>
                  <WarningAmberIcon sx={{ color: "#c62828", mr: 1.5, mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ color: "#c62828", fontWeight: "bold", fontSize: 14 }}>
                      Possível inconsistência no texto gerado
                    </Typography>
                    <Typography sx={{ color: "#8e1c1c", fontSize: 12, mt: 0.3, mb: 0.5 }}>
                      O texto abaixo menciona uma tendência que não bate com o valor real da métrica. Revise com atenção antes de usar este relatório.
                    </Typography>
                    {(currentReport.avisosCoerencia || []).map((a) => (
                      <Typography key={`${a.metrica}-${a.trechoSuspeito}`} sx={{ color: "#bf360c", fontSize: 13, mt: 0.3 }}>
                        {a.metrica} — esperado: {a.esperado} · trecho: "{a.trechoSuspeito}"
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              )}

              {/* Cards de métricas — as 7 variáveis principais (feedback do piloto com o professor) */}
              <Box sx={{ display: "flex", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
                {MAIN_METRIC_CARDS.map((card) => {
                  const value = currentReport.currentMetrics[card.key];
                  return (
                    <Paper key={card.key} sx={{ ...BLOCK, mb: 0, flex: "1 1 160px", textAlign: "center" }}>
                      <Typography sx={{ fontSize: 12, color: "#9e9e9e" }}>{card.label}</Typography>
                      <Typography sx={{ fontSize: 24, fontWeight: "bold", color: "#1e2b48" }}>
                        {formatMetricValue(card.key, value)}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>

              {/* Objetivos do Tratamento (feedback do piloto com o professor) */}
              <Paper sx={BLOCK}>
                <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 15, mb: 1 }}>
                  Objetivos do Tratamento
                </Typography>
                <Typography sx={{ color: "#5A5C69", fontSize: 14 }}>
                  • Treinamento Muscular Inspiratório (TMI)
                </Typography>
              </Paper>

              <Paper sx={BLOCK}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                  <DescriptionIcon sx={{ color: "#1e2b48", mr: 1, opacity: 0.7, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 15 }}>Resumo da sessão</Typography>
                </Box>
                <Typography sx={{ color: "#5A5C69", lineHeight: 1.75, fontSize: 14 }}>
                  {currentReport.resumoSessao}
                </Typography>
              </Paper>

              {currentReport.evolucao && (
                <Paper sx={BLOCK}>
                  <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 15, mb: 1.5 }}>
                    Evolução
                  </Typography>
                  <Typography sx={{ color: "#5A5C69", lineHeight: 1.75, fontSize: 14, mb: currentReport.initialMetrics ? 2.5 : 0 }}>
                    {currentReport.evolucao}
                  </Typography>

                  {currentReport.initialMetrics && (
                    <>
                      <TableContainer sx={{ mb: 2.5 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: "bold", fontSize: 12, color: "#11192A" }}>Variável</TableCell>
                              <TableCell sx={{ fontWeight: "bold", fontSize: 12, color: "#11192A" }} align="right">Avaliação inicial</TableCell>
                              <TableCell sx={{ fontWeight: "bold", fontSize: 12, color: "#11192A" }} align="right">Estado atual</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {MAIN_METRIC_CARDS.map((card) => {
                              const inicial = currentReport.initialMetrics[card.key];
                              const atual = currentReport.currentMetrics[card.key];
                              if (inicial == null && atual == null) return null;
                              return (
                                <TableRow key={card.key}>
                                  <TableCell sx={{ fontSize: 12, color: "#11192A" }}>{card.label}</TableCell>
                                  <TableCell sx={{ fontSize: 12, color: "#9e9e9e" }} align="right">
                                    {formatMetricValue(card.key, inicial)}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12, color: "#11192A", fontWeight: "bold" }} align="right">
                                    {formatMetricValue(card.key, atual)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Box sx={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={MAIN_METRIC_CARDS.map((card) => ({
                              name: card.key,
                              "Avaliação inicial": currentReport.initialMetrics[card.key],
                              "Estado atual": currentReport.currentMetrics[card.key],
                            }))}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fill: "#9e9e9e", fontSize: 12 }} />
                            <YAxis tick={{ fill: "#9e9e9e", fontSize: 12 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Avaliação inicial" fill="#9e9e9e" />
                            <Bar dataKey="Estado atual" fill="#1e2b48" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </>
                  )}
                </Paper>
              )}

              <Paper sx={{ backgroundColor: "#f5f5f5", borderRadius: 2, p: 2, mb: 2.5, display: "flex", alignItems: "center", boxShadow: 1 }}>
                <DescriptionIcon sx={{ color: "#9e9e9e", mr: 1.5, fontSize: 18, flexShrink: 0 }} />
                <Typography sx={{ color: "#757575", fontSize: 12, fontStyle: "italic" }}>
                  {currentReport.avisoRevisao}
                </Typography>
              </Paper>

              {/* FA02 — campos opcionais que não puderam ser consultados no período */}
              {currentReport.missingOptionalFields?.length > 0 && (
                <Paper sx={{ backgroundColor: "#f5f5f5", borderRadius: 2, p: 2, mb: 2.5, display: "flex", alignItems: "flex-start", boxShadow: 1 }}>
                  <DescriptionIcon sx={{ color: "#9e9e9e", mr: 1.5, mt: 0.2, fontSize: 18, flexShrink: 0 }} />
                  <Box>
                    {describeMissingFields(currentReport.missingOptionalFields).map((linha) => (
                      <Typography key={linha} sx={{ color: "#757575", fontSize: 12 }}>
                        {linha}
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              )}

              <Paper sx={BLOCK}>
                <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 15, mb: 2 }}>
                  Dados brutos consolidados
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Métrica</TableCell>
                        <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Sigla</TableCell>
                        <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Valor</TableCell>
                        <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Unidade</TableCell>
                        <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Collection (MongoDB)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentReport.dadosBrutos.map((row) => (
                        <TableRow key={row.sigla} sx={{ "&:nth-of-type(even)": { backgroundColor: "#f9f9f9" } }}>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{row.metrica}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{row.sigla}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>
                            {formatRawValue(row.valor)}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#9e9e9e" }}>{row.unidade}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>
                            <Chip size="small" label={row.sourceCollection} sx={{ backgroundColor: "#e8eaf6", color: "#3949ab", fontSize: 11 }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}

          {/* ═══ ABA 1 — Histórico ═══ */}
          {tab === 1 && (
            <Box>
              <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
                <TextField
                  size="small"
                  label="Data inicial"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  sx={{ "& input": { color: "#11192A" } }}
                  value={historyFilter.dataIni}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, dataIni: e.target.value })}
                />
                <TextField
                  size="small"
                  label="Data final"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  sx={{ "& input": { color: "#11192A" } }}
                  value={historyFilter.dataFim}
                  onChange={(e) => setHistoryFilter({ ...historyFilter, dataFim: e.target.value })}
                />
                <Button variant="contained" sx={BTN} onClick={handleFilterHistory}>Filtrar</Button>
                <FormControlLabel
                  sx={{ ml: "auto" }}
                  control={<Switch checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />}
                  label={<Typography sx={{ fontSize: 13, color: "#5A5C69" }}>Mostrar arquivados</Typography>}
                />
              </Box>

              {!reports.length ? (
                !loadError && <Typography sx={{ color: "#9e9e9e", fontSize: 13 }}>Nenhum relatório gerado.</Typography>
              ) : (
                <TableContainer component={Paper} sx={{ backgroundColor: "white", boxShadow: 2, borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f7ff" }}>
                        <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Período</TableCell>
                        <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Resumo</TableCell>
                        <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Alerta</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reports.map((r) => (
                        <TableRow key={r._id} hover>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{r.period.label}</TableCell>
                          <TableCell sx={{ fontSize: 13, maxWidth: 420, color: "#11192A" }}>
                            {(r.resumoSessao || "").slice(0, 110)}
                            {(r.resumoSessao || "").length > 110 ? "…" : ""}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.alerts.length ? "Ativo" : "Normal"}
                              sx={{
                                backgroundColor: r.alerts.length ? "#ffccbc" : "#e8f5e9",
                                color: r.alerts.length ? "#bf360c" : "#2e7d32",
                                fontWeight: "bold",
                                fontSize: 11,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              sx={{ color: "#1e2b48", fontSize: 12, textTransform: "none" }}
                              onClick={() => {
                                setCurrentReport(r);
                                setTab(0);
                              }}
                            >
                              Abrir
                            </Button>
                            <Button
                              size="small"
                              sx={{ color: "#9e9e9e", fontSize: 12, textTransform: "none" }}
                              onClick={() => handleArchiveReport(r._id)}
                            >
                              Arquivar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {showArchived && (
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: "bold", color: "#9e9e9e", mb: 1 }}>
                    Relatórios arquivados
                  </Typography>
                  {!archivedReports.length ? (
                    <Typography sx={{ color: "#9e9e9e", fontSize: 13 }}>Nenhum relatório arquivado.</Typography>
                  ) : (
                    <TableContainer component={Paper} sx={{ backgroundColor: "white", boxShadow: 2, borderRadius: 2 }}>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ backgroundColor: "#f5f7ff" }}>
                            <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Período</TableCell>
                            <TableCell sx={{ fontWeight: "bold", fontSize: 13, color: "#11192A" }}>Resumo</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {archivedReports.map((r) => (
                            <TableRow key={r._id} hover>
                              <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{r.period.label}</TableCell>
                              <TableCell sx={{ fontSize: 13, maxWidth: 420, color: "#11192A" }}>
                                {(r.resumoSessao || "").slice(0, 110)}
                                {(r.resumoSessao || "").length > 110 ? "…" : ""}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  sx={{ color: "#c62828", fontSize: 12, textTransform: "none" }}
                                  onClick={() => handleDeleteReport(r._id)}
                                >
                                  Excluir definitivamente
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* ═══ ABA 2 — Gráficos ═══ */}
          {tab === 2 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
                <Typography sx={{ fontSize: 15, fontWeight: "bold", color: "#11192A" }}>Evolução longitudinal</Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="graficos-periodo-label">Período</InputLabel>
                    <Select labelId="graficos-periodo-label" id="graficos-periodo" sx={{ color: "#11192A" }} value={graphPeriod} label="Período" onChange={(e) => setGraphPeriod(e.target.value)}>
                      {GRAPH_PERIOD_OPTIONS.map((p) => (
                        <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="graficos-dispositivo-label">Dispositivo</InputLabel>
                    <Select labelId="graficos-dispositivo-label" id="graficos-dispositivo" sx={{ color: "#11192A" }} value={device} label="Dispositivo" onChange={(e) => setDevice(e.target.value)}>
                      {DEVICE_OPTIONS.map((d) => (
                        <MenuItem key={d} value={d}>{d}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Paper sx={BLOCK}>
                <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 14, mb: 2 }}>
                  Desempenho do Jogador (DJ) · plataformoverviews
                </Typography>
                {!filteredDjSeries.length ? (
                  <Typography sx={{ color: "#9e9e9e", fontSize: 13, py: 2, textAlign: "center" }}>Sem dados.</Typography>
                ) : (
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredDjSeries} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fill: "#9e9e9e", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#9e9e9e", fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="DJ" stroke="#1e2b48" strokeWidth={2} dot={djDot} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}
                <Typography sx={{ fontSize: 11, color: "#9e9e9e", mt: 1 }}>
                  Ponto vermelho = sessão dentro do período de um relatório com alerta ativo.
                </Typography>
              </Paper>

              <Paper sx={BLOCK}>
                <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 14, mb: 2 }}>
                  Carga Corrente (CGc) · gameparameters
                </Typography>
                {!filteredCgcSeries.length ? (
                  <Typography sx={{ color: "#9e9e9e", fontSize: 13, py: 2, textAlign: "center" }}>Sem dados.</Typography>
                ) : (
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredCgcSeries} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fill: "#9e9e9e", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#9e9e9e", fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="CGc" stroke="#2e7d32" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Paper>

              <Paper sx={BLOCK}>
                <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 14, mb: 1 }}>
                  Frequência Respiratória (FR) · perfil do paciente
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: "bold", color: "#e65100" }}>
                  {formatRespiratoryRate(pacientProfile, device)}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#9e9e9e", mt: 0.5 }}>
                  Valor de referência do perfil de calibração do paciente — o modelo de dados
                  atual não registra FR por sessão, apenas o valor de calibração.
                </Typography>
              </Paper>
            </Box>
          )}

          {/* ═══ ABA 3 — Alertas ═══ */}
          {tab === 3 && (
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: "bold", color: "#11192A", mb: 0.5 }}>
                Configuração de alertas
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#9e9e9e", mb: 3 }}>
                Critérios automáticos para sinalização clínica. Sem nenhum critério configurado, o
                sistema usa o padrão (DJ, deterioração em 5 sessões consecutivas — RN04).
              </Typography>

              {criteria.map((c, idx) => (
                <Paper key={c.uid} sx={{ backgroundColor: "white", borderRadius: 2, p: 3, mb: 2, boxShadow: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 14 }}>Critério {idx + 1}</Typography>
                    <IconButton size="small" aria-label={`Remover critério ${idx + 1}`} onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))} sx={{ color: "#c62828" }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id={`${c.uid}-metrica-label`}>Métrica</InputLabel>
                      <Select labelId={`${c.uid}-metrica-label`} id={`${c.uid}-metrica`} sx={{ color: "#11192A" }} value={c.metric} label="Métrica" onChange={(e) => updateCriteria(idx, "metric", e.target.value)}>
                        {ALERT_METRIC_OPTIONS.map((m) => (<MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel id={`${c.uid}-condicao-label`}>Condição</InputLabel>
                      <Select labelId={`${c.uid}-condicao-label`} id={`${c.uid}-condicao`} sx={{ color: "#11192A" }} value={c.condition} label="Condição" onChange={(e) => updateCriteria(idx, "condition", e.target.value)}>
                        {CONDITION_OPTIONS.map((cond) => (<MenuItem key={cond} value={cond}>{cond}</MenuItem>))}
                      </Select>
                    </FormControl>
                    <CriterionTriggerField
                      criterion={c}
                      onChange={(value) => updateCriteria(idx, "triggerValue", value)}
                    />
                  </Box>
                </Paper>
              ))}

              <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setCriteria([...criteria, createCriterion(DEFAULT_CRITERION)])}
                  sx={{ color: "#1e2b48", textTransform: "none", border: "1px dashed #1e2b48", borderRadius: 2 }}
                >
                  Adicionar critério
                </Button>
                {savingCriteria ? (
                  <LinearProgress sx={{ flex: 1, alignSelf: "center", "& .MuiLinearProgress-bar": { backgroundColor: "#1e2b48" } }} />
                ) : (
                  <Button variant="contained" sx={BTN} onClick={handleSaveCriteria}>
                    Salvar configuração
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* ═══ ABA 4 — Gerar relatório ═══ */}
          {tab === 4 && (
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: "bold", color: "#11192A", mb: 0.5 }}>
                Gerar novo relatório clínico
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#758BB7", mb: 3 }}>
                O sistema consulta automaticamente as collections do MongoDB para o período e
                dispositivo selecionados — nenhum arquivo precisa ser enviado.
              </Typography>

              <Paper sx={BLOCK}>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel id="gerar-periodo-label">Período de referência</InputLabel>
                    <Select labelId="gerar-periodo-label" id="gerar-periodo" sx={{ color: "#11192A" }} value={periodPreset} label="Período de referência" onChange={(e) => setPeriodPreset(e.target.value)}>
                      {PERIOD_PRESETS.map((p) => (<MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>))}
                      <MenuItem value="personalizado">Personalizado</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="gerar-dispositivo-label">Dispositivo</InputLabel>
                    <Select labelId="gerar-dispositivo-label" id="gerar-dispositivo" sx={{ color: "#11192A" }} value={device} label="Dispositivo" onChange={(e) => setDevice(e.target.value)}>
                      {DEVICE_OPTIONS.map((d) => (<MenuItem key={d} value={d}>{d}</MenuItem>))}
                    </Select>
                  </FormControl>
                  {periodPreset === "personalizado" && (
                    <>
                      <TextField
                        size="small" label="Data inicial" type="date" InputLabelProps={{ shrink: true }}
                        sx={{ "& input": { color: "#11192A" } }}
                        value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                      />
                      <TextField
                        size="small" label="Data final" type="date" InputLabelProps={{ shrink: true }}
                        sx={{ "& input": { color: "#11192A" } }}
                        value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </>
                  )}
                </Box>

                <Typography sx={{ fontSize: 12, color: "#9e9e9e", mb: 2 }}>
                  Collections consultadas automaticamente: plataformoverviews, gameparameters,
                  flowdatadevices, pacients.
                </Typography>

                {generateError && (
                  <Paper sx={{ backgroundColor: "#ffebee", border: "1px solid #c62828", borderRadius: 2, p: 2, mb: 2 }}>
                    <Typography sx={{ color: "#c62828", fontSize: 13 }}>{generateError}</Typography>
                  </Paper>
                )}

                {generating ? (
                  <LinearProgress sx={{ "& .MuiLinearProgress-bar": { backgroundColor: "#1e2b48" } }} />
                ) : (
                  <Button variant="contained" sx={BTN} onClick={handleGenerate}>
                    Processar e gerar relatório
                  </Button>
                )}
              </Paper>
            </Box>
          )}

          {/* ═══ ABA 5 — Pacientes (RF09) ═══ */}
          {tab === PATIENTS_TAB && patientsTabContent}
        </>
      )}
    </Box>
  );
};

export default ClinicalReport;
