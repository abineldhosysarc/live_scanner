import { Injectable } from '@angular/core';
import { BarcodeScanner } from '@capacitor-mlkitv2/barcode-scanning';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BarcodeScannerService {
  private isProcessing = false;
  public textDetected$ = new BehaviorSubject<string>('');
  private frameListener: any = null;

  constructor() {}

  async startTextExtraction() {
    if (this.isProcessing) return;
    
    // Clean up any existing listeners first
    await this.removeListeners();
    
    this.isProcessing = true;
    document.querySelector('body')?.classList.add('barcode-scanner-active');

    // Add the frame capture listener
    this.frameListener = await BarcodeScanner.addListener(
      'frameCaptured',
      async (result) => {
        try {
          if (!this.isProcessing) return;

          const frameData = result?.image || '';
          if (!frameData) return;

          // Process the frame with a small delay to avoid overwhelming the device
          setTimeout(async () => {
            if (!this.isProcessing) return;
            
            const textResult = await this.extractText(frameData);
            console.log('Extracted Text:', textResult);

            if (textResult && textResult.length > 10) {
              this.textDetected$.next(textResult);
              await this.stopTextExtraction();
            }
          }, 100);
        } catch (error) {
          console.error('Error processing frame:', error);
        }
      }
    );

    try {
      // Make sure permissions are granted before starting
      const permissions = await BarcodeScanner.checkPermissions();
      if (permissions.camera !== 'granted') {
        await BarcodeScanner.requestPermissions();
      }
      
      await BarcodeScanner.startScan();
    } catch (error) {
      console.error('Error starting scan:', error);
      await this.stopTextExtraction();
    }
  }

  private async extractText(base64Image: string): Promise<string | null> {
    try {
      if (!base64Image) return null;

      // Clean the base64 string if needed
      const cleanBase64 = base64Image.includes('data:image')
        ? base64Image
        : `data:image/jpeg;base64,${base64Image}`;

      const result = await CapacitorPluginMlKitTextRecognition.detectText({
        base64Image: cleanBase64,
      });

      return result?.text || null;
    } catch (error) {
      console.error('Text extraction failed:', error);
      return null;
    }
  }

  private async removeListeners() {
    if (this.frameListener) {
      await this.frameListener.remove();
      this.frameListener = null;
    }
  }

  async stopTextExtraction() {
    this.isProcessing = false;
    document.querySelector('body')?.classList.remove('barcode-scanner-active');

    try {
      await this.removeListeners();
      await BarcodeScanner.stopScan();
    } catch (error) {
      console.error('Error stopping scanner:', error);
    }
  }
}