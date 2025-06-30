import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Components
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import QueryPage from './pages/QueryPage';
import FileUpload from './components/FileUpload';

// Create a theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/upload" element={<FileUpload />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

export default App;
