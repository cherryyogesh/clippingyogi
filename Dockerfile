FROM python:3.12-slim-bookworm

# Prevent interactive prompts and buffering
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    DOCKER=1 \
    PORT=8770 \
    CLIPPING_YOGI_DATA_DIR=/app/data

# Install system dependencies: FFmpeg, Node.js (for YouTube JS extraction) and libraries required by OpenCV & media processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    nodejs \
    libsm6 \
    libxext6 \
    libgl1 \
    libglib2.0-0 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Ensure data folder exists
RUN mkdir -p /app/data

# Expose default port (overridden by $PORT on cloud platforms like Railway/Render)
EXPOSE 8770

# Start Clipping Yogi
CMD ["python", "app.py"]
