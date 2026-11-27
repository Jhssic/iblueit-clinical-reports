import axios from "axios";
import moment from "moment";
import {
  generateClinicalReport,
  fetchClinicalReportsHistory,
  archiveClinicalReport,
  deleteClinicalReport,
  fetchPacientProfile,
  PERIOD_PRESETS,
  buildPeriodFromPreset,
  getPresetRange,
  isValidCustomPeriod,
  fetchPlataformSeries,
  fetchGameParameterSeries,
  fetchAlertCriteria,
  saveAlertCriteria,
} from "./clinicalReport";
import { BaseUrl } from "../../providers/_config";

jest.mock("axios");

const BASE = BaseUrl();
const HEADERS = { headers: { gametoken: "token-123" } };

describe("services/api/clinicalReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.setItem("userCredentials", JSON.stringify({ gameToken: "token-123" }));
  });

  describe("generateClinicalReport", () => {
    it("faz POST com dispositivo e período e devolve o corpo da resposta", async () => {
      axios.post.mockResolvedValue({ data: { success: true, data: { _id: "r1" } } });
      const period = { start: "a", end: "b", label: "x" };
      const resultado = await generateClinicalReport("p1", { device: "Pitaco", period });
      expect(axios.post).toHaveBeenCalledWith(
        `${BASE}/pacients/p1/clinicalreport/generate`,
        { device: "Pitaco", period },
        HEADERS
      );
      expect(resultado).toEqual({ success: true, data: { _id: "r1" } });
    });
  });

  describe("fetchClinicalReportsHistory", () => {
    it("monta a query string com dataIni, dataFim e archived", async () => {
      axios.get.mockResolvedValue({ data: { data: [{ _id: "r1" }] } });
      const resultado = await fetchClinicalReportsHistory("p1", {
        dataIni: "2024-01-01",
        dataFim: "2024-01-31",
        archived: true,
      });
      expect(axios.get).toHaveBeenCalledWith(
        `${BASE}/pacients/p1/clinicalreport?dataIni=2024-01-01&dataFim=2024-01-31&archived=true`,
        HEADERS
      );
      expect(resultado).toEqual([{ _id: "r1" }]);
    });

    it("não adiciona query string sem filtros e devolve lista vazia sem dados", async () => {
      axios.get.mockResolvedValue({ data: {} });
      const resultado = await fetchClinicalReportsHistory("p1");
      expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients/p1/clinicalreport`, HEADERS);
      expect(resultado).toEqual([]);
    });
  });

  it("archiveClinicalReport faz PATCH na rota de arquivamento", async () => {
    axios.patch.mockResolvedValue({ data: { success: true } });
    await expect(archiveClinicalReport("p1", "r9")).resolves.toEqual({ success: true });
    expect(axios.patch).toHaveBeenCalledWith(`${BASE}/pacients/p1/clinicalreport/r9/archive`, {}, HEADERS);
  });

  it("deleteClinicalReport faz DELETE na rota do relatório", async () => {
    axios.delete.mockResolvedValue({ data: { success: true } });
    await expect(deleteClinicalReport("p1", "r9")).resolves.toEqual({ success: true });
    expect(axios.delete).toHaveBeenCalledWith(`${BASE}/pacients/p1/clinicalreport/r9`, HEADERS);
  });

  it("fetchPacientProfile devolve response.data.data", async () => {
    axios.get.mockResolvedValue({ data: { data: { name: "Maria" } } });
    await expect(fetchPacientProfile("p1")).resolves.toEqual({ name: "Maria" });
    expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients/p1`, HEADERS);
  });

  describe("buildPeriodFromPreset", () => {
    it("expõe os presets de semana, 2 semanas e mês", () => {
      expect(PERIOD_PRESETS.map((p) => p.key)).toEqual(["semana", "2semanas", "mes"]);
    });

    it("calcula período personalizado com início/fim do dia e rótulo com ano", () => {
      const periodo = buildPeriodFromPreset("personalizado", "2024-03-05", "2024-03-10");
      expect(periodo.start).toBe(moment("2024-03-05").startOf("day").toISOString());
      expect(periodo.end).toBe(moment("2024-03-10").endOf("day").toISOString());
      expect(periodo.label).toBe("05/03/2024 – 10/03/2024");
    });

    it("rótulo distingue períodos que atravessam o ano", () => {
      expect(buildPeriodFromPreset("personalizado", "2024-12-28", "2025-01-03").label).toBe(
        "28/12/2024 – 03/01/2025"
      );
    });

    it("preset de mês cobre exatamente 30 dias contando hoje", () => {
      const periodo = buildPeriodFromPreset("mes");
      const dias = moment(periodo.end).diff(moment(periodo.start), "days") + 1;
      expect(dias).toBe(30);
      expect(moment(periodo.end).isSame(moment(), "day")).toBe(true);
      expect(periodo.label).toMatch(/^\d{2}\/\d{2}\/\d{4} – \d{2}\/\d{2}\/\d{4}$/);
    });

    it("usa o primeiro preset (semana, 7 dias contando hoje) quando a chave é desconhecida", () => {
      const periodo = buildPeriodFromPreset("inexistente");
      expect(moment(periodo.end).diff(moment(periodo.start), "days") + 1).toBe(7);
    });
  });

  describe("getPresetRange / isValidCustomPeriod", () => {
    it("'Última semana' vai do início de 6 dias atrás ao fim de hoje", () => {
      const agora = moment("2024-03-10T15:00:00");
      const { start, end } = getPresetRange("semana", agora);
      expect(start.format("YYYY-MM-DD HH:mm")).toBe("2024-03-04 00:00");
      expect(end.format("YYYY-MM-DD HH:mm")).toBe("2024-03-10 23:59");
    });

    it("período personalizado exige as duas datas e início <= fim", () => {
      expect(isValidCustomPeriod("2024-03-01", "2024-03-10")).toBe(true);
      expect(isValidCustomPeriod("2024-03-10", "2024-03-10")).toBe(true);
      expect(isValidCustomPeriod("2024-03-11", "2024-03-10")).toBe(false);
      expect(isValidCustomPeriod("", "2024-03-10")).toBe(false);
    });
  });

  describe("séries para os gráficos", () => {
    it("fetchPlataformSeries mapeia playFinish e scoreRatio (DJ)", async () => {
      axios.get.mockResolvedValue({
        data: {
          data: [
            { playFinish: "2024-03-05T12:00:00Z", scoreRatio: "0.75" },
            { playFinish: "2024-03-06T12:00:00Z", scoreRatio: null },
          ],
        },
      });
      const serie = await fetchPlataformSeries("p1", "Pitaco");
      expect(axios.get).toHaveBeenCalledWith(
        `${BASE}/pacients/p1/plataforms/statistics?sort=asc&devices=Pitaco`,
        HEADERS
      );
      expect(serie[0]).toEqual({
        date: moment("2024-03-05T12:00:00Z").format("DD/MM"),
        timestamp: new Date("2024-03-05T12:00:00Z").getTime(),
        DJ: 0.75,
      });
      expect(serie[1].DJ).toBeNull();
    });

    it("fetchPlataformSeries devolve lista vazia sem dados", async () => {
      axios.get.mockResolvedValue({ data: {} });
      await expect(fetchPlataformSeries("p1", "Cinta")).resolves.toEqual([]);
    });

    it("fetchPlataformSeries envia o nome exato do dispositivo em `devices` (codificado)", async () => {
      axios.get.mockResolvedValue({ data: {} });
      await fetchPlataformSeries("p1", "Manovacuômetro");
      expect(axios.get).toHaveBeenCalledWith(
        `${BASE}/pacients/p1/plataforms/statistics?sort=asc&devices=${encodeURIComponent("Manovacuômetro")}`,
        HEADERS
      );
      expect(axios.get.mock.calls[0][0]).not.toContain("gameDevice");
    });

    it("fetchGameParameterSeries mapeia CGc e ordena por data", async () => {
      axios.get.mockResolvedValue({
        data: {
          data: [
            { created_at: "2024-03-10T00:00:00Z", ObjectSpeedFactor: 2 },
            { created_at: "2024-03-01T00:00:00Z", ObjectSpeedFactor: 1 },
          ],
        },
      });
      const serie = await fetchGameParameterSeries("p1");
      expect(axios.get).toHaveBeenCalledWith(`${BASE}/gameparameter?pacientId=p1`, HEADERS);
      expect(serie.map((s) => s.CGc)).toEqual([1, 2]);
    });

    it("fetchGameParameterSeries devolve lista vazia sem dados", async () => {
      axios.get.mockResolvedValue({ data: {} });
      await expect(fetchGameParameterSeries("p1")).resolves.toEqual([]);
    });
  });

  describe("critérios de alerta", () => {
    it("fetchAlertCriteria devolve os critérios (ou lista vazia)", async () => {
      axios.get.mockResolvedValueOnce({ data: { data: [{ metric: "DJ" }] } });
      await expect(fetchAlertCriteria("p1")).resolves.toEqual([{ metric: "DJ" }]);
      expect(axios.get).toHaveBeenCalledWith(`${BASE}/pacients/p1/alertcriteria`, HEADERS);

      axios.get.mockResolvedValueOnce({ data: {} });
      await expect(fetchAlertCriteria("p1")).resolves.toEqual([]);
    });

    it("saveAlertCriteria envia apenas metric, condition e triggerValue", async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      await saveAlertCriteria("p1", [
        { metric: "DJ", condition: "Abaixo do valor", triggerValue: 3, extra: "ignorar" },
      ]);
      expect(axios.post).toHaveBeenCalledWith(
        `${BASE}/pacients/p1/alertcriteria`,
        { criteria: [{ metric: "DJ", condition: "Abaixo do valor", triggerValue: 3 }] },
        HEADERS
      );
    });
  });
});
