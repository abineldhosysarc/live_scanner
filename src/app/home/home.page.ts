import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BarcodeScannerService } from '../services/barcode-scanner.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  extractedText: string = '';
  isScanning: boolean = false;
  documentType: string = '';

  panDetails = {
    name: '',
    fatherName: '',
    dob: '',
    panNumber: '',
  };
  
  aadhaarDetails = {
    name: '',
    dob: '',
    gender: '',
    aadhaarNumber: '',
    mobileNumber: '',
  };

  private subscription: Subscription = new Subscription();

  constructor(
    private barcodeScannerService: BarcodeScannerService,
    private platform: Platform,
    private ngZone: NgZone
  ) {}

  async startScanning() {
    this.isScanning = true; // ✅ Show camera preview
    this.extractedText = ''; // Reset previous text
    this.documentType = ''; // Reset document type
    this.resetDetails(); // Reset all extracted details
    await this.barcodeScannerService.startTextExtraction();
  }

  ngOnInit() {
    this.subscription = this.barcodeScannerService.textDetected$.subscribe((text) => {
      if (text) {
        this.ngZone.run(() => {
          this.extractedText = text;  
          this.processExtractedText(text); // ✅ Process & validate text  
          this.isScanning = false; // Update UI immediately
        });
      }
    });
  }

  processExtractedText(text: string) {
    if (this.verifyPanCard(text)) {
      this.documentType = 'PAN Card';
      this.panDetails = this.parsePanDetails(text);
    } else if (this.verifyAadhaarCard(text)) {
      this.documentType = 'Aadhaar Card';
      this.aadhaarDetails = this.parseAadhaarDetails(text);
    } else {
      this.documentType = 'Unknown Document';
    }
  }

  async stopScanning() {
    this.isScanning = false;
    await this.barcodeScannerService.stopTextExtraction();
  }

  ngOnDestroy() {
    this.stopScanning();
    this.subscription.unsubscribe();
  }

  // Reset all extracted details
  resetDetails() {
    this.panDetails = {
      name: '',
      fatherName: '',
      dob: '',
      panNumber: '',
    };
    
    this.aadhaarDetails = {
      name: '',
      dob: '',
      gender: '',
      aadhaarNumber: '',
      mobileNumber: '',
    };
  }

  // ✅ Improved PAN card verification with more lenient pattern matching
  verifyPanCard(text: string): boolean {
    if (!text) return false;
    const upperText = text.toUpperCase();
    
    // Check for PAN card indicators with more flexible matching
    const hasTaxDept = upperText.includes('INCOME TAX') || upperText.includes('TAX DEPARTMENT');
    const hasPAN = upperText.includes('PERMANENT') || upperText.includes('ACCOUNT NUMBER') || upperText.includes('PAN');
    
    // More robust PAN number regex that allows for OCR errors
    const panRegex = /[A-Z]{4,5}[0-9]{3,4}[A-Z]{1}/;
    const hasPanNumber = panRegex.test(upperText);
    
    return (hasTaxDept || hasPAN) && hasPanNumber;
  }

  // ✅ Improved Aadhaar card verification with more lenient pattern matching
  verifyAadhaarCard(text: string): boolean {
    if (!text) return false;
    const upperText = text.toUpperCase();
    
    // Check for Aadhaar card indicators with more flexible matching
    const hasAadhaar = upperText.includes('AADHAAR') || upperText.includes('IDENTIFICATION') || upperText.includes('UID');
    const hasGovtIndia = upperText.includes('GOVERNMENT') || upperText.includes('GOVT') || upperText.includes('INDIA');
    
    // More robust Aadhaar number regex that handles various formats and OCR errors
    const aadhaarRegex = /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{3,4}\b/;
    const hasAadhaarNumber = aadhaarRegex.test(text);
    
    return (hasAadhaar || hasGovtIndia) && hasAadhaarNumber;
  }

  // ✅ Improved PAN details extraction with more robust patterns
  parsePanDetails(text: string) {
    const upperText = text.toUpperCase();
    
    // Extract PAN number
    const panNumberMatch = upperText.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/) || 
                           upperText.match(/[A-Z]{4}[0-9]{5}[A-Z]{1}/) || 
                           upperText.match(/[A-Z]{5}[0-9]{3}[A-Z]{1}/);
    const panNumber = panNumberMatch ? panNumberMatch[0] : '';
    
    // Extract name with multiple pattern attempts
    let name = '';
    const nameMatches = [
      upperText.match(/NAME[:\s]+([A-Z\s]+?)\n/),
      upperText.match(/NAME[:\s]+([A-Z\s]+)FATHER/),
      upperText.match(/NAME\n([A-Z\s]+)\n/)
    ];
    
    for (const match of nameMatches) {
      if (match && match[1]) {
        name = match[1];
        break;
      }
    }
    
    // Extract father's name with multiple pattern attempts
    let fatherName = '';
    const fatherNameMatches = [
      upperText.match(/FATHER['']S?\s+NAME[:\s]+([A-Z\s]+?)\n/),
      upperText.match(/FATHER['']S?\s+NAME\n([A-Z\s]+)/),
      upperText.match(/FATHER['']S?\s+NAME[:\s]+([A-Z\s]+)/)
    ];
    
    for (const match of fatherNameMatches) {
      if (match && match[1]) {
        fatherName = match[1];
        break;
      }
    }
    
    // Extract DOB with multiple pattern attempts
    let dob = '';
    const dobMatches = [
      upperText.match(/DATE\s+OF\s+BIRTH[:\s]+(\d{2}\/\d{2}\/\d{4})/),
      upperText.match(/DOB[:\s]+(\d{2}\/\d{2}\/\d{4})/),
      upperText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/),
      upperText.match(/\b(\d{2}\-\d{2}\-\d{4})\b/)
    ];
    
    for (const match of dobMatches) {
      if (match && match[1]) {
        dob = match[1];
        break;
      }
    }
    
    return {
      panNumber: panNumber,
      name: this.formatName(name),
      fatherName: this.formatName(fatherName),
      dob: dob,
    };
  }

  // ✅ Improved Aadhaar details extraction with more robust patterns
  parseAadhaarDetails(text: string) {
    const upperText = text.toUpperCase();
    
    // Extract Aadhaar number with multiple pattern attempts
    const aadhaarMatch = text.match(/\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/) || 
                          text.match(/\b(\d{12})\b/);
    const aadhaarNumber = aadhaarMatch ? aadhaarMatch[1] : '';
    
    // Extract name with multiple pattern attempts
    let name = '';
    const nameMatches = [
      upperText.match(/\b([A-Z][a-zA-Z]+(\s[A-Z][a-zA-Z]+)+)\b(?=\s*\n)/),
      upperText.match(/(?<=\n\s*)([A-Z][a-zA-Z]+(\s[A-Z][a-zA-Z]+)+)(?=\s*\n)/),
      upperText.match(/NAME[:\s]+([A-Z\s]+?)\n/)
    ];
    
    for (const match of nameMatches) {
      if (match && match[1]) {
        name = match[1];
        break;
      }
    }
    
    // Extract DOB with multiple pattern attempts
    let dob = '';
    const dobMatches = [
      text.match(/DOB\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i),
      text.match(/(\d{2}-\d{2}-\d{4})/i),
      text.match(/BIRTH[:\s]+(\d{2}\/\d{2}\/\d{4})/i)
    ];
    
    for (const match of dobMatches) {
      if (match && match[1]) {
        dob = match[1];
        break;
      }
    }
    
    // Extract gender with multiple pattern attempts
    let gender = '';
    const genderMatches = [
      upperText.match(/\b(MALE|FEMALE)\b/),
      upperText.match(/GENDER[:\s]+(M|F|MALE|FEMALE)/),
      upperText.match(/SEX[:\s]+(M|F|MALE|FEMALE)/)
    ];
    
    for (const match of genderMatches) {
      if (match && match[1]) {
        gender = match[1];
        break;
      }
    }
    
    // Extract mobile with multiple pattern attempts
    let mobile = '';
    const mobileMatches = [
      text.match(/\b(\d{10})\b/),
      text.match(/\b(\d{3}[\s-]?\d{3}[\s-]?\d{4})\b/)
    ];
    
    for (const match of mobileMatches) {
      if (match && match[1]) {
        mobile = match[1];
        break;
      }
    }
    
    return {
      aadhaarNumber: aadhaarNumber,
      name: this.formatName(name),
      dob: dob,
      gender: gender,
      mobileNumber: mobile,
    };
  }

  formatName(name: string): string {
    if (!name) return '';
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }
}