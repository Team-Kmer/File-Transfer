import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomInvite } from './room-invite';

describe('Room invitation', () => {
  let fixture: ComponentFixture<RoomInvite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RoomInvite] }).compileComponents();
    fixture = TestBed.createComponent(RoomInvite);
    fixture.componentRef.setInput('code', '012345');
    fixture.componentRef.setInput('countdown', '6:00:00');
    fixture.componentRef.setInput('status', 'Waiting for a device…');
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('copies the raw six digits and confirms success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    fixture.nativeElement.querySelector('.copy-code').click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith('012345');
    expect(fixture.nativeElement.querySelector('.copy-feedback').textContent).toBe('Code copied');
  });

  it('selects the visible code when clipboard access is denied', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    fixture.nativeElement.querySelector('.copy-code').click();
    await fixture.whenStable();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('.session-code');
    expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 7]);
    expect(fixture.nativeElement.querySelector('.copy-feedback').textContent).toContain('copy it manually');
  });

  it('copies the link built from the current origin', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    fixture.nativeElement.querySelector('.copy-link').click();
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/room/012345`);
  });

  it('selects the LAN link when the clipboard API is absent', async () => {
    vi.stubGlobal('navigator', {});
    fixture.nativeElement.querySelector('.copy-link').click();
    await fixture.whenStable();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('.lan-link');
    expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, field.value.length]);
  });

  it.each([
    ['localhost', 'http://localhost:4200', true],
    ['192.168.1.24', 'http://192.168.1.24:4200', false],
  ])('renders the correct address and warning for %s', async (hostname, origin, hasWarning) => {
    vi.stubGlobal('location', { hostname, origin });
    fixture.destroy();
    fixture = TestBed.createComponent(RoomInvite);
    fixture.componentRef.setInput('code', '012345');
    fixture.componentRef.setInput('countdown', '6:00:00');
    fixture.componentRef.setInput('status', 'Waiting for a device…');
    await fixture.whenStable();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('.lan-link');
    expect(field.value).toBe(`${origin}/room/012345`);
    expect(fixture.nativeElement.querySelector('.localhost-hint') !== null).toBe(hasWarning);
  });
});
