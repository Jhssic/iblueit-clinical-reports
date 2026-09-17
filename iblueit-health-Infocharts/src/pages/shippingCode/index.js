import React, { useState } from "react";
import { makeStyles } from "@mui/styles";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import { useMyContext } from "../../providers/MyContext";
import { getTokenParameters } from '../../providers/sessionStorage';
import { requestGenerateShippingCode } from '../../services/api/shippingCode';


const useStyles = makeStyles((theme) => ({
	button: {
		color: "#fff",
		marginLeft: 10,
		backgroundColor: "#1e2b48",
		"&:hover": {
			backgroundColor: "#1e2b48",
			opacity: 0.7,
			color: "white",
		},
	},
	input: {
		width: '20vw',
		minWidth: 250,
	}
}));

const ShippingCode = () => {
	const classes = useStyles();
	const context = useMyContext();
	const [gameToken, setGameToken] = useState(getTokenParameters('gameToken'));

	const copyToClipboard = () => {
		navigator.clipboard.writeText(gameToken);
		context.addNotification('success',  'Código copiado');
	}

	const generateShippingCode = async () => {
		try {
			await requestGenerateShippingCode(context);
			setGameToken(getTokenParameters('gameToken'));
		} catch (error) { }
	}

	return (
		<Box
			sx={{
				marginTop: 1,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Typography variant="h2" sx={{ fontSize: 20 }}>
				Código para o Envio dos Dados
			</Typography>
			<Box
				sx={{
					marginTop: 5,
					display: "flex",
					alignItems: 'center',
					flexDirection: "column",
				}}
			>
				<Paper
					elevation={24}
					sx={{
						marginBottom: 5,
						backgroundColor: "white",
					}}
				>
					<Box
						sx={{
							padding: 2,
							alignItems: "center",
							justifyContent: "flex-start",
							backgroundColor: '#F9FAFC',
							borderBottom: "1px solid #E9EAED",
						}}
					>
						<Typography variant="h6" sx={{ color: "#11192A", fontSize: 17 }}>
							O seu Código de Envio:
						</Typography>
					</Box>
					<Box sx={{
						padding: 2,
						display: "flex",
						alignItems: 'center',
						flexDirection: "column",
					}}>

						<TextField
							disabled
							id="shippingCode"
							label="Código de Envio"
							InputProps={{ classes: { input: classes.input } }}
							value={gameToken || 'Você não gerou um Código de Envio'}
						/>
					</Box>
					<Box sx={{
						paddingBottom: 1,
						display: "flex",
						alignItems: 'center',
						flexDirection: "column",
					}}>
						<Button
							size="large"
							variant="contained"
							className={classes.button}
							onClick={copyToClipboard}
						>
							<ContentCopyIcon />
						</Button>
					</Box>
				</Paper>

				<Paper
					sx={{
						marginBottom: 5,
						backgroundColor: "white",
					}}
					elevation={24}
				>
					<Box
						sx={{
							padding: 2,
							alignItems: "center",
							backgroundColor: '#F9FAFC',
							justifyContent: "flex-start",
							borderBottom: "1px solid #E9EAED",
						}}
					>
						<Typography variant="h6" sx={{ color: "#11192A", fontSize: 17 }}>
							Gerar um novo Código de Envio dos dados do I BLUE IT
						</Typography>
					</Box>
					<Box sx={{
						padding: 2,
						display: "flex",
						alignItems: 'center',
						flexDirection: "column",
					}}>
						<Typography
							variant="p"
							sx={{
								fontSize: 14,
								marginRight: 2,
								color: "#11192A",
								fontWeight: 'bold'
							}}
						>
							Após gerar um Código de Envio, não será possível gerar um novo a não ser que o existente seja revogado! (Contatar o suporte caso necessário).
						</Typography>
						<Button
							size="large"
							variant="contained"
							sx={{ marginTop: 2 }}
							disabled={!!gameToken}
							className={classes.button}
							onClick={generateShippingCode}
						>
							<AutorenewIcon />
							<Typography
								variant="p"
								sx={{
									fontSize: 14,
									marginLeft: 1,
									fontWeight: 'bold'
								}}
							>
								Gerar novo Código de Envio
							</Typography>
						</Button>
					</Box>
				</Paper>

			</Box>
		</Box>
	);
};

export default ShippingCode;