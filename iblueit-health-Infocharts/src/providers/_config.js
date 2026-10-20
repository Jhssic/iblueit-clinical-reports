export const BaseUrl = () => {
  if (process.env.REACT_APP_BASE_URL_I_BLUE_IT) {
    return process.env.REACT_APP_BASE_URL_I_BLUE_IT;
  }
  return "http://localhost:7071/api";
};
