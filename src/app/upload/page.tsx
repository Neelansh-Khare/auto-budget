"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/Card";
import { Button } from "@/components/Button";
import { 
  Upload as UploadIcon, 
  FileText, 
  Table as TableIcon, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  Info
} from "lucide-react";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"csv" | "llm">("csv");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setMessage("");
      setError("");
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const endpoint = uploadType === "csv" ? "/api/upload/csv" : "/api/upload/llm";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.error || "An unknown error occurred during upload.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to the server.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-8 mt-4 md:mt-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Import Statements</h1>
          <p className="text-muted-foreground">Manually upload CSVs or text statements for processing.</p>
        </div>

        <Card className="border-primary/20 bg-primary/5 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <UploadIcon className="h-5 w-5" /> Select File
            </CardTitle>
            <CardDescription>Choose between structured CSVs or plain text bank statements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all flex flex-col items-center gap-2 ${
                  uploadType === "csv" 
                    ? "border-primary bg-primary/10 ring-1 ring-primary" 
                    : "bg-background hover:bg-muted"
                }`}
                onClick={() => setUploadType("csv")}
              >
                <TableIcon className={`h-6 w-6 ${uploadType === "csv" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-bold">CSV File</span>
              </div>
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all flex flex-col items-center gap-2 ${
                  uploadType === "llm" 
                    ? "border-primary bg-primary/10 ring-1 ring-primary" 
                    : "bg-background hover:bg-muted"
                }`}
                onClick={() => setUploadType("llm")}
              >
                <FileCode className={`h-6 w-6 ${uploadType === "llm" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-bold">Text Statement</span>
              </div>
            </div>

            {/* File Input */}
            <div className="space-y-4">
               <div className="relative group">
                <input
                  id="file-input"
                  type="file"
                  accept={uploadType === "csv" ? ".csv" : ".txt"}
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 flex flex-col items-center justify-center gap-3 group-hover:border-primary/50 transition-colors bg-background/50">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">
                      {selectedFile ? selectedFile.name : "Click to browse or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {uploadType === "csv" ? "Only .csv files supported" : "Only .txt or .pdf text supported"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {message && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 flex gap-3 text-sm font-medium">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p>{message}</p>
              </div>
            )}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex gap-3 text-sm font-medium">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>Error: {error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full h-12 text-lg" 
              onClick={handleUpload} 
              disabled={!selectedFile || isLoading}
              isLoading={isLoading}
              leftIcon={UploadIcon}
            >
              Upload and Process
            </Button>
          </CardFooter>
        </Card>

        {/* Tips Section */}
        <div className="bg-muted/30 rounded-xl p-6 border border-dashed">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-primary" /> Pro Tips
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
            <li>For CSVs, ensure columns for Date, Description, and Amount are present.</li>
            <li>Text statements are parsed using AI to extract transaction details.</li>
            <li>Large files might take a few seconds to process.</li>
            <li>Duplicates are automatically ignored based on date and description.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
