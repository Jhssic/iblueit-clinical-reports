import React, { useState } from 'react';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend } from 'recharts';
import { Box } from "@mui/material";
import './style.css'

const MiniGamesGraphComparative = ({ tableLegend_Y, tableLegend_X, data }) => {
  const [expectedValuesHide, setExpectedValuesHide] = useState(false);


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const values = [];
      let messageFlowValue = '';
      let messageExpectedValues = '';
      for (const element of payload) {
        if (element.name === 'expectedValues_B') {
          values.push(element.value);
        } else if (element.dataKey === "expectedValues_A") {
          messageExpectedValues = element.name;
          values.push(element.value);
        } else {
          messageFlowValue = `${element.name}: ${element.value}L/min`;
        }
      }
      if (values.length) messageExpectedValues = `${messageExpectedValues}: ${values[0]}L/min - ${values[0] + values[1]}L/min`
      return (
        <div className="custom-tooltip" style={{ backgroundColor: '#F9FAFC', border: 'solid 1px #E9EAED' }}>
          <p className="label" style={{ margin: '0 5px' }}>{label}</p>
          <p className="intro" style={{ margin: '0 8px' }}>{messageFlowValue}</p>
          <p className="intro" style={{ margin: '0 8px' }}>{messageExpectedValues}</p>
        </div >
      );
    }
    return null;
  };

  const renderLegend = (props) => (
    <ul className="recharts-default-legend" style={{ padding: '0px', margin: '0px', display: 'flex', textAlign: 'center', justifyContent: 'center' }}>
      {props.payload.map((entry, index) => (
        (entry.value !== 'expectedValues_B') && (
          <li
            onClick={() => (entry.dataKey === 'expectedValues_A') ? setExpectedValuesHide(!expectedValuesHide) : {}}
            className={`recharts-legend-item legend-item-${index} ${(entry.dataKey === 'expectedValues_A' && expectedValuesHide) ? 'inactive' : ''} ${(!expectedValuesHide && entry.dataKey === 'expectedValues_A') ? 'legend' : ''}`}
            style={{ display: 'flex', marginRight: '10px' }}
            key={`item-${index}`}>
            {getLinearScaleIcon(entry.dataKey)}
            {entry.value}
          </li>
        )
      ))}
    </ul>
  );

  const getLinearScaleIcon = (key) => {
    let color = '#11192A'
    if (key === 'expectedValues_A') color = 'rgb(104, 210, 242)'
    if (key === 'flowValue') color = 'rgb(0, 128, 255)'

    return <LinearScaleIcon sx={{ color: color }} />
  }

  return (
    <Box sx={{ height: 500, overflow: "hidden" }} >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          width={500}
          height={400}
          data={testData}
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
          <Area type="monotone" dataKey="expectedValues_B" stackId="1" stroke="#68d2f2" fill="#FFF" hide={expectedValuesHide} />
          <Area type="monotone" dataKey="expectedValues_A" stackId="1" name='Valores esperados considerando o filtro selecionado' stroke="#68d2f2" fill="#68d2f2" hide={expectedValuesHide} />
          <Line type="monotone" dataKey="flowValue" stroke="#0080ff" name={tableLegend_X} activeDot={{ r: 8 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default MiniGamesGraphComparative;

const testData = [{
  xAxisPosition: '1',
  expectedValues_A: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
  expectedValues_B: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
  flowValue: Math.floor(Math.random() * (280 - 270 + 1)) + 270
}, {
  xAxisPosition: '2',
  expectedValues_A: Math.floor(Math.random() * (270 - 260 + 1)) + 260,
  expectedValues_B: Math.floor(Math.random() * (170 - 160 + 1)) + 160,
  flowValue: Math.floor(Math.random() * (240 - 230 + 1)) + 230
}, {
  xAxisPosition: '3',
  expectedValues_A: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
  expectedValues_B: Math.floor(Math.random() * (160 - 150 + 1)) + 150,
  flowValue: Math.floor(Math.random() * (280 - 270 + 1)) + 270
}, {
  xAxisPosition: '4',
  expectedValues_A: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
  expectedValues_B: Math.floor(Math.random() * (150 - 140 + 1)) + 140,
  flowValue: Math.floor(Math.random() * (210 - 200 + 1)) + 200
}, {
  xAxisPosition: '5',
  expectedValues_A: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
  expectedValues_B: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
  flowValue: Math.floor(Math.random() * (210 - 200 + 1)) + 200
}, {
  xAxisPosition: '6',
  expectedValues_A: Math.floor(Math.random() * (260 - 250 + 1)) + 250,
  expectedValues_B: Math.floor(Math.random() * (150 - 140 + 1)) + 140,
  flowValue: Math.floor(Math.random() * (240 - 230 + 1)) + 230
}, {
  xAxisPosition: '7',
  expectedValues_A: Math.floor(Math.random() * (280 - 270 + 1)) + 270,
  expectedValues_B: Math.floor(Math.random() * (120 - 110 + 1)) + 110,
  flowValue: Math.floor(Math.random() * (230 - 220 + 1)) + 220
}, {
  xAxisPosition: '8',
  expectedValues_A: Math.floor(Math.random() * (270 - 260 + 1)) + 260,
  expectedValues_B: Math.floor(Math.random() * (120 - 110 + 1)) + 110,
  flowValue: Math.floor(Math.random() * (220 - 210 + 1)) + 210
}, {
  xAxisPosition: '9',
  expectedValues_A: Math.floor(Math.random() * (260 - 250 + 1)) + 250,
  expectedValues_B: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
  flowValue: Math.floor(Math.random() * (170 - 160 + 1)) + 160
}, {
  xAxisPosition: '10',
  expectedValues_A: Math.floor(Math.random() * (300 - 290 + 1)) + 290,
  expectedValues_B: Math.floor(Math.random() * (140 - 130 + 1)) + 130,
  flowValue: Math.floor(Math.random() * (150 - 140 + 1)) + 140
}];
