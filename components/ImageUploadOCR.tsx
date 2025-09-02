"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, X, FileImage, Loader2, AlertCircle, Trash2, Eye, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface ImageUploadProps {
  onTextExtracted: (text: string) => void;
  disabled?: boolean;
}

interface ProcessedImage {
  id: string;
  file: File;
  preview: string; // Object URL for preview
  text?: string;
  error?: string;
  processing?: boolean;
}

interface OCRResult {
  text: string;
  confidence?: number;
  debug?: any;
}

// Image Modal Component
interface ImageModalProps {
  image: ProcessedImage;
  isOpen: boolean;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ image, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset scale and rotation when modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      {/* Modal Content */}
      <div className="relative max-w-7xl max-h-[95vh] w-full mx-4 bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate" title={image.file.name}>
              {image.file.name}
            </h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(image.file.size)} • {image.file.type}
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setScale(Math.max(0.25, scale - 0.25))}
              disabled={scale <= 0.25}
              className="btn p-2 disabled:opacity-50"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(Math.min(3, scale + 0.25))}
              disabled={scale >= 3}
              className="btn p-2 disabled:opacity-50"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRotation((rotation + 90) % 360)}
              className="btn p-2"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="btn p-2"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="relative overflow-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>
          <div className="flex items-center justify-center min-h-[400px] p-4">
            <img
              src={image.preview}
              alt={image.file.name}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ 
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
              draggable={false}
              onError={(e) => {
                console.error('Image failed to load:', image.file.name);
                // Try to recreate the blob URL if it failed
                if (image.preview.startsWith('blob:')) {
                  const newUrl = URL.createObjectURL(image.file);
                  (e.target as HTMLImageElement).src = newUrl;
                }
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', image.file.name);
              }}
            />
          </div>
          
          {/* Loading/Error State Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 opacity-0 pointer-events-none" id={`loading-${image.id}`}>
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading image...</p>
            </div>
          </div>
        </div>

        {/* Footer with extracted text */}
        {(image.text || image.error) && (
          <div className="border-t bg-gray-50">
            <div className="p-4">
              {image.text ? (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    Extracted Text ({image.text.length} characters)
                  </h4>
                  <div className="bg-white border rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {image.text}
                    </pre>
                  </div>
                </div>
              ) : image.error && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800 mb-1">OCR Failed</h4>
                    <p className="text-sm text-red-600">{image.error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label="Close modal"
      />
    </div>
  );
};

export default function ImageUploadOCR({ onTextExtracted, disabled = false }: ImageUploadProps) {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs to prevent memory leaks
  const cleanupImage = useCallback((image: ProcessedImage) => {
    if (image.preview.startsWith('blob:')) {
      URL.revokeObjectURL(image.preview);
    }
  }, []);

  // Process single image with OCR
  const processImageWithOCR = async (file: File): Promise<OCRResult> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `OCR failed (${response.status})`);
    }

    return result;
  };

  // Validate file before processing
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return `${file.name} is not a valid image file`;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return `${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB`;
    }

    // Check if file is too small (might be corrupted)
    if (file.size < 100) {
      return `${file.name} appears to be corrupted (too small)`;
    }

    return null; // File is valid
  };

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setGlobalError(null);
    const fileArray = Array.from(files);

    // Validate all files first
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setGlobalError(errors.join('\n'));
    }

    if (validFiles.length === 0) return;

    // Create image objects with previews
    const newImages: ProcessedImage[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      processing: true,
    }));

    setImages(prev => [...prev, ...newImages]);
    setIsProcessing(true);

    // Process images one by one to avoid overwhelming the server
    const extractedTexts: string[] = [];

    for (let i = 0; i < newImages.length; i++) {
      const image = newImages[i];
      
      try {
        console.log(`Processing ${image.file.name} (${(image.file.size / 1024 / 1024).toFixed(1)}MB)`);
        
        const result = await processImageWithOCR(image.file);
        const extractedText = result.text?.trim() || '';
        
        // Update specific image with result
        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { ...img, text: extractedText, processing: false, error: undefined }
            : img
        ));

        if (extractedText) {
          extractedTexts.push(extractedText);
        }

      } catch (error) {
        console.error(`OCR failed for ${image.file.name}:`, error);
        
        const errorMessage = error instanceof Error ? error.message : 'OCR processing failed';
        
        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { ...img, error: errorMessage, processing: false }
            : img
        ));
      }
    }

    setIsProcessing(false);

    // Combine all extracted text and send to parent
    if (extractedTexts.length > 0) {
      const combinedText = extractedTexts.join('\n\n---\n\n');
      onTextExtracted(combinedText);
    } else if (validFiles.length > 0) {
      setGlobalError('No text could be extracted from any of the uploaded images. Make sure the text is clear and well-lit.');
    }

  }, [onTextExtracted]);

  // File input handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = ''; // Reset input
  };

  // Remove specific image
  const removeImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        // Don't revoke URL immediately if modal is open
        if (!selectedImage || selectedImage.id !== id) {
          cleanupImage(imageToRemove);
        }
      }
      return prev.filter(img => img.id !== id);
    });
    
    // Close modal if the selected image was removed
    if (selectedImage?.id === id) {
      setSelectedImage(null);
    }
  };

  // Clear all images
  const clearAll = () => {
    images.forEach(image => {
      // Don't revoke URL of currently selected image
      if (!selectedImage || selectedImage.id !== image.id) {
        cleanupImage(image);
      }
    });
    setImages([]);
    setGlobalError(null);
    setSelectedImage(null);
  };

  // Re-extract text from successful images
  const reExtractText = () => {
    const successfulTexts = images
      .filter(img => img.text && !img.error && !img.processing)
      .map(img => img.text!);

    if (successfulTexts.length > 0) {
      const combinedText = successfulTexts.join('\n\n---\n\n');
      onTextExtracted(combinedText);
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      images.forEach(cleanupImage);
    };
  }, [images, cleanupImage]);

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Images
          <span className="text-xs opacity-75">(up to 10MB)</span>
        </button>

        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className="btn bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Take Photo
        </button>

        {images.length > 0 && (
          <>
            <button
              type="button"
              onClick={reExtractText}
              disabled={isProcessing || !images.some(img => img.text && !img.processing)}
              className="btn bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileImage className="w-4 h-4" />
              Re-extract All
            </button>

            <button
              type="button"
              onClick={clearAll}
              disabled={isProcessing}
              className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </>
        )}
      </div>

      {/* Hidden inputs */}
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

      {/* Global processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">Processing images...</p>
            <p className="text-xs text-blue-600">
              Large images may take longer to process
            </p>
          </div>
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Upload Error</p>
            <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap">{globalError}</pre>
            <button
              onClick={() => setGlobalError(null)}
              className="text-xs text-red-600 hover:text-red-800 underline mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Uploaded Images ({images.length})
            </h4>
            <div className="text-xs text-gray-500">
              Total size: {formatFileSize(images.reduce((acc, img) => acc + img.file.size, 0))}
            </div>
          </div>

          <div className="grid gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex gap-4">
                  {/* Image Preview */}
                  <div className="relative flex-shrink-0">
                    <div 
                      className="w-20 h-20 bg-gray-100 rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                      onClick={() => setSelectedImage(image)}
                      title="Click to view full size"
                    >
                      <img
                        src={image.preview}
                        alt={image.file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    {!image.processing && (
                      <button
                        onClick={() => removeImage(image.id)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-900 truncate" title={image.file.name}>
                        {image.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(image.file.size)} • {image.file.type}
                      </p>
                    </div>

                    {/* Status */}
                    {image.processing ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Processing OCR...</span>
                      </div>
                    ) : image.error ? (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-600">
                          <p className="font-medium">OCR Failed</p>
                          <p className="text-xs">{image.error}</p>
                        </div>
                      </div>
                    ) : image.text ? (
                      <div className="space-y-2">
                        <div className="text-sm text-green-600 font-medium">
                          ✓ Text extracted ({image.text.length} characters)
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-700 max-h-24 overflow-y-auto">
                          {image.text.substring(0, 200)}
                          {image.text.length > 200 && '...'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No text found in image
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          isOpen={!!selectedImage}
          onClose={() => {
            // Clean up the selected image's blob URL when modal closes
            if (selectedImage && !images.find(img => img.id === selectedImage.id)) {
              cleanupImage(selectedImage);
            }
            setSelectedImage(null);
          }}
        />
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p className="font-medium mb-1">Tips for better OCR results:</p>
        <ul className="space-y-1">
          <li>• Supported: JPG, PNG, GIF, WebP (up to 10MB each)</li>
          <li>• Ensure text is clear, well-lit, and high contrast</li>
          <li>• Avoid blurry, rotated, or low-resolution images</li>
          <li>• Multiple images will be processed separately then combined</li>
          <li>• <strong>Click on image thumbnails to view full size</strong></li>
          <li>• All images are processed temporarily and not stored permanently</li>
        </ul>
      </div>
    </div>
  );
}
