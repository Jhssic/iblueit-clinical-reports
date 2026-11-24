import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import routes, { pathRoutes } from "./Routes";

// Cada página é substituída por um stub identificável: aqui o interesse é a
// tabela de rotas (caminhos, títulos, privacidade e componente associado).
jest.mock("../pages/home", () => () => <div data-testid="pagina-HomePage" />);
jest.mock("../pages/login", () => () => <div data-testid="pagina-LoginPage" />);
jest.mock("../pages/signUp", () => () => <div data-testid="pagina-SignUp" />);
jest.mock("../pages/layout", () => {
  const { Outlet } = require("react-router-dom");
  return () => <div data-testid="pagina-Layout"><Outlet /></div>;
});
jest.mock("../pages/calibration-history", () => () => <div data-testid="pagina-CalibrationHistoryPage" />);
jest.mock("../pages/devices", () => () => <div data-testid="pagina-DevicesPage" />);
jest.mock("../pages/shippingCode", () => () => <div data-testid="pagina-ShippingCode" />);
jest.mock("../pages/pageNotFound", () => () => <div data-testid="pagina-PageNotFound" />);
jest.mock("../pages/platform/results", () => () => <div data-testid="pagina-ResultPage" />);
jest.mock("../pages/platform/comparative", () => () => <div data-testid="pagina-ComparativePage" />);
jest.mock("../pages/patientAccount", () => () => <div data-testid="pagina-PatientAccount" />);
jest.mock("../pages/informationPanel", () => () => <div data-testid="pagina-InformationPanel" />);
jest.mock("../pages/miniGames/results", () => () => <div data-testid="pagina-MiniGamesResults" />);
jest.mock("../pages/miniGames/comparative", () => () => <div data-testid="pagina-MiniGamesComparative" />);
jest.mock("../pages/gameConfigurationCreate", () => () => <div data-testid="pagina-GameConfigurationCreatePage" />);
jest.mock("../pages/gameConfigurationDefine", () => () => <div data-testid="pagina-GameConfigurationPage" />);
jest.mock("../pages/clinicalReport", () => () => <div data-testid="pagina-ClinicalReport" />);

describe("Routes (tabela de rotas da aplicação)", () => {
  it("expõe os caminhos principais", () => {
    expect(pathRoutes.LOGIN).toBe("/login");
    expect(pathRoutes.CLINICAL_REPORT).toBe("/relatorio-clinico");
    expect(pathRoutes.INFORMATION_PANEL).toBe("/dashboard/informationPanel");
  });

  it("marca como públicas apenas home, login e cadastro", () => {
    const publicas = routes.filter((r) => !r.privated).map((r) => r.path);
    expect(publicas).toEqual([pathRoutes.HOME, pathRoutes.LOGIN, pathRoutes.SIGN_UP]);
    expect(routes[routes.length - 1].path).toBe("*");
  });

  it.each([
    [pathRoutes.HOME, "HomePage"],
    [pathRoutes.LOGIN, "LoginPage"],
    [pathRoutes.SIGN_UP, "SignUp"],
    [pathRoutes.HISTORICAL_CALIBRATION, "CalibrationHistoryPage"],
    [pathRoutes.INFORMATION_PANEL, "InformationPanel"],
    [pathRoutes.CALIBRATION_INSTRUMENTS, "DevicesPage"],
    [pathRoutes.PLATFORM_RESULTS, "ResultPage"],
    [pathRoutes.PLATFORM_COMPARATIVE, "ComparativePage"],
    [pathRoutes.LAYOUT, "Layout"],
    [pathRoutes.SHIPPING_CODE, "ShippingCode"],
    [pathRoutes.PATIENT_ACCOUNT, "PatientAccount"],
    [pathRoutes.MINI_GAMES_RESULTS, "MiniGamesResults"],
    [pathRoutes.MINI_GAMES_COMPARATIVE, "MiniGamesComparative"],
    [pathRoutes.GAME_CONFIGURATION_DEFINE, "GameConfigurationPage"],
    [pathRoutes.GAME_CONFIGURATION_CREATE, "GameConfigurationCreatePage"],
    [pathRoutes.CLINICAL_REPORT, "ClinicalReport"],
    ["*", "PageNotFound"],
  ])("a rota %s renderiza a página %s", (caminho, pagina) => {
    const rota = routes.find((r) => r.path === caminho);
    expect(rota.title).toBeTruthy();
    render(<MemoryRouter>{rota.component()}</MemoryRouter>);
    expect(screen.getByTestId(`pagina-${pagina}`)).toBeInTheDocument();
  });
});
