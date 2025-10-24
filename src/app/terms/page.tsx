import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - AI Sessions",
  description:
    "Terms of Service for AI Sessions - Rules and guidelines for using our Claude Code transcript sharing platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="flex-1">
            <Link
              href="/"
              className="font-mono text-lg font-bold hover:text-muted-foreground transition-colors"
            >
              ai_sessions
            </Link>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight font-mono mb-4">
            terms_of_service
          </h1>
          <p className="text-sm text-muted-foreground mb-12">
            Last updated: October 16, 2025
          </p>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground mb-4">
                By accessing or using AI Sessions ("the Service"), you agree to
                be bound by these Terms of Service ("Terms"). If you do not
                agree to these Terms, you may not use the Service.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>Age Requirement:</strong> You must be at least 13 years
                old to use this Service. By using AI Sessions, you represent and
                warrant that you are at least 13 years of age.
              </p>
              <p className="text-muted-foreground mb-4">
                We reserve the right to modify these Terms at any time. Changes
                will be effective immediately upon posting. Your continued use
                of the Service after changes constitutes acceptance of the
                modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                2. Description of Service
              </h2>
              <p className="text-muted-foreground mb-4">
                AI Sessions is a platform for uploading, storing, and sharing
                Claude Code session transcripts in JSONL format. The Service
                generates shareable URLs that allow anyone with the link to view
                uploaded transcripts.
              </p>
            </section>

            <div className="mb-8 p-6 bg-red-50 border-2 border-red-500 rounded-lg">
              <h2 className="text-2xl font-bold text-red-900 mb-4">
                ⚠️ Public Content Warning!
              </h2>
              <div className="space-y-4 text-red-900">
                <p className="font-semibold text-lg">
                  ALL UPLOADED TRANSCRIPTS ARE EFFECTIVELY PUBLIC. Anyone with
                  the secret URL can view your content.
                </p>
                <p className="font-semibold">
                  DO NOT upload transcripts containing:
                </p>
                <ul className="list-disc pl-6 space-y-2 font-medium">
                  <li>
                    <strong>
                      Proprietary or confidential business information
                    </strong>{" "}
                    (code, trade secrets, internal documents, business
                    strategies)
                  </li>
                  <li>
                    <strong>Company secrets or intellectual property</strong>{" "}
                    that you or your employer owns
                  </li>
                  <li>
                    <strong>Client or customer data</strong> of any kind
                  </li>
                  <li>
                    <strong>Private or sensitive information</strong> about
                    yourself or others
                  </li>
                  <li>
                    <strong>Credentials or secrets</strong> (API keys,
                    passwords, tokens, certificates)
                  </li>
                  <li>
                    <strong>Personal identifiable information</strong> (SSNs,
                    credit cards, addresses, phone numbers)
                  </li>
                  <li>
                    <strong>Information subject to NDAs</strong> or
                    confidentiality agreements
                  </li>
                  <li>
                    <strong>
                      Any content you don't have permission to share publicly
                    </strong>
                  </li>
                </ul>
                <p className="font-semibold text-lg mt-4">
                  By uploading content, you confirm it is safe for public
                  disclosure and you have all necessary rights and permissions
                  to share it.
                </p>
                <p className="mt-4">
                  <strong>We are not responsible for:</strong> Data breaches,
                  unauthorized access, leaks of proprietary information,
                  violations of NDAs, or any damages resulting from your
                  decision to upload confidential content. You assume all risk
                  and liability for uploaded content.
                </p>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                3. User Accounts and Authentication
              </h2>
              <p className="text-muted-foreground mb-4">
                To upload transcripts, you must authenticate using a GitHub
                account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>
                  Maintaining the security of your GitHub account credentials
                </li>
                <li>All activities that occur under your account</li>
                <li>
                  Notifying us immediately of any unauthorized access or
                  security breach
                </li>
              </ul>
              <p className="text-muted-foreground">
                We reserve the right to suspend or terminate accounts that
                violate these Terms or engage in abusive behavior.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                4. Acceptable Use Policy
              </h2>
              <p className="text-muted-foreground mb-4">
                You agree NOT to use the Service to upload, store, or share
                content that:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>
                  <strong>
                    Contains proprietary or confidential information:
                  </strong>{" "}
                  Includes trade secrets, proprietary code, internal business
                  documents, confidential strategies, or any information subject
                  to NDAs or employment agreements
                </li>
                <li>
                  <strong>Violates laws:</strong> Infringes on intellectual
                  property rights, violates privacy laws, or breaches any local,
                  state, national, or international law
                </li>
                <li>
                  <strong>Contains malware:</strong> Includes viruses, trojans,
                  malicious code, or any harmful software
                </li>
                <li>
                  <strong>Is harassing or abusive:</strong> Threatens, harasses,
                  bullies, defames, or harms others
                </li>
                <li>
                  <strong>Is illegal content:</strong> Contains child sexual
                  abuse material, content promoting terrorism, or facilitates
                  illegal activities
                </li>
                <li>
                  <strong>Violates privacy:</strong> Contains personally
                  identifiable information (PII) of others without consent,
                  including social security numbers, credit card numbers,
                  private addresses, or phone numbers
                </li>
                <li>
                  <strong>Contains credentials:</strong> Includes passwords, API
                  keys, private keys, access tokens, or other authentication
                  credentials
                </li>
                <li>
                  <strong>Is spam or phishing:</strong> Used for unsolicited
                  advertising, phishing, or distribution of malicious links
                </li>
                <li>
                  <strong>Impersonates others:</strong> Falsely represents
                  identity or affiliation with any person or organization
                </li>
                <li>
                  <strong>Violates third-party rights:</strong> Infringes on
                  copyrights, trademarks, trade secrets, or other proprietary
                  rights
                </li>
              </ul>
              <p className="text-muted-foreground mb-4">
                You also agree NOT to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>
                  Attempt to circumvent security measures or access unauthorized
                  areas
                </li>
                <li>
                  Use automated systems (bots, scrapers) to access the Service
                  without permission
                </li>
                <li>
                  Interfere with or disrupt the Service or servers/networks
                  connected to it
                </li>
                <li>
                  Reverse engineer, decompile, or disassemble any part of the
                  Service
                </li>
                <li>
                  Upload excessive amounts of data to abuse storage resources
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                5. Content Ownership and Licensing
              </h2>
              <p className="text-muted-foreground mb-4">
                <strong>Your Content:</strong> You retain all ownership rights
                to the content you upload. However, by uploading content to the
                Service, you grant us a worldwide, non-exclusive, royalty-free
                license to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>
                  Store, process, and display your content for the purpose of
                  operating the Service
                </li>
                <li>
                  Make your content accessible via the secret URLs you create
                </li>
                <li>
                  Create backup copies for reliability and disaster recovery
                </li>
              </ul>
              <p className="text-muted-foreground mb-4">
                <strong>Important:</strong> Transcripts are accessible to anyone
                with the secret URL. We do not monitor or control who you share
                these URLs with. Once shared, the content is effectively public
                to anyone with the link.
              </p>
              <p className="text-muted-foreground">
                You represent and warrant that you have all necessary rights to
                upload the content and grant us this license.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                6. Content Monitoring and Removal
              </h2>
              <p className="text-muted-foreground mb-4">
                While we do not actively monitor user content, we reserve the
                right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>
                  Review content if we receive reports of Terms violations
                </li>
                <li>
                  Remove content that violates these Terms without prior notice
                </li>
                <li>
                  Suspend or terminate accounts that repeatedly violate these
                  Terms
                </li>
                <li>
                  Cooperate with law enforcement and respond to legal requests
                  for information
                </li>
                <li>
                  Report illegal content (such as CSAM) to appropriate
                  authorities as required by law
                </li>
              </ul>
              <p className="text-muted-foreground">
                We may, but are not obligated to, investigate reported
                violations. Content removal does not constitute an admission of
                liability.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                7. DMCA and Copyright Policy
              </h2>
              <p className="text-muted-foreground mb-4">
                We respect intellectual property rights and expect users to do
                the same. If you believe content on the Service infringes your
                copyright, please provide:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>
                  Identification of the copyrighted work claimed to be infringed
                </li>
                <li>
                  Identification of the infringing material (include the secret
                  URL)
                </li>
                <li>
                  Your contact information (email address, phone number,
                  address)
                </li>
                <li>
                  A statement that you have a good faith belief the use is
                  unauthorized
                </li>
                <li>
                  A statement that the information is accurate and, under
                  penalty of perjury, that you are authorized to act on behalf
                  of the copyright owner
                </li>
                <li>Your physical or electronic signature</li>
              </ul>
              <p className="text-muted-foreground">
                Send DMCA notices to us by opening an issue at{" "}
                <a
                  href="https://github.com/yoavf/ai-sessions/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/yoavf/ai-sessions/issues
                </a>
                . Repeat infringers will have their accounts terminated.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                8. Disclaimers and Limitations of Liability
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-foreground mb-2">
                    AS-IS SERVICE:
                  </p>
                  <p className="text-muted-foreground">
                    This service is provided "as-is" without any warranties. We
                    make no guarantees about availability, data retention, or
                    functionality.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-2">
                    LIMITATION OF LIABILITY:
                  </p>
                  <p className="text-muted-foreground">
                    To the maximum extent permitted by law, we shall not be
                    liable for any indirect, incidental, or consequential
                    damages arising from your use of the service.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                9. Indemnification
              </h2>
              <p className="text-muted-foreground mb-4">
                You agree to indemnify, defend, and hold harmless AI Sessions,
                its operators, affiliates, and service providers from any
                claims, liabilities, damages, losses, and expenses (including
                reasonable attorneys' fees) arising from:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Content you upload to the Service</li>
                <li>Your breach of any representation or warranty</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                10. Data Backup and Loss
              </h2>
              <p className="text-muted-foreground mb-4">
                You are solely responsible for maintaining backup copies of any
                content you upload. We are not responsible for backing up your
                content. We may delete content without prior notice in the
                following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>When you delete your account or individual transcripts</li>
                <li>
                  When we terminate accounts for violations of these Terms
                </li>
                <li>Due to technical issues or service discontinuation</li>
                <li>
                  In response to legal requirements or valid legal requests
                </li>
              </ul>
              <p className="text-muted-foreground">
                We assume no liability for any deletion, loss, or corruption of
                your content. Always maintain your own backups.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                11. Service Availability and Termination
              </h2>
              <p className="text-muted-foreground mb-4">
                We reserve the right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>
                  Modify, suspend, or discontinue the Service (or any part
                  thereof) at any time with or without notice
                </li>
                <li>Refuse service to anyone for any reason at any time</li>
                <li>
                  Terminate or suspend your account immediately, without prior
                  notice or liability, for any reason, including breach of these
                  Terms
                </li>
                <li>
                  Implement usage limits (file size, storage, number of
                  transcripts) at our discretion
                </li>
              </ul>
              <p className="text-muted-foreground">
                Upon termination, your right to use the Service will cease
                immediately, and we may delete your account and content without
                liability.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                12. Third-Party Services
              </h2>
              <p className="text-muted-foreground mb-4">
                The Service relies on third-party services (GitHub for
                authentication, hosting providers, etc.). We are not responsible
                for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>
                  The availability or functionality of third-party services
                </li>
                <li>
                  Any loss or damage resulting from third-party service
                  interruptions
                </li>
                <li>
                  The privacy practices or content of third-party services (see
                  their respective Terms and Privacy Policies)
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                13. Governing Law and Dispute Resolution
              </h2>
              <p className="text-muted-foreground mb-4">
                These Terms shall be governed by and construed in accordance
                with the laws of the State of Israel, without regard to conflict
                of law principles.
              </p>
              <p className="text-muted-foreground mb-4">
                Any disputes arising from these Terms or your use of the Service
                shall be subject to the exclusive jurisdiction of the courts
                located in Tel-Aviv, Israel. Both parties consent to the
                jurisdiction and venue of such courts.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                14. Reporting Violations
              </h2>
              <p className="text-muted-foreground mb-4">
                If you believe content on the Service violates these Terms,
                please report it by opening an issue at{" "}
                <a
                  href="https://github.com/yoavf/ai-sessions/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/yoavf/ai-sessions/issues
                </a>
                . Include:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                <li>The secret URL of the offending content</li>
                <li>A description of the violation</li>
                <li>Any supporting evidence</li>
                <li>Your contact information</li>
              </ul>
              <p className="text-muted-foreground">
                We will investigate reports in good faith but make no guarantees
                about response time or outcomes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                15. Severability
              </h2>
              <p className="text-muted-foreground">
                If any provision of these Terms is held to be invalid or
                unenforceable, the remaining provisions will continue in full
                force and effect. The invalid provision will be modified to the
                minimum extent necessary to make it valid and enforceable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                16. Entire Agreement
              </h2>
              <p className="text-muted-foreground">
                These Terms, together with our Privacy Policy, constitute the
                entire agreement between you and AI Sessions regarding the
                Service, superseding any prior agreements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                17. Contact Information
              </h2>
              <p className="text-muted-foreground">
                For questions about these Terms, please contact us by opening an
                issue at{" "}
                <a
                  href="https://github.com/yoavf/ai-sessions/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/yoavf/ai-sessions/issues
                </a>
                .
              </p>
            </section>

            <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <p className="text-sm text-muted-foreground">
                <strong>Important:</strong> By using AI Sessions, you
                acknowledge that you have read, understood, and agree to be
                bound by these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
