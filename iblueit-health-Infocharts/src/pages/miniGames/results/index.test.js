import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import MiniGamesResults from "./index";
import { selecionarOpcao } from "../../../testUtils/muiSelect";
import { renderWithProviders } from "../../../testUtils/renderWithProviders";
import { getGeneralStatisticsDataFromTheMiniGame } from "../../../services/api/miniGames";

jest.mock("recharts", () => require("../../../testUtils/rechartsComTooltip").buildRechartsMock());
jest.mock("../../../services/api/miniGames", () => ({
  getGeneralStatisticsDataFromTheMiniGame: jest.fn(),
}));

const dadosGrafico = [{ sessionDate: "01/01", flowValue: 100, calibration_100: 120 }];

describe("Página de estatísticas gerais dos minigames", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renderiza os filtros com valores padrão e campos de data desabilitados", () => {
    const { container } = renderWithProviders(<MiniGamesResults />);
    expect(screen.getByText("MiniGames - Estatísticas Gerais")).toBeInTheDocument();
    expect(screen.getByText("Velas no Bolo")).toBeInTheDocument();
    expect(screen.getByText("Apresentar")).toBeInTheDocument();
    container.querySelectorAll('input[type="date"]').forEach((el) => expect(el).toBeDisabled());
    expect(screen.getByText("Selecione os filtros desejados.")).toBeInTheDocument();
  });

  it("busca estatísticas com calibração e exibe o gráfico de pico expiratório", async () => {
    getGeneralStatisticsDataFromTheMiniGame.mockResolvedValue(dadosGrafico);
    const { context } = renderWithProviders(<MiniGamesResults />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() =>
      expect(getGeneralStatisticsDataFromTheMiniGame).toHaveBeenCalledWith(
        context,
        { devices: "Pitaco", minigameName: "CakeGame" },
        true
      )
    );
    expect(await screen.findByText("Pico Expiratório L/min")).toBeInTheDocument();
    expect(screen.getByText("100% da calibração")).toBeInTheDocument();
  });

  it("para o Copo D'Água sem calibração mostra pico inspiratório sem linhas de calibração", async () => {
    getGeneralStatisticsDataFromTheMiniGame.mockResolvedValue(dadosGrafico);
    renderWithProviders(<MiniGamesResults />);
    selecionarOpcao("Velas no Bolo", "Copo D'Água");
    selecionarOpcao("Apresentar", "Não Apresentar");
    selecionarOpcao("Pitaco", "Cinta");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Pico Inspiratório L/min")).toBeInTheDocument();
    expect(getGeneralStatisticsDataFromTheMiniGame.mock.calls[0][1]).toEqual({ devices: "Cinta", minigameName: "WaterGame" });
    expect(getGeneralStatisticsDataFromTheMiniGame.mock.calls[0][2]).toBe(false);
    expect(screen.queryByText("100% da calibração")).not.toBeInTheDocument();
  });

  it("envia o período formatado quando as duas datas são informadas", async () => {
    getGeneralStatisticsDataFromTheMiniGame.mockResolvedValue(dadosGrafico);
    const { container } = renderWithProviders(<MiniGamesResults />);
    const [inicio, fim] = container.querySelectorAll('input[type="date"]');
    fireEvent.change(inicio, { target: { value: "2024-01-10" } });
    fireEvent.change(fim, { target: { value: "2024-02-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(getGeneralStatisticsDataFromTheMiniGame).toHaveBeenCalled());
    expect(getGeneralStatisticsDataFromTheMiniGame.mock.calls[0][1]).toEqual({
      devices: "Pitaco",
      minigameName: "CakeGame",
      dataIni: "10-01-2024",
      dataFim: "20-02-2024",
    });
  });

  it("bloqueia a busca quando a data final é anterior à inicial", async () => {
    const { context, container } = renderWithProviders(<MiniGamesResults />);
    const [inicio, fim] = container.querySelectorAll('input[type="date"]');
    fireEvent.change(inicio, { target: { value: "2024-03-10" } });
    fireEvent.change(fim, { target: { value: "2024-02-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(context.addNotification).toHaveBeenCalledWith("error", "A data final não pode ser menor do que a data inicial!");
    expect(getGeneralStatisticsDataFromTheMiniGame).not.toHaveBeenCalled();
  });

  it("notifica quando não há histórico", async () => {
    getGeneralStatisticsDataFromTheMiniGame.mockResolvedValue([]);
    const { context } = renderWithProviders(<MiniGamesResults />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Não existe histórico para os filtros selecionados.")).toBeInTheDocument();
    expect(context.addNotification).toHaveBeenCalledWith("error", "Não existe histórico para os filtros selecionados.");
  });

  it("mantém a tela sem gráfico quando a API falha", async () => {
    getGeneralStatisticsDataFromTheMiniGame.mockRejectedValue(new Error("erro"));
    renderWithProviders(<MiniGamesResults />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(getGeneralStatisticsDataFromTheMiniGame).toHaveBeenCalled());
    expect(screen.getByText("Selecione os filtros desejados.")).toBeInTheDocument();
  });
});
