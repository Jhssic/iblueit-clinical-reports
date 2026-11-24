import React from "react";
import { render, screen } from "@testing-library/react";
import DeviceCard from "./index";

describe("<DeviceCard />", () => {
  it("formata as medidas de calibração do dispositivo", () => {
    render(
      <DeviceCard
        historyCalibration={{
          name: "Manovacuômetro",
          expPeakFlow: 99.6,
          expFlowDuration: 4.4,
          insPeakFlow: 70.5,
          insFlowDuration: 1.49,
          respiratoryRate: 12,
        }}
      />
    );
    expect(screen.getByText("Manovacuômetro")).toBeInTheDocument();
    expect(screen.getByText("Pico expiratório")).toBeInTheDocument();
    expect(screen.getByText("100 L/min")).toBeInTheDocument();
    expect(screen.getByText("4 seg")).toBeInTheDocument();
    expect(screen.getByText("71 L/min")).toBeInTheDocument();
    expect(screen.getByText("1 seg")).toBeInTheDocument();
    expect(screen.getByText("12.00 RPM")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(5);
  });

  it("exibe 'Sem Nome' e valores vazios quando não há calibração", () => {
    render(<DeviceCard historyCalibration={{}} />);
    expect(screen.getByText("Sem Nome")).toBeInTheDocument();
    // valores ausentes ficam só com a unidade
    expect(screen.getAllByText("L/min")).toHaveLength(2);
    expect(screen.getAllByText("seg")).toHaveLength(2);
    expect(screen.getByText("RPM")).toBeInTheDocument();
  });
});
