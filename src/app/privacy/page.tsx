import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to Home
            </Link>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US")}
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-700 mb-4">
                AI Sessions ("we", "our", or "us") operates aisessions.dev. This
                Privacy Policy explains how we collect, use, and protect your
                personal information when you use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Information We Collect
              </h2>
              <p className="text-gray-700 mb-4">
                When you use AI Sessions, we collect the following information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>GitHub Account Information:</strong> When you sign in
                  with GitHub OAuth, we collect your GitHub username, name,
                  email address, and profile picture.
                </li>
                <li>
                  <strong>Transcript Files:</strong> The Claude Code session
                  transcripts (JSONL files) you upload to share with others.
                </li>
                <li>
                  <strong>Authentication Cookies:</strong> We use strictly
                  necessary session cookies to keep you logged in.
                </li>
                <li>
                  <strong>Metadata:</strong> Creation dates, file sizes, and
                  message counts associated with your transcripts.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 mb-4">
                We use your information solely to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Authenticate your account and maintain your session</li>
                <li>Store and display your uploaded transcripts</li>
                <li>
                  Associate transcripts with your account so you can manage them
                </li>
                <li>Generate shareable secret URLs for your transcripts</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>We do not:</strong>
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Sell your data to third parties</li>
                <li>Use your data for advertising</li>
                <li>Share your data with anyone except as required by law</li>
                <li>Use analytics or tracking cookies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Data Storage and Security
              </h2>
              <p className="text-gray-700 mb-4">
                Your data is stored securely in a PostgreSQL database. We use
                industry-standard security practices including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Encrypted database connections (SSL/TLS)</li>
                <li>Secure authentication via GitHub OAuth 2.0</li>
                <li>Secret tokens for transcript access control</li>
                <li>Regular security updates</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Cookies
              </h2>
              <p className="text-gray-700 mb-4">
                We only use <strong>strictly necessary cookies</strong> for
                authentication:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    authjs.session-token
                  </code>{" "}
                  or{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    __Secure-authjs.session-token
                  </code>{" "}
                  - Used to keep you logged in
                </li>
              </ul>
              <p className="text-gray-700 mt-4">
                These cookies are essential for the service to function and do
                not require your consent under GDPR.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Third-Party Services
              </h2>
              <p className="text-gray-700 mb-4">
                We use the following third-party services:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>GitHub OAuth:</strong> For authentication. Refer to{" "}
                  <a
                    href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    GitHub's Privacy Statement
                  </a>
                  .
                </li>
                <li>
                  <strong>Vercel:</strong> For hosting. Refer to{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Vercel's Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong>Neon:</strong> For database hosting. Refer to{" "}
                  <a
                    href="https://neon.tech/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Neon's Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong>Upstash:</strong> For redis hosting (rate-limiting).
                  Refer to{" "}
                  <a
                    href="https://upstash.com/trust/privacy.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    Neon's Privacy Policy
                  </a>
                  .
                </li>
              </ul>
            </section>

            <div className="mb-8 p-6 bg-red-50 border-2 border-red-500 rounded-lg">
              <h2 className="text-2xl font-bold text-red-900 mb-4">
                ⚠️ Public Content Warning!
              </h2>
              <div className="space-y-3 text-red-900">
                <p className="font-semibold text-lg">
                  Transcripts you upload are accessible to ANYONE with the
                  secret URL. Links can be shared, leaked, or discovered.
                </p>
                <p className="font-semibold">
                  <strong>DO NOT upload transcripts containing:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-1 font-medium">
                  <li>Proprietary or confidential business information</li>
                  <li>Trade secrets, internal documents, or company IP</li>
                  <li>Client or customer data</li>
                  <li>Information subject to NDAs or employment agreements</li>
                  <li>Credentials (API keys, passwords, tokens)</li>
                  <li>Personal information (yours or others')</li>
                  <li>Any sensitive or confidential content</li>
                </ul>
                <p className="font-semibold mt-3">
                  Once shared, the content is effectively public. We cannot
                  control who accesses or shares the URLs. You are solely
                  responsible for ensuring uploaded content is safe for public
                  disclosure.
                </p>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Your Rights
              </h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Access:</strong> View all transcripts you've uploaded
                  in the "My Transcripts" page
                </li>
                <li>
                  <strong>Delete:</strong> Delete individual transcripts at any
                  time
                </li>
                <li>
                  <strong>Delete Account:</strong> Permanently delete your
                  account and all associated data from the "My Transcripts" page
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Data Retention
              </h2>
              <p className="text-gray-700 mb-4">
                We retain your data until you delete it:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  Transcripts are stored indefinitely until you delete them
                </li>
                <li>Account data is stored until you delete your account</li>
                <li>
                  When you delete your account, all associated data (transcripts
                  and profile information) is permanently deleted from our
                  database
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Children's Privacy
              </h2>
              <p className="text-gray-700 mb-4">
                AI Sessions is not intended for users under 13 years of age. We
                do not knowingly collect information from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Changes to This Policy
              </h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by updating the "Last updated" date at
                the top of this page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Contact Us
              </h2>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy, please contact
                us through GitHub by opening an issue in our repository.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
