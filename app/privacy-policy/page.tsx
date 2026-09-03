import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy — RepoGuide",
};

export default function PrivacyPolicyPage() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="prose lg:prose-xl max-w-2xl mx-auto">

          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight mb-8">
            Privacy Policy
          </h1>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Introduction
            </h2>
            <p>
              This Privacy Policy explains how RepoGuide collects, uses, discloses, and safeguards your information when you use our developer tool. RepoGuide is a platform that connects to your GitHub repository, analyzes codebase structure, and provides AI-powered onboarding documentation and Q&A. By accessing or using RepoGuide, you agree to the data practices described in this Policy.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Information We Collect
            </h2>
            <p>
              <strong>GitHub Account and Repository Information.</strong> When you sign in using your GitHub account, we collect the information you authorize during the OAuth flow. This includes your GitHub username (login), display name, avatar URL, and the email address associated with your account (where available through GitHub API). We also collect the repositories you authorize RepoGuide to access, including basic repository metadata such as repository name, full name (owner/name), description, primary language, visibility (public/private), star count, fork count, and default branch.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Repository Metadata and Source-Code Content
            </h2>
            <p>
              <strong>Repository Metadata.</strong> For each repository you analyze, we store metadata about the repository structure: detected programming languages, frameworks, package managers, entry points, important files, dependencies, and the directory tree structure. This metadata is derived from the codebase analysis and is used to generate the onboarding guide and architecture graph.
            </p>
            <p>
              <strong>Source-Code Content Processing.</strong> When you authorize repository access, RepoGuide downloads the repository code into a temporary, isolated environment for analysis. The source code is processed to extract structural metadata (languages, frameworks, dependencies), generate AI embeddings for codebase QA and onboarding guides, and build the architecture graph. We do not permanently store your repository source code. After analysis completes, the code is deleted from our temporary processing environment. The extracted metadata (languages, frameworks, etc.) and AI embeddings may be retained to power the features you use.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              AI Processing Data
            </h2>
            <p>
              <strong>AI Provider Calls.</strong> RepoGuide uses third-party AI providers to generate onboarding documentation and answer codebase questions. The following data is sent to AI providers:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm max-w-xl">
              <li>Code chunk snippets (portions of source code, limited to reasonable sizes for context windows)</li>
              <li>Repository metadata (languages, frameworks, detected patterns)</li>
              <li>User-generated questions (for codebase QA chat)</li>
              <li>AI-generated responses are streamed back to the UI and stored as chat history tied to your project</li>
            </ul>
            <p>
              <strong>AI Providers Used.</strong> RepoGuide currently integrates with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>Google Gemini</strong> (embedding model: gemini-embedding-2, 3072 dimensions) — used to create vector embeddings of code chunks for semantic search and codebase QA
              </li>
            </ul>
            <p>
              <strong>Context Sanitization.</strong> Before any code is sent to AI providers, our server-side context system redacts potential secrets (API keys, passwords, tokens, environment variable values) and only allows real file paths that exist in the repository to survive. Generated documentation references only files that actually exist in your repository.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Technical and Session Information
            </h2>
            <p>
              <strong>Session Data.</strong> When you are signed in, we store a signed session cookie (repoguide_session) on your browser. This cookie contains an encoded user ID and expiration timestamp. The cookie is HttpOnly, uses SameSite=Lax, and is encrypted with HMAC-SHA256 using your GitHub client secret. It cannot be forged by third parties.
            </p>
            <p>
              <strong>Usage and Analytics.</strong> We track usage metrics per user per month: repositories analyzed, AI questions asked, tokens consumed, storage used, and analysis runs. This data is stored in your user profile in our PostgreSQL database (Supabase) and is used to enforce Free plan limits (20 AI questions/month, 1 repository) and Pro plan quotas. We also record the period start/end dates for usage tracking.
            </p>
            <p>
              <strong>Technical Data.</strong> Standard web server information such as IP addresses, browser type, operating system, and visit timestamps may be collected through standard web infrastructure. We do not use external analytics services (e.g., Google Analytics) or tracking pixels at this time.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Why We Process Your Data
            </h2>
            <p>
              We process the collected data for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm max-w-xl">
              <li>
                <strong>Repository Analysis.</strong> To download and analyze your repository code, detect languages/frameworks/dependencies, and generate the onboarding guide and architecture graph.
              </li>
              <li>
                <strong>AI-Powered Features.</strong> To provide codebase QA chat and AI-generated onboarding guides. This requires sending code context to AI providers.
              </li>
              <li>
                <strong>Account Management.</strong> To manage your user account, track usage limits, and provide appropriate plan features.
              </li>
              <li>
                <strong>Security and Integrity.</strong> To detect and prevent abuse, ensure fair usage, and maintain the integrity of the platform.
              </li>
              <li>
                <strong>Feature Improvement.</strong> To understand how the platform is used and improve the service (based on the usage metrics described above).
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Data Retention
            </h2>
            <p>
              <strong>Repository Code.</strong> Repository source code is only downloaded into a temporary processing environment during analysis and is deleted after analysis completes. We do not permanently store your repository source code.
            </p>
            <p>
              <strong>AI Embeddings and Metadata.</strong> Vector embeddings of code chunks and structural metadata (languages, frameworks, dependencies) are retained for as long as you keep your project in RepoGuide. These can be regenerated if the repository changes.
            </p>
            <p>
              <strong>Chat History.</strong> Conversations in the codebase QA chat are saved per project and can be resumed. You can delete individual conversations or clear your chat history from the project settings.
            </p>
            <p>
              <strong>User Account Data.</strong> Your account information (GitHub login, email, avatar) is retained for as long as your account exists. You can delete your account at any time via the Settings page, which will cascade-delete associated data per the database schema.
            </p>
            <p>
              <strong>Session Cookies.</strong> Session cookies expire 30 days after creation or upon sign-out.
            </p>
            <p>
              <strong>Usage Records.</strong> Monthly usage tracking records are retained for the current and prior billing periods to enforce plan limits.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              User Rights
            </h2>
            <p>
              You have the following rights regarding your data:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm max-w-xl">
              <li>
                <strong>Access.</strong> You can view the data we have associated with your account by viewing your profile and project settings.
              </li>
              <li>
                <strong>Correction.</strong> You can update your name and email address through your account settings.
              </li>
              <li>
                <strong>Deletion.</strong> You can delete your account via the Settings page, which will remove your user data, associated projects, chat sessions, and usage records per database cascade rules. You can also request deletion of specific chat sessions.
              </li>
              <li>
                <strong>Export.</strong> You can download your generated onboarding guides and chat history from the project interface.
              </li>
              <li>
                <strong>Opt-Out of AI Processing.</strong> You can disconnect your GitHub account at any time, which will revoke RepoGuide access to your repositories. New analysis or QA will not be possible until you reconnect.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Third-Party Services
            </h2>
            <p>
              <strong>AI Providers.</strong> RepoGuide integrates with the following third-party AI services:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>Google Gemini</strong> — For code embeddings (vector search, codebase QA). When you use codebase QA or generate an onboarding guide, code chunk snippets and metadata are sent to Gemini. Gemini privacy policy applies to their processing of this data.
              </li>
            </ul>
            <p>
              <strong>GitHub.</strong> RepoGuide authenticates users via GitHub OAuth and accesses repositories read-only based on the permissions you authorize during sign-in. The GitHub OAuth flow and repository access are governed by GitHub terms and your authorization choices.
            </p>
            <p>
              <strong>Supabase (PostgreSQL).</strong> User data, including account information, project data, chat sessions, usage records, and AI embeddings, is stored in a PostgreSQL database hosted by Supabase. Supabase acts as our data storage provider and is subject to our data handling agreements.
            </p>
            <p>
              <strong>Stripe.</strong> For Pro plan subscribers, payment processing is handled via Stripe Checkout. Stripe receives the minimum necessary information (email, payment details) to process subscriptions. No card details are stored on RepoGuide servers.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Disclaimer
            </h2>
            <p>
              <strong>Accuracy of Generated Documentation.</strong> RepoGuide AI-generated onboarding guides and codebase QA answers are produced by artificial intelligence. While we implement context sanitization and grounding techniques to ensure answers are based on your actual code, AI outputs may contain errors, omissions, or inaccuracies. The generated documentation and QA answers should be reviewed by a human before being relied upon for critical decisions. RepoGuide does not warrant that the generated content is error-free, complete, or up-to-date.
            </p>
            <p>
              <strong>No Professional Advice.</strong> The generated content is provided for convenience and information purposes only and does not constitute professional advice, including but not limited to legal, financial, or technical advice. Always consult appropriate professionals for such matters.
            </p>
          </section>

          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight mb-6">
              Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy, or if you would like to exercise any of your rights described herein, you can contact us at:<br />
              <a href="mailto:privacy@repoguide.example" className="transition-colors hover:text-foreground">
                privacy@repoguide.example
              </a><br /><br />
            </p>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of material changes by posting the new Privacy Policy on this page and updating Last updated date below.
            </p>
          </section>

          <div className="mt-8 pt-8 border-t text-center text-xs text-muted-foreground">
            <p>Last updated: September 2026</p>
          </div>

        </div>
      </div>
    </section>
  );
}