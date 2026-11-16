import { Component, computed, inject, input } from '@angular/core';
import { ProgressSnapshot } from '../../../../core/interfaces/uploads/progress-snapshot';
import { UploadPresentationService } from '../../services/upload-presentation.service';

@Component({
  selector: 'app-upload-progress',
  templateUrl: './upload-progress.html',
  styleUrls: ['./upload-progress.scss', './upload-progress.tw.css'],
})
export class UploadProgress {
  private readonly uploadPresentationService = inject(UploadPresentationService);

  public readonly progress = input.required<ProgressSnapshot>();

  public readonly canShowMetrics = input(true);

  protected readonly display = computed(() => this.uploadPresentationService.presentProgress(this.progress(), this.canShowMetrics()));
}
