import { TestBed } from '@angular/core/testing';

import { DeviceIdentity } from './device-identity';

describe('DeviceIdentity', () => {
  let service: DeviceIdentity;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceIdentity);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
