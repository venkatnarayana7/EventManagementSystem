# AWS Deployment Guide

This project is designed so we can deploy the backend before the frontend exists.

## What should be hosted in AWS now

- Cognito User Pool and User Pool Client for authentication
- DynamoDB tables for users, events, registrations, attendance, and seat counters
- DynamoDB `seat-counter` table for atomic registration capacity updates
- Lambda functions for API domains
- API Gateway REST API for backend routes
- S3 media bucket for posters and event attachments
- S3 admin portal bucket with uploaded frontend files
- CloudFront distribution for media delivery
- CloudFront distribution for the admin frontend
- EventBridge rules and SNS topics for notifications

## Suggested deployment order

1. Bootstrap the AWS account for CDK:

```bash
cd infrastructure
npm install
npx cdk bootstrap aws://ACCOUNT_ID/ap-south-1
```

2. Deploy the backend infrastructure:

```bash
npm install
npm run build
npx cdk deploy AuthStack DatabaseStack StorageStack NotificationsStack ApiStack
```

3. Build connection details:
- Save the Cognito IDs and API URL
- Save the DynamoDB table names from `DatabaseStack` outputs
- Set `EMS_OTP_SENDER_EMAIL` to an SES-verified sender before deploying the OTP flow
- No SQL migration is required for the DynamoDB backend

4. Frontend artifacts:
- `npm run build` generates `frontend/admin/site`
- `StorageStack` uploads that folder into the admin frontend bucket during deployment
- The deployed admin frontend exposes `index.html` and `dashboard.html` through CloudFront
- If the frontend talks to a separate auth origin, update `ems-config.js` before building and deploy the backend with matching `EMS_ALLOWED_ORIGINS`

5. Verify the backend:
- Confirm `/events` returns a `200`
- Create a test user in Cognito
- Test signup flow, group assignment, and authenticated API access

6. Frontend expansion later:
- Add Teacher and Student portal files
- Upload them to the reserved teacher and student buckets
- Point subdomains like `admin.yourdomain.com` to the CloudFront distributions

## Environment values you will need

### Backend Lambdas

- `APP_ENV`
- `AWS_REGION`
- `MEDIA_BUCKET_NAME`
- `USERS_TABLE`
- `EVENTS_TABLE`
- `REGISTRATIONS_TABLE`
- `ATTENDANCE_TABLE`
- `SEAT_COUNTER_TABLE`
- `USER_POOL_ID`

### CDK

- `CDK_DEFAULT_ACCOUNT`
- `CDK_DEFAULT_REGION`
- `EMS_DOMAIN_NAME` if you want real Route 53 and ACM setup later
- `EMS_SES_DOMAIN` if you already have a verified SES domain
- `EMS_OTP_SENDER_EMAIL` for sign-in/sign-up OTP delivery

### Local auth bridge or separate auth host

- `EMS_ALLOWED_ORIGINS`
- `EMS_COOKIE_SAME_SITE`
- `EMS_COOKIE_SECURE`
- `EMS_COOKIE_DOMAIN`

## Notes

- The admin frontend is deployed from `frontend/admin/site`.
- The API stack expects the backend package to be built before `cdk deploy`.
- SES domain verification still requires domain ownership and DNS records.
- The old SQL migration files are no longer part of the AWS deployment path for this DynamoDB-only backend.
- If your SES account is still in sandbox, OTP emails can only be sent to verified recipient addresses until production access is approved.
