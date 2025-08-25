// app/api/ocr/googleVisionOCR.ts
import { ImageAnnotatorClient } from "@google-cloud/vision";

export interface OCRResponse {
  text: string;
  confidence?: number;
}

/**
 * Process an image using Google Cloud Vision OCR
 * @param imageBuffer Buffer containing the image data
 * @returns OCRResponse with extracted text and confidence
 */
export async function processImageWithGoogleVision(
  imageBuffer: Buffer
): Promise<OCRResponse> {
  try {
    const client = new ImageAnnotatorClient({
      // Credentials are picked from GOOGLE_APPLICATION_CREDENTIALS env variable
      // or can be provided via keyFilename / projectId
    });

    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations;
    const text =
      detections && detections.length > 0 ? detections[0].description : "";

    return {
      text: text || "",
      confidence:
        detections && detections.length > 0 ? detections[0].score || 0.8 : 0,
    };
  } catch (error) {
    console.error("Google Vision API error:", error);
    throw new Error("OCR processing failed with Google Vision");
  }
}
