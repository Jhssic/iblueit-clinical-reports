/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useMyContext } from "../../providers/MyContext";
import { pathRoutes } from "../../providers/Routes";
import { getTokenParameters } from "../../providers/sessionStorage";
import {
  generateClinicalReport,
  fetchClinicalReportsHistory,
  fetchPlataformSeries,
  fetchGameParameterSeries,
  fetchPacientProfile,
  buildPeriodFromPreset,
  PERIOD_PRESETS,
  fetchAlertCriteria,
  saveAlertCriteria,
  archiveClinicalReport,
} from "../../services/api/clinicalReport";
import { fetchAll as fetchAllPatients } from "../../services/api/patient";

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
const CONDITION_OPTIONS = ["Deterioração consecutiva", "Queda percentual >", "Abaixo do valor"];

const describeAlert = (a) => {
  const label = METRIC_LABELS[a.metric] || a.metric;
  if (a.condition === "Queda percentual >") {
    return `${label}: queda percentual maior que ${a.triggerValue}% entre as duas últimas sessões.`;
  }
  if (a.condition === "Abaixo do valor") {
    return `${label}: abaixo de ${a.triggerValue} na última sessão.`;
  }
  return `${label}: deterioração consecutiva em ${a.triggerValue} sessões.`;
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

// ─── Componente principal ─────────────────────────────────────────────────────

const ClinicalReport = () => {
  const context = useMyContext();

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [reports, setReports] = useState([]);
  const firstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  };

  const [historyFilter, setHistoryFilter] = useState({ dataIni: firstDayOfMonth(), dataFim: "" });

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
  const [criteria, setCriteria] = useState([
    { metric: "DJ", condition: "Deterioração consecutiva", triggerValue: 5 },
  ]);
  const [savingCriteria, setSavingCriteria] = useState(false);

  // Aba "Pacientes" (RF09 — indicador de alerta por paciente)
  const [patients, setPatients] = useState([]);

  const currentReport = reports.length ? reports[0] : null;

  // ── Carrega dados do backend ───────────────────────────────────────────────

  const loadHistory = async () => {
    if (!context.patientId) return;
    const data = await fetchClinicalReportsHistory(context.patientId, historyFilter);
    setReports(data);
  };

  const loadCharts = async () => {
    if (!context.patientId) return;
    const [dj, cgc, profile] = await Promise.all([
      fetchPlataformSeries(context.patientId, device),
      fetchGameParameterSeries(context.patientId),
      fetchPacientProfile(context.patientId),
    ]);
    setDjSeries(dj);
    setCgcSeries(cgc);
    setPacientProfile(profile);
  };

  const loadCriteria = async () => {
    if (!context.patientId) return;
    const data = await fetchAlertCriteria(context.patientId);
    if (data.length) {
      setCriteria(data.map((c) => ({ metric: c.metric, condition: c.condition, triggerValue: c.triggerValue })));
    }
  };

  const loadPatients = async () => {
    try {
      const result = await fetchAllPatients(context);
      setPatients(result);
    } catch (err) { }
  };

  const handleSelectPatient = (patient) => {
    context.setPatientId(patient.id);
    context.setPatientName(patient.name);
    context.setPatientBirthDate(patient.birthDate);
    setTab(0);
  // RN05 — arquiva um relatório do histórico (nunca exclui).
  const handleArchiveReport = async (reportId) => {
    try {
      await archiveClinicalReport(context.patientId, reportId);
      setReports(reports.filter((r) => r._id !== reportId));
      context.addNotification("success", "Relatório arquivado.");
    } catch (err) {
      context.addNotification("error", "Não foi possível arquivar o relatório. Tente novamente.");
    }
  };

  // RF08 — monta um PDF nativo (texto real, não captura de tela) do relatório atual.
  const handleExportPdf = async () => {
    if (!currentReport || exportingPdf) return;
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = PDF_MARGIN;

      // Cabeçalho
      doc.setFont(undefined, "bold");
      doc.setFontSize(18);
      doc.setTextColor(...PDF_COLORS.navy);
      doc.text("Relatório Clínico — I Blue It", PDF_MARGIN, y);

      // Status rápido do paciente (Estável/Atenção/Crítico), alinhado à direita
      const patientStatus = getPatientStatus(currentReport);
      if (patientStatus) {
        const statusColorMap = {
          "Crítico": [198, 40, 40],
          "Atenção": [230, 81, 0],
          "Estável": [46, 125, 50],
        };
        const statusRgb = statusColorMap[patientStatus.label] || [117, 117, 117];
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        const statusTextWidth = doc.getTextWidth(patientStatus.label) + 16;
        const statusX = pageWidth - PDF_MARGIN - statusTextWidth;
        doc.setFillColor(...statusRgb);
        doc.roundedRect(statusX, y - 14, statusTextWidth, 20, 4, 4, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(patientStatus.label, statusX + 8, y);
        doc.setFont(undefined, "normal");
      }

      y += 22;

      doc.setFont(undefined, "normal");
      doc.setFontSize(11);
      doc.setTextColor(...PDF_COLORS.gray);
      doc.text(
        `${currentReport.period.label} · ${currentReport.sessionCount} sessão(ões) · ${currentReport.device}`,
        PDF_MARGIN,
        y
      );
      y += 16;
      doc.setFontSize(9);
      doc.text(
        `Gerado em ${new Date(currentReport.created_at).toLocaleString("pt-BR")} · ${
          currentReport.generatedBy === "llm" ? "texto via LLM" : "texto via template"
        }`,
        PDF_MARGIN,
        y
      );
      y += 4;

      // Dados do paciente e do profissional responsável
      const professionalName = getTokenParameters("fullname");
      const professionalRole = getTokenParameters("role");
      let age = null;
      if (pacientProfile && pacientProfile.birthday) {
        const birth = new Date(pacientProfile.birthday);
        const today = new Date();
        age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
      }

      doc.setDrawColor(224, 224, 224);
      doc.line(PDF_MARGIN, y, pageWidth - PDF_MARGIN, y);
      y += 16;

      doc.setFontSize(10);
      doc.setTextColor(...PDF_COLORS.navy);
      doc.setFont(undefined, "bold");
      doc.text("Paciente:", PDF_MARGIN, y);
      doc.setFont(undefined, "normal");
      doc.setTextColor(60, 60, 60);
      const patientLine = [
        context.patientName || "—",
        age != null ? `${age} anos` : null,
        pacientProfile?.sex || null,
        pacientProfile?.condition || null,
      ]
        .filter(Boolean)
        .join(" · ");
      doc.text(patientLine, PDF_MARGIN + 85, y);
      y += 14;

      if (pacientProfile?.weight || pacientProfile?.height) {
        doc.setTextColor(...PDF_COLORS.gray);
        doc.setFontSize(9);
        doc.text(
          `Peso/Altura: ${pacientProfile?.weight ? pacientProfile.weight + " kg" : "—"} / ${
            pacientProfile?.height ? pacientProfile.height + " cm" : "—"
          }`,
          PDF_MARGIN + 85,
          y
        );
        y += 14;
      }

      doc.setFontSize(10);
      doc.setTextColor(...PDF_COLORS.navy);
      doc.setFont(undefined, "bold");
      doc.text("Profissional:", PDF_MARGIN, y);
      doc.setFont(undefined, "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(
        [professionalName, professionalRole].filter(Boolean).join(" · ") || "—",
        PDF_MARGIN + 85,
        y
      );
      y += 20;

      // Alerta ativo
      if (currentReport.alerts.length > 0) {
        y = pdfAddNoteBox(
          doc,
          {
            title: "Alerta ativo",
            lines: currentReport.alerts.map(describeAlert),
            bg: PDF_COLORS.orangeBg,
            border: PDF_COLORS.orange,
            text: [191, 54, 12],
          },
          y,
          pageWidth,
          pageHeight
        );
      }

      // Possível inconsistência (verificação de coerência)
      if (currentReport.coerenciaVerificada === false) {
        y = pdfAddNoteBox(
          doc,
          {
            title: "Possível inconsistência no texto gerado",
            lines: [
              "O texto menciona uma tendência que não bate com o valor real da métrica. Revise com atenção.",
              ...(currentReport.avisosCoerencia || []).map(
                (a) => `${a.metrica} — esperado: ${a.esperado} · trecho: "${a.trechoSuspeito}"`
              ),
            ],
            bg: PDF_COLORS.redBg,
            border: PDF_COLORS.red,
            text: [142, 28, 28],
          },
          y,
          pageWidth,
          pageHeight
        );
      }

      // Métricas principais
      y = pdfEnsureSpace(doc, y, 20, pageHeight);
      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      doc.setTextColor(...PDF_COLORS.navy);
      const dj = currentReport.currentMetrics.DJ;
      const pj = currentReport.currentMetrics.PJ;
      const cgc = currentReport.currentMetrics.CGc;
      doc.text(
        `DJ: ${dj != null ? Number(dj).toFixed(2) : "—"}    PJ: ${pj != null ? Number(pj).toFixed(2) : "—"}    CGc: ${
          cgc != null ? Number(cgc).toFixed(2) : "—"
        }`,
        PDF_MARGIN,
        y
      );
      doc.setFont(undefined, "normal");
      y += 24;

      // Resumo da sessão
      y = pdfAddSectionTitle(doc, "Resumo da sessão", y, pageHeight);
      y = pdfAddParagraph(doc, currentReport.resumoSessao, y, pageWidth, pageHeight);
      y += 10;

      // Análise comparativa
      if (currentReport.analiseComparativa) {
        y = pdfAddSectionTitle(doc, "Análise comparativa", y, pageHeight);
        y = pdfAddParagraph(doc, currentReport.analiseComparativa, y, pageWidth, pageHeight);
        y += 10;
      }

      // FA02 — campos opcionais não consultados
      if (currentReport.missingOptionalFields && currentReport.missingOptionalFields.length > 0) {
        y = pdfAddParagraph(
          doc,
          `Campos que não puderam ser consultados neste período: ${currentReport.missingOptionalFields.join(", ")}.`,
          y,
          pageWidth,
          pageHeight,
          { fontSize: 9, lineHeight: 12, color: PDF_COLORS.gray }
        );
        y += 10;
      }

      // Aviso de revisão
      y = pdfAddParagraph(doc, currentReport.avisoRevisao, y, pageWidth, pageHeight, {
        fontSize: 9,
        lineHeight: 12,
        color: PDF_COLORS.gray,
      });
      y += 16;

      // Dados brutos consolidados
      y = pdfAddSectionTitle(doc, "Dados brutos consolidados", y, pageHeight);
      autoTable(doc, {
        startY: y,
        margin: { left: PDF_MARGIN, right: PDF_MARGIN },
        head: [["Métrica", "Sigla", "Valor", "Unidade", "Collection"]],
        body: currentReport.dadosBrutos.map((row) => [
          row.metrica,
          row.sigla,
          typeof row.valor === "number" ? row.valor.toFixed(2) : row.valor,
          row.unidade,
          row.sourceCollection,
        ]),
        headStyles: { fillColor: PDF_COLORS.navy },
        styles: { fontSize: 9 },
      });

      const sessionLabel = (currentReport?.period?.label || "relatorio").replace(/[^\w-]+/g, "_");
      doc.save(`relatorio-clinico-${sessionLabel}.pdf`);
    } catch (err) {
      context.addNotification("error", "Não foi possível exportar o PDF. Tente novamente.");
    } finally {
      setExportingPdf(false);
    }
  };

  const loadAll = async () => {
    if (!context.patientId) return;
    setLoading(true);
    try {
      await Promise.all([loadHistory(), loadCharts(), loadCriteria()]);
    } catch (_err) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [context.patientId]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (context.patientId) loadCharts();
  }, [device]);

  // ── Ação: gerar relatório (RF05) ───────────────────────────────────────────

  const handleGenerate = async () => {
    if (periodPreset === "personalizado" && (!customStart || !customEnd)) {
      context.addNotification("error", "Selecione a data inicial e final.");
      return;
    }

    setGenerating(true);
    setGenerateError(null);
    try {
      const period = buildPeriodFromPreset(periodPreset, customStart, customEnd);
      const result = await generateClinicalReport(context.patientId, { device, period });

      if (!result.success) {
        // FA01 — dados insuficientes no período selecionado
        setGenerateError(result.message);
        return;
      }

      context.addNotification("success", "Relatório clínico gerado com sucesso.");
      await loadHistory();
      setTab(0);
    } catch (err) {
      // FA03 — falha na API de IA. Mantém período/dispositivo selecionados para nova tentativa.
      const message =
        (err.response && err.response.data && err.response.data.message) ||
        "Não foi possível gerar o relatório agora. Tente novamente.";
      setGenerateError(message);
    } finally {
      setGenerating(false);
    }
  };

  const updateCriteria = (idx, field, value) => {
    setCriteria(criteria.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const handleSaveCriteria = async () => {
    setSavingCriteria(true);
    try {
      await saveAlertCriteria(context.patientId, criteria);
      context.addNotification("success", "Configuração de alertas salva com sucesso.");
    } catch (err) {
      context.addNotification("error", "Não foi possível salvar a configuração de alertas.");
    } finally {
      setSavingCriteria(false);
    }
  };

  // ── RF07: filtro de período e marcação de sessões com alerta nos gráficos ──

  const GRAPH_PERIOD_OPTIONS = [{ key: "todas", label: "Todo o período" }, ...PERIOD_PRESETS];

  const filterByGraphPeriod = (series) => {
    if (graphPeriod === "todas") return series;
    const preset = PERIOD_PRESETS.find((p) => p.key === graphPeriod);
    if (!preset) return series;
    const cutoff = Date.now() - preset.days * 24 * 60 * 60 * 1000;
    return series.filter((s) => s.timestamp >= cutoff);
  };

  const filteredDjSeries = filterByGraphPeriod(djSeries);
  const filteredCgcSeries = filterByGraphPeriod(cgcSeries);

  const formatDDMM = (date) =>
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

  const alertDates = new Set();
  reports.forEach((r) => {
    if (!r.alerts || !r.alerts.length || !r.period) return;
    const cursor = new Date(r.period.start);
    const end = new Date(r.period.end);
    while (cursor <= end) {
      alertDates.add(formatDDMM(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const djDot = (props) => {
    const { cx, cy, payload } = props;
    const isAlert = alertDates.has(payload.date);
    return <circle key={`dj-dot-${payload.date}`} cx={cx} cy={cy} r={isAlert ? 5 : 3} fill={isAlert ? "#d32f2f" : "#1e2b48"} />;
  };

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
        <a href={pathRoutes.HOME} style={{ color: "#758BB7", textDecoration: "none" }}>
          ← Pacientes
        </a>
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
        <Typography sx={{ color: "#9e9e9e", fontSize: 14 }}>
          Selecione um paciente na barra lateral.
        </Typography>
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
                label={"Alertas" + (currentReport && currentReport.alerts.length ? ` (${currentReport.alerts.length})` : "")}
              />
              <Tab icon={<PlayCircleIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Gerar relatório" />
              <Tab icon={<PersonIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Pacientes" />
            </Tabs>
          </Paper>

          {/* ═══ ABA 0 — Relatório atual ═══ */}
          {tab === 0 && !currentReport && (
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
                {currentReport.generatedBy === "llm" ? "texto via LLM" : "texto via template"}
              </Typography>

              {currentReport.alerts.length > 0 && (
                <Paper sx={{ backgroundColor: "#fff3e0", border: "1px solid #e65100", borderRadius: 2, p: 2.5, mb: 2.5, display: "flex", alignItems: "flex-start" }}>
                  <WarningAmberIcon sx={{ color: "#e65100", mr: 1.5, mt: 0.2, flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ color: "#e65100", fontWeight: "bold", fontSize: 14 }}>Alerta ativo</Typography>
                    {currentReport.alerts.map((a, i) => (
                      <Typography key={i} sx={{ color: "#bf360c", fontSize: 13, mt: 0.3 }}>
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
                    {(currentReport.avisosCoerencia || []).map((a, i) => (
                      <Typography key={i} sx={{ color: "#bf360c", fontSize: 13, mt: 0.3 }}>
                        {a.metrica} — esperado: {a.esperado} · trecho: "{a.trechoSuspeito}"
                      </Typography>
                    ))}
                  </Box>
                </Paper>
              )}

              {/* Cards de métricas — DJ / PJ / CGc */}
              <Box sx={{ display: "flex", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
                {[
                  { label: "Desempenho (DJ)", value: currentReport.currentMetrics.DJ },
                  { label: "Pontos da Jogada (PJ)", value: currentReport.currentMetrics.PJ },
                  { label: "Carga Corrente (CGc)", value: currentReport.currentMetrics.CGc },
                ].map((card) => (
                  <Paper key={card.label} sx={{ ...BLOCK, mb: 0, flex: "1 1 180px", textAlign: "center" }}>
                    <Typography sx={{ fontSize: 12, color: "#9e9e9e" }}>{card.label}</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: "bold", color: "#1e2b48" }}>
                      {card.value != null ? Number(card.value).toFixed(2) : "—"}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              <Paper sx={BLOCK}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                  <DescriptionIcon sx={{ color: "#1e2b48", mr: 1, opacity: 0.7, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 15 }}>Resumo da sessão</Typography>
                </Box>
                <Typography sx={{ color: "#5A5C69", lineHeight: 1.75, fontSize: 14 }}>
                  {currentReport.resumoSessao}
                </Typography>
              </Paper>

              {currentReport.analiseComparativa && (
                <Paper sx={BLOCK}>
                  <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 15, mb: 1.5 }}>
                    Análise comparativa
                  </Typography>
                  <Typography sx={{ color: "#5A5C69", lineHeight: 1.75, fontSize: 14 }}>
                    {currentReport.analiseComparativa}
                  </Typography>
                </Paper>
              )}

              <Paper sx={{ backgroundColor: "#f5f5f5", borderRadius: 2, p: 2, mb: 2.5, display: "flex", alignItems: "center", boxShadow: 1 }}>
                <DescriptionIcon sx={{ color: "#9e9e9e", mr: 1.5, fontSize: 18, flexShrink: 0 }} />
                <Typography sx={{ color: "#757575", fontSize: 12, fontStyle: "italic" }}>
                  {currentReport.avisoRevisao}
                </Typography>
              </Paper>

              {/* FA02 — campos opcionais que não puderam ser consultados no período */}
              {currentReport.missingOptionalFields && currentReport.missingOptionalFields.length > 0 && (
                <Paper sx={{ backgroundColor: "#f5f5f5", borderRadius: 2, p: 2, mb: 2.5, display: "flex", alignItems: "center", boxShadow: 1 }}>
                  <DescriptionIcon sx={{ color: "#9e9e9e", mr: 1.5, fontSize: 18, flexShrink: 0 }} />
                  <Typography sx={{ color: "#757575", fontSize: 12 }}>
                    Campos que não puderam ser consultados neste período: {currentReport.missingOptionalFields.join(", ")}.
                  </Typography>
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
                      {currentReport.dadosBrutos.map((row, i) => (
                        <TableRow key={i} sx={{ "&:nth-of-type(even)": { backgroundColor: "#f9f9f9" } }}>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{row.metrica}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{row.sigla}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>
                            {typeof row.valor === "number" ? row.valor.toFixed(2) : row.valor}
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
                <Button variant="contained" sx={BTN} onClick={loadHistory}>Filtrar</Button>
              </Box>

              {!reports.length ? (
                <Typography sx={{ color: "#9e9e9e", fontSize: 13 }}>Nenhum relatório gerado.</Typography>
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
                      {reports.map((r, i) => (
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
                                setReports([r, ...reports.filter((x) => x._id !== r._id)]);
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
            </Box>
          )}

          {/* ═══ ABA 2 — Gráficos ═══ */}
          {tab === 2 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
                <Typography sx={{ fontSize: 15, fontWeight: "bold", color: "#11192A" }}>Evolução longitudinal</Typography>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Período</InputLabel>
                    <Select sx={{ color: "#11192A" }} value={graphPeriod} label="Período" onChange={(e) => setGraphPeriod(e.target.value)}>
                      {GRAPH_PERIOD_OPTIONS.map((p) => (
                        <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Dispositivo</InputLabel>
                    <Select sx={{ color: "#11192A" }} value={device} label="Dispositivo" onChange={(e) => setDevice(e.target.value)}>
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
                  {pacientProfile && pacientProfile["capacities" + DEVICE_CAPACITIES_SUFFIX[device]]
                    ? pacientProfile["capacities" + DEVICE_CAPACITIES_SUFFIX[device]].respiratoryRate + " rpm"
                    : "—"}
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
                <Paper key={idx} sx={{ backgroundColor: "white", borderRadius: 2, p: 3, mb: 2, boxShadow: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 14 }}>Critério {idx + 1}</Typography>
                    <IconButton size="small" onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))} sx={{ color: "#c62828" }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel>Métrica</InputLabel>
                      <Select sx={{ color: "#11192A" }} value={c.metric} label="Métrica" onChange={(e) => updateCriteria(idx, "metric", e.target.value)}>
                        {ALERT_METRIC_OPTIONS.map((m) => (<MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                      <InputLabel>Condição</InputLabel>
                      <Select sx={{ color: "#11192A" }} value={c.condition} label="Condição" onChange={(e) => updateCriteria(idx, "condition", e.target.value)}>
                        {CONDITION_OPTIONS.map((cond) => (<MenuItem key={cond} value={cond}>{cond}</MenuItem>))}
                      </Select>
                    </FormControl>
                    {c.condition === "Deterioração consecutiva" ? (
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Disparar após</InputLabel>
                        <Select sx={{ color: "#11192A" }} value={c.triggerValue} label="Disparar após" onChange={(e) => updateCriteria(idx, "triggerValue", e.target.value)}>
                          {[2, 3, 4, 5, 6].map((n) => (<MenuItem key={n} value={n}>{n} sessões</MenuItem>))}
                        </Select>
                      </FormControl>
                    ) : c.condition === "Abaixo do valor" ? (
                      <TextField
                        size="small"
                        type="number"
                        label="Valor limite"
                        sx={{ minWidth: 160, "& input": { color: "#11192A" } }}
                        value={c.triggerValue}
                        onChange={(e) => updateCriteria(idx, "triggerValue", Number(e.target.value))}
                      />
                    ) : (
                      <TextField
                        size="small"
                        type="number"
                        label="Queda mínima (%)"
                        sx={{ minWidth: 160, "& input": { color: "#11192A" } }}
                        value={c.triggerValue}
                        onChange={(e) => updateCriteria(idx, "triggerValue", Number(e.target.value))}
                      />
                    )}
                  </Box>
                </Paper>
              ))}

              <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setCriteria([...criteria, { metric: "DJ", condition: "Deterioração consecutiva", triggerValue: 5 }])}
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
                    <InputLabel>Período de referência</InputLabel>
                    <Select sx={{ color: "#11192A" }} value={periodPreset} label="Período de referência" onChange={(e) => setPeriodPreset(e.target.value)}>
                      {PERIOD_PRESETS.map((p) => (<MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>))}
                      <MenuItem value="personalizado">Personalizado</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Dispositivo</InputLabel>
                    <Select sx={{ color: "#11192A" }} value={device} label="Dispositivo" onChange={(e) => setDevice(e.target.value)}>
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
          {tab === 5 && (
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: "bold", color: "#11192A", mb: 0.5 }}>
                Lista de pacientes
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#9e9e9e", mb: 3 }}>
                Clique em um paciente para abrir o relatório clínico correspondente.
              </Typography>

              {!patients.length ? (
                <Typography sx={{ color: "#9e9e9e", fontSize: 13 }}>Nenhum paciente cadastrado.</Typography>
              ) : (
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
                          sx={{ cursor: "pointer" }}
                          onClick={() => handleSelectPatient(p)}
                        >
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{p.name}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#11192A" }}>{p.condition || "—"}</TableCell>
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
          )}
        </>
      )}
    </Box>
  );
};

export default ClinicalReport;
