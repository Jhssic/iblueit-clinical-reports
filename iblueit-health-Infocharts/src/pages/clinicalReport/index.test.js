import React from "react";
import { render, screen, fireEvent, within, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Context } from "../../providers/MyContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ClinicalReport from "./index";
import * as api from "../../services/api/clinicalReport";
import { fetchAll } from "../../services/api/patient";
import { renderWithProviders, buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../services/api/clinicalReport", () => {
  const real = jest.requireActual("../../services/api/clinicalReport");
  return {
    ...real,
    generateClinicalReport: jest.fn(),
    fetchClinicalReportsHistory: jest.fn(),
    fetchPlataformSeries: jest.fn(),
    fetchGameParameterSeries: jest.fn(),
    fetchPacientProfile: jest.fn(),
    fetchAlertCriteria: jest.fn(),
    saveAlertCriteria: jest.fn(),
    archiveClinicalReport: jest.fn(),
    deleteClinicalReport: jest.fn(),
  };
});

jest.mock("../../services/api/patient", () => ({ fetchAll: jest.fn() }));

jest.mock("jspdf", () => jest.fn());
jest.mock("jspdf-autotable", () => jest.fn());

// O ResponsiveContainer não mede nada no jsdom; renderiza o gráfico com tamanho fixo.
jest.mock("recharts", () => {
  const React = require("react");
  const real = jest.requireActual("recharts");
  return {
    ...real,
    ResponsiveContainer: ({ children }) =>
      React.cloneElement(children, { width: 800, height: 260 }),
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const relatorioCompleto = (extra = {}) => ({
  _id: "r1",
  period: { start: "2024-03-01T00:00:00.000Z", end: "2024-03-03T23:59:59.000Z", label: "01/03 – 03/03" },
  sessionCount: 4,
  device: "Pitaco",
  created_at: "2024-03-04T10:00:00.000Z",
  generatedBy: "llm",
  status: "critico",
  alerts: [
    { metric: "DJ", condition: "Deterioração consecutiva", triggerValue: 3 },
    { metric: "PJ", condition: "Queda percentual >", triggerValue: 20 },
    { metric: "EB", condition: "Abaixo do valor", triggerValue: 4 },
    { metric: "XYZ", condition: "Anomalia (IA)", triggerValue: 10 },
  ],
  coerenciaVerificada: false,
  avisosCoerencia: [{ metrica: "DJ", esperado: "queda", trechoSuspeito: "melhorou muito" }],
  currentMetrics: { DJ: 0.8, PJ: 120, CGc: 1.5, EB: 6.6 },
  previousMetrics: { DJ: 1 },
  initialMetrics: { DJ: 0.5, PJ: 100, EB: 3 },
  resumoSessao: "Resumo “com” aspas — travessão… e espaço fino, H₂O e x² e emoji 😀",
  evolucao: "Paciente evoluiu bem.",
  avisoRevisao: "Revise antes de usar.",
  missingOptionalFields: ["CGc", "SpO2min"],
  dadosBrutos: [
    { metrica: "Desempenho", sigla: "DJ", valor: 0.8123, unidade: "%", sourceCollection: "plataformoverviews" },
    { metrica: "Observação", sigla: "OBS", valor: "texto", unidade: "-", sourceCollection: "pacients" },
  ],
  ...extra,
});

const relatorioSimples = (extra = {}) => ({
  _id: "r2",
  period: { start: "2024-02-01T00:00:00.000Z", end: "2024-02-07T00:00:00.000Z", label: "01/02 – 07/02" },
  sessionCount: 2,
  device: "Cinta",
  created_at: "2024-02-08T10:00:00.000Z",
  generatedBy: "template",
  status: "estavel",
  alerts: [],
  currentMetrics: { DJ: 0.9 },
  resumoSessao: "x".repeat(150),
  avisoRevisao: "Aviso.",
  dadosBrutos: [],
  ...extra,
});

const criarDocPdf = () => ({
  internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
  setFont: jest.fn(),
  setFontSize: jest.fn(),
  setTextColor: jest.fn(),
  setFillColor: jest.fn(),
  setDrawColor: jest.fn(),
  text: jest.fn(),
  line: jest.fn(),
  rect: jest.fn(),
  roundedRect: jest.fn(),
  addPage: jest.fn(),
  getTextWidth: jest.fn(() => 40),
  // Quebra cada texto em várias linhas para forçar a paginação automática.
  splitTextToSize: jest.fn((texto) => Array.from({ length: 30 }, () => texto)),
  save: jest.fn(),
  lastAutoTable: { finalY: 300 },
});

let docPdf;

const renderizar = (contextOverrides = {}) => {
  const context = buildContext(contextOverrides);
  return renderWithProviders(<ClinicalReport />, { context });
};

const abrirAba = (nome) => fireEvent.click(screen.getByRole("tab", { name: new RegExp(nome) }));

// Com labelId ligado, o nome acessível do Select é "<rótulo> <valor>"
// (ex.: "Dispositivo Pitaco") — localiza pelo valor no fim do nome.
const selectComValor = (valorAtual) => screen.getByRole("button", { name: (nome) => nome.endsWith(valorAtual) });

const escolherNoSelect = (valorAtual, opcao) => {
  fireEvent.mouseDown(selectComValor(valorAtual));
  fireEvent.click(within(screen.getByRole("listbox")).getByText(opcao));
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  salvarCredenciais({ role: "Therapist" });
  docPdf = criarDocPdf();
  jsPDF.mockImplementation(() => docPdf);
  api.fetchClinicalReportsHistory.mockResolvedValue([]);
  api.fetchPlataformSeries.mockResolvedValue([]);
  api.fetchGameParameterSeries.mockResolvedValue([]);
  api.fetchPacientProfile.mockResolvedValue(null);
  api.fetchAlertCriteria.mockResolvedValue([]);
  fetchAll.mockResolvedValue([]);
  jest.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  window.confirm.mockRestore();
});

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("<ClinicalReport /> — estado inicial", () => {
  it("pede para selecionar um paciente quando não há paciente no contexto", async () => {
    renderizar({ patientId: undefined, patientName: undefined });
    expect(screen.getByText("Selecione um paciente na barra lateral.")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    await waitFor(() => expect(fetchAll).toHaveBeenCalled());
    expect(api.fetchClinicalReportsHistory).not.toHaveBeenCalled();
  });

  it("mostra o carregamento e depois o estado vazio, chamando todas as APIs do paciente", async () => {
    renderizar();
    expect(screen.getByText("Carregando dados do paciente...")).toBeInTheDocument();
    expect(await screen.findByText("Nenhum relatório gerado ainda para este paciente.")).toBeInTheDocument();
    expect(screen.getByText(/› Maria › Relatório Clínico/)).toBeInTheDocument();

    const ini = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    expect(api.fetchClinicalReportsHistory).toHaveBeenCalledWith("paciente-1", { dataIni: ini, dataFim: "" });
    // Relatório atual vem sem filtro de data (independe do filtro do Histórico)
    expect(api.fetchClinicalReportsHistory).toHaveBeenCalledWith("paciente-1", {});
    expect(api.fetchPlataformSeries).toHaveBeenCalledWith("paciente-1", "Pitaco");
    expect(api.fetchGameParameterSeries).toHaveBeenCalledWith("paciente-1");
    expect(api.fetchPacientProfile).toHaveBeenCalledWith("paciente-1");
    expect(api.fetchAlertCriteria).toHaveBeenCalledWith("paciente-1");
    expect(screen.queryByRole("button", { name: /Exportar PDF/ })).not.toBeInTheDocument();
  });

  it("botão 'Gerar primeiro relatório' leva à aba de geração", async () => {
    renderizar();
    fireEvent.click(await screen.findByRole("button", { name: "Gerar primeiro relatório" }));
    expect(screen.getByText("Gerar novo relatório clínico")).toBeInTheDocument();
  });

  it("falha no carregamento mostra erro com 'Tentar novamente' (não o estado vazio)", async () => {
    api.fetchClinicalReportsHistory.mockRejectedValue(new Error("falhou"));
    fetchAll.mockRejectedValue(new Error("sem pacientes"));
    const { context } = renderizar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os dados do paciente.");
    expect(screen.queryByText("Nenhum relatório gerado ainda para este paciente.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gerar primeiro relatório" })).not.toBeInTheDocument();
    expect(context.addNotification).toHaveBeenCalledWith("error", expect.stringContaining("Não foi possível carregar os dados do paciente."));
    expect(context.addNotification).toHaveBeenCalledWith("error", "Não foi possível carregar a lista de pacientes.");

    // Tentar novamente com sucesso some com o erro e mostra os dados
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioSimples()]);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Estável")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("dados que carregaram continuam visíveis quando só uma parte falha", async () => {
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioSimples()]);
    api.fetchAlertCriteria.mockRejectedValue(new Error("x"));
    renderizar();
    expect(await screen.findByText("Estável")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("<ClinicalReport /> — aba Relatório atual", () => {
  it("exibe status crítico, alertas, inconsistência, métricas, evolução e dados brutos", async () => {
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioCompleto()]);
    renderizar();

    expect(await screen.findByText(/01\/03 – 03\/03 · 4 sessão\(ões\) · Pitaco/)).toBeInTheDocument();
    expect(screen.getByText("Crítico")).toBeInTheDocument();
    expect(screen.getByText(/texto via LLM/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Alertas \(4\)/ })).toBeInTheDocument();

    // describeAlert para cada tipo de condição
    expect(screen.getByText("Alerta ativo")).toBeInTheDocument();
    expect(screen.getByText("DJ — Desempenho do Jogador: deterioração consecutiva em 3 sessões.")).toBeInTheDocument();
    expect(screen.getByText("PJ — Pontos da Jogada: queda percentual maior que 20% entre as duas últimas sessões.")).toBeInTheDocument();
    // EB: maior = pior, então "Abaixo do valor" é avaliado (e descrito) pelo lado de cima
    expect(screen.getByText("EB — Escala de Borg: acima de 4 na última sessão.")).toBeInTheDocument();
    expect(screen.getByText(/XYZ: sessão identificada como anômala pelo modelo de IA \(sensibilidade 10%\)/)).toBeInTheDocument();

    expect(screen.getByText("Possível inconsistência no texto gerado")).toBeInTheDocument();
    expect(screen.getByText(/DJ — esperado: queda · trecho: "melhorou muito"/)).toBeInTheDocument();

    // Cards: EB arredondado (inteiro), demais com 2 casas, ausentes com traço
    expect(screen.getByText("Desempenho (DJ)", { selector: "p" }).nextSibling).toHaveTextContent("0.80");
    expect(screen.getByText("Escala de Borg (EB)", { selector: "p" }).nextSibling).toHaveTextContent("7");
    expect(screen.getByText("Frequência Respiratória (FR)", { selector: "p" }).nextSibling).toHaveTextContent("—");

    // Evolução: tabela inicial x atual omite variáveis sem nenhum valor
    expect(screen.getByText("Paciente evoluiu bem.")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Avaliação inicial" })).toBeInTheDocument();
    const linhaDj = screen.getByRole("cell", { name: "Desempenho (DJ)" }).closest("tr");
    expect(within(linhaDj).getByText("0.50")).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "Pressão Expiratória Máxima (PEmax)" })).not.toBeInTheDocument();

    // FA02 — campos sem dado no período x sem fonte no ecossistema
    expect(screen.getByText(/Sem dado no período selecionado: CGc/)).toBeInTheDocument();
    expect(screen.getByText(/Sem fonte de dado no sistema atual: SpO2min/)).toBeInTheDocument();

    // Dados brutos: número formatado, texto mantido
    expect(screen.getByText("0.81")).toBeInTheDocument();
    expect(screen.getByText("texto")).toBeInTheDocument();
    expect(screen.getByText("plataformoverviews")).toBeInTheDocument();
    expect(screen.getByText("Revise antes de usar.")).toBeInTheDocument();
  });

  it("exibe o status 'Atenção' calculado pelo back-end", async () => {
    api.fetchClinicalReportsHistory.mockResolvedValue([
      relatorioSimples({ status: "atencao", currentMetrics: { DJ: 0.85 }, previousMetrics: { DJ: 1 } }),
    ]);
    renderizar();
    expect(await screen.findByText("Atenção")).toBeInTheDocument();
    expect(screen.getByText(/texto via template/)).toBeInTheDocument();
    expect(screen.queryByText("Alerta ativo")).not.toBeInTheDocument();
    expect(screen.queryByText("Evolução")).not.toBeInTheDocument();
  });

  it("exibe status 'Estável' sem período anterior para comparar", async () => {
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioSimples()]);
    renderizar();
    expect(await screen.findByText("Estável")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Alertas" })).toBeInTheDocument();
  });

  it("mostra a evolução sem tabela quando não há métricas iniciais", async () => {
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioSimples({ evolucao: "Sem baseline." })]);
    renderizar();
    expect(await screen.findByText("Sem baseline.")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Avaliação inicial" })).not.toBeInTheDocument();
  });
});

describe("<ClinicalReport /> — exportação de PDF (RF08)", () => {
  it("monta o PDF com cabeçalho, paciente, profissional, alertas, tabelas e salva o arquivo", async () => {
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioCompleto()]);
    api.fetchPacientProfile.mockResolvedValue({
      birthday: "1990-01-01",
      sex: "Female",
      condition: "Restrictive",
      weight: 60,
      height: 165,
    });
    renderizar();

    fireEvent.click(await screen.findByRole("button", { name: /Exportar PDF/ }));
    await waitFor(() => expect(docPdf.save).toHaveBeenCalledWith("relatorio-clinico-01_03_03_03.pdf"));

    expect(jsPDF).toHaveBeenCalledWith({ orientation: "portrait", unit: "pt", format: "a4" });
    const textos = docPdf.text.mock.calls.map((c) => c[0]);
    expect(textos).toContain("Relatório Clínico — I Blue It");
    expect(textos).toContain("Crítico");
    expect(textos.some((t) => /^Maria · \d+ anos · Feminino · Restritivo$/.test(t))).toBe(true);
    expect(textos).toContain("Peso/Altura: 60 kg / 165 cm");
    expect(textos).toContain("Dra. Teste · Fisioterapeuta");
    expect(textos).toContain("Alerta ativo");
    expect(textos).toContain("Possível inconsistência no texto gerado");
    expect(textos.some((t) => t.startsWith("DJ: 0.80") && t.includes("EB: 7"))).toBe(true);

    // Texto saneado para a fonte padrão do jsPDF (aspas, travessão, subscrito, emoji)
    const resumoSaneado = docPdf.splitTextToSize.mock.calls
      .map((c) => c[0])
      .find((t) => t.startsWith("Resumo"));
    expect(resumoSaneado).toBe("Resumo \"com\" aspas - travessão... e espaço fino, H2O e x2 e emoji ");

    // Paginação automática disparada pelos parágrafos longos
    expect(docPdf.addPage).toHaveBeenCalled();

    // Duas tabelas: evolução (inicial x atual) e dados brutos
    expect(autoTable).toHaveBeenCalledTimes(2);
    const tabelaEvolucao = autoTable.mock.calls[0][1];
    expect(tabelaEvolucao.head).toEqual([["Variável", "Avaliação inicial", "Estado atual"]]);
    expect(tabelaEvolucao.body[0]).toEqual(["Desempenho (DJ)", "0.50", "0.80"]);
    const tabelaBrutos = autoTable.mock.calls[1][1];
    expect(tabelaBrutos.body).toEqual([
      ["Desempenho", "DJ", "0.81", "%", "plataformoverviews"],
      ["Observação", "OBS", "texto", "-", "pacients"],
    ]);
    expect(await screen.findByRole("button", { name: /Exportar PDF/ })).toBeEnabled();
  });

  it("gera PDF de relatório estável sem perfil do paciente nem dados opcionais", async () => {
    sessionStorage.setItem("userCredentials", JSON.stringify({ gameToken: "t" }));
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioSimples({ period: { label: "" } })]);
    renderizar({ patientName: undefined });

    fireEvent.click(await screen.findByRole("button", { name: /Exportar PDF/ }));
    await waitFor(() => expect(docPdf.save).toHaveBeenCalledWith("relatorio-clinico-relatorio.pdf"));
    const textos = docPdf.text.mock.calls.map((c) => c[0]);
    expect(textos).toContain("Estável");
    expect(textos).toContain("—"); // paciente e profissional sem dados
    expect(textos).not.toContain("Alerta ativo");
    expect(autoTable).toHaveBeenCalledTimes(1);
  });

  it("notifica erro quando a geração do PDF falha", async () => {
    jsPDF.mockImplementation(() => {
      throw new Error("jsPDF quebrou");
    });
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioSimples()]);
    const { context } = renderizar();

    fireEvent.click(await screen.findByRole("button", { name: /Exportar PDF/ }));
    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith("error", "Não foi possível exportar o PDF. Tente novamente.")
    );
  });
});

describe("<ClinicalReport /> — aba Histórico", () => {
  it("lista relatórios, filtra por data, abre e arquiva", async () => {
    const r1 = relatorioCompleto();
    const r2 = relatorioSimples();
    api.fetchClinicalReportsHistory.mockResolvedValue([r1, r2]);
    api.archiveClinicalReport.mockResolvedValue({ success: true });
    const { context } = renderizar();
    await screen.findByText("Crítico");

    abrirAba("Histórico");
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("x".repeat(110) + "…")).toBeInTheDocument();

    // Filtro por data
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2024-01-01" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2024-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() =>
      expect(api.fetchClinicalReportsHistory).toHaveBeenLastCalledWith("paciente-1", {
        dataIni: "2024-01-01",
        dataFim: "2024-12-31",
      })
    );

    // Abrir o segundo relatório o torna o atual
    fireEvent.click(screen.getAllByRole("button", { name: "Abrir" })[1]);
    expect(await screen.findByText(/01\/02 – 07\/02 · 2 sessão\(ões\) · Cinta/)).toBeInTheDocument();

    // Arquivar o relatório aberto remove da lista, notifica e recarrega o atual
    abrirAba("Histórico");
    api.fetchClinicalReportsHistory.mockClear();
    api.fetchClinicalReportsHistory.mockResolvedValue([r1]);
    fireEvent.click(screen.getAllByRole("button", { name: "Arquivar" })[1]);
    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith("success", "Relatório arquivado.")
    );
    expect(api.archiveClinicalReport).toHaveBeenCalledWith("paciente-1", "r2");
    expect(screen.getAllByRole("button", { name: "Arquivar" })).toHaveLength(1);
    await waitFor(() => expect(api.fetchClinicalReportsHistory).toHaveBeenCalledWith("paciente-1", {}));
    abrirAba("Relatório atual");
    expect(await screen.findByText(/01\/03 – 03\/03 · 4 sessão\(ões\) · Pitaco/)).toBeInTheDocument();
  });

  it("notifica erro quando o arquivamento falha", async () => {
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioSimples()]);
    api.archiveClinicalReport.mockRejectedValue(new Error("x"));
    const { context } = renderizar();
    await screen.findByText("Estável");
    abrirAba("Histórico");
    fireEvent.click(screen.getByRole("button", { name: "Arquivar" }));
    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith(
        "error",
        "Não foi possível arquivar o relatório. Tente novamente."
      )
    );
    expect(screen.getByRole("button", { name: "Arquivar" })).toBeInTheDocument();
  });

  it("mostra arquivados e exclui definitivamente após confirmação (LGPD)", async () => {
    const arquivado = relatorioSimples({ _id: "arq1", resumoSessao: undefined });
    api.fetchClinicalReportsHistory.mockImplementation((_id, filtro) =>
      Promise.resolve(filtro && filtro.archived ? [arquivado] : [])
    );
    api.deleteClinicalReport.mockResolvedValue({ success: true });
    const { context } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");

    abrirAba("Histórico");
    expect(screen.getByText("Nenhum relatório gerado.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(await screen.findByText("Relatórios arquivados")).toBeInTheDocument();
    expect(api.fetchClinicalReportsHistory).toHaveBeenCalledWith("paciente-1", { archived: true });

    // Cancelar a confirmação não chama a API
    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir definitivamente" }));
    expect(api.deleteClinicalReport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Excluir definitivamente" }));
    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith("success", "Relatório excluído definitivamente.")
    );
    expect(api.deleteClinicalReport).toHaveBeenCalledWith("paciente-1", "arq1");
    expect(screen.getByText("Nenhum relatório arquivado.")).toBeInTheDocument();
  });

  it("notifica erro quando a exclusão definitiva falha", async () => {
    api.fetchClinicalReportsHistory.mockImplementation((_id, filtro) =>
      Promise.resolve(filtro && filtro.archived ? [relatorioSimples({ _id: "arq1" })] : [])
    );
    api.deleteClinicalReport.mockRejectedValue(new Error("x"));
    const { context } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Histórico");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(await screen.findByRole("button", { name: "Excluir definitivamente" }));
    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith(
        "error",
        "Não foi possível excluir o relatório. Tente novamente."
      )
    );
  });
});

describe("<ClinicalReport /> — aba Gráficos (RF07)", () => {
  it("mostra 'Sem dados' e FR '—' quando não há séries nem perfil", async () => {
    renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Gráficos");
    expect(screen.getAllByText("Sem dados.")).toHaveLength(2);
    expect(screen.getByText("Frequência Respiratória (FR) · perfil do paciente").nextSibling).toHaveTextContent("—");
  });

  it("renderiza os gráficos, filtra por período e recarrega ao trocar o dispositivo", async () => {
    const agora = Date.now();
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioCompleto()]);
    api.fetchPlataformSeries.mockResolvedValue([
      { date: "02/03", timestamp: new Date(2024, 2, 2).getTime(), DJ: 0.5 },
      { date: "hoje", timestamp: agora, DJ: 0.7 },
    ]);
    api.fetchGameParameterSeries.mockResolvedValue([
      { date: "01/01", timestamp: new Date(2020, 0, 1).getTime(), CGc: 1 },
    ]);
    api.fetchPacientProfile.mockResolvedValue({
      capacitiesPitaco: { respiratoryRate: 18 },
      capacitiesMano: { respiratoryRate: 22 },
    });
    const { container } = renderizar();
    await screen.findByText("Crítico");

    abrirAba("Gráficos");
    expect(screen.queryByText("Sem dados.")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".recharts-line").length).toBe(2);
    expect(screen.getByText("18 rpm")).toBeInTheDocument();

    // Pontos do DJ: sessão dentro de período com alerta fica vermelha e maior
    await waitFor(
      () => expect(container.querySelector('circle[fill="#d32f2f"]')).not.toBeNull(),
      { timeout: 4000 }
    );
    expect(container.querySelector('circle[fill="#1e2b48"]')).not.toBeNull();

    // Filtro "Última semana": a série de CGc (antiga) some
    escolherNoSelect("Todo o período", "Última semana");
    expect(screen.getAllByText("Sem dados.")).toHaveLength(1);

    // Trocar dispositivo recarrega a série e muda a FR de referência
    escolherNoSelect("Pitaco", "Manovacuômetro");
    await waitFor(() =>
      expect(api.fetchPlataformSeries).toHaveBeenLastCalledWith("paciente-1", "Manovacuômetro")
    );
    expect(await screen.findByText("22 rpm")).toBeInTheDocument();
  });
});

describe("<ClinicalReport /> — aba Alertas (RF10)", () => {
  it("carrega critérios salvos, edita, adiciona, remove e salva", async () => {
    api.fetchAlertCriteria.mockResolvedValue([
      { metric: "PJ", condition: "Abaixo do valor", triggerValue: 50, _id: "c1" },
    ]);
    api.saveAlertCriteria.mockResolvedValue({ success: true });
    const { context } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");

    abrirAba("Alertas");
    expect(screen.getByText("Critério 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Valor limite")).toHaveValue(50);
    fireEvent.change(screen.getByLabelText("Valor limite"), { target: { value: "40" } });

    // Troca a condição para cada variante de campo de disparo
    escolherNoSelect("Abaixo do valor", "Anomalia (IA)");
    fireEvent.change(screen.getByLabelText("Sensibilidade (%)"), { target: { value: "15" } });
    escolherNoSelect("Anomalia (IA)", "Queda percentual >");
    fireEvent.change(screen.getByLabelText("Queda mínima (%)"), { target: { value: "25" } });
    escolherNoSelect("PJ — Pontos da Jogada", "EB — Escala de Borg");

    // Adiciona um critério padrão (deterioração consecutiva) e muda o gatilho
    fireEvent.click(screen.getByRole("button", { name: "Adicionar critério" }));
    expect(screen.getByText("Critério 2")).toBeInTheDocument();
    escolherNoSelect("5 sessões", "3 sessões");

    // Adiciona e remove um terceiro
    fireEvent.click(screen.getByRole("button", { name: "Adicionar critério" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover critério 3" }));
    expect(screen.queryByText("Critério 3")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith("success", "Configuração de alertas salva com sucesso.")
    );
    expect(api.saveAlertCriteria).toHaveBeenCalledWith("paciente-1", [
      { metric: "EB", condition: "Queda percentual >", triggerValue: 25 },
      { metric: "DJ", condition: "Deterioração consecutiva", triggerValue: 3 },
    ]);
  });

  it("notifica erro quando salvar os critérios falha", async () => {
    api.saveAlertCriteria.mockRejectedValue(new Error("x"));
    const { context } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Alertas");
    // Sem critérios salvos, mantém o padrão do RN04
    expect(selectComValor("5 sessões")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith("error", "Não foi possível salvar a configuração de alertas.")
    );
    expect(screen.getByRole("button", { name: "Salvar configuração" })).toBeInTheDocument();
  });
});

describe("<ClinicalReport /> — aba Gerar relatório (RF05)", () => {
  const abrirGerar = async () => {
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Gerar relatório");
  };

  it("gera o relatório com o preset escolhido, recarrega o histórico e volta à aba atual", async () => {
    api.generateClinicalReport.mockResolvedValue({ success: true });
    const { context } = renderizar();
    await abrirGerar();

    escolherNoSelect("Última semana", "Último mês");
    escolherNoSelect("Pitaco", "Cinta");
    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));

    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith("success", "Relatório clínico gerado com sucesso.")
    );
    const [pid, payload] = api.generateClinicalReport.mock.calls[0];
    expect(pid).toBe("paciente-1");
    expect(payload.device).toBe("Cinta");
    expect(payload.period).toEqual(
      expect.objectContaining({ start: expect.any(String), end: expect.any(String), label: expect.any(String) })
    );
    expect(await screen.findByText("Nenhum relatório gerado ainda para este paciente.")).toBeInTheDocument();
    expect(fetchAll).toHaveBeenCalledTimes(2);
  });

  it("exige datas no período personalizado e envia o período correto", async () => {
    api.generateClinicalReport.mockResolvedValue({ success: true });
    const { context } = renderizar();
    await abrirGerar();

    escolherNoSelect("Última semana", "Personalizado");
    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));
    expect(context.addNotification).toHaveBeenCalledWith("error", "Selecione a data inicial e final.");
    expect(api.generateClinicalReport).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2024-03-01" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2024-03-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));
    await waitFor(() => expect(api.generateClinicalReport).toHaveBeenCalled());
    expect(api.generateClinicalReport.mock.calls[0][1].period.label).toBe("01/03/2024 – 10/03/2024");
  });

  it("recusa período personalizado com data inicial depois da final (sem chamar a API)", async () => {
    const { context } = renderizar();
    await abrirGerar();
    escolherNoSelect("Última semana", "Personalizado");
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2024-03-10" } });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2024-03-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));
    expect(context.addNotification).toHaveBeenCalledWith(
      "error",
      "A data inicial deve ser anterior ou igual à data final."
    );
    expect(api.generateClinicalReport).not.toHaveBeenCalled();
  });

  it("geração bem-sucedida seguida de falha ao recarregar mostra erro de carga, não de geração", async () => {
    const novo = relatorioSimples({ _id: "novo", period: { label: "20/11/2026 – 26/11/2026" } });
    api.generateClinicalReport.mockResolvedValue({ success: true, data: novo });
    const { context } = renderizar();
    await abrirGerar();

    api.fetchClinicalReportsHistory.mockRejectedValue(new Error("rede caiu"));
    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));

    await waitFor(() =>
      expect(context.addNotification).toHaveBeenCalledWith("success", "Relatório clínico gerado com sucesso.")
    );
    // O relatório recém-gerado aparece (vem na resposta da geração) e a falha
    // de recarga vira erro de carga com "Tentar novamente".
    expect(await screen.findByText(/20\/11\/2026 – 26\/11\/2026/)).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os dados do paciente.");
    expect(screen.queryByText(/Não foi possível gerar o relatório/)).not.toBeInTheDocument();
    expect(api.generateClinicalReport).toHaveBeenCalledTimes(1);
  });

  it("mostra a mensagem de dados insuficientes (FA01, HTTP 422)", async () => {
    api.generateClinicalReport.mockRejectedValue({
      response: { status: 422, data: { success: false, message: "Dados insuficientes no período." } },
    });
    renderizar();
    await abrirGerar();
    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));
    expect(await screen.findByText("Dados insuficientes no período.")).toBeInTheDocument();
  });

  it("mostra a mensagem da API quando a IA falha (FA03) e a mensagem padrão sem resposta", async () => {
    api.generateClinicalReport
      .mockRejectedValueOnce({ response: { data: { message: "LLM indisponível" } } })
      .mockRejectedValueOnce(new Error("rede"));
    renderizar();
    await abrirGerar();
    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));
    expect(await screen.findByText("LLM indisponível")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));
    expect(
      await screen.findByText("Não foi possível gerar o relatório agora. Tente novamente.")
    ).toBeInTheDocument();
  });

  it("exibe barra de progresso enquanto gera", async () => {
    let rejeitar;
    api.generateClinicalReport.mockReturnValue(new Promise((_, r) => (rejeitar = r)));
    renderizar();
    await abrirGerar();
    fireEvent.click(screen.getByRole("button", { name: "Processar e gerar relatório" }));
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Processar e gerar relatório" })).not.toBeInTheDocument();
    await act(async () => rejeitar({ response: { data: { message: "fim" } } }));
    expect(screen.getByText("fim")).toBeInTheDocument();
  });
});

describe("<ClinicalReport /> — aba Pacientes (RF09)", () => {
  it("informa quando não há pacientes", async () => {
    renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Pacientes");
    expect(screen.getByText("Nenhum paciente cadastrado.")).toBeInTheDocument();
  });

  it("lista pacientes com status e seleciona um paciente", async () => {
    fetchAll.mockResolvedValue([
      { id: "paciente-1", name: "Maria", condition: "Restrictive", latestReport: { alerts: [{ metric: "DJ" }] } },
      { id: "p2", name: "João", condition: null, latestReport: null, birthDate: "1980-05-05" },
      { id: "p3", name: "Ana", condition: "Asma", latestReport: { status: "estavel", alerts: [], currentMetrics: { DJ: 1 }, previousMetrics: { DJ: 1 } } },
    ]);
    const { context } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Pacientes");

    const linhaMaria = screen.getByText("Maria", { selector: "td" }).closest("tr");
    expect(within(linhaMaria).getByText("Crítico")).toBeInTheDocument();
    expect(within(linhaMaria).getByText("Restritivo")).toBeInTheDocument();
    expect(linhaMaria).toHaveClass("Mui-selected");
    const linhaJoao = screen.getByText("João").closest("tr");
    expect(within(linhaJoao).getByText("Sem dados")).toBeInTheDocument();
    expect(within(linhaJoao).getByText("—")).toBeInTheDocument();
    expect(within(screen.getByText("Ana").closest("tr")).getByText("Estável")).toBeInTheDocument();

    fireEvent.click(linhaJoao);
    expect(context.setPatientId).toHaveBeenCalledWith("p2");
    expect(context.setPatientName).toHaveBeenCalledWith("João");
    expect(context.setPatientBirthDate).toHaveBeenCalledWith("1980-05-05");
    expect(screen.getByText("Nenhum relatório gerado ainda para este paciente.")).toBeInTheDocument();
  });
});

describe("<ClinicalReport /> — correções da varredura", () => {
  const deferred = () => {
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
  };

  const montarComTroca = (pacienteInicial) => {
    const ctxA = buildContext({ patientId: pacienteInicial, patientName: "Ana" });
    const arvore = (ctx) => (
      <Context.Provider value={ctx}>
        <MemoryRouter>
          <ClinicalReport />
        </MemoryRouter>
      </Context.Provider>
    );
    const utils = render(arvore(ctxA));
    const trocarPara = (patientId, patientName) => {
      const ctxB = { ...ctxA, patientId, patientName };
      utils.rerender(arvore(ctxB));
      return ctxB;
    };
    return { ...utils, trocarPara };
  };

  it("ignora respostas atrasadas do paciente anterior e não herda critérios/perfil (corrida)", async () => {
    const histA = deferred();
    const perfilA = deferred();
    api.fetchClinicalReportsHistory.mockImplementation((id) =>
      id === "A" ? histA.promise : Promise.resolve([relatorioSimples({ _id: "rb", period: { label: "Relatório do B" } })])
    );
    api.fetchPacientProfile.mockImplementation((id) =>
      id === "A" ? perfilA.promise : Promise.resolve({ sex: "Male", condition: "Healthy" })
    );
    api.fetchAlertCriteria.mockImplementation((id) =>
      Promise.resolve(id === "A" ? [{ metric: "PJ", condition: "Abaixo do valor", triggerValue: 50 }] : [])
    );
    api.saveAlertCriteria.mockResolvedValue({ success: true });

    const { trocarPara } = montarComTroca("A");
    trocarPara("B", "Bruno");
    expect(await screen.findByText(/Relatório do B/)).toBeInTheDocument();

    // Respostas de A chegam depois — não podem sobrescrever B
    await act(async () => {
      histA.resolve([relatorioCompleto({ period: { label: "Relatório da A" } })]);
      perfilA.resolve({ sex: "Female", condition: "Obstructive" });
    });
    expect(screen.queryByText(/Relatório da A/)).not.toBeInTheDocument();
    expect(screen.getByText(/Relatório do B/)).toBeInTheDocument();

    // PDF usa nome e perfil do B
    fireEvent.click(screen.getByRole("button", { name: /Exportar PDF/ }));
    await waitFor(() => expect(docPdf.save).toHaveBeenCalled());
    const textos = docPdf.text.mock.calls.map((c) => c[0]);
    expect(textos).toContain("Bruno · Masculino · Saudável");

    // B não tem critérios: mostra o padrão e salva o padrão para o B
    abrirAba("Alertas");
    expect(selectComValor("5 sessões")).toBeInTheDocument();
    expect(screen.queryByLabelText("Valor limite")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
    await waitFor(() =>
      expect(api.saveAlertCriteria).toHaveBeenCalledWith("B", [
        { metric: "DJ", condition: "Deterioração consecutiva", triggerValue: 5 },
      ])
    );
  });

  it("limpa os dados do paciente anterior ao trocar de paciente", async () => {
    api.fetchClinicalReportsHistory.mockImplementation((id) =>
      id === "A" ? Promise.resolve([relatorioSimples({ period: { label: "Relatório da A" } })]) : new Promise(() => {})
    );
    const { trocarPara } = montarComTroca("A");
    expect(await screen.findByText(/Relatório da A/)).toBeInTheDocument();
    trocarPara("B", "Bruno");
    expect(screen.queryByText(/Relatório da A/)).not.toBeInTheDocument();
    expect(screen.getByText("Carregando dados do paciente...")).toBeInTheDocument();
    // drena as cargas do B que já resolveram
    await waitFor(() => expect(api.fetchAlertCriteria).toHaveBeenCalledWith("B"));
  });

  it("relatório atual não depende do filtro do Histórico (ex.: virada do mês)", async () => {
    const doMesPassado = relatorioSimples({ period: { label: "Relatório de 30/11" } });
    api.fetchClinicalReportsHistory.mockImplementation((_id, filtro) =>
      Promise.resolve(filtro && filtro.dataIni ? [] : [doMesPassado])
    );
    renderizar();
    expect(await screen.findByText(/Relatório de 30\/11/)).toBeInTheDocument();
    expect(screen.queryByText("Nenhum relatório gerado ainda para este paciente.")).not.toBeInTheDocument();
    abrirAba("Histórico");
    expect(screen.getByText("Nenhum relatório gerado.")).toBeInTheDocument();
  });

  it("'Filtrar' com falha mostra erro de carga em vez de rejeição não tratada", async () => {
    const { context } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Histórico");
    api.fetchClinicalReportsHistory.mockRejectedValue(new Error("x"));
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(context.addNotification).toHaveBeenCalledWith("error", expect.stringContaining("Não foi possível carregar"));
  });

  it("arquivar com 'Mostrar arquivados' ligado atualiza a lista de arquivados", async () => {
    const ativo = relatorioSimples({ _id: "ativo", period: { label: "Ativo 1" } });
    let arquivados = [];
    api.fetchClinicalReportsHistory.mockImplementation((_id, filtro) =>
      Promise.resolve(filtro && filtro.archived ? arquivados : [ativo])
    );
    api.archiveClinicalReport.mockImplementation(() => {
      arquivados = [{ ...ativo, archived: true }];
      return Promise.resolve({ success: true });
    });
    renderizar();
    await screen.findByText("Estável");
    abrirAba("Histórico");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(await screen.findByText("Nenhum relatório arquivado.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(await screen.findByRole("button", { name: "Excluir definitivamente" })).toBeInTheDocument();
    expect(screen.queryByText("Nenhum relatório arquivado.")).not.toBeInTheDocument();
  });

  it("trocar a condição do critério volta o gatilho ao padrão da nova condição", async () => {
    api.fetchAlertCriteria.mockResolvedValue([{ metric: "DJ", condition: "Queda percentual >", triggerValue: 30 }]);
    api.saveAlertCriteria.mockResolvedValue({ success: true });
    renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Alertas");
    expect(screen.getByLabelText("Queda mínima (%)")).toHaveValue(30);

    escolherNoSelect("Queda percentual >", "Deterioração consecutiva");
    expect(selectComValor("5 sessões")).toBeInTheDocument();
    escolherNoSelect("Deterioração consecutiva", "Anomalia (IA)");
    expect(screen.getByLabelText("Sensibilidade (%)")).toHaveValue(10);
    escolherNoSelect("Anomalia (IA)", "Queda percentual >");
    expect(screen.getByLabelText("Queda mínima (%)")).toHaveValue(20);
    escolherNoSelect("Queda percentual >", "Deterioração consecutiva");

    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
    await waitFor(() =>
      expect(api.saveAlertCriteria).toHaveBeenCalledWith("paciente-1", [
        { metric: "DJ", condition: "Deterioração consecutiva", triggerValue: 5 },
      ])
    );
  });

  it("valida o gatilho antes de salvar (mesmas regras do backend)", async () => {
    api.fetchAlertCriteria.mockResolvedValue([{ metric: "DJ", condition: "Anomalia (IA)", triggerValue: 10 }]);
    const { context } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Alertas");
    fireEvent.change(screen.getByLabelText("Sensibilidade (%)"), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar configuração" }));
    expect(context.addNotification).toHaveBeenCalledWith("error", "Critério 1: o percentual deve estar entre 1 e 100.");
    expect(api.saveAlertCriteria).not.toHaveBeenCalled();
  });

  it("ponto vermelho só na última sessão do período do relatório, comparando com ano", async () => {
    api.fetchClinicalReportsHistory.mockResolvedValue([relatorioCompleto()]); // período 01–03/03/2024, Pitaco
    api.fetchPlataformSeries.mockResolvedValue([
      { date: "02/03", timestamp: new Date(2023, 2, 2, 12).getTime(), DJ: 0.4 }, // mesmo DD/MM, outro ano
      { date: "01/03", timestamp: new Date(2024, 2, 1, 12).getTime(), DJ: 0.6 },
      { date: "02/03", timestamp: new Date(2024, 2, 2, 12).getTime(), DJ: 0.5 },
      { date: "10/03", timestamp: new Date(2024, 2, 10, 12).getTime(), DJ: 0.7 },
    ]);
    const { container } = renderizar();
    await screen.findByText("Crítico");
    abrirAba("Gráficos");
    await waitFor(
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- pontos do recharts (SVG) não têm papel acessível
      () => expect(container.querySelectorAll('circle[fill="#1e2b48"]').length).toBe(3),
      { timeout: 4000 }
    );
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- pontos do recharts (SVG) não têm papel acessível
    expect(container.querySelectorAll('circle[fill="#d32f2f"]')).toHaveLength(1);
  });

  it("filtro 'Última semana' dos gráficos usa 7 dias contando hoje (igual à geração)", async () => {
    const inicioDe6DiasAtras = new Date();
    inicioDe6DiasAtras.setHours(0, 0, 0, 0);
    inicioDe6DiasAtras.setDate(inicioDe6DiasAtras.getDate() - 6);
    api.fetchPlataformSeries.mockResolvedValue([
      { date: "fora", timestamp: inicioDe6DiasAtras.getTime() - 1, DJ: 0.5 },
      { date: "dentro", timestamp: inicioDe6DiasAtras.getTime(), DJ: 0.6 },
      { date: "hoje", timestamp: Date.now(), DJ: 0.7 },
    ]);
    const { container } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Gráficos");
    escolherNoSelect("Todo o período", "Última semana");
    await waitFor(
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- pontos do recharts (SVG) não têm papel acessível
      () => expect(container.querySelectorAll('circle[fill="#1e2b48"]').length).toBe(2),
      { timeout: 4000 }
    );
  });

  it("breadcrumb '← Pacientes' abre a aba Pacientes sem recarregar a página", async () => {
    renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    const breadcrumb = screen.getByRole("button", { name: "← Pacientes" });
    expect(breadcrumb.tagName).toBe("BUTTON");
    fireEvent.click(breadcrumb);
    expect(screen.getByText("Lista de pacientes")).toBeInTheDocument();
  });

  it("sem paciente selecionado mostra a lista de pacientes para escolher", async () => {
    fetchAll.mockResolvedValue([{ id: "p2", name: "João" }]);
    renderizar({ patientId: undefined, patientName: undefined });
    expect(await screen.findByText("João")).toBeInTheDocument();
  });

  it("linhas da aba Pacientes funcionam pelo teclado (Enter/Espaço) e têm rótulo", async () => {
    fetchAll.mockResolvedValue([
      { id: "p2", name: "João", latestReport: null, birthDate: "1980-05-05" },
      { id: "p3", name: "Ana", latestReport: { alerts: [{ metric: "DJ" }] } },
    ]);
    const { context } = renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Pacientes");
    const linhaJoao = screen.getByRole("button", { name: "Abrir relatório clínico de João" });
    expect(linhaJoao).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(linhaJoao, { key: "Enter" });
    expect(context.setPatientId).toHaveBeenCalledWith("p2");

    abrirAba("Pacientes");
    fireEvent.keyDown(screen.getByRole("button", { name: "Abrir relatório clínico de Ana (status: Crítico)" }), { key: " " });
    expect(context.setPatientId).toHaveBeenCalledWith("p3");
  });

  it("selects anunciam o rótulo (InputLabel ligado por labelId)", async () => {
    renderizar();
    await screen.findByText("Nenhum relatório gerado ainda para este paciente.");
    abrirAba("Gerar relatório");
    expect(screen.getByRole("button", { name: "Período de referência Última semana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dispositivo Pitaco" })).toBeInTheDocument();
    abrirAba("Alertas");
    expect(screen.getByRole("button", { name: "Métrica DJ — Desempenho do Jogador" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Condição Deterioração consecutiva" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disparar após 5 sessões" })).toBeInTheDocument();
  });
});
