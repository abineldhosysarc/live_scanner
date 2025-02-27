import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';

@Injectable({
  providedIn: 'root'
})
export class MlKitTextService {
  
  constructor() {}
  
  async detectTextFromImage(): Promise<string> {
    try {
      const image = await Camera.getPhoto({
        quality: 100, 
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1920, 
        height: 1080,
        correctOrientation: true 
      });
      
      if (!image.base64String) {
        throw new Error('No image captured');
      }

      const result = await CapacitorPluginMlKitTextRecognition.detectText({
        base64Image: image.base64String
      });

      console.log('Extracted Text:', result.text);
      return result.text || 'No text detected';
    } catch (error) {
      console.error('Error detecting text:', error);
      throw error;
    }
  }
}
