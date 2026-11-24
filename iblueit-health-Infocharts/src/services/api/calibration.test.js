import axios from "axios";
import { fetchDevices, fetchHistory } from "./calibration";
import { salvarCredenciais } from "../../testUtils/renderWithProviders";

jest.mock("axios");

const BASE = "http://localhost:7071/api";

describe("serviço de calibração", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    salvarCredenciais();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => console.log.mockRestore());

  it("fetchDevices monta a lista dos três dispositivos com as capacidades do paciente", async () => {
    axios.get.mockResolvedValue({
      data: {
        data: {
          capacitiesPitaco: { insPeakFlow: 10 },
          capacitiesMano: { expPeakFlow: 20 },
          capacitiesCinta: { respiratoryRate: 30 },
        },
      },
    });

    const dispositivos = await fetchDevices("p1");

    expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients/p1`, { headers: { gameToken: "token-123" } });
    expect(dispositivos).toEqual([
      { name: "Pitaco", insPeakFlow: 10 },
      { name: "Manovacuômetro", expPeakFlow: 20 },
      { name: "Cinta", respiratoryRate: 30 },
    ]);
  });

  it("fetchDevices retorna lista vazia em caso de erro", async () => {
    axios.get.mockRejectedValue(new Error("falha"));
    await expect(fetchDevices("p1")).resolves.toEqual([]);
    expect(console.log).toHaveBeenCalled();
  });

  it("fetchHistory consulta as calibrações filtrando dispositivo e exercício e formata a data", async () => {
    axios.get.mockResolvedValue({
      data: { data: [{ created_at: "2024-03-05T12:00:00", calibrationValue: 42 }] },
    });

    const historico = await fetchHistory("Pitaco", "ExpiratoryPeak", "p9");

    expect(axios.get).toHaveBeenCalledWith(
      `${BASE}/pacients/p9/calibrations?sort=asc&gameDevice=Pitaco&calibrationExercise=ExpiratoryPeak`,
      { headers: { gameToken: "token-123" } }
    );
    expect(historico).toEqual([{ date: "05/03/24", value: 42 }]);
  });

  it("fetchHistory retorna lista vazia em caso de erro", async () => {
    axios.get.mockRejectedValue(new Error("falha"));
    await expect(fetchHistory("Pitaco", "x", "p1")).resolves.toEqual([]);
  });
});
