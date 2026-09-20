const saveAuthenticationData = (dataOfRequest) => {
  const dataToSave = (dataOfRequest.data && dataOfRequest.data.data)
    ? JSON.stringify(dataOfRequest.data.data)
    : '';
  sessionStorage.setItem('userCredentials', dataToSave);
}

const isAuthenticated = () => {
  const storedUserCredentials = sessionStorage.getItem('userCredentials');
  const userCredentials = (storedUserCredentials)
    ? JSON.parse(storedUserCredentials)
    : undefined;

  if (!storedUserCredentials || !userCredentials) return false;
  if (!validateUserCredentials(userCredentials)) return false;
  return true;
}

const validateUserCredentials = (userCredentials) => {
  const keysNeeded = ['fullname', 'gameToken', 'userId', 'authExpirationTime', 'authTime'];
  const keys = Object.keys(userCredentials);
  return keysNeeded.every(elem => keys.indexOf(elem) >= 0);
}

const getTokenParameters = (Parameter = null) => {
  if (Parameter) {
    return JSON.parse(sessionStorage.getItem("userCredentials" || '{}'))[Parameter];
  }
  return JSON.parse(sessionStorage.getItem("userCredentials" || '{}'));
}

const updateAuthenticationData = (Parameter, valueParameter) => {
  const data = getTokenParameters();
  data[Parameter] = valueParameter;
  sessionStorage.setItem('userCredentials', JSON.stringify(data));
}

const removerAuthenticationData = () => {
  sessionStorage.clear();
}

export {
  saveAuthenticationData,
  removerAuthenticationData,
  isAuthenticated,
  getTokenParameters,
  updateAuthenticationData,
}
