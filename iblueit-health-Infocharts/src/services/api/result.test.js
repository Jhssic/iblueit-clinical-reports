import axios from "axios";
import { fetchResults, fetchPointsAndLevelsAndPlays } from "./result";
import { salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

describe("serviço de resultados da plataforma", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  it("fetchResults retorna a métrica escolhida por sessão com data formatada", async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          { playFinish: "2024-01-02T10:00:00", maxScore: 300, scoreRatio: 0.5 },
          { playFinish: "2024-01-03T10:00:00", maxScore: 500, scoreRatio: 0.8 },
        ],
      },
    });

    const resultado = await fetchResults("p1", "Pitaco", "maxScore");

    expect(axios.get).toHaveBeenCalledWith(
      `${BASE}/pacients/p1/plataforms/statistics?sort=asc&gameDevice=Pitaco`,
      { headers: { gameToken: "token-123" } }
    );
    expect(resultado).toEqual([
      { date: "02/01/24", value: 300 },
      { date: "03/01/24", value: 500 },
    ]);
  });

  it("fetchResults retorna lista vazia em caso de erro", async () => {
    axios.get.mockRejectedValue(new Error("falha"));
    await expect(fetchResults("p1", "Pitaco", "maxScore")).resolves.toEqual([]);
  });

  it("fetchPointsAndLevelsAndPlays monta os três indicadores do paciente", async () => {
    axios.get.mockResolvedValue({
      data: { data: { accumulatedScore: 1000, unlockedLevels: 5, playSessionsDone: 12 } },
    });

    const indicadores = await fetchPointsAndLevelsAndPlays("p1");

    expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients/p1`, { headers: { gameToken: "token-123" } });
    expect(indicadores).toEqual([
      { value: 1000, title: "Pontuação acumulada" },
      { value: 5, title: "Níveis desbloqueados" },
      { value: 12, title: "Seções jogadas" },
    ]);
  });

  it("fetchPointsAndLevelsAndPlays retorna undefined e registra o erro em caso de falha", async () => {
    axios.get.mockRejectedValue(new Error("falha"));
    await expect(fetchPointsAndLevelsAndPlays("p1")).resolves.toBeUndefined();
    expect(console.log).toHaveBeenCalled();
  });
});
