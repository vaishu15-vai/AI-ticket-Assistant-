# SupportIQ

SupportIQ is an AI ticket operations dashboard for an ITSM-style support workflow. The frontend is a responsive static React-free dashboard that can be hosted on S3, with a browser-only demo classifier for local presentation. The AWS backend connects API Gateway, Lambda, DynamoDB, S3, Amazon Comprehend, Bedrock, IAM, CloudWatch, and X-Ray.

## Run locally

```powershell
npm install
npm run dev
```

The dashboard works with demo data without AWS credentials. Use **New ticket** to see classification, priority, sentiment, and a suggested reply.

## Deploy the AWS stack

Install and configure AWS SAM, then run:

```powershell
sam build
sam deploy --guided
```

Enable access to the selected Bedrock model in the target AWS region before deploying. The template uses on-demand DynamoDB billing, point-in-time recovery, S3 public-access blocks, server-side encryption, scoped DynamoDB permissions, and Lambda tracing for CloudWatch/X-Ray visibility.

After deployment, copy the `ApiUrl` output into `config.js` before uploading:

```javascript
window.SUPPORTIQ_API_URL = "https://your-api.execute-api.region.amazonaws.com/prod/tickets";
```

Upload `index.html`, `config.js`, `app.js`, and `styles.css` to the `FrontendBucket` output:

```powershell
aws s3 sync . s3://YOUR_FRONTEND_BUCKET --exclude ".git/*" --exclude "node_modules/*" --exclude "backend/*" --exclude "dist/*"
```

The browser uses the API when `SUPPORTIQ_API_URL` is configured and falls back to demo data otherwise. For production, replace the permissive API CORS value with the S3 website origin and put Amazon Cognito or another authorizer in front of API Gateway. The frontend bucket is intentionally configured for S3 website hosting; use CloudFront + Origin Access Control if the site should not be public.
"# AI-ticket-Assistant-" 
