# ---- Build Stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 빌드 타임에 주입되는 Vite 환경 변수.
# 기본값 = 로컬 전용 모드 (백엔드/실시간 동기화 모두 OFF).
ARG VITE_REMOTE_MODE=""
ARG VITE_SYNC_WS_URL=""
ENV VITE_REMOTE_MODE=${VITE_REMOTE_MODE}
ENV VITE_SYNC_WS_URL=${VITE_SYNC_WS_URL}

RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine

RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app && \
    chown -R app:app /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown app:app /var/run/nginx.pid && \
    # chown -R 이 심볼릭 링크를 깨뜨릴 수 있으므로 명시적으로 재생성
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log && \
    # non-root 실행 시 'user nginx;' 지시어가 worker fork 오류를 유발하므로 제거
    sed -i '/^user /d' /etc/nginx/nginx.conf

COPY --from=build --chown=app:app /app/dist /usr/share/nginx/html
COPY --chown=app:app nginx.conf /etc/nginx/conf.d/default.conf

USER app
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
