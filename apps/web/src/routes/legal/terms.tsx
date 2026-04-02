import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-xl py-2xl sm:px-2xl">
      <div className="mx-auto max-w-180">
        <button
          type="button"
          onClick={() => void navigate({ to: '/auth/login', search: { redirect: undefined } })}
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

        <h1 className="text-heading-1 font-bold text-foreground">Terms of Use</h1>
        <p className="mt-xs text-small text-muted">Last updated: March 30, 2026</p>
        <p className="mt-xs text-small text-secondary">
          These Terms are an agreement between you and David Magoc, operator of TaskForge.
        </p>

        <div className="mt-2xl space-y-xl text-body text-foreground">
          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">1. Agreement to These Terms</h2>
            <p className="text-secondary">
              By accessing or using TaskForge, you agree to be bound by these Terms of Use and our
              Privacy Policy. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">2. Eligibility and Accounts</h2>
            <p className="text-secondary">
              You must be legally capable of entering into a binding agreement and use the Service
              only in compliance with applicable law. You are responsible for safeguarding account
              credentials and for all activity under your account.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">3. Permitted Use</h2>
            <p className="text-secondary">
              We grant you a limited, non-exclusive, non-transferable, revocable right to use
              TaskForge for your internal business or personal productivity purposes in accordance
              with these Terms.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">4. Prohibited Conduct</h2>
            <p className="text-secondary">You agree not to:</p>
            <ul className="list-disc space-y-1 pl-6 text-secondary">
              <li>Use the Service for illegal, harmful, fraudulent, or deceptive activities.</li>
              <li>
                Attempt unauthorized access to systems, accounts, or data, or interfere with service
                integrity, security, or performance.
              </li>
              <li>
                Upload malware, run abusive automation, or conduct denial-of-service activity.
              </li>
              <li>
                Reverse engineer, copy, resell, or exploit the Service except as permitted by law.
              </li>
              <li>Infringe intellectual property or privacy rights of others.</li>
            </ul>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">5. Customer Content</h2>
            <p className="text-secondary">
              You retain ownership of content you submit to TaskForge, including tasks, files,
              comments, and project data (&quot;Customer Content&quot;). You grant us a limited
              license to host, process, transmit, and display Customer Content solely to provide and
              improve the Service, enforce these Terms, and comply with law.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">6. Intellectual Property</h2>
            <p className="text-secondary">
              The Service, including software, design, branding, and related materials, is owned by
              TaskForge or its licensors and is protected by applicable intellectual property laws.
              Except for rights expressly granted in these Terms, all rights are reserved.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">7. Billing and Subscription Terms</h2>
            <p className="text-secondary">
              Paid plans, if offered, are billed in advance based on your selected plan and billing
              cycle. Fees are non-refundable except where required by law or explicitly stated
              otherwise. You authorize us and our payment processor to charge the payment method on
              file for recurring fees, taxes, and applicable overages.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">8. Third-Party Services</h2>
            <p className="text-secondary">
              The Service may integrate with third-party tools. Your use of third-party services is
              governed by their separate terms and policies, and we are not responsible for those
              services.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">9. Service Changes and Availability</h2>
            <p className="text-secondary">
              We may modify, suspend, or discontinue features from time to time. We do not guarantee
              uninterrupted or error-free operation and may perform maintenance that temporarily
              affects availability.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">10. Privacy</h2>
            <p className="text-secondary">
              Our processing of personal information is described in our Privacy Policy, which is
              incorporated into these Terms by reference.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">11. Suspension and Termination</h2>
            <p className="text-secondary">
              You may stop using the Service at any time. We may suspend or terminate your access if
              you violate these Terms, create security risk, or expose us or others to liability.
              Upon termination, your right to use the Service ends immediately.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">12. Disclaimers</h2>
            <p className="text-secondary">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM
              EXTENT PERMITTED BY LAW, TASKFORGE DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED,
              INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">13. Limitation of Liability</h2>
            <p className="text-secondary">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TASKFORGE WILL NOT BE LIABLE FOR INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR LOSS OF
              PROFITS, REVENUE, DATA, OR GOODWILL. TASKFORGE&apos;S AGGREGATE LIABILITY FOR ALL
              CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF THE AMOUNT YOU PAID TO
              TASKFORGE IN THE 12 MONTHS BEFORE THE CLAIM OR ONE HUNDRED U.S. DOLLARS (USD $100).
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">14. Indemnification</h2>
            <p className="text-secondary">
              You agree to defend, indemnify, and hold harmless TaskForge and its affiliates from
              claims, liabilities, damages, and expenses arising out of your use of the Service,
              Customer Content, or violation of these Terms.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">15. Governing Law</h2>
            <p className="text-secondary">
              These Terms are governed by the laws of Austria, excluding conflict-of-laws rules,
              unless mandatory law in your jurisdiction requires otherwise.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">16. Changes to Terms</h2>
            <p className="text-secondary">
              We may update these Terms from time to time. If changes are material, we will provide
              notice through the Service or by email. Continued use after the effective date of the
              revised Terms constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="text-heading-3 font-semibold">17. Contact</h2>
            <p className="text-secondary">
              For questions about these terms, contact us via our GitHub repository:{' '}
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
