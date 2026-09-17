import React, { useState } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { makeStyles } from "@mui/styles";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MaterialLink from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

import { useMyContext } from "../../providers/MyContext";
import { pathRoutes } from "../../providers/Routes.jsx";
import Copyright from '../../components/copyright';
import GraphicsImages from '../../images/graphicsImages.svg';
import { requestRegisterUsers } from "../../services/api/signUp";


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

export default function SignUp() {
  const classes = useStyles();
  const context = useMyContext();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [confirmPasswordVisibility, setConfirmPasswordVisibility] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      context.addNotification('error', 'Senhas diferentes');
      document.getElementById('confirmPassword').focus();
    } else {
      try {
        const userData = {
          fullname: `${firstName} ${lastName}`,
          username: userName, password, email,
          role: 'Administrator',
        };
        await requestRegisterUsers(context, userData);
        navigate(pathRoutes.LOGIN)
      } catch (error) { }
    }
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

        <Typography component="h1" variant="h5" color='#11192A'>
          Crie uma Conta I BLUE IT!
        </Typography>

        <Typography component="h6" variant="h6" color='#11192A'>
          Preencha os campos abaixo para criar a sua nova conta.
        </Typography>

        <Box
          component="form"
          sx={{ mt: 3 }}
          onSubmit={handleSubmit}
        >

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                autoFocus
                label="Nome"
                type="text"
                id="firstName"
                name="firstName"
                autoComplete="firstName"
                color="borderInput"
                InputProps={{ classes: { input: classes.input } }}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Sobrenome"
                type="text"
                id="lastName"
                name="lastName"
                autoComplete="lastName"
                color="borderInput"
                InputProps={{ classes: { input: classes.input } }}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Nome de usuário"
                type="text"
                id="userName"
                name="userName"
                autoComplete="userName"
                color="borderInput"
                InputProps={{ classes: { input: classes.input } }}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Email"
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                color="borderInput"
                InputProps={{ classes: { input: classes.input } }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
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
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel
                  required
                  color="borderInput"
                  htmlFor="outlined-adornment-password"
                >
                  Confirmar senha
                </InputLabel>
                <OutlinedInput
                  required
                  id="confirmPassword"
                  type={confirmPasswordVisibility ? 'text' : 'password'}
                  color="borderInput"
                  className={classes.input}
                  label="Confirmar senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label="botão para ver a confirmar senha"
                        onClick={() => setConfirmPasswordVisibility(!confirmPasswordVisibility)}
                        onMouseDown={() => setConfirmPasswordVisibility(!confirmPasswordVisibility)}
                      >
                        {confirmPasswordVisibility ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
              </FormControl>
            </Grid>
          </Grid>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            className={classes.button}
          >
            Criar Conta
          </Button>

          <Grid container justifyContent="flex-end">
            <Grid item>
              <MaterialLink color='#11192A' to={pathRoutes.LOGIN} variant="body2" component={Link}>
                Já possui uma Conta I BLUE IT? Clique aqui!
              </MaterialLink>
            </Grid>
          </Grid>

        </Box>
      </Box>
      <Copyright sx={{ mt: 5 }} />
    </Container>
  );
};