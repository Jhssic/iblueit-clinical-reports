/* eslint-disable no-loop-func */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo, useCallback } from "react";

export const Context = React.createContext({});

export const MyContext = (props) => {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState();
  const [notificationIndex, setNotificationIndex] = useState(0);
  const [patientId, setPatientId] = useState();
  const [patientName, setPatientName] = useState();
  const [patientBirthDate, setPatientBirthDate] = useState();

  useEffect(() => {
    if (notificationIndex) {
      let copyNotification = { ...notification }
      delete (copyNotification[notificationIndex]);
      setNotification({ ...copyNotification })
      if(!Object.keys(copyNotification).length) setNotificationIndex(0);
    }
  }, [notificationIndex]);

  const addNotification = useCallback((type, message) => {
    let lastIndex = notificationIndex;
    for (const key in notification) if (key => lastIndex) lastIndex = key
    lastIndex = Number.parseInt(lastIndex, 10) + 1;

    setNotification({ ...notification, [lastIndex]: { type, message } })
    setTimeout(() => { setNotificationIndex(lastIndex); }, 5000)
  }, [notification, notificationIndex]);

  const resetState = useCallback(() => {
    setLoading(false);
    setNotification();
    setNotificationIndex(0);
    setPatientId();
    setPatientName();
    setPatientBirthDate();
  }, []);

  const contextValue = useMemo(() => ({
    resetState,
    loading, setLoading,
    notification, addNotification,
    patientId, setPatientId,
    patientName, setPatientName,
    patientBirthDate, setPatientBirthDate
  }), [resetState, loading, notification, addNotification, patientId, patientName, patientBirthDate]);

  return (
    <Context.Provider value={contextValue}>
      {props.children}
    </Context.Provider>
  );
};

export const useMyContext = () => React.useContext(Context);