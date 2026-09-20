/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { makeStyles } from "@mui/styles";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { useMyContext } from "../../providers/MyContext";
import { getTokenParameters } from "../../providers/sessionStorage";
import { getPatientAccount } from "../../services/api/patientAccount";
import { requestRegisterUsers } from '../../services/api/signUp';


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

const PatientAccount = () => {
  const classes = useStyles();
  const context = useMyContext();
  const [thereIsAccount, setThereIsAccount] = useState(false);
  const [user, setUser] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [confirmPasswordVisibility, setConfirmPasswordVisibility] = useState(false);


  useEffect(() => {
    if (context.patientId) validateExistenceOfAnAccount();
  }, [context.patientId]);

  const validateExistenceOfAnAccount = async () => {
    const patientAccount = await getPatientAccount(context);

    setThereIsAccount(!!patientAccount)
    setUser((patientAccount && patientAccount.username) ? patientAccount.username : '')
    setPassword((patientAccount && patientAccount.password) ? patientAccount.password : '')
  }


  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      context.addNotification('error', 'Senhas diferentes');
      document.getElementById('confirmPassword').focus();
    } else if (!context.patientId) {
      context.addNotification('error', 'Nenhum paciente selecionados')
    } else {
      try {
        const userData = {
          email,
          password,
          role: 'User',
          username: user,
          fullname: context.patientName,
          pacientId: context.patientId,
          gameToken: getTokenParameters('gameToken'),
        };
        await requestRegisterUsers(context, userData)
        validateExistenceOfAnAccount();
      } catch (error) { }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`Usuário: ${user} Senha: ${password}`);
    context.addNotification('success',  'Usuário e Senha copiados');
  }

  return (
    <Box
      sx={{
        marginTop: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h2" sx={{ fontSize: 20, fontWeight: "bold", letterSpacing: "1px", marginBottom: 1 }} >
        Conta do Paciente
      </Typography>
      <Container component="main" maxWidth="xs">

        {thereIsAccount ? (
          <>
            <Typography component="h5" variant="h5" sx={{ fontSize: 18, marginTop: 5 }} >
              Atenção esses dados abaixo dão acesso a conta do(a) usuário(a) {context.patientName}
            </Typography>

            <Box sx={{ marginTop: 2 }}>
              <TextField
                disabled
                fullWidth
                label="Usuário"
                margin="normal"
                type='user'
                name="user"
                id='user'
                color="borderInput"
                InputProps={{ classes: { input: classes.input } }}
                value={user}
              />

              <TextField
                disabled
                fullWidth
                label="Senha"
                type='text'
                margin="normal"
                name="password"
                id='password'
                color="borderInput"
                InputProps={{ classes: { input: classes.input } }}
                value={password}
              />
            </Box>

            <Button
              fullWidth
              type="button"
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              className={classes.button}
              onClick={copyToClipboard}
            >
              <ContentCopyIcon sx={{ marginRight: 2 }} />
              copiar Usuário e Senha
            </Button>
          </>
        ) : (
          <>
            <Typography component="h5" variant="h5" sx={{ fontSize: 18, marginTop: 5 }} >
              Preencha os campos abaixo para criar uma conta no I Blue It Analytics para o seu paciente {context.patientName}.
            </Typography>
            <Box
              sx={{ marginTop: 2 }}
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

              <TextField
                required
                fullWidth
                margin="normal"
                label="Email"
                type="email"
                name="email"
                id="email"
                autoComplete="email"
                color="borderInput"
                InputProps={{ classes: { input: classes.input } }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

              <FormControl sx={{ mt: 2 }} fullWidth variant="outlined">
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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                className={classes.button}
              >
                Criar Conta
              </Button>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}

export default PatientAccount;
