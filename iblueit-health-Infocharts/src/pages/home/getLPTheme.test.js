import React from "react";
import { render } from "@testing-library/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import getLPTheme, { brand, secondary, gray, green } from "./getLPTheme";

// Renderiza todos os componentes que recebem styleOverrides do tema,
// garantindo que as funções de estilo rodem sem erro nos dois modos.
const Vitrine = () => (
  <>
    <Accordion>
      <AccordionSummary>Resumo</AccordionSummary>
      <AccordionDetails>Detalhes</AccordionDetails>
    </Accordion>
    <ToggleButtonGroup value="a">
      <ToggleButton value="a">A</ToggleButton>
    </ToggleButtonGroup>
    {["small", "medium"].map((size) =>
      ["contained", "outlined", "text"].map((variant) => (
        <Button key={size + variant} size={size} variant={variant} color="primary">
          {size}-{variant}
        </Button>
      ))
    )}
    <Card variant="outlined">cartão contornado</Card>
    <Card>cartão</Card>
    <Chip label="chip" />
    <Chip label="chip primário" color="primary" />
    <Divider />
    <Link href="#">link</Link>
    <MenuItem>item</MenuItem>
    <Paper>papel</Paper>
    <Switch defaultChecked />
    <TextField label="campo" />
  </>
);

describe("getLPTheme", () => {
  it.each(["light", "dark"])("gera um tema válido no modo %s", (mode) => {
    const opcoes = getLPTheme(mode);
    expect(opcoes.palette.mode).toBe(mode);
    expect(opcoes.components.MuiButton).toBeDefined();
    const theme = createTheme(opcoes);
    const { getByText, getAllByRole } = render(
      <ThemeProvider theme={theme}>
        <Vitrine />
      </ThemeProvider>
    );
    expect(getByText("cartão contornado")).toBeInTheDocument();
    expect(getAllByRole("button").length).toBeGreaterThan(5);
  });

  it("exporta as paletas de cores da marca", () => {
    expect(brand[400]).toBe("#0A66C2");
    expect(secondary[50]).toBe("#F9F0FF");
    expect(gray[900]).toBe("#090E10");
    expect(green).toBeDefined();
  });
});
