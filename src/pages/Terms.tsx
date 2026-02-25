
import React from 'react';

const Terms = () => {
  return (
    <div className="bg-kitloop-background min-h-screen pt-20 pb-16">
      <div className="container mx-auto max-w-3xl px-6">
        <h1 className="text-4xl font-bold mb-10">Terms of Service</h1>
        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm text-muted-foreground">
            Last updated: February 2026 · These terms are provided in English only during the MVP phase.
            / Tyto podmínky jsou v MVP fázi dostupné pouze v angličtině.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Service description</h2>
            <p>
              Kitloop is a reservation and inventory management platform for outdoor gear rental
              businesses. Access to the platform is provided on an invitation basis during the
              current MVP phase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Acceptance</h2>
            <p>
              By registering or using Kitloop you agree to these terms. If you do not agree,
              do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. Accounts</h2>
            <p>
              You are responsible for keeping your login credentials secure and for all activity
              under your account. Notify us immediately at{' '}
              <a href="mailto:support@kitloop.cz" className="text-emerald-600 hover:underline">
                support@kitloop.cz
              </a>{' '}
              if you suspect unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Data and privacy</h2>
            <p>
              We collect and process personal data as described in our{' '}
              <a href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</a>.
              We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Limitation of liability</h2>
            <p>
              Kitloop is provided "as is" during the MVP phase. To the maximum extent permitted by
              applicable law, Kitloop s.r.o. is not liable for indirect, incidental or consequential
              damages arising from use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">6. Changes to these terms</h2>
            <p>
              We may update these terms as the product evolves. We will notify registered users by
              email before material changes take effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">7. Contact</h2>
            <p>
              Questions about these terms?{' '}
              <a href="mailto:support@kitloop.cz" className="text-emerald-600 hover:underline">
                support@kitloop.cz
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
