import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteFileDialog } from './delete-file-dialog';

describe('DeleteFileDialog', () => {
  let component: DeleteFileDialog;
  let fixture: ComponentFixture<DeleteFileDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteFileDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteFileDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
