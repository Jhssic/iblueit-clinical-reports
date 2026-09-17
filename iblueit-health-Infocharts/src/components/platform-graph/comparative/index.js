import React, {useEffect, useState} from 'react';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend, Bar } from 'recharts';
import { Box } from "@mui/material";
import './style.css'

const PlatformGraphComparative = ({ tableLegend_Y, tableLegend_X, graphData, viewType, unitOfMeasurement }) => {
  const [mockedData, setMockedData] = useState([])

  const [expectedValuesHide, setExpectedValuesHide] = useState(false);
  const [equalRatioSelectedPatientsHide, setEqualRatioSelectedPatientsHide] = useState(false);
  const [maxPercentageHide, setMaxPercentageHide] = useState(false);

  useEffect(() => {
    const newTestData = generateTestData();
    setMockedData(newTestData);
  }, [unitOfMeasurement])

  const generateTestData = () => [{
    xAxisPosition: '1',
    expectedValues_A_Exp: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Exp: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
    expectedValues_A_Ins: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Ins: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
    flowValue_Exp: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    flowValue_Ins: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    flowValue_Bar: Math.floor(Math.random() * (75 - 10 + 1)) + 10,
    scoreComp: Math.floor(Math.random() * (90 - 22 + 1)) + 22,
    maxsCore: Math.floor(Math.random() * (100 - 45 + 1)) + 45,
  }, {
    xAxisPosition: '2',
    expectedValues_A_Exp: Math.floor(Math.random() * (270 - 260 + 1)) + 260,
    expectedValues_B_Exp: Math.floor(Math.random() * (170 - 160 + 1)) + 160,
    expectedValues_A_Ins: Math.floor(Math.random() * (270 - 260 + 1)) + 260,
    expectedValues_B_Ins: Math.floor(Math.random() * (170 - 160 + 1)) + 160,
    flowValue_Exp: Math.floor(Math.random() * (240 - 230 + 1)) + 230,
    flowValue_Ins: Math.floor(Math.random() * (240 - 230 + 1)) + 230,
    flowValue_Bar: Math.floor(Math.random() * (90 - 44 + 1)) + 44,
    scoreComp: Math.floor(Math.random() * (95 - 40 + 1)) + 40,
    maxsCore: Math.floor(Math.random() * (65 - 45 + 1)) + 45
  }, {
    xAxisPosition: '3',
    expectedValues_A_Exp: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Exp: Math.floor(Math.random() * (160 - 150 + 1)) + 150,
    expectedValues_A_Ins: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Ins: Math.floor(Math.random() * (160 - 150 + 1)) + 150,
    flowValue_Exp: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    flowValue_Ins: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    flowValue_Bar: Math.floor(Math.random() * (75 - 44 + 1)) + 44,
    scoreComp: Math.floor(Math.random() * (100 - 55 + 1)) + 55,
    maxsCore: Math.floor(Math.random() * (100 - 44 + 1)) + 44
  }, {
    xAxisPosition: '4',
    expectedValues_A_Exp: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Exp: Math.floor(Math.random() * (150 - 140 + 1)) + 140,
    expectedValues_A_Ins: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Ins: Math.floor(Math.random() * (150 - 140 + 1)) + 140,
    flowValue_Exp: Math.floor(Math.random() * (210 - 200 + 1)) + 200,
    flowValue_Ins: Math.floor(Math.random() * (210 - 200 + 1)) + 200,
    flowValue_Bar: Math.floor(Math.random() * (85 - 19 + 1)) + 19,
    scoreComp: Math.floor(Math.random() * (75 - 40 + 1)) + 40,
    maxsCore: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
  }, {
    xAxisPosition: '5',
    expectedValues_A_Exp: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Exp: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
    expectedValues_A_Ins: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Ins: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
    flowValue_Exp: Math.floor(Math.random() * (210 - 200 + 1)) + 200,
    flowValue_Ins: Math.floor(Math.random() * (210 - 200 + 1)) + 200,
    flowValue_Bar: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
    scoreComp: Math.floor(Math.random() * (85 - 33 + 1)) + 33,
    maxsCore: Math.floor(Math.random() * (75 - 40 + 1)) + 40
  }, {
    xAxisPosition: '6',
    expectedValues_A_Exp: Math.floor(Math.random() * (260 - 250 + 1)) + 250,
    expectedValues_B_Exp: Math.floor(Math.random() * (150 - 140 + 1)) + 140,
    expectedValues_A_Ins: Math.floor(Math.random() * (260 - 250 + 1)) + 250,
    expectedValues_B_Ins: Math.floor(Math.random() * (150 - 140 + 1)) + 140,
    flowValue_Exp: Math.floor(Math.random() * (240 - 230 + 1)) + 230,
    flowValue_Ins: Math.floor(Math.random() * (240 - 230 + 1)) + 230,
    flowValue_Bar: Math.floor(Math.random() * (70 - 25 + 1)) + 25,
    scoreComp: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
    maxsCore: Math.floor(Math.random() * (100 - 55 + 1)) + 55
  }, {
    xAxisPosition: '7',
    expectedValues_A_Exp: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Exp: Math.floor(Math.random() * (120 - 110 + 1)) + 110,
    expectedValues_A_Ins: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
    expectedValues_B_Ins: Math.floor(Math.random() * (120 - 110 + 1)) + 110,
    flowValue_Exp: Math.floor(Math.random() * (230 - 220 + 1)) + 220,
    flowValue_Ins: Math.floor(Math.random() * (230 - 220 + 1)) + 220,
    flowValue_Bar: Math.floor(Math.random() * (100 - 10 + 1)) + 10,
    scoreComp: Math.floor(Math.random() * (70 - 25 + 1)) + 25,
    maxsCore: Math.floor(Math.random() * (90 - 22 + 1)) + 22
  }, {
    xAxisPosition: '8',
    expectedValues_A_Exp: Math.floor(Math.random() * (270 - 260 + 1)) + 260,
    expectedValues_B_Exp: Math.floor(Math.random() * (120 - 110 + 1)) + 110,
    expectedValues_A_Ins: Math.floor(Math.random() * (270 - 260 + 1)) + 260,
    expectedValues_B_Ins: Math.floor(Math.random() * (120 - 110 + 1)) + 110,
    flowValue_Exp: Math.floor(Math.random() * (220 - 210 + 1)) + 210,
    flowValue_Ins: Math.floor(Math.random() * (220 - 210 + 1)) + 210,
    flowValue_Bar: Math.floor(Math.random() * (65 - 66 + 1)) + 66,
    scoreComp: Math.floor(Math.random() * (100 - 44 + 1)) + 44,
    maxsCore: Math.floor(Math.random() * (75 - 44 + 1)) + 44,
  }, {
    xAxisPosition: '9',
    expectedValues_A_Exp: Math.floor(Math.random() * (260 - 250 + 1)) + 250,
    expectedValues_B_Exp: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
    expectedValues_A_Ins: Math.floor(Math.random() * (260 - 250 + 1)) + 250,
    expectedValues_B_Ins: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
    flowValue_Exp: Math.floor(Math.random() * (170 - 160 + 1)) + 160,
    flowValue_Ins: Math.floor(Math.random() * (170 - 160 + 1)) + 160,
    flowValue_Bar: Math.floor(Math.random() * (100 - 45 + 1)) + 45,
    scoreComp: Math.floor(Math.random() * (65 - 45 + 1)) + 45,
    maxsCore: Math.floor(Math.random() * (75 - 40 + 1)) + 40
  }, {
    xAxisPosition: '10',
    expectedValues_A_Exp: Math.floor(Math.random() * (300 - 290 + 1)) + 290,
    expectedValues_B_Exp: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
    expectedValues_A_Ins: Math.floor(Math.random() * (300 - 290 + 1)) + 290,
    expectedValues_B_Ins: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
    flowValue_Exp: Math.floor(Math.random() * (150 - 140 + 1)) + 140,
    flowValue_Ins: Math.floor(Math.random() * (150 - 140 + 1)) + 140,
    flowValue_Bar: Math.floor(Math.random() * (70 - 55 + 1)) + 55,
    scoreComp: Math.floor(Math.random() * (100 - 45 + 1)) + 45,
    maxsCore: Math.floor(Math.random() * (100 - 45 + 1)) + 45,
  }];


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const values = [];
      let messageFlowValue = '';
      let messageExpectedValues = '';
      let ratioSelectedPatients = '';

      for (const element of payload) {
        if (element.dataKey === 'scoreComp')
          ratioSelectedPatients = `Razão comum de pacientes selecionados: ${element.value}%`

        if (element.name === setDataKey("expectedValues_B")) {
          values.push(element.value);
        } else if (element.dataKey === setDataKey("expectedValues_A")) {
          messageExpectedValues = element.name;
          values.push(element.value);
        } else {
          messageFlowValue = `${element.name}: ${element.value}${unitOfMeasurement}`;
        }
      }
      if (values.length) messageExpectedValues = `${messageExpectedValues}: ${values[0]}${unitOfMeasurement} - ${values[0] + values[1]}${unitOfMeasurement}`

      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#F9FAFC', border: 'solid 1px #E9EAED' }}>
          <p className="label" style={{ margin: '0 5px' }}>{label}</p>
          {ratioSelectedPatients && <p className="intro" style={{ margin: '0 8px' }}>{ratioSelectedPatients}</p>}
          <p className="intro" style={{ margin: '0 8px' }}>{messageFlowValue}</p>
          <p className="intro" style={{ margin: '0 8px' }}>{messageExpectedValues}</p>
        </div >
      );
    }
    return null;
  };

  const handleLegendClick = (key) => {
    if (key === setDataKey("expectedValues_A")) setExpectedValuesHide(!expectedValuesHide)
    if (key === "scoreComp") setEqualRatioSelectedPatientsHide(!equalRatioSelectedPatientsHide)
    if (key === "maxsCore") setMaxPercentageHide(!maxPercentageHide)
  }

  const renderLegend = (props) => (
    <ul className="recharts-default-legend" style={{ padding: '0px', margin: '0px', display: 'flex', textAlign: 'center', justifyContent: 'center', }}>
      {props.payload.map((entry, index) => (
        (entry.value !== setDataKey("expectedValues_B")) && (
          <li
            onClick={() => handleLegendClick(entry.dataKey)}
            className={`recharts-legend-item legend-item-${index}  ${(entry.dataKey !== 'flowValue_Bar' && entry.dataKey !== setDataKey("flowValue") && expectedValuesHide) ? 'inactive' : ''} ${(!expectedValuesHide && entry.dataKey !== 'flowValue_Bar' && entry.dataKey !== setDataKey("flowValue")) ? 'legend' : ''}`}
            style={{ display: 'flex', marginRight: '10px' }}
            key={`item-${index}`}>
            {
              getLinearScaleIcon(entry.dataKey)
            }
            {entry.value}
          </li>
        )
      ))}
    </ul>
  );

  const getLinearScaleIcon = (key) => {
    let color = '#11192A'

    if (key === 'expectedValues_A_Ins' || key === 'expectedValues_A_Exp') color = 'rgb(104, 210, 242)'
    if (key === 'flowValue_Ins' || key === 'flowValue_Exp') color = 'rgb(0, 128, 255)'
    if (key === 'flowValue_Bar') color = 'rgb(0, 128, 255)'
    if (key === 'scoreComp') color = 'rgb(65, 62, 160)';
    if (key === 'maxsCore') color = '#FF0303';

    return <LinearScaleIcon sx={{color: color}} />
  }

  const setDataKey = (name) => {
    if (viewType === 1) {
      return `${name}_Exp`;
    }
    if (viewType === 2) {
      return `${name}_Ins`
    }
    return '';
  };

  return (
    <Box sx={{ height: 500, overflow: "hidden" }} >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          width={500}
          height={400}
          data={mockedData}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
          <XAxis dataKey="xAxisPosition" />
          <YAxis width={100} dx={0} label={{ value: tableLegend_Y, angle: -90, position: 'center', fill: 'black', opacity: 0.5 }} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
          {(viewType === 1 || viewType === 2) ? (
            <>
              <Area
                stackId="1"
                type="monotone"
                fill="#FFF"
                stroke="#68d2f2"
                dataKey={setDataKey("expectedValues_B")}
                hide={expectedValuesHide}
              />
              <Area
                stackId="1"
                type="monotone"
                fill="#68d2f2"
                stroke="#68d2f2"
                dataKey={setDataKey("expectedValues_A")}
                name='Valores esperados considerando o filtro selecionado'
                hide={expectedValuesHide}
              />
              <Line
                type="monotone"
                stroke="#0080ff"
                activeDot={{ r: 8 }}
                name={tableLegend_X}
                dataKey={setDataKey("flowValue")}
              />
            </>
          ) : (
            <>
              <Bar
                dataKey="flowValue_Bar"
                name={tableLegend_X}
                barSize={20}
                fill="#0080ff"
                hide={false}
              />
              <Bar
                dataKey="scoreComp"
                name='Razão Comum de Pacientes Selecionados'
                barSize={20}
                fill="#413ea0"
                hide={equalRatioSelectedPatientsHide}
              />
              <Bar
                dataKey="maxsCore"
                name='Porcentagem máxima'
                barSize={20}
                fill="#ff0303"
                hide={maxPercentageHide}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default PlatformGraphComparative;


