from flask import Flask, request, render_template, jsonify, session
import os
from werkzeug.utils import secure_filename
import uuid
from rag import query_pdf
import re
import time
import random
import threading
import psutil
from ollama import Client
from prometheus_client import Counter, Histogram, Gauge, Summary, generate_latest, REGISTRY, CONTENT_TYPE_LATEST

app = Flask(__name__)
app.secret_key = 'resume_analyzer_secret_key'

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Configure Ollama client with the host from environment variable
OLLAMA_HOST = os.environ.get('OLLAMA_HOST')
ollama_client = Client(host=OLLAMA_HOST)

# Create upload directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Initialize Prometheus metrics
REQUESTS = Counter('resume_analyzer_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_TIME = Histogram('resume_analyzer_request_duration_seconds', 'Request duration in seconds', ['method', 'endpoint'])
LLM_REQUEST_TIME = Histogram('resume_analyzer_llm_request_duration_seconds', 'LLM request duration in seconds', ['model', 'request_type'])
RESUME_COUNT = Counter('resume_analyzer_resumes_processed_total', 'Total resumes processed')
JOB_MATCH_SCORE = Histogram('resume_analyzer_job_match_scores', 'Job match scores', buckets=[10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
ACTIVE_USERS = Gauge('resume_analyzer_active_users', 'Number of active users')
SYSTEM_MEMORY = Gauge('resume_analyzer_memory_usage_bytes', 'Memory usage in bytes')
CPU_USAGE = Gauge('resume_analyzer_cpu_usage_percent', 'CPU usage percentage')
LLM_TOKEN_USAGE = Counter('resume_analyzer_llm_tokens_total', 'Total tokens used by LLM', ['model', 'operation'])
ENDPOINTS_USAGE = Counter('resume_analyzer_endpoints_usage_total', 'Endpoints usage count', ['endpoint'])

# Function to update system metrics
def update_system_metrics():
    SYSTEM_MEMORY.set(psutil.virtual_memory().used)
    CPU_USAGE.set(psutil.cpu_percent())

# Simulated metrics for demonstration
def simulate_user_metrics():
    """Generate simulated metrics for the dashboard"""
    while True:
        # Simulate active users (5-50)
        ACTIVE_USERS.set(random.randint(5, 50))
        
        # Update real system metrics
        update_system_metrics()
        
        # Wait before updating again
        time.sleep(5)

# Start the simulation thread
try:
    simulation_thread = threading.Thread(target=simulate_user_metrics, daemon=True)
    simulation_thread.start()
except Exception as e:
    print(f"Failed to start metrics thread: {str(e)}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Create request tracking middleware
@app.before_request
def before_request():
    request.start_time = time.time()
    if not request.path.startswith('/static/'):
        ACTIVE_USERS.inc()
        ENDPOINTS_USAGE.labels(request.path).inc()

@app.after_request
def after_request(response):
    if not request.path.startswith('/static/'):
        request_latency = time.time() - request.start_time
        REQUESTS.labels(request.method, request.path, response.status_code).inc()
        REQUEST_TIME.labels(request.method, request.path).observe(request_latency)
        ACTIVE_USERS.dec()
    return response

# Add metrics endpoint
@app.route('/metrics')
def metrics():
    update_system_metrics()  # Update metrics before serving
    return generate_latest(REGISTRY), 200, {'Content-Type': CONTENT_TYPE_LATEST}

@app.route('/')
def index(): 
    return render_template('index.html')

@app.route('/resume')
def resume():
    return render_template('resume.html')

@app.route('/upload', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'})
        
    file = request.files['resume']
    
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'})
        
    if file and allowed_file(file.filename):
        # Create unique filename to avoid collisions
        filename = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Generate structured summary using predefined questions
        summary = {}
        
        # Predefined questions to ask about the resume
        questions = {
            'skills': 'What are the key skills mentioned in this resume?',
            'experience': 'Summarize the work experience in this resume.',
            'education': 'What is the educational background in this resume?',
            'projects': 'What projects are mentioned in this resume?',
            'summary': 'Provide a concise professional summary of this candidate based on the resume.'
        }
        
        # Process each question
        for category, question in questions.items():
            result = query_pdf(filepath, question)
            if result["status"] == "success":
                summary[category] = {
                    'answer': result["answer"],
                    'sources': result.get("sources", [])
                }
            else:
                summary[category] = {
                    'answer': f"Error analyzing {category}: {result.get('message', 'Unknown error')}",
                    'sources': []
                }
        
        # Job description analysis if provided
        job_description = request.form.get('jobDescription', '').strip()
        if job_description:
            match_analysis = {
                'score': 0,
                'analysis': '',
                'recommendations': ''
            }
            
            # Calculate match score and analysis
            job_analysis_prompt = f"""
            Compare the following resume summary with the job description:

            Resume Summary:
            Skills: {summary['skills']['answer']}
            Experience: {summary['experience']['answer']}
            Education: {summary['education']['answer']}
            Projects: {summary['projects']['answer']}

            Job Description:
            {job_description}

            Provide:
            1. A match score from 0-100 indicating how well the candidate matches the job requirements
            2. A brief analysis of the match, highlighting strengths and gaps
            3. Recommendations for the candidate to improve their match for this position
            """
            
            match_result = query_pdf(filepath, job_analysis_prompt)
            if match_result["status"] == "success":
                # Parse the response to extract score, analysis and recommendations
                response_text = match_result["answer"]
                
                # Try to extract score
                score_match = re.search(r'(\d{1,3})(?:\s*\/\s*100|\s*\%)', response_text)
                if score_match:
                    match_analysis['score'] = int(score_match.group(1))
                
                # Split response into sections
                sections = response_text.split('\n\n')
                if len(sections) >= 2:
                    match_analysis['analysis'] = sections[0]
                if len(sections) >= 3:
                    match_analysis['recommendations'] = sections[1]
                else:
                    match_analysis['analysis'] = response_text
                    
            summary['job_match'] = match_analysis
        
        # Clean up the file after analysis
        try:
            os.remove(filepath)
        except:
            pass
            
        return jsonify({'status': 'success', 'summary': summary})
        
    return jsonify({'status': 'error', 'message': 'Only PDF files are allowed'})
    
@app.route('/about', methods=['GET'])
def about():
    return render_template('about.html')

@app.route('/job-generator', methods=['GET', 'POST'])
def job_generator():
    if request.method == 'POST':
        job_data = request.form.get('jobDescription', '').strip()
        
        if not job_data:
            return jsonify({'status': 'error', 'message': 'Job description is required'})
        
        # Generate comprehensive job details using LLM
        job_analysis_prompt = f"""
        Create a comprehensive hiring plan and job analysis report based on this job description:

        {job_data}

        Format your response in these sections:
        1. JOB OVERVIEW: A concise summary of the role and its importance to the organization
        2. KEY RESPONSIBILITIES: 5-7 detailed bullet points of core duties
        3. REQUIRED QUALIFICATIONS: 5-6 specific must-have qualifications
        4. PREFERRED QUALIFICATIONS: 3-4 "nice-to-have" qualifications
        5. HIRING PROCESS: Recommended interview process with assessment methods
        6. CANDIDATE EVALUATION CRITERIA: Specific criteria for evaluating candidates
        7. MARKET INSIGHTS: Salary range, talent pool availability, and hiring timeline
        8. ONBOARDING PLAN: 30-60-90 day success metrics for the new hire
        """
        
        try:
            # Track LLM request time
            llm_start_time = time.time()
            
            # Use Ollama client to chat with the model
            response = ollama_client.chat(
                model='llama3.2:1b',
                messages=[{'role': 'user', 'content': job_analysis_prompt}],
                stream=False,
            )
            
            # Record metrics
            llm_duration = time.time() - llm_start_time
            LLM_REQUEST_TIME.labels('llama3.2:1b', 'job_generator').observe(llm_duration)
            LLM_TOKEN_USAGE.labels('llama3.2:1b', 'job_generator').inc(max(1, len(job_analysis_prompt) // 4))
            
            # Extract the answer from the response
            answer = response['message']['content']
            
            return jsonify({
                'status': 'success', 
                'analysis': answer
            })
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)})
    
    # GET request - render the form template
    return render_template('job_generator.html')

@app.route('/interview-questions', methods=['GET', 'POST'])
def interview_questions():
    if request.method == 'POST':
        job_title = request.form.get('job_title', '').strip()
        experience_level = request.form.get('experience_level', '').strip()
        skills = request.form.get('skills', '').strip()
        question_count = int(request.form.get('question_count', 10))
        
        if not job_title:
            return jsonify({'status': 'error', 'message': 'Job title is required'})
        
        prompt = f"""
        Generate {question_count} interview questions for a {job_title} position
        Experience level: {experience_level if experience_level else 'Any'}
        Required skills: {skills if skills else 'General technical skills'}
        
        Format your response as a numbered list of questions, grouped into these categories:
        - Technical Questions
        - Behavioral Questions
        - Problem-Solving Questions
        - Culture Fit Questions
        
        For each technical question, also provide an ideal answer or key points that should be covered in the response.
        """
        
        try:
            # Track LLM request time
            llm_start_time = time.time()
            
            response = ollama_client.chat(
                model='llama3.2:1b',
                messages=[{'role': 'user', 'content': prompt}],
                stream=False,
            )
            
            # Record metrics
            llm_duration = time.time() - llm_start_time
            LLM_REQUEST_TIME.labels('llama3.2:1b', 'interview_questions').observe(llm_duration)
            LLM_TOKEN_USAGE.labels('llama3.2:1b', 'interview_questions').inc(max(1, len(prompt) // 4))
            
            questions = response['message']['content']
            
            return jsonify({
                'status': 'success',
                'questions': questions
            })
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)})
    
    return render_template('interview_questions.html')

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        message = request.form.get('message', '').strip()
        
        if not name or not email or not message:
            return jsonify({'status': 'error', 'message': 'Name, email, and message are required'})
        
        # Send email or save to database
        
        return jsonify({'status': 'success', 'message': 'Thank you for your message!'})
    
    return render_template('contact.html')

if __name__ == '__main__':
    # Add psutil to requirements.txt
    app.run(debug=False, host='0.0.0.0', port=5001)