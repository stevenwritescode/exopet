import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000', // Set the default background color to black
      paper: '#424242', // Optional: Set paper elements background if needed
    },
    // ... other palette settings
  },
  // ... other theme settings
});

export default theme;
