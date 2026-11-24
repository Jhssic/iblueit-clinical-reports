import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import ResultPage from "./index";
import { selecionarOpcao } from "../../../testUtils/muiSelect";
import { renderWithProviders, buildContext } from "../../../testUtils/renderWithProviders";
import { fetchResults, fetchPointsAndLevelsAndPlays } from "../../../services/api/result";

jest.mock("recharts", () => require("../../../testUtils/rechartsComTooltip").buildRechartsMock());
jest.mock("../../../services/api/result", () => ({
  fetchResults: jest.fn(),
  fetchPointsAndLevelsAndPlays: jest.fn(),
}));

const cardsDaApi = [
  { value: 1500, title: "Pontuação acumulada" },
  { value: 7, title: "Níveis desbloqueados" },
  { value: 12, title: "Seções jogadas" },
];

describe("Página de resultados da plataforma", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchPointsAndLevelsAndPlays.mockResolvedValue(cardsDaApi);
  });

  it("carrega os micro cards do paciente selecionado ao montar", async () => {
    const { context } = renderWithProviders(<ResultPage />);
    expect(await screen.findByText("1500")).toBeInTheDocument();
    expect(screen.getByText("NÍVEIS DESBLOQUEADOS")).toBeInTheDocument();
    expect(fetchPointsAndLevelsAndPlays).toHaveBeenCalledWith("paciente-1");
    expect(context.setLoading).toHaveBeenCalledWith(true);
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
    expect(screen.getByText("Selecione os filtros desejados.")).toBeInTheDocument();
  });

  it("não busca dados quando não há paciente selecionado", () => {
    renderWithProviders(<ResultPage />, { context: buildContext({ patientId: undefined }) });
    expect(fetchPointsAndLevelsAndPlays).not.toHaveBeenCalled();
    expect(screen.getByText("PONTUAÇÃO ACUMULADA")).toBeInTheDocument();
  });

  it("mostra cards vazios quando a API não retorna valores", async () => {
    fetchPointsAndLevelsAndPlays.mockResolvedValue(undefined);
    const { context } = renderWithProviders(<ResultPage />);
    await waitFor(() => expect(context.setLoading).toHaveBeenLastCalledWith(false));
    expect(screen.queryByText("PONTUAÇÃO ACUMULADA")).not.toBeInTheDocument();
  });

  it("filtra com dispositivo e visualização escolhidos e exibe o gráfico", async () => {
    fetchResults.mockResolvedValue([
      { date: "01/01", value: 10 },
      { date: "02/01", value: 20 },
    ]);
    const { context, container } = renderWithProviders(<ResultPage />);
    await screen.findByText("1500");

    selecionarOpcao("Pitaco", "Manovacuômetro");
    selecionarOpcao("Pontuação", "Razão");
    fireEvent.change(container.querySelectorAll('input[type="date"]')[0], { target: { value: "2024-01-01" } });
    fireEvent.change(container.querySelectorAll('input[type="date"]')[1], { target: { value: "2024-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));

    await waitFor(() => expect(fetchResults).toHaveBeenCalledWith("paciente-1", "Mano", "scoreRatio"));
    expect(await screen.findByText("Porcentagem (%)")).toBeInTheDocument();
    expect(screen.queryByText("Selecione os filtros desejados.")).not.toBeInTheDocument();
    expect(context.addNotification).not.toHaveBeenCalled();
  });

  it("notifica erro quando não há histórico para os filtros", async () => {
    fetchResults.mockResolvedValue([]);
    const { context } = renderWithProviders(<ResultPage />);
    await screen.findByText("1500");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Não existe histórico para os filtros selecionados.")).toBeInTheDocument();
    expect(fetchResults).toHaveBeenCalledWith("paciente-1", "Pitaco", "result");
    expect(context.addNotification).toHaveBeenCalledWith("error", "Não existe histórico para os filtros selecionados.");
  });
});
