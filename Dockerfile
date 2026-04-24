#usa imagen oficial de node
FROM node:20-alpine 

#establece el directorio de trabajo dentro del contenedor
WORKDIR /app

#copia los archivos de dependencias al contenedor
COPY package*.json ./
RUN npm install

#copia el resto de los archivos al contenedor
COPY . .
RUN npm run build

EXPOSE 3001

#comando para ejecutar la aplicación
CMD ["sh", "-c", "node node_modules/.bin/typeorm migration:run -d dist/data-source.js && node dist/main.js"]