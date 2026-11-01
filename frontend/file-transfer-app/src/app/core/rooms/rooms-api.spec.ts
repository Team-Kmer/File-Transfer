import { TestBed } from '@angular/core/testing';

import { RoomsApi } from './rooms-api';

describe('RoomsApi', () => {
  let service: RoomsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoomsApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
