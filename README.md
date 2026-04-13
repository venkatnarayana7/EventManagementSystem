# Event Management System

Backend-first foundation for the Event Management System blueprint in `EventManagementSystem_Plan.md`.

## What is in this repo

- `backend/`: Lambda handlers and shared DynamoDB-backed backend utilities
- `infrastructure/`: AWS CDK stacks for Cognito, API Gateway, Lambda, S3, DynamoDB, and notifications
- `frontend/admin/site/`: generated static admin portal files ready for S3/CloudFront deployment
- `docs/`: deployment guidance and backend rollout notes

## Backend-first roadmap

1. Deploy shared AWS foundation with CDK
2. Confirm Cognito triggers and API routes are healthy
3. Connect the frontend portals to the deployed API and Cognito
4. Expand the hosted frontend portals as the UI grows

## Quick start

```bash
npm install
npm run build
npm run synth
```

Detailed AWS setup and deployment order live in `docs/aws-deployment.md`.
