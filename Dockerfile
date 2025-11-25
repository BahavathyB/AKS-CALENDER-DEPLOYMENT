# Stage 1: Build React App
FROM node:18-alpine AS react-build
WORKDIR /app/frontend

# Copy React package files
COPY react-app-template/package*.json ./
RUN npm ci --only=production

# Copy React source and build
COPY react-app-template/ ./
RUN npm run build

# Stage 2: Build .NET App
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS dotnet-build
WORKDIR /src

# Copy csproj and restore dependencies
COPY DisprzTraining/DisprzTraining/*.csproj ./
RUN dotnet restore

# Copy .NET source
COPY DisprzTraining/DisprzTraining/ ./

# Copy React build output to wwwroot
COPY --from=react-build /app/frontend/build ./wwwroot

# Build .NET app
RUN dotnet build -c Release -o /app/build

# Publish .NET app
FROM dotnet-build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Final Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS final
WORKDIR /app

# Create directory for SQLite database (AZURE ADDITION)
RUN mkdir -p /app/data

# Copy published app
COPY --from=publish /app/publish .

# Set environment variables for Azure (AZURE ADDITION)
ENV ASPNETCORE_URLS=http://+:80
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose port 80
EXPOSE 80
ENTRYPOINT ["dotnet", "DisprzTraining.dll"]