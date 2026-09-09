import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayAvailableFiles } from './display-available-files';

describe('DisplayAvailableFiles', () => {
  let component: DisplayAvailableFiles;
  let fixture: ComponentFixture<DisplayAvailableFiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayAvailableFiles],
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayAvailableFiles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
