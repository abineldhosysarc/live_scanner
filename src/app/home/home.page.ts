import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { MlKitTextService } from '../mlkit-text.service';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  extractedText: string = '';
  isLoading: boolean = false;
  error: string = '';
  isPanCard: boolean = false;
  panDetails: {
    name?: string;
    fatherName?: string;
    dob?: string;
    panNumber?: string;
  } = {};
  
  Object = Object;

  constructor(
    private mlKitService: MlKitTextService,
    private platform: Platform
  ) {}

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
      this.extractedText = await this.mlKitService.detectTextFromImage();
      // this.extractedText =
      // 'GOVT.OFINDIAINCOMETAXDEPARTMENTPermanentAccountNumber(PAN)CardName:RAJESHKUMARFather\'sName:SURESHKUMARDateofBirth: 15/08/1990 PAN Number: ABCDE1234F';

      this.isPanCard = this.verifyPanCard(this.extractedText);
      if (this.isPanCard) {
        this.parsePanDetails(this.extractedText);
      } else {
        this.error = 'The scanned card does not appear to be a valid PAN card.';
      }
    } catch (error) {
      this.error = 'Failed to detect text. Please try again.';
      console.error('Detection error:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  verifyPanCard(text: string): boolean {
    const upperText = text.toUpperCase();
    
    // Check for common PAN card text markers
    const hasTaxDept = upperText.includes('INCOME TAX DEPARTMENT') || 
                        upperText.includes('INCOME-TAX DEPARTMENT');
    const hasPAN = upperText.includes('PERMANENT ACCOUNT NUMBER') || 
                   upperText.includes('PAN');
    
    // Check if there's a valid PAN number pattern
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    const hasPanNumber = panRegex.test(upperText);
    
    return (hasTaxDept && hasPAN && hasPanNumber);
  }


  parsePanDetails(text: string) {
    if (!text) return;

    // Normalize text for consistent parsing
    const upperText = text.toUpperCase();

    // Extract PAN Number
    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    const panMatch = upperText.match(panRegex);
    if (panMatch) {
      this.panDetails.panNumber = panMatch[0];
    }

    // Extract Name using regex
    const nameRegex = /NAME[:\s]+([A-Z\s]+)FATHER/;
    const nameMatch = upperText.match(nameRegex);
    if (nameMatch) {
      this.panDetails.name = this.formatName(nameMatch[1]);
    }

    // Extract Father's Name using regex
    const fatherNameRegex = /FATHER['’]S?\s+NAME[:\s]+([A-Z\s]+)DATE/;
    const fatherMatch = upperText.match(fatherNameRegex);
    if (fatherMatch) {
      this.panDetails.fatherName = this.formatName(fatherMatch[1]);
    }

    // Extract Date of Birth using regex
    const dobRegex = /\d{2}\/\d{2}\/\d{4}/;
    const dobMatch = upperText.match(dobRegex);
    if (dobMatch) {
      this.panDetails.dob = dobMatch[0];
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
  closeapp(){
    console.log("closed");
    App.exitApp(); 
  }
}