import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { App } from '@capacitor/app';
import { MlKitTextService } from '../mlkit-text.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  extractedText: string = '';
  isLoading: boolean = false;
  error: string = '';
  isPanCard: boolean = false;
  isScanning: boolean = false;
  panDetails: {
    name?: string;
    fatherName?: string;
    dob?: string;
    panNumber?: string;
  } = {};
   
  Object = Object;
  private subscription: Subscription = new Subscription();

  constructor(
    private mlKitService: MlKitTextService,
    private platform: Platform,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // Subscribe to text detection results
    this.subscription.add(
      this.mlKitService.textDetected$.subscribe(text => {
        if (text) {
          this.processTextResult(text);
        }
      })
    );
  }

  ngOnDestroy() {
    // Make sure to stop scanning and clean up subscriptions when component is destroyed
    this.stopScanning();
    this.subscription.unsubscribe();
  }

  async startTextDetection() {
    if (!this.platform.is('hybrid')) {
      this.error = 'Text detection is only supported on mobile devices.';
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;
    this.error = '';
    this.extractedText = '';
    this.panDetails = {};
    this.isPanCard = false;
    
    try {
      this.isScanning = true;
      console.log("Starting camera preview");
      
      await this.mlKitService.startCameraPreview();
    } catch (error) {
      this.isScanning = false;
      this.isLoading = false;
      this.error = 'Failed to start camera. Please try again.';
      console.error('Camera preview error:', error);
    }
  }

  processTextResult(text: string) {
    this.ngZone.run(() => {
      this.extractedText = text;
      
      this.isPanCard = this.verifyPanCard(text);
      
      if (this.isPanCard) {
        this.parsePanDetails(text);
        this.stopScanning();        
        this.isLoading = false;
      }
    });
  }

  stopScanning() {
    if (this.isScanning) {
      console.log("Stopping camera preview");
      this.mlKitService.stopCameraPreview();
      this.isScanning = false;
      this.isLoading = false;
    }
  }

  verifyPanCard(text: string): boolean {
    if (!text) return false;
    
    const upperText = text.toUpperCase();
       
    const hasTaxDept = upperText.includes('INCOME TAX DEPARTMENT') ||
                       upperText.includes('INCOME-TAX DEPARTMENT');
    const hasPAN = upperText.includes('PERMANENT ACCOUNT NUMBER') ||
                  upperText.includes('PAN');
       
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    const hasPanNumber = panRegex.test(upperText);
       
    return (hasTaxDept && hasPAN && hasPanNumber);
  }
  
  parsePanDetails(text: string) {
    if (!text) return;
    const upperText = text.toUpperCase();

    // Extract PAN Number
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    const panMatch = upperText.match(panRegex);
    if (panMatch) {
      this.panDetails.panNumber = panMatch[0];
    }

      // Extract Name
      const nameRegex = /NAME[:\s]+([A-Z\s]+?)\n|NAME[:\s]+([A-Z\s]+)FATHER/;
      const nameMatch = upperText.match(nameRegex);
      if (nameMatch) {
        this.panDetails.name = this.formatName(nameMatch[1] || nameMatch[2]);
      }
  
      // Extract Father's Name
      const fatherNameRegex = /FATHER['’]S?\s+NAME[:\s]+([A-Z\s]+?)\n|FATHER['’]S?\s+NAME\n([A-Z\s]+)/;
      const fatherMatch = upperText.match(fatherNameRegex);
      if (fatherMatch) {
        this.panDetails.fatherName = this.formatName(fatherMatch[1] || fatherMatch[2]);
      }
  
      // Extract Date of Birth
      const dobRegex = /DATE\s+OF\s+BIRTH[:\s]+(\d{2}\/\d{2}\/\d{4})|\b(\d{2}\/\d{2}\/\d{4})\b/;
      const dobMatch = upperText.match(dobRegex);
      if (dobMatch) {
        this.panDetails.dob = dobMatch[1] || dobMatch[2];
      }
  
      console.log('Parsed PAN Details:', this.panDetails);
    }
  
  formatName(name: string): string {
    if (!name) return '';
       
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  closeapp() {
    console.log("closed");
    this.stopScanning(); 
    App.exitApp();
  }
}