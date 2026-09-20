/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { Box, Button, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";

import CalibrationGraph from "../../components/calibration-graph";
import SelectComponent from "../../components/select";
import DateInterval from "../../components/date-interval";
import { fetchHistory } from "../../services/api/calibration";
import { useMyContext } from "../../providers/MyContext";
import DeviceSelect from "../../components/device-select";


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

const CalibrationHistoryPage = () => {
  const context = useMyContext();
  const classes = useStyles();

  const [warning, setWarning] = useState('Selecione os filtros desejados.');
  const [history, setHistory] = useState([]);
  const [device, setDevice] = useState("Pitaco");
  const [exercise, setExercise] = useState("RespiratoryFrequency");
  const [exerciseAfterRequest, setExerciseAfterRequest] = useState("RespiratoryFrequency");
  const [startDate, setStartDate] = useState();
  const [finalDate, setFinalDate] = useState();

  const initialState = () => {
    setWarning('Selecione os filtros desejados.')
    setHistory([]);
    setDevice("Pitaco");
    setExercise("RespiratoryFrequency");
    setExerciseAfterRequest("RespiratoryFrequency");
    setStartDate();
    setFinalDate();
  }

  const handleFilterButton = async () => {
    context.setLoading(true)
    const result = await fetchHistory(device, exercise, context.patientId);
    if (!result.length) {
      context.addNotification('error', 'Não existe histórico para os filtros selecionados.')
      setWarning('Não existe histórico para os filtros selecionados.')
    }
    setHistory(result);
    setExerciseAfterRequest(exercise);
    context.setLoading(false)
  };

  useEffect(() => {
    if (context.patientId) initialState();
  }, [context.patientId]);

  return (
    <Box
      sx={{
        marginTop: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h2" sx={{ fontSize: 20, fontWeight: "bold", letterSpacing: "1px" }}>
        Histórico de calibrações
      </Typography>
      <Box className={classes.container}>
        <DeviceSelect device={device} setDevice={setDevice} />
        <Box sx={{ width: 200, marginRight: 2 }}>
          <SelectComponent
            handleChangeCallBack={setExercise}
            title="Exercício"
            items={[
              {
                key: "RespiratoryFrequency",
                value: "Frequência Respiratória",
              },
              { key: "ExpiratoryPeak", value: "Pico Expiratório" },
              { key: "ExpiratoryDuration", value: "Duração Expiratória" },
              { key: "InspiratoryPeak", value: "Pico Inspiratório" },
              { key: "InspiratoryDuration", value: "Duração Inspiratória" }
            ]}
            initialKey={exercise}
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
      {(!history.length) ? (
        <Typography
          sx={{ opacity: 0.5 }}
          variant="subtitle1"
        >
          {warning}
        </Typography>
      ) : (
        <CalibrationGraph
          data={history}
          exercise={exerciseAfterRequest}
        />
      )}
    </Box>
  );
};

export default CalibrationHistoryPage;
