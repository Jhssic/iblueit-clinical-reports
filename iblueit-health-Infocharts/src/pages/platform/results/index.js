/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import DeviceSelect from "../../../components/device-select";
import DateInterval from "../../../components/date-interval";
import { Box, Button, Typography } from "@mui/material";
import SelectComponent from "../../../components/select";
import { makeStyles } from "@mui/styles";
import {
  fetchPointsAndLevelsAndPlays,
  fetchResults,
} from "../../../services/api/result";
import { useMyContext } from "../../../providers/MyContext";
import CalibrationGraph from "../../../components/calibration-graph";
import MicroCard from "../../../components/micro-card";


const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    justifyContent: "flex-start",
    flexFlow: "wrap",
    marginBottom: 50,
    rowGap: 15,
    marginTop: 30,
  },
  button: {
    height: 40,
    marginTop: "auto",
    backgroundColor: "#1e2b48",
    color: "#fff",
    "&:hover": {
      backgroundColor: "#1e2b48",
      opacity: 0.7,
      color: "white",
    },
  },
}));

const ResultPage = () => {
  const classes = useStyles();
  const context = useMyContext();

  const [warning, setWarning] = useState('Selecione os filtros desejados.');
  const [resultData, setResultData] = useState([]);
  const [device, setDevice] = useState("Pitaco");
  const [visualization, setVisualization] = useState("result");
  const [visualizationAfterRequest, setVisualizationAfterRequest] = useState("result");
  const [startDate, setStartDate] = useState();
  const [finalDate, setFinalDate] = useState();
  const [microCardsValues, setMicroCardsValues] = useState([
    { value: 0, title: "Pontuação acumulada" },
    { value: 0, title: "Níveis desbloqueados" },
    { value: 0, title: "Seções jogadas" },
  ]);

  const initialState = () => {
    setWarning('Selecione os filtros desejados.');
    setResultData([]);
    setDevice("Pitaco");
    setVisualization("result");
    setVisualizationAfterRequest("result");
    setStartDate();
    setFinalDate();
  }

  const fetchMicroCardsValues = async () => {
    context.setLoading(true);
    const pointsAndLevelsAndPlaysApiResult = await fetchPointsAndLevelsAndPlays(context.patientId);
    setMicroCardsValues(pointsAndLevelsAndPlaysApiResult || []);
    context.setLoading(false);
  };

  const handleFilterButton = async () => {
    context.setLoading(true);
    const apiResponse = await fetchResults(
      context.patientId,
      device,
      visualization
    );
    if (!apiResponse.length) {
      context.addNotification("error", 'Não existe histórico para os filtros selecionados.');
      setWarning('Não existe histórico para os filtros selecionados.');
    }
    setResultData(apiResponse);
    setVisualizationAfterRequest(visualization);
    context.setLoading(false);
  };

  useEffect(() => {
    if (context.patientId) {
      fetchMicroCardsValues();
      initialState();
    }
  }, [context.patientId]);

  return (
    <>
      <Typography variant="h2" sx={{ fontSize: 20, fontWeight: "bold", letterSpacing: "1px", marginBottom: 1, marginTop: 1 }}>
        Resultados na plataforma
      </Typography>
      <Box sx={{ marginTop: 4, display: "flex", flexWrap: "wrap" }}>
        {microCardsValues.map((microCardValue, index) => (
          <MicroCard
            key={`ResultPage${index}`}
            title={microCardValue.title}
            value={microCardValue.value}
          />
        ))}
      </Box>

      <Box className={classes.container}>
        <DeviceSelect device={device} setDevice={setDevice} />
        <Box sx={{ width: 200, marginRight: 2 }}>
          <SelectComponent
            handleChangeCallBack={setVisualization}
            title="Visualização"
            items={[
              { key: "result", value: "Pontuação" },
              { key: "maxExpFlow", value: "Pico Expiratório" },
              { key: "maxInsFlow", value: "Pico Inspiratório" },
              { key: "scoreRatio", value: "Razão" },
            ]}
            initialKey={visualization}
          />
        </Box>
        <Box sx={{ marginRight: 2 }}>
          <DateInterval
            handleStartDateChangeCallBack={setStartDate}
            handleFinalDateChangeCallBack={setFinalDate}
          />
        </Box>
        <Button
          className={classes.button}
          variant="contained"
          size="large"
          onClick={handleFilterButton}
        >
          Filtrar
        </Button>
      </Box>
      {(!resultData.length) ? (
        <Typography
          sx={{ opacity: 0.5 }}
          variant="subtitle1"
        >
          {warning}
        </Typography>
      ) : (
        <CalibrationGraph
          data={resultData}
          exercise={visualizationAfterRequest}
        />
      )}
    </>
  );
};

export default ResultPage;
