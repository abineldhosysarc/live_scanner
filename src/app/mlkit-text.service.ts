import { Injectable } from '@angular/core';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { CameraPreview } from '@capacitor-community/camera-preview';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MlKitTextService {
  private isPreviewActive = false;
  private isProcessing = false;
  private shouldContinueProcessing = false;
  public textDetected$ = new BehaviorSubject<string>('');

  constructor() {}

  async startCameraPreview(): Promise<void> {
    try {
      await this.stopCameraPreview();
      
      await CameraPreview.start({
        parent: 'camera-preview',
        position: 'rear',
        toBack: false,
        width: window.innerWidth,
        height: window.innerHeight,
        enableHighResolution: true,
        disableAudio: true,
        storeToFile: false,
        enableZoom: true
      });
      
      console.log("Camera preview started");
      this.isPreviewActive = true;
      this.shouldContinueProcessing = true;
      
      this.processFrames();
    } catch (error) {
      console.error('Error starting camera preview:', error);
      throw error;
    }
  }

  private async processFrames(): Promise<void> {
    if (!this.isPreviewActive || !this.shouldContinueProcessing) {
      return;
    }

    if (!this.isProcessing) {
      this.isProcessing = true;
      try {
        const picture = await CameraPreview.capture({
          quality: 100 
        });
        
        if (picture && picture.value) {
          const result = await CapacitorPluginMlKitTextRecognition.detectText({
            base64Image: picture.value
          });
          
          if (result.text && result.text.trim().length > 0) {
            console.log("Text detected:", result.text);
            this.textDetected$.next(result.text);
          }
        }
      } catch (error) {
        console.error('Error processing frame:', error);
      } finally {
        this.isProcessing = false;
        
        if (this.shouldContinueProcessing) {
          requestAnimationFrame(() => this.processFrames());
        }
      }
    } else {
      setTimeout(() => this.processFrames(), 100);
    }
  }

  async stopCameraPreview(): Promise<void> {
    this.shouldContinueProcessing = false;
    
    if (this.isPreviewActive) {
      try {
        await CameraPreview.stop();
        this.isPreviewActive = false;
        console.log("Camera preview stopped");
      } catch (error) {
        console.error('Error stopping camera preview:', error);
      }
    }
  }
}