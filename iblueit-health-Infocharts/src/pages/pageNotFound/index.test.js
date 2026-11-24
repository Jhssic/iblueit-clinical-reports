import React from "react";
import { screen } from "@testing-library/react";
import PageNotFound from "./index";
import { renderWithProviders } from "../../testUtils/renderWithProviders";

describe("Página 404", () => {
  it("informa que a página não existe e oferece link para o painel", () => {
    renderWithProviders(<PageNotFound />, { route: "/qualquer-coisa" });
    expect(screen.getByText("404 - Página não encontrada!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar a página principal" })).toHaveAttribute(
      "href",
      "/dashboard/informationPanel"
    );
  });
});
