import { Injectable } from '@angular/core';
import {
  BarcodeScanner,
  BarcodeFormat,
  BarcodesScannedEvent,
} from '@capacitor-mlkit/barcode-scanning';

@Injectable({
  providedIn: 'root',
})
export class BarcodeScannerService {
  private isScanning = false; // ✅ Prevent multiple scans

  constructor() {}

  // Start real-time scanning
  async startScan() {
    if (this.isScanning) return; // ✅ Prevent multiple scans
    this.isScanning = true;
    
    document.querySelector('body')?.classList.add('barcode-scanner-active');

    const listener = await BarcodeScanner.addListener(
      'barcodesScanned',
      async (result: BarcodesScannedEvent) => {
        if (result.barcodes.length > 0) {
          console.log('Scanned Barcode:', result.barcodes[0].rawValue);

          // ✅ Stop scanning and remove listener immediately
          await this.stopScan();
          await listener.remove();
        }
      }
    );

    await BarcodeScanner.startScan();
  }

  // Stop scanning and close the camera
  async stopScan() {
    this.isScanning = false;
    document.querySelector('body')?.classList.remove('barcode-scanner-active');
    await BarcodeScanner.removeAllListeners();
    await BarcodeScanner.stopScan();
  }

  // Scan a single barcode and return its value, then close the camera
  async scanSingleBarcode(): Promise<string | null> {
    if (this.isScanning) return null;
    this.isScanning = true;

    return new Promise(async (resolve) => {
      document.querySelector('body')?.classList.add('barcode-scanner-active');

      const listener = await BarcodeScanner.addListener(
        'barcodesScanned',
        async (result: BarcodesScannedEvent) => {
          if (result.barcodes.length > 0) {
            console.log('Scanned Barcode:', result.barcodes[0].rawValue);
            resolve(result.barcodes[0].rawValue);
          }

          // ✅ Stop scanning and remove listener immediately
          await this.stopScan();
          await listener.remove();
        }
      );

      await BarcodeScanner.startScan();
    });
  }

  // Scan only QR codes
  async scanQRCode() {
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode],
    });

    // ✅ Stop scanning after detecting QR code
    await this.stopScan();

    return barcodes;
  }

  // Check camera permissions
  async checkPermissions() {
    const { camera } = await BarcodeScanner.checkPermissions();
    return camera;
  }

  // Request camera permissions
  async requestPermissions() {
    const { camera } = await BarcodeScanner.requestPermissions();
    return camera;
  }
}
