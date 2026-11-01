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

  it.each(['', '123', '1234567', '12a456'])(
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

  async function submitJoin(): Promise<void> {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }
});
