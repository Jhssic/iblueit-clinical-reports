import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import CalibrationHistoryPage from "./index";
import { renderWithProviders, buildContext } from "../../testUtils/renderWithProviders";
import { fetchHistory } from "../../services/api/calibration";

jest.mock("../../services/api/calibration", () => ({ fetchHistory: jest.fn() }));
// O gráfico tem teste próprio; aqui só verificamos os dados repassados.
jest.mock("../../components/calibration-graph", () => ({ exercise, data }) => (
  <div data-testid="grafico">
    {exercise}:{data.length}
  </div>
));

const escolherOpcao = (indiceSelect, textoOpcao) => {
  fireEvent.mouseDown(screen.getAllByRole("button")[indiceSelect]);
  fireEvent.click(within(screen.getByRole("listbox")).getByText(textoOpcao));
};

describe("Página de histórico de calibrações", () => {
  beforeEach(() => fetchHistory.mockReset());

  it("mostra a mensagem inicial antes de filtrar", () => {
    renderWithProviders(<CalibrationHistoryPage />);
    expect(screen.getByText("Selecione os filtros desejados.")).toBeInTheDocument();
    expect(screen.getByText("Data inicial")).toBeInTheDocument();
  });

  it("filtra pelo dispositivo e exercício escolhidos e exibe o gráfico", async () => {
    fetchHistory.mockResolvedValue([{ date: "01/01/24", value: 3 }]);
    const context = buildContext();
    renderWithProviders(<CalibrationHistoryPage />, { context });
    escolherOpcao(0, "Cinta");
    escolherOpcao(1, "Pico Expiratório");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByTestId("grafico")).toHaveTextContent("ExpiratoryPeak:1");
    expect(fetchHistory).toHaveBeenCalledWith("Cinta", "ExpiratoryPeak", "paciente-1");
    expect(context.setLoading).toHaveBeenCalledWith(true);
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
  });

  it("notifica quando não existe histórico para os filtros", async () => {
    fetchHistory.mockResolvedValue([]);
    const context = buildContext();
    renderWithProviders(<CalibrationHistoryPage />, { context });
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Não existe histórico para os filtros selecionados.")).toBeInTheDocument();
    expect(context.addNotification).toHaveBeenCalledWith(
      "error",
      "Não existe histórico para os filtros selecionados."
    );
    expect(fetchHistory).toHaveBeenCalledWith("Pitaco", "RespiratoryFrequency", "paciente-1");
  });
});
