import React from 'react';

import HomePage from "../pages/home";
import LoginPage from "../pages/login";
import SignUp from "../pages/signUp";
import Layout from "../pages/layout";
import CalibrationHistoryPage from '../pages/calibration-history';
import DevicesPage from '../pages/devices';
import ShippingCode from '../pages/shippingCode';
import PageNotFound from '../pages/pageNotFound';
import ResultPage from "../pages/platform/results";
import ComparativePage from "../pages/platform/comparative";
import PatientAccount from "../pages/patientAccount";
import InformationPanel from "../pages/informationPanel";
import MiniGamesResults from "../pages/miniGames/results";
import MiniGamesComparative from "../pages/miniGames/comparative";
import GameConfigurationCreatePage from "../pages/gameConfigurationCreate";
import GameConfigurationPage from "../pages/gameConfigurationDefine";
import ClinicalReport from "../pages/clinicalReport";


export const pathRoutes = {
	HOME: '/',
	LOGIN: '/login',
	SIGN_UP: '/signUp',
	LAYOUT: '/layout',
	INFORMATION_PANEL: '/dashboard/informationPanel',
	HISTORICAL_CALIBRATION: '/calibracao/historico',
	CALIBRATION_INSTRUMENTS: '/calibracao/instrumentos',
	PLATFORM_RESULTS: '/plataforma/resultados',
	PLATFORM_COMPARATIVE: '/plataforma/comparativo',
	SHIPPING_CODE: '/shippingCode',
	PATIENT_ACCOUNT: '/patient/patientAccount',
	MINI_GAMES_RESULTS: '/miniGames/results',
	MINI_GAMES_COMPARATIVE: '/miniGames/comparative',
	GAME_CONFIGURATION_CREATE:'/gameConfiguration/create',
	GAME_CONFIGURATION_DEFINE:'/gameConfiguration/define',
	CLINICAL_REPORT: '/relatorio-clinico',
}

const routes = [{
	path: pathRoutes.HOME,
	title: 'Flow Psicofisiológico',
	component: () => (<HomePage />),
	privated: false,
},{
	path: pathRoutes.LOGIN,
	title: 'Entrar',
	component: () => (<LoginPage />),
	privated: false,
}, {
	path: pathRoutes.SIGN_UP,
	title: 'Registrar-se',
	component: () => (<SignUp />),
	privated: false,
}, {
	path: pathRoutes.HISTORICAL_CALIBRATION,
	title: 'Historico de calibracao',
	component: () => (<CalibrationHistoryPage />),
	privated: true,
}, {
	path: pathRoutes.INFORMATION_PANEL,
	title: 'Painel de Informações',
	component: () => (<InformationPanel />),
	privated: true,
}, {
	path: pathRoutes.CALIBRATION_INSTRUMENTS,
	title: 'Dispositivos calibrados',
	component: () => (<DevicesPage />),
	privated: true,
}, {
	path: pathRoutes.PLATFORM_RESULTS,
	title: 'Resultados da plataforma',
	component: () => (<ResultPage />),
	privated: true,
}, {
	path: pathRoutes.PLATFORM_COMPARATIVE,
	title: 'Comparativos da plataforma',
	component: () => (<ComparativePage />),
	privated: true,
}, {
	path: pathRoutes.LAYOUT,
	title: 'Layout',
	component: () => (<Layout />),
	privated: true,
}, {
	path: pathRoutes.SHIPPING_CODE,
	title: 'Código de Envio',
	component: () => (<ShippingCode />),
	privated: true,
}, {
	path: pathRoutes.PATIENT_ACCOUNT,
	title: 'Conta do Paciente',
	component: () => (<PatientAccount />),
	privated: true,
}, {
	path: pathRoutes.MINI_GAMES_RESULTS,
	title: 'Resultados do minigames',
	component: () => (<MiniGamesResults />),
	privated: true,
}, {
	path: pathRoutes.MINI_GAMES_COMPARATIVE,
	title: 'Comparativos da minigames',
	component: () => (<MiniGamesComparative />),
	privated: true,
},{
	path: pathRoutes.GAME_CONFIGURATION_DEFINE,
	title: 'Definir parâmetros do Exergame',
	component: () => (<GameConfigurationPage />),
	privated: true,
},{
	path: pathRoutes.GAME_CONFIGURATION_CREATE,
	title: 'Recomendar parâmetros do Exergame',
	component: () => (<GameConfigurationCreatePage />),
	privated: true,
},{
	path: pathRoutes.CLINICAL_REPORT,
	title: 'Relatório Clínico',
	component: () => (<ClinicalReport />),
	privated: true,
},{
	path: '*',
	title: 'Pagina não encontrada',
	component: () => (<PageNotFound />),
	privated: true,
}];

export default routes;