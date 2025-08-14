import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileImage, Calendar, Shield, Search, Download } from "lucide-react";
import Header from "@/components/Header";
import { format } from "date-fns";

interface LedgerEntry {
  id: string;
  creatorName: string;
  fileName: string;
  timestamp: string;
  sha256Hash: string;
  aHash: string;
}

export default function Dashboard() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [stats, setStats] = useState({
    totalRegistered: 0,
    thisMonth: 0,
    verified: 0
  });

  useEffect(() => {
    const loadData = () => {
      const ledgerData = localStorage.getItem("hatchmark-ledger");
      if (ledgerData) {
        const parsedEntries = JSON.parse(ledgerData);
        setEntries(parsedEntries);
        
        const now = new Date();
        const thisMonth = parsedEntries.filter((entry: LedgerEntry) => {
          const entryDate = new Date(entry.timestamp);
          return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
        });
        
        setStats({
          totalRegistered: parsedEntries.length,
          thisMonth: thisMonth.length,
          verified: parsedEntries.length // For demo purposes
        });
      }
    };
    
    loadData();
  }, []);

  const downloadProof = (entry: LedgerEntry) => {
    const proof = {
      id: entry.id,
      creator: entry.creatorName,
      filename: entry.fileName,
      registrationTimestamp: entry.timestamp,
      sha256: entry.sha256Hash,
      aHash: entry.aHash,
      service: "Hatchmark Digital Authenticity",
      version: "1.0"
    };

    const blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hatchmark-proof-${entry.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage your registered works and view authenticity records
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-glass animate-scale-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalRegistered}</div>
              <p className="text-xs text-muted-foreground">Digital works protected</p>
            </CardContent>
          </Card>

          <Card className="shadow-glass animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.thisMonth}</div>
              <p className="text-xs text-muted-foreground">New registrations</p>
            </CardContent>
          </Card>

          <Card className="shadow-glass animate-scale-in" style={{ animationDelay: "0.3s" }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verifications</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
              <p className="text-xs text-muted-foreground">Successful checks</p>
            </CardContent>
          </Card>
        </div>

        {/* Registered Works */}
        <Card className="shadow-elegant animate-slide-up">
          <CardHeader>
            <CardTitle>Your Registered Works</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No works registered yet</p>
                <Button variant="outline" className="mt-4" asChild>
                  <a href="/register">Register Your First Work</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileImage className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{entry.fileName}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Creator: {entry.creatorName}</span>
                          <span>•</span>
                          <span>{format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Protected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadProof(entry)}
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Proof
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}