import { ComponentFixture, TestBed } from '@angular/core/testing';
import {SendHandlerService} from '../../service/send-handler.service';
import {DisplayUploadedFiles} from './display-uploaded-files';

describe('DisplayUploadedFiles', () => {
  let component: DisplayUploadedFiles;
  let fixture: ComponentFixture<DisplayUploadedFiles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayUploadedFiles],
      providers: [SendHandlerService]
    }).compileComponents();

    fixture = TestBed.createComponent(DisplayUploadedFiles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
