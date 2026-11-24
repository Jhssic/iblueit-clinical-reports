// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// O jsdom não implementa canvas; o jspdf (importado indiretamente pela tabela
// de rotas) testa a existência dele ao carregar e polui o console com erro.
HTMLCanvasElement.prototype.getContext = () => null;
