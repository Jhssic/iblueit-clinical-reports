import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import GameConfigurationCreatePage from "./index";
import { renderWithProviders as renderBase, buildContext } from "../../testUtils/renderWithProviders";
import { ComTema } from "../../testUtils/temaTeste";

// os campos usam color="borderInput", cor customizada do tema do app
const renderWithProviders = (ui, opts) => renderBase(<ComTema>{ui}</ComTema>, opts);
import {
  fetchGameParameterNeighbor,
  createGameParameter,
  getGameParameter,
} from "../../services/api/gameParameterNeighbor";

jest.mock("../../services/api/gameParameterNeighbor", () => ({
  fetchGameParameterNeighbor: jest.fn(),
  createGameParameter: jest.fn(),
  getGameParameter: jest.fn(),
}));

const parametroAtual = {
  phase: 2,
  stageId: 1,
  level: 3,
  Loops: 4,
  ObjectSpeedFactor: { $numberDecimal: "1.5" },
  HeightIncrement: { $numberDecimal: "0.2" },
  HeightUpThreshold: 5,
  HeightDownThreshold: 2,
  SizeIncrement: { $numberDecimal: "0.3" },
  SizeUpThreshold: 4,
  SizeDownThreshold: 1,
};

const vizinhos = [
  { pacientName: "Vizinho A", phase: 3, level: 7, Loops: 9, ObjectSpeedFactor: 2, HeightIncrement: 0.5, HeightUpThreshold: 6, HeightDownThreshold: 3, SizeIncrement: 0.4, SizeUpThreshold: 2, SizeDownThreshold: 1 },
  { isAVG: true },
];

const campo = (rotulo) => screen.getByLabelText(rotulo);

describe("Página de recomendação de parâmetros do Exergame", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getGameParameter.mockResolvedValue({ data: { data: [parametroAtual] } });
    fetchGameParameterNeighbor.mockResolvedValue({ data: { data: vizinhos } });
    createGameParameter.mockResolvedValue({});
  });

  it("pede a seleção de um paciente quando nenhum está selecionado", () => {
    renderWithProviders(<GameConfigurationCreatePage />, { context: buildContext({ patientId: undefined }) });
    expect(screen.getByText("Um paciente precisa ser selecionado!")).toBeInTheDocument();
    expect(getGameParameter).not.toHaveBeenCalled();
  });

  it("preenche o formulário com os parâmetros atuais e lista os perfis vizinhos", async () => {
    const { context } = renderWithProviders(<GameConfigurationCreatePage />);
    expect(await screen.findByText("Vizinho A")).toBeInTheDocument();
    expect(screen.getByText("Media das Avaliações")).toBeInTheDocument();
    expect(getGameParameter).toHaveBeenCalledWith("paciente-1");
    expect(fetchGameParameterNeighbor).toHaveBeenCalledWith("paciente-1");
    expect(context.setLoading).toHaveBeenCalledWith(true);
    expect(context.setLoading).toHaveBeenLastCalledWith(false);
    expect(campo(/^Fase/)).toHaveValue(2);
    expect(campo(/^Nível/)).toHaveValue(3);
    expect(campo(/^Número de Níveis/)).toHaveValue(4);
    expect(campo(/^Velocidade/)).toHaveValue(1.5);
    expect(campo(/^Degrau de Ajuste de Alvos/)).toHaveValue(0.2);
    expect(campo(/^Limiar de Sucesso em Alvos/)).toHaveValue(5);
    expect(campo(/^Limiar de Falhas em Alvos/)).toHaveValue(2);
    expect(campo(/^Degrau de Ajuste de Obstáculos/)).toHaveValue(0.3);
    expect(campo(/^Limiar de Sucesso em Obstáculos/)).toHaveValue(4);
    expect(campo(/^Limar de Falhas em Obstáculos/)).toHaveValue(1);
  });

  it("usa valores padrão quando o paciente não tem parâmetros salvos", async () => {
    getGameParameter.mockResolvedValue({ data: { data: [{}] } });
    renderWithProviders(<GameConfigurationCreatePage />);
    await screen.findByText("Vizinho A");
    expect(campo(/^Fase/)).toHaveValue(1);
    expect(campo(/^Número de Níveis/)).toHaveValue(1);
    expect(campo(/^Velocidade/)).toHaveValue(1);
    expect(campo(/^Degrau de Ajuste de Alvos/)).toHaveValue(0);
  });

  it("mantém o formulário vazio quando a API não retorna parâmetro", async () => {
    getGameParameter.mockResolvedValue({ data: { data: [] } });
    renderWithProviders(<GameConfigurationCreatePage />);
    await screen.findByText("Vizinho A");
    expect(campo(/^Fase/)).toHaveValue(null);
  });

  it("limita os valores digitados aos mínimos e máximos de cada campo", async () => {
    renderWithProviders(<GameConfigurationCreatePage />);
    await screen.findByText("Vizinho A");

    fireEvent.change(campo(/^Fase/), { target: { value: "9" } });
    expect(campo(/^Fase/)).toHaveValue(4);
    fireEvent.change(campo(/^Fase/), { target: { value: "-1" } });
    expect(campo(/^Fase/)).toHaveValue(1);
    fireEvent.change(campo(/^Fase/), { target: { value: "3" } });
    expect(campo(/^Fase/)).toHaveValue(3);
    fireEvent.change(campo(/^Fase/), { target: { value: "" } });
    expect(campo(/^Fase/)).toHaveValue(null);

    fireEvent.change(campo(/^Velocidade/), { target: { value: "10" } });
    expect(campo(/^Velocidade/)).toHaveValue(3);
    fireEvent.change(campo(/^Velocidade/), { target: { value: "0.2" } });
    expect(campo(/^Velocidade/)).toHaveValue(1);
    fireEvent.change(campo(/^Velocidade/), { target: { value: "2.345" } });
    expect(campo(/^Velocidade/)).toHaveValue(2.35);
    fireEvent.change(campo(/^Velocidade/), { target: { value: "" } });
    expect(campo(/^Velocidade/)).toHaveValue(null);

    fireEvent.change(campo(/^Nível/), { target: { value: "150" } });
    expect(campo(/^Nível/)).toHaveValue(99);
    fireEvent.change(campo(/^Número de Níveis/), { target: { value: "12" } });
    expect(campo(/^Número de Níveis/)).toHaveValue(12);
    fireEvent.change(campo(/^Degrau de Ajuste de Alvos/), { target: { value: "2" } });
    expect(campo(/^Degrau de Ajuste de Alvos/)).toHaveValue(1);
    fireEvent.change(campo(/^Limiar de Sucesso em Alvos/), { target: { value: "8" } });
    expect(campo(/^Limiar de Sucesso em Alvos/)).toHaveValue(6);
    fireEvent.change(campo(/^Limiar de Falhas em Alvos/), { target: { value: "8" } });
    expect(campo(/^Limiar de Falhas em Alvos/)).toHaveValue(3);
    fireEvent.change(campo(/^Degrau de Ajuste de Obstáculos/), { target: { value: "0.5" } });
    expect(campo(/^Degrau de Ajuste de Obstáculos/)).toHaveValue(0.5);
    fireEvent.change(campo(/^Limiar de Sucesso em Obstáculos/), { target: { value: "2" } });
    expect(campo(/^Limiar de Sucesso em Obstáculos/)).toHaveValue(2);
    fireEvent.change(campo(/^Limar de Falhas em Obstáculos/), { target: { value: "2" } });
    expect(campo(/^Limar de Falhas em Obstáculos/)).toHaveValue(2);
  });

  it("salva os parâmetros do formulário e notifica sucesso", async () => {
    const { context } = renderWithProviders(<GameConfigurationCreatePage />);
    await screen.findByText("Vizinho A");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(createGameParameter).toHaveBeenCalled());
    expect(createGameParameter).toHaveBeenCalledWith(context, {
      pacientId: "paciente-1",
      stageId: 1,
      phase: 2,
      level: 3,
      ObjectSpeedFactor: "1.5",
      HeightIncrement: "0.2",
      HeightUpThreshold: 5,
      HeightDownThreshold: 2,
      SizeIncrement: "0.3",
      SizeUpThreshold: 4,
      SizeDownThreshold: 1,
      Loops: 4,
    });
    await waitFor(() => expect(context.addNotification).toHaveBeenCalledWith("success", "Salvo com Sucesso"));
  });

  it("não notifica sucesso quando o salvamento falha", async () => {
    createGameParameter.mockRejectedValue(new Error("falha"));
    const { context } = renderWithProviders(<GameConfigurationCreatePage />);
    await screen.findByText("Vizinho A");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(createGameParameter).toHaveBeenCalled());
    expect(context.addNotification).not.toHaveBeenCalledWith("success", "Salvo com Sucesso");
  });

  it("copia o perfil de um vizinho para o formulário ao clicar em Copiar Perfil", async () => {
    // o jsdom não implementa innerText; simulamos a partir do textContent
    Object.defineProperty(HTMLElement.prototype, "innerText", {
      configurable: true,
      get() {
        return this.textContent;
      },
    });
    const { context } = renderWithProviders(<GameConfigurationCreatePage />);
    await screen.findByText("Vizinho A");
    fireEvent.click(screen.getAllByRole("button", { name: "Copiar Perfil" })[0]);
    expect(context.addNotification).toHaveBeenCalledWith("success", "Parâmetros selecionados");
    expect(campo(/^Fase/)).toHaveValue(3);
    expect(campo(/^Nível/)).toHaveValue(7);
    expect(campo(/^Número de Níveis/)).toHaveValue(9);
    expect(campo(/^Velocidade/)).toHaveValue(2);
    expect(campo(/^Degrau de Ajuste de Alvos/)).toHaveValue(0.5);
    expect(campo(/^Limiar de Sucesso em Alvos/)).toHaveValue(6);
    delete HTMLElement.prototype.innerText;
  });
});
