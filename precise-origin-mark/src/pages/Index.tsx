import { Button } from "@/components/ui/button";
import HatchmarkJSONLD from "@/components/HatchmarkJSONLD";
import Header from "@/components/Header";

const Index = () => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <HatchmarkJSONLD />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_50%_-100px,hsl(var(--primary)/0.18),transparent)]" />
      </div>
      <Header />

      <section className="container mx-auto grid gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Make a precise, verifiable mark of origin for your digital work
          </h1>
          <p className="text-lg text-muted-foreground">
            Hatchmark fingerprints your files and lets anyone verify authenticity in seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="hero" asChild className="animate-scale-in">
              <a href="/register">🛡️ Register New Work</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <a href="/verify">🔍 Open Verifier</a>
            </Button>
            <Button size="lg" variant="secondary" asChild className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <a href="/dashboard">📊 View Dashboard</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Demo mode: data is stored locally in your browser.
          </p>
        </div>
        <div className="relative">
          <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elevated)]">
            <div className="mb-2 text-sm font-medium">How it works</div>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>1. Upload your image and we compute two fingerprints (SHA-256 and aHash).</li>
              <li>2. A ledger entry is created and stored (local demo).</li>
              <li>3. Anyone can upload a file to check for exact or perceptual matches.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Index;
