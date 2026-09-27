const GoogleLoginButton = ({ returnTo = "/", dark = false }) => {
  const startGoogleLogin = () => {
    const safeReturnTo =
      returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
    sessionStorage.setItem("oauthReturnTo", safeReturnTo);
    window.location.assign("http://localhost:5000/api/auth/google/start");
  };

  return (
    <button
      type="button"
      onClick={startGoogleLogin}
      className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border font-medium transition-colors ${
        dark
          ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
          : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600"
      >
        G
      </span>
      Continue with Google
    </button>
  );
};

export default GoogleLoginButton;
