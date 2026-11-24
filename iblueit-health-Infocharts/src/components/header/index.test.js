import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import Header from "./index";
import { renderWithProviders, salvarCredenciais } from "../../testUtils/renderWithProviders";

describe("<Header /> (barra superior)", () => {
  beforeEach(() => salvarCredenciais({ fullname: "Maria Silva" }));

  it("mostra o nome do sistema com link para o painel e o menu da conta", () => {
    renderWithProviders(<Header offset={280} handleMenuButton={jest.fn()} />);
    expect(screen.getByText("I Blue It").closest("a")).toHaveAttribute("href", "/dashboard/informationPanel");
    expect(screen.getByAltText("Logo")).toBeInTheDocument();
    expect(screen.getByLabelText("conta do usuário atual")).toBeInTheDocument();
  });

  it("aciona o callback do botão de menu (mobile)", () => {
    const handleMenuButton = jest.fn();
    renderWithProviders(<Header offset={280} handleMenuButton={handleMenuButton} />);
    fireEvent.click(screen.getByLabelText("open drawer"));
    expect(handleMenuButton).toHaveBeenCalledTimes(1);
  });
});
