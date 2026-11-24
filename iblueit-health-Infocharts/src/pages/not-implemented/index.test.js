import React from "react";
import { render, screen } from "@testing-library/react";
import NotImplementedPage from "./index";

describe("Página não implementada", () => {
  it("exibe o aviso de funcionalidade ainda não implementada", () => {
    render(<NotImplementedPage />);
    expect(screen.getByText("Not implemented yet!")).toBeInTheDocument();
  });
});
