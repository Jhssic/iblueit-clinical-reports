import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PlatformGraphComparative from "./index";

jest.mock("recharts", () => require("../../../testUtils/rechartsComTooltip").buildRechartsMock());

const NOME_ESPERADO = "Valores esperados considerando o filtro selecionado";

const renderGrafico = (props = {}) =>
  render(
    <PlatformGraphComparative
      tableLegend_X="Picos do paciente"
      tableLegend_Y="Pico Expiratório (L/min)"
      graphData={[{}]}
      viewType={1}
      unitOfMeasurement="L/min"
      {...props}
    />
  );

describe("<PlatformGraphComparative />", () => {
  afterEach(() => {
    delete global.__tooltipPayload;
  });

  it("no modo expiratório (viewType 1) mostra faixa esperada e linha do paciente", () => {
    const { container } = renderGrafico();
    expect(screen.getByText(NOME_ESPERADO)).toBeInTheDocument();
    expect(screen.getByText("Picos do paciente")).toBeInTheDocument();
    expect(screen.getByText("Pico Expiratório (L/min)")).toBeInTheDocument();
    expect(screen.queryByText("expectedValues_B_Exp")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".recharts-area").length).toBe(2);
    expect(container.querySelectorAll(".recharts-line").length).toBe(1);
  });

  it("esconde a faixa esperada ao clicar na legenda e reexibe no segundo clique", () => {
    const { container } = renderGrafico({ viewType: 2 });
    const item = () => screen.getByText(NOME_ESPERADO).closest("li");
    const botao = () => screen.getByRole("button", { name: NOME_ESPERADO });
    expect(item()).toHaveClass("legend");
    fireEvent.click(botao());
    expect(item()).toHaveClass("inactive");
    expect(container.querySelectorAll(".recharts-area").length).toBe(0);
    fireEvent.click(botao());
    expect(item()).toHaveClass("legend");
  });

  it("no modo barras (viewType 4) mostra as três séries e permite ocultá-las pela legenda", () => {
    const { container } = renderGrafico({ viewType: 4, unitOfMeasurement: "%" });
    expect(screen.getByText("Razão Comum de Pacientes Selecionados")).toBeInTheDocument();
    expect(screen.getByText("Porcentagem máxima")).toBeInTheDocument();
    const barras = () => container.querySelectorAll(".recharts-bar").length;
    expect(barras()).toBe(3);
    fireEvent.click(screen.getByText("Razão Comum de Pacientes Selecionados").closest("button"));
    fireEvent.click(screen.getByText("Porcentagem máxima").closest("button"));
    expect(barras()).toBe(1);
    // a série do paciente não é ocultável
    fireEvent.click(screen.getByText("Picos do paciente").closest("button"));
    expect(barras()).toBe(1);
  });

  it("monta tooltip com fluxo do paciente e faixa esperada no modo expiratório", () => {
    global.__tooltipPayload = {
      active: true,
      label: "2",
      payload: [
        { name: "expectedValues_B_Exp", dataKey: "expectedValues_B_Exp", value: 100 },
        { name: NOME_ESPERADO, dataKey: "expectedValues_A_Exp", value: 150 },
        { name: "Picos do paciente", dataKey: "flowValue_Exp", value: 230 },
      ],
    };
    renderGrafico();
    expect(screen.getByText("Picos do paciente: 230L/min")).toBeInTheDocument();
    expect(screen.getByText(`${NOME_ESPERADO}: 100L/min - 250L/min`)).toBeInTheDocument();
  });

  it("mostra a razão comum dos pacientes no tooltip do modo barras", () => {
    global.__tooltipPayload = {
      active: true,
      label: "1",
      payload: [
        { name: "Picos do paciente", dataKey: "flowValue_Bar", value: 40 },
        { name: "Razão Comum", dataKey: "scoreComp", value: 55 },
      ],
    };
    renderGrafico({ viewType: 4, unitOfMeasurement: "%" });
    expect(screen.getByText("Razão comum de pacientes selecionados: 55%")).toBeInTheDocument();
  });

  it("não renderiza tooltip quando não há payload", () => {
    global.__tooltipPayload = { active: true, payload: [], label: "1" };
    const { container } = renderGrafico();
    expect(container.querySelector(".custom-tooltip")).toBeNull();
  });
});
