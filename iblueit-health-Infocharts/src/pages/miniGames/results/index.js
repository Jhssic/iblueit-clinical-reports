/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import moment from "moment";
import { Box, Button, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";

import DeviceSelect from "../../../components/device-select";
import SelectComponent from "../../../components/select";
import DateInterval from "../../../components/date-interval";
import { useMyContext } from "../../../providers/MyContext";
import { getGeneralStatisticsDataFromTheMiniGame } from "../../../services/api/miniGames";
import MiniGamesGraphResults from "../../../components/miniGames-graph/results";


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

const MiniGamesResults = () => {
  const classes = useStyles();
  const context = useMyContext();

  const [listMiniGame] = useState([
    { key: "CakeGame", value: "Velas no Bolo" },
    { key: "WaterGame", value: "Copo D'Água" },
  ]);
  const [listHistoryCalibration] = useState([
    { key: "includeHistoryCalibration", value: "Apresentar" },
    { key: "excludeHistoryCalibration", value: "Não Apresentar" },
  ]);
  const [warning, setWarning] = useState('Selecione os filtros desejados.');
  const [device, setDevice] = useState("Pitaco");
  const [startDate, setStartDate] = useState();
  const [finalDate, setFinalDate] = useState();
  const [miniGame, setMiniGame] = useState("CakeGame");
  const [historyCalibration, setHistoryCalibration] = useState("includeHistoryCalibration");
  const [tableLegend_X, setTableLegend_X] = useState('Maior pico da sessão');
  const [tableLegend_Y, setTableLegend_Y] = useState('Pico Expiratório L/min');
  const [typeGraph, setTypeGraph] = useState(true);
  const [graphData, setGraphData] = useState([]);


  const initialState = () => {
    setWarning('Selecione os filtros desejados.')
    setDevice("Pitaco");
    setStartDate();
    setFinalDate();
    setMiniGame("CakeGame");
    setHistoryCalibration("includeHistoryCalibration");
    setTableLegend_X('Maior pico da sessão');
    setTableLegend_Y('Pico Expiratório L/min');
    setTypeGraph(true);
    setGraphData([]);
  }

  const handleFilterButton = async (event) => {
    event.preventDefault();
    if (finalDate && startDate && moment(finalDate).isBefore(startDate)) {
      context.addNotification('error', 'A data final não pode ser menor do que a data inicial!');
      setGraphData([...[]]);
    } else {
      try {
        const filters = {
          devices: device,
          minigameName: miniGame,
          ...(finalDate && startDate) ? {
            dataIni: moment(startDate).format('DD-MM-YYYY'),
            dataFim: moment(finalDate).format('DD-MM-YYYY'),
          } : {}
        };
        const typeGraph = !!(historyCalibration === 'includeHistoryCalibration');
        const graphData = await getGeneralStatisticsDataFromTheMiniGame(context, filters, typeGraph);
        setGraphData([...graphData]);
        setTypeGraph(typeGraph)
        if (!graphData.length) {
          context.addNotification('error', 'Não existe histórico para os filtros selecionados.');
          setWarning('Não existe histórico para os filtros selecionados.');
        } else {
          if (miniGame === 'WaterGame') setTableLegend_Y('Pico Inspiratório L/min');
          else setTableLegend_Y('Pico Expiratório L/min');
        }
      } catch (error) {
        setGraphData([...[]]);
        setTypeGraph(!!(historyCalibration === 'includeHistoryCalibration'));
      }
    }
  };

  useEffect(() => {
    if (context.patientId) initialState();
  }, [context.patientId]);

  return (
    <>
      <Typography variant="h2" sx={{ fontSize: 20, fontWeight: "bold", letterSpacing: "1px", marginTop: 1, marginBottom: 2 }}>
        MiniGames - Estatísticas Gerais
      </Typography>

      <Box
        component="form"
        onSubmit={handleFilterButton}
        className={classes.container}
      >
        <DeviceSelect
          device={device}
          setDevice={setDevice}
        />
        <Box sx={{ width: 200, marginRight: 2 }}>
          <SelectComponent
            handleChangeCallBack={setMiniGame}
            title="Minigame"
            items={listMiniGame}
            initialKey={miniGame}
          />
        </Box>
        <Box sx={{ width: 200, marginRight: 2 }}>
          <SelectComponent
            handleChangeCallBack={setHistoryCalibration}
            title="Valores Calibrados"
            items={listHistoryCalibration}
            initialKey={historyCalibration}
          />
        </Box>

        <Box sx={{ marginRight: 2 }}>
          <DateInterval
            disabled
            handleStartDateChangeCallBack={setStartDate}
            handleFinalDateChangeCallBack={setFinalDate}
          />
        </Box>
        <Button
          size="large"
          type="submit"
          variant="contained"
          className={classes.button}
        >
          Filtrar
        </Button>
      </Box>

      {!graphData.length ? (
        <Typography
          sx={{ opacity: 0.5 }}
          variant="subtitle1"
        >
          {warning}
        </Typography>
      ) : (
        <MiniGamesGraphResults
          data={graphData}
          tableLegend_Y={tableLegend_Y}
          tableLegend_X={tableLegend_X}
          typeGraph={typeGraph}
        />
      )}
    </>
  );
};

export default MiniGamesResults;
