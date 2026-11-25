import axios from "axios";
import moment from "moment";
import { getGeneralStatisticsDataFromTheMiniGame, getMiniGameComparative } from "./miniGames";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";
const dia = (iso) => moment(iso).format("L");

const sessoes = [
  { created_at: "2024-01-01T10:00:00", flowDataRounds: [{ roundFlowScore: 3 }, { roundFlowScore: 8 }] },
  { created_at: "2024-01-02T10:00:00", flowDataRounds: [{ roundFlowScore: 5 }] },
];

describe("getGeneralStatisticsDataFromTheMiniGame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
  });

  it("consulta os minigames do paciente com filtros e retorna o maior fluxo por dia", async () => {
    const context = buildContext({ patientId: "p1" });
    axios.get.mockResolvedValueOnce({ data: { data: sessoes } });
    const filtros = { minigameName: "WaterGame", gameDevice: "Pitaco" };

    const grafico = await getGeneralStatisticsDataFromTheMiniGame(context, filtros, false);

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients/p1/minigames`, {
      params: { sort: "asc", ...filtros },
      headers: { GameToken: "token-123" },
    });
    expect(grafico).toEqual([
      { sessionDate: dia("2024-01-01T10:00:00"), flowValue: 8 },
      { sessionDate: dia("2024-01-02T10:00:00"), flowValue: 5 },
    ]);
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("agrupa sessões do mesmo dia em um único ponto", async () => {
    const context = buildContext();
    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          { created_at: "2024-01-01T09:00:00", flowDataRounds: [{ roundFlowScore: 2 }] },
          { created_at: "2024-01-01T15:00:00", flowDataRounds: [{ roundFlowScore: 9 }] },
        ],
      },
    });

    const grafico = await getGeneralStatisticsDataFromTheMiniGame(context, {}, false);

    expect(grafico).toHaveLength(1);
    expect(grafico[0].sessionDate).toBe(dia("2024-01-01T09:00:00"));
    expect(grafico[0].flowValue).toBe(9);
  });

  it("retorna lista vazia quando o servidor não devolve sessões", async () => {
    axios.get.mockResolvedValueOnce({ data: { data: null } });
    await expect(getGeneralStatisticsDataFromTheMiniGame(buildContext(), {}, false)).resolves.toEqual([]);
  });

  it("no gráfico com calibração (CakeGame) inclui as faixas de 100%, 75% e 50% do pico expiratório", async () => {
    const context = buildContext({ patientId: "p1" });
    axios.get
      .mockResolvedValueOnce({ data: { data: sessoes } })
      .mockResolvedValueOnce({
        data: {
          data: [
            { created_at: "2024-01-01T08:00:00", calibrationExercise: "ExpiratoryPeak", calibrationValue: 100 },
            { created_at: "2024-01-05T08:00:00", calibrationExercise: "ExpiratoryPeak", calibrationValue: 200 },
            { created_at: "2024-01-01T08:00:00", calibrationExercise: "InspiratoryPeak", calibrationValue: 999 },
          ],
        },
      });
    const filtros = { minigameName: "CakeGame" };

    const grafico = await getGeneralStatisticsDataFromTheMiniGame(context, filtros, true);

    expect(axios.get).toHaveBeenLastCalledWith(`${BASE}/pacients/p1/calibrations`, {
      params: { sort: "asc", ...filtros },
      headers: { GameToken: "token-123" },
    });
    expect(grafico).toEqual([
      { sessionDate: dia("2024-01-01T10:00:00"), flowValue: 8, calibration_100: 100, calibration_50: 75, calibration_25: 50 },
      { sessionDate: dia("2024-01-02T10:00:00"), flowValue: 5, calibration_100: undefined, calibration_50: undefined, calibration_25: undefined },
      { sessionDate: dia("2024-01-05T08:00:00"), flowValue: undefined, calibration_100: 200, calibration_50: 150, calibration_25: 100 },
    ]);
  });

  it("nos demais minigames usa o pico inspiratório e tolera calibrações vazias", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({
        data: { data: [{ created_at: "2024-02-01T08:00:00", calibrationExercise: "InspiratoryPeak", calibrationValue: 40 }] },
      });

    const grafico = await getGeneralStatisticsDataFromTheMiniGame(buildContext(), { minigameName: "WaterGame" }, true);
    expect(grafico).toEqual([
      { sessionDate: dia("2024-02-01T08:00:00"), flowValue: undefined, calibration_100: 40, calibration_50: 30, calibration_25: 20 },
    ]);

    axios.get.mockResolvedValueOnce({ data: { data: [] } }).mockResolvedValueOnce({ data: { data: null } });
    await expect(getGeneralStatisticsDataFromTheMiniGame(buildContext(), { minigameName: "WaterGame" }, true)).resolves.toEqual([]);
  });

  it("notifica o erro e desliga o loading quando a requisição falha", async () => {
    const context = buildContext();
    axios.get.mockRejectedValueOnce({ response: { data: { message: "Falha ao buscar" } } });

    await expect(getGeneralStatisticsDataFromTheMiniGame(context, {}, false)).resolves.toBeUndefined();
    expect(context.addNotification).toHaveBeenCalledWith("error", "Falha ao buscar");
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});

describe("getMiniGameComparative", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
  });

  const fluxos = (...valores) => valores.map((flow, i) => ({ sessionNumber: i + 1, flow }));

  it("consulta as estatísticas comparativas com os filtros e o token", async () => {
    const context = buildContext({ patientId: "p1" });
    axios.get.mockResolvedValue({
      data: {
        data: [
          { pacientId: "p1", maxFlows: fluxos(10, 12, 14) },
          { pacientId: "p2", maxFlows: fluxos(8, 9, 11, 13) },
          { pacientId: "p3", maxFlows: fluxos(7, 15, 9, 10) },
        ],
      },
    });
    const filtros = { minigameName: "CakeGame", sex: "Male" };

    const resultado = await getMiniGameComparative(context, filtros);

    expect(axios.get).toHaveBeenCalledWith(`${BASE}/minigames/statistics`, {
      params: filtros,
      headers: { GameToken: "token-123" },
    });
    // A montagem do comparativo ainda está desativada no serviço (retorna placeholder)
    expect(resultado).toEqual([{}]);
    expect(context.setLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("retorna placeholder quando não há dados nem paciente selecionado", async () => {
    axios.get.mockResolvedValue({ data: { data: null } });
    await expect(getMiniGameComparative(buildContext(), {})).resolves.toEqual([{}]);
  });

  it("retorna placeholder e desliga o loading quando a requisição falha", async () => {
    const context = buildContext();
    axios.get.mockRejectedValue(new Error("falha"));

    await expect(getMiniGameComparative(context, {})).resolves.toEqual([{}]);
    expect(context.addNotification).not.toHaveBeenCalled();
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });
});
