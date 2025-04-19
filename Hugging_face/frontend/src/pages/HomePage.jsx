import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  Fade,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Work as WorkIcon,
  Compare as CompareIcon,
  History as HistoryIcon,
  Insights as InsightsIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { auth } from "../firebase"; // or "./firebase" depending on path

const HomePage = () => {
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('offline');
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  // Check backend server status
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/');
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('error');
        }
      } catch (error) {
        console.error('Server check failed:', error);
        setServerStatus('offline');
      } finally {
        setLoading(false);
      }
    };

    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged(user => {
      setAuthenticated(!!user);
    });

    checkServerStatus();

    return () => unsubscribe();
  }, []);

  const features = [
    {
      title: 'Resume Analysis',
      description: 'Upload a resume and get AI-powered insights and analysis.',
      icon: <CloudUploadIcon fontSize="large" color="primary" />,
      action: () => navigate('/upload-resume'),
      needsAuth: true
    },
    {
      title: 'Job Description Analysis',
      description: 'Upload job descriptions and extract key requirements.',
      icon: <WorkIcon fontSize="large" color="primary" />,
      action: () => navigate('/upload-job'),
      needsAuth: true
    },
    {
      title: 'Match Resumes to Jobs',
      description: 'Find the best candidates for specific job roles.',
      icon: <CompareIcon fontSize="large" color="primary" />,
      action: () => navigate('/match-results'),
      needsAuth: true
    },
    {
      title: 'Previous Matches',
      description: 'View history of past resume and job matches.',
      icon: <HistoryIcon fontSize="large" color="primary" />,
      action: () => navigate('/history'),
      needsAuth: true
    },
    {
      title: 'Insights & Analytics',
      description: 'Visual analytics on match percentages and skill gaps.',
      icon: <InsightsIcon fontSize="large" color="primary" />,
      action: () => navigate('/insights'),
      needsAuth: true
    }
  ];

  return (
    <Fade in={!loading} timeout={1000}>
      <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
        {/* Hero Section */}
        <Box sx={{ mb: 8, textAlign: 'center' }}>
          <Typography variant="h2" component="h1" gutterBottom>
            AI-Powered Recruitment Platform
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Streamline your recruitment process with advanced AI matching, resume analysis, and job description insights.
          </Typography>

          {!authenticated && (
            <Box sx={{ mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                color="primary"
                onClick={() => navigate('/login')}
                sx={{ mr: 2 }}
              >
                Sign In
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/register')}
              >
                Register
              </Button>
            </Box>
          )}

          {/* Server Status Indicator */}
          <Paper
            elevation={1}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              p: 1,
              pl: 2,
              pr: 2,
              mt: 4,
              borderRadius: 4,
              bgcolor: serverStatus === 'online'
                ? 'rgba(46, 125, 50, 0.1)'
                : 'rgba(211, 47, 47, 0.1)'
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                mr: 1,
                bgcolor: serverStatus === 'online' ? 'success.main' : 'error.main'
              }}
            />
            <Typography variant="body2">
              {serverStatus === 'online'
                ? 'AI Engine Connected'
                : 'AI Engine Offline - Some features may be unavailable'}
            </Typography>
          </Paper>
        </Box>

        <Divider sx={{ mb: 8 }} />

        {/* Features Section */}
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
          Platform Features
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-10px)',
                    boxShadow: theme.shadows[10]
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 4 }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ p: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={feature.action}
                    endIcon={<ArrowForwardIcon />}
                    disabled={feature.needsAuth && !authenticated}
                  >
                    {feature.needsAuth && !authenticated ? 'Login Required' : 'Get Started'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* How It Works Section */}
        <Box sx={{ mt: 8 }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
            How It Works
          </Typography>

          <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
            <Grid container spacing={4}>
              {[
                {
                  step: 1,
                  title: 'Upload Documents',
                  description: 'Upload resumes and job descriptions in PDF format.'
                },
                {
                  step: 2,
                  title: 'AI Processing',
                  description: 'Our AI engine analyzes the content using advanced RAG techniques.'
                },
                {
                  step: 3,
                  title: 'View Results',
                  description: 'Get detailed matches, insights, and recommendations.'
                }
              ].map((item, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Typography
                      variant="h1"
                      sx={{
                        fontWeight: 'bold',
                        color: 'primary.main',
                        opacity: 0.2,
                        mb: 2
                      }}
                    >
                      {item.step}
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {item.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {item.description}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Box>
      </Container>
    </Fade>
  );
};

export default HomePage;