## Plan: Azure K8s + Helm + GitHub CI/CD Learning Journey

You want to learn by doing, so this plan is structured as guided milestones where each phase produces a working result before you move on.
I tailored it to your repo and your choices: self-hosted Redis/Mongo in AKS first, and staging-first delivery.

**Steps**
1. Phase 0: Foundation setup.
2. Set up Azure baseline resources in one resource group: AKS, ACR, Key Vault.
3. Install/verify local tooling and cluster access: Docker, kubectl, Helm, Azure CLI, GitHub CLI.
4. Connect AKS to ACR pull permissions and confirm image pull works from the cluster.
5. Phase 1: Helm chart scaffold from current compose setup. Depends on 1-4.
6. Build Helm chart structure under helm with environment values separation (dev/staging).
7. Translate each service to Kubernetes Deployment + Service using existing ports and health endpoints.
8. Split config into ConfigMaps (non-secret) and Secrets (sensitive), with Key Vault integration planned from the start.
9. Add liveness/readiness probes and resource requests/limits for all workloads.
10. Validate chart rendering and linting, then deploy to a dev namespace and verify all health endpoints.
11. Phase 2: Ingress and TLS. Depends on phase 1.
12. Install ingress controller and expose UI/API routes with HTTPS.
13. Update UI runtime routing assumptions so Kubernetes service DNS and ingress paths work correctly.
14. Phase 3: Self-hosted data services in AKS. Depends on phase 1; parallel with phase 2 once core services are stable.
15. Create StatefulSets + persistent volumes for Redis and Mongo using Azure disk storage classes.
16. Add secret wiring and basic backup/restore workflow for both stateful services.
17. Add PodDisruptionBudgets and HorizontalPodAutoscalers, especially for the rate-limiter.
18. Run resilience drills: pod delete, rollout restart, node drain behavior checks.
19. Phase 4: GitHub CI for pull requests. Depends on phase 1.
20. Create PR workflow running Python tests, Rust tests, and UI quality checks.
21. Add dependency caching for Python/Rust/Node to shorten feedback loops.
22. Enforce required checks before merging to main.
23. Phase 5: Staging CD on Azure AKS. Depends on phases 2 and 4.
24. Configure GitHub Actions to Azure with OIDC (no long-lived cloud credentials).
25. Build and push all service images to ACR with immutable commit-based tags.
26. Deploy with Helm upgrade/install into staging namespace using staging values and tag overrides.
27. Add rollout verification and failure surfacing if workloads fail readiness.
28. Add manual redeploy trigger for staging without new commits.
29. Phase 6: Operability and repeatable releases. Depends on phases 3 and 5.
30. Add basic observability for logs, restarts, latency, and rollout health.
31. Write short runbooks for expected failures (bad images, probe failures, secret/config issues).
32. Practice one full feature-branch to staging release cycle end-to-end.

**Relevant files**
- [docker-compose.yml](docker-compose.yml) - baseline topology, ports, env vars, health checks, and persistence assumptions
- [TASKS.md](TASKS.md) - existing milestone tracking for Helm/Azure work
- [README.md](README.md) - architecture context to preserve while migrating
- [services/rate-limiter/src/main.rs](services/rate-limiter/src/main.rs) - runtime env config and health behavior
- [services/bff/app/settings.py](services/bff/app/settings.py) - BFF config model to map into K8s config/secrets
- [services/bff/app/db.py](services/bff/app/db.py) - Mongo initialization path for deployment verification
- [services/ui/nginx.conf](services/ui/nginx.conf) - API proxy behavior that must match ingress/service routing
- [services/ui/vite.config.ts](services/ui/vite.config.ts) - dev proxy behavior to align with final routing model

**Verification**
1. Helm lint/template passes with no chart/template errors.
2. All pods in dev/staging become Ready and health endpoints respond.
3. UI and API are reachable through ingress over HTTPS.
4. Redis/Mongo persistence survives pod restarts and rescheduling.
5. PR checks block merges on failures.
6. Merge to main triggers build/push/deploy to staging successfully.
7. Recovery drill validates rollback/runbook flow.

**Decisions**
- Self-hosted Redis and Mongo first in AKS (StatefulSet + PVC path).
- Staging-first CD now; production promotion added after staging stability.
- Keep fake-api deployable in non-prod for end-to-end validation.
- Use OIDC for GitHub-to-Azure authentication.

**Further Considerations**
1. Start with one cluster and separate namespaces; split clusters later only when needed.
2. If StatefulSet ops becomes too heavy, migrate data tier to managed services later.
3. Keep a short checklist/retrospective per phase so learning compounds.
