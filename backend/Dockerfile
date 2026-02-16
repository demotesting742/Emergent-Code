# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt /app/backend/

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy the rest of the application code into the container as a package
COPY . /app/backend/

# Make port 8003 available to the world outside this container
EXPOSE 8003

# Run as a package so that relative imports work
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8003"]
