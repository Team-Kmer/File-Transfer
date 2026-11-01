import { isValidRoomCode } from './room-code.validator';

describe('isValidRoomCode', () => {
  it.each(['012345', '000000', '123456'])('accepts six ASCII digits: "%s"', (code) => {
    expect(isValidRoomCode(code)).toBe(true);
  });

  it.each(['', '12345', '1234567', '12a456', '123 456', ' 123456', '123456 ', '１２３４５６', '١٢٣٤٥٦', '123456\n'])(
    'rejects malformed code "%s"', (code) => {
      expect(isValidRoomCode(code)).toBe(false);
    },
  );
});
