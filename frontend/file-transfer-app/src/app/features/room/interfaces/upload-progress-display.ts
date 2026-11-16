export interface UploadProgressDisplay {
  percent: number;
  percentLabel: string;
  bytesLabel: string;
  speedLabel: string;
  remainingLabel: string;
  cells: boolean[];
}
