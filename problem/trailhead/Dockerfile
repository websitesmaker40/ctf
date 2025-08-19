FROM python:3.14.0rc2-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
CMD ["gunicorn", "-b", "0.0.0.0:80", "trailhead:app"]
