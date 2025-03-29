'use client';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";




export default function PrivacyPage() {
    const router = useRouter();

    const handleHomeClick = () => {
  router.push('/');
};
  
  return (
         
    //add a button to go back to the home page

    <div className="flex flex-col items-center justify-center py-5">
      <div className="mb-4">
        <Button variant="outline" onClick={handleHomeClick}>
          Go Back to Home Page
        </Button>
      </div>

    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="text-gray-600 mb-4">
            Welcome to Inbox Pilot! Your privacy is important to us. This Privacy Policy explains how Inbox Pilot collects, uses, stores, and shares your information, including Google user data, when you use our platform. Our practices comply with Google’s Limited Use Policy, and we only use your data to improve the functionality and user experience of Inbox Pilot.

            By using Inbox Pilot, you consent to the data practices described in this Privacy Policy.


          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Data We Collect</h2>
          <p className="text-gray-600 mb-4">
            When you connect your Google account to Inbox Pilot, we collect the following types of data:<br></br>

            Email Content and Metadata: We access and process incoming email content, metadata, and labels to apply automation rules and provide advanced search capabilities.<br></br>
            Draft, Forward, Archive, and Label Permissions: Inbox Pilot has the ability to create draft responses, forward, archive, and label emails based on user-defined rules.<br></br>
            Google Calendar Data: We access calendar data to understand user availability and use it as context to enhance email management.<br></br>
            <br></br>
            <strong>Scope Control:</strong> <br></br>
            Inbox Pilot stops processing your incoming emails when you choose to stop applying rules.<br></br>
            Inbox Pilot stops storing your emails in a vector store when you disable the Recall feature used for semantic search.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Data</h2>
          <p className="text-gray-600 mb-4">
            Inbox Pilot uses the collected data to:<br></br>
            
            Apply user-defined email automation rules to streamline your inbox.<br></br>
            Allow you to semantically search and summarize email content using Retrieval-Augmented Generation (disabled by default and requires explicit user activation).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>
          <p className="text-gray-600 mb-4">

            By default, Inbox Pilot does not store the content of your incoming emails.<br></br>

            If the Recall feature is enabled, email content is stored in a secure vector store to allow for semantic search. Stored data is retained only as long as necessary to provide the services and is deleted when the user disables Recall or revokes access.
         </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Disclosure</h2>
          <p className="text-gray-600 mb-4">
            Inbox Pilot does not share your data with third parties for advertising or resale purposes. However, some data is processed by third parties to provide core functionality:<br></br>
            <strong>Third-Party AI Provider:</strong><br></br>

            Inbox Pilot uses OpenAI to classify and apply email rules intelligently. Data is sent to OpenAI only for processing and is not stored by the third party. <br></br>
            We strictly adhere to Google’s Limited Use Policy and restrict all use of Google user data to the services described in this Privacy Policy.

         </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. User Consent and Control</h2>
          <p className="text-gray-600 mb-4">
            <strong>Granting Consent</strong><br></br>
            Users authorize Inbox Pilot via OAuth 2.0 using Google&apos;s Consent Screen.<br></br>
            Consent can be revoked at any time by visiting Google&apos;s Third-Party Apps & Services Connections page and removing Inbox Pilot&apos;s access.<br></br>
            <br></br>
            <strong>Controlling Your Data</strong><br></br>
            Users can disable rule automation or stop data storage for Recall by toggling the relevant settings within the Inbox Pilot interface.<br></br>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. In-Product Privacy Notifications</h2>
          <p className="text-gray-600 mb-4">
            We provide in-product privacy notifications in the following places:<br></br>
            On the OAuth Consent Screen during account setup.<br></br>
            <br></br>
            Users will be notified of any changes to this Privacy Policy through:<br></br>
            A prominent notice on the landing page.<br></br>
            An update prompt within the app.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Changes to This Privacy Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update this Privacy Policy periodically. If we make material changes, we will notify users through email and an in-product notification. The revised policy will be available on our landing page and in the app interface.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions, concerns, or feedback about this Privacy Policy or Inbox Pilot, please contact us at:<br></br>
            <br></br>
            <strong>📧 Email: inboxpilots@gmail.com</strong><br></br>
            <strong>🌐 Website: https://theinboxpilot.com</strong>
          </p>
        </section>
      </div>
    </div>
    </div>
  );
}
