FROM python:3.12-slim
WORKDIR /app
COPY src/qasm/examples/ /app/
ENV PYTHONUNBUFFERED=1
EXPOSE 8084
ENTRYPOINT ["python", "service/qasm_service.py"]
