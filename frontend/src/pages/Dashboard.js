import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';

function Dashboard() {
  const [transactionData, setTransactionData] = useState([]);
  const [merchantData, setMerchantData] = useState([]);  
  const [totalTransaction, setTotalTransaction] = useState(0);  
  const [maxTransaction, setMaxTransaction] = useState(0);
  const [avgTransaction, setAvgTransaction] = useState(0);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [serviceOptions, setServiceOptions] = useState([]);  const [loading, setLoading] = useState(true);  const handleLineChartClick = (data, index) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedData = data.activePayload[0].payload;
      console.log('Line chart clicked:', clickedData);
      // Use the original SQL date for filtering
      setSelectedDate(clickedData.sqlDate);
    }
  };const handleBarChartClick = (data, index) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedData = data.activePayload[0].payload;
      console.log('Bar chart clicked:', clickedData);
      setSelectedMerchant(clickedData.merchant);
      // Alert will be removed in favor of filtering functionality
    }
  };  const handleRefresh = () => {
    setLoading(true);
    setSelectedMerchant(null);
    setSelectedDate(null);
    setSelectedService('');
    // This will trigger useEffect to refetch all original data
  };useEffect(() => {
    const fetchData = async () => {      
      setLoading(true);
      try {
        // Fetch service options first (only on initial load or refresh)
        if (serviceOptions.length === 0) {
          const serviceQuery = `SELECT "TXN_TYPE" FROM rvb_rvc_remittance_9_jun_15_jun_2025 as remittance GROUP BY "TXN_TYPE"`;
          const serviceResponse = await axios.post('http://localhost:8000/api/direct-query', {
            question: serviceQuery
          });
          
          if (serviceResponse.data.data) {
            const services = serviceResponse.data.data.map(item => item.TXN_TYPE);
            setServiceOptions(services);
          }
        }

        // Build WHERE clause for merchant filter
        const merchantFilter = selectedMerchant ? `"MERCHANT_NAME" = '${selectedMerchant}'` : '';
        
        // Build WHERE clause for date filter
        const dateFilter = selectedDate ? `"APPROVAL_DATETIME"::date = '${selectedDate}'` : '';
        
        // Build WHERE clause for service filter
        const serviceFilter = selectedService ? `"TXN_TYPE" = '${selectedService}'` : '';
        
        // Combine filters
        const filters = [merchantFilter, dateFilter, serviceFilter].filter(Boolean);
        const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
        
        // For merchant chart, only apply date and service filters (not merchant filter)
        const merchantFilters = [dateFilter, serviceFilter].filter(Boolean);
        const merchantWhereClause = merchantFilters.length > 0 ? `WHERE ${merchantFilters.join(' AND ')}` : '';
        
        // Fetch transaction count data
        const countQuery = `select "APPROVAL_DATETIME"::date as date, COUNT("TXN_AMT") as total_amount 
                    from rvb_rvc_remittance_9_jun_15_jun_2025 as remittance
                    ${whereClause}
                    group by "APPROVAL_DATETIME"::date
                    order by date`;
        
        const countResponse = await axios.post('http://localhost:8000/api/direct-query', {
          question: countQuery
        });        // Fetch merchant data - Always show all merchants for the bar chart, only filter by date and service if needed
        const merchantQuery = `select "MERCHANT_NAME", SUM("TXN_AMT") as total_amount 
                             from rvb_rvc_remittance_9_jun_15_jun_2025 as remittance
                             ${merchantWhereClause}
                             GROUP BY "MERCHANT_NAME"
                             ORDER BY total_amount DESC
                             LIMIT 10`;const merchantResponse = await axios.post('http://localhost:8000/api/direct-query', {
          question: merchantQuery
        });// Fetch total transaction data
        const totalTransactionQuery = `select sum("TXN_AMT") as total_amount from rvb_rvc_remittance_9_jun_15_jun_2025 as remittance ${whereClause}`;
        
        const totalTransactionResponse = await axios.post('http://localhost:8000/api/direct-query', {
          question: totalTransactionQuery
        });// Fetch maximum transaction data
        const maxTransactionQuery = `select max("TXN_AMT") as max_amount from rvb_rvc_remittance_9_jun_15_jun_2025 as remittance ${whereClause}`;
        
        const maxTransactionResponse = await axios.post('http://localhost:8000/api/direct-query', {
          question: maxTransactionQuery
        });        // Fetch average transaction data
        const avgTransactionQuery = `select avg("TXN_AMT") as avg_amount from rvb_rvc_remittance_9_jun_15_jun_2025 as remittance ${whereClause}`;
        
        const avgTransactionResponse = await axios.post('http://localhost:8000/api/direct-query', {
          question: avgTransactionQuery
        });        if (countResponse.data.data) {
          const formattedCountData = countResponse.data.data.map(item => ({
            date: new Date(item.date).toLocaleDateString(),
            sqlDate: item.date, // keep the original SQL date
            total_amount: parseFloat(item.total_amount)
          }));
          setTransactionData(formattedCountData);
        }if (merchantResponse.data.data) {
          console.log('Raw merchant response:', merchantResponse.data.data);          const formattedMerchantData = merchantResponse.data.data.map(item => {
            const amount = parseFloat(item.total_amount);
            console.log('Processing merchant:', item["MERCHANT_NAME"], 'Amount:', amount);
            return {
              merchant: item["MERCHANT_NAME"],
              amount: amount,
              fill: item["MERCHANT_NAME"] === selectedMerchant ? "#4CAF50" : "#82ca9d"
            };
          });
          console.log('Formatted merchant data:', formattedMerchantData);          setMerchantData(formattedMerchantData);
        }

        if (totalTransactionResponse.data.data && totalTransactionResponse.data.data.length > 0) {
          const totalAmount = parseFloat(totalTransactionResponse.data.data[0].total_amount);
          setTotalTransaction(totalAmount);
        }if (maxTransactionResponse.data.data && maxTransactionResponse.data.data.length > 0) {
          const maxAmount = parseFloat(maxTransactionResponse.data.data[0].max_amount);
          setMaxTransaction(maxAmount);
        }        if (avgTransactionResponse.data.data && avgTransactionResponse.data.data.length > 0) {
          const avgAmount = parseFloat(avgTransactionResponse.data.data[0].avg_amount);
          setAvgTransaction(avgAmount);
        }        
        // Remove excessive delay for loading
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };fetchData();
  }, [selectedMerchant, selectedDate, selectedService]);  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Transaction Analysis Dashboard
            </Typography>            
            <Typography variant="body1" gutterBottom>
              Daily transaction amount overview 
              {selectedMerchant && ` - Filtered by Merchant: ${selectedMerchant}`}
              {selectedDate && ` - Filtered by Date: ${new Date(selectedDate).toLocaleDateString()}`}
              {selectedService && ` - Filtered by Service: ${selectedService}`}
            </Typography>
            {(selectedMerchant || selectedDate || selectedService) && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {selectedMerchant && (
                  <Chip 
                    label={`Merchant: ${selectedMerchant}`}
                    onDelete={() => setSelectedMerchant(null)}
                    color="primary"
                    variant="outlined"
                  />
                )}                
                {selectedDate && (
                  <Chip 
                    label={`Date: ${new Date(selectedDate).toLocaleDateString()}`}
                    onDelete={() => setSelectedDate(null)}
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {selectedService && (
                  <Chip 
                    label={`Service: ${selectedService}`}
                    onDelete={() => setSelectedService('')}
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
            )}
          </Box>
          <IconButton
            onClick={handleRefresh}
            color="primary"
            size="large"
            sx={{ 
              bgcolor: 'action.hover',
              '&:hover': {
                bgcolor: 'primary.light',
                color: 'white'
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Paper>      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>          
          <Paper sx={{ p: 2 }}>            
            <Typography variant="h6" gutterBottom>
              Total Transaction Count vs Date 
              {selectedMerchant && `(${selectedMerchant})`}
              {selectedDate && `(${new Date(selectedDate).toLocaleDateString()})`}
            </Typography>
            <Box sx={{ height: 400, width: '100%' }}>              
              <ResponsiveContainer>
                <LineChart
                  data={transactionData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                  onClick={handleLineChartClick}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    tickFormatter={(value) => `${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value.toLocaleString()} `, 'Total Count']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_amount"
                    name="Total Transaction Count"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>        <Grid item xs={12} md={4}>
          <Grid container spacing={2} direction="column">            
            <Grid item>
              <Card sx={{ 
                height: 146, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                backgroundColor: '#f0f8ff'
              }}>
                <CardContent sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Total Transaction
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ 
                    fontWeight: 'bold', 
                    color: '#1976d2', 
                    mb: 0.5
                  }}>
                    ৳{totalTransaction.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sum of all transactions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>              
            <Grid item>
              <Card sx={{ 
                height: 146, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                backgroundColor: '#f0f8ff'
              }}>
                <CardContent sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Maximum Transaction
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ 
                    fontWeight: 'bold', 
                    color: '#1976d2', 
                    mb: 0.5
                  }}>
                    ৳{maxTransaction.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Highest single transaction
                  </Typography>
                </CardContent>
              </Card>
            </Grid>              
            <Grid item>
              <Card sx={{ 
                height: 146, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                backgroundColor: '#f0f8ff'
              }}>
                <CardContent sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Average Transaction
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ 
                    fontWeight: 'bold', 
                    color: '#1976d2', 
                    mb: 0.5
                  }}>
                    ৳{avgTransaction.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Average transaction amount
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>      </Grid>      
      
      <Paper sx={{ p: 2, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Transaction Amount by Merchant
            {selectedDate && ` (${new Date(selectedDate).toLocaleDateString()})`}
            {selectedMerchant && ` - Highlighting: ${selectedMerchant}`}
            {selectedService && ` - Service: ${selectedService}`}
          </Typography>
          
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel id="service-select-label">Services</InputLabel>
            <Select
              labelId="service-select-label"
              id="service-select"
              value={selectedService}
              label="Services"
              onChange={(event) => setSelectedService(event.target.value)}
            >
              <MenuItem value="">
                <em>All Services</em>
              </MenuItem>
              {serviceOptions.map((service) => (
                <MenuItem key={service} value={service}>
                  {service}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ height: 780, width: '100%' }}>
          <ResponsiveContainer>            
            <BarChart
              data={merchantData}              
              margin={{
                top: 30,
                right: 40,
                left: 2,
                bottom: 20,
              }}
              onClick={handleBarChartClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="merchant" 
                angle={-45}
                textAnchor="end"
                height={150}
                interval={0}
                tick={{
                  fontSize: 11,
                  fill: '#666',
                }}
                tickMargin={40}
              />              
              <YAxis 
                tickFormatter={(value) => `${value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`}
                width={180}
                allowDataOverflow={false}
                allowDecimals={true}
                domain={[0, 'auto']}
                tickCount={10}
                tick={{ fontSize: 12 }}
                interval={0}
              />              
              <Tooltip                
                formatter={(value) => [
                  `${value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} taka`, 
                  'Transaction Amount'
                ]}
                cursor={{ fill: 'transparent' }}
              />
              <Legend />              
              <Bar 
                dataKey="amount" 
                name="Transaction Amount" 
                maxBarSize={60}
              >
                {merchantData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
}

export default Dashboard;
