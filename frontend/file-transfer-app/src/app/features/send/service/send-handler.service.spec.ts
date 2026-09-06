import { TestBed } from '@angular/core/testing';
import {SendHandlerService} from './send-handler.service';


describe('SendHandlerService', () => {
  let service: SendHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SendHandlerService]
    });

    service = TestBed.inject(SendHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
