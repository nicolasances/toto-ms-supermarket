# CI/CD

The service is deployed by GitHub Actions to **Cloud Run** and to the shared **GKE** cluster (managed in `nicolasances/toto-terra-gke`). Both targets run in parallel; Cloud Run will be removed later.

Terraform owns the *shape* of the GKE workload (Deployment, Service, route). CI owns *which image runs*: it builds and pushes the image, then runs `kubectl set image` and `kubectl rollout status` on the Deployment `toto-ms-supermarket`.

## Branches → environments

| Push on | Workflow | GitHub environment | GKE namespace | Image tag |
|---|---|---|---|---|
| `feature/**`, `issue/**` | `release-dev.yml` | `totoexperiments` | `dev` | `<version>-<short sha>` (e.g. `1.0.1-a1b2c3d`) |
| `main` | `release-prod.yml` | `totolive` | `prod` | `<version>` (e.g. `1.0.1`) |

`main` does **not** deploy to dev.

## Version bump rule

- **Dev**: no bump needed. Every commit gets a unique tag. If the tag already exists (e.g. a re-run on the same commit), build and push are skipped and the image is just redeployed.
- **Prod**: every merge to `main` **must bump `version` in `package.json`**. Before building, the workflow checks the prod Artifact Registry and fails with "Bump the version in package.json" if the tag exists. Errors other than "not found" (e.g. auth) also fail the job.

## Configuration

Per GitHub environment, variables `GCP_PID`, `GKE_PROJECT_ID`, `GKE_CLUSTER_NAME`, `GKE_CLUSTER_LOCATION`, `GKE_NAMESPACE`, and the secret `CICD_SERVICE_ACCOUNT` (the `toto-cicd` key, which can only access its own namespace).

## Rollback

There is no automatic rollback: a failed `rollout status` fails the job. Fix it with a new push, or roll back manually:

```
kubectl -n <namespace> rollout undo deployment/toto-ms-supermarket
```

Terraform ignores the image, so a later `terraform apply` does not revert it. Note that `rollout undo` does not touch Cloud Run.
