import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MiniGamesGraphResults from "./index";

jest.mock("recharts", () => require("../../../testUtils/rechartsComTooltip").buildRechartsMock());

const dados = [
  { sessionDate: "01/01", flowValue: 100, calibration_100: 120, calibration_50: 90, calibration_25: 60 },
  { sessionDate: "02/01", flowValue: 110, calibration_100: 120, calibration_50: 90, calibration_25: 60 },
];

describe("<MiniGamesGraphResults />", () => {
  it("exibe legenda do paciente e das linhas de calibração quando typeGraph é verdadeiro", () => {
    render(<MiniGamesGraphResults data={dados} tableLegend_X="Maior pico da sessão" tableLegend_Y="Pico L/min" typeGraph />);
    expect(screen.getByText("Maior pico da sessão")).toBeInTheDocument();
    expect(screen.getByText("100% da calibração")).toBeInTheDocument();
    expect(screen.getByText("75% da calibração")).toBeInTheDocument();
    expect(screen.getByText("50% da calibração")).toBeInTheDocument();
    expect(screen.getByText("Pico L/min")).toBeInTheDocument();
  });

  it("não exibe linhas de calibração quando typeGraph é falso", () => {
    render(<MiniGamesGraphResults data={dados} tableLegend_X="Maior pico" tableLegend_Y="Y" typeGraph={false} />);
    expect(screen.getByText("Maior pico")).toBeInTheDocument();
    expect(screen.queryByText("100% da calibração")).not.toBeInTheDocument();
  });

  it("alterna a visibilidade de cada linha de calibração ao clicar na legenda", () => {
    const { container } = render(
      <MiniGamesGraphResults data={dados} tableLegend_X="Maior pico" tableLegend_Y="Y" typeGraph />
    );
    const linhasVisiveis = () => container.querySelectorAll(".recharts-line").length;
    const antes = linhasVisiveis();
    expect(antes).toBe(4);

    fireEvent.click(screen.getByText("100% da calibração"));
    fireEvent.click(screen.getByText("75% da calibração"));
    fireEvent.click(screen.getByText("50% da calibração"));
    expect(linhasVisiveis()).toBe(1);

    // clicar na linha do paciente não esconde nada
    fireEvent.click(screen.getByText("Maior pico"));
    expect(linhasVisiveis()).toBe(1);

    // clicar de novo reexibe
    fireEvent.click(screen.getByText("100% da calibração"));
    expect(linhasVisiveis()).toBe(2);
  });
});
