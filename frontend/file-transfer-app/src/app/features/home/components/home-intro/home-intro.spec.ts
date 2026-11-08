import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeIntro } from './home-intro';

describe('HomeIntro join event', () => {
  let fixture: ComponentFixture<HomeIntro>;
  let joinedCodes: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HomeIntro] }).compileComponents();
    fixture = TestBed.createComponent(HomeIntro);
    joinedCodes = [];
    fixture.componentInstance.joinRoomEvent.subscribe((code) => joinedCodes.push(code));
    await fixture.whenStable();
  });

  it('emits a valid code without losing its leading zero', async () => {
    enterRoomCode('012345');
    await submitJoin();
    expect(joinedCodes).toEqual(['012345']);
  });

  it.each<[string, string[]]>([
    ['', [' ', ' ', ' ', ' ', ' ', ' ']],
    ['123', ['1', '2', '3', ' ', ' ', ' ']],
    ['012345', ['0', '1', '2', '3', '4', '5']],
    ['1234567', ['1', '2', '3', '4', '5', '6']],
  ])('renders six slots for code "%s" while keeping one accessible input', async (code, expected) => {
    enterRoomCode(code);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const digits = Array.from(page.querySelectorAll('.code-slot'), (slot) => slot.textContent);
    expect(digits).toEqual(expected);
    expect(page.querySelectorAll('input[name="roomCode"]').length).toBe(1);
  });

  it.each([
    ['4829137', '482913'], ['12a456', '12456'], ['482 913', '482913'],
    ['012345', '012345'], ['１２３４５６', ''], ['letters', ''],
  ])('cleans input "%s" to "%s" in both the field and cells', async (raw, expected) => {
    enterRoomCode(raw);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const input = page.querySelector<HTMLInputElement>('input[name="roomCode"]')!;
    expect(input.value).toBe(expected);
    expect(Array.from(page.querySelectorAll('.code-slot'), slot => slot.textContent).join('').trim())
      .toBe(expected);
    expect(input.maxLength).toBe(-1);
  });

  it.each(['', '123', '12a456'])(
    'shows an inline error without emitting malformed code "%s"', async (code) => {
      enterRoomCode(code);
      await submitJoin();
      expect(joinedCodes).toEqual([]);
      const page = fixture.nativeElement as HTMLElement;
      expect(page.querySelector('#room-code-feedback')?.textContent)
        .toContain('Enter exactly 6 digits.');
    },
  );

  function enterRoomCode(code: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
    input.value = code;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it.each([['482 913', '482913'], ['0123457', '012345'], ['12a45', '1245']])(
    'normalizes pasted "%s" while keeping at most six digits', async (text, expected) => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
      const clipboard = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(clipboard, 'clipboardData', { value: { getData: () => text } });
      input.dispatchEvent(clipboard);
      await fixture.whenStable();
      expect(clipboard.defaultPrevented).toBe(true);
      expect(input.value).toBe(expected);
      expect([input.selectionStart, input.selectionEnd]).toEqual([expected.length, expected.length]);
      await submitJoin();
      expect(joinedCodes).toEqual(expected.length === 6 ? [expected] : []);
    },
  );

  async function submitJoin(): Promise<void> {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  it.each<[string, number, number, string, string, number]>([
    ['123456', 2, 4, '89', '128956', 4],
    ['1234', 2, 2, ' 9 ', '12934', 3],
  ])('pastes into the selection of "%s"', async (value, start, end, text, expected, caret) => {
    enterRoomCode(value);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
    input.setSelectionRange(start, end);
    const clipboard = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(clipboard, 'clipboardData', { value: { getData: () => text } });
    input.dispatchEvent(clipboard);
    await fixture.whenStable();
    expect(input.value).toBe(expected);
    expect([input.selectionStart, input.selectionEnd]).toEqual([caret, caret]);
    expect(Array.from(fixture.nativeElement.querySelectorAll('.code-slot'),
      slot => (slot as HTMLElement).textContent).join('').trim()).toBe(expected);
  });

  it('leaves native paste available when clipboard data is unavailable', () => {
    enterRoomCode('123');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
    const clipboard = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(clipboard, 'clipboardData', { value: null });
    input.dispatchEvent(clipboard);
    expect(clipboard.defaultPrevented).toBe(false);
    expect(input.value).toBe('123');
  });

  it('highlights only the current digit and clears the highlight on blur', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
    input.focus();
    await fixture.whenStable();
    expect(activeSlotIndex()).toBe(0);
    enterRoomCode('12');
    await fixture.whenStable();
    expect(activeSlotIndex()).toBe(2);
    input.setSelectionRange(1, 1);
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
    await fixture.whenStable();
    expect(activeSlotIndex()).toBe(1);
    input.blur();
    await fixture.whenStable();
    expect(activeSlotIndex()).toBe(-1);
  });

  it('selects a clicked digit for replacement and advances after editing', async () => {
    enterRoomCode('123456');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
    const slots: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.code-slot');
    slots[2].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 3]);
    expect(activeSlotIndex()).toBe(2);
    input.setRangeText('9', 2, 3, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(input.value).toBe('129456');
    expect(activeSlotIndex()).toBe(3);
  });

  function activeSlotIndex(): number {
    const slots: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.code-slot'));
    expect(slots.filter(slot => slot.classList.contains('code-slot-active')).length).toBeLessThanOrEqual(1);
    return slots.findIndex(slot => slot.classList.contains('code-slot-active'));
  }

  it.each([['12', '1', 1], ['123456', '12345', 5], ['1', '', 0]])(
    'moves the active cell back after deleting from "%s"', async (before, after, expected) => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
      input.focus();
      enterRoomCode(before);
      enterRoomCode(after);
      await fixture.whenStable();
      expect(activeSlotIndex()).toBe(expected);
    },
  );

  it('focuses the next available cell when an empty later cell is clicked', async () => {
    enterRoomCode('12');
    const slots: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.code-slot');
    slots[5].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(activeSlotIndex()).toBe(2);
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2]);
  });

  it('keeps the last cell active when all six digits have been entered', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name="roomCode"]');
    input.focus();
    enterRoomCode('123456');
    await fixture.whenStable();
    expect(activeSlotIndex()).toBe(5);
    expect([input.selectionStart, input.selectionEnd]).toEqual([6, 6]);
  });
});
