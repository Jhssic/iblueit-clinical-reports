import React from "react";
import moment from "moment";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import MiniGamesComparative from "./index";
import { selecionarOpcao } from "../../../testUtils/muiSelect";
import { renderWithProviders, buildContext } from "../../../testUtils/renderWithProviders";
import { getMiniGameComparative } from "../../../services/api/miniGames";

jest.mock("recharts", () => require("../../../testUtils/rechartsComTooltip").buildRechartsMock());
jest.mock("../../../services/api/miniGames", () => ({
  getMiniGameComparative: jest.fn(),
}));

const anoAtual = Number(moment().format("YYYY"));
const nascimento = moment().subtract(20, "years").subtract(1, "day").format("YYYY-MM-DD");

describe("Página de comparativos dos minigames", () => {
  beforeEach(() => jest.clearAllMocks());

  it("inicia a faixa etária em ±3 anos da idade do paciente", () => {
    renderWithProviders(<MiniGamesComparative />, { context: buildContext({ patientBirthDate: nascimento }) });
    const [idadeInicial, idadeFinal] = screen.getAllByRole("spinbutton");
    expect(idadeInicial).toHaveValue(17);
    expect(idadeFinal).toHaveValue(23);
  });

  it("usa idade 1 sem data de nascimento e valida o campo de idade", () => {
    renderWithProviders(<MiniGamesComparative />, { context: buildContext({ patientBirthDate: undefined }) });
    const [idadeInicial, idadeFinal] = screen.getAllByRole("spinbutton");
    expect(idadeInicial).toHaveValue(1);
    fireEvent.change(idadeInicial, { target: { value: "12" } });
    expect(idadeInicial).toHaveValue(12);
    fireEvent.change(idadeInicial, { target: { value: "999" } });
    expect(idadeInicial).toHaveValue(12);
    fireEvent.change(idadeFinal, { target: { value: "50" } });
    fireEvent.change(idadeFinal, { target: { value: "" } });
    expect(idadeFinal).toHaveValue(1);
  });

  it("envia os filtros e exibe o gráfico de pico expiratório para Velas no Bolo", async () => {
    getMiniGameComparative.mockResolvedValue([{ x: 1 }]);
    const { context } = renderWithProviders(<MiniGamesComparative />, {
      context: buildContext({ patientBirthDate: nascimento }),
    });
    selecionarOpcao("Saudável", "Restritivo");
    selecionarOpcao("Masculino", "Feminino");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(getMiniGameComparative).toHaveBeenCalled());
    expect(getMiniGameComparative).toHaveBeenCalledWith(context, {
      condition: "Restrictive",
      sex: "Female",
      devices: "Pitaco",
      minigameName: "CakeGame",
      toBirthday: `${anoAtual - 17}-01-01`,
      fromBirthday: `${anoAtual - 23}-12-31`,
    });
    expect(await screen.findByText("Picos Expiratórios do paciente selecionado")).toBeInTheDocument();
    expect(screen.getByText("Pico Expiratório (L/min)")).toBeInTheDocument();
  });

  it("ajusta as legendas para pico inspiratório no Copo D'Água", async () => {
    getMiniGameComparative.mockResolvedValue([{ x: 1 }]);
    renderWithProviders(<MiniGamesComparative />);
    selecionarOpcao("Velas no Bolo", "Copo D'Água");
    selecionarOpcao("Pitaco", "Manovacuômetro");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Picos Inspiratório do paciente selecionado")).toBeInTheDocument();
    expect(screen.getByText("Pico Inspiratório (L/min)")).toBeInTheDocument();
    expect(getMiniGameComparative.mock.calls[0][1]).toMatchObject({ minigameName: "WaterGame", devices: "Mano" });
  });

  it("notifica quando não há histórico", async () => {
    getMiniGameComparative.mockResolvedValue([]);
    const { context } = renderWithProviders(<MiniGamesComparative />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Não existe histórico para os filtros selecionados.")).toBeInTheDocument();
    expect(context.addNotification).toHaveBeenCalledWith("error", "Não existe histórico para os filtros selecionados.");
  });

  it("mantém a tela sem gráfico quando a API falha", async () => {
    getMiniGameComparative.mockRejectedValue(new Error("erro"));
    renderWithProviders(<MiniGamesComparative />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(getMiniGameComparative).toHaveBeenCalled());
    expect(screen.getByText("Selecione os filtros desejados.")).toBeInTheDocument();
  });
});
