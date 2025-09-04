// app/api/ocr/route.ts - Enhanced with security
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rateLimit";
import crypto from 'crypto';

export const runtime = "nodejs";

interface OCRResponse {
  text: string;
  confidence?: number;
}

// Allowed file types and sizes
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.scr', '.js', '.html'];

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not allowed. Use JPG, PNG, WebP, or GIF.' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.` };
  }

  // Check file extension
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext && DANGEROUS_EXTENSIONS.some(dangerous => dangerous === `.${ext}`)) {
    return { valid: false, error: 'File extension not allowed for security reasons.' };
  }

  return { valid: true };
}

async function processImageWithGoogleVision(imageBuffer: Buffer): Promise<OCRResponse> {
  try {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (!credentialsJson) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not found");
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (parseError) {
      throw new Error("Invalid credentials JSON format");
    }

    const { ImageAnnotatorClient } = await import("@google-cloud/vision");
    
    const client = new ImageAnnotatorClient({
      credentials,
      projectId: credentials.project_id
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR processing timed out after 30 seconds')), 30000)
    );

    const ocrPromise = client.textDetection({
      image: { content: imageBuffer },
    });

    const [result] = await Promise.race([ocrPromise, timeoutPromise]) as any;

    const detections = result.textAnnotations;
    const text = detections && detections.length > 0 ? detections[0].description || "" : "";
    const confidence = detections && detections.length > 0 ? detections[0].score || 0.8 : 0;

    return { text, confidence };
  } catch (error) {
    console.error("Google Vision API error:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  return withRateLimit(req, 'ocr', async () => {
    try {
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 15 * 1024 * 1024) {
        return NextResponse.json(
          { 
            text: "[File too large for processing]",
            error: "File exceeds maximum size limit",
            confidence: 0
          }, 
          { status: 413 }
        );
      }

      const formData = await req.formData();
      const image = formData.get('image') as File;

      if (!image) {
        return NextResponse.json(
          { 
            text: "[No image provided]",
            error: "No image file found in request",
            confidence: 0
          }, 
          { status: 400 }
        );
      }

      // Validate file
      const validation = validateFile(image);
      if (!validation.valid) {
        return NextResponse.json(
          { 
            text: "[File validation failed]",
            error: validation.error,
            confidence: 0
          }, 
          { status: 400 }
        );
      }

      // Convert file to buffer
      const arrayBuffer = await image.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Additional security: Check for malicious content in buffer
      const fileHeader = imageBuffer.subarray(0, 16).toString('hex');
      const isPotentiallyMalicious = fileHeader.includes('4d5a') || // MZ header (executable)
                                   fileHeader.includes('504b') || // PK header (zip/office docs)
                                   fileHeader.includes('7f454c46'); // ELF header (Linux executable)
      
      if (isPotentiallyMalicious) {
        return NextResponse.json(
          { 
            text: "[File blocked for security]",
            error: "File appears to contain executable code",
            confidence: 0
          }, 
          { status: 400 }
        );
      }

      // Process with Google Vision API
      try {
        const result = await processImageWithGoogleVision(imageBuffer);
        
        // Log successful OCR (without PII)
        console.log(`OCR processed: ${image.name} (${(image.size / 1024).toFixed(1)}KB) -> ${result.text.length} chars`);
        
        return NextResponse.json({
          text: result.text || "[No text detected in image]",
          confidence: result.confidence || 0
        });

      } catch (visionError) {
        console.error("Vision API processing failed:", visionError);
        
        const errorMessage = visionError instanceof Error ? visionError.message : 'Unknown error';
        
        return NextResponse.json({
          text: `[OCR processing failed for ${image.name}]`,
          error: `Vision API error: ${errorMessage}`,
          confidence: 0
        }, { status: 500 });
      }

    } catch (requestError) {
      console.error("OCR request error:", requestError);
      
      if (requestError instanceof Error) {
        if (requestError.message.includes('PayloadTooLargeError') || 
            requestError.message.includes('Request Entity Too Large')) {
          return NextResponse.json({
            text: "[Request too large]",
            error: "Request size exceeds server limits. Try a smaller image.",
            confidence: 0
          }, { status: 413 });
        }
      }
      
      return NextResponse.json({
        text: "[Request processing failed]",
        error: "Failed to process OCR request",
        confidence: 0
      }, { status: 500 });
    }
  });
}
