import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle, XCircle, Clock } from "lucide-react";

const VerificationSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    status: 'verified' | 'unverified' | 'pending';
    data?: {
      title: string;
      creator: string;
      timestamp: string;
      confidence: number;
    };
  } | null>(null);

  const handleVerification = () => {
    setTimeout(() => {
      const mockResults = [
        {
          status: 'verified' as const,
          data: {
            title: "Digital Artwork #001",
            creator: "John Doe",
            timestamp: "January 15, 2024 at 2:30 PM",
            confidence: 98.7
          }
        },
        {
          status: 'unverified' as const
        }
      ];
      
      const result = mockResults[Math.floor(Math.random() * mockResults.length)];
      setVerificationResult(result);
    }, 1500);
  };

  const getStatusIcon = () => {
    if (!verificationResult) return null;
    
    switch (verificationResult.status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'unverified':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <section id="verify" className="py-24">
      <div className="max-width section-padding">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
            Verify authenticity instantly
          </h2>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Check if any digital content has been registered in our immutable ledger. Get instant verification results.
          </p>
        </div>

        {/* Verification Interface */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="flex gap-3 mb-6">
              <Input
                type="text"
                placeholder="Enter file hash, URL, or upload an image..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleVerification}
                disabled={!searchQuery.trim()}
              >
                <Search className="w-4 h-4 mr-2" />
                Verify
              </Button>
            </div>

            {/* Verification Result */}
            {verificationResult && (
              <div className={`border rounded-lg p-6 ${
                verificationResult.status === 'verified' ? 'border-success bg-success/5' :
                verificationResult.status === 'unverified' ? 'border-destructive bg-destructive/5' :
                'border-muted-foreground bg-muted/5'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  {getStatusIcon()}
                  <h3 className={`font-medium ${
                    verificationResult.status === 'verified' ? 'text-success' :
                    verificationResult.status === 'unverified' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`}>
                    {verificationResult.status === 'verified' && 'Content verified and authentic'}
                    {verificationResult.status === 'unverified' && 'Content could not be verified'}
                    {verificationResult.status === 'pending' && 'Verification in progress...'}
                  </h3>
                </div>

                {verificationResult.status === 'verified' && verificationResult.data && (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Work:</span>
                      <span className="font-medium">{verificationResult.data.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Creator:</span>
                      <span className="font-medium">{verificationResult.data.creator}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registered:</span>
                      <span className="font-medium">{verificationResult.data.timestamp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="font-medium text-success">
                        {verificationResult.data.confidence}%
                      </span>
                    </div>
                  </div>
                )}

                {verificationResult.status === 'unverified' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      This content was not found in our authenticity ledger.
                    </p>
                    <Button variant="outline" size="sm">
                      Register This Content
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerificationSection;