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
  isAadhaarCard: boolean = false;
  isScanning: boolean = false;
  documentType: string = '';
  panDetails: {
    name?: string;
    fatherName?: string;
    dob?: string;
    panNumber?: string;
  } = {};
  aadhaarDetails: {
    name?: string;
    dob?: string;
    gender?: string;
    aadhaarNumber?: string;
    mobileNumber?: string;
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
    this.aadhaarDetails = {};
    this.isPanCard = false;
    this.isAadhaarCard = false;
    this.documentType = '';
    
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
      
      // First check if it's a PAN card
      this.isPanCard = this.verifyPanCard(text);
      
      // If not a PAN card, check if it's an Aadhaar card
      if (!this.isPanCard) {
        this.isAadhaarCard = this.verifyAadhaarCard(text);
      }
      
      if (this.isPanCard) {
        this.documentType = 'PAN';
        this.stopScanning(); 
        this.parsePanDetails(text);
        this.isLoading = false;
      } else if (this.isAadhaarCard) {
        this.documentType = 'Aadhaar';
        this.stopScanning(); 
        this.parseAadhaarDetails(text);
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
  
  verifyAadhaarCard(text: string): boolean {
    if (!text) return false;
    
    const upperText = text.toUpperCase();
    
    // Check for common Aadhaar keywords
    const hasAadhaar = upperText.includes('AADHAAR') || 
                       upperText.includes('AADHAR') || 
                       upperText.includes('UNIQUE IDENTIFICATION') || 
                       upperText.includes('UID');
    const hasGovtIndia = upperText.includes('GOVERNMENT OF INDIA') || 
                         upperText.includes('GOVT OF INDIA');
    
    // Check for Aadhaar number pattern (12 digits, may be space or dash separated)
    const aadhaarRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
    const hasAadhaarNumber = aadhaarRegex.test(text);
    
    return (hasAadhaar && hasGovtIndia && hasAadhaarNumber);
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
    const fatherNameRegex = /FATHER['']S?\s+NAME[:\s]+([A-Z\s]+?)\n|FATHER['']S?\s+NAME\n([A-Z\s]+)/;
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
  
  parseAadhaarDetails(text: string) {
    if (!text) return;
    const upperText = text.toUpperCase();
    
    // Extract Aadhaar Number (12 digits, may be space or dash separated)
    const aadhaarRegex = /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/;
    const aadhaarMatch = text.match(aadhaarRegex);
    if (aadhaarMatch) {
      // Format to standard format with spaces
      const rawNumber = aadhaarMatch[1].replace(/[\s-]/g, '');
      this.aadhaarDetails.aadhaarNumber = rawNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    }
    
    // Extract Name - different formats based on card layout
    const nameRegex = /\b([A-Z][a-z]+(\s[A-Z][a-z]+)+)\b(?=\s*\n)|(?<=\n\s*)([A-Z][a-z]+(\s[A-Z][a-z]+)+)(?=\s*\n)/;
    const nameMatch = text.match(nameRegex);
    if (nameMatch) {
      this.aadhaarDetails.name = nameMatch[1] || nameMatch[3];
    }
    
    // Extract DOB
    const dobRegex = /DOB\s*:?\s*(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/i;
    const dobMatch = text.match(dobRegex);
    if (dobMatch) {
      this.aadhaarDetails.dob = dobMatch[1] || dobMatch[2];
    }
    
    // Extract Gender
    const genderRegex = /\b(MALE|FEMALE|M|F)\b/i;
    const genderMatch = upperText.match(genderRegex);
    if (genderMatch) {
      const genderCode = genderMatch[1];
      if (genderCode === 'M' || genderCode === 'MALE') {
        this.aadhaarDetails.gender = 'Male';
      } else if (genderCode === 'F' || genderCode === 'FEMALE') {
        this.aadhaarDetails.gender = 'Female';
      }
    }
    
    // Extract Mobile Number (look for 10-digit numbers that could be mobile)
    const mobileRegex = /\b(\d{10})\b|\b(\d{3}[\s-]?\d{3}[\s-]?\d{4})\b/;
    const mobileMatch = text.match(mobileRegex);
    if (mobileMatch) {
      this.aadhaarDetails.mobileNumber = mobileMatch[1] || mobileMatch[2];
    }
    
    console.log('Parsed Aadhaar Details:', this.aadhaarDetails);
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