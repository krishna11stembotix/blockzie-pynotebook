FROM python:3.11-slim

# Set working directory inside container
WORKDIR /workspace

# Install Python libraries
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    matplotlib \
    scikit-learn \
    opencv-python-headless \
    tensorflow

# Default command
CMD ["python"]
