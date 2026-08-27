// Component classification — assigns each repository file to at most one
// architectural role (frontend, api, database, …) based on real evidence:
// its path, its imports, and markers in its content. A file with no
// supporting evidence is left unclassified and simply does not appear in the
// graph.

import type { ComponentType } from "@/lib/architecture/types";
import type { IngestedFile } from "@/lib/analyzer/ignore";

export interface Classification {
  type: ComponentType;
  /** Why this file was classified this way — kept as edge/node evidence. */
  reason: string;
}

export interface KnownService {
  label: string;
  category: "external" | "database" | "storage" | "queue";
  description: string;
}

/** Packages that always indicate a concrete third-party system. */
export const KNOWN_SERVICES: Record<string, KnownService> = {
  stripe: { label: "Stripe", category: "external", description: "Payments provider" },
  "@stripe/stripe-js": { label: "Stripe", category: "external", description: "Payments provider" },
  openai: { label: "OpenAI", category: "external", description: "AI model API" },
  "@anthropic-ai/sdk": { label: "Anthropic", category: "external", description: "AI model API" },
  "@google-cloud/vertexai": { label: "Google Vertex AI", category: "external", description: "AI model API" },
  twilio: { label: "Twilio", category: "external", description: "Messaging and voice" },
  sendgrid: { label: "SendGrid", category: "external", description: "Email delivery" },
  "@sendgrid/mail": { label: "SendGrid", category: "external", description: "Email delivery" },
  mailgun: { label: "Mailgun", category: "external", description: "Email delivery" },
  resend: { label: "Resend", category: "external", description: "Email delivery" },
  nodemailer: { label: "SMTP (nodemailer)", category: "external", description: "Email delivery" },
  "@slack/web-api": { label: "Slack", category: "external", description: "Team messaging" },
  octokit: { label: "GitHub API", category: "external", description: "Code hosting API" },
  algoliasearch: { label: "Algolia", category: "external", description: "Search service" },
  pusher: { label: "Pusher", category: "external", description: "Realtime messaging" },
  "@sentry/node": { label: "Sentry", category: "external", description: "Error tracking" },
  "@aws-sdk/client-s3": { label: "AWS S3", category: "storage", description: "Object storage" },
  "@aws-sdk/client-sqs": { label: "AWS SQS", category: "queue", description: "Managed message queue" },
  "aws-sdk": { label: "AWS SDK", category: "storage", description: "Amazon Web Services" },
  "@google-cloud/storage": { label: "Google Cloud Storage", category: "storage", description: "Object storage" },
  firebase: { label: "Firebase", category: "storage", description: "Google Firebase" },
  minio: { label: "MinIO", category: "storage", description: "Object storage" },
  prisma: { label: "Database (Prisma)", category: "database", description: "ORM and schema" },
  "@prisma/client": { label: "Database (Prisma)", category: "database", description: "ORM and schema" },
  "drizzle-orm": { label: "SQL database (Drizzle)", category: "database", description: "SQL ORM" },
  typeorm: { label: "SQL database (TypeORM)", category: "database", description: "SQL ORM" },
  sequelize: { label: "SQL database (Sequelize)", category: "database", description: "SQL ORM" },
  knex: { label: "SQL database (Knex)", category: "database", description: "SQL query builder" },
  mongoose: { label: "MongoDB", category: "database", description: "Document database" },
  mongodb: { label: "MongoDB", category: "database", description: "Document database" },
  pg: { label: "PostgreSQL", category: "database", description: "Relational database" },
  postgres: { label: "PostgreSQL", category: "database", description: "Relational database" },
  mysql2: { label: "MySQL", category: "database", description: "Relational database" },
  redis: { label: "Redis", category: "database", description: "In-memory data store" },
  ioredis: { label: "Redis", category: "database", description: "In-memory data store" },
  "@supabase/supabase-js": { label: "Supabase", category: "database", description: "Supabase client" },
  psycopg2: { label: "PostgreSQL", category: "database", description: "Relational database" },
  pymysql: { label: "MySQL", category: "database", description: "Relational database" },
  sqlalchemy: { label: "SQL database (SQLAlchemy)", category: "database", description: "Python SQL toolkit" },
  "database/sql": { label: "SQL database", category: "database", description: "Go SQL access" },
  gorm: { label: "SQL database (GORM)", category: "database", description: "Go ORM" },
  bullmq: { label: "Queue (BullMQ)", category: "queue", description: "Redis-backed job queue" },
  bull: { label: "Queue (Bull)", category: "queue", description: "Redis-backed job queue" },
  kafkajs: { label: "Kafka", category: "queue", description: "Event streaming" },
  amqplib: { label: "RabbitMQ", category: "queue", description: "Message broker" },
  celery: { label: "Celery", category: "queue", description: "Python task queue" },
  sidekiq: { label: "Sidekiq", category: "queue", description: "Ruby job queue" },
};

interface Rule {
  test: (file: IngestedFile, content: string | null) => boolean;
}

// Ordered by priority — the first matching rule wins. Structural route files
// (app/**/route.ts, pages/api/**, controllers) are recognized as API before
// the auth rules so e.g. `app/api/auth/me/route.ts` lands on API (the graph
// needs the API component), while dedicated auth modules like `lib/auth.ts`
// still land on Authentication via the later rules.
const RULES: Array<{ type: ComponentType; reason: string; rules: Rule[] }> = [
  {
    type: "queue",
    reason: "uses a queue/message-broker library",
    rules: [
      { test: (_f, c) => !!c && /from\s+["'](bullmq|bull|kafkajs|amqplib)["']|import\s+(bullmq|kafkajs|amqplib)|require\(["'](bullmq|bull|kafkajs|amqplib)["']\)/.test(c) },
      { test: (_f, c) => !!c && /(from\s+["']celery|import\s+celery\b|from\s+["']sidekiq|require\(\s*["'](celery|sidekiq)["'])/i.test(c) },
    ],
  },
  {
    type: "worker",
    reason: "background job or scheduled-task file",
    rules: [
      { test: (f) => /(^|\/)(workers?|jobs?|tasks?|cron|scheduled?)(\/|$)/i.test(f.directory) },
      { test: (f) => /^worker[\w.-]*$/i.test(f.name) || /worker\.(ts|js|py|go)$/i.test(f.name) },
      { test: (_f, c) => !!c && /@app\.task|shared_task|@Scheduled\b|\bcrontab\b/i.test(c) },
    ],
  },
  {
    type: "api",
    reason: "HTTP route or controller",
    rules: [
      // Next.js app router + pages router API routes.
      { test: (f) => /\/route\.(ts|js|tsx|jsx)$/.test(f.path) },
      { test: (f) => /\/pages\/api\//.test(f.path) },
      { test: (f) => /(\/|^)(routes?|controllers?|handlers?|endpoints?|views)(\/|$)/i.test(f.directory) && /\.(ts|js|py|go|java|kt|rb|php)$/i.test(f.name) },
      { test: (_f, c) => !!c && /@(RestController|Controller|GetMapping|PostMapping|RequestMapping|app\.(get|post|put|delete|patch|route)|APIRouter)/.test(c) },
      { test: (f) => f.name === "urls.py" },
      { test: (_f, c) => !!c && /(http\.HandleFunc|gin\.(Default|New)\(\)|echo\.New\(\)|fiber\.New\(\)|mux\.NewRouter\(\))/.test(c) },
    ],
  },
  {
    type: "auth",
    reason: "authentication or session handling",
    rules: [
      { test: (f) => /(^|\/)(auth|authentication|passport|oauth|jwt|session)([\w-]*)(\/|\.)/i.test(f.path) },
      { test: (f) => /(login|signin|signup|register)\.(tsx|jsx|ts|js|vue|svelte)$/i.test(f.name) },
      // Content markers only count for non-UI files — pages that *call*
      // requireUser() are frontend, not authentication.
      { test: (f, c) => !!c && !/\.(tsx|jsx|vue|svelte)$/i.test(f.name) && /next-auth|NextAuth|passport\.use|jsonwebtoken|jwt\.sign|bcrypt|argon2/i.test(c) },
      { test: (f, c) => !!c && !/\.(tsx|jsx|vue|svelte)$/i.test(f.name) && /getSessionUser|requireUser|verifyToken|checkPassword/i.test(c) },
    ],
  },
  {
    type: "database",
    reason: "schema, migration, or database client code",
    rules: [
      { test: (f) => /^(prisma|migrations|drizzle|alembic|db\/migrate)(\/|$)/.test(f.path) || /\/(migrations|alembic)\//.test(f.path) },
      { test: (f) => f.name === "schema.prisma" || f.extension === "sql" },
      { test: (f) => /(^|\/)(models?|entities|repositories)(\/|$)/i.test(f.directory) },
      { test: (_f, c) => !!c && /PrismaClient|drizzle\(|createPool\(|createClient\(\s*\{\s*url:\s*.*db|sqlalchemy|sessionmaker|ActiveRecord/i.test(c) },
      { test: (f) => f.name === "models.py" || f.name === "database.py" || f.name === "db.py" || f.name === "schema.py" },
      { test: (_f, c) => !!c && /class\s+\w+\(.*(Model|Base|Entity)\)/.test(c) && /Column|Field|orm/i.test(c) },
    ],
  },
  {
    type: "storage",
    reason: "object-storage usage",
    rules: [
      { test: (_f, c) => !!c && /@aws-sdk\/client-s3|PutObjectCommand|getSignedURL|google-cloud\/storage|minio/i.test(c) },
      { test: (f) => /(^|\/)(uploads?|storage)(\/|$)/i.test(f.directory) && /\.(ts|js|py|go|rb)$/i.test(f.name) },
    ],
  },
  {
    type: "frontend",
    reason: "UI component or page",
    rules: [
      { test: (f) => /\.(tsx|jsx|vue|svelte)$/.test(f.name) },
      { test: (f) => /(^|\/)(components?|ui|views|screens|pages|layouts)(\/|$)/i.test(f.directory) && /\.(ts|js)$/.test(f.name) },
      { test: (_f, c) => !!c && /from\s+["'](react|react-dom|vue|svelte|preact)["']|useState|defineComponent|<template>/.test(c) },
      { test: (f) => /\.module\.(css|scss)$/.test(f.name) },
      { test: (f) => /(^|\/)(css|styles?)(\/)/i.test(f.directory) && /\.(css|scss|sass|less)$/.test(f.name) },
    ],
  },
  {
    type: "backend",
    reason: "server entry point, server setup, or middleware",
    rules: [
      { test: (f) => /^(server|main|app|index|wsgi|asgi)\.(ts|js|mjs|py|go)$/i.test(f.name) },
      { test: (f) => /(^|\/)(middleware|middlewares)(\/|$)/i.test(f.directory) },
      { test: (_f, c) => !!c && /\.listen\(|createServer\(|http\.ListenAndServe|FastAPI\(|Flask\(__name__\)|SpringBootApplication/i.test(c) },
      { test: (f) => /(^|\/)(server|api|src\/server)(\/|$)/.test(f.directory) },
      { test: (f) => /manage\.py$/.test(f.name) },
    ],
  },
  {
    type: "service",
    reason: "internal service/business-logic module",
    rules: [
      { test: (f) => /(^|\/)(services?|usecases?|domain|core|business|logic)(\/|$)/i.test(f.directory) && CODE_EXT.has(f.extension.toLowerCase()) },
    ],
  },
];

const CODE_EXT = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "java", "kt", "rb", "php"]);

/**
 * Classify one file. Returns null when there is no evidence — unclassified
 * files never become part of the graph.
 */
export function classifyFile(file: IngestedFile, content: string | null): Classification | null {
  for (const group of RULES) {
    for (const rule of group.rules) {
      try {
        if (rule.test(file, content)) return { type: group.type, reason: group.reason };
      } catch {
        continue;
      }
    }
  }
  return null;
}
