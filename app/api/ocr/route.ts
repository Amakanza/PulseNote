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
    // Get credentials from environment variable
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    
    if (!credentialsJson) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable not found");
    }

    // Parse the credentials JSON
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (parseError) {
      throw new Error(`Failed to parse credentials JSON: ${parseError}`);
    }

    // Validate required fields
    if (!credentials.type || !credentials.project_id || !credentials.private_key || !credentials.client_email) {
      throw new Error("Missing required fields in credentials JSON");
    }

    console.log(`Using project: ${credentials.project_id}`);
    console.log(`Using client email: ${credentials.client_email}`);

    // Dynamic import
    const { ImageAnnotatorClient } = await import("@google-cloud/vision");
    
    // Create client with explicit credentials
    const client = new ImageAnnotatorClient({
      credentials: {
        type: credentials.type,
        project_id: credentials.project_id,
        private_key_id: credentials.private_key_id,
        private_key: credentials.private_key,
        client_email: credentials.client_email,
        client_id: credentials.client_id,
        auth_uri: credentials.auth_uri,
        token_uri: credentials.token_uri,
        auth_provider_x509_cert_url: credentials.auth_provider_x509_cert_url,
        client_x509_cert_url: credentials.client_x509_cert_url,
        universe_domain: credentials.universe_domain || "googleapis.com"
      },
      projectId: credentials.project_id
    });

    console.log("Vision client created successfully");

    // Perform text detection
    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations;
    const text = detections && detections.length > 0 ? detections[0].description || "" : "";
    const confidence = detections && detections.length > 0 ? detections[0].score || 0.8 : 0;

    console.log(`OCR successful: extracted ${text.length} characters`);

    return {
      text,
      confidence,
    };
  } catch (error) {
    console.error("Google Vision API error:", error);
    throw error;
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

    try {
      const result = await processImageWithGoogleVision(imageBuffer);
      return NextResponse.json(result);
    } catch (error) {
      console.error("OCR processing failed:", error);
      
      return NextResponse.json({
        text: `[OCR processing failed - from ${image.name}]\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check server logs for details.`,
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
