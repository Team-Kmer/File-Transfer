import { TestBed } from '@angular/core/testing';

import { ReceiveHandlerService } from './receive-handler-service';

describe('ReceiveHandlerService', () => {
  let service: ReceiveHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReceiveHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
