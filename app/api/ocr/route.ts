// app/api/ocr/route.ts - DEBUG VERSION
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface OCRResponse {
  text: string;
  confidence?: number;
}

// Process image with Google Vision API
async function processImageWithGoogleVision(imageBuffer: Buffer): Promise<OCRResponse> {
  try {
    // Debug: Check if environment variable exists
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    console.log("Credentials JSON exists:", !!credentialsJson);
    console.log("Credentials JSON length:", credentialsJson?.length || 0);
    
    if (!credentialsJson) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not found");
    }

    // Debug: Try to parse the JSON
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
      console.log("Credentials parsed successfully");
      console.log("Project ID:", credentials.project_id);
      console.log("Client email:", credentials.client_email);
    } catch (parseError) {
      console.error("Failed to parse credentials JSON:", parseError);
      throw new Error("Invalid credentials JSON format");
    }

    // Dynamic import to avoid build-time errors
    console.log("Attempting to import Google Vision client...");
    const { ImageAnnotatorClient } = await import("@google-cloud/vision");
    console.log("Google Vision client imported successfully");
    
    const client = new ImageAnnotatorClient({
      credentials,
      projectId: credentials.project_id
    });
    
    console.log("Client created, attempting text detection...");

    // Perform text detection
    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    console.log("Text detection completed");
    console.log("Number of text annotations:", result.textAnnotations?.length || 0);

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
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    console.log("OCR endpoint called");
    
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    console.log(`Processing image: ${image.name} (${image.type}, ${Math.round(image.size / 1024)}KB)`);

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    console.log("Image converted to buffer successfully");

    // Process with Google Vision API
    try {
      const result = await processImageWithGoogleVision(imageBuffer);
      console.log("OCR processing successful");
      return NextResponse.json(result);
    } catch (error) {
      console.error("OCR processing failed:", error);
      
      // Return detailed error for debugging
      return NextResponse.json({
        text: `[OCR processing failed - from ${image.name}]\n\nDetailed Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nStack: ${error instanceof Error ? error.stack : 'No stack trace'}\n\nPlease check the server logs for more details.`,
        confidence: 0,
        debug: {
          error: error instanceof Error ? error.message : 'Unknown error',
          hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
          credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length || 0
        }
      });
    }

  } catch (error) {
    console.error("OCR endpoint error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process request",
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
