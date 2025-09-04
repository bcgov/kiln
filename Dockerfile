# Use the official Node.js 20 image as the base image
FROM node:20 as build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . ./

# Inject environment variables into the React application
ARG VITE_COMM_API_SAVEDATA_ENDPOINT_URL
ARG VITE_COMM_API_GENERATE_ENDPOINT_URL
ARG VITE_COMM_API_EDIT_ENDPOINT_URL
ARG VITE_COMM_API_SAVEDATA_ICM_ENDPOINT_URL
ARG VITE_COMM_API_LOADDATA_ICM_ENDPOINT_URL
ARG VITE_COMM_API_UNLOCK_ICM_FORM_URL
ARG VITE_TEMPLATE_REPO_URL
ARG VITE_KLAMM_URL
ARG VITE_SSO_REDIRECT_URI
ARG VITE_SSO_AUTH_SERVER_URL
ARG VITE_SSO_REALM
ARG VITE_SSO_CLIENT_ID
ARG VITE_COMM_API_LOADSAVEDJSON_ENDPOINT_URL
ARG VITE_IS_PORTAL_INTEGRATED
ARG VITE_COMM_API_LOAD_PORTAL_FORM_ENDPOINT_URL

ENV VITE_COMM_API_SAVEDATA_ENDPOINT_URL=${VITE_COMM_API_SAVEDATA_ENDPOINT_URL}
ENV VITE_COMM_API_GENERATE_ENDPOINT_URL=${VITE_COMM_API_GENERATE_ENDPOINT_URL}
ENV VITE_COMM_API_EDIT_ENDPOINT_URL=${VITE_COMM_API_EDIT_ENDPOINT_URL}
ENV VITE_COMM_API_SAVEDATA_ICM_ENDPOINT_URL=${VITE_COMM_API_SAVEDATA_ICM_ENDPOINT_URL}
ENV VITE_COMM_API_LOADDATA_ICM_ENDPOINT_URL=${VITE_COMM_API_LOADDATA_ICM_ENDPOINT_URL}
ENV VITE_COMM_API_UNLOCK_ICM_FORM_URL=${VITE_COMM_API_UNLOCK_ICM_FORM_URL}
ENV VITE_TEMPLATE_REPO_URL=${VITE_TEMPLATE_REPO_URL}
ENV VITE_KLAMM_URL=${VITE_KLAMM_URL}
ENV VITE_SSO_REDIRECT_URI=${VITE_SSO_REDIRECT_URI}
ENV VITE_SSO_AUTH_SERVER_URL=${VITE_SSO_AUTH_SERVER_URL}
ENV VITE_SSO_REALM=${VITE_SSO_REALM}
ENV VITE_SSO_CLIENT_ID=${VITE_SSO_CLIENT_ID}
ENV VITE_COMM_API_LOADSAVEDJSON_ENDPOINT_URL=${VITE_COMM_API_LOADSAVEDJSON_ENDPOINT_URL}
ENV VITE_IS_PORTAL_INTEGRATED=${VITE_IS_PORTAL_INTEGRATED}
ENV VITE_COMM_API_LOAD_PORTAL_FORM_ENDPOINT_URL=${VITE_COMM_API_LOAD_PORTAL_FORM_ENDPOINT_URL}

# Build the React application
RUN npm run build

ARG VITE_API_PROXY_TARGET
ENV VITE_API_PROXY_TARGET=${VITE_API_PROXY_TARGET}

# Build the nginx.conf using envsubst
RUN apt-get update && apt-get install -y gettext && \
    envsubst '${VITE_API_PROXY_TARGET}' < ./nginx.template.conf > ./nginx.conf && \
    apt-get remove -y gettext && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Stage 2: UBI NGINX for OpenShift-safe deploy
FROM nginxinc/nginx-unprivileged 

WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist .
COPY --from=build /app/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080
ENV PORT 8080

CMD ["nginx", "-g", "daemon off;"]

# # Stage 2: Use a smaller base image for the final build
# FROM node:20-alpine

# # Set the working directory
# WORKDIR /app

# # Copy the build artifacts from the previous stage
# COPY --from=build /app/dist ./dist
# COPY --from=build /app/package.json ./
# COPY --from=build /app/package-lock.json ./

# # Install only production dependencies
# RUN npm ci --only=production

# # Use a lightweight server to serve the build files
# RUN npm install -g serve

# # Set environment variable for the port
# ENV PORT 8080

# # Expose port 8080 to the outside world
# EXPOSE 8080

# # Set the command to start the application
# CMD ["serve", "-s", "dist", "-l", "8080"]