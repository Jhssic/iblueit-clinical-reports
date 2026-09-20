import * as React from 'react';
import { alpha } from '@mui/material';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import backgroundLight from '../../images/background.png';

export default function Hero() {
  return (
    <Box
      id="hero"
      sx={(theme) => ({
        width: '100%',
        backgroundImage:
          theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #CEE5FD, #FFF)'
            : `linear-gradient(#02294F, ${alpha('#090E10', 0.0)})`,
        backgroundSize: '100% 20%',
        backgroundRepeat: 'no-repeat',
      })}
    >
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: { xs: 10, sm: 12 },
          pb: { xs: 8, sm: 12 },
        }}
      >
        <Stack spacing={2} useFlexGap sx={{ width: { xs: '100%', sm: '90%' } }}>
          <Typography
            variant="h1"
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignSelf: 'center',
              textAlign: 'center',
              fontSize: 'clamp(2.5rem, 10vw, 3rem)',
            }}
          >
            I Blue It 5.0&nbsp;
            <Typography
              component="span"
              variant="h1"
              sx={{
                fontSize: 'clamp(2.5rem, 10vw, 3rem)',
                color: (theme) =>
                  theme.palette.mode === 'light' ? 'primary.main' : 'primary.light',
              }}
            >
              Flow Psicofisiológico
            </Typography>
          </Typography>
          <Typography
            textAlign="center"
            color="text.secondary"
            sx={{ alignSelf: 'center', width: { sm: '100%', md: '100%' } }}
          >
            O conceito de Flow Psicofisiológico introduz a metodologia do equilíbrio tridimensional 
            entre os eixos de desempenho psíquico, desempenho terapêutico e dificuldade. 
            O Flow Psicofisiológico foi concebido para área da Reabilitação física.
            Beneficia-se de tecnologias multimodais, multisinais e de inteligência artificial.
          </Typography>

          <Typography variant="caption" textAlign="center" sx={{ opacity: 0.8 }}>
            Tese apresentada ao Programa de Pós-Graduação em Engenharia Elétrica, &nbsp;
            <Link href="#" color="primary">
               PPGEEL - UDESC
            </Link>
            .
          </Typography>
        </Stack>
        <Container
          id="image"
          sx={(theme) => ({
            mt: { xs: 2, sm: 4 },
            pt: { xs: 2, sm: 4 },
            mb: { xs: 50, sm: -20 },
            alignSelf: 'center',
            height: { xs: 320, sm: 640 },
            width: '100%',
            backgroundImage:
              theme.palette.mode === 'light'
                ? `url(${backgroundLight})`
                : `url(${backgroundLight})`,
            backgroundSize: 'cover',
            borderRadius: '10px',
            outline: '1px solid',
            outlineColor:
              theme.palette.mode === 'light'
                ? alpha('#BFCCD9', 0.5)
                : alpha('#9CCCFC', 0.1),
            boxShadow:
              theme.palette.mode === 'light'
                ? `0 0 12px 8px ${alpha('#9CCCFC', 0.2)}`
                : `0 0 24px 12px ${alpha('#033363', 0.2)}`,
          })}
        >
          <Stack spacing={2} useFlexGap sx={{ width: { xs: '100%', sm: '70%' } }}>
            <Typography
              variant="h1"
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignSelf: 'left',
                textAlign: 'left',
                fontSize: 'clamp(3.5rem, 10vw, 4rem)',
              }}
            >
              Serious Exergame&nbsp;
            </Typography>
            <Typography
              textAlign="left"
              sx={{ alignSelf: 'left', 
                width: { sm: '100%', md: '58%' },
                color: (theme) =>
                  theme.palette.mode === 'light' ? 'text.black' : 'primary.light',
                pt: { xs: 24, sm: 6 },
                pb: { xs: 6, sm: 6 },
                fontSize: 'clamp(0.8rem, 5vw, 1rem)'
              }}
            >
              O Serious Exergame de reabilitação respiratória I Blue It Multimodal foi projetado para auxiliar
              indivíduos com doenças respiratórias ao longo de seu processo de reabilitação. 
              No jogo, os pacientes controlam um personagem golfinho chamado Blue, 
              navegando por diferentes níveis e fases do jogo ao longo de sua jornada de reabilitação, 
              manipulando seus movimentos por meio de técnicas específicas de respiração: 
              ao exalar, o Blue submerge; ao inalar, o Blue salta. 
              Os jogadores percorrem diferentes desafios no jogo, coletando alvos e evitando obstáculos. 
              Essa mecânica promove a prática de controle respiratório de maneira divertida e envolvente, 
              incorporando elementos de jogabilidade que estimulam a atenção e a coordenação.
            </Typography>
          </Stack>
        </Container>
      </Container>
    </Box>
  );
}
