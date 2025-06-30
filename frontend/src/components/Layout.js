import React, { useState } from 'react';
import { AppBar, Box, Drawer, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const drawerWidth = 240;
const collapsedDrawerWidth = 60;

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDesktopDrawerToggle = () => {
    setDesktopOpen(!desktopOpen);
  };

  const getCurrentDrawerWidth = () => {
    return desktopOpen ? drawerWidth : collapsedDrawerWidth;
  };
  const mobileDrawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          AI Agent Portal
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem button component={Link} to="/">
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button component={Link} to="/upload">
          <ListItemIcon>
            <UploadFileIcon />
          </ListItemIcon>
          <ListItemText primary="Import Data" />
        </ListItem>
        <ListItem button component={Link} to="/query">
          <ListItemIcon>
            <ChatIcon />
          </ListItemIcon>
          <ListItemText primary="Query Agent" />
        </ListItem>
      </List>
    </div>
  );

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ display: desktopOpen ? 'block' : 'none' }}>
          AI Agent Portal
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem button component={Link} to="/">
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" sx={{ display: desktopOpen ? 'block' : 'none' }} />
        </ListItem>
        <ListItem button component={Link} to="/upload">
          <ListItemIcon>
            <UploadFileIcon />
          </ListItemIcon>
          <ListItemText primary="Import Data" sx={{ display: desktopOpen ? 'block' : 'none' }} />
        </ListItem>
        <ListItem button component={Link} to="/query">
          <ListItemIcon>
            <ChatIcon />
          </ListItemIcon>
          <ListItemText primary="Query Agent" sx={{ display: desktopOpen ? 'block' : 'none' }} />
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDesktopDrawerToggle}
            sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
          >
            {desktopOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            AI Agent Portal
          </Typography>
        </Toolbar>
      </AppBar>
        <Box
        component="nav"
        sx={{ width: { sm: getCurrentDrawerWidth() }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {mobileDrawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: getCurrentDrawerWidth(),
              transition: 'width 0.3s ease',
              overflowX: 'hidden'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
        <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${getCurrentDrawerWidth()}px)` },
          transition: 'width 0.3s ease'
        }}
      >
        <Toolbar />        {children}
      </Box>
    </Box>
  );
}

export default Layout;
