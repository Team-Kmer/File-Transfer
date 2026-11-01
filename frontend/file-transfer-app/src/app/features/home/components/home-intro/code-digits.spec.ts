import { codeDigits } from './code-digits';

describe('codeDigits', () => {
  it.each<[string, string[]]>([
    ['', [' ', ' ', ' ', ' ', ' ', ' ']],
    ['123', ['1', '2', '3', ' ', ' ', ' ']],
    ['012345', ['0', '1', '2', '3', '4', '5']],
    ['1234567', ['1', '2', '3', '4', '5', '6']],
  ])('prepares six display cells for "%s"', (code, expected) => {
    expect(codeDigits(code)).toEqual(expected);
  });
});
