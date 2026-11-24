import React from "react";
import moment from "moment";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import PlatformComparative from "./index";
import { selecionarOpcao } from "../../../testUtils/muiSelect";
import { renderWithProviders, buildContext } from "../../../testUtils/renderWithProviders";
import { getPlatformComparative } from "../../../services/api/platform";

jest.mock("recharts", () => require("../../../testUtils/rechartsComTooltip").buildRechartsMock());
jest.mock("../../../services/api/platform", () => ({
  getPlatformComparative: jest.fn(),
}));

const anoAtual = Number(moment().format("YYYY"));
const nascimento = moment().subtract(30, "years").subtract(1, "day").format("YYYY-MM-DD");

describe("Página de comparativos da plataforma", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calcula a faixa etária inicial a partir da data de nascimento do paciente", () => {
    renderWithProviders(<PlatformComparative />, { context: buildContext({ patientBirthDate: nascimento }) });
    const [idadeInicial, idadeFinal] = screen.getAllByRole("spinbutton");
    expect(idadeInicial).toHaveValue(27);
    expect(idadeFinal).toHaveValue(33);
    expect(screen.getByText("Selecione os filtros desejados.")).toBeInTheDocument();
  });

  it("usa idade 1 quando o paciente não tem data de nascimento", () => {
    renderWithProviders(<PlatformComparative />, { context: buildContext({ patientBirthDate: undefined }) });
    const [idadeInicial, idadeFinal] = screen.getAllByRole("spinbutton");
    expect(idadeInicial).toHaveValue(1);
    expect(idadeFinal).toHaveValue(1);
  });

  it("valida o campo de idade: aceita até 2 dígitos e volta para 1 quando vazio", () => {
    renderWithProviders(<PlatformComparative />, { context: buildContext({ patientBirthDate: nascimento }) });
    const [idadeInicial, idadeFinal] = screen.getAllByRole("spinbutton");
    fireEvent.change(idadeInicial, { target: { value: "45" } });
    expect(idadeInicial).toHaveValue(45);
    fireEvent.change(idadeInicial, { target: { value: "123" } });
    expect(idadeInicial).toHaveValue(45);
    fireEvent.change(idadeFinal, { target: { value: "" } });
    expect(idadeFinal).toHaveValue(1);
  });

  it("envia os filtros escolhidos e exibe o gráfico de pico expiratório", async () => {
    getPlatformComparative.mockResolvedValue([{ x: 1 }]);
    const { context } = renderWithProviders(<PlatformComparative />, {
      context: buildContext({ patientBirthDate: nascimento }),
    });
    selecionarOpcao("Saudável", "Obstrutivo");
    selecionarOpcao("Masculino", "Feminino");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));

    await waitFor(() => expect(getPlatformComparative).toHaveBeenCalled());
    expect(getPlatformComparative).toHaveBeenCalledWith(
      context,
      {
        condition: "Obstructive",
        sex: "Female",
        devices: "Pitaco",
        toBirthday: `${anoAtual - 27}-01-01`,
        fromBirthday: `${anoAtual - 33}-12-31`,
      },
      "expiratory_peak"
    );
    expect(await screen.findByText("Pico Expiratório (L/min)")).toBeInTheDocument();
    expect(screen.getByText("Picos Expiratórios do paciente selecionado")).toBeInTheDocument();
  });

  it("ajusta legendas para pico inspiratório com o Manovacuômetro", async () => {
    getPlatformComparative.mockResolvedValue([{ x: 1 }]);
    renderWithProviders(<PlatformComparative />);
    selecionarOpcao("Pitaco", "Manovacuômetro");
    selecionarOpcao("Pico Expiratório", "Pico Inspiratório");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Picos Inspiratórios do paciente selecionado")).toBeInTheDocument();
    expect(getPlatformComparative.mock.calls[0][1].devices).toBe("Mano");
    expect(getPlatformComparative.mock.calls[0][2]).toBe("inspiratory_peak");
  });

  it("usa a unidade em cm para a Cinta", async () => {
    getPlatformComparative.mockResolvedValue([{ x: 1 }]);
    renderWithProviders(<PlatformComparative />);
    selecionarOpcao("Pitaco", "Cinta");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await screen.findByText("Picos Expiratórios do paciente selecionado");
    // a unidade é atualizada após o primeiro filtro; o segundo já usa "cm"
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Pico Expiratório (cm)")).toBeInTheDocument();
  });

  it("exibe gráfico de barras para pontuação e razão", async () => {
    getPlatformComparative.mockResolvedValue([{ x: 1 }]);
    renderWithProviders(<PlatformComparative />);
    selecionarOpcao("Pico Expiratório", "Pontuação");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Porcentagem máxima")).toBeInTheDocument();
    expect(screen.getByText("Pontuação", { selector: "tspan" })).toBeInTheDocument();

    selecionarOpcao("Pontuação", "Razão");
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Porcentagem (%)")).toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("notifica quando não há histórico para os filtros", async () => {
    getPlatformComparative.mockResolvedValue([]);
    const { context } = renderWithProviders(<PlatformComparative />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    expect(await screen.findByText("Não existe histórico para os filtros selecionados.")).toBeInTheDocument();
    expect(context.addNotification).toHaveBeenCalledWith("error", "Não existe histórico para os filtros selecionados.");
  });

  it("mantém a tela sem gráfico quando a API falha", async () => {
    getPlatformComparative.mockRejectedValue(new Error("falhou"));
    renderWithProviders(<PlatformComparative />);
    fireEvent.click(screen.getByRole("button", { name: "Filtrar" }));
    await waitFor(() => expect(getPlatformComparative).toHaveBeenCalled());
    expect(screen.getByText("Selecione os filtros desejados.")).toBeInTheDocument();
  });
});
