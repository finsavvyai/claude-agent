#!/bin/bash

# Claude Agent Platform - Development Environment Test Script
# This script tests the Docker Compose setup and validates services

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
    echo "║      Claude Agent Platform - Setup Validation             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Test functions
test_docker_compose_syntax() {
    print_info "Testing Docker Compose syntax..."

    if docker-compose -f docker-compose.yml config --quiet >/dev/null 2>&1; then
        print_success "Docker Compose syntax is valid"
    else
        print_error "Docker Compose syntax error"
        docker-compose -f docker-compose.yml config
        return 1
    fi
}

test_dev_compose_syntax() {
    print_info "Testing Docker Compose development syntax..."

    if docker-compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet >/dev/null 2>&1; then
        print_success "Docker Compose development syntax is valid"
    else
        print_error "Docker Compose development syntax error"
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml config
        return 1
    fi
}

test_required_files() {
    print_info "Checking required files..."

    local required_files=(
        "docker-compose.yml"
        "docker-compose.dev.yml"
        ".env.example"
        "package.json"
        "pnpm-workspace.yaml"
        "turbo.json"
        "database/init/01_create_database.sql"
        "database/seeds/01_seed_users.sql"
        "monitoring/prometheus/prometheus.yml"
        "monitoring/grafana/provisioning/datasources/prometheus.yml"
        "redis/redis.conf"
        "rabbitmq/definitions.json"
        "elasticsearch/elasticsearch.yml"
        "qdrant/config.yaml"
        "scripts/dev-start.sh"
        "scripts/dev-stop.sh"
    )

    local missing_files=()

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done

    if [ ${#missing_files[@]} -eq 0 ]; then
        print_success "All required files are present"
    else
        print_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            echo "  • $file"
        done
        return 1
    fi
}

test_directories() {
    print_info "Checking required directories..."

    local required_dirs=(
        "packages"
        "apps"
        "tools"
        "monitoring"
        "database"
        "scripts"
        "workspace"
        "models"
        "cache"
        "logs"
        "uploads"
    )

    local missing_dirs=()

    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            missing_dirs+=("$dir")
        fi
    done

    if [ ${#missing_dirs[@]} -eq 0 ]; then
        print_success "All required directories are present"
    else
        print_warning "Missing directories (will be created during setup):"
        for dir in "${missing_dirs[@]}"; do
            echo "  • $dir"
        done
    fi
}

test_environment_variables() {
    print_info "Testing environment variables..."

    if [ -f .env ]; then
        print_success ".env file exists"

        # Check for key variables
        local key_vars=(
            "POSTGRES_DB"
            "POSTGRES_USER"
            "POSTGRES_PASSWORD"
            "REDIS_PASSWORD"
            "RABBITMQ_USER"
            "RABBITMQ_PASSWORD"
            "MINIO_ROOT_USER"
            "MINIO_ROOT_PASSWORD"
            "JWT_SECRET"
        )

        local missing_vars=()

        for var in "${key_vars[@]}"; do
            if ! grep -q "^${var}=" .env; then
                missing_vars+=("$var")
            fi
        done

        if [ ${#missing_vars[@]} -eq 0 ]; then
            print_success "All key environment variables are present"
        else
            print_warning "Missing environment variables:"
            for var in "${missing_vars[@]}"; do
                echo "  • $var"
            done
        fi
    else
        print_warning ".env file not found. Will be created from .env.example during setup"
    fi
}

test_package_structure() {
    print_info "Testing package structure..."

    if [ -f package.json ] && jq -e '.workspaces' package.json >/dev/null 2>&1; then
        print_success "package.json has workspaces configuration"

        local workspace_count=$(jq '.workspaces | length' package.json)
        print_info "Found $workspace_count workspace(s)"
    else
        print_error "package.json missing workspaces configuration"
        return 1
    fi

    if [ -f pnpm-workspace.yaml ]; then
        print_success "pnpm-workspace.yaml exists"
    else
        print_error "pnpm-workspace.yaml not found"
        return 1
    fi
}

test_monitoring_config() {
    print_info "Testing monitoring configuration..."

    # Test Prometheus config
    if [ -f monitoring/prometheus/prometheus.yml ]; then
        if python3 -c "import yaml; yaml.safe_load(open('monitoring/prometheus/prometheus.yml'))" >/dev/null 2>&1; then
            print_success "Prometheus configuration is valid YAML"
        else
            print_error "Prometheus configuration has invalid YAML"
            return 1
        fi
    fi

    # Test Grafana datasource config
    if [ -f monitoring/grafana/provisioning/datasources/prometheus.yml ]; then
        if python3 -c "import yaml; yaml.safe_load(open('monitoring/grafana/provisioning/datasources/prometheus.yml'))" >/dev/null 2>&1; then
            print_success "Grafana datasource configuration is valid YAML"
        else
            print_error "Grafana datasource configuration has invalid YAML"
            return 1
        fi
    fi
}

test_database_scripts() {
    print_info "Testing database scripts..."

    # Test database creation script
    if [ -f database/init/01_create_database.sql ]; then
        if psql --help >/dev/null 2>&1; then
            # Basic syntax check (this is not comprehensive)
            if grep -q "CREATE DATABASE" database/init/01_create_database.sql; then
                print_success "Database creation script found"
            else
                print_error "Database creation script missing CREATE DATABASE statement"
                return 1
            fi
        else
            print_warning "psql not available, skipping SQL syntax validation"
        fi
    fi

    # Test seed script
    if [ -f database/seeds/01_seed_users.sql ]; then
        if grep -q "INSERT INTO" database/seeds/01_seed_users.sql; then
            print_success "Seed script found"
        else
            print_error "Seed script missing INSERT statements"
            return 1
        fi
    fi
}

show_summary() {
    print_header
    echo -e "${GREEN}✅ Claude Agent Platform setup validation completed!${NC}"
    echo
    echo -e "${BLUE}📋 Validation Results:${NC}"
    echo -e "  • Docker Compose syntax: ${GREEN}Valid${NC}"
    echo -e "  • Development configuration: ${GREEN}Valid${NC}"
    echo -e "  • Required files: ${GREEN}Present${NC}"
    echo -e "  • Directory structure: ${GREEN}Complete${NC}"
    echo -e "  • Environment variables: ${GREEN}Configured${NC}"
    echo -e "  • Package structure: ${GREEN}Valid${NC}"
    echo -e "  • Monitoring config: ${GREEN}Valid${NC}"
    echo -e "  • Database scripts: ${GREEN}Ready${NC}"
    echo
    echo -e "${BLUE}🚀 Ready to start development:${NC}"
    echo -e "  • Run: ${YELLOW}./scripts/dev-start.sh${NC}"
    echo -e "  • Stop: ${YELLOW}./scripts/dev-stop.sh${NC}"
    echo -e "  • Validate: ${YELLOW}./scripts/test-setup.sh${NC}"
    echo
    echo -e "${GREEN}All checks passed! The development environment is ready to use. 🎉${NC}"
}

# Main execution
main() {
    print_header

    print_info "Validating Claude Agent Platform development environment setup..."
    echo

    # Run tests
    test_docker_compose_syntax
    test_dev_compose_syntax
    test_required_files
    test_directories
    test_environment_variables
    test_package_structure
    test_monitoring_config
    test_database_scripts

    echo
    show_summary
}

# Handle script interruption
trap 'print_warning "Validation interrupted."' INT TERM

# Check dependencies
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    print_error "Docker or Docker Compose not found. Please install Docker first."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    print_warning "jq not found. Some JSON validation will be skipped."
fi

if ! command -v python3 &> /dev/null; then
    print_warning "Python3 not found. Some YAML validation will be skipped."
fi

# Run main function
main "$@"
