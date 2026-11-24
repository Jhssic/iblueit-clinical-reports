import React from "react";
import { screen, waitFor } from "@testing-library/react";
import InformationPanel from "./index";
import { renderWithProviders, buildContext } from "../../testUtils/renderWithProviders";
import { getPatientInformation } from "../../services/api/informationPanel";

jest.mock("../../services/api/informationPanel", () => ({ getPatientInformation: jest.fn() }));

const dadosDoPaciente = [
  { fieldName: "Nome", fieldValue: "Maria Silva" },
  { fieldName: "Sexo", fieldValue: "Feminino" },
  { fieldName: "Condição", fieldValue: "Obstrutivo" },
  { fieldName: "Data de Nascimento", fieldValue: "01/02/1990" },
  { fieldName: "Peso", fieldValue: "60 kg" },
  { fieldName: "Altura", fieldValue: "165 cm" },
  { fieldName: "Observações", fieldValue: "Asma leve" },
  { fieldName: "Outro campo", fieldValue: "valor extra" },
];

describe("Painel de informações do paciente", () => {
  beforeEach(() => getPatientInformation.mockReset());

  it("não busca dados quando nenhum paciente está selecionado", () => {
    renderWithProviders(<InformationPanel />, { context: buildContext({ patientId: undefined }) });
    expect(screen.getByText("Informações gerais")).toBeInTheDocument();
    expect(getPatientInformation).not.toHaveBeenCalled();
  });

  it("exibe um card com ícone para cada informação do paciente", async () => {
    getPatientInformation.mockResolvedValue(dadosDoPaciente);
    const context = buildContext();
    renderWithProviders(<InformationPanel />, { context });
    expect(await screen.findByText("Maria Silva")).toBeInTheDocument();
    expect(getPatientInformation).toHaveBeenCalledWith(context);
    dadosDoPaciente.forEach(({ fieldName, fieldValue }) => {
      expect(screen.getByText(fieldName)).toBeInTheDocument();
      expect(screen.getByText(fieldValue)).toBeInTheDocument();
    });
    expect(screen.getByTestId("WcIcon")).toBeInTheDocument();
    expect(screen.getByTestId("ScaleIcon")).toBeInTheDocument();
    expect(screen.getByTestId("LocalHospitalIcon")).toBeInTheDocument();
    expect(screen.getByTestId("EventIcon")).toBeInTheDocument();
    expect(screen.getByTestId("ElevatorIcon")).toBeInTheDocument();
    expect(screen.getByTestId("NotesIcon")).toBeInTheDocument();
    expect(screen.getAllByTestId("PersonIcon")).toHaveLength(2);
  });

  it("continua exibindo a tela vazia quando a API falha", async () => {
    getPatientInformation.mockRejectedValue("erro");
    renderWithProviders(<InformationPanel />);
    await waitFor(() => expect(getPatientInformation).toHaveBeenCalled());
    expect(screen.queryByText("Nome")).not.toBeInTheDocument();
  });
});
