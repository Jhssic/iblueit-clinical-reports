import React from 'react';
import ReactLoading from 'react-loading';
import Box from '@mui/material/Box';
import { useMyContext } from "../../providers/MyContext";

const Loading = () => {
  const context = useMyContext();

  if (context.loading) {
    return (
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        position: 'fixed',
        zIndex: '9999',
        bottom: '0',
        right: '0',
        left: '0',
        top: '0',
      }}>
        < Box sx={{
          display: 'flex',
          justifyContent: 'center',
          mt: '25vh',
        }}>
          <ReactLoading
            type='spinningBubbles'
            color="#FFF"
            height={'20%'}
            width={'20%'}
          />
        </Box >
      </div >
    );
  }
  return '';
}

export default Loading;