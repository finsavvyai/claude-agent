#!/bin/bash

# Claude Agent Platform - Development Environment Stop Script
# This script stops all development services gracefully

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
    echo "║         Claude Agent Platform - Stop Development            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Stop services gracefully
stop_services() {
    print_info "Stopping development services..."

    # Stop application services first
    print_info "Stopping application services..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml stop api-dev luna-agents-dev web-dev dev-tools

    # Stop remaining services
    print_info "Stopping core services..."
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml stop

    print_success "All services stopped"
}

# Clean up containers and volumes (optional)
cleanup() {
    if [ "$1" = "--clean" ]; then
        print_info "Cleaning up containers and volumes..."

        # Remove containers
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans

        # Remove volumes (be careful with this!)
        read -p "Do you want to remove all Docker volumes? This will delete all data! (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
            print_warning "All Docker volumes removed"
        fi

        # Remove unused images
        docker image prune -f

        print_success "Cleanup completed"
    fi
}

# Show final status
show_status() {
    print_header
    echo -e "${GREEN}🛑 Claude Agent Platform development environment stopped${NC}"
    echo
    echo -e "${BLUE}📊 Status:${NC}"
    echo -e "  • Containers stopped: ${YELLOW}$(docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps -q | wc -l)${NC}"
    echo -e "  • Services status: ${YELLOW}$(docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps --services | wc -l)${NC} services configured"
    echo
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo -e "  • Start again:       ${YELLOW}./scripts/dev-start.sh${NC}"
    echo -e "  • View status:       ${YELLOW}docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps${NC}"
    echo -e "  • Clean all:         ${YELLOW}./scripts/dev-stop.sh --clean${NC}"
    echo -e "  • Remove images:     ${YELLOW}docker system prune -a${NC}"
    echo
    echo -e "${GREEN}Done! 👋${NC}"
}

# Main execution
main() {
    print_header

    print_info "Stopping Claude Agent Platform development environment..."
    echo

    # Stop services
    stop_services

    # Handle cleanup if requested
    cleanup "$1"

    echo
    show_status
}

# Handle script interruption
trap 'print_warning "Script interrupted."' INT TERM

# Run main function
main "$@"
