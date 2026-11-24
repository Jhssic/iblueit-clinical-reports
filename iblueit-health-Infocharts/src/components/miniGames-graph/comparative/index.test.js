import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MiniGamesGraphComparative from "./index";

jest.mock("recharts", () => require("../../../testUtils/rechartsComTooltip").buildRechartsMock());

const NOME_ESPERADO = "Valores esperados considerando o filtro selecionado";

describe("<MiniGamesGraphComparative />", () => {
  afterEach(() => {
    delete global.__tooltipPayload;
  });

  it("renderiza legenda customizada sem o item auxiliar expectedValues_B", () => {
    render(<MiniGamesGraphComparative tableLegend_X="Picos do paciente" tableLegend_Y="Pico (L/min)" data={[]} />);
    expect(screen.getByText(NOME_ESPERADO)).toBeInTheDocument();
    expect(screen.getByText("Picos do paciente")).toBeInTheDocument();
    expect(screen.queryByText("expectedValues_B")).not.toBeInTheDocument();
    expect(screen.getByText("Pico (L/min)")).toBeInTheDocument();
  });

  it("esconde e reexibe a faixa de valores esperados ao clicar na legenda", () => {
    render(<MiniGamesGraphComparative tableLegend_X="Picos do paciente" tableLegend_Y="Y" data={[]} />);
    const itemEsperado = screen.getByText(NOME_ESPERADO).closest("li");
    expect(itemEsperado).toHaveClass("legend");
    fireEvent.click(itemEsperado);
    expect(screen.getByText(NOME_ESPERADO).closest("li")).toHaveClass("inactive");
    // clicar no item do paciente não altera o estado
    fireEvent.click(screen.getByText("Picos do paciente").closest("li"));
    expect(screen.getByText(NOME_ESPERADO).closest("li")).toHaveClass("inactive");
    fireEvent.click(screen.getByText(NOME_ESPERADO).closest("li"));
    expect(screen.getByText(NOME_ESPERADO).closest("li")).toHaveClass("legend");
  });

  it("monta o texto do tooltip com o fluxo do paciente e a faixa esperada", () => {
    global.__tooltipPayload = {
      active: true,
      label: "3",
      payload: [
        { name: "expectedValues_B", dataKey: "expectedValues_B", value: 100 },
        { name: NOME_ESPERADO, dataKey: "expectedValues_A", value: 200 },
        { name: "Picos do paciente", dataKey: "flowValue", value: 250 },
      ],
    };
    render(<MiniGamesGraphComparative tableLegend_X="Picos do paciente" tableLegend_Y="Y" data={[]} />);
    expect(screen.getByText("Picos do paciente: 250L/min")).toBeInTheDocument();
    expect(screen.getByText(`${NOME_ESPERADO}: 100L/min - 300L/min`)).toBeInTheDocument();
  });

  it("não renderiza tooltip quando inativo", () => {
    global.__tooltipPayload = { active: false, payload: [], label: "1" };
    const { container } = render(<MiniGamesGraphComparative tableLegend_X="X" tableLegend_Y="Y" data={[]} />);
    expect(container.querySelector(".custom-tooltip")).toBeNull();
  });
});
