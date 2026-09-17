/* eslint-disable react-hooks/exhaustive-deps */
import React, {useState, useEffect} from "react";
import Box from "@mui/material/Box";
import Typography from '@mui/material/Typography';
import PersonIcon from '@mui/icons-material/Person';
import ScaleIcon from '@mui/icons-material/Scale';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WcIcon from '@mui/icons-material/Wc';
import EventIcon from '@mui/icons-material/Event';
import ElevatorIcon from '@mui/icons-material/Elevator';
import NotesIcon from '@mui/icons-material/Notes';

import {useMyContext} from "../../providers/MyContext";
import {getPatientInformation} from '../../services/api/informationPanel';
import BlueCard from "./blue-card";
import GreenCard from "./green-card";
import YellowCard from "./yellow-card";
import RedCard from "./red-card";


const InformationPanel = () => {
  const context = useMyContext();
  const [patientData, setPatientData] = useState([]);

  const setPatientInformation = async () => {
    try {
      const newPatientData = await getPatientInformation(context);
      setPatientData([...newPatientData]);
    } catch (error) {
    }
  };

  useEffect(() => {
    if (context.patientId) setPatientInformation();
  }, [context.patientId]);

  return (
    <Box
      sx={{
        marginTop: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h2" sx={{fontSize: 20, fontWeight: "bold", letterSpacing: "1px"}}>
        Informações gerais
      </Typography>
      <Box
        sx={{
          marginTop: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: 'center'
        }}
      >
        <Box sx={{
          marginTop: 2,
          display: "flex",
          maxWidth: {xs: 300, sm: 1700},
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {patientData.map(patient => {
            if (patient.fieldName === 'Nome') {
              return (<BlueCard title={patient.fieldName}
                                content={patient.fieldValue}
                                icon={<PersonIcon sx={{fontSize: 70, color: '#123996'}}/>}
              />)
            }

            if (patient.fieldName === 'Sexo') {
              return (<GreenCard title={patient.fieldName}
                                 content={patient.fieldValue}
                                 icon={<WcIcon sx={{fontSize: 70, color: '#123996'}}/>}
              />)
            }

            if (patient.fieldName === 'Peso') {
              return (<BlueCard title={patient.fieldName}
                                content={patient.fieldValue}
                                icon={<ScaleIcon sx={{fontSize: 70, color: '#123996'}}/>}
              />)
            }

            if (patient.fieldName === 'Condição') {
              return (<YellowCard title={patient.fieldName}
                                  content={patient.fieldValue}
                                  icon={<LocalHospitalIcon sx={{fontSize: 70, color: '#7B4F01'}}/>}
              />)
            }

            if (patient.fieldName === 'Data de Nascimento') {
              return (<RedCard title={patient.fieldName}
                               content={patient.fieldValue}
                               icon={<EventIcon sx={{fontSize: 70, color: '#7A0C2E'}}/>}
              />)
            }

            if (patient.fieldName === 'Altura') {
              return (<GreenCard title={patient.fieldName}
                                 content={patient.fieldValue}
                                 icon={<ElevatorIcon sx={{fontSize: 70, color: '#123996'}}/>}
              />)
            }

            if (patient.fieldName === 'Observações') {
              return (<YellowCard title={patient.fieldName}
                                  content={patient.fieldValue}
                                  icon={<NotesIcon sx={{fontSize: 70, color: '#7B4F01'}}/>}
              />)
            }

            return (<GreenCard title={patient.fieldName}
                               content={patient.fieldValue}
                               icon={<PersonIcon sx={{fontSize: 70, color: '#123996'}}/>}
            />)


          })}
        </Box>
      </Box>
    </Box>
  );
};

export default InformationPanel;
