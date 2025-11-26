# Use Python 3.10 slim image (compatible with pandas/scikit-learn)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy only requirements first (for caching)
COPY requirements.txt .

# Upgrade pip and install dependencies
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the ML service code
COPY service/ ./service
COPY models/ ./models

# Set environment variable for Python path if needed
ENV PYTHONPATH=/app/service

# Expose port
EXPOSE 8000

# Run the FastAPI app
CMD ["uvicorn", "service.ml_service:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
