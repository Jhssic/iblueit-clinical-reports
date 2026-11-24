import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "./index";

// A landing page usa scroll suave para as seções; o jsdom não implementa.
beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

const renderizar = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );

describe("Landing page (Home)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renderiza as seções principais com links de login e cadastro", () => {
    renderizar();
    expect(screen.getByAltText("logo of I Blue It")).toBeInTheDocument();
    expect(screen.getByText("Trabalhos Publicados")).toBeInTheDocument();
    expect(screen.getByText(/Versão 5.0: I Blue It Flow Psicofisiológico/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: "Sign up" })[0]).toHaveAttribute("href", "/signUp");
  });

  it("alterna o tema entre claro e escuro", () => {
    renderizar();
    expect(screen.getByTestId("ModeNightRoundedIcon")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("button to toggle theme"));
    expect(screen.getByTestId("WbSunnyRoundedIcon")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("button to toggle theme"));
    expect(screen.getByTestId("ModeNightRoundedIcon")).toBeInTheDocument();
  });

  it("rola até as seções ao clicar nos itens do menu", () => {
    renderizar();
    const barra = within(screen.getByRole("banner"));
    fireEvent.click(barra.getByText("Recursos"));
    fireEvent.click(barra.getByText("Ecossistema"));
    fireEvent.click(barra.getByText("Publicações"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(3);
    expect(window.scrollTo).toHaveBeenCalledTimes(3);
  });

  it("rola para o topo ao clicar no logo", () => {
    renderizar();
    fireEvent.click(screen.getByAltText("logo of I Blue It"));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("abre o menu lateral (mobile), navega por seção e o fecha", async () => {
    renderizar();
    fireEvent.click(screen.getByLabelText("menu"));
    const drawer = await screen.findByRole("presentation");
    fireEvent.click(within(drawer).getByLabelText("button to toggle theme"));
    expect(within(drawer).getByTestId("WbSunnyRoundedIcon")).toBeInTheDocument();
    fireEvent.click(within(drawer).getByText("Recursos"));
    fireEvent.click(within(drawer).getByText("Ecossistema"));
    fireEvent.click(within(drawer).getByText("Publicações"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("fecha o menu lateral ao clicar fora", async () => {
    renderizar();
    fireEvent.click(screen.getByLabelText("menu"));
    const drawer = await screen.findByRole("presentation");
    expect(within(drawer).getAllByRole("link", { name: "Sign up" })[0]).toHaveAttribute("href", "/signUp");
    fireEvent.click(drawer.querySelector(".MuiBackdrop-root"));
    await waitFor(() => expect(screen.queryByRole("presentation")).not.toBeInTheDocument());
  });

  it("não rola quando a seção não existe na página", () => {
    renderizar();
    document.getElementById("faq").remove();
    fireEvent.click(within(screen.getByRole("banner")).getByText("Publicações"));
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("seleciona um recurso ao clicar nos cartões de Features", () => {
    renderizar();
    const botoes = screen.getAllByRole("button", { name: /DeepDDA/ });
    botoes.forEach((b) => fireEvent.click(b));
    const chips = screen.getAllByText("Serious Exergame I Blue It");
    chips.forEach((c) => fireEvent.click(c));
    screen.getAllByText("Ler mais").forEach((l) => fireEvent.click(l));
    expect(screen.getAllByText("Serious Exergame I Blue It").length).toBeGreaterThan(0);
  });

  it("expande e recolhe as publicações do FAQ", () => {
    renderizar();
    const titulo = screen.getAllByText(/A Multimodal Software Architecture/)[0];
    const botao = titulo.closest("[role=button]");
    expect(botao).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "false");
    ["panel2d-header"].forEach((id) => {
      const b = document.getElementById(id);
      fireEvent.click(b);
      expect(b).toHaveAttribute("aria-expanded", "true");
    });
  });
});
