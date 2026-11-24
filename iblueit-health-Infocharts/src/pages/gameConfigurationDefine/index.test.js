import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import GameConfigurationPage from "./index";
import { renderWithProviders as renderBase, buildContext } from "../../testUtils/renderWithProviders";
import { ComTema } from "../../testUtils/temaTeste";

// os campos usam color="borderInput", cor customizada do tema do app
const renderWithProviders = (ui, opts) => renderBase(<ComTema>{ui}</ComTema>, opts);
import { createGameParameter, getGameParameter } from "../../services/api/gameParameter";

jest.mock("../../services/api/gameParameter", () => ({
  createGameParameter: jest.fn(),
  getGameParameter: jest.fn(),
}));

const campo = (rotulo) => screen.getByLabelText(rotulo);

const preencher = () => {
  fireEvent.change(campo(/^Fase/), { target: { value: "2" } });
  fireEvent.change(campo(/^Nível/), { target: { value: "10" } });
  fireEvent.change(campo(/^Número de Níveis/), { target: { value: "5" } });
  fireEvent.change(campo(/^Velocidade/), { target: { value: "1.5" } });
  fireEvent.change(campo(/^Degrau de Ajuste de Alvos/), { target: { value: "0.3" } });
  fireEvent.change(campo(/^Limiar de Sucesso em Alvos/), { target: { value: "4" } });
  fireEvent.change(campo(/^Limiar de Falhas em Alvos/), { target: { value: "2" } });
  fireEvent.change(campo(/^Degrau de Ajuste de Obstáculos/), { target: { value: "0.4" } });
  fireEvent.change(campo(/^Limiar de Sucesso em Obstáculos/), { target: { value: "3" } });
  fireEvent.change(campo(/^Limar de Falhas em Obstáculos/), { target: { value: "1" } });
};

describe("Página de definição de parâmetros do Exergame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createGameParameter.mockResolvedValue({});
  });

  it("pede a seleção de um paciente quando nenhum está selecionado", () => {
    renderWithProviders(<GameConfigurationPage />, { context: buildContext({ patientId: undefined }) });
    expect(screen.getByText("Um paciente precisa ser selecionado!")).toBeInTheDocument();
  });

  it("renderiza o formulário vazio sem a seção de recomendações", () => {
    renderWithProviders(<GameConfigurationPage />);
    expect(screen.getByText("Parâmetros do Exergame para Sessão")).toBeInTheDocument();
    expect(campo(/^Fase/)).toHaveValue(null);
    expect(screen.queryByText("Recomendações de Perfis de Pacientes")).not.toBeInTheDocument();
    expect(getGameParameter).not.toHaveBeenCalled();
  });

  it("aplica limites de mínimo e máximo nos campos", () => {
    renderWithProviders(<GameConfigurationPage />);
    fireEvent.change(campo(/^Fase/), { target: { value: "7" } });
    expect(campo(/^Fase/)).toHaveValue(4);
    fireEvent.change(campo(/^Fase/), { target: { value: "0" } });
    expect(campo(/^Fase/)).toHaveValue(1);
    fireEvent.change(campo(/^Fase/), { target: { value: "" } });
    expect(campo(/^Fase/)).toHaveValue(null);
    fireEvent.change(campo(/^Fase/), { target: { value: "-3" } });
    expect(campo(/^Fase/)).toHaveValue(1);
    fireEvent.change(campo(/^Velocidade/), { target: { value: "5" } });
    expect(campo(/^Velocidade/)).toHaveValue(3);
    fireEvent.change(campo(/^Velocidade/), { target: { value: "0.5" } });
    expect(campo(/^Velocidade/)).toHaveValue(1);
    fireEvent.change(campo(/^Velocidade/), { target: { value: "" } });
    expect(campo(/^Velocidade/)).toHaveValue(null);
    fireEvent.change(campo(/^Degrau de Ajuste de Obstáculos/), { target: { value: "3" } });
    expect(campo(/^Degrau de Ajuste de Obstáculos/)).toHaveValue(1);
  });

  it("salva os parâmetros preenchidos e notifica sucesso", async () => {
    const { context } = renderWithProviders(<GameConfigurationPage />);
    preencher();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(createGameParameter).toHaveBeenCalled());
    expect(createGameParameter).toHaveBeenCalledWith(context, {
      pacientId: "paciente-1",
      stageId: 1,
      phase: "2",
      level: "10",
      ObjectSpeedFactor: "1.50",
      HeightIncrement: "0.30",
      HeightUpThreshold: "4",
      HeightDownThreshold: "2",
      SizeIncrement: "0.40",
      SizeUpThreshold: "3",
      SizeDownThreshold: "1",
      Loops: "5",
    });
    await waitFor(() => expect(context.addNotification).toHaveBeenCalledWith("success", "Salvo com Sucesso"));
  });

  it("não notifica sucesso quando o salvamento falha", async () => {
    createGameParameter.mockRejectedValue(new Error("falha"));
    const { context } = renderWithProviders(<GameConfigurationPage />);
    preencher();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(createGameParameter).toHaveBeenCalled());
    expect(context.addNotification).not.toHaveBeenCalled();
  });
});
