# Zeus Helm Chart

Zeus is a query execution platform with AWS Athena integration that allows users to write, execute, and manage SQL queries with parameter support.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure (for MongoDB persistence)

## Installing the Chart

To install the chart with the release name `zeus`:

```bash
helm install zeus ./helm/zeus
```

The command deploys Zeus on the Kubernetes cluster in the default configuration. The [Parameters](#parameters) section lists the parameters that can be configured during installation.

## Uninstalling the Chart

To uninstall/delete the `zeus` deployment:

```bash
helm delete zeus
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Parameters

### Global parameters

| Name               | Description                                     | Value |
| ------------------ | ----------------------------------------------- | ----- |
| `nameOverride`     | String to partially override zeus.fullname     | `""`  |
| `fullnameOverride` | String to fully override zeus.fullname         | `""`  |

### Zeus Image parameters

| Name                | Description                          | Value           |
| ------------------- | ------------------------------------ | --------------- |
| `image.repository`  | Zeus image repository                | `zeus`          |
| `image.tag`         | Zeus image tag                       | `latest`        |
| `image.pullPolicy`  | Zeus image pull policy               | `IfNotPresent`  |
| `imagePullSecrets`  | Zeus image pull secrets              | `[]`            |

### Deployment parameters

| Name           | Description                                   | Value |
| -------------- | --------------------------------------------- | ----- |
| `replicaCount` | Number of Zeus replicas to deploy            | `1`   |

### Service Account parameters

| Name                         | Description                                               | Value  |
| ---------------------------- | --------------------------------------------------------- | ------ |
| `serviceAccount.create`      | Specifies whether a ServiceAccount should be created     | `true` |
| `serviceAccount.name`        | The name of the ServiceAccount to use                    | `""`   |
| `serviceAccount.annotations` | Additional Service Account annotations                    | `{}`   |

### Service parameters

| Name                  | Description                        | Value       |
| --------------------- | ---------------------------------- | ----------- |
| `service.type`        | Zeus service type                  | `ClusterIP` |
| `service.port`        | Zeus service HTTP port             | `80`        |
| `service.targetPort`  | Zeus container HTTP port           | `8080`      |

### Ingress parameters

| Name                  | Description                                            | Value   |
| --------------------- | ------------------------------------------------------ | ------- |
| `ingress.enabled`     | Enable ingress record generation for Zeus             | `false` |
| `ingress.className`   | IngressClass that will be used to implement the Ingress | `""`    |
| `ingress.annotations` | Additional annotations for the Ingress resource       | `{}`    |
| `ingress.hosts`       | An array with hosts and paths                         | `[...]` |
| `ingress.tls`         | TLS configuration for additional hostnames            | `[]`    |

### Resource parameters

| Name                        | Description                                   | Value    |
| --------------------------- | --------------------------------------------- | -------- |
| `resources.limits.cpu`      | The resources limits CPU for Zeus containers | `500m`   |
| `resources.limits.memory`   | The resources limits memory for Zeus containers | `512Mi`  |
| `resources.requests.cpu`    | The requested CPU for Zeus containers        | `250m`   |
| `resources.requests.memory` | The requested memory for Zeus containers     | `256Mi`  |

### Autoscaling parameters

| Name                                            | Description                                         | Value   |
| ----------------------------------------------- | --------------------------------------------------- | ------- |
| `autoscaling.enabled`                           | Enable autoscaling for Zeus                        | `false` |
| `autoscaling.minReplicas`                       | Minimum number of Zeus replicas                    | `1`     |
| `autoscaling.maxReplicas`                       | Maximum number of Zeus replicas                    | `10`    |
| `autoscaling.targetCPUUtilizationPercentage`    | Target CPU utilization percentage                  | `80`    |
| `autoscaling.targetMemoryUtilizationPercentage` | Target Memory utilization percentage               | `80`    |

### MongoDB parameters

| Name                           | Description                                    | Value   |
| ------------------------------ | ---------------------------------------------- | ------- |
| `mongodb.enabled`              | Enable MongoDB deployment                     | `true`  |
| `mongodb.auth.enabled`         | Enable MongoDB authentication                 | `false` |
| `mongodb.persistence.enabled`  | Enable MongoDB persistence using PVC          | `true`  |
| `mongodb.persistence.size`     | PVC Storage Request for MongoDB volume        | `8Gi`   |
| `mongodb.service.port`         | MongoDB service port                          | `27017` |

### AWS parameters

| Name         | Description   | Value      |
| ------------ | ------------- | ---------- |
| `aws.region` | AWS region    | `us-east-1`|

## Configuration Examples

### Basic Installation

```bash
helm install zeus ./helm/zeus
```

### Production Installation

```bash
helm install zeus ./helm/zeus -f ./helm/zeus/values-prod.yaml
```

### Custom Configuration

```bash
helm install zeus ./helm/zeus \
  --set replicaCount=3 \
  --set service.type=LoadBalancer \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=zeus.example.com
```

### With External MongoDB

```bash
helm install zeus ./helm/zeus \
  --set mongodb.enabled=false \
  --set env[0].name=MONGO_URI \
  --set env[0].value="mongodb://external-mongo:27017/zeus"
```

## AWS Configuration

Zeus requires AWS credentials to access Athena. You can provide them in several ways:

### 1. IAM Roles (Recommended for EKS)

Use IAM roles for service accounts (IRSA) or node instance roles. No additional configuration needed.

### 2. AWS Credentials via Secret

```bash
kubectl create secret generic zeus-aws-secret \
  --from-literal=AWS_ACCESS_KEY_ID=your-access-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret-key

helm install zeus ./helm/zeus \
  --set secret.data.AWS_ACCESS_KEY_ID=$(echo -n "your-access-key" | base64) \
  --set secret.data.AWS_SECRET_ACCESS_KEY=$(echo -n "your-secret-key" | base64)
```

## Health Checks

The chart includes readiness and liveness probes that check the `/api/health` endpoint.

## Monitoring

The deployment is configured with labels that are compatible with Prometheus ServiceMonitor for metrics collection.

## Troubleshooting

### Common Issues

1. **Pod stuck in pending state**: Check if PVC can be provisioned and if resource requests can be satisfied.
2. **MongoDB connection failed**: Verify MongoDB service is running and connection string is correct.
3. **AWS authentication failed**: Ensure AWS credentials or IAM roles are properly configured.

### Debug Commands

```bash
# Check pod status
kubectl get pods -l app.kubernetes.io/name=zeus

# View logs
kubectl logs -l app.kubernetes.io/name=zeus

# Check services
kubectl get services -l app.kubernetes.io/name=zeus

# Describe deployment
kubectl describe deployment zeus
```