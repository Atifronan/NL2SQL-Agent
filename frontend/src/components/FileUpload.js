import React, { useState } from 'react';
import {
  Button,
  TextField,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://127.0.0.1:8000/api';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [tableName, setTableName] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTableName, setDeleteTableName] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);
      // Generate a default table name from the file name
      const defaultTableName = file.name
        .toLowerCase()
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/[^a-z0-9]/g, '_'); // Replace non-alphanumeric with underscore
      setTableName(defaultTableName);
    }
  };    const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!file) {
      setNotification({
        open: true,
        message: 'Please select a file to upload',
        severity: 'error'
      });
      return;
    }    const formData = new FormData();
    formData.append('file', file);
    formData.append('table_name', tableName || '');

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/import-file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setNotification({
        open: true,
        message: response.data.message,
        severity: 'success'
      });

      // Clear form
      setFile(null);
      setTableName('');
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      setNotification({
        open: true,
        message: error.response?.data?.detail || 'Error uploading file',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleDeleteTable = async () => {
    if (!deleteTableName) {
      setNotification({
        open: true,
        message: 'Please enter a table name',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(`${API_URL}/delete-table/${deleteTableName}`);
      setNotification({
        open: true,
        message: response.data.message,
        severity: 'success'
      });
      setDeleteTableName('');
      setDeleteDialogOpen(false);
    } catch (error) {
      setNotification({
        open: true,
        message: error.response?.data?.detail || 'Error deleting table',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', my: 2 }}>
      <Typography variant="h6" gutterBottom>
        Import Data File
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <input
          accept=".xlsx,.csv"
          style={{ display: 'none' }}
          id="raised-button-file"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="raised-button-file">
          <Button
            variant="outlined"
            component="span"
            startIcon={<UploadFileIcon />}
            sx={{ mb: 2 }}
            fullWidth
          >
            Select File (.xlsx or .csv)
          </Button>
        </label>
        {file && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Selected file: {file.name}
          </Typography>
        )}
        <TextField
          fullWidth
          label="Table Name (optional)"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          margin="normal"
          helperText="Leave blank to use the file name as table name"
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            'Upload and Import'
          )}
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
          sx={{ mt: 2 }}
          fullWidth
        >
          Delete Table
        </Button>
      </Box>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Table</DialogTitle>        <DialogContent>
          <DialogContentText>
            Please enter the name of the table you want to delete from schema.db database. This action cannot be undone.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Table Name"
            fullWidth
            value={deleteTableName}
            onChange={(e) => setDeleteTableName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteTable} color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default FileUpload;
