import React, { useState } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { makeStyles } from "@mui/styles";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MaterialLink from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import FormControl from '@mui/material/FormControl';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';

import { useMyContext } from "../../providers/MyContext";
import { pathRoutes } from "../../providers/Routes.jsx";
import { postAuthentication } from "../../services/authentication";
import Copyright from '../../components/copyright';
import GraphicsImages from '../../images/graphicsImages.svg';
import { isAuthenticated } from '../../providers/sessionStorage';


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

const LoginPage = () => {
  const classes = useStyles();
  const context = useMyContext();
  const navigate = useNavigate();

  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await postAuthentication(context, user, password);
      if (isAuthenticated()) navigate(pathRoutes.INFORMATION_PANEL)
    } catch (error) { }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box sx={{ mb: 2 }}>
          <img
            style={{ width: '100%' }}
            src={GraphicsImages}
            alt='GraphicsImages'
          />
        </Box>

        <Typography color='#11192A' component="h1" variant="h5" >
          Bem-vindo ao <br />
          <strong>I BLUE IT: Health InfoCharts</strong>
        </Typography>

        <Box
          sx={{ marginTop: 5 }}
          component="form"
          onSubmit={handleSubmit}>
          <TextField
            required
            fullWidth
            autoFocus
            margin="normal"
            label="Usuário"
            type='user'
            name="user"
            id='user'
            autoComplete="user"
            color="borderInput"
            InputProps={{ classes: { input: classes.input } }}
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
          <FormControl sx={{ mt: 2 }} fullWidth variant="outlined">
            <InputLabel
              required
              color="borderInput"
              htmlFor="outlined-adornment-password"
            >
              Senha
            </InputLabel>
            <OutlinedInput
              required
              id="password"
              type={passwordVisibility ? 'text' : 'password'}
              color="borderInput"
              className={classes.input}
              label="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label="botão para ver a senha"
                    onClick={() => setPasswordVisibility(!passwordVisibility)}
                    onMouseDown={() => setPasswordVisibility(!passwordVisibility)}
                  >
                    {passwordVisibility ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            className={classes.button}
          >
            Entrar
          </Button>
          <Grid container>
            <Grid item>
              <MaterialLink color='#11192A' to={pathRoutes.SIGN_UP} variant="body2" component={Link}>
                {"Criar Conta I BLUE IT!"}
              </MaterialLink>
            </Grid>
          </Grid>
        </Box>
      </Box>
      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  );
}

export default LoginPage;