import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { aHash, hammingDistance, sha256 } from "@/lib/hash";
import { FileUpload, ImagePreview } from "@/components/ui/file-upload";
import { Search, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import Header from "@/components/Header";

interface LedgerEntry {
  id: string;
  creatorName: string;
  fileName: string;
  timestamp: string;
  sha256Hash: string;
  aHash: string;
}

interface VerificationResult {
  status: "verified" | "potentially_altered" | "not_registered";
  message: string;
  matchedEntry?: LedgerEntry;
  distance?: number;
}

function loadLedger(): LedgerEntry[] {
  const ledgerData = localStorage.getItem("hatchmark-ledger");
  return ledgerData ? JSON.parse(ledgerData) : [];
}

export default function Verify() {
  const [file, setFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const verifyFile = async () => {
    if (!file) return;

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const [sha256Result, aHashResult] = await Promise.all([
        sha256(file),
        aHash(file)
      ]);

      const entries = loadLedger();

      // Check for exact SHA-256 match first
      const exactMatch = entries.find(entry => entry.sha256Hash === sha256Result);
      
      if (exactMatch) {
        setVerificationResult({
          status: "verified",
          message: "This work is an exact match for a registered original.",
          matchedEntry: exactMatch
        });
        return;
      }

      // Check for perceptual hash similarity
      let closestMatch: { entry: LedgerEntry; distance: number } | null = null;
      
      for (const entry of entries) {
        const distance = hammingDistance(entry.aHash, aHashResult);
        if (!closestMatch || distance < closestMatch.distance) {
          closestMatch = { entry, distance };
        }
      }

      if (closestMatch && closestMatch.distance <= 5) {
        setVerificationResult({
          status: "potentially_altered",
          message: "This work is visually similar to a registered original but appears to have been modified.",
          matchedEntry: closestMatch.entry,
          distance: closestMatch.distance
        });
      } else {
        setVerificationResult({
          status: "not_registered",
          message: "This work does not match any registered entries in our authenticity ledger."
        });
      }

    } catch (error) {
      console.error("Verification error:", error);
      setVerificationResult({
        status: "not_registered",
        message: "An error occurred during verification. Please try again."
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(600px_400px_at_50%_-100px,hsl(var(--accent)/0.1),transparent)]" />
      </div>
      
      <Header />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Verify Digital Authenticity</h1>
          <p className="text-muted-foreground">
            Check if a digital work is registered and verify its origin
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Form */}
          <div className="space-y-6">
            <Card className="shadow-glass animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-accent" />
                  Upload for Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-3">Select File to Verify</label>
                  {!file ? (
                    <FileUpload onFileSelect={setFile} />
                  ) : (
                    <ImagePreview 
                      file={file} 
                      onRemove={() => setFile(null)}
                      className="animate-scale-in"
                    />
                  )}
                </div>

                <Button
                  onClick={verifyFile}
                  disabled={!file || isVerifying}
                  className="w-full h-12 text-base font-medium transition-all duration-300 hover:shadow-glow"
                  variant={isVerifying ? "secondary" : "default"}
                >
                  {isVerifying ? "🔍 Analyzing..." : "🔍 Verify Authenticity"}
                </Button>
              </CardContent>
            </Card>

            {/* Verification Result */}
            {verificationResult && (
              <Card className={`shadow-intense animate-slide-up ${
                verificationResult.status === "verified" 
                  ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 dark:border-green-800"
                  : verificationResult.status === "potentially_altered"
                  ? "border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 dark:border-yellow-800"
                  : "border-red-200 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 dark:border-red-800"
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`p-2 rounded-full ${
                      verificationResult.status === "verified" 
                        ? "bg-green-500 text-white"
                        : verificationResult.status === "potentially_altered"
                        ? "bg-yellow-500 text-white"
                        : "bg-red-500 text-white"
                    }`}>
                      {verificationResult.status === "verified" && <CheckCircle className="h-5 w-5" />}
                      {verificationResult.status === "potentially_altered" && <AlertTriangle className="h-5 w-5" />}
                      {verificationResult.status === "not_registered" && <XCircle className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${
                        verificationResult.status === "verified" 
                          ? "text-green-800 dark:text-green-200"
                          : verificationResult.status === "potentially_altered"
                          ? "text-yellow-800 dark:text-yellow-200"
                          : "text-red-800 dark:text-red-200"
                      }`}>
                        {verificationResult.status === "verified" && "✅ Verified Authentic"}
                        {verificationResult.status === "potentially_altered" && "⚠️ Potentially Altered"}
                        {verificationResult.status === "not_registered" && "❌ Not Registered"}
                      </h3>
                      <p className={`text-sm ${
                        verificationResult.status === "verified" 
                          ? "text-green-600 dark:text-green-400"
                          : verificationResult.status === "potentially_altered"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {verificationResult.message}
                      </p>
                    </div>
                  </div>
                  
                  {verificationResult.matchedEntry && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant={verificationResult.status === "verified" ? "default" : "secondary"}>
                          {verificationResult.status === "verified" ? "Perfect Match" : "Partial Match"}
                        </Badge>
                        {verificationResult.distance !== undefined && (
                          <Badge variant="outline">
                            {64 - verificationResult.distance}/64 similarity
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Creator:</span>
                          <p className="font-medium">{verificationResult.matchedEntry.creatorName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Original File:</span>
                          <p className="font-medium truncate">{verificationResult.matchedEntry.fileName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Registered:</span>
                          <p className="font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(verificationResult.matchedEntry.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ID:</span>
                          <p className="font-mono text-xs">{verificationResult.matchedEntry.id}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            <Card className="shadow-glass animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <CardTitle className="text-lg">Verification Process</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-accent">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Hash Analysis</p>
                    <p className="text-muted-foreground">We compute cryptographic fingerprints of your uploaded file.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-accent">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Ledger Search</p>
                    <p className="text-muted-foreground">We search our immutable ledger for matching authenticity records.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-accent">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Results</p>
                    <p className="text-muted-foreground">Get definitive proof of authenticity, including creator details and registration date.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-glass animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <CardTitle className="text-lg">Understanding Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">Verified Authentic</p>
                    <p className="text-muted-foreground">Perfect match found in our ledger. This is the original registered work.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-700 dark:text-yellow-300">Potentially Altered</p>
                    <p className="text-muted-foreground">Similar work found, but the file has been modified or compressed.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-300">Not Registered</p>
                    <p className="text-muted-foreground">No matching record found. This work is not in our authenticity ledger.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}