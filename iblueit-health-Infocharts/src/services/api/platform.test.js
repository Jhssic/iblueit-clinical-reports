import axios from "axios";
import { getPlatformComparative } from "./platform";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

const sessoes = (lista) =>
  lista.map(([maxExpFlow, maxInsFlow], i) => ({ sessionNumber: i + 1, maxExpFlow, maxInsFlow }));

const info = (lista) => lista.map(([phase, level, maxScore, scoreRatio]) => ({ phase, level, maxScore, scoreRatio }));

const dadosComparativos = [
  {
    pacientId: "p1",
    maxFlowsPerSession: sessoes([[10, 5], [12, 6], [14, 7]]),
    plataformInfo: info([[1, 1, 100, 0.5], [1, 1, 150, 0.7], [2, 3, 200, 0.9]]),
  },
  {
    pacientId: "p2",
    maxFlowsPerSession: sessoes([[8, 4], [0, 0], [11, 5], [13, 6]]),
    plataformInfo: info([[1, 1, 90, 0.4], [1, 1, 110, 0.6], [2, 3, 180, 0.8]]),
  },
  {
    pacientId: "p3",
    maxFlowsPerSession: sessoes([[7, 3], [0, 0], [9, 4], [10, 5]]),
    plataformInfo: info([[1, 2, 120, 0.3]]),
  },
];

describe("getPlatformComparative", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
  });

  it("consulta as estatísticas da plataforma com filtros e token e controla o loading", async () => {
    const context = buildContext({ patientId: "p1" });
    axios.get.mockResolvedValue({ data: { data: JSON.parse(JSON.stringify(dadosComparativos)) } });
    const filtros = { gameDevice: "Pitaco", sex: "Female" };

    const resultado = await getPlatformComparative(context, filtros, "expiratory_peak");

    expect(axios.get).toHaveBeenCalledWith(`${BASE}/plataforms/statistics`, {
      params: filtros,
      headers: { GameToken: "token-123" },
    });
    // A montagem do comparativo ainda está desativada no serviço (retorna placeholder)
    expect(resultado).toEqual([{}]);
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("tolera outros pacientes sem informações de plataforma", async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          { ...dadosComparativos[0], maxFlowsPerSession: sessoes([[10, 5]]), plataformInfo: info([[1, 1, 100, 0.5]]) },
          { pacientId: "p2", maxFlowsPerSession: [], plataformInfo: [] },
        ],
      },
    });
    await expect(getPlatformComparative(buildContext({ patientId: "p1" }), {}, "score")).resolves.toEqual([{}]);
  });

  it("retorna placeholder quando o paciente selecionado não aparece nos dados", async () => {
    const context = buildContext({ patientId: "inexistente" });
    axios.get.mockResolvedValue({ data: { data: [] } });

    await expect(getPlatformComparative(context, {}, "ratio")).resolves.toEqual([{}]);
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });

  it("retorna placeholder sem notificar quando a requisição falha", async () => {
    const context = buildContext();
    axios.get.mockRejectedValue(new Error("falha"));

    await expect(getPlatformComparative(context, {}, "score")).resolves.toEqual([{}]);
    expect(context.addNotification).not.toHaveBeenCalled();
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
