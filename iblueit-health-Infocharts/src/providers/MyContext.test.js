import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MyContext, useMyContext } from "./MyContext";

// Componente consumidor que expõe o estado do contexto na tela para os testes.
const Consumidor = () => {
  const ctx = useMyContext();
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="paciente">{`${ctx.patientId || "-"}|${ctx.patientName || "-"}|${ctx.patientBirthDate || "-"}`}</span>
      <span data-testid="notificacoes">{JSON.stringify(ctx.notification || {})}</span>
      <button onClick={() => ctx.setLoading(true)}>carregar</button>
      <button onClick={() => { ctx.setPatientId("p1"); ctx.setPatientName("Ana"); ctx.setPatientBirthDate("1990-05-01"); }}>paciente</button>
      <button onClick={() => ctx.addNotification("error", "Falha A")}>notificarA</button>
      <button onClick={() => ctx.addNotification("success", "Sucesso B")}>notificarB</button>
      <button onClick={() => ctx.resetState()}>resetar</button>
    </div>
  );
};

describe("MyContext (estado global da aplicação)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const renderizar = () => render(<MyContext><Consumidor /></MyContext>);

  it("inicia sem carregamento, sem paciente e sem notificações", () => {
    renderizar();
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("paciente")).toHaveTextContent("-|-|-");
    expect(screen.getByTestId("notificacoes")).toHaveTextContent("{}");
  });

  it("atualiza loading e os dados do paciente selecionado", () => {
    renderizar();
    fireEvent.click(screen.getByText("carregar"));
    fireEvent.click(screen.getByText("paciente"));
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("paciente")).toHaveTextContent("p1|Ana|1990-05-01");
  });

  it("adiciona uma notificação e a remove automaticamente após 5 segundos", () => {
    renderizar();
    fireEvent.click(screen.getByText("notificarA"));
    expect(JSON.parse(screen.getByTestId("notificacoes").textContent)).toEqual({ 1: { type: "error", message: "Falha A" } });

    act(() => { jest.advanceTimersByTime(4999); });
    expect(screen.getByTestId("notificacoes")).toHaveTextContent("Falha A");
    act(() => { jest.advanceTimersByTime(1); });
    expect(screen.getByTestId("notificacoes")).toHaveTextContent("{}");
  });

  it("empilha notificações com índices crescentes e remove cada uma no seu tempo", () => {
    renderizar();
    fireEvent.click(screen.getByText("notificarA"));
    act(() => { jest.advanceTimersByTime(2000); });
    fireEvent.click(screen.getByText("notificarB"));
    expect(JSON.parse(screen.getByTestId("notificacoes").textContent)).toEqual({
      1: { type: "error", message: "Falha A" },
      2: { type: "success", message: "Sucesso B" },
    });

    act(() => { jest.advanceTimersByTime(3000); });
    expect(JSON.parse(screen.getByTestId("notificacoes").textContent)).toEqual({
      2: { type: "success", message: "Sucesso B" },
    });

    act(() => { jest.advanceTimersByTime(2000); });
    expect(screen.getByTestId("notificacoes")).toHaveTextContent("{}");
  });

  it("resetState limpa todo o estado", () => {
    renderizar();
    fireEvent.click(screen.getByText("carregar"));
    fireEvent.click(screen.getByText("paciente"));
    fireEvent.click(screen.getByText("notificarA"));
    fireEvent.click(screen.getByText("resetar"));
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("paciente")).toHaveTextContent("-|-|-");
    expect(screen.getByTestId("notificacoes")).toHaveTextContent("{}");
  });
});
