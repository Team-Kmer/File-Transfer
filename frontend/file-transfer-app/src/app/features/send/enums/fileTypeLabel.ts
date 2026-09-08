export enum FileTypeLabel {
  PdfDocument = 'PDF document',

  JpegImage = 'JPEG image',
  PngImage = 'PNG image',
  GifImage = 'GIF image',
  WebpImage = 'WebP image',
  SvgImage = 'SVG image',

  TextDocument = 'Text document',
  CsvFile = 'CSV file',
  HtmlDocument = 'HTML document',

  WordDocument = 'Word document',
  ExcelSpreadsheet = 'Excel spreadsheet',
  PowerPointPresentation = 'PowerPoint presentation',

  ZipArchive = 'ZIP archive',
  SevenZipArchive = '7-Zip archive',
  RarArchive = 'RAR archive',

  Mp3Audio = 'MP3 audio',
  WavAudio = 'WAV audio',
  Mp4Video = 'MP4 video'
}

export const FILE_TYPE_BY_MIME: Readonly<Record<string, FileTypeLabel>> = {
  'application/pdf': FileTypeLabel.PdfDocument,

  'image/jpeg': FileTypeLabel.JpegImage,
  'image/png': FileTypeLabel.PngImage,
  'image/gif': FileTypeLabel.GifImage,
  'image/webp': FileTypeLabel.WebpImage,
  'image/svg+xml': FileTypeLabel.SvgImage,

  'text/plain': FileTypeLabel.TextDocument,
  'text/csv': FileTypeLabel.CsvFile,
  'text/html': FileTypeLabel.HtmlDocument,

  'application/msword': FileTypeLabel.WordDocument,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
  FileTypeLabel.WordDocument,

  'application/vnd.ms-excel': FileTypeLabel.ExcelSpreadsheet,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
  FileTypeLabel.ExcelSpreadsheet,

  'application/vnd.ms-powerpoint': FileTypeLabel.PowerPointPresentation,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
  FileTypeLabel.PowerPointPresentation,

  'application/zip': FileTypeLabel.ZipArchive,
  'application/x-7z-compressed': FileTypeLabel.SevenZipArchive,
  'application/vnd.rar': FileTypeLabel.RarArchive,

  'audio/mpeg': FileTypeLabel.Mp3Audio,
  'audio/wav': FileTypeLabel.WavAudio,
  'video/mp4': FileTypeLabel.Mp4Video
};
