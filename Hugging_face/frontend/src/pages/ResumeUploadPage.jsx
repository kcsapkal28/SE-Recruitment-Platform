import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Send as SendIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  SourceOutlined as SourceOutlinedIcon,
  RestartAlt as RestartAltIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Delete as DeleteIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ResumeUploadPage = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const navigate = useNavigate();

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
      // Reset analysis state when new file is selected
      setUploadSuccess(false);
      setAnswer('');
      setSources([]);
    } else {
      setFile(null);
      setFileName('');
      setError('Please select a valid PDF file');
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('resume', file);

      // Send to Flask backend
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadSuccess(true);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle asking questions about the resume
  const handleAskQuestion = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    if (!uploadSuccess) {
      setError('Please upload a resume first');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question }),
      });

      const result = await response.json();

      if (response.ok) {
        setAnswer(result.answer);
        setSources(result.sources || []);
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Server error: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Clear current session
  const handleClearSession = async () => {
    try {
      await fetch('http://localhost:5000/clear', {
        method: 'POST',
      });

      // Reset all states
      setFile(null);
      setFileName('');
      setUploadSuccess(false);
      setAnswer('');
      setSources([]);
      setQuestion('');
      setError('');
    } catch (err) {
      setError('Error clearing session: ' + err.message);
    }
  };

  // Sample questions
  const sampleQuestions = [
    "What are the candidate's key skills?",
    "What is their work experience?",
    "What programming languages do they know?",
    "Summarize the candidate's education background.",
    "What leadership roles have they had?"
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Resume Analysis
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload a resume in PDF format to analyze its content and get insights.
      </Typography>

      <Box sx={{ mt: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        {/* Upload Section */}
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Upload Resume
          </Typography>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <input
              type="file"
              accept="application/pdf"
              id="resume-upload"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <label htmlFor="resume-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                sx={{ mb: 2 }}
                disabled={uploading}
              >
                Select PDF
              </Button>
            </label>

            {fileName && (
              <Box sx={{ mt: 1, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" noWrap sx={{ maxWidth: '200px' }}>
                  {fileName}
                </Typography>
                <IconButton size="small" onClick={() => {
                  setFile(null);
                  setFileName('');
                }} sx={{ ml: 1 }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!file || uploading}
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ mt: 1 }}
            >
              {uploading ? 'Uploading...' : 'Upload Resume'}
            </Button>

            {uploadSuccess && (
              <Alert icon={<CheckCircleOutlineIcon />} severity="success" sx={{ mt: 2 }}>
                Resume uploaded successfully!
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Tooltip title="Clear current session and start over">
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<RestartAltIcon />}
                onClick={handleClearSession}
              >
                Clear Session
              </Button>
            </Tooltip>
          </Box>
        </Paper>

        {/* Ask Questions Section */}
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, flex: 1.5 }}>
          <Typography variant="h6" gutterBottom>
            Ask Questions About the Resume
          </Typography>

          <Box sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Ask a question about the resume"
              variant="outlined"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={!uploadSuccess || analyzing}
              placeholder="e.g., What are their key skills?"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={handleAskQuestion}
                    disabled={!uploadSuccess || analyzing || !question.trim()}
                  >
                    <SendIcon />
                  </IconButton>
                ),
              }}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Sample questions:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {sampleQuestions.map((q, index) => (
                  <Chip
                    key={index}
                    label={q}
                    onClick={() => setQuestion(q)}
                    disabled={!uploadSuccess || analyzing}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {analyzing && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {answer && (
            <Box sx={{ mt: 4 }}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <RecordVoiceOverIcon color="primary" sx={{ mr: 1, mt: 0.5 }} />
                    <Typography variant="body1">{answer}</Typography>
                  </Box>

                  {sources.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                        <SourceOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Sources:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                        {sources.map((source, index) => (
                          <Chip
                            key={index}
                            label={source}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </Paper>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/')}
        >
          Back to Home
        </Button>

        {uploadSuccess && (
          <Button
            variant="contained"
            onClick={() => navigate('/upload-job')}
            endIcon={<ArrowForwardIcon />}
          >
            Upload Job Description
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default ResumeUploadPage;