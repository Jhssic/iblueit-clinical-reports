import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import GameParameterCardHeader from "./header";
import MeasureBox from "./measure-box";
import Button from '@mui/material/Button';
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
  button: {
    color: "#fff",
    backgroundColor: "#11192A",
    "&:hover": {
      backgroundColor: "#11192A",
      opacity: 0.7,
      color: "white",
    },
  }
}));

const GameParameterCard = ({ gameParameter, index=null, selectNeighborInformation=null }) => {
  const classes = useStyles();

  return (
    <Paper
      sx={{
        flex: 'auto',
        boxSizing: 'border-box',
        minWidth: 0,
        maxWidth: 700,
        backgroundColor: "white",
        color: "black",
        marginBottom: 5,
        marginRight: { xs:0, lg: 1 },
        marginLeft: { xs:0, lg: 1 }
      }}
      elevation={24}
    >
      <GameParameterCardHeader title={gameParameter.isAVG ? 'Media das Avaliações' : gameParameter.pacientName} />
      <Box sx={{ display: 'flex', flexFlow: 'wrap' }}>
        <MeasureBox
          isLeft={true}
          title='Fase'
          Idname = {`phase${index}`}
          value={`${gameParameter.phase ? gameParameter.phase.toFixed(0) : 1}`}
        />
        <MeasureBox
          isLeft={false}
          title='Nível'
          Idname = {`level${index}`}
          value={`${gameParameter.level ? gameParameter.level.toFixed(0) : 1}`}
        />
        <MeasureBox
          isLeft={true}
          title='Número de Níveis'
          Idname = {`Loops${index}`}
          value={`${gameParameter.Loops ? gameParameter.Loops.toFixed(0) : 6}`}
        />
        <MeasureBox
          isLeft={false}
          title='Velocidade'
          Idname = {`objectSpeedFactor${index}`}
          value={`${gameParameter.ObjectSpeedFactor ? gameParameter.ObjectSpeedFactor.toFixed(2) : 1.0}`}
        />
        <MeasureBox
          isLeft={true}
          title='Degrau de Ajuste de Alvos'
          Idname = {`heightIncrement${index}`}
          value={`${gameParameter.HeightIncrement ? gameParameter.HeightIncrement.toFixed(2) : 0.0}`}
        />
        <MeasureBox
          isLeft={false}
          title='Limiar de Sucesso em Alvos'
          Idname = {`heightUpThreshold${index}`}
          value={`${gameParameter.HeightUpThreshold ? gameParameter.HeightUpThreshold.toFixed(0) : 6}`}
        />
        <MeasureBox
          isLeft={true}
          title='Limiar de Falhas em Alvos'
          Idname = {`heightDownThreshold${index}`}
          value={`${gameParameter.HeightDownThreshold ? gameParameter.HeightDownThreshold.toFixed(0) : 3}`}
        />
        <MeasureBox
          isLeft={false}
          title='Degrau de Ajuste de Obstáculo'
          Idname = {`sizeIncrement${index}`}
          value={`${gameParameter.SizeIncrement ? gameParameter.SizeIncrement.toFixed(2) : 0.0}`}
        />
        <MeasureBox
          isLeft={true}
          title='Limiar de Sucesso em Obstáculos'
          Idname = {`sizeUpThreshold${index}`}
          value={`${gameParameter.SizeUpThreshold ? gameParameter.SizeUpThreshold.toFixed(0) : 6}`}
        />
        <MeasureBox
          isLeft={false}
          title='Limar de Falhas em Obstáculos'
          Idname = {`sizeDownThreshold${index}`}
          value={`${gameParameter.SizeDownThreshold ? gameParameter.SizeDownThreshold.toFixed(0) : 3}`}
        />
        <Button
          type="button"
          variant="contained"
          sx={{ mt: 3, mb: 2, mx: 'auto'}}
          className={classes.button}
          onClick={() => selectNeighborInformation(index)}
        >
          Copiar Perfil
        </Button>
      </Box>
    </Paper>
  );
};

export default GameParameterCard;
