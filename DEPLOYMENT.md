# Deployment Documentation

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# PostgreSQL connection string (Supabase)
# Use the pooled connection string for runtime
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"

# GitHub App credentials
# Create/manage the app at: https://github.com/settings/apps
# The OAuth callback URL registered on the app must match:
#   {YOUR_APP_URL}/api/auth/callback
GITHUB_APP_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_PRIVATE_KEY=

# NVIDIA NIM — used for AI onboarding guides and embeddings
# Get your key at: https://integrate.api.nvidia.com
NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b

# Optional — AI context limits
AI_MAX_FILES=25
AI_MAX_CONTEXT_TOKENS=20000
AI_MAX_FILE_SIZE=65536

# Embeddings (Phase 5)
EMBEDDING_API_KEY=
EMBEDDING_BASE_URL=
EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5
EMBEDDING_DIMENSIONS=1024

# Indexing limits
AI_INDEX_MAX_FILES=300
AI_INDEX_MAX_CHUNKS=20000
AI_INDEX_MAX_FILE_BYTES=524288

# Chat retrieval limits
AI_CHAT_TOP_K=8
AI_CHAT_CONTEXT_TOKENS=8000

# Stripe Billing
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
```

## Database Setup (PostgreSQL with pgvector)

1. **Create a Supabase project** at https://supabase.com
2. **Enable pgvector extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. **Run the vector setup script**:
   ```bash
   psql -d your_database -f prisma/vector-setup.sql
   ```
4. **Apply the schema**:
   ```bash
   npx prisma db push
   ```
5. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

## GitHub OAuth Configuration

1. Go to https://github.com/settings/apps
2. Create a new GitHub App or use existing
3. Configure:
   - **Homepage URL**: `https://your-domain.com`
   - **Callback URL**: `https://your-domain.com/api/auth/callback`
   - **Webhook URL**: (optional) `https://your-domain.com/api/github/webhook`
   - **Permissions**:
     - Repository: Read-only access to contents, metadata, pull requests
     - Account: Read-only access to email
4. Generate a private key and add to `GITHUB_PRIVATE_KEY`
5. Note the `GITHUB_APP_ID` and `GITHUB_CLIENT_ID`
6. Generate a client secret and add to `GITHUB_CLIENT_SECRET`

## OpenAI/NVIDIA API Configuration

1. Create an account at https://integrate.api.nvidia.com
2. Get your API key and add to `NVIDIA_API_KEY`
3. The base URL is typically `https://integrate.api.nvidia.com/v1`
4. Model for chat: `nvidia/nemotron-3.5-lightning-30b-a3b`
5. Model for embeddings: `nvidia/nv-embedqa-e5-v5`

## Stripe Billing Configuration

1. Create a Stripe account at https://stripe.com
2. Get API keys from https://dashboard.stripe.com/apikeys
3. Add `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`
4. Create prices for Pro plan:
   - Monthly price (e.g., ₹999/month)
   - Yearly price (optional)
5. Add price IDs to `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_PRO_YEARLY`
6. Set up webhook endpoint:
   - URL: `https://your-domain.com/api/billing/webhook`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
7. Add webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Production Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Set build command: `prisma generate && next build`
4. Set output directory: `.next`
5. Deploy

### Docker

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Generate Prisma
FROM base AS generate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# Build
FROM base AS builder
WORKDIR /app
COPY --from=generate /app/node_modules ./node_modules
COPY --from=generate /app/prisma ./prisma
COPY --from=generate /app/lib/generated ./lib/generated
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

### Health Checks

The app provides these health check endpoints:
- `GET /api/health` - Basic health check
- `GET /api/health/db` - Database connectivity
- `GET /api/health/github` - GitHub API connectivity

## Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] GitHub App private key stored securely
- [ ] Stripe webhook secret configured
- [ ] Database connection uses SSL
- [ ] Rate limiting enabled on all API routes
- [ ] CORS configured correctly
- [ ] HTTPS enforced in production
- [ ] Session cookies are HttpOnly, Secure, SameSite=Lax
- [ ] GitHub tokens never logged or exposed
- [ ] User data isolated by userId in all queries
- [ ] Repository content treated as untrusted input
- [ ] Prompt injection mitigations in place
- [ ] File size limits enforced
- [ ] Analysis runs in isolated temporary directories

## Monitoring

Recommended monitoring:
- **Vercel Analytics** for page views and performance
- **Sentry** for error tracking
- **Supabase Dashboard** for database metrics
- **Stripe Dashboard** for billing metrics
- **GitHub App insights** for installation metrics

## Scaling Considerations

- Use Supabase pooled connections for database
- Enable Vercel Edge Functions for API routes where possible
- Consider Redis for rate limiting and caching at scale
- Background jobs (analysis, indexing) can be moved to a queue system (BullMQ, etc.)
- Vector search performance scales with pgvector HNSW index

## Rollback Procedure

1. Vercel: Use Vercel dashboard to rollback to previous deployment
2. Database: Prisma migrations are forward-only; maintain backup strategy
3. Environment variables: Keep previous values documented