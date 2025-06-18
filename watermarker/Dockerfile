# Stage 1: Define our base environment
# We start with an official, lightweight Python image.
# Using a specific version is a best practice for consistency.
FROM python:3.11-slim

# Set the working directory inside the container to /app
# From now on, all commands will run from this path.
WORKDIR /app

# Copy the requirements file into the container first.
# This is an optimization. Docker caches this layer, so it only re-installs
# dependencies if the requirements.txt file changes.
COPY requirements.txt .

# Install the Python dependencies specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of our application's source code into the container.
# This includes our main.py script.
COPY . .

# Specify the command to run when the container starts.
# This will execute our Python script.
CMD ["python", "main.py"]