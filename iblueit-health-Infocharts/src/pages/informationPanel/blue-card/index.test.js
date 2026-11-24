import React from "react";
import { render, screen } from "@testing-library/react";
import BlueCard from "./index";
import GreenCard from "../green-card";
import YellowCard from "../yellow-card";
import RedCard from "../red-card";

describe("Cards coloridos do painel de informações", () => {
  it.each([
    ["azul", BlueCard],
    ["verde", GreenCard],
    ["amarelo", YellowCard],
    ["vermelho", RedCard],
  ])("o card %s exibe título, conteúdo e ícone", (_cor, Card) => {
    render(<Card title="Peso" content="70 kg" icon={<span data-testid="icone" />} />);
    expect(screen.getByText("Peso")).toBeInTheDocument();
    expect(screen.getByText("70 kg")).toBeInTheDocument();
    expect(screen.getByTestId("icone")).toBeInTheDocument();
  });
});
