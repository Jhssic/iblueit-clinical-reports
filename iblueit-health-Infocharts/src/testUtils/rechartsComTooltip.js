// Mock do recharts para jsdom: o ResponsiveContainer não consegue medir o
// tamanho do container no jsdom (sem layout/ResizeObserver), então o
// substituímos por um wrapper de tamanho fixo. O Tooltip pode, opcionalmente,
// renderizar o `content` customizado com um payload controlado pelo teste
// (global.__tooltipPayload), já que hover real em SVG não funciona no jsdom.
// Uso: jest.mock("recharts", () => require("<caminho>/testUtils/rechartsComTooltip").buildRechartsMock());
const React = require("react");

const buildRechartsMock = () => {
  const Original = jest.requireActual("recharts");

  const ResponsiveContainer = ({ children }) =>
    React.createElement(
      "div",
      { "data-testid": "responsive-container", style: { width: 800, height: 400 } },
      React.cloneElement(children, { width: 800, height: 400 })
    );

  const Tooltip = (props) => {
    const fake = global.__tooltipPayload;
    if (fake && props.content && React.isValidElement(props.content)) {
      return React.createElement(
        "div",
        { "data-testid": "tooltip-mock" },
        React.cloneElement(props.content, fake)
      );
    }
    return null;
  };
  Tooltip.displayName = "Tooltip";
  Tooltip.defaultProps = Original.Tooltip.defaultProps;

  return { ...Original, ResponsiveContainer, Tooltip };
};

module.exports = { buildRechartsMock };
