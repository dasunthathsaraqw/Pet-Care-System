import { useEffect, useState } from "react";

const OAuthCallback = () => {
  const [message, setMessage] = useState("Completing Google login...");

  useEffect(() => {
    const exchangeCode = async () => {
      const hashParameters = new URLSearchParams(window.location.hash.slice(1));
      const code = hashParameters.get("code");
      window.history.replaceState({}, document.title, "/oauth/callback");

      if (!code) {
        setMessage("Google login could not be completed. Please try again.");
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/google/exchange",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Google login failed");
        }

        localStorage.setItem("petOwnerToken", data.token);
        localStorage.setItem(
          "petOwnerUser",
          JSON.stringify({
            _id: data._id,
            name: data.name,
            email: data.email,
            phoneNumber: data.phoneNumber,
            city: data.city,
            profilePicture: data.profilePicture,
            role: "pet_owner",
          })
        );

        const requestedReturnTo = sessionStorage.getItem("oauthReturnTo") || "/";
        sessionStorage.removeItem("oauthReturnTo");
        const safeReturnTo =
          requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
            ? requestedReturnTo
            : "/";
        window.location.replace(safeReturnTo);
      } catch (error) {
        setMessage(error.message || "Google login failed. Please try again.");
      }
    };

    exchangeCode();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FFF5E6] px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-amber-950">Google sign-in</h1>
        <p className="mt-4 text-gray-700">{message}</p>
        {message !== "Completing Google login..." && (
          <a
            href="/login"
            className="mt-6 inline-block rounded-lg bg-amber-700 px-5 py-3 text-white hover:bg-amber-800"
          >
            Return to login
          </a>
        )}
      </section>
    </main>
  );
};

export default OAuthCallback;
