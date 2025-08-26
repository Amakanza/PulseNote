// app/api/ocr/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface OCRResponse {
  text: string;
  confidence?: number;
}

// Process image with Google Vision API
async function processImageWithGoogleVision(imageBuffer: Buffer): Promise<OCRResponse> {
  try {
    // Dynamic import to avoid build-time errors if dependency is missing
    const { ImageAnnotatorClient } = await import("@google-cloud/vision");
    
    let client;
    
    // Try to get credentials from environment variable
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (credentialsJson) {
      console.log("Using GOOGLE_APPLICATION_CREDENTIALS_JSON");
      const credentials = JSON.parse(credentialsJson);
      client = new ImageAnnotatorClient({
        credentials,
        projectId: credentials.project_id
      });
    } else {
      console.log("No credentials found, using default authentication");
      // Fallback to default authentication
      client = new ImageAnnotatorClient();
    }

    // Perform text detection
    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations;
    const text = detections && detections.length > 0 ? detections[0].description || "" : "";
    const confidence = detections && detections.length > 0 ? detections[0].score || 0.8 : 0;

    console.log(`OCR extracted ${text.length} characters with confidence ${Math.round(confidence * 100)}%`);

    return {
      text,
      confidence,
    };
  } catch (error) {
    console.error("Google Vision API error:", error);
    throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
    }

    console.log(`Processing image: ${image.name} (${image.type}, ${Math.round(image.size / 1024)}KB)`);

    // Convert file to buffer
    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Process with Google Vision API
    try {
      const result = await processImageWithGoogleVision(imageBuffer);
      return NextResponse.json(result);
    } catch (error) {
      console.error("OCR processing failed:", error);
      
      // Return fallback placeholder instead of failing completely
      return NextResponse.json({
        text: `[OCR processing failed - from ${image.name}]\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease ensure Google Cloud Vision API is properly configured with valid credentials.`,
        confidence: 0
      });
    }

  } catch (error) {
    console.error("OCR endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
