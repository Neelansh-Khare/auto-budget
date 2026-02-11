"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";

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
    } catch (err: any) {
      setError(err.message || "Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-xl mx-auto p-6 space-y-6 bg-white shadow-md rounded-lg mt-10">
        <h1 className="text-3xl font-bold text-center text-gray-800">Upload Statements</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Upload Type:
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="uploadType"
                  value="csv"
                  checked={uploadType === "csv"}
                  onChange={() => setUploadType("csv")}
                />
                <span className="ml-2 text-gray-900">CSV Upload</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="uploadType"
                  value="llm"
                  checked={uploadType === "llm"}
                  onChange={() => setUploadType("llm")}
                />
                <span className="ml-2 text-gray-900">Statement (LLM) Upload</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Choose File:
            </label>
            <input
              id="file-input"
              type="file"
              accept={uploadType === "csv" ? ".csv" : ".txt"}
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">Selected file: {selectedFile.name}</p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            className="w-full px-4 py-2 text-white font-semibold rounded-md
                       bg-blue-600 hover:bg-blue-700
                       disabled:bg-blue-300 disabled:cursor-not-allowed
                       transition duration-200"
          >
            {isLoading ? "Uploading..." : "Upload and Process"}
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}
