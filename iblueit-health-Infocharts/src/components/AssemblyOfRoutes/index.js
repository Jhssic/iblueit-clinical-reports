
import React from 'react';
import { Navigate, Route, Routes } from "react-router-dom";
import routes, { pathRoutes } from "../../providers/Routes.jsx";
import { isAuthenticated } from "../../providers/sessionStorage";
import LayoutPage from "../../pages/layout/index";

const ValidateRoutes = ({ route, layoutPage = false }) => {
  const authenticated = isAuthenticated();

  if (!route.privated) {
    if (!authenticated) {
      document.title = `I Blue It - ${route.title}`;
      return (route.component());
    }
    document.title = `I Blue It - Painel de Informações`;
    return <Navigate to={pathRoutes.INFORMATION_PANEL} />;
  } else {
    if (authenticated) {
      if (layoutPage) return <LayoutPage />;
      document.title = `I Blue It - ${route.title}`;
      return (route.component());
    }
    document.title = `I Blue It - Entrar`;
    return <Navigate to={pathRoutes.LOGIN} />;
  }
}

const AssemblyOfRoutes = () => (
  <Routes>
    {routes.map(route => (
      (route.privated) ? (
        <Route
          key={route.path}
          element={<ValidateRoutes route={route} layoutPage={true} />}
        >
          <Route
            key={`subMenu${route.path}`}
            path={route.path}
            element={<ValidateRoutes route={route} />}
          />
        </Route>
      ) : (
        <Route
          key={route.path}
          path={route.path}
          element={<ValidateRoutes route={route} />}
        />
      )
    ))}
  </Routes>
)

export default AssemblyOfRoutes;