import React from "react";
import { Link } from "react-router-dom";
import { Box } from "@mui/material";
import Typography from '@mui/material/Typography';
import MaterialLink from '@mui/material/Link';

import { pathRoutes } from "../../providers/Routes.jsx";


const PageNotFound = () => {

	return (
		<Box
			sx={{
				flexDirection: 'column',
				textAlign: 'center',
				mt: '40vh',
			}}
		>
			<Typography component="h3" variant="h3">
				404 - Página não encontrada!
			</Typography>
			<Typography component="h4" variant="h4">
				Parece que você tentou acessar uma página que não existe...
			</Typography>

			<MaterialLink to={pathRoutes.INFORMATION_PANEL} variant="h5" component={Link}>
				Voltar a página principal
			</MaterialLink>
		</Box>
	);
};

export default PageNotFound;