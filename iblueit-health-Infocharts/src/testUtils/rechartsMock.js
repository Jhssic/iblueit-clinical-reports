// No jsdom o ResponsiveContainer do recharts mede 0x0 e não desenha nada.
// Este helper troca o container por um de tamanho fixo, mantendo o resto da lib real.
// Uso: jest.mock("recharts", () => require("../../testUtils/rechartsMock").rechartsComTamanhoFixo());
export const rechartsComTamanhoFixo = () => {
  const React = require("react");
  const original = jest.requireActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container">
        {React.cloneElement(children, { width: 800, height: 400 })}
      </div>
    ),
  };
};
