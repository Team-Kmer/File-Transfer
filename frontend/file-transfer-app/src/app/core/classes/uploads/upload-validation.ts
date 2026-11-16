export function uploadValidationStatus(filename: string, sizeBytes: number): number | null {
  const blockedExtensions = ['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'ps1', 'vbs', 'jar', 'sh', 'dll'];
  if (isEmptyFile(sizeBytes)) {
    return 400;
  }
  if (isOversizedFile(sizeBytes)) {
    return 413;
  }
  const extension = filename.toLowerCase().split('.').pop() ?? '';
  return blockedExtensions.includes(extension) ? 415 : null;
}

function isEmptyFile(sizeBytes: number): boolean {
  return sizeBytes <= 0;
}

function isOversizedFile(sizeBytes: number): boolean {
  const maximumBytes = 2 * 1024 ** 3;
  return sizeBytes > maximumBytes;
}
