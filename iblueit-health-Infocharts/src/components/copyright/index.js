import React from 'react';

import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

const Copyright = (props) => {
  return (
    <Typography variant="body2" color="#11192A" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://github.com/UDESC-LARVA/iblueit-web" target="_blank">
        I BLUE IT versão 5.0: Flow Psicofisiológico
      </Link>
      {' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

export default Copyright;