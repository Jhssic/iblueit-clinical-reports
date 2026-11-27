import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AssemblyOfRoutes from "./index";
import { salvarCredenciais } from "../../testUtils/renderWithProviders";

// Páginas substituídas por stubs: o teste valida apenas o controle de acesso
// (rotas públicas x privadas) e o título da aba.
jest.mock("../../pages/home", () => () => <div data-testid="pagina-HomePage" />);
jest.mock("../../pages/login", () => () => <div data-testid="pagina-LoginPage" />);
jest.mock("../../pages/signUp", () => () => <div data-testid="pagina-SignUp" />);
jest.mock("../../pages/layout", () => {
  const { Outlet } = require("react-router-dom");
  return () => <div data-testid="pagina-Layout"><Outlet /></div>;
});
jest.mock("../../pages/calibration-history", () => () => <div data-testid="pagina-CalibrationHistoryPage" />);
jest.mock("../../pages/devices", () => () => <div data-testid="pagina-DevicesPage" />);
jest.mock("../../pages/shippingCode", () => () => <div data-testid="pagina-ShippingCode" />);
jest.mock("../../pages/pageNotFound", () => () => <div data-testid="pagina-PageNotFound" />);
jest.mock("../../pages/platform/results", () => () => <div data-testid="pagina-ResultPage" />);
jest.mock("../../pages/platform/comparative", () => () => <div data-testid="pagina-ComparativePage" />);
jest.mock("../../pages/patientAccount", () => () => <div data-testid="pagina-PatientAccount" />);
jest.mock("../../pages/informationPanel", () => () => <div data-testid="pagina-InformationPanel" />);
jest.mock("../../pages/miniGames/results", () => () => <div data-testid="pagina-MiniGamesResults" />);
jest.mock("../../pages/miniGames/comparative", () => () => <div data-testid="pagina-MiniGamesComparative" />);
jest.mock("../../pages/gameConfigurationCreate", () => () => <div data-testid="pagina-GameConfigurationCreatePage" />);
jest.mock("../../pages/gameConfigurationDefine", () => () => <div data-testid="pagina-GameConfigurationPage" />);
jest.mock("../../pages/clinicalReport", () => () => <div data-testid="pagina-ClinicalReport" />);

const renderizarEm = (rota) =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <AssemblyOfRoutes />
    </MemoryRouter>
  );

describe("<AssemblyOfRoutes /> (controle de acesso às rotas)", () => {
  beforeEach(() => sessionStorage.clear());

  it("usuário não autenticado acessa rota pública normalmente", () => {
    renderizarEm("/login");
    expect(screen.getByTestId("pagina-LoginPage")).toBeInTheDocument();
    expect(document.title).toBe("I Blue It - Entrar");
  });

  it("usuário não autenticado é redirecionado ao login ao acessar rota privada", () => {
    renderizarEm("/relatorio-clinico");
    expect(screen.getByTestId("pagina-LoginPage")).toBeInTheDocument();
    expect(screen.queryByTestId("pagina-ClinicalReport")).not.toBeInTheDocument();
  });

  it("usuário autenticado acessa rota privada dentro do layout", () => {
    salvarCredenciais({ role: "Therapist" });
    renderizarEm("/relatorio-clinico");
    expect(screen.getByTestId("pagina-Layout")).toBeInTheDocument();
    expect(screen.getByTestId("pagina-ClinicalReport")).toBeInTheDocument();
    expect(document.title).toBe("I Blue It - Relatório Clínico");
  });

  it("administrador também acessa o relatório clínico", () => {
    salvarCredenciais({ role: "Administrator" });
    renderizarEm("/relatorio-clinico");
    expect(screen.getByTestId("pagina-ClinicalReport")).toBeInTheDocument();
  });

  it("paciente (role User) é redirecionado ao painel ao abrir o relatório clínico", () => {
    salvarCredenciais({ role: "User" });
    renderizarEm("/relatorio-clinico");
    expect(screen.queryByTestId("pagina-ClinicalReport")).not.toBeInTheDocument();
    expect(screen.getByTestId("pagina-InformationPanel")).toBeInTheDocument();
  });

  it("usuário autenticado que abre rota pública vai para o painel de informações", () => {
    salvarCredenciais();
    renderizarEm("/login");
    expect(screen.getByTestId("pagina-InformationPanel")).toBeInTheDocument();
    expect(document.title).toBe("I Blue It - Painel de Informações");
  });

  it("rota inexistente mostra a página não encontrada para usuário autenticado", () => {
    salvarCredenciais();
    renderizarEm("/rota-que-nao-existe");
    expect(screen.getByTestId("pagina-PageNotFound")).toBeInTheDocument();
  });
});
