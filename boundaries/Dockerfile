FROM andrejreznik/python-gdal:py3.10.0-gdal3.2.3
ENV PYTHONUNBUFFERED=TRUE

WORKDIR /mnt
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .