import { Injectable } from '@angular/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BarcodeScannerService {
  private isProcessing = false;
  public textDetected$ = new BehaviorSubject<string>(''); // ✅ Store detected text
  
  constructor() {}
  
  // Start real-time text extraction using video frames
  async startTextExtraction() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    document.querySelector('body')?.classList.add('barcode-scanner-active');
    
    const listener = await BarcodeScanner.addListener(
      'barcodesScanned',
      async (result) => {
        try {
          if (!this.isProcessing) return;
          
          // ✅ Process each frame regardless of barcode detection
          // Get the frame as base64 (even if no barcode is detected)
          const frameData = result?.barcodes?.[0]?.rawValue || '';
          
          // Extract text from every frame
          const textResult = await this.extractText(frameData);
          console.log('Extracted Text:', textResult);
          
          if (textResult && textResult.length > 10) { // Only consider text of sufficient length
            this.textDetected$.next(textResult); // ✅ Emit detected text
            await this.stopTextExtraction(); // ✅ Stop scanning
            await listener.remove(); // ✅ Remove listener
          }
        } catch (error) {
          console.error('Error in processing frame:', error);
        }
      }
    );
    
    await BarcodeScanner.startScan(); // ✅ Start continuous scanning
  }
  
  // Extract text from video frame
  private async extractText(base64Image: string): Promise<string | null> {
    try {
      // Skip processing if image data is empty
      if (!base64Image) return null;
      
      const result = await CapacitorPluginMlKitTextRecognition.detectText({
        base64Image: base64Image,
      });
      return result.text || null;
    } catch (error) {
      console.error('Text extraction failed:', error);
      return null;
    }
  }
  
  // Stop scanning
  async stopTextExtraction() {
    this.isProcessing = false;
    document.querySelector('body')?.classList.remove('barcode-scanner-active'); // ✅ Fixed class name
    await BarcodeScanner.removeAllListeners();
    await BarcodeScanner.stopScan();
  }
}