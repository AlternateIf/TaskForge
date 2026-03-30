import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-xl py-2xl sm:px-2xl">
      <div className="mx-auto max-w-180">
        <button
          type="button"
          onClick={() => void navigate({ to: '/auth/register' })}
          className="mb-2xl flex items-center gap-xs text-small text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <div className="mb-xl flex items-center gap-3">
          <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-radius-lg bg-brand-primary">
            <span className="text-sm font-bold text-white">TF</span>
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">TaskForge</span>
        </div>

        <h1 className="text-heading-1 font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-xs text-small text-muted">Last updated: March 30, 2026</p>
        <p className="mt-xs text-small text-secondary">TaskForge is operated by David Magoc.</p>

        <div className="mt-2xl space-y-xl text-body text-foreground">
          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">1. Scope</h2>
            <p className="text-secondary">
              This Privacy Policy explains how TaskForge collects, uses, shares, and protects
              personal information when you use our websites, applications, and related services
              (collectively, the &quot;Service&quot;).
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">2. Information We Collect</h2>
            <p className="text-secondary">
              We collect information directly from you, automatically from your use of the Service,
              and from third-party integrations you enable.
            </p>
            <ul className="list-disc space-y-1 pl-6 text-secondary">
              <li>
                Account and profile information: name, email address, password hash, role, and
                workspace metadata.
              </li>
              <li>
                Workspace content: projects, tasks, comments, attachments, and activity history
                submitted by you or your team.
              </li>
              <li>
                Billing and transactional data: plan, invoices, payment status, and limited payment
                details provided through our payment processor.
              </li>
              <li>
                Device and usage data: IP address, browser type, operating system, app events, crash
                logs, and performance metrics.
              </li>
              <li>
                Cookies and similar technologies used for authentication, security, preferences, and
                analytics.
              </li>
            </ul>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">3. How We Use Information</h2>
            <p className="text-secondary">
              We use personal information to operate the Service, including to authenticate users,
              provide core product functionality, personalize user experience, process payments,
              communicate service updates, provide support, improve reliability, detect abuse and
              security incidents, and comply with legal obligations.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">4. Legal Bases (Where Applicable)</h2>
            <p className="text-secondary">
              If you are in the EEA, UK, or similar jurisdictions, we process personal data under
              one or more legal bases: performance of a contract, legitimate interests, compliance
              with legal obligations, and consent when required.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">5. How We Share Information</h2>
            <p className="text-secondary">We do not sell personal information.</p>
            <ul className="list-disc space-y-1 pl-6 text-secondary">
              <li>
                Service providers that support hosting, analytics, communications, customer support,
                monitoring, and payment processing.
              </li>
              <li>
                Workspace administrators, who may access and manage account and workspace data
                within their organization.
              </li>
              <li>
                Legal authorities when required by law or to protect rights, safety, and security.
              </li>
              <li>
                Corporate transaction counterparties in connection with a merger, acquisition, or
                asset transfer, subject to appropriate confidentiality commitments.
              </li>
            </ul>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">6. International Transfers</h2>
            <p className="text-secondary">
              Your information may be processed in countries other than your own. Where required, we
              use contractual and organizational safeguards for cross-border data transfers.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">7. Data Retention</h2>
            <p className="text-secondary">
              We retain personal information for as long as needed to provide the Service, satisfy
              legal and accounting obligations, resolve disputes, and enforce agreements. Retention
              periods vary based on data type and legal requirements.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">8. Security</h2>
            <p className="text-secondary">
              We implement administrative, technical, and organizational safeguards designed to
              protect personal information. No security measure is absolute, and we cannot guarantee
              complete security.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">9. Your Rights and Choices</h2>
            <p className="text-secondary">
              Depending on your location, you may have rights to access, correct, delete, or export
              your personal data, and to object to or restrict certain processing. You can also
              manage communication preferences and certain cookie settings. To submit a request,
              contact us via our GitHub repository:{' '}
              <a
                href="https://github.com/AlternateIf/TaskForge"
                className="text-brand-primary hover:underline"
              >
                github.com/AlternateIf/TaskForge
              </a>
              .
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">10. Children&apos;s Privacy</h2>
            <p className="text-secondary">
              The Service is not directed to children under 13 (or a higher minimum age where
              required by local law). We do not knowingly collect personal data from children.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">11. Third-Party Services</h2>
            <p className="text-secondary">
              The Service may contain links to third-party websites or integrations. We are not
              responsible for third-party privacy practices, and you should review their policies.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">12. Changes to This Policy</h2>
            <p className="text-secondary">
              We may update this Privacy Policy from time to time. If changes are material, we will
              provide notice through the Service or by email. The updated version is effective as of
              the &quot;Last updated&quot; date shown above.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">13. Contact</h2>
            <p className="text-secondary">
              For privacy questions or requests, contact us via our GitHub repository:{' '}
              <a
                href="https://github.com/AlternateIf/TaskForge"
                className="text-brand-primary hover:underline"
              >
                github.com/AlternateIf/TaskForge
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
