import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Box, 
  CircularProgress,
  Alert,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';

function DataPage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [accNo, setAccNo] = useState('');
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // For demonstration, we'll add some dummy tables
  // In a real app, you would fetch this from your backend
  useEffect(() => {
    setTables(['users', 'transactions', 'products', 'orders']);
  }, []);

  const handleTableChange = (event) => {
    setSelectedTable(event.target.value);
    // Reset data when table changes
    setData([]);
    setColumns([]);
  };

  const handleSearch = async () => {
    if (!selectedTable) {
      setError('Please select a table first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/fetch-data', {
        table: selectedTable,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search,
        acc_no: accNo
      });
      
      setData(response.data.data);
      setColumns(response.data.columns);
      setPage(1); // Reset to first page
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.detail || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const displayData = data.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Data Browser
      </Typography>
      <Typography variant="body1" paragraph>
        Browse and search database tables.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="table-select-label">Select Table</InputLabel>
              <Select
                labelId="table-select-label"
                value={selectedTable}
                label="Select Table"
                onChange={handleTableChange}
              >
                {tables.map((table) => (
                  <MenuItem key={table} value={table}>
                    {table}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Search"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search across all columns"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Account Number"
              fullWidth
              value={accNo}
              onChange={(e) => setAccNo(e.target.value)}
              placeholder="Filter by account number"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSearch}
                disabled={loading || !selectedTable}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              >
                {loading ? 'Fetching...' : 'Search'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {columns.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column}>
                      <Typography variant="subtitle2">{column}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column) => (
                      <TableCell key={`${rowIndex}-${column}`}>
                        {row[column] !== null ? String(row[column]) : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {data.length > rowsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(data.length / rowsPerPage)}
                page={page}
                onChange={handleChangePage}
                color="primary"
              />
            </Box>
          )}
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {Math.min(displayData.length, rowsPerPage)} of {data.length} results
            </Typography>
          </Box>
        </Paper>
      )}
    </div>
  );
}

export default DataPage;
