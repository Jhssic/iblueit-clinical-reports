import React from "react";
import { screen } from "@testing-library/react";
import CalibrationItem from "./index";
import { renderWithProviders } from "../../../../testUtils/renderWithProviders";

describe("<CalibrationItem />", () => {
  it("renderiza a categoria Calibração com o link para o histórico", () => {
    renderWithProviders(<CalibrationItem />, { route: "/calibracao/historico" });
    expect(screen.getByText("Calibração")).toBeInTheDocument();
    const link = screen.getByText("Histórico").closest("a");
    expect(link).toHaveAttribute("href", "/calibracao/historico");
    expect(link).toHaveClass("Mui-selected");
  });
});
