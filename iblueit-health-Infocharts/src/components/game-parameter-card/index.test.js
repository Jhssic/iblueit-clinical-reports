import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GameParameterCard from "./index";
import GameParameterCardHeader from "./header";
import MeasureBox from "./measure-box";

const parametroCompleto = {
  pacientName: "João",
  phase: 2,
  level: 5,
  Loops: 8,
  ObjectSpeedFactor: 1.5,
  HeightIncrement: 0.25,
  HeightUpThreshold: 4,
  HeightDownThreshold: 2,
  SizeIncrement: 0.75,
  SizeUpThreshold: 5,
  SizeDownThreshold: 1,
};

describe("<GameParameterCard />", () => {
  it("exibe o nome do paciente e os parâmetros formatados com ids indexados", () => {
    render(<GameParameterCard gameParameter={parametroCompleto} index={3} selectNeighborInformation={jest.fn()} />);
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(document.getElementById("phase3")).toHaveTextContent("2");
    expect(document.getElementById("level3")).toHaveTextContent("5");
    expect(document.getElementById("Loops3")).toHaveTextContent("8");
    expect(document.getElementById("objectSpeedFactor3")).toHaveTextContent("1.50");
    expect(document.getElementById("heightIncrement3")).toHaveTextContent("0.25");
    expect(document.getElementById("heightUpThreshold3")).toHaveTextContent("4");
    expect(document.getElementById("heightDownThreshold3")).toHaveTextContent("2");
    expect(document.getElementById("sizeIncrement3")).toHaveTextContent("0.75");
    expect(document.getElementById("sizeUpThreshold3")).toHaveTextContent("5");
    expect(document.getElementById("sizeDownThreshold3")).toHaveTextContent("1");
  });

  it("usa valores padrão e o título de média quando isAVG é verdadeiro", () => {
    render(<GameParameterCard gameParameter={{ isAVG: true }} index={0} selectNeighborInformation={jest.fn()} />);
    expect(screen.getByText("Media das Avaliações")).toBeInTheDocument();
    expect(document.getElementById("phase0")).toHaveTextContent("1");
    expect(document.getElementById("level0")).toHaveTextContent("1");
    expect(document.getElementById("Loops0")).toHaveTextContent("6");
    expect(document.getElementById("objectSpeedFactor0")).toHaveTextContent("1");
    expect(document.getElementById("heightIncrement0")).toHaveTextContent("0");
    expect(document.getElementById("heightUpThreshold0")).toHaveTextContent("6");
    expect(document.getElementById("heightDownThreshold0")).toHaveTextContent("3");
    expect(document.getElementById("sizeIncrement0")).toHaveTextContent("0");
    expect(document.getElementById("sizeUpThreshold0")).toHaveTextContent("6");
    expect(document.getElementById("sizeDownThreshold0")).toHaveTextContent("3");
  });

  it("chama selectNeighborInformation com o índice ao clicar em Copiar Perfil", () => {
    const selecionar = jest.fn();
    render(<GameParameterCard gameParameter={parametroCompleto} index={7} selectNeighborInformation={selecionar} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar Perfil" }));
    expect(selecionar).toHaveBeenCalledWith(7);
  });
});

describe("<GameParameterCardHeader /> e <MeasureBox />", () => {
  it("renderiza o título do cabeçalho", () => {
    render(<GameParameterCardHeader title="Cabeçalho" />);
    expect(screen.getByText("Cabeçalho")).toBeInTheDocument();
  });

  it("renderiza título e valor da medida com o id informado", () => {
    render(<MeasureBox isLeft title="Fase" value="3" Idname="fase-x" />);
    expect(screen.getByText("Fase")).toBeInTheDocument();
    expect(document.getElementById("fase-x")).toHaveTextContent("3");
  });
});
