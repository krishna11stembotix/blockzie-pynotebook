FROM python:3.11-slim

# Set working directory inside container
WORKDIR /workspace

# Install system dependencies required by OpenCV / YOLO
RUN apt-get update && apt-get install -y \
    wget \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libxcb1 \
    && rm -rf /var/lib/apt/lists/*


# Install Python libraries
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    matplotlib \
    scikit-learn \
    opencv-python-headless \
    tensorflow \
    requests \
    ultralytics 

# Create models directory
RUN mkdir -p /workspace/models

# Download YOLO weights explicitly
RUN wget -O /workspace/models/yolov8n.pt \
    https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt

# Default command
CMD ["python"]

