import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box
      sx={{
        mt: 4,
        py: 2,
        textAlign: 'center',
        borderTop: '1px solid #444',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} AI Recruitment Platform. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
