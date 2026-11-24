import React from "react";
import { render } from "@testing-library/react";
import CalibrationGraph from "./index";

jest.mock("recharts", () => require("../../testUtils/rechartsMock").rechartsComTamanhoFixo());

const dados = [
  { date: "01/01/24", value: 10 },
  { date: "02/01/24", value: 20 },
];

describe("<CalibrationGraph />", () => {
  it.each([
    ["ExpiratoryDuration", "Segundos"],
    ["InspiratoryDuration", "Segundos"],
    ["ExpiratoryPeak", "Litros por minuto"],
    ["InspiratoryPeak", "Litros por minuto"],
    ["maxExpFlow", "Litros por minuto"],
    ["RespiratoryFrequency", "RPM"],
    ["result", "Pontos"],
    ["scoreRatio", "Porcentagem (%)"],
  ])("usa o rótulo do eixo Y adequado para o exercício %s", (exercise, rotulo) => {
    const { container, getByText } = render(<CalibrationGraph exercise={exercise} data={dados} />);
    expect(getByText(rotulo)).toBeInTheDocument();
    expect(container.querySelector(".recharts-area")).toBeInTheDocument();
    expect(getByText("01/01/24")).toBeInTheDocument();
  });

  it("deixa o eixo Y sem rótulo quando não há exercício", () => {
    const { container } = render(<CalibrationGraph data={dados} />);
    expect(container.querySelector(".recharts-label")).toHaveTextContent(/^$/);
  });
});
