#!/bin/bash

# Zeus Helm Chart Installation Script

set -e

NAMESPACE="zeus"
RELEASE_NAME="zeus"
CHART_PATH="./zeus"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Zeus Helm Chart Installation Script${NC}"
echo "====================================="

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: helm is not installed or not in PATH${NC}"
    exit 1
fi

# Check if connected to a Kubernetes cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Not connected to a Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Create namespace if it doesn't exist
echo -e "${YELLOW}Creating namespace ${NAMESPACE}...${NC}"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Install or upgrade the chart
if helm list -n ${NAMESPACE} | grep -q ${RELEASE_NAME}; then
    echo -e "${YELLOW}Upgrading existing release ${RELEASE_NAME}...${NC}"
    helm upgrade ${RELEASE_NAME} ${CHART_PATH} \
        --namespace ${NAMESPACE} \
        --wait \
        --timeout 10m
else
    echo -e "${YELLOW}Installing new release ${RELEASE_NAME}...${NC}"
    helm install ${RELEASE_NAME} ${CHART_PATH} \
        --namespace ${NAMESPACE} \
        --wait \
        --timeout 10m
fi

echo -e "${GREEN}✓ Zeus has been successfully deployed!${NC}"

# Show release information
echo ""
echo -e "${BLUE}Release Information:${NC}"
helm list -n ${NAMESPACE}

echo ""
echo -e "${BLUE}Pod Status:${NC}"
kubectl get pods -n ${NAMESPACE} -l app.kubernetes.io/name=zeus

echo ""
echo -e "${BLUE}Service Information:${NC}"
kubectl get svc -n ${NAMESPACE} -l app.kubernetes.io/name=zeus

echo ""
echo -e "${YELLOW}To get the application URL, run:${NC}"
echo "helm get notes ${RELEASE_NAME} -n ${NAMESPACE}"

echo ""
echo -e "${YELLOW}To uninstall, run:${NC}"
echo "helm uninstall ${RELEASE_NAME} -n ${NAMESPACE}"