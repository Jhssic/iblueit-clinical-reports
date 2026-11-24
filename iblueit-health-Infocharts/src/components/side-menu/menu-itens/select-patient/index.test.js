import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import SelectPatient from "./index";
import { renderWithProviders, buildContext } from "../../../../testUtils/renderWithProviders";

const pacientes = [
  { id: "paciente-1", name: "Maria", birthDate: "2000-01-01" },
  { id: "paciente-2", name: "João", birthDate: "1995-02-02" },
];

describe("<SelectPatient /> (seleção do paciente no menu)", () => {
  it("mostra o paciente atualmente selecionado no contexto", () => {
    renderWithProviders(<SelectPatient patientList={pacientes} />);
    expect(screen.getByRole("button")).toHaveTextContent("Maria");
  });

  it("ao trocar de paciente atualiza id, nome e data de nascimento no contexto", () => {
    const { context } = renderWithProviders(<SelectPatient patientList={pacientes} />);
    fireEvent.mouseDown(screen.getByRole("button"));
    fireEvent.click(within(screen.getByRole("listbox")).getByText("João"));
    expect(context.setPatientId).toHaveBeenCalledWith("paciente-2");
    expect(context.setPatientName).toHaveBeenCalledWith("João");
    expect(context.setPatientBirthDate).toHaveBeenCalledWith("1995-02-02");
  });

  it("sem paciente selecionado o campo fica vazio", () => {
    renderWithProviders(<SelectPatient patientList={pacientes} />, {
      context: buildContext({ patientId: undefined }),
    });
    expect(screen.getByRole("button")).not.toHaveTextContent("Maria");
  });
});
