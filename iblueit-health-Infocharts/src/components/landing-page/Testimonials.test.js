import React from "react";
import { render, screen } from "@testing-library/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Testimonials from "./Testimonials";
import Pricing from "./Pricing";
import getLPTheme from "../../pages/home/getLPTheme";

// Testimonials e Pricing estão comentados na landing page, mas continuam no
// código-fonte; aqui garantimos que renderizam nos dois temas.
const comTema = (ui, mode) => render(<ThemeProvider theme={createTheme(getLPTheme(mode))}>{ui}</ThemeProvider>);

describe("Seções opcionais da landing page", () => {
  it.each(["light", "dark"])("renderiza os depoimentos no tema %s", (mode) => {
    comTema(<Testimonials />, mode);
    expect(screen.getByText("Remy Sharp")).toBeInTheDocument();
    expect(screen.getByText("Cindy Baker")).toBeInTheDocument();
  });

  it.each(["light", "dark"])("renderiza os planos de preço no tema %s", (mode) => {
    comTema(<Pricing />, mode);
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });
});
