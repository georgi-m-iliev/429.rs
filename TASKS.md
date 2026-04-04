[ ] - Implement BFF functionalities for multi-user configuration of the gateway
       * definitions of multiple hosts with multiple routes
       * global per host rate limits
       * per route rate limits
       * custom headers for overriding the limits
       * [AI proposed] define deterministic rule resolution/precedence for overlapping host and route rules
       * [AI proposed] add authentication/authorization for config management endpoints
       * [AI proposed] add config versioning and migration strategy for future schema changes
       * [AI proposed] introduce API contract tests between UI and BFF for config endpoints

[ ] - Implement the Frontend features to support the newly implemented BFF functionalities
       * Transition to a UI kit library
       * Make the fetching of data / reloading smoother and seamless to the user
       * [AI proposed] add role-aware UI states for read-only vs admin configuration access
       * [AI proposed] add end-to-end tests for core flows (create/update/delete rules, metrics view)
 
[ ] - Implement extended functionalities to the rate limiting service
       * Support for all features mentioned in the BFF section
       * Config db (mongo) for managing user configs
       * [AI proposed] integrate dynamic config loading from BFF/config DB instead of env-only limits
       * [AI proposed] implement trusted proxy handling to prevent spoofed X-Forwarded-For client IPs
       * [AI proposed] define Redis outage behavior (fail-open vs fail-closed) and implement fallback policy
       * [AI proposed] replace blocking Redis KEYS usage with SCAN-based iteration for metrics operations
       * [AI proposed] add rate-limiter performance/load tests with clear latency and throughput SLOs

[ ] - Create helm charts to support high availability K8S deployment
       * [AI proposed] add liveness/readiness/startup probes, resource limits, and PodDisruptionBudgets
       * [AI proposed] add HorizontalPodAutoscaler configuration and scaling policies
       * [AI proposed] add ingress, network policies, and secure default service exposure

[ ] - Deploy the application in Azure
       * [AI proposed] define secrets strategy with Key Vault integration and rotation
       * [AI proposed] set up centralized observability (metrics, dashboards, alerts, tracing)
       * [AI proposed] define backup/restore policies for Redis and Mongo in production
       * [AI proposed] create CI/CD pipeline for multi-service lint/test/build/image/deploy flow