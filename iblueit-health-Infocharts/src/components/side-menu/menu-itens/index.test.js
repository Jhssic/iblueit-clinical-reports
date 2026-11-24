import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import MenuItens from "./index";
import { renderWithProviders } from "../../../testUtils/renderWithProviders";

const pacientes = [
  { id: "paciente-1", name: "Maria", birthDate: "2000-01-01" },
  { id: "paciente-2", name: "João", birthDate: "1995-02-02" },
];

describe("<MenuItens /> (menu lateral)", () => {
  it("usuário sem permissão não vê seleção de paciente nem itens de Sistema", () => {
    renderWithProviders(<MenuItens permission={false} patientList={[]} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Relatório Clínico")).toBeInTheDocument();
    expect(screen.queryByText("Paciente")).not.toBeInTheDocument();
    expect(screen.queryByText("Sistema")).not.toBeInTheDocument();
  });

  it("administrador vê a seleção de paciente e os itens de Sistema", () => {
    renderWithProviders(<MenuItens permission={true} patientList={pacientes} />);
    expect(screen.getByText("Paciente")).toBeInTheDocument();
    expect(screen.getByText("Sistema")).toBeInTheDocument();
    expect(screen.getByText("Sessão")).toBeInTheDocument();
    expect(screen.getByText("Conta do Paciente")).toBeInTheDocument();
  });

  it("abre apenas uma categoria por vez ao clicar nos itens", () => {
    renderWithProviders(<MenuItens permission={true} patientList={pacientes} />);
    fireEvent.click(screen.getByText("Calibração"));
    expect(screen.getByText("Instrumentos").closest("a")).toHaveAttribute("href", "/calibracao/instrumentos");

    fireEvent.click(screen.getByText("Sessão"));
    expect(screen.getByText("Recomendar").closest("a")).toHaveAttribute("href", "/gameConfiguration/create");
  });

  it("destaca o link do Relatório Clínico quando a rota atual é a dele", () => {
    renderWithProviders(<MenuItens permission={false} patientList={[]} />, { route: "/relatorio-clinico" });
    const link = screen.getByText("Relatório Clínico").closest("a");
    expect(link).toHaveAttribute("href", "/relatorio-clinico");
    expect(link).toHaveClass("Mui-selected");
  });
});
