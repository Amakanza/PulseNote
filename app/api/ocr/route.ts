// app/api/ocr/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface OCRResponse {
  text: string;
  confidence?: number;
}

// Make this a regular function (not exported)
async function processImageWithGoogleVision(imageBuffer: Buffer): Promise<OCRResponse> {
  try {
    // Dynamic import to avoid build-time errors if dependency is missing
    const { ImageAnnotatorClient } = await import("@google-cloud/vision");
    
    const client = new ImageAnnotatorClient({
      // Credentials are picked from GOOGLE_APPLICATION_CREDENTIALS env variable
      // or can be provided via keyFilename / projectId
    });

    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations;
    const text = detections && detections.length > 0 ? detections[0].description : "";

    return {
      text: text || "",
      confidence: detections && detections.length > 0 ? detections[0].score || 0.8 : 0,
    };
  } catch (error) {
    console.error("Google Vision API error:", error);
    throw new Error("OCR processing failed with Google Vision");
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await image.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Check if Google Vision is available
    try {
      const result = await processImageWithGoogleVision(imageBuffer);
      return NextResponse.json(result);
    } catch (error) {
      // Fallback: Return placeholder text if OCR fails
      console.warn("OCR processing failed, returning placeholder:", error);
      return NextResponse.json({
        text: `[OCR unavailable - extracted from ${image.name}]\nPlease configure Google Cloud Vision API for text extraction. For now, manually enter the text from this image.`,
        confidence: 0
      });
    }

  } catch (error) {
    console.error("OCR endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}
