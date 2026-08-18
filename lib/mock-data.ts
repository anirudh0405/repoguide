import type { Project, ProjectDetail, Repository } from "@/lib/types";

export const mockRepositories: Repository[] = [
  {
    id: "repo-1",
    owner: "acme",
    name: "ecommerce-platform",
    description:
      "Full-stack storefront with catalog, cart, checkout, and order management. Powered by Next.js, Prisma, and Stripe.",
    language: "TypeScript",
    visibility: "private",
    stars: 248,
    forks: 56,
    updatedAt: "2026-08-18T07:12:00Z",
    defaultBranch: "main",
  },
  {
    id: "repo-2",
    owner: "acme",
    name: "payment-service",
    description:
      "Payment orchestration service handling subscriptions, refunds, and reconciliation across providers.",
    language: "Java",
    visibility: "private",
    stars: 89,
    forks: 23,
    updatedAt: "2026-08-17T14:30:00Z",
    defaultBranch: "main",
  },
  {
    id: "repo-3",
    owner: "acme",
    name: "mobile-api",
    description:
      "REST + GraphQL API for the mobile client. JWT auth, rate limiting, and feature flags.",
    language: "TypeScript",
    visibility: "private",
    stars: 145,
    forks: 41,
    updatedAt: "2026-08-17T09:05:00Z",
    defaultBranch: "develop",
  },
  {
    id: "repo-4",
    owner: "acme",
    name: "data-analytics-ingestor",
    description:
      "High-throughput event ingestion pipeline with batch aggregation and warehouse sync.",
    language: "Go",
    visibility: "private",
    stars: 62,
    forks: 11,
    updatedAt: "2026-08-18T02:45:00Z",
    defaultBranch: "main",
  },
  {
    id: "repo-5",
    owner: "acme",
    name: "webhooks-gateway",
    description:
      "Signed webhook gateway for outbound events to partners, with retries and dead-letter queue.",
    language: "Python",
    visibility: "private",
    stars: 34,
    forks: 7,
    updatedAt: "2026-07-29T16:20:00Z",
    defaultBranch: "main",
  },
  {
    id: "repo-6",
    owner: "acme",
    name: "design-system",
    description:
      "Shared component library and design tokens used across all internal products.",
    language: "TypeScript",
    visibility: "public",
    stars: 412,
    forks: 88,
    updatedAt: "2026-08-10T11:00:00Z",
    defaultBranch: "main",
  },
  {
    id: "repo-7",
    owner: "acme",
    name: "infra-terraform",
    description:
      "Infrastructure as code for staging and production environments. ECS, RDS, and CloudFront.",
    language: "HCL",
    visibility: "private",
    stars: 18,
    forks: 5,
    updatedAt: "2026-08-05T08:40:00Z",
    defaultBranch: "main",
  },
  {
    id: "repo-8",
    owner: "acme",
    name: "internal-tools",
    description:
      "Admin dashboard and internal utilities for the operations team.",
    language: "TypeScript",
    visibility: "private",
    stars: 27,
    forks: 9,
    updatedAt: "2026-08-12T19:15:00Z",
    defaultBranch: "main",
  },
];

export const mockProjects: Project[] = [
  {
    id: "ecommerce-platform",
    repositoryId: "repo-1",
    name: "ecommerce-platform",
    description:
      "Full-stack storefront with catalog, cart, checkout, and order management.",
    language: "TypeScript",
    status: "analyzed",
    analyzedAt: "2026-08-18T07:12:00Z",
    techStack: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Stripe", "Tailwind CSS"],
    stats: {
      files: 214,
      folders: 38,
      linesOfCode: 48210,
      contributors: 9,
    },
  },
  {
    id: "payment-service",
    repositoryId: "repo-2",
    name: "payment-service",
    description:
      "Payment orchestration for subscriptions, refunds, and reconciliation.",
    language: "Java",
    status: "analyzed",
    analyzedAt: "2026-08-17T14:30:00Z",
    techStack: ["Java 21", "Spring Boot", "PostgreSQL", "Kafka", "Stripe"],
    stats: {
      files: 158,
      folders: 44,
      linesOfCode: 36480,
      contributors: 6,
    },
  },
  {
    id: "mobile-api",
    repositoryId: "repo-3",
    name: "mobile-api",
    description: "REST + GraphQL API for the mobile client.",
    language: "TypeScript",
    status: "analyzed",
    analyzedAt: "2026-08-17T09:05:00Z",
    techStack: ["NestJS", "TypeScript", "PostgreSQL", "GraphQL", "Redis"],
    stats: {
      files: 189,
      folders: 32,
      linesOfCode: 29470,
      contributors: 7,
    },
  },
  {
    id: "data-analytics-ingestor",
    repositoryId: "repo-4",
    name: "data-analytics-ingestor",
    description: "High-throughput event ingestion pipeline.",
    language: "Go",
    status: "analyzing",
    progress: 64,
    techStack: ["Go", "Kafka", "ClickHouse", "Docker"],
    stats: {
      files: 96,
      folders: 21,
      linesOfCode: 15820,
      contributors: 4,
    },
  },
];

export const mockProjectDetails: Record<string, ProjectDetail> = {
  "ecommerce-platform": {
    project: mockProjects[0],
    architecture: {
      name: "ecommerce-platform",
      children: [
        {
          name: "Frontend",
          detail: "Next.js App Router · React 19",
          children: [
            { name: "Product Catalog UI" },
            { name: "Cart & Checkout" },
            { name: "Account & Orders" },
          ],
        },
        {
          name: "API Routes",
          detail: "/api/* · Next.js route handlers",
          children: [
            { name: "Auth" },
            { name: "Products" },
            { name: "Orders" },
            { name: "Webhooks" },
          ],
        },
        {
          name: "Authentication",
          detail: "NextAuth v5 · JWT sessions",
        },
        {
          name: "Database",
          detail: "PostgreSQL · Prisma ORM",
          children: [
            { name: "Users & Addresses" },
            { name: "Products & Inventory" },
            { name: "Orders & Line Items" },
          ],
        },
        {
          name: "Payment Service",
          detail: "Order orchestration",
          children: [{ name: "Stripe" }, { name: "Webhook Handler" }],
        },
      ],
    },
    fileTree: {
      name: "ecommerce-platform",
      children: [
        {
          name: "app",
          type: "folder",
          children: [
            {
              name: "(shop)",
              type: "folder",
              children: [
                { name: "products", type: "folder", children: [{ name: "page.tsx", type: "file" }] },
                { name: "cart", type: "folder", children: [{ name: "page.tsx", type: "file" }] },
                { name: "checkout", type: "folder", children: [{ name: "page.tsx", type: "file" }] },
              ],
            },
            {
              name: "api",
              type: "folder",
              children: [
                { name: "auth", type: "folder", children: [{ name: "route.ts", type: "file" }] },
                { name: "orders", type: "folder", children: [{ name: "route.ts", type: "file" }] },
                { name: "webhooks", type: "folder", children: [{ name: "stripe/route.ts", type: "file" }] },
              ],
            },
            { name: "layout.tsx", type: "file" },
            { name: "globals.css", type: "file" },
          ],
        },
        {
          name: "components",
          type: "folder",
          children: [
            { name: "product", type: "folder", children: [{ name: "ProductCard.tsx", type: "file" }, { name: "ProductGrid.tsx", type: "file" }] },
            { name: "ui", type: "folder", children: [{ name: "Button.tsx", type: "file" }, { name: "Input.tsx", type: "file" }] },
            { name: "cart", type: "folder", children: [{ name: "CartProvider.tsx", type: "file" }] },
          ],
        },
        {
          name: "lib",
          type: "folder",
          children: [
            { name: "prisma.ts", type: "file", meta: "DB client" },
            { name: "stripe.ts", type: "file", meta: "Stripe client" },
            { name: "auth.ts", type: "file", meta: "Session helpers" },
            { name: "utils.ts", type: "file" },
          ],
        },
        {
          name: "prisma",
          type: "folder",
          children: [
            { name: "schema.prisma", type: "file", meta: "Schema" },
            { name: "seed.ts", type: "file" },
          ],
        },
        { name: "package.json", type: "file" },
        { name: "tsconfig.json", type: "file" },
        { name: "next.config.ts", type: "file" },
      ],
    },
    documentation: [
      {
        title: "Getting Started",
        summary: "How to set up and run the storefront locally.",
        sections: [
          {
            heading: "Prerequisites",
            body: "Node 20+, PostgreSQL 15+, and a Stripe test account. Copy .env.example to .env and fill in the database URL and Stripe keys.",
          },
          {
            heading: "Install & run",
            body: "Run npm install, then npx prisma migrate dev to create the schema, followed by npm run seed for sample data. Start with npm run dev — the app is served on localhost:3000.",
          },
        ],
      },
      {
        title: "Architecture Overview",
        summary: "The storefront uses a monorepo-style layout with a Next.js frontend and server-side API routes.",
        sections: [
          {
            heading: "Data flow",
            body: "Server components read from the database via Prisma. Mutations and admin actions go through route handlers under app/api. Stripe events arrive on /api/webhooks/stripe and update order state.",
          },
        ],
      },
      {
        title: "Environment Variables",
        summary: "The full list of secrets and configuration used by the app.",
        sections: [
          {
            heading: "Required",
            body: "DATABASE_URL, NEXTAUTH_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
          },
        ],
      },
      {
        title: "Database Schema",
        summary: "The core tables and their relationships.",
        sections: [
          {
            heading: "Models",
            body: "User, Address, Product, InventoryItem, Order, OrderItem. Orders reference a user and a list of line items; inventory is decremented transactionally at checkout.",
          },
        ],
      },
    ],
    flows: [
      {
        title: "Checkout",
        description: "Cart to completed order, including payment and stock handling.",
        entries: [
          { method: "GET", path: "/products/[id]" },
          { method: "POST", path: "/api/cart" },
          { method: "POST", path: "/api/checkout" },
          { method: "POST", path: "/api/webhooks/stripe" },
          { method: "GET", path: "/orders/[id]" },
        ],
      },
      {
        title: "Authentication",
        description: "Sign-in, session creation, and route protection.",
        entries: [
          { method: "POST", path: "/api/auth/signin" },
          { method: "GET", path: "/api/auth/session" },
          { method: "GET", path: "/api/auth/signout" },
        ],
      },
      {
        title: "Order Fulfillment",
        description: "How a paid order moves through the system.",
        entries: [
          { method: "POST", path: "/api/webhooks/stripe" },
          { method: "POST", path: "/api/orders/:id/fulfill" },
          { method: "POST", path: "/api/orders/:id/ship" },
        ],
      },
    ],
    chat: [
      {
        id: "m1",
        role: "assistant",
        content:
          "I've mapped this codebase. It's a Next.js storefront with 214 files across 38 folders. Here are the files you'll likely care about: prisma/schema.prisma (data model), lib/stripe.ts (payment client), app/api/webhooks/stripe/route.ts (order events). Ask me anything about the architecture.",
        timestamp: "2026-08-18T07:12:00Z",
      },
      {
        id: "m2",
        role: "user",
        content: "Where does the checkout flow start and what services does it touch?",
        timestamp: "2026-08-18T07:13:00Z",
      },
      {
        id: "m3",
        role: "assistant",
        content:
          "Checkout starts in app/(shop)/checkout/page.tsx. It submits to POST /api/checkout, which validates inventory, creates a Stripe payment intent via lib/stripe.ts, and writes a PENDING order to PostgreSQL. The Stripe webhook at app/api/webhooks/stripe/route.ts confirms payment and transitions the order to PAID.",
        timestamp: "2026-08-18T07:13:00Z",
      },
      {
        id: "m4",
        role: "user",
        content: "How is authentication wired up?",
        timestamp: "2026-08-18T07:15:00Z",
      },
      {
        id: "m5",
        role: "assistant",
        content:
          "Authentication uses NextAuth v5 with JWT sessions. The session is exposed to server components through lib/auth.ts, which wraps the auth() helper. Route handlers under app/api/auth handle signin/signout. The checkout page calls requireUser() to redirect unauthenticated visitors.",
        timestamp: "2026-08-18T07:15:00Z",
      },
    ],
    issues: [
      {
        severity: "warning",
        title: "Webhook signature not validated",
        detail: "POST /api/webhooks/stripe accepts requests without verifying the Stripe signature in test mode. Verify using STRIPE_WEBHOOK_SECRET before parsing the payload.",
        file: "app/api/webhooks/stripe/route.ts",
      },
      {
        severity: "info",
        title: "N+1 query in product grid",
        detail: "ProductGrid fetches inventory items per product. Consider a join with Prisma include to avoid repeated round-trips.",
        file: "components/product/ProductGrid.tsx",
      },
      {
        severity: "info",
        title: "Unused font import",
        detail: "next/font Google import for Inter is unused in layout. Remove to trim the bundle.",
        file: "app/layout.tsx",
      },
    ],
  },
  "payment-service": {
    project: mockProjects[1],
    architecture: {
      name: "payment-service",
      children: [
        { name: "REST Controllers", detail: "Spring Boot @RestController" },
        {
          name: "Service Layer",
          detail: "Billing + subscription logic",
          children: [{ name: "Subscription Service" }, { name: "Refund Service" }, { name: "Reconciliation" }],
        },
        {
          name: "Persistence",
          detail: "PostgreSQL · JPA",
          children: [{ name: "Subscriptions" }, { name: "Invoices" }, { name: "Transactions" }],
        },
        {
          name: "Events",
          detail: "Kafka topics",
          children: [{ name: "billing.invoice.paid" }, { name: "billing.subscription.updated" }],
        },
        { name: "Provider Adapters", detail: "Stripe · Adyen" },
      ],
    },
    fileTree: {
      name: "payment-service",
      children: [
        {
          name: "src/main/java/com/acme/payment",
          type: "folder",
          children: [
            { name: "controller", type: "folder", children: [{ name: "SubscriptionController.java", type: "file" }, { name: "RefundController.java", type: "file" }] },
            { name: "service", type: "folder", children: [{ name: "SubscriptionService.java", type: "file" }, { name: "ReconciliationService.java", type: "file" }] },
            { name: "model", type: "folder", children: [{ name: "Subscription.java", type: "file" }, { name: "Invoice.java", type: "file" }] },
            { name: "PaymentServiceApplication.java", type: "file" },
          ],
        },
        {
          name: "src/main/resources",
          type: "folder",
          children: [{ name: "application.yml", type: "file" }, { name: "application-prod.yml", type: "file" }],
        },
        { name: "pom.xml", type: "file" },
        { name: "Dockerfile", type: "file" },
      ],
    },
    documentation: [
      {
        title: "Running Locally",
        summary: "Spin up the service with PostgreSQL and Kafka via docker-compose.",
        sections: [
          {
            heading: "Setup",
            body: "Run docker-compose up -d, then ./mvnw spring-boot:run. The service listens on port 8081 with /actuator/health for health checks.",
          },
        ],
      },
    ],
    flows: [
      {
        title: "Subscription lifecycle",
        description: "From plan selection to renewal.",
        entries: [
          { method: "POST", path: "/v1/subscriptions" },
          { method: "POST", path: "/v1/subscriptions/:id/cancel" },
          { method: "POST", path: "/v1/subscriptions/:id/reactivate" },
        ],
      },
      {
        title: "Refunds",
        description: "Full and partial refunds with reconciliation.",
        entries: [
          { method: "POST", path: "/v1/refunds" },
          { method: "POST", path: "/v1/refunds/:id/status" },
        ],
      },
    ],
    chat: [
      {
        id: "m1",
        role: "assistant",
        content: "Mapped payment-service: a Spring Boot billing service with 158 files. Core entry points are the controllers under controller/ and Kafka consumers in service/. Ask about subscriptions, refunds, or provider integrations.",
        timestamp: "2026-08-17T14:30:00Z",
      },
      {
        id: "m2",
        role: "user",
        content: "How are Stripe subscriptions kept in sync?",
        timestamp: "2026-08-17T14:32:00Z",
      },
      {
        id: "m3",
        role: "assistant",
        content: "SubscriptionService subscribes to the billing.subscription.updated Kafka topic and maps provider events onto the local Subscription entity. ReconcilliationService runs nightly to compare provider state with local invoices and emit billing.invoice.paid for anything missed.",
        timestamp: "2026-08-17T14:32:00Z",
      },
    ],
    issues: [
      {
        severity: "critical",
        title: "Unsafe deserialization of provider events",
        detail: "Kafka listener deserializes payloads without a schema registry or versioned envelope. Unbounded fields are accepted into the model.",
        file: "src/main/java/com/acme/payment/service/ReconciliationService.java",
      },
      {
        severity: "warning",
        title: "Refund race condition",
        detail: "Two concurrent refund requests for the same invoice can double-apply. Add optimistic locking or a status guard on the Invoice entity.",
        file: "src/main/java/com/acme/payment/service/SubscriptionService.java",
      },
    ],
  },
  "mobile-api": {
    project: mockProjects[2],
    architecture: {
      name: "mobile-api",
      children: [
        { name: "HTTP Layer", detail: "NestJS REST + GraphQL gateway" },
        { name: "Modules", detail: "Feature modules", children: [{ name: "Auth" }, { name: "Catalog" }, { name: "Notifications" }] },
        { name: "Data Access", detail: "Prisma + PostgreSQL", children: [{ name: "Redis cache" }] },
        { name: "Integrations", detail: "FCM · S3" },
      ],
    },
    fileTree: {
      name: "mobile-api",
      children: [
        { name: "src", type: "folder", children: [{ name: "modules", type: "folder", children: [{ name: "auth", type: "folder" }, { name: "catalog", type: "folder" }] }, { name: "main.ts", type: "file" }] },
        { name: "prisma", type: "folder", children: [{ name: "schema.prisma", type: "file" }] },
        { name: "package.json", type: "file" },
      ],
    },
    documentation: [
      {
        title: "Overview",
        summary: "NestJS API serving the mobile client.",
        sections: [
          {
            heading: "Modules",
            body: "Feature modules under src/modules each expose REST endpoints and a GraphQL resolver. Auth uses JWT access tokens with Redis-backed refresh tokens.",
          },
        ],
      },
    ],
    flows: [
      {
        title: "Login",
        description: "JWT access + refresh token flow.",
        entries: [
          { method: "POST", path: "/auth/login" },
          { method: "POST", path: "/auth/refresh" },
          { method: "POST", path: "/auth/logout" },
        ],
      },
    ],
    chat: [
      {
        id: "m1",
        role: "assistant",
        content: "Analyzed mobile-api: a NestJS REST + GraphQL service. Auth, catalog, and notification modules under src/modules. Ask about endpoints, caching, or the GraphQL schema.",
        timestamp: "2026-08-17T09:05:00Z",
      },
    ],
    issues: [
      {
        severity: "info",
        title: "Rate limiting only on auth routes",
        detail: "Throttler is applied per-route on /auth only. Catalog and search endpoints have no limits.",
        file: "src/modules/auth/auth.module.ts",
      },
    ],
  },
  "data-analytics-ingestor": {
    project: mockProjects[3],
    architecture: {
      name: "data-analytics-ingestor",
      children: [
        { name: "Event Receivers", detail: "HTTP + Kafka consumers" },
        { name: "Pipeline Workers", detail: "Go workers · batching" },
        { name: "Storage", detail: "ClickHouse tables" },
        { name: "Warehouse Sync", detail: "Batch export to S3" },
      ],
    },
    fileTree: {
      name: "data-analytics-ingestor",
      children: [
        { name: "cmd", type: "folder", children: [{ name: "ingestor", type: "folder", children: [{ name: "main.go", type: "file" }] }] },
        { name: "internal", type: "folder", children: [{ name: "pipeline", type: "folder", children: [{ name: "worker.go", type: "file" }] }, { name: "store", type: "folder", children: [{ name: "clickhouse.go", type: "file" }] }] },
        { name: "go.mod", type: "file" },
        { name: "Dockerfile", type: "file" },
      ],
    },
    documentation: [
      {
        title: "Pipeline Overview",
        summary: "Events are received, batched, and written to ClickHouse.",
        sections: [
          {
            heading: "Workers",
            body: "internal/pipeline/worker.go consumes from Kafka, groups events into 5-second batches, and flushes to ClickHouse. Batch size and interval are configurable via environment.",
          },
        ],
      },
    ],
    flows: [
      {
        title: "Event ingestion",
        description: "From HTTP receipt to warehouse export.",
        entries: [
          { method: "POST", path: "/v1/events" },
          { method: "KAFKA", path: "analytics.raw" },
          { method: "JOB", path: "warehouse-sync" },
        ],
      },
    ],
    chat: [],
    issues: [],
  },
};

export function getRepositoryById(id: string): Repository | undefined {
  return mockRepositories.find((repo) => repo.id === id);
}

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((project) => project.id === id);
}

export function getProjectDetail(id: string): ProjectDetail {
  return mockProjectDetails[id];
}
