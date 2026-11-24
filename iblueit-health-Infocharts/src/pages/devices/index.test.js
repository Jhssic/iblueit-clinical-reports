import React from "react";
import { screen, waitFor } from "@testing-library/react";
import DevicesPage from "./index";
import { renderWithProviders, buildContext } from "../../testUtils/renderWithProviders";
import { fetchDevices } from "../../services/api/calibration";

jest.mock("../../services/api/calibration", () => ({ fetchDevices: jest.fn() }));

describe("Página de instrumentos calibrados", () => {
  beforeEach(() => fetchDevices.mockReset());

  it("pede para selecionar um paciente quando não há paciente", () => {
    renderWithProviders(<DevicesPage />, { context: buildContext({ patientId: undefined }) });
    expect(screen.getByText("Um paciente precisa ser selecionado!")).toBeInTheDocument();
    expect(fetchDevices).not.toHaveBeenCalled();
  });

  it("busca os dispositivos do paciente e exibe um card para cada um", async () => {
    fetchDevices.mockResolvedValue([
      {
        name: "Pitaco",
        expPeakFlow: 120.4,
        expFlowDuration: 3.6,
        insPeakFlow: 80.2,
        insFlowDuration: 2.2,
        respiratoryRate: 15.456,
      },
      { name: "Cinta" },
    ]);
    const context = buildContext();
    renderWithProviders(<DevicesPage />, { context });
    expect(screen.getByText("Instrumentos calibrados")).toBeInTheDocument();
    expect(await screen.findByText("Pitaco")).toBeInTheDocument();
    expect(fetchDevices).toHaveBeenCalledWith("paciente-1");
    expect(screen.getByText("120 L/min")).toBeInTheDocument();
    expect(screen.getByText("15.46 RPM")).toBeInTheDocument();
    expect(screen.getByText("Cinta")).toBeInTheDocument();
    await waitFor(() => expect(context.setLoading).toHaveBeenLastCalledWith(false));
    expect(context.setLoading).toHaveBeenCalledWith(true);
  });
});
