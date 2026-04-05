'use client';

export default function LoginPage() {
  const handleConnect = async () => {
    const res = await fetch('/api/auth/strava');
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 relative z-[1] p-8 text-center">
      <div className="font-display text-[clamp(4rem,12vw,8rem)] leading-[0.9] tracking-tight bg-gradient-to-br from-accent to-accent2 bg-clip-text text-transparent animate-fade-up">
        42K
      </div>
      <div className="text-[clamp(0.7rem,2vw,0.85rem)] tracking-[0.4em] uppercase text-muted animate-fade-up [animation-delay:100ms]">
        Marathon Training Dashboard
      </div>
      <div className="bg-surface border border-border rounded-2xl p-10 max-w-[400px] w-full animate-fade-up [animation-delay:200ms]">
        <h2 className="font-display text-3xl tracking-wide mb-2">Inizia il tracciamento</h2>
        <p className="text-muted text-sm leading-relaxed mb-8">
          Connetti il tuo account Strava per visualizzare progressi, chilometraggi, zone HR e molto altro sulla tua preparazione alla maratona.
        </p>
        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-3 bg-accent text-white border-none rounded-xl px-7 py-3.5 font-semibold text-base cursor-pointer transition-all w-full justify-center hover:bg-[#e04400] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,77,0,0.35)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Connetti con Strava
        </button>
      </div>
    </div>
  );
}
