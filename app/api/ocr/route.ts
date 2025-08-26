// app/api/ocr/route.ts - FIXED VERSION
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface OCRResponse {
  text: string;
  confidence?: number;
}

// Process image with Google Vision API
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

    // Perform text detection with timeout
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
  try {
    // Check content length before processing
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

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { 
          text: "[Invalid file type]",
          error: "File must be an image (JPG, PNG, GIF, WebP)",
          confidence: 0
        }, 
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { 
          text: "[File too large]",
          error: `File size (${Math.round(image.size / 1024 / 1024)}MB) exceeds 10MB limit`,
          confidence: 0
        }, 
        { status: 413 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Process with Google Vision API
    try {
      const result = await processImageWithGoogleVision(imageBuffer);
      
      // Always return valid JSON
      return NextResponse.json({
        text: result.text || "[No text detected in image]",
        confidence: result.confidence || 0
      });

    } catch (visionError) {
      console.error("Vision API processing failed:", visionError);
      
      // Return user-friendly error message as valid JSON
      const errorMessage = visionError instanceof Error ? visionError.message : 'Unknown error';
      
      return NextResponse.json({
        text: `[OCR processing failed for ${image.name}]`,
        error: `Vision API error: ${errorMessage}`,
        confidence: 0
      }, { status: 500 });
    }

  } catch (requestError) {
    console.error("OCR request error:", requestError);
    
    // Handle different types of request errors
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
    
    // Generic error fallback - always return valid JSON
    return NextResponse.json({
      text: "[Request processing failed]",
      error: "Failed to process OCR request",
      confidence: 0
    }, { status: 500 });
  }
}
