"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, FileImage, Loader2, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  onTextExtracted: (text: string) => void;
  disabled?: boolean;
}

interface OCRResult {
  text: string;
  confidence?: number;
}

export default function ImageUploadOCR({ onTextExtracted, disabled = false }: ImageUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ file: File; text?: string; error?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Process image with OCR API
  const processImageWithOCR = async (file: File): Promise<OCRResult> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'OCR processing failed');
    }

    const result: OCRResult = await response.json();
    return result;
  };

  // Handle file selection (both upload and camera)
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const fileArray = Array.from(files);
      
      // Add files to state immediately for UI feedback
      const newImages = fileArray.map(file => ({
        file,
        text: undefined,
        error: undefined
      }));
      setUploadedImages(prev => [...prev, ...newImages]);

      let extractedTexts: string[] = [];

      // Process each image
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          const errorMsg = `${file.name} is not a valid image file`;
          setUploadedImages(prev => prev.map((img, idx) => 
            idx === prev.length - fileArray.length + i 
              ? { ...img, error: errorMsg }
              : img
          ));
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          const errorMsg = `${file.name} is too large. Maximum size is 10MB`;
          setUploadedImages(prev => prev.map((img, idx) => 
            idx === prev.length - fileArray.length + i 
              ? { ...img, error: errorMsg }
              : img
          ));
          continue;
        }

        try {
          const result = await processImageWithOCR(file);
          const extractedText = result.text.trim();
          
          // Update the specific image with extracted text
          setUploadedImages(prev => prev.map((img, idx) => 
            idx === prev.length - fileArray.length + i 
              ? { ...img, text: extractedText }
              : img
          ));

          if (extractedText) {
            extractedTexts.push(extractedText);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'OCR processing failed';
          setUploadedImages(prev => prev.map((img, idx) => 
            idx === prev.length - fileArray.length + i 
              ? { ...img, error: errorMsg }
              : img
          ));
        }
      }

      if (extractedTexts.length > 0) {
        const combinedText = extractedTexts.join('\n\n---\n\n');
        onTextExtracted(combinedText);
      } else {
        setError('No text could be extracted from the uploaded images');
      }

    } catch (err) {
      console.error('OCR Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process images');
    } finally {
      setIsProcessing(false);
    }
  }, [onTextExtracted]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Clear input to allow re-uploading same file
    e.target.value = '';
  };

  // Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Clear input to allow re-capturing
    e.target.value = '';
  };

  // Trigger file upload
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Trigger camera capture
  const triggerCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    if (uploadedImages.length === 1) {
      setError(null);
    }
  };

  // Clear all images
  const clearAll = () => {
    setUploadedImages([]);
    setError(null);
  };

  // Re-extract text from successfully processed images
  const reExtractText = () => {
    const extractedTexts = uploadedImages
      .filter(img => img.text && !img.error)
      .map(img => img.text!);
    
    if (extractedTexts.length > 0) {
      const combinedText = extractedTexts.join('\n\n---\n\n');
      onTextExtracted(combinedText);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={triggerFileUpload}
          disabled={disabled || isProcessing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Upload Images
        </button>

        <button
          type="button"
          onClick={triggerCameraCapture}
          disabled={disabled || isProcessing}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          Take Photo
        </button>

        {uploadedImages.length > 0 && (
          <>
            <button
              type="button"
              onClick={reExtractText}
              disabled={isProcessing || !uploadedImages.some(img => img.text)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileImage className="w-4 h-4" />
              Re-extract
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          </>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-blue-800">
            Processing images and extracting text...
          </span>
        </div>
      )}

      {/* Global error display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Uploaded images preview */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Uploaded Images ({uploadedImages.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {uploadedImages.map((imageData, index) => (
              <div key={index} className="relative group border border-gray-200 rounded-lg p-3 bg-white">
                <div className="flex gap-3">
                  {/* Image preview */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded border overflow-hidden">
                      <img
                        src={URL.createObjectURL(imageData.file)}
                        alt={imageData.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removeImage(index)}
                      disabled={isProcessing}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate" title={imageData.file.name}>
                        {imageData.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(imageData.file.size / 1024 / 1024).toFixed(1)}MB
                      </p>
                    </div>

                    {/* Status */}
                    {imageData.error ? (
                      <div className="flex items-start gap-1">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-600">{imageData.error}</p>
                      </div>
                    ) : imageData.text ? (
                      <div className="text-xs text-green-600 font-medium">
                        ✓ Text extracted ({imageData.text.length} chars)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                      </div>
                    )}

                    {/* Extracted text preview */}
                    {imageData.text && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 max-h-16 overflow-y-auto">
                        {imageData.text.substring(0, 100)}
                        {imageData.text.length > 100 && '...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Supported formats: JPG, PNG, GIF, WebP</p>
        <p>• Maximum file size: 10MB per image</p>
        <p>• For best results, ensure text is clear and well-lit</p>
        <p>• Multiple images will be processed separately and combined</p>
      </div>
    </div>
  );
}
