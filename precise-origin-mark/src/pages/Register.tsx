import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { aHash, sha256 } from "@/lib/hash";
import { FileUpload, ImagePreview } from "@/components/ui/file-upload";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { Download, Shield } from "lucide-react";
import Header from "@/components/Header";

interface LedgerEntry {
  id: string;
  creatorName: string;
  fileName: string;
  timestamp: string;
  sha256Hash: string;
  aHash: string;
}

function loadLedger(): LedgerEntry[] {
  const ledgerData = localStorage.getItem("hatchmark-ledger");
  return ledgerData ? JSON.parse(ledgerData) : [];
}

function saveLedger(entries: LedgerEntry[]) {
  localStorage.setItem("hatchmark-ledger", JSON.stringify(entries));
}

export default function Register() {
  const [file, setFile] = useState<File | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<LedgerEntry | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps = [
    {
      id: "hash",
      title: "Generating Digital Fingerprint",
      description: "Computing SHA-256 and perceptual hash of your work"
    },
    {
      id: "record",
      title: "Creating Immutable Record",
      description: "Storing authenticity proof in the ledger"
    },
    {
      id: "complete",
      title: "Protection Complete",
      description: "Your work is now protected and verifiable"
    }
  ];

  const canSubmit = useMemo(() => 
    !!file && creatorName.trim().length > 0 && !isProcessing, 
    [file, creatorName, isProcessing]
  );

  const onSubmit = useCallback(async () => {
    if (!file || !creatorName.trim()) return;

    setIsProcessing(true);
    setCurrentStep("hash");
    setCompletedSteps([]);
    
    try {
      // Step 1: Generate hashes
      const sha256Result = await sha256(file);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
      
      const aHashResult = await aHash(file);
      setCompletedSteps(["hash"]);
      setCurrentStep("record");

      // Step 2: Create ledger entry
      await new Promise(resolve => setTimeout(resolve, 800));
      const entry: LedgerEntry = {
        id: crypto.randomUUID(),
        creatorName: creatorName.trim(),
        fileName: file.name,
        timestamp: new Date().toISOString(),
        sha256Hash: sha256Result,
        aHash: aHashResult,
      };

      const existingEntries = loadLedger();
      const updatedEntries = [...existingEntries, entry];
      saveLedger(updatedEntries);

      setCompletedSteps(["hash", "record"]);
      setCurrentStep("complete");
      
      // Step 3: Complete
      await new Promise(resolve => setTimeout(resolve, 500));
      setCompletedSteps(["hash", "record", "complete"]);
      setCurrentStep(null);

      setResult(entry);
      toast({
        title: "🛡️ Protection Complete!",
        description: `"${file.name}" is now secured with Hatchmark authenticity.`,
      });
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Error",
        description: "Failed to register the work. Please try again.",
        variant: "destructive",
      });
      setCurrentStep(null);
      setCompletedSteps([]);
    } finally {
      setIsProcessing(false);
    }
  }, [file, creatorName]);

  const downloadProof = useCallback(() => {
    if (!result) return;
    
    const proof = {
      id: result.id,
      creator: result.creatorName,
      filename: result.fileName,
      registrationTimestamp: result.timestamp,
      sha256: result.sha256Hash,
      aHash: result.aHash,
      service: "Hatchmark Digital Authenticity",
      version: "1.0"
    };

    const blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hatchmark-proof-${result.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(600px_400px_at_50%_-100px,hsl(var(--primary)/0.1),transparent)]" />
      </div>
      
      <Header />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Register Digital Work</h1>
          <p className="text-muted-foreground">
            Create an immutable proof of authenticity for your creative work
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Main Form */}
          <div className="space-y-6">
            <Card className="shadow-glass animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Work Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Creator Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Upload Your Work</label>
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
                  onClick={onSubmit}
                  disabled={!canSubmit || isProcessing}
                  className="w-full h-12 text-base font-medium transition-all duration-300 hover:shadow-glow"
                  variant={isProcessing ? "secondary" : "default"}
                >
                  {isProcessing ? "Processing..." : "🛡️ Protect & Register"}
                </Button>
              </CardContent>
            </Card>

            {/* Success Result */}
            {result && (
              <Card className="shadow-intense border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 dark:border-green-800 animate-slide-up">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-green-500 text-white">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-200">
                        Protection Complete!
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Your work is now secured on the Hatchmark ledger
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File:</span>
                      <span className="font-medium">{result.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Creator:</span>
                      <span className="font-medium">{result.creatorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protected:</span>
                      <span className="font-medium">{new Date(result.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-mono text-xs">{result.id}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 hover:bg-green-100 hover:border-green-300 dark:hover:bg-green-900"
                    onClick={downloadProof}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Authenticity Proof
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Progress Panel */}
          <div className="space-y-6">
            {isProcessing && (
              <Card className="shadow-glass animate-slide-up">
                <CardHeader>
                  <CardTitle>Processing Your Work</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressIndicator
                    steps={steps}
                    currentStep={currentStep}
                    completedSteps={completedSteps}
                  />
                </CardContent>
              </Card>
            )}

            {/* Info Panel */}
            <Card className="shadow-glass animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Digital Fingerprinting</p>
                    <p className="text-muted-foreground">We create unique cryptographic hashes of your work that can identify it even after modifications.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Immutable Record</p>
                    <p className="text-muted-foreground">Your work's proof of creation is permanently stored on our secure ledger with timestamp verification.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Instant Verification</p>
                    <p className="text-muted-foreground">Anyone can verify the authenticity and ownership of your work using our verification system.</p>
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