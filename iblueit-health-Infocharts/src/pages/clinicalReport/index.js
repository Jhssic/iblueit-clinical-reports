/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
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
} from "../../services/api/clinicalReport";

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

// Só métricas com série temporal real por sessão (plataformoverviews) são avaliáveis
// como tendência hoje — CGc/FR/PEmax/PImax ficam fora até terem essa granularidade.
const ALERT_METRIC_OPTIONS = [
  { code: "DJ", label: "DJ — Desempenho do Jogador" },
  { code: "PJ", label: "PJ — Pontos da Jogada" },
  { code: "EB", label: "EB — Escala de Borg" },
];
const METRIC_LABELS = ALERT_METRIC_OPTIONS.reduce((acc, m) => ({ ...acc, [m.code]: m.label }), {});
const CONDITION_OPTIONS = ["Deterioração consecutiva", "Queda percentual >"];

const describeAlert = (a) => {
  const label = METRIC_LABELS[a.metric] || a.metric;
  return a.condition === "Queda percentual >"
    ? `${label}: queda percentual maior que ${a.triggerValue}% entre as duas últimas sessões.`
    : `${label}: deterioração consecutiva em ${a.triggerValue} sessões.`;
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
  const [djSeries, setDjSeries] = useState([]);
  const [cgcSeries, setCgcSeries] = useState([]);
  const [pacientProfile, setPacientProfile] = useState(null);

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
            onClick={() =>
              context.addNotification(
                "warning",
                "Exportação de PDF ainda não implementada (RF08 — próxima etapa)."
              )
            }
          >
            Exportar PDF
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
              <Typography sx={{ fontSize: 15, fontWeight: "bold", color: "#11192A", mb: 0.5 }}>
                {currentReport.period.label} · {currentReport.sessionCount} sessão(ões) · {currentReport.device}
              </Typography>
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
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Dispositivo</InputLabel>
                  <Select sx={{ color: "#11192A" }} value={device} label="Dispositivo" onChange={(e) => setDevice(e.target.value)}>
                    {DEVICE_OPTIONS.map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Paper sx={BLOCK}>
                <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 14, mb: 2 }}>
                  Desempenho do Jogador (DJ) · plataformoverviews
                </Typography>
                {!djSeries.length ? (
                  <Typography sx={{ color: "#9e9e9e", fontSize: 13, py: 2, textAlign: "center" }}>Sem dados.</Typography>
                ) : (
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={djSeries} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fill: "#9e9e9e", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#9e9e9e", fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="DJ" stroke="#1e2b48" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Paper>

              <Paper sx={BLOCK}>
                <Typography sx={{ fontWeight: "bold", color: "#11192A", fontSize: 14, mb: 2 }}>
                  Carga Corrente (CGc) · gameparameters
                </Typography>
                {!cgcSeries.length ? (
                  <Typography sx={{ color: "#9e9e9e", fontSize: 13, py: 2, textAlign: "center" }}>Sem dados.</Typography>
                ) : (
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cgcSeries} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
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
                  {pacientProfile && pacientProfile["capacities" + device]
                    ? pacientProfile["capacities" + device].respiratoryRate + " rpm"
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
        </>
      )}
    </Box>
  );
};

export default ClinicalReport;
