import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const Navbar = ({ currentUser }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          <Button color="inherit" component={Link} to="/">Home</Button>
          {currentUser && (
            <Button color="inherit" component={Link} to="/upload-resume">Upload Resume</Button>
          )}
        </Typography>
        {currentUser ? (
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        ) : (
          <Button color="inherit" component={Link} to="/login">Login</Button>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
