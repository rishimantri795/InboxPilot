export default function TestPage() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Environment Variables Test</h1>
      <p>
        <strong>Backend URL:</strong>{" "}
        {process.env.NEXT_PUBLIC_BACKEND_URL || "Not Set"}
      </p>
      <p>
        <strong>Firebase API Key:</strong>{" "}
        {process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "Not Set"}
      </p>
      <p>
        <strong>Firebase Auth Domain:</strong>{" "}
        {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "Not Set"}
      </p>
    </div>
  );
}
