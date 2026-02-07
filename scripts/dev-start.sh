#!/bin/bash

# Claude Agent Platform - Development Environment Startup Script
# This script sets up and starts the complete development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║         Claude Agent Platform - Development Environment       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop or Docker daemon."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if required ports are available
check_ports() {
    local ports=("3000" "3001" "3002" "5432" "6379" "9200" "6333" "9000")
    local used_ports=()

    for port in "${ports[@]}"; do
        if lsof -i :"$port" >/dev/null 2>&1; then
            used_ports+=("$port")
        fi
    done

    if [ ${#used_ports[@]} -gt 0 ]; then
        print_warning "The following ports are already in use: ${used_ports[*]}"
        print_warning "Please stop the services using these ports or change the port configuration."
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "All required ports are available"
    fi
}

# Check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example"
        if [ -f .env.example ]; then
            cp .env.example .env
            print_info "Please edit .env file with your API keys and configuration"
            read -p "Press Enter to continue..."
        else
            print_error ".env.example file not found. Please create .env file manually."
            exit 1
        fi
    else
        print_success ".env file found"
    fi
}

# Create necessary directories
create_directories() {
    local dirs=(
        "logs"
        "workspace"
        "models"
        "cache"
        "uploads"
        "backups"
    )

    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_info "Created directory: $dir"
        fi
    done
    print_success "Directories created/verified"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."

    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        print_info "Installing pnpm..."
        npm install -g pnpm
    fi

    # Install project dependencies
    pnpm install
    print_success "Dependencies installed"
}

# Build packages
build_packages() {
    print_info "Building packages..."
    pnpm build
    print_success "Packages built"
}

# Start services
start_services() {
    print_info "Starting development services..."

    # Start with core services first
    print_info "Starting core services (PostgreSQL, Redis, RabbitMQ, Elasticsearch, Qdrant, MinIO)..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis rabbitmq elasticsearch qdrant minio

    # Wait for core services to be healthy
    print_info "Waiting for core services to be ready..."
    sleep 10

    # Check service health
    for i in {1..30}; do
        if docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps postgres | grep -q "Up (healthy)"; then
            print_success "Core services are ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "Core services failed to start properly"
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs
            exit 1
        fi
        sleep 2
    done

    # Start remaining services
    print_info "Starting application services..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

    print_success "All services started"
}

# Wait for services to be fully ready
wait_for_services() {
    print_info "Waiting for all services to be ready..."

    # Define services and their health check URLs
    declare -A services=(
        ["API"]="http://localhost:3001/api/health"
        ["Web App"]="http://localhost:3000"
        ["Luna Agents"]="http://localhost:3002"
        ["Grafana"]="http://localhost:3001/api/health"
        ["Prometheus"]="http://localhost:9090/-/healthy"
        ["Elasticsearch"]="http://localhost:9200/_cluster/health"
        ["Qdrant"]="http://localhost:6333/health"
        ["MinIO"]="http://localhost:9000/minio/health/live"
        ["RabbitMQ Management"]="http://localhost:15672"
        ["Redis Commander"]="http://localhost:8081"
        ["MailHog"]="http://localhost:8025"
    )

    local max_attempts=60
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        local all_ready=true

        for service in "${!services[@]}"; do
            local url="${services[$service]}"

            if curl -sf "$url" >/dev/null 2>&1; then
                if [ $attempt -eq 1 ]; then
                    print_success "$service is ready"
                fi
            else
                all_ready=false
            fi
        done

        if $all_ready; then
            print_success "All services are ready!"
            break
        fi

        if [ $attempt -eq $max_attempts ]; then
            print_warning "Some services may still be starting up. Check with 'docker-compose ps'"
            break
        fi

        sleep 2
        ((attempt++))
    done
}

# Show service URLs
show_service_urls() {
    print_header
    echo -e "${GREEN}🎉 Claude Agent Platform is now running!${NC}"
    echo
    echo -e "${BLUE}📊 Application Services:${NC}"
    echo -e "  • Web App:           ${YELLOW}http://localhost:3000${NC}"
    echo -e "  • API Server:        ${YELLOW}http://localhost:3001${NC}"
    echo -e "  • Luna Agents:       ${YELLOW}http://localhost:3002${NC}"
    echo
    echo -e "${BLUE}🗄️  Database & Storage:${NC}"
    echo -e "  • PostgreSQL:        ${YELLOW}localhost:5432${NC} (user: claude_user, pass: claude_password)"
    echo -e "  • Redis:             ${YELLOW}localhost:6379${NC} (pass: redis_password)"
    echo -e "  • RabbitMQ:          ${YELLOW}localhost:5672${NC} (user: claude_user, pass: claude_password)"
    echo -e "  • RabbitMQ Management: ${YELLOW}http://localhost:15672${NC}"
    echo -e "  • Elasticsearch:     ${YELLOW}http://localhost:9200${NC}"
    echo -e "  • Qdrant:            ${YELLOW}http://localhost:6333${NC}"
    echo -e "  • MinIO Console:     ${YELLOW}http://localhost:9001${NC} (user: claude_user, pass: claude_password)"
    echo
    echo -e "${BLUE}📈 Monitoring & Management:${NC}"
    echo -e "  • Grafana:           ${YELLOW}http://localhost:3001${NC} (user: admin, pass: claude_password)"
    echo -e "  • Prometheus:        ${YELLOW}http://localhost:9090${NC}"
    echo -e "  • Jaeger Tracing:    ${YELLOW}http://localhost:16686${NC}"
    echo -e "  • Redis Commander:   ${YELLOW}http://localhost:8081${NC} (user: admin, pass: claude_password)"
    echo -e "  • MailHog:           ${YELLOW}http://localhost:8025${NC}"
    echo
    echo -e "${BLUE}🔧 Development Tools:${NC}"
    echo -e "  • Prisma Studio:     ${YELLOW}http://localhost:5555${NC}"
    echo -e "  • API Debug Port:    ${YELLOW}localhost:9229${NC}"
    echo -e "  • Luna Debug Port:   ${YELLOW}localhost:9230${NC}"
    echo
    echo -e "${BLUE}📚 Useful Commands:${NC}"
    echo -e "  • View logs:         ${YELLOW}docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f${NC}"
    echo -e "  • Stop services:     ${YELLOW}docker-compose -f docker-compose.yml -f docker-compose.dev.yml down${NC}"
    echo -e "  • Restart service:   ${YELLOW}docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart [service]${NC}"
    echo -e "  • Check status:      ${YELLOW}docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps${NC}"
    echo
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    print_header

    print_info "Starting Claude Agent Platform development environment..."
    echo

    # Run checks
    check_docker
    check_ports
    check_env_file

    echo
    print_info "Setting up development environment..."

    # Setup
    create_directories
    install_dependencies
    build_packages

    echo
    print_info "Starting services..."

    # Start services
    start_services
    wait_for_services

    echo
    show_service_urls
}

# Handle script interruption
trap 'print_warning "Script interrupted. Services may still be starting up."' INT TERM

# Run main function
main "$@"
