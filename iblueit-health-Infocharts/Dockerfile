# Build: compila o React (CRA) em arquivos estáticos.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# --legacy-peer-deps: o projeto usa React 16 com libs (ex: @mui/icons-material)
# que pedem React 17/18 como peer dependency — conflito pré-existente, não
# introduzido por este Dockerfile. "npm ci" estrito falha nisso.
RUN npm ci --legacy-peer-deps

COPY public ./public
COPY src ./src

# Variável injetada em tempo de BUILD (o CRA embute process.env.REACT_APP_*
# diretamente no JS gerado — não dá pra trocar isso depois, em runtime).
ARG REACT_APP_BASE_URL_I_BLUE_IT
ENV REACT_APP_BASE_URL_I_BLUE_IT=$REACT_APP_BASE_URL_I_BLUE_IT

RUN npm run build

# Runtime: só o nginx servindo os arquivos estáticos, sem Node nem código-fonte.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
