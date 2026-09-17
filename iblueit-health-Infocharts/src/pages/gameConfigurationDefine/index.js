import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import GameParameterCard from "../../components/game-parameter-card";
import { createGameParameter, getGameParameter } from "../../services/api/gameParameter";
import { useMyContext } from "../../providers/MyContext";

import { makeStyles } from "@mui/styles";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

const useStyles = makeStyles((theme) => ({
  button: {
    color: "#fff",
    backgroundColor: "#11192A",
    "&:hover": {
      backgroundColor: "#11192A",
      opacity: 0.7,
      color: "white",
    },
  },
  input: {
    color: "#11192A",
  }
}));


const GameConfigurationCreatePage = () => {
  const context = useMyContext()
  // const [gameParameterNeighborInformations, setGameParameterNeighborInformations] = useState([]);

  const classes = useStyles();
  const [phase, setPhase] = useState('');
  const [stageId, setStageId] = useState('');
  const [level, setLevel] = useState('');
  const [Loops, setLoops] = useState('');
  const [objectSpeedFactor, setObjectSpeedFactor] = useState('');
  const [heightIncrement, setHeightIncrement] = useState('');
  const [heightUpThreshold, setHeightUpThreshold] = useState('');
  const [heightDownThreshold, setHeightDownThreshold] = useState('');
  const [sizeIncrement, setSizeIncrement] = useState('');
  const [sizeUpThreshold, setSizeUpThreshold] = useState('');
  const [sizeDownThreshold, setSizeDownThreshold] = useState('');

  useEffect(() => {
    const setInputsPacientGameParameter = (pacientGameParameter) => {
      if (pacientGameParameter) {
        setPhase(pacientGameParameter?.phase || 1);
        setStageId(pacientGameParameter?.stageId || 1);
        setLevel(pacientGameParameter?.level || 1);
        setLoops(pacientGameParameter?.Loops || 6);
        setObjectSpeedFactor(pacientGameParameter?.ObjectSpeedFactor?.$numberDecimal || 1.0);
        setHeightIncrement(pacientGameParameter?.HeightIncrement?.$numberDecimal || 0.0);
        setHeightUpThreshold(pacientGameParameter?.HeightUpThreshold || 0);
        setHeightDownThreshold(pacientGameParameter?.HeightDownThreshold || 0);
        setSizeIncrement(pacientGameParameter?.SizeIncrement?.$numberDecimal || 0.0);
        setSizeUpThreshold(pacientGameParameter?.SizeUpThreshold || 0);
        setSizeDownThreshold(pacientGameParameter?.SizeDownThreshold || 0);
      }
    }
    // async function getGameParameterNeighbor() {
    //   context.setLoading(true);
    //   const pacientGameParameteResult = await getGameParameter(context.patientId)
    //   setInputsPacientGameParameter(pacientGameParameteResult.data.data[0])
    //   const result = await fetchGameParameterNeighbor(context.patientId);
    //   setGameParameterNeighborInformations([...result.data.data]);
    //   context.setLoading(false);
    // };
    // if (context.patientId) {
    //   getGameParameterNeighbor();
    // }
  }, [context.patientId]);

  if (!context.patientId) {
    return (<Typography variant="h2" sx={{ fontSize: 20 }}>Um paciente precisa ser selecionado!</Typography>);
  }


  // const selectNeighborInformation = (index) => {
  //   setPhase(document.getElementById(`phase${index}`).innerText);
  //   setLevel(document.getElementById(`level${index}`).innerText);
  //   setLoops(document.getElementById(`Loops${index}`).innerText);
  //   setObjectSpeedFactor(document.getElementById(`objectSpeedFactor${index}`).innerText);
  //   setHeightIncrement(document.getElementById(`heightIncrement${index}`).innerText);
  //   setHeightUpThreshold(document.getElementById(`heightUpThreshold${index}`).innerText);
  //   setHeightDownThreshold(document.getElementById(`heightDownThreshold${index}`).innerText);
  //   setSizeIncrement(document.getElementById(`sizeIncrement${index}`).innerText);
  //   setSizeUpThreshold(document.getElementById(`sizeUpThreshold${index}`).innerText);
  //   setSizeDownThreshold(document.getElementById(`sizeDownThreshold${index}`).innerText);
  //   context.addNotification('success',  'Parâmetros selecionados');
  // }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!context.patientId) {
      context.addNotification('error', 'Nenhum paciente selecionado')
    } else {
      try {
        const gameParameter = {
          pacientId: context.patientId,
          "stageId": 1,
          "phase": phase,
          "level": level,
          "ObjectSpeedFactor": objectSpeedFactor,
          "HeightIncrement": heightIncrement,
          "HeightUpThreshold": heightUpThreshold,
          "HeightDownThreshold": heightDownThreshold,
          "SizeIncrement": sizeIncrement,
          "SizeUpThreshold": sizeUpThreshold,
          "SizeDownThreshold": sizeDownThreshold,
          "Loops": Loops,
        };
        await createGameParameter(context, gameParameter)
        context.addNotification('success', 'Salvo com Sucesso');
      } catch (error) { }
    };
  }

  const maxAndMinInput = (functionName, event, max = 5, min = 1) => {
    const value = parseFloat(event.target.value, 10);
    if (value > max) {
      return functionName(max.toFixed(2));
    } else if (value < min) {
      return functionName(min.toFixed(2));
    } else if (value) {
      return functionName(value.toFixed(2));
    } else {
      return functionName("");
    }
  }

  const maxAndMinInputInt = (functionName, event, max = 5, min = 1) => {
    const value = parseFloat(event.target.value, 10);
    if (value > max) {
      return functionName(max.toFixed(0));
    } else if (value < min) {
      return functionName(min.toFixed(0));
    } else if (value) {
      return functionName(value.toFixed(0));
    } else {
      return functionName("");
    }
  }

  return (
    <Box
      sx={{
        marginTop: 1,
        display: "flex",
        flexDirection: "column",
        alignContent: "center",
        justifyContent: "space-around",
        alignItems: "center",
        marginLeft: { xs: -2, md: 0 },
        marginRight: { xs: -2, md: 0 }
      }}
    >
      <Typography variant="h2" sx={{ fontSize: 20, fontWeight: "bold", letterSpacing: "1px", color: '#11192A' }}>
        Parâmetros do Exergame para Sessão
      </Typography>

      <Box
        sx={{
          flex: 'auto',
          boxSizing: 'border-box',
          boxShadow: '0px 11px 15px -7px rgba(0,0,0,0.2),0px 24px 38px 3px rgba(0,0,0,0.14),0px 9px 46px 8px rgba(0,0,0,0.12)',
          minWidth: 0,
          maxWidth: 800,
          backgroundColor: "white",
          color: "black",
          mt: 4,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          flexDirection: "row",
          justifyContent: "space-around",
        }}
        component="form"
        onSubmit={handleSubmit}
      >
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Fase" margin="normal" type='number' name="phase" id='phase' color="borderInput" InputProps={{ classes: { input: classes.input } }} value={phase}
              onChange={(e) => maxAndMinInputInt(setPhase, e, 4, 1)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Nível" margin="normal" type='number' name="level" id='level' color="borderInput" InputProps={{ classes: { input: classes.input } }} value={level}
              onChange={(e) => maxAndMinInputInt(setLevel, e, 99, 1)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Número de Níveis (10 objetos por nível)" margin="normal" type='number' name="Loops" id='Loops' color="borderInput" InputProps={{ classes: { input: classes.input } }} value={Loops}
              onChange={(e) => maxAndMinInputInt(setLoops, e, 99, 1)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Velocidade" margin="normal" type='number' name="objectSpeedFactor" id='objectSpeedFactor' color="borderInput" inputProps={{ step: "0.5" }} InputProps={{ classes: { input: classes.input } }} value={objectSpeedFactor}
              onChange={(e) => maxAndMinInput(setObjectSpeedFactor, e, 3, 1)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Degrau de Ajuste de Alvos" margin="normal" type='number' name="heightIncrement" id='heightIncrement' color="borderInput" inputProps={{ step: "0.1" }} InputProps={{ classes: { input: classes.input } }} value={heightIncrement}
              onChange={(e) => maxAndMinInput(setHeightIncrement, e, 1, 0)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Limiar de Sucesso em Alvos" margin="normal" type='number' name="heightUpThreshold" id='heightUpThreshold' color="borderInput" inputProps={{ step: "1" }} InputProps={{ classes: { input: classes.input } }} value={heightUpThreshold}
              onChange={(e) => maxAndMinInputInt(setHeightUpThreshold, e, 6, 0)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Limiar de Falhas em Alvos" margin="normal" type='number' name="heightDownThreshold" id='heightDownThreshold' color="borderInput" inputProps={{ step: "1" }} InputProps={{ classes: { input: classes.input } }} value={heightDownThreshold}
              onChange={(e) => maxAndMinInputInt(setHeightDownThreshold, e, 3, 0)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Degrau de Ajuste de Obstáculos" margin="normal" type='number' name="sizeIncrement" id='sizeIncrement' color="borderInput" inputProps={{ step: "0.1" }} InputProps={{ classes: { input: classes.input } }} value={sizeIncrement}
              onChange={(e) => maxAndMinInput(setSizeIncrement, e, 1, 0)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Limiar de Sucesso em Obstáculos" margin="normal" type='number' name="sizeUpThreshold" id='sizeUpThreshold' color="borderInput" inputProps={{ step: "1" }} InputProps={{ classes: { input: classes.input } }} value={sizeUpThreshold}
              onChange={(e) => maxAndMinInputInt(setSizeUpThreshold, e, 6, 0)} />
          </Box>
        </Box>
        <Box
          sx={{
            paddingLeft: 4,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            border: "none",
            width: '50%',
            height: 100,
          }}
        >
          <Box sx={{ width: '100%', display: "flex", flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextField sx={{ width: '90%' }} required label="Limar de Falhas em Obstáculos" margin="normal" type='number' name="sizeDownThreshold" id='sizeDownThreshold' color="borderInput" inputProps={{ step: "1" }} InputProps={{ classes: { input: classes.input } }} value={sizeDownThreshold}
              onChange={(e) => maxAndMinInputInt(setSizeDownThreshold, e, 3, 0)} />
          </Box>
        </Box>
        <Button
          type="submit"
          variant="contained"
          sx={{ mt: 2, mb: 2, mx: 'auto'}}
          className={classes.button}
        >
          Salvar
        </Button>
      </Box>
      {/* <Typography variant="h2" sx={{ mt: 4, fontSize: 20, fontWeight: "bold", letterSpacing: "1px" }}>
        Recomendações de Perfis de Pacientes
      </Typography>
      <Box
        sx={{
          marginTop: 5,
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          flexFlow: "wrap"
        }}
      >
        {gameParameterNeighborInformations.map((gameParameterNeighborInformation, index) => (
          <GameParameterCard gameParameter={gameParameterNeighborInformation} index={index} selectNeighborInformation={selectNeighborInformation} key={`gameParameter${index}`} />
        ))}
      </Box> */}
    </Box>
  );
}

export default GameConfigurationCreatePage;
