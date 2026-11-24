import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LayoutPage from "./index";
import { Context } from "../../providers/MyContext";
import { buildContext, salvarCredenciais } from "../../testUtils/renderWithProviders";
import { fetchAll } from "../../services/api/patient";

jest.mock("../../services/api/patient", () => ({ fetchAll: jest.fn() }));

// Componentes filhos substituídos por versões simples: aqui testamos apenas
// a orquestração feita pelo layout (permissão, lista de pacientes, menu mobile).
jest.mock("../../components/header", () => ({ handleMenuButton }) => (
  <button onClick={handleMenuButton}>abrir menu</button>
));
jest.mock("../../components/side-menu/temporary-drawer", () => ({ open, onCloseCallback, children }) => (
  <div data-testid="drawer-temporario" data-aberto={String(open)}>
    <button onClick={onCloseCallback}>fechar menu</button>
    {children}
  </div>
));
jest.mock("../../components/side-menu/permanent-drawer", () => ({ children }) => (
  <div data-testid="drawer-permanente">{children}</div>
));
jest.mock("../../components/side-menu/menu-itens", () => ({ permission, patientList }) => (
  <div data-testid="menu-itens">
    {permission ? "admin" : "paciente"}:{patientList.map((p) => p.name).join(",")}
  </div>
));

const renderizar = (context) =>
  render(
    <Context.Provider value={context}>
      <MemoryRouter initialEntries={["/painel"]}>
        <Routes>
          <Route element={<LayoutPage />}>
            <Route path="/painel" element={<div>conteúdo da rota</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Context.Provider>
  );

describe("Layout da área logada", () => {
  beforeEach(() => {
    sessionStorage.clear();
    fetchAll.mockReset();
  });

  it("para administrador, carrega os pacientes e seleciona o primeiro", async () => {
    salvarCredenciais({ role: "Administrator" });
    fetchAll.mockResolvedValue([
      { id: "p1", name: "Ana", birthDate: "1990-01-01" },
      { id: "p2", name: "Bia", birthDate: "1991-01-01" },
    ]);
    const context = buildContext();
    renderizar(context);
    expect(screen.getByText("conteúdo da rota")).toBeInTheDocument();
    await waitFor(() => expect(context.setPatientId).toHaveBeenCalledWith("p1"));
    expect(context.setPatientName).toHaveBeenCalledWith("Ana");
    expect(context.setPatientBirthDate).toHaveBeenCalledWith("1990-01-01");
    expect(screen.getAllByTestId("menu-itens")[0]).toHaveTextContent("admin:Ana,Bia");
  });

  it("usa string vazia quando o primeiro paciente não tem dados", async () => {
    salvarCredenciais({ role: "Administrator" });
    fetchAll.mockResolvedValue([{}]);
    const context = buildContext();
    renderizar(context);
    await waitFor(() => expect(context.setPatientId).toHaveBeenCalledWith(""));
    expect(context.setPatientName).toHaveBeenCalledWith("");
  });

  it("ignora falha ao carregar pacientes", async () => {
    salvarCredenciais({ role: "Administrator" });
    fetchAll.mockRejectedValue("erro");
    const context = buildContext();
    renderizar(context);
    await waitFor(() => expect(fetchAll).toHaveBeenCalledWith(context));
    expect(context.setPatientId).not.toHaveBeenCalled();
  });

  it("para paciente, usa os próprios dados da sessão sem chamar a API", () => {
    salvarCredenciais({ role: "User", pacientId: "eu", fullname: "João" });
    const context = buildContext();
    renderizar(context);
    expect(fetchAll).not.toHaveBeenCalled();
    expect(context.setPatientId).toHaveBeenCalledWith("eu");
    expect(context.setPatientName).toHaveBeenCalledWith("João");
    expect(screen.getAllByTestId("menu-itens")[0]).toHaveTextContent("paciente:");
  });

  it("abre e fecha o menu temporário (mobile)", () => {
    salvarCredenciais({ role: "User" });
    renderizar(buildContext());
    const drawer = screen.getByTestId("drawer-temporario");
    expect(drawer).toHaveAttribute("data-aberto", "false");
    fireEvent.click(screen.getByText("abrir menu"));
    expect(drawer).toHaveAttribute("data-aberto", "true");
    fireEvent.click(screen.getByText("fechar menu"));
    expect(drawer).toHaveAttribute("data-aberto", "false");
  });
});
