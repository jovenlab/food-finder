"use client";

import { useEffect, useState } from "react";

// The backend URL comes from an environment variable so we can change it
// without editing code. Variables that the browser is allowed to read must
// start with NEXT_PUBLIC_.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type BackendStatus = "checking" | "online" | "offline";

export default function HomePage() {
  const [status, setStatus] = useState<BackendStatus>("checking");

  // useEffect runs after the component appears on screen. We use it to ask the
  // backend whether it is alive.
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => (response.ok ? setStatus("online") : setStatus("offline")))
      .catch(() => setStatus("offline"));
  }, []);

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Food Finder</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Search packaged food products from Open Food Facts.
      </p>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h2 className="mb-2 font-semibold">Backend connection</h2>
        {status === "checking" && <p className="text-gray-500">Checking…</p>}
        {status === "online" && (
          <p className="text-green-600">Backend is online at {API_URL}</p>
        )}
        {status === "offline" && (
          <p className="text-red-600">
            Backend is not reachable at {API_URL}. Is it running?
          </p>
        )}
      </div>
    </main>
  );
}
