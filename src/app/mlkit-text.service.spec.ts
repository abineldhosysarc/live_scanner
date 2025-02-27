import { TestBed } from '@angular/core/testing';

import { MlKitTextService } from './mlkit-text.service';

describe('MlkitTextService', () => {
  let service: MlKitTextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MlKitTextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
