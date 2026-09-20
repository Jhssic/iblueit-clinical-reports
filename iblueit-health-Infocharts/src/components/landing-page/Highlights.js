import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';

const items = [
  {
    icon: <SettingsSuggestRoundedIcon />,
    title: 'Versão 1.0: I Blue It Pitaco (2018)',
    description:
      'Concepção do Dispositivo Pitaco. Jogo Sério Blue.',
  },
  {
    icon: <ConstructionRoundedIcon />,
    title: 'Versão 2.0: I Blue It ManoBD (2019)',
    description:
      'Concepção do Dispositivo ManoBD, Minigame Copo D’água e Minigame Bolo de Aniversário.',
  },
  {
    icon: <ThumbUpAltRoundedIcon />,
    title: 'Versão 3.0: I Blue It Health InfoCharts (2019)',
    description:
      'Concepção de Service Design com gráficos e estatísticas.',
  },
  {
    icon: <AutoFixHighRoundedIcon />,
    title: 'Versão 4.0: I Blue It Multimodal (2021)',
    description:
      'Concepção de Arquitetura 123SGR Multimodal. Dispositivo Cinta Extensora e Dispositivo Oxímetro.',
  },
  {
    icon: <SupportAgentRoundedIcon />,
    title: 'Versão 4.5: I Blue It Multimodal (2023)',
    description:
      'REDESING UI/UX.',
  },
  {
    icon: <QueryStatsRoundedIcon />,
    title: 'Versão 5.0: I Blue It Flow Psicofisiológico (2024)',
    description:
      'Concepção do Conceito Flow Psicofisiológico. Inteligência Artificial.',
  },
];

export default function Highlights() {
  return (
    <Box
      id="highlights"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        color: 'white',
        bgcolor: '#06090a',
      }}
    >
      <Container
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 3, sm: 6 },
        }}
      >
        <Box
          sx={{
            width: { sm: '100%', md: '60%' },
            textAlign: { sm: 'left', md: 'center' },
          }}
        >
          <Typography component="h2" variant="h4">
            Ecossistema
          </Typography>
          <Typography variant="body1" sx={{ color: 'grey.400' }}>
          A seguir, é apresentada a linha do tempo das contribuições que fazem parte do ecossistema do SEG I Blue It.
          </Typography>
        </Box>
        <Grid container spacing={2.5}>
          {items.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Stack
                direction="column"
                color="inherit"
                component={Card}
                spacing={1}
                useFlexGap
                sx={{
                  p: 3,
                  height: '100%',
                  border: '1px solid',
                  borderColor: 'grey.800',
                  background: 'transparent',
                  backgroundColor: 'grey.900',
                }}
              >
                <Box sx={{ opacity: '50%' }}>{item.icon}</Box>
                <div>
                  <Typography fontWeight="medium" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'grey.400' }}>
                    {item.description}
                  </Typography>
                </div>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
