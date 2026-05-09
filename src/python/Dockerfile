FROM python:3.12-slim
WORKDIR /app
COPY src/python/ /app/
COPY src/qasm/examples/ /app/src/qasm/examples/
ENV PYTHONUNBUFFERED=1
EXPOSE 8082
ENTRYPOINT ["python", "service.py"]
